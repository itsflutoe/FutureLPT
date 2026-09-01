import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '@/services/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await resetPassword(username);
      setMessage('If an account exists, a recovery link has been sent. Check your email (or configured recovery channel).');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Enter your username. We use Supabase secure recovery.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
            {message && <div className="rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">{message}</div>}
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5">Username</label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send recovery link'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link to="/login" className="text-[var(--accent-color)] hover:underline">Back to login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
