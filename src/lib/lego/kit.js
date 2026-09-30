// @ts-nocheck
// Рушій лего-ілюстрацій teamdor (з додаткового ТЗ v0.2, examples/lego-kit.js): пропорції, палітра, примітиви, камера, напрямні.
/* lego-kit.js — shared engine for the teamdor brick illustrations.
   Flat fills (no shading), thin outlines, real brick proportions, fixed three-quarter orthographic view.
   Depends on three@0.160 (import map: "three" and "three/addons/"). */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };

/* ---- real proportions, millimetres ---- */
export const P = 8;      // stud pitch
export const BR = 9.6;   // brick height
export const PL = 3.2;   // plate height
export const SR = 2.4;   // stud radius (Ø4.8)
export const SH = 1.7;   // stud height
const GAP = 0.12;        // visual seam between neighbouring bricks

/* ---- palette: only for the brick illustrations ---- */
export const COLORS = {
  navy:  { fill: '#15213B', line: '#56617A', name: 'темно-синя' },
  white: { fill: '#F7F7F5', line: '#15213B', name: 'біла' },
  blue:  { fill: '#0B5FFF', line: '#15213B', name: 'синя' },
};
export const GUIDE = '#8A93A6';

/* ---- view ---- */
export function viewDir(azDeg = 34, elDeg = 30) {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  return new THREE.Vector3(-Math.sin(az) * Math.cos(el), -Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

/* A Kit owns one scene: its line materials, its parts, its camera fit. */
export class Kit {
  constructor({ az = 34, el = 30, lineWidth = 1.4 } = {}) {
    this.VIEW = viewDir(az, el);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
    this.lineMats = new Set();
    this.parts = [];
    this.lineWidth = lineWidth;
  }

  flat(hex, opts = {}) {
    const m = new THREE.MeshBasicMaterial({ color: hex, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...opts });
    m.userData.base = m.opacity; return m;
  }
  lineMat(color, opts = {}) {
    const m = new LineMaterial({ color, linewidth: this.lineWidth, transparent: true, opacity: 1, ...opts });
    m.userData.base = m.opacity; m.userData.w = opts.linewidth ?? this.lineWidth; this.lineMats.add(m); return m;
  }

  /* new part = a group that can fade and float as one piece */
  part(color, { add = true } = {}) {
    const p = new Part(this, color);
    if (add) this.scene.add(p.group);
    this.parts.push(p);
    return p;
  }

  /* dashed vertical guides from rest position up to `height` */
  guide(points, height) {
    const pos = []; for (const [x, z] of points) pos.push(x, 0, z, x, height, z);
    const g = new LineSegmentsGeometry(); g.setPositions(pos);
    const m = this.lineMat(GUIDE, { dashed: true, dashSize: 2.4, gapSize: 2, linewidth: 1.1 });
    const l = new LineSegments2(g, m); l.computeLineDistances(); l.renderOrder = 4;
    this.scene.add(l); return l;
  }

  /* fit the camera to a box (world units) for a w×h viewport */
  fit(box, w, h, pad = 1.08) {
    const c = box.getCenter(new THREE.Vector3());
    this.camera.position.copy(c).addScaledVector(this.VIEW, -2000);
    this.camera.lookAt(c); this.camera.updateMatrixWorld();
    const right = new THREE.Vector3().crossVectors(this.VIEW, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, this.VIEW).normalize();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const X of [box.min.x, box.max.x]) for (const Y of [box.min.y, box.max.y]) for (const Z of [box.min.z, box.max.z]) {
      const v = new THREE.Vector3(X, Y, Z).sub(c), px = v.dot(right), py = v.dot(up);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let hw = (x1 - x0) / 2 * pad, hh = (y1 - y0) / 2 * pad;
    if (hw / hh > w / h) hh = hw * h / w; else hw = hh * w / h;
    Object.assign(this.camera, { left: cx - hw, right: cx + hw, top: cy + hh, bottom: cy - hh });
    this.camera.updateProjectionMatrix();
  }

  /* line widths are in screen pixels: tell the materials the drawing size */
  setResolution(wPx, hPx, scale = 1) {
    for (const m of this.lineMats) { m.resolution.set(wPx, hPx); m.linewidth = m.userData.w * scale; }
  }

  bounds(filter = () => true) {
    const b = new THREE.Box3();
    for (const p of this.parts) if (filter(p)) b.union(p.restBox());
    return b;
  }
}

class Edges {
  constructor(VIEW) { this.a = []; this.VIEW = VIEW; }
  seg(p, q) { this.a.push(p.x, p.y, p.z, q.x, q.y, q.z); }
  geom(g, thr = 25) { for (const v of new THREE.EdgesGeometry(g, thr).attributes.position.array) this.a.push(v); }
  circleY(cx, cy, cz, r, n = 32) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
    this.a.push(cx + r * Math.cos(a), cy, cz + r * Math.sin(a), cx + r * Math.cos(b), cy, cz + r * Math.sin(b)); } }
  silY(cx, cz, r, y0, y1) { const V = this.VIEW, p = new THREE.Vector3(-V.z, 0, V.x).normalize();
    for (const s of [1, -1]) this.seg(new THREE.Vector3(cx + s * r * p.x, y0, cz + s * r * p.z), new THREE.Vector3(cx + s * r * p.x, y1, cz + s * r * p.z)); }
  silZ(cx, cy, r, a0, a1, z0, z1) { const V = this.VIEW, p = new THREE.Vector2(-V.y, V.x).normalize();
    for (const s of [1, -1]) { let a = Math.atan2(s * p.y, s * p.x); if (a < 0) a += Math.PI * 2;
      if (a >= a0 - 1e-6 && a <= a1 + 1e-6) { const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        this.seg(new THREE.Vector3(x, y, z0), new THREE.Vector3(x, y, z1)); } } }
}

