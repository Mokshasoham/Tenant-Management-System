import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import GoogleSignInButton from '../components/GoogleSignInButton';
import useAuthStore from '../context/authStore';
import { Building2, ArrowRight, Sparkles, ShieldCheck, Check } from 'lucide-react';
import { Input } from '../components/PremiumUI';
import PageTransition from '../components/PageTransition';
import PublicNavbar from '../components/PublicNavbar';

const REGISTER_BG_IMAGE = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const registerUser = useAuthStore((state) => state.register);
  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#060B13] text-foreground flex flex-col relative overflow-x-hidden">
        <PublicNavbar />

        <div className="flex-1 max-w-7xl w-full mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="w-full grid lg:grid-cols-12 gap-8 items-stretch rounded-[2.5rem] bg-[#0c172c]/90 border border-emerald-500/20 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* Left Column: Form */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between text-left space-y-8">
              <div>
                {/* Brand Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-black text-white">TMS</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 block">
                      Smart Rental Management
                    </span>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Create your account.
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1.5">
                  Start your smart rental journey with confidence.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-2xl text-xs font-bold">
                  {error}
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? 'Creating Account...' : 'Get Started'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Google Sign-in */}
              <div className="space-y-4">
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span className="px-3 bg-[#0c172c]">Or continue with</span>
                  </div>
                </div>

                <GoogleSignInButton
                  onError={setError}
                  setIsLoading={setIsLoading}
                  navigate={navigate}
                  text="Sign up with Google"
                />
              </div>

              {/* Log In Link */}
              <div className="pt-4 border-t border-white/10 text-center">
                <p className="text-xs text-slate-400 font-medium">
                  Already have an account?{' '}
                  <Link to="/login" className="text-emerald-400 font-black hover:underline underline-offset-4">
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#060B13] via-[#060B13]/60 to-transparent" />
              <div className="absolute inset-0 bg-emerald-950/20 mix-blend-overlay" />

              <div className="absolute bottom-10 left-10 right-10 p-8 rounded-3xl bg-[#060B13]/80 backdrop-blur-xl border border-white/15 shadow-2xl text-left space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  <span>Start Your Journey</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Find your place. Live smarter.
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
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

