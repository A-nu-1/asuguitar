"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type PdfPosition = {
  page: number;
  position: number; // 0 to 1
};

type Props = {
  pdfUrl: string;
  selectionEnabled?: boolean;
  activePosition?: PdfPosition | null;
  onPositionSelect?: (position: PdfPosition) => void;
  syncFollowing?: boolean;
};

export default function PdfViewer({
  pdfUrl,
  selectionEnabled = false,
  activePosition = null,
  onPositionSelect,
   syncFollowing = false,
}: Props) {
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

          const availableWidth = Math.max(320, container.clientWidth - 24);

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
          canvas.style.margin = "0";
          canvas.style.background = "white";

          if (cancelled) break;

          // Each page gets its own container so we can identify
          // its page number and vertical position.
          const pageWrapper = document.createElement("div");

          pageWrapper.dataset.pdfPage = String(pageNumber);
          pageWrapper.style.position = "relative";
          pageWrapper.style.width = `${viewport.width}px`;
          pageWrapper.style.margin = "0 auto 12px";
          pageWrapper.style.background = "white";

          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);

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
            err instanceof Error ? err.message : "Failed to display PDF.",
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading) return;

    // Remove the previous visual marker.
    container
      .querySelectorAll("[data-pdf-sync-marker]")
      .forEach((marker) => marker.remove());

    if (!activePosition) return;

    const page = Array.from(
      container.querySelectorAll<HTMLElement>("[data-pdf-page]"),
    ).find(
      (element) => Number(element.dataset.pdfPage) === activePosition.page,
    );

    if (!page) return;

    const normalizedPosition = Math.max(
      0,
      Math.min(1, activePosition.position),
    );

    const marker = document.createElement("div");

    marker.dataset.pdfSyncMarker = "true";

    marker.style.position = "absolute";
    marker.style.left = "0";
    marker.style.right = "0";
    marker.style.top = `${normalizedPosition * 100}%`;
    marker.style.height = "3px";
    marker.style.background = "#a855f7";
    marker.style.boxShadow = "0 0 8px #a855f7";
    marker.style.pointerEvents = "none";
    marker.style.zIndex = "5";

    page.appendChild(marker);

    // Keep the chosen PDF position visible.
    const containerRect = container.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();

    const scrollTop =
      container.scrollTop + markerRect.top - containerRect.top - 60;

    container.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: "smooth",
    });

    return () => {
      marker.remove();
    };
  }, [activePosition, loading, pdfUrl]);

  useEffect(() => {
  if (syncFollowing) {
    setScrolling(false);
  }
}, [syncFollowing]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Scroll controls */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-white px-3 py-2">
        <button
          type="button"
          disabled={loading || !!error || syncFollowing}
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
          className={`h-full overflow-y-auto bg-slate-200 p-3 ${
            selectionEnabled ? "cursor-crosshair" : ""
          }`}
          onClick={(event) => {
            if (!selectionEnabled || loading || error || !onPositionSelect) {
              return;
            }

            const target = event.target;

            if (!(target instanceof Element)) return;

            const page = target.closest<HTMLElement>("[data-pdf-page]");

            if (!page || !containerRef.current?.contains(page)) {
              return;
            }

            const pageNumber = Number(page.dataset.pdfPage);

            if (!Number.isInteger(pageNumber) || pageNumber < 1) {
              return;
            }

            const rect = page.getBoundingClientRect();

            if (rect.height <= 0) return;

            const normalizedPosition = Math.max(
              0,
              Math.min(1, (event.clientY - rect.top) / rect.height),
            );

            setScrolling(false);

            onPositionSelect({
              page: pageNumber,
              position: normalizedPosition,
            });
          }}
        />
      </div>
    </div>
  );
}
