/** Master switch — set VITE_COMPANION_ENABLED=true on the preview env to show Companion. */
export function isCompanionEnabled(): boolean {
  return import.meta.env.VITE_COMPANION_ENABLED === 'true';
}

export const COMPANION_ENERGY = {
  MAX: 40,
  REGEN_MS: 3 * 60 * 1000,
  COST: 1,
} as const;

/** Single place to change the Gemini model. */
export const GEMINI_CONFIG = {
  MODEL: 'gemini-2.0-flash',
  MAX_OUTPUT_TOKENS: 1024,
  TEMPERATURE: 0.7,
} as const;

export const SPECIES = {
  cat: { id: 'cat', name: 'Cat', emoji: '🐱', voice: 'Curious and precise; light dry wit.' },
  dog: { id: 'dog', name: 'Dog', emoji: '🐶', voice: 'Loyal and warm; cheer small wins.' },
  fox: { id: 'fox', name: 'Fox', emoji: '🦊', voice: 'Sharp and concise; love patterns and shortcuts.' },
  bunny: { id: 'bunny', name: 'Bunny', emoji: '🐰', voice: 'Soft and patient; small steps.' },
  panda: { id: 'panda', name: 'Panda', emoji: '🐼', voice: 'Calm and steady; one clear idea at a time.' },
} as const;

export type SpeciesId = keyof typeof SPECIES;

export const PERSONALITIES = {
  friendly: { id: 'friendly', name: 'Friendly', prompt: 'Warm and easy — like a supportive friend.' },
  funny: { id: 'funny', name: 'Funny', prompt: 'Light humor; one witty line is enough.' },
  calm: { id: 'calm', name: 'Calm', prompt: 'Quiet, patient, reassuring.' },
  energetic: { id: 'energetic', name: 'Energetic', prompt: 'Upbeat and motivating, still brief.' },
  playful: { id: 'playful', name: 'Playful', prompt: 'Treat learning like a light game.' },
  shy: { id: 'shy', name: 'Shy', prompt: 'Soft-spoken, a little hesitant, always kind.' },
  encouraging: { id: 'encouraging', name: 'Encouraging', prompt: 'Focus on progress and effort.' },
  sarcastic: { id: 'sarcastic', name: 'Sarcastic', prompt: 'Playful irony only — never cruel.' },
} as const;

export type PersonalityId = keyof typeof PERSONALITIES;

export type CompanionMood =
  | 'happy'
  | 'thinking'
  | 'mad'
  | 'sleepy'
  | 'excited'
  | 'curious'
  | 'confused'
  | 'proud'
  | 'celebrating'
  | 'encouraging'
  | 'studying'
  | 'waiting'
  | 'low_energy'
  | 'error';

export const MOOD_EMOJI: Record<CompanionMood, string> = {
  happy: '😊',
  thinking: '🤔',
  mad: '😤',
  sleepy: '😴',
  excited: '🤩',
  curious: '🧐',
  confused: '😵‍💫',
  proud: '😌',
  celebrating: '🎉',
  encouraging: '💪',
  studying: '📚',
  waiting: '👀',
  low_energy: '🥱',
  error: '😵',
};
