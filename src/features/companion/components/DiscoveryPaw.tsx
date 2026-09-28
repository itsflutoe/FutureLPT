import { useCompanion } from '../CompanionProvider';
import type { StudyContext } from '../types';

/** Subtle 🐾 on practice feedback when companion not yet unlocked. */
export function DiscoveryPaw({
  studyContext,
  isIncorrect,
}: {
  studyContext: StudyContext;
  isIncorrect: boolean;
}) {
  const { enabled, ready, profile, setLastMissContext, setDiscoveryOpen } = useCompanion();

  if (!enabled || !ready || !isIncorrect) return null;
  if (profile?.unlocked) return null;

  return (
    <button
      type="button"
      className="mt-3 inline-flex items-center justify-center text-lg opacity-70 hover:opacity-100 transition-opacity min-h-9 min-w-9"
      aria-label="Something was hiding"
      onClick={() => {
        setLastMissContext(studyContext);
        setDiscoveryOpen(true);
      }}
    >
      🐾
    </button>
  );
}
