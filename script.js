"use strict";
const $ = s => document.querySelector(s);

// ---- Difficulty settings: each level changes real gameplay ----
const DIFF = {
  easy:   { speed: 60,  count: 5, missLimit: 8, penalty: 1, time: 60, targetLimit: 0 },    // targetLimit = ms allowed per key (0 = none)
  medium: { speed: 95,  count: 6, missLimit: 6, penalty: 2, time: 45, targetLimit: 3000 },
  hard:   { speed: 140, count: 7, missLimit: 5, penalty: 3, time: 30, targetLimit: 1800 }
};
// ---- Key sets for KeyMagnet (JavaScript arrays) ----
const SETS = {
  home:   "asdfjkl".split(""),
  top:    "qwertyuiop".split(""),
  bottom: "zxcvbnm".split(""),
  all:    "abcdefghijklmnopqrstuvwxyz".split("")
};
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const SIZE = 56;

// ---- State ----
const S = { mode: "A", diff: "easy", set: "home", phase: "idle" };   // phase: idle | run | over
let g = {};                                                           // per-session game state
const T = { raf: 0, clock: 0, limit: 0 };                             // the ONLY timer handles

function stopAll() {                       // clears every timer/loop so none can run twice
  cancelAnimationFrame(T.raf); clearInterval(T.clock); clearTimeout(T.limit);
  T.raf = T.clock = T.limit = 0;
}

function resetState() {                    // fresh score, timer, lives, targets, stats
  const D = DIFF[S.diff];
  g = { score: 0, correct: 0, wrong: 0, miss: 0, level: 1, secs: 0, timeLeft: D.time,
        bubbles: [], rts: [], target: null, targetAt: 0, last: 0 };
  $("#stage").innerHTML = "";
  $("#stage").className = S.mode === "B" ? "modeB" : "";
  $("#fb").textContent = ""; $("#fb").className = "";
  if (S.mode === "B") { $("#stage").innerHTML = '<div id="target">?</div>'; markTarget(null); }
  renderHud();
}

function renderHud() {
  const D = DIFF[S.diff], a = g.rts.length ? Math.round(g.rts.reduce((x, y) => x + y, 0) / g.rts.length) : 0;
  const items = [["Score", g.score], ["Level", S.diff], ["Correct", g.correct], ["Wrong", g.wrong]];
  if (S.mode === "A") items.push(["Misses", g.miss + " / " + D.missLimit], ["Depth", g.level * 10 + "m"], ["Time", g.secs + "s"]);
  else items.push(["Time left", g.timeLeft + "s"], ["Avg time", a ? a + " ms" : "-"]);
  $("#hud").innerHTML = items.map(i => `<span>${i[0]}: <b>${i[1]}</b></span>`).join("");
}

function feedback(msg, ok) {
  const f = $("#fb"), s = $("#stage");
  f.textContent = msg; f.className = ok ? "ok" : "bad"; sfx(ok ? "ok" : "bad");
  s.classList.remove("f-ok", "f-bad"); void s.offsetWidth; s.classList.add(ok ? "f-ok" : "f-bad");
}

// ---- Overlay (ready + results) ----
function showOverlay(html) { $("#overlay").innerHTML = html; $("#overlay").hidden = false; }
function hideOverlay() { $("#overlay").hidden = true; }

function showReady() {
  S.phase = "idle";
  const txt = S.mode === "A"
    ? "Pop bubbles by pressing their letter (or tapping them). Wrong key costs points. Don't let too many escape!"
    : "Press the highlighted target key (or tap it). Wrong key costs points. Beat the clock!";
  showOverlay(`<h2>Ready?</h2><p>${txt}</p><button class="primary" id="oStart">Start</button>`);
  $("#oStart").onclick = begin;
}

// ---- Start / Restart (same function: stopAll first, then fresh state) ----
function begin() {
  stopAll(); resetState(); hideOverlay(); S.phase = "run";
  if (S.mode === "A") { fillBubbles(true); g.last = performance.now(); T.raf = requestAnimationFrame(loopA);
    T.clock = setInterval(() => { g.secs++; renderHud(); }, 1000); }
  else { nextTarget(); T.clock = setInterval(() => { g.timeLeft--; renderHud(); if (g.timeLeft <= 0) endGame("Time's up!"); }, 1000); }
}

