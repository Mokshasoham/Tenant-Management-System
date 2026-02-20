import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowRight, Shield, Zap, BarChart3, Users } from 'lucide-react';
import { Button, Card } from '../components/PremiumUI';
import PublicNavbar from '../components/PublicNavbar';
import PageTransition from '../components/PageTransition';

const BACKGROUND_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

export default function LandingPage() {
    const navigate = useNavigate();

    const features = [
        { icon: <Shield className="w-6 h-6" />, title: "Secure Data", desc: "Enterprise-grade security for your property data." },
        { icon: <Zap className="w-6 h-6" />, title: "Automation", desc: "Automate rent collection and maintenance requests." },
        { icon: <BarChart3 className="w-6 h-6" />, title: "Analytics", desc: "Comprehensive reports and financial insights." },
        { icon: <Users className="w-6 h-6" />, title: "Portal", desc: "Dedicated portal for tenants and managers." },
    ];

    return (
        <PageTransition>
            <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
                {/* Navbar */}
                <PublicNavbar />

                {/* Hero Section */}
                <div className="relative flex-1 flex items-center pt-32 pb-20 px-6">
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src={BACKGROUND_URL}
                            alt="Management Building"
                            className="w-full h-full object-cover scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-primary/30" />
                        <div className="absolute inset-0 backdrop-blur-[2px]" />
                    </div>

                    <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                        {/* Hero Text */}
                        <div className="space-y-8 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary font-black text-xs uppercase tracking-widest mb-6 backdrop-blur-sm">
                                    Available Now • Full-Stack Platform
                                </span>
                                <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-6 drop-shadow-2xl">
                                    Next-Gen <br />
                                    <span className="text-primary italic">Property</span> <br />
                                    Solutions.
                                </h1>
                                <p className="text-xl text-gray-200 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed drop-shadow-lg">
                                    Streamline your tenant management, automate billing, and gain deep insights into your property portfolio with TMS.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                            >
                                <Button
                                    onClick={() => navigate('/register')}
                                    className="w-full sm:w-auto px-10 py-5 text-lg shadow-2xl shadow-primary/40 group"
                                >
                                    Start Managing
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/login')}
                                    className="w-full sm:w-auto px-10 py-5 text-lg border-white/20 text-white hover:bg-white/10 backdrop-blur-md"
                                >
                                    View Demo
                                </Button>
                            </motion.div>
                        </div>

                        {/* Feature Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.4 + (index * 0.1) }}
                                >
                                    <Card className="p-8 h-full bg-white/10 dark:bg-white/5 backdrop-blur-xl border-white/10 hover:border-primary/50 transition-all group shadow-2xl">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary transition-all group-hover:text-white">
                                            {feature.icon}
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-3 tracking-tight">{feature.title}</h3>
                                        <p className="text-gray-300/80 dark:text-gray-400 font-medium leading-relaxed">{feature.desc}</p>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dashboard Preview Section (Simplified) */}
                <div className="relative py-20 px-6 bg-background">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-black text-foreground tracking-tight mb-4">Powerful Features</h2>
                            <p className="text-muted-foreground font-medium text-lg">Everything you need to grow your rental business.</p>
                        </div>

                        <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl">
                            <div className="h-[400px] w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 flex items-center justify-center p-10">
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-primary/20 mx-auto flex items-center justify-center mb-6">
                                        <BarChart3 className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-4">Interactive Dashboard</h3>
                                    <p className="text-muted-foreground text-lg max-w-md">Real-time data visualization and tenant analytics right at your fingertips.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
