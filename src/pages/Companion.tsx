import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useCompanion } from '@/features/companion/CompanionProvider';
import {
  isCompanionEnabled,
  SPECIES,
  PERSONALITIES,
  COMPANION_ENERGY,
} from '@/features/companion/config';
import { PetAvatar } from '@/features/companion/components/PetAvatar';
import { getMistakes, getTopicStats } from '@/services/progress';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { StudyContext } from '@/features/companion/types';

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
    setHidden,
  } = useCompanion();
  const [params] = useSearchParams();
  const modeParam = (params.get('mode') as 'chat' | 'teach' | 'review') || 'chat';
  const [mode, setMode] = useState<'chat' | 'teach' | 'review'>(modeParam);
  const [input, setInput] = useState('');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(modeParam);
  }, [modeParam]);

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

  // FET-style: scroll only the messages list, not the whole page
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

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading || energyLow) return;
    setInput('');
    let study: StudyContext | null = null;
    if (mode === 'teach') {
      const topic = freeTopic.trim() || selectedTopic;
      study = { mode: 'teach', topic };
    }
    if (mode === 'review') {
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
      await sendMessage(text, mode, study);
    } catch {
      /* pet line already in messages */
    }
  };

  const heading =
    mode === 'teach'
      ? `Teach with ${profile.name}`
      : mode === 'review'
        ? `Review with ${profile.name}`
        : `Talk to ${profile.name}`;

  return (
    <div className="mx-auto max-w-lg w-full px-3 sm:px-4 flex flex-col h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)] overflow-hidden">
      {/* Compact hero — stays fixed, does not scroll with chat */}
      <section className="shrink-0 flex flex-col items-center text-center pt-3 pb-2">
        <PetAvatar
          species={profile.species}
          mood={energyLow ? 'sleepy' : mood}
          size="lg"
        />
        <h1 className="font-bold text-lg mt-1.5 tracking-tight">{profile.name}</h1>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          {personality?.name} · {species.name}
        </p>
        <div className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)]/40 px-2.5 py-0.5 text-[11px] font-medium">
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
        {energyLow && (
          <p className="text-[11px] text-[var(--accent-color)] mt-1">Resting… energy refills soon</p>
        )}
        <Link to="/dashboard" className="text-[11px] text-[var(--accent-color)] mt-1 hover:underline">
          ← Dashboard
        </Link>
      </section>

      {!profile.gemini_api_key && (
        <div className="shrink-0 mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <p className="text-sm font-medium">Your companion is hungry</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Add a free Gemini key so {profile.name} can reply.
          </p>
          <a
            className="text-xs font-medium text-[var(--accent-color)] hover:underline"
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
          >
            Find my Gemini key ↗
          </a>
          <Input
            type="password"
            value={apiKeyDraft}
            onChange={(e) => setApiKeyDraft(e.target.value)}
            placeholder="Paste Gemini API key"
            autoComplete="off"
          />
          <Button size="sm" onClick={() => void setApiKey(apiKeyDraft)} disabled={!apiKeyDraft.trim()}>
            Feed companion
          </Button>
        </div>
      )}

      <div className="shrink-0 flex gap-1.5 mb-2">
        {(['chat', 'teach', 'review'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl border py-2 text-xs font-semibold capitalize min-h-10 transition-colors ${
              mode === m
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-white'
                : 'border-[var(--border)] text-[var(--muted-foreground)]'
            }`}
          >
            {m === 'teach' ? 'Teach Me' : m}
          </button>
        ))}
      </div>

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

      {/* Chat panel — only this region scrolls (FET pattern) */}
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
                  <PetAvatar species={profile.species} mood="happy" size="sm" showBubble={false} />
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
          <Button type="submit" disabled={loading || energyLow || !input.trim()} className="min-h-11 px-4">
            Send
          </Button>
        </form>
      </section>

      {profile.hidden_on_dashboard && (
        <button
          type="button"
          className="shrink-0 mt-2 mb-1 text-xs text-[var(--accent-color)] text-center"
          onClick={() => void setHidden(false)}
        >
          Show pet on Dashboard again
        </button>
      )}
    </div>
  );
}
