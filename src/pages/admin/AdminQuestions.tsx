import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Question, Category, Difficulty } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 50;

type QuestionForm = {
  category: string;
  subject: string;
  topic: string;
  difficulty: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  reference: string;
  is_active: boolean;
};

const emptyForm = (): QuestionForm => ({
  category: 'PROFESSIONAL_EDUCATION',
  subject: '',
  topic: '',
  difficulty: 'MODERATE',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  explanation: '',
  reference: '',
  is_active: true,
});

function fromQuestion(q: Question): QuestionForm {
  return {
    category: q.category,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    question: q.question,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation || '',
    reference: q.reference || '',
    is_active: q.is_active,
  };
}


function csvEscape(value: string | null | undefined): string {
  const s = value ?? '';
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function fetchAllQuestionsForAdmin(): Promise<Question[]> {
  const pageSize = 1000;
  let from = 0;
  const all: Question[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data || []) as Question[];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const [editing, setEditing] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<QuestionForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const load = async (pageIndex: number, query: string) => {
    setLoading(true);
    setError('');
    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let countQuery = supabase.from('questions').select('id', { count: 'exact', head: true });
      let listQuery = supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (query.trim()) {
        const q = `%${query.trim()}%`;
        countQuery = countQuery.or(`question.ilike.${q},subject.ilike.${q},topic.ilike.${q}`);
        listQuery = listQuery.or(`question.ilike.${q},subject.ilike.${q},topic.ilike.${q}`);
      }

      const [countRes, listRes] = await Promise.all([countQuery, listQuery]);
      if (countRes.error) throw countRes.error;
      if (listRes.error) throw listRes.error;

      setTotal(countRes.count ?? 0);
      setQuestions((listRes.data || []) as Question[]);
      setPage(pageIndex);
      setSearchApplied(query.trim());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load questions');
      setQuestions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0, '');
  }, []);

  const openEdit = (q: Question) => {
    setCreating(false);
    setEditing(q);
    setForm(fromQuestion(q));
    setStatus('');
    setError('');
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm(emptyForm());
    setStatus('');
    setError('');
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm());
  };

  const validateForm = (): string | null => {
    if (!form.question.trim()) return 'Question text is required.';
    if (!form.subject.trim()) return 'Subject is required.';
    if (!form.topic.trim()) return 'Topic is required.';
    if (!form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
      return 'All four options (A–D) are required.';
    }
    if (!['A', 'B', 'C', 'D'].includes(form.correct_answer.toUpperCase())) {
      return 'Correct answer must be A, B, C, or D.';
    }
    if (!form.explanation.trim()) return 'Explanation is required.';
    return null;
  };

  const saveForm = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    setStatus('');

    const payload = {
      category: form.category as Category,
      subject: form.subject.trim(),
      topic: form.topic.trim(),
      difficulty: form.difficulty as Difficulty,
      question: form.question.trim(),
      option_a: form.option_a.trim(),
      option_b: form.option_b.trim(),
      option_c: form.option_c.trim(),
      option_d: form.option_d.trim(),
      correct_answer: form.correct_answer.toUpperCase() as 'A' | 'B' | 'C' | 'D',
      explanation: form.explanation.trim(),
      reference: form.reference.trim() || null,
      is_active: form.is_active,
    };

    try {
      if (creating) {
        const { error: insError } = await supabase.from('questions').insert(payload);
        if (insError) throw insError;
        setStatus('Question created.');
      } else if (editing) {
        const { error: updError } = await supabase.from('questions').update(payload).eq('id', editing.id);
        if (updError) throw updError;
        setStatus('Question updated.');
      }
      closeForm();
      await load(page, searchApplied);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (q: Question) => {
    const ok = window.confirm(
      'Delete this question permanently?\n\nThis cannot be undone. If it was used in past attempts, related answer rows may be removed by cascade.'
    );
    if (!ok) return;

    setDeletingId(q.id);
    setError('');
    setStatus('');
    try {
      const { error: delError } = await supabase.from('questions').delete().eq('id', q.id);
      if (delError) throw delError;
      setStatus('Question deleted.');
      if (editing?.id === q.id) closeForm();
      await load(page, searchApplied);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };


  const exportAll = async () => {
    setExporting(true);
    setError('');
    setStatus('');
    try {
      const all = await fetchAllQuestionsForAdmin();
      if (all.length === 0) {
        setStatus('No questions to export.');
        return;
      }
      const header = [
        'Category',
        'Subject',
        'Topic',
        'Difficulty',
        'Question',
        'A',
        'B',
        'C',
        'D',
        'Correct Answer',
        'Rationale',
        'Reference',
      ];
      const lines = [header.join(',')];
      for (const q of all) {
        lines.push(
          [
            csvEscape(q.category),
            csvEscape(q.subject),
            csvEscape(q.topic),
            csvEscape(q.difficulty),
            csvEscape(q.question),
            csvEscape(q.option_a),
            csvEscape(q.option_b),
            csvEscape(q.option_c),
            csvEscape(q.option_d),
            csvEscape(q.correct_answer),
            csvEscape(q.explanation),
            csvEscape(q.reference),
          ].join(',')
        );
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flpt-questions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${all.length} questions.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const deleteAllQuestions = async () => {
    const ok = window.confirm(
      'Delete ALL questions permanently?\n\nThis removes the entire question bank. Related attempt answers may be removed by cascade. This cannot be undone.'
    );
    if (!ok) return;
    const ok2 = window.confirm(
      `Type-confirm: really delete all ${total} questions from the database?`
    );
    if (!ok2) return;

    setDeletingAll(true);
    setError('');
    setStatus('');
    try {
      // Batch delete by id to stay within API limits and RLS-friendly operations
      const all = await fetchAllQuestionsForAdmin();
      const ids = all.map((q) => q.id);
      const chunkSize = 100;
      let deleted = 0;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error: delError } = await supabase.from('questions').delete().in('id', chunk);
        if (delError) throw delError;
        deleted += chunk.length;
      }
      setStatus(`Deleted ${deleted} questions.`);
      closeForm();
      await load(0, '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete all failed');
    } finally {
      setDeletingAll(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error: updError } = await supabase
      .from('questions')
      .update({ is_active: !active })
      .eq('id', id);
    if (updError) {
      setError(updError.message);
      return;
    }
    load(page, searchApplied);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min(total, (page + 1) * PAGE_SIZE);
  const showForm = creating || !!editing;

  const setField = <K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold">Questions</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-[var(--muted-foreground)]">
            {total === 0 ? 'No questions' : `Showing ${showingFrom}–${showingTo} of ${total}`}
          </p>
          <Link to="/admin/stats">
            <Button size="sm" variant="outline">Statistics</Button>
          </Link>
          <Button size="sm" variant="outline" onClick={exportAll} disabled={exporting || total === 0}>
            {exporting ? 'Exporting…' : 'Export all'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={deleteAllQuestions}
            disabled={deletingAll || total === 0}
          >
            {deletingAll ? 'Deleting…' : 'Delete all'}
          </Button>
          <Button size="sm" onClick={openCreate}>
            Add question
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search question, subject, or topic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(0, search)}
        />
        <Button onClick={() => load(0, search)}>Search</Button>
        {searchApplied && (
          <Button
            variant="outline"
            onClick={() => {
              setSearch('');
              load(0, '');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          {status}
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold">{creating ? 'New question' : 'Edit question'}</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Category</label>
                <select
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                >
                  <option value="GENERAL_EDUCATION">General Education</option>
                  <option value="PROFESSIONAL_EDUCATION">Professional Education</option>
                  <option value="SPECIALIZATION">Specialization</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Difficulty</label>
                <select
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  value={form.difficulty}
                  onChange={(e) => setField('difficulty', e.target.value)}
                >
                  <option value="EASY">Easy</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="DIFFICULT">Difficult</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Subject</label>
                <Input value={form.subject} onChange={(e) => setField('subject', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Topic</label>
                <Input value={form.topic} onChange={(e) => setField('topic', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Question</label>
              <textarea
                className="w-full min-h-[88px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                value={form.question}
                onChange={(e) => setField('question', e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((key, i) => (
                <div key={key}>
                  <label className="text-xs font-medium mb-1 block">Option {String.fromCharCode(65 + i)}</label>
                  <Input value={form[key]} onChange={(e) => setField(key, e.target.value)} />
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Correct answer</label>
                <select
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  value={form.correct_answer}
                  onChange={(e) => setField('correct_answer', e.target.value)}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setField('is_active', e.target.checked)}
                  />
                  Active (visible in practice)
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Explanation</label>
              <textarea
                className="w-full min-h-[72px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                value={form.explanation}
                onChange={(e) => setField('explanation', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Reference (optional)</label>
              <Input value={form.reference} onChange={(e) => setField('reference', e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={saveForm} disabled={saving}>
                {saving ? 'Saving…' : creating ? 'Create' : 'Save changes'}
              </Button>
              <Button variant="outline" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            No questions found{searchApplied ? ' for this search' : ''}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 mb-1">
                  <Badge variant="outline">{q.category}</Badge>
                  <Badge variant="outline">{q.subject}</Badge>
                  <Badge variant="outline">{q.difficulty}</Badge>
                  <Badge variant={q.is_active ? 'success' : 'error'}>
                    {q.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm line-clamp-2">{q.question}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {q.topic}
                  {q.created_at ? ` · ${new Date(q.created_at).toLocaleString()}` : ''}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(q)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(q.id, q.is_active)}>
                    {q.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={deletingId === q.id}
                    onClick={() => deleteQuestion(q)}
                  >
                    {deletingId === q.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            disabled={page <= 0 || loading}
            onClick={() => load(page - 1, searchApplied)}
          >
            Previous
          </Button>
          <span className="text-sm text-[var(--muted-foreground)]">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => load(page + 1, searchApplied)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
