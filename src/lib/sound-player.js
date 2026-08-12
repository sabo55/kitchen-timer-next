// src/lib/sound-player.js
// TimerCard 内の createSoundPlayer を共有モジュール化したもの。
// iOS/Safari 対策（WebAudio優先＋HTMLAudioフォールバック、AudioContext維持）を含む。

import { normalizeSoundId } from "../components/helpers";
import * as SoundsHelper from "./sounds-helper";
import { getAudioLibSync } from "./audio-store";

// ==== 共有 AudioContext ====
// 以前は TimerWindow ごとに AudioContext を生成していたため、9枠表示などで
// 端末の「同時AudioContext数」の上限に達し、一部のカードが無音になることがあった。
// アプリ全体で1つの AudioContext を共有し、壊れた（closed/interrupted）場合は作り直す。
let sharedCtx = null;
let keepAliveT = null;
const bufCache = new Map(); // url -> AudioBuffer（共有contextに紐づく。作り直し時にクリア）

function makeCtx() {
  const Ctx = (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) || null;
  if (!Ctx) return null;
  try { return new Ctx(); } catch { return null; }
}

export async function ensureSharedCtx() {
  const Ctx = (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) || null;
  if (!Ctx) return null;
  if (sharedCtx && sharedCtx.state === "closed") { sharedCtx = null; bufCache.clear(); }
  if (!sharedCtx) { sharedCtx = makeCtx(); bufCache.clear(); }
  if (!sharedCtx) return null;
  if (sharedCtx.state !== "running") {
    try { await sharedCtx.resume(); } catch {}
  }
  // iOSの "interrupted"（通話・他アプリ音・画面ロック明け等）でrunningに戻らない場合は作り直す
  if (sharedCtx.state !== "running") {
    try { sharedCtx.close(); } catch {}
    sharedCtx = makeCtx();
    bufCache.clear();
    if (sharedCtx) { try { await sharedCtx.resume(); } catch {} }
  }
  if (!keepAliveT && sharedCtx) {
    keepAliveT = setInterval(() => {
      const ctx = sharedCtx;
      if (!ctx) return;
      if (ctx.state !== "running") { try { ctx.resume && ctx.resume().catch(() => {}); } catch {} return; }
      try {
        const g = ctx.createGain();
        g.gain.value = 0.00001;
        g.connect(ctx.destination);
        const o = ctx.createOscillator();
        o.frequency.value = 30;
        o.connect(g);
        const now = ctx.currentTime;
        o.start(now);
        o.stop(now + 0.02);
      } catch {}
    }, 4000);
  }
  return sharedCtx;
}

// フォアグラウンド復帰・タブ復帰時に先読みでresume（PWA/画面ロック明け対策）
if (typeof document !== "undefined") {
  const wake = () => { try { if (sharedCtx && sharedCtx.state !== "running") sharedCtx.resume && sharedCtx.resume().catch(() => {}); } catch {} };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  window.addEventListener("focus", wake);
}

