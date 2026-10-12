# Guitar Sheet Lab — Visual Editor (Prototype)

A Next.js/TypeScript UI that consumes **the existing five extractor JSON outputs** for two sample PDFs and presents editable song data.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What it does
- Switch between two provided samples and five extractor methods.
- Melody mode: heuristic bar grouping, editable bar numbers/sections, guitar string (1–6), fret, beat and duration; six-line preview.
- Chords mode: editable section, chord text and lyric text per extracted row.
- View raw tokens, import extracted JSON or a previously exported edited song, export corrections as JSON.
- No API keys, backend, AI calls or database writes.

## Important limitations
- **The heuristic is NOT a validated transcription**. Time signature remains blank and beat/duration are `null` until reviewed. Visual line numbering is approximate. Source coordinates are retained in note records.
- Source PDF line art is not included in the extractor outputs, so identifying exact tablature strings, measures and durations requires a stronger layout parser and original PDF comparison.
- `pypdf_layout` has no token coordinates, so melody bar detection may return no bars. You can add bars manually.
- Chord extraction preserves candidate rows, but not accurate chord-to-lyric character alignment. Correct it in the editor.
- Import JSON expects an array of `{text,x,y,page}` tokens or an exported Song JSON; PDFs and images are **not** accepted directly yet.
- Changes are in React state. **Export JSON before switching sample/method or refreshing**.
- To avoid accidentally implying reliable PDF interpretation, no automatic time-signature guess is made.

## Future work
Source-PDF overlay, coordinate-based string-line detection, timing editor, persisted revisions, Supabase storage, YouTube sync.


### V3: per-bar lyrics / teacher notes
Each melody bar now has an optional editable multiline `lyrics` field, saved in exported JSON. Existing imported songs without `lyrics` are migrated in memory to empty text. This does not change the PDF extraction or note recognition. PDF-based automatic lyric-to-bar association is not implemented yet.
