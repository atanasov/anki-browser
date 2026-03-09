/**
 * Note Card Component
 * Click-to-flip card. Both sides: image → background, audio → corner buttons,
 * text → centered overlay with adaptive font sizing.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import useStore from "../../store";
import { getFallbackContent } from "../../utils/cardTemplates";
import templateProcessor from "../../services/templateProcessor";
import CardInfoModal from "./CardInfoModal";
import SimilarWordsModal from "./SimilarWordsModal";
import ExamplesModal from "./ExamplesModal";
import logger from "../../utils/logger";
import { getFontSizeClass } from "../../utils/fontSizeHelpers";
import { getCardDimensionClasses } from "../../utils/gridHelpers";
import { extractFieldValue } from "../../utils/fieldHelpers";
import {
  extractImageFilename,
  extractAudioFilename,
  isValidFilename,
  getImageMimeType,
  getAudioMimeType,
  createBackgroundImageUrl,
  createMediaDataUrl,
} from "../../utils/mediaHelpers";
import mediaCacheService from "../../services/mediaCache";
import ankiConnect from "../../services/ankiConnect";

const EMPTY_PARSED = { bgImage: null, audioSrcs: [], textHtml: "" };

// Extract image (→ background), audio sources (→ corner buttons), and
// remaining text HTML from the templateProcessor output.
const parseCardContent = (html) => {
  if (!html) return EMPTY_PARSED;

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const body = doc.body;

  let bgImage = null;
  const img = body.querySelector("img");
  if (img?.src) {
    bgImage = img.src;
    img.remove();
  }

  const audioSrcs = [];
  body.querySelectorAll(".compact-audio-player-wrapper").forEach((wrapper) => {
    const src = wrapper.querySelector("audio source")?.getAttribute("src");
    if (src) audioSrcs.push(src);
    wrapper.remove();
  });

  const textHtml = body.innerHTML
    .replace(/<div[^>]*>\s*<\/div>/g, "")
    .replace(/^(\s*<br\s*\/?>\s*)+/i, "")
    .replace(/(\s*<br\s*\/?>\s*)+$/i, "")
    .trim();

  return { bgImage, audioSrcs, textHtml };
};

// Step down from the user's fontSize class based on stripped text length.
const getAdaptiveFontClass = (baseClass, html) => {
  const text = (html || "").replace(/<[^>]*>/g, "").trim();
  const sizes = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"];
  const idx = sizes.indexOf(baseClass);
  if (idx === -1) return baseClass;
  const stepDown = text.length > 200 ? 3 : text.length > 100 ? 2 : text.length > 40 ? 1 : 0;
  return sizes[Math.max(0, idx - stepDown)];
};

const TEXT_SHADOW = "2px 2px 6px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)";

// Renders one side of the card (front or back) consistently:
// image as full-panel background, audio as small corner buttons, text centered.
const CardSide = ({ parsed, fontClass, isVisible, globalTextShadow, fitToCard }) => {
  const { bgImage, textHtml } = parsed;
  const containerRef = useRef(null);
  const textRef = useRef(null);

  // Binary-search the largest px font-size where content fits the card.
  const doFit = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    const plainText = (textHtml || "").replace(/<[^>]*>/g, "").trim();
    if (!plainText) return;

    let lo = 8, hi = 96, best = 8;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (el.scrollHeight <= el.offsetHeight && el.scrollWidth <= el.offsetWidth) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    el.style.fontSize = `${Math.floor(best)}px`;
  }, [textHtml]);

  // Re-fit when content changes, visibility changes (back side flip), or feature toggled.
  useEffect(() => {
    if (!fitToCard) {
      if (textRef.current) textRef.current.style.fontSize = "";
      return;
    }
    doFit();
  }, [fitToCard, doFit, isVisible]);

  // Re-fit when card dimensions change (grid size / aspect ratio).
  useEffect(() => {
    if (!fitToCard || !containerRef.current) return;
    const observer = new ResizeObserver(doFit);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitToCard, doFit]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 flex items-center justify-center transition-all duration-300 overflow-hidden ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
      } ${bgImage ? "bg-cover bg-center bg-no-repeat" : "p-6"}`}
      style={bgImage ? { backgroundImage: `url("${bgImage}")` } : {}}
    >
      {bgImage && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

      <div
        ref={textRef}
        className={`relative z-10 text-center px-4 w-full max-h-full leading-relaxed overflow-hidden ${fitToCard ? "" : fontClass} ${
          bgImage ? "text-white" : "text-gray-800 dark:text-gray-100"
        }`}
        dangerouslySetInnerHTML={{ __html: textHtml }}
        style={bgImage ? { textShadow: TEXT_SHADOW } : globalTextShadow}
      />
    </div>
  );
};

const NoteCard = ({ note }) => {
  const getActiveView = useStore((state) => state.getActiveView);
  const activeView = getActiveView();
  const fontSize = useStore((state) => state.settings?.fontSize || "medium");
  const gridSize = useStore((state) => state.settings?.gridSize || "medium");
  const aspectRatio = useStore((state) => state.settings?.aspectRatio || "square");
  const fitToCard = useStore((state) => state.settings?.fitToCard || false);
  const editMode = useStore((state) => state.editMode);
  const selectedNoteIds = useStore((state) => state.selectedNoteIds);
  const toggleNoteSelection = useStore((state) => state.toggleNoteSelection);
  const isSelected = selectedNoteIds.includes(note.note_id);

  // Global image/audio feature (loaded from a specific settings field, separate from template content)
  const [backgroundImage, setBackgroundImage] = useState("");
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioData, setAudioData] = useState("");

  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSimilarWords, setShowSimilarWords] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const [parsedFront, setParsedFront] = useState(EMPTY_PARSED);
  const [parsedBack, setParsedBack] = useState(EMPTY_PARSED);

  const cardRef = useRef(null);
  const audioRef = useRef(null);

  const showImages = activeView?.settings?.showImages || false;
  const imageField = activeView?.settings?.imageField || "";
  const showAudio = activeView?.settings?.showAudio || false;
  const audioField = activeView?.settings?.audioField || "";
  const similarWordsConfig = activeView?.similarWords || null;
  const similarWordsEnabled = similarWordsConfig?.enabled && similarWordsConfig?.wordField;
  const examplesConfig = activeView?.examples || null;
  const examplesEnabled = examplesConfig?.enabled && examplesConfig?.wordField && examplesConfig?.deck && examplesConfig?.sentenceField;

  const fontSizeClass = getFontSizeClass(fontSize);
  const cardDimensionClasses = getCardDimensionClasses(gridSize, aspectRatio);

  const cardHasBg = showImages && backgroundImage;
  const globalTextShadow = cardHasBg
    ? { textShadow: "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)" }
    : {};

  const isFlippedRef = useRef(false);
  const backMediaLoadedRef = useRef(false);

  // Pass 1: instant text-only render so cards appear immediately.
  // Pass 2: load media for front in background, then back on first flip.
  useEffect(() => {
    if (!activeView || !note.fields) return;

    isFlippedRef.current = false;
    backMediaLoadedRef.current = false;

    const frontTemplate = activeView.frontFields.map((f) => `{${f}}`).join("<br>");
    const backTemplate = activeView.backFields.map((f) => `{${f}}`).join("<br>");

    let cancelled = false;

    const run = async () => {
      // --- Pass 1: text only, no network calls ---
      try {
        const [textFront, textBack] = await Promise.all([
          templateProcessor.processTemplate(frontTemplate, note.fields, {
            showAfterFields: false,
            isGameTemplate: false,
            skipMedia: true,
          }),
          templateProcessor.processTemplate(backTemplate, note.fields, {
            showAfterFields: true,
            isGameTemplate: false,
            skipMedia: true,
          }),
        ]);
        if (cancelled) return;
        const front = textFront || getFallbackContent(note.fields);
        const back = textBack || textFront;
        setParsedFront(parseCardContent(front));
        setParsedBack(parseCardContent(back));
      } catch (err) {
        logger.error("Failed text-only render:", err);
      }

      // --- Pass 2: load media for front ---
      try {
        const richFront = await templateProcessor.processTemplate(frontTemplate, note.fields, {
          showAfterFields: false,
          isGameTemplate: false,
          skipMedia: false,
        });
        if (cancelled) return;
        setParsedFront(parseCardContent(richFront || getFallbackContent(note.fields)));
      } catch (err) {
        logger.error("Failed media render for front:", err);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [activeView, note.fields]);

  // Load back media lazily on first flip
  const loadBackMedia = useCallback(async () => {
    if (backMediaLoadedRef.current || !activeView || !note.fields) return;
    backMediaLoadedRef.current = true;
    const backTemplate = activeView.backFields.map((f) => `{${f}}`).join("<br>");
    try {
      const richBack = await templateProcessor.processTemplate(backTemplate, note.fields, {
        showAfterFields: true,
        isGameTemplate: false,
        skipMedia: false,
      });
      setParsedBack(parseCardContent(richBack || getFallbackContent(note.fields)));
    } catch (err) {
      logger.error("Failed media render for back:", err);
    }
  }, [activeView, note.fields]);

  const handleMouseEnter = async () => {
    if (editMode) return; // no hover effects in edit mode
    setIsHovered(true);

    if (showImages && imageField && note.fields && !isLoadingImage && !backgroundImage) {
      const filename = extractImageFilename(extractFieldValue(note.fields[imageField]));
      if (filename && isValidFilename(filename)) {
        setIsLoadingImage(true);
        try {
          let b64 = await mediaCacheService.getCachedMedia(filename);
          if (!b64) {
            b64 = await ankiConnect.retrieveMediaFile(filename);
            if (b64) await mediaCacheService.setCachedMedia(filename, b64);
          }
          if (b64 && cardRef.current) {
            const url = createBackgroundImageUrl(b64, getImageMimeType(filename));
            setBackgroundImage(url);
            cardRef.current.style.backgroundImage = url;
          }
        } catch (err) {
          logger.error("Failed to load image:", err);
        } finally {
          setIsLoadingImage(false);
        }
      }
    }

    if (showAudio && audioField && note.fields && !isLoadingAudio && !audioData) {
      const filename = extractAudioFilename(extractFieldValue(note.fields[audioField]));
      if (filename && isValidFilename(filename)) {
        setIsLoadingAudio(true);
        try {
          let b64 = await mediaCacheService.getCachedMedia(filename);
          if (!b64) {
            b64 = await ankiConnect.retrieveMediaFile(filename);
            if (b64) await mediaCacheService.setCachedMedia(filename, b64);
          }
          if (b64) setAudioData(createMediaDataUrl(b64, getAudioMimeType(filename)));
        } catch (err) {
          logger.error("Failed to load audio:", err);
        } finally {
          setIsLoadingAudio(false);
        }
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsFlipped(false);
    if (cardRef.current && backgroundImage) {
      cardRef.current.style.backgroundImage = "";
      setBackgroundImage("");
    }
    setAudioData("");
  };

  const handleCardClick = (e) => {
    if (e.target.closest("button") || e.target.closest("audio")) return;
    if (editMode) {
      toggleNoteSelection(note.note_id);
      return;
    }
    setIsFlipped((prev) => {
      const next = !prev;
      if (next) loadBackMedia();
      return next;
    });
  };

  const frontFontClass = getAdaptiveFontClass(fontSizeClass, parsedFront.textHtml);
  const backFontClass = getAdaptiveFontClass(fontSizeClass, parsedBack.textHtml);

  return (
    <article className={`card-container shrink-0 ${editMode ? "cursor-pointer" : "cursor-pointer"}`}>
      <div
        ref={cardRef}
        className={`${cardDimensionClasses} relative bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 border overflow-hidden ${
          showImages ? "bg-no-repeat bg-center bg-cover" : ""
        } ${
          editMode && isSelected
            ? "border-blue-500 ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 shadow-xl"
            : editMode
            ? "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
            : "border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-600"
        }`}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        aria-label={`Flashcard: ${
          parsedFront.textHtml?.substring(0, 50).replace(/<[^>]*>/g, "") || "No content"
        }`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped((prev) => {
              const next = !prev;
              if (next) loadBackMedia();
              return next;
            });
          }
        }}
      >
        {/* Edit mode: selection overlay + checkbox */}
        {editMode && (
          <>
            {isSelected && (
              <div className="absolute inset-0 bg-blue-500/10 pointer-events-none z-20" />
            )}
            <div className="absolute top-2 left-2 z-20">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm transition-all ${
                  isSelected
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white/90 dark:bg-gray-800/90 border-gray-400 dark:border-gray-500"
                }`}
              >
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </div>
            </div>
          </>
        )}

        <CardSide
          parsed={parsedFront}
          fontClass={frontFontClass}
          isVisible={!isFlipped}
          globalTextShadow={globalTextShadow}
          fitToCard={fitToCard}
        />
        <CardSide
          parsed={parsedBack}
          fontClass={backFontClass}
          isVisible={isFlipped}
          globalTextShadow={globalTextShadow}
          fitToCard={fitToCard}
        />

        {/* Top-right: similar words + info buttons */}
        {isHovered && !editMode && (
          <div className="absolute top-2 right-2 flex gap-2 z-20">
            {examplesEnabled && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowExamples(true); }}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                title="Example sentences"
                aria-label="Show example sentences"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </button>
            )}
            {similarWordsEnabled && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowSimilarWords(true); }}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                title="Similar words"
                aria-label="Show similar words"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfoModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
              title="Card information"
              aria-label="View card information"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </button>
          </div>
        )}

        {/* Bottom: side badge + audio + flip button */}
        {isHovered && !editMode && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isFlipped ? "bg-purple-600/80 text-white" : "bg-gray-600/70 text-gray-100"
              }`}
            >
              {isFlipped ? "Back" : "Front"}
            </span>

            <div className="flex items-center gap-1">
              {/* Template-extracted audio for current side */}
              {(isFlipped ? parsedBack : parsedFront).audioSrcs.map((src, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); new Audio(src).play().catch((err) => logger.error("Audio play failed:", err)); }}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                  title="Play audio"
                  aria-label="Play audio"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              ))}
              {/* Global audio field */}
              {showAudio && audioData && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioRef.current?.play().catch((err) => logger.error("Audio play failed:", err));
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                    title="Play audio"
                    aria-label="Play audio"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <audio ref={audioRef} src={audioData} preload="metadata" aria-label="Card audio" />
                </>
              )}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setIsFlipped((prev) => { const next = !prev; if (next) loadBackMedia(); return next; }); }}
              className={`rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 text-white ${
                isFlipped ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-600 hover:bg-gray-700"
              }`}
              title={isFlipped ? "Show front" : "Show back"}
              aria-label={isFlipped ? "Flip to front" : "Flip to back"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}

        {/* Loading spinners */}
        {isLoadingImage && (
          <div className="absolute top-2 left-2 z-20">
            <svg className="animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
        {isLoadingAudio && (
          <div className="absolute top-2 left-8 z-20">
            <svg className="animate-spin w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        <div className="absolute inset-0 bg-linear-gradient-to-br from-transparent via-transparent to-gray-50/20 dark:to-gray-900/20 pointer-events-none" />
      </div>

      <CardInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        note={note}
      />

      {similarWordsEnabled && showSimilarWords && (
        <SimilarWordsModal
          isOpen={showSimilarWords}
          onClose={() => setShowSimilarWords(false)}
          note={note}
          config={{
            deck: similarWordsConfig.deck || activeView.deck,
            noteType: similarWordsConfig.noteType || activeView.noteType,
            wordField: similarWordsConfig.wordField,
            pronunciationField: similarWordsConfig.pronunciationField,
            translationField: similarWordsConfig.translationField,
          }}
        />
      )}

      {examplesEnabled && showExamples && (
        <ExamplesModal
          isOpen={showExamples}
          onClose={() => setShowExamples(false)}
          note={note}
          config={{
            deck: examplesConfig.deck,
            noteType: examplesConfig.noteType || "",
            wordField: examplesConfig.wordField,
            sentenceField: examplesConfig.sentenceField,
            pronunciationField: examplesConfig.pronunciationField || "",
            meaningField: examplesConfig.meaningField || "",
            audioField: examplesConfig.audioField || "",
            imageField: examplesConfig.imageField || "",
          }}
        />
      )}
    </article>
  );
};

export default NoteCard;
