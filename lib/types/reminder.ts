export interface Reminder {
  id: string;

  title?: string;

  completed?: boolean;

  created_at: string;

  reminder_date?: string;

  recurring?: boolean;

  user_id?: string;
}