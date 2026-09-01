import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '@/services/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    submittingRef.current = true;

    setError('');
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      submittingRef.current = false;
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      submittingRef.current = false;
      return;
    }

    setLoading(true);
    try {
      await signUp(username, password, displayName || username, targetDate || undefined);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] text-white font-bold text-sm">
              FL
            </div>
            <span className="font-semibold">FLPT</span>
          </div>
          <CardTitle>Create your account</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Start preparing for the LET with a personal companion.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5">
                Username *
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="unique username"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium mb-1.5">
                Display name
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How we should greet you"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password *
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium mb-1.5">
                Target LET date (optional)
              </label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent-color)] font-medium hover:underline">
              Log in
            </Link>
          </p>
          <p className="mt-4 text-xs text-center text-[var(--muted-foreground)]">
            FLPT is not affiliated with PRC or CHED. Practice material is LET-style only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
