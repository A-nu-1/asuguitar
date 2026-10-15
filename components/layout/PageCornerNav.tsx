
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PageCornerNav() {
  const router = useRouter();

  return (
    <div
      aria-label="Page shortcuts"
      className="flex items-center justify-end gap-2"
    >
      <button
        type="button"
        onClick={() => router.back()}
        title="Go back"
        aria-label="Go back"
        className="rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1.5 text-sm shadow-sm transition-transform hover:-rotate-12 hover:scale-110"
      >
        🐶
      </button>

      <Link
        href="/"
        title="Go home"
        aria-label="Go home"
        className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-sm shadow-sm transition-transform hover:scale-110"
      >
        🏰
      </Link>
    </div>
  );
}
