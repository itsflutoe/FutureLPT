import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getSubjects, getTopics, getQuestionCount } from '@/services/questions';
import { startPractice, startDailyChallenge } from '@/services/exams';
import type { Difficulty, PracticeConfig, PracticeCategory } from '@/types';
import { GEN_ED_SUBJECTS, PROF_ED_SUBJECTS } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COUNTS = [10, 20, 50];
const DIFFICULTIES: (Difficulty | 'MIXED')[] = ['EASY', 'MODERATE', 'DIFFICULT', 'MIXED'];

const CATEGORIES = [
  { id: 'PROFESSIONAL_EDUCATION' as const, label: 'Professional Ed' },
  { id: 'GENERAL_EDUCATION' as const, label: 'General Ed' },
  { id: 'SPECIALIZATION' as const, label: 'Specialization' },
  { id: 'MIXED' as const, label: 'Mixed' },
];

const QUICK_STARTS: { cat: PracticeCategory; label: string; variant: 'primary' | 'outline' }[] = [
  { cat: 'PROFESSIONAL_EDUCATION', label: 'Professional Education', variant: 'primary' },
  { cat: 'GENERAL_EDUCATION', label: 'General Education', variant: 'outline' },
  { cat: 'SPECIALIZATION', label: 'Specialization', variant: 'outline' },
  { cat: 'MIXED', label: 'Mixed (all categories)', variant: 'outline' },
];

