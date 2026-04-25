<div align="center">
  <img src="public/favicon.svg" alt="Anki Browser Logo" width="120" height="120">

# Anki Browser

**Browse and study your Anki cards in a beautiful web interface**

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

A client-only PWA that connects to your local Anki Desktop and lets you browse flashcards in a visual grid — with flip-to-reveal, image backgrounds, audio playback, and bulk editing. No server, no accounts, no tracking.

> **Requires:** Anki Desktop with the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on running.

![Card Browser](public/screenshots/card-browser.png)

## Features

**Card Browser** — Browse cards in a responsive grid. Click to flip front/back. Filter by flag, card status, tags, or saved words. Hover any card to reveal example sentences, similar words, and card info buttons.

**Practice Mode** — 9 exercise types: Word↔Meaning, Word↔Pronunciation, Sentence→Word (cloze), Word→Translation (type), Translation→Word (type), Sentence→Translation (type), and Dictation. Each session tracks wrong answers and writes `weak::` tags back to Anki. End-of-session confusion report with a focused Pair Drill for mixed-up words.

**Saved Words** — Bookmark icon in the header opens a personal word list. Add words manually or press `S` during practice to save selected text. Status dots show whether each word is found in Anki.

**Similar Words** — Popup showing cards that share characters with the current word, grouped by shared character. Great for contrast practice.

**Example Sentences** — Popup searching a configured deck for sentences containing the current word, with audio and image support.

**Edit Mode** — Select multiple cards and bulk-add/remove tags or suspend/unsuspend in Anki.

**Display options** — Global UI scale, card grid size and aspect ratio, per-view font sizes, dark/light/system theme.

**Data** — Import/export all views and settings as JSON. Media (images, audio) cached locally. Installable as a PWA.

## How it works

1. **Create a View** — Pick a deck and note type, choose fields for front and back
2. **Browse** — Cards load in a grid; click to flip, search and filter to find what you need
3. **Practice** — Select cards, choose exercise types, and track weaknesses automatically
4. **Edit** — Enable Edit Mode to select cards and bulk-edit tags or suspend them

## Contributing

Issues and pull requests welcome.

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
  Made with ❤️ for language learners
</div>
