
import * as pdfjsLib from "pdfjs-dist";

import type { Geometry, Song, Token } from "@/types/guitar";
import { makeSong } from "@/lib/extraction/makeSong";
import {
  extractPdfLines,
  detectTabGeometry,
} from "@/lib/extraction/melody/extractPdfGeometry";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export async function extractMelodyFromPdf(
  pdfBytes: Uint8Array,
  title: string,
  filename: string,
): Promise<Song> {
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
  }).promise;

  const tokens: Token[] = [];
  const geometry: Geometry[] = [];

  try {
    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page = await pdf.getPage(pageNumber);

      const lines = await extractPdfLines(page, pageNumber);
      geometry.push(...detectTabGeometry(lines));

      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;

        const transform = pdfjsLib.Util.transform(
          viewport.transform,
          item.transform,
        );

        tokens.push({
          text: item.str,
          x: Number(transform[4].toFixed(2)),
          y: Number(transform[5].toFixed(2)),
          page: pageNumber,
        });
      }
    }

    if (tokens.length === 0) {
      throw new Error(
        "No embedded text found. This PDF may be scanned.",
      );
    }

    if (geometry.length === 0) {
      throw new Error(
        "No tablature bars detected in this PDF.",
      );
    }

    const extractedSong = makeSong(
      tokens,
      "pdfjs",
      {
        label: title.trim() || filename.replace(/\.pdf$/i, ""),
        key: filename,
        mode: "melody",
      },
      geometry,
    );

    return {
      ...extractedSong,
      bars: extractedSong.bars.map((bar, index) => ({
        ...bar,
        number: index + 1,
      })),
    };
  } finally {
    await pdf.cleanup();
  }
}
