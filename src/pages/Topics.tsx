import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestionBankStats, categoryLabel, type SubjectCount, type TopicCount } from '@/services/questionStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function Topics() {
  const [subjects, setSubjects] = useState<SubjectCount[]>([]);
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuestionBankStats()
      .then((s) => {
        setSubjects(s.by_subject);
        setTopics(s.by_topic);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, SubjectCount[]> = {};
    for (const s of subjects) {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    }
    return map;
  }, [subjects]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  const categories = Object.keys(grouped).sort();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Topics</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Browse subjects and see how many practice questions are available.
        </p>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            No questions available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {categories.map((cat) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle>{categoryLabel(cat)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {grouped[cat].map((s) => {
                  const key = `${s.category}::${s.subject}`;
                  const open = expanded.has(key);
                  const subjectTopics = topics.filter(
                    (t) => t.category === s.category && t.subject === s.subject
                  );
                  return (
                    <div key={key} className="rounded-xl border border-[var(--border)] overflow-hidden">
                      <div className="flex items-stretch">
                        <Link
                          to={`/practice?category=${encodeURIComponent(s.category)}&subject=${encodeURIComponent(s.subject)}`}
                          className="flex-1 px-4 py-3 text-sm hover:bg-[var(--muted)]/50"
                        >
                          <div className="font-medium">{s.subject}</div>
                          <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                            {s.count} question{s.count === 1 ? '' : 's'}
                          </div>
                        </Link>
                        <button
                          type="button"
                          className="px-3 text-xs text-[var(--muted-foreground)] border-l border-[var(--border)] hover:bg-[var(--muted)]/50"
                          onClick={() => toggle(key)}
                        >
                          {open ? 'Hide' : 'Topics'}
                        </button>
                      </div>
                      {open && (
                        <div className="border-t border-[var(--border)] bg-[var(--muted)]/20 px-4 py-2 space-y-1">
                          {subjectTopics.map((t) => (
                            <Link
                              key={t.topic}
                              to={`/practice?category=${encodeURIComponent(t.category)}&subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`}
                              className="flex justify-between text-xs sm:text-sm py-1.5 hover:text-[var(--accent-color)]"
                            >
                              <span>{t.topic}</span>
                              <span className="text-[var(--muted-foreground)]">
                                {t.count} available
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
