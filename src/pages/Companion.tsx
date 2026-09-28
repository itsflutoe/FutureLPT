import { useEffect, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useCompanion } from '@/features/companion/CompanionProvider';
import { isCompanionEnabled, SPECIES, COMPANION_ENERGY } from '@/features/companion/config';
import { getMistakes, getTopicStats } from '@/services/progress';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
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
    error,
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
    { question?: { question?: string; subject?: string; topic?: string; explanation?: string; correct_answer?: string }; attempts?: number; correct_count?: number }[]
  >([]);

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
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-3">
        <p className="text-4xl">🐾</p>
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

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
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
      /* error in context */
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-3xl">{species.emoji}</span>
          <div className="min-w-0">
            <h1 className="font-bold truncate">{profile.name}</h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              ⚡ {profile.energy}/{profile.max_energy || COMPANION_ENERGY.MAX}
            </p>
          </div>
        </div>
        <Link to="/dashboard" className="text-sm text-[var(--accent-color)]">
          Dashboard
        </Link>
      </div>

      {!profile.gemini_api_key && (
        <Card className="mb-4">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">Gemini API key (BYOK)</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Your key is stored on your FLPT account (plain text, only you can read via RLS). FutureLPT does not pay for Gemini usage.
            </p>
            <Input
              type="password"
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              placeholder="Paste Gemini API key"
            />
            <Button
              size="sm"
              onClick={() => void setApiKey(apiKeyDraft)}
              disabled={!apiKeyDraft.trim()}
            >
              Save key
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 mb-3">
        {(['chat', 'teach', 'review'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize ${
              mode === m
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
                : 'border-[var(--border)]'
            }`}
          >
            {m === 'teach' ? 'Teach Me' : m}
          </button>
        ))}
      </div>

      {mode === 'teach' && (
        <div className="mb-3 space-y-2">
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
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
        <p className="text-xs text-[var(--muted-foreground)] mb-2">
          Uses your recent FutureLPT mistakes when available ({mistakes.length} loaded).
        </p>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto mb-4 min-h-[12rem]">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
            Say hello — or ask about a tough LET topic.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl px-3 py-2 text-sm max-w-[90%] ${
              m.role === 'user'
                ? 'ml-auto bg-[var(--accent-color)] text-white'
                : 'mr-auto bg-[var(--muted)]'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <p className="text-xs text-[var(--muted-foreground)]">Thinking…</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'chat' ? 'Message…' : mode === 'teach' ? 'What should I learn?' : 'Help me review…'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
          disabled={loading}
        />
        <Button onClick={() => void onSend()} disabled={loading || !input.trim()}>
          Send
        </Button>
      </div>

      {profile.hidden_on_dashboard && (
        <button
          type="button"
          className="mt-3 text-xs text-[var(--accent-color)]"
          onClick={() => void setHidden(false)}
        >
          Show pet on Dashboard again
        </button>
      )}
    </div>
  );
}
