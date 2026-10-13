
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-slate-800"
        >
          <span>🎸</span>
          <span>Asu Guitar Lab</span>
        </Link>

        <div className="flex flex-wrap items-center gap-5 text-sm font-medium">
          <Link href="/" className="text-slate-600 hover:text-teal-700">
            Home
          </Link>

          <Link
  href="/add"
  className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
>
  + Add Song
</Link>

          <Link href="/melody" className="text-slate-600 hover:text-teal-700">
            Melody
          </Link>

          <Link href="/chords" className="text-slate-600 hover:text-teal-700">
            Chords
          </Link>

          <Link href="/lab" className="text-slate-600 hover:text-teal-700">
            Lab
          </Link>

          <Link href="/practice" className="text-slate-600 hover:text-teal-700">
            Practice
          </Link>

          <Link href="/extraction-test" className="text-slate-600 hover:text-teal-700">
            Extraction
          </Link>
        </div>
      </div>
    </nav>
  );
}
