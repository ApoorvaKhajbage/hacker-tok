import { SavedPostCard } from  "@/components/SavedPostCard";
import { Button } from "@/components/ui/button";
import { X} from "lucide-react";
import { Story } from "@/lib/types";

interface SavedPostsProps {
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: number) => void;
  savedStories: Story[]; // Use this prop for passed saved stories
}

export function SavedPosts({ isOpen, onClose, savedStories, onRemove }: SavedPostsProps) {


  return (
    <div
      className={`fixed inset-0 z-50 bg-black bg-opacity-85 ${
        isOpen ? "block" : "hidden"
      }`}
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 max-w-xl w-full mx-auto mt-10 p-4 rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4">
        <h2 className="text-2xl font-bold">Saved Posts</h2>
        <Button variant="ghost" onClick={onClose}>
        <X className="h-4 w-4" />
        </Button>
        </div>
       
        <div className="max-h-[60vh] overflow-y-auto">
          {savedStories.length > 0 ? (
            savedStories.map((story: Story) => (
              <SavedPostCard
                key={story.id}
                savedStory={story}
                onRemove={onRemove}
              />
            ))
          ) : (
            <p>No saved posts yet.</p>
          )}
        </div>
        
      </div>
    </div>
  );
}
