import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getQuestionBankStats,
  categoryLabel,
  type SubjectCount,
  type TopicCount,
} from '@/services/questionStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Topics</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Pick a subject to practice — expand for topic counts.
        </p>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            No questions available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{categoryLabel(cat)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {grouped[cat].map((s) => {
                  const key = `${s.category}::${s.subject}`;
                  const open = expanded.has(key);
                  const subjectTopics = topics.filter(
                    (t) => t.category === s.category && t.subject === s.subject
                  );
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-[var(--border)] overflow-hidden"
                    >
                      <div className="flex items-stretch min-h-12">
                        <Link
                          to={`/practice?category=${encodeURIComponent(s.category)}&subject=${encodeURIComponent(s.subject)}`}
                          className="flex-1 min-w-0 px-3 py-3 text-sm hover:bg-[var(--muted)]/50"
                        >
                          <div className="font-medium truncate">{s.subject}</div>
                          <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                            {s.count} question{s.count === 1 ? '' : 's'} · Practice
                          </div>
                        </Link>
                        <button
                          type="button"
                          className="px-3 flex items-center gap-1 text-xs text-[var(--muted-foreground)] border-l border-[var(--border)] hover:bg-[var(--muted)]/50 shrink-0"
                          onClick={() => toggle(key)}
                          aria-expanded={open}
                        >
                          Topics
                          {open ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {open && (
                        <div className="border-t border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2 space-y-1">
                          {subjectTopics.length === 0 ? (
                            <p className="text-xs text-[var(--muted-foreground)] py-1">No topics listed.</p>
                          ) : (
                            subjectTopics.map((t) => (
                              <Link
                                key={t.topic}
                                to={`/practice?category=${encodeURIComponent(t.category)}&subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`}
                                className="flex justify-between gap-2 text-xs sm:text-sm py-2 hover:text-[var(--accent-color)] min-w-0"
                              >
                                <span className="min-w-0 break-words">{t.topic}</span>
                                <span className="text-[var(--muted-foreground)] shrink-0 tabular-nums">
                                  {t.count}
                                </span>
                              </Link>
                            ))
                          )}
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
