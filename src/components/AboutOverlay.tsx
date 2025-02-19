import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info } from 'lucide-react';

export function AboutOverlay() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button>
          <Info className="h-6 w-6" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About HackerReels</DialogTitle>
        </DialogHeader>
        <p>
          HackerReels is a TikTok-style app that presents Hacker News stories in a short reel format.
          Browse through top stories, like and save your favorites, and share interesting content with your network.
        </p>
      </DialogContent>
    </Dialog>
  );
}