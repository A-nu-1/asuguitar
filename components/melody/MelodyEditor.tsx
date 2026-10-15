"use client";
import { useRef, useState } from "react";
import type { Bar, Note, Song } from "@/types/guitar";
type Props = {
  song: Song;
  updateSong: (fn: (song: Song) => Song) => void;
  pdfUrl?: string | null;
  onSelectPdf?: (file: File) => void;
};
const uid = () => Math.random().toString(36).slice(2, 10);
const note = (): Note => ({
  id: uid(),
  string: 1,
  fret: "0",
  beat: null,
  duration: null,
});
function getNotePosition(n: Note, notes: Note[]): number {
  if (n.position !== undefined) {
    return Math.max(0, Math.min(94, n.position));
  }
  const xs = notes
    .map((item) => item.sourceX)
    .filter((x): x is number => x !== undefined);
  if (n.sourceX !== undefined && xs.length > 1) {
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    if (max > min) return ((n.sourceX - min) / (max - min)) * 90;
  }
  return 5;
}
export default function MelodyEditor({
  song,
  updateSong,
  pdfUrl,
  onSelectPdf,
}: Props) {
  const [selected, setSelected] = useState(0);
  const draggingNoteId = useRef<string | null>(null);
  const active = song.bars[selected];

  function createEmptyBar(): Bar {
    return {
      id: uid(),
      number: 0,
      section: "",
      lyrics: "",
      notes: [],
    };
  }

  function insertBar(index: number) {
    updateSong((s) => {
      const bars = [...s.bars];

      bars.splice(index, 0, createEmptyBar());

      return {
        ...s,
        bars: bars.map((bar, i) => ({
          ...bar,
          number: i + 1,
        })),
      };
    });

    setSelected(index);
  }

  function deleteBar() {
    if (!active) return;

    if (!window.confirm(`Delete Bar ${active.number}?`)) {
      return;
    }

    updateSong((s) => ({
      ...s,
      bars: s.bars
        .filter((bar) => bar.id !== active.id)
        .map((bar, i) => ({
          ...bar,
          number: i + 1,
        })),
    }));

    setSelected((current) =>
      Math.max(0, Math.min(current, song.bars.length - 2)),
    );
  }

  function updateBar(fn: (bar: Bar) => Bar) {
    updateSong((s) => ({
      ...s,
      bars: s.bars.map((bar, i) => (i === selected ? fn(bar) : bar)),
    }));
  }
  function updateNote(id: string, field: keyof Note, value: any) {
    updateBar((bar) => ({
      ...bar,
      notes: bar.notes.map((n) => (n.id === id ? { ...n, [field]: value } : n)),
    }));
  }
  return (
    <div className="workspace">
      <aside className="panel sidebar">
        <div className="sidehead">
          <h2>Bars</h2>

          <button type="button" onClick={() => insertBar(song.bars.length)}>
            + Bar
          </button>
        </div>
        <div className="barlist">
          {song.bars.map((b, i) => (
            <button
              key={b.id}
              className={selected === i ? "active" : ""}
              onClick={() => setSelected(i)}
            >
              <b>Bar {b.number}</b>
              <span>{b.notes.length} notes</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="panel editor">
        {active ? (
          <>
            <div className="sidehead">
              <h2>Bar {active.number}</h2>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => insertBar(selected)}>
                  + Before
                </button>

                <button type="button" onClick={() => insertBar(selected + 1)}>
                  + After
                </button>
              </div>

              <button type="button" className="danger" onClick={deleteBar}>
                Delete bar
              </button>
            </div>

            <details className="sourcepdf">
              <summary>Compare with original PDF (click to expand)</summary>

              <div className="mt-3 space-y-3">
                {onSelectPdf && (
  <label className="block text-sm">
    Select original PDF for comparison

    <input
      type="file"
      accept=".pdf,application/pdf"
      className="mt-2 block w-full"
      onChange={(e) => {
        const file = e.target.files?.[0];

        if (file) {
          onSelectPdf(file);
        }

        e.target.value = "";
      }}
    />
  </label>
)}

                {pdfUrl ? (
                  <iframe
                    title={`Original PDF for ${song.title}`}
                    src={pdfUrl}
                    style={{
                      width: "100%",
                      height: 520,
                      border: "1px solid #ccd5df",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-500">
                    No original PDF selected. Choose a local PDF above to
                    compare with the extracted notes.
                  </p>
                )}
              </div>
            </details>

            <div className="barfields">
              <label>
                Bar number
                <input
                  type="number"
                  value={active.number}
                  onChange={(e) =>
                    updateBar((b) => ({
                      ...b,
                      number: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Section
                <input
                  value={active.section}
                  onChange={(e) =>
                    updateBar((b) => ({
                      ...b,
                      section: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={selected === 0}
                onClick={() => setSelected((current) => current - 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous Bar
              </button>

              <span className="text-sm text-slate-500">
                Bar {selected + 1} of {song.bars.length}
              </span>

              <button
                type="button"
                disabled={selected >= song.bars.length - 1}
                onClick={() => setSelected((current) => current + 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next Bar →
              </button>
            </div>
            <label className="barlyrics">
              Lyrics / notes for this bar{" "}
              <small>(optional; saved with this bar)</small>
              <textarea
                rows={3}
                placeholder="Type lyrics or teacher notes for this bar…"
                value={active.lyrics ?? ""}
                onChange={(e) =>
                  updateBar((b) => ({ ...b, lyrics: e.target.value }))
                }
              />
            </label>
            <div className="tabheading">
              Tab preview{" "}
              <small>
                Relative spacing from source X; editable beat positions override
                it when set
              </small>
            </div>

            <div
              className="tabpreview"
              onPointerMove={(e) => {
                const noteId = draggingNoteId.current;
                if (!noteId) return;

                const preview = e.currentTarget;

                const rows = Array.from(
                  preview.querySelectorAll<HTMLElement>(".stringrow"),
                );

                const firstLine =
                  rows[0]?.querySelector<HTMLElement>(".stringline");

                if (!firstLine) return;

                // Horizontal position.
                const rect = firstLine.getBoundingClientRect();

                const percentage = ((e.clientX - rect.left) / rect.width) * 100;

                const nextPosition = Math.max(
                  0,
                  Math.min(94, Math.round(percentage * 10) / 10),
                );

                // Vertical position: nearest guitar string.
                let nextString = 1;
                let nearestDistance = Infinity;

                rows.forEach((row, index) => {
                  const rowRect = row.getBoundingClientRect();
                  const centerY = rowRect.top + rowRect.height / 2;

                  const distance = Math.abs(e.clientY - centerY);

                  if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nextString = index + 1;
                  }
                });

                updateBar((bar) => ({
                  ...bar,
                  notes: bar.notes.map((note) =>
                    note.id === noteId
                      ? {
                          ...note,
                          position: nextPosition,
                          string: nextString,
                        }
                      : note,
                  ),
                }));
              }}
              onPointerUp={(e) => {
                draggingNoteId.current = null;

                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              }}
              onPointerCancel={() => {
                draggingNoteId.current = null;
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div className="stringrow" key={s}>
                  <span>{s}</span>
                  <div className="stringline" style={{ touchAction: "none" }}>
                    {active.notes
                      .filter((n) => n.string === s)
                      .map((n) => {
                        const left = getNotePosition(n, active.notes);
                        return (
                          <span
                            key={n.id}
                            className="fret"
                            style={{
                              left: `${left}%`,
                              cursor: "grab",
                              touchAction: "none",
                            }}
                            title={`String ${s}, fret ${n.fret}. Drag horizontally to reposition.`}
                            onPointerDown={(e) => {
                              if (e.button !== 0) return;

                              e.preventDefault();

                              draggingNoteId.current = n.id;

                              const preview =
                                e.currentTarget.closest<HTMLElement>(
                                  ".tabpreview",
                                );

                              preview?.setPointerCapture(e.pointerId);
                            }}
                          >
                            {n.fret}
                          </span>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
            <div className="sidehead">
              <h3>Notes ({active.notes.length})</h3>
              <button
                onClick={() =>
                  updateBar((b) => ({
                    ...b,
                    notes: [...b.notes, note()],
                  }))
                }
              >
                + Add note
              </button>
            </div>
            <div className="notes">
              <div className="notehead">
                <span>String (1–6)</span>
                <span>Fret</span>
                <span>Position (%)</span>
                <span>Beat (optional)</span>
                <span>Duration</span>
                <span />
              </div>
              {active.notes.map((n) => (
                <div className="noterow" key={n.id}>
                  <select
                    value={n.string}
                    onChange={(e) =>
                      updateNote(n.id, "string", Number(e.target.value))
                    }
                  >
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    value={n.fret}
                    onChange={(e) => updateNote(n.id, "fret", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    max="94"
                    step="0.1"
                    placeholder="Auto"
                    value={n.position ?? ""}
                    onChange={(e) =>
                      updateNote(
                        n.id,
                        "position",
                        e.target.value === ""
                          ? undefined
                          : Math.max(0, Math.min(94, Number(e.target.value))),
                      )
                    }
                  />
                  <input
                    type="number"
                    step="0.25"
                    placeholder="unknown"
                    value={n.beat ?? ""}
                    onChange={(e) =>
                      updateNote(
                        n.id,
                        "beat",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                  <input
                    type="number"
                    step="0.25"
                    placeholder="unknown"
                    value={n.duration ?? ""}
                    onChange={(e) =>
                      updateNote(
                        n.id,
                        "duration",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                  <button
                    className="danger"
                    title="Remove note"
                    onClick={() =>
                      updateBar((b) => ({
                        ...b,
                        notes: b.notes.filter((t) => t.id !== n.id),
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>No bars recognized. Add a bar manually.</p>
        )}
      </section>
    </div>
  );
}
