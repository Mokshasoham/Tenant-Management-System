import React from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Send, CheckCircle2 } from 'lucide-react';
import { Button, Input, Card } from './PremiumUI';
import useAuthStore from '../context/authStore';

export default function ForgotPasswordModal({ isOpen, onClose }) {
    const { register, handleSubmit, formState: { errors }, reset } = useForm();
    const [isSubmitted, setIsSubmitted] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const forgotPassword = useAuthStore((state) => state.forgotPassword);

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError('');
        try {
            await forgotPassword(data.email);
            setIsSubmitted(true);
        } catch (err) {
            setError(err?.message || 'Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        reset();
        setIsSubmitted(false);
        setError('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md relative z-10"
                    >
                        <div className="p-8 rounded-3xl bg-white dark:bg-[#0B1424] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden relative text-left transition-colors duration-300">
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {!isSubmitted ? (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
                                        <Mail className="w-6 h-6" />
                                    </div>

                                    <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Forgot Password?</h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium text-xs">
                                        Enter your email address and we'll send you a link to reset your password.
                                    </p>

                                    {error && (
                                        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 px-4 py-3 rounded-2xl mb-6 text-xs font-bold">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">Check Your Email</h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium text-xs leading-relaxed">
                                        We've sent a password reset link to your email. Please check your inbox and follow the instructions.
                                    </p>
                                    <button
                                        onClick={handleClose}
                                        className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 cursor-pointer"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
