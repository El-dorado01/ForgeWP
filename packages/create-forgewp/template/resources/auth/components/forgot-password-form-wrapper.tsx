import * as React from 'react';
import { useWpAuth } from '@forgewp/auth';
import { useWpPageLink, useLocation } from '@forgewp/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AlertTriangleIcon, ArrowLeftIcon } from 'lucide-react';

export default function ForgotPasswordFormWrapper() {
  const { forgotPassword, error, initializing } = useWpAuth();
  const [_, setLocation] = useLocation();
  const [emailOrUsername, setEmailOrUsername] = React.useState('');
  const loginUrl = useWpPageLink('login-page', '/login');
  const [success, setSuccess] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const input = emailOrUsername.trim();
    if (!input) {
      setLocalError('Please enter your username or email address.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await forgotPassword(input);
      if (ok) {
        setSuccess(true);
      }
    } catch (err: any) {
      setLocalError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing) {
    return (
      <div className='flex flex-col items-center justify-center p-8 min-h-[300px]'>
        <div className='w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin'></div>
        <p className='text-slate-500 font-mono text-sm mt-4'>
          Checking session...
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{success ? 'Check Your Email' : 'Forgot Password?'}</CardTitle>
        <CardDescription>
          {success
            ? "If the account exists, we have sent a reset password link."
            : "Enter your username or email address below and we'll send you a link to reset your password."}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8 py-4">
        {success ? (
          <div className="text-zinc-600 text-sm leading-relaxed text-center">
            <p className="mb-4">
              We have sent instructions to reset your password.
            </p>
            <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 text-xs text-zinc-500 text-left font-mono mb-4">
              <strong>Dev Notice:</strong> Look for the simulated email in <code className="bg-zinc-200 px-1 rounded">cms/email-logs.json</code> to click the recovery link.
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="text-primary hover:underline text-sm font-medium cursor-pointer"
            >
              Didn&apos;t receive the email? Try again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {(localError || error) && (
                <div className="bg-red-50 text-red-600 border border-red-200 text-sm p-3 rounded-md font-medium flex items-start gap-2">
                  <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{localError || error}</span>
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="emailOrUsername">Username or Email Address</FieldLabel>
                <Input
                  id="emailOrUsername"
                  type="text"
                  placeholder="Enter username or email"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  disabled={submitting}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={submitting} className="w-full cursor-pointer">
                  {submitting ? 'Sending link...' : 'Send Reset Link'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}
      </CardContent>

      <CardFooter className="px-8 pb-8 pt-4 flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full cursor-pointer hover:bg-zinc-50 border-zinc-200 flex items-center justify-center gap-2"
          onClick={() => setLocation(loginUrl)}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Return to Sign In
        </Button>
      </CardFooter>
    </Card>
  );
}
