import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info, Github } from 'lucide-react';

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
        <div className="mt-6 flex items-center space-x-2">
          <Github className="h-5 w-5 text-gray-800 dark:text-gray-200" />
          <a 
            href="https://github.com/ApoorvaKhajbage/hacker-tok" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            View on GitHub
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}