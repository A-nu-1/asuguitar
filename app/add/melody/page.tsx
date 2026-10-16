"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as pdfjsLib from "pdfjs-dist";
import { useRouter } from "next/navigation";
import type { Geometry, Song, Token } from "@/types/guitar";
import { makeSong } from "@/lib/extraction/makeSong";
import {
  extractPdfLines,
  detectTabGeometry,
} from "@/lib/extraction/melody/extractPdfGeometry";
import MelodyTabView from "@/components/practice/MelodyTabView";
import MelodyEditor from "@/components/melody/MelodyEditor";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function AddMelodyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPdfUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const router = useRouter();

  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [title, setTitle] = useState("");
  const [classDate, setClassDate] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [song, setSong] = useState<Song | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  type SaveDecision = "accepted" | "pdf_only";

  const [saveDecision, setSaveDecision] = useState<SaveDecision | null>(null);

  function selectFile(selected: File | undefined) {
    if (!selected) return;

    setFile(selected);
    setTitle(selected.name.replace(/\.pdf$/i, ""));
    setSong(null);
    setError("");
    setSaveDecision(null);
  }

  const saveSectionRef = useRef<HTMLElement>(null);

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
  async function handleExtract() {
    if (!file || extracting) return;

    setExtracting(true);
    setError("");
    setSong(null);
    setSaveDecision(null);

    try {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
      }).promise;

      const tokens: Token[] = [];
      const geometry: Geometry[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        const lines = await extractPdfLines(page, pageNumber);
        geometry.push(...detectTabGeometry(lines));

        const content = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;

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

      if (tokens.length === 0) {
        throw new Error("No embedded text found. This PDF may be scanned.");
      }

      if (geometry.length === 0) {
        throw new Error("No tablature bars detected in this PDF.");
      }

      const extractedSong = makeSong(
        tokens,
        "pdfjs",
        {
          label: title.trim() || file.name.replace(/\.pdf$/i, ""),
          key: file.name,
          mode: "melody",
        },
        geometry,
      );

      extractedSong.bars = extractedSong.bars.map((bar, index) => ({
        ...bar,
        number: index + 1,
      }));

      setSong(extractedSong);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  function choosePdfOnly() {
    if (!file) return;

    if (song) {
      const confirmed = window.confirm(
        "Reject the extracted melody?\n\n" +
          "The extracted bars will not be included when saving. " +
          "Your original PDF will be kept, and the song will " +
          "open in PDF-only Tab mode.\n\n" +
          "Continue?",
      );

      if (!confirmed) return;
    }

    setSaveDecision("pdf_only");
  }

  function acceptExtraction() {
    if (!song || song.bars.length === 0) {
      setError("No extracted melody bars are available to accept.");
      return;
    }

    setSaveDecision("accepted");
    setError("");
  }

  function downloadSongJson() {
    if (!saveDecision || !file) return;

    const songTitle = title.trim() || file.name.replace(/\.pdf$/i, "");

    const data = {
      format: "asuguitar-song",
      version: 1,
      song: {
        title: songTitle,
        song_type: saveDecision === "accepted" ? "melody" : "tab",
        class_date: classDate || null,
        description: description.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        pdf_filename: file.name,
        extraction_status: saveDecision,
        tempo_bpm: saveDecision === "accepted" ? (song?.tempo ?? null) : null,
        time_signature:
          saveDecision === "accepted" ? song?.timeSignature || null : null,
        bars: saveDecision === "accepted" ? (song?.bars ?? []) : [],
        chord_lines: [],
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${songTitle.replace(/[^\w.-]+/g, "_")}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function saveToDesktop() {
    if (!file || !saveDecision || saving) return;

    if (!window.guitarAPI?.saveSong) {
      setSaveMessage(
        "Permanent saving is available only in the Electron desktop app. Use Download Song JSON in demo mode.",
      );
      return;
    }

    if (!title.trim()) {
      setError("Please enter a song title.");
      return;
    }

    if (saveDecision === "accepted" && (!song || song.bars.length === 0)) {
      setError("Please extract and accept melody bars first.");
      return;
    }

    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const pdfBytes = new Uint8Array(await file.arrayBuffer());

      const result = await window.guitarAPI.saveSong({
        title: title.trim(),
        class_date: classDate || null,
        description: description.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        extraction_status: saveDecision,
        tempo_bpm: saveDecision === "accepted" ? (song?.tempo ?? null) : null,
        time_signature:
          saveDecision === "accepted" ? song?.timeSignature || null : null,
        bars: saveDecision === "accepted" ? (song?.bars ?? []) : [],
        pdf_bytes: pdfBytes,
      });

      setSaveMessage(`Saved "${result.title}" successfully!`);

      router.push(`/songs?id=${encodeURIComponent(result.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save song.");
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

      <h1 className="mt-5 text-2xl font-bold text-slate-800">🎼 Add Melody</h1>

      <p className="mt-2 text-sm text-slate-500">
        Import a melody PDF, review the extracted tablature, and choose how to
        save it.
      </p>

      <section className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">
          Original melody PDF
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="mt-2 block w-full"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Song title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Class introduction date
            <input
              type="date"
              value={classDate}
              onChange={(event) => setClassDate(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            YouTube URL
            <input
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Description / Class Notes
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Teacher's instructions, tricky sections, finger positions, reminders..."
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExtract}
            disabled={!file || extracting}
            className="rounded-lg bg-teal-600 px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {extracting ? "Extracting PDF..." : "Extract & Preview"}
          </button>

          <button
            type="button"
            onClick={choosePdfOnly}
            disabled={!file || extracting}
            className="rounded-lg border border-teal-600 bg-white px-5 py-2 font-semibold text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save as PDF-only
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Extraction failed: {error}
          <p className="mt-2">
            You can still keep the original PDF. We'll connect that option next.
          </p>
        </div>
      )}

      {song && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-800">
            Extraction Preview
          </h2>

          <p className="mb-5 mt-2 text-sm text-slate-500">
            {song.bars.length} bars detected. Compare the fret numbers and
            string positions with your PDF. Extraction is a draft and may
            contain errors.
          </p>

          <MelodyEditor
            song={song}
            updateSong={(fn) =>
              setSong((current) => (current ? fn(current) : current))
            }
            pdfUrl={pdfUrl}
          />

          <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <button
              type="button"
              onClick={acceptExtraction}
              className="rounded-lg bg-teal-600 px-5 py-2 font-semibold text-white"
            >
              ✓ Accept Extraction
            </button>

            <button
              type="button"
              onClick={choosePdfOnly}
              className="rounded-lg border border-slate-300 px-5 py-2 font-semibold text-slate-700"
            >
              Reject Extraction — Keep PDF Only
            </button>
          </div>
        </section>
      )}

      {saveDecision && (
        <section
          ref={saveSectionRef}
          className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-5"
        >
          <h2 className="text-lg font-semibold text-teal-900">
            {saveDecision === "accepted"
              ? "✓ Melody extraction accepted"
              : "📄 PDF-only mode selected"}
          </h2>

          <p className="mt-2 text-sm text-teal-800">
            {saveDecision === "accepted"
              ? `${song?.bars.length ?? 0} corrected bars are ready to save with the original PDF.`
              : "The extracted bars will be excluded. The original PDF will be used directly in Tab practice mode."}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {window.guitarAPI?.saveSong ? (
              <button
                type="button"
                onClick={saveToDesktop}
                disabled={saving}
                className="rounded-lg bg-teal-700 px-5 py-2 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : saveDecision === "accepted"
                    ? "Save Melody Song"
                    : "Save PDF-only Song"}
              </button>
            ) : (
              <button
                type="button"
                onClick={downloadSongJson}
                className="rounded-lg bg-teal-700 px-5 py-2 font-semibold text-white"
              >
                Download Song JSON
              </button>
            )}
          </div>

          {saveMessage && (
            <p role="status" className="mt-3 text-sm text-teal-800">
              {saveMessage}
            </p>
          )}

          <p className="mt-3 text-xs text-teal-800">
            {window.guitarAPI?.saveSong
              ? "The song and original PDF will be saved locally."
              : "Demo mode: download JSON to keep your extracted song data. No database saving."}
          </p>
        </section>
      )}
    </main>
  );
}
