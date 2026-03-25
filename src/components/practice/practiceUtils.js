import ankiConnect from "../../services/ankiConnect";
import mediaCacheService from "../../services/mediaCache";

export const FONT_SIZES = ["text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"];

export const PRACTICE_SIZE_TO_MAX_INDEX = {
  small:   1,
  medium:  2,
  large:   3,
  xlarge:  4,
  xxlarge: 5,
};

export const adaptiveFont = (text, maxIndex = 4) => {
  const len = (text || "").length;
  const step = len > 45 ? 4 : len > 28 ? 3 : len > 15 ? 2 : len > 8 ? 1 : 0;
  return FONT_SIZES[Math.max(0, maxIndex - step)];
};

export const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const MIME_TYPES = { mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", aac: "audio/aac", m4a: "audio/mp4" };

// Returns true on success, false on failure — never throws.
export const playAudio = async (audioRaw) => {
  if (!audioRaw) return false;
  const match = audioRaw.match(/\[sound:([^\]]+)\]/);
  if (!match) return false;
  const filename = match[1].trim();
  try {
    let base64 = await mediaCacheService.getCachedMedia(filename);
    if (!base64) {
      base64 = await ankiConnect.retrieveMediaFile(filename);
      if (base64) mediaCacheService.setCachedMedia(filename, base64);
    }
    if (!base64) return false;
    const ext = filename.split(".").pop()?.toLowerCase() || "mp3";
    const mimeType = MIME_TYPES[ext] ?? `audio/${ext}`;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);
    await audio.play();
    return true;
  } catch {
    return false;
  }
};
