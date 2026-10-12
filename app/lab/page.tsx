"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Token, Geometry, Bar, Song } from "@/types/guitar";
import { normalize } from "@/lib/extraction/shared/normalize";
import { makeSong } from "@/lib/extraction/makeSong";
import ChordEditor from "@/components/chords/ChordEditor";
import MelodyEditor from "@/components/melody/MelodyEditor";
import { useSearchParams } from "next/navigation";
import { MELODY_SAMPLES, MELODY_EXTRACTORS } from "@/lib/melody/constants";
import { CHORD_SAMPLES } from "@/lib/chords/constants";
import { saveSong } from "@/lib/supabase/saveSong";
import {
  loadLibrarySongs,
  loadLibrarySong,
  type LibrarySong,
} from "@/lib/supabase/loadSongs";
import * as pdfjsLib from "pdfjs-dist";

import {
  extractPdfLines,
  detectTabGeometry,
} from "@/lib/extraction/melody/extractPdfGeometry";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const methods = MELODY_EXTRACTORS;

const files = [...MELODY_SAMPLES, ...CHORD_SAMPLES];

//const uid = () => Math.random().toString(36).slice(2, 10);

function download(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LabEditor() {
  const searchParams = useSearchParams();
  const [fileIdx, setFileIdx] = useState(0);
  const [method, setMethod] = useState(methods[0]);
  const [song, setSong] = useState<Song | null>(null);
  const [savedSongId, setSavedSongId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState<Token[]>([]);
  const [geometry, setGeometry] = useState<Geometry[]>([]);
  const [view, setView] = useState<"editor" | "source">("editor");
  const [librarySongs, setLibrarySongs] = useState<LibrarySong[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [pdfMode, setPdfMode] = useState<"melody" | "chords">("melody");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  function clearPdf() {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
    }

    pdfUrlRef.current = null;
    setPdfUrl(null);
  }

  function selectComparisonPdf(file: File) {
    const url = URL.createObjectURL(file);

    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
    }

    pdfUrlRef.current = url;
    setPdfUrl(url);
  }

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  async function load(index = fileIdx, m = method) {
    setBusy(true);
    setError("");
    setSavedSongId(null);
    setSelectedLibraryId("");
    setSaveMessage("");
    try {
      const file = files[index];
      const res = await fetch(`/samples/${file.key}__${m}.json`);
      if (!res.ok) throw Error("Sample not found");
      const data = await res.json();
      const tokens = normalize(data);
      setRaw(tokens);
      const regions: Geometry[] =
        file.mode === "melody"
          ? await fetch("/samples/7_Years_1__geometry.json").then((r) =>
              r.json(),
            )
          : [];
      setGeometry(regions);
      if (
        file.mode === "melody" &&
        tokens.every((t) => t.x === null || t.y === null)
      )
        throw Error(
          "This extractor has no page coordinates. Choose PyMuPDF, pdfplumber, pdfminer, or Poppler for bar reconstruction.",
        );
      setSong(makeSong(data, m, file, regions));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const sampleKey = searchParams.get("sample");
    const mode = searchParams.get("mode");

    let index = files.findIndex((file) => file.key === sampleKey);

    if (index === -1) {
      index = files.findIndex((file) => file.mode === mode);
    }

    if (index === -1) index = 0;

    setFileIdx(index);
    load(index, methods[0]);
  }, [searchParams]);

  function updateSong(fn: (s: Song) => Song) {
    setSong((s) => (s ? fn(s) : s));
  }

  async function handleSave(asNew: boolean) {
    if (!song || saving) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const id = await saveSong(song, asNew ? null : savedSongId);

      setSavedSongId(id);
      setSelectedLibraryId(id);
      await refreshLibrary();
      setSaveMessage(
        asNew || !savedSongId
          ? "Song added to library!"
          : "Changes saved successfully!",
      );
    } catch (err) {
      setSaveMessage(
        "Save failed: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void refreshLibrary();
  }, []);

  async function refreshLibrary() {
    try {
      const songs = await loadLibrarySongs();
      setLibrarySongs(songs);
    } catch (err) {
      setError(
        "Could not load library: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  async function openLibrarySong(songId: string) {
    if (!songId) return;

    setLibraryBusy(true);
    setError("");
    setSaveMessage("");

    try {
      const loadedSong = await loadLibrarySong(songId);

      setSong(loadedSong);
      clearPdf();
      setEditorKey((value) => value + 1);
      setSavedSongId(songId);
      setSelectedLibraryId(songId);
      setRaw([]);
      setGeometry([]);
      setView("editor");
    } catch (err) {
      setError(
        "Could not open song: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setLibraryBusy(false);
    }
  }

  async function importPDF(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || pdfBusy) return;

    setPdfBusy(true);
    setBusy(true);
    setError("");
    setSaveMessage("");

    try {
      const buffer = await file.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      }).promise;

      const extracted: Token[] = [];
      const allGeometry: Geometry[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        // Detect tablature geometry for melody PDFs.
        if (pdfMode === "melody") {
          const pdfLines = await extractPdfLines(page, pageNumber);

          const detected = detectTabGeometry(pdfLines);

          allGeometry.push(...detected);
        }

        // Extract text and coordinates.
        const content = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) {
            continue;
          }

          const transform = pdfjsLib.Util.transform(
            viewport.transform,
            item.transform,
          );

          extracted.push({
            text: item.str,
            x: Number(transform[4].toFixed(2)),
            y: Number(transform[5].toFixed(2)),
            page: pageNumber,
          });
        }
      }

      if (extracted.length === 0) {
        throw new Error(
          "No embedded text found in this PDF. Scanned PDFs may require OCR.",
        );
      }

      if (pdfMode === "melody" && allGeometry.length === 0) {
        throw new Error(
          "No tablature bars detected. This PDF may use a different layout.",
        );
      }

      const reconstructed = makeSong(
        extracted,
        "pdfjs",
        {
          label: file.name.replace(/\.pdf$/i, ""),
          key: file.name,
          mode: pdfMode,
        },
        allGeometry,
      );
      if (reconstructed.mode === "melody") {
        reconstructed.bars = reconstructed.bars.map((bar, index) => ({
          ...bar,
          number: index + 1,
        }));
      }

      //these are debuggery
//       console.table(
//   allGeometry.slice(8, 12).map((g) => ({
//     bar: g.number,
//     page: g.page,
//     row: g.row,
//     x0: g.x0,
//     x1: g.x1,
//     top: g.top,
//     bottom: g.bottom,
//   })),
// );

// console.table(
//   extracted
//     .filter(
//       (t) =>
//         t.page === 1 &&
//         t.x !== null &&
//         t.y !== null &&
//         t.x >= 460 &&
//         t.x <= 785 &&
//         t.y >= 610 &&
//         t.y <= 750 &&
//         /^\d{1,2}$/.test(t.text.trim()),
//     )
//     .map((t) => ({
//       text: t.text,
//       x: t.x,
//       y: t.y,
//       page: t.page,
//     })),
// );
      // Replace the current editor content only after
      // extraction and reconstruction succeed.
      setSong(reconstructed);
      setRaw(extracted);
      setGeometry(allGeometry);
      selectComparisonPdf(file);

      // Check whether this song already exists in the library.
      const matchingSongs = librarySongs.filter(
        (item) =>
          item.title.trim().toLowerCase() ===
            reconstructed.title.trim().toLowerCase() &&
          item.song_type === reconstructed.mode,
      );

      if (matchingSongs.length > 0) {
        const updateExisting = window.confirm(
          `"${reconstructed.title}" already exists in your library.\n\n` +
            "OK = Update the existing song when you save.\n" +
            "Cancel = Import as a new song.",
        );

        if (updateExisting) {
          setSavedSongId(matchingSongs[0].id);
          setSelectedLibraryId(matchingSongs[0].id);
        } else {
          setSavedSongId(null);
          setSelectedLibraryId("");
        }
      } else {
        setSavedSongId(null);
        setSelectedLibraryId("");
      }

      setView("editor");
      setEditorKey((value) => value + 1);

      setSaveMessage(
        pdfMode === "melody"
          ? `PDF imported: ${reconstructed.bars.length} candidate bars. Review before saving.`
          : `PDF imported: ${reconstructed.chordLines.length} candidate chord lines. Review before saving.`,
      );
    } catch (err) {
      setError(
        "PDF import failed: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setPdfBusy(false);
      setBusy(false);
      event.target.value = "";
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSavedSongId(null);
    setSelectedLibraryId("");
    setSaveMessage("");
    try {
      const obj = JSON.parse(await f.text());
      if (obj?.bars && obj?.mode) {
        setSong({
          ...obj,
          bars: obj.bars.map((b: Bar) => ({ ...b, lyrics: b.lyrics ?? "" })),
        } as Song);
        setRaw([]);
      } else {
        const ts = normalize(obj);
        setRaw(ts);
        setSong(makeSong(obj, "uploaded JSON", files[fileIdx], geometry));
      }
      setError("");
    } catch (err) {
      setError("Import failed: " + String(err));
    }
    e.target.value = "";
  }
  const noteCount = song?.bars.reduce((n, b) => n + b.notes.length, 0) || 0;

  return (
    <main className="shell">
      <label>
        My Song Library
        <select
          value={selectedLibraryId}
          disabled={libraryBusy}
          onChange={(e) => {
            const id = e.target.value;
            if (id) {
              void openLibrarySong(id);
            }
          }}
        >
          <option value="">Choose saved song...</option>

          {librarySongs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
              {item.song_type === "melody" ? " 🎸" : " 🎵"}
            </option>
          ))}
        </select>
      </label>

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-800">
            {song?.title || "Visual music editor"}
          </h1>
          <p className="text-xs text-slate-500">
            {song?.mode === "chords" ? "Chords + lyrics" : "Melody + tablature"}
            {" · "}
            Editor
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!song || saving}
            onClick={() => handleSave(false)}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : savedSongId
                ? "Save Changes"
                : "Save to Library"}
          </button>

          {savedSongId && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
            >
              Save as New
            </button>
          )}
          <select
            aria-label="PDF song type"
            value={pdfMode}
            disabled={pdfBusy}
            onChange={(e) => setPdfMode(e.target.value as "melody" | "chords")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="melody">Melody PDF</option>
            <option value="chords">Chords PDF</option>
          </select>

          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {pdfBusy ? "Extracting PDF..." : "Import PDF"}

            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={pdfBusy}
              hidden
              onChange={importPDF}
            />
          </label>
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Import JSON
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={upload}
            />
          </label>

          <button
            type="button"
            disabled={!song}
            onClick={() => download("guitar-song-edited.json", song)}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export JSON ↓
          </button>
        </div>
      </header>
      {saveMessage && (
        <div role="status" className="notice mb-3">
          {saveMessage}
        </div>
      )}
      <section className="toolbar">
        <label>
          Example song
          <select
            value={fileIdx}
            onChange={(e) => {
              const i = Number(e.target.value);
              setFileIdx(i);
              load(i, method);
            }}
          >
            {files.map((f, i) => (
              <option value={i} key={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Extractor
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              load(fileIdx, e.target.value);
            }}
          >
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          View
          <select value={view} onChange={(e) => setView(e.target.value as any)}>
            <option value="editor">Visual editor</option>
            <option value="source">Raw extraction</option>
          </select>
        </label>
        <span className="hint">
          {busy
            ? "Loading…"
            : song
              ? `${song.mode === "melody" ? song.bars.length + " candidate bars · " + noteCount + " fret tokens" : song.chordLines.length + " candidate lines"}`
              : ""}
        </span>
      </section>
      {error && <div className="alert">{error}</div>}
      {song && (
        <>
          <section className="meta">
            <label>
              Song title
              <input
                value={song.title}
                onChange={(e) =>
                  updateSong((s) => ({ ...s, title: e.target.value }))
                }
              />
            </label>
            <label>
              Time signature <small>(verify manually)</small>
              <input
                placeholder="e.g. 4/4"
                value={song.timeSignature}
                onChange={(e) =>
                  updateSong((s) => ({ ...s, timeSignature: e.target.value }))
                }
              />
            </label>
            <label>
              Tempo BPM
              <input
                type="number"
                value={song.tempo ?? ""}
                onChange={(e) =>
                  updateSong((s) => ({
                    ...s,
                    tempo: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </label>
            <div className="mode">
              {song.mode === "melody" ? "♫ Melody tabs" : "♬ Chords + lyrics"}
            </div>
          </section>
          {song.mode === "melody" && (
            <div className="notice">
              Detected melody bars: {song.bars.length}. Verify the bars, fret
              numbers and string assignments before saving.
            </div>
          )}
          <div className="notice">
            ⚠ Extractor output is a <b>draft</b>. Bar grouping, string
            assignments, chord alignment and timing have NOT been verified.
            Blank time signature and beat fields are intentional. Correct them
            before using for playback.
          </div>
          {view === "source" ? (
            <section className="panel">
              <h2>Raw extractor tokens</h2>
              <p>
                Exact input tokens, including source coordinates where
                available.
              </p>
              <div className="raw">
                {raw.length
                  ? raw.map((t, i) => (
                      <div key={i}>
                        <span>{t.text}</span>
                        <code>
                          p{t.page} · x:{t.x ?? "—"} · y:{t.y ?? "—"}
                        </code>
                      </div>
                    ))
                  : "Imported edited song JSON; no raw tokens available."}
              </div>
            </section>
          ) : song.mode === "melody" ? (
            <MelodyEditor
              key={`${fileIdx}-${method}-${editorKey}`}
              song={song}
              updateSong={updateSong}
              pdfUrl={pdfUrl}
              onSelectPdf={selectComparisonPdf}
            />
          ) : (
            <ChordEditor song={song} updateSong={updateSong} />
          )}
        </>
      )}
      <footer>
        PDF extraction runs locally in your browser. Only reconstructed song
        data is saved to Supabase. Review extracted content before saving.
      </footer>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="shell">Loading guitar lab…</main>}>
      <LabEditor />
    </Suspense>
  );
}
