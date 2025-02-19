import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Share2, ExternalLink, Link2 } from 'lucide-react';
import { Story } from '@/lib/types';
import { formatDate, getDomain } from '@/utils/utils';

interface StoryCardProps {
  story: Story;
  isLiked: boolean;
  onLike: (id: number) => void;
  onShare: (url: string) => void;
}

export function StoryCard({ story, isLiked, onLike, onShare }: StoryCardProps) {
  // Handle the double-tap event to trigger like/unlike
  const handleDoubleClick = () => {
    onLike(story.id); // Trigger the like functionality
  };

  return (
    <Card className="w-full h-full flex flex-col" onDoubleClick={handleDoubleClick}>
      <CardContent className="flex-grow p-0">
        <img
          src={story.image || '/placeholder.jpg'}
          alt={story.title}
          className="w-full h-64 object-cover"
        />
        <div className="p-4">
          <h2 className="text-xl font-bold mb-2">{story.title}</h2>
          {/* Metadata */}
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{formatDate(story.time)}</span>
            <span>{story.score} points</span>
            <span>{story.descendants} comments</span>
          </div>
          {/* Domain & Original Post Link */}
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <span className="text-xs">{getDomain(story.url)}</span>
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-500 hover:text-blue-700 flex items-center"
            >
            <Link2 className="h-3 w-3" />
            </a>
          </div>
          <p className="text-sm text-gray-600 mb-2">{story.description}</p>
          {/* Go to Discussion Link */}
          <a
            href={`https://news.ycombinator.com/item?id=${story.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-sm mb-2"
          >
            Go to Discussion →
          </a>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {/* Like Button */}
        <Button variant="ghost" size="icon" onClick={() => onLike(story.id)}>
          <Heart
            className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
          />
        </Button>

        {/* Share Button */}
        <Button variant="ghost" size="icon" onClick={() => onShare(story.url)}>
          <Share2 className="h-4 w-4" />
        </Button>
        {/* External Link Button */}
        <Button variant="ghost" size="icon" asChild>
          <a href={story.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
