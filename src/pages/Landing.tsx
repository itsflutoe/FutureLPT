import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, TrendingUp, Target, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] text-white font-bold text-sm">
              FL
            </div>
            <span className="font-semibold">FLPT</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Find. Learn. Pass. Teach.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted-foreground)]">
          Your personal LET review companion for future educators.
          Practice LET-style questions, track progress, and focus on what you need to improve.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">Log In</Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold mb-10">Built for LET preparation</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, title: 'Practice', desc: 'Targeted practice by subject and topic with explanations.' },
              { icon: ClipboardList, title: 'Mock Exams', desc: 'Timed LET-style simulations with full review.' },
              { icon: TrendingUp, title: 'Progress Tracking', desc: 'See accuracy trends, weak areas, and mastery over time.' },
              { icon: Target, title: 'Personalized Review', desc: 'Recommendations based on your real performance.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <f.icon className="h-8 w-8 text-[var(--accent-color)] mb-3" />
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-10">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[var(--muted-foreground)]">
          <p className="font-medium text-[var(--foreground)]">FLPT — Find Learn Pass Teach</p>
          <p className="mt-2">Independent educational review platform.</p>
          <p className="mt-4 max-w-2xl mx-auto text-xs">
            FLPT is an independent educational review platform and is not affiliated with, endorsed by,
            or administered by the Professional Regulation Commission (PRC) or the Commission on Higher Education (CHED).
            All practice material is LET-style and not actual PRC examination questions.
          </p>
          <div className="mt-4 flex justify-center gap-4 text-xs">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Disclaimer</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
