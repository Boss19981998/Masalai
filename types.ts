
export interface Story {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  audioData?: string;
  author: string;
  createdAt: number;
  theme: string;
}

export type AppView = 'home' | 'create' | 'read' | 'loading';

export interface StoryConfig {
  childName: string;
  theme: string;
  moral: string;
  language: 'az' | 'tr';
}
