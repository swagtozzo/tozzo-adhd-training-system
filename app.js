"use strict";
/* ---------- utilità ---------- */
const $ = (s, r = document) => r.querySelector(s);
function h(tag, a, ...kids) {
  const el = document.createElementNS(tag === "svg" || a?.__svg ? "http://www.w3.org/2000/svg" : "http://www.w3.org/1999/xhtml", tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (k === "__svg" || v == null || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k === "text") el.textContent = v;
    else if (k === "value") el.value = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const sv = (tag, a = {}, ...k) => h(tag, { ...a, __svg: true }, ...k);
const pad = n => String(n).padStart(2, "0");
const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const GG = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MM = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const fmtDay = s => { const d = parseISO(s); return `${GG[d.getDay()]} ${d.getDate()} ${MM[d.getMonth()]}`; };
const fmtShort = s => { const d = parseISO(s); return `${d.getDate()} ${MM[d.getMonth()]}`; };
const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const fmtRest = sec => sec >= 60 ? (sec % 60 ? `${Math.floor(sec / 60)}:${pad(sec % 60)} min` : `${sec / 60} min`) : `${sec} s`;
const fmtHM = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const clone = o => JSON.parse(JSON.stringify(o));
const now = () => Date.now();
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const range = (lo, hi) => lo === hi ? `${lo}` : `${lo}–${hi}`;
const num = v => (v === "" || v == null || isNaN(+v)) ? null : +v;

/* ---------- programma ---------- */
/* Esercizi, giorni, ciclo, fasi e regole stanno in data/programma.json (schema in CLAUDE.md).
   esercizio.type: reps | holds | hold | time | carry · load: kg | extra | none · side: un lato alla volta
   spec: reps/hold/time/carry {lo,hi}; holds {n (numero o elenco per serie), secs, side:'alt'|'block'} */
const it = (ex, sets, spec, rest, o = {}) => ({ ex, key: o.key || ex, sets, spec, rest, main: !!o.main, heavy: !!o.heavy, note: o.note || null });
const voce = v => it(v.ex, v.sets, v.spec, v.rest, v);
let P = null, EX = {}, SIDE_EX = new Set(), DAYS = {}, DAY_ORDER = [], CYCLE = [], PH = {}, ZONES = [], ATT = null, ATTIVITA = [];
const GIORNI_SETT = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
/* carico massimo di un attrezzo: impugnatura + dischi uguali sui due lati, divisi tra `n` attrezzi caricati insieme */
function maxCarico(peso, dischi, n = 1) {
  const perLato = (dischi || []).reduce((t, d) => t + d.kg * Math.floor(d.quantita / (2 * n)), 0);
  return peso + 2 * perLato;
}
/* profilo di attrezzatura attivo, con i carichi massimi calcolati */
function attrezzatura(p, errs) {
  const A = p.attrezzatura || {}, id = A.profiloAttivo, pr = A.profili?.[id];
  if (!pr) { errs.push(`profilo di attrezzatura "${id}" non trovato`); return null; }
  for (const d of pr.dischi || []) if (!(d.kg > 0) || !(d.quantita >= 0)) errs.push(`dischi del profilo "${id}" non validi`);
  const im = pr.impugnatureManubrio, n = im?.quantita || 0;
  return { id, nome: pr.nome || id, panca: !!pr.panca, profilo: pr,
    maxBilanciere: pr.bilanciere ? maxCarico(pr.bilanciere.peso, pr.dischi) : null,
    maxManubri: n >= 2 ? maxCarico(im.peso, pr.dischi, 2) : null,
    maxManubrioSingolo: n >= 1 ? maxCarico(im.peso, pr.dischi, 1) : null };
}
/* esercizio con la variante del profilo attivo, se c'è */
function conVariante(e, prof) {
  const v = e.varianti?.[prof]; if (!e.varianti) return e;
  const { varianti, ...base } = e;
  return v ? { ...base, ...v, info: { ...base.info, ...v.info } } : base;
}
function applyProgram(p) {
  const errs = [], blocks = {};
  const att = attrezzatura(p, errs);
  const ex = Object.fromEntries(Object.entries(p.esercizi || {}).map(([k, e]) => [k, conVariante(e, att?.id)]));
  const attivita = (p.attivita || []).map(a => {
    if (!a.id || !a.nome) errs.push("attività senza id o nome");
    for (const g of a.giorni || []) if (!GIORNI_SETT.includes(g)) errs.push(`attività "${a.id}": giorno "${g}" non valido`);
    if (!(a.durataMin > 0)) errs.push(`attività "${a.id}": durataMin mancante`);
    return { ...a, giorni: a.giorni || [] };
  });
  const check = v => { if (!ex[v.ex]) errs.push(`esercizio "${v.ex}" non trovato`); return voce(v); };
  for (const [k, list] of Object.entries(p.blocchi || {})) blocks[k] = list.map(check);
  const items = list => list.flatMap(v => v.blocco ? (blocks[v.blocco] || (errs.push(`blocco "${v.blocco}" non trovato`), [])) : [check(v)]);
  const days = {};
  for (const [id, D] of Object.entries(p.giorni || {})) days[id] = { ...D, sections: (D.sections || []).map(sec => ({ ...sec, items: items(sec.items || []) })) };
  for (const d of [...(p.ordineGiorni || []), ...(p.ciclo || []), p.schiena?.giorno]) if (!days[d]) errs.push(`giorno "${d}" non trovato`);
  for (const r of p.sostituzioni || []) check(r.con);
  for (const k of ["rientro", "costruzione", "scarico"]) if (!p.fasi?.nomi?.[k] || !p.riserva?.fasi?.[k]) errs.push(`fase "${k}" incompleta`);
  if (errs.length) throw new Error(errs.join("; "));
  P = p; EX = ex; SIDE_EX = new Set(p.tenutePerLato || []); DAYS = days; ATT = att; ATTIVITA = attivita;
  DAY_ORDER = p.ordineGiorni; CYCLE = p.ciclo; PH = p.fasi.nomi; ZONES = p.zone || [];
}
async function loadProgram() {
  const r = await fetch("./data/programma.json");
  if (!r.ok) throw new Error("file non disponibile (" + r.status + ")");
  let p; try { p = await r.json(); } catch (e) { throw new Error("il file non è JSON valido: " + e.message); }
  applyProgram(p);
}
function renderProgramError(msg) {
  S.programError = msg;
  setSave("err", "Programma non caricato");
  $("#v-oggi").replaceChildren(h("div", { class: "banner" }, h("p", {}, h("b", {}, "Non riesco a leggere il programma. "), "Controlla data/programma.json: " + msg + ". I tuoi dati non sono stati toccati.")),
    ...(S.update ? [h("div", { class: "banner info" }, h("p", {}, "È pronta una nuova versione dell'app."),
      h("div", { class: "row" }, h("button", { type: "button", class: "btn sm pri", onclick: () => S.update.postMessage("skip") }, "Aggiorna ora")))] : []));
}

/* ---------- stato e salvataggio ---------- */
const APP_VERSION = "1.4";
const DEF = { kind: "settings", start: null, phase: "auto", weak: "?", sound: true, vibrate: true, wake: true, prep: 3, lastBackup: null };
const S = { mode: "loading", sessions: {}, settings: { ...DEF }, measures: { kind: "measures", list: [] },
  view: "oggi", day: "g1", activeId: null, draft: null, loaded: false, pickedDay: false, banner: null,
  persisted: null, update: null, hideBackup: false, hideInstall: false };
const LS_KEY = "rimessa-in-forma-v1";
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
function loadLocal() {
  const raw = lsGet(LS_KEY); if (!raw) return;
  try { const d = JSON.parse(raw); S.sessions = d.sessions || {}; S.settings = { ...DEF, ...(d.settings || {}) }; S.measures = d.measures || { kind: "measures", list: [] }; } catch {}
}
/* memoria del telefono: IndexedDB, un documento per sessione */
const DB_NAME = "rimessa-in-forma", STORE = "docs";
let IDB = null;
function idbOpen() {
  return new Promise((res, rej) => {
    let r; try { r = indexedDB.open(DB_NAME, 1); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error("blocked"));
  });
}
function idbAll() {
  return new Promise((res, rej) => {
    const out = {}; const rq = IDB.transaction(STORE, "readonly").objectStore(STORE).openCursor();
    rq.onsuccess = () => { const c = rq.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
    rq.onerror = () => rej(rq.error);
  });
}
function idbWrite(id, val) {
  return new Promise((res, rej) => {
    const tx = IDB.transaction(STORE, "readwrite"); const st = tx.objectStore(STORE);
    if (val === undefined) st.delete(id); else st.put(val, id);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}
function docData(id) { return id === "settings" ? S.settings : id === "measures" ? S.measures : S.sessions[id]; }
const SV = {};
function persist(id) {
  if (S.mode === "loading") { (S.pend || (S.pend = new Set())).add(id); return; }
  setSave("busy", "Salvataggio…");
  const st = SV[id] || (SV[id] = {});
  st.pending = true; clearTimeout(st.t); st.t = setTimeout(() => flush(id), 300);
}
async function flush(id) {
  const st = SV[id] || (SV[id] = {}); clearTimeout(st.t); st.pending = false;
  if (S.mode === "idb") {
    try { const d = docData(id); await idbWrite(id, d ? clone(d) : undefined); setSave("ok", "Salvato sul telefono"); }
    catch (e) {
      setSave("err", "Non salvato");
      showBanner(e && e.name === "QuotaExceededError" ? "La memoria dell'app è piena. Esporta un backup ed elimina qualche sessione vecchia dal diario." : "Non sono riuscito a salvare l'ultima modifica. Esporta un backup per sicurezza.");
    }
  } else {
    const ok = lsSet(LS_KEY, JSON.stringify({ sessions: S.sessions, settings: S.settings, measures: S.measures }));
    setSave(ok ? "ok" : "err", ok ? "Salvato sul telefono" : "Non salvato");
    if (!ok) showBanner("Questo browser non lascia salvare i dati. Se sei in navigazione in incognito, apri l'app in una scheda normale.");
  }
}
function flushPending() { for (const [id, st] of Object.entries(SV)) if (st.pending) flush(id); }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushPending(); });
window.addEventListener("pagehide", flushPending);
function setSave(cls, text) { const el = $("#save"); el.className = "save " + cls; el.lastChild.textContent = text; }
function showBanner(t) { S.banner = t; if (S.view === "oggi") renderOggi(); }
async function askPersist() { try { if (navigator.storage && navigator.storage.persist) S.persisted = await navigator.storage.persist(); } catch {} }
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let INSTALL = null;
async function installApp() {
  if (!INSTALL) return; const ev = INSTALL; INSTALL = null;
  try { ev.prompt(); await ev.userChoice; } catch {}
  if (S.view === "oggi") renderOggi(); else if (S.view === "impostazioni") renderImpost();
}
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); INSTALL = e;
  if (S.view === "oggi" && S.loaded && !C && !document.activeElement?.matches?.("input,textarea,select")) renderOggi();
  else if (S.view === "impostazioni") renderImpost();
});
window.addEventListener("appinstalled", () => { INSTALL = null; askPersist(); toast("App installata"); });
function goBackup() { show("progressi"); setTimeout(() => $("#backup")?.scrollIntoView({ block: "start" }), 60); }
function topBanners(v) {
  if (S.banner) v.append(h("div", { class: "banner", role: "status" }, h("p", {}, S.banner)));
  if (S.update) v.append(h("div", { class: "banner info" }, h("p", {}, "È pronta una nuova versione dell'app."),
    h("div", { class: "row" }, h("button", { type: "button", class: "btn sm pri", onclick: () => { flushPending(); S.update.postMessage("skip"); } }, "Aggiorna ora"))));
  if (INSTALL && !isStandalone() && !S.hideInstall) v.append(h("div", { class: "banner info" },
    h("p", {}, "Installa l'app sulla schermata Home: si apre a schermo intero, funziona senza connessione e Android protegge meglio i tuoi dati."),
    h("div", { class: "row" }, h("button", { type: "button", class: "btn sm pri", onclick: installApp }, "Installa"),
      h("button", { type: "button", class: "btn sm ghost", onclick: () => { S.hideInstall = true; renderOggi(); } }, "Più tardi"))));
  const n = sortedSessions().filter(x => x.startedAt).length;
  const since = S.settings.lastBackup ? Math.round((parseISO(isoDate()) - parseISO(S.settings.lastBackup)) / 864e5) : null;
  if (n >= 3 && (since == null || since > 14) && !S.hideBackup) v.append(h("div", { class: "banner info" },
    h("p", {}, since == null ? "Non hai ancora fatto un backup. I dati sono solo su questo telefono: salvane una copia." : `Ultimo backup ${since} giorni fa: salvane uno nuovo.`),
    h("div", { class: "row" }, h("button", { type: "button", class: "btn sm pri", onclick: goBackup }, "Fai il backup"),
      h("button", { type: "button", class: "btn sm ghost", onclick: () => { S.hideBackup = true; renderOggi(); } }, "Più tardi"))));
}

