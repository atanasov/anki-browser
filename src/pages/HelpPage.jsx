/**
 * HelpPage
 * In-app help with accordion sections and screenshot placeholders.
 * Drop screenshot images into public/screenshots/ and update the src paths below.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Screenshot = ({ src, alt }) => (
  <div className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
    {src ? (
      <img src={src} alt={alt} className="w-full h-auto" />
    ) : (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-500 italic">
        Screenshot: {alt}
      </div>
    )}
  </div>
);

const Section = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
          {children}
        </div>
      )}
    </div>
  );
};

const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help</h1>
      </div>

      <div className="space-y-2">

        {/* ── Getting Started ── */}
        <Section title="Getting Started">
          <p>Before using Anki Browser, make sure <strong>Anki Desktop</strong> is open and the <strong>AnkiConnect</strong> add-on is installed and running.</p>
          <Screenshot src={null} alt="Anki Desktop with AnkiConnect running" />
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Open Anki Browser in your browser (or as a PWA).</li>
            <li>Click <strong>+ New View</strong> in the top bar to create your first view.</li>
            <li>Pick a deck and note type, then choose which fields appear on the front and back of each card.</li>
            <li>Save — your cards will load in the grid.</li>
          </ol>
          <Screenshot src={null} alt="Create View modal — picking deck and fields" />
        </Section>

        {/* ── Card Browser ── */}
        <Section title="Card Browser">
          <p>Cards display in a responsive grid. Click any card to flip between front and back. Images are shown as full card backgrounds; audio plays on hover.</p>
          <Screenshot src={null} alt="Card browser grid with cards face-up" />
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Search bar</strong> — quick text filter across visible cards.</li>
            <li><strong>Advanced Query</strong> — opens a query builder for full Anki search syntax (tags, flags, due dates, etc.).</li>
            <li><strong>Card info button</strong> — click the <em>ℹ</em> icon on any card to see all fields, tags, and note details.</li>
          </ul>
          <Screenshot src={null} alt="Advanced query builder open" />
        </Section>

        {/* ── Practice Mode ── */}
        <Section title="Practice Mode">
          <p>Click <strong>▶ Practice</strong> to enter selection mode, then click cards you want to include (or select all). Hit <strong>Start Practice</strong> to open the setup dialog.</p>
          <Screenshot src={null} alt="Practice selection mode — cards highlighted" />
          <p>Choose one or more exercise types:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Word ↔ Meaning</strong> and <strong>Word ↔ Pronunciation</strong> — multiple choice</li>
            <li><strong>Sentence → Word</strong> — pick the correct word from a sentence context</li>
            <li><strong>Multi-step Drill</strong> — self-rate pronunciation then meaning in sequence</li>
            <li><strong>Typing exercises</strong> — type the translation or the original word</li>
            <li><strong>Mixed</strong> — all types combined</li>
          </ul>
          <Screenshot src={null} alt="Practice setup modal — exercise type checkboxes" />
          <p>During the session, each answer is tracked. Correct streaks clear weakness tags; wrong answers add <code>weak::</code> tags to the card in Anki automatically.</p>
          <Screenshot src={null} alt="Active practice session — multiple choice question" />
        </Section>

        {/* ── Practice Results & Weak Words ── */}
        <Section title="Practice Results & Weak Words">
          <p>At the end of a session you get a summary of missed words and a confusion report showing which words you mixed up.</p>
          <Screenshot src={null} alt="End-of-session results screen" />
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Retry weak words</strong> — restart the session with only the cards you got wrong.</li>
            <li><strong>Pair Drill</strong> — focused drill on confused word pairs side by side.</li>
            <li>Card flags are set automatically at session end: red (high weakness), orange (medium), clear (none).</li>
          </ul>
          <Screenshot src={null} alt="Confusion report and Pair Drill" />
        </Section>

        {/* ── Similar Words ── */}
        <Section title="Similar Words">
          <p>Open the <strong>Similar Words</strong> popup from the card info panel to see cards in your deck that share characters with the current word. Results are grouped by shared character in columns.</p>
          <Screenshot src={null} alt="Similar Words popup" />
          <p>Use the <strong>Studied only</strong> toggle (on by default) to limit results to cards you have already reviewed.</p>
        </Section>

        {/* ── Example Sentences ── */}
        <Section title="Example Sentences">
          <p>Open the <strong>Example Sentences</strong> popup to search a configured deck for sentences containing the current card's word. Each result shows the sentence, pronunciation, meaning, and any image or audio.</p>
          <Screenshot src={null} alt="Example Sentences popup" />
          <p>Configure which deck to search in <strong>Settings → Example sentences deck</strong>.</p>
        </Section>

        {/* ── Edit Mode ── */}
        <Section title="Edit Mode (Bulk Editing)">
          <p>Click <strong>✎ Edit</strong> in the top bar to enter edit mode. Select cards by clicking them, then use the toolbar that appears at the bottom.</p>
          <Screenshot src={null} alt="Edit mode with cards selected and toolbar visible" />
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Add tag</strong> — adds a tag to all selected cards in Anki.</li>
            <li><strong>Remove tag</strong> — removes a tag from all selected cards.</li>
            <li><strong>Suspend / Unsuspend</strong> — toggles card suspension.</li>
          </ul>
        </Section>

        {/* ── Display & Settings ── */}
        <Section title="Display & Settings">
          <p>Open the <strong>Settings</strong> menu (gear icon) to adjust:</p>
          <Screenshot src={null} alt="Settings panel open" />
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>UI Scale</strong> — zooms the entire interface (85 %–135 %).</li>
            <li><strong>Card size & aspect ratio</strong> — Small / Medium / Large grid; Square / Portrait / Landscape.</li>
            <li><strong>Card font size</strong> — per-view font size, or <em>Fit to card</em> auto-sizing.</li>
            <li><strong>Practice Q&A size</strong> — font size for practice prompts and answers.</li>
            <li><strong>Theme</strong> — Light / Dark / System (follows OS preference).</li>
            <li><strong>AnkiConnect URL & token</strong> — change if you run Anki on a different host or with auth.</li>
            <li><strong>Media cache duration</strong> — how long images and audio are cached locally (default 24 h).</li>
            <li><strong>Import / Export</strong> — back up or restore all views and settings as JSON.</li>
          </ul>
        </Section>

      </div>

    </div>
  );
};

export default HelpPage;
