import React from "react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";
import { Eye, EyeOff } from "lucide-react";

export const Card = ({ children, className, delay = 0, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={cn("glass-card hover-lift", className)}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export const Button = ({ children, className, variant = "primary", ...props }) => {
    const variants = {
        primary: "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border-2 border-primary/20 bg-transparent text-primary hover:bg-primary/5",
        ghost: "bg-transparent hover:bg-primary/5 text-primary",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn("btn-premium", variants[variant], className)}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export const Input = React.forwardRef(({ className, label, error, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";

    const togglePassword = () => setShowPassword(!showPassword);

    return (
        <div className="w-full space-y-1.5 text-left">
            {label && (
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    ref={ref}
                    type={isPassword ? (showPassword ? "text" : "password") : type}
                    className={cn(
                        "w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all",
                        isPassword && "pr-10",
                        error && "border-rose-500 focus:ring-rose-500/50",
                        className
                    )}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={togglePassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>
            {error && <p className="text-xs text-rose-500 dark:text-rose-400 ml-1 font-semibold">{error}</p>}
        </div>
    );
});

Input.displayName = "Input";

export const Badge = ({ children, variant = "primary", className }) => {
    const variants = {
        primary: "bg-primary/10 text-primary border-primary/20",
        success: "bg-green-500/10 text-green-600 border-green-500/20",
        warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
        danger: "bg-red-500/10 text-red-600 border-red-500/20",
    };

    return (
        <span
            className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
};
