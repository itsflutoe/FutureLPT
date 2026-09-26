import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function calculateMastery(attempts: number, correct: number): import('../types').MasteryStatus {
  if (attempts === 0) return 'unseen';
  const accuracy = correct / attempts;
  if (attempts >= 4 && accuracy >= 0.9) return 'mastered';
  if (attempts >= 3 && accuracy >= 0.75) return 'strong';
  if (attempts >= 2 && accuracy >= 0.5) return 'improving';
  return 'learning';
}

/** Student-facing category labels (not raw DB enums). */
export function formatCategory(category: string | null | undefined): string {
  if (!category) return 'Mixed';
  switch (category) {
    case 'GENERAL_EDUCATION':
      return 'General Education';
    case 'PROFESSIONAL_EDUCATION':
      return 'Professional Education';
    case 'SPECIALIZATION':
      return 'Specialization';
    case 'MIXED':
      return 'Mixed';
    default:
      return category.replace(/_/g, ' ');
  }
}

export function formatMode(mode: string | null | undefined): string {
  if (!mode) return '';
  if (mode === 'practice') return 'Practice';
  if (mode === 'mock') return 'Mock';
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

/** Title for history / dashboard recent rows. */
export function formatSessionTitle(h: {
  is_daily_challenge?: boolean | null;
  subject?: string | null;
  category?: string | null;
}): string {
  if (h.is_daily_challenge) return 'Daily Challenge';
  if (h.subject) return h.subject;
  return formatCategory(h.category);
}
