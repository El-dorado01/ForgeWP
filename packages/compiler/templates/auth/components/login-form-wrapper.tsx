import * as React from 'react';
import { useWpAuth, useWpUser } from '@forgewp/auth';
import { useWpPageLink, useLocation } from '../.forgewp/wordpress';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AlertTriangleIcon } from 'lucide-react';

export default function LoginFormWrapper({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { login, error, loginField, initializing, resendVerificationEmail } = useWpAuth();
  const user = useWpUser();
  const [_, setLocation] = useLocation();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [resendStatus, setResendStatus] = React.useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [resendErrorMessage, setResendErrorMessage] = React.useState<string | null>(null);

  const forgotPasswordUrl = useWpPageLink('forgot-password-page', '/forgot-password');
  const signUpUrl = useWpPageLink('sign-up-page', '/signup');
  const dashboardUrl = useWpPageLink('dashboard-page', '/dashboard');

  React.useEffect(() => {
    if (user) {
      setLocation(dashboardUrl);
    }
  }, [user, setLocation, dashboardUrl]);

  const handleResendVerification = async () => {
    const input = username.trim();
    if (!input) {
      setResendErrorMessage('Please enter your username or email in the login field first.');
      setResendStatus('failed');
      return;
    }

    setResendStatus('sending');
    setResendErrorMessage(null);
    try {
      const ok = await resendVerificationEmail(input);
      if (ok) {
        setResendStatus('success');
      } else {
        setResendStatus('failed');
        setResendErrorMessage(error || 'Failed to resend verification email.');
      }
    } catch (err: any) {
      setResendStatus('failed');
      setResendErrorMessage(err.message || 'An unexpected error occurred.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setResendStatus('idle');
    setResendErrorMessage(null);

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setLocalError('Please enter both username/email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedUsername, trimmedPassword, dashboardUrl);
    } catch (err: any) {
      setLocalError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing || user) {
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
    <div
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your username or email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {(localError || error) && (
                <div className="bg-red-50 text-red-600 border border-red-200 text-sm p-3 rounded-md font-medium flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{localError || error}</span>
                  </div>
                  {((localError || error) as string).includes('not been verified yet') && (
                    <div className="mt-1 pt-2 border-t border-red-100 flex flex-col gap-2">
                      {resendStatus === 'success' ? (
                        <span className="text-green-600 text-xs font-semibold">
                          Verification email successfully resent!
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={resendStatus === 'sending'}
                          onClick={handleResendVerification}
                          className="text-red-700 hover:underline text-xs font-semibold text-left cursor-pointer disabled:opacity-50"
                        >
                          {resendStatus === 'sending' ? 'Resending...' : "Didn't get the email? Click here to resend."}
                        </button>
                      )}
                      {resendStatus === 'failed' && resendErrorMessage && (
                        <span className="text-red-500 text-xs font-normal">
                          {resendErrorMessage}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor='username'>
                  {loginField === 'usernameOnly' ? 'Username' : loginField === 'emailOnly' ? 'Email Address' : 'Username or Email'}
                </FieldLabel>
                <Input
                  id='username'
                  type='text'
                  placeholder={loginField === 'usernameOnly' ? 'username' : loginField === 'emailOnly' ? 'user@example.com' : 'admin / subscriber'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  required
                  autoComplete="username"
                />
              </Field>
              <Field>
                <div className='flex items-center'>
                  <FieldLabel htmlFor='password'>Password</FieldLabel>
                  <a
                    href={forgotPasswordUrl}
                    className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id='password'
                  type='password'
                  placeholder='••••••••'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                  autoComplete="current-password"
                />
              </Field>
              <Field>
                <Button type='submit' disabled={submitting} className="w-full cursor-pointer">
                  {submitting ? 'Logging in...' : 'Login'}
                </Button>
                <FieldDescription className='text-center'>
                  Don&apos;t have an account? <a href={signUpUrl} className="underline">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
