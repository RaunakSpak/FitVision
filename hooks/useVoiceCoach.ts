"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COOLDOWN_MS = 4000;
const SKIP_MESSAGES = new Set([
  "Step into frame…",
  "No pose detected — step into frame",
  "Adjust position — move into frame",
  "Move into frame — landmarks not visible",
  "Initializing AI model…",
  "Press Start to begin your workout",
  "Workout paused",
  "Ready — press Start Workout",
]);

function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useVoiceCoach() {
  const [isMuted, setIsMuted] = useState(false);
  const lastSpokenRef = useRef<string>("");
  const lastSpeakTimeRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancelSpeech = useCallback(() => {
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) cancelSpeech();
      return !prev;
    });
  }, [cancelSpeech]);

  const speak = useCallback(
    (message: string) => {
      if (isMuted || !isSpeechSupported()) return;
      if (!message || SKIP_MESSAGES.has(message)) return;
      if (message === lastSpokenRef.current) return;

      const now = Date.now();
      if (now - lastSpeakTimeRef.current < COOLDOWN_MS) return;

      cancelSpeech();

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ??
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;

      utteranceRef.current = utterance;
      lastSpokenRef.current = message;
      lastSpeakTimeRef.current = now;

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, cancelSpeech]
  );

  /** Speak rep completions and form corrections immediately (still respects cooldown/dedup) */
  const speakImportant = useCallback(
    (message: string, force = false) => {
      if (force && isSpeechSupported() && !isMuted) {
        const repMessages = [
          "Good rep counted",
          "Good squat counted",
          "Good curl counted",
        ];
        if (repMessages.some((m) => message.includes(m))) {
          lastSpeakTimeRef.current = 0;
        }
      }
      speak(message);
    },
    [speak, isMuted]
  );

  useEffect(() => {
    return () => cancelSpeech();
  }, [cancelSpeech]);

  useEffect(() => {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.getVoices();
    const handle = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handle);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handle);
  }, []);

  return { speak: speakImportant, isMuted, toggleMute, cancelSpeech };
}
