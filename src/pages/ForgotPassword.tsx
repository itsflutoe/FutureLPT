import { Link } from 'react-router-dom';
import { FLPT_ADMIN_FACEBOOK_URL } from '@/config/support';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ForgotPassword() {
  const facebookUrl = FLPT_ADMIN_FACEBOOK_URL.trim();
  const hasFacebookUrl = facebookUrl.length > 0;

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
          <CardTitle>Forgot your password?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--muted-foreground)]">
          <p className="text-[var(--foreground)]">
            Password recovery is handled by the FLPT administrator.
          </p>
          <p>
            Send the administrator a message on Facebook with your{' '}
            <strong className="text-[var(--foreground)]">FLPT username</strong> and any information
            needed to verify that the account is yours.
          </p>
          <p>
            After your account is verified, the administrator can reset your password. You will then
            sign in with your username and the new password.
          </p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3 text-xs">
            <strong className="text-[var(--foreground)]">Do not</strong> send your current password
            (or any old password) in the message. The administrator only needs your username and
            enough detail to confirm identity.
          </div>

          {hasFacebookUrl ? (
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full" type="button">
                Message FLPT Admin on Facebook
              </Button>
            </a>
          ) : (
            <Button className="w-full" type="button" disabled>
              Message FLPT Admin on Facebook
            </Button>
          )}

          {!hasFacebookUrl && (
            <p className="text-xs text-center">
              The Facebook contact link is not configured yet. Ask your school or FLPT admin for the
              correct page.
            </p>
          )}

          <p className="text-center pt-2">
            <Link to="/login" className="text-[var(--accent-color)] font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