function endGame(reason) {
  if (S.phase !== "run") return;
  S.phase = "over"; stopAll(); sfx("end");
  const tot = g.correct + g.wrong, acc = tot ? Math.round(g.correct / tot * 100) : 0;
  let st = [["Score", g.score], ["Correct", g.correct], ["Wrong", g.wrong], ["Accuracy", acc + "%"]];
  if (S.mode === "A") st.push(["Misses", g.miss], ["Max depth", g.level * 10 + "m"], ["Survived", g.secs + "s"]);
  else {
    const avg = g.rts.length ? Math.round(g.rts.reduce((x, y) => x + y, 0) / g.rts.length) : 0;
    st.push(["Avg response", avg ? avg + " ms" : "-"], ["Best", g.rts.length ? Math.round(Math.min(...g.rts)) + " ms" : "-"], ["Key set", S.set]);
  }
  showOverlay(`<h2>${reason}</h2><div class="stats">${st.map(s => `<div>${s[0]}<b>${s[1]}</b></div>`).join("")}</div>
    <div class="row"><button class="primary" id="oAgain">Play again</button><button id="oHome">Home</button></div>`);
  $("#oAgain").onclick = begin; $("#oHome").onclick = resetAll;
}

// ================= MODE A: BUBBLES =================
function fillBubbles(initial) {
  const D = DIFF[S.diff], want = Math.min(D.count + Math.floor((g.level - 1) / 2), 10);   // more bubbles as level rises
  const stage = $("#stage"), W = stage.clientWidth, H = stage.clientHeight;
  while (g.bubbles.length < want) {
    const used = g.bubbles.map(b => b.letter), pool = "abcdefghijklmnopqrstuvwxyz".split("").filter(l => !used.includes(l));
    const letter = pool[Math.floor(Math.random() * pool.length)];
    const el = document.createElement("div");
    el.className = "bubble"; el.textContent = letter.toUpperCase();
    el.addEventListener("pointerdown", e => { e.preventDefault(); press(letter); });
    stage.appendChild(el);
    g.bubbles.push({ letter, el, x: Math.random() * (W - SIZE - 30) + 15, ph: Math.random() * 6, y: initial ? H * (0.1 + 0.8 * Math.random()) : H });
  }
}
function removeBubble(b) { g.bubbles = g.bubbles.filter(x => x !== b); b.el.remove(); }

function loopA(ts) {
  if (S.phase !== "run") return;
  const D = DIFF[S.diff], dt = Math.min((ts - g.last) / 1000, 0.05); g.last = ts;
  const speed = D.speed * (1 + 0.12 * (g.level - 1));                 // difficulty ramp: speed
  for (const b of g.bubbles.slice()) {
    b.y -= speed * dt;
    b.el.style.transform = `translate(${b.x + Math.sin(ts / 700 + b.ph) * 14}px,${b.y}px)`;
    if (b.y < -SIZE) {                                                // reached top = miss
      removeBubble(b); g.miss++; feedback("Missed " + b.letter.toUpperCase() + "!", false); renderHud();
      if (g.miss >= D.missLimit) return endGame("Game over");
    }
  }
  fillBubbles(false);
  T.raf = requestAnimationFrame(loopA);
}

function pressA(k) {
  const D = DIFF[S.diff], b = g.bubbles.find(x => x.letter === k);
  if (b) {
    g.score += 10; g.correct++; b.el.classList.add("pop");
    const gone = b; g.bubbles = g.bubbles.filter(x => x !== gone); setTimeout(() => gone.el.remove(), 150);
    if (g.correct % 5 === 0) { g.level++; feedback("Correct! Level up: faster bubbles", true); }   // difficulty ramp
    else feedback("Correct! +10", true);
  } else {
    g.wrong++; g.score = Math.max(0, g.score - D.penalty);            // penalty for wrong key
    feedback("Wrong key! -" + D.penalty, false);
  }
  renderHud();
}

// ================= MODE B: KEYMAGNET =================
function buildKeyboard() {
  $("#kbd").innerHTML = ROWS.map(r => `<div class="kr">${r.split("").map(c => `<div class="key" data-k="${c}">${c.toUpperCase()}</div>`).join("")}</div>`).join("");
  $("#kbd").onpointerdown = e => { const k = e.target.dataset.k; if (k) { e.preventDefault(); press(k); } };
}
function markTarget(k) {
  const set = SETS[S.set];
  document.querySelectorAll(".key").forEach(el => {
    el.classList.toggle("inset", set.includes(el.dataset.k));
    el.classList.toggle("tgt", el.dataset.k === k);
  });
}
function nextTarget() {
  clearTimeout(T.limit);
  const D = DIFF[S.diff], pool = SETS[S.set].filter(k => k !== g.target);
  g.target = pool[Math.floor(Math.random() * pool.length)];
  g.targetAt = performance.now();
  $("#target").textContent = g.target.toUpperCase();
  markTarget(g.target);
  if (D.targetLimit) T.limit = setTimeout(() => {                    // too slow = incorrect, new target
    if (S.phase !== "run") return;
    g.wrong++; g.score = Math.max(0, g.score - D.penalty); feedback("Too slow!", false); renderHud(); nextTarget();
  }, D.targetLimit);
}
function flashKey(k, cls) {
  const el = document.querySelector(`.key[data-k="${k}"]`); if (!el) return;
  el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 250);
}
function pressB(k) {
  const D = DIFF[S.diff];
  if (k === g.target) {
    const rt = performance.now() - g.targetAt; g.rts.push(rt);
    const pts = 10 + (rt < 1000 ? 5 : 0);                              // speed bonus under 1 second
    g.score += pts; g.correct++; flashKey(k, "kok");
    feedback("Correct! +" + pts + " (" + Math.round(rt) + " ms)", true); renderHud(); nextTarget();
  } else {
    g.wrong++; g.score = Math.max(0, g.score - D.penalty); flashKey(k, "kbad");
    feedback("Wrong key! -" + D.penalty, false); renderHud();
  }
}

