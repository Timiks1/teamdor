// @ts-nocheck
// Двері для блоку «Етапи»: одна сцена з деталей (дод. ТЗ v0.2, фізика — v0.3 п. 3).
// Деталі не проходять крізь деталі: кожна сідає на опору й лише тоді, коли над нею вільно; стулка — до арки.
import { THREE, Kit, P, BR, PL, SH } from './kit.js';

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
  // Стулка. Петля на 4 мм правіше від лівої колони, щоб на всьому повороті (−30°…−62°) стулка її не зачіпала.
  // Верх стулки рахуємо за формою арки: у кожній точці, що на будь-якому куті потрапляє в товщу арки,
  // між верхом стулки й внутрішнім краєм арки лишається ≥ 1,5 мм.
  const HX = -31.5, LEAF_W = 43.5, LEAF_T = 4, ZC = (ZB + ZF) / 2, R_IN = 36;
  const LEAF_AJAR = THREE.MathUtils.degToRad(-30), LEAF_OPEN = THREE.MathUtils.degToRad(-62);
  const archInner = (x) => (Math.abs(x) < R_IN ? Y_SPRING + Math.sqrt(R_IN * R_IN - x * x) : Y_SPRING);
  const leafTop = (lx) => {
    let top = archInner(HX + lx) - 1.6;
    for (let deg = -64; deg <= -28; deg += 1) {
      const a = THREE.MathUtils.degToRad(deg), c = Math.cos(a), sn = Math.sin(a);
      for (const lz of [-LEAF_T, LEAF_T]) {
        const wx = HX + lx * c + lz * sn, wz = ZC - lx * sn + lz * c;
        if (wz > ZB - 0.5 && wz < ZF + 0.5) top = Math.min(top, archInner(wx) - 1.6);
      }
    }
    return top;
  };
  const leaf = add(5, 'white', (p) => {
    const s = new THREE.Shape(); s.moveTo(0, Y_SILL); s.lineTo(LEAF_W, Y_SILL);
    for (let i = 0; i <= 64; i++) { const lx = LEAF_W - (LEAF_W * i) / 64; s.lineTo(lx, leafTop(lx)); }
    s.closePath(); p.extrude(s, -LEAF_T, 2 * LEAF_T);
  });
  leaf.group.position.set(HX, 0, ZC);
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
  const arches = parts.filter((p) => p.stage === 4);
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
  return { kit, parts, clusters, leaf, arches, LEAF_AJAR, LEAF_OPEN, fitBox };
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
  const TOL = 0.5;                 // мм — допуск при порівнянні габаритів
  const base = parts.filter((p) => p.stage === 1);
  const light = parts.find((p) => p.isLight);
  const solid = parts.filter((p) => p.stage !== 1 && !p.isLight);

  // Граф «що на чому стоїть»: якщо габарити двох деталей перетинаються в плані,
  // нижня сідає раніше за верхню (опора + вільний шлях згори). Стулка — раніше за арку (п. 3.3).
  const boxes = new Map(solid.map((p) => [p, p.restBox()]));
  const overlapXZ = (a, b) => a.min.x < b.max.x - TOL && b.min.x < a.max.x - TOL && a.min.z < b.max.z - TOL && b.min.z < a.max.z - TOL;
  const before = new Map(solid.map((p) => [p, new Set()])); // p → деталі, що мають сісти раніше
  for (const a of solid) for (const b of solid) {
    if (a === b) continue;
    const A = boxes.get(a), B = boxes.get(b);
    // шипи нижньої деталі входять у верхню на SH — це опора, не перетин
    if (overlapXZ(A, B) && A.max.y <= B.min.y + SH + TOL) before.get(b).add(a);
  }
  for (const arch of d.arches) before.get(arch).add(leaf);

  // Топологічний порядок із випадковим вибором серед деталей, які вже можна ставити — «врізнобій, як дощ»
  const order = [], placed = new Set();
  while (order.length < solid.length) {
    const ready = solid.filter((p) => !placed.has(p) && [...before.get(p)].every((q) => placed.has(q)));
    const pick = ready[Math.floor(rand() * ready.length)];
    order.push(pick); placed.add(pick);
  }
  const plan = new Map();
  base.forEach((p) => plan.set(p, { land: 0.08, fall: FALL * 0.25 }));
  order.forEach((p, i) => plan.set(p, { land: 0.16 + (0.64 * i) / Math.max(1, order.length - 1), fall: FALL }));

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const soft = (k) => 1 - Math.pow(1 - k, 3); // швидко згори, м'яка посадка

  // Dev-перевірка (п. 3.6): на кожному кадрі габарити деталі в русі проти габаритів інших деталей.
  // Арка й стулка вкладені одна в одну (габарит арки охоплює проріз), тому цю пару перевірено аналітично при побудові.
  const DEV = import.meta.env?.DEV;
  const warned = new Set();
  const nested = (a, b) => (d.arches.includes(a) && b === leaf) || (d.arches.includes(b) && a === leaf);
  // Перетин: у плані глибше за допуск, по висоті — глибше, ніж заходить шип у деталь над ним
  const clash = (A, B) => {
    const ox = Math.min(A.max.x, B.max.x) - Math.max(A.min.x, B.min.x);
    const oz = Math.min(A.max.z, B.max.z) - Math.max(A.min.z, B.min.z);
    const oy = Math.min(A.max.y, B.max.y) - Math.max(A.min.y, B.min.y);
    return ox > TOL && oz > TOL && oy > SH + TOL;
  };
  function devCheck(moving) {
    const live = solid.filter((p) => p.op > 0.01).concat(base);
    for (const m of moving) {
      const M = new THREE.Box3().setFromObject(m.group);
      for (const o of live) {
        if (o === m || nested(m, o)) continue;
        if (clash(M, new THREE.Box3().setFromObject(o.group))) {
          const key = parts.indexOf(m) + ':' + parts.indexOf(o);
          if (!warned.has(key)) { warned.add(key); console.warn('[lego] деталі перетинаються', { moving: parts.indexOf(m), other: parts.indexOf(o) }); }
        }
      }
    }
  }

  function setProgress(p) {
    const moving = [];
    for (const [part, pl] of plan) {
      const k = clamp01((p - (pl.land - DUR)) / DUR);
      part.set(clamp01(k / 0.2), pl.fall * (1 - soft(k)));
      if (k > 0 && k < 1) moving.push(part);
    }
    if (light) light.set(clamp01((p - 0.86) / 0.04), 0);
    const open = soft(clamp01((p - 0.92) / 0.08));
    leaf.group.rotation.y = LEAF_AJAR + (LEAF_OPEN - LEAF_AJAR) * open;
    if (open > 0 && open < 1 && !moving.includes(leaf)) moving.push(leaf);
    if (DEV && moving.length) devCheck(moving);
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
