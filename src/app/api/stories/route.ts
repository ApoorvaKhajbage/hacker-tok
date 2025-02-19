import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { Story, StoryType } from "@/lib/types";
import { URL } from "url";

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

// Clean and truncate description
function cleanDescription(description: string): string {
  return description
    .replace(/https?:\/\/[^\s]+/g, "") // Remove URLs
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
    .trim();
}

function truncateDescription(description: string, maxLength: number): string {
  return description.length > maxLength
    ? description.slice(0, maxLength) + "..."
    : description;
}
function isGibberish(text: string): boolean {
  // For example, if text starts with '%PDF', it likely comes from a PDF
  if (text.startsWith("%PDF")) return true;
  // If the text contains typical CSS code, consider it gibberish.
  if (text.includes("font-family:") || text.includes("text-anchor:"))
    return true;
  // If the cleaned text is very short, it may not be a useful description.
  return false;
}

// Fetch favicon
// Fetch favicon
async function fetchFavicon(url: string): Promise<string> {
  try {
    if (!url || url === "undefined" || url === "") {
      return "/placeholder.jpg"; // Fallback for missing URL
    }

    const baseUrl = new URL(url);

    // If it's from ArXiv, return ArXiv's logo URL directly
    if (baseUrl.hostname.includes("arxiv.org")) {
      return "https://static.arxiv.org/static/browse/0.3.4/images/arxiv-logo-fb.png"; // ✅ External URL for ArXiv logo
    }

    // First, attempt to fetch the favicon from the <link rel="icon"> tag
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    let faviconUrl =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href");

    if (faviconUrl) {
      // Convert relative favicon URLs to absolute
      if (!faviconUrl.startsWith("http")) {
        faviconUrl = new URL(faviconUrl, baseUrl.origin).href;
      }
    } else {
      // Fallback to default `/favicon.ico`
      faviconUrl = `${baseUrl.origin}/favicon.ico`;
    }

    // Check if the favicon URL is valid
    const faviconResponse = await axios.head(faviconUrl);
    return faviconResponse.status === 200 ? faviconUrl : "/placeholder.jpg";
  } catch {
    return "/placeholder.jpg"; // Return default placeholder image in case of error
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") as StoryType) || "topstories";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 30; // Number of stories to fetch at once (adjust this as needed)

  try {
    const storyIds = await fetchStoryIds(type);

    // Fetch stories in batches (limit based on page number)
    const start = (page - 1) * limit;
    const end = start + limit;
    const storiesToFetch = storyIds.slice(start, end);

    const stories = await Promise.all(storiesToFetch.map(fetchStory));

    return NextResponse.json(stories);
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

async function fetchStoryIds(type: StoryType): Promise<number[]> {
  const response = await axios.get(`${HN_API_BASE}/${type}.json`);
  return [...new Set(response.data as number[])]; // Ensure IDs are unique
}

async function fetchStory(id: number, index: number): Promise<Story> {
  try {
    const response = await axios.get(`${HN_API_BASE}/item/${id}.json`);
    const story = response.data;

    let image = "/placeholder.jpg";
    let description = "";

    const url = story.url || `https://news.ycombinator.com/item?id=${id}`;

    // Handle Hacker News URL specifically
    if (url.includes("news.ycombinator.com")) {
      image = "/hn-logo.png"; // Specific logo for Hacker News
    }

    // Fetch metadata **only for the first 10 stories** to avoid too many requests
    if (story.url && index < 10) {
      const metadata = await fetchMetadata(story.url);
      image = metadata.image;
      description = metadata.description;
    }

    // Fetch favicon **only if metadata image is missing**
    if ((!image || image === "/placeholder.jpg") && story.url) {
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
      image: "/placeholder.jpg",
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
        "User-Agent": "Mozilla/5.0", // Some sites block requests without a user-agent
      },
    });
    const $ = cheerio.load(response.data);

    const baseUrl = new URL(url);

    // 1️⃣ EXTRACT IMAGE
    let image =
      $('meta[property="og:image" i]').attr("content")?.trim() ||
      $('meta[name="twitter:image" i]').attr("content")?.trim() ||
      $('meta[itemprop="image" i]').attr("content")?.trim() ||
      "";

    if (image && !image.startsWith("http")) {
      image = new URL(image, baseUrl.origin).href; // Convert relative to absolute URL
    }

    // 2️⃣ EXTRACT DESCRIPTION FROM META TAGS
    let description =
      $('meta[property="og:description" i]').attr("content")?.trim() ||
      $('meta[name="description" i]').attr("content")?.trim() ||
      $('meta[name^="twitter:description" i]').attr("content")?.trim() ||
      $('meta[name="citation_abstract" i]').attr("content")?.trim() ||
      $('meta[property="dc.description" i]').attr("content")?.trim() ||
      $('meta[name="dc.description" i]').attr("content")?.trim() ||
      $('meta[name="abstract" i]').attr("content")?.trim() ||
      $("p.abstract").text().trim() ||
      "";

    // 3️⃣ SPECIAL CASE: YOUTUBE
    if (
      baseUrl.hostname === "www.youtube.com" ||
      baseUrl.hostname === "youtu.be"
    ) {
      description = await fetchYouTubeDescription(url);
    }
    // 1️⃣ Skip description fetching if it's a PDF
    if (url.toLowerCase().endsWith(".pdf")) {
      description = "";
    } else {
      // 4️⃣ IF STILL NO DESCRIPTION, SCAN FOR PARAGRAPHS & pick the first non-gibberish
      if (!description) {
        const paragraphs: string[] = $("p")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((p) => p.length > 0);

        // Sort by length descending
        paragraphs.sort((a, b) => b.length - a.length);

        let selectedParagraph = "";
        for (const p of paragraphs) {
          const cleaned = cleanDescription(p);
          // If not gibberish, we pick it
          if (!isGibberish(cleaned)) {
            selectedParagraph = cleaned;
            break;
          }
        }

        description = selectedParagraph;
      }

      // 5️⃣ IF STILL no description, fallback to body snippet
      if (!description) {
        const bodyText = $("body").text().trim();
        let snippet = bodyText.slice(0, 300);
        if (bodyText.length > 300) snippet += "...";

        const cleanedSnippet = cleanDescription(snippet);
        // If snippet isn't gibberish, use it
        if (!isGibberish(cleanedSnippet)) {
          description = cleanedSnippet;
        } else {
          description = "";
        }
      }
    }

    // CLEAN & TRUNCATE
    description = cleanDescription(description);
    description = truncateDescription(description, 200);
    if (isGibberish(description)) {
      description = "";
    }

    return {
      image: image || "/placeholder.jpg",
      description: description || "",
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${url}:`, error);
    return {
      image: "/placeholder.jpg",
      description: "",
    };
  }
}
async function fetchYouTubeDescription(url: string): Promise<string> {
  try {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    if (!match) return "";

    const videoId = match[1];
    const apiKey = process.env.YOUTUBE_API_KEY; // Use your API key
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`;

    const response = await axios.get(apiUrl);
    return (
      response.data.items?.[0]?.snippet?.description ||
      "No description available."
    );
  } catch (error) {
    console.error("YouTube API fetch error:", error);
    return "";
  }
}
