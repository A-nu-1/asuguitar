import * as pdfjsLib from "pdfjs-dist";
import type { Geometry } from "@/types/guitar";

export type PdfLine = {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  orientation: "horizontal" | "vertical";
};

export async function extractPdfLines(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number,
): Promise<PdfLine[]> {
  const operatorList = await page.getOperatorList();
  const viewport = page.getViewport({ scale: 1 });

  const lines: PdfLine[] = [];

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    if (operatorList.fnArray[i] !== pdfjsLib.OPS.constructPath) {
      continue;
    }

    const args = operatorList.argsArray[i];

    const operations = args?.[1] as number[] | undefined;

    const coordinates = args?.[2] as Float32Array | number[] | undefined;

    if (
      !operations ||
      !coordinates ||
      operations.length !== 1 ||
      coordinates.length !== 4
    ) {
      continue;
    }

    // PDF.js constructPath bounding coordinates:
    // [x0, y0, x1, y1]
    const [rawX0, rawY0, rawX1, rawY1] = Array.from(coordinates);

    // Convert both corners to viewport coordinates.
    const point1 = [rawX0, rawY0];
    const point2 = [rawX1, rawY1];

    pdfjsLib.Util.applyTransform(point1, viewport.transform);

    pdfjsLib.Util.applyTransform(point2, viewport.transform);

    const x0 = Math.min(point1[0], point2[0]);
    const x1 = Math.max(point1[0], point2[0]);

    const y0 = Math.min(point1[1], point2[1]);
    const y1 = Math.max(point1[1], point2[1]);

    const width = x1 - x0;
    const height = y1 - y0;

    // Horizontal guitar string candidates
    if (width > 20 && height <= 2) {
      const centerY = (y0 + y1) / 2;

      lines.push({
        page: pageNumber,
        x0,
        y0: centerY,
        x1,
        y1: centerY,
        orientation: "horizontal",
      });
    }

    // Vertical bar boundary candidates
    else if (height > 20 && width <= 2) {
      const centerX = (x0 + x1) / 2;

      lines.push({
        page: pageNumber,
        x0: centerX,
        y0,
        x1: centerX,
        y1,
        orientation: "vertical",
      });
    }
  }

  return lines;
}



export function detectTabGeometry(
  lines: PdfLine[],
): Geometry[] {
  const horizontal = lines
    .filter((line) => line.orientation === "horizontal")
    .sort((a, b) => a.page - b.page || a.y0 - b.y0);

  const vertical = lines.filter(
    (line) => line.orientation === "vertical",
  );

  const geometry: Geometry[] = [];
  let barNumber = 1;
  let staffNumber = 0;

  const pages = [...new Set(horizontal.map((line) => line.page))];

  for (const page of pages) {
    const pageLines = horizontal.filter(
      (line) => line.page === page,
    );

    // Group horizontal segments by their vertical positions.
    const rows: {
      y: number;
      segments: PdfLine[];
    }[] = [];

    for (const line of pageLines) {
      const existing = rows.find(
        (row) => Math.abs(row.y - line.y0) <= 2,
      );

      if (existing) {
        existing.segments.push(line);
      } else {
        rows.push({
          y: line.y0,
          segments: [line],
        });
      }
    }

    rows.sort((a, b) => a.y - b.y);

    // Find six consecutive, approximately equally spaced rows.
    for (let i = 0; i <= rows.length - 6;) {
      const group = rows.slice(i, i + 6);

      const gaps = group.slice(1).map(
        (row, index) => row.y - group[index].y,
      );

      const spacing =
        gaps.reduce((sum, gap) => sum + gap, 0) /
        gaps.length;

      const regularSpacing =
        spacing >= 10 &&
        gaps.every(
          (gap) => Math.abs(gap - spacing) <= spacing * 0.15,
        );

      if (!regularSpacing) {
        i++;
        continue;
      }

      const top = group[0].y;
      const bottom = group[5].y;

      // Require horizontal coverage shared by all six rows.
      const left = Math.max(
        ...group.map((row) =>
          Math.min(...row.segments.map((segment) => segment.x0)),
        ),
      );

      const right = Math.min(
        ...group.map((row) =>
          Math.max(...row.segments.map((segment) => segment.x1)),
        ),
      );

      if (right - left < 20) {
        i++;
        continue;
      }

      const separators = vertical
        .filter(
          (line) =>
            line.page === page &&
            line.x0 >= left - 3 &&
            line.x0 <= right + 3 &&
            line.y0 <= top + 3 &&
            line.y1 >= bottom - 3,
        )
        .map((line) => line.x0)
        .sort((a, b) => a - b);

      // Include staff edges as potential bar boundaries.
      const boundaries = [left, ...separators, right]
        .sort((a, b) => a - b)
        .filter(
          (x, index, values) =>
            index === 0 || x - values[index - 1] > 3,
        );

      staffNumber++;

      for (let j = 0; j < boundaries.length - 1; j++) {
        const x0 = boundaries[j];
        const x1 = boundaries[j + 1];

        if (x1 - x0 < 15) continue;

        geometry.push({
          number: barNumber++,
          row: staffNumber,
            page,
          x0,
          x1,
          top,
          bottom,
        });
      }

      i += 6;
    }
  }

  return geometry;
}
