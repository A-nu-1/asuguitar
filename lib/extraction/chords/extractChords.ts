import type { Token, Song, ChordPlacement } from "@/types/guitar";

const uid = () => Math.random().toString(36).slice(2, 10);

function isPageNumber(text: string): boolean {
  const value = text.trim();

  return (
    /^Page\s+\d+(?:\s*\/\s*\d+)?$/i.test(value) ||
    /^\d+\s*\/\s*\d+$/.test(value) ||
    /^-\s*\d+\s*-$/.test(value)
  );
}

type ChordLine = Song["chordLines"][number] & {
  placements?: ChordPlacement[];
};

type PdfRow = {
  page: number;
  y: number;
  tokens: Token[];
  text: string;
};

const CHORD_PATTERN =
  /^[A-G](?:#|b)?(?:(?:maj|min|dim|aug|sus|add|m|M)\d*|\d+)?(?:\/[A-G](?:#|b)?)?$/i;

function isChordToken(value: string): boolean {
  return CHORD_PATTERN.test(value.trim());
}

function isChordRow(text: string): boolean {
  const parts = text.trim().split(/\s+/).filter(Boolean);

  return parts.length > 0 && parts.every(isChordToken);
}

function isSection(text: string): boolean {
  return /^\[(Intro|Verse|Chorus|Bridge|Outro|Pre-Chorus|Instrumental)(?:\s+[^\]]+)?\]/i.test(
    text.trim(),
  );
}

function cleanSection(text: string): string {
  const match = text.trim().match(/^\[([^\]]+)\]/);
  return match ? match[1].trim() : text.trim();
}

function createRows(tokens: Token[]): PdfRow[] {
  const rows: PdfRow[] = [];

  const pages = [...new Set(tokens.map((t) => t.page))].sort((a, b) => a - b);

  for (const page of pages) {
    const pageTokens = tokens
      .filter((t) => t.page === page && t.y !== null && t.text.trim())
      .sort((a, b) => a.y! - b.y! || (a.x ?? 0) - (b.x ?? 0));

    const groups: Token[][] = [];

    for (const token of pageTokens) {
      let group = groups.find((row) => Math.abs(row[0].y! - token.y!) < 5);

      if (!group) {
        group = [];
        groups.push(group);
      }

      group.push(token);
    }

    for (const group of groups) {
      const sorted = [...group].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));

      const text = sorted
        .map((t) => t.text.trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      if (!text) continue;

      rows.push({
        page,
        y: sorted[0].y!,
        tokens: sorted,
        text,
      });
    }
  }

  return rows;
}

function isPageContinuation(
  chordRow: PdfRow,
  lyricRow: PdfRow,
  rows: PdfRow[],
): boolean {
  if (lyricRow.page !== chordRow.page + 1) {
    return false;
  }

  const lastChordPageRow = [...rows]
    .filter((row) => row.page === chordRow.page && !isPageNumber(row.text))
    .at(-1);

  const firstLyricPageRow = rows.find(
    (row) => row.page === lyricRow.page && !isPageNumber(row.text),
  );

  return lastChordPageRow === chordRow && firstLyricPageRow === lyricRow;
}

function extractPlacements(row: PdfRow): ChordPlacement[] {
  const chordTokens = row.tokens.flatMap((token) => {
    const parts = token.text.trim().split(/\s+/);

    // A single PDF token containing multiple chords does
    // not give reliable X coordinates for each chord.
    if (parts.length !== 1 || !isChordToken(parts[0])) {
      return [];
    }

    return [
      {
        chord: parts[0],
        x: token.x,
      },
    ];
  });

  const xs = row.tokens
    .map((token) => token.x)
    .filter((x): x is number => x !== null);

  if (xs.length === 0) return [];

  // Relative positions are provisional.
  // Later we'll use actual PDF page width to improve them.
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  return chordTokens
    .filter((token) => token.x !== null)
    .map((token) => ({
      id: uid(),
      chord: token.chord,
      sourceX: token.x!,
      position:
        maxX > minX ? Math.round(((token.x! - minX) / (maxX - minX)) * 90) : 0,
    }));
}

