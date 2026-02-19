import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './PremiumUI';

export default function PublicNavbar() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
            <div className="max-w-7xl mx-auto">
                <div className="glass px-6 py-3 rounded-2xl flex items-center justify-between border-white/20 shadow-2xl overflow-hidden">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-foreground">TMS</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Home</Link>
                        <Link to="/features" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Features</Link>
                        <Link to="/pricing" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
                        <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-2" />
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/login')}
                                className="text-sm font-bold px-4"
                            >
                                Login
                            </Button>
                            <Button
                                onClick={() => navigate('/register')}
                                className="text-sm font-bold px-6 shadow-xl shadow-primary/20"
                            >
                                Sign Up
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 text-foreground"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden absolute top-24 left-6 right-6 p-6 glass rounded-2xl border-white/20 shadow-2xl z-50"
                    >
                        <div className="flex flex-col gap-6 text-center">
                            <Link to="/" onClick={() => setIsOpen(false)} className="text-lg font-bold text-foreground">Home</Link>
                            <Link to="/features" onClick={() => setIsOpen(false)} className="text-lg font-bold text-foreground">Features</Link>
                            <Link to="/pricing" onClick={() => setIsOpen(false)} className="text-lg font-bold text-foreground">Pricing</Link>
                            <div className="h-px w-full bg-gray-200 dark:bg-white/10" />
                            <Button variant="outline" onClick={() => { navigate('/login'); setIsOpen(false); }}>Login</Button>
                            <Button onClick={() => { navigate('/register'); setIsOpen(false); }}>Sign Up</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
