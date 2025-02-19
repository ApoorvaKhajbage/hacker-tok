import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { StoryType } from '@/lib/types';

interface CategoryFilterProps {
  currentCategory: StoryType;
  onCategoryChange: (category: StoryType) => void;
}

export function CategoryFilter({ currentCategory, onCategoryChange }: CategoryFilterProps) {
  const categories: { label: string; value: StoryType }[] = [
    { label: 'Top Stories', value: 'topstories' },
    { label: 'New Stories', value: 'newstories' },
    { label: 'Best Stories', value: 'beststories' },
    { label: 'Ask HN', value: 'askstories' },
    { label: 'Show HN', value: 'showstories' },
    { label: 'Jobs', value: 'jobstories' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {categories.find(c => c.value === currentCategory)?.label}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {categories.map((category) => (
          <DropdownMenuItem key={category.value} onSelect={() => onCategoryChange(category.value)}>
            {category.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}