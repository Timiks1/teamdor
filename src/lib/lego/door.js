// @ts-nocheck
// Двері для блоку «Етапи» (дод. ТЗ v0.2, п. 2): одна сцена, деталі проявляються над місцем і опускаються.
// 1 база · 2 поріг і доріжка · 3 колони · 4 арка · 5 стулка · 6 деталі · 7 світло · 8 двері відчиняються ширше
import { THREE, Kit, P, BR, PL } from './kit.js';

export const HOVER = 40; // мм — висота, з якої опускається деталь
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Будує сцену дверей. Не потребує DOM — використовується і для PNG-заглушок. */
export function buildDoor() {
  const kit = new Kit({ lineWidth: 1.4 });
  const Y_BASE = PL, Y_SILL = 2 * PL, Y_SPRING = Y_SILL + 6 * BR + 2 * PL, ZB = -32, ZF = -16;
  const parts = [];
  const add = (stage, color, build) => { const p = kit.part(color); build(p); p.finish(); p.stage = stage; parts.push(p); return p; };

  add(1, 'white', (p) => p.block(-8.5 * P, 0, -6 * P, 17, 12, 1));
  add(2, 'navy', (p) => p.block(-44, Y_BASE, ZB, 11, 2, 1));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) add(2, 'white', (p) => p.block(-4 + c * 16, Y_BASE, ZF + r * 16, 2, 2, 1, { studs: false }));
  for (const x of [-44, 36]) {
    for (let k = 0; k < 6; k++) add(3, 'navy', (p) => p.block(x, Y_SILL + k * BR, ZB, 1, 2, 3));
    for (let k = 0; k < 2; k++) add(3, 'navy', (p) => p.block(x, Y_SILL + 6 * BR + k * PL, ZB, 1, 2, 1));
  }
  for (const [a0, a1] of [[0, Math.PI / 2], [Math.PI / 2, Math.PI]]) add(4, 'navy', (p) => p.arch(0, Y_SPRING, 44, 36, a0, a1, ZB, 16));
  const leaf = add(5, 'white', (p) => {
    const W = 47.4, HX = -35.4, top = (lx) => Y_SPRING + Math.sqrt(Math.max(0, 1296 - (HX + lx) ** 2)) - 1.6;
    const s = new THREE.Shape(); s.moveTo(0, Y_SILL); s.lineTo(W, Y_SILL);
    for (let i = 0; i <= 48; i++) { const lx = W - (W * i) / 48; s.lineTo(lx, top(lx)); }
    s.closePath(); p.extrude(s, -4, 8);
  });
  leaf.group.position.set(-35.4, 0, (ZB + ZF) / 2);
  const LEAF_AJAR = THREE.MathUtils.degToRad(-30), LEAF_OPEN = THREE.MathUtils.degToRad(-62);
  leaf.group.rotation.y = LEAF_AJAR;

  add(6, 'navy', (p) => p.block(44, Y_BASE, 8, 2, 1, 3, { studs: false }));
  const sign = add(6, 'navy', (p) => p.box(44, Y_BASE + BR, 10.4, 16, 3 * BR, 3.2));
  { // знак на табличці
    const c = document.createElement('canvas'); c.width = 256; c.height = 448; const x = c.getContext('2d');
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.roundRect(0, 0, 256, 448, 18); x.fill();
    x.save(); x.translate(128, 236); x.scale(2.1, 2.1); x.lineWidth = 5.5; x.lineCap = 'round'; x.strokeStyle = '#15213B';
    x.beginPath(); x.moveTo(-28, 34); x.lineTo(-28, -9); x.arc(0, -9, 28, Math.PI, 0); x.lineTo(28, 34); x.stroke();
    x.fillStyle = '#0B5FFF'; x.beginPath(); x.roundRect(7, -18, 13, 52, 6.5); x.fill(); x.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true }); m.userData.base = 1;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(12, 21), m); face.position.set(52, Y_BASE + BR + 1.5 * BR, 13.62);
    sign.inner.add(face); sign.mats.push(m);
  }
  for (let k = 0; k < 2; k++) add(6, 'white', (p) => p.cylinder(-52, Y_BASE + k * BR, 8, 7.85, BR).stud(-56, Y_BASE + (k + 1) * BR, 4).stud(-48, Y_BASE + (k + 1) * BR, 4).stud(-56, Y_BASE + (k + 1) * BR, 12).stud(-48, Y_BASE + (k + 1) * BR, 12));
  for (const [x, z, c] of [[-68, -48, 'navy'], [60, -48, 'blue'], [-68, 40, 'blue'], [60, 40, 'navy']]) add(6, c, (p) => p.block(x, Y_BASE, z, 1, 1, 3));
  const light = add(7, 'blue', (p) => {
    const yb = Y_SILL, H = 76.8, s = new THREE.Shape();
    s.moveTo(12, yb + 8); s.lineTo(12, yb + H - 8); s.absarc(20, yb + H - 8, 8, Math.PI, 0, true);
    s.lineTo(28, yb + 8); s.absarc(20, yb + 8, 8, 0, Math.PI, true); s.closePath();
    p.glow(s, -24, '#0B5FFF');
  });
  light.isLight = true;

  // Кластери: дотичні деталі одного етапу рухаються разом, з двома пунктирними напрямними
  const clusters = [];
  {
    const right = new THREE.Vector3().crossVectors(kit.VIEW, new THREE.Vector3(0, 1, 0)).normalize(), v = new THREE.Vector3();
    for (let s = 2; s <= 6; s++) {
      const list = parts.filter((p) => p.stage === s); const groups = [];
      for (const p of list) {
        const a = p.restBox();
        const hit = groups.filter((g) => g.some((q) => { const b = q.restBox();
          return a.min.x <= b.max.x + 0.5 && b.min.x <= a.max.x + 0.5 && a.min.z <= b.max.z + 0.5 && b.min.z <= a.max.z + 0.5; }));
        const m = [p].concat(...hit); hit.forEach((h) => groups.splice(groups.indexOf(h), 1)); groups.push(m);
      }
      for (const g of groups) {
        const bx = new THREE.Box3(); g.forEach((p) => bx.union(p.restBox()));
        let lo = null, hi = null;
        for (const p of g) p.group.traverse((o) => {
          if (!o.isMesh || !o.geometry.attributes.position) return; o.updateWorldMatrix(true, false);
          const pa = o.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) {
            v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
            if (v.y > bx.min.y + 0.6) continue; const k = v.x * right.x + v.z * right.z;
            if (!lo || k < lo.k) lo = { x: v.x, z: v.z, k }; if (!hi || k > hi.k) hi = { x: v.x, z: v.z, k };
          }
        });
        const guide = kit.guide([[lo.x, lo.z], [hi.x, hi.z]], HOVER); guide.position.y = bx.min.y; guide.visible = false;
        clusters.push({ stage: s, parts: g, guide, gm: guide.material, y: bx.min.y, x: bx.min.x });
        g.forEach((p) => (p.cluster = clusters[clusters.length - 1]));
      }
    }
    clusters.sort((a, b) => a.stage - b.stage || a.y - b.y || a.x - b.x);
  }

  const fitBox = kit.bounds(); fitBox.max.y += HOVER * 0.55;
  return { kit, parts, clusters, leaf, LEAF_AJAR, LEAF_OPEN, fitBox };
}

