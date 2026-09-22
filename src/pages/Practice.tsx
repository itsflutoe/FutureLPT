import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getSubjects, getTopics, getQuestionCount } from '@/services/questions';
import { startPractice, startDailyChallenge } from '@/services/exams';
import type { Difficulty, PracticeConfig, PracticeCategory } from '@/types';
import { GEN_ED_SUBJECTS, PROF_ED_SUBJECTS, DAILY_CHALLENGE_COUNT } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';

const QUICK_COUNTS = [10, 20, 50];
const DIFFICULTIES: (Difficulty | 'MIXED')[] = ['EASY', 'MODERATE', 'DIFFICULT', 'MIXED'];

function parseCategory(v: string | null): PracticeCategory {
  if (v === 'GENERAL_EDUCATION' || v === 'PROFESSIONAL_EDUCATION' || v === 'MIXED') return v;
  return 'MIXED';
}

export default function Practice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDaily = searchParams.get('daily') === '1';
  const autoMock = searchParams.get('mode') === 'mock' && searchParams.get('count');

  const initialCategory = parseCategory(searchParams.get('category'));
  const initialSubject = searchParams.get('subject') || '';
  const initialTopic = searchParams.get('topic') || '';
  const initialCount = parseInt(searchParams.get('count') || '20', 10) || 20;

  const [category, setCategory] = useState<PracticeCategory>(initialCategory);
  const [subject, setSubject] = useState(initialSubject);
  const [topic, setTopic] = useState(initialTopic);
  const [count, setCount] = useState(initialCount);
  const [customCount, setCustomCount] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'MIXED'>('MIXED');
  const [mode, setMode] = useState<'practice' | 'mock'>(
    searchParams.get('mode') === 'mock' ? 'mock' : 'practice'
  );
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(
    !!(searchParams.get('subject') || searchParams.get('topic') || searchParams.get('category'))
  );
  const autoStarted = useRef(false);

  // Daily challenge auto-start
  useEffect(() => {
    if (!user || !isDaily || autoStarted.current) return;
    autoStarted.current = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { attempt, questions } = await startDailyChallenge(user.id);
        sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(questions));
        navigate(`/exam/${attempt.id}`, { replace: true });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not start daily challenge.');
        setLoading(false);
      }
    })();
  }, [user, isDaily, navigate]);

  // Deep-link mock auto-start: /practice?category=X&count=N&mode=mock
  useEffect(() => {
    if (!user || isDaily || !autoMock || autoStarted.current) return;
    autoStarted.current = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const n = parseInt(searchParams.get('count') || '50', 10) || 50;
        const cat = parseCategory(searchParams.get('category'));
        const { attempt, questions } = await startPractice(user.id, {
          category: cat,
          count: n,
          difficulty: 'MIXED',
          mode: 'mock',
        });
        sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(questions));
        navigate(`/exam/${attempt.id}`, { replace: true });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not start mock exam.');
        setLoading(false);
      }
    })();
  }, [user, isDaily, autoMock, searchParams, navigate]);

  useEffect(() => {
    if (isDaily || autoMock) return;
    getSubjects(category)
      .then(setSubjects)
      .catch(() =>
        setSubjects(
          category === 'GENERAL_EDUCATION'
            ? [...GEN_ED_SUBJECTS]
            : category === 'PROFESSIONAL_EDUCATION'
              ? [...PROF_ED_SUBJECTS]
              : [...GEN_ED_SUBJECTS, ...PROF_ED_SUBJECTS]
        )
      );
  }, [category, isDaily, autoMock]);

  useEffect(() => {
    if (isDaily || autoMock) return;
    if (subject) {
      getTopics(category, subject).then(setTopics).catch(() => setTopics([]));
    } else {
      setTopics([]);
      if (!initialTopic) setTopic('');
    }
  }, [category, subject, isDaily, autoMock]);

  useEffect(() => {
    if (isDaily || autoMock) return;
    getQuestionCount({
      category,
      subject: subject || undefined,
      topic: topic || undefined,
      difficulty: difficulty === 'MIXED' ? undefined : difficulty,
    })
      .then(setAvailable)
      .catch(() => setAvailable(null));
  }, [category, subject, topic, difficulty, isDaily, autoMock]);

  const handleStart = async (override?: Partial<PracticeConfig>) => {
    if (!user) return;
    setError('');
    setLoading(true);
    const finalCount = override?.count ?? (customCount ? parseInt(customCount, 10) : count);
    if (!finalCount || finalCount < 1) {
      setError('Please select a valid number of questions.');
      setLoading(false);
      return;
    }
    try {
      const config: PracticeConfig = {
        category: override?.category ?? category,
        subject: override?.subject ?? (subject || undefined),
        topic: override?.topic ?? (topic || undefined),
        count: finalCount,
        difficulty: override?.difficulty ?? difficulty,
        mode: override?.mode ?? mode,
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

  if (isDaily || autoMock) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <Zap className="h-10 w-10 mx-auto text-[var(--accent-color)]" />
        <h1 className="text-xl font-bold">{isDaily ? 'Daily LET Challenge' : 'Starting mock exam'}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {isDaily
            ? `${DAILY_CHALLENGE_COUNT} mixed questions · keeping your streak alive`
            : 'Loading timed questions…'}
        </p>
        {error ? (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        ) : (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}
        {error && (
          <Button variant="outline" onClick={() => navigate(isDaily ? '/practice' : '/mock-exams', { replace: true })}>
            Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Practice</h1>
      <p className="text-[var(--muted-foreground)] mt-1 mb-6">Start fast, or fine-tune filters below.</p>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Quick start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Mixed topics · practice mode · explanations after each answer
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_COUNTS.map((c) => (
              <Button
                key={c}
                variant={count === c && !customCount ? 'primary' : 'outline'}
                size="sm"
                disabled={loading}
                onClick={() => {
                  setCount(c);
                  setCustomCount('');
                  handleStart({ category: 'MIXED', difficulty: 'MIXED', mode: 'practice', count: c });
                }}
              >
                {c} questions
              </Button>
            ))}
          </div>
          <Button
            className="w-full min-h-12"
            size="lg"
            disabled={loading}
            onClick={() =>
              handleStart({ category: 'MIXED', difficulty: 'MIXED', mode: 'practice', count: 20 })
            }
          >
            {loading ? <Spinner className="h-5 w-5" /> : 'Start 20 mixed questions'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <button
          type="button"
          className="w-full flex items-center justify-between px-6 py-4 text-left"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <span className="font-medium text-sm">Custom filters</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showAdvanced && (
          <CardContent className="space-y-6 border-t border-[var(--border)] pt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: 'MIXED' as const, label: 'Mixed (All)' },
                    { id: 'GENERAL_EDUCATION' as const, label: 'General Education' },
                    { id: 'PROFESSIONAL_EDUCATION' as const, label: 'Professional Education' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategory(c.id);
                      setSubject('');
                      setTopic('');
                    }}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors min-h-11 ${
                      category === c.id
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

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
              <label className="block text-sm font-medium mb-2">Number of questions</label>
              <div className="flex flex-wrap gap-2">
                {[10, 20, 50, 100].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCount(c);
                      setCustomCount('');
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm min-h-9 ${
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
                  className="w-20 h-9 rounded-lg border border-[var(--border)] px-2 text-sm"
                />
              </div>
              {available !== null && (
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  {available} questions available with current filters
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`rounded-lg border px-3 py-1.5 text-sm capitalize min-h-9 ${
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
                  className={`rounded-xl border px-4 py-3 text-sm font-medium min-h-11 ${
                    mode === 'practice'
                      ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  Practice
                  <div className="text-xs font-normal text-[var(--muted-foreground)] mt-0.5">
                    Explanations after answers
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('mock')}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium min-h-11 ${
                    mode === 'mock'
                      ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  Mock exam
                  <div className="text-xs font-normal text-[var(--muted-foreground)] mt-0.5">
                    Timed, no hints
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <Button className="w-full min-h-12" size="lg" onClick={() => handleStart()} disabled={loading}>
              {loading ? <Spinner className="h-5 w-5" /> : 'Start with these filters'}
            </Button>
          </CardContent>
        )}
      </Card>

      {error && !showAdvanced && (
        <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-center text-[var(--muted-foreground)] mt-6">
        LET-style practice material. Not actual PRC examination questions.
      </p>
    </div>
  );
}
