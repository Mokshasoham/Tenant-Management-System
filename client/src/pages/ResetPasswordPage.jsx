import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, ArrowRight, Building2 } from 'lucide-react';
import { Card, Button, Input } from '../components/PremiumUI';
import PageTransition from '../components/PageTransition';
import PublicNavbar from '../components/PublicNavbar';
import useAuthStore from '../context/authStore';

const BACKGROUND_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

export default function ResetPasswordPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const resetPassword = useAuthStore((state) => state.resetPassword);

    const password = watch('password');

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError('');
        try {
            await resetPassword(token, data.password);
            setIsSubmitted(true);
        } catch (err) {
            setError(err?.message || 'Failed to reset password. Link may be invalid or expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-background flex flex-col pt-20 relative overflow-hidden">
                <PublicNavbar />

                {/* Background Image */}
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
                            <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-lg">TMS</h1>
                            <p className="text-white/80 font-medium mt-1">Tenant Management System</p>
                        </motion.div>

                        <Card className="p-10 border-white/20 shadow-2xl">
                            {!isSubmitted ? (
                                <>
                                    <h2 className="text-3xl font-black text-foreground mb-2">Reset Password</h2>
                                    <p className="text-muted-foreground mb-8 font-medium">Please enter your new password below.</p>

                                    {error && (
                                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-8 text-sm font-semibold">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                        <Input
                                            label="New Password"
                                            type="password"
                                            placeholder="••••••••"
                                            error={errors.password?.message}
                                            {...register('password', {
                                                required: 'Password is required',
                                                minLength: { value: 8, message: 'At least 8 characters' },
                                                pattern: {
                                                    value: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                                                    message: 'Must include uppercase, lowercase, number, and special character',
                                                },
                                            })}
                                        />

                                        <Input
                                            label="Confirm New Password"
                                            type="password"
                                            placeholder="••••••••"
                                            error={errors.confirmPassword?.message}
                                            {...register('confirmPassword', {
                                                validate: (value) => value === password || 'Passwords do not match',
                                            })}
                                        />

                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-4 text-lg flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? 'Updating Password...' : 'Reset Password'}
                                            <ArrowRight className="w-5 h-5" />
                                        </Button>
                                    </form>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mx-auto mb-6">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <h2 className="text-3xl font-black mb-4 text-foreground">Password Reset!</h2>
                                    <p className="text-muted-foreground mb-10 font-medium text-lg">
                                        Your password has been successfully updated. You can now securely log in to your account.
                                    </p>
                                    <Button
                                        onClick={() => navigate('/login')}
                                        className="w-full py-5 text-xl font-black"
                                    >
                                        Go to Login
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
