import axios from 'axios';
import { Story, StoryType } from './types';

export async function fetchStories(type: StoryType, page: number): Promise<Story[]> {
  const response = await axios.get(`/api/stories?type=${type}&page=${page}`);
  return response.data;
}