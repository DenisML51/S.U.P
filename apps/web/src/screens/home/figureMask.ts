/**
 * The mask the hero's art fades out through: solid in the middle, melting away at the sides and
 * corners, the top and bottom kept sharp but for a thin edge. Fractal noise displaces the fade, so
 * the edge drifts like smoke instead of tracing a box. A light top (a sky) fades deeper, or it would
 * still read as a straight cut against the dark.
 *
 * The noise can drag a solid part of the fade out to the very side of the picture, where the box
 * cuts it straight; a plain side fade over the smoke (not displaced itself) brings both sides to
 * nothing, so they never show as an edge.
 */
export const figureMask = (brightTop: boolean): string => {
  const top = brightTop ? 0.34 : 0.14;
  // The corners round off through an ellipse; a light top rounds off more.
  const round = brightTop ? 0.6 : 0.68;
  const stop = (offset: number, opacity: number) =>
    `<stop offset='${offset}' stop-color='white' stop-opacity='${opacity}'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300' preserveAspectRatio='none'>
<defs>
<linearGradient id='s'>${stop(0, 0)}${stop(0.1, 0.45)}${stop(0.26, 1)}${stop(0.74, 1)}${stop(0.9, 0.45)}${stop(1, 0)}</linearGradient>
<linearGradient id='e' x2='0' y2='1'>${stop(0, 0)}${stop(top * 0.45, 0.55)}${stop(top, 1)}${stop(0.74, 1)}${stop(0.88, 0.5)}${stop(1, 0)}</linearGradient>
<radialGradient id='r' cy='0.56' r='${round}'>${stop(0.72, 1)}${stop(1, 0)}</radialGradient>
<mask id='m'><rect width='200' height='300' fill='url(#e)'/></mask>
<mask id='c'><rect width='200' height='300' fill='url(#r)'/></mask>
<linearGradient id='w'>${stop(0, 0)}${stop(0.04, 0.12)}${stop(0.1, 0.5)}${stop(0.17, 1)}${stop(0.83, 1)}${stop(0.9, 0.5)}${stop(0.96, 0.12)}${stop(1, 0)}</linearGradient>
<mask id='w-m'><rect width='200' height='300' fill='url(#w)'/></mask>
<filter id='f' x='-10%' y='-10%' width='120%' height='120%'>
<feTurbulence type='fractalNoise' baseFrequency='0.016 0.022' numOctaves='4' seed='11'/>
<feDisplacementMap in='SourceGraphic' scale='${brightTop ? 54 : 38}' xChannelSelector='R' yChannelSelector='G'/>
</filter>
</defs>
<g mask='url(#w-m)'><g filter='url(#f)'><g mask='url(#c)'><rect width='200' height='300' fill='url(#s)' mask='url(#m)'/></g></g></g>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
