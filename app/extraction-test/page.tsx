"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import { makeSong } from "@/lib/extraction/makeSong";
import type { Song, Geometry } from "@/types/guitar";
import ChordPreview from "@/components/chords/ChordPreview";
import MelodyEditor from "@/components/melody/MelodyEditor";
import {
  extractPdfLines,
  detectTabGeometry,
} from "@/lib/extraction/melody/extractPdfGeometry";

type ExtractedToken = {
  text: string;
  x: number;
  y: number;
  page: number;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function ExtractionTestPage() {
  const [tokens, setTokens] = useState<ExtractedToken[]>([]);
  const [filename, setFilename] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [song, setSong] = useState<Song | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [geometry, setGeometry] = useState<Geometry[]>([]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    setTokens([]);
    setPageCount(0);
    setError("");
    setSong(null);
    setPreviewError("");
    setLoading(true);
    setGeometry([]);

    try {
      const buffer = await file.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      }).promise;

      setPageCount(pdf.numPages);

      const extracted: ExtractedToken[] = [];
      const allGeometry: Geometry[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        // ------------------------------------------
        // STEP 1: Extract PDF drawing lines
        // ------------------------------------------

        const pdfLines = await extractPdfLines(page, pageNumber);

        const detectedGeometry = detectTabGeometry(pdfLines);
        allGeometry.push(...detectedGeometry);

        console.log(
          `Page ${pageNumber} detected bars:`,
          detectedGeometry.length,
        );

        console.table(detectedGeometry.slice(0, 15));

        const horizontalLines = pdfLines.filter(
          (line) => line.orientation === "horizontal",
        );

        const verticalLines = pdfLines.filter(
          (line) => line.orientation === "vertical",
        );

        console.log(`Page ${pageNumber} extracted lines:`, {
          horizontal: horizontalLines.length,
          vertical: verticalLines.length,
        });

        console.table(pdfLines.slice(0, 10));

        // ------------------------------------------
        // STEP 2: Extract text and coordinates
        // ------------------------------------------

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

          extracted.push({
            text: item.str,
            x: Number(transform[4].toFixed(2)),
            y: Number(transform[5].toFixed(2)),
            page: pageNumber,
          });
        }
      }

      // ------------------------------------------
      // STEP 3: Update extracted tokens
      // ------------------------------------------

      setTokens(extracted);
      setGeometry(allGeometry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract PDF.");
    } finally {
      setLoading(false);
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(tokens, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename.replace(/\.pdf$/i, "") + "__pdfjs.json";

    link.click();
    URL.revokeObjectURL(url);
  }

  function previewChords() {
    setPreviewError("");
    setSong(null);

    try {
      const reconstructed = makeSong(
        tokens,
        "pdfjs",
        {
          label: filename.replace(/\.pdf$/i, ""),
          key: filename,
          mode: "chords",
        },
        [],
      );

      setSong(reconstructed);
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Failed to reconstruct chords.",
      );
    }
  }

  function previewMelody() {
    setPreviewError("");
    setSong(null);

    try {
      const reconstructed = makeSong(
        tokens,
        "pdfjs",
        {
          label: filename.replace(/\.pdf$/i, ""),
          key: filename,
          mode: "melody",
        },
        geometry,
      );

      setSong(reconstructed);
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Failed to reconstruct melody.",
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="text-2xl font-bold">PDF Extraction Test</h1>

      <p className="mt-2 text-sm text-slate-500">
        Extract text and coordinates from a PDF using PDF.js. Processing happens
        locally in your browser.
      </p>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <label className="block text-sm font-semibold">Select PDF</label>

        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFile}
          className="mt-3 block w-full text-sm"
        />

        {loading && (
          <p className="mt-4 text-sm text-blue-600">Extracting PDF...</p>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {filename && !loading && !error && (
          <div className="mt-5 space-y-2 text-sm">
            <p>
              <strong>File:</strong> {filename}
            </p>
            <p>
              <strong>Pages:</strong> {pageCount}
            </p>
            <p>
              <strong>Extracted tokens:</strong> {tokens.length}
            </p>

            {tokens.length === 0 && (
              <p className="text-amber-700">
                No embedded text found. This may be a scanned or image-based PDF
                requiring OCR.
              </p>
            )}

            {tokens.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-3">
                <button
                  type="button"
                  onClick={downloadJSON}
                  className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
                >
                  Download extracted JSON
                </button>

                <button
                  type="button"
                  onClick={previewChords}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Preview reconstructed chords
                </button>

                <button
                  type="button"
                  onClick={previewMelody}
                  className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700"
                >
                  Preview reconstructed melody
                </button>
              </div>
            )}
          </div>
        )}

        {previewError && (
          <p className="mt-4 text-sm text-red-600">{previewError}</p>
        )}
      </div>

      {song && (
        <section className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="text-xl font-bold">
            Reconstructed {song.mode === "melody" ? "Melody" : "Chord"} Preview
          </h2>

          <p className="mt-2 text-sm text-slate-600">Title: {song.title}</p>

          {song.mode === "melody" ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Detected bars: {song.bars.length}
              </p>

              {song.bars.length === 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  No melody bars reconstructed. PDF.js text extraction
                  succeeded, but bar geometry may be required.
                </p>
              )}

              <div className="mt-6">
                <MelodyEditor
                  song={song}
                  updateSong={(fn) =>
                    setSong((current) => (current ? fn(current) : current))
                  }
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Chord lines: {song.chordLines.length}
              </p>

              <div className="mt-6 space-y-5">
                {song.chordLines.map((line, index) => (
                  <div key={line.id} className="rounded-lg border p-4">
                    <div className="mb-2 text-xs text-slate-500">
                      Line {index + 1}
                    </div>

                    <ChordPreview
                      lyrics={line.lyrics}
                      placements={line.placements ?? []}
                      onChange={(updatedPlacements) => {
                        setSong((current) => {
                          if (!current) return null;

                          return {
                            ...current,
                            chordLines: current.chordLines.map((currentLine) =>
                              currentLine.id === line.id
                                ? {
                                    ...currentLine,
                                    placements: updatedPlacements,
                                  }
                                : currentLine,
                            ),
                          };
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {tokens.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border bg-white">
          <div className="border-b p-4 font-semibold">
            Extracted Tokens (first 100)
          </div>

          <div className="max-h-[550px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  <th className="p-3">Page</th>
                  <th className="p-3">Text</th>
                  <th className="p-3">X</th>
                  <th className="p-3">Y</th>
                </tr>
              </thead>

              <tbody>
                {tokens.slice(0, 100).map((token, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{token.page}</td>
                    <td className="p-3">{token.text}</td>
                    <td className="p-3">{token.x}</td>
                    <td className="p-3">{token.y}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
