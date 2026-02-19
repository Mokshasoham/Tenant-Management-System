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
                        <Card className="p-8 border-white/20 shadow-2xl overflow-hidden relative">
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {!isSubmitted ? (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-6">
                                        <Mail className="w-6 h-6" />
                                    </div>

                                    <h2 className="text-2xl font-black mb-2 text-foreground">Forgot Password?</h2>
                                    <p className="text-muted-foreground mb-8 font-medium">
                                        Enter your email address and we'll send you a link to reset your password.
                                    </p>

                                    {error && (
                                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm font-semibold">
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

                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-4 flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </form>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mx-auto mb-6">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-2xl font-black mb-4 text-foreground">Check Your Email</h2>
                                    <p className="text-muted-foreground mb-8 font-medium">
                                        We've sent a password reset link to your email. Please check your inbox and follow the instructions.
                                    </p>
                                    <Button
                                        onClick={handleClose}
                                        className="w-full py-4"
                                    >
                                        Back to Login
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
