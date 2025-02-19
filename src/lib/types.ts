export type StoryType = 'topstories' | 'newstories' | 'beststories' | 'askstories' | 'showstories' | 'jobstories';

export interface Story {
  id: number;
  title: string;
  url: string;
  score: number;
  time: number;
  by: string;
  descendants: number;
  image: string;
  description: string;
}