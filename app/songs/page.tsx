"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import PracticeWorkspace from "@/components/practice/PracticeWorkspace";

import { demoSongs } from "@/lib/dev/sampleSongs";

import type { Bar, ChordLine } from "@/types/guitar";

type LocalSong = {
  id: string;
  title: string;
  song_type: "melody" | "tab" | "chords";
  description: string | null;
  class_date: string | null;
  tempo_bpm: number | null;
  time_signature: string | null;
  capo: number | null;
  strumming_pattern: string | null;
  youtube_url: string | null;
  pdf_filename?: string | null;
  chord_lines: ChordLine[];
  bars: Array<{
    id: string;
    bar_number: number;
    section: string | null;
    lyrics: string | null;
    notes: Bar["notes"];
  }>;
};

export default function SongPage() {
  const [song, setSong] = useState<LocalSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    let desktopPdfUrl: string | null = null;

    async function loadSong() {
      try {
        const songId = new URLSearchParams(window.location.search).get("id");

        if (!songId) {
          throw new Error("No song selected.");
        }

        let data: LocalSong | null = null;
        let selectedPdfUrl: string | null = null;

        if (window.guitarAPI?.getSong) {
          // Electron: load the real song from SQLite.
          data = (await window.guitarAPI.getSong(songId)) as LocalSong | null;

          // Load the original PDF saved on this computer.
          if (data && window.guitarAPI.getSongPdf) {
            const pdfBytes = await window.guitarAPI.getSongPdf(songId);

            if (pdfBytes) {
              const pdfBlob = new Blob([Uint8Array.from(pdfBytes)], {
                type: "application/pdf",
              });

              desktopPdfUrl = URL.createObjectURL(pdfBlob);
              selectedPdfUrl = desktopPdfUrl;
            }
          }
        } else if (process.env.NODE_ENV === "development") {
          const sample = demoSongs.find((item) => item.id === songId);

          if (!sample) {
            throw new Error("Sample song not found.");
          }

          data = {
            ...sample,
            chord_lines: [...sample.chord_lines],
            bars: [...sample.bars],
          };

          selectedPdfUrl = sample.pdfUrl;
        } else {
          throw new Error(
            "Local guitar database is unavailable. Please open the Electron app.",
          );
        }

        if (!data) {
          throw new Error("Song not found.");
        }

        if (active) {
          setSong(data);
          setPdfUrl(selectedPdfUrl);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSong();

    return () => {
      active = false;

      if (desktopPdfUrl) {
        URL.revokeObjectURL(desktopPdfUrl);
      }
    };
  }, []);

  const bars: Bar[] =
    song?.bars.map((bar) => ({
      id: bar.id,
      number: bar.bar_number,
      section: bar.section ?? "Unassigned",
      lyrics: bar.lyrics ?? "",
      notes: bar.notes,
    })) ?? [];

  return (
    <main className="flex h-dvh min-h-0 flex-col bg-slate-100">

      {loading && (
        <div className="p-5 text-sm text-slate-500">Loading song...</div>
      )}

      {error && (
        <div role="alert" className="p-5 text-sm text-red-600">
          {error}
        </div>
      )}

      {song && (
        <div className="min-h-0 flex-1">
          <PracticeWorkspace
            songId={song.id}
            title={song.title}
            songType={song.song_type}
            bars={bars}
            chordLines={song.chord_lines}
            pdfUrl={pdfUrl}
            youtubeUrl={song.youtube_url}
            classDate={song.class_date}
            description={song.description}
            tempo={song.tempo_bpm}
            timeSignature={song.time_signature}
            capo={song.capo}
            strummingPattern={song.strumming_pattern}
          />
        </div>
      )}
    </main>
  );
}
