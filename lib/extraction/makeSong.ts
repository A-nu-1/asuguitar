import type { Geometry, Song } from "@/types/guitar";
import { normalize } from "./shared/normalize";
import { extractMelody } from "./melody/extractMelody";
import { extractChords } from "./chords/extractChords";

export type SampleFile = {
  label: string;
  key: string;
  mode: "melody" | "chords";
};

export function makeSong(
  raw: unknown,
  method: string,
  file: SampleFile,
  geometry: Geometry[],
): Song {
  const tokens = normalize(raw);

  return file.mode === "melody"
    ? extractMelody(tokens, method, file.label, geometry)
    : extractChords(tokens, method, file.label);
}