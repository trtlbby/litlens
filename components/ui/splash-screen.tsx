import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const SPLASH_DURATION = 5000;

const words = ["Indexing", "Parsing", "Connecting", "Illuminating"];

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [activeWord, setActiveWord] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setActiveWord((w) => (w + 1) % words.length);
    }, 1100);

    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, SPLASH_DURATION - 600);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, SPLASH_DURATION);

    return () => {
      clearInterval(wordInterval);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: "#F7F5F0" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Decorative floating particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4 + (i % 3) * 3,
                height: 4 + (i % 3) * 3,
                backgroundColor: i % 2 === 0 ? "#1F5C45" : "#D4821A",
                opacity: 0.15,
                left: `${10 + (i * 7.3) % 80}%`,
                top: `${8 + (i * 11.7) % 80}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.1, 0.25, 0.1],
              }}
              transition={{
                duration: 3 + (i % 3),
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Main icon animation */}
          <div className="relative mb-10" style={{ width: 140, height: 140 }}>
            {/* Book / Document */}
            <motion.svg
              viewBox="0 0 100 100"
              width={140}
              height={140}
              className="absolute inset-0"
            >
              {/* Book body */}
              <motion.rect
                x="20"
                y="15"
                width="45"
                height="60"
                rx="4"
                stroke="#1F5C45"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              {/* Text lines appearing one by one */}
              {[0, 1, 2, 3].map((i) => (
                <motion.line
                  key={i}
                  x1="28"
                  y1={30 + i * 10}
                  x2={55 - i * 4}
                  y2={30 + i * 10}
                  stroke="#1F5C45"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 0.5, delay: 1.0 + i * 0.2, ease: "easeOut" }}
                />
              ))}
              {/* Magnifying glass */}
              <motion.circle
                cx="65"
                cy="60"
                r="16"
                stroke="#D4821A"
                strokeWidth="3"
                fill="none"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.8, ease: "backOut" }}
                style={{ transformOrigin: "65px 60px" }}
              />
              <motion.line
                x1="76"
                y1="72"
                x2="88"
                y2="84"
                stroke="#D4821A"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 2.2, ease: "easeOut" }}
              />
            </motion.svg>

            {/* Scanning line */}
            <motion.div
              className="absolute left-[20px] right-[38px] h-[2px]"
              style={{ backgroundColor: "#D4821A", opacity: 0.5 }}
              initial={{ top: "15%", opacity: 0 }}
              animate={{ top: ["15%", "72%", "15%"], opacity: [0, 0.6, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: 2.5,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Logo text */}
          <motion.h1
            style={{ fontFamily: "'Playfair Display', serif", color: "#1C1C1E" }}
            className="text-[36px] mb-3 tracking-tight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
          >
            LitLens
          </motion.h1>

          {/* Rotating status words */}
          <div className="h-6 overflow-hidden relative" style={{ width: 180 }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={activeWord}
                className="absolute inset-0 text-center"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: "#1F5C45",
                  fontSize: 13,
                  letterSpacing: "0.12em",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 0.7, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {words[activeWord]}...
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <motion.div
            className="mt-8 rounded-full overflow-hidden"
            style={{
              width: 160,
              height: 3,
              backgroundColor: "#E4E2DC",
            }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "#1F5C45" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: SPLASH_DURATION / 1000 - 0.6,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
