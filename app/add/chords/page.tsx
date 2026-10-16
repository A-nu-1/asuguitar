"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as pdfjsLib from "pdfjs-dist";

import ChordEditor from "@/components/chords/ChordEditor";
import { makeSong } from "@/lib/extraction/makeSong";
import type { Song, Token } from "@/types/guitar";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type SaveDecision = "accepted" | "pdf_only";

export default function AddChordSongPage() {
  const router = useRouter();
  const saveSectionRef = useRef<HTMLElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [classDate, setClassDate] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [capo, setCapo] = useState(0);
  const [strummingPattern, setStrummingPattern] = useState("");

  const [song, setSong] = useState<Song | null>(null);
  const [saveDecision, setSaveDecision] = useState<SaveDecision | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isDesktop =
    typeof window !== "undefined" && !!window.guitarAPI?.saveSong;

  useEffect(() => {
    if (!saveDecision) return;

    const frame = requestAnimationFrame(() => {
      saveSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [saveDecision]);

  useEffect(() => {
    if (!file) {
      setPdfUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(selected: File | null) {
    setFile(selected);
    setSong(null);
    setSaveDecision(null);
    setError("");

    if (selected && !title.trim()) {
      setTitle(selected.name.replace(/\.pdf$/i, ""));
    }
  }

  async function handleExtract() {
    if (!file || extracting) return;

    setExtracting(true);
    setError("");
    setSaveDecision(null);
    setSong(null);

    try {
      const documentTask = pdfjsLib.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
      });

      // PDF.js returns a loading task; its promise resolves
      // to the parsed PDF document.
      const document = await documentTask.promise;

      const tokens: Token[] = [];

      try {
        for (
          let pageNumber = 1;
          pageNumber <= document.numPages;
          pageNumber++
        ) {
          const page = await document.getPage(pageNumber);

          const content = await page.getTextContent();
          const viewport = page.getViewport({
            scale: 1,
          });

          for (const item of content.items) {
            if (!("str" in item) || !item.str.trim()) {
              continue;
            }

            const transform = pdfjsLib.Util.transform(
              viewport.transform,
              item.transform,
            );

            tokens.push({
              text: item.str,
              x: Number(transform[4].toFixed(2)),
              y: Number(transform[5].toFixed(2)),
              page: pageNumber,
            });
          }
        }
      } finally {
        await documentTask.destroy();
      }

      if (tokens.length === 0) {
        throw new Error(
          "No embedded text found. You can still save this song as PDF-only.",
        );
      }

      // Reuse the chord extraction already working in Lab.
      const extracted = makeSong(
        tokens,
        "pdfjs",
        {
          label: title.trim() || file.name.replace(/\.pdf$/i, ""),
          key: file.name,
          mode: "chords",
        },
        [],
      );

      if (extracted.mode !== "chords" || extracted.chordLines.length === 0) {
        throw new Error(
          "No chord lines detected. You can still save the original PDF.",
        );
      }

      setSong(extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chord extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  function downloadJson() {
    if (!file || !saveDecision) return;

    const accepted = saveDecision === "accepted";

    const data = {
      format: "asuguitar-song",
      version: 1,
      song: {
        title: title.trim(),
        song_type: accepted ? "chords" : "tab",
        extraction_status: saveDecision,
        class_date: classDate || null,
        description: description.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        capo: accepted ? capo : 0,
        strumming_pattern: accepted ? strummingPattern.trim() || null : null,
        tempo_bpm: accepted ? (song?.tempo ?? null) : null,
        time_signature: accepted ? song?.timeSignature || null : null,
        bars: [],
        chord_lines: accepted ? (song?.chordLines ?? []) : [],
        original_pdf_filename: file.name,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${title.trim().replace(/[^\w.-]+/g, "_") || "chord_song"}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function saveToDesktop() {
    if (!file || !saveDecision || saving) return;

    if (!title.trim()) {
      setError("Song title is required.");
      return;
    }

    if (
      saveDecision === "accepted" &&
      (!song || song.chordLines.length === 0)
    ) {
      setError("Accepted chords must contain at least one line.");
      return;
    }

    if (!window.guitarAPI?.saveSong) {
      setError(
        "Desktop saving is unavailable. Use Download JSON in browser mode.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const accepted = saveDecision === "accepted";

      const result = await window.guitarAPI.saveSong({
        title: title.trim(),
        song_type: "chords",
        class_date: classDate || null,
        description: description.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        extraction_status: saveDecision,
        tempo_bpm: accepted ? (song?.tempo ?? null) : null,
        time_signature: accepted ? song?.timeSignature || null : null,
        capo: accepted ? capo : 0,
        strumming_pattern: accepted ? strummingPattern.trim() || null : null,
        bars: [],
        chord_lines: accepted ? (song?.chordLines ?? []) : [],
        pdf_bytes: new Uint8Array(await file.arrayBuffer()),
      });

      router.push(`/songs?id=${encodeURIComponent(result.id)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save chord song.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link
        href="/add"
        className="text-sm font-semibold text-teal-700 hover:underline"
      >
        ← Back to Add Song
      </Link>

      <h1 className="mt-5 text-2xl font-bold text-slate-800">
        🎵 Add Chord Song
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Import a chord PDF, review the extracted lyrics and chord positions, or
        keep the original PDF only.
      </p>

      <section className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Song Title *
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium">
            Class Introduction Date
            <input
              type="date"
              value={classDate}
              onChange={(event) => setClassDate(event.target.value)}
              className="mt-2 w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Description / Class Notes
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Teacher instructions, practice reminders..."
            className="mt-2 w-full rounded-lg border px-3 py-2"
          />
        </label>

        <label className="block text-sm font-medium">
          YouTube URL
          <input
            type="url"
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-2 w-full rounded-lg border px-3 py-2"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Capo
            <input
              type="number"
              min={0}
              max={12}
              value={capo}
              onChange={(event) => setCapo(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium">
            Strumming Pattern
            <input
              value={strummingPattern}
              onChange={(event) => setStrummingPattern(event.target.value)}
              placeholder="D D U U D U"
              className="mt-2 w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Original Chord PDF *
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full"
          />
        </label>

        {file && (
          <p className="text-xs text-slate-500">Selected: {file.name}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExtract}
            disabled={!file || extracting || saving}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {extracting ? "Extracting..." : "Extract & Preview"}
          </button>

          <button
            type="button"
            onClick={() => {
              setSaveDecision("pdf_only");
              setError("");
            }}
            disabled={!file || extracting || saving}
            className="rounded-lg border px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Save as PDF-only
          </button>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {song && (
        <section className="mt-8">
          <ChordEditor
            song={song}
            updateSong={(fn) =>
              setSong((current) => (current ? fn(current) : current))
            }
            pdfUrl={pdfUrl}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (song.chordLines.length === 0) {
                  setError("Add at least one chord line before accepting.");
                  return;
                }

                setSaveDecision("accepted");
                setError("");
              }}
              className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              ✓ Accept Extraction
            </button>

            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Reject the extracted chords and save only the original PDF?",
                  )
                ) {
                  setSaveDecision("pdf_only");
                  setError("");
                }
              }}
              className="rounded-lg border px-5 py-2.5 text-sm font-semibold"
            >
              Reject Extraction
            </button>
          </div>
        </section>
      )}

      {saveDecision && (
        <section
          ref={saveSectionRef}
          className="mt-8 rounded-xl border border-teal-200 bg-white p-5"
        >
          <h2 className="text-lg font-semibold text-slate-800">
            Ready to Save
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {saveDecision === "accepted"
              ? `${song?.chordLines.length ?? 0} chord lines and the original PDF will be saved.`
              : "Only the original PDF and song information will be saved."}
          </p>

          <div className="mt-4">
            {isDesktop ? (
              <button
                type="button"
                onClick={saveToDesktop}
                disabled={saving || !title.trim()}
                className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : saveDecision === "accepted"
                    ? "Save Chord Song"
                    : "Save PDF-only Song"}
              </button>
            ) : (
              <button
                type="button"
                onClick={downloadJson}
                className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white"
              >
                Download Song JSON
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
