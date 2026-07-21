"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Play, RotateCcw, Square, Trash2 } from "lucide-react";

import { haptic, hapticSuccess } from "@/lib/haptics";

/**
 * Voice Memory v1 — in-app private voice recording for the EXISTING memory
 * creation flow (operator-approved narrow lift of the audio deferral).
 *
 * Browser-native only: `getUserMedia` + `MediaRecorder` (iOS 14.3+ WKWebView
 * records AAC in audio/mp4; Chrome/Android record Opus in audio/webm — we
 * pick the first supported type). NO Capacitor plugin, pod, or native bridge.
 * The recording becomes a plain `File` handed to the parent form, which sends
 * it through the EXISTING direct-to-storage pipeline (quota, owner-scoped
 * paths, private bucket, signing, GDPR — all inherited; the server MIME
 * allowlist already accepts audio/*).
 *
 * Privacy invariants: recording starts ONLY on the user's tap; every
 * microphone track is stopped IMMEDIATELY on Stop, Discard, error, and
 * unmount (navigation away); audio bytes never touch logs or analytics;
 * playback preview is a local object URL (never uploaded until Save).
 * Calm limit: 5 minutes, auto-stop with an announcement. No autoplay.
 */

const MAX_SECONDS = 300; // 5 minutes — calm upper bound, surfaced in the UI

const MIME_PREFERENCES = [
  "audio/mp4", // iOS/WKWebView (AAC)
  "audio/webm;codecs=opus",
  "audio/webm",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of MIME_PREFERENCES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      /* continue */
    }
  }
  return null;
}

function extensionFor(mime: string): string {
  return mime.startsWith("audio/mp4") ? "m4a" : "webm";
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Phase = "idle" | "recording" | "preview" | "unsupported";

export default function VoiceRecorderField({
  file,
  onChange,
}: {
  /** The current recording (null = none). Parent uploads it on Save. */
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  // Feature-detect after mount (SSR-safe; async so the effect never sets
  // state synchronously — the idle frame simply settles to unsupported).
  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      !!pickMimeType();
    if (supported) return;
    const t = setTimeout(() => setPhase("unsupported"), 0);
    return () => clearTimeout(t);
  }, []);

  /** Stop every microphone track immediately — the core privacy invariant. */
  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Unmount / navigation away: release the mic, stop timers, revoke previews.
  useEffect(
    () => () => {
      try {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      } catch {
        /* already stopped */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
    [],
  );

  const stopRecording = useCallback(
    (discard: boolean) => {
      discardRef.current = discard;
      clearTimer();
      try {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop(); // onstop handles blob + mic release
        } else {
          releaseMicrophone();
        }
      } catch {
        releaseMicrophone();
        setPhase("idle");
      }
    },
    [clearTimer, releaseMicrophone],
  );

  const startRecording = useCallback(async () => {
    setError("");
    const mime = pickMimeType();
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      discardRef.current = false;

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        // Interrupted recording (call, route change, hardware): recover calmly.
        releaseMicrophone();
        clearTimer();
        chunksRef.current = [];
        setPhase("idle");
        setError("The recording was interrupted. Nothing was saved — try again when you're ready.");
        setAnnounce("Recording interrupted.");
      };
      recorder.onstop = () => {
        releaseMicrophone();
        clearTimer();
        if (discardRef.current || chunksRef.current.length === 0) {
          chunksRef.current = [];
          setPhase("idle");
          setSeconds(0);
          setAnnounce("Recording discarded. Nothing was saved.");
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const recorded = new File([blob], `voice-memory-${stamp}.${extensionFor(mime)}`, {
          type: mime,
        });
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        onChange(recorded);
        setPhase("preview");
        void hapticSuccess();
        setAnnounce(
          `Recording finished — ${formatSeconds(secondsRef.current)}. Listen back below, or re-record.`,
        );
      };

      recorder.start();
      setSeconds(0);
      secondsRef.current = 0;
      setPhase("recording");
      void haptic("medium");
      setAnnounce("Recording started.");
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_SECONDS) {
          setAnnounce("Five minutes reached — recording stopped.");
          stopRecording(false);
        }
      }, 1000);
    } catch (e) {
      releaseMicrophone();
      setPhase("idle");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone access was declined. You can allow it in your device Settings, or add this memory without a recording."
          : "The microphone couldn't start. You can still add this memory without a recording.",
      );
    }
  }, [clearTimer, onChange, releaseMicrophone, stopRecording]);

  const removeRecording = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSeconds(0);
    onChange(null);
    setPhase("idle");
    setAnnounce("Voice recording removed.");
    void haptic("light");
  }, [previewUrl, onChange]);

  if (phase === "unsupported") {
    return (
      <p className="text-sm text-charcoal-muted">
        Voice recording isn&apos;t available on this device — photos, videos,
        and written memories still work.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-sand-deep/60 bg-sand/40 p-4">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {error && (
        <p role="alert" className="mb-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {phase === "idle" && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-charcoal">Voice memory</p>
            <p className="text-xs text-charcoal-muted">
              Record a voice, a story, a laugh — up to 5 minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void startRecording()}
            className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-sand-deep/70 bg-white px-4 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Mic className="h-4 w-4 text-primary" aria-hidden />
            Record
          </button>
        </div>
      )}

      {phase === "recording" && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-3 w-3 animate-pulse rounded-full bg-rose-600 motion-reduce:animate-none"
            />
            <p className="text-sm font-medium text-charcoal" aria-live="off">
              Recording · {formatSeconds(seconds)}
              <span className="text-charcoal-muted"> / 5:00</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Square className="h-4 w-4" aria-hidden />
              Stop
            </button>
            <button
              type="button"
              onClick={() => stopRecording(true)}
              aria-label="Discard this recording"
              className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal-muted transition hover:bg-rose-50 hover:text-rose-600/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            >
              <Trash2 className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {phase === "preview" && file && previewUrl && (
        <div>
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm font-medium text-charcoal">
              Voice memory · {formatSeconds(seconds)}
            </p>
          </div>
          {/* Listen back — user-initiated controls only, never autoplay. */}
          <audio
            src={previewUrl}
            controls
            preload="metadata"
            aria-label="Listen back to your voice recording"
            className="mt-2 w-full"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                removeRecording();
                void startRecording();
              }}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-sand-deep/70 bg-white px-4 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Re-record
            </button>
            <button
              type="button"
              onClick={removeRecording}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-50 px-4 text-sm font-semibold text-rose-600/90 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove
            </button>
          </div>
          <p className="mt-2 text-xs text-charcoal-muted">
            Saved privately with this memory when you save it.
          </p>
        </div>
      )}
    </div>
  );
}
