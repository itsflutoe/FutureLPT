import { useState } from 'react';
import { useCompanion } from '../CompanionProvider';
import { SPECIES, PERSONALITIES, type SpeciesId, type PersonalityId } from '../config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function DiscoveryModal() {
  const { enabled, discoveryOpen, setDiscoveryOpen, unlockPet, lastMissContext } = useCompanion();
  const [step, setStep] = useState<'intro' | 'setup'>('intro');
  const [name, setName] = useState('Hosu');
  const [species, setSpecies] = useState<SpeciesId>('fox');
  const [gender, setGender] = useState('Prefer not to specify');
  const [personality, setPersonality] = useState<PersonalityId>('friendly');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  if (!enabled || !discoveryOpen) return null;

  const topic = lastMissContext?.topic || lastMissContext?.subject;

  const finish = async () => {
    setSaving(true);
    setErr('');
    try {
      await unlockPet({ name, species, gender, personality });
      setStep('intro');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save companion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl p-5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Discover companion"
      >
        {step === 'intro' ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-[var(--muted-foreground)]">Something was hiding in FutureLPT…</p>
            <div className="text-5xl">{SPECIES[species].emoji}</div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Hi.</p>
              <p>
                {topic
                  ? `I noticed that one about ${topic} was tricky.`
                  : 'I noticed you got that one wrong.'}
              </p>
              <p className="text-[var(--muted-foreground)]">Don't worry. That's what I'm here for.</p>
            </div>
            <Button className="w-full" onClick={() => setStep('setup')}>
              Meet your companion
            </Button>
            <button
              type="button"
              className="text-xs text-[var(--muted-foreground)]"
              onClick={() => setDiscoveryOpen(false)}
            >
              Not now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Meet your companion</h2>
            <div>
              <label className="text-xs font-medium mb-1 block">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Species</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(SPECIES) as SpeciesId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSpecies(id)}
                    className={`rounded-xl border p-2 text-xl ${
                      species === id
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
                        : 'border-[var(--border)]'
                    }`}
                    aria-label={SPECIES[id].name}
                  >
                    {SPECIES[id].emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Gender</label>
              <Input value={gender} onChange={(e) => setGender(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Personality</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PERSONALITIES) as PersonalityId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPersonality(id)}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${
                      personality === id
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {PERSONALITIES[id].name}
                  </button>
                ))}
              </div>
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button className="w-full" onClick={finish} disabled={saving}>
              {saving ? 'Saving…' : 'Begin'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
