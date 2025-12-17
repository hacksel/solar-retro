import { motion } from 'framer-motion';

export const FireplaceEffect = () => {
    return (
        <div className="absolute top-[50%] left-[10%] w-[20%] h-[20%] pointer-events-none mix-blend-screen opacity-60">
            <motion.div
                className="w-full h-full bg-orange-500 blur-[80px]"
                animate={{
                    opacity: [0.4, 0.6, 0.4, 0.7, 0.5],
                    scale: [1, 1.1, 0.95, 1.05, 1],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute inset-0 w-full h-full bg-yellow-400 blur-[60px]"
                animate={{
                    opacity: [0.2, 0.4, 0.2, 0.5, 0.3],
                    scale: [0.9, 1.2, 1, 1.1, 0.9],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                }}
            />
        </div>
    );
};
