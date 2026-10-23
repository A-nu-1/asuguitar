import type { Bar, Note } from "@/types/guitar";

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
