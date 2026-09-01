import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getSubjects, getTopics, getQuestionCount } from '@/services/questions';
import { startPractice } from '@/services/exams';
import type { Difficulty, PracticeConfig, PracticeCategory } from '@/types';
import { GEN_ED_SUBJECTS, PROF_ED_SUBJECTS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const COUNTS = [10, 20, 50, 100, 150];
const DIFFICULTIES: (Difficulty | 'MIXED')[] = ['EASY', 'MODERATE', 'DIFFICULT', 'MIXED'];

export default function Practice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<PracticeCategory>((searchParams.get('category') as PracticeCategory) || 'PROFESSIONAL_EDUCATION');
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [count, setCount] = useState(20);
  const [customCount, setCustomCount] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'MIXED'>('MIXED');
  const [mode, setMode] = useState<'practice' | 'mock'>('practice');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSubjects(category).then(setSubjects).catch(() => setSubjects(
      category === 'GENERAL_EDUCATION'
        ? [...GEN_ED_SUBJECTS]
        : category === 'PROFESSIONAL_EDUCATION'
          ? [...PROF_ED_SUBJECTS]
          : [...GEN_ED_SUBJECTS, ...PROF_ED_SUBJECTS]
    ));
    setSubject('');
    setTopic('');
  }, [category]);

  useEffect(() => {
    if (subject) {
      getTopics(category, subject).then(setTopics).catch(() => setTopics([]));
    } else {
      setTopics([]);
      setTopic('');
    }
  }, [category, subject]);

  useEffect(() => {
    getQuestionCount({
      category,
      subject: subject || undefined,
      topic: topic || undefined,
      difficulty: difficulty === 'MIXED' ? undefined : difficulty,
    }).then(setAvailable).catch(() => setAvailable(null));
  }, [category, subject, topic, difficulty]);

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
      // Store questions in sessionStorage for the exam page (avoids re-fetch)
      sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(questions));
      navigate(`/exam/${attempt.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start practice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Practice</h1>
      <p className="text-[var(--muted-foreground)] mt-1 mb-8">Focus on what you need to improve.</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configure your session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'GENERAL_EDUCATION' as const, label: 'General Education' },
                  { id: 'PROFESSIONAL_EDUCATION' as const, label: 'Professional Education' },
                  { id: 'MIXED' as const, label: 'Mixed (All)' },
                ]
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
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

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm"
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Topic */}
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
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* Count */}
          <div>
            <label className="block text-sm font-medium mb-2">Number of questions</label>
            <div className="flex flex-wrap gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCount(c); setCustomCount(''); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
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

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
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

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium mb-2">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('practice')}
                className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  mode === 'practice'
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                    : 'border-[var(--border)]'
                }`}
              >
                Practice Mode
                <div className="text-xs font-normal text-[var(--muted-foreground)] mt-0.5">Explanations after each answer</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('mock')}
                className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  mode === 'mock'
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                    : 'border-[var(--border)]'
                }`}
              >
                Mock Exam Mode
                <div className="text-xs font-normal text-[var(--muted-foreground)] mt-0.5">Timed, no hints during exam</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleStart} disabled={loading}>
            {loading ? <Spinner className="h-5 w-5" /> : 'Start'}
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-[var(--muted-foreground)] mt-6">
        LET-style practice material. Not actual PRC examination questions.
      </p>
    </div>
  );
}