/* ---------- settimane e fasi ---------- */
function weekNo(date = isoDate()) {
  if (!S.settings.start) return 1;
  const d = Math.round((parseISO(date) - parseISO(S.settings.start)) / 864e5);
  return Math.max(1, Math.floor(d / 7) + 1);
}
function autoPhase(w) {
  const F = P.fasi.settimane; if (w <= F.rientro) return "rientro";
  const k = (w - F.rientro - 1) % (F.costruzione + F.scarico); return k < F.costruzione ? "costruzione" : "scarico";
}
function phaseFor(w) { return S.settings.phase !== "auto" ? S.settings.phase : autoPhase(w); }
function sideOrder() { return S.settings.weak === "dx" ? ["dx", "sx"] : ["sx", "dx"]; }
const SIDE_L = { sx: "Sinistro", dx: "Destro" };
const SIDE_S = { sx: "Sx", dx: "Dx" };

/* ---------- sessioni ---------- */
function sortedSessions() {
  return Object.values(S.sessions).filter(s => s && s.kind === "session")
    .sort((a, b) => (b.date + (b.startedAt || 0)).localeCompare(a.date + (a.startedAt || 0)) || (b.startedAt || 0) - (a.startedAt || 0));
}
function newSession(day) {
  const date = isoDate(), w = weekNo(date);
  return { kind: "session", v: 1, id: `s-${date}-${day}-${now().toString(36)}`, date, day, week: w, phase: phaseFor(w),
    startedAt: null, endedAt: null, checkin: { back: null, energy: null, sleep: null }, ex: {}, end: { pain: null, zones: [], note: "" } };
}
function currentSession() {
  const today = isoDate();
  const a = S.activeId && (S.sessions[S.activeId] || (S.draft && S.draft.id === S.activeId ? S.draft : null));
  if (a && a.day === S.day && a.date === today) return a;
  const found = sortedSessions().find(s => s.date === today && s.day === S.day);
  if (found) { S.activeId = found.id; return found; }
  S.draft = newSession(S.day); S.activeId = S.draft.id; return S.draft;
}
function touch(sess) {
  if (!S.sessions[sess.id]) S.sessions[sess.id] = sess;
  if (!sess.startedAt) sess.startedAt = now();
  if (!S.settings.start) { S.settings.start = sess.date; sess.week = 1; sess.phase = phaseFor(1); persist("settings"); }
  sess.updatedAt = now();
  persist(sess.id);
  if (!S.persistAsked) { S.persistAsked = true; askPersist(); }
  wakeOn();
}
function dayItems(sess) {
  const D = DAYS[sess.day];
  return D.sections.map(sec => ({ ...sec, items: sec.items.map(item => {
    let x = item;
    const sub = (P.sostituzioni || []).find(r => r.giorno === sess.day && r.ex === item.ex && (r.finoSettimana == null || sess.week <= r.finoSettimana) && (!r.fase || sess.phase === r.fase));
    if (sub) x = voce(sub.con);
    let n = Array.isArray(x.spec.n) ? x.spec.n.length : x.sets;
    const mod = x.main && D.program ? P.fasi.serie?.[sess.phase] : null;
    if (mod) {
      if (mod.meno) n = Math.max(1, n - mod.meno);
      if (mod.frazione) n = Math.ceil(n * mod.frazione);
    }
    return { ...x, n };
  }) }));
}
function rirText(sess, item) {
  const D = DAYS[sess.day]; const ex = EX[item.ex];
  if (!item.main || ex.type !== "reps") return null;
  const R = P.riserva;
  if (D.minimum) return R.pianoMinimo;
  const perEx = R.esercizi?.[item.ex]?.[sess.phase]; if (perEx) return perEx;
  const f = R.fasi[sess.phase] || R.fasi.costruzione;
  return ex.iso ? f.isolamento : f.base;
}
function lastEntry(key, exceptId) {
  for (const s of sortedSessions()) {
    if (s.id === exceptId) continue;
    const e = s.ex && s.ex[key];
    if (e && e.sets && e.sets.some(x => x.done)) return { sess: s, e };
  }
  return null;
}
function newSet(item, i, sess) {
  const ex = EX[item.ex]; const L = lastEntry(item.key, sess.id); const ls = L?.e.sets?.[i];
  const s = { done: false, pre: true };
  const lastKg = ls?.kg ?? L?.e.sets?.find(x => x.kg != null)?.kg ?? null;
  if (ex.type === "reps") {
    if (ex.load !== "none") s.kg = lastKg;
    if (ex.side) { s.sx = ls?.sx ?? item.spec.lo; s.dx = ls?.dx ?? item.spec.lo; }
    else s.reps = ls?.reps ?? item.spec.lo;
  } else if (ex.type === "holds") {
    s.target = Array.isArray(item.spec.n) ? item.spec.n[i] : item.spec.n;
  } else if (ex.type === "carry") { s.kg = lastKg; s.sx = false; s.dx = false; }
  return s;
}
function entry(sess, item) {
  let e = sess.ex[item.key];
  if (!e) { e = { name: EX[item.ex].name, sets: [] }; sess.ex[item.key] = e; }
  while (e.sets.length < item.n) e.sets.push(newSet(item, e.sets.length, sess));
  return e;
}
function setsShown(e, item) { return Math.max(item.n, e.extra ? item.n + e.extra : 0); }
function isSideItem(item) { const ex = EX[item.ex]; return !!(ex.side || item.spec.side || SIDE_EX.has(item.ex) && ex.type === "hold"); }

/* ---------- testi di prescrizione ---------- */
function rxText(sess, item) {
  const ex = EX[item.ex], sp = item.spec, side = isSideItem(item) ? " per lato" : "";
  let t = "";
  if (ex.type === "reps") t = `${item.n} × ${range(sp.lo, sp.hi)}${side}`;
  else if (ex.type === "holds") t = Array.isArray(sp.n) ? `${sp.n.join(", ")} tenute da ${sp.secs} s${side}` : `${item.n > 1 ? item.n + " × " : ""}${sp.n} tenute da ${sp.secs} s${side}`;
  else if (ex.type === "hold") t = `${item.n} × ${range(sp.lo, sp.hi)} s${side}`;
  else if (ex.type === "time") t = `${range(sp.lo, sp.hi)} minuti`;
  else if (ex.type === "carry") t = `${item.n} × ${range(sp.lo, sp.hi)} m per lato`;
  const parts = [t];
  const rir = rirText(sess, item); if (rir) parts.push(rir);
  if (item.rest >= 20) parts.push(`recupero ${fmtRest(item.rest)}`);
  return parts.join(" · ");
}
function summarize(item, e) {
  const ex = EX[item.ex] || { type: "reps" };
  const done = (e.sets || []).filter(s => s.done);
  if (!done.length) return "nessuna serie";
  if (ex.type === "reps") {
    const vals = done.map(s => ex.side ? `${s.sx ?? 0}/${s.dx ?? 0}` : `${s.reps ?? 0}`);
    const kgs = [...new Set(done.map(s => s.kg).filter(k => k != null))];
    if (!kgs.length) return vals.join(", ");
    if (kgs.length === 1) return `${ex.load === "extra" ? "+" : ""}${kgs[0]} kg × ${vals.join(", ")}`;
    return done.map((s, i) => `${s.kg ?? 0}×${vals[i]}`).join(" · ");
  }
  if (ex.type === "holds") return done.map(s => s.sx != null || s.dx != null ? `${s.sx ?? 0}/${s.dx ?? 0}` : `${s.n ?? 0}`).join(", ") + " tenute";
  if (ex.type === "hold") return done.map(s => s.sx != null || s.dx != null ? `${s.sx ?? "–"}/${s.dx ?? "–"} s` : `${s.sec ?? "–"} s`).join(", ");
  if (ex.type === "time") return `${done[0].min ?? "–"} min`;
  if (ex.type === "carry") return `${done[0].kg ?? "–"} kg × ${done.length} giri`;
  return "";
}

/* ---------- suggerimenti di progressione ---------- */
function suggestion(sess, item) {
  const ex = EX[item.ex]; if (ex.type !== "reps" || !item.main) return null;
  const L = lastEntry(item.key, sess.id); if (!L) return null;
  const done = L.e.sets.filter(s => s.done); if (done.length < item.n) return null;
  const hi = item.spec.hi;
  const ok = done.every(s => ex.side ? Math.min(s.sx || 0, s.dx || 0) >= hi : (s.reps || 0) >= hi);
  if (!ok) return null;
  if (ex.load === "kg") {
    const kg = Math.max(...done.map(s => s.kg || 0));
    const max = ex.db ? (ex.manubri === 1 ? ATT.maxManubrioSingolo : ATT.maxManubri) : ATT.maxBilanciere;
    if (max != null && kg >= max) return [ex.db ? "Sei al massimo dei manubri." : "Sei al massimo del bilanciere.", " Scendi in 3–4 secondi o aggiungi una pausa nel punto più duro."];
    return [`Hai chiuso tutte le serie a ${hi}.`, ` Aumenta il peso e riparti da ${item.spec.lo}.`];
  }
  if (ex.load === "extra") return [`Hai chiuso tutte le serie a ${hi}.`, " Aggiungi zavorra con lo zaino o passa alla variante più difficile."];
  return [`Hai chiuso tutte le serie a ${hi}.`, " Rallenta la discesa o passa alla variante più difficile."];
}

/* ---------- audio, vibrazione, schermo ---------- */
let AC = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { AC = null; } } if (AC && AC.state === "suspended") AC.resume().catch(() => {}); return AC; }
function beep(f = 880, ms = 110, vol = .25, delay = 0) {
  if (!S.settings.sound) return; const a = audio(); if (!a) return;
  try {
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + ms / 1000);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + ms / 1000 + .02);
  } catch {}
}
function buzz(p) { if (!S.settings.vibrate) return; try { navigator.vibrate && navigator.vibrate(p); } catch {} }
document.addEventListener("pointerdown", () => audio(), { once: true });
let WL = null;
async function wakeOn() { if (!S.settings.wake || WL) return; try { WL = await navigator.wakeLock.request("screen"); WL.addEventListener("release", () => { WL = null; }); } catch { WL = null; } }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && (R || C || S.activeId && S.sessions[S.activeId] && !S.sessions[S.activeId].endedAt)) wakeOn(); });

