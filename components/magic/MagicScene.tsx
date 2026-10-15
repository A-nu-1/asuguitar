"use client";

import { useEffect, useState, type ReactNode } from "react";

export type MagicTheme = "sweet" | "midnight";

type Props = {
  children: ReactNode;
};

const butterflies = [
  {
    id: 1,
    name: "Rose",
    colors: ["#ff64c8", "#ffe28a"],
    wing: "M0 0 C-12 -24 -45 -28 -36 -6 C-51 8 -25 21 0 6",
    position: "left-[8%] top-[18%]",
    animation: "magic-roaming-rose",
    duration: "19s",
    scale: 1,
  },
  {
    id: 2,
    name: "Azure",
    colors: ["#20d5ff", "#a68aff"],
    wing: "M0 0 C-5 -38 -39 -42 -35 -9 C-48 18 -14 28 0 7",
    position: "left-[48%] top-[10%]",
    animation: "magic-roaming-azure",
    duration: "24s",
    scale: 1.15,
  },
  {
    id: 3,
    name: "Sunshine",
    colors: ["#ffc64b", "#ff779c"],
    wing: "M0 0 C-28 -15 -46 -5 -29 10 C-35 30 -9 24 0 5",
    position: "right-[12%] top-[25%]",
    animation: "magic-roaming-sunshine",
    duration: "21s",
    scale: 0.94,
  },
] as const;

