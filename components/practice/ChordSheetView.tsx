
import type { ChordLine, ChordPlacement } from "@/types/guitar";

type Props = {
  lines: ChordLine[];
};

const CHAR_WIDTH = 9;
const LEFT_PADDING = 16;
const CHORD_GAP = 8;

function ChordRow({ line }: { line: ChordLine }) {
  const lyrics = line.lyrics || " ";
  const placements = line.placements ?? [];

  const positioned = placements
    .map((placement: ChordPlacement, index) => {
      const left =
        placement.charIndex !== undefined &&
        placement.charIndex !== null
          ? placement.charIndex * CHAR_WIDTH
          : (placement.position / 100) *
            Math.max(lyrics.length * CHAR_WIDTH, 240);

      return { placement, index, left };
    })
    .sort((a, b) => a.left - b.left || a.index - b.index);

  let nextLeft = LEFT_PADDING;

  const displayed = positioned.map((item) => {
    const left = Math.max(
      LEFT_PADDING + item.left,
      nextLeft
    );

    nextLeft =
      left +
      item.placement.chord.length * CHAR_WIDTH +
      16 +
      CHORD_GAP;

    return { ...item, left };
  });

  const width = Math.max(
    lyrics.length * CHAR_WIDTH + 60,
    ...displayed.map(
      ({ placement, left }) =>
        left + placement.chord.length * CHAR_WIDTH + 40
    ),
    300
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
      <div
        className="relative h-20 font-mono"
        style={{ width }}
      >
        {displayed.map(({ placement, left }) => (
          <span
            key={placement.id}
            className="absolute top-0 whitespace-nowrap rounded bg-teal-50 px-1.5 py-1 text-sm font-bold text-teal-700"
            style={{ left }}
          >
            {placement.chord}
          </span>
        ))}

        <div
          className="absolute top-11 whitespace-pre text-base text-slate-800"
          style={{ left: LEFT_PADDING }}
        >
          {lyrics}
        </div>
      </div>
    </div>
  );
}

export default function ChordSheetView({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No chord lines available.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {lines.map((line, index) => {
        const previousSection =
          index > 0 ? lines[index - 1].section : null;

        const showSection =
          line.section && line.section !== previousSection;

        return (
          <div key={line.id}>
            {showSection && (
              <h3 className="mb-2 mt-4 text-sm font-semibold text-slate-700">
                {line.section}
              </h3>
            )}

            <ChordRow line={line} />
          </div>
        );
      })}
    </div>
  );
}