// ---- Sound (Web Audio, no files) + haptics ----
let ac = null, snd = true;
function sfx(kind) {
  if (!snd) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume();
    const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
    const p = { ok: [660, 990, "sine", .12], bad: [180, 90, "sawtooth", .18], end: [440, 110, "triangle", .6] }[kind];
    o.type = p[2]; o.frequency.setValueAtTime(p[0], t); o.frequency.exponentialRampToValueAtTime(p[1], t + p[3]);
    v.gain.setValueAtTime(.08, t); v.gain.exponentialRampToValueAtTime(.001, t + p[3]);
    o.connect(v); v.connect(ac.destination); o.start(t); o.stop(t + p[3]);
    if (kind === "bad" && navigator.vibrate) navigator.vibrate(60);
  } catch (e) {}
}
(function plankton() {                       // ambient floating particles
  const sea = document.querySelector(".sea");
  for (let i = 0; i < 36; i++) {
    const d = document.createElement("i"), z = 2 + Math.random() * 5;
    d.className = "pk"; d.style.cssText = `left:${Math.random() * 100}%;width:${z}px;height:${z}px;animation-duration:${14 + Math.random() * 22}s;animation-delay:-${Math.random() * 30}s`;
    sea.appendChild(d);
  }
})();
// ---- Input ----
function press(k) { if (S.phase !== "run") return; S.mode === "A" ? pressA(k) : pressB(k); }
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey || !/^[a-zA-Z]$/.test(e.key) || e.target.tagName === "SELECT") return;
  if (S.phase === "run") { e.preventDefault(); press(e.key.toLowerCase()); }
});

// ---- Navigation / controls ----
function openGame(mode) {
  stopAll(); S.mode = mode;
  $("#home").hidden = true; $("#game").hidden = false;
  $("#title").textContent = mode === "A" ? "Bubbles" : "KeyMagnet";
  $("#kbd").hidden = mode !== "B"; if (mode === "B") buildKeyboard();
  resetState(); showReady();
}
function resetAll() {                       // Reset: stop everything, default settings, back to home
  stopAll(); S.phase = "idle"; S.diff = "easy"; S.set = "home";
  $("#setSel").value = "home"; setDiffUI();
  $("#game").hidden = true; $("#home").hidden = false;
}
function setDiffUI() { document.querySelectorAll("#diffRow button").forEach(b => b.classList.toggle("sel", b.dataset.d === S.diff)); }

$("#diffRow").onclick = e => { if (e.target.dataset.d) { S.diff = e.target.dataset.d; setDiffUI(); } };
$("#setSel").onchange = e => { S.set = e.target.value; };
$("#startA").onclick = () => openGame("A");
$("#startB").onclick = () => openGame("B");
$("#bStart").onclick = () => { if (S.phase !== "run") begin(); };
$("#bRestart").onclick = begin;
$("#bReset").onclick = resetAll;
// ---- Themes: user picks the look; saved in the browser ----
const THEMES = { abyss: "ABYSS", neon: "NEON", sunrise: "SUNRISE", forest: "FOREST" };
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $("#home h1").textContent = THEMES[t] + " TYPE";
  document.querySelectorAll("#themeRow button").forEach(b => b.classList.toggle("sel", b.dataset.t === t));
  try { localStorage.setItem("theme", t); } catch (e) {}
}
$("#themeRow").onclick = e => { if (e.target.dataset.t) applyTheme(e.target.dataset.t); };
$("#bTheme").onclick = () => { const k = Object.keys(THEMES); applyTheme(k[(k.indexOf(document.documentElement.dataset.theme) + 1) % k.length]); };
let saved = "abyss"; try { saved = localStorage.getItem("theme") || "abyss"; } catch (e) {}
applyTheme(THEMES[saved] ? saved : "abyss");
$("#bSnd").onclick = e => { snd = !snd; e.target.textContent = "Sound: " + (snd ? "On" : "Off"); };
