// @ts-nocheck
// Двері для блоку «Етапи» (дод. ТЗ v0.2, п. 2): одна сцена, деталі проявляються над місцем і опускаються.
// 1 база · 2 поріг і доріжка · 3 колони · 4 арка · 5 стулка · 6 деталі · 7 світло · 8 двері відчиняються ширше
import { THREE, Kit, P, BR, PL, easeInOut } from './kit.js';

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
 * Живі двері в canvas усередині card. Рендер лише коли щось рухається.
 * Повертає { goTo(n, {instant}), stage }; null — якщо WebGL недоступний.
 */
export function mountDoor(canvas, card) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setClearColor(0xffffff, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const d = buildDoor();
  const { kit, parts, clusters, leaf, LEAF_AJAR, LEAF_OPEN, fitBox } = d;

  const tracks = new Map(); // об'єкт → { t0, keys:[{t, op, dy}|{t, r}] }
  const track = (obj, keys, t0) => tracks.set(obj, { t0, keys });
  const sample = (keys, t) => {
    if (t <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t <= b.t) {
        const k = (t - a.t) / (b.t - a.t || 1), e = b.step ? (k < 1 ? 0 : 1) : easeInOut(k);
        const o = {}; for (const key in b) if (typeof b[key] === 'number' && key !== 't') o[key] = a[key] + (b[key] - a[key]) * e; return o;
      }
    }
    return keys[keys.length - 1];
  };

  let stage = 0;
  function goTo(target, { instant = false } = {}) {
    const now = performance.now(); const from = stage; stage = target;
    const loopBack = from === 8 && target === 1 && !instant;
    parts.forEach((p) => {
      const cur = { op: p.op, dy: p.dy };
      if (p.stage < target) { // уже зібрано: доводимо на місце
        if (loopBack) return;
        track(p, [{ t: 0, ...cur }, { t: instant ? 0 : 500, op: 1, dy: 0 }], now);
      } else if (p.stage > target || loopBack) { // ще не зібрано: піднімається й тане
        if (cur.op < 0.01) { p.set(0, 0); tracks.delete(p); return; }
        const dl = loopBack ? (p.stage === 1 ? 0 : 20 * (8 - p.stage)) : 0;
        track(p, [{ t: 0, ...cur }, { t: dl, ...cur }, { t: dl + (instant ? 0 : 520), op: 0, dy: reduce ? 0 : 18 }], now);
      }
    });
    if (loopBack) { // після 08 → 01: двері розбираються згори вниз, база з'являється знову
      parts.filter((p) => p.stage === 1).forEach((p) => track(p, [{ t: 0, op: p.op, dy: p.dy }, { t: 620, op: 0, dy: 0 }, { t: 980, op: 1, dy: 0 }], now));
    } else {
      parts.filter((p) => p.stage === target).forEach((p) => {
        if (p.isLight) { // світло: коротко моргає, як лампа, і горить
          const k = reduce ? [{ t: 0, op: 0, dy: 0 }, { t: 400, op: 1, dy: 0 }]
            : [{ t: 0, op: 0, dy: 0 }, { t: 120, op: 0, dy: 0 }, { t: 160, op: 0.7, dy: 0, step: 1 }, { t: 230, op: 0, dy: 0, step: 1 }, { t: 300, op: 0.9, dy: 0, step: 1 }, { t: 370, op: 0.15, dy: 0, step: 1 }, { t: 520, op: 1, dy: 0, step: 1 }];
          track(p, instant ? [{ t: 0, op: 1, dy: 0 }] : k, now); return;
        }
        if (!p.cluster) { track(p, [{ t: 0, op: 0, dy: 0 }, { t: instant ? 0 : 480, op: 1, dy: 0 }], now); return; }
        const i = clusters.filter((c) => c.stage === target).indexOf(p.cluster), dl = i * 140;
        const keys = instant ? [{ t: 0, op: 1, dy: 0 }] : reduce ? [{ t: 0, op: 0, dy: 0 }, { t: dl + 400, op: 1, dy: 0 }]
          : [{ t: 0, op: 0, dy: HOVER }, { t: dl, op: 0, dy: HOVER }, { t: dl + 260, op: 1, dy: HOVER }, { t: dl + 520, op: 1, dy: HOVER }, { t: dl + 1500, op: 1, dy: 0 }];
        track(p, keys, now);
      });
    }
    // етап 8: двері відчиняються ширше; інші етапи — знову прочинені
    const want = target === 8 ? LEAF_OPEN : LEAF_AJAR;
    tracks.set(leaf.group.rotation, { t0: now, keys: [{ t: 0, r: leaf.group.rotation.y }, { t: instant || reduce ? 0 : target === 8 ? 1300 : 600, r: want }] });
    kick();
  }

  const render = () => renderer.render(kit.scene, kit.camera);
  function size() {
    const r = card.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!r.width) return;
    renderer.setPixelRatio(dpr); renderer.setSize(r.width, r.height, false);
    kit.setResolution(r.width * dpr, r.height * dpr, dpr * Math.max(1, r.width / 720));
    kit.fit(fitBox, r.width, r.height, 1.06); render();
  }
  new ResizeObserver(size).observe(card);

  let raf = 0;
  function frame(now) {
    let busy = false;
    for (const [obj, tr] of tracks) {
      const t = now - tr.t0, lastKey = tr.keys[tr.keys.length - 1];
      const s = t >= lastKey.t ? lastKey : sample(tr.keys, t);
      if (obj.isEuler) obj.y = s.r; else obj.set(s.op, s.dy);
      if (t >= lastKey.t) tracks.delete(obj); else busy = true;
    }
    for (const c of clusters) { // напрямні йдуть за деталлю, що зависла над місцем
      const p = c.parts[0], show = p.op > 0.01 && p.dy > 0.5;
      c.guide.visible = show;
      if (show) { c.guide.scale.y = p.dy / HOVER; c.gm.opacity = Math.min(1, p.op) * Math.min(1, p.dy / (HOVER * 0.35)); }
    }
    render();
    raf = busy ? requestAnimationFrame(frame) : 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  parts.forEach((p) => p.set(0, 0));
  size();
  return { goTo, get stage() { return stage; } };
}
