
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Welcome to Asu Guitar Lab 🎸
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Your space to learn, edit and practice guitar.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Link
          href="/melody"
          className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:border-teal-400 hover:shadow-md"
        >
          <div className="mb-4 text-4xl">🎼</div>

          <h2 className="text-xl font-semibold text-slate-800 group-hover:text-teal-700">
            Melody
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Work with guitar tablature, edit notes and
            practice melodies.
          </p>

          <span className="mt-5 inline-block text-sm font-semibold text-teal-700">
            Open melody editor →
          </span>
        </Link>

        <Link
          href="/chords"
          className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:border-teal-400 hover:shadow-md"
        >
          <div className="mb-4 text-4xl">🎶</div>

          <h2 className="text-xl font-semibold text-slate-800 group-hover:text-teal-700">
            Chords & Lyrics
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Edit chords, align them with lyrics and
            prepare songs for practice.
          </p>

          <span className="mt-5 inline-block text-sm font-semibold text-teal-700">
            Open chord editor →
          </span>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-semibold text-slate-700">
          Development workspace
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          The current editor supports sample PDF extraction,
          manual corrections and JSON import/export.
        </p>

        <Link
          href="/lab"
          className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline"
        >
          Open Guitar Lab →
        </Link>
      </div>
    </main>
  );
}
