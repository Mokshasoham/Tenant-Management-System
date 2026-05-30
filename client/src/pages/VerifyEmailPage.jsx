import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, Button } from '../components/PremiumUI';
import PageTransition from '../components/PageTransition';
import useAuthStore from '../context/authStore';

const BACKGROUND_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

export default function VerifyEmailPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const verifyEmail = useAuthStore((state) => state.verifyEmail);
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid verification link.');
                return;
            }

            try {
                const res = await verifyEmail(token);
                setStatus('success');
                setMessage(res.message || 'Your email has been successfully verified! You can now access all features.');
            } catch (err) {
                setStatus('error');
                setMessage(err.message || 'Verification link is invalid or has expired.');
            }
        };

        verify();
    }, [token, verifyEmail]);

    return (
        <PageTransition>
            <div className="min-h-screen bg-background flex flex-col pt-20 relative overflow-hidden">
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
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-card dark:bg-card border border-border shadow-2xl rounded-2xl p-10 text-center"
                        >
                            {status === 'loading' && (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-16 h-16 animate-spin text-primary mb-6" />
                                    <h2 className="text-2xl font-black text-foreground mb-2">Verifying Email</h2>
                                    <p className="text-muted-foreground font-medium">Please wait while we verify your email address...</p>
                                </div>
                            )}

                            {status === 'success' && (
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mb-6">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <h2 className="text-3xl font-black text-foreground mb-4">Email Verified!</h2>
                                    <p className="text-muted-foreground font-medium text-lg mb-8">{message}</p>
                                    <Button onClick={() => navigate('/dashboard')} className="w-full py-4 text-lg">
                                        Go to Dashboard
                                    </Button>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center text-destructive mb-6">
                                        <XCircle className="w-12 h-12" />
                                    </div>
                                    <h2 className="text-3xl font-black text-foreground mb-4">Verification Failed</h2>
                                    <p className="text-muted-foreground font-medium text-lg mb-8">{message}</p>
                                    <Button onClick={() => navigate('/login')} variant="outline" className="w-full py-4 text-lg">
                                        Return to Login
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