/* ---------- toast ---------- */
let toastT = null;
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

/* ---------- vista Oggi ---------- */
const ICON_PLAY = () => sv("svg", { viewBox: "0 0 10 10", "aria-hidden": "true" }, sv("path", { d: "M2 1l7 4-7 4z" }));
const ICON_CHECK = () => sv("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, sv("path", { d: "M5 12.5l4.5 4.5L19 7.5" }));

function scale(val, min, max, onPick, cls = "") {
  const w = h("div", { class: "scale " + cls, role: "group", style: `--n:${max - min + 1}` });
  const draw = v => {
    w.replaceChildren();
    for (let i = min; i <= max; i++) w.append(h("button", { type: "button", "aria-pressed": String(v === i), onclick: () => { const nv = v === i ? null : i; onPick(nv); draw(nv); } }, String(i)));
  };
  draw(val); return w;
}

function renderOggi() {
  const v = $("#v-oggi"); const sess = currentSession(); const D = DAYS[sess.day];
  const sections = dayItems(sess);
  v.replaceChildren();
  topBanners(v);

  // selettore giorno
  const suggested = suggestDay();
  const days = h("div", { class: "days", role: "group", "aria-label": "Giorno" });
  for (const d of DAY_ORDER) {
    const done = sortedSessions().some(s => s.date === isoDate() && s.day === d && s.endedAt);
    days.append(h("button", { type: "button", class: "day", "aria-pressed": String(d === S.day), onclick: () => { S.day = d; S.pickedDay = true; S.activeId = null; S.draft = null; lsSet("rif-day", d); renderOggi(); window.scrollTo({ top: 0 }); } },
      h("b", {}, DAYS[d].short), h("span", {}, DAYS[d].tag),
      d === suggested && !done ? h("span", { class: "tag", style: "display:block" }, "Consigliato") : null,
      done ? h("span", { class: "tag", style: "display:block" }, "Fatto oggi") : null));
  }
  v.append(days);

  // intestazione del giorno
  const all = sections.flatMap(s => s.items);
  let tot = 0, fatti = 0;
  for (const item of all) { const e = sess.ex[item.key]; const n = e ? setsShown(e, item) : item.n; tot += n; if (e) fatti += e.sets.slice(0, n).filter(s => s.done).length; }
  const head = h("div", { class: "dayhead" },
    h("h2", {}, D.label),
    h("div", { class: "meta" },
      D.program ? h("span", { class: "chip ph" }, `Settimana ${sess.week} · ${PH[sess.phase]}`) : h("span", { class: "chip" }, D.tag),
      sess.endedAt ? h("span", { class: "chip ok" }, `Conclusa alle ${fmtHM(sess.endedAt)}`) : sess.startedAt ? h("span", { class: "chip" }, `Iniziata alle ${fmtHM(sess.startedAt)}`) : null),
    h("div", { class: "prog", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(tot), "aria-valuenow": String(fatti) }, h("i", { id: "prog-i", style: `width:${tot ? (fatti / tot * 100) : 0}%` })),
    h("div", { class: "progline" }, h("span", { id: "prog-t" }, `${fatti} di ${tot} serie`), h("span", {}, D.program ? phaseHint(sess) : "")));
  v.append(head);

  // controllo iniziale
  v.append(checkinPanel(sess));
  if (D.lower && sess.checkin.back != null && sess.checkin.back >= P.schiena.soglia)
    v.append(h("div", { class: "banner" }, h("p", {}, h("b", {}, "Schiena a " + sess.checkin.back + " su 10. "), "Con la schiena che si riaccende il programma dice di sostituire la parte bassa con la fase 1 e la camminata per qualche giorno."),
      h("div", { class: "row" }, h("button", { type: "button", class: "btn sm", onclick: () => { S.day = P.schiena.giorno; S.pickedDay = true; S.activeId = null; S.draft = null; renderOggi(); window.scrollTo({ top: 0 }); } }, "Passa a " + DAYS[P.schiena.giorno].label))));

  // sezioni
  let idx = 0;
  for (const sec of sections) {
    v.append(h("div", { class: "sec-h" }, h("h3", {}, sec.t), sec.note ? h("span", {}, sec.note) : null));
    for (const item of sec.items) { idx++; v.append(card(sess, item, idx)); }
  }
  v.append(endPanel(sess));
  updateHeader();
}
function phaseHint(sess) { return P.fasi.sottotitolo[sess.phase] || P.fasi.sottotitolo.costruzione; }
function suggestDay() {
  const today = isoDate(); const ss = sortedSessions();
  const t = ss.find(s => s.date === today && !s.endedAt); if (t) return t.day;
  const last = ss.find(s => CYCLE.includes(s.day));
  if (!last) return "g1";
  if (last.date === today) return last.day;
  return CYCLE[(CYCLE.indexOf(last.day) + 1) % CYCLE.length];
}
function checkinPanel(sess) {
  const c = sess.checkin;
  const sleep = h("input", { type: "number", id: "ck-sleep", inputmode: "decimal", min: "0", max: "14", step: "0.5", value: c.sleep ?? "", style: "width:90px", onchange: ev => { c.sleep = num(ev.target.value); touch(sess); } });
  return h("div", { class: "panel" },
    h("h3", {}, "Prima di iniziare"),
    h("div", { class: "field" }, h("span", { class: "lbl" }, "Fastidio alla schiena adesso"), h("span", { class: "hint" }, "0 nessuno, 10 il massimo"),
      scale(c.back, 0, 10, val => { c.back = val; touch(sess); if (DAYS[sess.day].lower) renderOggi(); }, "pain")),
    h("div", { class: "grid2" },
      h("div", { class: "field" }, h("span", { class: "lbl" }, "Energia"), scale(c.energy, 1, 5, val => { c.energy = val; touch(sess); })),
      h("label", { class: "field", for: "ck-sleep" }, h("span", { class: "lbl" }, "Ore di sonno"), sleep)));
}
function endPanel(sess) {
  const e = sess.end;
  const zones = h("div", { class: "chips", role: "group", "aria-label": "Zone" });
  const drawZones = () => { zones.replaceChildren(...ZONES.map(z => h("button", { type: "button", "aria-pressed": String(e.zones.includes(z)), onclick: () => { e.zones = e.zones.includes(z) ? e.zones.filter(x => x !== z) : [...e.zones, z]; touch(sess); drawZones(); } }, z))); };
  drawZones();
  let noteT = null;
  const note = h("textarea", { id: "end-note", placeholder: "Come è andata, cosa hai sentito, cosa cambiare la prossima volta", oninput: ev => { e.note = ev.target.value; clearTimeout(noteT); noteT = setTimeout(() => touch(sess), 600); } });
  note.value = e.note || "";
  const dur = sess.startedAt ? Math.round(((sess.endedAt || now()) - sess.startedAt) / 60000) : 0;
  return h("div", { class: "panel", id: "end-panel" },
    h("h3", {}, "Fine sessione"),
    h("div", { class: "field" }, h("span", { class: "lbl" }, "Fastidio adesso"), scale(e.pain, 0, 10, val => { e.pain = val; touch(sess); }, "pain")),
    h("div", { class: "field" }, h("span", { class: "lbl" }, "Dove"), zones),
    h("label", { class: "field", for: "end-note" }, h("span", { class: "lbl" }, "Note della sessione"), note),
    h("p", { class: "hint" }, "Domani controlla la schiena: il fastidio deve tornare al livello di partenza entro 24 ore. Se è peggiorato, alla prossima sessione fai una serie in meno o usa meno peso."),
    sess.endedAt
      ? h("div", { class: "row" }, h("span", { class: "chip ok" }, `Conclusa · ${dur} min`), h("button", { type: "button", class: "btn sm", onclick: () => { sess.endedAt = null; touch(sess); renderOggi(); } }, "Riapri"))
      : h("button", { type: "button", class: "btn pri", onclick: () => { touch(sess); sess.endedAt = now(); persist(sess.id); stopRest(); toast("Sessione salvata nel diario"); renderOggi(); try { WL && WL.release(); } catch {} } }, "Concludi sessione"));
}

/* cartellino */
function card(sess, item, idx) {
  const ex = EX[item.ex]; const e = entry(sess, item);
  const n = setsShown(e, item);
  const allDone = e.sets.slice(0, n).every(s => s.done);
  const L = lastEntry(item.key, sess.id);
  const sg = suggestion(sess, item);
  const sets = h("div", { class: "sets" });
  for (let i = 0; i < n; i++) sets.append(setRow(sess, item, e, i));
  const painSel = scale(e.pain ?? null, 0, 10, val => { e.pain = val; touch(sess); }, "pain");
  let nT = null;
  const ta = h("textarea", { id: `nt-${item.key}`, placeholder: "Sensazioni, tecnica, fastidi", oninput: ev => { e.note = ev.target.value; clearTimeout(nT); nT = setTimeout(() => touch(sess), 600); } });
  ta.value = e.note || "";
  const det = h("details", { class: "notes" }, h("summary", {}, e.note || e.pain != null ? "Note e fastidio · compilate" : "Note e fastidio"),
    h("div", { class: "inner" }, h("span", { class: "lbl" }, "Fastidio durante l'esercizio"), painSel, h("label", { class: "lbl", for: `nt-${item.key}` }, "Note"), ta));
  return h("article", { class: "card" + (allDone ? " done" : ""), id: `c-${item.key}` },
    h("div", { class: "ch" },
      h("span", { class: "idx" }, String(idx)),
      h("div", { class: "ct" }, h("h4", {}, ex.name), h("p", { class: "rx" }, rxText(sess, item))),
      h("button", { type: "button", class: "ibtn", onclick: () => openSheet(item, sess) }, "Scheda")),
    item.note ? h("p", { class: "subst" }, item.note) : null,
    L ? h("p", { class: "last" }, `Ultima volta, ${fmtShort(L.sess.date)}: ${summarize(item, L.e)}`) : null,
    sg ? h("p", { class: "sugg" }, h("b", {}, sg[0]), sg[1]) : null,
    sets,
    h("div", { class: "cardfoot" }, det,
      h("div", { class: "row" },
        h("button", { type: "button", class: "linkbtn", onclick: () => { e.extra = (e.extra || 0) + 1; e.sets.push(newSet(item, e.sets.length, sess)); touch(sess); rerenderCard(sess, item); } }, "+ serie"),
        n > item.n && !e.sets[n - 1].done ? h("button", { type: "button", class: "linkbtn", onclick: () => { e.extra = Math.max(0, (e.extra || 0) - 1); e.sets.splice(n - 1, 1); touch(sess); rerenderCard(sess, item); } }, "− serie") : null)));
}
function itemByKey(sess, key) { for (const sec of dayItems(sess)) for (const it2 of sec.items) if (it2.key === key) return it2; return null; }
function cardIndex(key) { const el = document.getElementById("c-" + key); return el ? +el.querySelector(".idx").textContent : 0; }
function rerenderCard(sess, item) {
  const old = document.getElementById("c-" + item.key); if (!old) return;
  const open = old.querySelector("details")?.open;
  const nu = card(sess, item, cardIndex(item.key)); if (open) nu.querySelector("details").open = true;
  old.replaceWith(nu); updateProgress(sess);
}
function updateProgress(sess) {
  let tot = 0, fatti = 0;
  for (const sec of dayItems(sess)) for (const item of sec.items) { const e = sess.ex[item.key]; const n = e ? setsShown(e, item) : item.n; tot += n; if (e) fatti += e.sets.slice(0, n).filter(s => s.done).length; }
  const i = $("#prog-i"), t = $("#prog-t"); if (i) i.style.width = (tot ? fatti / tot * 100 : 0) + "%"; if (t) t.textContent = `${fatti} di ${tot} serie`;
}
function counter(sess, item, i, field, label) {
  const s = sess.ex[item.key].sets[i];
  const out = h("output", { id: `o-${item.key}-${i}-${field}`, "aria-live": "polite" }, String(s[field] ?? 0));
  const ch = d => { s[field] = Math.max(0, (s[field] ?? 0) + d); s.pre = false; out.textContent = s[field]; out.closest(".set")?.classList.remove("is-pre"); touch(sess); };
  return h("div", { class: "ctr" }, label ? h("em", {}, label) : null,
    h("button", { type: "button", "aria-label": "Meno uno" + (label ? " " + label : ""), onclick: () => ch(-1) }, "−"), out,
    h("button", { type: "button", "aria-label": "Più uno" + (label ? " " + label : ""), onclick: () => ch(1) }, "+"));
}
function kgField(sess, item, i) {
  const ex = EX[item.ex]; const e = sess.ex[item.key]; const s = e.sets[i];
  const inp = h("input", { type: "number", inputmode: "decimal", step: "0.5", min: "0", id: `kg-${item.key}-${i}`, "aria-label": `Peso serie ${i + 1}`, value: s.kg ?? "", placeholder: ex.load === "extra" ? "0" : "–",
    onchange: ev => { s.kg = num(ev.target.value); s.pre = false; for (let j = i + 1; j < e.sets.length; j++) if (!e.sets[j].done) { e.sets[j].kg = s.kg; const o = document.getElementById(`kg-${item.key}-${j}`); if (o) o.value = s.kg ?? ""; } touch(sess); } });
  return h("label", { class: "kg" }, inp, h("span", {}, ex.load === "extra" ? "+kg" : "kg"));
}
function secField(sess, item, i, field, label, unit = "s") {
  const s = sess.ex[item.key].sets[i];
  const inp = h("input", { type: "number", inputmode: "decimal", min: "0", step: unit === "s" ? "1" : "0.5", id: `sf-${item.key}-${i}-${field}`, "aria-label": `${label || "Durata"} serie ${i + 1}`, value: s[field] ?? "", placeholder: "–",
    onchange: ev => { s[field] = num(ev.target.value); s.pre = false; touch(sess); } });
  return h("label", { class: "secin" }, label ? h("span", {}, label) : null, inp, h("span", {}, unit));
}
function setRow(sess, item, e, i) {
  const ex = EX[item.ex], s = e.sets[i];
  const row = h("div", { class: "set" + (s.done ? " is-done" : "") + (s.pre && !s.done ? " is-pre" : "") });
  row.append(h("span", { class: "sn", "aria-label": `Serie ${i + 1}` }, String(i + 1)));
  const f = h("div", { class: "fields" });
  const sides = isSideItem(item);
  if (ex.type === "reps") {
    if (ex.load !== "none") f.append(kgField(sess, item, i));
    if (ex.side) for (const sd of sideOrder()) f.append(counter(sess, item, i, sd, SIDE_S[sd]));
    else f.append(counter(sess, item, i, "reps", null));
  } else if (ex.type === "holds") {
    if (sides) for (const sd of sideOrder()) f.append(counter(sess, item, i, sd, SIDE_S[sd]));
    else f.append(counter(sess, item, i, "n", null));
    f.append(h("span", { class: "tgt" }, `su ${s.target} da ${item.spec.secs} s`));
  } else if (ex.type === "hold") {
    if (sides) for (const sd of sideOrder()) f.append(secField(sess, item, i, sd, SIDE_S[sd]));
    else f.append(secField(sess, item, i, "sec", null));
    f.append(h("span", { class: "tgt" }, `obiettivo ${range(item.spec.lo, item.spec.hi)} s`));
  } else if (ex.type === "time") {
    f.append(secField(sess, item, i, "min", null, "min"));
  } else if (ex.type === "carry") {
    f.append(kgField(sess, item, i));
    for (const sd of sideOrder()) f.append(h("button", { type: "button", class: "side-t", "aria-pressed": String(!!s[sd]), onclick: () => {
      s[sd] = !s[sd]; s.pre = false;
      const was = s.done; s.done = !!(s.sx && s.dx);
      if (s.done && !was) { s.at = now(); touch(sess); afterSetDone(sess, item, i); } else { touch(sess); rerenderCard(sess, item); }
    } }, SIDE_L[sd]));
  }
  row.append(f);
  const acts = h("div", { class: "acts" });
  if (ex.type !== "carry") {
    const lab = ex.type === "reps" ? (ex.tempo ? "Ritmo" : null) : ex.type === "time" ? "Avvia" : "Avvia";
    if (lab) acts.append(h("button", { type: "button", class: "play", "aria-label": `${lab} serie ${i + 1}`, onclick: () => startGuide(sess, item, i) }, ICON_PLAY(), lab));
    acts.append(h("button", { type: "button", class: "done-b", "aria-pressed": String(!!s.done), "aria-label": s.done ? `Serie ${i + 1} completata, tocca per annullare` : `Segna serie ${i + 1} come completata`, onclick: () => toggleDone(sess, item, i) }, ICON_CHECK()));
  }
  row.append(acts);
  return row;
}
function fillAsPrescribed(item, s) {
  const ex = EX[item.ex]; const sides = isSideItem(item);
  if (ex.type === "holds") { if (sides) { for (const sd of ["sx", "dx"]) if (s[sd] == null) s[sd] = s.target; } else if (s.n == null) s.n = s.target; }
  if (ex.type === "hold") { if (sides) { for (const sd of ["sx", "dx"]) if (s[sd] == null) s[sd] = item.spec.lo; } else if (s.sec == null) s.sec = item.spec.lo; }
  if (ex.type === "time" && s.min == null) s.min = item.spec.lo;
}
function toggleDone(sess, item, i) {
  const s = sess.ex[item.key].sets[i];
  if (s.done) { s.done = false; touch(sess); stopRest(); rerenderCard(sess, item); return; }
  fillAsPrescribed(item, s);
  s.done = true; s.pre = false; s.at = now(); touch(sess);
  afterSetDone(sess, item, i);
}
function nextTarget(sess, item, i) {
  const e = sess.ex[item.key];
  const nextIdx = e.sets.findIndex((x, j) => j < setsShown(e, item) && !x.done);
  if (nextIdx >= 0) return { text: `${EX[item.ex].name}, serie ${nextIdx + 1}`, sameCard: true };
  const flat = dayItems(sess).flatMap(s2 => s2.items);
  const k = flat.findIndex(x => x.key === item.key);
  for (let j = k + 1; j < flat.length; j++) {
    const e2 = sess.ex[flat[j].key]; if (!e2 || e2.sets.slice(0, setsShown(e2, flat[j])).some(x => !x.done)) return { text: EX[flat[j].ex].name, key: flat[j].key };
  }
  return { text: "Fine sessione", key: null, end: true };
}
function afterSetDone(sess, item, i) {
  rerenderCard(sess, item);
  const nx = nextTarget(sess, item, i);
  beep(660, 90);
  if (item.rest > 0 && !nx.end) startRest(item.rest, nx.text);
  if (!nx.sameCard) {
    const el = nx.key ? document.getElementById("c-" + nx.key) : $("#end-panel");
    if (el) setTimeout(() => el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" }), 250);
  }
}

/* ---------- recupero ---------- */
let R = null, TICK = null;
function ensureTick() { if (!TICK) TICK = setInterval(tick, 100); }
function maybeStopTick() { if (!R && !C && TICK) { clearInterval(TICK); TICK = null; } }
function startRest(sec, nextText) {
  R = { end: now() + sec * 1000, total: sec * 1000, next: nextText, ended: false };
  $("#rest").hidden = !!C; $("#rb").classList.remove("end"); $("#rb-lab").textContent = "Recupero"; $("#rb-next").textContent = "Poi: " + nextText;
  ensureTick(); tick(); wakeOn();
}
function stopRest() { R = null; $("#rest").hidden = true; maybeStopTick(); }
$("#rb-minus").onclick = () => { if (R && !R.ended) { R.end -= 15000; R.total = Math.max(1000, R.total - 15000); tick(); } };
$("#rb-plus").onclick = () => { if (R && !R.ended) { R.end += 15000; R.total += 15000; tick(); } };
$("#rb-skip").onclick = () => stopRest();
function tickRest(t) {
  if (!R) return;
  const left = R.end - t;
  if (!R.ended && left <= 0) {
    R.ended = true; R.endShown = t;
    beep(880, 160, .3); beep(880, 160, .3, .25); beep(1175, 260, .3, .5); buzz([250, 120, 250]);
    $("#rb").classList.add("end"); $("#rb-lab").textContent = "Recupero finito"; $("#rb-next").textContent = "Vai: " + R.next;
  }
  if (R.ended) { $("#rb-time").textContent = "0:00"; $("#rb-fill").style.width = "100%"; if (t - R.endShown > 6000) stopRest(); return; }
  if (left <= 3000 && left > 0) { const sec = Math.ceil(left / 1000); if (R.lastBeep !== sec) { R.lastBeep = sec; beep(520, 80, .18); } }
  $("#rb-time").textContent = fmtClock(left);
  $("#rb-fill").style.width = Math.min(100, (1 - left / R.total) * 100) + "%";
}

/* ---------- esecuzione guidata ---------- */
let C = null;
function startGuide(sess, item, i) {
  const ex = EX[item.ex]; audio(); stopRest();
  if (ex.type === "reps") return startTempo(sess, item, i);
  const s = sess.ex[item.key].sets[i]; const sides = isSideItem(item); const prep = (S.settings.prep || 3) * 1000;
  const steps = [];
  if (ex.type === "holds") {
    const n = s.target, secs = item.spec.secs * 1000;
    if (sides) { s.sx = 0; s.dx = 0; } else s.n = 0;
    steps.push({ label: "Preparati", dur: prep, kind: "prep" });
    const order = sideOrder();
    if (sides && item.spec.side === "alt") {
      for (let k = 0; k < n; k++) for (let q = 0; q < 2; q++) {
        const sd = order[q];
        steps.push({ label: "Tieni", dur: secs, kind: "work", side: sd, info: `Tenuta ${k + 1} di ${n} · ${SIDE_L[sd]}`, end: () => { s[sd]++; } });
        if (q === 0) steps.push({ label: "Cambia lato", dur: 3000, kind: "switch", info: `Ora il lato ${SIDE_L[order[1]].toLowerCase()}` });
        else if (k < n - 1) steps.push({ label: "Respira", dur: 4000, kind: "rest", info: `Prossima tenuta ${k + 2} di ${n}` });
      }
    } else {
      const ss = sides ? order : [null];
      ss.forEach((sd, q) => {
        for (let k = 0; k < n; k++) {
          steps.push({ label: "Tieni", dur: secs, kind: "work", side: sd, info: `Tenuta ${k + 1} di ${n}${sd ? " · " + SIDE_L[sd] : ""}`, end: () => { if (sd) s[sd]++; else s.n++; } });
          if (k < n - 1) steps.push({ label: "Respira", dur: 4000, kind: "rest", info: `Prossima tenuta ${k + 2} di ${n}` });
        }
        if (sd && q === 0) steps.push({ label: "Cambia lato", dur: 5000, kind: "switch", info: `Ora il lato ${SIDE_L[ss[1]].toLowerCase()}` });
      });
    }
  } else if (ex.type === "hold") {
    const hi = item.spec.hi * 1000, lo = item.spec.lo * 1000;
    const ss = sides ? sideOrder() : [null];
    steps.push({ label: "Preparati", dur: prep, kind: "prep" });
    ss.forEach((sd, q) => {
      steps.push({ label: "Tieni", dur: hi, lo, up: true, kind: "work", side: sd, info: `Obiettivo ${range(item.spec.lo, item.spec.hi)} s${sd ? " · " + SIDE_L[sd] : ""}`, end: el => { s[sd || "sec"] = Math.round(el / 1000); } });
      if (sd && q === 0) steps.push({ label: "Cambia lato", dur: 5000, kind: "switch", info: `Ora il lato ${SIDE_L[ss[1]].toLowerCase()}` });
    });
  } else if (ex.type === "time") {
    steps.push({ label: ex.etichettaTimer || "Vai", dur: item.spec.hi * 60000, lo: item.spec.lo * 60000, up: true, kind: "work", info: `Obiettivo ${range(item.spec.lo, item.spec.hi)} minuti`, end: el => { s.min = Math.round(el / 6000) / 10; } });
  }
  C = { mode: "seq", sess, item, i, steps, k: 0, t0: now(), min: false };
  openCoach(); stepStartFx(steps[0]);
}
function startTempo(sess, item, i) {
  const ex = EX[item.ex]; const s = sess.ex[item.key].sets[i];
  const side = ex.side ? sideOrder()[0] : null; const f = side || "reps";
  s[f] = 0; s.pre = false;
  C = { mode: "tempo", sess, item, i, phases: ex.tempo, idx: -1, prepEnd: now() + (S.settings.prep || 3) * 1000, ps: 0, side, min: false };
  openCoach();
}
function openCoach() {
  $("#rest").hidden = true; $("#coach").hidden = false; $("#co").classList.toggle("min", !!C.min);
  $("#co-ex").textContent = EX[C.item.ex].name; $("#co-sub").textContent = `Serie ${C.i + 1} · ${rxText(C.sess, C.item)}`;
  drawCoachActs(); ensureTick(); tick(); wakeOn();
  $("#co-min").textContent = C.min ? "Espandi" : "Riduci";
}
$("#co-min").onclick = () => { if (!C) return; C.min = !C.min; $("#co").classList.toggle("min", C.min); $("#co-min").textContent = C.min ? "Espandi" : "Riduci"; };
function drawCoachActs() {
  const a = $("#co-acts"); a.replaceChildren();
  if (C.mode === "tempo") {
    a.append(h("button", { type: "button", class: "btn sm", onclick: () => { const f = C.side || "reps"; const s = curSet(); s[f] = Math.max(0, (s[f] || 0) - 1); syncOut(); } }, "−1"));
    if (C.side) a.append(h("button", { type: "button", class: "btn sm", onclick: () => { C.side = C.side === "sx" ? "dx" : "sx"; curSet()[C.side] = 0; C.idx = -1; C.prepEnd = now() + 3000; syncOut(); } }, "Cambia lato"));
    a.append(h("button", { type: "button", class: "btn sm pri", onclick: () => finishCoach(true) }, "Fine serie"));
    a.append(h("button", { type: "button", class: "btn sm ghost", onclick: () => finishCoach(false) }, "Chiudi"));
  } else {
    a.append(h("button", { type: "button", class: "btn sm", onclick: () => endStep(true) }, C.steps[C.k]?.kind === "work" ? "Basta così" : "Avanti"));
    a.append(h("button", { type: "button", class: "btn sm pri", onclick: () => { const st = C.steps[C.k]; if (st && st.kind === "work") st.end?.(now() - C.t0); finishCoach(true); } }, "Fine serie"));
    a.append(h("button", { type: "button", class: "btn sm ghost", onclick: () => finishCoach(false) }, "Chiudi"));
  }
}
const curSet = () => C.sess.ex[C.item.key].sets[C.i];
function syncOut() {
  const s = curSet();
  for (const f of ["reps", "sx", "dx", "n", "sec", "min"]) { const o = document.getElementById(`o-${C.item.key}-${C.i}-${f}`); if (o && s[f] != null) o.textContent = s[f]; }
}
function stepStartFx(st) {
  if (!st) return;
  if (st.kind === "work") { beep(990, 140, .3); buzz(80); }
  else if (st.kind === "switch") { beep(600, 120); beep(600, 120, .25, .18); }
  else if (st.kind === "rest") beep(520, 120);
  drawCoachActs();
}
function endStep(early) {
  const st = C.steps[C.k]; const el = Math.min(now() - C.t0, st.dur);
  if (st.end) st.end(el);
  if (st.kind === "work") { beep(440, 200, .3); syncOut(); }
  C.k++; C.t0 = now();
  if (C.k >= C.steps.length) { finishCoach(true); return; }
  stepStartFx(C.steps[C.k]);
}
function finishCoach(markDone) {
  const c = C; C = null; $("#coach").hidden = true; maybeStopTick();
  const s = c.sess.ex[c.item.key].sets[c.i];
  s.pre = false;
  if (markDone) { fillAsPrescribed(c.item, s); s.done = true; s.at = now(); touch(c.sess); afterSetDone(c.sess, c.item, c.i); }
  else { touch(c.sess); rerenderCard(c.sess, c.item); }
}
function tickCoach(t) {
  if (!C) return;
  const ph = $("#co-phase"), big = $("#co-big"), bar = $("#co-bar"), cnt = $("#co-count");
  if (C.mode === "tempo") {
    const s = curSet(); const f = C.side || "reps";
    if (t < C.prepEnd) {
      ph.textContent = "Preparati"; big.textContent = Math.ceil((C.prepEnd - t) / 1000); bar.style.width = "0%";
      cnt.textContent = (C.side ? SIDE_L[C.side] + " · " : "") + `ripetizioni ${s[f] || 0}`;
      const sec = Math.ceil((C.prepEnd - t) / 1000); if (C.lastP !== sec) { C.lastP = sec; beep(520, 70, .15); }
      return;
    }
    if (C.idx < 0) { C.idx = 0; C.ps = C.prepEnd; beep(990, 120, .3); }
    let dur = C.phases[C.idx][1] * 1000;
    while (t - C.ps >= dur) {
      C.ps += dur; C.idx++;
      if (C.idx >= C.phases.length) { C.idx = 0; s[f] = (s[f] || 0) + 1; syncOut(); beep(990, 120, .3); buzz(40); }
      else beep(700, 80, .2);
      dur = C.phases[C.idx][1] * 1000;
    }
    const el = t - C.ps;
    ph.textContent = C.phases[C.idx][0];
    big.textContent = ((dur - el) / 1000).toFixed(1);
    bar.style.width = Math.min(100, el / dur * 100) + "%";
    cnt.textContent = (C.side ? SIDE_L[C.side] + " · " : "") + `ripetizioni ${s[f] || 0} · obiettivo ${range(C.item.spec.lo, C.item.spec.hi)}`;
    return;
  }
  const st = C.steps[C.k]; if (!st) return;
  const el = t - C.t0;
  if (el >= st.dur) { endStep(false); return; }
  ph.textContent = st.label + (st.side ? " · " + SIDE_L[st.side].toLowerCase() : "");
  if (st.up) {
    const secs = Math.floor(el / 1000);
    big.textContent = st.dur >= 600000 ? fmtClock(el) : String(secs);
    if (st.lo && el >= st.lo && !st.loHit) { st.loHit = true; beep(880, 120, .25); beep(880, 120, .25, .2); }
  } else big.textContent = Math.ceil((st.dur - el) / 1000);
  if (!st.up && st.kind !== "work" && st.dur - el <= 3000) { const sec = Math.ceil((st.dur - el) / 1000); if (st.lastB !== sec) { st.lastB = sec; beep(520, 70, .15); } }
  bar.style.width = Math.min(100, el / st.dur * 100) + "%";
  cnt.textContent = st.info || "";
}
function tick() { const t = now(); tickCoach(t); tickRest(t); }

/* ---------- scheda informativa ---------- */
function openSheet(item, sess) {
  const ex = EX[item.ex]; const I = ex.info; const sh = $("#sheet");
  const close = () => { sh.hidden = true; sh.replaceChildren(); document.removeEventListener("keydown", onKey); lastFocus && lastFocus.focus(); };
  const onKey = ev => { if (ev.key === "Escape") close(); };
  const lastFocus = document.activeElement;
  const fig = ex.img ? h("figure", {},
    h("div", { class: "anim", role: "img", "aria-label": `Inizio e fine del movimento: ${ex.name}` },
      h("img", { src: `img/${ex.img}-0.jpg`, alt: "", loading: "lazy" }), h("img", { class: "f1", src: `img/${ex.img}-1.jpg`, alt: "", loading: "lazy" })),
    h("figcaption", {}, "Inizio e fine del movimento, a ciclo. ", ex.imgNote ? ex.imgNote + " " : "", "Immagini: ", h("a", { href: "https://github.com/yuhonas/free-exercise-db", target: "_blank", rel: "noopener" }, "Free Exercise DB"), ", pubblico dominio."))
    : h("p", { class: "hint" }, "Per questo esercizio non c'è un'immagine affidabile: guarda il video.");
  const rows = [["Muscoli", I.mus], ["Posizione", I.pos], ["Esecuzione", I.ese], ["Respiro", I.resp], ["Cosa devi sentire", I.senti], ["Da non fare", I.no], ...(I.extra || [])];
  const notes = sortedSessions().filter(s => s.ex?.[item.key]?.note || s.ex?.[item.key]?.pain != null).slice(0, 4)
    .map(s => h("p", {}, h("b", {}, fmtShort(s.date) + ": "), [s.ex[item.key].pain != null ? `fastidio ${s.ex[item.key].pain}/10. ` : "", s.ex[item.key].note || ""].join("")));
  const body = h("div", { class: "sh", role: "dialog", "aria-modal": "true", "aria-label": ex.name, onclick: ev => ev.stopPropagation() },
    h("div", { class: "sh-h" }, h("h2", {}, ex.name), h("button", { type: "button", class: "btn sm", id: "sh-close", onclick: close }, "Chiudi")),
    sess ? h("p", { class: "rx" }, rxText(sess, item)) : null,
    fig,
    h("a", { class: "btn vlink", href: "https://www.youtube.com/results?search_query=" + encodeURIComponent(ex.yt), target: "_blank", rel: "noopener" }, "Guarda un video su YouTube"),
    h("p", { class: "lead" }, I.lead),
    h("dl", { class: "info" }, rows.map(([k, val]) => [h("dt", {}, k), h("dd", { class: k === "Da non fare" ? "no" : null }, val)])),
    notes.length ? h("div", { class: "mynotes" }, h("span", { class: "lbl" }, "Le tue note recenti"), notes) : null);
  sh.replaceChildren(body); sh.hidden = false; sh.onclick = close;
  document.addEventListener("keydown", onKey);
  $("#sh-close").focus();
}

/* ---------- diario ---------- */
function renderDiario() {
  const v = $("#v-diario"); v.replaceChildren();
  v.append(h("div", { class: "dayhead" }, h("h2", {}, "Diario")));
  const ss = sortedSessions().filter(s => s.startedAt);
  if (!ss.length) { v.append(h("div", { class: "empty" }, h("b", {}, "Ancora nessuna sessione"), h("p", {}, "Completa una serie nella sezione Oggi: la sessione compare qui con serie, fastidi e note."))); return; }
  const wk = {}; for (const s of ss) { const k = s.date.slice(0, 10); wk[k] = 1; }
  const last28 = ss.filter(s => (parseISO(isoDate()) - parseISO(s.date)) / 864e5 < 28 && DAYS[s.day]?.program).length;
  v.append(h("p", { class: "meta" }, h("span", { class: "chip" }, `${ss.length} sessioni`), h("span", { class: "chip" }, `${(last28 / 4).toFixed(1)} sessioni a settimana nelle ultime 4`)));
  for (const s of ss) v.append(sessCard(s));
}
function sessCard(s) {
  const D = DAYS[s.day] || { label: s.day, sections: [] };
  const items = D.sections ? dayItems(s).flatMap(x => x.items) : [];
  let tot = 0, fatti = 0; for (const it2 of items) { const e = s.ex[it2.key]; const n = e ? setsShown(e, it2) : it2.n; tot += n; if (e) fatti += e.sets.slice(0, n).filter(x => x.done).length; }
  const dur = s.startedAt ? Math.round(((s.endedAt || s.updatedAt || s.startedAt) - s.startedAt) / 60000) : 0;
  const det = h("div", { class: "exlist", hidden: true });
  for (const it2 of items) { const e = s.ex[it2.key]; if (!e || !e.sets.some(x => x.done) && !e.note) continue;
    det.append(h("div", {}, h("span", {}, EX[it2.ex].name), h("span", {}, summarize(it2, e)), e.note || e.pain != null ? h("small", {}, [e.pain != null ? `Fastidio ${e.pain}/10. ` : "", e.note || ""].join("")) : null)); }
  if (!det.childNodes.length) det.append(h("div", {}, h("span", {}, "Nessuna serie completata"), h("span", {}, "")));
  const toggle = h("button", { type: "button", class: "linkbtn", "aria-expanded": "false", onclick: ev => { det.hidden = !det.hidden; ev.target.setAttribute("aria-expanded", String(!det.hidden)); ev.target.textContent = det.hidden ? "Mostra esercizi" : "Nascondi esercizi"; } }, "Mostra esercizi");
  const delWrap = h("div", { class: "row" });
  const drawDel = (confirm) => {
    delWrap.replaceChildren(confirm
      ? h("span", { class: "row" }, h("button", { type: "button", class: "btn sm danger", onclick: () => { delete S.sessions[s.id]; if (S.activeId === s.id) { S.activeId = null; S.draft = null; } persist(s.id); renderDiario(); toast("Sessione eliminata"); } }, "Conferma eliminazione"), h("button", { type: "button", class: "btn sm ghost", onclick: () => drawDel(false) }, "Annulla"))
      : h("button", { type: "button", class: "linkbtn", style: "color:var(--bad)", onclick: () => drawDel(true) }, "Elimina"));
  };
  drawDel(false);
  const c = s.checkin || {}, en = s.end || {};
  return h("article", { class: "sess" },
    h("div", { class: "sess-h" }, h("b", {}, D.label), h("span", {}, fmtDay(s.date) + (s.startedAt ? " · " + fmtHM(s.startedAt) : ""))),
    h("div", { class: "meta" },
      D.program ? h("span", { class: "chip ph" }, `Sett. ${s.week} · ${PH[s.phase] || ""}`) : null,
      dur ? h("span", { class: "chip" }, `${dur} min`) : null,
      h("span", { class: "chip" + (fatti >= tot && tot ? " ok" : "") }, `${fatti}/${tot} serie`),
      c.back != null || en.pain != null ? h("span", { class: "chip" + ((en.pain ?? 0) > 4 ? " warn" : "") }, `Schiena ${c.back ?? "–"} → ${en.pain ?? "–"}`) : null,
      c.sleep != null ? h("span", { class: "chip" }, `Sonno ${c.sleep} h`) : null,
      c.energy != null ? h("span", { class: "chip" }, `Energia ${c.energy}/5`) : null,
      !s.endedAt ? h("span", { class: "chip warn" }, "Non conclusa") : null),
    en.zones?.length ? h("div", { class: "chips" }, en.zones.map(z => h("span", { class: "chip warn" }, z))) : null,
    en.note ? h("p", { class: "note" }, en.note) : null,
    h("div", { class: "cardfoot" }, toggle, delWrap),
    det);
}

/* ---------- progressi ---------- */
let progSel = null;
function exHistory(key) {
  const out = [];
  for (const s of sortedSessions().slice().reverse()) {
    const e = s.ex?.[key]; if (!e) continue; const done = e.sets.filter(x => x.done); if (!done.length) continue;
    out.push({ s, e, done });
  }
  return out;
}
function metricFor(key, exId, rec) {
  const ex = EX[exId]; const d = rec.done;
  if (ex.type === "reps") {
    const kgs = d.map(x => x.kg).filter(k => k != null && k > 0);
    if (ex.load === "kg" && kgs.length) return { y: Math.max(...kgs), unit: "kg", label: "Carico più alto" };
    const reps = d.reduce((a, x) => a + (ex.side ? Math.min(x.sx || 0, x.dx || 0) : (x.reps || 0)), 0);
    return { y: reps, unit: "rip.", label: ex.side ? "Ripetizioni totali (lato più debole)" : "Ripetizioni totali" };
  }
  if (ex.type === "holds") return { y: d.reduce((a, x) => a + (x.n ?? Math.min(x.sx || 0, x.dx || 0)), 0), unit: "tenute", label: "Tenute totali" };
  if (ex.type === "hold") return { y: d.reduce((a, x) => a + (x.sec ?? Math.min(x.sx || 0, x.dx || 0)), 0), unit: "s", label: "Secondi totali" };
  if (ex.type === "time") return { y: d[0].min || 0, unit: "min", label: "Minuti" };
  if (ex.type === "carry") return { y: Math.max(...d.map(x => x.kg || 0)), unit: "kg", label: "Carico" };
  return { y: 0, unit: "", label: "" };
}
function keyToEx(key) {
  for (const D of Object.values(DAYS)) for (const sec of D.sections) for (const it2 of sec.items) if (it2.key === key) return it2;
  for (const r of P.sostituzioni || []) if ((r.con.key || r.con.ex) === key) return it(r.con.ex, r.con.sets, r.con.spec, r.con.rest);
  return null;
}
function renderProgressi() {
  const v = $("#v-progressi"); v.replaceChildren();
  v.append(h("div", { class: "dayhead" }, h("h2", {}, "Progressi")));
  const keys = new Map();
  for (const s of sortedSessions()) for (const [k, e] of Object.entries(s.ex || {})) if (e.sets?.some(x => x.done) && keyToEx(k) && !keys.has(k)) keys.set(k, keyToEx(k));
  // esercizio
  const p1 = h("div", { class: "panel" }, h("h3", {}, "Esercizi"));
  if (!keys.size) p1.append(h("div", { class: "empty" }, h("b", {}, "Nessun dato ancora"), h("p", {}, "Dopo le prime serie completate qui vedi carichi e ripetizioni nel tempo, esercizio per esercizio.")));
  else {
    const order = [...keys.entries()].sort((a, b) => (b[1].main - a[1].main) || EX[a[1].ex].name.localeCompare(EX[b[1].ex].name));
    if (!progSel || !keys.has(progSel)) progSel = order[0][0];
    const sel = h("select", { id: "pg-ex", "aria-label": "Esercizio", onchange: ev => { progSel = ev.target.value; renderProgressi(); } },
      order.map(([k, itm]) => h("option", { value: k, selected: k === progSel ? true : null }, EX[itm.ex].name + (k.includes("risc") ? " (riscaldamento)" : k.startsWith("f1-") ? " (fase 1)" : ""))));
    p1.append(sel);
    const itm = keys.get(progSel); const hist = exHistory(progSel);
    const pts = hist.map(r => { const m = metricFor(progSel, itm.ex, r); return { x: parseISO(r.s.date).getTime(), y: m.y, date: r.s.date, detail: summarize(itm, r.e), unit: m.unit, label: m.label }; });
    if (pts.length) p1.append(h("p", { class: "lbl" }, pts[0].label));
    p1.append(lineChart(pts, { unit: pts[0]?.unit || "" }));
    const tb = h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Data"), h("th", {}, "Serie"), h("th", {}, "Fastidio"))),
      h("tbody", {}, hist.slice().reverse().slice(0, 10).map(r => h("tr", {}, h("td", {}, fmtShort(r.s.date)), h("td", {}, summarize(itm, r.e)), h("td", { class: "n" }, r.e.pain != null ? r.e.pain + "/10" : "–")))));
    p1.append(h("div", { class: "tbl" }, tb));
  }
  v.append(p1);
  // schiena
  const ss = sortedSessions().slice().reverse().filter(s => s.checkin?.back != null);
  const p2 = h("div", { class: "panel" }, h("h3", {}, "Schiena e fastidi"));
  if (ss.length) {
    p2.append(h("p", { class: "lbl" }, "Fastidio alla schiena a inizio sessione, da 0 a 10"));
    p2.append(lineChart(ss.map(s => ({ x: parseISO(s.date).getTime(), y: s.checkin.back, date: s.date, detail: `inizio ${s.checkin.back}, fine ${s.end?.pain ?? "–"}`, unit: "/10" })), { unit: "/10", yMin: 0, yMax: 10 }));
  } else p2.append(h("p", { class: "hint" }, "Segna il fastidio alla schiena in \"Prima di iniziare\" e qui vedi l'andamento."));
  const zc = {}; for (const s of sortedSessions()) if ((parseISO(isoDate()) - parseISO(s.date)) / 864e5 < 30) for (const z of s.end?.zones || []) zc[z] = (zc[z] || 0) + 1;
  const zl = Object.entries(zc).sort((a, b) => b[1] - a[1]);
  p2.append(h("p", { class: "lbl" }, "Zone segnalate negli ultimi 30 giorni"), zl.length ? h("div", { class: "chips" }, zl.map(([z, n]) => h("span", { class: "chip warn" }, `${z} × ${n}`))) : h("p", { class: "hint" }, "Nessuna zona segnalata."));
  v.append(p2);
  v.append(measuresPanel());
  v.append(aiPanel());
  v.append(exportPanel());
}
function niceTicks(lo, hi, n = 4) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || 10 * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step; const out = [];
  for (let x = a; x <= b + step / 2; x += step) out.push(Math.round(x * 100) / 100);
  return out;
}
function lineChart(pts, o = {}) {
  const wrap = h("div", { class: "chart" });
  if (!pts.length) { wrap.append(h("p", { class: "hint" }, "Nessun dato.")); return wrap; }
  if (pts.length < 2) { wrap.append(h("p", { class: "hint" }, `Un solo valore finora: ${pts[0].y} ${o.unit || ""} il ${fmtShort(pts[0].date)}. Il grafico compare dalla seconda sessione.`)); return wrap; }
  const W = 600, H = 230, L = 44, Rr = 16, T = 16, B = 34;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  const tk = niceTicks(o.yMin ?? Math.min(...ys), o.yMax ?? Math.max(...ys));
  const y0 = tk[0], y1 = tk[tk.length - 1];
  const X = x => L + (x - x0) / (x1 - x0) * (W - L - Rr), Y = y => T + (1 - (y - y0) / (y1 - y0 || 1)) * (H - T - B);
  const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Andamento nel tempo" });
  for (const t of tk) { svg.append(sv("line", { x1: L, x2: W - Rr, y1: Y(t), y2: Y(t), stroke: "var(--line)", "stroke-width": "1", "vector-effect": "non-scaling-stroke" })); svg.append(sv("text", { x: L - 8, y: Y(t) + 5, "text-anchor": "end", "font-size": "15", fill: "var(--ink3)" }, String(t))); }
  const lbls = [pts[0], pts[pts.length - 1]]; if (pts.length > 4) lbls.splice(1, 0, pts[Math.floor(pts.length / 2)]);
  for (const p of lbls) svg.append(sv("text", { x: X(p.x), y: H - 10, "text-anchor": p === pts[0] ? "start" : p === pts[pts.length - 1] ? "end" : "middle", "font-size": "15", fill: "var(--ink3)" }, fmtShort(p.date)));
  svg.append(sv("path", { d: pts.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(""), fill: "none", stroke: "var(--plate)", "stroke-width": "2", "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" }));
  pts.forEach((p, i) => svg.append(sv("circle", { cx: X(p.x), cy: Y(p.y), r: i === pts.length - 1 ? 7 : 5, fill: "var(--plate)", stroke: "var(--card)", "stroke-width": "2", "vector-effect": "non-scaling-stroke" })));
  const lp = pts[pts.length - 1];
  svg.append(sv("text", { x: X(lp.x) - 10, y: Y(lp.y) - 12, "text-anchor": "end", "font-size": "16", "font-weight": "700", fill: "var(--ink)" }, `${lp.y} ${o.unit || ""}`));
  const hl = sv("circle", { r: 9, fill: "none", stroke: "var(--ink)", "stroke-width": "2", "vector-effect": "non-scaling-stroke", visibility: "hidden" }); svg.append(hl);
  const tip = h("div", { class: "tip", hidden: true });
  const move = ev => {
    const r = svg.getBoundingClientRect(); const vx = (ev.clientX - r.left) / r.width * W;
    let best = pts[0], bd = Infinity; for (const p of pts) { const d = Math.abs(X(p.x) - vx); if (d < bd) { bd = d; best = p; } }
    hl.setAttribute("cx", X(best.x)); hl.setAttribute("cy", Y(best.y)); hl.setAttribute("visibility", "visible");
    tip.hidden = false; tip.textContent = `${fmtDay(best.date)} · ${best.detail || best.y + " " + (o.unit || "")}`;
    tip.style.left = Math.min(Math.max(X(best.x) / W * 100, 18), 82) + "%"; tip.style.top = (Y(best.y) / H * 100) + "%";
  };
  svg.addEventListener("pointermove", move); svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", () => { tip.hidden = true; hl.setAttribute("visibility", "hidden"); });
  wrap.append(svg, tip); return wrap;
}
function measuresPanel() {
  const list = (S.measures.list || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const d = h("input", { type: "date", id: "ms-date", value: isoDate() });
  const w = h("input", { type: "number", id: "ms-w", inputmode: "decimal", step: "0.1", placeholder: "kg", style: "width:96px" });
  const v = h("input", { type: "number", id: "ms-v", inputmode: "decimal", step: "0.5", placeholder: "cm", style: "width:96px" });
  const p = h("div", { class: "panel" }, h("h3", {}, "Misure"), h("p", { class: "hint" }, "Ogni due settimane, al mattino: peso e circonferenza della vita all'altezza dell'ombelico."),
    h("div", { class: "row" },
      h("label", { class: "field", for: "ms-date" }, h("span", { class: "lbl" }, "Data"), d),
      h("label", { class: "field", for: "ms-w" }, h("span", { class: "lbl" }, "Peso"), w),
      h("label", { class: "field", for: "ms-v" }, h("span", { class: "lbl" }, "Vita"), v),
      h("button", { type: "button", class: "btn pri", onclick: () => {
        const e = { date: d.value || isoDate(), weight: num(w.value), waist: num(v.value) };
        if (e.weight == null && e.waist == null) { toast("Inserisci almeno peso o vita"); return; }
        S.measures.list = [...(S.measures.list || []).filter(x => x.date !== e.date), e]; persist("measures"); renderProgressi(); toast("Misura salvata");
      } }, "Aggiungi")));
  const wp = list.filter(x => x.weight != null), vp = list.filter(x => x.waist != null);
  if (wp.length) p.append(h("p", { class: "lbl" }, "Peso, kg"), lineChart(wp.map(x => ({ x: parseISO(x.date).getTime(), y: x.weight, date: x.date, detail: `${x.weight} kg` })), { unit: "kg" }));
  if (vp.length) p.append(h("p", { class: "lbl" }, "Vita, cm"), lineChart(vp.map(x => ({ x: parseISO(x.date).getTime(), y: x.waist, date: x.date, detail: `${x.waist} cm` })), { unit: "cm" }));
  if (list.length) p.append(h("div", { class: "tbl" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Data"), h("th", {}, "Peso"), h("th", {}, "Vita"), h("th", {}, ""))),
    h("tbody", {}, list.slice().reverse().map(x => h("tr", {}, h("td", {}, fmtShort(x.date)), h("td", { class: "n" }, x.weight != null ? x.weight + " kg" : "–"), h("td", { class: "n" }, x.waist != null ? x.waist + " cm" : "–"),
      h("td", {}, h("button", { type: "button", class: "linkbtn", style: "color:var(--bad)", onclick: () => { S.measures.list = S.measures.list.filter(y => y.date !== x.date); persist("measures"); renderProgressi(); } }, "Elimina"))))))));
  return p;
}
function analysisInput() {
  const ss = sortedSessions().filter(s => s.startedAt).slice(0, 30).reverse();
  const lines = [];
  for (const s of ss) {
    const D = DAYS[s.day]; if (!D) continue;
    const c = s.checkin || {}, en = s.end || {};
    const dur = s.startedAt ? Math.round(((s.endedAt || s.updatedAt || s.startedAt) - s.startedAt) / 60000) : 0;
    lines.push(`${s.date} · ${D.label}${D.program ? ` (settimana ${s.week}, ${PH[s.phase]})` : ""} · ${dur} min · schiena inizio ${c.back ?? "–"}/10, fine ${en.pain ?? "–"}/10${c.sleep != null ? ` · sonno ${c.sleep} h` : ""}${c.energy != null ? ` · energia ${c.energy}/5` : ""}${en.zones?.length ? ` · zone: ${en.zones.join(", ")}` : ""}${en.note ? ` · nota: ${en.note}` : ""}`);
    for (const sec of dayItems(s)) for (const item of sec.items) {
      const e = s.ex[item.key]; if (!e || !e.sets.some(x => x.done)) continue;
      lines.push(`  - ${EX[item.ex].name} [prescritto ${rxText(s, item)}]: ${summarize(item, e)}${e.pain != null ? ` · fastidio ${e.pain}/10` : ""}${e.note ? ` · nota: ${e.note}` : ""}`);
    }
  }
  const ms = (S.measures.list || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(x => `${x.date}: ${x.weight ?? "–"} kg, vita ${x.waist ?? "–"} cm`);
  return `Sei un preparatore atletico con esperienza di fisioterapia. Analizza il diario di allenamento qui sotto di una persona che si sta rimettendo in forma dopo un periodo sedentario e ha episodi di mal di schiena.
Programma: 4 sessioni a settimana (parte alta A e B, parte bassa A e B) con attrezzatura di casa: manubri fino a 15 kg, bilanciere, sbarra, anelli, elastici. Fasi: rientro (settimane 1-4, una serie in meno, 3 ripetizioni di riserva), costruzione (5-10), scarico (11). Progressione doppia: quando tutte le serie arrivano al massimo dell'intervallo si aumenta il peso. Regola del dolore: fastidio fino a 3-4 su 10 accettabile se il giorno dopo torna al livello di partenza.
Rispondi in italiano, al massimo 250 parole, con elenchi brevi e numeri concreti presi dai dati:
1. Progressi reali per esercizio (carichi e ripetizioni).
2. Stalli o cali.
3. Andamento dei fastidi e delle zone segnalate, e se rispettano la regola del dolore.
4. Costanza: sessioni per settimana.
5. Due o tre aggiustamenti concreti coerenti con il programma.
Non fare diagnosi. Se i dati mostrano dolore in aumento, che si irradia o formicolio, consiglia una valutazione da un fisioterapista o da un medico. Se i dati sono pochi, dillo e indica cosa registrare.

Diario:
${lines.join("\n") || "(nessuna sessione)"}

Misure:
${ms.join("\n") || "(nessuna)"}`;
}
function aiPanel() {
  const msg = h("p", { class: "hint", id: "ai-msg", "aria-live": "polite" });
  const box = h("textarea", { id: "ai-text", readonly: true, hidden: true, style: "min-height:160px", "aria-label": "Testo per l'analisi" });
  return h("div", { class: "panel" }, h("h3", {}, "Analisi con Claude"),
    h("p", { class: "hint" }, "L'app prepara un riepilogo di diario, fastidi, note e misure, con le istruzioni per l'analisi. Incollalo in una chat con Claude. Non sostituisce un fisioterapista."),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn pri", onclick: async () => {
        const t = analysisInput();
        try { await navigator.clipboard.writeText(t); box.hidden = true; msg.textContent = "Copiato. Incollalo in una chat con Claude."; }
        catch { box.value = t; box.hidden = false; box.focus(); box.select(); msg.textContent = "Non riesco a copiare da solo: il testo è qui sotto, già selezionato."; }
      } }, "Copia i dati per l'analisi"),
      navigator.share ? h("button", { type: "button", class: "btn", onclick: async () => {
        try { await navigator.share({ title: "Dati allenamento", text: analysisInput() }); }
        catch (e) { if (e?.name !== "AbortError") msg.textContent = "Invio non riuscito: usa Copia."; }
      } }, "Invia a un'app") : null),
    msg, box);
}
function backupJSON() { return JSON.stringify({ app: "rimessa-in-forma", versione: 1, esportato: new Date().toISOString(), impostazioni: S.settings, misure: S.measures, sessioni: sortedSessions() }); }
function backupFile() { return new File([backupJSON()], `rimessa-in-forma-${isoDate()}.json`, { type: "application/json" }); }
function markBackup() { S.settings.lastBackup = isoDate(); S.hideBackup = false; persist("settings"); }
let IMPORT = null;
function exportPanel() {
  const msg = h("p", { class: "hint", "aria-live": "polite" });
  let canFiles = false; try { canFiles = !!(navigator.canShare && navigator.canShare({ files: [backupFile()] })); } catch {}
  const since = S.settings.lastBackup ? fmtDay(S.settings.lastBackup) : "mai";
  const input = h("input", { type: "file", id: "imp-file", accept: "application/json,.json", hidden: true,
    onchange: async ev => { const file = ev.target.files && ev.target.files[0]; ev.target.value = ""; if (file) await prepareImport(file); } });
  const panel = h("div", { class: "panel", id: "backup" }, h("h3", {}, "Backup"),
    h("p", { class: "hint" }, `I dati sono solo su questo telefono. Ultimo backup: ${since}. Salvane uno ogni due settimane, per esempio su Google Drive o mandandolo a te stesso su Telegram.`),
    h("div", { class: "row" },
      canFiles ? h("button", { type: "button", class: "btn pri", onclick: async () => {
        try { await navigator.share({ files: [backupFile()], title: "Backup allenamento" }); markBackup(); msg.textContent = "Backup inviato."; }
        catch (e) { msg.textContent = e?.name === "AbortError" ? "Invio annullato." : "Invio non riuscito: usa Salva file."; }
      } }, "Invia backup") : null,
      h("button", { type: "button", class: canFiles ? "btn" : "btn pri", onclick: () => {
        const f = backupFile(); const url = URL.createObjectURL(f);
        const a = h("a", { href: url, download: f.name }); document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000); markBackup(); msg.textContent = "File salvato nella cartella Download.";
      } }, "Salva file"),
      h("button", { type: "button", class: "btn", onclick: () => input.click() }, "Ripristina da file")),
    input, msg);
  if (IMPORT) panel.append(importConfirm());
  return panel;
}
async function prepareImport(file) {
  let d; try { d = JSON.parse(await file.text()); } catch { IMPORT = { error: "Il file non è un backup valido." }; renderProgressi(); goBackup(); return; }
  const list = Array.isArray(d.sessioni) ? d.sessioni : d.sessions ? Object.values(d.sessions) : [];
  const valid = list.filter(x => x && x.kind === "session" && typeof x.id === "string" && DAYS[x.day]);
  const meas = d.misure || d.measures || null;
  if (!valid.length && !(meas && meas.list && meas.list.length)) { IMPORT = { error: "Nel file non ho trovato sessioni o misure da ripristinare." }; renderProgressi(); goBackup(); return; }
  IMPORT = { sessions: valid, nuove: valid.filter(x => !S.sessions[x.id]).length, settings: d.impostazioni || d.settings || null, measures: meas };
  renderProgressi(); goBackup();
}
function importConfirm() {
  const I = IMPORT;
  if (I.error) return h("div", { class: "banner" }, h("p", {}, I.error), h("div", { class: "row" }, h("button", { type: "button", class: "btn sm", onclick: () => { IMPORT = null; renderProgressi(); } }, "Ok")));
  return h("div", { class: "banner info" },
    h("p", {}, `Il file contiene ${I.sessions.length} sessioni, ${I.nuove} delle quali non sono sul telefono. Le sessioni già presenti vengono sostituite dalla versione del file.`),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn sm pri", onclick: () => {
        for (const x of I.sessions) { S.sessions[x.id] = x; persist(x.id); }
        if (I.measures && I.measures.list) { const m = new Map((S.measures.list || []).map(x => [x.date, x])); for (const x of I.measures.list) if (x && x.date) m.set(x.date, x); S.measures = { kind: "measures", list: [...m.values()] }; persist("measures"); }
        if (I.settings && !S.settings.start) { S.settings = { ...DEF, ...I.settings, kind: "settings" }; persist("settings"); }
        const n = I.sessions.length; IMPORT = null; S.activeId = null; S.draft = null;
        toast(`Ripristinate ${n} sessioni`); renderProgressi(); updateHeader();
      } }, "Ripristina"),
      h("button", { type: "button", class: "btn sm ghost", onclick: () => { IMPORT = null; renderProgressi(); } }, "Annulla")));
}

