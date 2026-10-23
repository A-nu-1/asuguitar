import type { Bar, Note, MelodySymbol } from "@/types/guitar";

type Props = {
  bars: Bar[];
  activeBarId?: string | null;
  onBarSelect?: (barId: string) => void;
};

const STRING_COLORS = [
  { background: "#DCCAF2", text: "#5B3B87", line: "#9B79CC" }, // 1 - Purple (High E)
  { background: "#C8D9F6", text: "#294D8A", line: "#6A95D8" }, // 2 - Blue (B)
  { background: "#C9E7C5", text: "#22603A", line: "#67A86D" }, // 3 - Green (G)
  { background: "#F3E7A6", text: "#7A630D", line: "#D5BE42" }, // 4 - Yellow (D)
  { background: "#F6D3B1", text: "#8A4B16", line: "#E39A52" }, // 5 - Orange (A)
  { background: "#F4C7C3", text: "#8A2E2A", line: "#D96B63" }, // 6 - Red (Low E)
] as const;

function getNotePosition(note: Note, notes: Note[]): number {
  if (note.position !== undefined) {
    return Math.max(5, Math.min(90, note.position));
  }

  const xs = notes
    .map((item) => item.sourceX)
    .filter((x): x is number => x !== undefined);

  if (note.sourceX !== undefined && xs.length > 1) {
    const min = Math.min(...xs);
    const max = Math.max(...xs);

    if (max > min) {
      return 10 + ((note.sourceX - min) / (max - min)) * 80;
    }
  }

  const index = notes.findIndex((item) => item.id === note.id);

  return notes.length > 0 ? 10 + (index / notes.length) * 80 : 10;
}

function PracticeSymbol({ symbol }: { symbol: MelodySymbol }) {
  const isArc = symbol.type === "hammer-on" || symbol.type === "pull-off";

  const isSlide = symbol.type === "slide-up" || symbol.type === "slide-down";

  if (isArc) {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-label={symbol.type}
        style={{ overflow: "visible" }}
      >
        <path
          d="M 3 35 Q 50 -24 97 35"
          fill="none"
          stroke="#9333ea"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (isSlide) {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-label={symbol.type}
      >
        <line
          x1="8"
          y1={symbol.type === "slide-up" ? 36 : 4}
          x2="92"
          y2={symbol.type === "slide-up" ? 4 : 36}
          stroke="#9333ea"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const glyphs: Record<string, string> = {
    "rest-quarter": "𝄽",
    "rest-eighth": "𝄾",
    "rest-half": "𝄼",
    "rest-whole": "𝄻",
    coda: "𝄌",
    segno: "𝄋",
  };

  const number = Math.max(1, Math.min(5, Number(symbol.text ?? 2) || 2));

  const glyph =
  symbol.type === "finger"
    ? "①②③④⑤"[number - 1]
    : symbol.type === "text"
      ? symbol.text || "S"
      : (glyphs[symbol.type] ?? "?");

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label={symbol.type}
      style={{ overflow: "visible" }}
    >
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fontFamily='"Segoe UI Symbol", "Cambria Math", sans-serif'
        fontSize="72"
        fill="#7e22ce"
      >
        {glyph}
      </text>
    </svg>
  );
}

function TabBar({
  bar,
  isActive = false,
  onSelect,
}: {
  bar: Bar;
  isActive?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      data-bar-id={bar.id}
      onClick={onSelect}
      className={`
        min-w-0 rounded-xl p-2
        transition-all duration-200
        ${onSelect ? "cursor-pointer" : ""}
        ${
          isActive
            ? "bg-violet-100 ring-2 ring-fuchsia-500 shadow-lg shadow-fuchsia-200"
            : "bg-transparent"
        }
      `}
    >
      <div className="mb-2 text-xs font-semibold text-slate-500">
        Bar {bar.number}
      </div>

      <div className="relative h-[160px] rounded-md border border-slate-200 bg-white px-2">
        <div className="absolute inset-x-2 top-6 bottom-6 flex flex-col justify-between">
          {[1, 2, 3, 4, 5, 6].map((stringNumber) => (
            <div
              key={stringNumber}
              className="relative h-[2px]"
              style={{
                backgroundColor: STRING_COLORS[stringNumber - 1].line,
              }}
            />
          ))}
        </div>

        {bar.notes
          .filter((note) => note.string >= 1 && note.string <= 6)
          .map((note) => {
            const left = getNotePosition(note, bar.notes);

            return (
              <span
                key={note.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-sm font-bold"
                style={{
                  left: `${left}%`,
                  top: `calc(20px + (100% - 40px) * ${(note.string - 1) / 5})`,
                  backgroundColor: STRING_COLORS[note.string - 1].background,
                  color: STRING_COLORS[note.string - 1].text,
                }}
                title={`String ${note.string}, fret ${note.fret}`}
              >
                {note.fret}
              </span>
            );
          })}

        {/* Saved musical symbols — display only */}
        <div
          className="pointer-events-none absolute inset-x-2 top-6 bottom-6 z-20"
          aria-label="Musical symbols"
        >
          {(bar.symbols ?? []).map((symbol) => {
            const width = Math.max(4, Math.min(90, symbol.width ?? 10));

            const height = Math.max(6, Math.min(70, symbol.height ?? 15));

            const x = Math.max(0, Math.min(100 - width, symbol.x));

            const y = Math.max(0, Math.min(100 - height, symbol.y));

            return (
              <div
                key={symbol.id}
                className="pointer-events-none absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  transform: `rotate(${symbol.rotation ?? 0}deg)`,
                  transformOrigin: "center",
                }}
                title={symbol.type}
              >
                <PracticeSymbol symbol={symbol} />
              </div>
            );
          })}
        </div>
      </div>

      {bar.lyrics && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
          {bar.lyrics}
        </p>
      )}
    </div>
  );
}

export default function MelodyTabView({
  bars,
  activeBarId,
  onBarSelect,
}: Props) {
  if (bars.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
        No melody bars available.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {Array.from({ length: Math.ceil(bars.length / 4) }, (_, rowIndex) =>
        bars.slice(rowIndex * 4, rowIndex * 4 + 4),
      ).map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          {row.map((bar) => (
            <TabBar
              key={bar.id}
              bar={bar}
              isActive={activeBarId === bar.id}
              onSelect={onBarSelect ? () => onBarSelect(bar.id) : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
