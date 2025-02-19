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
  const handleDoubleClick = () => {
    onLike(story.id);
  };

  return (
    // Use shadcn Card; make it fill its container (we'll control container dimensions in page.tsx)
    <Card className="relative w-full max-w-[600px] aspect-[9/16] overflow-hidden" onDoubleClick={handleDoubleClick}>
      {/* Background image covers entire card */}
      <img
        src={story.image || '/placeholder.jpg'}
        alt={story.title}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay container: covers entire card, applies a dark translucent background with blur */}
      <CardContent className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-4">
        <div className="text-white mb-4">
          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">{story.title}</h2>

          {/* Metadata: Date, Score, Comments */}
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>{formatDate(story.time)}</span>
            <span>{story.score} points</span>
            <span>{story.descendants} comments</span>
          </div>

          {/* Domain & Original Post Link */}
          <div className="flex items-center text-sm text-gray-300 mb-2">
            <span>{getDomain(story.url)}</span>
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-300 hover:underline flex items-center"
            >
              <Link2 className="h-3 w-3" />
            </a>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-100 mb-2">{story.description}</p>

          {/* Go to Discussion Link */}
          <a
            href={`https://news.ycombinator.com/item?id=${story.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 hover:underline text-sm"
          >
            Go to Discussion →
          </a>
        </div>

        {/* Blurred Footer: Action Buttons */}
        <CardFooter className="flex justify-between">
          <Button variant="ghost" size="icon" onClick={() => onLike(story.id)}>
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onShare(story.url)}>
            <Share2 className="h-5 w-5 text-white" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={story.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-5 w-5 text-white" />
            </a>
          </Button>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