/* ---------- impostazioni ---------- */
function renderImpost() {
  const v = $("#v-impostazioni"); v.replaceChildren();
  const st = S.settings; const w = weekNo();
  const set = (k, val) => { st[k] = val; persist("settings"); updateHeader(); renderImpost(); };
  const start = h("input", { type: "date", id: "st-start", value: st.start || "", onchange: ev => set("start", ev.target.value || null) });
  const ph = h("select", { id: "st-phase", onchange: ev => set("phase", ev.target.value) },
    [["auto", "Automatica dalla settimana"], ...["rientro", "costruzione", "scarico"].map(k => [k, PH[k]])].map(([k, l]) => h("option", { value: k, selected: st.phase === k ? true : null }, l)));
  const weak = h("select", { id: "st-weak", onchange: ev => set("weak", ev.target.value) },
    [["?", "Non lo so ancora"], ["sx", "Sinistro"], ["dx", "Destro"]].map(([k, l]) => h("option", { value: k, selected: st.weak === k ? true : null }, l)));
  const prep = h("select", { id: "st-prep", onchange: ev => set("prep", +ev.target.value) }, [3, 5, 10].map(k => h("option", { value: String(k), selected: st.prep === k ? true : null }, `${k} secondi`)));
  const tog = (k, label, hint) => h("div", { class: "toggle" }, h("div", {}, h("p", {}, label), hint ? h("p", { class: "hint" }, hint) : null),
    h("button", { type: "button", class: "side-t", "aria-pressed": String(!!st[k]), "aria-label": label, onclick: () => set(k, !st[k]) }, st[k] ? "Attivo" : "Spento"));
  v.append(h("div", { class: "dayhead" }, h("h2", {}, "Impostazioni")));
  v.append(h("div", { class: "panel" }, h("h3", {}, "Programma"),
    h("label", { class: "field", for: "st-start" }, h("span", { class: "lbl" }, "Inizio del programma"), start, h("span", { class: "hint" }, st.start ? `Oggi è la settimana ${w}: ${PH[phaseFor(w)]}.` : "Si imposta da sola alla prima sessione.")),
    h("label", { class: "field", for: "st-phase" }, h("span", { class: "lbl" }, "Fase"), ph, h("span", { class: "hint" }, P.fasi.descrizione)),
    h("label", { class: "field", for: "st-weak" }, h("span", { class: "lbl" }, "Lato più debole"), weak, h("span", { class: "hint" }, "Negli esercizi su un lato l'app parte sempre da questo."))));
  v.append(h("div", { class: "panel" }, h("h3", {}, "Timer"),
    tog("sound", "Suoni", "Bip a ogni fase, a fine tenuta e a fine recupero."),
    tog("vibrate", "Vibrazione", "Dove il telefono lo permette."),
    tog("wake", "Schermo sempre acceso", "Durante la sessione, se il telefono lo permette."),
    h("label", { class: "field", for: "st-prep" }, h("span", { class: "lbl" }, "Conto alla rovescia prima di partire"), prep),
    h("div", { class: "row" }, h("button", { type: "button", class: "btn sm", onclick: () => { audio(); beep(880, 150, .3); beep(1175, 220, .3, .2); buzz(120); } }, "Prova il suono"))));
  const dataP = h("div", { class: "panel" }, h("h3", {}, "Dati"),
    h("p", {}, "Le sessioni sono salvate solo su questo telefono, nella memoria dell'app. Nessun account e nessun server: dal telefono non esce niente, a meno che non lo condivida tu."),
    h("p", { class: "hint" }, S.persisted ? "Android protegge questi dati dalla pulizia automatica dello spazio." : "Questi dati non sono ancora protetti dalla pulizia automatica dello spazio: di solito basta installare l'app sulla schermata Home."),
    h("p", { class: "hint" }, "Si perdono se disinstalli l'app o cancelli i dati del browser: tieni un backup recente."),
    h("div", { class: "row" },
      INSTALL && !isStandalone() ? h("button", { type: "button", class: "btn sm pri", onclick: installApp }, "Installa l'app") : null,
      !S.persisted && navigator.storage && navigator.storage.persist ? h("button", { type: "button", class: "btn sm", onclick: async () => { await askPersist(); renderImpost(); toast(S.persisted ? "Dati protetti" : "Android non l'ha concesso: installa l'app e riprova"); } }, "Proteggi i dati") : null,
      h("button", { type: "button", class: "btn sm", onclick: goBackup }, "Backup e ripristino")));
  v.append(dataP);
  v.append(h("p", { class: "credit" }, `Versione ${APP_VERSION}. Programma e schede dal documento Programma di rimessa in forma. Immagini degli esercizi: `, h("a", { href: "https://github.com/yuhonas/free-exercise-db", target: "_blank", rel: "noopener" }, "Free Exercise DB"), ", pubblico dominio. Caratteri Barlow Condensed e Atkinson Hyperlegible, licenza SIL Open Font."));
}

