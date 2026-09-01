import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/** Parse a single CSV line respecting double-quoted fields (commas inside quotes are kept). */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '') // BOM
    .replace(/[\s\-]+/g, '_');
}

/** Map common header aliases to canonical keys used by the importer. */
function canonicalKey(h: string): string {
  const n = normalizeHeader(h);
  const aliases: Record<string, string> = {
    id: 'id',
    category: 'category',
    subject: 'subject',
    topic: 'topic',
    difficulty: 'difficulty',
    question: 'question',
    question_text: 'question',
    a: 'option_a',
    option_a: 'option_a',
    choice_a: 'option_a',
    b: 'option_b',
    option_b: 'option_b',
    choice_b: 'option_b',
    c: 'option_c',
    option_c: 'option_c',
    choice_c: 'option_c',
    d: 'option_d',
    option_d: 'option_d',
    choice_d: 'option_d',
    correct: 'correct_answer',
    correct_answer: 'correct_answer',
    answer: 'correct_answer',
    rationale: 'explanation',
    explanation: 'explanation',
    reference: 'reference',
    source: 'reference',
    source_url: 'reference',
  };
  return aliases[n] || n;
}

function parseCSV(text: string): Record<string, string>[] {
  // Normalize newlines; keep non-empty lines
  const rawLines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const lines: string[] = [];
  let buf = '';
  let inQuotes = false;

  // Re-join rows that span multiple lines because of quoted newlines
  for (const line of rawLines) {
    buf = buf ? `${buf}\n${line}` : line;
    const quotes = (buf.match(/"/g) || []).length;
    inQuotes = quotes % 2 === 1;
    if (!inQuotes) {
      if (buf.trim()) lines.push(buf);
      buf = '';
    }
  }
  if (buf.trim()) lines.push(buf);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(canonicalKey);

  return lines.slice(1).map((line, idx) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = { _row: String(idx + 2) };
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? '').trim();
    });
    return row;
  });
}

function mapCategory(raw: string): string {
  const v = (raw || 'PROFESSIONAL_EDUCATION').trim().toUpperCase().replace(/\s+/g, '_');
  if (v.includes('GENERAL')) return 'GENERAL_EDUCATION';
  if (v.includes('PROFESSIONAL')) return 'PROFESSIONAL_EDUCATION';
  if (v.includes('SPECIAL')) return 'SPECIALIZATION';
  return v;
}

function mapDifficulty(raw: string): string {
  const v = (raw || 'MODERATE').trim().toUpperCase();
  if (v.startsWith('EASY')) return 'EASY';
  if (v.startsWith('DIFF')) return 'DIFFICULT';
  return 'MODERATE';
}

export default function AdminImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFile = async (f: File) => {
    setFile(f);
    setStatus('');
    const text = await f.text();
    const rows = parseCSV(text);
    setParsedRows(rows);

    const errs: string[] = [];
    if (rows.length === 0) {
      errs.push('No data rows found. Check that the file is CSV with a header row.');
    }
    rows.forEach((r) => {
      if (!r.question) errs.push(`Row ${r._row}: missing question`);
      if (!r.correct_answer) errs.push(`Row ${r._row}: missing correct answer`);
      const ans = (r.correct_answer || '').toUpperCase();
      if (ans && !['A', 'B', 'C', 'D'].includes(ans)) {
        errs.push(`Row ${r._row}: invalid correct answer "${ans}" (must be A, B, C, or D)`);
      }
      if (!r.option_a || !r.option_b || !r.option_c || !r.option_d) {
        errs.push(`Row ${r._row}: missing one or more options (A–D)`);
      }
    });
    setErrors(errs);
    setPreview(rows.slice(0, 5));
  };

  const doImport = async () => {
    if (!file || parsedRows.length === 0 || errors.length > 0) return;
    setImporting(true);
    setStatus('');
    try {
      const payload = parsedRows.map((r) => ({
        category: mapCategory(r.category),
        subject: r.subject || 'General',
        topic: r.topic || 'General',
        difficulty: mapDifficulty(r.difficulty),
        question: r.question,
        option_a: r.option_a,
        option_b: r.option_b,
        option_c: r.option_c,
        option_d: r.option_d,
        correct_answer: r.correct_answer.toUpperCase(),
        explanation: r.explanation || 'See reference materials.',
        reference: r.reference || null,
        source_type: 'original' as const,
        is_active: true,
      }));

      // Insert in chunks to avoid payload limits
      const chunkSize = 50;
      let inserted = 0;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from('questions').insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }

      setStatus(`Successfully imported ${inserted} questions.`);
      setPreview([]);
      setParsedRows([]);
      setFile(null);
      setErrors([]);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">CSV Import</h1>
      <div className="text-sm text-[var(--muted-foreground)] space-y-1">
        <p>
          Required columns:{' '}
          <code className="text-xs">Category, Subject, Topic, Difficulty, Question, A, B, C, D, Correct Answer, Rationale, Reference</code>
        </p>
        <p>
          Use UTF-8 CSV. Put quotes around fields that contain commas. Correct Answer must be{' '}
          <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, or <strong>D</strong>.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="text-sm"
          />
          {errors.length > 0 && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm max-h-48 overflow-y-auto">
              {errors.slice(0, 30).map((e, i) => (
                <div key={i}>{e}</div>
              ))}
              {errors.length > 30 && <div>…and {errors.length - 30} more</div>}
            </div>
          )}
          {preview.length > 0 && errors.length === 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Preview (first 5 rows) — looks good</p>
              <pre className="text-xs bg-[var(--muted)] p-3 rounded-xl overflow-x-auto max-h-48">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          )}
          {status && <p className="text-sm">{status}</p>}
          <Button onClick={doImport} disabled={!file || errors.length > 0 || importing || parsedRows.length === 0}>
            {importing ? 'Importing…' : `Confirm Import${parsedRows.length ? ` (${parsedRows.length})` : ''}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
