import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [importing, setImporting] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    return lines.slice(1).map((line, idx) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = { _row: String(idx + 2) };
      headers.forEach((h, i) => { row[h] = cols[i] || ''; });
      return row;
    });
  };

  const handleFile = async (f: File) => {
    setFile(f);
    const text = await f.text();
    const rows = parseCSV(text);
    const errs: string[] = [];
    rows.forEach((r) => {
      if (!r.question) errs.push(`Row ${r._row}: missing question`);
      if (!r.correct_answer && !r.correct) errs.push(`Row ${r._row}: missing correct answer`);
      const ans = (r.correct_answer || r.correct || '').toUpperCase();
      if (ans && !['A', 'B', 'C', 'D'].includes(ans)) errs.push(`Row ${r._row}: invalid correct answer ${ans}`);
    });
    setErrors(errs);
    setPreview(rows.slice(0, 10));
  };

  const doImport = async () => {
    if (!file) return;
    setImporting(true);
    setStatus('');
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const payload = rows.map((r) => ({
        category: (r.category || 'PROFESSIONAL_EDUCATION').toUpperCase().replace(/ /g, '_'),
        subject: r.subject || 'General',
        topic: r.topic || 'General',
        difficulty: (r.difficulty || 'MODERATE').toUpperCase(),
        question: r.question,
        option_a: r.a || r.option_a,
        option_b: r.b || r.option_b,
        option_c: r.c || r.option_c,
        option_d: r.d || r.option_d,
        correct_answer: (r.correct_answer || r.correct || 'A').toUpperCase(),
        explanation: r.rationale || r.explanation || 'See reference materials.',
        reference: r.reference || null,
        source_type: 'original',
        is_active: true,
      }));
      const { error } = await supabase.from('questions').insert(payload);
      if (error) throw error;
      setStatus(`Successfully imported ${payload.length} questions.`);
      setPreview([]);
      setFile(null);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">CSV Import</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Columns: Category, Subject, Topic, Difficulty, Question, A, B, C, D, Correct Answer, Rationale, Reference
      </p>
      <Card>
        <CardHeader><CardTitle className="text-base">Upload CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="text-sm" />
          {errors.length > 0 && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm max-h-40 overflow-y-auto">
              {errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Preview (first 10)</p>
              <pre className="text-xs bg-[var(--muted)] p-3 rounded-xl overflow-x-auto max-h-48">{JSON.stringify(preview, null, 2)}</pre>
            </div>
          )}
          {status && <p className="text-sm">{status}</p>}
          <Button onClick={doImport} disabled={!file || errors.length > 0 || importing}>
            {importing ? 'Importing…' : 'Confirm Import'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