function Butterfly({ item }: { item: (typeof butterflies)[number] }) {
  const [sparkling, setSparkling] = useState(false);

  return (
    <button
      type="button"
      title={`${item.name} butterfly`}
      aria-label={`Play with ${item.name} butterfly`}
      onClick={() => setSparkling(true)}
      onAnimationEnd={(event) => {
        if (event.animationName === "magic-butterfly-sparkle") {
          setSparkling(false);
        }
      }}
      className={`
        pointer-events-auto absolute ${item.position}
        z-20 border-0 bg-transparent p-1
        drop-shadow-[0_0_12px_#ffaaff]
        transition-[filter] hover:drop-shadow-[0_0_22px_#fff]
        focus-visible:rounded-full
        focus-visible:outline-2
        focus-visible:outline-fuchsia-500
      `}
      style={{
        animationName: item.animation,
        animationDuration: item.duration,
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
      }}
    >
      <span className="relative block">
        <svg
          width={80 * item.scale}
          height={66 * item.scale}
          viewBox="-45 -43 90 82"
          aria-hidden="true"
          className="overflow-visible"
        >
          <defs>
            <linearGradient
              id={`magic-wing-${item.id}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop stopColor={item.colors[0]} />
              <stop offset="1" stopColor={item.colors[1]} />
            </linearGradient>
          </defs>

          <g className="motion-safe:animate-[magic-wing-flutter_.7s_ease-in-out_infinite]">
            <path
              d={item.wing}
              fill={`url(#magic-wing-${item.id})`}
              stroke="#fff8ff"
              strokeWidth="2.5"
            />
            <path
              d={item.wing}
              transform="scale(-1 1)"
              fill={`url(#magic-wing-${item.id})`}
              stroke="#fff8ff"
              strokeWidth="2.5"
            />
          </g>

          <path
            d="M0 -12 L0 15"
            stroke="#66408a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M0 -11 Q-9 -30 -13 -24 M0 -11 Q9 -30 13 -24"
            fill="none"
            stroke="#66408a"
            strokeWidth="2"
          />
          <circle cx="0" cy="-14" r="4" fill="#71418e" />
          <circle cx="-22" cy="-8" r="4" fill="#fff3a3" />
          <circle cx="22" cy="-8" r="4" fill="#fff3a3" />
        </svg>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 left-0 text-lg text-pink-200 drop-shadow-[0_0_8px_#ff72cd]"
        >
          ✧ ✦
        </span>

        {sparkling && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 text-4xl motion-safe:animate-[magic-butterfly-sparkle_.8s_ease-out_forwards]"
          >
            💖
          </span>
        )}
      </span>
    </button>
  );
}

function Caterpillar({
  color,
  name,
  reverse = false,
}: {
  color: string;
  name: string;
  reverse?: boolean;
}) {
  const [wiggling, setWiggling] = useState(false);

  return (
    <div
      className={`absolute bottom-2 ${reverse ? "right-0" : "left-0"}`}
      style={{
        animation: reverse
          ? "magic-crawl-reverse 26s linear infinite"
          : "magic-crawl-across 30s linear infinite",
      }}
    >
      <button
        type="button"
        aria-label={`Make ${name} caterpillar wiggle`}
        title={`${name} the caterpillar`}
        onClick={() => setWiggling(true)}
        onAnimationEnd={(event) => {
          if (event.animationName === "magic-wiggle") {
            setWiggling(false);
          }
        }}
        className={`
          pointer-events-auto relative flex items-end
          border-0 bg-transparent p-2
          drop-shadow-[0_5px_6px_#6f428777]
          ${
            wiggling
              ? "motion-safe:animate-[magic-wiggle_.35s_ease-in-out_4]"
              : ""
          }
        `}
      >
        {[0, 1, 2, 3].map((number) => (
          <span
            key={number}
            style={{
              backgroundColor: color,
              transform: `translateY(${number % 2 ? 4 : 0}px)`,
            }}
            className="-mr-2 h-6 w-6 rounded-full border-2 border-white/80 shadow-sm"
          />
        ))}

        <span
          style={{ backgroundColor: color }}
          className="relative h-10 w-10 rounded-full border-2 border-white/90 shadow-md"
        >
          <span className="absolute left-2.5 top-3 h-1.5 w-1.5 rounded-full bg-slate-800" />
          <span className="absolute right-2.5 top-3 h-1.5 w-1.5 rounded-full bg-slate-800" />
          <span className="absolute left-3 top-5 text-xs text-fuchsia-900">
            ⌣
          </span>
          <span className="absolute -top-4 left-2 text-lg text-pink-500">
            ♡
          </span>
        </span>
      </button>
    </div>
  );
}

export default function MagicScene({ children }: Props) {
  const [theme, setTheme] = useState<MagicTheme>("sweet");
  const [pet, setPet] = useState<"dog" | "cat" | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("asu-magic-theme");

    if (saved === "sweet" || saved === "midnight") {
      setTheme(saved);
    }
  }, []);

  function selectTheme(next: MagicTheme) {
    setTheme(next);
    localStorage.setItem("asu-magic-theme", next);
  }

  const dark = theme === "midnight";

  return (
    <div
      data-magic-theme={theme}
      className={`
        group relative isolate min-h-screen overflow-hidden
        transition-colors duration-500
        ${
          dark
            ? "bg-[#0d1436] text-[#f5eaff]"
            : "bg-[linear-gradient(160deg,#ffdcf4_0%,#f4e6ff_49%,#c5eafb_100%)] text-[#553076]"
        }
      `}
    >
      {/* Fairyland sky */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-cover bg-center opacity-90 sm:h-[390px]"
        style={{
          backgroundImage: "url('/magic/asu-skyline.png')",
          filter: dark
            ? "brightness(.45) saturate(1.7) hue-rotate(24deg)"
            : "none",
        }}
      />

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-[210px] -z-10 h-60 ${
          dark
            ? "bg-gradient-to-b from-transparent to-[#0d1436]"
            : "bg-gradient-to-b from-transparent to-[#f3e5ff]"
        }`}
      />

      {/* Garden scenery at the bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[250px] bg-cover bg-center opacity-95"
        style={{
          backgroundImage: "url('/magic/asu-garden.png')",
          filter: dark
            ? "brightness(.5) saturate(1.7) hue-rotate(30deg)"
            : "none",
        }}
      />

      {/* Ambient sparkles */}

      {/* Crystal decorations along the sides */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* Left crystal garden */}
        <div className="absolute left-[-5%] top-[40%] h-80 w-56 rounded-full bg-fuchsia-300/25 blur-[80px] group-data-[magic-theme=midnight]:bg-violet-500/20" />

        <span className="absolute left-[2%] top-[42%] text-5xl opacity-70 drop-shadow-[0_0_20px_#ff9afa] motion-safe:animate-[magic-float_5s_ease-in-out_infinite]">
          💎
        </span>

        <span className="absolute left-[7%] top-[66%] text-3xl text-pink-300 drop-shadow-[0_0_12px_#ffaaff]">
          ✦
        </span>

        <span className="absolute left-[3%] top-[75%] text-4xl opacity-70">
          🌸
        </span>

        {/* Right crystal garden */}
        <div className="absolute right-[-5%] top-[38%] h-80 w-56 rounded-full bg-cyan-300/25 blur-[80px] group-data-[magic-theme=midnight]:bg-blue-500/20" />

        <span className="absolute right-[3%] top-[46%] text-5xl opacity-70 drop-shadow-[0_0_20px_#b4caff] motion-safe:animate-[magic-float_6s_ease-in-out_infinite]">
          🔮
        </span>

        <span className="absolute right-[8%] top-[65%] text-3xl text-yellow-200 drop-shadow-[0_0_12px_#fff4a0]">
          ✧
        </span>

        <span className="absolute right-[4%] top-[77%] text-4xl opacity-70">
          🌷
        </span>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(#fff_1px,transparent_2px)] [background-size:77px_83px] motion-safe:animate-[magic-twinkle_4s_ease-in-out_infinite]"
      />

      {/* Floating sun / moon theme selector */}
      <div
        role="group"
        aria-label="Choose magical theme"
        className="absolute right-4 top-3 z-40 flex items-center gap-1.5 rounded-full border border-white/65 bg-white/25 p-1 shadow-lg shadow-pink-300/30 backdrop-blur-md"
      >
        <button
          type="button"
          onClick={() => selectTheme("sweet")}
          aria-label="Sweet Crystal theme"
          aria-pressed={!dark}
          title="Sweet Crystal Kingdom"
          className={`
            flex h-9 w-9 items-center justify-center rounded-full
            text-xl transition-all duration-300 hover:scale-110
            ${
              !dark
                ? "scale-110 bg-amber-100 shadow-[0_0_19px_#ffce69] opacity-100"
                : "opacity-35 grayscale hover:opacity-80"
            }
          `}
        >
          ☀️
        </button>

        <button
          type="button"
          onClick={() => selectTheme("midnight")}
          aria-label="Midnight Crystal theme"
          aria-pressed={dark}
          title="Midnight Crystal Kingdom"
          className={`
            flex h-9 w-9 items-center justify-center rounded-full
            text-xl transition-all duration-300 hover:scale-110
            ${
              dark
                ? "scale-110 bg-indigo-800 shadow-[0_0_19px_#ba91ff] opacity-100"
                : "opacity-35 grayscale hover:opacity-80"
            }
          `}
        >
          🌙
        </button>
      </div>

      {/* Butterflies can roam over the entire homepage */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {butterflies.map((item) => (
          <Butterfly key={item.id} item={item} />
        ))}
      </div>

      {/* Real homepage content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-5 sm:px-8">
        {children}
      </div>

      {/* Animals and crawling caterpillars:
          outside the song panels */}
      <div className="relative z-10 mx-auto mt-5 flex min-h-40 max-w-7xl items-end justify-between px-3 pb-4 sm:min-h-48 sm:px-8">
        <button
          type="button"
          title="Pat the puppy"
          aria-label="Pat the puppy"
          onClick={() => setPet("dog")}
          onAnimationEnd={() => setPet(null)}
          className={`
            relative z-10 h-28 w-28 shrink-0
            transition hover:scale-110 sm:h-40 sm:w-40
            ${
              pet === "dog"
                ? "motion-safe:animate-[magic-wiggle_.4s_ease-in-out_3]"
                : ""
            }
          `}
        >
          <img
            src="/magic/asu-puppy.png"
            alt="Playful fairy puppy"
            className="h-full w-full object-contain drop-shadow-[0_0_12px_#ffbbf5]"
          />
          {pet === "dog" && (
            <span className="absolute right-0 top-0 text-2xl">💗</span>
          )}
        </button>

        <div className="pointer-events-none absolute inset-x-20 bottom-3 h-20 overflow-hidden sm:inset-x-36">
          <Caterpillar color="#80e5a1" name="Mint" />
          <Caterpillar color="#ff96d6" name="Candy" reverse />
        </div>

        <button
          type="button"
          title="Pet the kitten"
          aria-label="Pet the kitten"
          onClick={() => setPet("cat")}
          onAnimationEnd={() => setPet(null)}
          className={`
            relative z-10 h-28 w-28 shrink-0
            transition hover:scale-110 sm:h-40 sm:w-40
            ${
              pet === "cat"
                ? "motion-safe:animate-[magic-wiggle_.3s_ease-in-out_4]"
                : ""
            }
          `}
        >
          <img
            src="/magic/asu-kitten.png"
            alt="Playful fairy kitten"
            className="h-full w-full object-contain drop-shadow-[0_0_12px_#ffbbf5]"
          />

          {pet === "cat" && (
            <span className="absolute right-0 top-0 rounded-full bg-pink-100 px-2 text-sm text-violet-800">
              purr ♡
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
