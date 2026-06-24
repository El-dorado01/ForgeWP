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
  const { login, error, loginField, initializing } = useWpAuth();
  const user = useWpUser();
  const [_, setLocation] = useLocation();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const forgotPasswordUrl = useWpPageLink('forgot-password-page', '/forgot-password');
  const signUpUrl = useWpPageLink('sign-up-page', '/signup');
  const dashboardUrl = useWpPageLink('dashboard-page', '/dashboard');

  React.useEffect(() => {
    if (user) {
      setLocation(dashboardUrl);
    }
  }, [user, setLocation, dashboardUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

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
                <div className="bg-red-50 text-red-600 border border-red-200 text-sm p-3 rounded-md font-medium">
                  <AlertTriangleIcon className="inline-block mr-2 h-4 w-4" /> {localError || error}
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
