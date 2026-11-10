/* eslint-disable -- 원본의 비정형 장면/상태 로직을 보존한 생성 파일. */
// @ts-nocheck
// 수정은 port-reference.py 변환기에서 합니다. 원본 파일 해시는 manifest.json에 있습니다.
'use client';
import React from 'react';
import { SourceNode } from '../referenceRuntime';
import { FlowLogic, escapeFlowHtml, localPlanSuggestion } from '@/features/drawing-flow/flowLogic';
import { cloneFlowProject, prepareFlowProject } from '@/features/drawing-flow/flowProject';
import { FLOW_FASTENING_TOOLS, drawingToolKey, findFlowFasteningTool } from '@/features/drawing-flow/flowToolCatalog';
import { createStepWireGeometry } from '@/features/drawing-flow/stepWireGeometry';
export default class DrawingFlowSteps extends FlowLogic {
  referenceState = { tm: false, ghost: false, showFuture: true, hist: 0, rf: null, toast: '', scale: Math.min(window.innerWidth / 1920, window.innerHeight / 1080), si: 0, cur: 0, open: { 0: true }, tab: 'det', look: '3d', drag: null, over: null, plan: null, loading: true };
  cvRef = React.createRef(); ovRef = React.createRef(); lkRef = React.createRef(); aiRef = React.createRef(); gzRef = React.createRef(); H = [];
  TQ = { 3: 1.3, 4: 3, 5: 6, 6: 10, 8: 25, 10: 49, 12: 85, 14: 135, 16: 210 };
  TL = FLOW_FASTENING_TOOLS;
  boltOf(x) { const nm = x.sw ? x.sw.ko : (this.pr.parts[x.part] ? this.pr.parts[x.part].ko : ''), m = /^(.*?)\s*M(\d+)/.exec(nm); return { nm, ty: m ? m[1].trim() : nm, d: m ? +m[2] : 0 }; }
  recTool(x) { const { ty, d } = this.boltOf(x), HX = { '접시머리 나사': { 4: 2.5, 5: 3, 6: 4, 8: 5, 10: 6, 12: 8 }, '육각 구멍 볼트': { 4: 3, 5: 4, 6: 5, 8: 6, 10: 8, 12: 10 } }, SP = { 6: 10, 8: 13, 10: 17, 12: 19 }; if (/\btorx\b/i.test(ty.replace(/_/g, ' '))) return 'torx0'; if (/십자|phillips/i.test(ty)) return 'ph2'; if (/^육각 볼트/.test(ty) && SP[d]) return 'sp' + SP[d]; const v = (HX[ty] || HX['육각 구멍 볼트'])[d]; return v != null ? 'hex' + v : this.TL.find(t => t.f === 'torque').k; }
  toolK(x) { const t = findFlowFasteningTool(x.toolK, x.tool || x.toolKo); return t ? t.k : this.recTool(x); }
  fasteningSteps(s = this.referenceState) {
    return (s.plan || []).flatMap((rows, si) => rows.flatMap((step, k) => step.t === 'fasten' && !step.del && !step.blank ? [[si, k, step]] : []));
  }
  openToolReview(current = false) {
    const s = this.referenceState, steps = this.fasteningSteps(s);
    const selected = steps.find(([si, k]) => si === s.si && k === s.cur);
    const target = (current && selected) || steps.find(([, , step]) => !step.toolOk) || selected || steps[0];
    if (!target) return;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 공구를 검토하세요'); return; }
    const [si, k] = target, sub = this.lkSubs(s.plan[si])[k];
    this.updateReferenceState({ tab: 'tools', open: { ...s.open, [si]: true }, subCl: { ...s.subCl, [si + '-' + sub]: false } });
    this.pick(si, k, s.si !== si);
    if (!this._tlTh) { this._tlTh = true; this.delay(() => this.toolThumbs(), 100); }
  }
  changeStepTab(tab, swap = false) {
    const focused = this.referenceState.toolFocus;
    this.closePositionEdit();
    this.updateReferenceState({ tab, toolFocus: false, swOpen: swap }, () => this.show(!!focused, false));
  }
  focusFastener() {
    const s = this.referenceState, E = this.E, T = window.THREE;
    const step = s.plan?.[s.si]?.[s.cur];
    if (!E || !s.toolFocus || !step || step.t !== 'fasten') return;
    const piece = this.pr.pieces[this.lkPcs(step, s.si)[0]];
    if (!piece) return;
    piece.obj.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(piece.obj);
    if (bounds.isEmpty()) return;
    const radius = bounds.getSize(new T.Vector3()).length();
    const distance = Math.max(radius * 3.4, E.sz * .045, 8);
    E.cam.near = Math.min(10, distance / 50);
    E.cam.updateProjectionMatrix();
    E.orbit({ az: E.orbT.az, el: E.orbT.el, dist: distance, tgt: bounds.getCenter(new T.Vector3()) });
  }
  toggleToolFocus() {
    const s = this.referenceState;
    if (s.sequenceReview || !s.plan?.[s.si]?.[s.cur] || s.plan[s.si][s.cur].t !== 'fasten') return;
    const on = !s.toolFocus;
    this.stopPlayback();
    this.updateReferenceState({ toolFocus: on }, () => {
      this.show(!on, false);
      if (on) this.focusFastener();
    });
  }
  setToolAt(pairs, key, msg) {
    if (this.activePositionEdit(this.referenceState)) return;
    this.setPlan((_, plan) => {
      for (const [si, k] of pairs) {
        const row = plan[si]?.[k];
        if (!row || row.t !== 'fasten' || row.del || row.blank) continue;
        const tool = findFlowFasteningTool(key || this.toolK(row));
        if (!tool) continue;
        row.tool = tool.ko;
        row.toolK = tool.k;
        row.toolOk = true;
      }
    }, msg);
  }
  saveToolTorque() {
    const s = this.referenceState, draft = s.torqueDraft;
    if (!draft) return;
    this.updateReferenceState({ torqueDraft: null });
    const value = draft.text.trim().replace(',', '.');
    const torque = value === '' ? null : Number(value);
    if (torque !== null && (!/^\d*(?:\.\d+)?$/.test(value) || !Number.isFinite(torque) || torque <= 0)) {
      this.say('토크는 0보다 큰 숫자로 입력하세요');
      return;
    }
    const row = s.plan?.[draft.si]?.[draft.k];
    if (!row || row.t !== 'fasten' || row.del || row.blank) return;
    this.setPlan((_, plan) => { Object.assign(plan[draft.si][draft.k], { nm: torque, nmEd: true }); });
    clearTimeout(this._as);
    this.autoSave();
  }
  toolGeo(t) { const T = window.THREE, g = new T.Group(), st = this._stM || (this._stM = new T.MeshStandardMaterial({ color: 0xc9d0d5, metalness: 0.85, roughness: 0.32 })), gr = this._grM || (this._grM = new T.MeshStandardMaterial({ color: 0x23282c, metalness: 0.1, roughness: 0.7 })), ac = this._acM || (this._acM = new T.MeshStandardMaterial({ color: 0xf37321, metalness: 0.2, roughness: 0.5 })), H = Math.PI / 2;
    const add = (geo, m, x, y, z, rx, rz) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx || 0, 0, rz || 0); g.add(o); }; const cyl = (r, h, n) => new T.CylinderGeometry(r, r, h, n || 28);
    if (t.f === 'hex') { const r = 1.2 + t.v * 0.35; add(cyl(r, 70, 6), st, 0, 35, 0); add(cyl(r, 24, 6), st, 10.5, 70, 0, 0, H); add(new T.TorusGeometry(r * 1.4, r * 0.5, 8, 16, H), st, 3, 66.5, 0); }
    else if (t.f === 'sp') { add(new T.BoxGeometry(14, 120, 5), st, 0, 0, 0); const hd = (y, s) => { add(new T.CylinderGeometry(s, s, 5, 6), st, 0, y, 0, H); }; hd(66, 13); hd(-66, 10); }
    else if (t.f === 'torque') { add(cyl(6, 16), st, 0, 8, 0); add(cyl(10, 14), st, 0, 22, 0); add(new T.BoxGeometry(150, 9, 14), st, 82, 22, 0); add(cyl(8, 60), gr, 180, 22, 0, 0, H); add(cyl(8.6, 6), ac, 148, 22, 0, 0, H); }
    else if (t.f === 'torx') {
      const tip = new T.Shape();
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6, r = k % 2 ? 1.45 : 2.15;
        tip[k === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      tip.closePath();
      add(new T.ExtrudeGeometry(tip, { depth: 6, bevelEnabled: false }), st, 0, 6, 0, H);
      add(cyl(2.4, 22, 6), st, 0, 17, 0);
      add(cyl(4.8, 20), gr, 0, 36, 0);
    }
    else { add(cyl(2.4, 60), st, 0, 30, 0); add(cyl(9, 70), gr, 0, 95, 0); add(cyl(9.4, 6), ac, 0, 62, 0); }
    return g; }
  toolThumbs() { if (!this.E || !window.THREE) return; this.thumbRun(this.TL.map(t => ({ k: t.k, o: this.toolGeo(t) })), 'tlTh'); }
  thumbRun(list, key) { const T = window.THREE, R = this.E.R, W = 240, Hh = 180, rt = new T.WebGLRenderTarget(W * 2, Hh * 2), px = new Uint8Array(W * Hh * 16), c2 = document.createElement('canvas'); c2.width = W; c2.height = Hh; const x2 = c2.getContext('2d'), img = x2.createImageData(W, Hh), G = new Uint8Array(256); for (let q = 0; q < 256; q++) G[q] = Math.round(255 * Math.pow(q / 255, 1 / 2.2));
    const S = new T.Scene(); S.add(new T.HemisphereLight(0xe6edf1, 0x20262b, 1.1)); const d = new T.DirectionalLight(0xffffff, 1.4); d.position.set(3, 5, 4); S.add(d); const b2 = new T.DirectionalLight(0xffb27a, 0.5); b2.position.set(-4, 2, -3); S.add(b2); const cam = new T.PerspectiveCamera(30, 4 / 3, 0.01, 100), out = {}; let i = 0;
    const one = () => { if (i >= list.length) { rt.dispose(); return; } try { const it = list[i++], g = new T.Group(); g.add(it.o); g.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(g), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), r = Math.max(sz.x, sz.y, sz.z) || 1; it.o.position.sub(c); g.scale.setScalar(1 / r); g.rotation.set(0.35, -0.6, 0.5); S.add(g); S.updateMatrixWorld(true); cam.position.set(0, 0, 2.2); cam.lookAt(0, 0, 0); const prev = R.getRenderTarget(); R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(S, cam); R.readRenderTargetPixels(rt, 0, 0, W * 2, Hh * 2, px); R.setRenderTarget(prev); const W2 = W * 2; for (let yy = 0; yy < Hh; yy++) for (let xx = 0; xx < W; xx++) { const di = (yy * W + xx) * 4; let rr = 0, g2 = 0, b3 = 0, al = 0; for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) { const si2 = ((Hh * 2 - 1 - (yy * 2 + oy)) * W2 + xx * 2 + ox) * 4; rr += px[si2]; g2 += px[si2 + 1]; b3 += px[si2 + 2]; al += px[si2 + 3]; } img.data[di] = G[rr >> 2]; img.data[di + 1] = G[g2 >> 2]; img.data[di + 2] = G[b3 >> 2]; img.data[di + 3] = al >> 2; } x2.putImageData(img, 0, 0); S.remove(g); c2.toBlob(bl => { if (bl) { out[it.k] = URL.createObjectURL(bl); this.updateReferenceState({ [key]: Object.assign({}, out) }); } this.delay(one, 20); }, 'image/png'); } catch (er) { console.warn('thumbRun', er); this.delay(one, 20); } }; one(); }
  say(t) { clearTimeout(this._tt); this.updateReferenceState({ toast: t }); this._tt = this.delay(() => this.updateReferenceState({ toast: '' }), 3200); }
  push(lb) { (this.HL = this.HL || []).push(lb || '변경'); if (this.HL.length > 60) this.HL.shift(); this.H.push(JSON.stringify(this.referenceState.plan)); if (this.H.length > 60) this.H.shift(); this.updateReferenceState({ hist: this.H.length }); }
  undo() { this.stopPlayback(); if (!this.H.length) return; this.discardSequenceReview(); const p = JSON.parse(this.H.pop()); const lb = (this.HL || []).pop() || '변경'; this.updateReferenceState({ plan: p, hist: this.H.length, rf: null, lkMsg: null, lkBad: -1, confirmed: false }, () => { this.show(false); this.autoSave(); }); this.say('되돌림 · ' + lb + ' 취소'); }
  subOvApply() { const pr = this.pr; if (!pr) return; let so = null; try { so = JSON.parse(sessionStorage.getItem(this.flowKey('dx7_subs')) || 'null'); } catch (e) {} if (!so || so.n !== pr.pieces.length) return;
    pr.sections = pr.sections.map((s, si) => { const o = so.s && so.s[si]; if (!o || s.final || !Array.isArray(o.names)) return s; const b0 = s.subIdx || [], old = {}; s.idx.forEach((i, L) => { let k = 0; while (k < b0.length && L >= b0[k]) k++; old[i] = k; }); const G = o.names.map(() => []); s.idx.forEach(i => { let k = o.of[i]; if (k == null || k >= G.length) k = Math.min(old[i] || 0, G.length - 1); G[k].push(i); }); const keep = G.map((g, k) => k).filter(k => G[k].length); if (!keep.length) return s; const idx = [], sub = [], subIdx = []; keep.forEach((k, j) => { if (j) subIdx.push(idx.length); G[k].forEach(i => idx.push(i)); sub.push(o.names[k]); }); return Object.assign({}, s, { idx, sub, subIdx }); }); }
  secOvApply() { this.secOvApply0(); this.subOvApply(); }
  secOvApply0() { const pr = this.pr; if (!pr) return; if (!pr._sec0) pr._sec0 = pr.sections.slice(); let ov = null; try { ov = JSON.parse(sessionStorage.getItem(this.flowKey('dx7_secs')) || 'null'); } catch (e) {} if (!ov || ov.n !== pr.pieces.length || !Array.isArray(ov.secs)) { pr.sections = pr._sec0.slice(); return; } const pool = pr._sec0.filter(s => !s.final), fin = pr._sec0.filter(s => s.final); pr.sections = ov.secs.map((o, k) => Object.assign({}, o.from != null && pool[o.from] ? pool[o.from] : { steps: [] }, { ko: o.ko, idx: o.idx.slice(), no: k + 1, _from: o.from })).concat(fin); }
  autoSave() { this.props.session.plan = this.referenceState.plan; this.rememberStepActions(this.referenceState.plan); try { localStorage.setItem(this.flowKey('dx7_link_plan'), JSON.stringify(this.referenceState.plan[0])); localStorage.setItem(this.flowKey('dx7_link_plan_all'), JSON.stringify(this.referenceState.plan)); this.updateReferenceState({ savedAt: new Date().toTimeString().slice(0, 5) }); } catch (e) {} }
  setPlan(fn, msg, rfFrom, positionEdit = false, preserveReview = false) {
    this.stopPlayback();
    if (!preserveReview) this.discardSequenceReview();
    if (positionEdit || this.referenceState.lkMsg?.checked) this.updateReferenceState({ lkMsg: null, lkBad: -1 }); if (this.referenceState.confirmed) this.updateReferenceState({ confirmed: false }); this.push(msg); clearTimeout(this._as); this._as = this.delay(() => this.autoSave(), 300); this.updateReferenceState(s => { const plan = s.plan.map(a => a.map(x => Object.assign({}, x))); const r = fn(plan[s.si], plan); if (r) plan[s.si] = r; return { plan, positionDraft: null, rf: rfFrom == null ? null : { from: rfFrom } }; }, () => { this.show(false, !positionEdit); if (msg) this.say(msg); }); }
  lbl(arr, i) { let base = 0, sub = 0; for (let j = 0; j <= i && j < arr.length; j++) { if (arr[j].isNew) sub++; else { base++; sub = 0; } } return String(base).padStart(2, '0') + (arr[i] && arr[i].isNew ? '-' + sub : ''); }
  libIns(k) { const s = this.referenceState, pr = this.pr, arr = s.plan[s.si], ko = x => pr.parts[x].ko, n = pr.sections[s.si].idx.filter(i => pr.pieces[i].part === k).length || 1; let at = arr.length; const y = this.avgY(s.si, k); for (let i = 0; i < arr.length; i++) if (arr[i].t === 'place' && this.avgY(s.si, arr[i].part) > y + 1) { at = i; break; } const ins = this._insAt; if (ins != null) { at = ins.at; this._insAt = null; } const fill = ins && ins.fill && this.referenceState.plan[this.referenceState.si][at] && this.referenceState.plan[this.referenceState.si][at].blank; this.setPlan(a => { a.splice(at, fill ? 1 : 0, Object.assign({ t: 'place', part: k, q: n, g: ko(k) + '를 조립 위치에 놓으세요.', isNew: true }, ins && ins.sub !== undefined ? { sub: ins.sub } : {})); return a; }, String(at + 1).padStart(2, '0') + '번에 ' + ko(k) + ' 추가'); this.updateReferenceState({ cur: at, tab: 'det', lkMsg: null, confirmed: false }, () => this.delay(() => this.lkLocal(at), 80)); }
  markDel(k) { const si = this.referenceState.si, arr = this.referenceState.plan[si], x = arr[k]; if (!x) return; if (!x.del && arr.filter(y => !y.del).length < 2) return; const nm = this.lkKo(x), L = this.lbl(arr, k), was = !!x.del; this.setPlan(a => { a[k].del = !was; return a; }, L + '번 ' + nm + (was ? ' 단계를 되살렸습니다' : ' 단계를 지웠습니다 · 줄을 누르면 되살아납니다')); this.updateReferenceState({ cur: k }, () => { this.show(false); if (this.referenceState.lk) this.delay(() => this.lkLocal(k), 60); }); }
  tidyN(arr) { return { a: arr.filter(x => x.isNew && !x.del).length, d: arr.filter(x => x.del).length }; }
  tidy(silent) {
    const { si, cur, plan } = this.referenceState, arr = plan[si];
    if (!arr) return;
    const n = this.tidyN(arr);
    if (!n.a && !n.d) return;
    const next = Math.max(0, Math.min(arr.length - n.d - 1, arr.slice(0, cur).filter(step => !step.del).length));
    this.setPlan(rows => rows.filter(step => !step.del).map(step => ({ ...step, isNew: false })),
      silent ? null : '번호를 정리했습니다 · 추가 ' + n.a + ' · 삭제 ' + n.d);
    this.updateReferenceState({ cur: next, lkMsg: null }, () => this.show(false));
  }
  aiSort(arr, from) { const si = this.referenceState.si, head = arr.slice(0, from), tail = arr.slice(from); const pl = tail.filter(x => x.t === 'place').sort((a, b) => this.avgY(si, a.part) - this.avgY(si, b.part)), fs = tail.filter(x => x.t !== 'place'); const out = head.slice(); pl.forEach(p => { out.push(p); }); fs.forEach(f => { const y = this.avgY(si, f.part); let at = out.length; for (let i = from; i < out.length; i++) if (out[i].t === 'place' && this.avgY(si, out[i].part) > y + 1) { at = i; break; } out.splice(at, 0, f); }); return out; }
  target(arr, i) { for (let j = i - 1; j >= 0; j--) if (arr[j].t === 'place') return this.pr.parts[arr[j].part] ? this.pr.parts[arr[j].part].ko : ''; return ''; }
  activePositionEdit(s = this.referenceState) {
    const edit = s.positionDraft;
    return edit && !s.tm && s.tab === 'det' && !s.lk && !s.playing &&
      edit.si === s.si && edit.index === s.cur && edit.step === s.plan?.[s.si]?.[s.cur] ? edit : null;
  }
  positionEditorVals(s, step) {
    const edit = this.activePositionEdit(s);
    const canEdit = !s.tm && !!step && !step.del && !step.blank && this.lkPcs(step, s.si).length > 0;
    const saved = step?.off;
    const offset = edit?.offset === undefined ? saved : edit.offset;
    const moved = !!offset?.some(value => Math.abs(value) >= 0.001);
    const changed = !!edit && edit.offset !== undefined &&
      (offset || [0, 0, 0]).some((value, axis) => Math.abs(value - (saved?.[axis] ?? 0)) >= 0.001);
    const canSave = changed && !edit.original;
    const coords = moved ? offset.map((value, axis) => 'XYZ'[axis] + ' ' + value.toFixed(1)).join(' · ') + ' mm' : '';
    return {
      posCanEdit: canEdit, posClosed: !edit, posEditing: !!edit,
      posStatus: edit?.original ? 'STEP 원래 위치 비교 중' : moved ? (changed ? '미리보기 · ' : '수정됨 · ') + coords : 'STEP 원래 위치',
      posCanCompare: !!edit && moved, posCanReset: !!edit && moved,
      posCompareLabel: edit?.original ? '수정 위치 보기' : '원래 위치 보기',
      posSaveDisabled: !canSave, posSaveBg: canSave ? '#a84717' : '#1b2329',
      posOpen: () => {
        this.stopPlayback();
        this.lkStop();
        this.updateReferenceState({ lk: false, positionDraft: { si: s.si, index: s.cur, step } }, () => this.show(false, false));
      },
      posCompare: () => this.updateReferenceState({ positionDraft: { ...edit, original: !edit.original } }, () => this.show(false, false)),
      posReset: () => this.updateReferenceState({ positionDraft: { ...edit, original: false, offset: null } }, () => this.show(false, false)),
      posCancel: () => this.closePositionEdit(),
      posSave: () => {
        if (!canSave || this.activePositionEdit() !== edit) return;
        this.setPlan((_, plan) => {
          const row = plan[edit.si][edit.index];
          if (moved) row.off = offset;
          else delete row.off;
        }, moved ? '부품 위치 적용' : 'STEP 원래 위치로 복원', edit.index + 1, true);
      }
    };
  }
  closePositionEdit() {
    if (this.referenceState.positionDraft) this.updateReferenceState({ positionDraft: null }, () => this.show(false, false));
  }
  gzStart(axis, e) {
    const edit = this.activePositionEdit(), A = this.gzAx?.[axis];
    if (!edit || edit.original || e.button !== 0 || !A || A.ppu < 1e-4) return;
    e.stopPropagation();
    e.preventDefault();
    const pieces = this.curPieces(), scale = this.referenceState.scale || 1;
    const offset = edit.offset === undefined ? edit.step.off : edit.offset;
    const start = offset || [0, 0, 0], k = { x: 0, y: 1, z: 2 }[axis];
    const { pointerId, clientX, clientY } = e;
    let draft = null;
    this.gzDrag = axis;
    const move = ev => {
      if (ev.pointerId !== pointerId || this.activePositionEdit() !== edit) return;
      const dx = ev.clientX - clientX, dy = ev.clientY - clientY;
      draft = start.slice();
      draft[k] += (dx * A.ux + dy * A.uy) / (scale * A.ppu);
      this.applyOff(draft, pieces);
    };
    const finish = ev => {
      if (ev.pointerId !== pointerId) return;
      this.gzDrag = null;
      this.unlisten('pointermove', move);
      this.unlisten('pointerup', finish);
      this.unlisten('pointercancel', finish);
      if (!draft) return;
      if (ev.type === 'pointercancel' || this.activePositionEdit() !== edit) { this.show(false, false); return; }
      this.updateReferenceState({ positionDraft: { ...edit, offset: draft } }, () => this.show(false, false));
    };
    this.listen('pointermove', move);
    this.listen('pointerup', finish);
    this.listen('pointercancel', finish);
  }
  curPieces() { const s = this.referenceState, pr = this.pr, x = (s.plan[s.si] || [])[s.cur]; if (!x) return []; if (x.pcs) return x.pcs.map(i => pr.pieces[i]); return pr.sections[s.si].idx.filter(i => pr.pieces[i].part === x.part).map(i => pr.pieces[i]); }
  applyOff(off, pieces) { const T = window.THREE; this.E.anim = []; pieces.forEach(pc => { const p = pc.home.clone().add(new T.Vector3(off[0], off[1], off[2])); this.E.snap(pc.obj, p, pc.q); this.E.snap(pc.wireM, p, pc.q); }); }
  camDown(e) { const E = this.E, T = window.THREE; if (!E || (e.button !== 0 && e.button !== 2)) return; e.preventDefault(); const t = E.orbT, sx = e.clientX, sy = e.clientY, a0 = t.az, e0 = t.el, g0 = t.tgt.clone(), pan = e.button === 2 || e.shiftKey, sc = this.referenceState.scale || 1; E.dragging = true; this.camDrag = true;
    const cam = E.cam, r = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), u = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), wpp = 2 * t.dist * Math.tan(cam.fov * Math.PI / 360) / (this.cvRef.current.clientHeight || 1);
    const mv = ev => { const dx = (ev.clientX - sx) / sc, dy = (ev.clientY - sy) / sc; if (pan) { t.tgt.copy(g0).addScaledVector(r, -dx * wpp).addScaledVector(u, dy * wpp); } else { t.az = a0 - dx * 0.006; t.el = Math.max(0.05, Math.min(1.4, e0 + dy * 0.005)); } };
    const up = () => { E.dragging = false; this.camDrag = false; this.unlisten('pointermove', mv); this.unlisten('pointerup', up); };
    this.listen('pointermove', mv); this.listen('pointerup', up); }
  camWheel(e) { const E = this.E; if (!E) return; const t = E.orbT, z = E.sz || 600; t.dist = Math.max(this.referenceState.toolFocus ? Math.max(.25, E.cam.near * 4) : z * 0.2, Math.min(z * 8, t.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }
  libThumbs() { const T = window.THREE, pr = this.pr, keys = [...new Set(pr.pieces.map(p => p.part))]; const R = this.E.R, W = 240, Hh = 180, rt = new T.WebGLRenderTarget(W * 2, Hh * 2), px = new Uint8Array(W * Hh * 16), c2 = document.createElement('canvas'); c2.width = W; c2.height = Hh; const x2 = c2.getContext('2d'), img = x2.createImageData(W, Hh), G = new Uint8Array(256); for (let q = 0; q < 256; q++) G[q] = Math.round(255 * Math.pow(q / 255, 1 / 2.2));
    const S = new T.Scene(); S.add(new T.HemisphereLight(0xe6edf1, 0x20262b, 1.1)); const d = new T.DirectionalLight(0xffffff, 1.4); d.position.set(3, 5, 4); S.add(d); const b2 = new T.DirectionalLight(0xffb27a, 0.5); b2.position.set(-4, 2, -3); S.add(b2); const cam = new T.PerspectiveCamera(30, 4 / 3, 0.01, 100); const out = {}; let i = 0;
    const one = () => { try { one0(); } catch (er) { console.warn('libThumbs', er); window.__ltErr = String(er && er.stack || er); } }; const one0 = () => { if (i >= keys.length) { rt.dispose(); return; } const k = keys[i++], pc = pr.pieces.find(p => p.part === k); if (pc && pc.obj) { const o = pc.obj.clone(true); o.visible = true; o.position.set(0, 0, 0); o.traverse(m => { m.visible = true; }); const g = new T.Group(); g.add(o); g.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(g, true), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), r = Math.max(sz.x, sz.y, sz.z) || 1; o.position.sub(c); g.scale.setScalar(1 / r); g.rotation.set(0.35, -0.7, 0); S.add(g); S.updateMatrixWorld(true); cam.position.set(0, 0, 2.3); cam.lookAt(0, 0, 0); const prev = R.getRenderTarget(); R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(S, cam); R.readRenderTargetPixels(rt, 0, 0, W * 2, Hh * 2, px); R.setRenderTarget(prev); const W2 = W * 2; for (let yy = 0; yy < Hh; yy++) for (let xx = 0; xx < W; xx++) { const di = (yy * W + xx) * 4; let r = 0, g2 = 0, b3 = 0, al = 0; for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) { const si2 = ((Hh * 2 - 1 - (yy * 2 + oy)) * W2 + xx * 2 + ox) * 4; r += px[si2]; g2 += px[si2 + 1]; b3 += px[si2 + 2]; al += px[si2 + 3]; } img.data[di] = G[r >> 2]; img.data[di + 1] = G[g2 >> 2]; img.data[di + 2] = G[b3 >> 2]; img.data[di + 3] = al >> 2; } x2.putImageData(img, 0, 0); S.remove(g); c2.toBlob(bl => { if (bl) { out[k] = URL.createObjectURL(bl); this.updateReferenceState({ libTh: Object.assign({}, out) }); } this.delay(one, 30); }, 'image/png'); return; } this.delay(one, 30); }; one(); }
  gzLoop() { this.gzRaf = this.scheduleFrame(() => this.gzLoop()); const g = this.gzRef.current, E = this.E; if (!g || !E || !E.cam || !this.referenceState.plan) return; const edit = this.activePositionEdit(); if (!edit || edit.original) { g.style.display = 'none'; return; } const ps = this.curPieces(); if (!ps.length) { g.style.display = 'none'; return; } const T = window.THREE, b = new T.Box3(); ps.forEach(pc => b.expandByObject(pc.obj.visible ? pc.obj : pc.wireM)); if (b.isEmpty()) { g.style.display = 'none'; return; } const cv = this.cvRef.current, W = cv.clientWidth, Hh = cv.clientHeight, cw = b.getCenter(new T.Vector3()), L = Math.max(E.sz * 0.08, 1), sp = v => { const p = v.clone().project(E.cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * Hh]; }, c0 = sp(cw);
    g.style.display = 'block'; g.style.transform = 'translate(' + c0[0] + 'px,' + c0[1] + 'px)'; this.gzAx = this.gzAx || {};
    [['x', new T.Vector3(1, 0, 0)], ['y', new T.Vector3(0, 1, 0)], ['z', new T.Vector3(0, 0, 1)]].forEach(([ax, d]) => { const p = sp(cw.clone().addScaledVector(d, L)), vx = p[0] - c0[0], vy = p[1] - c0[1], len = Math.hypot(vx, vy) || 1, ux = vx / len, uy = vy / len; this.gzAx[ax] = { ux, uy, ppu: len / L }; const el = g.querySelector('[data-ax="' + ax + '"]'); if (!el) return; const ang = Math.atan2(uy, ux); el.style.transform = 'translateY(-10px) rotate(' + ang + 'rad)'; el.style.opacity = len < 8 ? '0.25' : (this.gzDrag && this.gzDrag !== ax ? '0.3' : '1'); const lb = el.querySelector('[data-lab]'); if (lb) lb.style.transform = 'rotate(' + (-ang) + 'rad)'; }); }
  aiGo() { const q = (this.referenceState.aiQ || '').trim(); if (!q) return; const s = this.referenceState, k = s.cur, n = (s.plan[s.si] || []).length; this.updateReferenceState({ aiQ: '', aiOpen: false });
    if (/앞|위로|먼저/.test(q) && k > 0) { this.move(k, k - 1); this.say('AI: 단계 ' + String(k + 1).padStart(2, '0') + '를 한 칸 앞으로 옮겼습니다'); }
    else if (/뒤|아래로|나중/.test(q) && k < n - 1) { this.move(k, k + 1); this.say('AI: 단계 ' + String(k + 1).padStart(2, '0') + '를 한 칸 뒤로 옮겼습니다'); }
    else if (/정리|다시/.test(q)) { this.setPlan(a => this.aiSort(a, 0), 'AI가 이 구간 순서를 다시 정리했습니다'); }
    else this.say('AI: "' + q + '" 요청은 시안에서 아직 처리하지 않습니다'); }
  onResize = () => this.updateReferenceState({ scale: Math.min(window.innerWidth / 1920, window.innerHeight / 1080) }, () => this.E && this.E.resize());
  js(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  toPage(sc) { this.stopPlayback(); if (this.referenceState.plan) this.autoSave(); this.props.onNavigate?.(sc); }
  componentDidUpdate(prevProps) {
    if (prevProps.tools !== this.props.tools && this.props.tools && this.E) this.openToolReview();
  }
  mountReference() {
    this.listen('resize', this.onResize);
    if (!this.cvRef.current) return;
    const E = this.E = new window.FlowEngine(this.cvRef.current, this.ovRef.current); E.frontAz = 0;
    E.M.edge.visible = false;
    const project = this.props.session.project;
    if (!project) return;
    this.pr = cloneFlowProject(project);
    if (project.key === 'shaper-reference') { window.ShaperHQ.apply(E); window.ShaperTex.patch(E, this.pr); }
    this.secOvApply();
    E.makeBuild(this.pr, solid => this.buildStepEdges(solid));
    // Fast Refresh can keep an earlier version of the public renderer loaded.
    if (E.makeBuild.length < 2) {
      for (const piece of this.pr.pieces) {
        const edges = this.buildStepEdges(piece.obj);
        piece.wireM.traverse(object => object.geometry?.dispose());
        piece.wireM.clear().add(...edges.children.slice());
      }
    }
    E.hooks = []; E.anim = [];
    this.props.session.readSteps = () => this.referenceState.plan;
    let sv = null; try { sv = JSON.parse(localStorage.getItem(this.flowKey('dx7_link_plan_all')) || 'null'); if (!Array.isArray(sv)) { const s0 = JSON.parse(localStorage.getItem(this.flowKey('dx7_link_plan')) || 'null'); sv = Array.isArray(s0) && s0.length ? [s0] : null; } } catch (e) {} const p0 = this.keepPlan(sv); this.updateReferenceState({ plan: p0, loading: false, lk: false, lkBad: -1, lkImp: {} }, () => { this._lkPlan = null; if (sv) this.delay(() => this.say('자동 저장된 순서를 불러왔습니다'), 3400); E.resize(); this.show(true); this.gzLoop(); this.lkLoop(); this.delay(() => this.libThumbs(), 600); if (this.props.tools) this.delay(() => this.openToolReview(), 200); this.say('STEP 부품 ' + this.pr.pieces.length + '개로 조립 순서 초안을 만들었습니다'); });
    this.listen('keydown', this._kd = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); return; } const tg = e.target && e.target.tagName; if (tg === 'TEXTAREA' || tg === 'INPUT') return; if (e.key === 'l' || e.key === 'L') this.updateReferenceState(s => ({ listOff: !s.listOff }), () => this.delay(() => { this.E && this.E.resize(); this.show(false); }, 60)); if (e.key === 'Delete' && this.referenceState.cur != null) this.lkNodeDel(this.referenceState.cur); if (e.key === 'Escape') { this.closePositionEdit(); this.stopPlayback(); this.updateReferenceState({ msel: [], lkMenu: null }); } });
    this.listen('pointerdown', e => {
      if (this.referenceState.lkMenu != null && !e.target.closest?.('[data-lk], [data-step-context-menu]')) {
        this.updateReferenceState({ lkMenu: null });
      }
    }, true);
  }
  unmountReference() {
    this.cancelSequenceAdvice();
    this.clearToolPreview();
    this._tmOut?.dispose();
    this.props.session.readSteps = undefined;
    if (this.referenceState.plan) {
      this.props.session.plan = this.referenceState.plan;
      this.rememberStepActions(this.referenceState.plan);
      try { localStorage.setItem(this.flowKey('dx7_link_plan_all'), JSON.stringify(this.referenceState.plan)); } catch {}
    }
 cancelAnimationFrame(this.gzRaf); cancelAnimationFrame(this.lkRaf); this.lkStop(); this.unlisten('keydown', this._kd); this.unlisten('resize', this.onResize); clearInterval(this.pl); try { this.E && this.E.destroy(); } catch (e) {} }
  lkB(i) { const T = window.THREE, pc = this.pr.pieces[i]; this.bx = this.bx || {}; if (!this.bx[i]) { pc.obj.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(pc.obj); bb.translate(pc.home.clone().sub(pc.obj.position)); this.bx[i] = bb; } return this.bx[i]; }
  lkPcs(x, si = this.referenceState.si) { const pr = this.pr; return x.pcs || pr.sections[si].idx.filter(i => pr.pieces[i].part === x.part); }
  blankPart() { if (this.pr && !this.pr.parts.__blank) this.pr.parts.__blank = { ko: '빈 단계', pn: '부품을 고르세요', std: true }; }
  lkKo(x) { const p = this.pr.parts[x.part]; return (x.sw && x.sw.ko) || (p && p.ko) || x.part; }
  lkTol() { return Math.max(2, ((this.E && this.E.sz) || 500) * 0.006); }
  stepOffsets(arr, si) {
    const offsets = new Map();
    for (const step of arr) {
      if (step.del || step.blank || !step.off) continue;
      for (const i of this.lkPcs(step, si)) {
        if (!offsets.has(i)) offsets.set(i, step.off);
      }
    }
    return offsets;
  }
  hashContactReview(value) {
    const text = JSON.stringify(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(36);
  }
  legacyContactReviewKey(arr, si) {
    const rows = arr.filter(step => !step.del).map(step => [step.t, step.part, step.pcs, step.off, step.sw?.ko]);
    return this.hashContactReview([si, rows]);
  }
  validate(arr, si = this.referenceState.si) {
    const T = window.THREE, tol = this.lkTol(), sec = this.pr.sections[si], placed = [];
    const floor = sec.idx.reduce((min, i) => Math.min(min, this.lkB(i).min.y), Infinity);
    const geometry = arr.some(step => step.t === 'fasten' && !step.del) ? this.getFlowContactGeometry() : null;
    const offsets = this.stepOffsets(arr, si), shifted = new Map(), earlier = new Set(), locations = new Map();
    for (const [i, off] of offsets) {
      shifted.set(i, this.lkB(i).clone().translate(new T.Vector3(...off)));
    }
    if (geometry) this.pr.sections.forEach((section, groupIndex) => {
      if (section.final && groupIndex !== si) return;
      const rows = groupIndex === si ? arr : this.referenceState.plan?.[groupIndex] || [];
      if (groupIndex !== si) for (const [i, off] of this.stepOffsets(rows, groupIndex)) {
        if (!offsets.has(i)) offsets.set(i, off);
      }
      rows.forEach((step, k) => {
        if (step.t !== 'place' || step.del || step.blank) return;
        for (const i of this.lkPcs(step, groupIndex)) {
          if (!locations.has(i)) locations.set(i, { si: groupIndex, k, rows });
          if (groupIndex < si) earlier.add(i);
        }
      });
    });
    let group = null, legacyKey;
    const started = new Set();
    return arr.map(step => {
      if (step.del) return { ok: true, msg: '', del: 1 };
      if (step.blank) return { ok: false, msg: '비어 있는 단계입니다. 넣을 부품을 고르거나 지우세요.' };
      group = step.sub ?? group;
      const indices = this.lkPcs(step, si), boxes = indices.map(i => shifted.get(i) ?? this.lkB(i));
      let ok, review, reviewed = false, msg = '';
      if (step.t === 'fasten') {
        const fits = indices.map(i => geometry?.evidence(i, offsets) || { targets: [], candidates: [] });
        const identified = step.sw ? [] : fits.flatMap(fit => fit.targets.map(target => target.index));
        const outside = i => (locations.get(i)?.si ?? si) > si;
        const waiting = identified.find(i => !earlier.has(i) && !outside(i));
        const crossSection = identified.some(i => outside(i) && !earlier.has(i));
        const uncertain = step.sw ? indices.length : fits.filter(fit => !fit.targets.length || fit.targets.some(target => outside(target.index) && !earlier.has(target.index))).length;
        ok = waiting == null && (identified.length > 0 || earlier.size > 0);
        if (waiting != null) {
          const target = this.pr.parts[this.pr.pieces[waiting].part].ko, at = locations.get(waiting);
          const position = at && (at.si === si ? '' : '구간 ' + this.pr.sections[at.si].no + ' · ') + this.lbl(at.rows, at.k) + '번';
          msg = position ? '체결 대상 ' + target + '은(는) ' + position + '에 배치됩니다. 체결 전에 이 부품을 놓으세요.'
            : '체결 대상 ' + target + '의 배치 단계가 없습니다. 체결 전에 배치 단계를 추가하세요.';
        } else if (!ok) msg = '먼저 놓인 부품이 0개 확인됐습니다. 체결할 부품을 먼저 배치하세요.';
        else if (uncertain || !indices.length) {
          const candidates = [...new Set(fits.flatMap(fit => fit.candidates))].sort((a, b) => a - b);
          const reviewKey = 'v2-' + this.hashContactReview([si, step.part, indices.map(i => [i, offsets.get(i)]), step.sw?.ko,
            [...earlier].sort((a, b) => a - b), candidates.map(i => [i, offsets.get(i)])]);
          if (typeof step.contactReview === 'string' && !step.contactReview.startsWith('v2-')) legacyKey ??= this.legacyContactReviewKey(arr, si);
          reviewed = !!step.contactReview && (step.contactReview === reviewKey || step.contactReview === legacyKey);
          if (!reviewed) {
            review = reviewKey;
            const partial = indices.length > 1 ? indices.length + '개 중 ' + uncertain + '개는 ' : '';
            msg = crossSection ? '뒤 구간에 있는 부품도 체결 후보로 탐색됐습니다. 도면에서 어느 구간에서 체결하는지 확인하세요.'
              : partial + 'STEP 형상에서 체결 상대를 확정하기 어렵습니다.'
                + (candidates.length ? ' 주변 후보 ' + candidates.length + '개를 도면과 대조하세요.' : ' 도면에서 고정 위치를 확인하세요.');
          }
        }
      } else {
        const siblings = boxes.map(box => box.clone().expandByScalar(tol * 0.5));
        ok = !started.has(group) || boxes.every((box, i) => {
          const reach = box.clone().expandByScalar(tol);
          return box.min.y <= floor + tol || placed.some(prior => prior.bounds.intersectsBox(reach)) ||
            siblings.some((other, j) => j !== i && other.intersectsBox(box));
        });
        started.add(group);
        if (!ok) msg = this.lkKo(step) + '을(를) 받치거나 붙을 부품이 아직 없습니다.';
        for (const i of indices) earlier.add(i);
      }
      for (const box of boxes) placed.push({ part: step.part, type: step.t, bounds: box.clone().expandByScalar(tol * 0.5) });
      return { ok, msg, review, reviewed };
    });
  }
  lkFixFor(arr, k) {
    if (arr[k].blank) return -1;
    const groups = this.lkSubs(arr), before = this.validate(arr);
    for (let j = k + 1; j < arr.length && groups[j] === groups[k]; j++) {
      if (arr[j].del || arr[j].blank) continue;
      const trial = arr.slice();
      trial.splice(j, 0, trial.splice(k, 1)[0]);
      const checks = this.validate(trial);
      if (checks[j].ok && !checks[j].review && checks.slice(k, j).every((check, i) => check.ok || !before[k + i + 1].ok)) return j;
    }
    return -1;
  }
  stepFixHint(step) {
    if (step.blank) return '부품 라이브러리에서 부품을 고르거나 이 단계를 삭제하세요.';
    if (step.t === 'fasten') return '도면에서 체결 대상을 확인하고, 그 부품을 이 체결 단계보다 앞에 배치하세요.';
    return '왼쪽 목록에서 이 부품을 받치거나 연결할 부품을 먼저 놓도록 순서를 바꾸세요. 순서가 맞으면 도면과 위치를 대조하세요.';
  }
  showStepIssue(arr, k, issue) {
    if (!this.activeSequenceReview() || !issue || (issue.ok && !issue.review)) return;
    const s = this.referenceState, step = arr[k], fix = issue.review ? -1 : this.lkFixFor(arr, k);
    const sub = this.lkSubs(arr)[k];
    const hint = issue.review ? '도면에서 체결 대상과 조립 순서를 확인한 뒤 현재 순서를 유지할 수 있습니다.'
      : fix < 0 ? this.stepFixHint(step) : this.lbl(arr, fix) + '번 ' + this.lkKo(arr[fix]) + ' 뒤로 옮기는 순서를 검토해 보세요.';
    this.pick(s.si, k, false);
    this.updateReferenceState({
      tab: 'det', lk: false, lkBad: issue.review ? -1 : k, lkMenu: null,
      open: { ...s.open, [s.si]: true },
      subCl: { ...s.subCl, [s.si + '-' + sub]: false },
      lkMsg: {
        c: issue.review ? '#ffc857' : '#ff6b77', bad: !issue.review, checked: true, fix, review: issue.review, index: k,
        t: this.lbl(arr, k) + '번 · ' + this.lkKo(step),
        d: issue.msg, hint, fixT: '추천 순서 적용'
      }
    });
  }
  acceptContactReview(index, review) {
    const snapshot = this.activeSequenceReview();
    if (!review || snapshot?.checks[index]?.review !== review) return;
    this.recordContactReviews(snapshot, [{ index, key: review }]);
  }
  acceptContactReviews() {
    const snapshot = this.activeSequenceReview();
    if (!snapshot || !this.referenceState.reviewBatchOpen) return;
    const pending = snapshot.checks.flatMap((check, index) => check.review ? [{ index, key: check.review }] : []);
    if (pending.length) this.recordContactReviews(snapshot, pending);
  }
  recordContactReviews(snapshot, pending) {
    const reviewed = new Set(pending.map(({ index }) => index));
    this.setPlan(plan => {
      for (const { index, key } of pending) plan[index].contactReview = key;
    }, '도면 확인 ' + pending.length + '건을 반영했습니다', undefined, false, true);
    const rows = this.referenceState.plan[snapshot.si];
    const checks = snapshot.checks.map((check, index) => reviewed.has(index) ? { ...check, review: undefined, reviewed: true } : check);
    this.updateReferenceState({ reviewSnapshot: { ...snapshot, rows, checks }, reviewBatchOpen: false });
    clearTimeout(this._as);
    this.autoSave();
  }
  cancelSequenceAdvice() {
    this._sequenceAdviceJob?.abort();
    this._sequenceAdviceJob = null;
  }
  async requestSequenceAdvice(snapshot) {
    this.cancelSequenceAdvice();
    const job = this._sequenceAdviceJob = new AbortController();
    const active = snapshot.rows.flatMap((row, index) => row.del ? [] : [{
      index, number: this.lbl(snapshot.rows, index), part: this.lkKo(row).slice(0, 120),
      operation: row.t === 'fasten' ? '체결' : '놓기', finding: (snapshot.checks[index]?.msg || '').slice(0, 260)
    }]);
    const rows = active.length <= 96 ? active : [...active.filter(row => row.finding), ...active.filter(row => !row.finding)]
      .slice(0, 96).sort((a, b) => a.index - b.index);
    this.updateReferenceState({ sequenceAdvice: { status: 'pending', items: [], count: rows.length, total: active.length } });
    let result;
    try {
      const response = await fetch('/api/drawing/assembly-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }), signal: job.signal
      });
      if (response.ok) result = await response.json();
    } catch {}
    if (this._sequenceAdviceJob !== job || !this.activeSequenceReview()) return;
    this._sequenceAdviceJob = null;
    const items = result?.available && Array.isArray(result.items) ? result.items : [];
    this.updateReferenceState({ sequenceAdvice: { status: result?.available ? 'ready' : 'unavailable', items, count: rows.length, total: active.length } });
  }
  activeSequenceReview(s = this.referenceState) {
    const snapshot = s.reviewSnapshot;
    return s.sequenceReview && snapshot?.si === s.si && snapshot.rows === s.plan?.[s.si] ? snapshot : null;
  }
  discardSequenceReview() {
    if (!this.referenceState.sequenceReview) return;
    this.cancelSequenceAdvice();
    this.updateReferenceState({ sequenceReview: false, reviewSnapshot: null, reviewBatchOpen: false, sequenceAdvice: null, lkMenu: null, lkMsg: null, lkBad: -1 });
  }
  openSequenceReview(arr) {
    const s = this.referenceState;
    if (!arr.some(step => !step.del) || s.confirmed) return;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 검증하세요'); return; }
    this.stopPlayback();
    const checks = this.validate(arr), snapshot = { si: s.si, rows: arr, checks };
    this.updateReferenceState({ sequenceReview: true, reviewSnapshot: snapshot, tab: 'det', toolFocus: false, swOpen: false, lk: false, lkMenu: null, lkMsg: null, lkBad: -1 }, () => this.show(true, false));
    void this.requestSequenceAdvice(snapshot);
    const issue = checks.findIndex(check => !check.ok);
    const first = issue >= 0 ? issue : checks.findIndex(check => check.review);
    if (first >= 0) this.showStepIssue(arr, first, checks[first]);
  }
  closeSequenceReview() {
    if (!this.referenceState.sequenceReview) return;
    this.stopPlayback();
    this.discardSequenceReview();
    this.show(false, false);
  }
  confirmSequence() {
    const s = this.referenceState;
    const snapshot = this.activeSequenceReview(s);
    if (!snapshot || s.confirmed) return;
    const { rows: arr, checks } = snapshot;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 검증하세요'); return; }
    this.stopPlayback();
    const opinions = checks.filter(check => !check.ok || check.review).length + (s.sequenceAdvice?.items?.length ?? 0);
    this.cancelSequenceAdvice();
    const rows = arr.filter(step => !step.del).map(step => ({ ...step, isNew: false }));
    const plan = s.plan.slice();
    plan[s.si] = rows;
    const cur = Math.max(0, arr.slice(0, s.cur + 1).filter(step => !step.del).length - 1);
    const reviewed = checks.filter(check => check.reviewed).length;
    const detail = opinions ? '검토 의견 ' + opinions + '건 · 관리자가 현재 순서를 확정했습니다'
      : reviewed ? '도면 확인 ' + reviewed + '건을 반영했습니다 · ' + rows.length + '단계'
      : rows.length + '단계가 확정되었습니다 · 교육장에 반영됩니다';
    this.updateReferenceState({
      plan, cur, confirmed: true, sequenceReview: false, reviewSnapshot: null, reviewBatchOpen: false, sequenceAdvice: null, lk: false, lkBad: -1,
      lkMsg: { c: '#3fe0c5', t: opinions ? '관리자가 현재 순서를 확정했습니다' : '형상 검토 완료 · 이 순서로 확정했습니다', d: detail }
    }, () => { this.show(false); this.autoSave(); });
  }
  stopPlayback() {
    if (this.pl == null) return;
    clearInterval(this.pl);
    this.pl = null;
    this.updateReferenceState({ playing: false });
  }
  togglePlayback() {
    if (this.pl != null) { this.stopPlayback(); return; }
    const { plan, si, cur, tm } = this.referenceState;
    const steps = (plan?.[si] || []).flatMap((step, i) => step.del || step.blank || (tm && step.t !== 'fasten') ? [] : [i]);
    if (!steps.length) return;
    let position = steps.indexOf(cur);
    if (position < 0 || position === steps.length - 1) position = 0;
    this.closePositionEdit();
    this.pick(si, steps[position], false, true);
    if (steps.length === 1) return;
    this.pl = this.repeat(() => {
      position++;
      this.pick(si, steps[position], false, true);
      if (position === steps.length - 1) this.stopPlayback();
    }, 1100);
    this.updateReferenceState({ playing: true });
  }
  lkTools(arr) { let last = null, n = 0; arr.forEach(x => { const t = x.t === 'fasten' ? (x.tool || (this.pr.parts[x.part] || {}).tool) : null; if (t) { if (last && t !== last) n++; last = t; } }); return n; }
  lkSubs(arr) { let carry = null; return arr.map(x => { const sb = x.sub != null ? x.sub : carry; carry = sb; return sb; }); }
  lkSubName(sb) { const sec = this.pr.sections[this.referenceState.si]; return sec.sub && sb != null && sec.sub[sb] ? sec.sub[sb] : '구간 ' + sec.no; }
  lkNodeAdd(k, after) { const arr = this.referenceState.plan[this.referenceState.si], sb = this.lkSubs(arr)[k], at = after ? k + 1 : k; this.blankPart(); this.setPlan(a => { a.splice(at, 0, Object.assign({ t: 'place', part: '__blank', q: 0, g: '넣을 부품을 오른쪽 라이브러리에서 고르세요.', isNew: true, blank: true }, sb !== undefined ? { sub: sb } : {})); return a; }, this.lbl(arr, k) + '번 ' + (after ? '뒤' : '앞') + '에 빈 단계 추가'); this._insAt = { at, sub: sb, fill: true }; this.updateReferenceState({ cur: at, confirmed: false }); this.updateReferenceState({ tab: 'lib', lkMenu: null, lkMsg: { c: '#f37321', t: String(k + 1).padStart(2, '0') + '번 ' + (after ? '뒤' : '앞') + '에 넣을 부품을 고르세요', d: '오른쪽 라이브러리에서 부품을 누르면 바로 들어갑니다' } }); }
  lkNodeDel(k) { const s = this.referenceState, arr = s.plan[s.si], set = (s.msel && s.msel.length > 1 && s.msel.includes(k) ? s.msel : [k]).slice().sort((x, y) => y - x); if (arr.length - set.length < 1) return; const nm = set.length > 1 ? set.length + '개 단계' : String(k + 1).padStart(2, '0') + '번 ' + this.lkKo(arr[k]); if (set.length === 1) { this.updateReferenceState({ lkMenu: null, lkMsg: null, msel: [], confirmed: false }); this.markDel(k); return; } this.setPlan(a => { set.forEach(i => { a[i] = Object.assign({}, a[i], { del: true }); }); return a; }, nm + ' 삭제 · 줄을 누르면 되살아납니다'); const at = k; this.updateReferenceState({ lkMenu: null, lkMsg: null, msel: [], cur: at, confirmed: false }, () => { this.show(false); this.delay(() => this.lkLocal(at), 80); }); } lkLocal(k) {
    this.updateReferenceState({ lkFlash: { k, t: performance.now() } });
  }
  stepLineMaterials() {
    if (!this.stepLines) {
      const line = (color, opacity) => new window.THREE.LineBasicMaterial({ color, opacity, transparent: true, depthWrite: false });
      this.stepLines = {
        darkEdge: line(0x252d35, 0.95), lightEdge: line(0x9daebc, 0.8),
        wireEdge: line(0x8294a3, 0.42), hotEdge: line(0xff9f55, 1),
        ghost: line(0x647583, 0.25), preview: line(0x9aabb9, 0.42)
      };
    }
    return this.stepLines;
  }
  buildStepEdges(solid) {
    const T = window.THREE, edges = new T.Group();
    const materials = this.stepLineMaterials();
    solid.updateMatrixWorld(true);
    const inverse = new T.Matrix4().copy(solid.matrixWorld).invert();
    solid.traverse(mesh => {
      if (!mesh.isMesh) return;
      const surface = mesh.material, color = surface.color;
      surface.polygonOffset = true;
      surface.polygonOffsetFactor = 1;
      surface.polygonOffsetUnits = 2;
      const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
      const base = luminance < 0.16 ? materials.lightEdge : materials.darkEdge;
      const { geometry, edgeVertices } = createStepWireGeometry(T, mesh.geometry);
      const line = new T.LineSegments(geometry, base);
      line.userData.solidEdge = base;
      line.userData.edgeVertices = edgeVertices;
      line.renderOrder = 2;
      line.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
      edges.add(line);
    });
    return edges;
  }
  paintStepEdges(piece, color, wire = false) {
    for (const line of piece.wireM.children) {
      line.material = color || line.userData.solidEdge;
      line.geometry.setDrawRange(0, wire ? Infinity : line.userData.edgeVertices);
    }
  }
  lkHi3d(list) {
    const key = list.join(',');
    if (key === this._hiKey) return;
    for (const i of this._hiList || []) {
      const piece = this.pr.pieces[i];
      this.paintStepEdges(piece, piece.stepEdgeStyle);
    }
    for (const i of list) this.paintStepEdges(this.pr.pieces[i], this.stepLines.hotEdge);
    this._hiList = list;
    this._hiKey = key;
  }
  lkKey(x) { return x.part + '|' + (x.pcs || []).join(','); }
  lkToggle() { const on = !this.referenceState.lk; this.lkStop(); const n = (this.referenceState.plan[this.referenceState.si] || []).length; this.updateReferenceState({ lk: on, lkFocusOn: false, lkMenu: null, lkMsg: null, lkLit: on ? n - 1 : -1, lkBad: -1, lkImp: {}, cur: on ? n - 1 : this.referenceState.cur }, () => { this.show(on); this._lkPlan = null; }); }
  lkSecM(subs, k) { const u = []; subs.forEach(x => { if (!u.includes(x)) u.push(x); }); const n = subs.length, t = n > 1 ? Math.min(1, Math.max(0, k / (n - 1))) : 1, A = [150, 240, 224], B = [24, 150, 130]; return 'rgb(' + A.map((v, j) => Math.round(v + (B[j] - v) * t)).join(',') + ')'; }
  lkStop() { clearInterval(this.lkIv); this.lkIv = null; }
  lkLink(a, b2) {
    const to = b2 > a ? a + 1 : a;
    if (to === b2) return;
    this.move(b2, to);
    this.lkLocal(to);
  }
  lkBuild() { const root = this.lkRef.current; if (!root) return; root.innerHTML = ''; const arr = this.referenceState.plan[this.referenceState.si] || [], NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;overflow:visible'); root.appendChild(svg);
    const path = document.createElementNS(NS, 'g'), lead = document.createElementNS(NS, 'g'); lead.setAttribute('data-step-leaders', ''); svg.appendChild(lead); path.setAttribute('data-step-sequence-links', ''); svg.appendChild(path); const tmp = document.createElementNS(NS, 'line'); tmp.setAttribute('stroke', '#f37321'); tmp.setAttribute('stroke-width', '2'); tmp.setAttribute('stroke-dasharray', '5 5'); tmp.style.display = 'none'; svg.appendChild(tmp);
    const els = arr.map((x, k) => { const seg = document.createElementNS(NS, 'line'); seg.setAttribute('stroke-width', '2'); path.appendChild(seg); const ld = document.createElementNS(NS, 'line'); ld.setAttribute('stroke-width', '1'); lead.appendChild(ld); const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '3'); lead.appendChild(dot);
      const fz = x.t === 'fasten', c = document.createElement('div');
      c.setAttribute('data-lk', k);
      if (fz) {
        c.dataset.stepKind = 'fasten';
        c.insertAdjacentHTML('afterbegin', "<svg data-link-icon=\"vertical\" aria-hidden=\"true\" width=\"16\" height=\"16\" viewBox=\"-1 -1 26 26\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" style=\"display:block;flex:none\"><g transform=\"rotate(-45 12 12)\"><path d=\"M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1\"></path><path d=\"M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1\"></path></g></svg>");
        c.firstElementChild.style.color = 'var(--fasten-link-color, #ffb27a)';
      }
      const tx = document.createElement('span');
      tx.textContent = this.lbl(this.referenceState.plan[this.referenceState.si], k);
      tx.style.pointerEvents = 'none';
      c.appendChild(tx);
      c.style.cssText = "position:absolute;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;display:flex;align-items:center;justify-content:center;font:700 12px/1 var(--font-mono),var(--font-mono),'JetBrains Mono',monospace;pointer-events:auto;cursor:grab;transition:background .15s,box-shadow .15s,color .15s;user-select:none";
      c.style.borderRadius = fz ? '8px' : '50%';
      if (fz) {
        c.style.flexDirection = 'column';
        c.style.gap = '1px';
        tx.style.fontSize = '10px';
      }
      const lab = document.createElement('div'); lab.textContent = this.lkKo(x) + ' ×' + (x.q || 1); lab.setAttribute('data-step-label', k); c.title = lab.textContent + ' · 우클릭하여 단계 편집'; lab.style.cssText = "position:absolute;left:0;top:0;padding:5px 9px;border-radius:4px;background:rgba(10,13,16,.9);color:#ffffff;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;pointer-events:none;display:none";
      c.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        if (this.lkDrag) return;
        const { si, cur } = this.referenceState;
        if (cur !== k) this.pick(si, k, false);
        else this.stopPlayback();
        this.updateReferenceState({ lkMenu: k });
      });
      c.addEventListener('pointerenter', () => { this.lkHov = k; }); c.addEventListener('pointerleave', () => { if (this.lkHov === k) this.lkHov = null; });
      c.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (e.button !== 0) return;
        e.preventDefault();
        if (this.referenceState.lkMenu != null) this.updateReferenceState({ lkMenu: null });
        if (this.referenceState.sequenceReview) { this.pick(this.referenceState.si, k, false); return; }
        this.stopPlayback(); const r = root.getBoundingClientRect(), zk = (r.width / (root.offsetWidth || r.width)) || 1, sx = e.clientX, sy = e.clientY, subs = this.lkSubs(this.referenceState.plan[this.referenceState.si]); if (this.referenceState.lk && (!this.referenceState.lkFocusOn || this.referenceState.lkFocus !== subs[k])) { let last = 0; subs.forEach((v, i) => { if (v === subs[k]) last = i; }); this.updateReferenceState({ lkFocus: subs[k], lkFocusOn: true, cur: last }, () => this.show(false)); } this.lkDrag = { from: k, x: (e.clientX - r.left) / zk, y: (e.clientY - r.top) / zk, sx, sy }; const mv = ev => { const D = this.lkDrag; if (!D) return; D.x = (ev.clientX - r.left) / zk; D.y = (ev.clientY - r.top) / zk; if (!D.moved && Math.hypot(ev.clientX - D.sx, ev.clientY - D.sy) < 6) return; if (!D.moved) { D.moved = true; this.updateReferenceState({ lkMenu: null }); } const SL = this._lkSlots || {}, st = this.referenceState, arr = st.plan[st.si]; let best = null, bd = Infinity; Object.keys(SL).forEach(k => { const c = SL[k], dd = Math.hypot(c[0] - D.x, c[1] - D.y); if (dd < bd) { bd = dd; best = +k; } }); const SLx = SL[D.from] ? SL[D.from][0] : D.x; const dest = best != null && Math.abs(D.x - SLx) < 200 ? best : null; if (dest === D.dest) return; D.dest = dest; if (dest == null || dest === D.from) { this._pv = null; this.updateReferenceState({ drag: D.from, over: null }, () => this.show(false)); return; } const a = arr.slice(), m = a.splice(D.from, 1)[0]; a.splice(dest, 0, m); this._pv = { si: st.si, a, k: dest }; this.updateReferenceState({ drag: D.from, over: dest }, () => this.show(false)); }, up = ev => { const hadPv = !!this._pv; this._pv = null; this.updateReferenceState({ drag: null, over: null }); if (hadPv) this.show(false); this.unlisten('pointermove', mv); this.unlisten('pointerup', up); const el = document.elementFromPoint(ev.clientX, ev.clientY), t = el && el.closest && el.closest('[data-lk]'), from = this.lkDrag.from, moved = Math.hypot(ev.clientX - this.lkDrag.sx, ev.clientY - this.lkDrag.sy) > 6; this._lkDest = this.lkDrag.dest; this.lkDrag = null;
        if (!moved) { const st = this.referenceState; if (ev.shiftKey) { const ms = (st.msel && st.msel.length ? st.msel : [st.cur]).slice(), q = ms.indexOf(from); if (q >= 0) ms.splice(q, 1); else ms.push(from); this.updateReferenceState({ msel: ms }); this.say(ms.length + '개 선택 · 삭제하거나 끌어서 한꺼번에 옮깁니다'); return; } if (st.msel && st.msel.length) this.updateReferenceState({ msel: [] }); if (!st.lk && from !== st.cur) { this.updateReferenceState({ lkMenu: null, lkFocusOn: false }); this.pick(st.si, from, false); return; } return; }
        const dest = this._lkDest; this._lkDest = null; const ms = (this.referenceState.msel || []).slice().sort((x, y) => x - y); if (dest != null && ms.length > 1 && ms.includes(from)) { const nm = ms.length + '개 단계 이동'; this.setPlan(a => { const items = ms.map(i => a[i]); for (let i = ms.length - 1; i >= 0; i--) a.splice(ms[i], 1); const before = ms.filter(i => i < dest).length, at = Math.max(0, Math.min(a.length, dest - before + (dest > from ? 1 : 0))); a.splice(at, 0, ...items); return a; }, nm); this.updateReferenceState({ msel: [] }, () => { this.show(false); this.delay(() => this.lkLocal(this.referenceState.cur), 80); }); } else if (dest != null && dest !== from) this.lkLink(dest > from ? dest : dest - 1, from); else if (dest == null && t) { const to = +t.getAttribute('data-lk'), sb = this.lkSubs(this.referenceState.plan[this.referenceState.si]); if (to !== from && sb[to] !== sb[from]) this.updateReferenceState({ lkMsg: { c: '#ffc857', t: '같은 묶음 안에서만 이을 수 있습니다', d: this.lkSubName(sb[from]) + ' 안의 번호에 놓으세요' } }); } }; this.listen('pointermove', mv); this.listen('pointerup', up); });
      root.appendChild(lab); root.appendChild(c); return { c, lab, seg, ld, dot }; });
    const ghost = document.createElement('div'); ghost.style.cssText = 'position:absolute;left:-23px;top:-23px;width:46px;height:46px;border-radius:50%;display:none;align-items:center;justify-content:center;pointer-events:none;box-shadow:inset 0 0 0 2px rgba(243,115,33,.9),0 0 18px rgba(243,115,33,.45);background:rgba(243,115,33,.14);font:700 11px/1 JetBrains Mono,monospace;color:#f37321;transition:transform .22s cubic-bezier(.2,.9,.25,1.25),opacity .18s ease;opacity:0;z-index:4'; ghost.textContent = '+'; root.appendChild(ghost); const menu = document.createElement('div'); menu.setAttribute('data-step-context-menu', ''); menu._ghost = ghost; menu.style.cssText = 'position:absolute;left:0;top:0;display:none;gap:4px;padding:6px;border-radius:10px;background:rgba(13,17,20,.96);box-shadow:inset 0 0 0 1px rgba(243,115,33,.6),0 12px 28px rgba(0,0,0,.5);pointer-events:auto;z-index:3';
    [['앞에 추가', () => this.lkNodeAdd(this.referenceState.lkMenu ?? this.referenceState.cur, false)], ['뒤에 추가', () => this.lkNodeAdd(this.referenceState.lkMenu ?? this.referenceState.cur, true)], ['삭제', () => this.lkNodeDel(this.referenceState.lkMenu ?? this.referenceState.cur)]].forEach(([t, f], q) => { const bt = document.createElement('div'); bt.textContent = t; bt.style.cssText = 'padding:8px 12px;border-radius:6px;font-size:13px;white-space:nowrap;cursor:pointer;color:' + (q === 2 ? '#ff6b77' : q === 3 ? '#8f9aa1' : '#e8ecef'); bt.addEventListener('pointerenter', () => { bt.style.background = '#1a2228'; }); bt.addEventListener('pointerleave', () => { bt.style.background = 'transparent'; }); bt.addEventListener('pointerdown', e => e.stopPropagation()); bt.addEventListener('click', e => { e.stopPropagation(); f(); }); menu.appendChild(bt); }); root.appendChild(menu);
    this.lkEls = { els, tmp, svg, menu }; this._lkPlan = this.referenceState.plan; this._lkSi = this.referenceState.si; }
  lkLeaderPoint(step, future, s, cam, width, height) {
    if (step.del || step.blank || (future && !(s.tm ? s.ghost : s.showFuture))) return null;
    const T = window.THREE, bounds = new T.Box3(), part = new T.Box3(), offset = new T.Vector3();
    for (const i of this.lkPcs(step)) {
      const piece = this.pr.pieces[i];
      const visible = piece.obj.visible ? piece.obj : piece.wireM.visible ? piece.wireM : null;
      if (visible) bounds.union(part.copy(this.lkB(i)).translate(offset.subVectors(visible.position, piece.home)));
    }
    if (bounds.isEmpty()) return null;
    const point = bounds.getCenter(offset).project(cam);
    if (!(Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1)) return null;
    return [(point.x + 1) / 2 * width, (1 - point.y) / 2 * height];
  }
  layoutSequenceReview(points, order, width, height) {
    if (!order.length || !width || !height) return 1;
    const inset = Math.min(34, width / 4, height / 4);
    const w = width - inset * 2, h = height - inset * 2;
    const gap = Math.min(56, Math.sqrt(w * h / order.length));
    const columns = Math.floor(w / gap) + 1, rows = Math.floor(h / gap) + 1;
    const slots = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        slots.push([(width + (2 * col - columns + 1) * gap) / 2, (height + (2 * row - rows + 1) * gap) / 2]);
      }
    }
    for (const k of order) {
      const [x, y] = points[k].c;
      let nearest = 0, distance = Infinity;
      slots.forEach(([sx, sy], i) => {
        const delta = (x - sx) ** 2 + (y - sy) ** 2;
        if (delta < distance) { distance = delta; nearest = i; }
      });
      points[k].c = slots.splice(nearest, 1)[0];
    }
    return Math.min(1, gap / 46);
  }
  lkLoop() { this.lkRaf = this.scheduleFrame(() => this.lkLoop()); const s = this.referenceState, root = this.lkRef.current, E = this.E; if (!root || !E || !E.cam || !s.plan) return; const overview = !!s.sequenceReview && !s.tm, nb = !s.lk && !overview;
    if (this._lkPlan !== s.plan || this._lkSi !== s.si) this.lkBuild(); const arr = s.plan[s.si] || [], L = this.lkEls; if (!L) return; const T = window.THREE, cv = this.cvRef.current, W = cv.clientWidth, H = cv.clientHeight;
    const sp = v => { const p = v.clone().project(E.cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }, all = new T.Box3(); this.pr.sections[s.si].idx.forEach(i => all.union(this.lkB(i))); const mc = sp(all.getCenter(new T.Vector3())), now = performance.now();
    const pts = arr.map(x => { const bb = new T.Box3(); this.lkPcs(x).forEach(i => bb.union(this.lkB(i))); const a = sp(bb.getCenter(new T.Vector3())); let dx = a[0] - mc[0], dy = a[1] - mc[1]; const d = Math.hypot(dx, dy) || 1; return { a, ux: dx / d, uy: dy / d, c: [a[0] + dx / d * 64, a[1] + dy / d * 64] }; });
    if (overview && this._sequenceGraph?.arr !== arr) {
      const order = arr.flatMap((step, k) => step.del ? [] : [k]);
      const next = new Map(order.slice(0, -1).map((k, i) => [k, order[i + 1]]));
      this._sequenceGraph = { arr, order, next };
    }
    const graph = overview ? this._sequenceGraph : null;
    const reviewChecks = graph ? this.activeSequenceReview(s)?.checks : null;
    const badgeScale = graph ? this.layoutSequenceReview(pts, graph.order, W, H) : 1;
    if (!overview) pts.forEach((p, k) => { let g = 0; while (g < 12 && pts.slice(0, k).some(o => Math.hypot(o.c[0] - p.c[0], o.c[1] - p.c[1]) < 38)) { p.c = [p.c[0] + p.ux * 40, p.c[1] + p.uy * 40]; g++; } });
    const subs0 = this.lkSubs(arr);
    if (nb) {
      const group = arr.map((_, k) => k).filter(k => subs0[k] === subs0[s.cur]);
      const active = Math.max(0, group.indexOf(s.cur));
      const reach = Math.max(active, group.length - 1 - active, 1);
      const gap = Math.max(44, Math.min(76, (H / 2 - 26) / reach));
      this._lkSlots = {};
      group.forEach((k, i) => {
        pts[k].c = [64, H / 2 + (i - active) * gap];
        this._lkSlots[k] = pts[k].c.slice();
      });
    } else if (!overview && s.lkFocusOn) { const G = arr.map((_, k) => k).filter(k => subs0[k] === s.lkFocus); if (G.length) { let minX = Math.min(...G.map(k => pts[k].a[0])); { const T = window.THREE, sb = new T.Box3(); this.pr.sections[s.si].idx.forEach(i => { if (this.pr.pieces[i].obj.visible) sb.union(this.lkB(i)); }); if (!sb.isEmpty()) { let mx = Infinity; [0, 1].forEach(ix => [0, 1].forEach(iy => [0, 1].forEach(iz => { const v = new T.Vector3(ix ? sb.max.x : sb.min.x, iy ? sb.max.y : sb.min.y, iz ? sb.max.z : sb.min.z).project(E.cam); mx = Math.min(mx, (v.x + 1) / 2 * W); }))); minX = Math.min(minX, mx - 60); } } const cy = G.reduce((t, k) => t + pts[k].a[1], 0) / G.length, gap = Math.min(56, (H - 120) / Math.max(1, G.length - 1)), x0 = Math.max(250, Math.min(minX, W) - 20), y0 = Math.max(60, Math.min(H - 60 - gap * (G.length - 1), cy - gap * (G.length - 1) / 2)); G.forEach((k, q) => { pts[k].c = [x0, y0 + q * gap]; }); this._lkSlots = {}; G.forEach(k => { this._lkSlots[k] = pts[k].c.slice(); }); } }
    { const d = this.lkDrag, SL = this._lkSlots; if (d && d.moved && SL && SL[d.from]) { const ks = Object.keys(SL).map(Number).sort((x, y) => x - y); if (d.dest != null) ks.forEach(k => { if (k === d.from) return; const i0 = ks.indexOf(k) - (k > d.from ? 1 : 0), di = ks.indexOf(d.dest), slot = i0 + (i0 >= di ? 1 : 0); if (ks[slot] != null) pts[k].c = SL[ks[slot]].slice(); }); pts[d.from].c = [d.x + 34, d.y]; const seq = ks.filter(k => k !== d.from), di = d.dest != null && d.dest !== d.from ? ks.indexOf(d.dest) : -1, occ = seq.slice(); if (di >= 0) occ.splice(di, 0, 'G'); const pos = o => o === 'G' ? SL[ks[di]] : pts[o].c, VN = {}; occ.forEach((o, i) => { VN[o] = i + 1 < occ.length ? pos(occ[i + 1]) : null; }); this._lkVN = VN; this._lkGP = di >= 0 ? SL[ks[di]] : null; } else { this._lkVN = null; this._lkGP = null; } }
      if (nb) { const SM = this._lkSm = this._lkSm && this._lkSmA === arr ? this._lkSm : {}; this._lkSmA = arr; pts.forEach((p, k) => { if (!p || !p.c) return; const dm = this.lkDrag && this.lkDrag.moved && this.lkDrag.from === k, o = SM[k]; if (!o || dm) SM[k] = p.c.slice(); else { o[0] += (p.c[0] - o[0]) * 0.3; o[1] += (p.c[1] - o[1]) * 0.3; p.c = o.slice(); } }); } else this._lkSm = null;
      const subs = subs0, fOn = !overview && !!s.lkFocusOn, inF = k => overview ? !!arr[k] && !arr[k].del : nb ? subs[k] === subs[s.cur] : (!fOn || subs[k] === s.lkFocus), far = k => nb && Math.abs(k - s.cur) > 1, fl = s.lkFlash && now - s.lkFlash.t < 900 ? s.lkFlash.k : -1;
    const mk = s.lkMenu;
    pts.forEach((p, k) => { const e = L.els[k]; if (!e) return; const vis = inF(k); e.c.style.opacity = arr[k] && arr[k].del ? '0.3' : '1'; const dimN = far(k) && this.lkHov !== k; const dragMe = this.lkDrag && this.lkDrag.moved && this.lkDrag.from === k; e.c.style.transition = 'opacity .25s ease, background .2s ease'; e.c.style.pointerEvents = dragMe ? 'none' : 'auto'; e.c.style.zIndex = dragMe ? '5' : '2'; e.lab.style.transition = 'none'; e.c.style.display = vis ? 'flex' : 'none'; const future = k > s.cur, hovered = this.lkHov === k;
      const leader = vis && !dragMe && (overview || Math.abs(k - s.cur) <= 1 || hovered)
        ? this.lkLeaderPoint(arr[k], future && !overview, s, E.cam, W, H) : null;
      e.ld.style.display = e.dot.style.display = leader ? 'block' : 'none'; if (!vis) { e.lab.style.display = 'none'; e.seg.style.display = 'none'; return; } const lit = k <= s.lkLit, bad = graph ? reviewChecks?.[k]?.ok === false : k === s.lkBad, review = reviewChecks?.[k]?.review, imp = s.lkImp && s.lkImp[k], O = '#f37321', M = '#3fe0c5', R = '#ff6b77', Y = '#ffc857', idle = !fOn && !this.lkIv && !bad && !imp, col = bad ? R : review ? Y : k === fl ? M : (fOn || nb || overview) ? O : (lit && this.lkIv) ? this.lkSecM(subs, k) : imp ? Y : idle ? 'rgba(243,115,33,.55)' : O, head = (k === s.lkLit && this.lkIv) || k === fl || ((nb || overview) && k === s.cur);
      e.c.style.transform = 'translate(' + p.c[0] + 'px,' + p.c[1] + 'px)' + (bad && !overview ? ' translateX(' + Math.sin(now / 40) * 2 + 'px)' : '') + (overview ? ' scale(' + (head ? 1.25 * badgeScale : badgeScale) + ')' : head ? (nb && k === s.cur ? ' scale(1.4)' : ' scale(1.25)') : '') + (dragMe ? ' scale(1.5)' : ''); e.c.style.background = head ? col : '#0b0e11'; e.c.style.color = head ? '#0a0d10' : dimN ? '#6b757c' : '#ffffff';
      if (e.c.dataset.stepKind === 'fasten') e.c.style.setProperty('--fasten-link-color', head || dragMe ? '#24160e' : bad ? R : dimN ? '#a1785a' : '#ffb27a'); const msOn = s.msel && s.msel.length > 1 && s.msel.includes(k); e.c.style.outline = msOn ? '2px dashed #f37321' : 'none'; e.c.style.outlineOffset = '4px'; e.c.style.boxShadow = dragMe ? 'inset 0 0 0 2px #f37321,0 0 0 6px rgba(243,115,33,.18),0 14px 30px rgba(0,0,0,.6),0 0 22px #f37321' : 'inset 0 0 0 1.5px ' + (dimN && !head && !bad ? 'rgba(243,115,33,.32)' : col) + (head || bad ? ',0 0 16px ' + col : ''); if (dragMe) { e.c.style.background = '#f37321'; e.c.style.color = '#0a0d10'; }
      const hv = hovered || s.lkMenu === k || k === fl;
      if (leader) {
        const primary = k === s.cur, opacity = primary ? '.9' : overview ? '.26' : '.42';
        e.ld.setAttribute('x1', leader[0]);
        e.ld.setAttribute('y1', leader[1]);
        e.ld.setAttribute('x2', p.c[0]);
        e.ld.setAttribute('y2', p.c[1]);
        e.ld.setAttribute('stroke', col);
        e.ld.setAttribute('stroke-opacity', opacity);
        e.ld.setAttribute('stroke-width', primary ? '1.5' : '1');
        e.ld.setAttribute('stroke-linecap', 'round');
        e.ld.setAttribute('stroke-dasharray', primary ? '' : '2 5');
        e.dot.setAttribute('r', primary ? '3.5' : '2.5');
        e.dot.setAttribute('cx', leader[0]);
        e.dot.setAttribute('cy', leader[1]);
        e.dot.setAttribute('fill', col);
        e.dot.setAttribute('fill-opacity', opacity);
      }
      const show = k !== s.cur && k !== mk && (fOn || (nb && !far(k)) || hovered || (!overview && bad) || head || dragMe); e.lab.style.display = show ? 'block' : 'none'; if (show) { const left = !nb && (fOn || p.c[0] < mc[0]); e.lab.style.maxWidth = Math.max(0, Math.min(280, (left ? p.c[0] : W - p.c[0]) - 36)) + 'px'; e.lab.style.transform = 'translate(' + (left ? p.c[0] - 24 : p.c[0] + 24) + 'px,' + (p.c[1] - 14) + 'px)' + (left ? ' translateX(-100%)' : ''); const dim = (fOn || (nb && k !== s.cur)) && !hv && !bad; e.lab.style.boxShadow = dim ? 'none' : 'inset 0 0 0 1px ' + col; e.lab.style.background = dim ? 'transparent' : 'rgba(10,13,16,.9)'; e.lab.style.color = dim ? '#c3cbd0' : '#ffffff'; }
      const VN = this._lkVN, inV = !!(VN && (k in VN)), next = overview ? graph.next.get(k) : k + 1, n = inV ? (VN[k] ? { c: VN[k] } : null) : pts[next]; if (n && (inV || (inF(next) && (!fOn || subs[next] === subs[k])))) { e.seg.setAttribute('x1', p.c[0]); e.seg.setAttribute('y1', p.c[1]); e.seg.setAttribute('x2', n.c[0]); e.seg.setAttribute('y2', n.c[1]); const segBad = k + 1 === s.lkBad, segLit = !fOn && this.lkIv && k + 1 <= s.lkLit; const cross = subs[next] !== subs[k]; e.seg.setAttribute('stroke', overview ? 'rgba(243,115,33,.75)' : segBad ? R : segLit ? this.lkSecM(subs, k) : (far(k) || far(k + 1)) ? 'rgba(243,115,33,.3)' : (fOn || nb) ? 'rgba(243,115,33,.85)' : 'rgba(243,115,33,.5)'); e.seg.setAttribute('stroke-dasharray', segBad ? '6 5' : cross ? '3 6' : ''); e.seg.style.filter = segLit ? 'drop-shadow(0 0 4px ' + this.lkSecM(subs, k) + ')' : ''; e.seg.style.display = 'block'; } else e.seg.style.display = 'none'; if (this.lkDrag && this.lkDrag.moved && k === this.lkDrag.from) { e.seg.style.display = 'none'; e.ld.style.display = 'none'; e.dot.style.display = 'none'; } });
    const hiK = this.lkDrag ? this.lkDrag.from : (s.drag != null && s.drag >= 0) ? s.drag : this.lkHov != null ? this.lkHov : s.lkMenu != null ? s.lkMenu : overview ? s.cur : s.lkBad >= 0 ? s.lkBad : nb ? s.cur : null; const hiStep = arr[hiK];
    this.lkHi3d(hiStep && !hiStep.del ? this.lkPcs(hiStep).filter(i => {
      const piece = this.pr.pieces[i];
      return piece.obj.visible;
    }) : []);
    if (mk != null && pts[mk] && inF(mk)) {
      const [x, y] = pts[mk].c;
      L.menu.style.display = 'flex';
      const width = L.menu.offsetWidth;
      const left = x + 42 + width <= W - 8 ? x + 42 : Math.max(8, x - 42 - width);
      L.menu.style.transform = 'translate(' + left + 'px,' + y + 'px) translateY(-50%)';
    } else L.menu.style.display = 'none';
    { const g = L.menu._ghost, d0 = this.lkDrag, SL = this._lkSlots; if (g) { if (d0 && d0.moved && d0.dest != null && d0.dest !== d0.from && SL && SL[d0.dest]) { const c = SL[d0.dest]; if (g._k !== d0.dest) { g._k = d0.dest; g.style.transition = 'none'; g.style.transform = 'translate(' + c[0] + 'px,' + c[1] + 'px) scale(.2)'; g.style.opacity = '0'; void g.offsetWidth; g.style.transition = 'transform .26s cubic-bezier(.2,.9,.25,1.3),opacity .18s ease'; } g.style.display = 'flex'; g.style.opacity = '1'; g.style.transform = 'translate(' + c[0] + 'px,' + c[1] + 'px) scale(' + (1 + Math.sin(now / 160) * 0.05) + ')'; } else { g._k = null; g.style.opacity = '0'; g.style.display = 'none'; } } }
      const d = this.lkDrag; if (d && pts[d.from] && !d.moved) { const f = pts[d.from].c; L.tmp.style.display = 'block'; L.tmp.setAttribute('x1', f[0]); L.tmp.setAttribute('y1', f[1]); L.tmp.setAttribute('x2', d.x); L.tmp.setAttribute('y2', d.y); } else if (d && d.moved && this._lkGP && this._lkVN && this._lkVN.G) { const g = this._lkGP, nx = this._lkVN.G; L.tmp.style.display = 'block'; L.tmp.setAttribute('stroke-dasharray', ''); L.tmp.setAttribute('stroke', 'rgba(243,115,33,.85)'); L.tmp.setAttribute('x1', g[0]); L.tmp.setAttribute('y1', g[1]); L.tmp.setAttribute('x2', nx[0]); L.tmp.setAttribute('y2', nx[1]); } else { L.tmp.style.display = 'none'; L.tmp.setAttribute('stroke-dasharray', '5 5'); L.tmp.setAttribute('stroke', '#f37321'); } }
  subOf(si) { const sec = this.pr.sections[si], b = sec.subIdx, o = {}; if (!b || !sec.sub) return o; sec.idx.forEach((i, L) => { let k = 0; while (k < b.length && L >= b[k]) k++; o[i] = k; }); return o; }
  splitFasten(si, steps) {
    const pr = this.pr, idx = pr.sections[si].idx, so = this.subOf(si), inSub = (i, sb) => sb == null || so[i] == null || so[i] === sb, out = [];
    const ps = i => pr.pieces[i].p || [pr.pieces[i].home.x, pr.pieces[i].home.y, pr.pieces[i].home.z], d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    steps.forEach(x => {
      if (x.t !== 'fasten') { out.push(x); return; }
      const fp = idx.filter(i => pr.pieces[i].part === x.part && inSub(i, x.sub)); if (fp.length) { x.q = fp.length; x.pcs = fp; }
      const run = []; for (let r = out.length - 1; r >= 0 && out[r].t === 'place' && out[r].sub === x.sub; r--) run.unshift(r);
      const cand = []; run.forEach(r => idx.forEach(i => { if (pr.pieces[i].part === out[r].part && inSub(i, x.sub)) cand.push(i); }));
      const runParts = [...new Set(cand.map(i => pr.pieces[i].part))];
      if (runParts.length < 2 || !fp.length) { out.push(x); return; }
      const tg = {}; let ok = true; fp.forEach(i => { let best = null, bd = 1e9; cand.forEach(c => { const v = d(ps(i), ps(c)); if (v < bd) { bd = v; best = pr.pieces[c].part; } }); if (bd > 40) ok = false; (tg[best] = tg[best] || []).push(i); });
      if (!ok || Object.keys(tg).length < 2) { out.push(x); return; }
      const p = pr.parts[x.part], ins = Object.keys(tg).map(k => { let at = -1; run.forEach(r => { if (out[r].part === k) at = r; }); return { at, k }; }).sort((a, b) => b.at - a.at);
      ins.forEach(({ at, k }) => { const n = tg[k].length; out.splice(at + 1, 0, Object.assign({}, x, { q: n, pcs: tg[k], g: p.ko + ' ' + n + '개를 ' + (x.tool || '공구') + '로 조이세요.' })); });
    });
    return out;
  }
  secParts(si) { const pr = this.pr, m = {}, ord = []; pr.sections[si].idx.forEach(i => { const k = pr.pieces[i].part; if (!m[k]) { m[k] = 0; ord.push(k); } m[k]++; }); return { m, ord }; }
  avgY(si, k) { const pr = this.pr; let y = 0, n = 0; pr.sections[si].idx.forEach(i => { if (pr.pieces[i].part === k) { y += pr.pieces[i].home.y; n++; } }); return n ? y / n : 0; }
  keepPlan(old) { const pr = this.pr, ip = this.initPlan(), ED = ['g', 'tool', 'toolK', 'toolOk', 'nm', 'nmEd', 'sw', 'ok', 'off', 'contactReview'];
    if (!Array.isArray(old) || !old.length) return ip;
    const flat = []; old.forEach((a, si) => (a || []).forEach((x, k) => { if (x) flat.push({ x, si, r: si * 10000 + k, used: false }); }));
    return ip.map((fresh, si) => { const sec = pr.sections[si], so = this.subOf(si), hasSub = !!(sec.sub && sec.sub.length > 1), pcsOf = p => sec.idx.filter(i => pr.pieces[i].part === p);
      const subOfStep = x => { if (!hasSub) return x.sub; if (x.pcs && x.pcs.length && so[x.pcs[0]] != null) return so[x.pcs[0]]; const c = pcsOf(x.part); return c.length && so[c[0]] != null ? so[c[0]] : x.sub; };
      const rows = fresh.map((x, fi) => {
        const sb = subOfStep(x), y = { ...x };
        const samePieces = step => x.pcs && step.pcs?.length === x.pcs.length && step.pcs.every(i => x.pcs.includes(i));
        const findRow = predicate => {
          const matches = o => o.x.part === x.part && !o.x.isNew && !o.x.extraAction && !o.used && predicate(o.x);
          const exact = flat.find(o => matches(o) && o.si === si && samePieces(o.x));
          if (exact) return exact;
          return flat.find(o => matches(o) && o.si === si && o.x.sub === sb)
            || flat.find(o => matches(o) && o.si === si) || flat.find(matches);
        };
        const manual = findRow(step => (step.actionOverride === 'place' || step.actionOverride === 'fasten')
          && (!x.pcs || !step.pcs || samePieces(step)));
        const sameType = manual || findRow(step => (step.t || 'place') === (x.t || 'place'));
        const saved = sameType || (pr.parts[x.part]?.actionSource || (x.t === 'fasten' && pr.parts[x.part]?.std) ? findRow(() => true) : null);
        if (hasSub) y.sub = sb;
        if (saved) {
          saved.used = true;
          const fields = sameType ? ED : ['off'];
          fields.forEach(k => { if (saved.x[k] !== undefined) y[k] = saved.x[k]; });
          if (manual) {
            y.t = y.actionOverride = saved.x.actionOverride;
            if (saved.x.pcs?.length && saved.x.pcs.every(i => sec.idx.includes(i) && pr.pieces[i].part === x.part)) {
              y.pcs = saved.x.pcs;
              y.q = y.pcs.length;
            }
          }
          if (saved.x.del) y.del = true;
        }
        return { y, sb: hasSub ? sb : 0, r: saved ? saved.r : null, fi };
      });
      flat.filter(o => o.si === si && (o.x.isNew || o.x.extraAction)).forEach(o => { o.used = true; const sb = hasSub ? (o.x.sub != null ? Math.min(o.x.sub, sec.sub.length - 1) : 0) : 0; rows.push({ y: Object.assign({}, o.x, hasSub ? { sub: sb } : {}), sb, r: o.r, fi: 1e9 }); });
      let last = -1; rows.forEach(o => { if (o.r == null) o.r = last + 0.5; else last = o.r; });
      rows.sort((a, b) => a.sb - b.sb || a.r - b.r || a.fi - b.fi);
      return rows.map(o => o.y); }); }
  reflow() { if (!this.pr || !this.E) return; this.discardSequenceReview(); const old = this.referenceState.plan; this.secOvApply(); this._lkPlan = null; this._ex = null; const plan = this.keepPlan(old); const si = Math.min(this.referenceState.si || 0, plan.length - 1); this.updateReferenceState({ plan, si, cur: 0, lkBad: -1 }, () => { this.autoSave(); this.show(true); this.say('조립도에서 바꾼 구간을 반영했습니다 · 기존 순서 유지'); }); }
  stepActionVals(s, step) {
    if (s.tm || !step || step.blank || step.del) return { actionPanel: false };
    const source = this.pr.parts[step.part]?.actionSource;
    const labels = {
      library: '라이브러리 기준 · 도면의 실제 작업에 맞게 바꿀 수 있습니다.',
      geometry: '같은 조립 형상에서 확인한 유형을 적용했습니다.',
      name: '부품명 기준 초안 · 실제 작업을 확인하세요.',
      unmatched: '분류 근거 없음 · 도면에서 작업 유형을 확인하세요.'
    };
    const label = step.actionOverride ? '작업자가 확인한 유형' : labels[source] || '조립 초안 기준';
    return {
      actionPanel: true, actionSource: label,
      actionTitle: '조립 유형 수정 · ' + (step.t === 'fasten' ? '체결' : '놓기'),
      actionExpanded: !step.actionOverride && source === 'unmatched',
      actionChoices: [['place', '놓기'], ['fasten', '체결']].map(([action, label]) => ({
        label, selected: step.t === action, border: step.t === action ? '#cf7c43' : '#38444d',
        bg: step.t === action ? '#4a2c1c' : '#1b2329', go: () => this.chooseStepAction(action)
      })),
      actionFollowup: step.t === 'place', addFollowup: () => this.addFollowupFastening()
    };
  }
  chooseStepAction(action) {
    const s = this.referenceState, step = s.plan?.[s.si]?.[s.cur];
    if (s.tm || !step || step.blank || step.del || step.actionOverride === action) return;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 유형을 바꾸세요'); return; }
    const typeChanged = step.t !== action, label = action === 'fasten' ? '체결' : '놓기';
    this.setPlan(rows => {
      const row = rows[s.cur];
      row.actionOverride = action;
      if (!typeChanged) return;
      row.t = action;
      row.g = this.lkKo(row) + (action === 'fasten' ? '의 체결 위치와 공구를 확인하세요.' : '을(를) 조립 위치에 놓으세요.');
      delete row.tool; delete row.toolK; delete row.toolOk;
      delete row.nm; delete row.nmEd; delete row.nmSrc;
      delete row.contactReview;
    }, label + ' 유형으로 확인했습니다');
    clearTimeout(this._as);
    this.autoSave();
  }
  addFollowupFastening() {
    const s = this.referenceState, step = s.plan?.[s.si]?.[s.cur];
    if (s.tm || !step || step.t !== 'place' || step.del || step.blank) return;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 체결 단계를 추가하세요'); return; }
    const at = s.cur + 1, pcs = this.lkPcs(step, s.si);
    this.setPlan(rows => {
      rows.splice(at, 0, {
        part: step.part, t: 'fasten', actionOverride: 'fasten', extraAction: true, isNew: true,
        sub: step.sub, pcs: pcs.slice(), q: step.q,
        g: this.lkKo(step) + '의 체결 위치와 공구를 확인하세요.'
      });
    }, '후속 체결 단계를 추가했습니다 · 실제 작업 위치로 옮기세요');
    this.pick(s.si, at, false);
    clearTimeout(this._as);
    this.autoSave();
  }
  initPlan() {
    const pr = this.pr;
    return pr.sections.map((sec, si) => {
      const { m, ord } = this.secParts(si), steps = [];
      (sec.steps || []).forEach(st => { if (!st || !st.part || !m[st.part]) return; const p = pr.parts[st.part]; steps.push({ sub: st.sub, t: st.t === 'fasten' ? 'fasten' : 'place', part: st.part, q: m[st.part], g: st.t === 'fasten' ? p.ko + ' ' + m[st.part] + '개를 ' + (st.toolKo || '공구') + '로 조이세요.' : (st.txt || p.ko + '를 조립 위치에 놓으세요.'), tool: st.toolKo || '', nm: st.nm }); });
      const seen = new Set(steps.map(x => x.part));
      ord.forEach(k => { if (seen.has(k)) return; const p = pr.parts[k], std = !!p.std; steps.push({ t: std ? 'fasten' : 'place', part: k, q: m[k], g: std ? p.ko + ' ' + m[k] + '개를 조이세요.' : p.ko + (m[k] > 1 ? ' ' + m[k] + '개' : '') + '를 조립 위치에 놓으세요.', tool: std ? '육각 렌치' : '', nm: null }); });
      if (!(sec.steps || []).length) steps.sort((a, b) => (a.t === b.t ? this.avgY(si, a.part) - this.avgY(si, b.part) : 0));
      return this.splitFasten(si, steps);
    });
  }
  show(fit, animate = true) { this.show0(fit, animate); try { this.tm3d(); } catch (er) { console.warn('tm3d', er); } }
  clearToolPreview() {
    if (!this._tmG) return;
    this._tmG.removeFromParent();
    this._tmG.traverse(node => node.geometry?.dispose());
    this._tmG = null;
  }
  tm3d() { const E = this.E, T = window.THREE, s = this.referenceState; if (!E || !T) return;
    this.clearToolPreview();
    if (!s.toolFocus || s.sequenceReview || !s.plan) return; const x = (s.plan[s.si] || [])[s.cur]; if (!x || x.t !== 'fasten' || x.del) return; const pc = this.pr.pieces[this.lkPcs(x, s.si)[0]]; if (!pc || !pc.obj) return;
    pc.obj.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(pc.obj), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()); const ab = new T.Box3(); this.pr.sections[s.si].idx.forEach(i => { const o = this.pr.pieces[i].obj; if (o && o.visible !== false) ab.expandByObject(o); }); const ac = ab.isEmpty() ? new T.Vector3() : ab.getCenter(new T.Vector3());
    const wp = pc.obj.getWorldPosition(new T.Vector3()), hm = wp, cc = c; const ax = [new T.Vector3(1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1)], ext = [sz.x, sz.y, sz.z]; let k = 0; ext.forEach((v, i) => { if (v > ext[k]) k = i; }); const dir = ax[k].clone(), hd = hm.clone().sub(cc); if (Math.abs(hd.dot(dir)) > ext[k] * 0.2) { if (hd.dot(dir) < 0) dir.negate(); } else if (dir.dot(cc.clone().sub(ac)) < 0) dir.negate(); const tip = cc.clone().add(dir.clone().multiplyScalar(ext[k] / 2 + 0.5));
    const t = this.TL.find(t => t.k === this.toolK(x)), o = this.toolGeo(t); if (t.f === 'sp') o.position.y -= 66; const g = new T.Group(), inner = new T.Group(); inner.add(o); g.add(inner);
    g.scale.setScalar(Math.min(1, Math.max(.025, sz.length() / 38)));
    const om = this._tmOut || (this._tmOut = new T.LineBasicMaterial({ color: 0xf37321, transparent: true, opacity: 0.9, depthTest: false })); o.traverse(m => { if (m.isMesh) { const l = new T.LineSegments(new T.EdgesGeometry(m.geometry, 35), om); l.renderOrder = 5; m.add(l); } });
    g.position.copy(tip); g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); E.S.add(g); this._tmG = g; }
  show0(fit, animate) { this._hiKey = null; this._hiList = [];
    const E = this.E, pr = this.pr, T = window.THREE, s = this.referenceState; if (!E || !s.plan) return;
    const pv = this._pv && this._pv.si === s.si ? this._pv : null, si = s.si, k = pv ? pv.k : s.cur, sec = pr.sections[si], plan = (pv ? pv.a : s.plan[si]) || [], first = {}, wire = s.tab === 'tools' && plan[k]?.t === 'fasten' && s.look === 'wire';
    plan.forEach((x, j) => { if (!x.del && first[x.part] == null) first[x.part] = j; }); const firstPc = {}; plan.forEach((x, j) => { if (x.pcs && !x.del) x.pcs.forEach(i => { if (firstPc[i] == null) firstPc[i] = j; }); });
    const materials = this.stepLineMaterials();
    const selected = new Set(plan[k] && !plan[k].del ? this.lkPcs(plan[k]) : []);
    const preview = s.tm ? s.ghost : s.showFuture;
    const focusStep = plan[k];
    const focusIndex = s.toolFocus && !s.sequenceReview && focusStep?.t === 'fasten' && !focusStep.del ? this.lkPcs(focusStep, si)[0] : undefined;
    const nearby = focusIndex == null ? null : this.lkB(focusIndex).clone();
    if (nearby) nearby.expandByScalar(nearby.getSize(new T.Vector3()).length() * 1.25);
    if (!s.toolFocus && E.cam.near !== 10) { E.cam.near = 10; E.cam.updateProjectionMatrix(); }
    E.grid.material.opacity = wire ? 0.32 : 0.25;
    const edit = !pv && this.activePositionEdit(s);
    const previewPlan = edit && edit.offset !== undefined
      ? plan.map((row, index) => index === edit.index ? { ...row, off: edit.offset } : row) : plan;
    const offsets = this.stepOffsets(previewPlan, si);
    if (edit?.original) for (const i of this.lkPcs(edit.step, si)) offsets.delete(i);
    E.anim = [];
    pr.pieces.forEach((pc, i) => {
      const j = sec.idx.includes(i) ? (firstPc[i] != null ? firstPc[i] : first[pc.part]) : null; pc.wireM.visible = false;
      pc.obj.visible = false;
      if (j == null) return;
      const of = offsets.get(i), home = of ? pc.home.clone().add(new T.Vector3(of[0], of[1], of[2])) : pc.home;
      E.snap(pc.obj, home, pc.q);
      E.snap(pc.wireM, home, pc.q);
      if (nearby && !selected.has(i)) {
        if (nearby.intersectsBox(this.lkB(i))) {
          this.paintStepEdges(pc, materials.preview, true);
          pc.wireM.visible = true;
        }
        return;
      }
      if (j > k && !s.sequenceReview) {
        if (preview) {
          this.paintStepEdges(pc, s.tm ? materials.ghost : materials.preview, true);
          pc.wireM.visible = true;
        }
        return;
      }
      pc.stepEdgeStyle = selected.has(i) ? materials.hotEdge : wire ? materials.wireEdge : null;
      this.paintStepEdges(pc, pc.stepEdgeStyle, wire);
      pc.wireM.visible = true;
      pc.obj.visible = !wire;
      if (animate && !s.sequenceReview && j === k) {
        const up = home.clone().add(new T.Vector3(0, E.sz * 0.25, 0));
        for (const object of wire ? [pc.wireM] : [pc.obj, pc.wireM]) {
          E.snap(object, up, pc.q);
          E.move(object, home, pc.q, 0.25, 3);
        }
      }
    });
    if (fit) { const b = new T.Box3(); sec.idx.forEach(i => b.expandByPoint(pr.pieces[i].home)); b.expandByScalar(E.sz * 0.14); const c = b.getCenter(new T.Vector3()), sz = b.getSize(new T.Vector3()); E.orbit({ az: -0.62, el: 0.36, dist: Math.max(sz.y * 2.1, Math.max(sz.x, sz.z) * 1.85, 150), tgt: c }); }
  }
  pick(si, k, fit, fromPlayback = false) {
    if (!fromPlayback) this.stopPlayback();
    if (si !== this.referenceState.si) {
      this.discardSequenceReview();
      if (this.referenceState.confirmed) this.updateReferenceState({ confirmed: false, lkMsg: null });
    } if (this.referenceState.lk && !this.referenceState.cfRun) { this.lkStop(); this.updateReferenceState({ lk: false, lkMsg: null, lkLit: -1, lkBad: -1, lkImp: {} }); } if (this.referenceState.tm) { const x = (this.referenceState.plan[si] || [])[k]; if (x && x.t !== 'fasten') return; } const report = this.referenceState.lkMsg;
    const selectionChanged = si !== this.referenceState.si || k !== this.referenceState.cur;
    const clearReport = report?.checked && selectionChanged;
    const next = this.referenceState.plan?.[si]?.[k];
    const canKeepTools = next?.t === 'fasten' && !next.del && !next.blank;
    const resetFocus = this.referenceState.toolFocus && (!canKeepTools || fromPlayback);
    this.updateReferenceState({ si, cur: k, swOpen: false, lkMenu: null,
      ...(resetFocus ? { toolFocus: false } : {}),
      ...(!canKeepTools && this.referenceState.tab === 'tools' ? { tab: 'det' } : {}), ...(selectionChanged ? { positionDraft: null } : {}), ...(clearReport ? { lkMsg: null, lkBad: -1 } : {}) }, () => {
      const focused = this.referenceState.toolFocus;
      this.show(!focused && (fit || resetFocus), !focused);
      if (focused && selectionChanged) this.focusFastener();
    }); }
  swCands(base) { const m = /^(.*?)\s*M(\d+)\s*[×x]\s*(\d+)/.exec(base); if (!m) return []; const ty = m[1].trim(), d = +m[2], L = +m[3];
    const HX = { '접시머리 나사': { 4: 2.5, 5: 3, 6: 4, 8: 5, 10: 6, 12: 8 }, '육각 구멍 볼트': { 4: 3, 5: 4, 6: 5, 8: 6, 10: 8, 12: 10 }, '육각 볼트': { 6: 10, 8: 13, 10: 17, 12: 19 } };
    const tool = (t, dd) => { const v = (HX[t] || {})[dd]; return v == null ? '토크 렌치' : t === '육각 볼트' ? '스패너 ' + v + ' mm' : '육각 렌치 ' + v + ' mm'; };
    const mk = (t, dd, l, note, ok) => ({ ko: t + ' M' + dd + '×' + l, pn: 'DX-' + (t === '접시머리 나사' ? 'CSK' : t === '육각 볼트' ? 'HXB' : 'SHC') + '-M' + dd + '-' + String(l).padStart(3, '0') + '-A', tool: tool(t, dd), tq: (this.TQ[dd] || '?') + ' N·m', note, ok });
    const out = []; [-6, -4, 4, 6].forEach(dl => { if (L + dl > 4) out.push(mk(ty, d, L + dl, '같은 종류 · 같은 굵기 · 길이 ' + (dl > 0 ? '+' : '') + dl + ' mm', true)); });
    Object.keys(HX).filter(t => t !== ty && HX[t][d]).forEach(t => out.push(mk(t, d, L, '같은 굵기 · 머리 모양 다름 · 자리파기 확인', 'warn')));
    if (HX[ty] && HX[ty][d + 2]) out.push(mk(ty, d + 2, L, '굵기 다름 · 구멍 지름 확인 필요', false));
    return out; }
  swTh(name) { const pr = this.pr, LT = this.referenceState.libTh || {}; if (!pr) return 'none'; const keys = Object.keys(pr.parts).filter(k => LT[k]); const ty = (/^(.*?)\s*M\d/.exec(name) || [0, name])[1].trim(); const hit = keys.find(k => pr.parts[k].ko === name) || keys.find(k => pr.parts[k].ko.indexOf(ty) === 0) || keys.find(k => /볼트|나사/.test(pr.parts[k].ko)); return hit ? 'url(' + LT[hit] + ')' : 'none'; }
  swVals(s, cur, baseKo) { if (!cur || cur.t !== 'fasten' || !s.swOpen) return { swList: false, swRows: [] }; const base = cur.sw ? cur.sw.orig : baseKo, si = s.si, k = s.cur;
    const keep = { ko: base, tag: cur.sw ? '원래 부품으로' : '그대로 두기', tagBg: '#2a3238', th: this.swTh(base), note: cur.sw ? '바꾼 것을 취소합니다' : '현재 부품', tool: '', tq: '', bd: cur.sw ? '#3a4146' : '#f37321', nc: '#c3cbd0', go: () => { if (cur.sw) this.setPlan(a => { delete a[k].sw; return a; }, '단계 ' + String(k + 1).padStart(2, '0') + ' 원래 부품으로 되돌렸습니다'); } };
    const rows = this.swCands(base).map(c => ({ sel: !!cur.sw && cur.sw.ko === c.ko, ko: c.ko, tag: c.ok === true ? '길이 다름' : c.ok === 'warn' ? '머리 다름' : '굵기 다름', tagBg: c.ok === true ? '#2a3238' : c.ok === 'warn' ? 'rgba(243,115,33,.85)' : 'rgba(255,107,119,.85)', th: this.swTh(c.ko), note: c.note, tool: c.tool, tq: c.tq, bd: c.ok === true ? '#3a4146' : c.ok === 'warn' ? 'rgba(243,115,33,.6)' : 'rgba(255,107,119,.7)', nc: c.ok === true ? '#9aa5ab' : c.ok === 'warn' ? '#f37321' : '#ff6b77',
      go: () => { this.setPlan(a => { a[k].sw = { ko: c.ko, pn: c.pn, tool: c.tool, orig: base }; return a; }, '단계 ' + String(k + 1).padStart(2, '0') + ' ' + base + ' → ' + c.ko + (c.ok === false ? ' · 구멍 지름 확인 필요' : '')); } }));
    rows.forEach(r => { r.tagBg = '#2a3238'; r.bd = '#2a3238'; r.nc = '#c3cbd0'; if (r.sel) { r.bd = '#f37321'; r.tagBg = '#f37321'; } }); keep.tagBg = cur.sw ? '#2a3238' : '#f37321'; return { swList: true, swRows: [keep].concat(rows) }; }
  move(a, b) { if (a == null || b == null || a === b) return; this.setPlan(arr => { const t = arr.splice(a, 1)[0]; arr.splice(b, 0, t); const nb = arr[b - 1] || arr[b + 1]; if (nb && nb.sub !== undefined) t.sub = nb.sub; return arr; }, null, Math.min(a, b) + 1); this.updateReferenceState({ cur: b, drag: null, over: null }); }
  tmVals(s, arr, cur, ko, thU) { const tm = !!s.tm, base = { isTm: tm, notTm: !tm, listTitle: tm ? '체결 · 공구' : '조립 순서', lkD: tm ? 'none' : 'block' }; if (s.tab !== 'tools' || !s.plan) return base; const O = '#f37321', M = '#3fe0c5', TH = s.tlTh || {}, img = k => TH[k] ? 'url(' + TH[k] + ')' : 'none';
    const all = this.fasteningSteps(s); const done = all.filter(r => r[2].toolOk).length, left = all.length - done;
    const use = {}; all.forEach(r => { const k = this.toolK(r[2]); use[k] = (use[k] || 0) + 1; });
    Object.assign(base, { tmDone: done, tmAll: all.length, tmW: (all.length ? done / all.length * 100 : 0) + '%', tmC: left ? O : M, tmLeft: left, tmLeftOn: left > 0, tmAllOk: () => this.setToolAt(all.filter(r => !r[2].toolOk).map(r => [r[0], r[1]]), null, '남은 ' + left + '곳을 추천 공구로 확정했습니다'), tmUse: this.TL.filter(t => use[t.k]).map(t => ({ ko: t.ko, n: use[t.k], img: img(t.k) })), tmSel: false });
    if (!cur || cur.t !== 'fasten') return base;
    const bo = this.boltOf(cur), rec = this.recTool(cur), ck = this.toolK(cur), fam = this.TL.find(t => t.k === rec).f, m2 = bo.d, sampleTorque = this.pr.key === 'shaper-reference' ? this.TQ[m2] : undefined, tqv = cur.nmEd || cur.nm != null ? cur.nm : sampleTorque;
    const query = (s.toolQuery || '').trim().toLowerCase();
    const cands = this.TL.filter(t => query ? (t.ko + ' ' + t.k).toLowerCase().includes(query) : s.allTools || t.k === ck || t.k === rec || t.f === 'torque' || t.f === fam).sort((a, b) => (b.k === rec) - (a.k === rec) || (b.f === 'torque') - (a.f === 'torque') || a.v - b.v);
    const same = all.filter(r => { const o = this.boltOf(r[2]); return o.ty === bo.ty && o.d === bo.d && !(r[0] === s.si && r[1] === s.cur); });
    const ct = this.TL.find(t => t.k === ck), bad = ct.f !== 'torque' && ck !== rec;
    return Object.assign(base, { tmSel: true, toolQuery: s.toolQuery || '', searchTools: e => this.updateReferenceState({ toolQuery: e.target.value }),
      allToolsLabel: s.allTools ? '추천 도구' : '전체 도구', toggleAllTools: () => this.updateReferenceState({ allTools: !s.allTools, toolQuery: '' }), noToolsFound: !cands.length,
      toolFocused: !!s.toolFocus, toolFocusDisabled: !!s.sequenceReview, toolFocusLabel: s.toolFocus ? '전체 조립 보기' : '체결부 확대', toggleToolFocus: () => this.toggleToolFocus(), openFastenerParts: () => this.changeStepTab('det', true), tmTh: thU(cur.part), tmKo: bo.nm + ' ×' + cur.q, tmTgt: (this.target(arr, s.cur) || '부품') + ' 고정', tmM: m2 ? 'M' + m2 : '-', tmQ: cur.q, tmNm: s.torqueDraft?.si === s.si && s.torqueDraft?.k === s.cur ? s.torqueDraft.text : tqv == null ? '' : String(tqv), tmNmNote: cur.nmEd ? '담당자가 고친 값입니다' : sampleTorque ? '시연 규격 예시값' : '도면 값 확인 필요',
      tmNmIn: e => this.updateReferenceState({ torqueDraft: { si: s.si, k: s.cur, text: e.target.value } }),
      tmNmBlur: () => this.saveToolTorque(),
      tmNmKey: e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } },
      tmTools: cands.map(t => { const on = cur.toolOk && t.k === ck, auto = !cur.toolOk && t.k === ck; return { ko: t.ko, img: img(t.k), go: () => this.setToolAt([[s.si, s.cur]], t.k, 'STEP ' + String(s.cur + 1).padStart(2, '0') + ' 공구 · ' + t.ko), bw: on ? '2px' : '1px', bd: on ? O : auto ? 'rgba(243,115,33,.45)' : '#232b31', op: on || auto ? 1 : 0.55, tag: t.k === rec ? (auto ? '규격 추천 · 확인 전' : '규격 추천') : t.f === 'torque' ? '토크 관리 체결' : '규격 확인', tc: t.k === rec ? M : t.f === 'torque' ? '#c3cbd0' : '#ff9aa3' }; }),
      tmWarnOn: bad, tmWarn: bad ? '추천 공구는 ' + this.TL.find(t => t.k === rec).ko + '입니다. 선택한 ' + ct.ko + '의 구동 홈과 규격을 확인하세요.' : '',
      tmSameOn: same.length > 0, tmSameN: same.length, tmSame: () => this.setToolAt(same.map(r => [r[0], r[1]]).concat([[s.si, s.cur]]), ck, '같은 규격 ' + (same.length + 1) + '곳 · ' + ct.ko) }); }
  renderVals() {
    const s = this.referenceState, O = '#f37321', pr = this.pr, plan = s.plan, arr = plan ? plan[s.si] || [] : [], cur = arr[s.cur];
    const toolReady = cur?.t === 'fasten' && !cur.del && !cur.blank, toolPanel = toolReady && s.tab === 'tools';
    const snapshot = this.activeSequenceReview(s), checks = snapshot?.checks || [];
    const problems = checks.flatMap((check, i) => check.ok ? [] : [i]);
    const reviews = checks.flatMap((check, i) => check.review ? [i] : []);
    const issues = [...problems, ...reviews];
    const currentIssue = checks[s.cur] && (!checks[s.cur].ok || checks[s.cur].review) ? checks[s.cur] : null;
    const orderedIssues = [...issues].sort((a, b) => a - b);
    const nextProblem = orderedIssues.find(i => i > s.cur) ?? orderedIssues[0];
    const PG = ['파일 올리기', '부품 확인', '조립도', '조립 순서', '구멍 위치', '설계도 · PDF', '완료'];
    const LT = s.libTh || {}, thU = k => LT[k] ? 'url(' + LT[k] + ')' : 'none';
    const ko = k => (pr && pr.parts[k] ? pr.parts[k].ko : k), pn = k => (pr && pr.parts[k] && pr.parts[k].pn) || String(k).toUpperCase();
    const secs = plan ? pr.sections.map((sec, gi) => { const open = !!s.open[gi], on = gi === s.si, n = plan[gi].length;
      let lastSub = null, carry = null; const subN = {}; plan[gi].forEach(x => { const sb = x.sub != null ? x.sub : carry; carry = sb; subN[sb] = (subN[sb] || 0) + 1; }); carry = null;
      const rows = open ? plan[gi].map((x, i) => { const sbk = x.sub != null ? x.sub : carry; carry = sbk; const hasSub = !!(sec.sub && sbk != null && sec.sub[sbk]), subOn = hasSub && sbk !== lastSub; lastSub = sbk; const ck = gi + '-' + sbk, cl = !!(s.subCl || {})[ck], sm = hasSub ? /^(\S+)\s+(.*)$/.exec(sec.sub[sbk]) || [0, '', sec.sub[sbk]] : null;
        const subV = { subOn, subNo: sm ? sm[1] : '', subKo: sm ? sm[2] : '', subN: (subN[sbk] || 0) + '단계', subArrow: cl ? '▸' : '▾', vis: !(hasSub && cl) && (!s.tm || (x.t === 'fasten' && !x.del)), subTog: () => this.updateReferenceState({ subCl: Object.assign({}, this.referenceState.subCl || {}, { [ck]: !cl }) }) }; const sel = on && i === s.cur, ov = on && s.over === i && s.drag !== i; const fz = x.t === 'fasten', done = !s.sequenceReview && on && i < s.cur, m2 = /M(\d+)/.exec(ko(x.part)), tqv = x.nm || (m2 && this.TQ[+m2[1]]), bar = x.isNew ? '#3fe0c5' : fz ? O : '#5a646b';
        const tag = x.isNew ? '새 부품' : fz ? '체결' : '놓기 · ' + (x.off ? '위치 수정됨' : '원래 위치');
        const tag2 = s.tm && fz ? (x.toolOk ? '' : '확인 필요 · ') + this.TL.find(t => t.k === this.toolK(x)).ko + (tqv ? ' · ' + tqv + ' N·m' : '') : tag;
        return { no: done ? '✓' : this.lbl(plan[gi], i), ko: x.sw ? x.sw.ko : ko(x.part), q: x.q, tag: x.del ? '삭제됨 · 누르면 되살리기' : x.sw ? '부품 변경됨 · ' + tag2 : tag2, th: thU(x.part), thW: '48px', ind: '0px', pad: '10px 10px', fs: '15px', fw: 700, thBd: sel ? 'rgba(243,115,33,.8)' : fz ? 'rgba(243,115,33,.55)' : '#3a4146', qBg: fz ? 'rgba(243,115,33,.18)' : '#0d1114', qC: fz ? O : '#e8ecef',
          tc: x.isNew ? '#3fe0c5' : fz ? O : '#9aa5ab', dot: 'transparent', selected: sel, hover: sel ? 'background:#4a2c1c' : 'background:#151c21', bg: sel ? '#3e261a' : 'transparent', nc: sel ? O : done ? '#3fe0c5' : '#8f9aa1', sh: ov ? 'inset 0 2px 0 ' + O : 'inset 3px 0 0 ' + (sel ? O : bar), op: x.del ? 0.32 : on && s.drag === i ? 0.4 : 1, big: !fz, small: fz, done: false, chk: '', ring: x.isNew ? '#3fe0c5' : O, glow: sel ? '0 0 0 7px rgba(255,255,255,.9),0 0 18px rgba(255,255,255,.5)' : '0 0 0 0 transparent', sc: s.tm && fz ? (x.toolOk ? '#3fe0c5' : O) : x.isNew ? '#3fe0c5' : '#9aa5ab', sub: x.del ? '삭제됨 · 누르면 되살리기' : tag2, num: this.lbl(plan[gi], i), numC: sel ? '#ffb477' : '#c3cbd0', pad: fz ? '2px 12px 2px 12px' : '8px 12px', fs: fz ? '13px' : '15px', dropBefore: ov, tsh: sel ? 'inset 0 0 0 1px #c8753d' : 'none',
        ...subV, go: () => (x.del && gi === s.si) ? this.markDel(i) : this.pick(gi, i, gi !== s.si), ds: e => { this.stopPlayback(); e.dataTransfer.effectAllowed = 'move'; this.updateReferenceState({ si: gi, drag: i }); }, dov: e => { e.preventDefault(); if (s.over === i || gi !== s.si || s.drag == null || s.drag === i) return; const a = plan[gi].slice(), m = a.splice(s.drag, 1)[0]; a.splice(i, 0, m); this._pv = { si: gi, a, k: i }; this.updateReferenceState({ over: i }, () => this.show(false)); }, dp: e => { e.preventDefault(); this._pv = null; if (gi === s.si) this.move(s.drag, i); }, de: () => { const h = !!this._pv; this._pv = null; this.updateReferenceState({ drag: null, over: null }, () => { if (h) this.show(false); }); } }; }) : [];
      return { ko: (sec.final ? '최종 결합' : '구간 ' + sec.no) + ' · ' + (sec.ko || sec.title || ''), open, arrow: open ? '▾' : '▸', c: on ? '#ffffff' : '#c3cbd0', n: n + '단계', rows, tog: () => { this.updateReferenceState({ open: Object.assign({}, s.open, { [gi]: !open }) }); if (!open && gi !== s.si) this.pick(gi, 0, true); } }; }) : [];
    const go = d => () => this.pick(s.si, Math.max(0, Math.min(arr.length - 1, s.cur + d)), false);
    const mm = cur ? /M(\d+)/.exec(cur.sw ? cur.sw.ko : ko(cur.part) + ' ' + pn(cur.part)) : null, tq = cur && cur.nm ? cur.nm + ' N·m' : mm && this.TQ[+mm[1]] ? this.TQ[+mm[1]] + ' N·m · 표준값' : '확인 필요';
    const spec = cur && cur.t === 'fasten' ? [['공구', (cur.sw && cur.sw.tool) || cur.tool || '토크 렌치'], ['토크', tq], ['개수', cur.q + '개']] : [];
    const W = Object.fromEntries(issues.map(i => [i, checks[i].msg])), wN = issues.length;
    const total = plan ? plan.reduce((sum, rows) => sum + rows.length, 0) : 0;
    const advice = snapshot ? s.sequenceAdvice : null;
    const rf = s.rf, rfN = rf ? Math.max(0, arr.length - rf.from) : 0;
    const ex = !!s.aiOpen, has = !!(s.aiQ || '').trim(), SP = 'cubic-bezier(.175,.885,.32,1.275)';
    const ai = {
      aiRef: this.aiRef, aiQ: s.aiQ || '', curNoShort: String(s.cur + 1).padStart(2, '0'),
      aiMaxW: ex ? '100%' : '260px', aiH: ex ? '132px' : '48px', aiR: ex ? '12px' : '24px', aiScanTop: ex ? '132px' : '-18px', aiScanOp: ex ? 0 : 0.9, aiScanTr: ex ? 'top .9s cubic-bezier(.2,0,0,1),opacity .9s ease-in' : 'none', aiSys: has ? 'INPUT · ' + s.aiQ.trim().length + ' CH' : 'SYS · READY',
      aiSh: ex ? '0 0 0 1px rgba(243,115,33,.45),0 10px 30px -10px rgba(243,115,33,.35),inset 0 0 24px rgba(63,224,197,.05)' : '0 0 0 1px #232b31',
      aiLineOp: ex ? 1 : 0, aiPhOp: ex ? 0 : 1, aiPhTf: ex ? 'scale(1.04) translateY(4px)' : 'none', aiInOp: ex ? 1 : 0, aiInTf: ex ? 'none' : 'scale(.96) translateY(-4px)', aiBarTf: ex ? 'none' : 'translateY(8px)', aiBlurF: ex ? 'none' : 'blur(3px)', aiPe: ex ? 'auto' : 'none',
      aiModeKo: s.aiMode ? '정밀 수정' : '빠른 수정', aiBar2: 1, aiBar3: s.aiMode ? 1 : 0.3, aiScopeKo: s.aiAll ? '이 구간 전체' : '이 단계만',
      aiBtnBg: has ? '#f37321' : 'rgba(243,115,33,.14)', aiBtnC: has ? '#ffffff' : '#f37321', aiBtnSh: has ? '0 0 14px rgba(243,115,33,.6)' : 'none',
      aiArrOp: has ? 1 : 0, aiArrTf: has ? 'none' : 'scale(.5) rotate(45deg)', aiDotOp: has ? 0 : 1, aiDotTf: has ? 'scale(.5) rotate(-45deg)' : 'none',
      aiMsgOn: !!s.aiMsg, aiMsg: s.aiMsg || '',
      keep: e => e.preventDefault(),
      aiWake: e => { if (!ex) { this.updateReferenceState({ aiOpen: true }); this.delay(() => this.aiRef.current && this.aiRef.current.focus(), 60); } else if (e.target !== this.aiRef.current) { e.preventDefault(); this.aiRef.current && this.aiRef.current.focus(); } },
      aiType: e => this.updateReferenceState({ aiQ: e.target.value }),
      aiBlur: () => { if (!(this.referenceState.aiQ || '').trim()) this.updateReferenceState({ aiOpen: false }); },
      aiKey: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.aiGo(); } if (e.key === 'Escape') { this.updateReferenceState({ aiOpen: false, aiQ: '' }); e.target.blur(); } },
      aiSend: () => { if (has) this.aiGo(); else { this.updateReferenceState({ aiOpen: true }); this.delay(() => this.aiRef.current && this.aiRef.current.focus(), 60); } },
      aiModeTog: () => this.updateReferenceState({ aiMode: !s.aiMode }), aiScopeTog: () => this.updateReferenceState({ aiAll: !s.aiAll }), aiLib: () => { this.closePositionEdit(); this.updateReferenceState({ tab: 'lib' }); }
    };
    return {
      ...ai,
      scale: s.scale, cvRef: this.cvRef, ovRef: this.ovRef, loading: s.loading,
      onDown: e => this.camDown(e), onWheel: e => this.camWheel(e), noMenu: e => e.preventDefault(),
      pages: PG.map((k, i) => ({ go: () => { if (i !== 3 && i >= 1) this.toPage([-1, 3, 20, 21, 23, 24, 2][i]); }, cur: i === 3 || i < 1 ? 'default' : 'pointer', ko: k, n: String(i + 1).padStart(2, '0'), bg: i === 3 ? O : 'transparent', c: i === 3 ? '#ffffff' : i < 3 ? '#c3cbd0' : '#6c767d', w: i === 3 ? 700 : 400 })),
      lkRef: this.lkRef, lkOn: !!s.lk, lkHintOn: (!!s.lk && !s.lkMsg && !this.lkIv) || (s.drag != null && s.over != null), lkDragHint: s.drag != null && s.over != null, lkHint: (s.drag != null && s.over != null) ? '미리보기 · 놓으면 이 순서로 바뀝니다' : s.lkFocusOn ? this.lkSubName(s.lkFocus) + ' · 번호를 끌어 다른 번호에 놓으면 그 뒤로 이어집니다 · 번호를 누르면 그 단계로 이동, 다시 누르면 추가·삭제' : '번호를 누르면 그 묶음의 순서가 주황색으로 나옵니다', lkFocusOn: !!s.lkFocusOn, lkAllSub: () => this.updateReferenceState({ lkFocusOn: false, lkMenu: null, cur: (s.plan[s.si] || []).length - 1 }, () => this.show(false)), lkTog: () => this.lkToggle(), lkBg: s.lk ? '#f37321' : '#141a1f', lkC: s.lk ? '#ffffff' : '#e8ecef', lkBd: s.lk ? '#f37321' : 'transparent', lkTools: (s.plan ? this.lkTools(s.plan[s.si] || []) : 0) + '회',
      lkAll: () => this.openSequenceReview(arr),
      lkMsgOn: !!s.lkMsg, lkMsgC: s.lkMsg ? s.lkMsg.c : '#f37321', lkMsgT: s.lkMsg ? s.lkMsg.t : '', lkMsgD: s.lkMsg ? s.lkMsg.d : '', lkHintFix: s.lkMsg?.hint || '', lkReviewOn: !!s.lkMsg?.review, lkReview: () => this.acceptContactReview(s.lkMsg?.index, s.lkMsg?.review), lkBadOn: !!(s.lkMsg?.bad && !s.lkMsg.checked), lkOkOn: !!(s.lkMsg && (!s.lkMsg.bad || s.lkMsg.checked)), lkFixOn: !!(s.lkMsg && s.lkMsg.fix >= 0 && s.lkMsg.fixT), lkFixT: s.lkMsg ? s.lkMsg.fixT : '',
      lkFix: () => { const m = s.lkMsg, arr = s.plan[s.si], bad = s.lkBad; if (!m || bad < 0) return; this.updateReferenceState({ lkMsg: null }); this.lkLink(m.fix, bad); },
      lkKeep: () => this.updateReferenceState({ lkMsg: null, lkBad: -1, lkLit: (s.plan[s.si] || []).length - 1 }), lkUndo: () => { this.undo(); this.updateReferenceState({ lkMsg: null, lkBad: -1, lkImp: {}, lkLit: (s.plan[s.si] || []).length - 1 }); }, lkClose: () => this.updateReferenceState({ lkMsg: null }),
      ...this.tmVals(s, arr, cur, ko, thU), secs, hdrOn: !true, stH: true ? 1008 : 1080, stRows: true ? 'minmax(0,1fr)' : '72px minmax(0,1fr)', addStep: () => {}, tidyOn: false, tidyOff: true, tidyTxt: arr ? '번호 정리 · 추가 ' + this.tidyN(arr).a + ' · 삭제 ' + this.tidyN(arr).d : '', tidy: () => this.tidy(false), goPrev: () => this.toPage(20), goNext: () => { this.tidy(true); this.toPage(23); },
      curNo: this.lbl(arr, s.cur) + ' / ' + String(arr.length).padStart(2, '0'), curTag: cur && cur.t === 'fasten' ? '체결' : '놓기', curKo: cur ? (cur.sw ? cur.sw.ko : ko(cur.part)) + (cur.t === 'fasten' ? ' 체결' : ' 놓기') : '', curWarnOn: !!currentIssue, curWarn: currentIssue?.msg || '',
      curWarnTitle: this.lbl(arr, s.cur) + '번 단계 확인',
      curWarnC: currentIssue?.review ? '#ffc857' : '#ffc2c7',
      curWarnBg: currentIssue?.review ? 'rgba(255,200,87,.09)' : 'rgba(255,107,119,.1)',
      curReviewOn: !!currentIssue?.review, curReview: () => this.acceptContactReview(s.cur, currentIssue?.review),
      curHint: currentIssue && cur ? (currentIssue.review ? '도면에서 체결 대상과 조립 순서를 확인해 주세요.'
        : s.lkMsg?.checked && s.lkBad === s.cur ? s.lkMsg.hint : this.stepFixHint(cur)) : '',
      moreIssues: issues.length > 1, nextIssue: () => this.showStepIssue(arr, nextProblem, checks[nextProblem]), ...this.stepActionVals(s, cur), ...this.positionEditorVals(s, cur),
      gzRef: this.gzRef, gzTxt: '위치 수정', gzX: e => this.gzStart('x', e), gzY: e => this.gzStart('y', e), gzZ: e => this.gzStart('z', e),
      aiSum: '118개 → ' + total + '단계', warnTxt: wN ? '조립 불가 ' + wN + '건' : '확인할 것 없음', warnC: wN ? '#ff6b77' : '#3fe0c5', warnGo: () => { const k = Object.keys(W)[0]; if (k != null) this.pick(s.si, +k, false); },
      undo: () => this.undo(), undoC: s.hist ? '#ffffff' : '#6c767d',
      rfOn: false, rfTxt: rf ? (rf.pos ? '위치를 고쳤습니다. ' : '순서를 바꿨습니다. ') + '뒤 ' + rfN + '단계를 다시 맞출까요?' : '', rfYes: () => { const from = rf.from; this.setPlan(a => this.aiSort(a, from), 'AI가 뒤 ' + rfN + '단계를 다시 정리했습니다'); }, rfNo: () => this.updateReferenceState({ rf: null }),
      toastOn: !!s.toast, toast: s.toast,
      dropOver: e => { if (this._lib) e.preventDefault(); }, dropLib: e => { e.preventDefault(); const k = this._lib; this._lib = null; if (!k) return; this.libIns(k); }, _dropOld: () => { const k = null; if (!k) return; const n = this.pr.sections[s.si].idx.filter(i => this.pr.pieces[i].part === k).length || 1; let at = arr.length; const y = this.avgY(s.si, k); for (let i = 0; i < arr.length; i++) if (arr[i].t === 'place' && this.avgY(s.si, arr[i].part) > y + 1) { at = i; break; } const ins = this._insAt; if (ins != null) { at = ins.at; this._insAt = null; } const fill = ins && ins.fill && this.referenceState.plan[this.referenceState.si][at] && this.referenceState.plan[this.referenceState.si][at].blank; this.setPlan(a => { a.splice(at, fill ? 1 : 0, Object.assign({ t: 'place', part: k, q: n, g: ko(k) + '를 조립 위치에 놓으세요.', isNew: true }, ins && ins.sub !== undefined ? { sub: ins.sub } : {})); return a; }, 'AI가 ' + ko(k) + '를 단계 ' + String(at + 1).padStart(2, '0') + '에 넣었습니다'); this.updateReferenceState({ cur: at, tab: 'det' }); }, curGuide: cur ? cur.g : '', curParts: cur ? [{ ko: cur.sw ? cur.sw.ko : ko(cur.part), pn: cur.sw ? cur.sw.pn : pn(cur.part), q: cur.q, swOn: cur.t === 'fasten', swTog: () => this.updateReferenceState({ swOpen: !s.swOpen }), swTxt: s.swOpen ? '닫기' : '바꾸기', chg: !!cur.sw }] : [], ...this.swVals(s, cur, ko(cur ? cur.part : '')), curFasten: spec.length > 0, curSpec: spec.map(([k, v]) => ({ k, v })),
      delStep: () => this.markDel(s.cur),
      looks: s.sequenceReview ? [] : toolPanel ? [['3d', '실물'], ['wire', '와이어프레임'], ['ghost', '뒤 단계 보기']].map(([k, label]) => {
        const on = k === 'ghost' ? s.showFuture : s.look === k;
        return { ko: label, bg: on ? '#2a3238' : 'transparent', c: on ? '#ffffff' : '#8f9aa1',
          go: () => this.updateReferenceState(k === 'ghost' ? { showFuture: !s.showFuture } : { look: k }, () => this.show(false, false)) };
      }) : [{
        ko: s.showFuture ? '와이어프레임 끄기' : '와이어프레임 켜기',
        bg: s.showFuture ? '#2a3238' : 'transparent', c: s.showFuture ? '#ffffff' : '#c3cbd0',
        go: () => this.updateReferenceState(state => ({ showFuture: !state.showFuture }), () => this.show(false, false))
      }],
      prev: go(-1), next: go(1), play: () => this.togglePlayback(),
      playTxt: s.playing ? '❚❚ 일시정지' : '▶ 재생', playBg: s.playing ? '#53321d' : 'transparent',
      tabs: [['det', '단계 상세'], ['lib', '부품 라이브러리'], ...(toolReady ? [['tools', '도구 라이브러리']] : [])].map(([k, l]) => ({ ko: l, c: s.tab === k ? '#ffffff' : '#8f9aa1', w: s.tab === k ? 700 : 400, line: s.tab === k ? O : 'transparent', go: () => { if (k !== s.tab) { if (k === 'tools') this.openToolReview(true); else this.changeStepTab(k); } } })),
      tabDet: s.tab === 'det' || (s.tab === 'tools' && !toolReady), tabLib: s.tab === 'lib', showStepChat: !toolPanel, toolPanel,
      canReviewTools: this.fasteningSteps(s).length > 0, openToolReview: () => this.openToolReview(), toolReviewBg: toolPanel ? '#2a3238' : 'transparent',
      lib: pr ? [...new Set(pr.pieces.map(p => p.part))].slice(0, 12).map(k => ({ ko: ko(k), pn: pn(k), th: s.libTh && s.libTh[k] ? 'url(' + s.libTh[k] + ')' : 'none', ds: e => { this._lib = k; e.dataTransfer.effectAllowed = 'copy'; }, pk: () => this.libIns(k), sh: this._insAt ? 'inset 0 0 0 1px rgba(243,115,33,.55)' : 'none' })) : [],
      gridCols: '380px minmax(0,1fr) 400px', listVis: s.listOff ? 'hidden' : 'visible', listTxt: s.listOff ? '☰ 목록 보기 (L)' : '☰ 목록 접기 (L)', listTog: () => this.updateReferenceState({ listOff: !s.listOff }),
      stTxt: s.confirmed ? '확정됨 · ' + arr.length + '단계'
        : s.sequenceReview ? '전체 순서 · ' + arr.filter(step => !step.del).length + '단계' : '편집 중',
      issueOn: issues.length > 0, issueOff: issues.length === 0,
      sequenceAdviceOn: !!advice,
      sequenceAdviceText: advice?.status === 'pending' ? '단계 순서와 형상 검토 결과를 확인 중입니다.'
        : advice?.status === 'unavailable' ? '로컬 Qwen에 연결되지 않았습니다. 형상 검토 결과를 확인할 수 있습니다.'
          : (advice?.count < advice?.total ? advice.count + '/' + advice.total + '단계 요약 · ' : '') + (advice?.items.length ? '참고 의견 ' + advice.items.length + '건' : '추가 의견 없음'),
      sequenceAdviceRows: (advice?.items || []).flatMap(item => arr[item.index] ? [{
        label: this.lbl(arr, item.index) + '번 · ' + this.lkKo(arr[item.index]), reason: item.reason,
        go: () => this.pick(s.si, item.index, false)
      }] : []),
      batchReviewOn: !!snapshot && reviews.length > 1,
      batchReviewOpen: !!s.reviewBatchOpen,
      batchReviewLabel: '확인 필요 ' + reviews.length + '건 함께 보기',
      toggleBatchReview: () => this.updateReferenceState({ reviewBatchOpen: !s.reviewBatchOpen }),
      batchReviewRows: s.reviewBatchOpen ? reviews.map(i => ({ label: this.lbl(arr, i) + '번 · ' + this.lkKo(arr[i]), message: checks[i].msg, go: () => this.showStepIssue(arr, i, checks[i]) })) : [],
      acceptBatchReview: () => this.acceptContactReviews(),
      issueTxt: problems.length ? '순서 검토 ' + problems.length + '건 보기' + (reviews.length ? ' · 확인 ' + reviews.length + '건' : '')
        : '확인 필요 ' + reviews.length + '건 보기',
      firstIssue: () => this.showStepIssue(arr, issues[0], checks[issues[0]]),
      stC: problems.length ? '#ff6b77' : reviews.length ? '#ffc857' : snapshot || s.confirmed ? '#3fe0c5' : '#8f9aa1',
      stBd: problems.length ? '#ff6b77' : reviews.length ? '#9c752b' : snapshot || s.confirmed ? 'rgba(63,224,197,.45)' : '#38444d',
      cfBg: s.confirmed ? '#1a2021' : '#f37321',
      cfC: s.confirmed ? '#5d676e' : '#ffffff',
      sequenceReview: !!s.sequenceReview,
      sequenceEdit: !s.sequenceReview,
      closeReview: () => this.closeSequenceReview(),
      cfDisabled: !arr.some(step => !step.del) || !!s.confirmed || (!!s.sequenceReview && !snapshot),
      cfCur: s.confirmed ? 'default' : 'pointer',
      confirm: () => s.sequenceReview ? this.confirmSequence() : this.openSequenceReview(arr),
      cfTxt: s.confirmed ? '확정됨' : s.sequenceReview ? '이 순서 확정' : '검증', savedTxt: s.savedAt ? '자동 저장 ' + s.savedAt : ''
    };
  }

  render() { const v = this.renderVals(); return <><SourceNode as="div" data-screen-label={"04 조립 순서 · 번호 잇기 시안"} $style={{"position":"absolute","inset":"0","display":"flex","alignItems":"center","justifyContent":"center","background":"#0a0d10"}}><SourceNode as="div" $style={{"width":"1920px","height":String(v.stH) + "px","flex":"none","transform":"scale(" + String(v.scale) + ")","transformOrigin":"center","position":"relative","display":"grid","gridTemplateRows":v.stRows,"fontFamily":"NexonLv2Gothic,sans-serif","color":"#e8ecef","background":"#0a0d10"}}>{(v.hdrOn) ? <><SourceNode as="div" $style={{"position":"relative","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"28px","padding":"0 28px","background":"#0d1114","borderBottom":"1px solid #1a2026"}}><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"5px"}}><SourceNode as="span" $style={{"fontSize":"20px","fontWeight":"700","color":"#ffffff","lineHeight":"1"}}>{"도면 업데이트"}</SourceNode><SourceNode as="span" $style={{"font":"400 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#8f9aa1"}}>{"shaper_asm_rev_b.step"}</SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"50%","top":"50%","transform":"translate(-50%,-50%)","display":"flex","alignItems":"center","gap":"6px"}}>{(v.pages ?? []).map((p, index) => <React.Fragment key={index}><SourceNode as="div" onClick={p.go} $style={{"cursor":p.cur,"display":"flex","alignItems":"center","gap":"8px","padding":"8px 12px","borderRadius":"999px","background":p.bg,"color":p.c,"fontSize":"14px","fontWeight":"400","whiteSpace":"nowrap"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); p.go?.(event); } }}><SourceNode as="span" $style={{"font":"700 12px/1 var(--font-mono),'JetBrains Mono',monospace","opacity":".8"}}>{p.n}</SourceNode>{p.ko}</SourceNode></React.Fragment>)}</SourceNode><SourceNode as="a" target={"_top"} href={"/training"} $style={{"color":"#c3cbd0","textDecoration":"none","fontSize":"13px","whiteSpace":"nowrap"}}>{"← 교육 선택"}</SourceNode></SourceNode></> : null}<SourceNode as="div" $style={{"display":"grid","gridTemplateColumns":v.gridCols,"minHeight":"0"}}><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","minHeight":"0","minWidth":"0","overflow":"hidden","visibility":v.listVis,"background":"#0d1114","borderRight":"1px solid #1a2026"}}>{(v.notTm) ? <><SourceNode as="button" type={"button"} onClick={v.goPrev} $style={{"visibility":"visible","alignSelf":"flex-start","margin":"12px 16px 0","padding":"8px 12px","border":"1px solid #35414a","borderRadius":"8px","background":"#141a1f","color":"#e8ecef","font":"inherit","fontSize":"14px","cursor":"pointer"}}>{"← 03 조립도"}</SourceNode></> : null}<SourceNode as="div" $style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"20px 20px 12px"}}><SourceNode as="span" $style={{"fontSize":"15px","fontWeight":"700","color":"#ffffff","whiteSpace":"nowrap"}}>{v.listTitle}</SourceNode><SourceNode as="div" $style={{"display":"flex","alignItems":"center","gap":"8px"}}>{(v.tidyOn) ? <><SourceNode as="div" onClick={v.tidy} $style={{"padding":"6px 10px","borderRadius":"6px","background":"#f37321","color":"#ffffff","cursor":"pointer","fontSize":"12px","fontWeight":"700","whiteSpace":"nowrap"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.tidy?.(event); } }}>{v.tidyTxt}</SourceNode></> : null}<SourceNode as="div" onClick={v.undo} title={"Ctrl+Z"} $style={{"whiteSpace":"nowrap","padding":"6px 10px","borderRadius":"6px","background":"#141a1f","color":v.undoC,"cursor":"pointer","fontSize":"12px"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.undo?.(event); } }}>{"↶ 되돌리기"}</SourceNode></SourceNode></SourceNode><SourceNode as="div" $style={{"flex":"1","minHeight":"0","overflowY":"auto","overflowX":"hidden","scrollbarWidth":"none","display":"flex","flexDirection":"column","gap":"2px","padding":"0 10px 10px"}}>{(v.secs ?? []).map((g, index) => <React.Fragment key={index}><SourceNode as="div" onClick={g.tog} $style={{"display":"flex","alignItems":"center","gap":"10px","padding":"12px 10px","cursor":"pointer","borderRadius":"6px"}} $hover={"background:#141a1f"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); g.tog?.(event); } }}><SourceNode as="span" $style={{"fontSize":"11px","color":"#8f9aa1","width":"10px"}}>{g.arrow}</SourceNode><SourceNode as="span" $style={{"flex":"1","fontSize":"14px","fontWeight":"700","color":g.c}}>{g.ko}</SourceNode><SourceNode as="span" $style={{"font":"400 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#8f9aa1"}}>{g.n}</SourceNode></SourceNode>{(g.open) ? <><SourceNode as="div" $style={{"position":"relative","display":"flex","flexDirection":"column","gap":"4px","padding":"2px 0 6px"}}><SourceNode as="div" $style={{"position":"absolute","left":"39px","top":"24px","bottom":"24px","width":"2px","background":"#232b31"}}></SourceNode>{(g.rows ?? []).map((r, index) => <React.Fragment key={index}>{(r.subOn) ? <><SourceNode as="div" onClick={r.subTog} $style={{"position":"relative","zIndex":"1","display":"flex","alignItems":"center","gap":"8px","margin":"10px 0 2px 0","padding":"8px 10px","borderRadius":"6px","background":"#11171b","cursor":"pointer"}} $hover={"background:#161d22"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); r.subTog?.(event); } }}><SourceNode as="span" $style={{"fontSize":"10px","color":"#8f9aa1","width":"10px"}}>{r.subArrow}</SourceNode><SourceNode as="span" $style={{"font":"700 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}}>{r.subNo}</SourceNode><SourceNode as="span" $style={{"flex":"1","minWidth":"0","fontSize":"13px","fontWeight":"700","color":"#e8ecef","textWrap":"pretty"}}>{r.subKo}</SourceNode><SourceNode as="span" $style={{"font":"400 11px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#8f9aa1"}}>{r.subN}</SourceNode></SourceNode></> : null}{(r.vis) ? <><SourceNode as="div" onClick={r.go} data-row={"1"} aria-current={r.selected} $style={{"position":"relative","display":"flex","alignItems":"center","gap":"14px","padding":r.pad,"borderRadius":"10px","cursor":"pointer","background":r.bg,"boxShadow":r.tsh,"opacity":r.op,"transition":"background .2s ease,opacity .2s ease"}} $hover={r.hover} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); r.go?.(event); } }}>{(r.dropBefore) ? <><SourceNode as="span" data-step-insertion-line={""} aria-hidden={"true"} $style={{"position":"absolute","top":"0","left":"0","right":"0","height":"2px","background":"#f37321","pointerEvents":"none"}}></SourceNode></> : null}<SourceNode as="span" $style={{"flex":"none","width":"22px","marginRight":"-6px","font":"700 13px/1 var(--font-mono),'JetBrains Mono',monospace","color":r.numC,"textAlign":"right"}}>{r.num}</SourceNode>{(r.big) ? <><SourceNode as="div" $style={{"position":"relative","flex":"none","width":"42px","height":"40px","backgroundImage":r.th,"backgroundSize":"contain","backgroundPosition":"center","backgroundRepeat":"no-repeat"}}>{(r.done) ? <><SourceNode as="span" $style={{"position":"absolute","inset":"0","display":"flex","alignItems":"center","justifyContent":"center","color":"#ffffff","fontSize":"20px","fontWeight":"700"}}>{"✓"}</SourceNode></> : null}</SourceNode></> : null}{(r.small) ? <><SourceNode as="div" title={"체결"} $style={{"flex":"none","width":"42px","display":"flex","justifyContent":"center","color":"#ffb27a"}}><SourceNode as="svg" data-link-icon={"vertical"} aria-hidden={"true"} width={"22"} height={"22"} viewBox={"-1 -1 26 26"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} $style={{"display":"block","flex":"none"}}><SourceNode as="g" transform={"rotate(-45 12 12)"}><SourceNode as="path" d={"M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"}></SourceNode><SourceNode as="path" d={"M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"}></SourceNode></SourceNode></SourceNode></SourceNode></> : null}<SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0","flex":"1"}}><SourceNode as="span" data-step-part-name={""} $style={{"fontSize":r.fs,"fontWeight":"700","color":"#ffffff","lineHeight":"1.3","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>{r.ko}</SourceNode><SourceNode as="span" $style={{"fontSize":"12px","color":r.sc}}>{r.sub}</SourceNode></SourceNode><SourceNode as="span" $style={{"flex":"none","font":"700 14px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#e8ecef"}}>{"×"}{r.q}</SourceNode></SourceNode></> : null}</React.Fragment>)}</SourceNode></> : null}</React.Fragment>)}</SourceNode></SourceNode><SourceNode as="div" onDragOver={v.dropOver} onDrop={v.dropLib} $style={{"display":"grid","gridTemplateRows":"74px minmax(0,1fr)","minWidth":"0","minHeight":"0","background":"radial-gradient(ellipse at 50% 58%,#222c33 0%,#141a1f 55%,#0d1114 100%)"}}><SourceNode as="div" data-step-toolbar={""} $style={{"display":"flex","minWidth":"0","alignItems":"center","gap":"16px","padding":"0 18px","background":"#11171b","borderBottom":"1px solid #27313a"}}><SourceNode as="div" $style={{"flex":"1","minWidth":"0","display":"flex","flexDirection":"column","gap":"6px"}}><SourceNode as="span" $style={{"font":"700 13px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}} data-current-step={""}>{"STEP "}{v.curNo}{" · "}{v.curTag}</SourceNode><SourceNode as="span" data-step-name={""} title={v.curKo} $style={{"display":"block","fontSize":"22px","fontWeight":"700","color":"#ffffff","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>{v.curKo}</SourceNode></SourceNode>{(v.notTm) ? <><SourceNode as="div" data-step-validation={""} $style={{"flex":"none","display":"flex","alignItems":"center","gap":"10px","padding":"8px 8px 8px 16px","borderRadius":"999px","background":"rgba(13,17,20,.92)","boxShadow":"inset 0 0 0 1px " + String(v.stBd)}}><SourceNode as="span" $style={{"width":"8px","height":"8px","borderRadius":"50%","background":v.stC}}></SourceNode>{(v.issueOn) ? <><SourceNode as="button" type={"button"} onClick={v.firstIssue} $style={{"border":"0","borderRadius":"6px","background":"transparent","color":v.stC,"font":"inherit","fontSize":"14px","whiteSpace":"nowrap","cursor":"pointer","textDecoration":"underline"}}>{v.issueTxt}</SourceNode></> : null}{(v.issueOff) ? <><SourceNode as="span" $style={{"fontSize":"14px","color":"#ffffff","whiteSpace":"nowrap"}}>{v.stTxt}</SourceNode></> : null}<SourceNode as="span" $style={{"font":"400 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#8f9aa1","whiteSpace":"nowrap"}}>{v.savedTxt}</SourceNode>{(v.sequenceReview) ? <><SourceNode as="button" type={"button"} onClick={v.closeReview} $style={{"padding":"7px 10px","border":"0","borderRadius":"999px","background":"#222b31","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer","whiteSpace":"nowrap"}}>{"편집으로"}</SourceNode></> : null}<SourceNode as="button" type={"button"} onClick={v.confirm} disabled={v.cfDisabled} $style={{"padding":"7px 14px","border":"0","borderRadius":"999px","background":v.cfBg,"color":v.cfC,"font":"inherit","fontSize":"13px","fontWeight":"700","cursor":v.cfCur,"whiteSpace":"nowrap"}}>{v.cfTxt}</SourceNode></SourceNode></> : null}<SourceNode as="div" data-step-view-controls={""} $style={{"flex":"none","display":"flex","gap":"2px","whiteSpace":"nowrap","padding":"3px","borderRadius":"8px","background":"rgba(13,17,20,.85)"}}>{(v.canReviewTools) ? <><SourceNode as="button" type={"button"} onClick={v.openToolReview} $style={{"padding":"7px 10px","border":"0","borderRadius":"6px","background":v.toolReviewBg,"color":"#e8ecef","font":"inherit","fontSize":"13px","whiteSpace":"nowrap","cursor":"pointer"}}>{"전체 공구 검토"}</SourceNode></> : null}{(v.looks ?? []).map((l, index) => <React.Fragment key={index}><SourceNode as="button" type={"button"} onClick={l.go} $style={{"padding":"7px 14px","border":"0","borderRadius":"6px","font":"inherit","fontSize":"13px","cursor":"pointer","background":l.bg,"color":l.c}}>{l.ko}</SourceNode></React.Fragment>)}<SourceNode as="span" $style={{"width":"1px","margin":"4px 2px","background":"#2a3238"}}></SourceNode><SourceNode as="button" type={"button"} onClick={v.play} $style={{"padding":"7px 14px","border":"0","borderRadius":"6px","background":v.playBg,"color":"#e8ecef","font":"inherit","fontSize":"13px","whiteSpace":"nowrap","cursor":"pointer"}}>{v.playTxt}</SourceNode></SourceNode></SourceNode><SourceNode as="div" data-step-viewport={""} data-sequence-review={v.sequenceReview} $style={{"position":"relative","minWidth":"0","minHeight":"0","overflow":"hidden"}}><SourceNode as="div" onClick={v.listTog} title={"L"} $style={{"position":"absolute","left":"20px","bottom":"104px","zIndex":"6","display":"flex","alignItems":"center","gap":"8px","padding":"9px 14px","borderRadius":"8px","background":"rgba(13,17,20,.9)","color":"#e8ecef","fontSize":"13px","cursor":"pointer","boxShadow":"inset 0 0 0 1px #2a333a"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.listTog?.(event); } }}>{v.listTxt}</SourceNode>{(v.notTm) ? <><SourceNode as="div" $style={{"position":"absolute","left":"20px","bottom":"56px","zIndex":"6","display":"flex","alignItems":"center","gap":"8px"}}>{(v.lkOn) ? <></> : null}</SourceNode>{(v.lkHintOn) ? <><SourceNode as="div" $style={{"position":"absolute","left":"50%","top":"78px","transform":"translateX(-50%)","zIndex":"6","padding":"10px 16px","borderRadius":"8px","background":"rgba(13,17,20,.9)","color":"#e8ecef","fontSize":"14px","whiteSpace":"nowrap"}}>{v.lkHint}</SourceNode></> : null}{(v.lkMsgOn) ? <><SourceNode as="div" $style={{"position":"absolute","left":"50%","bottom":"54px","transform":"translateX(-50%)","zIndex":"7","display":"flex","alignItems":"center","gap":"14px","padding":"12px 14px 12px 18px","borderRadius":"10px","background":"rgba(13,17,20,.95)","boxShadow":"inset 0 0 0 1px " + String(v.lkMsgC) + ",0 12px 32px rgba(0,0,0,.5)","width":"max-content","maxWidth":"calc(100% - 36px)","boxSizing":"border-box"}}><SourceNode as="span" $style={{"width":"9px","height":"9px","flex":"none","borderRadius":"50%","background":v.lkMsgC}}></SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0","overflowWrap":"anywhere"}}><SourceNode as="span" $style={{"fontSize":"15px","fontWeight":"700","color":v.lkMsgC}}>{v.lkMsgT}</SourceNode><SourceNode as="span" $style={{"fontSize":"13px","color":"#e8ecef","textWrap":"pretty"}}>{v.lkMsgD}</SourceNode>{(v.lkHintFix) ? <><SourceNode as="span" $style={{"color":"#ffd1b0","fontSize":"13px","lineHeight":"1.4"}}>{v.lkHintFix}</SourceNode></> : null}</SourceNode>{(v.lkReviewOn) ? <><SourceNode as="button" type={"button"} onClick={v.lkReview} $style={{"flex":"none","padding":"9px 14px","border":"0","borderRadius":"8px","background":"#ffc857","color":"#221a08","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","whiteSpace":"nowrap"}}>{"도면 확인 · 이 순서 유지"}</SourceNode></> : null}{(v.lkFixOn) ? <><SourceNode as="div" onClick={v.lkFix} $style={{"flex":"none","padding":"9px 14px","borderRadius":"8px","background":"#f37321","color":"#ffffff","fontSize":"13px","fontWeight":"700","cursor":"pointer","whiteSpace":"nowrap"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.lkFix?.(event); } }}>{v.lkFixT}</SourceNode></> : null}{(v.lkBadOn) ? <><SourceNode as="div" onClick={v.lkKeep} $style={{"flex":"none","padding":"9px 14px","borderRadius":"8px","background":"#141a1f","color":"#e8ecef","fontSize":"13px","cursor":"pointer","whiteSpace":"nowrap"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.lkKeep?.(event); } }}>{"그래도 적용"}</SourceNode><SourceNode as="div" onClick={v.lkUndo} $style={{"flex":"none","padding":"9px 14px","borderRadius":"8px","background":"#141a1f","color":"#e8ecef","fontSize":"13px","cursor":"pointer","whiteSpace":"nowrap"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.lkUndo?.(event); } }}>{"취소"}</SourceNode></> : null}{(v.lkOkOn) ? <><SourceNode as="div" onClick={v.lkClose} $style={{"flex":"none","padding":"9px 12px","borderRadius":"8px","color":"#8f9aa1","fontSize":"13px","cursor":"pointer"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.lkClose?.(event); } }}>{"닫기"}</SourceNode></> : null}</SourceNode></> : null}</> : null}<SourceNode as="div" onPointerDown={v.onDown} onWheel={v.onWheel} onContextMenu={v.noMenu} $style={{"position":"absolute","inset":"0"}}><SourceNode as="canvas" ref={v.cvRef} $style={{"width":"100%","height":"100%","display":"block"}}></SourceNode><SourceNode as="div" ref={v.ovRef} $style={{"position":"absolute","inset":"0","pointerEvents":"none","overflow":"hidden"}}></SourceNode><SourceNode as="div" ref={v.lkRef} $style={{"position":"absolute","inset":"0","pointerEvents":"none","overflow":"hidden","display":v.lkD}}></SourceNode><SourceNode as="div" ref={v.gzRef} $style={{"position":"absolute","left":"0","top":"0","width":"0","height":"0","display":"none","pointerEvents":"none"}}><SourceNode as="div" $style={{"position":"absolute","left":"-60px","top":"-60px","width":"120px","height":"120px","borderRadius":"50%","boxShadow":"0 0 0 1px rgba(243,115,33,.35),0 0 24px rgba(243,115,33,.18)"}}></SourceNode><SourceNode as="div" data-ax={"x"} onPointerDown={v.gzX} title={"좌우(X) 이동"} $style={{"position":"absolute","left":"0","top":"0","width":"88px","height":"20px","transformOrigin":"0 50%","cursor":"grab","pointerEvents":"auto","display":"flex","alignItems":"center"}}><SourceNode as="span" $style={{"width":"10px"}}></SourceNode><SourceNode as="span" $style={{"flex":"1","height":"2px","background":"#f37321","boxShadow":"0 0 6px #f37321"}}></SourceNode><SourceNode as="span" $style={{"width":"0","height":"0","borderTop":"6px solid transparent","borderBottom":"6px solid transparent","borderLeft":"11px solid #f37321"}}></SourceNode><SourceNode as="span" data-lab={"1"} $style={{"position":"absolute","left":"96px","top":"3px","font":"700 11px/14px var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}}>{"X"}</SourceNode></SourceNode><SourceNode as="div" data-ax={"y"} onPointerDown={v.gzY} title={"위아래(Y) 이동"} $style={{"position":"absolute","left":"0","top":"0","width":"88px","height":"20px","transformOrigin":"0 50%","cursor":"grab","pointerEvents":"auto","display":"flex","alignItems":"center"}}><SourceNode as="span" $style={{"width":"10px"}}></SourceNode><SourceNode as="span" $style={{"flex":"1","height":"2px","background":"#3fe0c5","boxShadow":"0 0 6px #3fe0c5"}}></SourceNode><SourceNode as="span" $style={{"width":"0","height":"0","borderTop":"6px solid transparent","borderBottom":"6px solid transparent","borderLeft":"11px solid #3fe0c5"}}></SourceNode><SourceNode as="span" data-lab={"1"} $style={{"position":"absolute","left":"96px","top":"3px","font":"700 11px/14px var(--font-mono),'JetBrains Mono',monospace","color":"#3fe0c5"}}>{"Y"}</SourceNode></SourceNode><SourceNode as="div" data-ax={"z"} onPointerDown={v.gzZ} title={"앞뒤(Z) 이동"} $style={{"position":"absolute","left":"0","top":"0","width":"88px","height":"20px","transformOrigin":"0 50%","cursor":"grab","pointerEvents":"auto","display":"flex","alignItems":"center"}}><SourceNode as="span" $style={{"width":"10px"}}></SourceNode><SourceNode as="span" $style={{"flex":"1","height":"2px","background":"#e8ecef","boxShadow":"0 0 6px #e8ecef"}}></SourceNode><SourceNode as="span" $style={{"width":"0","height":"0","borderTop":"6px solid transparent","borderBottom":"6px solid transparent","borderLeft":"11px solid #e8ecef"}}></SourceNode><SourceNode as="span" data-lab={"1"} $style={{"position":"absolute","left":"96px","top":"3px","font":"700 11px/14px var(--font-mono),'JetBrains Mono',monospace","color":"#e8ecef"}}>{"Z"}</SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"-5px","top":"-5px","width":"10px","height":"10px","borderRadius":"2px","background":"#ffffff","boxShadow":"0 0 8px #f37321"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"18px","top":"16px","padding":"5px 9px","borderRadius":"4px","background":"rgba(10,13,16,.85)","boxShadow":"inset 0 0 0 1px rgba(243,115,33,.4)","font":"500 11px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321","whiteSpace":"nowrap"}}>{v.gzTxt}</SourceNode></SourceNode></SourceNode>{(v.loading) ? <><SourceNode as="div" $style={{"position":"absolute","inset":"0","display":"flex","alignItems":"center","justifyContent":"center","color":"#8f9aa1","fontSize":"15px","pointerEvents":"none"}}>{"3D 모델 불러오는 중"}</SourceNode></> : null}<SourceNode as="div" $style={{"position":"absolute","left":"24px","bottom":"22px","display":"flex","alignItems":"center","gap":"18px","fontSize":"13px","color":"#c3cbd0","pointerEvents":"none"}}><SourceNode as="span" $style={{"display":"flex","alignItems":"center","gap":"6px"}}><SourceNode as="span" $style={{"width":"10px","height":"10px","borderRadius":"2px","background":"#f37321"}}></SourceNode>{"이번 단계"}</SourceNode>{(v.sequenceReview) ? <><SourceNode as="span" $style={{"color":"#8f9aa1"}}>{"번호를 눌러 단계 확인"}</SourceNode><SourceNode as="span" $style={{"color":"#ffc857"}}>{"확인 필요"}</SourceNode><SourceNode as="span" $style={{"color":"#ff6b77"}}>{"순서 검토"}</SourceNode></> : null}{(v.sequenceEdit) ? <><SourceNode as="span" $style={{"display":"flex","alignItems":"center","gap":"6px"}}><SourceNode as="span" $style={{"width":"10px","height":"10px","borderRadius":"2px","background":"#a9b1b6"}}></SourceNode>{"끝난 단계"}</SourceNode></> : null}<SourceNode as="span" $style={{"color":"#8f9aa1"}}>{"끌기 회전 · 우클릭 끌기 이동 · 휠 확대"}</SourceNode></SourceNode>{(v.rfOn) ? <><SourceNode as="div" $style={{"position":"absolute","left":"50%","bottom":"24px","transform":"translateX(-50%)","display":"flex","alignItems":"center","gap":"14px","padding":"10px 10px 10px 18px","borderRadius":"10px","background":"rgba(13,17,20,.94)","boxShadow":"inset 0 0 0 1px rgba(63,224,197,.35),0 12px 30px -12px rgba(0,0,0,.8)"}}><SourceNode as="span" $style={{"width":"6px","height":"6px","borderRadius":"50%","background":"#3fe0c5","boxShadow":"0 0 8px #3fe0c5"}}></SourceNode><SourceNode as="span" $style={{"fontSize":"14px","color":"#ffffff","whiteSpace":"nowrap"}}>{v.rfTxt}</SourceNode><SourceNode as="div" onClick={v.rfYes} $style={{"padding":"9px 14px","borderRadius":"6px","background":"#3fe0c5","color":"#06080a","fontSize":"13px","fontWeight":"700","cursor":"pointer","whiteSpace":"nowrap"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.rfYes?.(event); } }}>{"AI로 다시 정리"}</SourceNode><SourceNode as="div" onClick={v.rfNo} $style={{"padding":"9px 12px","borderRadius":"6px","color":"#c3cbd0","fontSize":"13px","cursor":"pointer","whiteSpace":"nowrap"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.rfNo?.(event); } }}>{"그대로 두기"}</SourceNode></SourceNode></> : null}{(v.toastOn) ? <><SourceNode as="div" $style={{"position":"absolute","left":"50%","top":"76px","transform":"translateX(-50%)","padding":"9px 16px","borderRadius":"8px","background":"rgba(13,17,20,.92)","boxShadow":"inset 0 0 0 1px rgba(63,224,197,.3)","color":"#c9f5ec","fontSize":"13px","whiteSpace":"nowrap"}}>{v.toast}</SourceNode></> : null}</SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","minHeight":"0","background":"#0d1114","borderLeft":"1px solid #1a2026"}}><SourceNode as="div" $style={{"display":"flex","gap":"4px","padding":"16px 20px 0"}}>{(v.tabs ?? []).map((t, index) => <React.Fragment key={index}><SourceNode as="div" onClick={t.go} $style={{"padding":"10px 4px","marginRight":"16px","fontSize":"15px","cursor":"pointer","color":t.c,"fontWeight":t.w,"boxShadow":"inset 0 -2px 0 " + String(t.line)}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); t.go?.(event); } }}>{t.ko}</SourceNode></React.Fragment>)}</SourceNode><SourceNode as="div" $style={{"height":"1px","background":"#1a2026"}}></SourceNode>{(v.tabDet) ? <><SourceNode as="div" $style={{"flex":"1","minHeight":"0","overflow":"auto","display":"flex","flexDirection":"column","gap":"22px","padding":"22px 20px"}}><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px"}}><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{"안내 문구"}</SourceNode><SourceNode as="div" contentEditable={"true"} $style={{"padding":"12px 14px","borderRadius":"8px","background":"#141a1f","fontSize":"15px","lineHeight":"1.55","color":"#ffffff","outline":"none"}} suppressContentEditableWarning={true}>{v.curGuide}</SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px"}}><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{"부품"}</SourceNode>{(v.curParts ?? []).map((p, index) => <React.Fragment key={index}><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px"}}><SourceNode as="div" $style={{"display":"flex","alignItems":"center","gap":"12px","padding":"10px 12px","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="span" $style={{"width":"8px","height":"8px","borderRadius":"2px","background":"#f37321"}}></SourceNode><SourceNode as="div" $style={{"flex":"1","minWidth":"0","display":"flex","flexDirection":"column","gap":"4px"}}><SourceNode as="span" data-step-full-part-name={""} $style={{"fontSize":"14px","color":"#ffffff","overflowWrap":"anywhere"}}>{p.ko}</SourceNode><SourceNode as="span" $style={{"overflowWrap":"anywhere","font":"400 11px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#8f9aa1"}}>{p.pn}</SourceNode></SourceNode><SourceNode as="span" $style={{"font":"700 14px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#ffffff"}}>{"×"}{p.q}</SourceNode>{(p.swOn) ? <><SourceNode as="span" onClick={p.swTog} $style={{"flex":"none","padding":"6px 10px","borderRadius":"6px","background":"#1e262c","color":"#c3cbd0","fontSize":"12px","cursor":"pointer"}} $hover={"background:#2a3238;color:#ffffff"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); p.swTog?.(event); } }}>{p.swTxt}</SourceNode></> : null}</SourceNode>{(v.swList) ? <><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"8px","borderRadius":"8px","background":"#0f1418"}}><SourceNode as="span" $style={{"padding":"2px 4px 4px","fontSize":"12px","color":"#8f9aa1"}}>{"바꿀 부품 · 고르기 전에는 바뀌지 않습니다"}</SourceNode><SourceNode as="div" $style={{"display":"grid","gridTemplateColumns":"repeat(2,minmax(0,1fr))","gap":"8px"}}>{(v.swRows ?? []).map((c, index) => <React.Fragment key={index}><SourceNode as="div" onClick={c.go} $style={{"display":"flex","flexDirection":"column","gap":"7px","padding":"10px","borderRadius":"8px","background":"#141a1f","boxShadow":"inset 0 0 0 1px " + String(c.bd),"cursor":"pointer"}} $hover={"background:#19222a"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); c.go?.(event); } }}><SourceNode as="div" $style={{"position":"relative","width":"100%","aspectRatio":"4/3","borderRadius":"6px","backgroundColor":"#0f1418","backgroundSize":"contain","backgroundRepeat":"no-repeat","backgroundPosition":"center","backgroundImage":c.th}}><SourceNode as="span" $style={{"position":"absolute","left":"6px","top":"6px","padding":"3px 6px","borderRadius":"4px","background":c.tagBg,"color":"#ffffff","fontSize":"11px","fontWeight":"700"}}>{c.tag}</SourceNode></SourceNode><SourceNode as="span" $style={{"fontSize":"13px","fontWeight":"700","color":"#ffffff","lineHeight":"1.3"}}>{c.ko}</SourceNode><SourceNode as="span" $style={{"fontSize":"11px","lineHeight":"1.4","color":c.nc,"textWrap":"pretty"}}>{c.note}</SourceNode><SourceNode as="div" $style={{"display":"flex","justifyContent":"space-between","gap":"6px","fontSize":"11px","color":"#c3cbd0"}}><SourceNode as="span">{c.tool}</SourceNode><SourceNode as="span" $style={{"fontFamily":"var(--font-mono),'JetBrains Mono',monospace"}}>{c.tq}</SourceNode></SourceNode></SourceNode></React.Fragment>)}</SourceNode></SourceNode></> : null}</SourceNode></React.Fragment>)}</SourceNode>{(v.actionPanel) ? <><SourceNode as="details" data-step-action={""} open={v.actionExpanded} $style={{"padding":"10px 12px","border":"1px solid #2b353e","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="summary" $style={{"fontSize":"13px","color":"#e8ecef","cursor":"pointer"}}>{v.actionTitle}</SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px","paddingTop":"8px"}}><SourceNode as="span" aria-live={"polite"} $style={{"color":"#c3cbd0","fontSize":"13px"}}>{v.actionSource}</SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"6px"}} aria-label={"조립 유형"} role={"group"}>{(v.actionChoices ?? []).map((a, index) => <React.Fragment key={index}><SourceNode as="button" type={"button"} aria-pressed={a.selected} onClick={a.go} $style={{"padding":"7px 12px","border":"1px solid " + String(a.border),"borderRadius":"6px","background":a.bg,"color":"#fff","font":"inherit","fontSize":"13px","cursor":"pointer"}}>{a.label}</SourceNode></React.Fragment>)}</SourceNode>{(v.actionFollowup) ? <><SourceNode as="button" type={"button"} onClick={v.addFollowup} $style={{"alignSelf":"flex-start","padding":"6px 9px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer"}}>{"후속 체결 단계 추가"}</SourceNode></> : null}</SourceNode></SourceNode></> : null}{(v.posCanEdit) ? <><SourceNode as="div" data-position-editor={""} $style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"12px","border":"1px solid #2b353e","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="strong" $style={{"fontSize":"14px","color":"#ffffff"}}>{"부품 위치"}</SourceNode><SourceNode as="span" data-position-status={""} aria-live={"polite"} $style={{"color":"#c3cbd0","fontSize":"13px"}}>{v.posStatus}</SourceNode>{(v.posClosed) ? <><SourceNode as="button" type={"button"} onClick={v.posOpen} $style={{"padding":"7px 10px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer","alignSelf":"flex-start"}}>{"위치 수정"}</SourceNode></> : null}{(v.posEditing) ? <><SourceNode as="span" $style={{"color":"#a7b2ba","fontSize":"12px","lineHeight":"1.45"}}>{"3D 화살표를 끌어 조정하세요. 위치 적용을 누르면 검증과 저장에 반영됩니다."}</SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>{(v.posCanCompare) ? <><SourceNode as="button" type={"button"} onClick={v.posCompare} $style={{"padding":"7px 10px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer"}}>{v.posCompareLabel}</SourceNode></> : null}{(v.posCanReset) ? <><SourceNode as="button" type={"button"} onClick={v.posReset} $style={{"padding":"7px 10px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer"}}>{"원래 위치로"}</SourceNode></> : null}</SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}><SourceNode as="button" type={"button"} onClick={v.posSave} disabled={v.posSaveDisabled} $style={{"padding":"7px 10px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer","background":v.posSaveBg}}>{"위치 적용"}</SourceNode><SourceNode as="button" type={"button"} onClick={v.posCancel} $style={{"padding":"7px 10px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer"}}>{"취소"}</SourceNode></SourceNode></> : null}</SourceNode></> : null}{(v.curFasten) ? <><SourceNode as="div" $style={{"display":"grid","gridTemplateColumns":"repeat(3,minmax(0,1fr))","gap":"8px"}}>{(v.curSpec ?? []).map((x, index) => <React.Fragment key={index}><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"12px","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{x.k}</SourceNode><SourceNode as="span" $style={{"fontSize":"15px","fontWeight":"700","color":"#ffffff"}}>{x.v}</SourceNode></SourceNode></React.Fragment>)}</SourceNode></> : null}{(v.sequenceAdviceOn) ? <><SourceNode as="div" data-sequence-advice={""} $style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","border":"1px solid #35414a","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="strong" $style={{"fontSize":"14px","color":"#e8ecef"}}>{"로컬 Qwen 검토 의견"}</SourceNode><SourceNode as="span" aria-live={"polite"} $style={{"color":"#aab6bf","fontSize":"12px"}}>{v.sequenceAdviceText}</SourceNode>{(v.sequenceAdviceRows ?? []).map((r, index) => <React.Fragment key={index}><SourceNode as="button" type={"button"} onClick={r.go} $style={{"display":"flex","flexDirection":"column","gap":"3px","padding":"6px 0","border":"0","background":"transparent","color":"#e8ecef","font":"inherit","fontSize":"13px","textAlign":"left","overflowWrap":"anywhere","cursor":"pointer"}}><SourceNode as="strong">{r.label}</SourceNode><SourceNode as="span" $style={{"color":"#b8c6d0"}}>{r.reason}</SourceNode></SourceNode></React.Fragment>)}</SourceNode></> : null}{(v.batchReviewOn) ? <><SourceNode as="div" data-contact-review-batch={""} $style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","border":"1px solid #51432c","borderRadius":"8px","background":"#211d15"}}><SourceNode as="button" type={"button"} onClick={v.toggleBatchReview} aria-expanded={v.batchReviewOpen} $style={{"alignSelf":"flex-start","padding":"6px 9px","border":"1px solid #685433","borderRadius":"6px","background":"#302618","color":"#ffe0a0","font":"inherit","fontSize":"13px","cursor":"pointer"}}>{v.batchReviewLabel}</SourceNode>{(v.batchReviewOpen) ? <>{(v.batchReviewRows ?? []).map((r, index) => <React.Fragment key={index}><SourceNode as="button" type={"button"} onClick={r.go} $style={{"display":"flex","flexDirection":"column","gap":"3px","padding":"6px 0","border":"0","background":"transparent","color":"#f6dfb1","font":"inherit","fontSize":"13px","textAlign":"left","overflowWrap":"anywhere","cursor":"pointer"}}><SourceNode as="strong">{r.label}</SourceNode><SourceNode as="span" $style={{"fontSize":"12px","color":"#d2c6ad"}}>{r.message}</SourceNode></SourceNode></React.Fragment>)}<SourceNode as="button" type={"button"} onClick={v.acceptBatchReview} $style={{"alignSelf":"flex-start","padding":"7px 9px","border":"0","borderRadius":"6px","background":"#ffc857","color":"#221a08","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}}>{"도면 대조 완료 · 표시된 순서 유지"}</SourceNode></> : null}</SourceNode></> : null}{(v.curWarnOn) ? <><SourceNode as="div" data-step-warning={""} $style={{"padding":"10px 12px","borderRadius":"8px","background":v.curWarnBg,"color":v.curWarnC,"fontSize":"13px","lineHeight":"1.5"}}><SourceNode as="strong" $style={{"display":"block","marginBottom":"4px"}}>{v.curWarnTitle}</SourceNode>{v.curWarn}{"\n            "}{(v.curHint) ? <><SourceNode as="p" $style={{"margin":"6px 0 0","color":"#e8ecef"}}>{v.curHint}</SourceNode></> : null}{(v.curReviewOn) ? <><SourceNode as="button" type={"button"} onClick={v.curReview} $style={{"display":"block","marginTop":"8px","padding":"7px 10px","border":"0","borderRadius":"6px","background":"#ffc857","color":"#221a08","font":"inherit","fontWeight":"700","cursor":"pointer"}}>{"도면 확인 · 이 순서 유지"}</SourceNode></> : null}{(v.moreIssues) ? <><SourceNode as="button" type={"button"} onClick={v.nextIssue} $style={{"marginTop":"8px","padding":"6px 9px","border":"1px solid #594b38","borderRadius":"6px","background":"#252017","color":v.curWarnC,"font":"inherit","cursor":"pointer"}}>{"다음 확인 항목 →"}</SourceNode></> : null}</SourceNode></> : null}</SourceNode></> : null}{(v.tabLib) ? <><SourceNode as="div" $style={{"flex":"1","minHeight":"0","overflowY":"auto","overflowX":"hidden","display":"flex","flexDirection":"column","gap":"10px","padding":"18px 20px"}}><SourceNode as="div" $style={{"padding":"11px 14px","borderRadius":"8px","background":"#141a1f","color":"#8f9aa1","fontSize":"14px"}}>{"부품 찾기 · 이름 · 품번"}</SourceNode><SourceNode as="div" $style={{"display":"grid","gridTemplateColumns":"repeat(2,minmax(0,1fr))","gap":"8px"}}>{(v.lib ?? []).map((l, index) => <React.Fragment key={index}><SourceNode as="div" draggable={true} onDragStart={l.ds} onClick={l.pk} $style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px","borderRadius":"8px","background":"#141a1f","cursor":"pointer","boxShadow":l.sh}} $hover={"background:#19222a"}><SourceNode as="div" $style={{"width":"100%","aspectRatio":"4/3","borderRadius":"6px","backgroundColor":"#0f1418","backgroundSize":"contain","backgroundRepeat":"no-repeat","backgroundPosition":"center","backgroundImage":l.th}}></SourceNode><SourceNode as="span" $style={{"fontSize":"13px","color":"#ffffff","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>{l.ko}</SourceNode><SourceNode as="span" $style={{"font":"400 11px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#8f9aa1"}}>{l.pn}</SourceNode></SourceNode></React.Fragment>)}</SourceNode><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{"끌어서 가운데 3D에 놓으면 이번 단계에 들어갑니다"}</SourceNode></SourceNode></> : null}{(v.showStepChat) ? <><SourceNode as="div" $style={{"display":"flex","justifyContent":"center","padding":"16px 20px 18px","borderTop":"1px solid #1a2026"}}><SourceNode as="div" onMouseDown={v.aiWake} $style={{"position":"relative","width":"100%","maxWidth":v.aiMaxW,"height":v.aiH,"borderRadius":v.aiR,"background":"linear-gradient(180deg,rgba(20,26,31,.92),rgba(12,16,19,.96))","boxShadow":v.aiSh,"overflow":"hidden","transition":"max-width .4s cubic-bezier(.175,.885,.32,1.275),height .4s cubic-bezier(.175,.885,.32,1.275),box-shadow .3s ease","cursor":"text"}}><SourceNode as="div" $style={{"position":"absolute","left":"0","right":"0","top":"0","height":"1px","background":"linear-gradient(90deg,transparent,rgba(243,115,33,.9),rgba(63,224,197,.7),transparent)","opacity":v.aiLineOp,"transition":"opacity .3s ease"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"0","right":"0","top":v.aiScanTop,"height":"18px","background":"linear-gradient(180deg,transparent,rgba(63,224,197,.16),transparent)","borderBottom":"1px solid rgba(63,224,197,.45)","opacity":v.aiScanOp,"transition":v.aiScanTr,"pointerEvents":"none"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"6px","top":"6px","width":"10px","height":"10px","borderLeft":"1.5px solid #f37321","borderTop":"1.5px solid #f37321","opacity":v.aiLineOp,"transition":"opacity .3s ease"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","right":"6px","top":"6px","width":"10px","height":"10px","borderRight":"1.5px solid #f37321","borderTop":"1.5px solid #f37321","opacity":v.aiLineOp,"transition":"opacity .3s ease"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"6px","bottom":"6px","width":"10px","height":"10px","borderLeft":"1.5px solid #3fe0c5","borderBottom":"1.5px solid #3fe0c5","opacity":v.aiLineOp,"transition":"opacity .3s ease"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","right":"6px","bottom":"6px","width":"10px","height":"10px","borderRight":"1.5px solid #3fe0c5","borderBottom":"1.5px solid #3fe0c5","opacity":v.aiLineOp,"transition":"opacity .3s ease"}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"16px","right":"52px","top":"0","height":"48px","display":"flex","alignItems":"center","gap":"10px","opacity":v.aiPhOp,"transform":v.aiPhTf,"transition":"opacity .3s ease,transform .4s cubic-bezier(.175,.885,.32,1.275)","pointerEvents":"none"}}><SourceNode as="span" $style={{"width":"6px","height":"6px","borderRadius":"50%","background":"#3fe0c5","boxShadow":"0 0 8px #3fe0c5"}}></SourceNode><SourceNode as="span" $style={{"fontSize":"14px","color":"#9aa5ab","whiteSpace":"nowrap"}}>{"AI에게 이 단계 고치기"}</SourceNode></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"16px","right":"16px","top":"12px","display":"flex","alignItems":"center","gap":"8px","opacity":v.aiInOp,"transform":v.aiInTf,"transition":"opacity .3s ease,transform .4s cubic-bezier(.175,.885,.32,1.275)"}}><SourceNode as="span" $style={{"font":"700 11px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".08em","color":"#3fe0c5","whiteSpace":"nowrap"}}>{"AI · STEP "}{v.curNoShort}</SourceNode><SourceNode as="span" $style={{"flex":"1","height":"1px","background":"rgba(63,224,197,.18)"}}></SourceNode><SourceNode as="span" $style={{"font":"500 10px/1 var(--font-mono),'JetBrains Mono',monospace","letterSpacing":".08em","color":"#8f9aa1","whiteSpace":"nowrap"}}>{v.aiSys}</SourceNode></SourceNode><SourceNode as="textarea" ref={v.aiRef} value={v.aiQ} onChange={v.aiType} onKeyDown={v.aiKey} onBlur={v.aiBlur} placeholder={"예: 받침을 베이스 판 아래로 옮겨"} $style={{"position":"absolute","left":"0","right":"0","top":"30px","height":"60px","boxSizing":"border-box","padding":"6px 52px 6px 16px","resize":"none","border":"0","background":"transparent","color":"#ffffff","font":"400 14px/22px NexonLv2Gothic,sans-serif","outline":"none","opacity":v.aiInOp,"transform":v.aiInTf,"transition":"opacity .3s ease,transform .4s cubic-bezier(.175,.885,.32,1.275)","pointerEvents":v.aiPe}}></SourceNode><SourceNode as="div" $style={{"position":"absolute","left":"12px","right":"52px","bottom":"9px","display":"flex","alignItems":"center","gap":"4px","opacity":v.aiInOp,"filter":v.aiBlurF,"transform":v.aiBarTf,"transition":"all .3s cubic-bezier(.175,.885,.32,1.275)","pointerEvents":v.aiPe}}><SourceNode as="div" onMouseDown={v.keep} onClick={v.aiModeTog} $style={{"display":"flex","alignItems":"center","gap":"6px","padding":"5px 10px","borderRadius":"999px","background":"rgba(243,115,33,.1)","color":"#f37321","fontSize":"12px","fontWeight":"700","cursor":"pointer","transition":"background .2s ease"}} $hover={"background:rgba(243,115,33,.2)"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.aiModeTog?.(event); } }}><SourceNode as="span" $style={{"display":"flex","alignItems":"flex-end","gap":"2px","height":"10px"}}><SourceNode as="span" $style={{"width":"2px","height":"4px","background":"currentColor","borderRadius":"1px"}}></SourceNode><SourceNode as="span" $style={{"width":"2px","height":"7px","background":"currentColor","borderRadius":"1px","opacity":v.aiBar2}}></SourceNode><SourceNode as="span" $style={{"width":"2px","height":"10px","background":"currentColor","borderRadius":"1px","opacity":v.aiBar3}}></SourceNode></SourceNode>{v.aiModeKo}{"\n            "}</SourceNode><SourceNode as="div" onMouseDown={v.keep} onClick={v.aiScopeTog} $style={{"padding":"5px 10px","borderRadius":"999px","color":"#9aa5ab","fontSize":"12px","cursor":"pointer","transition":"background .2s ease,color .2s ease"}} $hover={"background:rgba(255,255,255,.06);color:#ffffff"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.aiScopeTog?.(event); } }}>{v.aiScopeKo}</SourceNode><SourceNode as="div" onMouseDown={v.keep} onClick={v.aiLib} $style={{"marginLeft":"auto","width":"28px","height":"28px","borderRadius":"50%","display":"flex","alignItems":"center","justifyContent":"center","color":"#9aa5ab","fontSize":"16px","cursor":"pointer"}} $hover={"background:rgba(255,255,255,.06);color:#ffffff"} title={"부품 라이브러리"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.aiLib?.(event); } }}>{"＋"}</SourceNode></SourceNode><SourceNode as="div" onMouseDown={v.keep} onClick={v.aiSend} $style={{"position":"absolute","right":"8px","bottom":"8px","width":"32px","height":"32px","borderRadius":"50%","display":"flex","alignItems":"center","justifyContent":"center","background":v.aiBtnBg,"color":v.aiBtnC,"boxShadow":v.aiBtnSh,"cursor":"pointer","transition":"all .3s cubic-bezier(.175,.885,.32,1.275)"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.aiSend?.(event); } }}><SourceNode as="span" $style={{"position":"absolute","fontSize":"14px","fontWeight":"700","opacity":v.aiArrOp,"transform":v.aiArrTf,"transition":"all .3s cubic-bezier(.175,.885,.32,1.275)"}}>{"↑"}</SourceNode><SourceNode as="span" $style={{"position":"absolute","width":"7px","height":"7px","borderRadius":"50%","border":"1.5px solid currentColor","opacity":v.aiDotOp,"transform":v.aiDotTf,"transition":"all .3s cubic-bezier(.175,.885,.32,1.275)"}}></SourceNode></SourceNode></SourceNode></SourceNode>{(v.aiMsgOn) ? <><SourceNode as="div" $style={{"margin":"-6px 20px 14px","padding":"10px 14px","borderRadius":"12px","background":"rgba(63,224,197,.08)","color":"#c9f5ec","fontSize":"13px","lineHeight":"1.5","textWrap":"pretty"}}>{v.aiMsg}</SourceNode></> : null}</> : null}{(v.toolPanel) ? <><SourceNode as="div" data-tool-library={""} $style={{"flex":"1","minHeight":"0","overflowY":"auto","overflowX":"hidden","display":"flex","flexDirection":"column","gap":"22px","padding":"22px 20px"}}><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px 16px","borderRadius":"10px","background":"#141a1f"}}><SourceNode as="div" $style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}><SourceNode as="span" $style={{"fontSize":"14px","fontWeight":"700","color":"#ffffff"}}>{"공구 확인"}</SourceNode><SourceNode as="span" $style={{"font":"700 15px/1 var(--font-mono),'JetBrains Mono',monospace","color":v.tmC}}>{v.tmDone}{" / "}{v.tmAll}</SourceNode></SourceNode><SourceNode as="div" $style={{"height":"4px","borderRadius":"2px","background":"#232b31"}}><SourceNode as="div" $style={{"height":"100%","width":v.tmW,"borderRadius":"2px","background":v.tmC,"transition":"width .3s ease"}}></SourceNode></SourceNode>{(v.tmLeftOn) ? <><SourceNode as="div" onClick={v.tmAllOk} $style={{"display":"flex","justifyContent":"center","padding":"9px 12px","borderRadius":"8px","background":"#f37321","color":"#ffffff","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.tmAllOk?.(event); } }}>{"추천 공구로 남은 "}{v.tmLeft}{"곳 모두 확정"}</SourceNode></> : null}</SourceNode>{(v.tmSel) ? <><SourceNode as="div" $style={{"display":"flex","alignItems":"center","gap":"14px"}}><SourceNode as="div" $style={{"flex":"none","width":"64px","height":"64px","borderRadius":"50%","background":"#0d1114 " + String(v.tmTh) + " center/cover no-repeat","boxShadow":"inset 0 0 0 2px rgba(243,115,33,.6)"}}></SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"5px","minWidth":"0"}}><SourceNode as="span" $style={{"font":"700 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}}>{"STEP "}{v.curNo}</SourceNode><SourceNode as="span" $style={{"fontSize":"17px","fontWeight":"700","color":"#ffffff","lineHeight":"1.3"}}>{v.tmKo}</SourceNode><SourceNode as="span" $style={{"fontSize":"13px","color":"#c3cbd0"}}>{v.tmTgt}</SourceNode></SourceNode></SourceNode><SourceNode as="div" $style={{"display":"grid","gridTemplateColumns":"repeat(3,minmax(0,1fr))","gap":"8px"}}><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"12px","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{"규격"}</SourceNode><SourceNode as="span" $style={{"font":"700 15px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#ffffff"}}>{v.tmM}</SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"12px","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{"개수"}</SourceNode><SourceNode as="span" $style={{"font":"700 15px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#ffffff"}}>{v.tmQ}{"개"}</SourceNode></SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"12px","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{"토크 N·m"}</SourceNode><SourceNode as="input" aria-label={"토크 (N·m)"} value={v.tmNm} onChange={v.tmNmIn} onBlur={v.tmNmBlur} onKeyDown={v.tmNmKey} inputMode={"decimal"} $style={{"width":"100%","boxSizing":"border-box","padding":"0","border":"0","outline":"none","background":"transparent","font":"700 15px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#f37321"}} /></SourceNode></SourceNode><SourceNode as="span" $style={{"marginTop":"-12px","fontSize":"12px","color":"#8f9aa1"}}>{v.tmNmNote}</SourceNode><SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px"}}><SourceNode as="div" $style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}><SourceNode as="button" type={"button"} onClick={v.toggleToolFocus} disabled={v.toolFocusDisabled} aria-pressed={v.toolFocused} $style={{"padding":"7px 10px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer"}}>{v.toolFocusLabel}</SourceNode><SourceNode as="button" type={"button"} onClick={v.openFastenerParts} $style={{"padding":"7px 10px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"13px","cursor":"pointer"}}>{"체결 부품 변경"}</SourceNode></SourceNode><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{"공구 라이브러리 · 선택하면 이 단계에 적용됩니다"}</SourceNode><SourceNode as="div" $style={{"display":"flex","gap":"8px"}}><SourceNode as="input" aria-label={"도구 검색"} placeholder={"도구 이름·규격 검색"} value={v.toolQuery} onChange={v.searchTools} $style={{"flex":"1","minWidth":"0","padding":"8px","border":"1px solid #38444d","borderRadius":"6px","background":"#0d1114","color":"#e8ecef","font":"inherit","fontSize":"13px"}} /><SourceNode as="button" type={"button"} onClick={v.toggleAllTools} $style={{"padding":"7px 8px","border":"1px solid #38444d","borderRadius":"6px","background":"#1b2329","color":"#e8ecef","font":"inherit","fontSize":"12px","cursor":"pointer","whiteSpace":"nowrap"}}>{v.allToolsLabel}</SourceNode></SourceNode>{(v.noToolsFound) ? <><SourceNode as="span" $style={{"fontSize":"13px","color":"#a7b2ba"}}>{"검색 결과가 없습니다."}</SourceNode></> : null}<SourceNode as="div" $style={{"display":"grid","gridTemplateColumns":"repeat(2,minmax(0,1fr))","gap":"8px"}}>{(v.tmTools ?? []).map((c, index) => <React.Fragment key={index}><SourceNode as="div" onClick={c.go} $style={{"display":"flex","flexDirection":"column","gap":"7px","padding":"10px","borderRadius":"8px","background":"#141a1f","boxShadow":"inset 0 0 0 " + String(c.bw) + " " + String(c.bd),"cursor":"pointer","opacity":c.op,"transition":"opacity .2s ease,box-shadow .2s ease"}} $hover={"opacity:1"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); c.go?.(event); } }}><SourceNode as="div" $style={{"height":"92px","borderRadius":"6px","background":"#0d1114 " + String(c.img) + " center/contain no-repeat"}}></SourceNode><SourceNode as="span" $style={{"fontSize":"14px","fontWeight":"700","color":"#ffffff"}}>{c.ko}</SourceNode><SourceNode as="span" $style={{"fontSize":"12px","color":c.tc}}>{c.tag}</SourceNode></SourceNode></React.Fragment>)}</SourceNode></SourceNode>{(v.tmWarnOn) ? <><SourceNode as="div" $style={{"padding":"10px 12px","borderRadius":"8px","background":"rgba(255,107,119,.1)","boxShadow":"inset 3px 0 0 #ff6b77","color":"#ffd2d6","fontSize":"13px","lineHeight":"1.5","textWrap":"pretty"}}>{v.tmWarn}</SourceNode></> : null}{(v.tmSameOn) ? <><SourceNode as="div" onClick={v.tmSame} $style={{"display":"flex","justifyContent":"center","padding":"10px 12px","borderRadius":"8px","background":"#141a1f","boxShadow":"inset 0 0 0 1px #3a4146","color":"#e8ecef","fontSize":"13px","cursor":"pointer"}} $hover={"box-shadow:inset 0 0 0 1px #f37321"} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); v.tmSame?.(event); } }}>{"같은 규격 "}{v.tmSameN}{"곳에 이 공구 적용"}</SourceNode></> : null}</> : null}<SourceNode as="div" $style={{"display":"flex","flexDirection":"column","gap":"8px","marginTop":"auto","paddingTop":"16px","borderTop":"1px solid #1a2026"}}><SourceNode as="span" $style={{"fontSize":"12px","color":"#8f9aa1"}}>{"이 교육에서 쓰는 공구"}</SourceNode>{(v.tmUse ?? []).map((u, index) => <React.Fragment key={index}><SourceNode as="div" $style={{"display":"flex","alignItems":"center","gap":"10px","padding":"6px 8px","borderRadius":"8px","background":"#141a1f"}}><SourceNode as="div" $style={{"flex":"none","width":"44px","height":"33px","borderRadius":"4px","background":"#0d1114 " + String(u.img) + " center/contain no-repeat"}}></SourceNode><SourceNode as="span" $style={{"flex":"1","fontSize":"13px","color":"#ffffff"}}>{u.ko}</SourceNode><SourceNode as="span" $style={{"font":"700 12px/1 var(--font-mono),'JetBrains Mono',monospace","color":"#c3cbd0"}}>{u.n}{"곳"}</SourceNode></SourceNode></React.Fragment>)}</SourceNode></SourceNode></> : null}</SourceNode></SourceNode></SourceNode></SourceNode></>; }
}
