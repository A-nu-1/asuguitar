
"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type Props = {
  pdfUrl: string;
};

export default function PdfViewer({ pdfUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrolling, setScrolling] = useState(false);
const [speed, setSpeed] = useState(30); // pixels per second

const scrollingRef = useRef(false);
const speedRef = useRef(30);

useEffect(() => {
  if (!scrolling) return;

  const container = containerRef.current;
  if (!container) return;

let frame = 0;
let previousTime: number | null = null;
let scrollPosition = container.scrollTop;

  function animate(time: number) {
    if (!container || !scrollingRef.current) return;

    if (previousTime !== null) {
      const elapsed = Math.min((time - previousTime) / 1000, 0.1);
      // Detect manual scrolling and use the new position
if (Math.abs(container.scrollTop - scrollPosition) > 1) {
  scrollPosition = container.scrollTop;
}

// Continue auto-scrolling from the current position
scrollPosition += speedRef.current * elapsed;
container.scrollTop = scrollPosition;
    }

    previousTime = time;
    frame = requestAnimationFrame(animate);
  }

  scrollingRef.current = true;
  frame = requestAnimationFrame(animate);

  return () => {
    scrollingRef.current = false;
    cancelAnimationFrame(frame);
  };
}, [scrolling]);

  useEffect(() => {
    let cancelled = false;

    const container = containerRef.current;
    if (!container) return;

    async function renderPdf() {
      if (!container) return;
setScrolling(false);
scrollingRef.current = false;
      setLoading(true);
      setError("");
      container.replaceChildren();
      container.scrollTop = 0;

     const task = pdfjsLib.getDocument({ url: pdfUrl });

      try {
        const pdf = await task.promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) break;

          const page = await pdf.getPage(pageNumber);

          const baseViewport = page.getViewport({ scale: 1 });

          const availableWidth = Math.max(
            320,
            container.clientWidth - 24,
          );

          const scale = availableWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Could not create PDF canvas.");
          }

          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

          canvas.width = Math.ceil(viewport.width * pixelRatio);
          canvas.height = Math.ceil(viewport.height * pixelRatio);

          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 12px";
          canvas.style.background = "white";

          if (cancelled) break;

          container.appendChild(canvas);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform:
              pixelRatio === 1
                ? undefined
                : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          }).promise;
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to display PDF.",
          );
          setLoading(false);
        }
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

 
return (
  <div className="flex h-full min-h-0 flex-col">
    {/* Scroll controls */}
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-white px-3 py-2">
      <button
        type="button"
        disabled={loading || !!error}
        onClick={() => setScrolling((current) => !current)}
        className="rounded bg-teal-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {scrolling ? "Pause" : "Start"}
      </button>

      <button
        type="button"
        onClick={() => {
          setScrolling(false);
          containerRef.current?.scrollTo({ top: 0 });
        }}
        className="rounded border px-3 py-1 text-xs"
      >
        Reset
      </button>

      <label className="flex items-center gap-2 text-xs">
        Speed
        <input
          type="range"
          min="5"
          max="150"
          step="5"
          value={speed}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSpeed(value);
            speedRef.current = value;
          }}
          className="w-100 cursor-pointer"
        />
        <span className="w-16 tabular-nums">{speed} px/s</span>
      </label>
    </div>

    {/* PDF viewer */}
    <div className="relative min-h-0 flex-1">
      {loading && (
        <div className="absolute left-3 top-3 z-10 rounded bg-white px-3 py-2 text-xs shadow">
          Loading PDF...
        </div>
      )}

      {error && (
        <div className="absolute left-3 top-3 z-10 rounded bg-red-50 px-3 py-2 text-xs text-red-700 shadow">
          {error}
        </div>
      )}

      <div
        ref={containerRef}
        className="h-full overflow-y-auto bg-slate-200 p-3"
      />
    </div>
  </div>
);

}
