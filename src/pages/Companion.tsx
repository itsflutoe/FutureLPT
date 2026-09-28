import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useCompanion } from '@/features/companion/CompanionProvider';
import {
  isCompanionEnabled,
  SPECIES,
  PERSONALITIES,
  COMPANION_ENERGY,
  type SpeciesId,
  type PersonalityId,
} from '@/features/companion/config';
import { PetAvatar } from '@/features/companion/components/PetAvatar';
import { getMistakes, getTopicStats } from '@/services/progress';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { StudyContext } from '@/features/companion/types';

type CompanionMode = 'chat' | 'teach' | 'review' | 'settings';

export default function CompanionPage() {
  const enabled = isCompanionEnabled();
  const { user } = useAuth();
  const {
    ready,
    profile,
    messages,
    sendMessage,
    loading,
    setApiKey,
    updateProfile,
    setHidden,
  } = useCompanion();
  const [params] = useSearchParams();
  const modeParam = params.get('mode');
  const [mode, setMode] = useState<CompanionMode>('chat');
  const [input, setInput] = useState('');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [topics, setTopics] = useState<{ subject: string; topic: string; category: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [freeTopic, setFreeTopic] = useState('');
  const [mistakes, setMistakes] = useState<
    {
      question?: {
        question?: string;
        subject?: string;
        topic?: string;
        explanation?: string;
        correct_answer?: string;
      };
      attempts?: number;
      correct_count?: number;
    }[]
  >([]);
  const [keySaved, setKeySaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modeParam === 'settings' || modeParam === 'chat' || modeParam === 'teach' || modeParam === 'review') {
      setMode(modeParam);
    }
  }, [modeParam]);

  useEffect(() => {
    if (profile?.name) setNameDraft(profile.name);
  }, [profile?.name]);

  useEffect(() => {
    if (!user) return;
    void getTopicStats(user.id).then((rows) => {
      setTopics(
        rows.slice(0, 40).map((r) => ({
          subject: r.subject,
          topic: r.topic,
          category: r.category,
        }))
      );
    });
    void getMistakes(user.id, 20).then(setMistakes);
  }, [user]);

  useEffect(() => {
    const end = messagesEndRef.current;
    if (!end) return;
    end.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  if (!enabled) return <Navigate to="/dashboard" replace />;

  if (!ready) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  if (!profile?.unlocked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="flex justify-center">
          <PetAvatar species="fox" mood="waiting" size="hero" hungry />
        </div>
        <h1 className="text-xl font-bold">Companion not found yet</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Keep practicing. When you miss a question, watch for a quiet paw print.
        </p>
        <Link to="/practice">
          <Button>Go practice</Button>
        </Link>
      </div>
    );
  }

  const species = SPECIES[profile.species || 'fox'];
  const personality = PERSONALITIES[profile.personality || 'friendly'];
  const mood = loading ? 'thinking' : profile.mood || 'happy';
  const energyLow = profile.energy <= 0;
  const hasKey = !!profile.gemini_api_key?.trim();

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading || energyLow || mode === 'settings') return;
    const contextType: 'chat' | 'teach' | 'review' = mode;
    setInput('');
    let study: StudyContext | null = null;
    if (contextType === 'teach') {
      const topic = freeTopic.trim() || selectedTopic;
      study = { mode: 'teach', topic };
    }
    if (contextType === 'review') {
      const m = mistakes[0];
      study = {
        mode: 'review',
        topic: m?.question?.topic,
        subject: m?.question?.subject,
        questionText: m?.question?.question,
        correctAnswer: m?.question?.correct_answer,
        explanation: m?.question?.explanation,
      };
    }
    try {
      await sendMessage(text, contextType, study);
    } catch {
      /* pet line already in messages */
    }
  };

  const saveKey = async () => {
    await setApiKey(apiKeyDraft);
    setApiKeyDraft('');
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const heading =
    mode === 'teach'
      ? `Teach with ${profile.name}`
      : mode === 'review'
        ? `Review with ${profile.name}`
        : mode === 'settings'
          ? 'Companion settings'
          : `Talk to ${profile.name}`;

  return (
    <div className="mx-auto max-w-lg w-full px-3 sm:px-4 flex flex-col h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)] overflow-hidden">
      {/* Hero: pet LEFT · details RIGHT */}
      <section className="shrink-0 flex items-center gap-3 pt-3 pb-2">
        <div className="shrink-0">
          <PetAvatar
            species={profile.species}
            mood={energyLow ? 'sleepy' : mood}
            size="lg"
          />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-bold text-lg tracking-tight truncate">{profile.name}</h1>
              <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                {personality?.name} · {species.name}
              </p>
            </div>
            <Link
              to="/dashboard"
              className="shrink-0 text-[11px] text-[var(--accent-color)] hover:underline pt-1"
            >
              ← Home
            </Link>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]/40 px-2 py-0.5 text-[11px] font-medium">
              <span>⚡</span>
              <span className="tabular-nums">
                {profile.energy}/{profile.max_energy || COMPANION_ENERGY.MAX}
              </span>
              <span className="h-1.5 w-10 rounded-full bg-[var(--muted)] overflow-hidden">
                <span
                  className="block h-full bg-[var(--accent-color)] rounded-full transition-all"
                  style={{
                    width: `${Math.round(
                      (profile.energy / (profile.max_energy || COMPANION_ENERGY.MAX)) * 100
                    )}%`,
                  }}
                />
              </span>
            </div>
            <span
              className={`text-[11px] font-medium ${
                hasKey ? 'text-emerald-500' : 'text-amber-500'
              }`}
            >
              {hasKey ? 'Key OK' : 'Needs key'}
            </span>
          </div>
          {energyLow && (
            <p className="text-[11px] text-[var(--accent-color)] mt-1">Resting… energy refills soon</p>
          )}
        </div>
      </section>

      {/* Tabs include Settings so it’s always visible */}
      <div className="shrink-0 flex gap-1 mb-2">
        {(
          [
            { id: 'chat' as const, label: 'Chat' },
            { id: 'teach' as const, label: 'Teach' },
            { id: 'review' as const, label: 'Review' },
            { id: 'settings' as const, label: '⚙' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={`rounded-xl border py-2 text-xs font-semibold min-h-10 transition-colors ${
              t.id === 'settings' ? 'px-3 shrink-0' : 'flex-1'
            } ${
              mode === t.id
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-white'
                : 'border-[var(--border)] text-[var(--muted-foreground)]'
            }`}
            aria-label={t.id === 'settings' ? 'Settings' : t.label}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'settings' ? (
        <section className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pb-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-bold">Gemini API key</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Same free key as AI Studio / FET. Stored on your FutureLPT account only.
            </p>
            <p className={`text-xs font-semibold ${hasKey ? 'text-emerald-500' : 'text-amber-500'}`}>
              {hasKey ? 'Connected' : 'Not connected — paste a key below'}
            </p>
            <Input
              type="password"
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              placeholder={hasKey ? 'Paste new key to replace…' : 'Paste Gemini API key'}
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" onClick={() => void saveKey()} disabled={!apiKeyDraft.trim()}>
                {hasKey ? 'Update key' : 'Save key'}
              </Button>
              {hasKey && (
                <Button size="sm" variant="outline" onClick={() => void setApiKey('')}>
                  Disconnect
                </Button>
              )}
              <a
                className="text-xs font-medium text-[var(--accent-color)] hover:underline"
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
              >
                Get free key ↗
              </a>
            </div>
            {keySaved && <p className="text-xs text-emerald-500">Key saved. Try chatting again.</p>}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-bold">Identity</h2>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Name</span>
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={24}
              />
            </label>
            <Button
              size="sm"
              onClick={() => void updateProfile({ name: nameDraft.trim() || profile.name })}
              disabled={!nameDraft.trim() || nameDraft.trim() === profile.name}
            >
              Save name
            </Button>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Species</span>
              <select
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm min-h-11"
                value={profile.species || 'fox'}
                onChange={(e) => void updateProfile({ species: e.target.value as SpeciesId })}
              >
                {Object.values(SPECIES).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.emoji} {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Personality</span>
              <select
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm min-h-11"
                value={profile.personality || 'friendly'}
                onChange={(e) =>
                  void updateProfile({ personality: e.target.value as PersonalityId })
                }
              >
                {Object.values(PERSONALITIES).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <h2 className="text-sm font-bold mb-2">Dashboard pet</h2>
            <button
              type="button"
              className="text-sm text-[var(--accent-color)] font-medium"
              onClick={() => void setHidden(!profile.hidden_on_dashboard)}
            >
              {profile.hidden_on_dashboard ? 'Show pet on Dashboard' : 'Hide pet on Dashboard'}
            </button>
          </div>

          <Button className="w-full" onClick={() => setMode('chat')}>
            Back to chat
          </Button>
        </section>
      ) : (
        <>
          {!hasKey && (
            <div className="shrink-0 mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <p className="text-sm font-semibold">🍽 {profile.name} is hungry</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Paste a free Gemini key, or tap the <b>⚙</b> tab.
              </p>
              <Input
                type="password"
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder="Paste Gemini API key"
                autoComplete="off"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void saveKey()} disabled={!apiKeyDraft.trim()}>
                  Feed companion
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMode('settings')}>
                  Open settings
                </Button>
              </div>
            </div>
          )}

          {mode === 'teach' && (
            <div className="shrink-0 mb-2 space-y-1.5">
              <select
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-10"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                <option value="">Pick a FLPT topic…</option>
                {topics.map((t) => (
                  <option key={`${t.subject}-${t.topic}`} value={t.topic}>
                    {t.subject} — {t.topic}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Or type any topic…"
                value={freeTopic}
                onChange={(e) => setFreeTopic(e.target.value)}
              />
            </div>
          )}

          {mode === 'review' && (
            <p className="shrink-0 text-[11px] text-[var(--muted-foreground)] mb-1.5">
              Uses your recent FutureLPT mistakes ({mistakes.length} loaded).
            </p>
          )}

          <section className="flex-1 min-h-0 flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
            <div className="shrink-0 px-3 py-2 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">{heading}</p>
            </div>

            <div
              ref={messagesBoxRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {messages.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                  Say hello — or ask about a tough LET topic.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'companion' && (
                    <div className="shrink-0 mt-0.5">
                      <PetAvatar
                        species={profile.species}
                        mood="happy"
                        size="sm"
                        showBubble={false}
                      />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[82%] leading-relaxed whitespace-pre-wrap break-words ${
                      m.role === 'user'
                        ? 'bg-[var(--accent-color)] text-white rounded-br-md'
                        : 'bg-[var(--muted)]/50 border border-[var(--border)] rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-end">
                  <PetAvatar species={profile.species} mood="thinking" size="sm" />
                  <div className="rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--muted)]/50 px-3.5 py-2.5 text-sm italic text-[var(--muted-foreground)]">
                    thinking…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              className="shrink-0 flex gap-2 p-2.5 border-t border-[var(--border)] bg-[var(--card)]"
              style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
              onSubmit={(e) => {
                e.preventDefault();
                void onSend();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  energyLow
                    ? `${profile.name} is resting…`
                    : mode === 'chat'
                      ? `Message ${profile.name}…`
                      : mode === 'teach'
                        ? 'What should we learn?'
                        : 'What went wrong?'
                }
                disabled={loading || energyLow}
                className="min-h-11"
              />
              <Button
                type="submit"
                disabled={loading || energyLow || !input.trim()}
                className="min-h-11 px-4"
              >
                Send
              </Button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
