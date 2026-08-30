import { motion, type Variants } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
}

const pageVariants: Variants = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  in: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 250,
      mass: 0.8
    }
  },
  out: { 
    opacity: 0, 
    y: -10, 
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  }
};

export default function PageTransition({ children, className = '' }: Props) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      className={`h-full w-full ${className}`}
    >
      {children}
    </motion.div>
  );
}