/* ---------- navigazione e avvio ---------- */
function updateHeader() {
  const w = weekNo(); const sub = $("#hdr-sub");
  sub.textContent = S.settings.start ? `Settimana ${w} · ${PH[phaseFor(w)]}` : "Settimana 1 · Rientro";
}
function show(view) {
  if (!P) return;
  S.view = view;
  for (const b of document.querySelectorAll(".tabs button")) b.setAttribute("aria-current", b.dataset.view === view ? "page" : "false");
  for (const id of ["oggi", "diario", "progressi", "impostazioni"]) $("#v-" + id).hidden = id !== view;
  if (view === "oggi") renderOggi(); else if (view === "diario") renderDiario(); else if (view === "progressi") renderProgressi(); else renderImpost();
  window.scrollTo({ top: 0 });
}
for (const b of document.querySelectorAll(".tabs button")) b.addEventListener("click", () => show(b.dataset.view));
function refreshViews(activeChanged) {
  updateHeader();
  if (S.view === "diario") renderDiario();
  else if (S.view === "progressi") renderProgressi();
  else if (S.view === "impostazioni") { if (!document.activeElement?.matches?.("input,select")) renderImpost(); }
  else if (S.view === "oggi" && activeChanged && !C && !document.activeElement?.matches?.("input,textarea,select")) renderOggi();
}
function afterLoad() {
  if (!S.pickedDay) S.day = suggestDay();
  S.activeId = null; S.draft = null;
  if (S.view === "oggi") renderOggi(); else refreshViews(false);
  updateHeader();
}
async function boot() {
  const saved = lsGet("rif-day"); if (saved && DAYS[saved]) S.day = saved;
  renderOggi();
  const migrate = [];
  try {
    IDB = await idbOpen();
    const all = await idbAll();
    if (!Object.keys(all).length) {
      const raw = lsGet(LS_KEY);
      if (raw) try {
        const d = JSON.parse(raw);
        for (const [k, x] of Object.entries(d.sessions || {})) { all[k] = x; migrate.push(k); }
        if (d.settings) { all.settings = d.settings; migrate.push("settings"); }
        if (d.measures) { all.measures = d.measures; migrate.push("measures"); }
      } catch {}
    }
    for (const [id, val] of Object.entries(all)) {
      if (val && val.kind === "session") S.sessions[id] = val;
      else if (id === "settings") S.settings = { ...DEF, ...val };
      else if (id === "measures") S.measures = val;
    }
    S.mode = "idb";
  } catch {
    const mem = { ...S.sessions }; loadLocal(); Object.assign(S.sessions, mem); S.mode = "local";
  }
  S.loaded = true; setSave("ok", "Salvato sul telefono");
  for (const id of [...(S.pend || []), ...migrate]) persist(id);
  afterLoad();
  try { S.persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch {}
}
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("./sw.js").then(reg => {
    const ready = w => { S.update = w; if (!P) { if (S.programError) renderProgramError(S.programError); return; } if (S.view === "oggi" && !C && !document.activeElement?.matches?.("input,textarea,select")) renderOggi(); };
    if (reg.waiting && navigator.serviceWorker.controller) ready(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; if (w) w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) ready(w); }); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloading) return; reloading = true; flushPending(); setTimeout(() => location.reload(), 300); });
}
loadProgram().then(boot, e => renderProgramError(e.message));
