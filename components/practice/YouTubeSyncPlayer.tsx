
"use client";

import { useEffect, useRef } from "react";

type PlayerStatus =
  | "unstarted"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

type Props = {
  videoId: string;
  title: string;
  onTimeChange: (seconds: number) => void;
  onStatusChange: (status: PlayerStatus) => void;
};

type YouTubePlayer = {
  getCurrentTime: () => number;
  destroy: () => void;
};

type YouTubeEvent = {
  data: number;
};

type YouTubeAPI = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars: { playsinline: number };
      events: {
        onReady: () => void;
        onStateChange: (event: YouTubeEvent) => void;
        onError: () => void;
      };
    },
  ) => YouTubePlayer;
};

type YouTubeWindow = Window & {
  YT?: YouTubeAPI;
  onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<YouTubeAPI> | null = null;

function loadYouTubeAPI(): Promise<YouTubeAPI> {
  const win = window as YouTubeWindow;

  if (win.YT?.Player) {
    return Promise.resolve(win.YT);
  }

  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousCallback = win.onYouTubeIframeAPIReady;

    win.onYouTubeIframeAPIReady = () => {
      previousCallback?.();

      if (win.YT?.Player) {
        resolve(win.YT);
      } else {
        reject(new Error("YouTube API unavailable."));
      }
    };

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (existing) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;

    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Could not load YouTube API."));
    };

    document.head.appendChild(script);
  });

  return apiPromise;
}

export default function YouTubeSyncPlayer({
  videoId,
  title,
  onTimeChange,
  onStatusChange,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const timeCallbackRef = useRef(onTimeChange);
  const statusCallbackRef = useRef(onStatusChange);

  useEffect(() => {
    timeCallbackRef.current = onTimeChange;
    statusCallbackRef.current = onStatusChange;
  }, [onTimeChange, onStatusChange]);

  useEffect(() => {
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function initialize() {
      try {
        const api = await loadYouTubeAPI();

        if (cancelled || !mountRef.current) return;

        player = new api.Player(mountRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (cancelled) return;

              timer = setInterval(() => {
                if (!player) return;

                const seconds = player.getCurrentTime();

                if (Number.isFinite(seconds)) {
                  timeCallbackRef.current(seconds);
                }
              }, 250);
            },

            onStateChange: (event) => {
              if (cancelled) return;

              const statuses: Record<number, PlayerStatus> = {
                [-1]: "unstarted",
                0: "ended",
                1: "playing",
                2: "paused",
                3: "buffering",
                5: "unstarted",
              };

              statusCallbackRef.current(
                statuses[event.data] ?? "unstarted",
              );

              if (player) {
                timeCallbackRef.current(player.getCurrentTime());
              }
            },

            onError: () => {
              if (!cancelled) {
                statusCallbackRef.current("error");
              }
            },
          },
        });
      } catch {
        if (!cancelled) {
          statusCallbackRef.current("error");
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;

      if (timer) clearInterval(timer);

      player?.destroy();
    };
  }, [videoId]);

  return (
    <div
      ref={mountRef}
      className="h-full w-full"
      title={title}
    />
  );
}
