"use client";

import { useMemo } from "react";
import type { ChordLine, ChordPlacement } from "@/types/guitar";

type Props = {
  lines: ChordLine[];
  activeLineId?: string | null;
  onLineSelect?: (lineId: string) => void;
};

const CHAR_WIDTH = 9;
const LEFT_PADDING = 16;
const CHORD_GAP = 8;

const PASTEL_CHORD_COLORS = [
  { backgroundColor: "#EAC1CB", color: "#6D2941" }, // rose
  { backgroundColor: "#C7D8F3", color: "#284B7D" }, // blue
  { backgroundColor: "#D6C9ED", color: "#52367A" }, // lavender
  { backgroundColor: "#F1D8A9", color: "#745016" }, // honey
  { backgroundColor: "#BFDCCF", color: "#225746" }, // mint
  { backgroundColor: "#F1CDB4", color: "#7A3A24" }, // peach
  { backgroundColor: "#C4E3E7", color: "#245B65" }, // aqua
  { backgroundColor: "#DFD2BE", color: "#5D482E" }, // beige
];

function ChordRow({
  line,
  chordColors,
}: {
  line: ChordLine;
  chordColors: Record<string, number>;
}) {
  const lyrics = line.lyrics || " ";
  const placements = line.placements ?? [];

  const positioned = placements
    .map((placement: ChordPlacement, index) => {
      const left =
        placement.charIndex !== undefined && placement.charIndex !== null
          ? placement.charIndex * CHAR_WIDTH
          : (placement.position / 100) *
            Math.max(lyrics.length * CHAR_WIDTH, 240);

      return { placement, index, left };
    })
    .sort((a, b) => a.left - b.left || a.index - b.index);

  let nextLeft = LEFT_PADDING;

  const displayed = positioned.map((item) => {
    const left = Math.max(LEFT_PADDING + item.left, nextLeft);

    nextLeft = left + item.placement.chord.length * CHAR_WIDTH + 16 + CHORD_GAP;

    return { ...item, left };
  });

  const width = Math.max(
    lyrics.length * CHAR_WIDTH + 60,
    ...displayed.map(
      ({ placement, left }) => left + placement.chord.length * CHAR_WIDTH + 40,
    ),
    300,
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
      <div className="relative h-20 font-mono" style={{ width }}>
        {displayed.map(({ placement, left }) => {
          const colorIndex = chordColors[placement.id] ?? 0;
          const colorStyle = PASTEL_CHORD_COLORS[colorIndex];

          return (
            <span
              key={placement.id}
              className="absolute top-0 whitespace-nowrap rounded px-1.5 py-1 text-sm font-bold shadow-sm"
              style={{
                left,
                ...colorStyle,
              }}
            >
              {placement.chord}
            </span>
          );
        })}

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

export default function ChordSheetView({
  lines,
  activeLineId,
  onLineSelect,
}: Props) {
  const chordColors = useMemo(() => {
    const map: Record<string, number> = {};

    for (const line of lines) {
      for (const placement of line.placements ?? []) {
        map[placement.id] = Math.floor(
          Math.random() * PASTEL_CHORD_COLORS.length,
        );
      }
    }

    return map;
  }, [lines]);

  if (lines.length === 0) {
    return <p className="text-sm text-slate-500">No chord lines available.</p>;
  }

  return (
    <div className="space-y-4">
      {lines.map((line, index) => {
        const previousSection = index > 0 ? lines[index - 1].section : null;

        const showSection = line.section && line.section !== previousSection;

        return (
          <div
            key={line.id}
            data-chord-line-id={line.id}
            onClick={onLineSelect ? () => onLineSelect(line.id) : undefined}
            className={`      rounded-xl p-2      transition-all duration-200
                    ${onLineSelect ? "cursor-pointer" : ""}
      ${
        activeLineId === line.id
          ? "bg-violet-100 ring-2 ring-fuchsia-500 shadow-lg shadow-fuchsia-200"
          : "bg-transparent"
      }
    `}
          >
            {showSection && (
              <h3 className="mb-2 mt-4 text-sm font-semibold text-slate-700">
                {line.section}
              </h3>
            )}

            <ChordRow line={line} chordColors={chordColors} />
          </div>
        );
      })}
    </div>
  );
}
