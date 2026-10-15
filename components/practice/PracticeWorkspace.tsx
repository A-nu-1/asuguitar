"use client";

import { useEffect, useRef, useState } from "react";
import MelodyTabView from "@/components/practice/MelodyTabView";
import ChordSheetView from "@/components/practice/ChordSheetView";
import PdfViewer from "@/components/practice/PdfViewer";
import type { Bar, ChordLine } from "@/types/guitar";
import Link from "next/link";
import PageCornerNav from "@/components/layout/PageCornerNav";

type Props = {
  title: string;
  songType: "melody" | "chords" | "tab";
  bars: Bar[];
  chordLines: ChordLine[];
  pdfUrl?: string | null;
  youtubeUrl?: string | null;
  songId: string;
  classDate?: string | null;
  description?: string | null;
  tempo?: number | null;
  timeSignature?: string | null;
  capo?: number | null;
  strummingPattern?: string | null;
};

const DEFAULT_VIDEO_HEIGHT = 220;
const MIN_VIDEO_HEIGHT = 110;
const MAX_VIDEO_HEIGHT = 600;
const STORAGE_KEY = "asuguitar-video-height";

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    let id: string | null = null;

    if (host === "youtu.be" || host === "www.youtu.be") {
      id = parsed.pathname.split("/")[1];
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
    ) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v");
      } else {
        const parts = parsed.pathname.split("/");
        if (["embed", "shorts", "live"].includes(parts[1])) {
          id = parts[2];
        }
      }
    }

    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export default function PracticeWorkspace({
  songId,
  title,
  songType,
  bars,
  chordLines,
  pdfUrl,
  youtubeUrl,
  classDate,
  description,
  tempo,
  timeSignature,
  capo,
  strummingPattern,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);

  const [videoHeight, setVideoHeight] = useState(DEFAULT_VIDEO_HEIGHT);
  const [videoVisible, setVideoVisible] = useState(true);
  const [comparing, setComparing] = useState(false);

  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(30);

  const speedRef = useRef(speed);
  const youtubeId = getYouTubeId(youtubeUrl || "");

  const [infoOpen, setInfoOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(description ?? "");
  const [savedNotes, setSavedNotes] = useState(description ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");

  const isDesktop =
    typeof window !== "undefined" && !!window.guitarAPI?.updateSong;

  useEffect(() => {
    setNotes(description ?? "");
    setSavedNotes(description ?? "");
    setEditingNotes(false);
  }, [songId, description]);

  // Restore preferred YouTube height.
  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));

    if (Number.isFinite(saved) && saved >= MIN_VIDEO_HEIGHT) {
      setVideoHeight(Math.min(MAX_VIDEO_HEIGHT, saved));
    }
  }, []);

  // Save YouTube height when adjusted.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(videoHeight));
  }, [videoHeight]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Smooth scrolling for extracted melody/chords.
  useEffect(() => {
    if (!scrolling || songType === "tab") return;

    const container = scrollRef.current;
    if (!container) return;

    const scrollContainer = container;

    let frame = 0;
    let previousTime: number | null = null;
    let position = container.scrollTop;

    function animate(time: number) {
      if (previousTime !== null) {
        const elapsed = Math.min((time - previousTime) / 1000, 0.1);

        // Respect manual scrolling.
        if (Math.abs(scrollContainer.scrollTop - position) > 1) {
          position = scrollContainer.scrollTop;
        }

        const maxScroll =
          scrollContainer.scrollHeight - scrollContainer.clientHeight;

        position = Math.min(position + speedRef.current * elapsed, maxScroll);

        scrollContainer.scrollTop = position;

        if (position >= maxScroll) {
          setScrolling(false);
          return;
        }
      }

      previousTime = time;
      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [scrolling, songType]);

  // Resize YouTube using the divider.
  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      const nextHeight = drag.startHeight + drag.startY - event.clientY;

      setVideoHeight(
        Math.max(MIN_VIDEO_HEIGHT, Math.min(MAX_VIDEO_HEIGHT, nextHeight)),
      );
    }

    function stopDragging() {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  function resetScroll() {
    setScrolling(false);

    scrollRef.current?.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }

  function renderMusic() {
    if (songType === "melody") {
      return <MelodyTabView bars={bars} />;
    }

    if (songType === "chords") {
      return <ChordSheetView lines={chordLines} />;
    }

    return null;
  }

  async function saveClassNotes() {
    if (savingNotes) return;

    if (!window.guitarAPI?.updateSong) {
      setNotesError("Saving is available in the desktop application.");
      return;
    }

    setSavingNotes(true);
    setNotesError("");

    try {
      await window.guitarAPI.updateSong({
        id: songId,
        title,
        class_date: classDate ?? null,
        description: notes.trim() || null,
        youtube_url: youtubeUrl ?? null,
      });

      setSavedNotes(notes.trim());
      setEditingNotes(false);
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Could not save class notes.",
      );
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      {/* Practice toolbar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <h1 className="min-w-0 truncate font-semibold text-slate-800">
          🎸 {title}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            Song Info
          </button>

          <Link
            href={`/edit?id=${encodeURIComponent(songId)}`}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            ✏️ Edit Song
          </Link>

          {songType !== "tab" && (
            <button
              type="button"
              disabled={!pdfUrl}
              onClick={() => {
                setScrolling(false);
                setComparing(true);
              }}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              title={
                pdfUrl
                  ? "Compare extracted music with original PDF"
                  : "Original PDF unavailable"
              }
            >
              Compare
            </button>
          )}

          <button
            type="button"
            onClick={() => setVideoVisible((current) => !current)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            {videoVisible ? "Hide Video" : "Show Video"}
          </button>
        </div>
        <PageCornerNav />
      </header>

      {/* Scrolling controls for extracted music */}
      {songType !== "tab" && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-white px-3 py-2">
          <button
            type="button"
            onClick={() => setScrolling((current) => !current)}
            className="rounded bg-teal-600 px-3 py-1 text-xs font-semibold text-white"
          >
            {scrolling ? "Pause" : "Start"}
          </button>

          <button
            type="button"
            onClick={resetScroll}
            className="rounded border px-3 py-1 text-xs"
          >
            Reset
          </button>

          <label className="flex items-center gap-2 text-xs">
            Speed
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="w-32 cursor-pointer"
            />
            <span className="w-16 tabular-nums">{speed} px/s</span>
          </label>
        </div>
      )}

      {/* Main practice area */}
      <section className="min-h-0 flex-1">
        {songType === "tab" ? (
          pdfUrl ? (
            <PdfViewer pdfUrl={pdfUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Original PDF unavailable.
            </div>
          )
        ) : (
          <div ref={scrollRef} className="h-full overflow-y-auto p-4">
            {renderMusic()}
          </div>
        )}
      </section>

      {/* Draggable divider */}
      {videoVisible && (
        <div
          role="separator"
          aria-label="Resize YouTube player"
          aria-orientation="horizontal"
          onPointerDown={(event) => {
            if (event.button !== 0) return;

            dragRef.current = {
              startY: event.clientY,
              startHeight: videoHeight,
            };

            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
          }}
          className="flex h-4 shrink-0 cursor-row-resize touch-none items-center justify-center border-y bg-slate-200 hover:bg-teal-100"
          title="Drag to resize YouTube"
        >
          <div className="h-1 w-12 rounded-full bg-slate-400" />
        </div>
      )}

      {/* YouTube area stays mounted during resizing */}
      <footer
        className={
          videoVisible
            ? "min-h-0 shrink-0 overflow-hidden bg-slate-950"
            : "h-0 shrink-0 overflow-hidden"
        }
        style={{
          height: videoVisible ? videoHeight : 0,
        }}
      >
        {youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={`${title} - YouTube practice`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No YouTube video linked to this song.
          </div>
        )}
      </footer>

      {/* Song information dialog */}
      {infoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Song Information"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <header className="flex shrink-0 items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold text-slate-800">
                🎸 Song Information
              </h2>

              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="rounded-lg border px-3 py-1 text-sm"
              >
                Close ✕
              </button>
            </header>

            <div className="space-y-5 overflow-y-auto p-5 text-sm">
              <div>
                <p className="text-xs text-slate-500">Song Title</p>
                <p className="mt-1 font-semibold">{title}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Song Type</p>
                <p className="mt-1 capitalize">
                  {songType === "tab" ? "PDF-only Tab" : songType}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Class Introduction Date
                </p>
                <p className="mt-1">{classDate || "Not specified"}</p>
              </div>

              <div className="border-t pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">
                    📝 Description / Class Notes
                  </h3>

                  {!editingNotes && isDesktop && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotes(savedNotes);
                        setNotesError("");
                        setEditingNotes(true);
                      }}
                      className="rounded-lg border px-3 py-1 text-xs text-teal-700"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>

                {editingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={5}
                      placeholder="Notes from today's guitar class..."
                      className="w-full rounded-lg border border-slate-300 p-3"
                    />

                    {notesError && (
                      <p role="alert" className="text-xs text-red-600">
                        {notesError}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveClassNotes}
                        disabled={savingNotes}
                        className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {savingNotes ? "Saving..." : "Save Notes"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNotes(savedNotes);
                          setEditingNotes(false);
                          setNotesError("");
                        }}
                        disabled={savingNotes}
                        className="rounded-lg border px-4 py-2 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">
                    {savedNotes || "No class notes added yet."}
                  </p>
                )}
              </div>

              {(tempo != null || timeSignature) && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-xs text-slate-500">Tempo</p>
                    <p>{tempo != null ? `${tempo} BPM` : "—"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Time Signature</p>
                    <p>{timeSignature || "—"}</p>
                  </div>
                </div>
              )}

              {songType === "chords" && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-xs text-slate-500">Capo</p>
                    <p>{capo ? `Fret ${capo}` : "No capo"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Strumming Pattern</p>
                    <p>{strummingPattern || "Not specified"}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-xs text-slate-500">YouTube</p>

                {youtubeUrl ? (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-teal-700 underline"
                  >
                    Open Song Video ↗
                  </a>
                ) : (
                  <p className="mt-1 text-slate-500">
                    No YouTube video linked.
                  </p>
                )}
              </div>

              <Link
                href={`/edit?id=${encodeURIComponent(songId)}`}
                className="block rounded-lg border border-teal-600 px-4 py-3 text-center font-semibold text-teal-700"
              >
                ✏️ Edit Full Song
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Compare dialog */}
      {comparing && pdfUrl && songType !== "tab" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Compare with original PDF"
          className="fixed inset-0 z-50 flex flex-col bg-white"
        >
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Compare with Original PDF</h2>

            <button
              type="button"
              onClick={() => setComparing(false)}
              className="rounded border px-3 py-1 text-sm"
            >
              Close ✕
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 p-3">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
              <h3 className="shrink-0 border-b bg-slate-50 px-3 py-2 text-sm font-semibold">
                {songType === "melody"
                  ? "Extracted Melody"
                  : "Extracted Chords"}
              </h3>

              <div className="min-h-0 flex-1 overflow-auto p-3">
                {renderMusic()}
              </div>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
              <h3 className="shrink-0 border-b bg-slate-50 px-3 py-2 text-sm font-semibold">
                Original PDF
              </h3>

              <div className="min-h-0 flex-1">
                <PdfViewer pdfUrl={pdfUrl} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
