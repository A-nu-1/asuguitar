"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChordEditor from "@/components/chords/ChordEditor";
import MelodyEditor from "@/components/melody/MelodyEditor";
import type { Bar, ChordLine, Song } from "@/types/guitar";
import { demoSongs } from "@/lib/dev/sampleSongs";
import { extractMelodyFromPdf } from "@/lib/extraction/melody/extractMelodyFromPdf";

type StoredBar = {
  id: string;
  bar_number: number;
  section: string | null;
  lyrics: string | null;
  notes: Bar["notes"];
  symbols?: Bar["symbols"];
};

type StoredSong = {
  id: string;
  title: string;
  song_type: "melody" | "tab" | "chords";
  class_date: string | null;
  description: string | null;
  youtube_url: string | null;
  tempo_bpm: number | null;
  time_signature: string | null;
  capo: number | null;
  strumming_pattern: string | null;
  chord_lines: ChordLine[];
  bars: StoredBar[];
};

export default function EditSongPage() {
  const router = useRouter();

  const [songId, setSongId] = useState("");
  const [originalType, setOriginalType] =
    useState<StoredSong["song_type"]>("melody");

  const [title, setTitle] = useState("");
  const [classDate, setClassDate] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [capo, setCapo] = useState(0);
  const [strummingPattern, setStrummingPattern] = useState("");

  const [melody, setMelody] = useState<Song | null>(null);
  const [extractingMelody, setExtractingMelody] = useState(false);
  const [melodyUpgradeReady, setMelodyUpgradeReady] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [chordSong, setChordSong] = useState<Song | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isDesktop =
    typeof window !== "undefined" && !!window.guitarAPI?.updateSong;

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const id = new URLSearchParams(window.location.search).get("id");

        if (!id) {
          throw new Error("No song selected.");
        }

        let data: StoredSong | null = null;
        let originalPdf: string | null = null;

        if (window.guitarAPI?.getSong) {
          data = (await window.guitarAPI.getSong(id)) as StoredSong | null;

          if (data && window.guitarAPI.getSongPdf) {
            const bytes = await window.guitarAPI.getSongPdf(id);

            if (bytes) {
              const blob = new Blob([Uint8Array.from(bytes)], {
                type: "application/pdf",
              });

              objectUrl = URL.createObjectURL(blob);
              originalPdf = objectUrl;
            }
          }
        } else {
          const demo = demoSongs.find((item) => item.id === id);

          if (demo) {
            data = {
              id: demo.id,
              title: demo.title,
              song_type: demo.song_type,
              class_date: demo.class_date,
              description: demo.description,
              youtube_url: demo.youtube_url,
              tempo_bpm: demo.tempo_bpm,
              time_signature: demo.time_signature,
              capo: demo.capo,
              strumming_pattern: demo.strumming_pattern,
              chord_lines: [...demo.chord_lines],
              bars: [...demo.bars],
            };

            originalPdf = demo.pdfUrl;
          }
        }

        if (!data) {
          throw new Error("Song not found.");
        }

        if (!active) return;

        setSongId(id);
        setOriginalType(data.song_type);

        setTitle(data.title);
        setClassDate(data.class_date ?? "");
        setDescription(data.description ?? "");
        setYoutubeUrl(data.youtube_url ?? "");
        setCapo(data.capo ?? 0);
        setStrummingPattern(data.strumming_pattern ?? "");
        setPdfUrl(originalPdf);

        if (data.song_type === "melody") {
          setMelody({
            title: data.title,
            mode: "melody",
            tempo: data.tempo_bpm,
            timeSignature: data.time_signature ?? "",
            source: {
              method: "sqlite",
              filename: "",
            },
            chordLines: [],
            bars: data.bars.map((bar) => ({
              id: bar.id,
              number: bar.bar_number,
              section: bar.section ?? "Unassigned",
              lyrics: bar.lyrics ?? "",
              notes: bar.notes,
              symbols: bar.symbols ?? [],
            })),
          });
        }

        if (data.song_type === "chords") {
          setChordSong({
            title: data.title,
            mode: "chords",
            tempo: data.tempo_bpm,
            timeSignature: data.time_signature ?? "",
            source: {
              method: "sqlite",
              filename: "",
            },
            bars: [],
            chordLines: data.chord_lines ?? [],
          });
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

    void load();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedPdf) return;

    const url = URL.createObjectURL(selectedPdf);
    setPdfUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedPdf]);

  async function handleExtractMelody() {
    if (originalType !== "tab" || !pdfUrl || extractingMelody || saving) {
      return;
    }

    if (melodyUpgradeReady) {
      const confirmed = window.confirm(
        "Extract melody again?\n\n" +
          "Your current melody edits and symbols in this preview " +
          "will be replaced. The original saved PDF song will not change.",
      );

      if (!confirmed) return;
    }

    setExtractingMelody(true);
    setExtractionError("");
    setError("");
    setMessage("");

    try {
      // pdfUrl refers to either the existing Electron PDF
      // or the replacement PDF selected in Edit Song.
      const response = await fetch(pdfUrl);

      if (!response.ok) {
        throw new Error("Could not read the PDF.");
      }

      const pdfBytes = new Uint8Array(await response.arrayBuffer());

      const extracted = await extractMelodyFromPdf(
        pdfBytes,
        title,
        selectedPdf?.name ?? `${title}.pdf`,
      );

      if (extracted.bars.length === 0) {
        throw new Error("No melody bars were detected.");
      }

      // Preview only: do not change the SQLite song type yet.
      setMelody(extracted);
      setMelodyUpgradeReady(true);
      setMessage(
        `${extracted.bars.length} melody bars extracted. ` +
          "Review and correct them before upgrading this song.",
      );
    } catch (err) {
      setExtractionError(
        err instanceof Error
          ? err.message
          : "Could not extract melody from this PDF.",
      );
    } finally {
      setExtractingMelody(false);
    }
  }

  function downloadEditedJson() {
    const data = {
      format: "asuguitar-song",
      version: 1,
      song: {
        id: songId,
        title: title.trim(),
        song_type: originalType,
        class_date: classDate || null,
        description: description.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        capo,
        strumming_pattern: strummingPattern || null,
        tempo_bpm: melody?.tempo ?? null,
        time_signature: melody?.timeSignature || null,
        chord_lines: chordSong?.chordLines ?? [],
        bars: melody?.bars ?? [],
        pdf_filename: selectedPdf?.name ?? null,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${title.trim().replace(/[^\w.-]+/g, "_") || "song"}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

 
async function handleDeleteSong() {
  if (deleting || saving || !songId) return;

  const confirmed = window.confirm(
    `Permanently delete "${title}"?\n\n` +
      "This removes the song, its PDF, melody bars, " +
      "and saved YouTube synchronization timings.\n\n" +
      "This cannot be undone.",
  );

  if (!confirmed) return;

 const finalConfirmation = window.confirm(
  `FINAL CONFIRMATION\n\n` +
    `Delete "${title}" permanently?\n\n` +
    "All associated data and YouTube timings will be removed.\n\n" +
    "Click OK only if you are absolutely sure.",
);

if (!finalConfirmation) return;

  if (!window.guitarAPI?.deleteSong) {
    setError(
      "Delete Song is not available in this Electron build. " +
        "Check preload.cjs and restart Electron.",
    );
    return;
  }

  setDeleting(true);
  setError("");
  setMessage("");

  try {
    const result = await window.guitarAPI.deleteSong(songId);

    if (!result.success) {
      throw new Error("SQLite did not confirm deletion.");
    }

    router.replace("/");
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Could not delete song.",
    );
  } finally {
    setDeleting(false);
  }
}


  async function handleSave() {
    if (!title.trim()) {
      setError("Song title is required.");
      return;
    }

    if (!window.guitarAPI?.updateSong) {
      setMessage(
        "Demo mode does not save songs. Download JSON to keep your changes.",
      );
      return;
    }

    if (saving) return;

    if (
      originalType === "tab" &&
      melodyUpgradeReady &&
      (!melody || melody.bars.length === 0)
    ) {
      setError("Please extract and review melody bars before upgrading.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const pdfBytes = selectedPdf
        ? new Uint8Array(await selectedPdf.arrayBuffer())
        : undefined;

      await window.guitarAPI.updateSong({
        id: songId,
        ...(originalType === "tab" && melodyUpgradeReady
          ? { convert_to_melody: true }
          : {}),
        title: title.trim(),
        class_date: classDate || null,
        description: description.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        capo,
        strumming_pattern: strummingPattern || null,
        ...((originalType === "melody" || melodyUpgradeReady) && melody
          ? {
              tempo_bpm: melody.tempo,
              time_signature: melody.timeSignature || null,
              bars: melody.bars,
            }
          : {}),
        ...(originalType === "chords" && chordSong
          ? {
              chord_lines: chordSong.chordLines,
            }
          : {}),
        ...(pdfBytes ? { pdf_bytes: pdfBytes } : {}),
      });

      router.push(`/songs?id=${encodeURIComponent(songId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update song.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="p-6 text-sm text-slate-500">Loading song...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link
        href={`/songs?id=${encodeURIComponent(songId)}`}
        className="text-sm font-semibold text-teal-700 hover:underline"
      >
        ← Back to Practice
      </Link>

      <h1 className="mt-5 text-2xl font-bold text-slate-800">✏️ Edit Song</h1>

      <p className="mt-2 text-sm text-slate-500">
        {originalType === "melody"
          ? "Edit song details, original PDF, and melody bars."
          : originalType === "chords"
            ? "Edit song details and original PDF."
            : "Edit PDF-only song details."}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-teal-700">
          {message}
        </p>
      )}

      <section className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Song Title
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
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2"
            placeholder="Teacher's instructions, practice reminders..."
          />
        </label>

        <label className="block text-sm font-medium">
          YouTube URL
          <input
            type="url"
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2"
          />
        </label>

        {originalType === "chords" && (
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
                className="mt-2 w-full rounded-lg border px-3 py-2"
              />
            </label>
          </div>
        )}

        <label className="block text-sm font-medium">
          {pdfUrl ? "Replace Original PDF" : "Attach Original PDF"}

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) =>
              setSelectedPdf(event.target.files?.[0] ?? null)
            }
            className="mt-2 block w-full"
          />
        </label>

        {pdfUrl && (
          <p className="text-xs text-teal-700">
            Original PDF available for comparison.
            {selectedPdf && ` New file: ${selectedPdf.name}`}
          </p>
        )}
      </section>

      {originalType === "tab" && (
        <section className="mt-8 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-5">
          <h2 className="text-lg font-bold text-violet-900">
            🎸 Add Melody to This PDF Song
          </h2>

          <p className="mt-2 text-sm text-violet-700">
            Extract guitar tablature from the existing PDF, then correct notes
            and add musical symbols using our Melody Editor. Your original PDF
            and saved YouTube timing markers will be preserved.
          </p>

          <button
            type="button"
            onClick={() => void handleExtractMelody()}
            disabled={!pdfUrl || extractingMelody || saving}
            className="mt-4 rounded-lg bg-fuchsia-600 px-5 py-2.5 font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {extractingMelody
              ? "⏳ Extracting Melody..."
              : melodyUpgradeReady
                ? "🔄 Re-extract Melody"
                : "🎼 Extract Melody from PDF"}
          </button>

          {!pdfUrl && (
            <p className="mt-2 text-sm text-rose-600">
              Attach a PDF first to extract melody bars.
            </p>
          )}

          {extractionError && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {extractionError}
            </p>
          )}

          {melodyUpgradeReady && melody && (
            <p className="mt-3 text-sm font-semibold text-emerald-700">
              ✓ {melody.bars.length} bars extracted and ready for editing.
            </p>
          )}
        </section>
      )}

      {(originalType === "melody" || melodyUpgradeReady) && melody && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">
            {melodyUpgradeReady
              ? "🎼 Review Extracted Melody & Symbols"
              : "🎼 Edit Melody Bars"}
          </h2>

          <MelodyEditor
            song={melody}
            updateSong={(fn) =>
              setMelody((current) => (current ? fn(current) : current))
            }
            pdfUrl={pdfUrl}
          />
        </section>
      )}

      {originalType === "chords" && chordSong && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">
            🎵 Edit Chords & Lyrics
          </h2>

          <ChordEditor
            song={chordSong}
            updateSong={(fn) =>
              setChordSong((current) => (current ? fn(current) : current))
            }
            pdfUrl={pdfUrl}
          />
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {isDesktop ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || extractingMelody || !title.trim()}
            className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Saving Changes..."
              : melodyUpgradeReady
                ? "🎸 Save Melody + PDF Upgrade"
                : "Save Changes"}
          </button>
        ) : (
          <button
            type="button"
            onClick={downloadEditedJson}
            className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white"
          >
            Download Edited JSON
          </button>
        )}

        {isDesktop && (
          <button
            type="button"
            onClick={() => void handleDeleteSong()}
            disabled={saving || deleting || extractingMelody}
            className="rounded-lg border border-rose-300 bg-rose-50 px-6 py-3 font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "🗑️ Delete Song"}
          </button>
        )}
      </div>
    </main>
  );
}
