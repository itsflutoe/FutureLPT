import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClipboardList } from 'lucide-react';

const PRESETS = [
  { title: 'GenEd Practice', desc: 'General Education · 50 questions · Timed', category: 'GENERAL_EDUCATION', count: 50, mode: 'mock' },
  { title: 'ProfEd Practice', desc: 'Professional Education · 50 questions · Timed', category: 'PROFESSIONAL_EDUCATION', count: 50, mode: 'mock' },
  { title: 'GenEd Mock', desc: 'General Education · 100 questions · Full timer', category: 'GENERAL_EDUCATION', count: 100, mode: 'mock' },
  { title: 'ProfEd Mock', desc: 'Professional Education · 100 questions · Full timer', category: 'PROFESSIONAL_EDUCATION', count: 100, mode: 'mock' },
  { title: 'Full BEEd Simulation', desc: 'Mixed GenEd + ProfEd · 150 questions', category: 'PROFESSIONAL_EDUCATION', count: 150, mode: 'mock' },
];

export default function MockExams() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Mock Exams</h1>
      <p className="text-[var(--muted-foreground)] mt-1 mb-8">Simulate LET-style examinations with timers.</p>
      <div className="space-y-4">
        {PRESETS.map((p) => (
          <Card key={p.title}>
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ClipboardList className="h-6 w-6 text-[var(--accent-color)] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{p.desc}</p>
                </div>
              </div>
              <Link to={`/practice?category=${p.category}&count=${p.count}&mode=mock`}>
                <Button>Start</Button>
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
