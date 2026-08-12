// src/components/board/TimerRegistry.jsx
// 登録タイマー画面。個々のタイマー定義（プール）を編集する。
// - 横並び5個目安・横スクロール
// - 「複製」で横にコピー（似たタイマーの微調整に）
// - 名前(7)・ラベル(2)・時間・開始/終了音・ループ秒・自動リセット秒・通知ボタン

import React from "react";
import { makeNotifyBtn, makeNotifyBg } from "../../lib/store";
import { NB_COLOR_MAP } from "../helpers";
import { buildRadioSoundList } from "../../lib/sounds-helper";

const BG_COLORS = ["yellow", "orange", "green", "blue", "pink"];

const MIN_OPTS = Array.from({ length: 100 }, (_, i) => i);
const SEC_OPTS = Array.from({ length: 60 }, (_, i) => i);

const startEndOpts = () => buildRadioSoundList({ withBuiltins: true, withCustom: true, withSilent: true, withTimes: false });
const notifyOpts = () => buildRadioSoundList({ withBuiltins: true, withCustom: true, withSilent: true, withTimes: true });

const sel = { height: 34, borderRadius: 8, border: "1px solid #bbb", padding: "0 6px", background: "#fff", fontSize: 14 };
const inp = { height: 34, borderRadius: 8, border: "1px solid #bbb", padding: "0 8px", background: "#fff", fontSize: 14, width: "100%", boxSizing: "border-box" };
const lbl = { fontSize: 12, color: "#556", fontWeight: 700, marginBottom: 2 };
const fieldGap = { display: "flex", flexDirection: "column", gap: 2, marginTop: 8 };

