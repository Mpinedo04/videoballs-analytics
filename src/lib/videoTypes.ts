export type Platform = 'youtube' | 'tiktok' | 'instagram';

export interface VideoData {
  platform_id: string;
  title: string;
  platform: Platform;
  views: number;
  thumbnail_url: string;
  video_url: string;
  published_at: string;
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
  duration?: number;
  hashtags?: string[];
}

export interface StoredVideo extends VideoData {
  id: string;
  group_id: string | null;
  updated_at?: string;
}

