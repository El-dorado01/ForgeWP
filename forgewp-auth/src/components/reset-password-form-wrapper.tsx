import * as React from 'react';
import { useWpAuth, useWpUser } from '@forgewp/auth';
import { useWpPageLink, useLocation } from '../.forgewp/wordpress';
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

export default function ResetPasswordFormWrapper() {
  const { resetPassword, error, initializing } = useWpAuth();
  const user = useWpUser();
  const [_, setLocation] = useLocation();
  const loginUrl = useWpPageLink('login-page', '/login');
  const dashboardUrl = useWpPageLink('dashboard-page', '/dashboard');

  React.useEffect(() => {
    if (user) {
      setLocation(dashboardUrl);
    }
  }, [user, setLocation, dashboardUrl]);

  const [key, setKey] = React.useState('');
  const [login, setLogin] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [missingParams, setMissingParams] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const keyParam = searchParams.get('key');
    const loginParam = searchParams.get('login');

    if (!keyParam || !loginParam) {
      setMissingParams(true);
    } else {
      setKey(keyParam);
      setLogin(loginParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedPassword) {
      setLocalError('Please enter a new password.');
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await resetPassword(login, key, trimmedPassword);
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          setLocation(loginUrl);
        }, 3000);
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
        <CardTitle>
          {success
            ? 'Password Reset Complete'
            : missingParams
            ? 'Invalid Reset Link'
            : 'Reset Your Password'}
        </CardTitle>
        <CardDescription>
          {success
            ? 'Your password has been successfully updated.'
            : missingParams
            ? 'This password reset link is invalid or incomplete.'
            : `Choose a new secure password for ${login}.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8 py-4">
        {success ? (
          <p className="text-green-600 font-medium text-center text-sm leading-relaxed">
            Redirecting you to the sign in page in 3 seconds...
          </p>
        ) : missingParams ? (
          <div className="text-zinc-600 text-sm leading-relaxed text-center">
            <p className="mb-4">
              The password reset link is missing required verification parameters. Please request a new link.
            </p>
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
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={submitting} className="w-full cursor-pointer">
                  {submitting ? 'Resetting password...' : 'Update Password'}
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
