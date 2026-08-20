import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import GoogleSignInButton from '../components/GoogleSignInButton';
import useAuthStore from '../context/authStore';
import { Mail, Lock, Building2, ArrowRight } from 'lucide-react';
import { Card, Button, Input } from '../components/PremiumUI';
import PageTransition from '../components/PageTransition';
import PublicNavbar from '../components/PublicNavbar';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const BACKGROUND_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

export default function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  const login = useAuthStore((state) => state.login);
  const verify2FALogin = useAuthStore((state) => state.verify2FALogin);

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
      setError(err?.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col pt-20 relative overflow-hidden">
        <PublicNavbar />

        {/* Real Estate Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={BACKGROUND_URL}
            alt="TMS Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-lg relative">
            {/* Logo Section */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center mb-10"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30 mb-4">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white dark:text-foreground drop-shadow-lg">TMS</h1>
              <p className="text-white/80 dark:text-muted-foreground font-medium mt-1">Tenant Management System</p>
            </motion.div>

            {/* Login Card */}
            <Card className="p-10 border-border bg-card shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-colors">
              <h2 className="text-3xl font-black text-foreground mb-2">Welcome Back</h2>
              <p className="text-muted-foreground mb-8 font-medium">Please enter your details to sign in.</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-8 text-sm font-semibold"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={requires2FA ? (e) => { e.preventDefault(); onSubmit(); } : handleSubmit(onSubmit)} className="space-y-6">
                {requires2FA ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="text-sm text-muted-foreground mb-4 font-semibold">
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
                          className="text-sm font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 text-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Verifying...' : (requires2FA ? 'Verify Code' : 'Sign In')}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>

              {!requires2FA && (
                <>
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <GoogleSignInButton
                    onError={setError}
                    setIsLoading={setIsLoading}
                    navigate={navigate}
                    text="Continue with Google"
                  />
                </>
              )}

              <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 text-center">
                <p className="text-muted-foreground font-medium">
                  New to the platform?{' '}
                  <Link to="/register" className="text-primary font-black hover:underline underline-offset-4">
                    Create Account
                  </Link>
                </p>
              </div>
            </Card>

            {/* Demo Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex justify-center gap-6"
            >
              <button
                type="button"
                onClick={() => {
                  const emailInput = document.querySelector('input[type="email"]');
                  const passwordInput = document.querySelector('input[type="password"]');
                  if (emailInput) emailInput.value = 'admin@gmail.com';
                  if (passwordInput) passwordInput.value = 'Admin@1234';
                  // trigger react hook form
                  onSubmit({ email: 'admin@gmail.com', password: 'Admin@1234' });
                }}
                className="text-center group cursor-pointer hover:opacity-80 transition-opacity"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black group-hover:text-primary transition-colors">Admin Demo (Auto-Fill)</p>
                <p className="text-xs font-bold text-foreground/50">admin@gmail.com</p>
              </button>
              <div className="h-8 w-px bg-gray-200 dark:bg-white/10" />
              <button
                type="button"
                onClick={() => {
                  const emailInput = document.querySelector('input[type="email"]');
                  const passwordInput = document.querySelector('input[type="password"]');
                  if (emailInput) emailInput.value = 'manager@gmail.com';
                  if (passwordInput) passwordInput.value = 'Manager@1234';
                  // trigger react hook form
                  onSubmit({ email: 'manager@gmail.com', password: 'Manager@1234' });
                }}
                className="text-center group cursor-pointer hover:opacity-80 transition-opacity"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black group-hover:text-primary transition-colors">Manager Demo (Auto-Fill)</p>
                <p className="text-xs font-bold text-foreground/50">manager@gmail.com</p>
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </PageTransition>
  );
}

