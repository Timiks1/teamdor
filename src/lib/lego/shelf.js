// @ts-nocheck
// Один WebGL-рендерер на всі маленькі збірки (картки послуг + блок «Автоматизація»), дод. ТЗ v0.2 п. 3.3:
// кожна сцена малюється в спільний рендерер і копіюється в canvas картки (drawImage).
// Малюємо лише видимі canvas, ~30 кадрів/с; «зменшити рух» → один статичний кадр.
import { THREE } from './kit.js';
import { BUILDS } from './builds.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let gl = null;
let glW = 0, glH = 0;
const items = [];
let raf = 0, last = 0;

function ensureGL() {
  if (gl) return gl;
  gl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  gl.setClearColor(0x000000, 0);
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.setPixelRatio(1);
  return gl;
}

function layout(it) {
  const r = it.canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  it.w = w; it.h = h;
  it.canvas.width = w; it.canvas.height = h;
  it.ctx = it.canvas.getContext('2d');
  it.build.kit.fit(it.build.box, w, h, it.pad);
  // лінія 1,4 px на екрані (на DPR 2 — 2,8 фізичних px)
  it.build.kit.setResolution(w, h, dpr * 0.95);
  if (w > glW || h > glH) { glW = Math.max(glW, w); glH = Math.max(glH, h); gl.setSize(glW, glH, false); }
  draw(it, it.t ?? it.build.still ?? 0);
}

function draw(it, t) {
  if (!it.ctx || !it.w) return;
  it.t = t;
  it.build.update(t);
  gl.setViewport(0, 0, it.w, it.h);
  gl.setScissor(0, 0, it.w, it.h);
  gl.setScissorTest(true);
  gl.clear();
  gl.render(it.build.kit.scene, it.build.kit.camera);
  it.ctx.clearRect(0, 0, it.w, it.h);
  // WebGL рахує від низу, 2D-canvas — від верху: беремо нижню частину буфера
  it.ctx.drawImage(gl.domElement, 0, glH - it.h, it.w, it.h, 0, 0, it.w, it.h);
  if (!it.ready) { it.ready = true; it.canvas.closest('[data-lego-art]')?.classList.add('is-ready'); }
}

function loop(now) {
  raf = 0;
  if (now - last > 33) { last = now; for (const it of items) if (it.visible) draw(it, now); }
  if (items.some((it) => it.visible)) raf = requestAnimationFrame(loop);
}
const kick = () => { if (!reduce && !raf) raf = requestAnimationFrame(loop); };

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const it = items.find((x) => x.canvas === e.target);
    if (it) it.visible = e.isIntersecting;
  }
  kick();
}, { rootMargin: '80px' });

const ro = new ResizeObserver((entries) => {
  for (const e of entries) { const it = items.find((x) => x.canvas === e.target); if (it) layout(it); }
});

/**
 * Підключає canvas-и з атрибутом data-lego="<ключ збірки>".
 * data-lego-pad — запас рамки (за замовчуванням 1.12).
 * Повертає false, якщо WebGL недоступний (тоді лишаються статичні PNG).
 */
export function mountShelf(canvases) {
  try { ensureGL(); } catch { return false; }
  for (const canvas of canvases) {
    const make = BUILDS[canvas.dataset.lego];
    if (!make || items.some((x) => x.canvas === canvas)) continue;
    const it = { canvas, build: make(), pad: Number(canvas.dataset.legoPad) || 1.12, visible: false };
    items.push(it);
    layout(it);
    io.observe(canvas);
    ro.observe(canvas);
  }
  return true;
}
