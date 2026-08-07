export const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const popIn = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.94 },
  transition: { duration: 0.25, ease: 'easeOut' },
};

export const slideInRight = {
  initial: { opacity: 0, x: 25 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 25 },
  transition: { duration: 0.3, ease: 'easeInOut' },
};
