import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import GoogleSignInButton from '../components/GoogleSignInButton';
import useAuthStore from '../context/authStore';
import { Mail, Lock, Building2, ArrowRight, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { Input } from '../components/PremiumUI';
import PageTransition from '../components/PageTransition';
import PublicNavbar from '../components/PublicNavbar';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const LOGIN_BG_IMAGE = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop";

export default function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  const login = useAuthStore((state) => state.login);
  const verify2FALogin = useAuthStore((state) => state.verify2FALogin);

  // Pre-warm backend on mount to eliminate cold-start delay
  React.useEffect(() => {
    import('../services/apiClient').then(({ default: apiClient }) => {
      apiClient.get('/health').catch(() => {});
    });
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    if (requires2FA) {
      try {
        await verify2FALogin(tempUserId, twoFactorToken);
        navigate('/dashboard');
      } catch (err) {
        setError(err.message || 'Invalid 2FA token');
        setIsLoading(false);
      }
      return;
    }

    try {
      const res = await login(data.email, data.password);
      if (res?.requires2FA) {
        setRequires2FA(true);
        setTempUserId(res.userId);
        setIsLoading(false);
      } else {
        const loggedUser = res?.data?.user || JSON.parse(localStorage.getItem('user') || '{}');
        if (loggedUser?.role === 'technician') {
          navigate('/technician/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      let msg = err?.message || 'Login failed. Please try again.';
      if (msg.includes('timeout of') || msg.includes('Network Error')) {
        msg = 'Cloud server was warming up. Please click Sign In again.';
      }
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F5F8F7] dark:bg-[#060B13] text-slate-900 dark:text-slate-50 flex flex-col relative overflow-x-hidden transition-colors duration-300 font-sans">
        <PublicNavbar />

        <div className="flex-1 max-w-7xl w-full mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="w-full grid lg:grid-cols-12 gap-8 items-stretch rounded-[2.5rem] bg-white dark:bg-[#0B1424]/95 border border-slate-200/80 dark:border-emerald-500/20 shadow-xl dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden transition-colors duration-300">
            
            {/* Left Column: Form */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between text-left space-y-8">
              <div>
                {/* Brand Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-black text-slate-900 dark:text-white">TMS</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 block">
                      Smart Rental Management
                    </span>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome back.
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                  Continue managing your home with confidence.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 px-4 py-3 rounded-2xl text-xs font-bold"
                >
                  {error}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={requires2FA ? (e) => { e.preventDefault(); onSubmit(); } : handleSubmit(onSubmit)} className="space-y-5">
                {requires2FA ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      Please enter the 6-digit authentication code from your authenticator app.
                    </p>
                    <Input
                      label="6-Digit Token"
                      type="text"
                      placeholder="123456"
                      value={twoFactorToken}
                      onChange={(e) => setTwoFactorToken(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </motion.div>
                ) : (
                  <>
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      error={errors.email?.message}
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                    />

                    <div className="space-y-1">
                      <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        error={errors.password?.message}
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
                          },
                        })}
                      />
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setIsForgotModalOpen(true)}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : (requires2FA ? 'Verify Code' : 'Sign In')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Google Sign-in */}
              {!requires2FA && (
                <div className="space-y-4">
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <span className="px-3 bg-white dark:bg-[#0B1424]">Or continue with</span>
                    </div>
                  </div>

                  <GoogleSignInButton
                    onError={setError}
                    setIsLoading={setIsLoading}
                    navigate={navigate}
                    text="Continue with Google"
                  />
                </div>
              )}

              {/* Sign up Link */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  New to the platform?{' '}
                  <Link to="/register" className="text-emerald-600 dark:text-emerald-400 font-black hover:underline underline-offset-4">
                    Create Account
                  </Link>
                </p>
              </div>

              {/* Demo Auto-Fill shortcuts */}
              <div className="flex items-center justify-center gap-4 pt-2 text-slate-400 dark:text-slate-500 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setValue('email', 'admin@gmail.com');
                    setValue('password', 'Admin@1234');
                    onSubmit({ email: 'admin@gmail.com', password: 'Admin@1234' });
                  }}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Admin Demo
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setValue('email', 'manager@gmail.com');
                    setValue('password', 'Manager@1234');
                    onSubmit({ email: 'manager@gmail.com', password: 'Manager@1234' });
                  }}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  Manager Demo
                </button>
              </div>
            </div>

            {/* Right Column: Architectural Imagery */}
            <div className="hidden lg:block lg:col-span-6 relative min-h-[580px]">
              <img
                src={LOGIN_BG_IMAGE}
                alt="Luxury Property"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 dark:from-[#060B13] via-black/40 dark:via-[#060B13]/60 to-transparent" />
              <div className="absolute inset-0 bg-emerald-950/10 dark:bg-emerald-950/20 mix-blend-overlay" />

              <div className="absolute bottom-10 left-10 right-10 p-8 rounded-3xl bg-white/90 dark:bg-[#060B13]/80 backdrop-blur-xl border border-white/60 dark:border-white/15 shadow-2xl text-left space-y-3 transition-colors duration-300">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  <span>Welcome Home</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Your space. Your experience.
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Access your rental agreements, rent payments, maintenance requests, and direct manager messaging from any device.
                </p>
              </div>
            </div>

          </div>
        </div>

        <ForgotPasswordModal
          isOpen={isForgotModalOpen}
          onClose={() => setIsForgotModalOpen(false)}
        />
      </div>
    </PageTransition>
  );
}


