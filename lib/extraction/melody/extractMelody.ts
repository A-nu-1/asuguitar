
import type {
  Token,
  Geometry,
  Song,
} from "@/types/guitar";

const uid = () => Math.random().toString(36).slice(2, 10);

export function extractMelody(
  tokens: Token[],
  method: string,
  filename: string,
  geometry: Geometry[],
): Song {
  const valid = tokens.filter(
    (t) =>
      t.x !== null &&
      t.y !== null &&
      /^\d{1,2}$/.test(t.text.trim()) &&
      Number(t.text) <= 24,
  );

  const bars = geometry.map((g) => {
    const stringSpacing = (g.bottom - g.top) / 5;

    const candidates = valid
      .filter(
        (t) =>
           t.page === (g.page ?? 1) &&
          t.x! >= g.x0 + 1 &&
          t.x! < g.x1 - 1,
      )
      .map((t) => {
        // PDF.js text Y usually represents the
        // text baseline, slightly below the
        // actual guitar string.
        const textBaselineOffset = stringSpacing * 0.2;

        const adjustedY = t.y! - textBaselineOffset;

        const string =
          Math.round(
            (adjustedY - g.top) / stringSpacing,
          ) + 1;

        const nearestStringY =
          g.top + (string - 1) * stringSpacing;

        const distance =
          Math.abs(adjustedY - nearestStringY);

        return {
          ...t,
          string,
          distance,
        };
      })
      .filter(
        (t) =>
          t.string >= 1 &&
          t.string <= 6 &&
          t.distance <= stringSpacing * 0.4,
      )
      .sort(
        (a, b) =>
          a.x! - b.x! || a.y! - b.y!,
      );

    return {
      id: uid(),
      number: g.number,
      section: "Unassigned",
      lyrics: "",
      notes: candidates.map((t) => ({
        id: uid(),
        string: t.string,
        fret: t.text.trim(),
        beat: null,
        duration: null,
        sourceX: t.x!,
        sourceY: t.y!,
      })),
    };
  });

  return {
    title: filename.replace(/\.pdf$/i, ""),
    mode: "melody",
    timeSignature: "",
    tempo: null,
    bars,
    chordLines: [],
    source: { method, filename },
  };
}
