import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Share2, ExternalLink, Link2 } from "lucide-react";
import { Story } from "@/lib/types";
import { formatDate, getDomain } from "@/utils/utils";

interface StoryCardProps {
  story: Story;
  isLiked: boolean;
  onLike: (id: number) => void;
  onShare: (url: string) => void;
}

export function StoryCard({ story, isLiked, onLike, onShare }: StoryCardProps) {
  const handleDoubleClick = () => {
    onLike(story.id);
  };

  return (
    <Card
      onDoubleClick={handleDoubleClick}
      className="
        relative 
        w-full 
        bg-gray-800
        overflow-hidden 
        mx-auto
        max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl
        flex flex-col 
        min-h-[80vh]   /* Ensures good vertical space */
      "
    >
      {/* Main content area grows to fill space */}
      <CardContent className="flex-1 flex flex-col p-4 sm:p-6">
        {/* Image container with a centered image */}
        {/* Image container with dynamic handling for favicons */}
        <div className="relative w-full h-64 sm:h-80 md:h-96 mb-4 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          <img
            src={story.image || "/placeholder.png"}
            alt={story.title}
            className={`object-contain ${
              story.image?.includes("favicon")
                ? "w-30 h-40"
                : "max-w-full max-h-full"
            }`}
          />
        </div>

        {/* Text content */}
        <div className="flex-1 flex flex-col text-white space-y-3 sm:space-y-4">
          {/* Title */}
          <h2 className="text-2xl font-bold line-clamp-3">{story.title}</h2>

          {/* Stats row */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-300">
            <span>{formatDate(story.time)}</span>
            <span>•</span>
            <span>{story.score} points</span>
            <span>•</span>
            <span>{story.descendants} comments</span>
          </div>

          {/* Domain & link */}
          <div className="flex items-center text-sm text-gray-300 space-x-2">
            <span>{getDomain(story.url)}</span>
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 flex items-center"
            >
              <Link2 className="h-4 w-4" />
            </a>
          </div>

          {/* Description */}
          <p className="text-md text-gray-200 leading-relaxed line-clamp-4 sm:line-clamp-5 md:line-clamp-6">
            {story.description}
          </p>

          {/* Discussion link */}
          <a
            href={`https://news.ycombinator.com/item?id=${story.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 hover:text-blue-500 text-sm inline-block hover:underline"
          >
            Go to Discussion →
          </a>
        </div>
      </CardContent>

      {/* Footer pinned at the bottom, separated by a border */}
      <CardFooter className="border-t border-gray-800 p-6 pb-10">
        <div className="w-full flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onLike(story.id)}
            className="hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
          >
            <Heart
              className={`h-4 w-4 sm:h-5 sm:w-5 ${
                isLiked ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={() => onShare(story.url)}
            className="hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
          >
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
          >
            <a href={story.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </a>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
