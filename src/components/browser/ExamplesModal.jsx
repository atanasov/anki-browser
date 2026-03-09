/**
 * Examples Modal
 * Shows sentences from a configured deck that contain the current card's word.
 * Searched via AnkiConnect wildcard: sentenceField:*word*
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Modal from "../common/Modal";
import ankiConnect from "../../services/ankiConnect";
import { extractFieldValue } from "../../utils/fieldHelpers";
import {
  extractAudioFilename,
  extractImageFilename,
  isValidFilename,
  getAudioMimeType,
  getImageMimeType,
  createMediaDataUrl,
} from "../../utils/mediaHelpers";
import mediaCacheService from "../../services/mediaCache";
import logger from "../../utils/logger";

const stripHtml = (html) => (html || "").replace(/<[^>]*>/g, "").trim();
const stripCloze = (text) =>
  text.replace(/\{\{c\d+::([^:}]+)(?:::[^}]*)?\}\}/g, "$1");
const clean = (html) => stripCloze(stripHtml(html));

async function loadMedia(raw, extractFn, mime) {
  const filename = extractFn(raw);
  if (!filename || !isValidFilename(filename)) return null;
  let b64 = await mediaCacheService.getCachedMedia(filename);
  if (!b64) {
    b64 = await ankiConnect.retrieveMediaFile(filename);
    if (b64) await mediaCacheService.setCachedMedia(filename, b64);
  }
  return b64 ? createMediaDataUrl(b64, mime(filename)) : null;
}

const SentenceRow = ({ note, config }) => {
  const [audioSrc, setAudioSrc] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const audioRef = useRef(null);

  const sentence      = clean(extractFieldValue(note.fields?.[config.sentenceField]));
  const pronunciation = config.pronunciationField ? clean(extractFieldValue(note.fields?.[config.pronunciationField])) : "";
  const meaning       = config.meaningField       ? clean(extractFieldValue(note.fields?.[config.meaningField]))       : "";
  const rawAudio      = config.audioField         ? extractFieldValue(note.fields?.[config.audioField])               : "";
  const rawImage      = config.imageField         ? extractFieldValue(note.fields?.[config.imageField])               : "";

  useEffect(() => {
    if (!rawAudio) return;
    let cancelled = false;
    loadMedia(rawAudio, extractAudioFilename, getAudioMimeType)
      .then((src) => { if (src && !cancelled) setAudioSrc(src); })
      .catch((e) => logger.error("ExamplesModal: audio load failed", e));
    return () => { cancelled = true; };
  }, [rawAudio]);

  useEffect(() => {
    if (!rawImage) return;
    let cancelled = false;
    loadMedia(rawImage, extractImageFilename, getImageMimeType)
      .then((src) => { if (src && !cancelled) setImageSrc(src); })
      .catch((e) => logger.error("ExamplesModal: image load failed", e));
    return () => { cancelled = true; };
  }, [rawImage]);

  if (!sentence) return null;

  return (
    <div className="flex gap-4 py-4 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          className="shrink-0 w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-5xl font-medium text-gray-900 dark:text-gray-100 leading-snug">
          {sentence}
        </p>
        {pronunciation && (
          <p className="text-3xl text-blue-600 dark:text-blue-400 mt-1">{pronunciation}</p>
        )}
        {meaning && (
          <p className="text-3xl text-gray-500 dark:text-gray-400 mt-0.5 truncate">{meaning}</p>
        )}
      </div>

      {audioSrc && (
        <div className="shrink-0 flex items-center">
          <button
            onClick={() => audioRef.current?.play().catch((e) => logger.error("ExamplesModal: play failed", e))}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 shadow transition-colors"
            title="Play audio"
            aria-label="Play sentence audio"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <audio ref={audioRef} src={audioSrc} preload="none" aria-label="Sentence audio" />
        </div>
      )}
    </div>
  );
};

const ExamplesModal = ({ isOpen, onClose, note, config }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const word = stripHtml(extractFieldValue(note?.fields?.[config?.wordField])).trim();

  const fetchExamples = useCallback(async () => {
    if (!word || !config?.deck || !config?.sentenceField) return;
    setLoading(true);
    setError(null);
    try {
      let query = `deck:"${config.deck}" ${config.sentenceField}:*${word}*`;
      if (config.noteType) query += ` note:"${config.noteType}"`;
      const ids = await ankiConnect.findNotes(query);
      setResults(ids?.length ? await ankiConnect.getNotesInfo(ids) : []);
    } catch (err) {
      logger.error("ExamplesModal: fetch failed", err);
      setError("Failed to fetch examples. Make sure Anki is running.");
    } finally {
      setLoading(false);
    }
  }, [word, config]);

  useEffect(() => {
    if (!isOpen || !word) return;
    fetchExamples();
  }, [isOpen, word, fetchExamples]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Examples: ${word}`} maxWidth="max-w-4xl">
      <div className="space-y-2">
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : !word ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No word found — check the Word Field setting in your view.
          </p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No examples found for <strong>{word}</strong>.
          </p>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto -mx-1 px-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              {results.length} example{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((n) => (
              <SentenceRow key={n.noteId} note={n} config={config} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExamplesModal;
