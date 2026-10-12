
import Link from "next/link";
import { MELODY_SAMPLES } from "@/lib/melody/constants";

export default function MelodyLibraryPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Melody Library
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Guitar tablature and melody practice.
          </p>
        </div>

        <Link
          href="/lab?mode=melody"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Open Melody Editor
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MELODY_SAMPLES.map((sample) => (
          <div
            key={sample.key}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 text-3xl">🎼</div>

            <h2 className="font-semibold text-slate-800">
              {sample.label}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Sample · Melody tablature
            </p>

            <Link
              href={`/lab?mode=melody&sample=${encodeURIComponent(sample.key)}`}
              className="mt-5 inline-block text-sm font-semibold text-teal-700 hover:underline"
            >
              Edit melody →
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
