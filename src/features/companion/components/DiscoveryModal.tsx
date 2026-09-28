import { useState } from 'react';
import { useCompanion } from '../CompanionProvider';
import { SPECIES, PERSONALITIES, type SpeciesId, type PersonalityId } from '../config';
import { PetAvatar } from './PetAvatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Step = 'intro' | 'hungry' | 'feed' | 'setup';

/** Hidden mystery — no pet until after feed + identity. */
function MysteryBush({ size = 'hero' }: { size?: 'lg' | 'hero' }) {
  const dim = size === 'hero' ? 'text-6xl sm:text-7xl' : 'text-5xl';
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${dim}`}
      role="img"
      aria-label="Something hidden in the bushes"
    >
      <span className="drop-shadow-md" aria-hidden>
        🌿
      </span>
      <span
        className="absolute -bottom-1 text-2xl opacity-80 animate-pulse"
        aria-hidden
      >
        ✨
      </span>
    </div>
  );
}

export function DiscoveryModal() {
  const { enabled, discoveryOpen, setDiscoveryOpen, unlockPet, setApiKey, lastMissContext } =
    useCompanion();
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('Hosu');
  const [species, setSpecies] = useState<SpeciesId>('fox');
  const [gender, setGender] = useState('Prefer not to specify');
  const [personality, setPersonality] = useState<PersonalityId>('friendly');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  if (!enabled || !discoveryOpen) return null;

  const topic = lastMissContext?.topic || lastMissContext?.subject;

  const close = () => {
    setDiscoveryOpen(false);
    setStep('intro');
    setErr('');
  };

  const saveKeyAndContinue = async () => {
    const key = apiKeyDraft.trim();
    if (!key) {
      setErr('Paste a Gemini API key to feed your companion.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await setApiKey(key);
      setStep('setup');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save key');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!name.trim()) {
      setErr('Give your companion a name.');
      return;
    }
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/45 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl p-5 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Discover companion"
      >
        {step === 'intro' && (
          <div className="space-y-4 text-center">
            <p className="text-xs text-[var(--muted-foreground)]">Something was hiding in FutureLPT…</p>
            <div className="flex justify-center py-2">
              <MysteryBush />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Rustle…</p>
              <p>
                {topic
                  ? `You struggled with ${topic}. Something in the bushes noticed.`
                  : 'You missed that one. Something in the bushes noticed.'}
              </p>
              <p className="text-[var(--muted-foreground)]">
                Want to see what was hiding?
              </p>
            </div>
            <Button className="w-full min-h-12" onClick={() => setStep('hungry')}>
              Look closer
            </Button>
            <button type="button" className="text-xs text-[var(--muted-foreground)]" onClick={close}>
              Not now
            </button>
          </div>
        )}

        {step === 'hungry' && (
          <div className="space-y-4 text-center">
            <p className="text-[10px] font-bold tracking-widest text-[var(--accent-color)]">STEP 1</p>
            <div className="flex justify-center">
              <PetAvatar species="fox" mood="sleepy" size="hero" hungry />
            </div>
            <h2 className="font-semibold text-lg">A companion is hungry</h2>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              Before it can chat, teach, or review with you, it needs food. In FutureLPT, food is a free
              Gemini API key — your companion runs on your key, not ours.
            </p>
            <Button className="w-full min-h-12" onClick={() => setStep('feed')}>
              Feed 🍽
            </Button>
            <button
              type="button"
              className="text-xs text-[var(--muted-foreground)]"
              onClick={() => setStep('intro')}
            >
              Back
            </button>
          </div>
        )}

        {step === 'feed' && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold tracking-widest text-[var(--accent-color)] text-center">
              STEP 2 · FOOD
            </p>
            <div className="flex justify-center">
              <PetAvatar species="fox" mood="curious" size="lg" hungry />
            </div>
            <h2 className="font-semibold text-lg text-center">Connect Gemini</h2>
            <p className="text-sm text-[var(--muted-foreground)] text-center leading-relaxed">
              Get a free key from Google AI Studio, paste it below, and your companion wakes up.
            </p>
            <a
              className="block text-center text-sm font-medium text-[var(--accent-color)] hover:underline"
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
            >
              Find my Gemini key ↗
            </a>
            <div>
              <label className="text-xs font-medium mb-1 block">Paste Gemini API key</label>
              <Input
                type="password"
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder="Paste your key here"
                autoComplete="off"
              />
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Stored on your FLPT account only (you can read it via RLS). FutureLPT does not pay for
              Gemini usage.
            </p>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button
              className="w-full min-h-12"
              onClick={() => void saveKeyAndContinue()}
              disabled={saving || !apiKeyDraft.trim()}
            >
              {saving ? 'Feeding…' : 'Feed companion'}
            </Button>
            <button
              type="button"
              className="block w-full text-center text-xs text-[var(--muted-foreground)]"
              onClick={() => setStep('hungry')}
            >
              Back
            </button>
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold tracking-widest text-[var(--accent-color)] text-center">
              STEP 3 · IDENTITY
            </p>
            <div className="flex justify-center">
              <PetAvatar species={species} mood="happy" size="lg" />
            </div>
            <h2 className="font-semibold text-lg text-center">Who is your companion?</h2>
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
                    className={`rounded-xl border p-2 text-xl min-h-11 ${
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
              <select
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm min-h-11"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Prefer not to specify</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Personality</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PERSONALITIES) as PersonalityId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPersonality(id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs min-h-9 ${
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
            <Button className="w-full min-h-12" onClick={() => void finish()} disabled={saving}>
              {saving ? 'Waking up…' : `Meet ${name.trim() || 'companion'} ✨`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
