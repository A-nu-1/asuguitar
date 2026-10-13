
"use client";


import { useEffect, useMemo, useState } from "react";

import {
  loadLibrarySongs,
  type LibrarySong,
} from "@/lib/supabase/loadSongs";



export default function HomePage() {
  const [search, setSearch] = useState("");
const [songs, setSongs] = useState<LibrarySong[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  let active = true;

  async function fetchSongs() {
    try {
      const data = await loadLibrarySongs();

      if (active) {
        setSongs(data);
      }
    } catch (err) {
      if (active) {
        setError(
          err instanceof Error ? err.message : String(err),
        );
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  void fetchSongs();

  return () => {
    active = false;
  };
}, []);

const filteredSongs = useMemo(() => {
  return songs
    .filter((song) =>
      song.title
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    )
    .sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
}, [songs, search]);

  function renderColumn(
    category: LibrarySong["song_type"],
    heading: string,
  ) {
    const columnSongs = filteredSongs.filter(
      (song) => song.song_type === category,
    );

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          {heading}
        </h2>
{loading && (
  <p className="mb-4 text-sm text-slate-500">
    Loading your songs...
  </p>
)}

{error && (
  <p role="alert" className="mb-4 text-sm text-red-600">
    Could not load songs: {error}
  </p>
)}
        <div className="space-y-3">
          {columnSongs.map((song) => (
            <div
              key={song.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <h3 className="font-semibold text-slate-800">
                {song.title}
              </h3>

             <p className="mt-1 text-xs text-slate-500">
  Added On: {new Date(song.created_at).toLocaleDateString("en-CH")}
</p>
            </div>
          ))}

          {columnSongs.length === 0 && (
            <p className="text-sm text-slate-400">
              No songs found.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          🎸 My Guitar Songs
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Find your song and start practicing!
        </p>
      </header>

      <div className="mb-6 flex gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search songs..."
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
        />

        <button
          type="button"
          disabled
          title="Voice search coming soon"
          className="rounded-xl border border-slate-200 bg-slate-100 px-4 text-xl opacity-60"
        >
          🎤
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-5">
        {renderColumn("melody", "🎼 Melody / Tabs")}
        {renderColumn("chords", "🎶 Chords")}
      </div>

    
    </main>
  );
}
