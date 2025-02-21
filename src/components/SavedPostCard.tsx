import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Link2 } from "lucide-react";
import { Story } from "@/lib/types";
import { formatDate, getDomain } from "@/utils/utils";


interface SavedPostProps {
    savedStory: Story;
    onRemove: (id: number) => void;
  }
  
  export function SavedPostCard({ savedStory, onRemove }: SavedPostProps) {
  
    return (
      <Card className="w-full flex flex-col relative">
        {/* Move the close button to the top right corner */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(savedStory.id)}
          className="absolute top-2 right-2"
        >
          <X className="h-4 w-4" />
        </Button>
  
        <CardContent className="flex-grow p-0">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-2">{savedStory.title}</h2>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
            <span>{formatDate(savedStory.time)}</span>
            <span>•</span>
            <span>{savedStory.score} points</span>
            <span>•</span>
            <span>{savedStory.descendants} comments</span>
          </div>
             {/* Display domain with hyperlink */}
             <div className="flex items-center space-x-2 text-sm mb-2">
              <span>{getDomain(savedStory.url)}</span>
              <a href={savedStory.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                <Link2 className="h-4 w-4" />
              </a>
            </div>
            <p className="text-sm text-gray-600 mb-4">{savedStory.description}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  