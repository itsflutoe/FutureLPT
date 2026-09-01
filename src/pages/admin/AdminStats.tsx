import { useEffect, useMemo, useState } from 'react';
import {
  getQuestionBankStats,
  categoryLabel,
  type QuestionBankStats,
  type StatsFilters,
} from '@/services/questionStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressBar } from '@/components/ui/ProgressBar';

export default function AdminStats() {
  const [stats, setStats] = useState<QuestionBankStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<StatsFilters>({
    category: '',
    subject: '',
    topic: '',
    difficulty: '',
  });
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const load = async (f: StatsFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const data = await getQuestionBankStats({
        category: f.category || undefined,
        subject: f.subject || undefined,
        topic: f.topic || undefined,
        difficulty: f.difficulty || undefined,
      });
      setStats(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load statistics');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subjectOptions = useMemo(() => {
    if (!stats) return [];
    const set = new Set(stats.by_subject.map((s) => s.subject));
    return [...set].sort();
  }, [stats]);

  const topicOptions = useMemo(() => {
    if (!stats) return [];
    let topics = stats.by_topic;
    if (filters.subject) topics = topics.filter((t) => t.subject === filters.subject);
    const set = new Set(topics.map((t) => t.topic));
    return [...set].sort();
  }, [stats, filters.subject]);

  const applyFilters = () => load(filters);

  const clearFilters = () => {
    const empty = { category: '', subject: '', topic: '', difficulty: '' };
    setFilters(empty);
    load(empty);
  };

  const toggleSubject = (key: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const difficultyCount = (name: string) =>
    stats?.by_difficulty.find((d) => d.difficulty === name)?.count || 0;

  const subjectsByCategory = useMemo(() => {
    if (!stats) return {} as Record<string, typeof stats.by_subject>;
    const map: Record<string, typeof stats.by_subject> = {};
    for (const s of stats.by_subject) {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    }
    return map;
  }, [stats]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Question Bank Statistics</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Live counts from the Supabase question bank (active questions only).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Category</label>
            <select
              className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              value={filters.category || ''}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as StatsFilters['category'], subject: '', topic: '' }))}
            >
              <option value="">All</option>
              <option value="GENERAL_EDUCATION">General Education</option>
              <option value="PROFESSIONAL_EDUCATION">Professional Education</option>
              <option value="SPECIALIZATION">Major</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Subject</label>
            <select
              className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              value={filters.subject || ''}
              onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value, topic: '' }))}
            >
              <option value="">All</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Topic</label>
            <select
              className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              value={filters.topic || ''}
              onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value }))}
            >
              <option value="">All</option>
              {topicOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Difficulty</label>
            <select
              className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              value={filters.difficulty || ''}
              onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
            >
              <option value="">All</option>
              <option value="EASY">Easy</option>
              <option value="MODERATE">Moderate</option>
              <option value="DIFFICULT">Difficult</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
            <Button onClick={applyFilters}>Apply filters</Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading || !stats ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-[var(--muted-foreground)]">Total questions</div>
                <div className="text-3xl font-bold mt-1">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-[var(--muted-foreground)]">Easy</div>
                <div className="text-3xl font-bold mt-1">{difficultyCount('EASY')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-[var(--muted-foreground)]">Moderate</div>
                <div className="text-3xl font-bold mt-1">{difficultyCount('MODERATE')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-[var(--muted-foreground)]">Difficult</div>
                <div className="text-3xl font-bold mt-1">{difficultyCount('DIFFICULT')}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.by_category.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No data</p>
              ) : (
                stats.by_category.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{categoryLabel(c.category)}</span>
                      <span className="font-semibold">{c.count}</span>
                    </div>
                    <ProgressBar value={stats.total ? (c.count / stats.total) * 100 : 0} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By subject</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(subjectsByCategory).length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No data</p>
              ) : (
                Object.entries(subjectsByCategory).map(([cat, subjects]) => (
                  <div key={cat}>
                    <h3 className="text-sm font-semibold mb-2">{categoryLabel(cat)}</h3>
                    <div className="space-y-1">
                      {subjects.map((s) => {
                        const key = `${s.category}::${s.subject}`;
                        const open = expandedSubjects.has(key);
                        const topics = stats.by_topic.filter(
                          (t) => t.category === s.category && t.subject === s.subject
                        );
                        return (
                          <div key={key} className="rounded-xl border border-[var(--border)]">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-[var(--muted)]/40"
                              onClick={() => toggleSubject(key)}
                            >
                              <span>
                                {s.subject}
                                <span className="text-[var(--muted-foreground)] text-xs ml-2">
                                  {open ? 'Hide topics' : 'Show topics'}
                                </span>
                              </span>
                              <span className="font-semibold">{s.count}</span>
                            </button>
                            {open && (
                              <div className="border-t border-[var(--border)] px-3 py-2 space-y-1 bg-[var(--muted)]/20">
                                {topics.length === 0 ? (
                                  <p className="text-xs text-[var(--muted-foreground)]">No topics</p>
                                ) : (
                                  topics.map((t) => (
                                    <div
                                      key={`${t.topic}`}
                                      className="flex justify-between text-xs sm:text-sm py-0.5"
                                    >
                                      <span className="text-[var(--muted-foreground)]">{t.topic}</span>
                                      <span className="font-medium">{t.count}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
