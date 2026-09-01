import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubjects } from '@/services/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { GEN_ED_SUBJECTS, PROF_ED_SUBJECTS } from '@/types';

export default function Topics() {
  const [genEd, setGenEd] = useState<string[]>([]);
  const [profEd, setProfEd] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSubjects('GENERAL_EDUCATION').catch(() => [...GEN_ED_SUBJECTS]),
      getSubjects('PROFESSIONAL_EDUCATION').catch(() => [...PROF_ED_SUBJECTS]),
    ]).then(([g, p]) => {
      setGenEd(g);
      setProfEd(p);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Topics</h1>
      <p className="text-[var(--muted-foreground)]">Browse subjects and start targeted practice.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>General Education</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {genEd.map((s) => (
              <Link key={s} to={`/practice?category=GENERAL_EDUCATION&subject=${encodeURIComponent(s)}`} className="block rounded-xl border border-[var(--border)] px-4 py-3 text-sm hover:bg-[var(--muted)]/50">
                {s}
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Professional Education</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {profEd.map((s) => (
              <Link key={s} to={`/practice?category=PROFESSIONAL_EDUCATION&subject=${encodeURIComponent(s)}`} className="block rounded-xl border border-[var(--border)] px-4 py-3 text-sm hover:bg-[var(--muted)]/50">
                {s}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
