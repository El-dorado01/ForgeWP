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
import { MailOpenIcon, CheckCircle2Icon, AlertTriangleIcon, Loader2Icon } from 'lucide-react';

export default function VerifyEmailViewWrapper() {
  const { verifyEmail, logout, error, initializing, resendVerificationEmail } = useWpAuth();
  const [_, setLocation] = useLocation();
  const loginUrl = useWpPageLink('login-page', '/login');
  const dashboardUrl = useWpPageLink('account-page', '/account');

  const [status, setStatus] = React.useState<'pending' | 'verifying' | 'success' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const hasRunRef = React.useRef(false);

  const [resendEmail, setResendEmail] = React.useState('');
  const [resendStatus, setResendStatus] = React.useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [resendErrorMessage, setResendErrorMessage] = React.useState<string | null>(null);
  const [showResendForm, setShowResendForm] = React.useState(false);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResendStatus('sending');
    setResendErrorMessage(null);
    try {
      const ok = await resendVerificationEmail(resendEmail);
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

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const userIdStr = searchParams.get('userId');
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (emailParam) {
      setResendEmail(emailParam);
    }

    if (userIdStr && token) {
      if (hasRunRef.current) return;
      hasRunRef.current = true;

      setStatus('verifying');
      const userId = parseInt(userIdStr, 10);
      verifyEmail(userId, token)
        .then((ok) => {
          if (ok) {
            setStatus('success');
            setTimeout(() => {
              setLocation(dashboardUrl);
            }, 2500);
          } else {
            setStatus('failed');
            setErrorMessage('Verification failed. The token may be expired or invalid.');
          }
        })
        .catch((err) => {
          setStatus('failed');
          setErrorMessage(err.message || 'An unexpected error occurred.');
        });
    } else {
      setStatus('pending');
    }
  }, [verifyEmail, setLocation, dashboardUrl]);

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
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {status === 'pending' && (
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <MailOpenIcon className="h-10 w-10 animate-pulse" />
            </div>
          )}
          {status === 'verifying' && (
            <div className="p-3 bg-zinc-100 text-zinc-600 rounded-full">
              <Loader2Icon className="h-10 w-10 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="p-3 bg-green-50 text-green-600 rounded-full">
              <CheckCircle2Icon className="h-10 w-10" />
            </div>
          )}
          {status === 'failed' && (
            <div className="p-3 bg-red-50 text-red-600 rounded-full">
              <AlertTriangleIcon className="h-10 w-10" />
            </div>
          )}
        </div>

        <CardTitle>
          {status === 'pending' && 'Check Your Email'}
          {status === 'verifying' && 'Verifying Email'}
          {status === 'success' && 'Account Verified'}
          {status === 'failed' && 'Verification Failed'}
        </CardTitle>

        <CardDescription>
          {status === 'pending' && 'We sent a verification link to your email address.'}
          {status === 'verifying' && 'Please wait while we validate your activation token.'}
          {status === 'success' && 'Your email address has been successfully verified!'}
          {status === 'failed' && 'We could not verify your email address.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8 py-4 text-center text-sm text-zinc-600">
        {status === 'pending' && (
          <div className="flex flex-col gap-4 text-center">
            <p className="leading-relaxed">
              Thank you for signing up! Please check your email inbox and click on the verification link to activate your account.
              Once verified, you will be automatically logged in.
            </p>

            <div className="border-t border-slate-100 pt-4 mt-2">
              {resendStatus === 'success' ? (
                <div className="bg-green-50 text-green-700 border border-green-200 text-xs p-3 rounded-md font-medium text-left">
                  Verification email successfully resent to <strong>{resendEmail}</strong>!
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {!showResendForm && resendEmail ? (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">
                        Didn't get the email? We can resend it to <strong>{resendEmail}</strong>.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={resendStatus === 'sending'}
                        onClick={() => handleResend()}
                        className="cursor-pointer"
                      >
                        {resendStatus === 'sending' ? 'Resending...' : 'Resend Verification Link'}
                      </Button>
                      <button
                        onClick={() => setShowResendForm(true)}
                        className="text-xs text-zinc-400 underline block mx-auto mt-2 hover:text-zinc-600 cursor-pointer"
                      >
                        Use a different email address
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleResend} className="flex flex-col gap-2 max-w-sm mx-auto w-full text-left">
                      <p className="text-xs text-zinc-500 text-center mb-1">
                        Enter your email address to request a new verification link.
                      </p>
                      {resendStatus === 'failed' && resendErrorMessage && (
                        <div className="bg-red-50 text-red-600 border border-red-200 text-[11px] p-2 rounded-md font-medium flex items-start gap-1.5 mb-1.5">
                          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{resendErrorMessage}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                          disabled={resendStatus === 'sending'}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={resendStatus === 'sending'}
                          className="cursor-pointer shrink-0"
                        >
                          {resendStatus === 'sending' ? 'Sending...' : 'Send'}
                        </Button>
                      </div>
                      {resendEmail && (
                        <button
                          type="button"
                          onClick={() => setShowResendForm(false)}
                          className="text-xs text-zinc-400 underline block mx-auto mt-1.5 hover:text-zinc-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'verifying' && (
          <p className="leading-relaxed">
            Communicating with the secure backend server. This process should take only a moment.
          </p>
        )}

        {status === 'success' && (
          <p className="text-green-600 font-medium">
            Redirecting you to your account dashboard in 3 seconds...
          </p>
        )}

        {status === 'failed' && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 font-medium text-xs flex items-start gap-2 text-left">
            <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-8 pb-8 pt-4 flex flex-col gap-2">
        {(status === 'pending' || status === 'failed') && (
          <Button
            variant="outline"
            className="w-full cursor-pointer hover:bg-zinc-50 border-zinc-200"
            onClick={async () => {
              await logout();
              setLocation(loginUrl);
            }}
          >
            Return to Sign In
          </Button>
        )}

        {status === 'success' && (
          <Button
            className="w-full cursor-pointer"
            onClick={() => setLocation(dashboardUrl)}
          >
            Go to Dashboard Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
