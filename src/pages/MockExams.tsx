import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { startPractice } from '@/services/exams';
import type { PracticeCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ClipboardList, Clock } from 'lucide-react';

const PRESETS: {
  title: string;
  desc: string;
  category: PracticeCategory;
  count: number;
  minutesHint: string;
}[] = [
  {
    title: 'GenEd Sprint',
    desc: 'General Education · 50 questions · timed',
    category: 'GENERAL_EDUCATION',
    count: 50,
    minutesHint: '~75 min',
  },
  {
    title: 'ProfEd Sprint',
    desc: 'Professional Education · 50 questions · timed',
    category: 'PROFESSIONAL_EDUCATION',
    count: 50,
    minutesHint: '~75 min',
  },
  {
    title: 'GenEd Full Mock',
    desc: 'General Education · 100 questions · full timer',
    category: 'GENERAL_EDUCATION',
    count: 100,
    minutesHint: '~150 min',
  },
  {
    title: 'ProfEd Full Mock',
    desc: 'Professional Education · 100 questions · full timer',
    category: 'PROFESSIONAL_EDUCATION',
    count: 100,
    minutesHint: '~150 min',
  },
  {
    title: 'BEEd Simulation',
    desc: 'Mixed GenEd + ProfEd · 150 questions',
    category: 'MIXED',
    count: 150,
    minutesHint: '~225 min',
  },
];

export default function MockExams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleStart = async (p: (typeof PRESETS)[0]) => {
    if (!user) return;
    setError('');
    setLoadingKey(p.title);
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
      setError(err instanceof Error ? err.message : 'Could not start mock exam.');
      setLoadingKey(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Mock Exams</h1>
      <p className="text-[var(--muted-foreground)] mt-1 mb-6">
        Timed LET-style simulations. No explanations until you submit.
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {PRESETS.map((p) => (
          <Card key={p.title}>
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <ClipboardList className="h-6 w-6 text-[var(--accent-color)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{p.desc}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {p.minutesHint} · ~1.5 min / question
                  </p>
                </div>
              </div>
              <Button
                className="w-full sm:w-auto min-h-11 shrink-0"
                disabled={!!loadingKey}
                onClick={() => handleStart(p)}
              >
                {loadingKey === p.title ? <Spinner className="h-5 w-5" /> : 'Start'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-center text-[var(--muted-foreground)] mt-8">
        LET-style practice. FLPT is not affiliated with PRC or CHED.
      </p>
    </div>
  );
}
