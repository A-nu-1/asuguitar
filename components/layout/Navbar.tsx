
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const developerLinks = [
  { href: "/melody", label: "🎼 Melody Tools" },
  { href: "/chords", label: "🎸 Chord Tools" },
  { href: "/lab", label: "🧪 Extraction Lab" },
  { href: "/practice", label: "🎵 Practice Tools" },
  { href: "/extraction-test", label: "🔮 Extraction Tests" },
];

export default function Navbar() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
    setDevOpen(false);
  }

  return (
    <nav
      aria-label="Main navigation"
      className="absolute left-3 top-3 z-50"
    >
      {/* Collapsed crystal */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        className="
          flex h-11 w-11 items-center justify-center
          rounded-full border border-violet-300
          bg-white/85 text-2xl
          shadow-lg shadow-pink-300/40
          backdrop-blur-md
          transition-all duration-300
          hover:scale-110 hover:rotate-12
        "
      >
        💎
      </button>

      {/* Magical dropdown */}
      {open && (
        <div
          className="
            absolute left-0 top-14 w-60
            rounded-2xl border border-pink-200
            bg-white/95 p-3
            shadow-2xl shadow-purple-300/40
            backdrop-blur-xl
          "
        >
          <p className="mb-3 px-2 text-sm font-extrabold text-fuchsia-800">
            ✨ Asu Guitar Lab
          </p>

          <div className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={closeMenu}
              aria-current={pathname === "/" ? "page" : undefined}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-purple-800 hover:bg-pink-100"
            >
              🏰 Home
            </Link>

            <Link
              href="/add"
              onClick={closeMenu}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-purple-800 hover:bg-pink-100"
            >
              💖 Add Song
            </Link>

            <button
              type="button"
              onClick={() => setDevOpen((current) => !current)}
              aria-expanded={devOpen}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-purple-800 hover:bg-violet-100"
            >
              <span>🔮 Developer Tools</span>
              <span>{devOpen ? "▲" : "▼"}</span>
            </button>

            {devOpen && (
              <div className="ml-3 flex flex-col gap-1 border-l-2 border-violet-200 pl-2">
                {developerLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
