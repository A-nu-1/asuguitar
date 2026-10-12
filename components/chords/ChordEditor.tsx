
"use client";

import type { Song } from "@/types/guitar";
import ChordPreview from "@/components/chords/ChordPreview";
import ChordSidebar from "@/components/chords/ChordSidebar";

type Props = {
  song: Song;
  updateSong: (fn: (song: Song) => Song) => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export default function ChordEditor({
  song,
  updateSong,
}: Props) {
  const chordSections = song.chordLines.reduce<
    { id: string; name: string; count: number }[]
  >((sections, line) => {
    const name = line.section.trim() || "Unassigned";
    const existing = sections.find((s) => s.name === name);

    if (existing) {
      existing.count += 1;
    } else {
      sections.push({
        id: line.id,
        name,
        count: 1,
      });
    }

    return sections;
  }, []);

  function updateLine(
    id: string,
    changes: Partial<Song["chordLines"][number]>,
  ) {
    updateSong((s) => ({
      ...s,
      chordLines: s.chordLines.map((line) =>
        line.id === id ? { ...line, ...changes } : line,
      ),
    }));
  }

  function insertChordLine(afterId: string) {
    updateSong((s) => {
      const index = s.chordLines.findIndex(
        (line) => line.id === afterId,
      );

      if (index === -1) return s;

      const current = s.chordLines[index];
      const chordLines = [...s.chordLines];

      chordLines.splice(index + 1, 0, {
        id: uid(),
        section: current.section,
        chords: "",
        lyrics: "",
      });

      return { ...s, chordLines };
    });
  }

  function addAtEnd() {
    updateSong((s) => ({
      ...s,
      chordLines: [
        ...s.chordLines,
        {
          id: uid(),
          section:
            s.chordLines.at(-1)?.section ?? "Unassigned",
          chords: "",
          lyrics: "",
        },
      ],
    }));
  }

  function deleteLine(id: string) {
    updateSong((s) => ({
      ...s,
      chordLines: s.chordLines.filter(
        (line) => line.id !== id,
      ),
    }));
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
      <ChordSidebar sections={chordSections} />

      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-800">
            Chords & lyrics
          </h2>

          <button
            type="button"
            className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
            onClick={addAtEnd}
          >
            + Add at end
          </button>
        </div>

        <p className="mb-5 text-sm text-slate-500">
          Each record contains the chords above one lyric line.
          Insert missing records wherever needed.
        </p>

        <details className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer font-semibold text-teal-700">
            Compare with original PDF (click to expand)
          </summary>

          <iframe
            title="Original Christmas Chords PDF"
            src="/samples/christmas-chords-original.pdf"
            className="mt-4 h-[40vh] min-h-[280px] w-full rounded-lg border border-slate-300 bg-white"
          />
        </details>

        <div
          id="chord-records-scroll"
          className="max-h-[75vh] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 p-2"
        >
          {song.chordLines.map((line, index) => {
            const showSection =
              index === 0 ||
              song.chordLines[index - 1].section !==
                line.section;

            return (
              <div
                key={line.id}
                id={`chord-${line.id}`}
                className="scroll-mt-5"
              >
                {showSection && (
                  <h3 className="mb-3 mt-6 border-b border-slate-200 pb-2 text-lg font-semibold text-teal-700">
                    {line.section || "Unassigned"}
                  </h3>
                )}

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_2fr]">
                    <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-600">
                      Section
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800"
                        value={line.section}
                        onChange={(e) =>
                          updateLine(line.id, {
                            section: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-600">
                      Chords
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800"
                        placeholder="G  Em  C  D"
                        value={line.chords}
                        onChange={(e) =>
                          updateLine(line.id, {
                            chords: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-600">
                      Lyrics
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800"
                        value={line.lyrics}
                        onChange={(e) =>
                          updateLine(line.id, {
                            lyrics: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <ChordPreview
                    lyrics={line.lyrics}
                    placements={line.placements ?? []}
                    onChange={(placements) =>
                      updateLine(line.id, { placements })
                    }
                  />

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      Record {index + 1}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                        onClick={() =>
                          insertChordLine(line.id)
                        }
                      >
                        + Insert below
                      </button>

                      <button
                        type="button"
                        className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                        onClick={() => deleteLine(line.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
