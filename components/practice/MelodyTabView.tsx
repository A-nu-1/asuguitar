
import type { Bar, Note } from "@/types/guitar";

type Props = {
  bars: Bar[];
};

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

  return notes.length > 0
    ? 10 + (index / notes.length) * 80
    : 10;
}

function TabBar({ bar }: { bar: Bar }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-xs font-semibold text-slate-500">
        Bar {bar.number}
      </div>

      <div className="relative h-28 rounded-md border border-slate-200 bg-white px-2">
        <div className="absolute inset-x-2 top-5 bottom-5 flex flex-col justify-between">
          {[1, 2, 3, 4, 5, 6].map((stringNumber) => (
            <div
              key={stringNumber}
              className="relative h-px bg-slate-400"
            />
          ))}
        </div>

        {bar.notes
          .filter(
            (note) =>
              note.string >= 1 && note.string <= 6,
          )
          .map((note) => {
            const left = getNotePosition(note, bar.notes);

            return (
              <span
                key={note.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 bg-white px-1 font-mono text-sm font-semibold text-slate-900"
                style={{
                  left: `${left}%`,
                  top: `calc(20px + (100% - 40px) * ${(note.string - 1) / 5})`,
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

export default function MelodyTabView({ bars }: Props) {
  if (bars.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
        No melody bars available.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {Array.from(
        { length: Math.ceil(bars.length / 4) },
        (_, rowIndex) => bars.slice(rowIndex * 4, rowIndex * 4 + 4),
      ).map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          {row.map((bar) => (
            <TabBar key={bar.id} bar={bar} />
          ))}
        </div>
      ))}
    </div>
  );
}
