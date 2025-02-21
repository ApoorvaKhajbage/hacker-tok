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
          <DialogTitle>About HackerTok</DialogTitle>
        </DialogHeader>
        <p>
        HackerTok transforms the way you experience Hacker News by presenting its stories in a modern format, much like TikTok. Enjoy an engaging, swipeable interface.
        </p>
      </DialogContent>
    </Dialog>
  );
}