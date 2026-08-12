// src/components/board/TimerWindow.jsx
// 1枠 = セット（帯）の中の1つを映す「窓」。見た目は旧 TimerCard を踏襲。
// カードは固定基準幅(baseW)で組み、セルに合わせて自動スケールして必ず収める。
// - ヘッダ右の3ボタン: 左=前 / 中=現在 / 右=次（タップで移動）
// - 時間部を左右スワイプでも移動。走行中はロック→長押し(0.5秒)で一時解除
// - 経過秒は移動しても引き継ぐ。走行中に初期位置から動いていると赤枠
// - 通知ボタン・終了自動リセットは登録タイマーごとの設定を使用

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  TIMER_COLORS as COLORS, secToMMSS, START_LG, RESET_LG, NOTIFY_BTN, MODE_BTN, NB_COLOR_MAP,
  START_SM, RESET_SM, KEYPAD_BTN, KEYPAD_BTN_CLEAR,
} from "../helpers";
import { totalSecOf } from "../../lib/store";
import { createSoundPlayer, getVolFor, withBase } from "../../lib/sound-player";

// テンキー入力（最大4桁 → MM:SS）
const bufToSec = (buf) => {
  const s = String(buf).replace(/\D/g, "").slice(-4);
  const mm = Number(s.slice(0, -2) || 0);
  const ss = Number(s.slice(-2) || 0);
  return Math.min(99, ss) + Math.min(599, mm) * 60;
};
const formatTenKeyBuf = (buf) => {
  const s = String(buf || "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  return s.slice(0, 2) + ":" + s.slice(2, 4);
};

const VOLUME = 0.85;
const SNAP_MS = 20000;      // 待機中の初期位置スナップバック（無操作）
const UNLOCK_MS = 6000;     // 走行中スワイプ解除の有効時間
const LONGPRESS_MS = 500;   // 走行中の移動解除の長押し
const BASE_W = 380;         // カード基準幅（スケール前）
const MAX_SCALE = 2.2;

export default function TimerWindow({ timers = [], initialIndex = 0, displayNo = 1 }) {
  const clampIdx = (i) => Math.max(0, Math.min(timers.length - 1, i));
  const nCount = timers.length;
  const wrapIdx = (i) => (nCount > 0 ? ((i % nCount) + nCount) % nCount : 0); // 循環（端は折り返し）
  const [curIdx, setCurIdx] = useState(() => clampIdx(initialIndex));
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [armed, setArmed] = useState(() => new Set());
  const [unlocked, setUnlocked] = useState(false);
  const [blink, setBlink] = useState(false);
  const [scale, setScale] = useState(1);
  const [activeBg, setActiveBg] = useState(null); // 通知（背景色）で変わった背景色ID
  const [keyBuf, setKeyBuf] = useState("");       // テンキー入力バッファ
  const [lastSec, setLastSec] = useState(0);      // テンキー: 最後に使った時間
  const [activity, setActivity] = useState(0);    // 操作のたびに増やしてスナップバックを延長
  const bumpActivity = () => setActivity((a) => a + 1);

  const timer = timers[curIdx] || null;
  const isTenKey = !!timer?.tenKey;
  const startTotalRef = useRef(0);                // スタート時に確定した合計秒
  const tenKeyIdleSec = keyBuf ? bufToSec(keyBuf) : (timer?.tenKeyKeepLast ? lastSec : 0);
  const total = running || finished
    ? (isTenKey ? startTotalRef.current : totalSecOf(timer))
    : (isTenKey ? tenKeyIdleSec : totalSecOf(timer));
  const remaining = running || finished ? Math.max(0, total - elapsed) : total;

  // --- refs ---
  const curIdxRef = useRef(curIdx); curIdxRef.current = curIdx;
  const timersRef = useRef(timers); timersRef.current = timers;
  const armedRef = useRef(armed); armedRef.current = armed;
  const elapsedRef = useRef(0);
  const firedRef = useRef(new Set());     // 発火済みタグ（btn:id / bg:id）
  const activeBgRef = useRef(null);
  const stopSeqRef = useRef(0);           // 終了ループ挿入シーケンスのキャンセル用トークン
  const startIdxRef = useRef(curIdx);
  const tickRef = useRef(null);
  const stopAlarmRef = useRef(null);
  const autoResetRef = useRef(null);
  const unlockTRef = useRef(null);
  const rootRef = useRef(null);
  const visualRef = useRef(null);

  const playerRef = useRef(null);
  if (!playerRef.current) {
    playerRef.current = createSoundPlayer({ baseVolume: VOLUME, getVolFor, withBase });
  }
  const player = playerRef.current;

  const moved = running && curIdx !== startIdxRef.current;

  const clearTimers = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (stopAlarmRef.current) { clearTimeout(stopAlarmRef.current); stopAlarmRef.current = null; }
    if (autoResetRef.current) { clearTimeout(autoResetRef.current); autoResetRef.current = null; }
  };

  useEffect(() => () => { clearTimers(); try { player.stopAll(); } catch {} }, []);

  // セルに合わせてカードを自動スケール
  useLayoutEffect(() => {
    const root = rootRef.current, vis = visualRef.current;
    if (!root || !vis) return;
    const measure = () => {
      const aw = root.clientWidth, ah = root.clientHeight;
      const nh = vis.offsetHeight || 1;
      const s = Math.min(aw / BASE_W, ah / nh, MAX_SCALE);
      setScale(s > 0 ? s : 1);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(root); ro.observe(vis);
    measure();
    return () => ro.disconnect();
  }, [isTenKey]);

  useEffect(() => {
    if (!finished) { setBlink(false); return; }
    setBlink(true);
    const id = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(id);
  }, [finished]);

  useEffect(() => {
    if (running || finished) return;
    if (curIdx === clampIdx(initialIndex)) return;
    if (isTenKey && keyBuf) return; // 10キーで時間入力中は初期位置に戻さない
    const id = setTimeout(() => setCurIdx(clampIdx(initialIndex)), SNAP_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curIdx, activity, running, finished, initialIndex, isTenKey, keyBuf]);

  const finishNow = () => {
    clearTimers();
    const t = timersRef.current[curIdxRef.current];
    const endId = t?.endSound || "";
    if (endId === "alarm8") {
      const loopMs = Math.max(1, Number(t?.endLoopSec || 10)) * 1000;
      const voice = t?.endInsertVoiceSound || "";
      if (voice && voice !== "none") {
        // ピピピッ(1秒)→挟む音声→間隔(endInsertGapSec)→ピピピッループ
        const token = ++stopSeqRef.current;
        const gapMs = Math.max(300, Number(t?.endInsertGapSec ?? 1) * 1000);
        (async () => {
          const cancelled = () => token !== stopSeqRef.current;
          await player.playByIdForDuration("builtin-beep3", 1000);
          if (cancelled()) return;
          await player.playByIdForDuration(voice, gapMs);
          if (cancelled()) return;
          player.playGaplessAlarm8();
        })();
      } else {
        player.playGaplessAlarm8();
      }
      // 「停止まで」秒数で全停止（挿入音声もこの窓の中で行われる）
      stopAlarmRef.current = setTimeout(() => { try { player.stopAll(); } catch {} }, loopMs + 50);
    } else if (endId && endId !== "none") {
      player.playById(endId);
    }
    setRunning(false);
    setFinished(true);
    setElapsed(Math.max(elapsedRef.current, totalSecOf(t)));
    const resetSec = Math.max(0, Number(t?.resetSec ?? 15));
    if (resetSec > 0) autoResetRef.current = setTimeout(() => reset(), resetSec * 1000);
  };

  const start = () => {
    if (running || finished) return;
    if (total <= 0) return;
    try { player.ensureCtx(); } catch {}
    const t = timers[curIdx];
    startTotalRef.current = total;
    if (t?.tenKey && t.tenKeyKeepLast) setLastSec(total);
    if (t?.startSound) player.playById(t.startSound);
    startIdxRef.current = curIdx;
    firedRef.current = new Set();
    elapsedRef.current = 0;
    setElapsed(0);
    setRunning(true);
    setFinished(false);

    tickRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const e = elapsedRef.current;
      setElapsed(e);
      const ct = timersRef.current[curIdxRef.current];
      const ctotal = ct?.tenKey ? startTotalRef.current : totalSecOf(ct);
      const rem = ctotal - e;
      // 通知（背景色）: 残り時間が指定値になったら自動で音声＋背景色
      for (const bg of ct?.notifyBg || []) {
        const tSec = Number(bg.min || 0) * 60 + Number(bg.sec || 0);
        const tag = "bg:" + bg.id;
        if (rem <= tSec && !firedRef.current.has(tag)) {
          if (bg.sound) player.playById(bg.sound);
          if (bg.color) { activeBgRef.current = bg.color; setActiveBg(bg.color); }
          firedRef.current.add(tag);
        }
      }
      // 通知ボタン: 押されている（armed）ものが「残り◯秒」で発火。
      // 1ボタンに①②の2か所（残り時間＋音声）。②は音声未設定なら鳴らさない。
      for (const nb of ct?.notifyButtons || []) {
        if (!armedRef.current.has(nb.id)) continue;
        const points = [
          { key: "a", at: Number(nb.min || 0) * 60 + Number(nb.sec || 0), sound: nb.sound },
          { key: "b", at: Number(nb.min2 || 0) * 60 + Number(nb.sec2 || 0), sound: nb.sound2 },
        ];
        for (const p of points) {
          if (!p.sound || p.sound === "none") continue;
          const tag = "btn:" + nb.id + ":" + p.key;
          if (rem === p.at && !firedRef.current.has(tag)) {
            player.playById(p.sound);
            firedRef.current.add(tag);
          }
        }
      }
      if (e >= ctotal) finishNow();
    }, 1000);
  };

  const reset = () => {
    clearTimers();
    stopSeqRef.current += 1; // 進行中の挿入シーケンスをキャンセル
    try { player.stopAll(); } catch {}
    firedRef.current = new Set();
    elapsedRef.current = 0;
    activeBgRef.current = null;
    setActiveBg(null);
    setArmed(new Set());
    setUnlocked(false);
    setRunning(false);
    setFinished(false);
    setElapsed(0);
    setKeyBuf("");
    setCurIdx(clampIdx(initialIndex));
  };

  // テンキー入力
  const pushDigit = (d) => { if (!running && !finished) setKeyBuf((b) => (String(b) + d).slice(-4)); };
  const clearBuf = () => { if (running || finished) return; setKeyBuf(""); setLastSec(0); };

  const canMove = !finished && (!running || unlocked);

  const moveTo = (target) => {
    if (!canMove || nCount <= 1) return;
    const next = wrapIdx(target);
    if (next === curIdx) return;
    setCurIdx(next);
    curIdxRef.current = next;
    setArmed(new Set());
    firedRef.current = new Set();
    activeBgRef.current = null;
    setActiveBg(null); // 移動したら背景色通知はリセット（移動先の設定で再判定）
    if (running) {
      setUnlocked(false);
      if (unlockTRef.current) { clearTimeout(unlockTRef.current); unlockTRef.current = null; }
      const nt = totalSecOf(timersRef.current[next]);
      if (elapsedRef.current >= nt) finishNow();
    }
  };
  const move = (dir) => {
    if (!canMove || nCount <= 1) return;
    const step = dir > 0 ? 1 : -1;
    let next = wrapIdx(curIdx + step);
    if (running) {
      // 走行中は10キー（時間未設定）には止まらず、同方向の次の通常タイマーへ
      let guard = 0;
      while (timersRef.current[next]?.tenKey && guard < nCount) { next = wrapIdx(next + step); guard++; }
      if (timersRef.current[next]?.tenKey) return; // 全部10キーなら移動しない
    }
    moveTo(next);
  };

  const armUnlock = () => {
    if (!running) return;
    setUnlocked(true);
    if (unlockTRef.current) clearTimeout(unlockTRef.current);
    unlockTRef.current = setTimeout(() => setUnlocked(false), UNLOCK_MS);
  };

  // --- ジェスチャ（時間部） ---
  const gestureRef = useRef(null);
  const onPointerDown = (e) => {
    const lpTimer = setTimeout(() => {
      if (gestureRef.current) gestureRef.current.longFired = true;
      if (running && !unlocked) armUnlock();
    }, LONGPRESS_MS);
    gestureRef.current = { x: e.clientX, y: e.clientY, moved: false, longFired: false, lpTimer };
  };
  const onPointerMove = (e) => {
    const g = gestureRef.current; if (!g) return;
    if (Math.abs(e.clientX - g.x) > 12 || Math.abs(e.clientY - g.y) > 12) {
      g.moved = true;
      if (g.lpTimer) { clearTimeout(g.lpTimer); g.lpTimer = null; }
    }
  };
  const onPointerUp = (e) => {
    const g = gestureRef.current; gestureRef.current = null;
    if (!g) return;
    if (g.lpTimer) clearTimeout(g.lpTimer);
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      move(dx < 0 ? 1 : -1);
      return;
    }
    if (g.longFired) return;
    if (!g.moved && finished) reset();
  };

  const resetLP = useRef(null);
  const onResetDown = () => {
    resetLP.current = setTimeout(() => reset(), 1000);
    const cancel = () => { if (resetLP.current) clearTimeout(resetLP.current); window.removeEventListener("pointerup", cancel); };
    window.addEventListener("pointerup", cancel);
  };

  // 表示
  const displayName = (timer?.name || "").trim() || `タイマー${displayNo}`;
  const label2 = (t) => (t ? (t.label || (t.name || "").slice(0, 2) || "・") : "");
  const prevT = nCount > 1 ? timers[wrapIdx(curIdx - 1)] : null;
  const nextT = nCount > 1 ? timers[wrapIdx(curIdx + 1)] : null;
  const notifyBtns = (timer?.notifyButtons || []).filter((b) => String(b.label || "").trim());
  const hasNeighbors = timers.length > 1;

  const activeBgColor = activeBg ? NB_COLOR_MAP[activeBg] : null;
  const bg = finished ? COLORS.alert : (activeBgColor || (running ? COLORS.run : COLORS.card));
  const cardStyle = {
    background: bg, borderRadius: 16, padding: 16, width: "100%", boxSizing: "border-box",
    display: "flex", flexDirection: "column", alignItems: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,.15)",
    border: moved ? "3px solid #e53935" : "3px solid transparent",
    userSelect: "none", WebkitUserSelect: "none", touchAction: "pan-y", position: "relative",
  };

  // 3ボタンは「縦2文字」で幅を細くし、タイマー名の領域を広げる
  const neighborBtn = (t, dir, isCurrent) => {
    const lbl = isCurrent ? label2(timer) : (t ? label2(t) : "―");
    const chars = [...lbl];
    return (
      <button
        onClick={isCurrent ? undefined : () => move(dir)}
        disabled={isCurrent ? true : (!t || !canMove)}
        title={t?.name || ""}
        style={{
          ...MODE_BTN, minWidth: 30, width: 30, padding: "3px 0",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          lineHeight: 1.0, fontSize: "1rem",
          background: isCurrent ? COLORS.sel : "#fff",
          fontWeight: isCurrent ? 700 : 500,
          opacity: !isCurrent && !t ? 0.25 : 1,
        }}
      >
        {chars.map((c, i) => (
          <span key={i} style={{ display: "block" }}>{c}</span>
        ))}
      </button>
    );
  };

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, overflow: "hidden" }}>
      <div style={isTenKey
        ? { position: "absolute", inset: 0 }
        : { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={isTenKey
          ? { width: "100%", height: "100%" }
          : { transform: `scale(${scale})`, transformOrigin: "center", width: BASE_W }}>
          <div ref={isTenKey ? undefined : visualRef}
            style={isTenKey ? { ...cardStyle, width: "100%", height: "100%", alignItems: "stretch", containerType: "size" } : cardStyle}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={finished ? () => reset() : bumpActivity}>
            {/* ヘッダ: 名前 + 3ボタン（10キーでは非表示） */}
            {!isTenKey && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 4 }}>
              <div style={{
                flex: "1 1 auto", minWidth: 0, fontSize: "2rem", fontWeight: 700, color: COLORS.txt,
                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              }}>
                {displayName}
              </div>
              {hasNeighbors && (
                <div style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
                  {neighborBtn(prevT, -1, false)}
                  {neighborBtn(timer, 0, true)}
                  {neighborBtn(nextT, 1, false)}
                </div>
              )}
            </div>
            )}

            {isTenKey ? (
              <>
                {/* テンキー入力: 時間表示（バッファ/残り） */}
                <div
                  onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                  style={{
                    textAlign: "center", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1',
                    fontSize: "clamp(2rem, 31cqh, 10rem)", fontWeight: 700, color: COLORS.txt, lineHeight: 1.05, marginBottom: 4,
                    flex: "0 0 auto",
                    cursor: canMove ? "grab" : "default",
                    visibility: finished && remaining === 0 && !blink ? "hidden" : "visible",
                  }}
                >
                  {(running || finished) ? secToMMSS(remaining) : formatTenKeyBuf(keyBuf)}
                </div>
                {running && (
                  <div style={{ fontSize: "0.75rem", color: unlocked ? "#e53935" : "#99a", marginBottom: 4, minHeight: 16, textAlign: "center" }}>
                    {unlocked ? "移動できます（スワイプ/ボタン）" : "長押しで移動解除"}
                  </div>
                )}
                <div style={{ flex: "1 1 auto", minHeight: 0, width: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr) 1.5fr", gridTemplateRows: "repeat(4, minmax(0, 1fr))", gap: "clamp(3px, 1.2cqh, 8px)" }}>
                  {[7, 8, 9].map((n, i) => (<button key={n} disabled={running || finished} onClick={() => pushDigit(String(n))} style={{ gridColumn: 1 + i, gridRow: 1, ...KEYPAD_BTN, height: "100%", fontSize: "clamp(0.8rem, 7.5cqh, 2.4rem)" }}>{n}</button>))}
                  {[4, 5, 6].map((n, i) => (<button key={n} disabled={running || finished} onClick={() => pushDigit(String(n))} style={{ gridColumn: 1 + i, gridRow: 2, ...KEYPAD_BTN, height: "100%", fontSize: "clamp(0.8rem, 7.5cqh, 2.4rem)" }}>{n}</button>))}
                  {[1, 2, 3].map((n, i) => (<button key={n} disabled={running || finished} onClick={() => pushDigit(String(n))} style={{ gridColumn: 1 + i, gridRow: 3, ...KEYPAD_BTN, height: "100%", fontSize: "clamp(0.8rem, 7.5cqh, 2.4rem)" }}>{n}</button>))}
                  <button disabled={running || finished} onClick={clearBuf} style={{ gridColumn: 1, gridRow: 4, ...KEYPAD_BTN_CLEAR, height: "100%", fontSize: "clamp(0.7rem, 6cqh, 1.4rem)" }}>クリア</button>
                  <button disabled={running || finished} onClick={() => pushDigit("0")} style={{ gridColumn: 2, gridRow: 4, ...KEYPAD_BTN, height: "100%", fontSize: "clamp(0.8rem, 7.5cqh, 2.4rem)" }}>0</button>
                  <button
                    onPointerDown={running ? onResetDown : (finished ? () => reset() : () => start())}
                    title={running ? "長押しで取り消し" : undefined}
                    style={{ gridColumn: 4, gridRow: "1 / 5", ...(running ? RESET_SM : START_SM), height: "100%", fontSize: "clamp(0.9rem, 7cqh, 1.8rem)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.05 }}
                  >
                    {running ? (<><span>取り消し</span><span style={{ fontSize: "0.72em", fontWeight: 700 }}>（長押し）</span></>) : "スタート"}
                  </button>
                </div>
              </>
            ) : (
              <>
            {/* 時間部（スワイプ移動） */}
            <div style={{ width: "100%", marginBottom: 6 }}>
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{
                  textAlign: "center", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans JP, sans-serif",
                  fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1',
                  fontSize: "4.6rem", fontWeight: 700, color: COLORS.txt, lineHeight: 1.05,
                  cursor: canMove ? "grab" : "default",
                  visibility: finished && remaining === 0 && !blink ? "hidden" : "visible",
                }}
              >
                {secToMMSS(remaining)}
              </div>
            </div>

            {/* 走行中の移動解除ヒント */}
            {running && (
              <div style={{ fontSize: "0.75rem", color: unlocked ? "#e53935" : "#99a", marginBottom: 4, minHeight: 16 }}>
                {unlocked ? "移動できます（スワイプ/ボタン）" : "長押しで移動解除"}
              </div>
            )}

            {/* スタート / 取り消し + 通知ボタン */}
            <div style={{
              width: "100%", display: "grid",
              gridTemplateColumns: notifyBtns.length ? "1fr 1fr" : "1fr",
              gap: 10, alignItems: "stretch",
            }}>
              <button
                onPointerDown={running ? onResetDown : (finished ? () => reset() : () => start())}
                title={running ? "長押しで取り消し" : undefined}
                style={{
                  ...(running ? RESET_LG : START_LG),
                  width: "100%", minHeight: 92, justifySelf: notifyBtns.length ? "stretch" : "center",
                  maxWidth: notifyBtns.length ? "none" : 240,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.05,
                }}
              >
                {running ? (
                  <>
                    <span>取り消し</span>
                    <span style={{ fontSize: "0.78em", fontWeight: 700 }}>（長押し）</span>
                  </>
                ) : "スタート"}
              </button>

              {notifyBtns.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start" }}>
                  {notifyBtns.slice(0, 4).map((b) => {
                    // 有効な発火点（音声あり）の中で最後に来る＝残りが最小の点
                    const ats = [
                      { at: Number(b.min || 0) * 60 + Number(b.sec || 0), s: b.sound },
                      { at: Number(b.min2 || 0) * 60 + Number(b.sec2 || 0), s: b.sound2 },
                    ].filter((p) => p.s && p.s !== "none").map((p) => p.at);
                    const lastAt = ats.length ? Math.min(...ats) : 0;
                    const passed = running && remaining < lastAt;
                    const on = armed.has(b.id);
                    return (
                      <button
                        key={b.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (passed) return;
                          setArmed((prev) => {
                            const n = new Set(prev);
                            if (n.has(b.id)) n.delete(b.id); else n.add(b.id);
                            return n;
                          });
                        }}
                        style={{ ...NOTIFY_BTN, width: "100%", minHeight: 42, background: on ? COLORS.sel : "#fff", opacity: passed ? 0.4 : 1 }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
