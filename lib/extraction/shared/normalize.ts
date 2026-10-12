import type { Token } from "@/types/guitar";

export function normalize(raw: unknown): Token[] {
  if (!Array.isArray(raw)) {
    throw Error("Expected a JSON array of extracted tokens");
  }

  return raw
    .map((r: any) => ({
      text: String(r.text ?? ""),
      x: typeof r.x === "number" ? r.x : null,
      y: typeof r.y === "number" ? r.y : null,
      page: Number(r.page) || 1,
    }))
    .filter((r) => r.text.trim());
}