/** Миттєвий стан сцени для етапу n (для PNG-заглушок і «без руху»). */
export function poseDoor(d, n) {
  for (const p of d.parts) p.set(p.stage <= n ? 1 : 0, 0);
  for (const c of d.clusters) c.guide.visible = false;
  d.leaf.group.rotation.y = n >= 8 ? d.LEAF_OPEN : d.LEAF_AJAR;
}

/**
 * Двері, що збираються прокруткою, як відео: setProgress(0…1) — кадр.
 * Деталі падають згори врізнобій, як дощ, кілька одночасно, і м'яко сідають.
 * Кожна сідає лише після тих, що під нею: стійки ростуть знизу, арка лягає на готові стійки.
 * Наприкінці стає стулка, загоряється світло й двері відчиняються ширше.
 * Рендер лише при зміні прогресу. Повертає null, якщо WebGL недоступний.
 */
export function mountDoorScrub(canvas, card) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setClearColor(0xffffff, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const d = buildDoor();
  const { kit, parts, clusters, leaf, LEAF_AJAR, LEAF_OPEN } = d;
  for (const c of clusters) { c.guide.visible = false; c.guide.parent?.remove(c.guide); } // без напрямних

  // Детермінований «випадок», щоб порядок був той самий при кожному завантаженні
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const FALL = reduce ? 0 : 260;   // мм — звідки падає деталь (з-за верхнього краю картки)
  const DUR = 0.16;                // тривалість падіння в частках прокрутки: кілька деталей летять одночасно
  const base = parts.filter((p) => p.stage === 1);
  const light = parts.find((p) => p.isLight);
  const rest = parts.filter((p) => p.stage !== 1 && p !== leaf && !p.isLight);
  // врізнобій, але знизу вгору: джиттер менший за висоту цеглинки, тож верхня не обжене нижню
  const keyed = rest.map((p) => ({ p, k: p.restBox().min.y + rand() * BR * 0.9 })).sort((a, b) => a.k - b.k);
  const plan = new Map();
  base.forEach((p) => plan.set(p, { land: 0.08, fall: FALL * 0.25 }));
  keyed.forEach(({ p }, i) => plan.set(p, { land: 0.16 + (0.68 * i) / Math.max(1, keyed.length - 1), fall: FALL }));
  plan.set(leaf, { land: 0.9, fall: FALL });

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const soft = (k) => 1 - Math.pow(1 - k, 3); // швидко згори, м'яка посадка

  function setProgress(p) {
    for (const [part, pl] of plan) {
      const k = clamp01((p - (pl.land - DUR)) / DUR);
      part.set(clamp01(k / 0.2), pl.fall * (1 - soft(k)));
    }
    if (light) light.set(clamp01((p - 0.92) / 0.03), 0);
    leaf.group.rotation.y = LEAF_AJAR + (LEAF_OPEN - LEAF_AJAR) * soft(clamp01((p - 0.95) / 0.05));
    renderer.render(kit.scene, kit.camera);
  }

  const fitBox = kit.bounds();
  let last = 0;
  function size() {
    const r = card.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!r.width) return;
    renderer.setPixelRatio(dpr); renderer.setSize(r.width, r.height, false);
    kit.setResolution(r.width * dpr, r.height * dpr, dpr * Math.max(1, r.width / 720));
    kit.fit(fitBox, r.width, r.height, 1.1);
    setProgress(last);
  }
  new ResizeObserver(size).observe(card);
  size();
  return { setProgress(p) { last = p; setProgress(p); } };
}
