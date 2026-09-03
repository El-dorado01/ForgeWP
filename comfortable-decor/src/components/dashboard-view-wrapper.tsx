import * as React from 'react';
import { useWpUser, useWpAuth } from '@forgewp/auth';
import { LogOut, User, Mail, Shield, CheckCircle2, XCircle, Code, Key } from 'lucide-react';
import { WpImage } from '@forgewp/react';

export default function DashboardViewWrapper() {
  const user = useWpUser();
  const { logout, initializing } = useWpAuth();
  const [showRawJson, setShowRawJson] = React.useState(false);

  if (initializing || !user) {
    return (
      <div className='min-h-screen bg-[#fafafa] flex items-center justify-center font-sans'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin'></div>
          <p className='text-slate-500 font-mono text-sm'>
            Loading your account...
          </p>
        </div>
      </div>
    );
  }

  const capabilities = user.capabilities || [];

  return (
    <main className='min-h-screen bg-[#fafafa] text-slate-900 font-sans py-12 px-6 flex items-center justify-center'>
      <div className='w-full max-w-2xl bg-white border border-slate-200/80 shadow-xs p-8 sm:p-12 relative'>
        
        {/* Header Profile Info */}
        <div className='flex flex-col items-center text-center pb-8 border-b border-slate-100'>
          <div className='relative mb-4'>
            <WpImage
              src={user.avatarUrl || `https://picsum.photos/seed/${user.username}/150/150`}
              alt={user.displayName}
              className='w-24 h-24 rounded-full border-4 border-slate-100 object-cover shadow-xs'
            />
            <div className='absolute bottom-0 right-0 bg-primary border-2 border-white p-1.5 rounded-full text-white shadow-md'>
              <User className='w-3.5 h-3.5' />
            </div>
          </div>
          <h1 className='text-2xl font-heading font-black tracking-tight uppercase text-slate-900'>
            {user.displayName}
          </h1>
          <p className='text-slate-400 font-mono text-xs mt-0.5'>
            @{user.username}
          </p>

          <div className='flex flex-wrap justify-center gap-1.5 mt-3'>
            {user.roles.map((role) => (
              <span
                key={role}
                className='bg-primary/5 text-primary border border-primary/10 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm'
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Detailed Account Grid */}
        <div className='py-8 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6'>
          <div className='flex items-start gap-3'>
            <Shield className='w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5' />
            <div>
              <p className='text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider'>
                User ID (WordPress)
              </p>
              <p className='text-sm font-mono text-slate-700 font-semibold mt-0.5'>
                #{user.id}
              </p>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <Mail className='w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5' />
            <div className='overflow-hidden'>
              <p className='text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider'>
                Email Address
              </p>
              <p className='text-sm font-semibold text-slate-700 truncate mt-0.5'>
                {user.email}
              </p>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            {user.emailVerified ? (
              <CheckCircle2 className='w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5' />
            ) : (
              <XCircle className='w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5' />
            )}
            <div>
              <p className='text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider'>
                Verification Status
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${user.emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {user.emailVerified ? 'Verified Account' : 'Unverified Account'}
              </p>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <Key className='w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5' />
            <div>
              <p className='text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider'>
                Session State
              </p>
              <p className='text-sm font-semibold text-slate-700 mt-0.5'>
                Active
              </p>
            </div>
          </div>
        </div>

        {/* Capabilities Section */}
        {capabilities.length > 0 && (
          <div className='py-8 border-b border-slate-100'>
            <h2 className='text-xs font-mono font-bold uppercase text-slate-400 tracking-wider mb-3'>
              Granted Session Capabilities
            </h2>
            <div className='flex flex-wrap gap-1.5'>
              {capabilities.map((cap) => (
                <span
                  key={cap}
                  className='bg-slate-50 border border-slate-150 text-slate-600 font-mono text-[11px] px-2.5 py-1 rounded-sm'
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Toggleable Raw User JSON explorer */}
        <div className='py-8'>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className='flex items-center gap-2 text-slate-500 hover:text-slate-900 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer'
          >
            <Code className='w-4 h-4' />
            {showRawJson ? 'Hide Raw User Object' : 'Show Raw User Object'}
          </button>

          {showRawJson && (
            <div className='mt-4 bg-slate-50 border border-slate-200 p-4 font-mono text-xs text-slate-600 overflow-x-auto max-h-60 rounded-none leading-relaxed'>
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className='pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between'>
          <p className='text-[11px] text-slate-400 font-mono'>
            Note: Avatars are fetched natively via Gravatar in production.
          </p>
          <button
            onClick={() => logout()}
            className='group inline-flex items-center justify-center bg-white text-slate-900 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-mono font-bold text-xs uppercase tracking-widest px-5 py-3 transition-all duration-200 rounded-none cursor-pointer w-full sm:w-auto'
          >
            <LogOut className='w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform' />
            Log Out
          </button>
        </div>

      </div>
    </main>
  );
}
