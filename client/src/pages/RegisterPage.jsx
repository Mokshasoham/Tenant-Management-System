import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../context/authStore';
import { Mail, Lock, User, Phone, Building2, ArrowRight } from 'lucide-react';

import { Card, Button, Input } from '../components/PremiumUI';
import PageTransition from '../components/PageTransition';
import PublicNavbar from '../components/PublicNavbar';

const BACKGROUND_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

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
        {/* Animated Background Elements Removed */}

        <div className="flex-1 flex items-center justify-center p-6 relative z-10 py-20">
          <div className="w-full max-w-2xl relative">
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
              <p className="text-white/80 dark:text-muted-foreground font-medium mt-1">Join the future of property management</p>
            </motion.div>

            {/* Register Card */}
            <Card className="p-10 border-border bg-card shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-colors">
              <h2 className="text-3xl font-black text-foreground mb-2">Create Account</h2>
              <p className="text-muted-foreground mb-8 font-medium">Please fill in the details to get started.</p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-8 text-sm font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    placeholder="+1 234 567 8900"
                    error={errors.phone?.message}
                    {...register('phone', {
                      required: 'Phone is required',
                    })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    error={errors.password?.message}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' },
                      pattern: {
                        value: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                        message: 'Must contain uppercase, lowercase, number and special character',
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 text-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Creating Account...' : 'Get Started'}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      setIsLoading(true);
                      await useAuthStore.getState().googleLogin(credentialResponse.credential);
                      navigate('/dashboard');
                    } catch (err) {
                      setError(err.message || 'Google signup failed');
                      setIsLoading(false);
                    }
                  }}
                  onError={() => {
                    setError('Google Log In Failed');
                  }}
                  useOneTap
                  theme="outline"
                  size="large"
                  text="signup_with"
                />
              </div>

              <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 text-center">
                <p className="text-muted-foreground font-medium">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary font-black hover:underline underline-offset-4">
                    Log In
                  </Link>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

