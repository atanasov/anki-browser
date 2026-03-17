import { playAudio } from "./practiceUtils";

const AudioBtn = ({ audioRaw }) => {
  if (!audioRaw) return null;
  return (
    <button
      onClick={() => playAudio(audioRaw)}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors shrink-0"
      aria-label="Play pronunciation"
      title="Play pronunciation"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
    </button>
  );
};

export default AudioBtn;
