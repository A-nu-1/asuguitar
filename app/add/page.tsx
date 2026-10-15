
import Link from "next/link";

export default function AddSongPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          🎸 Add New Song
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Choose the type of song you want to add
          to your guitar library.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Link
          href="/add/melody"
          className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-teal-400 hover:shadow-md"
        >
          <div className="mb-4 text-4xl">🎼</div>

          <h2 className="text-xl font-semibold text-slate-800 group-hover:text-teal-700">
            Melody / Tabs
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Select a PDF, review the extracted tablature,
            and save it for practice.
          </p>

          <span className="mt-6 inline-block text-sm font-semibold text-teal-700">
            Add melody →
          </span>
        </Link>

       <Link href="/add/chords" className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-teal-400 hover:shadow-md">
          <div className="mb-4 text-4xl">🎶</div>

          <h2 className="text-xl font-semibold text-slate-800">
            Chords & Lyrics
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Add chord songs with lyrics and
            YouTube practice.
          </p>

          <span className="mt-6 inline-block text-sm font-semibold text-teal-700">
            Add Chord Song →
          </span>
        </Link>
      </div>

      <Link
        href="/"
        className="mt-8 inline-block text-sm font-semibold text-teal-700 hover:underline"
      >
        ← Back to song library
      </Link>
    </main>
  );
}
