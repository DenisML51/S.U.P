/** A colour as [red, green, blue], 0–255. */
export type Rgb = [number, number, number];

/** Where the hero's art fades into the page (see figureMask.ts). */
const FADE = { side: [0.06, 0.26], ends: [0.12, 0.8] };
const SAMPLE_W = 32;
const SAMPLE_H = 48;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** Above this mean lightness its top edge would read as a straight cut against the dark page. */
const BRIGHT_TOP = 0.3;

export interface ArtReading {
  /** The colour where the picture meets the page: the median of the bands along its sides. */
  edge: Rgb;
  /** Whether its top is light (a sky): such a picture needs a softer top and rounder corners. */
  brightTop: boolean;
}

/**
 * Reads a picture where it meets the page. The middle (a face, a cloak) is left out, so it never
 * tints the page by itself. Null when the picture cannot be read (not loaded, or from another origin).
 */
export const readArt = (image: HTMLImageElement): ArtReading | null => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, SAMPLE_W, SAMPLE_H);
    const { data } = context.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
    const channels: [number[], number[], number[]] = [[], [], []];
    let top = 0;
    let topCount = 0;
    for (let y = 0; y < SAMPLE_H; y++) {
      for (let x = 0; x < SAMPLE_W; x++) {
        const i = (y * SAMPLE_W + x) * 4;
        if (data[i + 3] < 128) continue;
        const u = (x + 0.5) / SAMPLE_W;
        const v = (y + 0.5) / SAMPLE_H;
        if (v < FADE.ends[0]) {
          top += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          topCount++;
        }
        const fromSide = Math.min(u, 1 - u);
        if (fromSide < FADE.side[0] || fromSide > FADE.side[1] || v < FADE.ends[0] || v > FADE.ends[1])
          continue;
        channels.forEach((channel, c) => channel.push(data[i + c]));
      }
    }
    if (!channels[0].length) return null;
    return { edge: channels.map(median) as Rgb, brightTop: topCount > 0 && top / topCount > BRIGHT_TOP };
  } catch {
    return null;
  }
};

const toHsl = ([r, g, b]: Rgb): [number, number, number] => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h / 6, s, l];
};

const toRgb = ([h, s, l]: [number, number, number]): Rgb => {
  if (s === 0) return [l, l, l].map((v) => Math.round(v * 255)) as Rgb;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => Math.round(v * 255)) as Rgb;
};

/**
 * The edge colour made fit for the page's dark: quieter (a sky gives dusty blue, not a blue screen)
 * and never lighter than a deep grey, so text over it keeps its contrast.
 */
export const pageTone = (edge: Rgb, maxLightness = 0.3): Rgb => {
  const [h, s, l] = toHsl(edge);
  return toRgb([h, Math.min(s, 0.4) * 0.7, Math.min(l * 0.5, maxLightness)]);
};
