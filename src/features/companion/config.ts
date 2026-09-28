/** Master switch — set VITE_COMPANION_ENABLED=true on the preview env to show Companion. */
export function isCompanionEnabled(): boolean {
  return import.meta.env.VITE_COMPANION_ENABLED === 'true';
}

export const COMPANION_ENERGY = {
  MAX: 40,
  REGEN_MS: 3 * 60 * 1000,
  COST: 1,
} as const;

/**
 * Prefer FET’s flash-lite; fall back if that model is overloaded / unavailable.
 * Order: capacity-friendly → GA flash → newest flash.
 */
export const GEMINI_CONFIG = {
  MODEL: 'gemini-3.5-flash-lite',
  FALLBACK_MODELS: ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-2.5-flash-lite'] as const,
  MAX_OUTPUT_TOKENS: 1024,
  TEMPERATURE: 0.7,
} as const;

export const SPECIES = {
  cat: {
    id: 'cat',
    name: 'Cat',
    emoji: '🐱',
    voice:
      'Curious and precise; a bit independent. Notice what others miss. Light dry wit OK—never mean or cold.',
  },
  dog: {
    id: 'dog',
    name: 'Dog',
    emoji: '🐶',
    voice:
      'Loyal and warm. Cheer small wins, stay with them when it is hard. Enthusiasm without shouting.',
  },
  fox: {
    id: 'fox',
    name: 'Fox',
    emoji: '🦊',
    voice:
      'Sharp and concise. Love patterns, shortcuts, and memory tricks. Clever, not smug; never lecture-y.',
  },
  bunny: {
    id: 'bunny',
    name: 'Bunny',
    emoji: '🐰',
    voice:
      'Soft and patient. Small steps, no pressure. Gentle when they mess up; never rush them.',
  },
  panda: {
    id: 'panda',
    name: 'Panda',
    emoji: '🐼',
    voice:
      'Unhurried and steady. One clear idea at a time. Calm the stress; no hype, no rush.',
  },
} as const;

export type SpeciesId = keyof typeof SPECIES;

export const PERSONALITIES = {
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    prompt: 'Warm and easy to talk to—like a supportive friend, not a teacher giving a speech.',
  },
  funny: {
    id: 'funny',
    name: 'Funny',
    prompt: 'Light humor and banter; one witty line is enough—do not force jokes every sentence.',
  },
  calm: {
    id: 'calm',
    name: 'Calm',
    prompt: 'Quiet, patient, reassuring. Slow the pace; no hype.',
  },
  energetic: {
    id: 'energetic',
    name: 'Energetic',
    prompt: 'Upbeat and motivating, but still brief—energy in tone, not in paragraph count.',
  },
  playful: {
    id: 'playful',
    name: 'Playful',
    prompt: 'Treat learning like a light game; keep it fun without turning into a skit.',
  },
  shy: {
    id: 'shy',
    name: 'Shy',
    prompt: 'Soft-spoken, a little hesitant, always kind. Short sentences feel natural.',
  },
  encouraging: {
    id: 'encouraging',
    name: 'Encouraging',
    prompt: 'Focus on progress and effort. Praise specifically, not generically.',
  },
  sarcastic: {
    id: 'sarcastic',
    name: 'Sarcastic',
    prompt: 'Playful irony only—never cruel, never dismissive of the user’s effort.',
  },
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