export class Part {
  constructor(kit, color) {
    this.kit = kit; this.color = color;
    this.group = new THREE.Group(); this.inner = new THREE.Group(); this.group.add(this.inner);
    this.E = new Edges(kit.VIEW); this.geos = []; this.mats = []; this.done = false;
    this.op = 1; this.dy = 0;
  }
  add(geo) { this.geos.push(geo.index ? geo.toNonIndexed() : geo); return this; }

  /* ---- primitives: x,z = min corner in mm, y = bottom in mm ---- */
  box(x, y, z, sx, sy, sz) {
    const g = new THREE.BoxGeometry(sx - 2 * GAP, sy, sz - 2 * GAP); g.translate(x + sx / 2, y + sy / 2, z + sz / 2);
    this.add(g); this.E.geom(g); return this;
  }
  stud(cx, y, cz) {
    const g = new THREE.CylinderGeometry(SR, SR, SH, 32); g.translate(cx, y + SH / 2, cz);
    this.add(g); this.E.circleY(cx, y + SH, cz, SR); this.E.circleY(cx, y, cz, SR); this.E.silY(cx, cz, SR, y, y + SH); return this;
  }
  /* brick / plate / tile on the stud grid: w,d in studs, h in plates */
  block(x, y, z, w, d, hPlates, { studs = true } = {}) {
    const h = hPlates * PL; this.box(x, y, z, w * P, h, d * P);
    if (studs) for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) this.stud(x + (i + .5) * P, y + h, z + (j + .5) * P);
    return this;
  }
  cylinder(cx, y, cz, r, h, { studTop = false } = {}) {
    const g = new THREE.CylinderGeometry(r, r, h, 48); g.translate(cx, y + h / 2, cz);
    this.add(g); this.E.circleY(cx, y, cz, r, 48); this.E.circleY(cx, y + h, cz, r, 48); this.E.silY(cx, cz, r, y, y + h);
    if (studTop) this.stud(cx, y + h, cz);
    return this;
  }
  /* extrude a 2D shape (in the XY plane) along +Z */
  extrude(shape, z0, depth, arcs = []) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 48 }); g.translate(0, 0, z0);
    this.add(g); this.E.geom(g, 30);
    for (const a of arcs) this.E.silZ(a.cx, a.cy, a.r, a.a0, a.a1, z0, z0 + depth);
    return this;
  }
  arch(cx, cy, rOut, rIn, a0, a1, z0, depth) {
    const s = new THREE.Shape(); s.absarc(cx, cy, rOut, a0, a1, false); s.absarc(cx, cy, rIn, a1, a0, true); s.closePath();
    return this.extrude(s, z0 + GAP, depth - 2 * GAP, [{ cx, cy, r: rOut, a0, a1 }, { cx, cy, r: rIn, a0, a1 }]);
  }
  /* a flat unlit shape, e.g. light — no outline */
  glow(shape, z, hex) {
    const m = new THREE.MeshBasicMaterial({ color: hex, transparent: true, depthWrite: false }); m.userData.base = 1;
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), m); mesh.position.z = z; mesh.renderOrder = 2;
    this.inner.add(mesh); this.mats.push(m); return this;
  }

  finish() {
    const c = COLORS[this.color];
    if (this.geos.length) {
      const g = this.geos.length > 1 ? mergeGeometries(this.geos) : this.geos[0];
      const m = this.kit.flat(c.fill); this.mats.push(m); this.inner.add(new THREE.Mesh(g, m));
    }
    if (this.E.a.length) {
      const lg = new LineSegmentsGeometry(); lg.setPositions(this.E.a);
      const lm = this.kit.lineMat(c.line); this.mats.push(lm);
      const l = new LineSegments2(lg, lm); l.renderOrder = 3; this.inner.add(l);
    }
    this.done = true; return this;
  }
  restBox() { const y = this.inner.position.y; this.inner.position.y = 0; const b = new THREE.Box3().setFromObject(this.group); this.inner.position.y = y; return b; }

  /* opacity 0..1 and vertical offset in mm */
  set(op, dy = 0) {
    this.op = op; this.dy = dy; this.group.visible = op > 0.002; this.inner.position.y = dy;
    for (const m of this.mats) { if (m.userData.t === undefined) m.userData.t = m.transparent;
      m.opacity = m.userData.base * op; m.transparent = m.userData.t || op < 0.999; }
  }
}

/* easing — gentle start and gentle landing for on-screen movement */
export const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const clamp01 = t => Math.min(1, Math.max(0, t));
