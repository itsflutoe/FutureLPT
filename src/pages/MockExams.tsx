import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { startPractice } from '@/services/exams';
import type { PracticeCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ClipboardList } from 'lucide-react';

const PRESETS: {
  title: string;
  desc: string;
  category: PracticeCategory;
  count: number;
}[] = [
  {
    title: 'GenEd Sprint',
    desc: 'General Education · 50 questions · timed',
    category: 'GENERAL_EDUCATION',
    count: 50,
  },
  {
    title: 'ProfEd Sprint',
    desc: 'Professional Education · 50 questions · timed',
    category: 'PROFESSIONAL_EDUCATION',
    count: 50,
  },
  {
    title: 'GenEd Full Mock',
    desc: 'General Education · 100 questions · timed',
    category: 'GENERAL_EDUCATION',
    count: 100,
  },
  {
    title: 'ProfEd Full Mock',
    desc: 'Professional Education · 100 questions · timed',
    category: 'PROFESSIONAL_EDUCATION',
    count: 100,
  },
  {
    title: 'BEEd Simulation',
    desc: 'Mixed categories · 150 questions · timed',
    category: 'MIXED',
    count: 150,
  },
  {
    title: 'Specialization Sprint',
    desc: 'Specialization · 50 questions · timed',
    category: 'SPECIALIZATION',
    count: 50,
  },
  {
    title: 'Specialization Mock',
    desc: 'Specialization · 100 questions · timed',
    category: 'SPECIALIZATION',
    count: 100,
  },
];

export default function MockExams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleStart = async (p: (typeof PRESETS)[number]) => {
    if (!user || loadingTitle) return;
    setError('');
    setLoadingTitle(p.title);
    try {
      const { attempt, questions } = await startPractice(user.id, {
        category: p.category,
        count: p.count,
        difficulty: 'MIXED',
        mode: 'mock',
      });
      sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(questions));
      navigate(`/exam/${attempt.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start mock exam.');
      setLoadingTitle(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Mock exams</h1>
      <p className="text-sm text-[var(--muted-foreground)] mt-1 mb-6">
        Timed LET-style sets. Tap Start to begin immediately — no extra setup.
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {PRESETS.map((p) => {
          const busy = loadingTitle === p.title;
          return (
            <Card key={p.title}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ClipboardList
                    className="h-5 w-5 text-[var(--accent-color)] shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm">{p.title}</h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{p.desc}</p>
                  </div>
                </div>
                <Button
                  className="w-full min-h-11"
                  disabled={!!loadingTitle}
                  onClick={() => handleStart(p)}
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="h-4 w-4" />
                      Starting…
                    </span>
                  ) : (
                    'Start'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-center text-[var(--muted-foreground)] mt-8">
        LET-style practice. FLPT is not affiliated with PRC or CHED.
      </p>
    </div>
  );
}
