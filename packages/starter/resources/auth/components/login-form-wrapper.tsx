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
  const [unverifiedNotice, setUnverifiedNotice] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [resendStatus, setResendStatus] = React.useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [resendErrorMessage, setResendErrorMessage] = React.useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const cooldownTimerRef = React.useRef<any>(null);

  const forgotPasswordUrl = useWpPageLink('forgot-password-page', '/forgot-password');
  const signUpUrl = useWpPageLink('sign-up-page', '/signup');
  const dashboardUrl = useWpPageLink('account-page', '/account');

  React.useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (user) {
      setLocation(dashboardUrl);
    }
  }, [user, setLocation, dashboardUrl]);

  React.useEffect(() => {
    const activeErr = localError || error;
    if (activeErr && /verif/i.test(activeErr)) {
      setUnverifiedNotice(activeErr);
    }
  }, [localError, error]);

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
        // Ensure unverifiedNotice stays active so the box never collapses
        if (!unverifiedNotice) {
          setUnverifiedNotice('Please verify your email address before logging in.');
        }
        // 60-second cooldown before they can request again
        setResendCooldown(60);
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
        }
        cooldownTimerRef.current = setInterval(() => {
          setResendCooldown((prev: number) => {
            if (prev <= 1) {
              clearInterval(cooldownTimerRef.current);
              cooldownTimerRef.current = null;
              return 0;
            }
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
    setUnverifiedNotice(null);
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
      const msg = err.message || 'Login failed. Please try again.';
      setLocalError(msg);
      if (/verif/i.test(msg)) {
        setUnverifiedNotice(msg);
      }
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

  const activeRawError = localError || error;
  const isUnverified = Boolean(unverifiedNotice || (activeRawError && /verif/i.test(activeRawError)));
  const displayedError = unverifiedNotice || activeRawError;

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
              {isUnverified ? (
                resendStatus === 'success' ? (
                  <div className="bg-emerald-50 text-emerald-950 border border-emerald-200/80 text-sm p-4 rounded-lg flex flex-col gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-emerald-100 rounded-md text-emerald-700 shrink-0">
                        <CheckCircle2Icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="font-semibold text-emerald-950 text-sm">Verification Link Sent</span>
                        <p className="text-emerald-800 text-xs leading-relaxed">
                          A fresh verification link has been sent to your email. Please check your inbox (and spam folder).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-emerald-900 pt-2.5 border-t border-emerald-200/60">
                      <span>Didn&apos;t receive it?</span>
                      {resendCooldown > 0 ? (
                        <span className="text-emerald-700/90 font-medium">
                          Resend available in {resendCooldown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          className="font-semibold underline underline-offset-2 hover:text-emerald-950 cursor-pointer inline-flex items-center gap-1 transition-colors"
                        >
                          Resend verification email
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-950 border border-amber-200/80 text-sm p-4 rounded-lg flex flex-col gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-amber-100 rounded-md text-amber-700 shrink-0">
                        <MailIcon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="font-semibold text-amber-950 text-sm">Email Verification Required</span>
                        <p className="text-amber-800 text-xs leading-relaxed">
                          {displayedError || 'Please verify your email address before logging in.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2.5 border-t border-amber-200/60">
                      <div className="flex items-center gap-1.5 flex-wrap text-xs text-amber-900">
                        <span>Need a new link sent to your inbox?</span>
                        {resendCooldown > 0 ? (
                          <span className="text-amber-800/80 font-medium">
                            Resend available in {resendCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={resendStatus === 'sending'}
                            onClick={handleResendVerification}
                            className="font-semibold underline underline-offset-2 hover:text-amber-950 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1 transition-colors"
                          >
                            {resendStatus === 'sending' ? (
                              <><RefreshCwIcon className="h-3 w-3 animate-spin inline" /> Sending...</>
                            ) : (
                              'Resend verification email'
                            )}
                          </button>
                        )}
                      </div>
                      {resendStatus === 'failed' && resendErrorMessage && (
                        <span className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded border border-red-100">
                          {resendErrorMessage}
                        </span>
                      )}
                    </div>
                  </div>
                )
              ) : activeRawError ? (
                <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3.5 rounded-lg flex items-start gap-2.5 shadow-xs">
                  <AlertTriangleIcon className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span className="font-medium text-xs leading-relaxed">{activeRawError}</span>
                </div>
              ) : null}
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
