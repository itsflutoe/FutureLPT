import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signIn } from '@/services/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(username, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-color)] text-white font-bold text-sm">FL</div>
            <span className="font-semibold">FLPT</span>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">Sign in to continue your LET review.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5">Username</label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-[var(--accent-color)] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--accent-color)] font-medium hover:underline">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