export function createSoundPlayer(opts = {}) {
  const baseVolume = Number.isFinite(opts.baseVolume) ? opts.baseVolume : 0.85;
  const getVol = typeof opts.getVolFor === "function" ? opts.getVolFor : () => 1;
  const wb = typeof opts.withBase === "function" ? opts.withBase : (p) => p;
  const playing = [];
  let alarm8Loop = null;
  let alarm8WebLoop = null;

  // AudioContext はアプリ全体で共有する（端末の同時AudioContext数上限による無音対策）
  const ensureCtx = ensureSharedCtx;

  const decodeUrlToBuffer = async (url) => {
    const ctx = await ensureCtx();
    if (!ctx) return null;
    const key = String(url);
    if (bufCache.has(key)) return bufCache.get(key);
    try {
      const r = await fetch(url);
      if (!r.ok) { bufCache.set(key, null); return null; }
      const ab = await r.arrayBuffer();
      const buf = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
      bufCache.set(key, buf);
      return buf;
    } catch {
      bufCache.set(key, null);
      return null;
    }
  };

  const playBufOnce = async (url, vol01) => {
    const ctx = await ensureCtx();
    if (!ctx) return false;
    const buf = await decodeUrlToBuffer(url);
    if (!buf) return false;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = vol01;
      src.connect(g);
      g.connect(ctx.destination);
      src.start(0);
      return true;
    } catch {
      return false;
    }
  };

  const mk = (files) => {
    const a = document.createElement("audio");
    a.preload = "auto";
    a.loop = false;
    a.playsInline = true;
    const list = Array.isArray(files) ? files : [files];
    const add = (base, ext, type) => {
      const s = document.createElement("source");
      s.src = wb(`sounds/${base}.${ext}?id=${Date.now()}`);
      s.type = type;
      a.appendChild(s);
    };
    for (const base of list) {
      add(base, "wav", "audio/wav");
      add(base, "mp3", "audio/mpeg");
    }
    try { a.load(); } catch {}
    return a;
  };

  const stopAll = () => {
    if (alarm8WebLoop) {
      try { alarm8WebLoop.stop(0); } catch {}
      try { alarm8WebLoop.disconnect(); } catch {}
      alarm8WebLoop = null;
    }
    if (alarm8Loop) {
      try { alarm8Loop.loop = false; alarm8Loop.pause(); alarm8Loop.currentTime = 0; } catch {}
      alarm8Loop = null;
    }
    while (playing.length) {
      const a = playing.pop();
      try { a.loop = false; a.pause(); a.currentTime = 0; } catch {}
    }
  };

  const playById = async (rawId) => {
    const id = normalizeSoundId(rawId || "");
    if (!id || id === "none") return;
    const vol01 = Math.max(0, Math.min(1, baseVolume * getVol(id)));

    const tryWeb = async (base) => {
      const wav = wb(`sounds/${base}.wav?id=${Date.now()}`);
      const mp3 = wb(`sounds/${base}.mp3?id=${Date.now()}`);
      return (await playBufOnce(wav, vol01)) || (await playBufOnce(mp3, vol01));
    };

    if (id === "alarm8") {
      if (await tryWeb("alarm8")) return;
    } else if (id === "builtin-beep") {
      if (await tryWeb("alarm")) return;
    } else if (id === "builtin-beep3") {
      if (await tryWeb("beep3")) return;
    }

    const url = (typeof SoundsHelper.getSoundUrl === "function") ? SoundsHelper.getSoundUrl(id) : "";
    if (url) {
      const abs = url.startsWith("/") ? wb(url.slice(1)) : url;
      if (await playBufOnce(abs, vol01)) return;
    }

    let a = null;
    if (id === "alarm8") a = mk(["alarm8"]);
    else if (id === "builtin-beep") a = mk(["alarm"]);
    else if (id === "builtin-beep3") a = mk(["beep3"]);
    else {
      if (!url) return;
      a = document.createElement("audio");
      a.preload = "auto";
      a.loop = false;
      const src = document.createElement("source");
      src.src = url.startsWith("/") ? wb(url.slice(1)) : url;
      src.type = "audio/mpeg";
      a.appendChild(src);
    }
    a.volume = vol01;
    playing.push(a);
    a.onended = () => {
      const i = playing.indexOf(a);
      if (i >= 0) playing.splice(i, 1);
    };
    try { try { a.currentTime = 0; } catch {} await a.play(); } catch {
      const i = playing.indexOf(a);
      if (i >= 0) playing.splice(i, 1);
    }
  };

  // 音源の長さ（秒）を取得。取得できなければ 0。
  const getDuration = async (rawId) => {
    const id = normalizeSoundId(rawId || "");
    if (!id) return 0;
    const urls = [];
    if (id === "alarm8") urls.push(wb("sounds/alarm8.wav"), wb("sounds/alarm8.mp3"));
    else if (id === "builtin-beep") urls.push(wb("sounds/alarm.wav"), wb("sounds/alarm.mp3"));
    else if (id === "builtin-beep3") urls.push(wb("sounds/beep3.wav"), wb("sounds/beep3.mp3"));
    else {
      const u = (typeof SoundsHelper.getSoundUrl === "function") ? SoundsHelper.getSoundUrl(id) : "";
      if (u) urls.push(u.startsWith("/") ? wb(u.slice(1)) : u);
    }
    for (const u of urls) {
      const b = await decodeUrlToBuffer(u);
      if (b) return b.duration || 0;
    }
    return 0;
  };

  return {
    ensureCtx,
    getDuration,
    playById,
    playByIdForDuration: async (id, ms) => { await playById(id); await new Promise((r) => setTimeout(r, ms)); },
    playGaplessAlarm8: async () => {
      try {
        const ctx = await ensureCtx();
        if (ctx) {
          const wav = wb(`sounds/alarm8.wav?id=${Date.now()}`);
          const mp3 = wb(`sounds/alarm8.mp3?id=${Date.now()}`);
          const buf = (await decodeUrlToBuffer(wav)) || (await decodeUrlToBuffer(mp3));
          if (buf) {
            if (alarm8WebLoop) {
              try { alarm8WebLoop.stop(0); } catch {}
              try { alarm8WebLoop.disconnect(); } catch {}
              alarm8WebLoop = null;
            }
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            const g = ctx.createGain();
            g.gain.value = Math.max(0, Math.min(1, baseVolume * getVol("alarm8")));
            src.connect(g);
            g.connect(ctx.destination);
            src.start(0);
            alarm8WebLoop = src;
            return true;
          }
        }
      } catch {}
      try {
        if (!alarm8Loop) {
          alarm8Loop = mk(["alarm8"]);
          alarm8Loop.loop = true;
        }
        alarm8Loop.volume = Math.max(0, Math.min(1, baseVolume * getVol("alarm8")));
        try { alarm8Loop.currentTime = 0; } catch {}
        await alarm8Loop.play();
        return true;
      } catch {
        return false;
      }
    },
    stopAll,
  };
}

// 個別音量（AudioLibraryModal由来）を反映する補助
export function getVolFor(rawId) {
  try {
    const s = normalizeSoundId(rawId || "");
    if (!s) return 1;
    const list = getAudioLibSync();
    const rec = Array.isArray(list) ? list.find((x) => String(x?.id) === s) : null;
    const v = Number(rec?.volume);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v / 100)) : 1;
  } catch { return 1; }
}

const BASE_URL = (import.meta?.env?.BASE_URL) ? import.meta.env.BASE_URL : "/";
export const withBase = (p) => `${BASE_URL}${String(p).replace(/^\/+/, "")}`;
