
"use client";

import { useEffect, useRef, useState } from "react";
import PdfViewer from "@/components/practice/PdfViewer";

const STORAGE_KEY = "asuguitar-youtube-mappings";

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    let id: string | null = null;

    if (host === "youtu.be" || host === "www.youtu.be") {
      id = parsed.pathname.split("/")[1];
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
    ) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v");
      } else {
        const parts = parsed.pathname.split("/");
        if (["embed", "shorts", "live"].includes(parts[1])) {
          id = parts[2];
        }
      }
    }

    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export default function PracticePage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const pdfUrlRef = useRef<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [videoExpanded, setVideoExpanded] = useState(true);
  const [message, setMessage] = useState("");

  function openPdf(file: File) {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    pdfUrlRef.current = url;

    setPdfUrl(url);
    setFilename(file.name);

    try {
      const mappings = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      ) as Record<string, string>;

      const saved = mappings[file.name] || "";

      setYoutubeUrl(saved);
      setSavedUrl(saved);
      setMessage("");
      setVideoExpanded(true);
    } catch {
      setYoutubeUrl("");
      setSavedUrl("");
      setMessage("Could not load saved YouTube links.");
    }
  }

  function saveYoutubeUrl() {
    const url = youtubeUrl.trim();

    if (!filename || !getYouTubeId(url)) {
      setMessage("Please enter a valid YouTube video URL.");
      return;
    }

    try {
      const mappings = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      ) as Record<string, string>;

      mappings[filename] = url;

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(mappings)
      );

      setSavedUrl(url);
      setYoutubeUrl(url);
      setMessage("YouTube URL saved locally.");
      setVideoExpanded(true);
    } catch {
      setMessage("Could not save the YouTube URL.");
    }
  }

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  const videoId = getYouTubeId(savedUrl);

  return (
    <main className="flex h-dvh flex-col bg-slate-100">
      {/* Minimal toolbar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-3 py-2">
        <span className="min-w-0 truncate text-sm font-semibold">
          {filename || "Asu Guitar Practice"}
        </span>

        <label className="cursor-pointer rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white">
          Open PDF
          <input
            type="file"
            accept=".pdf,application/pdf"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                openPdf(file);
              }

              event.target.value = "";
            }}
          />
        </label>
      </header>

      {/* PDF viewer */}
      <section className="min-h-0 flex-1">
        {pdfUrl ? (
          <PdfViewer pdfUrl={pdfUrl} />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
            Select a guitar PDF to start practicing.
          </div>
        )}
      </section>

      {/* YouTube practice player */}
      <footer className="shrink-0 border-t bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-xs font-semibold">
            🎸 YouTube Practice
          </span>

          {filename && (
            <>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="Paste YouTube URL"
                className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
              />

              <button
                type="button"
                onClick={saveYoutubeUrl}
                className="rounded bg-teal-600 px-3 py-1 text-xs text-white"
              >
                Save URL
              </button>

              {videoId && (
                <button
                  type="button"
                  onClick={() =>
                    setVideoExpanded((current) => !current)
                  }
                  className="rounded border px-3 py-1 text-xs"
                >
                  {videoExpanded ? "Hide Video" : "Show Video"}
                </button>
              )}
            </>
          )}
        </div>

        {message && (
          <p role="status" className="px-3 pb-2 text-xs text-slate-600">
            {message}
          </p>
        )}

        {videoId && videoExpanded && (
          <div className="flex justify-center border-t bg-slate-950 p-2">
            <iframe
              key={videoId}
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube guitar practice"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video h-[200px] w-full rounded"
            />
          </div>
        )}
      </footer>
    </main>
  );
}