function mapChordsToLyrics(
  placements: ChordPlacement[],
  lyricRow: PdfRow,
): ChordPlacement[] {
  const lyricTokens = lyricRow.tokens.filter(
    (token) => token.x !== null && token.text.trim(),
  );

  if (!lyricTokens.length) return placements;

  // Estimate each character's horizontal position using
  // the PDF token coordinates.
  const characters: { index: number; x: number }[] = [];

  let charIndex = 0;

  for (let i = 0; i < lyricTokens.length; i++) {
    const token = lyricTokens[i];

    if (i > 0) {
      // The row text joins tokens with one space.
      charIndex += 1;
    }

    const value = token.text.trim();

    // Approximation: each token uses its available X span.
    const nextX = lyricTokens[i + 1]?.x;

    const estimatedWidth =
      nextX !== null && nextX !== undefined
        ? Math.max(1, nextX - token.x!)
        : value.length * 7;

    for (let j = 0; j < value.length; j++) {
      characters.push({
        index: charIndex + j,
        x: token.x! + (j / Math.max(1, value.length)) * estimatedWidth,
      });
    }

    charIndex += value.length;
  }

  return placements.map((placement) => {
    if (placement.sourceX === undefined) {
      return placement;
    }

    const closest = characters.reduce(
      (best, character) =>
        Math.abs(character.x - placement.sourceX!) <
        Math.abs(best.x - placement.sourceX!)
          ? character
          : best,
      characters[0],
    );

    return {
      ...placement,
      charIndex: closest.index,
      manuallyPositioned: false,
    };
  });
}

function newLine(
  section: string,
  chords = "",
  lyrics = "",
  placements: ChordPlacement[] = [],
): ChordLine {
  return {
    id: uid(),
    section,
    chords,
    lyrics,
    placements,
  };
}

export function extractChords(
  tokens: Token[],
  method: string,
  filename: string,
): Song {
  const lines: ChordLine[] = [];
  let section = "Unassigned";

  const hasCoordinates = tokens.some(
    (token) => token.x !== null && token.y !== null,
  );

  if (!hasCoordinates) {
    // Coordinate-free extraction: preserve rows instead
    // of guessing their horizontal positions.
    for (const token of tokens) {
      const text = token.text.trim();

      if (!text || isPageNumber(text)) continue;

      if (isSection(text)) {
        section = cleanSection(text);
        continue;
      }

      if (isChordRow(text)) {
        lines.push(newLine(section, text));
      } else {
        const previous = lines.at(-1);

        if (
          previous &&
          previous.section === section &&
          previous.chords &&
          !previous.lyrics
        ) {
          previous.lyrics = text;
        } else {
          lines.push(newLine(section, "", text));
        }
      }
    }
  } else {
    const rows = createRows(tokens);

    for (const row of rows) {
      const text = row.text;

      if (isPageNumber(text)) continue;

      if (isSection(text)) {
        section = cleanSection(text);
        continue;
      }

      if (isChordRow(text)) {
        lines.push(newLine(section, text, "", extractPlacements(row)));

        continue;
      }

      const previous = lines.at(-1);

      const previousRow = rows
        .slice(0, rows.indexOf(row))
        .reverse()
        .find((candidate) => !isPageNumber(candidate.text));

      const directlyBelow =
        previousRow &&
        ((previousRow.page === row.page &&
          row.y > previousRow.y &&
          row.y - previousRow.y < 45) ||
          isPageContinuation(previousRow, row, rows));

      if (
        previous &&
        previous.section === section &&
        previous.chords &&
        !previous.lyrics &&
        directlyBelow
      ) {
        previous.lyrics = text;

        if (previous.placements?.length) {
          previous.placements = mapChordsToLyrics(previous.placements, row);
        }
      } else {
        lines.push(newLine(section, "", text));
      }
    }
  }

  return {
    title: "All I Want for Christmas Is You",
    mode: "chords",
    timeSignature: "",
    tempo: 150,
    bars: [],
    chordLines: lines,
    source: { method, filename },
  };
}
