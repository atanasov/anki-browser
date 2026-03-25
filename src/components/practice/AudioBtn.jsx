import { useState } from "react";
import { playAudio } from "./practiceUtils";

const AudioBtn = ({ audioRaw }) => {
  const [state, setState] = useState("idle"); // idle | loading | error

  if (!audioRaw) return null;

  const handleClick = async () => {
    if (state === "loading") return;
    setState("loading");
    const ok = await playAudio(audioRaw);
    if (ok) {
      setState("idle");
    } else {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const isError = state === "error";
  const isLoading = state === "loading";

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors shrink-0 ${
        isError
          ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/60"
      }`}
      aria-label="Play pronunciation"
      title={isError ? "Audio failed — check AnkiConnect" : "Play pronunciation"}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : isError ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
      )}
    </button>
  );
};

export default AudioBtn;
