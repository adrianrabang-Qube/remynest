"use client";

import { motion } from "framer-motion";

export default function LandingClient() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f1ea] text-[#2f3e34]">

      {/* CINEMATIC BACKGROUND */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">

        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-200px] left-[-120px] w-[700px] h-[700px] rounded-full bg-[#dce7dc] blur-3xl opacity-50"
        />

        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
            scale: [1, 1.12, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[10%] right-[-200px] w-[850px] h-[850px] rounded-full bg-[#efe6dc] blur-3xl opacity-50"
        />

        <motion.div
          animate={{
            opacity: [0.25, 0.45, 0.25],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-white blur-3xl opacity-30"
        />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(#000 0.5px, transparent 0.5px)",
            backgroundSize: "12px 12px",
          }}
        />
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-6 py-24">

        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.8,
          }}
        >
          <h1 className="text-7xl font-bold tracking-tight">
            RemyNest
          </h1>

          <p className="mt-6 text-xl text-gray-600 max-w-2xl leading-relaxed">
            Preserve memories, routines,
            emotional continuity, and family
            identity in one intelligent space.
          </p>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 1,
            delay: 0.2,
          }}
          className="mt-20 rounded-[40px] bg-white border border-black/5 p-10 shadow-2xl"
        >
          <div className="space-y-4">

            <div className="rounded-2xl bg-[#f5f1ea] p-5">
              AI Memory Recall
            </div>

            <div className="rounded-2xl bg-[#f5f1ea] p-5">
              Semantic Search
            </div>

            <div className="rounded-2xl bg-[#f5f1ea] p-5">
              Caregiver Continuity
            </div>

          </div>
        </motion.div>

      </div>
    </main>
  );
}