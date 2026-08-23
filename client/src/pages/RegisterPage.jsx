import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleSignInButton from '../components/GoogleSignInButton';
import useAuthStore from '../context/authStore';
import { Building2, ArrowRight, Sparkles, ShieldCheck, Check, ArrowLeft, Home } from 'lucide-react';
import { Input } from '../components/PremiumUI';
import PageTransition from '../components/PageTransition';
import PublicNavbar from '../components/PublicNavbar';
import { RoleSelectionCards } from '../components/RoleSelectionModal';

const REGISTER_BG_IMAGE = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [step, setStep] = useState('details'); // 'details' | 'role'
  const [formData, setFormData] = useState(null);
  const [selectedRole, setSelectedRole] = useState('tenant');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const registerUser = useAuthStore((state) => state.register);
  const password = watch('password');

  // Step 1: Form details validated -> proceed to role selection
  const onDetailsSubmit = (data) => {
    setError('');
    setFormData(data);
    setStep('role');
  };

  // Step 2: Role confirmed -> complete registration
  const onFinalSubmit = async (roleToUse) => {
    const role = roleToUse || selectedRole || 'tenant';
    if (!formData) {
      setStep('details');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: role,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
      setStep('details');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F5F8F7] dark:bg-[#060B13] text-slate-900 dark:text-slate-50 flex flex-col relative overflow-x-hidden transition-colors duration-300 font-sans">
        <PublicNavbar />

        <div className="flex-1 max-w-7xl w-full mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="w-full grid lg:grid-cols-12 gap-8 items-stretch rounded-[2.5rem] bg-white dark:bg-[#0B1424]/95 border border-slate-200/80 dark:border-emerald-500/20 shadow-xl dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden transition-colors duration-300">
            
            {/* Left Column: Form / Role Selection */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between text-left space-y-6">
              <div>
                {/* Brand Header */}
                <div className="flex items-center gap-3 mb-4">
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

                {step === 'details' ? (
                  <>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      Create your account.
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                      Step 1 of 2: Enter your personal credentials.
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Select your role.
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                        Step 2 of 2: Choose how you want to use TMS.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('details')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 px-4 py-3 rounded-2xl text-xs font-bold">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === 'details' ? (
                  <motion.div
                    key="step-details"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Registration Form */}
                    <form onSubmit={handleSubmit(onDetailsSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="First Name"
                          placeholder="John"
                          error={errors.firstName?.message}
                          {...register('firstName', {
                            required: 'First name is required',
                            minLength: { value: 2, message: 'At least 2 characters' },
                          })}
                        />
                        <Input
                          label="Last Name"
                          placeholder="Doe"
                          error={errors.lastName?.message}
                          {...register('lastName', {
                            required: 'Last name is required',
                            minLength: { value: 2, message: 'At least 2 characters' },
                          })}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <Input
                          label="Phone Number"
                          type="tel"
                          placeholder="+91 98765 43210"
                          error={errors.phone?.message}
                          {...register('phone', {
                            required: 'Phone is required',
                          })}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Password"
                          type="password"
                          placeholder="••••••••"
                          error={errors.password?.message}
                          {...register('password', {
                            required: 'Password is required',
                            minLength: { value: 8, message: 'At least 8 characters' },
                            pattern: {
                              value: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                              message: 'Need uppercase, lowercase, number & symbol',
                            },
                          })}
                        />
                        <Input
                          label="Confirm Password"
                          type="password"
                          placeholder="••••••••"
                          error={errors.confirmPassword?.message}
                          {...register('confirmPassword', {
                            validate: (value) => value === password || 'Passwords do not match',
                          })}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        <span>Continue to Role Selection</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>

                    {/* Google Sign-in */}
                    <div className="space-y-4">
                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200 dark:border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          <span className="px-3 bg-white dark:bg-[#0B1424]">Or sign up with Google</span>
                        </div>
                      </div>

                      <GoogleSignInButton
                        onError={setError}
                        setIsLoading={setIsLoading}
                        navigate={navigate}
                        text="Sign up with Google"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-role"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <RoleSelectionCards
                      selectedRole={selectedRole}
                      onSelectRole={(role) => setSelectedRole(role)}
                      onConfirm={(role) => onFinalSubmit(role)}
                      isLoading={isLoading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Log In Link */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Already have an account?{' '}
                  <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-black hover:underline underline-offset-4">
                    Log In
                  </Link>
                </p>
              </div>
            </div>

            {/* Right Column: Architectural Imagery */}
            <div className="hidden lg:block lg:col-span-6 relative min-h-[580px]">
              <img
                src={REGISTER_BG_IMAGE}
                alt="Luxury Interior"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 dark:from-[#060B13] via-black/40 dark:via-[#060B13]/60 to-transparent" />
              <div className="absolute inset-0 bg-emerald-950/10 dark:bg-emerald-950/20 mix-blend-overlay" />

              <div className="absolute bottom-10 left-10 right-10 p-8 rounded-3xl bg-white/90 dark:bg-[#060B13]/80 backdrop-blur-xl border border-white/60 dark:border-white/15 shadow-2xl text-left space-y-3 transition-colors duration-300">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  <span>Start Your Journey</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Find your place. Live smarter.
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Join hundreds of verified tenants and property managers managing their homes effortlessly with zero paperwork.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}

