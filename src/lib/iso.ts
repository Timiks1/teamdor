// Ізометричні «лего»-ілюстрації в єдиному стилі бренду:
// плоска заливка, тонкий контур Ink, кольори Sand / Mist / Sage / Clay, синій — лише світло.

export const INK = '#191A1C';

/** Три відтінки для кожного кольору: верх, ліва (фронтальна) і права грань */
export const SHADES = {
  white: ['#FFFFFF', '#EEECE7', '#DDD8CF'],
  sand: ['#EDE8DF', '#DDD4C5', '#C8BDAB'],
  mist: ['#E2E7EC', '#CAD3DD', '#B1BDCB'],
  sage: ['#DEE5DD', '#C5D0C3', '#ABBAA8'],
  clay: ['#EBDFD5', '#DBC8B8', '#C7AF9B'],
  grey: ['#EFEEEB', '#DAD8D3', '#C3C1BB'],
  night: ['#25324A', '#0C1526', '#060C18'],
  beam: ['#4A88FF', '#0B5FFF', '#0A3FA8'],
} as const;

export type Tone = keyof typeof SHADES;

const COS = Math.cos(Math.PI / 6);

export class Iso {
  parts: string[] = [];
  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;
  constructor(public s = 20) {}

  p(x: number, y: number, z: number): [number, number] {
    const X = (x - y) * COS * this.s;
    const Y = (x + y) * 0.5 * this.s - z * this.s;
    this.minX = Math.min(this.minX, X);
    this.maxX = Math.max(this.maxX, X);
    this.minY = Math.min(this.minY, Y);
    this.maxY = Math.max(this.maxY, Y);
    return [X, Y];
  }

  pts(list: [number, number, number][]): string {
    return list.map(([x, y, z]) => this.p(x, y, z).map((n) => n.toFixed(1)).join(',')).join(' ');
  }

  /**
   * Коробка (x,y,z) розміром w×d×h.
   * tone — колір; для «перефарбовуваних» блоків замість tone передаємо 'var',
   * тоді заливка береться з CSS-змінних --t/--l/--r.
   */
  box(x: number, y: number, z: number, w: number, d: number, h: number, tone: Tone | 'var' = 'white', studs = false): string {
    const [t, l, r] = tone === 'var' ? ['var(--t)', 'var(--l)', 'var(--r)'] : SHADES[tone];
    const top = this.pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]);
    const left = this.pts([[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x, y + d, z]]);
    const right = this.pts([[x + w, y, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x + w, y, z]]);
    let svg =
      `<polygon points="${top}" style="fill:${t}"/>` +
      `<polygon points="${left}" style="fill:${l}"/>` +
      `<polygon points="${right}" style="fill:${r}"/>`;
    if (studs) svg += this.studs(x, y, z + h, w, d, tone);
    return svg;
  }

  /** Шипи «лего» на верхній грані */
  studs(x: number, y: number, z: number, w: number, d: number, tone: Tone | 'var', r = 0.26, hs = 0.16): string {
    const [t, l] = tone === 'var' ? ['var(--t)', 'var(--l)'] : SHADES[tone];
    const rx = 1.2247 * r * this.s;
    const ry = 0.7071 * r * this.s;
    const h = hs * this.s;
    let out = '';
    for (let j = 0; j < Math.floor(d); j++) {
      for (let i = 0; i < Math.floor(w); i++) {
        const [cx, cy] = this.p(x + i + 0.5, y + j + 0.5, z);
        out +=
          `<path d="M${(cx - rx).toFixed(1)},${(cy - h).toFixed(1)}V${cy.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(cx + rx).toFixed(1)},${cy.toFixed(1)}V${(cy - h).toFixed(1)}Z" style="fill:${l}"/>` +
          `<ellipse cx="${cx.toFixed(1)}" cy="${(cy - h).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" style="fill:${t}"/>`;
      }
    }
    return out;
  }

  /** Плоский чотирикутник на фронтальній грані (площина y = const) */
  quadY(y: number, x0: number, x1: number, z0: number, z1: number, fill: string, extra = ''): string {
    return `<polygon points="${this.pts([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]])}" style="fill:${fill}" ${extra}/>`;
  }

  /** Плоский чотирикутник на правій грані (площина x = const) */
  quadX(x: number, y0: number, y1: number, z0: number, z1: number, fill: string, extra = ''): string {
    return `<polygon points="${this.pts([[x, y0, z1], [x, y1, z1], [x, y1, z0], [x, y0, z0]])}" style="fill:${fill}" ${extra}/>`;
  }

  /** Плоский чотирикутник на верхній площині (z = const) */
  quadZ(z: number, x0: number, x1: number, y0: number, y1: number, fill: string, extra = ''): string {
    return `<polygon points="${this.pts([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]])}" style="fill:${fill}" ${extra}/>`;
  }

  viewBox(pad = 6): string {
    return `${(this.minX - pad).toFixed(0)} ${(this.minY - pad).toFixed(0)} ${(this.maxX - this.minX + pad * 2).toFixed(0)} ${(this.maxY - this.minY + pad * 2).toFixed(0)}`;
  }
}

