import * as React from 'react';
import { useWpAuth, useWpUser } from '@forgewp/auth';
import { useWpPageLink, useLocation } from '@forgewp/react';
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
import { AlertTriangleIcon, MailIcon, CheckCircle2Icon, RefreshCwIcon } from 'lucide-react';

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
  const [resendCooldown, setResendCooldown] = React.useState(0);

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
        // 30-second cooldown before they can request again
        setResendCooldown(30);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) { clearInterval(interval); return 0; }
            return prev - 1;
          });
        }, 1000);
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
                    <div className="mt-2 pt-3 border-t border-red-100">
                      {resendStatus === 'success' ? (
                        <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-md p-3">
                          <CheckCircle2Icon className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-green-700 text-xs font-semibold">Verification email sent!</span>
                            <span className="text-green-600 text-xs">
                              Check your inbox (and spam folder). The link expires in 24 hours on the live site.
                            </span>
                            {resendCooldown > 0 && (
                              <button
                                type="button"
                                disabled
                                className="text-green-500 text-xs mt-1 cursor-not-allowed"
                              >
                                Resend again in {resendCooldown}s
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-red-600 text-xs">
                            Didn&apos;t receive the email? Check your spam folder or request a new one.
                          </p>
                          <button
                            type="button"
                            disabled={resendStatus === 'sending' || resendCooldown > 0}
                            onClick={handleResendVerification}
                            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                          >
                            {resendStatus === 'sending' ? (
                              <><RefreshCwIcon className="h-3 w-3 animate-spin" /> Sending&hellip;</>
                            ) : resendCooldown > 0 ? (
                              <><MailIcon className="h-3 w-3" /> Resend in {resendCooldown}s</>
                            ) : (
                              <><MailIcon className="h-3 w-3" /> Resend Verification Email</>
                            )}
                          </button>
                          {resendStatus === 'failed' && resendErrorMessage && (
                            <span className="text-red-500 text-xs">{resendErrorMessage}</span>
                          )}
                        </div>
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
