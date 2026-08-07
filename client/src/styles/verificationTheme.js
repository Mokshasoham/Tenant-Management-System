/**
 * MERN Verification Platform Master Design Tokens
 */
export const VerificationTheme = {
  colors: {
    approved: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      solid: '#10b981',
    },
    rejected: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      border: 'border-rose-500/20 dark:border-rose-500/30',
      text: 'text-rose-600 dark:text-rose-400',
      solid: '#f43f5e',
    },
    pending: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      solid: '#f59e0b',
    },
    autoReview: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      border: 'border-cyan-500/20 dark:border-cyan-500/30',
      text: 'text-cyan-600 dark:text-cyan-400',
      solid: '#06b6d4',
    },
    adminReview: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      border: 'border-violet-500/20 dark:border-violet-500/30',
      text: 'text-violet-600 dark:text-violet-400',
      solid: '#8b5cf6',
    },
    trust: {
      high: '#10b981',
      medium: '#f59e0b',
      low: '#f43f5e',
    },
  },
  spacing: {
    cardPadding: 'p-6 sm:p-8',
    gridGap: 'gap-6',
    sectionMargin: 'mb-8',
  },
  radius: {
    card: 'rounded-2xl',
    badge: 'rounded-full',
    button: 'rounded-xl',
  },
  shadows: {
    card: 'shadow-sm hover:shadow-md transition-shadow duration-200',
    glow: 'shadow-role',
  },
  typography: {
    title: 'text-xl sm:text-2xl font-black text-foreground tracking-tight',
    subtitle: 'text-sm text-muted-foreground font-medium',
    cardHeader: 'text-base font-black text-foreground',
    body: 'text-sm text-foreground leading-relaxed',
  },
  transitions: {
    default: 'transition-all duration-200 ease-in-out',
    smooth: 'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
  },
  zIndex: {
    modal: 'z-50',
    backdrop: 'z-40',
    tooltip: 'z-30',
    stickyHeader: 'z-20',
  },
};

export default VerificationTheme;
