// Warm, photo-like SVG placeholders. Swap these for real product photos later.
const TONES = {
  blush: ["#F4DAD6", "#D9A7A0"],
  ivory: ["#F5EEDF", "#D8C7A3"],
  sage: ["#DDE3D3", "#9FAE8C"],
  gold: ["#F1E2BE", "#C49A3A"],
  rose: ["#EBC9CF", "#B9707E"],
} as const;

export type Tone = keyof typeof TONES;

export function placeholder(
  label: string,
  tone: Tone = "ivory",
  width = 800,
  height = 800,
) {
  const [a, b] = TONES[tone];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<radialGradient id="l" cx="0.3" cy="0.25" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<rect width="100%" height="100%" fill="url(#l)"/>
<g fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="2">
<circle cx="${width / 2}" cy="${height / 2 - 20}" r="${Math.min(width, height) * 0.14}"/>
<circle cx="${width / 2}" cy="${height / 2 - 20}" r="${Math.min(width, height) * 0.07}"/>
</g>
<text x="50%" y="${height - 40}" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.round(Math.min(width, height) * 0.032)}" letter-spacing="3" fill="#1C1917" fill-opacity="0.55">${label.toUpperCase()}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
