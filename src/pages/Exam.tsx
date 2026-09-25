import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getAttempt, getAttemptAnswers, saveAnswer, completeAttempt } from '@/services/exams';
import { addBookmark, removeBookmark, isBookmarked } from '@/services/bookmarks';
import type { Question, ExamAttempt, ExamAnswer } from '@/types';
import { formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Flag, ChevronLeft, ChevronRight, Bookmark, Check, X } from 'lucide-react';

export default function Exam() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef(Date.now());
  const isPractice = attempt?.mode === 'practice';

  useEffect(() => {
    if (!attemptId || !user) return;
    (async () => {
      try {
        const att = await getAttempt(attemptId);
        if (att.is_completed) {
          navigate(`/results/${attemptId}`);
          return;
        }
        setAttempt(att);
        if (att.time_limit_seconds) {
          const elapsed = Math.floor((Date.now() - new Date(att.started_at).getTime()) / 1000);
          setTimeLeft(Math.max(0, att.time_limit_seconds - elapsed));
        }
        const cached = sessionStorage.getItem(`exam_${attemptId}`);
        if (cached) {
          setQuestions(JSON.parse(cached));
        }
        const ansList = await getAttemptAnswers(attemptId);
        const map: Record<string, ExamAnswer> = {};
        const flags = new Set<string>();
        ansList.forEach((a) => {
          map[a.question_id] = a;
          if (a.is_flagged) flags.add(a.question_id);
        });
        if (!cached) {
          setQuestions(ansList.map((a) => a.question).filter(Boolean) as Question[]);
        }
        setAnswers(map);
        setFlagged(flags);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId, user, navigate]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isPractice) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(id);
          void handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isPractice]);

  const q = questions[current];
  const answeredCount = questions.filter((qq) => !!answers[qq.id]?.selected_answer).length;
  const unansweredCount = questions.length - answeredCount;

  useEffect(() => {
    if (!q) return;
    const ans = answers[q.id];
    setSelected(ans?.selected_answer || null);
    setShowFeedback(!!isPractice && !!ans?.selected_answer);
    if (user) {
      isBookmarked(user.id, q.id).then(setBookmarked);
    }
  }, [current, q, answers, isPractice, user]);

  const handleSelect = async (opt: 'A' | 'B' | 'C' | 'D') => {
    if (!q || !attemptId || (showFeedback && isPractice)) return;
    setSelected(opt);
    await saveAnswer(attemptId, q.id, opt, flagged.has(q.id));
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...prev[q.id],
        selected_answer: opt,
        is_correct: opt === q.correct_answer,
        answered_at: new Date().toISOString(),
      },
    }));
    if (isPractice) setShowFeedback(true);
  };

  const toggleFlag = async () => {
    if (!q || !attemptId) return;
    const next = new Set(flagged);
    if (next.has(q.id)) next.delete(q.id);
    else next.add(q.id);
    setFlagged(next);
    await saveAnswer(attemptId, q.id, selected, next.has(q.id));
  };

  const toggleBookmark = async () => {
    if (!q || !user) return;
    if (bookmarked) {
      await removeBookmark(user.id, q.id);
      setBookmarked(false);
    } else {
      await addBookmark(user.id, q.id);
      setBookmarked(true);
    }
  };

  const handleSubmit = useCallback(
    async (fromTimer = false) => {
      if (!attemptId || !user || submitting) return;

      if (!fromTimer && unansweredCount > 0) {
        const ok = window.confirm(
          `You still have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'}.\n\nSubmit anyway?`
        );
        if (!ok) return;
      }

      setSubmitting(true);
      try {
        const timeUsed = Math.floor((Date.now() - startTime.current) / 1000);
        await completeAttempt(attemptId, user.id, timeUsed);
        sessionStorage.removeItem(`exam_${attemptId}`);
        navigate(`/results/${attemptId}`);
      } catch (e) {
        console.error(e);
        setSubmitting(false);
      }
    },
    [attemptId, user, submitting, navigate, unansweredCount]
  );

  const handleExit = () => {
    if (
      window.confirm(
        'Leave this session? Answers so far are saved. Finish later from a new session — incomplete runs are not listed as results until you submit.'
      )
    ) {
      navigate('/dashboard');
    }
  };

  if (loading || !q) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[] = [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d },
  ];

  return (
    <div className="mx-auto max-w-3xl min-h-screen flex flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleExit}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-1 py-2 min-h-11"
          >
            Exit
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold tabular-nums">
              {current + 1} / {questions.length}
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
              {answeredCount} answered
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {timeLeft !== null && !isPractice && (
              <span
                className={`font-mono text-xs font-semibold mr-1 ${timeLeft < 300 ? 'text-red-600' : ''}`}
              >
                {formatDuration(timeLeft)}
              </span>
            )}
            <button
              type="button"
              onClick={toggleFlag}
              className="p-2 rounded-lg hover:bg-[var(--muted)] min-h-11 min-w-11"
              aria-label="Flag question"
            >
              <Flag className={`h-5 w-5 ${flagged.has(q.id) ? 'text-amber-500 fill-amber-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={toggleBookmark}
              className="p-2 rounded-lg hover:bg-[var(--muted)] min-h-11 min-w-11"
              aria-label="Bookmark question"
            >
              <Bookmark
                className={`h-5 w-5 ${bookmarked ? 'text-[var(--accent-color)] fill-current' : ''}`}
              />
            </button>
          </div>
        </div>
        <div className="h-1.5 w-full bg-[var(--muted)] rounded-full mt-1">
          <div
            className="h-full bg-[var(--accent-color)] rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-40">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge variant="outline">{q.subject}</Badge>
          <Badge variant="outline">{q.difficulty.toLowerCase()}</Badge>
          {attempt?.is_daily_challenge && <Badge variant="outline">Daily</Badge>}
        </div>
        <p className="text-base sm:text-lg leading-relaxed mb-5">{q.question}</p>

        <div className="space-y-3">
          {options.map((opt) => {
            let style =
              'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent-color)]/50';

            if (selected === opt.key) {
              if (isPractice && showFeedback) {
                style =
                  opt.key === q.correct_answer
                    ? 'border-green-600 bg-green-100 text-green-950 dark:bg-green-950 dark:text-green-50 dark:border-green-500'
                    : 'border-red-600 bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-50 dark:border-red-500';
              } else {
                style =
                  'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--foreground)]';
              }
            } else if (isPractice && showFeedback && opt.key === q.correct_answer) {
              style =
                'border-green-600 bg-green-100 text-green-950 dark:bg-green-950 dark:text-green-50 dark:border-green-500';
            }

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelect(opt.key)}
                disabled={!!(isPractice && showFeedback)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3.5 text-sm transition-colors flex items-start gap-3 min-h-[48px] ${style}`}
              >
                <span className="font-semibold shrink-0 w-6">{opt.key}.</span>
                <span className="flex-1">{opt.text}</span>
                {isPractice && showFeedback && opt.key === q.correct_answer && (
                  <Check className="h-5 w-5 text-green-700 dark:text-green-300 shrink-0" />
                )}
                {isPractice &&
                  showFeedback &&
                  selected === opt.key &&
                  opt.key !== q.correct_answer && (
                    <X className="h-5 w-5 text-red-700 dark:text-red-300 shrink-0" />
                  )}
              </button>
            );
          })}
        </div>

        {isPractice && showFeedback && (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {selected === q.correct_answer ? (
                <Badge variant="success">Correct</Badge>
              ) : (
                <Badge variant="error">Incorrect</Badge>
              )}
              <span className="text-sm">
                Correct: <strong>{q.correct_answer}</strong>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--foreground)]">{q.explanation}</p>
            {q.reference && (
              <p className="text-xs text-[var(--muted-foreground)] mt-2">Reference: {q.reference}</p>
            )}
            {current < questions.length - 1 && (
              <Button
                className="w-full mt-4 min-h-11"
                onClick={() => setCurrent((c) => c + 1)}
              >
                Next question
              </Button>
            )}
          </div>
        )}
      </div>

      <footer
        className="fixed bottom-0 inset-x-0 z-20 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur px-3 pt-2"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {questions.map((qq, i) => {
              const ans = answers[qq.id];
              const isFlag = flagged.has(qq.id);
              let cls = 'bg-[var(--muted)] text-[var(--muted-foreground)]';
              if (i === current) cls = 'bg-[var(--accent-color)] text-white';
              else if (ans?.selected_answer) cls = 'bg-[var(--accent-color)]/20 text-[var(--accent-color)]';
              if (isFlag) cls += ' ring-2 ring-amber-400';
              return (
                <button
                  key={qq.id}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`h-9 w-9 shrink-0 rounded-lg text-xs font-medium ${cls}`}
                  aria-label={`Question ${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="gap-1 min-h-11 flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            {current < questions.length - 1 ? (
              <Button
                onClick={() => setCurrent((c) => c + 1)}
                className="gap-1 min-h-11 flex-1 sm:flex-none"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="min-h-11 flex-1 sm:flex-none"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
