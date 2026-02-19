import React from "react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

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

export const Input = React.forwardRef(({ className, label, error, ...props }, ref) => {
    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label className="text-sm font-semibold text-muted-foreground ml-1">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={cn(
                    "input-premium",
                    error && "border-destructive focus:ring-destructive/50",
                    className
                )}
                {...props}
            />
            {error && <p className="text-xs text-destructive ml-1">{error}</p>}
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
