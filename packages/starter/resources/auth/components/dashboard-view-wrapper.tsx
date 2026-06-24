import { useWpUser, useWpAuth } from '@forgewp/auth';
import { LogOut, User, Mail, Shield, Key, LayoutDashboard } from 'lucide-react';

export default function DashboardViewWrapper() {
  const user = useWpUser();
  const { logout, initializing } = useWpAuth();

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
    <main className='min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-16'>
      {/* Hero Header Area */}
      <div className='bg-white border-b border-slate-100 shadow-xs py-8'>
        <div className='container mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-6'>
          <div className='flex items-center gap-4'>
            <div className='bg-primary/5 p-3 rounded-full border border-primary/10'>
              <LayoutDashboard className='w-8 h-8 text-primary' />
            </div>
            <div>
              <span className='inline-block bg-primary/5 text-primary border border-primary/10 text-xs font-mono font-bold uppercase tracking-wider px-3 py-0.5 mb-1.5 rounded-sm'>
                Dashboard
              </span>
              <h1 className='text-3xl font-heading font-black tracking-tight uppercase text-slate-900'>
                User Space
              </h1>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className='group inline-flex items-center justify-center bg-white text-slate-900 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-mono font-bold text-xs uppercase tracking-widest px-5 py-3 transition-all duration-200 rounded-none cursor-pointer self-start md:self-auto'
          >
            <LogOut className='w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform' />
            Log Out
          </button>
        </div>
      </div>

      <div className='container mx-auto px-6 py-10'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          {/* Left profile detail card */}
          <div className='lg:col-span-4 bg-white border border-slate-100 p-6 shadow-md rounded-none flex flex-col items-center text-center'>
            <div className='relative group mb-4'>
              <img
                src={
                  user.avatarUrl ||
                  `https://picsum.photos/seed/${user.username}/150/150`
                }
                alt={user.displayName}
                className='w-32 h-32 rounded-full border-4 border-slate-100 object-cover shadow-sm transition-transform duration-300 group-hover:scale-105'
              />
              <div className='absolute bottom-0 right-0 bg-primary border-2 border-white p-2 rounded-full text-white shadow-md'>
                <User className='w-4 h-4' />
              </div>
            </div>

            <h2 className='text-xl font-heading font-black tracking-tight text-slate-900 mb-1'>
              {user.displayName}
            </h2>
            <p className='text-slate-400 font-mono text-xs mb-4'>
              @{user.username}
            </p>

            <div className='flex flex-wrap justify-center gap-1.5 mb-6'>
              {user.roles.map((role) => (
                <span
                  key={role}
                  className='bg-primary/5 text-primary border border-primary/10 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm'
                >
                  {role}
                </span>
              ))}
            </div>

            <div className='w-full border-t border-slate-100 pt-6 flex flex-col gap-4 text-left'>
              <div className='flex items-center gap-3'>
                <Mail className='w-4 h-4 text-slate-400 shrink-0' />
                <div className='overflow-hidden'>
                  <p className='text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider'>
                    Email Address
                  </p>
                  <p className='text-sm font-medium text-slate-600 truncate'>
                    {user.email}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <Shield className='w-4 h-4 text-slate-400 shrink-0' />
                <div>
                  <p className='text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider'>
                    User ID
                  </p>
                  <p className='text-sm font-mono text-slate-600'>
                    WP_User #{user.id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right capabilities / mock info card */}
          <div className='lg:col-span-8 flex flex-col gap-8'>
            <div className='bg-white border border-slate-100 p-8 shadow-md rounded-none'>
              <h3 className='text-xl font-heading font-black uppercase tracking-tight mb-4 flex items-center gap-2'>
                <Key className='w-5 h-5 text-primary' />
                Session capabilities
              </h3>
              <p className='text-slate-500 text-sm mb-6 leading-relaxed'>
                Below are the active WordPress capabilities assigned to your
                current session. ForgeWP resolves these roles and permissions
                locally in development, and handles SSR-transpilation in
                production.
              </p>

              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                {capabilities.map((cap) => (
                  <div
                    key={cap}
                    className='bg-slate-50 border border-slate-100 p-3 rounded-none flex flex-col'
                  >
                    <span className='text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide'>
                      Granted
                    </span>
                    <span className='text-sm font-mono font-semibold text-slate-700 mt-1'>
                      {cap}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className='bg-white border border-slate-100 p-8 shadow-md rounded-none'>
              <h3 className='text-xl font-heading font-black uppercase tracking-tight mb-4'>
                Framework Diagnostics
              </h3>
              <div className='prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed'>
                <p>
                  You are successfully authenticated via the{' '}
                  <strong>ForgeWP Auth Provider</strong>. In production, this
                  session can seamlessly bind to native WordPress cookie
                  authentication or JWT bearer configurations.
                </p>
                <div className='bg-[#fafafa] border border-slate-100 p-4 mt-4 rounded-none font-mono text-xs text-slate-500'>
                  <p>Mode: Development Simulation</p>
                  <p>Storage: localStorage (forgewp_auth_session)</p>
                  <p>Render Primitives: Isomorphic Gateplaceholders</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
