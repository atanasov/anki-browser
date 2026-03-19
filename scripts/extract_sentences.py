#!/usr/bin/env python3
# cspell:ignore ankiconnect notetypes notesinfo
"""
extract_sentences.py

Copies sentence fields from every note in the "Mandarin-Vocabulary" deck
(note type: HSK) into the "Mandarin-Sentences" deck (note type: HSK Sentences).

Source note type  : HSK            (deck: Mandarin-Vocabulary)
Target note type  : HSK Sentences  (deck: Mandarin-Sentences)

Field mapping (all fields in HSK Sentences exist verbatim in HSK):
  Key
  SentenceSimplified     ← primary field; notes with empty value are skipped
  SentenceTraditional
  SentenceSimplifiedCloze
  SentenceTraditionalCloze
  SentencePinyin.1
  SentencePinyin.2
  SentenceMeaning
  SentenceAudio
  SentenceImage

Requirements:
  - Anki Desktop must be running
  - AnkiConnect add-on installed (code: 2055492159)

Usage:
  python3 extract_sentences.py
"""

import json
import re
import sys
import urllib.request
from html.parser import HTMLParser

# ── Settings ──────────────────────────────────────────────────────────────────

CONNECT_URL    = "http://localhost:8765"
API_KEY        = ""   # leave empty if no AnkiConnect API key is set

SOURCE_DECK    = "Mandarin-Vocabulary"
SOURCE_MODEL   = "HSK"

TARGET_DECK    = "Mandarin-Sentences"
TARGET_MODEL   = "HSK Sentences"

# Fields to copy — must match field names in both note types exactly.
# Order follows the HSK Sentences note type definition.
COPY_FIELDS = [
    "Key",
    "SentenceSimplified",        # primary: notes missing this are skipped
    "SentenceTraditional",
    "SentenceSimplifiedCloze",
    "SentenceTraditionalCloze",
    "SentencePinyin.1",
    "SentencePinyin.2",
    "SentenceMeaning",
    "SentenceAudio",
    "SentenceImage",
]

PRIMARY_FIELD  = "SentenceSimplified"
BATCH_SIZE     = 500   # notes per notesInfo request

# ── AnkiConnect helpers ───────────────────────────────────────────────────────

def anki(action: str, **params) -> object:
    body: dict = {"action": action, "version": 6, "params": params}
    if API_KEY:
        body["key"] = API_KEY
    payload = json.dumps(body).encode()
    req = urllib.request.Request(
        CONNECT_URL, data=payload, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            resp = json.loads(r.read())
    except Exception as exc:
        print(f"\n[ERROR] Cannot reach AnkiConnect at {CONNECT_URL}: {exc}")
        print("Make sure Anki is running and the AnkiConnect add-on is installed.")
        sys.exit(1)
    if resp.get("error"):
        raise RuntimeError(resp["error"])
    return resp["result"]


def find_notes(query: str) -> list[int]:
    return anki("findNotes", query=query)


def notes_info(ids: list[int]) -> list[dict]:
    return anki("notesInfo", notes=ids) if ids else []


# ── HTML → plain text (for dedup comparison only) ────────────────────────────

class _Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._buf: list[str] = []

    def handle_data(self, data: str):
        self._buf.append(data)

    def plain(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self._buf)).strip()


def plain(html: str) -> str:
    s = _Stripper()
    s.feed(html)
    return s.plain()


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=== Sentence Extractor ===")
    version = anki("version")
    print(f"AnkiConnect v{version}\n")

    print(f"Source : deck='{SOURCE_DECK}'  model='{SOURCE_MODEL}'")
    print(f"Target : deck='{TARGET_DECK}'  model='{TARGET_MODEL}'")
    print(f"Fields : {COPY_FIELDS}\n")

    # Ensure target deck exists (no-op if already there)
    anki("createDeck", deck=TARGET_DECK)

    # Load existing sentences from target deck for deduplication
    print("Loading existing sentences from target deck...")
    existing_ids    = find_notes(f'deck:"{TARGET_DECK}"')
    existing_notes  = notes_info(existing_ids)
    existing: set[str] = {
        plain(n["fields"].get(PRIMARY_FIELD, {}).get("value", ""))
        for n in existing_notes
    }
    existing.discard("")
    print(f"  {len(existing)} note(s) already present.\n")

    # Fetch all source notes
    query = f'deck:"{SOURCE_DECK}" note:"{SOURCE_MODEL}"'
    print(f"Searching: {query}")
    source_ids = find_notes(query)
    print(f"  {len(source_ids)} note(s) found.\n")

    if not source_ids:
        print("Nothing to do.")
        return

    added = skipped_dupe = skipped_empty = 0

    for batch_start in range(0, len(source_ids), BATCH_SIZE):
        batch = source_ids[batch_start : batch_start + BATCH_SIZE]
        for note in notes_info(batch):
            src = note.get("fields", {})

            # Build target fields — missing source fields become ""
            fields: dict[str, str] = {
                f: (src.get(f) or {}).get("value", "")
                for f in COPY_FIELDS
            }

            # Skip if primary sentence field is empty
            primary_text = plain(fields[PRIMARY_FIELD])
            if not primary_text:
                skipped_empty += 1
                continue

            # Skip duplicates
            if primary_text in existing:
                skipped_dupe += 1
                continue

            # Add note
            new_note = {
                "deckName":  TARGET_DECK,
                "modelName": TARGET_MODEL,
                "fields":    fields,
                "options": {
                    "allowDuplicate": False,
                    "duplicateScope": "collection",
                },
                "tags": ["extracted"],
            }
            try:
                result = anki("addNote", note=new_note)
                if result:
                    existing.add(primary_text)
                    added += 1
                    label = primary_text[:80] + ("…" if len(primary_text) > 80 else "")
                    print(f"  + {label}")
                else:
                    skipped_dupe += 1
            except RuntimeError as exc:
                if "duplicate" in str(exc).lower():
                    skipped_dupe += 1
                else:
                    print(f"  [WARN] {exc}  —  skipping note {note.get('noteId')}")

    print(f"""
=== Done ===
  Added           : {added}
  Skipped (dupe)  : {skipped_dupe}
  Skipped (empty) : {skipped_empty}

Open Anki → '{TARGET_DECK}' to review the new cards.
""")


if __name__ == "__main__":
    main()
