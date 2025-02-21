"use client";
import { useState, useEffect, useRef } from "react";
import { StoryCard } from "@/components/StoryCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SavedPosts } from "@/components/SavedPosts";
import { AboutOverlay } from "@/components/AboutOverlay";
import { fetchStories } from "@/lib/api";
import { Story, StoryType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";

// Initialize state for all categories.
const initialPages: Record<StoryType, number> = {
  topstories: 1,
  newstories: 1,
  beststories: 1,
  askstories: 1,
  showstories: 1,
  jobstories: 1,
};

const initialHasMore: Record<StoryType, boolean> = {
  topstories: true,
  newstories: true,
  beststories: true,
  askstories: true,
  showstories: true,
  jobstories: true,
};

export default function Home() {
  // Cache stories per category.
  const [storiesByCategory, setStoriesByCategory] = useState<{ [key in StoryType]?: Story[] }>({});
  // Cache current page for each category.
  const [pages, setPages] = useState<Record<StoryType, number>>(initialPages);
  // Cache "hasMore" flags.
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<StoryType, boolean>>(initialHasMore);
  const [category, setCategory] = useState<StoryType>("topstories");
  const [loading, setLoading] = useState(false);
  const [savedPostsOpen, setSavedPostsOpen] = useState(false);
  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const { toast } = useToast();

  // Ref for the scroll container.
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref for the first new story index after a manual load.
  const newStartIndexRef = useRef<number | null>(null);
  // Flag to trigger auto-scroll after manual load.
  const [scrollOnLoad, setScrollOnLoad] = useState(false);
  // State to show the "Load More" button only when user has reached near the bottom.
  const [showLoadMore, setShowLoadMore] = useState(false);

  // When switching categories, scroll to the top.
  const handleCategoryChange = (newCategory: StoryType) => {
    setCategory(newCategory);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // On category change, if no stories are cached, fetch them.
  useEffect(() => {
    if (!storiesByCategory[category]) {
      setPages((prev) => ({ ...prev, [category]: 1 }));
      setHasMoreByCategory((prev) => ({ ...prev, [category]: true }));
      loadStories();
    } else {
      // Also reset scroll when switching back to a category.
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [category]);

  // Initialize savedStories from localStorage.
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("savedStories") || "[]");
    setSavedStories(stored);
  }, []);

  // Attach scroll event listener to container to check if user reached near bottom.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      // When scrollTop + clientHeight is within 50px of scrollHeight, consider user at bottom.
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
        setShowLoadMore(true);
      } else {
        setShowLoadMore(false);
      }
    };
    container.addEventListener("scroll", handleScroll);
    // Trigger once on mount.
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [storiesByCategory, category]);

  // Auto-scroll after manual "Load More" load.
  useEffect(() => {
    if (!loading && scrollOnLoad && containerRef.current && newStartIndexRef.current !== null) {
      const newElem = document.getElementById(`story-${newStartIndexRef.current}`);
      if (newElem) {
        newElem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      newStartIndexRef.current = null;
      setScrollOnLoad(false);
    }
  }, [storiesByCategory, loading, scrollOnLoad]);

  const loadStories = async () => {
    if (loading) return;
    setLoading(true);
    const currentPage = pages[category] || 1;
    // Record how many stories existed before loading.
    const oldCount = storiesByCategory[category]?.length || 0;
    try {
      const newStories = await fetchStories(category, currentPage);
      console.log(`Fetched ${newStories.length} stories for ${category} on page ${currentPage}`);
      if (newStories.length > 0) {
        setStoriesByCategory((prev) => ({
          ...prev,
          [category]: [...(prev[category] || []), ...newStories],
        }));
        setPages((prev) => ({ ...prev, [category]: currentPage + 1 }));
        newStartIndexRef.current = oldCount;
        setScrollOnLoad(true);
      } else {
        setHasMoreByCategory((prev) => ({ ...prev, [category]: false }));
      }
    } catch (error) {
      toast({
        title: "Error fetching stories",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromSaved = (id: number) => {
    const updated = savedStories.filter((story) => story.id !== id);
    setSavedStories(updated);
    localStorage.setItem("savedStories", JSON.stringify(updated));
  };

  const handleLike = (id: number) => {
    const stored = JSON.parse(localStorage.getItem("savedStories") || "[]") as Story[];
    const isLiked = stored.some((story) => story.id === id);
    if (isLiked) {
      const updated = stored.filter((story) => story.id !== id);
      setSavedStories(updated);
      localStorage.setItem("savedStories", JSON.stringify(updated));
    } else {
      const storyToAdd = storiesByCategory[category]?.find((story) => story.id === id);
      if (storyToAdd) {
        const updated = [...stored, storyToAdd];
        setSavedStories(updated);
        localStorage.setItem("savedStories", JSON.stringify(updated));
      }
    }
  };

  const handleShare = async (url: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast({
        title: "Link copied!",
        description: "The article link has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to copy link.${err}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const toggleSavedPosts = () => {
    setSavedPostsOpen((prev) => !prev);
  };

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 shadow-md p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">HackerTok</h1>
          <div className="flex items-center space-x-4">
            <CategoryFilter currentCategory={category} onCategoryChange={handleCategoryChange} />
            <button onClick={toggleSavedPosts} className=" dark:text-white">
              <Bookmark className="h-6 w-6" />
            </button>
            <AboutOverlay />
          </div>
        </div>
      </header>

      {/* Container for full-screen cards */}
      <div ref={containerRef} className="pt-16 snap-y snap-mandatory h-screen w-full overflow-y-auto">
        {loading && (!storiesByCategory[category] || storiesByCategory[category]?.length === 0) ? (
          // Central spinner for initial load.
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin">
              <div className="rounded-full h-16 w-16 border-t-4 border-black"></div>
            </div>
            <p className="mt-4 text-gray-700 dark:text-gray-300">Loading the stories...</p>
          </div>
        ) : (
          (storiesByCategory[category] || []).map((story, index) => (
            // Give each story container an id so we can scroll to it.
            <div id={`story-${index}`} key={`${story.id}-${index}`} className="snap-start h-screen mb-4 flex items-center justify-center">
              <StoryCard
                story={story}
                isLiked={savedStories.some((s) => s.id === story.id)}
                onLike={handleLike}
                onShare={handleShare}
              />
            </div>
          ))
        )}
      </div>

      {/* Floating "Load More" button or spinner – only shown when user has scrolled to bottom */}
      {storiesByCategory[category] &&
        storiesByCategory[category]!.length > 0 &&
        hasMoreByCategory[category] &&
        showLoadMore && (
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/80 dark:bg-gray-800/80 p-4 text-center">
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin">
                  <div className="rounded-full h-6 w-6 border-t-2 border-black"></div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setScrollOnLoad(true);
                  loadStories();
                }}
              >
                Load More
              </Button>
            )}
          </div>
        )}

      {/* Saved Posts Modal */}
      <SavedPosts
        isOpen={savedPostsOpen}
        onClose={toggleSavedPosts}
        savedStories={savedStories}
        onRemove={handleRemoveFromSaved}
      />
    </main>
  );
}
