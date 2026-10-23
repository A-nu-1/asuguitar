"use client";

import { useEffect, useRef, useState } from "react";
import MelodyTabView from "@/components/practice/MelodyTabView";
import ChordSheetView from "@/components/practice/ChordSheetView";
import PdfViewer from "@/components/practice/PdfViewer";
import type { Bar, ChordLine } from "@/types/guitar";
import Link from "next/link";
import YouTubeSyncPlayer from "@/components/practice/YouTubeSyncPlayer";

const SONG_ICONS = Array.from(
  { length: 24 },
  (_, index) => `/magic/pointers/i${index + 1}.png`,
);

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
  demoTimings?: {
    barId: string;
    seconds: number;
  }[];
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
  demoTimings,
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
  // Currently selected guitar bar.
  // Later, YouTube synchronization will control this.
  const [activeBarId, setActiveBarId] = useState<string | null>(null);

  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [youtubeTime, setYoutubeTime] = useState(0);

  type BarTiming = {
    barId: string;
    seconds: number;
  };

  const [barTimings, setBarTimings] = useState<BarTiming[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncDirty, setSyncDirty] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [editingBarId, setEditingBarId] = useState<string | null>(null);

  const [editingTime, setEditingTime] = useState("");
  const [editingTimeError, setEditingTimeError] = useState("");
  const [syncSetup, setSyncSetup] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  const [youtubeStatus, setYoutubeStatus] = useState<
    "unstarted" | "playing" | "paused" | "buffering" | "ended" | "error"
  >("unstarted");

  const speedRef = useRef(speed);
  const youtubeId = getYouTubeId(youtubeUrl || "");

  const [infoOpen, setInfoOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(description ?? "");
  const [savedNotes, setSavedNotes] = useState(description ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");

  const [crystalMenuOpen, setCrystalMenuOpen] = useState(false);
  const isDesktop =
    typeof window !== "undefined" && !!window.guitarAPI?.updateSong;

  const [songIcon, setSongIcon] = useState(SONG_ICONS[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * SONG_ICONS.length);
    setSongIcon(SONG_ICONS[randomIndex]);
  }, [songId]);

  useEffect(() => {
    setNotes(description ?? "");
    setSavedNotes(description ?? "");
    setEditingNotes(false);
  }, [songId, description]);

  useEffect(() => {
    let cancelled = false;

    setBarTimings([]);
    setSyncSetup(false);
    setSyncEnabled(false);
    setActiveBarId(null);
    setYoutubeTime(0);
    setSyncDirty(false);
    setSyncError("");
    setSyncMessage("");
    setEditingBarId(null);
    setEditingTime("");
    setEditingTimeError("");

    async function loadMappings() {
      if (!youtubeId || !window.guitarAPI?.getSongSync) {
        // Browser demo only. Never replace Electron's saved mappings.
        const sampleMappings =
          !window.guitarAPI && youtubeId ? (demoTimings ?? []) : [];

        setBarTimings(sampleMappings);
        setSyncLoading(false);
        setEditingBarId(null);
        setEditingTime("");
        setEditingTimeError("");

        if (sampleMappings.length > 0) {
          setSyncMessage(`${sampleMappings.length} sample mappings loaded.`);
        }

        return;
      }

      setSyncLoading(true);

      try {
        const saved = await window.guitarAPI.getSongSync(songId, youtubeId);

        if (cancelled) return;

        setBarTimings(saved);
        setSyncMessage(`${saved.length} mappings loaded.`);
      } catch (error) {
        if (!cancelled) {
          setSyncError(
            error instanceof Error
              ? error.message
              : "Could not load synchronization mappings.",
          );
        }
      } finally {
        if (!cancelled) setSyncLoading(false);
      }
    }

    void loadMappings();

    return () => {
      cancelled = true;
    };
  }, [songId, youtubeId, demoTimings]);

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

  function canLeaveSong(): boolean {
    if (syncSaving) {
      window.alert(
        "Your YouTube timings are still being saved.\n" +
          "Please wait for the save result before leaving.",
      );
      return false;
    }

    if (syncDirty) {
      return window.confirm(
        "You have unsaved YouTube timing changes.\n\n" +
          "OK = Leave and discard unsaved changes\n" +
          "Cancel = Stay on this song",
      );
    }

    return true;
  }

  // Warn when closing or reloading with pending changes.
  useEffect(() => {
    if (!syncDirty && !syncSaving) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [syncDirty, syncSaving]);

  function resetScroll() {
    setScrolling(false);

    scrollRef.current?.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }

  function handleBarSelect(barId: string) {
    setActiveBarId(barId);

    if (!syncSetup || syncLoading || syncSaving || editingBarId !== null)
      return;

    setSyncDirty(true);
    setSyncMessage("");

    // Capture the current YouTube position.
    const seconds = Math.round(youtubeTime * 10) / 10;

    setBarTimings((current) => {
      const withoutCurrent = current.filter((item) => item.barId !== barId);

      return [...withoutCurrent, { barId, seconds }].sort(
        (a, b) => a.seconds - b.seconds,
      );
    });
  }
  // Match the playing YouTube timestamp to a guitar bar.
  useEffect(() => {
    if (!syncEnabled || syncSetup || songType !== "melody") {
      return;
    }

    const currentBar = [...barTimings]
      .sort((a, b) => a.seconds - b.seconds)
      .filter((item) => item.seconds <= youtubeTime)
      .at(-1);

    setActiveBarId(currentBar?.barId ?? null);
  }, [youtubeTime, barTimings, syncEnabled, syncSetup, songType]);
  // Keep the synchronized bar visible inside the music panel.
  useEffect(() => {
    if (!syncEnabled || syncSetup || !activeBarId) return;

    const container = scrollRef.current;
    if (!container) return;

    const target = Array.from(
      container.querySelectorAll<HTMLElement>("[data-bar-id]"),
    ).find((element) => element.dataset.barId === activeBarId);

    if (!target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const top = container.scrollTop + targetRect.top - containerRect.top - 24;

    container.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth",
    });
  }, [activeBarId, syncEnabled, syncSetup]);

  function parseTimingInput(value: string): number | null {
    const input = value.trim();

    // Accepts formats such as 0:18, 1:25, 1:25.5
    const match = input.match(/^(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/);

    if (!match) return null;

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const fraction = match[3] ? Number(`0.${match[3]}`) : 0;

    const total = minutes * 60 + seconds + fraction;

    return Number.isFinite(total) ? total : null;
  }

  function formatTimingInput(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toFixed(3);

    return `${minutes}:${remainder.padStart(6, "0")}`;
  }

  function editBarTiming(barId: string) {
    if (syncSaving || syncLoading || !syncSetup) return;

    const existing = barTimings.find((item) => item.barId === barId);

    if (!existing) return;

    setEditingBarId(barId);
    setEditingTime(formatTimingInput(existing.seconds));
    setEditingTimeError("");
  }

  function applyEditedTiming(barId: string) {
    if (syncSaving || syncLoading) return;

    const seconds = parseTimingInput(editingTime);

    if (seconds === null) {
      setEditingTimeError("Use MM:SS or MM:SS.sss (example: 0:19.500).");
      return;
    }

    const existing = barTimings.find((item) => item.barId === barId);

    if (!existing) return;

    if (existing.seconds !== seconds) {
      setBarTimings((current) =>
        current
          .map((item) => (item.barId === barId ? { ...item, seconds } : item))
          .sort((a, b) => a.seconds - b.seconds),
      );

      setSyncDirty(true);
      setSyncMessage("");
      setSyncError("");
    }

    setEditingBarId(null);
    setEditingTime("");
    setEditingTimeError("");
  }

  async function saveTimings() {
    if (
      syncSaving ||
      syncLoading ||
      !syncDirty ||
      !youtubeId ||
      !window.guitarAPI?.saveSongSync
    ) {
      return;
    }

    // Capture exactly what is being saved.
    const snapshot = barTimings.map((item) => ({ ...item }));

    setSyncSaving(true);
    setSyncError("");
    setSyncMessage("");

    try {
      const result = await window.guitarAPI.saveSongSync(
        songId,
        youtubeId,
        snapshot,
      );

      if (!result.success) {
        throw new Error("SQLite did not confirm the save.");
      }

      setSyncDirty(false);
      setSyncMessage(`✅ ${result.savedCount} bar timings saved successfully!`);
    } catch (error) {
      // Do not clear or replace the user's mappings.
      setSyncDirty(true);

      setSyncError(
        error instanceof Error
          ? `Save failed: ${error.message}`
          : "Save failed. Your unsaved mappings are still available.",
      );
    } finally {
      // Always restore the normal controls on completion or error.
      setSyncSaving(false);
    }
  }

  function renderMusic() {
    if (songType === "melody") {
      return (
        <MelodyTabView
          bars={bars}
          activeBarId={activeBarId}
          onBarSelect={handleBarSelect}
        />
      );
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
  function formatVideoTime(seconds: number) {
    const total = Math.floor(seconds);

    const minutes = Math.floor(total / 60);
    const remainingSeconds = total % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      {/* Magical practice navigation */}
      <div
        className="
    relative z-30 flex shrink-0 flex-wrap
    items-center justify-between gap-x-4 gap-y-2
    border-b border-fuchsia-400/40
    bg-gradient-to-r from-[#171331]
    via-[#302052] to-[#131c43]
    px-4 py-3 text-violet-100
    shadow-[0_4px_20px_rgba(128,72,218,0.25)]
    sm:px-6
  "
      >
        {/* CENTERED SONG TITLE */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <img
            src={songIcon}
            alt=""
            className="
      h-12 w-12 shrink-0 object-contain
      drop-shadow-[0_0_12px_#dca5ff]
    "
          />

          <h1
            title={title}
            className="
      min-w-0 truncate text-center
      !text-2xl font-extrabold tracking-tight
      text-violet-100
      drop-shadow-[0_0_10px_#b98cff]
      sm:!text-3xl
    "
          >
            {title}
          </h1>
        </div>

        {/* CENTER: Music scrolling controls */}
        {songType !== "tab" && (
          <div
            aria-label="Music scrolling controls"
            className="
        flex shrink-0 items-center gap-2
        rounded-full border border-violet-300/30
        bg-violet-950/40 px-2 py-1
        shadow-[inset_0_0_12px_#9060ff22]
      "
          >
            {/* Crystal Play / Pause */}
            <button
              type="button"
              onClick={() => setScrolling((current) => !current)}
              aria-label={
                scrolling
                  ? "Pause automatic scrolling"
                  : "Start automatic scrolling"
              }
              title={scrolling ? "Pause scrolling" : "Play scrolling"}
              className={`
          group/play relative flex h-11 w-11
          shrink-0 items-center justify-center
          rounded-full border text-2xl font-bold
          transition-all duration-300
          hover:scale-110
          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-pink-300
          ${
            scrolling
              ? `
                border-rose-300
                bg-gradient-to-br
                from-pink-400 via-fuchsia-600 to-violet-700
                text-white
                shadow-[0_0_18px_#ef79ee99]
              `
              : `
                border-cyan-200
                bg-gradient-to-br
                from-cyan-300 via-violet-400 to-fuchsia-600
                text-white
                shadow-[0_0_20px_#9d8affbb]
              `
          }
        `}
            >
              <span
                aria-hidden="true"
                className="
            transition-transform
            group-hover/play:scale-110
          "
              >
                {scrolling ? "Ⅱ" : "❯"}
              </span>
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={resetScroll}
              aria-label="Reset music to beginning"
              title="Reset to beginning"
              className="
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-full border border-violet-300/50
          bg-violet-400/15 text-xl text-violet-100
          transition-all duration-300
          hover:rotate-[-35deg] hover:bg-violet-400/35
          hover:shadow-[0_0_12px_#ba95ff]
        "
            >
              ↺
            </button>

            {/* Existing speed functionality */}
            <label
              className="
          flex items-center gap-2
          text-xs font-semibold text-violet-200
        "
            >
              <span className="hidden sm:inline">Speed</span>

              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                aria-label="Automatic scroll speed"
                className="  w-32 cursor-pointer  accent-fuchsia-400  sm:w-52  lg:w-84"
              />

              <span className=" w-14 whitespace-nowrap text-right text-[11px] tabular-nums text-pink-200 ">
                {speed} px/s
              </span>
            </label>
          </div>
        )}

        {/* RIGHT: Crystal tools, information and home */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Crystal dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCrystalMenuOpen((current) => !current)}
              aria-label="Open practice tools"
              aria-expanded={crystalMenuOpen}
              aria-haspopup="menu"
              title="Practice tools"
              className={`
          flex h-11 w-11 items-center justify-center
          rounded-full border border-fuchsia-300/60
          bg-gradient-to-br from-violet-500/30
          to-fuchsia-600/30 text-2xl
          transition-all duration-300
          hover:scale-110
          hover:shadow-[0_0_18px_#df9bff]
          ${crystalMenuOpen ? "scale-105 shadow-[0_0_20px_#df9bff]" : ""}
        `}
            >
              🔮
            </button>

            {crystalMenuOpen && (
              <>
                {/* Outside click closes the menu */}
                <button
                  type="button"
                  aria-label="Close practice tools"
                  tabIndex={-1}
                  onClick={() => setCrystalMenuOpen(false)}
                  className="
              fixed inset-0 z-40
              cursor-default bg-transparent
            "
                />

                <div
                  role="menu"
                  aria-label="Practice tools"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setCrystalMenuOpen(false);
                    }
                  }}
                  className="
              absolute right-0 top-14 z-50
              w-56 rounded-2xl
              border border-fuchsia-300/50
              bg-[#21183f]/95 p-2
              shadow-[0_10px_35px_#0d062bcc]
              backdrop-blur-xl
            "
                >
                  <Link
                    role="menuitem"
                    href={`/edit?id=${encodeURIComponent(songId)}`}
                    onClick={(event) => {
                      if (!canLeaveSong()) {
                        event.preventDefault();
                        return;
                      }

                      setCrystalMenuOpen(false);
                    }}
                    className="
                block rounded-xl px-4 py-3
                text-sm font-semibold text-violet-100
                transition-colors hover:bg-violet-500/35
              "
                  >
                    ✏️ Edit Song
                  </Link>

                  {songType !== "tab" && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!pdfUrl}
                      onClick={() => {
                        setScrolling(false);
                        setComparing(true);
                        setCrystalMenuOpen(false);
                      }}
                      title={
                        pdfUrl
                          ? "Compare with original PDF"
                          : "Original PDF unavailable"
                      }
                      className="
                  block w-full rounded-xl px-4 py-3
                  text-left text-sm font-semibold
                  text-violet-100
                  transition-colors
                  hover:bg-violet-500/35
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                    >
                      📄 Compare with PDF
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setVideoVisible((current) => !current);
                      setCrystalMenuOpen(false);
                    }}
                    className="
                block w-full rounded-xl px-4 py-3
                text-left text-sm font-semibold
                text-violet-100
                transition-colors hover:bg-violet-500/35
              "
                  >
                    {videoVisible ? "🎬 Hide Video" : "🎬 Show Video"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Song Information */}
          <button
            type="button"
            onClick={() => {
              setCrystalMenuOpen(false);
              setInfoOpen(true);
            }}
            title="Song information"
            aria-label="Song information"
            className="
        flex h-11 w-11 items-center justify-center
        rounded-full border border-cyan-300/60
        bg-gradient-to-br
        from-cyan-400/20 to-violet-500/30
        text-2xl font-bold text-cyan-100
        shadow-[0_0_12px_#8bdcff55]
        transition-all duration-300
        hover:scale-110
        hover:shadow-[0_0_20px_#8bdcff]
      "
          >
            ⓘ
          </button>

          {/* Bigger Home castle */}
          <Link
            href="/"
            title="Return to magical homepage"
            aria-label="Return home"
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-300/70 bg-gradient-to-br from-pink-400/25 via-violet-500/30        to-cyan-400/20        text-3xl        shadow-[0_0_18px_#e4a4ff88]        transition-all duration-300        hover:-translate-y-1 hover:scale-110        hover:shadow-[0_0_25px_#f0aeff]      "
            onClick={(event) => {
              if (!canLeaveSong()) {
                event.preventDefault();
              }
            }}
          >
            🏰
          </Link>
        </div>
        {youtubeId && songType === "melody" && (
          <button
            type="button"
            onClick={() => setSyncPanelOpen((current) => !current)}
            aria-label={
              syncPanelOpen
                ? "Collapse YouTube synchronization controls"
                : "Expand YouTube synchronization controls"
            }
            aria-expanded={syncPanelOpen}
            title={
              syncSaving
                ? "Saving YouTube timings..."
                : syncDirty
                  ? "YouTube synchronization - unsaved changes"
                  : "YouTube synchronization"
            }
            className="       absolute -bottom-6 left-1/2 z-40       flex h-6 w-14 -translate-x-1/2
                               items-center justify-center
                                   rounded-b-xl border border-t-0 border-fuchsia-400/50
                                 bg-[#302052] text-violet-100
                                shadow-lg transition-colors hover:bg-violet-700"
          >
            {syncSaving ? "⏳" : syncDirty ? "●" : syncPanelOpen ? "⌃" : "⌄"}
          </button>
        )}
      </div>

      {syncPanelOpen && (
        <>
          {" "}
          {youtubeId && (
            <div className="flex pt-6 shrink-0 items-center justify-center gap-3 border-b border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">
              <span>🎬 YouTube:</span>

              <span className="tabular-nums">
                {formatVideoTime(youtubeTime)}
              </span>

              <span className="rounded-full bg-white px-3 py-1 capitalize">
                {youtubeStatus}
              </span>
            </div>
          )}
          {youtubeId && songType === "melody" && (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-b border-violet-200 bg-white px-3 py-2 text-xs">
              <button
                type="button"
                disabled={syncLoading || syncSaving || editingBarId !== null}
                onClick={() => {
                  setSyncSetup((current) => !current);
                  setSyncEnabled(false);
                  setScrolling(false);
                }}
                className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                  syncSetup
                    ? "bg-fuchsia-600 text-white"
                    : "border border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800"
                }`}
              >
                {syncSetup ? "✓ Finish Setting Timings" : "🎯 Set Timings"}
              </button>

              <button
                type="button"
                disabled={
                  barTimings.length === 0 ||
                  syncSetup ||
                  syncLoading ||
                  syncSaving
                }
                onClick={() => {
                  setSyncEnabled((current) => !current);
                  setScrolling(false);
                }}
                className={`rounded-lg px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  syncEnabled
                    ? "bg-emerald-600 text-white"
                    : "border border-emerald-300 bg-emerald-50 text-emerald-800"
                }`}
              >
                {syncEnabled ? "🔗 Sync ON" : "🔗 Sync OFF"}
              </button>

              <span className="font-medium text-slate-600">
                {barTimings.length} / {bars.length} bars mapped
              </span>

              {syncSetup && (
                <span className="text-fuchsia-700">
                  Play YouTube, then click each bar at its start time.
                </span>
              )}

              {barTimings.length > 0 && (
                <button
                  type="button"
                  disabled={syncLoading || syncSaving || editingBarId !== null}
                  onClick={() => {
                    if (syncSaving || syncLoading) return;

                    setBarTimings([]);
                    setSyncEnabled(false);
                    setActiveBarId(null);
                    setSyncDirty(true);
                    setSyncMessage("");
                    setSyncError("");
                  }}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-rose-700 hover:bg-rose-50"
                >
                  Clear Timings
                </button>
              )}
              {window.guitarAPI?.saveSongSync && (
                <button
                  type="button"
                  onClick={() => void saveTimings()}
                  disabled={
                    !syncDirty ||
                    syncSaving ||
                    syncLoading ||
                    editingBarId !== null
                  }
                  className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {syncSaving
                    ? "⏳ Saving..."
                    : syncError
                      ? "🔄 Retry Save"
                      : "💾 Save Timings"}
                </button>
              )}
              {syncLoading && (
                <span className="text-violet-600">Loading mappings...</span>
              )}
              {syncSaving && (
                <span role="status" className="font-semibold text-violet-700">
                  ⏳ Saving to SQLite... Please wait.
                </span>
              )}
              {syncDirty && (
                <span className="font-semibold text-amber-600">
                  ● Unsaved changes
                </span>
              )}

              {syncMessage && (
                <span className="text-emerald-700">{syncMessage}</span>
              )}

              {syncError && (
                <span role="alert" className="text-rose-600">
                  {syncError}
                </span>
              )}
            </div>
          )}
          {youtubeId && songType === "melody" && barTimings.length > 0 && (
            <div className="shrink-0 border-b border-violet-200 bg-violet-50 px-4 py-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 text-xs font-bold text-violet-800">
                  🎼 Mapped Bars:
                </span>

                {barTimings.map((timing) => {
                  const bar = bars.find((item) => item.id === timing.barId);

                  const isActive = activeBarId === timing.barId;

                  return (
                    <div
                      key={timing.barId}
                      className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                        isActive
                          ? "border-fuchsia-500 bg-fuchsia-100 text-fuchsia-900"
                          : "border-violet-200 bg-white text-violet-700"
                      }`}
                    >
                      <span className="font-semibold">
                        Bar {bar?.number ?? "?"}
                      </span>

                      {syncSetup ? (
                        editingBarId === timing.barId ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={editingTime}
                                onChange={(event) => {
                                  setEditingTime(event.target.value);
                                  setEditingTimeError("");
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    applyEditedTiming(timing.barId);
                                  }

                                  if (event.key === "Escape") {
                                    setEditingBarId(null);
                                    setEditingTimeError("");
                                  }
                                }}
                                disabled={syncSaving || syncLoading}
                                autoFocus
                                aria-label="Edit bar timestamp"
                                className="w-24 rounded border border-fuchsia-400 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-fuchsia-300"
                              />

                              {editingTimeError && (
                                <span
                                  role="alert"
                                  className="max-w-44 text-[10px] text-red-600"
                                >
                                  {editingTimeError}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={syncSaving || syncLoading}
                              onClick={() => applyEditedTiming(timing.barId)}
                              className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white disabled:opacity-40"
                              title="Apply timestamp"
                            >
                              ✓
                            </button>

                            <button
                              type="button"
                              disabled={syncSaving || syncLoading}
                              onClick={() => {
                                setEditingBarId(null);
                                setEditingTimeError("");
                              }}
                              className="rounded border border-slate-300 px-2 py-1 text-slate-600 disabled:opacity-40"
                              title="Cancel timestamp edit"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              syncSaving || syncLoading || editingBarId !== null
                            }
                            onClick={() => editBarTiming(timing.barId)}
                            title="Edit this timestamp"
                            className="rounded px-1 font-semibold tabular-nums text-fuchsia-700 underline decoration-dotted hover:bg-fuchsia-100 disabled:opacity-40"
                          >
                            ✏️ {formatTimingInput(timing.seconds)}
                          </button>
                        )
                      ) : (
                        <span className="tabular-nums">
                          {formatVideoTime(timing.seconds)}
                        </span>
                      )}

                      {syncSetup && (
                        <button
                          type="button"
                          disabled={
                            syncLoading || syncSaving || editingBarId !== null
                          }
                          onClick={() => {
                            if (syncSaving || syncLoading) return;

                            setBarTimings((current) =>
                              current.filter(
                                (item) => item.barId !== timing.barId,
                              ),
                            );

                            setSyncDirty(true);
                            setSyncMessage("");
                            setSyncError("");
                          }}
                          title="Remove this bar timing"
                          className="font-bold text-rose-500 hover:text-rose-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Main practice area */}
      <section className="min-h-0 flex-1 pt-3">
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
          <YouTubeSyncPlayer
            key={youtubeId}
            videoId={youtubeId}
            title={`${title} - YouTube practice`}
            onTimeChange={setYoutubeTime}
            onStatusChange={setYoutubeStatus}
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
                onClick={(event) => {
                  if (!canLeaveSong()) {
                    event.preventDefault();
                  }
                }}
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
