
import Link from "next/link";
import MelodyTabView from "@/components/practice/MelodyTabView";
import ChordSheetView from "@/components/practice/ChordSheetView";
import {
  sampleMelodyBars,
  sampleChordLines,
} from "@/lib/dev/sampleSongs";

export default function PreviewPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-8">
      <Link
        href="/"
        className="text-sm font-medium text-teal-700 hover:underline"
      >
        ← Back to songs
      </Link>

      <h1 className="text-2xl font-bold">
        🎸 Guitar Practice Preview
      </h1>

      <section>
        <h2 className="mb-4 text-xl font-semibold">
          🎼 Melody
        </h2>
        <MelodyTabView bars={sampleMelodyBars} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">
          🎶 Chords
        </h2>
        <ChordSheetView lines={sampleChordLines} />
      </section>
    </main>
  );
}
