import * as React from 'react';
import { useWpAuth } from '@forgewp/auth';
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
import { MailOpenIcon, CheckCircle2Icon, AlertTriangleIcon, Loader2Icon } from 'lucide-react';

export default function VerifyEmailViewWrapper() {
  const { verifyEmail, logout, error, initializing } = useWpAuth();
  const [_, setLocation] = useLocation();
  const loginUrl = useWpPageLink('login-page', '/login');
  const dashboardUrl = useWpPageLink('dashboard-page', '/dashboard');

  const [status, setStatus] = React.useState<'pending' | 'verifying' | 'success' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const hasRunRef = React.useRef(false);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const userIdStr = searchParams.get('userId');
    const token = searchParams.get('token');

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
            }, 3000);
          } else {
            setStatus('failed');
            setErrorMessage(error || 'Verification failed. The token may be expired or invalid.');
          }
        })
        .catch((err) => {
          setStatus('failed');
          setErrorMessage(err.message || 'An unexpected error occurred.');
        });
    } else {
      setStatus('pending');
    }
  }, [verifyEmail, setLocation, dashboardUrl, error]);

  if (initializing) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 min-h-[340px]">
        <div className='w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin'></div>
        <p className='text-zinc-500 font-mono text-xs uppercase tracking-wider mt-4'>
          Checking session...
        </p>
      </Card>
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
          <p className="leading-relaxed">
            Thank you for signing up! Please check your email inbox and click on the verification link to activate your account.
            Once verified, you will be automatically logged in.
          </p>
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
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 font-medium text-xs">
            ⚠️ {errorMessage}
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
