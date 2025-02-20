"use client";
import { useState, useEffect, useRef } from "react";
import { StoryCard } from "@/components/StoryCard";
import { InfiniteScroll } from "@/components/InfiniteScroll";
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
  const [storiesByCategory, setStoriesByCategory] = useState<{
    [key in StoryType]?: Story[];
  }>({});
  // Cache current page number for each category.
  const [pages, setPages] = useState<Record<StoryType, number>>(initialPages);
  // Cache "hasMore" flags for each category.
  const [hasMoreByCategory, setHasMoreByCategory] = useState<Record<StoryType, boolean>>(initialHasMore);
  const [category, setCategory] = useState<StoryType>("topstories");
  const [loading, setLoading] = useState(false);
  const [savedPostsOpen, setSavedPostsOpen] = useState(false);
  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const { toast } = useToast();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // When the category changes, if no stories have been loaded, load them.
  useEffect(() => {
    if (!storiesByCategory[category]) {
      setPages((prev) => ({ ...prev, [category]: 1 }));
      setHasMoreByCategory((prev) => ({ ...prev, [category]: true }));
      loadStories();
    }
  }, [category]);

  // Initialize savedStories from localStorage on mount.
  useEffect(() => {
    const storedSavedStories = JSON.parse(localStorage.getItem("savedStories") || "[]");
    setSavedStories(storedSavedStories);
  }, []);

  // IntersectionObserver to auto-load next stories when the sentinel comes into view.
  useEffect(() => {
    if (!loading && hasMoreByCategory[category] && sentinelRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadStories();
          }
        },
        {
          root: null,
          threshold: 1.0,
        }
      );
      observer.observe(sentinelRef.current);
      return () => observer.disconnect();
    }
  }, [hasMoreByCategory, loading, category, pages]);

  const loadStories = async () => {
    if (loading) return;
    setLoading(true);
    const currentPage = pages[category] || 1;
    try {
      const newStories = await fetchStories(category, currentPage);
      console.log(`Fetched ${newStories.length} stories for ${category} on page ${currentPage}`);
      if (newStories.length > 0) {
        setStoriesByCategory((prev) => ({
          ...prev,
          [category]: [...(prev[category] || []), ...newStories],
        }));
        setPages((prev) => ({ ...prev, [category]: currentPage + 1 }));
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
    const updatedSavedStories = savedStories.filter((story) => story.id !== id);
    setSavedStories(updatedSavedStories);
    localStorage.setItem("savedStories", JSON.stringify(updatedSavedStories));
  };

  const handleCategoryChange = (newCategory: StoryType) => {
    setCategory(newCategory);
    // We retain the previously cached stories.
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
      console.error("Error copying:", err);
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
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
          <h1 className="text-2xl font-bold">HackerReels</h1>
          <div className="flex items-center space-x-4">
            <CategoryFilter currentCategory={category} onCategoryChange={handleCategoryChange} />
            <button onClick={toggleSavedPosts} className="text-gray-600 dark:text-white">
              <Bookmark className="h-6 w-6" />
            </button>
            <AboutOverlay />
          </div>
        </div>
      </header>

      {/* Snap-scrolling container for full-screen cards */}
      <div className="pt-16 snap-y snap-mandatory h-screen w-full overflow-y-auto">
        {(storiesByCategory[category] || []).map((story, index) => (
          <div key={`${story.id}-${index}`} className="snap-start h-screen mb-4 flex items-center justify-center">
            <StoryCard
              story={story}
              isLiked={savedStories.some((savedStory) => savedStory.id === story.id)}
              onLike={handleLike}
              onShare={handleShare}
            />
          </div>
        ))}
        {/* Sentinel element for triggering auto-load */}
        <div ref={sentinelRef} className="h-20"></div>
      </div>

      {/* Floating “Load More” button */}
      {hasMoreByCategory[category] && !loading && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/80 dark:bg-gray-800/80 p-4 text-center">
          <Button onClick={() => loadStories()}>Load More</Button>
        </div>
      )}

      {/* Saved Posts Modal */}
      <SavedPosts
        isOpen={savedPostsOpen}
        onClose={toggleSavedPosts}
        savedStories={savedStories}
        onRemove={handleRemoveFromSaved}
      />

      <InfiniteScroll
        onLoadMore={() => loadStories()}
        hasMore={hasMoreByCategory[category]}
        loadStories={loadStories}
        loading={loading}
        currentPage={pages[category] || 1}
      />
    </main>
  );
}
