
"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  capo?: number | null;
  strummingPattern?: string | null;
};

type Position = {
  x: number;
  y: number;
};

const PANEL_WIDTH = 270;
const PANEL_HEIGHT = 260;
const MARGIN = 12;

export default function FloatingStrummingPattern({
  capo,
  strummingPattern,
}: Props) {
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState<Position | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  function clampPosition(
    x: number,
    y: number,
    width = PANEL_WIDTH,
    height = PANEL_HEIGHT,
  ): Position {
    const maxX = Math.max(MARGIN, window.innerWidth - width - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - height - MARGIN);

    return {
      x: Math.max(MARGIN, Math.min(x, maxX)),
      y: Math.max(MARGIN, Math.min(y, maxY)),
    };
  }

  // Start near the upper-right corner.
  useEffect(() => {
    setPosition(
      clampPosition(
        window.innerWidth - PANEL_WIDTH - 28,
        165,
      ),
    );
  }, []);

  // Keep the cloud visible when the window is resized.
  useEffect(() => {
    function keepInsideWindow() {
      setPosition((current) => {
        if (!current) return current;

        const width = panelRef.current?.offsetWidth ?? PANEL_WIDTH;
        const height = panelRef.current?.offsetHeight ?? PANEL_HEIGHT;

        return clampPosition(current.x, current.y, width, height);
      });
    }

    window.addEventListener("resize", keepInsideWindow);

    return () => {
      window.removeEventListener("resize", keepInsideWindow);
    };
  }, []);

  function startDragging(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 0 || !position) return;

    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDragging(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;

    const width = panelRef.current?.offsetWidth ?? PANEL_WIDTH;
    const height = panelRef.current?.offsetHeight ?? PANEL_HEIGHT;

    setPosition(
      clampPosition(
        drag.startX + dx,
        drag.startY + dy,
        width,
        height,
      ),
    );
  }

  function stopDragging() {
    dragRef.current = null;
  }

  function minimize() {
    stopDragging();
    setOpen(false);
  }

  function restore() {
    setPosition((current) =>
      current
        ? clampPosition(current.x, current.y)
        : current,
    );
    setOpen(true);
  }

  if (!position) return null;

  // -------------------------------------------------------
  // MINIMIZED MAGIC CLOUD
  // -------------------------------------------------------

  if (!open) {
    return (
      <button
        type="button"
        onClick={restore}
        title="Show capo and strumming pattern"
        aria-label="Show guitar magic cloud"
        className="
          group fixed right-4 top-40 z-40
          flex h-12 items-center gap-1.5
          rounded-full border-2 border-fuchsia-200
          bg-gradient-to-r
          from-pink-100 via-violet-100 to-sky-100
          px-3 text-sm font-extrabold text-violet-800
          shadow-[0_5px_20px_#b47dff88]
          transition-transform hover:scale-105
        "
      >
        <span
          aria-hidden="true"
          className="absolute -left-1 top-1 h-6 w-6 rounded-full bg-pink-100"
        />
        <span
          aria-hidden="true"
          className="absolute right-3 -top-2 h-7 w-7 rounded-full bg-violet-100"
        />

        <span className="relative text-lg">☁️</span>
        <span className="relative">Magic</span>

        <span className="pointer-events-none absolute -right-1 -top-2 text-fuchsia-500">
          ✦
        </span>
      </button>
    );
  }

  // -------------------------------------------------------
  // EXPANDED MAGIC CLOUD
  // -------------------------------------------------------

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Capo and strumming pattern"
      className="
        fixed z-40 w-[270px]
        max-w-[calc(100vw-24px)]
        select-none
      "
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Magical outer glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -inset-2 rounded-[45%]
          bg-fuchsia-200/45 blur-2xl
        "
      />

      {/* Fluffy cloud puffs */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -left-3 top-9 h-20 w-20
          rounded-full bg-violet-100
          shadow-[0_6px_20px_#d8b4fe66]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          left-7 -top-3 h-24 w-24
          rounded-full bg-pink-100
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          right-7 -top-5 h-20 w-20
          rounded-full bg-violet-100
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -right-3 top-12 h-20 w-20
          rounded-full bg-sky-100
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          bottom-0 left-8 h-14 w-20
          rounded-full bg-pink-100
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          bottom-0 right-7 h-14 w-20
          rounded-full bg-sky-100
        "
      />

      {/* Cloud body */}
      <div
        className="
          relative overflow-hidden
          rounded-[38px]
          border border-fuchsia-200/80
          bg-gradient-to-br
          from-pink-50 via-violet-50 to-sky-100
          px-4 pb-4 pt-3
          text-violet-900
          shadow-[0_12px_35px_#b47dff66]
        "
      >
        {/* Soft shimmer */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute
            inset-x-5 top-0 h-10
            rounded-full bg-white/50 blur-xl
          "
        />

        {/* Draggable header */}
        <div
          onPointerDown={startDragging}
          onPointerMove={moveDragging}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          className="
            relative mb-3
            flex touch-none cursor-grab
            items-center justify-between
            rounded-full
            bg-gradient-to-r
            from-pink-200 via-violet-200 to-sky-200
            px-3 py-2
            active:cursor-grabbing
          "
        >
          <span className="pointer-events-none text-xs font-extrabold tracking-wide text-violet-800">
            ✨ 🎸 Guitar Magic
          </span>

          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={minimize}
            title="Minimize to corner"
            aria-label="Minimize guitar magic cloud"
            className="
              rounded-full bg-white/60
              px-2 py-0.5
              text-lg font-bold leading-none
              text-violet-700 hover:bg-white
            "
          >
            −
          </button>
        </div>

        {/* Compact content */}
        <div className="relative space-y-2.5">
          {/* Capo */}
          <div
            className="
              flex items-center gap-3
              rounded-2xl border border-violet-200/70
              bg-white/65 px-3 py-2
              shadow-sm
            "
          >
            <div
              className="
                flex h-12 w-12 shrink-0
                flex-col items-center justify-center
                rounded-xl bg-violet-100
              "
            >
              <span className="text-[9px] font-bold uppercase text-violet-600">
                Capo
              </span>

              <span className="text-xl font-extrabold text-fuchsia-700">
                {capo && capo > 0 ? capo : "—"}
              </span>
            </div>

            <p className="text-xs font-medium text-violet-700">
              {capo && capo > 0
                ? `Place capo on fret ${capo}`
                : "No capo"}
            </p>
          </div>

          {/* Strumming pattern */}
          <div
            className="
              rounded-2xl border border-fuchsia-200/70
              bg-white/65 px-3 py-2.5
              shadow-sm
            "
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">
              Strumming Pattern
            </p>

            <p
              className="
                whitespace-pre-wrap break-words
                text-center font-mono text-sm
                font-extrabold leading-relaxed
                text-violet-900
              "
            >
              {strummingPattern?.trim() || "Not specified"}
            </p>
          </div>
        </div>

        {/* Tiny magical sparkles */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-3 text-xs text-fuchsia-400"
        >
          ✦
        </span>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-14 text-sm text-violet-400"
        >
          ✧
        </span>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 right-3 text-xs text-pink-400"
        >
          ✦
        </span>
      </div>
    </div>
  );
}
