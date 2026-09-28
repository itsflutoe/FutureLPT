import { SPECIES, type CompanionMood } from '../config';
import type { SpeciesId } from '../config';

const SIZE_CLASS: Record<string, string> = {
  sm: 'companion-pet-sm',
  md: 'companion-pet-md',
  lg: 'companion-pet-lg',
  xl: 'companion-pet-xl',
  hero: 'companion-pet-hero',
};

export function PetAvatar({
  species = 'fox',
  mood = 'happy',
  size = 'lg',
  showBubble = true,
  hungry = false,
}: {
  species?: SpeciesId | string | null;
  mood?: CompanionMood | string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showBubble?: boolean;
  /** Pre-unlock: empty bowl / silhouette feel */
  hungry?: boolean;
}) {
  const id = (species && species in SPECIES ? species : 'fox') as keyof typeof SPECIES;
  const pet = SPECIES[id];
  const m = (mood || 'happy') as CompanionMood;

  const anim =
    hungry || m === 'low_energy' || m === 'sleepy'
      ? 'companion-pet-sleepy'
      : m === 'thinking'
        ? 'companion-pet-thinking'
        : m === 'mad' || m === 'error'
          ? 'companion-pet-mad'
          : m === 'excited' || m === 'celebrating'
            ? 'companion-pet-excited'
            : 'companion-pet-idle';

  const bubble =
    hungry
      ? '🍽'
      : m === 'sleepy' || m === 'low_energy'
        ? '💤'
        : m === 'thinking'
          ? '💭'
          : m === 'mad' || m === 'error'
            ? '💢'
            : m === 'excited' || m === 'celebrating'
              ? '✨'
              : null;

  return (
    <div
      className={`companion-pet-avatar ${SIZE_CLASS[size] || SIZE_CLASS.lg} ${anim} ${hungry ? 'is-hungry' : ''}`}
      role="img"
      aria-label={`${pet.name}, ${hungry ? 'hungry' : m}`}
    >
      <span className="companion-pet-emoji" aria-hidden>
        {hungry ? '🥚' : pet.emoji}
      </span>
      {showBubble && bubble && (
        <span className="companion-mood-bubble" aria-hidden>
          {bubble}
        </span>
      )}
    </div>
  );
}