export default function TimerRegistry({ timers = [], onUpdate, onDuplicate, onDelete, onAdd, onClose }) {
  const sOpts = startEndOpts();
  const nOpts = notifyOpts();

  const SoundSelect = ({ value, onChange, opts }) => (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={{ ...sel, width: "100%" }}>
      {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      {value && !opts.some((o) => o.id === value) && <option value={value}>{value}</option>}
    </select>
  );

  const col = (t, idx) => {
    const upd = (patch) => onUpdate(t.id, patch);
    const nbs = t.notifyButtons || [];
    const setNbs = (arr) => upd({ notifyButtons: arr });

    return (
      <div key={t.id} style={{
        flex: "0 0 240px", width: 240, border: "1px solid #ddd", borderRadius: 12, padding: 12,
        background: "#fafafa", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontWeight: 700, color: "#334" }}>No.{idx + 1}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onDuplicate(idx)} title="この内容を横にコピー"
              style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #888", background: "#fff", fontSize: 12, fontWeight: 700 }}>複製</button>
            <button onClick={() => onDelete(t.id)} title="削除"
              style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #e53935", color: "#e53935", background: "#fff", fontSize: 12, fontWeight: 700 }}>削除</button>
          </div>
        </div>

        <div style={fieldGap}>
          <span style={lbl}>タイマー名（7文字まで）</span>
          <input style={inp} maxLength={7} value={t.name} onChange={(e) => upd({ name: e.target.value })} />
        </div>

        <div style={fieldGap}>
          <span style={lbl}>ラベル（3ボタン用・2文字）</span>
          <input style={{ ...inp, width: 80 }} maxLength={2} value={t.label} onChange={(e) => upd({ label: e.target.value })} placeholder="例:かた" />
        </div>

        <div style={{ ...fieldGap, background: t.tenKey ? "#eef6ff" : "transparent", borderRadius: 8, padding: t.tenKey ? 6 : 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
            <input type="checkbox" checked={!!t.tenKey} onChange={(e) => upd({ tenKey: e.target.checked })} />
            10キー（自由入力）
          </label>
          {t.tenKey && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 4 }}>
              <input type="checkbox" checked={t.tenKeyKeepLast !== false} onChange={(e) => upd({ tenKeyKeepLast: e.target.checked })} />
              最後に使った時間を保持
            </label>
          )}
        </div>

        {!t.tenKey && (
          <div style={fieldGap}>
            <span style={lbl}>時間</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select style={sel} value={t.timeMin} onChange={(e) => upd({ timeMin: Number(e.target.value) })}>
                {MIN_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select><span>分</span>
              <select style={sel} value={t.timeSec} onChange={(e) => upd({ timeSec: Number(e.target.value) })}>
                {SEC_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select><span>秒</span>
            </div>
          </div>
        )}

        <div style={fieldGap}>
          <span style={lbl}>開始音</span>
          <SoundSelect value={t.startSound} onChange={(v) => upd({ startSound: v })} opts={sOpts} />
        </div>

        <div style={fieldGap}>
          <span style={lbl}>終了音</span>
          <SoundSelect value={t.endSound} onChange={(v) => upd({ endSound: v })} opts={sOpts} />
        </div>

        {t.endSound === "alarm8" && (
          <>
            <div style={fieldGap}>
              <span style={lbl}>停止まで（秒）</span>
              <input type="number" min={1} max={60} style={{ ...inp, width: 90 }} value={t.endLoopSec}
                onChange={(e) => upd({ endLoopSec: Number(e.target.value) })} />
            </div>
            <div style={fieldGap}>
              <span style={lbl}>ループ中に挟む音声（ピピピッ→音声→ピピピッ…）</span>
              <SoundSelect value={t.endInsertVoiceSound} onChange={(v) => upd({ endInsertVoiceSound: v })} opts={sOpts} />
            </div>
            {t.endInsertVoiceSound && (
              <div style={fieldGap}>
                <span style={lbl}>音声の後の間隔（秒）</span>
                <select style={{ ...sel, width: 90 }} value={t.endInsertGapSec}
                  onChange={(e) => upd({ endInsertGapSec: Number(e.target.value) })}>
                  {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        <div style={fieldGap}>
          <span style={lbl}>終了後の自動リセット（秒・0でしない）</span>
          <input type="number" min={0} max={600} style={{ ...inp, width: 90 }} value={t.resetSec}
            onChange={(e) => upd({ resetSec: Number(e.target.value) })} />
        </div>

        {/* 通知（背景色）: 残り時間で自動発火 */}
        {!t.tenKey && (
        <div style={{ ...fieldGap, marginTop: 12 }}>
          <span style={lbl}>通知（背景色）｜残り◯分◯秒で自動的に音声＋背景色（最大3）</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(t.notifyBg || []).map((bg, i) => {
              const setBgs = (arr) => upd({ notifyBg: arr });
              const bgs = t.notifyBg || [];
              return (
                <div key={bg.id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 6, background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 12 }}>残り</span>
                    <select style={{ ...sel, height: 30 }} value={bg.min} onChange={(e) => setBgs(bgs.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x))}>
                      {MIN_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select><span style={{ fontSize: 12 }}>分</span>
                    <select style={{ ...sel, height: 30 }} value={bg.sec} onChange={(e) => setBgs(bgs.map((x, j) => j === i ? { ...x, sec: Number(e.target.value) } : x))}>
                      {SEC_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select><span style={{ fontSize: 12 }}>秒</span>
                    <button onClick={() => setBgs(bgs.filter((_, j) => j !== i))}
                      style={{ marginLeft: "auto", padding: "2px 6px", borderRadius: 6, border: "1px solid #e53935", color: "#e53935", background: "#fff", fontSize: 11 }}>×</button>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <SoundSelect value={bg.sound} onChange={(v) => setBgs(bgs.map((x, j) => j === i ? { ...x, sound: v } : x))} opts={nOpts} />
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#556" }}>背景色</span>
                    {BG_COLORS.map((c) => (
                      <button key={c} onClick={() => setBgs(bgs.map((x, j) => j === i ? { ...x, color: c } : x))}
                        title={c}
                        style={{ width: 24, height: 24, borderRadius: 6, background: NB_COLOR_MAP[c], cursor: "pointer",
                          border: bg.color === c ? "2px solid #111" : "1px solid #bbb" }} />
                    ))}
                  </div>
                </div>
              );
            })}
            {(t.notifyBg || []).length < 3 && (
              <button onClick={() => upd({ notifyBg: [...(t.notifyBg || []), makeNotifyBg({})] })}
                style={{ padding: "6px", borderRadius: 8, border: "1px dashed #888", background: "#fff", fontSize: 13, fontWeight: 700 }}>＋通知（背景色）</button>
            )}
          </div>
        </div>
        )}

        {/* 通知ボタン */}
        {!t.tenKey && (
        <div style={{ ...fieldGap, marginTop: 12 }}>
          <span style={lbl}>通知ボタン（経過◯分◯秒で鳴らす・最大4）</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nbs.map((nb, i) => (
              <div key={nb.id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 6, background: "#fff" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <input style={{ ...inp, height: 30, width: 90 }} maxLength={4} placeholder="ボタン名" value={nb.label}
                    onChange={(e) => setNbs(nbs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <button onClick={() => setNbs(nbs.filter((_, j) => j !== i))}
                    style={{ marginLeft: "auto", padding: "2px 6px", borderRadius: 6, border: "1px solid #e53935", color: "#e53935", background: "#fff", fontSize: 11 }}>×</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <select style={{ ...sel, height: 30 }} value={nb.min} onChange={(e) => setNbs(nbs.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x))}>
                    {MIN_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select><span style={{ fontSize: 12 }}>分</span>
                  <select style={{ ...sel, height: 30 }} value={nb.sec} onChange={(e) => setNbs(nbs.map((x, j) => j === i ? { ...x, sec: Number(e.target.value) } : x))}>
                    {SEC_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select><span style={{ fontSize: 12 }}>秒</span>
                </div>
                <SoundSelect value={nb.sound} onChange={(v) => setNbs(nbs.map((x, j) => j === i ? { ...x, sound: v } : x))} opts={nOpts} />
              </div>
            ))}
            {nbs.length < 4 && (
              <button onClick={() => setNbs([...nbs, makeNotifyBtn({ label: `通知${nbs.length + 1}` })])}
                style={{ padding: "6px", borderRadius: 8, border: "1px dashed #888", background: "#fff", fontSize: 13, fontWeight: 700 }}>＋通知ボタン</button>
            )}
          </div>
        </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>タイマー登録</div>
        <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #888", background: "#f5f5f5", fontWeight: 700 }}>閉じる</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {timers.map((t, i) => col(t, i))}
          <button onClick={onAdd} style={{
            flex: "0 0 160px", height: 120, border: "2px dashed #aaa", borderRadius: 12, background: "#fff",
            fontSize: 16, fontWeight: 700, color: "#556",
          }}>＋タイマー追加</button>
        </div>
      </div>
    </div>
  );
}
