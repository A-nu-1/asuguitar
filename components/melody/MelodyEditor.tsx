"use client";
import { useRef, useState } from "react";
import type {
  Bar,
  Note,
  Song,
  MelodySymbol,
  MelodySymbolType,
} from "@/types/guitar";
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

const SYMBOL_OPTIONS: {
  type: MelodySymbolType;
  label: string;
  preview: string;
}[] = [
  { type: "hammer-on", label: "Hammer-on", preview: "⌒ H" },
  { type: "pull-off", label: "Pull-off", preview: "⌒ P" },
  { type: "slide-up", label: "Slide up", preview: "/" },
  { type: "slide-down", label: "Slide down", preview: "\\" },
  { type: "rest-quarter", label: "Quarter rest", preview: "𝄽" },
  { type: "rest-eighth", label: "Eighth rest", preview: "𝄾" },
  { type: "rest-half", label: "Half rest", preview: "𝄼" },
  { type: "rest-whole", label: "Whole rest", preview: "𝄻" },
  { type: "coda", label: "Coda", preview: "𝄌" },
  { type: "segno", label: "Segno", preview: "𝄋" },
  { type: "finger", label: "Finger number", preview: "②" },
  { type: "text", label: "Text symbol", preview: "T" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function SymbolDrawing({ symbol }: { symbol: MelodySymbol }) {
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
      >
        <path
          d="M 3 35 Q 50 -24 97 35"
          fill="none"
          stroke="#9333ea"
          strokeWidth="3"
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
      >
        <line
          x1="8"
          y1={symbol.type === "slide-up" ? 36 : 4}
          x2="92"
          y2={symbol.type === "slide-up" ? 4 : 36}
          stroke="#9333ea"
          strokeWidth="3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const glyph =
    symbol.type === "text"
      ? symbol.text || "S"
      : (SYMBOL_OPTIONS.find((item) => item.type === symbol.type)?.preview ??
        "?");

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
        {symbol.type === "finger"
          ? "①②③④⑤"[clamp(Number(symbol.text ?? 2), 1, 5) - 1]
          : glyph}
      </text>
    </svg>
  );
}

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

  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);

  const draggingSymbolId = useRef<string | null>(null);

  const activeSymbol =
    active?.symbols?.find((symbol) => symbol.id === selectedSymbolId) ?? null;

  function addSymbol(type: MelodySymbolType) {
    const symbol: MelodySymbol = {
      id: uid(),
      type,
      x: 45,
      y: 22,
      width:
        type === "hammer-on" || type === "pull-off"
          ? 30
          : type.startsWith("slide-")
            ? 12
            : 10,
      height: type === "hammer-on" || type === "pull-off" ? 20 : 15,
      rotation: 0,
      ...(type === "finger" ? { text: "2" } : {}),
      ...(type === "text" ? { text: "S" } : {}),
    };

    updateBar((bar) => ({
      ...bar,
      symbols: [...(bar.symbols ?? []), symbol],
    }));

    setSelectedSymbolId(symbol.id);
  }

  function updateSymbol(symbolId: string, changes: Partial<MelodySymbol>) {
    updateBar((bar) => ({
      ...bar,
      symbols: (bar.symbols ?? []).map((symbol) =>
        symbol.id === symbolId ? { ...symbol, ...changes } : symbol,
      ),
    }));
  }

  function deleteSelectedSymbol() {
    if (!selectedSymbolId) return;

    updateBar((bar) => ({
      ...bar,
      symbols: (bar.symbols ?? []).filter(
        (symbol) => symbol.id !== selectedSymbolId,
      ),
    }));

    setSelectedSymbolId(null);
  }

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

            <details className="melody-symbol-panel" open>
              <summary>🎼 Musical Symbols</summary>

              <p className="text-xs text-slate-500">
                Choose a symbol to add it to this bar. Drag it into position on
                the strings.
              </p>

              <div className="melody-symbol-palette">
                {SYMBOL_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => addSymbol(option.type)}
                    title={`Add ${option.label}`}
                    className="melody-symbol-button"
                  >
                    <span className="melody-symbol-icon">{option.preview}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>

              {activeSymbol && (
                <div className="melody-symbol-properties">
                  <strong>
                    Selected:{" "}
                    {
                      SYMBOL_OPTIONS.find(
                        (item) => item.type === activeSymbol.type,
                      )?.label
                    }
                  </strong>

                  <label>
                    Width
                    <input
                      type="range"
                      min="4"
                      max="90"
                      value={activeSymbol.width ?? 10}
                      onChange={(event) =>
                        updateSymbol(activeSymbol.id, {
                          width: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  <label>
                    Height
                    <input
                      type="range"
                      min="6"
                      max="70"
                      value={activeSymbol.height ?? 15}
                      onChange={(event) =>
                        updateSymbol(activeSymbol.id, {
                          height: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  {activeSymbol.type === "text" && (
                    <label>
                      Text
                      <input
                        type="text"
                        value={activeSymbol.text ?? ""}
                        maxLength={3}
                        onChange={(event) =>
                          updateSymbol(activeSymbol.id, {
                            text: event.target.value,
                          })
                        }
                      />
                    </label>
                  )}
                  <label>
                    Rotation
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={activeSymbol.rotation ?? 0}
                      onChange={(event) =>
                        updateSymbol(activeSymbol.id, {
                          rotation: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  {activeSymbol.type === "finger" && (
                    <label>
                      Finger number
                      <select
                        value={activeSymbol.text ?? "2"}
                        onChange={(event) =>
                          updateSymbol(activeSymbol.id, {
                            text: event.target.value,
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((number) => (
                          <option key={number} value={number}>
                            {number}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <button
                    type="button"
                    className="danger"
                    onClick={deleteSelectedSymbol}
                  >
                    🗑 Delete Symbol
                  </button>
                </div>
              )}
            </details>

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

              <div className="melody-symbol-layer">
                {(active.symbols ?? []).map((symbol) => (
                  <div
                    key={symbol.id}
                    className={`melody-symbol-placement ${
                      selectedSymbolId === symbol.id ? "selected" : ""
                    }`}
                    style={{
                      left: `${symbol.x}%`,
                      top: `${symbol.y}%`,
                      width: `${symbol.width ?? 10}%`,
                      height: `${symbol.height ?? 15}%`,
                      transform: `rotate(${symbol.rotation ?? 0}deg)`,
                      transformOrigin: "center",
                    }}
                    title="Drag to move this symbol"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedSymbolId(symbol.id);
                    }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;

                      event.preventDefault();
                      event.stopPropagation();

                      draggingSymbolId.current = symbol.id;
                      setSelectedSymbolId(symbol.id);
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (draggingSymbolId.current !== symbol.id) return;

                      const layer = event.currentTarget.parentElement;
                      if (!layer) return;

                      const rect = layer.getBoundingClientRect();

                      const x = clamp(
                        ((event.clientX - rect.left) / rect.width) * 100 -
                          (symbol.width ?? 10) / 2,
                        0,
                        100 - (symbol.width ?? 10),
                      );

                      const y = clamp(
                        ((event.clientY - rect.top) / rect.height) * 100 -
                          (symbol.height ?? 15) / 2,
                        0,
                        100 - (symbol.height ?? 15),
                      );

                      updateSymbol(symbol.id, {
                        x: Math.round(x * 10) / 10,
                        y: Math.round(y * 10) / 10,
                      });
                    }}
                    onPointerUp={(event) => {
                      draggingSymbolId.current = null;

                      if (
                        event.currentTarget.hasPointerCapture(event.pointerId)
                      ) {
                        event.currentTarget.releasePointerCapture(
                          event.pointerId,
                        );
                      }
                    }}
                    onPointerCancel={() => {
                      draggingSymbolId.current = null;
                    }}
                  >
                    <SymbolDrawing symbol={symbol} />
                  </div>
                ))}
              </div>
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
            </div>
          </>
        ) : (
          <p>No bars recognized. Add a bar manually.</p>
        )}
      </section>
    </div>
  );
}
