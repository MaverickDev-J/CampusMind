"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function HeroSection() {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-10 text-center px-6 pt-12 pb-8 lg:pt-16 lg:pb-10"
        >
            {/* Badge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
            >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-300 tracking-wide">
                    CAMPUSMIND — AI-POWERED LEARNING
                </span>
            </motion.div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight max-w-3xl mx-auto text-glow">
                Your Second Brain for{" "}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    4 Years of Engineering.
                </span>
                <br />
                Instantly.
            </h2>

            {/* Subtitle */}
            <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
                Unified AI Knowledge Base + Personalized Workspace
            </p>

            {/* Decorative line */}
            <div className="mt-8 flex justify-center">
                <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent rounded-full" />
            </div>
        </motion.section>
    );
}
