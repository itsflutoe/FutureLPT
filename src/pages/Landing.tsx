import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, TrendingUp, Target, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] text-white font-bold text-sm">
              FL
            </div>
            <span className="font-semibold">FLPT</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20 text-center">
        <p className="text-sm font-medium text-[var(--accent-color)] mb-3">Find · Learn · Pass · Teach</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Your LET review companion</h1>
        <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-[var(--muted-foreground)]">
          Practice LET-style questions, track weak topics, and build a study streak — built for future
          educators.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto gap-2 min-h-12">
              Create free account <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto min-h-12">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--muted)]/30 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-xl font-semibold mb-8">How students use FLPT</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BookOpen,
                title: 'Practice',
                desc: 'By category, subject, and topic — with explanations.',
              },
              {
                icon: ClipboardList,
                title: 'Mock exams',
                desc: 'Timed LET-style sets when you are ready.',
              },
              {
                icon: TrendingUp,
                title: 'Progress',
                desc: 'Accuracy, streaks, and weak areas in one place.',
              },
              {
                icon: Target,
                title: 'Focus next',
                desc: 'Recommendations based on your real results.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
              >
                <f.icon className="h-7 w-7 text-[var(--accent-color)] mb-2" aria-hidden />
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-[var(--muted-foreground)]">
          <p className="font-medium text-[var(--foreground)]">FLPT — Future LPT</p>
          <p className="mt-3 max-w-2xl mx-auto text-xs leading-relaxed">
            Independent educational review platform. Not affiliated with, endorsed by, or administered
            by the PRC or CHED. Practice material is LET-style only — not actual board exam questions.
          </p>
        </div>
      </footer>
    </div>
  );
}
