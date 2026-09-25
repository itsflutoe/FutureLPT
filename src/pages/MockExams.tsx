import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClipboardList } from 'lucide-react';

const PRESETS = [
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
    desc: 'General Education · 100 questions',
    category: 'GENERAL_EDUCATION',
    count: 100,
  },
  {
    title: 'ProfEd Full Mock',
    desc: 'Professional Education · 100 questions',
    category: 'PROFESSIONAL_EDUCATION',
    count: 100,
  },
  {
    title: 'BEEd Simulation',
    desc: 'Mixed categories · 150 questions',
    category: 'MIXED',
    count: 150,
  },
  {
    title: 'Specialization Sprint',
    desc: 'Elementary Education · 50 questions',
    category: 'SPECIALIZATION',
    count: 50,
  },
  {
    title: 'Specialization Mock',
    desc: 'Elementary Education · 100 questions',
    category: 'SPECIALIZATION',
    count: 100,
  },
];

export default function MockExams() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Mock exams</h1>
      <p className="text-sm text-[var(--muted-foreground)] mt-1 mb-6">
        Timed LET-style sets. Explanations after you submit.
      </p>
      <div className="space-y-3">
        {PRESETS.map((p) => (
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
              <Link
                to={`/practice?category=${p.category}&count=${p.count}&mode=mock`}
                className="block"
              >
                <Button className="w-full min-h-11">Start</Button>
              </Link>
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
