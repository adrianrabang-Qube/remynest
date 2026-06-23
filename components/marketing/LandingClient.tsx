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
      <header className="relative z-20 border-b border-black/5 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <h1 className="text-2xl font-bold text-[#243428]">
            RemyNest
          </h1>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#how-it-works" className="hover:text-[#243428] transition">
              Features
            </a>

            <a href="#private-secure" className="hover:text-[#243428] transition">
              Security
            </a>

            <a href="#caregivers" className="hover:text-[#243428] transition">
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
              AI Memory Preservation
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight text-[#243428]">
              Preserve Memory.
              <br />
              Keep Your Family&apos;s Story.
            </h1>

            <p className="mt-8 max-w-2xl text-lg md:text-xl text-gray-600">
              RemyNest helps people preserve memories,
              organize thoughts, manage reminders,
              and revisit them with a helpful AI assistant.
            </p>

            <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row">

              <a href="/signup">
                <button className="rounded-2xl bg-[#243428] px-8 py-4 text-lg font-semibold text-white transition hover:scale-105 hover:bg-[#2f4633]">
                  Start Free
                </button>
              </a>

              <div className="flex gap-4">

                <a href="/download">
                  <button className="rounded-2xl border border-black/5 bg-white/70 px-6 py-3 text-sm font-medium text-gray-700 backdrop-blur-xl transition hover:bg-white">
                     App Store
                  </button>
                </a>

                <a href="/download">
                  <button className="rounded-2xl border border-black/5 bg-white/70 px-6 py-3 text-sm font-medium text-gray-700 backdrop-blur-xl transition hover:bg-white">
                    Google Play
                  </button>
                </a>

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
                    Memory Search
                  </div>

                  <div className="mt-4 text-lg font-semibold text-[#243428]">
                    “Call Sarah tomorrow at 3PM”
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    Found instantly with smart search.
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
                          Smart Search
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
                        <div className="flex items-center justify-between">
                          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                            AI Insights
                          </div>
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-100">
                            Coming Soon
                          </span>
                        </div>

                        <div className="mt-3 text-lg font-semibold text-white">
                          Highlights worth revisiting
                        </div>

                        <div className="mt-2 text-sm text-gray-300">
                          Smart highlights for the memories that matter most.
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
                    Caregiver Support
                  </div>

                  <div className="mt-4 text-lg font-semibold text-[#243428]">
                    Shared memory update synced.
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    Family members stay connected to the memories you share.
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
                  Smart Search
                </p>
              </div>

              <div>
                <h3 className="text-3xl font-bold text-[#243428]">
                  24/7
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Caregiver Support
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
                AI Assistant Active
              </p>

              <p className="mt-2 text-lg font-semibold text-[#243428]">
                Your memories, organized
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
                  AI Summaries
                </p>

                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  “A gentle summary of your week, gathered from the memories you saved.”
                </p>

              </div>

            </div>

            <div className="mt-6 space-y-4">

              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 text-gray-700">
                <span>Voice Memories</span>
                <span className="rounded-full bg-[#243428]/10 px-2.5 py-1 text-xs font-medium text-[#243428]">
                  Coming Soon
                </span>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-5 text-gray-700">
                Your week, summarized
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-5 text-gray-700">
                Caregiver sync completed
              </div>

            </div>

          </div>

        </motion.div>

      </section>

      {/* TRUST RIBBON */}
      <section id="private-secure" className="relative z-10 px-6 pb-10">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-10 rounded-3xl border border-black/5 bg-white/70 px-8 py-6 backdrop-blur-xl shadow-xl">

          <div className="text-gray-600">
            Smart Search
          </div>

          <div className="text-gray-600">
            Private by Design
          </div>

          <div className="text-gray-600">
            AI Summaries
          </div>

          <div className="text-gray-600">
            Caregiver Support
          </div>

        </div>

      </section>

      {/* TIMELINE */}
      <section id="how-it-works" className="relative z-10 px-6 py-24">

        <div className="mx-auto max-w-6xl">

          <h2 className="text-4xl md:text-5xl font-bold text-center text-[#243428]">
            How RemyNest Works
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
                AI Helps You Organize
              </h3>

              <p className="mt-4 text-gray-600">
                RemyNest connects related memories
                and helps you find them in seconds.
              </p>

            </div>

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <div className="text-[#7c8d7f] text-sm">
                STEP 3
              </div>

              <h3 className="mt-4 text-2xl font-semibold text-[#243428]">
                Support Families &amp; Caregivers
              </h3>

              <p className="mt-4 text-gray-600">
                Help families and caregivers stay close
                to the memories that matter.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* TESTIMONIALS */}
      <section id="caregivers" className="relative z-10 px-6 py-24">

        <div className="mx-auto max-w-6xl">

          <h2 className="text-center text-4xl md:text-5xl font-bold text-[#243428]">
            Made For Families &amp; Caregivers
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-3">

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <p className="text-gray-600">
                “RemyNest makes it easy to keep our family&apos;s memories safe in one place.”
              </p>

              <p className="mt-6 text-sm text-[#7c8d7f]">
                Family User
              </p>

            </div>

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <p className="text-gray-600">
                “A calm, simple home for the memories that matter most.”
              </p>

              <p className="mt-6 text-sm text-[#7c8d7f]">
                Early User
              </p>

            </div>

            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 backdrop-blur-xl shadow-xl">

              <p className="text-gray-600">
                “Sharing memories with the people who care for mum has never been easier.”
              </p>

              <p className="mt-6 text-sm text-[#7c8d7f]">
                Caregiver
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 px-6 pb-32">

        <div className="mx-auto max-w-5xl rounded-[40px] border border-black/5 bg-white/70 p-12 text-center backdrop-blur-2xl shadow-xl">

          <h2 className="text-4xl md:text-6xl font-bold text-[#243428]">
            Preserve What Matters Most
          </h2>

          <p className="mt-6 text-lg text-gray-600">
            RemyNest brings your memories, reminders,
            and family history together
            in one safe place.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">

            <a href="/download">
              <button className="rounded-2xl bg-[#243428] px-8 py-4 font-semibold text-white hover:scale-105 transition hover:bg-[#2f4633]">
                Download For iPhone
              </button>
            </a>

            <a href="/download">
              <button className="rounded-2xl border border-black/10 bg-white px-8 py-4 font-semibold text-gray-700 hover:bg-[#f7f4ed] transition">
                Download For Android
              </button>
            </a>

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
              A safe place for your memories.
            </p>

          </div>

          <div className="flex gap-6 text-sm text-gray-500">

            <a href="/privacy" className="hover:text-[#243428] transition">
              Privacy
            </a>

            <a href="/support" className="hover:text-[#243428] transition">
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
