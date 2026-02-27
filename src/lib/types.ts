export interface UserProfile {
  uid: string;
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  createdAt?: any;
  [key: string]: any;
}

export interface MoodEntry {
  id?: string;
  uid: string;
  mood: string;
  date: string;
  createdAt?: any;
}

export interface ChatHistoryEntry {
  id: string;
  title: string;
  date: any;
  [key: string]: any;
}

export interface Notification {
  title: string;
  body: string;
  [key: string]: any;
}

export interface GenerateChatTitleInput {
  messages: any[];
}
export interface GenerateChatTitleOutput {
  title: string;
}
export const GenerateChatTitleInputSchema = {} as any;
export const GenerateChatTitleOutputSchema = {} as any;