export default function Practice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDailyParam = searchParams.get('daily') === '1';
  const hasDeepLink =
    !!(searchParams.get('category') || searchParams.get('subject') || searchParams.get('topic'));

  const [category, setCategory] = useState<PracticeCategory>(
    (searchParams.get('category') as PracticeCategory) || 'PROFESSIONAL_EDUCATION'
  );
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [count, setCount] = useState(() => {
    const c = parseInt(searchParams.get('count') || '', 10);
    return c > 0 ? c : 10;
  });
  const [customCount, setCustomCount] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'MIXED'>('MIXED');
  const [mode, setMode] = useState<'practice' | 'mock'>(
    searchParams.get('mode') === 'mock' ? 'mock' : 'practice'
  );
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailyBooting, setDailyBooting] = useState(isDailyParam);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(hasDeepLink || searchParams.get('mode') === 'mock');
  const dailyStarted = useRef(false);
  const skipSubjectReset = useRef(true);

  useEffect(() => {
    if (!user || !isDailyParam || dailyStarted.current) return;
    dailyStarted.current = true;
    setDailyBooting(true);
    setError('');
    (async () => {
      try {
        const { attempt, questions } = await startDailyChallenge(user.id);
        sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(questions));
        navigate(`/exam/${attempt.id}`, { replace: true });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to start Daily Challenge.');
        setDailyBooting(false);
      }
    })();
  }, [user, isDailyParam, navigate]);

  useEffect(() => {
    if (isDailyParam) return;
    getSubjects(category)
      .then(setSubjects)
      .catch(() =>
        setSubjects(
          category === 'GENERAL_EDUCATION'
            ? [...GEN_ED_SUBJECTS]
            : category === 'PROFESSIONAL_EDUCATION'
              ? [...PROF_ED_SUBJECTS]
              : category === 'SPECIALIZATION'
                ? ['Elementary Education']
                : [...GEN_ED_SUBJECTS, ...PROF_ED_SUBJECTS, 'Elementary Education']
        )
      );
    if (skipSubjectReset.current) {
      skipSubjectReset.current = false;
    } else {
      setSubject('');
      setTopic('');
    }
  }, [category, isDailyParam]);

  useEffect(() => {
    if (isDailyParam) return;
    if (subject) {
      getTopics(category, subject).then(setTopics).catch(() => setTopics([]));
    } else {
      setTopics([]);
      setTopic('');
    }
  }, [category, subject, isDailyParam]);

  useEffect(() => {
    if (isDailyParam) return;
    getQuestionCount({
      category,
      subject: subject || undefined,
      topic: topic || undefined,
      difficulty: difficulty === 'MIXED' ? undefined : difficulty,
    })
      .then(setAvailable)
      .catch(() => setAvailable(null));
  }, [category, subject, topic, difficulty, isDailyParam]);

  const handleStart = async () => {
    if (!user) return;
    setError('');
    setLoading(true);
    const finalCount = customCount ? parseInt(customCount, 10) : count;
    if (!finalCount || finalCount < 1) {
      setError('Please select a valid number of questions.');
      setLoading(false);
      return;
    }
    try {
      const config: PracticeConfig = {
        category,
        subject: subject || undefined,
        topic: topic || undefined,
        count: finalCount,
        difficulty,
        mode,
      };
      const { attempt, questions } = await startPractice(user.id, config);
      sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(questions));
      navigate(`/exam/${attempt.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start practice.');
    } finally {
      setLoading(false);
    }
  };

  const quickStart = async (cat: PracticeCategory, n = 10) => {
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      const config: PracticeConfig = {
        category: cat,
        count: n,
        difficulty: 'MIXED',
        mode: 'practice',
      };
      const { attempt, questions } = await startPractice(user.id, config);
      sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(questions));
      navigate(`/exam/${attempt.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start practice.');
    } finally {
      setLoading(false);
    }
  };

  if (isDailyParam && dailyBooting && !error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <Spinner className="h-8 w-8 mx-auto" />
        <h1 className="text-lg font-semibold">Starting Daily LET Challenge…</h1>
        <p className="text-sm text-[var(--muted-foreground)]">10 mixed questions · practice mode</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8 pb-28">
      <h1 className="text-2xl font-bold tracking-tight">Practice</h1>
      <p className="text-sm text-[var(--muted-foreground)] mt-1 mb-6">
        Quick session, or open options to fine-tune.
      </p>

      <div className="space-y-2 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Quick start · 10 questions
        </p>
        <div className="grid gap-2">
          {QUICK_STARTS.map((item) => (
            <Button
              key={item.cat}
              variant={item.variant}
              className="w-full min-h-12 justify-between"
              disabled={loading}
              onClick={() => quickStart(item.cat)}
            >
              <span>{item.label}</span>
              <span className="text-xs opacity-80">Start</span>
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium min-h-11 ${
                    category === c.id
                      ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Questions</label>
            <div className="flex flex-wrap gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCount(c);
                    setCustomCount('');
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm min-h-10 ${
                    count === c && !customCount
                      ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {c}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={200}
                placeholder="Custom"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
                className="w-24 h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
              />
            </div>
            {available !== null && (
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                {available} available with current filters
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-[var(--muted-foreground)] py-1"
          >
            <span>More options</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced && (
            <div className="space-y-4 border-t border-[var(--border)] pt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm"
                >
                  <option value="">All subjects</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {subject && (
                <div>
                  <label className="block text-sm font-medium mb-2">Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm"
                  >
                    <option value="">All topics</option>
                    {topics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize min-h-10 ${
                        difficulty === d
                          ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      {d.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('practice')}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium min-h-11 ${
                      mode === 'practice'
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    Practice
                    <div className="text-[10px] font-normal text-[var(--muted-foreground)] mt-0.5">
                      With explanations
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('mock')}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium min-h-11 ${
                      mode === 'mock'
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    Timed mock
                    <div className="text-[10px] font-normal text-[var(--muted-foreground)] mt-0.5">
                      No hints
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div
        className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:mt-4"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-lg">
          <Button className="w-full min-h-12" size="lg" onClick={handleStart} disabled={loading}>
            {loading ? <Spinner className="h-5 w-5" /> : `Start ${customCount || count} questions`}
          </Button>
        </div>
      </div>

      <p className="text-xs text-center text-[var(--muted-foreground)] mt-6 lg:mt-4">
        LET-style practice. Not actual PRC exam questions.
      </p>
    </div>
  );
}
