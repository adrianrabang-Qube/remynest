"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Apple, PlayCircle } from "lucide-react";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
    },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const aiPrompts = [
  "What routines calm dad?",
  "Show family voice memories.",
  "Summarize this week.",
  "Find Galway memories.",
  "What improved emotional engagement?",
];

function useTypingEffect(prompts: string[]) {
  const [displayedText, setDisplayedText] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    let currentText = "";
    let currentChar = 0;

    const typingInterval = setInterval(() => {
      currentText += prompts[promptIndex][currentChar];
      setDisplayedText(currentText);
      currentChar++;

      if (currentChar >= prompts[promptIndex].length) {
        clearInterval(typingInterval);

        setTimeout(() => {
          setDisplayedText("");
          setPromptIndex((prev) => (prev + 1) % prompts.length);
        }, 2200);
      }
    }, 45);

    return () => clearInterval(typingInterval);
  }, [promptIndex, prompts]);

  return displayedText;
}

export default function RemyNestLandingPage() {
  const typedPrompt = useTypingEffect(aiPrompts);

  return (
    <div className="min-h-screen bg-[#f5f1ea] text-[#2f3e34] overflow-x-hidden">
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
          className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#ffffff] blur-3xl opacity-30"
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

      {/* NAVBAR */}
      <motion.header
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
        }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-[#f5f1ea]/80 border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* LOGO */}
          <Link href="/">
            <motion.div
              whileHover={{
                scale: 1.02,
              }}
              className="flex items-center cursor-pointer"
            >
              <Image
                src="/logo.png"
                alt="RemyNest Logo"
                width={260}
                height={80}
                priority
                className="object-contain"
              />
            </motion.div>
          </Link>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center gap-10 text-sm text-gray-600">
            {[
              "Features",
              "Timeline",
              "Caregivers",
              "Security",
            ].map((item) => (
              <motion.a
                key={item}
                whileHover={{
                  y: -2,
                }}
                className="hover:text-black transition cursor-pointer"
              >
                {item}
              </motion.a>
            ))}
          </nav>

          {/* NAV CTA */}
          <div className="hidden lg:flex items-center gap-4">
            {/* APP STORE */}
            <motion.a
              href="#"
              whileHover={{
                scale: 1.03,
                y: -1,
              }}
              whileTap={{
                scale: 0.98,
              }}
              className="flex items-center gap-3 bg-white border border-black/5 px-5 py-3 rounded-2xl shadow-md hover:shadow-xl transition-all"
            >
              <Apple size={24} strokeWidth={2} />

              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wide text-gray-400">
                  Download on the
                </p>

                <p className="text-lg font-medium">
                  App Store
                </p>
              </div>
            </motion.a>

            {/* GOOGLE PLAY */}
            <motion.a
              href="#"
              whileHover={{
                scale: 1.03,
                y: -1,
              }}
              whileTap={{
                scale: 0.98,
              }}
              className="flex items-center gap-3 bg-white border border-black/5 px-5 py-3 rounded-2xl shadow-md hover:shadow-xl transition-all"
            >
              <PlayCircle size={22} strokeWidth={2} />

              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wide text-gray-400">
                  Get it on
                </p>

                <p className="text-lg font-medium">
                  Google Play
                </p>
              </div>
            </motion.a>

            {/* GET STARTED */}
            <Link href="/signup">
              <motion.button
                whileHover={{
                  scale: 1.04,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="px-6 py-4 rounded-2xl text-sm bg-black text-white hover:opacity-90 transition shadow-2xl"
              >
                Get Started
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* HERO */}
      <section className="relative">
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-28 grid lg:grid-cols-2 gap-20 items-center">
          {/* LEFT SIDE */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="relative"
          >
            {/* FLOATING MEMORY CARD */}
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -left-12 top-[-40px] hidden xl:block pointer-events-none"
            >
              <div className="bg-white rounded-[30px] p-6 shadow-2xl border border-black/5 w-[280px]">
                <p className="text-sm uppercase tracking-wide text-gray-400 mb-3">
                  AI Recall
                </p>

                <p className="text-[18px] font-semibold text-gray-600 leading-relaxed">
                  “Remember dad preferred tea after 7 PM.”
                </p>

                <div className="w-3 h-3 rounded-full bg-green-400 mt-5" />
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full bg-white border border-black/5 px-5 py-3 shadow-sm mb-8"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />

              <p className="text-sm text-gray-600">
                AI Memory Continuity Platform
              </p>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-6xl md:text-7xl font-bold tracking-tight leading-[0.95] mb-8"
            >
              Preserve memories,
              <br />
              routines, and
              <br />
              identity.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-xl text-gray-600 leading-relaxed max-w-xl mb-10"
            >
              RemyNest helps individuals,
              families, and caregivers organize
              memories, reminders, routines,
              and emotional continuity in one
              calm intelligent space.
            </motion.p>

            {/* HERO CTA */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              <Link href="/signup">
                <motion.button
                  whileHover={{
                    scale: 1.03,
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  className="px-8 py-5 rounded-3xl bg-black text-white text-lg shadow-2xl"
                >
                  Start Preserving Memories
                </motion.button>
              </Link>

              <Link href="/dashboard">
                <motion.button
                  whileHover={{
                    scale: 1.03,
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  className="px-8 py-5 rounded-3xl bg-white border border-black/10 text-lg shadow-sm hover:bg-black hover:text-white transition-all duration-300"
                >
                  View Product Experience
                </motion.button>
              </Link>
            </motion.div>

            {/* FEATURE CARDS */}
            <motion.div
              variants={stagger}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 relative"
            >
              {[
                "Private by design",
                "Caregiver support",
                "AI memory recall",
                "Long-term continuity",
              ].map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  whileHover={{
                    y: -4,
                  }}
                  className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm"
                >
                  {item}
                </motion.div>
              ))}

              {/* FLOATING CAREGIVER CARD */}
              <motion.div
                animate={{
                  y: [0, 12, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute right-[-70px] top-[-40px] hidden xl:block pointer-events-none"
              >
                <div className="bg-white rounded-[28px] p-6 shadow-2xl border border-black/5 w-[290px]">
                  <p className="text-sm uppercase tracking-wide text-gray-400 mb-3">
                    Caregiver Sync
                  </p>

                  <p className="text-[18px] font-semibold text-gray-600 leading-relaxed">
                    Medication routine successfully shared.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE APP PREVIEW */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              x: 50,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
            }}
            transition={{
              duration: 0.9,
            }}
            className="relative"
          >
            <div className="absolute -top-8 -right-8 w-full h-full rounded-[40px] bg-[#d9e3db] blur-2xl opacity-60" />

            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
              className="relative bg-white border border-black/5 rounded-[40px] p-6 shadow-2xl overflow-hidden"
            >
              {/* SEARCH */}
              <div className="mb-6">
                <div className="rounded-3xl border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
                  <div className="flex items-center gap-3 rounded-2xl bg-white border border-black/5 px-4 py-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-[#2f3e34]" />

                    <p className="text-sm text-gray-400">
                      {typedPrompt}
                      <span className="animate-pulse">|</span>
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-black/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">
                      Semantic Recall
                    </p>

                    <p className="text-sm font-medium text-gray-700 leading-relaxed">
                      “Your father smiled most during family dinners and preferred evening walks near the beach in Galway.”
                    </p>
                  </div>
                </div>
              </div>

              {/* TIMELINE */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-sm text-gray-500">
                    Active Timeline
                  </p>

                  <h3 className="text-2xl font-semibold">
                    Family Continuity
                  </h3>
                </div>

                <div className="bg-[#f5f1ea] rounded-2xl px-4 py-3 text-sm">
                  Today
                </div>
              </div>

              {/* LIVE ACTIVITY */}
              <div className="mb-6 rounded-3xl border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />

                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                      RemyNest AI Active
                    </p>
                  </div>

                  <p className="text-xs text-gray-400">
                    Live Continuity
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    "Voice memory transcribed successfully",
                    "Routine consistency improved this week",
                    "Caregiver sync completed",
                    "AI detected positive emotional engagement",
                  ].map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 border border-black/5"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#2f3e34]" />

                      <p className="text-sm text-gray-700">
                        {activity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARDS */}
              <div className="space-y-5">
                {[
                  {
                    title: "Dad’s Birthday Dinner",
                    desc: "Voice memory attached",
                  },
                  {
                    title: "Medication Reminder",
                    desc: "Taken successfully",
                  },
                  {
                    title: "Trip to Galway",
                    desc: "AI summary generated",
                  },
                ].map((card, index) => (
                  <motion.div
                    key={index}
                    whileHover={{
                      y: -6,
                    }}
                    className="bg-[#faf8f4] rounded-3xl p-5 border border-black/5 shadow-sm"
                  >
                    <p className="font-semibold text-lg mb-2">
                      {card.title}
                    </p>

                    <p className="text-sm text-gray-500">
                      {card.desc}
                    </p>
                  </motion.div>
                ))}

                <motion.div
                  whileHover={{
                    y: -6,
                  }}
                  className="bg-[#eef4ef] rounded-3xl p-5 border border-black/5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-lg">
                        Morning Walk Routine
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        Daily at 9:00 AM
                      </p>
                    </div>

                    <p className="text-2xl font-bold">
                      91%
                    </p>
                  </div>

                  <div className="w-full h-3 rounded-full bg-white overflow-hidden">
                    <motion.div
                      initial={{
                        width: 0,
                      }}
                      animate={{
                        width: "91%",
                      }}
                      transition={{
                        duration: 1.4,
                      }}
                      className="h-full bg-[#2f3e34] rounded-full"
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32">
        <motion.div
          initial={{
            opacity: 0,
            y: 50,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.8,
          }}
          className="max-w-5xl mx-auto px-6 text-center"
        >
          <div className="rounded-[48px] bg-white border border-black/5 p-14 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-[#dce6de] blur-3xl opacity-60" />

            <div className="relative">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-6">
                Start Today
              </p>

              <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-8">
                Start preserving memories that matter.
              </h2>

              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-12">
                Create your intelligent memory space for yourself, your family, and future generations.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <motion.button
                    whileHover={{
                      scale: 1.03,
                    }}
                    className="px-10 py-5 rounded-3xl bg-black text-white text-lg shadow-2xl"
                  >
                    Get Started Free
                  </motion.button>
                </Link>

                <Link href="/dashboard">
                  <motion.button
                    whileHover={{
                      scale: 1.03,
                    }}
                    className="px-10 py-5 rounded-3xl bg-[#f5f1ea] text-lg"
                  >
                    View Product Experience
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-semibold text-lg">
              RemyNest
            </p>

            <p className="text-gray-500 text-sm">
              Preserving human continuity.
            </p>
          </div>

          <div className="flex gap-6 text-sm text-gray-500">
            <p>Privacy</p>
            <p>Security</p>
            <p>Terms</p>
          </div>
        </div>
      </footer>
    </div>
  );
}