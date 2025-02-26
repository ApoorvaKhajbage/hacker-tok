import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { Story, StoryType } from "@/lib/types";
import { URL } from "url";
import { getDomain } from "@/utils/utils";

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

// In-memory cache for story IDs per type.
const cachedStoryIds: { [key in StoryType]?: { data: number[]; timestamp: number } } = {};

// Cache duration: 5 minutes.
const CACHE_DURATION = 5 * 60 * 1000;

// Vercel Edge Function Config
export const config = {
  runtime: "edge",
  maxDuration: 10, // Ensure function doesn't time out on free plan
};

// ✅ Axios instance with retry logic
const axiosInstance = axios.create({
  timeout: 5000, // 5 seconds timeout
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },
});

// ✅ Helper: Delay function to avoid rate limits
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Clean and truncate description
function cleanDescription(description: string): string {
  return description
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function truncateDescription(description: string, maxLength: number): string {
  return description.length > maxLength
    ? description.slice(0, maxLength) + "..."
    : description;
}

function isGibberish(text: string): boolean {
  if (text.startsWith("%PDF")) return true;
  if (text.includes("font-family:") || text.includes("text-anchor:")) return true;
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

// Fetch favicon (unchanged)
async function fetchFavicon(url: string): Promise<string> {
  try {
    if (!url || url === "undefined" || url === "") {
      return "/placeholder.png";
    }
    const baseUrl = new URL(url);
    if (baseUrl.hostname.includes("arxiv.org")) {
      return "https://static.arxiv.org/static/browse/0.3.4/images/arxiv-logo-fb.png";
    }
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    let faviconUrl =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href");
    if (faviconUrl) {
      if (!faviconUrl.startsWith("http")) {
        faviconUrl = new URL(faviconUrl, baseUrl.origin).href;
      }
    } else {
      faviconUrl = `${baseUrl.origin}/favicon.ico`;
    }
    const faviconResponse = await axios.head(faviconUrl);
    if (faviconResponse.status === 200) {
      return faviconUrl;
    }
    const domain = getDomain(url);
    console.log(domain);
    const faviconkitUrl = `https://api.faviconkit.com/${domain}/144`;
    const faviconkitResponse = await axios.head(faviconkitUrl);
    return faviconkitResponse.status === 200 ? faviconkitUrl : "/placeholder.png";
  } catch {
    return "/placeholder.png";
  }
}

// GET handler using caching and Promise.allSettled.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") as StoryType) || "topstories";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 30;
  try {
    // Use in-memory cache for story IDs.
    let storyIds = cachedStoryIds[type]?.data;
    if (!storyIds || Date.now() - cachedStoryIds[type]!.timestamp > CACHE_DURATION) {
      const response = await axiosInstance.get(`${HN_API_BASE}/${type}.json`);
      storyIds = [...new Set(response.data as number[])];
      cachedStoryIds[type] = { data: storyIds, timestamp: Date.now() };
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const storiesToFetch = storyIds.slice(start, end);

    // ✅ Process stories in **batches** of 5 (to prevent 504 timeout)
    const batchSize = 5;
    const fetchedStories: Story[] = [];

    for (let i = 0; i < storiesToFetch.length; i += batchSize) {
      const batch = storiesToFetch.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map((id,index) => fetchStory(id, index)));

      fetchedStories.push(
        ...results.map((res) =>
          res.status === "fulfilled"
            ? res.value
            : {
                id: 0,
                title: "Error fetching story",
                description: "",
                image: "/placeholder.png",
                url: `https://news.ycombinator.com/item?id=0`,
                score: 0,
                time: 0,
                by: "",
                descendants: 0,
              }
        )
      );

      await delay(500); // ✅ Add slight delay between batches
    }

    return NextResponse.json(fetchedStories, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchStoryIds(type: StoryType): Promise<number[]> {
  const response = await axios.get(`${HN_API_BASE}/${type}.json`);
  return [...new Set(response.data as number[])];
}

async function fetchStory(id: number, index: number): Promise<Story> {
  try {
    const response = await axios.get(`${HN_API_BASE}/item/${id}.json`);
    const story = response.data;
    let image = "/placeholder.png";
    let description = "";
    const url = story.url || `https://news.ycombinator.com/item?id=${id}`;

    // Fetch metadata only for the first 5 stories to reduce timeout risk.
    if (story.url && index < 5) {
      const metadata = await fetchMetadata(story.url);
      image = metadata.image;
      description = metadata.description;
    }
    // Special handling for YouTube.
    if (story.url && (story.url.includes("youtube.com") || story.url.includes("youtu.be"))) {
      const videoId = getYouTubeVideoId(story.url);
      if (videoId) {
        image = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        return {
          ...story,
          id,
          image,
          description: truncateDescription(cleanDescription(description), 200),
          url,
        };
      }
    }
    // Handle Hacker News URL specifically.
    if (url.includes("news.ycombinator.com") || url.includes("ycombinator.com")) {
      image = "/hn-logo.png";
      return {
        ...story,
        id,
        image,
        description: truncateDescription(cleanDescription(description), 200),
        url,
      };
    }
    // If metadata didn't yield an image, fetch favicon.
    if ((!image || image === "/placeholder.png") && story.url) {
      image = await fetchFavicon(story.url);
    }
    return {
      ...story,
      id,
      image,
      description: truncateDescription(cleanDescription(description), 200),
      url,
    };
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
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
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
          return Boolean(width && height && parseInt(width) > 200 && parseInt(height) > 200);
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
