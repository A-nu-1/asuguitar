"use client";

import { useRef, useState, useEffect } from "react";
import type { ChordPlacement } from "@/types/guitar";

type Props = {
  lyrics: string;
  placements: ChordPlacement[];
  onChange: (placements: ChordPlacement[]) => void;
};

const LEFT_PADDING = 16;
const CHORD_GAP = 8;
const CHORD_HORIZONTAL_PADDING = 12;

export default function ChordPreview({ lyrics, placements, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const visibleLyrics = lyrics || " ";

  const [charWidth, setCharWidth] = useState(12);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measurement = document.createElement("span");

    measurement.textContent = "MMMMMMMMMM";
    measurement.style.font = getComputedStyle(element).font;
    measurement.style.position = "absolute";
    measurement.style.visibility = "hidden";
    measurement.style.whiteSpace = "pre";

    element.appendChild(measurement);

    const width = measurement.getBoundingClientRect().width / 10;

    if (width > 0) {
      setCharWidth(width);
    }

    measurement.remove();
  }, []);

  function getCharIndex(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect();

    if (!rect) return 0;

    const x = clientX - rect.left - LEFT_PADDING;

    return Math.max(
      0,
      Math.min(visibleLyrics.length, Math.round(x / charWidth)),
    );
  }

  function updatePlacement(id: string, charIndex: number) {
    onChange(
      placements.map((placement) =>
        placement.id === id
          ? {
              ...placement,
              charIndex,
              manuallyPositioned: true,
            }
          : placement,
      ),
    );
  }

  function getLeft(placement: ChordPlacement): number {
    if (placement.charIndex !== undefined && placement.charIndex !== null) {
      return placement.charIndex * charWidth + LEFT_PADDING;
    }

    // Existing percentage positions are kept as a fallback.
    const availableWidth = Math.max(visibleLyrics.length * charWidth, 240);

    return LEFT_PADDING + (placement.position / 100) * availableWidth;
  }

  function getDisplayPlacements() {
    const positioned = placements.map((placement, index) => ({
      placement,
      index,
      preferredLeft: getLeft(placement),
    }));

    positioned.sort(
      (a, b) => a.preferredLeft - b.preferredLeft || a.index - b.index,
    );

    let nextAvailableLeft = LEFT_PADDING;

    const result = positioned.map((item) => {
      const left = Math.max(item.preferredLeft, nextAvailableLeft);

      const estimatedChordWidth =
        item.placement.chord.length * charWidth + CHORD_HORIZONTAL_PADDING;

      nextAvailableLeft = left + estimatedChordWidth + CHORD_GAP;

      return {
        ...item,
        left,
      };
    });

    return result;
  }

  const displayPlacements = getDisplayPlacements();

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs text-slate-500">
        Drag a chord horizontally to align it with a lyric character.
      </p>

      <div
        ref={containerRef}
        className="relative min-h-20 font-mono"
        style={{
          width: Math.max(
            visibleLyrics.length * charWidth + 60,
            displayPlacements.reduce(
              (max, item) =>
                Math.max(
                  max,
                  item.left +
                    item.placement.chord.length * charWidth +
                    CHORD_HORIZONTAL_PADDING +
                    20,
                ),
              300,
            ),
          ),
        }}
      >
        <div className="absolute inset-x-0 top-0 h-9">
          {displayPlacements.map(({ placement, left }) => (
            <button
              key={placement.id}
              type="button"
              className={`absolute top-0 z-10 cursor-grab select-none rounded px-1.5 py-1 text-sm font-bold touch-none ${
                draggingId === placement.id
                  ? "bg-teal-200 text-teal-900"
                  : "bg-teal-50 text-teal-700 hover:bg-teal-100"
              }`}
              style={{
                left,
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                setDraggingId(placement.id);
              }}
              onPointerMove={(event) => {
                if (draggingId !== placement.id) return;

                updatePlacement(placement.id, getCharIndex(event.clientX));
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }

                setDraggingId(null);
              }}
              onPointerCancel={() => setDraggingId(null)}
            >
              {placement.chord}
            </button>
          ))}
        </div>

        <div
          className="absolute top-11 whitespace-pre text-base text-slate-800"
          style={{
            left: LEFT_PADDING,
            letterSpacing: 0,
          }}
        >
          {visibleLyrics}
        </div>
      </div>
    </div>
  );
}
