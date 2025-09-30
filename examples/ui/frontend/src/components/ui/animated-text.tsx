"use client";
import React from "react";
import { motion, Variants } from "framer-motion";

interface AnimatedTextProps {
  text: string;
  className?: string;
}

export function AnimatedText({ text, className = "" }: AnimatedTextProps) {
  const characters = text.split("");

  const container: Variants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.1,
      },
    },
  };

  const child: Variants = {
    hidden: {
      opacity: 0.6,
      color: "#94a3b8", // slate-400
      scale: 1,
    },
    visible: {
      opacity: [0.6, 1, 0.6],
      color: ["#94a3b8", "#475569", "#94a3b8"], // slate-400 -> slate-600 -> slate-400
      scale: [1, 1.04, 1], // subtle pulsing scale
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5,
      },
    },
  };

  const dotVariants: Variants = {
    hidden: { opacity: 0.3 },
    visible: {
      opacity: [0.3, 0.8, 0.3],
      scale: [1, 1.1, 1],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5,
      },
    },
  };

  return (
    <span className={`inline-flex items-center ${className}`}>
      <motion.span
        className="inline-flex"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {characters.map((char, index) => (
          <motion.span key={index} variants={child} className="text-slate-500">
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.span>
      <span className="inline-flex ml-1">
        <motion.span
          variants={dotVariants}
          initial="hidden"
          animate="visible"
          className="text-slate-500"
          transition={{ delay: 0 }}
        >
          .
        </motion.span>
        <motion.span
          variants={dotVariants}
          initial="hidden"
          animate="visible"
          className="text-slate-500"
          transition={{ delay: 0.5 }}
        >
          .
        </motion.span>
        <motion.span
          variants={dotVariants}
          initial="hidden"
          animate="visible"
          className="text-slate-500"
          transition={{ delay: 1 }}
        >
          .
        </motion.span>
      </span>
    </span>
  );
}
