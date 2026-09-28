import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompanion } from '../CompanionProvider';
import { SPECIES, PERSONALITIES, COMPANION_ENERGY } from '../config';
import { PetAvatar } from './PetAvatar';
import { Button } from '@/components/ui/Button';

export function DashboardPet() {
  const { enabled, ready, profile, setHidden } = useCompanion();
  const [open, setOpen] = useState(false);

  if (!enabled || !ready || !profile?.unlocked || profile.hidden_on_dashboard) return null;
  if (!profile.species || !profile.name) return null;

  const species = SPECIES[profile.species] || SPECIES.fox;
  const energyPct = Math.round(
    (profile.energy / (profile.max_energy || COMPANION_ENERGY.MAX)) * 100
  );
  const mood = profile.mood || 'happy';

  return (
    <div className="fixed z-30 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 lg:bottom-6 lg:right-6 flex flex-col items-end gap-2 pointer-events-none">
      {open && (
        <div className="pointer-events-auto w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <PetAvatar species={profile.species} mood={mood} size="md" />
              <div>
                <div className="font-semibold text-sm">{profile.name}</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Ready to study?</p>
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-[var(--muted-foreground)] min-h-9 px-1"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            ⚡ Energy {profile.energy}/{profile.max_energy}
            <div className="h-1.5 rounded-full bg-[var(--muted)] mt-1 overflow-hidden">
              <div
                className="h-full bg-[var(--accent-color)] rounded-full transition-all"
                style={{ width: `${energyPct}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Link to="/companion?mode=chat" onClick={() => setOpen(false)}>
              <Button size="sm" variant="outline" className="w-full text-xs px-1">
                Chat
              </Button>
            </Link>
            <Link to="/companion?mode=teach" onClick={() => setOpen(false)}>
              <Button size="sm" variant="outline" className="w-full text-xs px-1">
                Teach Me
              </Button>
            </Link>
            <Link to="/companion?mode=review" onClick={() => setOpen(false)}>
              <Button size="sm" variant="outline" className="w-full text-xs px-1">
                Review
              </Button>
            </Link>
          </div>
          <Link
            to="/companion"
            className="block text-center text-xs text-[var(--accent-color)] hover:underline"
            onClick={() => setOpen(false)}
          >
            Open Companion →
          </Link>
          <button
            type="button"
            className="block w-full text-center text-[10px] text-[var(--muted-foreground)] min-h-9"
            onClick={() => {
              void setHidden(true);
              setOpen(false);
            }}
          >
            Hide for now
          </button>
          <p className="text-[10px] text-center text-[var(--muted-foreground)]">
            {PERSONALITIES[profile.personality || 'friendly']?.name} · {species.name}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 backdrop-blur px-2.5 py-2 shadow-md hover:shadow-lg transition-shadow"
        aria-label={`${profile.name} companion`}
      >
        <PetAvatar species={profile.species} mood={mood} size="md" />
        <span className="text-[10px] font-medium mt-0.5 text-[var(--muted-foreground)] max-w-[4.5rem] truncate">
          {profile.name}
        </span>
      </button>
    </div>
  );
}
