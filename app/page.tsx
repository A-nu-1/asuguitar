"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import MagicScene from "@/components/magic/MagicScene";
import { demoSongs } from "@/lib/dev/sampleSongs";
import type { GuitarAPI, LibrarySong } from "@/types/guitar";

const SONG_ICONS = Array.from(
  { length: 24 },
  (_, index) => `/magic/pointers/i${index + 1}.png`,
);

const MELODY_ICON = "/magic/pointers/mel-icon.png";
const CHORD_ICON = "/magic/pointers/chord-icon.png";

type SpeechResult = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechError = {
  error: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: ((event: SpeechError) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    guitarAPI?: GuitarAPI;
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showDemoMicrophone, setShowDemoMicrophone] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const [songIcons, setSongIcons] = useState<Record<string, string>>({});

  useEffect(() => {
    const icons: Record<string, string> = {};

    songs.forEach((song) => {
      const randomIndex = Math.floor(Math.random() * SONG_ICONS.length);

      icons[song.id] = SONG_ICONS[randomIndex];
    });

    setSongIcons(icons);
  }, [songs]);

  // Load songs.
  useEffect(() => {
    let active = true;

    async function fetchSongs() {
      try {
        let data: LibrarySong[];

        if (window.guitarAPI?.getSongs) {
          // Electron: actual SQLite songs.
          data = await window.guitarAPI.getSongs();
        } else if (process.env.NODE_ENV === "development") {
          // Chrome development demo.
          data = demoSongs.map((song) => ({
            id: song.id,
            title: song.title,
            song_type: song.song_type,
            class_date: song.class_date,
            created_at: song.created_at,
          }));
        } else {
          throw new Error(
            "Local guitar database is unavailable. Please open the Electron app.",
          );
        }

        if (active) setSongs(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchSongs();

    return () => {
      active = false;
    };
  }, []);

  // Chrome demo microphone only.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || window.guitarAPI) {
      return;
    }

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) return;

    const recognition = new Recognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();

      if (transcript) {
        setSearch(transcript);
        setVoiceError("");
      }
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error === "not-allowed") {
        setVoiceError("Please allow microphone access.");
      } else if (event.error === "no-speech") {
        setVoiceError("No speech detected. Try again.");
      } else if (event.error !== "aborted") {
        setVoiceError(`Voice recognition failed: ${event.error}`);
      }
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setShowDemoMicrophone(true);

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  function toggleVoiceSearch() {
    const recognition = recognitionRef.current;

    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }

    setVoiceError("");

    try {
      recognition.start();
      setListening(true);
    } catch (err) {
      setListening(false);
      setVoiceError(
        err instanceof Error ? err.message : "Could not start voice search.",
      );
    }
  }

  // Simple text matching, no fuzzy guesses.
  const filteredSongs = useMemo(() => {
    const query = search.toLowerCase().trim();

    return songs
      .filter((song) => song.title.toLowerCase().includes(query))
      .sort((a, b) => {
        const dateA = a.class_date || a.created_at;
        const dateB = b.class_date || b.created_at;

        return dateB.localeCompare(dateA);
      });
  }, [songs, search]);

  function renderColumn(category: "melody" | "chords", heading: string) {
    const columnSongs = filteredSongs.filter((song) =>
      category === "melody"
        ? song.song_type === "melody" || song.song_type === "tab"
        : song.song_type === "chords",
    );

    return (
      <section
        className="
          flex min-w-0 flex-col rounded-[1.75rem]
          border border-white/39 bg-white/29
          p-4 shadow-[0_10px_35px_#b46fd355]
          backdrop-blur-md
          group-data-[magic-theme=midnight]:border-violet-400/50
          group-data-[magic-theme=midnight]:bg-[#24194b]/50
          sm:p-5
        "
      >
        <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-fuchsia-200/60 pb-3">
          <img
            src={category === "melody" ? MELODY_ICON : CHORD_ICON}
            alt=""
            className="h-11 w-11 shrink-0 object-contain drop-shadow-[0_0_10px_#e9a5ff]"
          />

          <h2 className="text-lg font-extrabold text-violet-900 group-data-[magic-theme=midnight]:text-violet-100">
            {heading}
          </h2>

          <span className="ml-auto rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold text-violet-600 group-data-[magic-theme=midnight]:bg-violet-700 group-data-[magic-theme=midnight]:text-violet-100">
            {columnSongs.length}
          </span>
        </div>

        {loading && <p className="text-sm">Loading your songs...</p>}

        {error && (
          <p role="alert" className="text-sm text-rose-600">
            Could not load songs: {error}
          </p>
        )}

        <div
          aria-label={`${heading} song list`}
          tabIndex={0}
          className="
            h-[50vh] min-h-[250px] max-h-[550px]
            space-y-1.5 overflow-y-scroll overscroll-contain
            pr-2 pb-2
            [scrollbar-color:#c793e6_transparent]
            [scrollbar-width:thin]
            focus-visible:outline-2 focus-visible:outline-violet-400
          "
        >
          {columnSongs.map((song) => (
            <Link
              key={song.id}
              href={`/songs?id=${encodeURIComponent(song.id)}`}
              className="
                group/song flex min-h-11 items-center gap-3
                rounded-xl border border-fuchsia-200/70
                bg-gradient-to-r from-pink-50/95
                via-white/95 to-violet-100/95
                px-3 py-2 shadow-[0_2px_8px_#d495e32a]
                transition-all duration-200
                hover:translate-x-1
                hover:border-fuchsia-400
                hover:shadow-[0_3px_14px_#e680e977]
                focus-visible:outline-2 focus-visible:outline-fuchsia-500
                group-data-[magic-theme=midnight]:border-violet-400/40
                group-data-[magic-theme=midnight]:from-[#342453]
                group-data-[magic-theme=midnight]:via-[#292146]
                group-data-[magic-theme=midnight]:to-[#19345a]
              "
            >
              <span
                aria-hidden="true"
                className="
    flex h-10 w-10 shrink-0 items-center justify-center
    rounded-lg
    transition-transform duration-300
    group-hover/song:scale-125
  "
              >
                <img
                  src={songIcons[song.id] ?? SONG_ICONS[0]}
                  alt=""
                  loading="lazy"
                  className="
      h-full w-full object-contain
      drop-shadow-[0_0_7px_#e6a4ff]
    "
                />
              </span>

              <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-violet-900 group-data-[magic-theme=midnight]:text-violet-100">
                {song.title}
                {song.song_type === "tab" && !song.title.includes("📄") && (
                  <span aria-label="PDF only"> 📄</span>
                )}
              </span>

              <span
                aria-hidden="true"
                className="shrink-0 text-base text-fuchsia-600 transition-transform group-hover/song:translate-x-1 group-data-[magic-theme=midnight]:text-fuchsia-300"
              >
                ›
              </span>
            </Link>
          ))}

          {!loading && !error && columnSongs.length === 0 && (
            <p className="rounded-xl bg-white/50 p-3 text-sm text-violet-700 group-data-[magic-theme=midnight]:text-violet-200">
              No songs found.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <MagicScene>
      <main className="relative mx-auto max-w-[1480px] px-2 pb-3 sm:px-5">
        {/* Title and search on the SAME line */}
        <div className="mb-4 ml-23 flex flex-wrap items-center justify-between gap-3 pr-24">
          <h1 className="!text-5xl font-black tracking-tight text-fuchsia-800 drop-shadow-[0_2px_3px_#ffffffaa] group-data-[magic-theme=midnight]:text-violet-100">
            🎸 Asu&apos;s Guitar Songs ✨
          </h1>

          <div
            className="
              flex w-full max-w-sm min-w-0 items-center gap-2
              rounded-full border border-pink-300/80
              bg-white/90 px-3 py-1
              shadow-[0_0_14px_#eda3f799]
              backdrop-blur-md
              group-data-[magic-theme=midnight]:border-violet-400/60
              group-data-[magic-theme=midnight]:bg-[#211a45]/90
              sm:w-72
            "
          >
            <span aria-hidden="true" className="text-lg text-fuchsia-600">
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a song..."
              aria-label="Search songs"
              className="  w-full min-w-0 flex-1  rounded-full border-0  !bg-gray/60 px-3 py-2  text-sm text-violet-900  outline-none  placeholder:text-violet-400  focus:ring-0  group-data-[magic-theme=midnight]:!bg-[#30234e]/80  group-data-[magic-theme=midnight]:text-violet-100  group-data-[magic-theme=midnight]:placeholder:text-violet-300/70"
            />

            {showDemoMicrophone && (
              <button
                type="button"
                onClick={toggleVoiceSearch}
                aria-label={
                  listening ? "Stop voice search" : "Start voice search"
                }
                aria-pressed={listening}
                className={`rounded-full border px-2 py-1.5 text-base ${
                  listening
                    ? "animate-pulse border-rose-400 bg-rose-100"
                    : "border-pink-200 bg-pink-100 hover:bg-pink-200"
                }`}
              >
                {listening ? "🔴" : "🎤"}
              </button>
            )}
          </div>
        </div>

        {showDemoMicrophone && listening && (
          <p role="status" className="mb-2 text-sm text-violet-700">
            🎤 Listening... say a song name!
          </p>
        )}

        {showDemoMicrophone && voiceError && (
          <p role="alert" className="mb-2 text-sm text-rose-600">
            {voiceError}
          </p>
        )}

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-6">
          {renderColumn("melody", "Melody / Tabs")}
          {renderColumn("chords", "Chords")}
        </div>
      </main>
    </MagicScene>
  );
}
