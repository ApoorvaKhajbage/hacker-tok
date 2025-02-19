"use client";
import { useState, useEffect } from "react";
import { StoryCard } from "@/components/StoryCard";
import { InfiniteScroll } from "@/components/InfiniteScroll";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SavedPosts } from "@/components/SavedPosts";
import { AboutOverlay } from "@/components/AboutOverlay";
import { fetchStories } from "@/lib/api";
import { Story, StoryType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react"; // Heart Icon for Saved Posts

export default function Home() {
  const [storiesByCategory, setStoriesByCategory] = useState<{
    [key in StoryType]?: Story[];
  }>({});
  const [category, setCategory] = useState<StoryType>("topstories");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [savedPostsOpen, setSavedPostsOpen] = useState(false);
  const [savedStories, setSavedStories] = useState<Story[]>([]); // State for saved stories
  const { toast } = useToast();

  useEffect(() => {
    setStoriesByCategory({});
    setPage(1);
    setHasMore(true);
    loadStories(1);
  }, [category]);

  useEffect(() => {
    // Sync saved stories state with localStorage
    const storedSavedStories = JSON.parse(
      localStorage.getItem("savedStories") || "[]"
    );
    setSavedStories(storedSavedStories);
  }, []); // Only run on component mount to initialize the saved stories

  const loadStories = async (currentPage: number) => {
    if (loading) return;

    setLoading(true);
    const start = Date.now();
    try {
      const newStories = await fetchStories(category, page);
      console.log(
        `Fetched ${newStories.length} stories in ${Date.now() - start}ms`
      );

      if (newStories.length > 0) {
        setStoriesByCategory((prev) => ({
          ...prev,
          [category]: [...(prev[category] || []), ...newStories],
        }));
        setPage(currentPage + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      toast({
        title: "Error fetching stories",
        description: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromSaved = (id: number) => {
    // Remove from local storage
    const updatedSavedStories = savedStories.filter((story) => story.id !== id);
    setSavedStories(updatedSavedStories);
    localStorage.setItem("savedStories", JSON.stringify(updatedSavedStories));
  };

  const handleCategoryChange = (newCategory: StoryType) => {
    setCategory(newCategory);
    setPage(1); // Reset to the first page when category changes
    setLoading(false);
  };

  const handleLike = (id: number) => {
    const savedStories: Story[] = JSON.parse(
      localStorage.getItem("savedStories") || "[]"
    );
    const isLiked = savedStories.some((story) => story.id === id);

    if (isLiked) {
      const updatedSavedStories = savedStories.filter(
        (story) => story.id !== id
      );
      setSavedStories(updatedSavedStories); // Update the state
      localStorage.setItem("savedStories", JSON.stringify(updatedSavedStories));
    } else {
      const storyToAdd = storiesByCategory[category]?.find(
        (story) => story.id === id
      );
      if (storyToAdd) {
        const updatedSavedStories = [...savedStories, storyToAdd];
        setSavedStories(updatedSavedStories); // Update the state
        localStorage.setItem(
          "savedStories",
          JSON.stringify(updatedSavedStories)
        );
      }
    }

    // setStoriesByCategory((prev) => ({
    //   ...prev,
    //   [category]: prev[category]?.map((story) =>
    //     story.id === id ? { ...story, isLiked: !isLiked } : story
    //   ),
    // }));
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
            <CategoryFilter
              currentCategory={category}
              onCategoryChange={handleCategoryChange}
            />
            <button
              onClick={toggleSavedPosts}
              className="text-gray-600 dark:text-white"
            >
              <Heart className="h-6 w-6" />
            </button>
            <AboutOverlay />
          </div>
        </div>
      </header>
      {/* Snap-scrolling container for full-screen cards */}
      <div className="snap-y snap-mandatory h-screen w-full overflow-y-auto">
        {(storiesByCategory[category] || []).map((story, index) => (
          <div
            key={`${story.id}-${index}`}
            className="snap-start h-screen mb-4 flex items-center justify-center"
          >
            <StoryCard
              story={story}
              isLiked={savedStories.some(
                (savedStory) => savedStory.id === story.id
              )}
              onLike={handleLike}
              onShare={handleShare}
            />
          </div>
        ))}
      </div>

      {hasMore && !loading && (
        <div className="mt-4 text-center">
          <Button onClick={() => loadStories(page)}>Load More</Button>
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
        onLoadMore={() => loadStories(page)}
        hasMore={hasMore}
        loadStories={loadStories}
        loading={loading}
        currentPage={page}
      />
    </main>
  );
}
