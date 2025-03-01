import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { Story, StoryType } from "@/lib/types";
import { URL } from "url";
import { getDomain } from "@/utils/utils";
import redis from "@/lib/redis";

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";
const STORY_TTL = 1800; // Cache stories for 30 minutes
const METADATA_TTL = 43200; // Cache metadata for 12 hours
const FAVICON_TTL = 43200; // Cache favicons for 12 hours

export const config = {
  runtime: "nodejs", // Use Node.js serverless functions on Vercel
  maxDuration: 10, // 10 seconds timeout (adjust as needed)
};

// ✅ Axios instance with retry logic
const axiosInstance = axios.create({
  timeout: 5000, // 5 seconds timeout
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },
});

// Clean and truncate description
function cleanDescription(description: string): string {
  return description
    .replace(/https?:\/\/[^\s]+/g, "") // Remove URLs
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
    .split("\n") // Split into lines to filter gibberish
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false; // ✅ Remove empty lines
      if (trimmed.length < 10) return false; // ✅ Ignore very short lines
      if (/^\{.*\}$/.test(trimmed)) return false; // ✅ Ignore JSON-like objects
      if (/^\s*(const|let|var|function|class|\(|\{)/.test(trimmed))
        return false; // ✅ Ignore code-like lines
      if (/^\/\//.test(trimmed)) return false; // ✅ Ignore lines starting with //
      return true;
    })
    .join(" ")
    .trim();
}

function truncateDescription(description: string, maxLength: number): string {
  return description.length > maxLength
    ? description.slice(0, maxLength) + "..."
    : description;
}

function isGibberish(text: string): boolean {
  if (text.startsWith("%PDF")) return true;
  if (text.includes("font-family:") || text.includes("text-anchor:"))
    return true;
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return true;
  const internalKeyMatches = trimmed.match(/AUI_[A-Z0-9_]+/g);
  if (internalKeyMatches && internalKeyMatches.length > 1) return true;
  return false;
}

// Helper: Extract YouTube video ID from a URL.
function getYouTubeVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.slice(1);
    }
    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v");
    }
    return null;
  } catch (err) {
    console.error("Error parsing YouTube video ID:", err);
    return null;
  }
}

// Fetch favicon
async function fetchFavicon(url: string): Promise<string> {
  try {
    if (!url || url === "undefined" || url === "") {
      return "/placeholder.png";
    }

    const baseUrl = new URL(url);
    const domain = getDomain(url);
    const cacheKey = `favicon:${domain}`;

    // ✅ Check Redis cache
    const cachedFavicon = await redis.get(cacheKey);
    if (cachedFavicon) return cachedFavicon;

    // ✅ Special case for ArXiv
    if (baseUrl.hostname.includes("arxiv.org")) {
      return "https://static.arxiv.org/static/browse/0.3.4/images/arxiv-logo-fb.png";
    }

    let faviconUrl = `${baseUrl.origin}/favicon.ico`;

    // ✅ First, check if /favicon.ico exists (HEAD request)
    try {
      const faviconResponse = await axios.head(faviconUrl, { timeout: 3000 });
      if (faviconResponse.status === 200) {
        await redis.setex(cacheKey, 86400, faviconUrl); // Cache for 24 hours
        return faviconUrl;
      }
    } catch (error) {
      console.log(error);
      console.warn(
        `Favicon.ico not found for ${domain}, trying other methods.`
      );
    }

    // ✅ Fetch page and check for <link rel="icon">
    try {
      const response = await axios.get(url, { timeout: 5000 });
      const $ = cheerio.load(response.data);
      const metaFavicon =
        $('link[rel="icon"]').attr("href") ||
        $('link[rel="shortcut icon"]').attr("href");

      if (metaFavicon) {
        if (!metaFavicon.startsWith("http")) {
          faviconUrl = new URL(metaFavicon, baseUrl.origin).href;
        } else {
          faviconUrl = metaFavicon;
        }

        await redis.setex(cacheKey, 86400, faviconUrl);
        return faviconUrl;
      }
    } catch (error) {
      console.warn(`Failed to fetch page for favicon: ${error}`);
    }

    // ✅ Last fallback: Use FaviconKit API
    const faviconkitUrl = `https://api.faviconkit.com/${domain}/144`;
    try {
      const faviconkitResponse = await axios.head(faviconkitUrl, {
        timeout: 3000,
      });
      if (faviconkitResponse.status === 200) {
        await redis.setex(cacheKey, 86400, faviconkitUrl);
        return faviconkitUrl;
      }
    } catch (error) {
      console.log(error);
      console.warn(`FaviconKit API failed for ${domain}`);
    }

    // ✅ Final fallback
    await redis.setex(cacheKey, FAVICON_TTL, "/placeholder.png");
    return "/placeholder.png";
  } catch (error) {
    console.error(`Error fetching favicon for ${url}:`, error);
    return "/placeholder.png";
  }
}

