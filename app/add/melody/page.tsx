
"use client";

import { useState } from "react";
import Link from "next/link";
import * as pdfjsLib from "pdfjs-dist";

import type { Geometry, Song, Token } from "@/types/guitar";
import { makeSong } from "@/lib/extraction/makeSong";
import {
  extractPdfLines,
  detectTabGeometry,
} from "@/lib/extraction/melody/extractPdfGeometry";
import MelodyTabView from "@/components/practice/MelodyTabView";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function AddMelodyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [classDate, setClassDate] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [song, setSong] = useState<Song | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  function selectFile(selected: File | undefined) {
    if (!selected) return;

    setFile(selected);
    setTitle(selected.name.replace(/\.pdf$/i, ""));
    setSong(null);
    setError("");
  }

  async function handleExtract() {
    if (!file || extracting) return;

    setExtracting(true);
    setError("");
    setSong(null);

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
        throw new Error(
          "No embedded text found. This PDF may be scanned.",
        );
      }

      if (geometry.length === 0) {
        throw new Error(
          "No tablature bars detected in this PDF.",
        );
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
      setError(
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setExtracting(false);
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
        🎼 Add Melody
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Import a melody PDF, review the extracted tablature,
        and choose how to save it.
      </p>

      <section className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">
          Original melody PDF
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="mt-2 block w-full"
            onChange={(event) =>
              selectFile(event.target.files?.[0])
            }
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

        <button
          type="button"
          onClick={handleExtract}
          disabled={!file || extracting}
          className="rounded-lg bg-teal-600 px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {extracting ? "Extracting PDF..." : "Extract & Preview"}
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Extraction failed: {error}

          <p className="mt-2">
            You can still keep the original PDF.
            We'll connect that option next.
          </p>
        </div>
      )}

      {song && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-800">
            Extraction Preview
          </h2>

          <p className="mb-5 mt-2 text-sm text-slate-500">
            {song.bars.length} bars detected. Compare the
            fret numbers and string positions with your PDF.
            Extraction is a draft and may contain errors.
          </p>

          <MelodyTabView bars={song.bars} />

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Review carefully before accepting the extraction.
            Saving will be enabled in the next step.
          </div>
        </section>
      )}
    </main>
  );
}
