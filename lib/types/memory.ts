export interface Memory {
  id: string;

  title?: string;

  content?: string;

  created_at: string;

  ai_mood?: string;

  ai_category?: string;

  ai_summary?: string;

  ai_tags?: string[];

  user_id?: string;
}