import { SavedPostCard } from "@/components/SavedPostCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { X, Filter } from "lucide-react";
import { useState } from "react";
import { Story } from "@/lib/types";

interface SavedPostsProps {
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: number) => void;
  savedStories: Story[];
}

export function SavedPosts({ isOpen, onClose, savedStories, onRemove }: SavedPostsProps) {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Assume savedStories are in order of addition (oldest first).
  const sortedSavedStories =
    sortOrder === "newest" ? [...savedStories].reverse() : savedStories;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black bg-opacity-85 ${isOpen ? "block" : "hidden"}`}
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 max-w-xl w-full mx-auto mt-10 p-4 rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-2">
          <h2 className="text-2xl font-bold">Saved Posts</h2>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" title="Sort posts">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setSortOrder("newest")}>
                  Date added (newest)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder("oldest")}>
                  Date added (oldest)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {sortedSavedStories.length > 0 ? (
            sortedSavedStories.map((story: Story) => (
              <SavedPostCard key={story.id} savedStory={story} onRemove={onRemove} />
            ))
          ) : (
            <p>No saved posts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
