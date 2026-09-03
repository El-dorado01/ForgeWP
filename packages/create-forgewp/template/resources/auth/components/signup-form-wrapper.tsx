import * as React from 'react';
import { useWpAuth, useWpUser } from '@forgewp/auth';
import { useWpPageLink, useLocation } from '@forgewp/react';
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AlertTriangleIcon } from 'lucide-react';

export default function SignupFormWrapper({ ...props }: React.ComponentProps<typeof Card>) {
  const { register, error, emailVerificationEnabled, initializing } = useWpAuth();
  const user = useWpUser();
  const [_, setLocation] = useLocation();

  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const loginUrl = useWpPageLink('login-page', '/login');
  const dashboardUrl = useWpPageLink('dashboard-page', '/dashboard');
  const verifyEmailUrl = useWpPageLink('verify-email-page', '/verify-email');
  
  const [errors, setErrors] = React.useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const errorContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (user) {
      setLocation(dashboardUrl);
    }
  }, [user, setLocation, dashboardUrl]);

  // Smooth scroll to top error if a general or backend error occurs
  React.useEffect(() => {
    if (errors.general || error) {
      errorContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errors.general, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    const newErrors: typeof errors = {};

    if (!trimmedUsername) {
      newErrors.username = 'Username is required.';
    }
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    }
    if (!trimmedPassword) {
      newErrors.password = 'Password is required.';
    } else if (trimmedPassword.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    if (trimmedPassword && trimmedPassword !== trimmedConfirm) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const ok = await register(trimmedUsername, trimmedEmail, trimmedPassword);
      if (ok) {
        if (typeof window !== 'undefined') {
          const redirectDest = emailVerificationEnabled
            ? `${verifyEmailUrl}?registered=true&email=${encodeURIComponent(trimmedEmail)}`
            : dashboardUrl;
          setLocation(redirectDest);
        }
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('username')) {
        setErrors({ username: msg });
      } else if (msg.toLowerCase().includes('email')) {
        setErrors({ email: msg });
      } else {
        setErrors({ general: msg || 'Registration failed. Please try again.' });
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

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {(errors.general || error) && (
              <div
                ref={errorContainerRef}
                className='bg-red-50 text-red-600 border border-red-200 text-sm p-3 rounded-md font-medium flex items-start gap-2'
              >
                <AlertTriangleIcon className='h-4 w-4 shrink-0 mt-0.5' />
                <span>{errors.general || error}</span>
              </div>
            )}
            <Field data-invalid={!!errors.username}>
              <FieldLabel htmlFor='username'>Username</FieldLabel>
              <Input
                id='username'
                type='text'
                placeholder='johndoe'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                required
                autoComplete="username"
              />
              {errors.username && (
                <FieldError className='text-red-500'>
                  {errors.username}
                </FieldError>
              )}
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input
                id='email'
                type='email'
                placeholder='m@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
                autoComplete="email"
              />
              {errors.email ? (
                <FieldError className='text-red-500'>{errors.email}</FieldError>
              ) : (
                <FieldDescription>
                  We will use this email for account verification and updates.
                </FieldDescription>
              )}
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
                autoComplete="new-password"
              />
              {errors.password ? (
                <FieldError className='text-red-500'>
                  {errors.password}
                </FieldError>
              ) : (
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              )}
            </Field>
            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor='confirm-password'>
                Confirm Password
              </FieldLabel>
              <Input
                id='confirm-password'
                type='password'
                placeholder='••••••••'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                required
                autoComplete="new-password"
              />
              {errors.confirmPassword ? (
                <FieldError className='text-red-500'>
                  {errors.confirmPassword}
                </FieldError>
              ) : (
                <FieldDescription>
                  Please confirm your password.
                </FieldDescription>
              )}
            </Field>
            <FieldGroup>
              <Field>
                <Button
                  type='submit'
                  disabled={submitting}
                  className='w-full cursor-pointer'
                >
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </Button>
                <FieldDescription className='text-center'>
                  Already have an account?{' '}
                  <a
                    href={loginUrl}
                    className='underline'
                  >
                    Sign in
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
