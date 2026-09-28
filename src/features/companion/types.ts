import type { PersonalityId, SpeciesId, CompanionMood } from './config';

export interface CompanionProfile {
  user_id: string;
  unlocked: boolean;
  unlocked_at: string | null;
  name: string | null;
  species: SpeciesId | null;
  gender: string | null;
  personality: PersonalityId | null;
  energy: number;
  max_energy: number;
  last_energy_update: string;
  memories: string[];
  gemini_api_key: string | null;
  hidden_on_dashboard: boolean;
  mood: CompanionMood;
  created_at: string;
  updated_at: string;
}

export interface CompanionMessage {
  id: string;
  user_id: string;
  role: 'user' | 'companion' | 'system';
  content: string;
  context_type: string;
  created_at: string;
}

export interface StudyContext {
  mode?: 'chat' | 'teach' | 'review';
  topic?: string;
  subject?: string;
  category?: string;
  questionText?: string;
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
}
