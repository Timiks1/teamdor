// @ts-nocheck
// Маленькі збірки для карток послуг і блоку «Автоматизація» (дод. ТЗ v0.2, п. 3.2).
// Кожна повертає { kit, box, update(t), still? }: t — час у мс, рух тихий і постійний (цикли 5–7 с).
// still — момент, коли збірка повна: для статичного кадру (PNG-заглушка, «зменшити рух»).
import { THREE, Kit, P, BR, PL } from './kit.js';

const TAU = Math.PI * 2;
/** 0 → 1 → 0 за період */
const wave = (t, period, phase = 0) => (1 - Math.cos(TAU * ((t / period + phase) % 1))) / 2;
/** стоїть, плавно піднімається й сідає назад */
const restLift = (t, period, phase = 0, rest = 0.45) => {
  const k = (((t / period + phase) % 1) + 1) % 1;
  if (k < rest) return 0;
  const u = (k - rest) / (1 - rest);
  return (1 - Math.cos(TAU * u)) / 2;
};
function grow(kit, up) { const b = kit.bounds(); b.max.y += up; return b; }

export const BUILDS = {
  // Лендінг: цеглинка сидить, піднімається на 14 мм і сідає; пунктир показує місце
  landing() {
    const k = new Kit(); k.part('white').block(-16, 0, -16, 4, 4, 1).finish();
    const b = k.part('blue').block(-16, PL, -8, 4, 2, 3).finish();
    const g = k.guide([[-16, 8], [16, -8]], 14); g.position.y = PL;
    return { kit: k, box: grow(k, 16), update(t) { const d = 14 * restLift(t, 5200); b.set(1, d); g.visible = d > 0.4; g.scale.y = d / 14 || 0.001; } };
  },
  // Сайт-каталог: «товари» по черзі підводяться на 5 мм — хвиля
  catalog() {
    const k = new Kit(); k.part('white').block(-32, 0, -20, 8, 5, 1).finish(); const items = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) items.push(k.part(r === 0 && c === 1 ? 'blue' : 'navy').block(-32 + c * 24, PL, -20 + r * 24, 2, 2, 3).finish());
    return { kit: k, box: grow(k, 6), update(t) { items.forEach((p, i) => p.set(1, 5 * restLift(t, 6000, i / 6, 0.6))); } };
  },
  // Сайт для бізнесу: шари-«сторінки» розходяться й сходяться
  business() {
    const k = new Kit(); const layers = ['white', 'navy', 'blue'].map((c, i) => k.part(c).block(-16, i * PL, -12, 4, 3, 1, { studs: i === 2 }).finish());
    return { kit: k, box: grow(k, 14), update(t) { const e = wave(t, 5600); layers.forEach((p, i) => p.set(1, i * 6 * e)); } };
  },
  // Інтернет-магазин: «монети» по одній лягають стосом, потім цикл заново
  shop() {
    const k = new Kit(); k.part('navy').block(-16, 0, -8, 4, 2, 3).finish();
    const coins = [0, 1, 2].map((i) => k.part('blue').cylinder(8, BR + i * PL, 0, 7.8, PL, { studTop: i === 2 }).finish());
    return { kit: k, box: grow(k, 22), still: 5300, update(t) {
      const T = 6600, k2 = (t % T) / T;
      coins.forEach((p, i) => {
        const s = 0.1 + i * 0.22, u = Math.min(1, Math.max(0, (k2 - s) / 0.16)), e = 1 - Math.pow(1 - u, 3);
        const out = k2 > 0.88 ? 1 - (k2 - 0.88) / 0.12 : 1; p.set(u > 0 ? out : 0, 18 * (1 - e));
      });
    } };
  },
  // Редизайн: цеглинки міняються місцями по дузі
  redesign() {
    const k = new Kit(); k.part('white').block(-20, 0, -8, 5, 2, 1).finish();
    const a = k.part('navy').block(-20, PL, -8, 2, 2, 3).finish(), b = k.part('blue').block(4, PL, -8, 2, 2, 3).finish();
    return { kit: k, box: grow(k, 14), update(t) {
      const T = 7000, phase = (t % T) / T, w = phase < 0.5 ? 0 : (phase - 0.5) * 2;
      const ease = (1 - Math.cos(Math.PI * w)) / 2, pa = Math.floor(t / T) % 2 ? 1 - ease : ease;
      a.group.position.x = 24 * pa; b.group.position.x = -24 * pa; a.set(1, 12 * Math.sin(Math.PI * w)); b.set(1, 0);
    } };
  },
  // Підтримка: верх «дихає» на колонах
  support() {
    const k = new Kit(); k.part('white').block(-16, 0, -16, 4, 4, 1).finish();
    const cols = [[-10, -10], [10, -10], [-10, 10], [10, 10]].map(([x, z]) => k.part('blue').cylinder(x, PL, z, 3.2, 14).finish());
    const deck = k.part('navy').block(-16, PL + 14, -16, 4, 4, 1).finish();
    return { kit: k, box: grow(k, 6), update(t) {
      const e = wave(t, 6000); deck.set(1, 5 * e);
      cols.forEach((c) => { c.inner.scale.y = 1 + (5 * e) / 14; c.inner.position.y = -PL * ((5 * e) / 14); });
    } };
  },
  // Автоматизація та інтеграції: цеглинка їде доріжкою й перелітає на початок
  automation() {
    const k = new Kit(); k.part('white').block(-36, 0, -12, 9, 3, 1).finish();
    for (let i = 0; i < 4; i++) k.part('navy').block(-36 + i * 16 + 4, PL, -4, 2, 1, 1, { studs: false }).finish();
    const box = k.part('blue').block(-32, 2 * PL, -8, 2, 2, 3).finish();
    return { kit: k, box: grow(k, 12), update(t) {
      const T = 6400, u = (t % T) / T; let x, y;
      if (u < 0.7) { const e = (1 - Math.cos(Math.PI * (u / 0.7))) / 2; x = 48 * e; y = 0; }
      else { const w = (u - 0.7) / 0.3, e = (1 - Math.cos(Math.PI * w)) / 2; x = 48 * (1 - e); y = 12 * Math.sin(Math.PI * w); }
      box.group.position.x = x; box.set(1, y);
    } };
  },
  // Telegram-боти (немає в ТЗ v0.2): «повідомлення» — круглі синя/біла пластинки по черзі підлітають до «телефона»
  bots() {
    const k = new Kit(); k.part('white').block(-20, 0, -12, 5, 3, 1).finish();
    k.part('navy').block(-20, PL, -4, 2, 1, 6, { studs: false }).finish();
    const msgs = [0, 1, 2].map((i) => k.part(i === 1 ? 'white' : 'blue').cylinder(10, PL + i * PL, 0, 6, PL, { studTop: i === 2 }).finish());
    return { kit: k, box: grow(k, 16), still: 4900, update(t) {
      const T = 6200, k2 = (t % T) / T;
      msgs.forEach((p, i) => {
        const s = 0.08 + i * 0.2, u = Math.min(1, Math.max(0, (k2 - s) / 0.18)), e = (1 - Math.cos(Math.PI * u)) / 2;
        const out = k2 > 0.86 ? 1 - (k2 - 0.86) / 0.14 : 1; p.set(u > 0 ? out : 0, 14 * (1 - e));
      });
    } };
  },
  // SEO та реклама: колони по черзі підростають — зростання
  seo() {
    const k = new Kit(); k.part('white').block(-32, 0, -8, 8, 2, 1).finish(); const cols = [];
    for (let i = 0; i < 4; i++) { const p = k.part(i === 3 ? 'blue' : 'navy'); p.block(-32 + i * 16, PL, -8, 2, 2, 3 * (i + 1)); p.finish(); cols.push(p); }
    return { kit: k, box: grow(k, 6), update(t) { cols.forEach((p, i) => p.set(1, 4 * restLift(t, 6200, -i * 0.08, 0.55))); } };
  },
  // Брендинг і дизайн: маленькі двері-знак, стулка повільно прочиняється й прикривається
  branding() {
    const k = new Kit(); const Y0 = PL;
    k.part('white').block(-32, 0, -16, 8, 4, 1).finish();
    k.part('navy').block(-24, Y0, -8, 1, 1, 12, { studs: false }).finish(); k.part('navy').block(16, Y0, -8, 1, 1, 12, { studs: false }).finish();
    const top = Y0 + 12 * PL; k.part('navy').arch(0, top, 24, 16, 0, Math.PI, -8, 8).finish();
    const light = k.part('blue');
    { const s = new THREE.Shape(); const x0 = 5, x1 = 12, y0 = Y0, y1 = top + 6;
      s.moveTo(x0, y0 + 3.5); s.lineTo(x0, y1 - 3.5); s.absarc((x0 + x1) / 2, y1 - 3.5, 3.5, Math.PI, 0, true); s.lineTo(x1, y0 + 3.5); s.absarc((x0 + x1) / 2, y0 + 3.5, 3.5, 0, Math.PI, true); s.closePath();
      light.glow(s, -4.2, '#0B5FFF'); light.finish(); }
    const leaf = k.part('white');
    { const W = 20, s = new THREE.Shape(); s.moveTo(0, Y0); s.lineTo(W, Y0);
      for (let i = 0; i <= 24; i++) { const lx = W - (W * i) / 24, wx = -16 + lx; s.lineTo(lx, top + Math.sqrt(Math.max(0, 256 - wx * wx)) - 1); }
      s.closePath(); leaf.extrude(s, -2, 4); leaf.finish(); }
    leaf.group.position.set(-16, 0, -4);
    return { kit: k, box: grow(k, 2), update(t) { const e = wave(t, 6800); leaf.group.rotation.y = -THREE.MathUtils.degToRad(22 + 26 * e); } };
  },
  // Проєкт під задачу: різні деталі; синя цеглинка «приміряється» — піднімається й сідає на місце
  custom() {
    const k = new Kit(); k.part('white').block(-24, 0, -16, 6, 4, 1).finish();
    k.part('navy').block(-24, PL, -16, 1, 2, 3).finish(); k.part('white').cylinder(12, PL, 8, 3.8, BR, { studTop: true }).finish(); k.part('navy').block(8, PL, -16, 2, 1, 1).finish();
    const b = k.part('blue').block(-8, PL, -4, 2, 2, 3).finish();
    const g = k.guide([[-8, 12], [8, -4]], 18); g.position.y = PL;
    return { kit: k, box: grow(k, 18), update(t) { const d = 18 * restLift(t, 6000, 0.5, 0.4); b.set(1, d); g.visible = d > 0.4; g.scale.y = d / 18 || 0.001; } };
  },
};