/** Міні-ілюстрації для карток послуг */
export function serviceIcon(kind: string): string {
  const g = new Iso(13);
  let b = '';
  switch (kind) {
    case 'landing':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(1.2, 0.6, 0.4, 2.6, 3.8, 0.35, 'white');
      b += g.box(1.5, 0.9, 0.75, 2, 0.5, 0.25, 'mist');
      b += g.box(1.5, 1.7, 0.75, 2, 1.2, 0.25, 'clay');
      b += g.box(1.5, 3.2, 0.75, 1.2, 0.6, 0.25, 'night');
      break;
    case 'business':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(0.4, 0.4, 0.4, 2.2, 2.6, 1.8, 'mist');
      b += g.quadY(3.0, 0.7, 2.3, 1.5, 2.0, SHADES.white[0]);
      b += g.box(2.8, 0.9, 0.4, 1.8, 2.2, 1.2, 'sage');
      b += g.box(0.9, 3.3, 0.4, 1.8, 1.3, 0.8, 'clay', true);
      b += g.box(3.0, 3.4, 0.4, 1.6, 1.2, 0.5, 'white');
      break;
    case 'catalog':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 3; i++) b += g.box(0.5 + i * 1.4, 0.6 + j * 2, 0.4, 1.1, 1.6, 0.9, (['mist', 'sage', 'clay'] as const)[(i + j) % 3], true);
      break;
    case 'shop':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(1, 1, 0.4, 3, 2.4, 2, 'clay');
      b += `<path d="${(() => { const [ax, ay] = g.p(1.8, 2.2, 2.4); const [bx, by] = g.p(3.2, 2.2, 2.4); const [cx, cy] = g.p(2.5, 2.2, 3.6); return `M${ax},${ay} Q${cx},${cy - 12} ${bx},${by}`; })()}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
      b += g.box(3.4, 3.5, 0.4, 1, 1, 0.7, 'mist', true);
      break;
    case 'automation':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(0.4, 0.4, 0.4, 1.4, 1.4, 1.1, 'mist', true);
      b += g.box(3.2, 0.4, 0.4, 1.4, 1.4, 1.1, 'sage', true);
      b += g.box(1.8, 3.2, 0.4, 1.4, 1.4, 1.1, 'clay', true);
      {
        const a = g.p(1.8, 1.1, 1), c = g.p(3.2, 1.1, 1), d = g.p(2.5, 3.2, 1);
        b += `<polyline points="${a.join(',')} ${c.join(',')} ${d.join(',')} ${a.join(',')}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 3"/>`;
      }
      break;
    case 'bots':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(1.2, 1.4, 0.4, 2.4, 2.4, 2, 'mist', false);
      b += g.quadY(3.8, 1.6, 2.2, 1.4, 1.9, INK);
      b += g.quadY(3.8, 2.6, 3.2, 1.4, 1.9, INK);
      b += g.box(2.1, 2.3, 2.4, 0.6, 0.6, 0.6, 'white');
      b += g.box(3.8, 3.8, 0.4, 0.8, 0.8, 0.5, 'clay');
      break;
    case 'redesign':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(0.5, 0.8, 0.4, 1.6, 3.4, 1.4, 'grey', true);
      b += g.box(2.9, 0.8, 0.4, 1.6, 3.4, 1.4, 'sage', true);
      {
        const a = g.p(2.2, 4.4, 0.4), c = g.p(2.8, 4.4, 0.4);
        b += `<path d="M${a[0]},${a[1]} L${c[0]},${c[1]}" stroke="${INK}" stroke-width="2" marker-end="url(#ar)"/>`;
      }
      break;
    case 'support':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(1, 1, 0.4, 3, 3, 1.4, 'mist', true);
      b += g.box(2, 2, 1.8, 1, 1, 1.6, 'clay');
      b += g.box(1.6, 1.6, 3.4, 1.8, 1.8, 0.35, 'white');
      break;
    case 'seo':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(0.6, 2.6, 0.4, 1.1, 1.1, 0.8, 'sage', true);
      b += g.box(1.9, 1.6, 0.4, 1.1, 1.1, 1.6, 'mist', true);
      b += g.box(3.2, 0.6, 0.4, 1.1, 1.1, 2.6, 'clay', true);
      break;
    case 'branding':
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(0.8, 0.8, 0.4, 3.4, 1.2, 0.35, 'clay');
      b += g.box(0.8, 1.6, 0.75, 3.4, 1.2, 0.35, 'sage');
      b += g.box(0.8, 2.4, 1.1, 3.4, 1.2, 0.35, 'mist');
      b += g.box(0.8, 3.2, 1.45, 3.4, 1.2, 0.35, 'night');
      break;
    default:
      b += g.box(0, 0, 0, 5, 5, 0.4, 'sand');
      b += g.box(0.5, 0.5, 0.4, 2, 2, 0.9, 'mist', true);
      b += g.box(2.7, 0.5, 0.4, 1.8, 1.6, 1.8, 'clay', true);
      b += g.box(0.5, 2.8, 0.4, 1.6, 1.6, 1.4, 'sage', true);
      b += g.box(2.5, 2.6, 0.4, 2, 2, 0.6, 'white', true);
  }
  return `<svg viewBox="${g.viewBox(4)}" aria-hidden="true" focusable="false"><defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker></defs><g class="iso" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round">${b}</g></svg>`;
}
