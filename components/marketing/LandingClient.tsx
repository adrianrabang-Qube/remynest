"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const prompts = [
  "Show family memories...",
  "Find Galway trip...",
  "What routines calm dad?",
  "Summarize this week...",
];

function useTypingEffect(words: string[]) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let current = "";
    let char = 0;

    const interval = setInterval(() => {
      current += words[index][char];
      setText(current);
      char++;

      if (char >= words[index].length) {
        clearInterval(interval);

        setTimeout(() => {
          setText("");
          setIndex((prev) => (prev + 1) % words.length);
        }, 1800);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [index, words]);

  return text;
}

export default function LandingClient() {
  const typed = useTypingEffect(prompts);

  return (
    <main className="relative overflow-hidden bg-[#f5f1e8] text-[#1f2937] min-h-screen">

      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">

        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-200px] left-[-120px] h-[600px] w-[600px] rounded-full bg-[#d8d2c7]/40 blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[-250px] right-[-120px] h-[600px] w-[600px] rounded-full bg-[#e7e1d6]/40 blur-3xl"
        />

      </div>

      {/* NAVBAR */}
      <header className="relative z-20 border-b border-black/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <h1 className="text-2xl font-bold text-[#243428]">
            RemyNest
          </h1>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a className="hover:text-[#243428] transition">
              Features
            </a>

            <a className="hover:text-[#243428] transition">
              Security
            </a>

            <a className="hover:text-[#243428] transition">
              Caregivers
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="text-sm text-gray-600 transition hover:text-[#243428]"
            >
              Login
            </a>

            <a href="/signup">
              <button className="rounded-2xl bg-[#243428] px-5 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-[#2f4633]">
                Get Started
              </button>
            </a>
          </div>

        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 grid min-h-screen items-center gap-20 px-6 py-24 lg:grid-cols-2 max-w-7xl mx-auto">

        {/* LEFT */}
        <div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >

            <div className="mb-6 inline-flex rounded-full border border-black/5 bg-white/70 px-4 py-2 text-sm backdrop-blur-xl text-gray-700">
              AI Cognitive Memory Platform
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight text-[#243428]">
              Preserve Memory.
              <br />
              Extend Human Continuity.
            </h1>

            <p className="mt-8 max-w-2xl text-lg md:text-xl text-gray-600">
              RemyNest helps people preserve memories,
              organize thoughts, manage reminders,
              and support cognitive continuity using AI.
            </p>

            <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row">

              <a href="/signup">
                <button className="rounded-2xl bg-[#243428] px-8 py-4 text-lg font-semibold text-white transition hover:scale-105 hover:bg-[#2f4633]">
                  Start Free
                </button>
              </a>

              <div className="flex gap-4">

                <button className="rounded-2xl border border-black/5 bg-white/70 px-6 py-3 text-sm font-medium text-gray-700 backdrop-blur-xl transition hover:bg-white">
                   App Store
                </button>

                <button className="rounded-2xl border border-black/5 bg-white/70 px-6 py-3 text-sm font-medium text-gray-700 backdrop-blur-xl transition hover:bg-white">
                  Google Play
                </button>

              </div>

            </div>

            <section className="pointer-events-none relative mt-32 flex justify-center overflow-hidden px-6">

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(36,52,40,0.08),transparent_60%)]" />

              <div className="relative flex items-center justify-center">

                {/* FLOATING LEFT CARD */}
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -left-20 top-24 hidden w-56 rounded-3xl border border-black/5 bg-white/70 p-5 backdrop-blur-2xl shadow-xl lg:block"
                >
                  <div className="text-xs uppercase tracking-[0.3em] text-[#7c8d7f]">
                    Memory Recall
                  </div>

                  <div className="mt-4 text-lg font-semibold text-[#243428]">
                    “Call Sarah tomorrow at 3PM”
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    Retrieved instantly using semantic memory search.
                  </div>
                </motion.div>

                {/* PHONE */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                  className="relative h-[650px] w-[320px] rounded-[3.5rem] border border-black/10 bg-[#111111] p-4 shadow-[0_0_120px_rgba(36,52,40,0.12)]"
                >

                  <div className="absolute inset-0 rounded-[3.5rem] bg-[#243428]/10 blur-3xl" />

                  <div className="relative h-full overflow-hidden rounded-[3rem] border border-white/10 bg-[#071018]">

                    {/* TOP BAR */}
                    <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">

                      <div>

                        <div className="text-sm text-gray-400">
                          Good evening
                        </div>

                        <div className="text-lg font-semibold text-white">
                          Adrian
                        </div>

                      </div>

                      <div className="h-10 w-10 rounded-full bg-cyan-400/20" />

                    </div>

                    {/* MEMORY TIMELINE */}
                    <div className="space-y-4 p-5">

                      <motion.div
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="rounded-3xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="text-xs uppercase tracking-[0.2em] text-cyan-400">
                          Reminder
                        </div>

                        <div className="mt-2 text-white">
                          Take medication at 8PM
                        </div>
                      </motion.div>

                      <motion.div
                        animate={{ opacity: [1, 0.7, 1] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="rounded-3xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="text-xs uppercase tracking-[0.2em] text-cyan-400">
                          Semantic Search
                        </div>

                        <div className="mt-2 text-white">
                          “Birthday dinner with Cheralou”
                        </div>

                        <div className="mt-2 text-sm text-gray-400">
                          Match found from March memories.
                        </div>
                      </motion.div>

                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 p-5"
                      >
                        <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                          Cognitive Continuity
                        </div>

                        <div className="mt-3 text-lg font-semibold text-white">
                          AI detected emotional importance.
                        </div>

                        <div className="mt-2 text-sm text-gray-300">
                          This memory was prioritized for future recall.
                        </div>
                      </motion.div>

                    </div>

                  </div>

                </motion.div>

                {/* FLOATING RIGHT CARD */}
                <motion.div
                  animate={{ y: [0, 14, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                  className="absolute -right-20 bottom-24 hidden w-56 rounded-3xl border border-black/5 bg-white/70 p-5 backdrop-blur-2xl shadow-xl lg:block"
                >
                  <div className="text-xs uppercase tracking-[0.3em] text-[#7c8d7f]">
                    Caregiver Continuity
                  </div>

                  <div className="mt-4 text-lg font-semibold text-[#243428]">
                    Shared memory update synced.
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    Family members remain connected across timelines.
                  </div>
                </motion.div>

              </div>

            </section>

            {/* TRUST STATS */}
            <div className="mt-16 grid grid-cols-3 gap-6">

              <div>
                <h3 className="text-3xl font-bold text-[#243428]">
                  AI
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Semantic Recall
                </p>
              </div>

              <div>
                <h3 className="text-3xl font-bold text-[#243428]">
                  24/7
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Cognitive Continuity
                </p>
              </div>

              <div>
                <h3 className="text-3xl font-bold text-[#243428]">
                  Secure
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Private by Design
                </p>
              </div>

            </div>

          </motion.div>

        </div>

        {/* RIGHT DASHBOARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.2,
            duration: 0.8,
          }}
          className="relative"
        >

          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
            className="absolute -left-10 -top-10 hidden xl:block"
          >
            <div className="rounded-3xl border border-black/5 bg-white/70 p-5 backdrop-blur-xl shadow-xl">

              <p className="text-sm text-gray-500">
                AI Recall Active
              </p>

              <p className="mt-2 text-lg font-semibold text-[#243428]">
                Emotional continuity improving
              </p>

            </div>
          </motion.div>

          <motion.div
            animate={{
              y: [0, 12, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
            }}
            className="absolute -right-8 bottom-10 hidden xl:block"
          >
            <div className="rounded-3xl border border-[#243428]/10 bg-[#243428]/5 p-5 backdrop-blur-xl shadow-xl">

              <p className="text-sm text-[#243428]">
                Memory Confidence
              </p>

              <p className="mt-2 text-3xl font-bold text-[#243428]">
                98%
              </p>

            </div>
          </motion.div>

          <div className="absolute inset-0 rounded-[40px] bg-[#243428]/5 blur-3xl" />

          <div className="relative rounded-[40px] border border-black/5 bg-white/70 p-6 backdrop-blur-2xl shadow-2xl">

            <div className="rounded-3xl bg-[#f7f4ed] p-4 border border-black/5">

              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 border border-black/5">
                {typed}
                <span className="animate-pulse">|</span>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-5 text-black border border-black/5">

                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Semantic Recall
                </p>

                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  “Your father smiled most during evening family dinners near Galway.”
                </p>

              </div>

            </div>

            <div className="mt-6 space-y-4">

              <div className="rounded-2xl border border-black/5 bg-white p-5 text-gray-700">
                Voice memory transcribed successfully
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-5 text-gray-700">
                Routine consistency improved this week
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-5 text-gray-700">
                Caregiver sync completed
              </div>

            </div>

          </div>

        </motion.div>

      </section>

      {/* TRUST RIBBON */}
      <section className="relative z-10 px-6 pb-10">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-10 rounded-3xl border border-black/5 bg-white/70 px-8 py-6 backdrop-blur-xl shadow-xl">

          <div className="text-gray-600">
            Semantic AI Recall
          </div>

          <div className="text-gray-600">
            Healthcare Potential
          </div>

          <div className="text-gray-600">
            Cognitive Support
          </div>

          <div className="text-gray-600">
            Caregiver Continuity
          </div>

        </div>

      </section>

      {/* TIMELINE */}
      <section className="relative z-10 px-6 py-24">

        <div className="mx-auto max-w-6xl">

          <h2 className="text-4xl md:text-5xl font-bold text-center text-[#243428]">
            Built For Human Continuity
          </h2>

          <div className="mt-20 grid gap-8 md:grid-cols-3">

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <div className="text-[#7c8d7f] text-sm">
                STEP 1
              </div>

              <h3 className="mt-4 text-2xl font-semibold text-[#243428]">
                Capture Memories
              </h3>

              <p className="mt-4 text-gray-600">
                Store thoughts, routines,
                conversations, and life moments.
              </p>

            </div>

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <div className="text-[#7c8d7f] text-sm">
                STEP 2
              </div>

              <h3 className="mt-4 text-2xl font-semibold text-[#243428]">
                AI Understands Context
              </h3>

              <p className="mt-4 text-gray-600">
                Semantic AI connects memories,
                emotional patterns, and continuity.
              </p>

            </div>

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <div className="text-[#7c8d7f] text-sm">
                STEP 3
              </div>

              <h3 className="mt-4 text-2xl font-semibold text-[#243428]">
                Support Daily Life
              </h3>

              <p className="mt-4 text-gray-600">
                Help users, caregivers,
                and families maintain continuity.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* TESTIMONIALS */}
      <section className="relative z-10 px-6 py-24">

        <div className="mx-auto max-w-6xl">

          <h2 className="text-center text-4xl md:text-5xl font-bold text-[#243428]">
            Future-Focused Memory Support
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-3">

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <p className="text-gray-600">
                “A completely new direction for cognitive continuity and AI memory systems.”
              </p>

              <p className="mt-6 text-sm text-[#7c8d7f]">
                Healthcare Vision
              </p>

            </div>

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <p className="text-gray-600">
                “RemyNest feels like the beginning of a second-brain platform.”
              </p>

              <p className="mt-6 text-sm text-[#7c8d7f]">
                AI Product Perspective
              </p>

            </div>

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <p className="text-gray-600">
                “The caregiver continuity direction has massive long-term potential.”
              </p>

              <p className="mt-6 text-sm text-[#7c8d7f]">
                Cognitive Support Focus
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 px-6 pb-32">

        <div className="mx-auto max-w-5xl rounded-[40px] border border-black/5 bg-white/70 p-12 text-center backdrop-blur-2xl shadow-xl">

          <h2 className="text-4xl md:text-6xl font-bold text-[#243428]">
            Build Your Second Brain
          </h2>

          <p className="mt-6 text-lg text-gray-600">
            RemyNest combines AI memory recall,
            reminders, and cognitive continuity
            into one modern platform.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">

            <button className="rounded-2xl bg-[#243428] px-8 py-4 font-semibold text-white hover:scale-105 transition hover:bg-[#2f4633]">
              Download For iPhone
            </button>

            <button className="rounded-2xl border border-black/10 bg-white px-8 py-4 font-semibold text-gray-700 hover:bg-[#f7f4ed] transition">
              Download For Android
            </button>

          </div>

        </div>

      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-black/5 px-6 py-10">

        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">

          <div>

            <h3 className="text-xl font-bold text-[#243428]">
              RemyNest
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              AI-powered cognitive continuity platform.
            </p>

          </div>

          <div className="flex gap-6 text-sm text-gray-500">

            <a className="hover:text-[#243428] transition">
              Privacy
            </a>

            <a className="hover:text-[#243428] transition">
              Security
            </a>

            <a href="/contact" className="hover:text-[#243428] transition">
              Contact
            </a>

          </div>

        </div>

      </footer>

    </main>
  );
}