// GET handler using optimized caching & parallel processing.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") as StoryType) || "topstories";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const cacheKey = `stories:${type}:${page}`;
  const limit = 30;

  try {
    // 1. Check Redis cache for the full stories list for this page.
    const cachedStories = await redis.get(cacheKey);
    if (cachedStories) {
      return NextResponse.json(JSON.parse(cachedStories), {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    // 2. Get the list of story IDs (cached separately)
    const storyIdsCacheKey = `storyIds:${type}`;
    let storyIds: number[] = [];
    const cachedStoryIds = await redis.get(storyIdsCacheKey);
    if (cachedStoryIds) {
      storyIds = JSON.parse(cachedStoryIds);
    } else {
      storyIds = await fetchStoryIds(type);
      if (storyIds.length > 0) {
        await redis.setex(storyIdsCacheKey, STORY_TTL, JSON.stringify(storyIds));
      }
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const storiesToFetch = storyIds.slice(start, end);

    // 3. Use MGET to try to fetch all story caches in one command.
    const storyKeys = storiesToFetch.map((id) => `story:${id}`);
    const cachedStoriesArray = await redis.mget(...storyKeys);
    
    const missingIndices: number[] = [];
    const storiesFromCache: (Story | null)[] = cachedStoriesArray.map((value, index) => {
      if (value) {
        return JSON.parse(value);
      } else {
        missingIndices.push(index);
        return null;
      }
    });

    // 4. For any missing stories, fetch them individually.
    const fetchedMissingStories = await Promise.all(
      missingIndices.map((i) => fetchStory(storiesToFetch[i]))
    );
    
    // Merge cached and freshly fetched stories.
    const finalStories: Story[] = storiesFromCache.map((story) =>
      story !== null ? story : fetchedMissingStories.shift() as Story
    );

    // 5. Use a pipeline to set the missing stories in Redis (only for those that were missing).
    if (finalStories.length > 0) {
      const pipeline = redis.pipeline();
      storyKeys.forEach((key, idx) => {
        if (!cachedStoriesArray[idx]) {
          pipeline.setex(key, STORY_TTL, JSON.stringify(finalStories[idx]));
        }
      });
      // Also cache the whole page result
      pipeline.setex(cacheKey, STORY_TTL, JSON.stringify(finalStories));
      await pipeline.exec();
    }

    return NextResponse.json(finalStories, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}


async function fetchStoryIds(type: StoryType): Promise<number[]> {
  const cacheKey = `storyIds:${type}`;

  try {
    // ✅ 1️⃣ Check Redis Cache First
    const cachedStoryIds = await redis.get(cacheKey);
    if (cachedStoryIds) {
      return JSON.parse(cachedStoryIds);
    }

    // ✅ 2️⃣ Fetch from Hacker News API with a Timeout & Retries
    const response = await axiosInstance.get(`${HN_API_BASE}/${type}.json`, {
      timeout: 5000, // ⏳ Set timeout of 5 seconds
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Invalid response from Hacker News API");
    }

    // ✅ 3️⃣ Remove Duplicates & Store in Redis
    const storyIds = [...new Set(response.data as number[])];

    // Use a pipeline to cache the story IDs
    const pipeline = redis.pipeline();
    pipeline.setex(cacheKey, STORY_TTL, JSON.stringify(storyIds)); // Cache for 10 minutes
    await pipeline.exec();
    return storyIds;
  } catch (error) {
    console.error(`Error fetching story IDs for ${type}:`, error);
    return []; // Return an empty array on failure (prevents API from breaking)
  }
}

async function fetchStory(id: number): Promise<Story> {
  try {
    const storyCacheKey = `story:${id}`;
    // ✅ Check Redis Cache for Full Story First (Fastest Path)
    const cachedStory = await redis.get(storyCacheKey);
    if (cachedStory) {
      return JSON.parse(cachedStory);
    }

    // ✅ Fetch Story from Hacker News API
    const response = await axios.get(`${HN_API_BASE}/item/${id}.json`);
    const story = response.data;
    const url = story.url || `https://news.ycombinator.com/item?id=${id}`;

    let image = "/placeholder.png";
    let description = "";

    // ✅ YouTube Handling (Get Thumbnail Early, but Continue Fetching Description)
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = getYouTubeVideoId(url);
      if (videoId) {
        image = `https://img.youtube.com/vi/${videoId}/0.jpg`;
      }
    }

    // ✅ Check Redis Cache for Metadata Before Fetching
    const metadataCacheKey = `metadata:${url}`;
    let metadata = await redis.get(metadataCacheKey);

    if (!metadata) {
      metadata = JSON.stringify(await fetchMetadata(url));
      await redis.setex(metadataCacheKey, METADATA_TTL, metadata);
    }

    // ✅ Parse Metadata & Extract Data
    const parsedMetadata = JSON.parse(metadata);
    image = parsedMetadata.image || image; // Use fetched image only if no YouTube image
    description = parsedMetadata.description || "";

    // ✅ Parallel Fetch for Favicon (Only If Needed)
    if (image === "/placeholder.png") {
      const faviconPromise = fetchFavicon(url);
      const [faviconResult] = await Promise.allSettled([faviconPromise]);

      if (faviconResult.status === "fulfilled") {
        image = faviconResult.value;
      }
    }

    // ✅ Final Story Object
    const storyData = {
      ...story,
      image,
      description: truncateDescription(cleanDescription(description), 200),
      url,
    };

    // ✅ Cache Full Story (Including Metadata)
    await redis.setex(storyCacheKey, STORY_TTL, JSON.stringify(storyData));

    return storyData;
  } catch (error) {
    console.error(`Error fetching story ${id}:`, error);
    return {
      id,
      title: "Error fetching story",
      description: "",
      image: "/placeholder.png",
      url: `https://news.ycombinator.com/item?id=${id}`,
      score: 0,
      time: 0,
      by: "",
      descendants: 0,
    };
  }
}

async function fetchMetadata(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 10000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(url);

    let image =
      $('meta[property="og:image" i]').attr("content")?.trim() ||
      $('meta[name="twitter:image" i]').attr("content")?.trim() ||
      $('meta[itemprop="image" i]').attr("content")?.trim() ||
      $('link[rel="image_src"]').attr("href") ||
      $(".article-featured-image img").attr("src") ||
      $(".post-thumbnail img").attr("src") ||
      $("img[width][height]")
        .filter((_, el) => {
          const width = $(el).attr("width");
          const height = $(el).attr("height");
          return Boolean(
            width && height && parseInt(width) > 200 && parseInt(height) > 200
          );
        })
        .first()
        .attr("src") ||
      "";
    if (image && !image.startsWith("http")) {
      image = new URL(image, baseUrl.origin).href;
    }

    let description =
      $('meta[property="og:description" i]').attr("content")?.trim() ||
      $('meta[name="description" i]').attr("content")?.trim() ||
      $('meta[name^="twitter:description" i]').attr("content")?.trim() ||
      $('meta[name="citation_abstract" i]').attr("content")?.trim() ||
      $('meta[property="dc.description" i]').attr("content")?.trim() ||
      $('meta[name="dc.description" i]').attr("content")?.trim() ||
      $('meta[name="abstract" i]').attr("content")?.trim() ||
      $("p.abstract").text().trim() ||
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";
    if (url.toLowerCase().endsWith(".pdf")) {
      description = "";
    } else {
      if (!description) {
        const paragraphs: string[] = $("p")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((p) => p.length > 0);
        paragraphs.sort((a, b) => b.length - a.length);
        let selectedParagraph = "";
        for (const p of paragraphs) {
          const cleaned = cleanDescription(p);
          if (!isGibberish(cleaned)) {
            selectedParagraph = cleaned;
            break;
          }
        }
        description = selectedParagraph;
      }
      if (!description) {
        const bodyText = $("body").text().trim();
        let snippet = bodyText.slice(0, 300);
        if (bodyText.length > 300) snippet += "...";
        const cleanedSnippet = cleanDescription(snippet);
        if (!isGibberish(cleanedSnippet)) {
          description = cleanedSnippet;
        } else {
          description = "";
        }
      }
    }
    description = cleanDescription(description);
    description = truncateDescription(description, 200);
    if (isGibberish(description)) {
      description = "";
    }
    return {
      image: image || "/placeholder.png",
      description: description || "",
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${url}:`, error);
    return {
      image: "/placeholder.png",
      description: "",
    };
  }
}
