// src/components/board/TimerRegistry.jsx
// 登録タイマー画面。個々のタイマー定義（プール）を編集する。
// - 横並び5個目安・横スクロール
// - 「複製」で横にコピー（似たタイマーの微調整に）
// - 名前(7)・ラベル(2)・時間・開始/終了音・ループ秒・自動リセット秒・通知ボタン

import React from "react";
import { makeNotifyBtn, makeNotifyBg } from "../../lib/store";
import { NB_COLOR_MAP, NB_COLOR_LABEL } from "../helpers";
import { buildRadioSoundList } from "../../lib/sounds-helper";

const BG_COLORS = ["yellow", "orange", "green", "blue", "pink"];

const MIN_OPTS = Array.from({ length: 100 }, (_, i) => i);
const SEC_OPTS = Array.from({ length: 60 }, (_, i) => i);

// 時間アナウンス（〇秒前/〇分経過）は実音源が無く鳴らないため候補から除外（withTimes: false）
const startEndOpts = () => buildRadioSoundList({ withBuiltins: true, withCustom: true, withSilent: true, withTimes: false });
const notifyOpts = () => buildRadioSoundList({ withBuiltins: true, withCustom: true, withSilent: true, withTimes: false });

const sel = { height: 34, borderRadius: 8, border: "1px solid #bbb", padding: "0 6px", background: "#fff", fontSize: 14 };
const inp = { height: 34, borderRadius: 8, border: "1px solid #bbb", padding: "0 8px", background: "#fff", fontSize: 14, width: "100%", boxSizing: "border-box" };
const lbl = { fontSize: 12, color: "#556", fontWeight: 700, marginBottom: 2 };
const fieldGap = { display: "flex", flexDirection: "column", gap: 2, marginTop: 8 };

export default function TimerRegistry({ timers = [], onUpdate, onDuplicate, onDelete, onAdd, onClose, onSave }) {
  const sOpts = startEndOpts();
  const nOpts = notifyOpts();

  // 保存の確認フィードバック（変更は自動保存だが、明示保存＋「保存しました」を出す）
  const [savedKey, setSavedKey] = React.useState(null);
  const flashSaved = (key) => {
    try { onSave && onSave(); } catch {}
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1600);
  };

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
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {savedKey === t.id && <span style={{ fontSize: 11, color: "#2a7", fontWeight: 700 }}>保存しました</span>}
            <button onClick={() => flashSaved(t.id)} title="このタイマーの設定を保存"
              style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #2a7", background: "#eaf7ef", color: "#1a7", fontSize: 12, fontWeight: 700 }}>保存</button>
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
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", rowGap: 6 }}>
                    <span style={{ fontSize: 12, color: "#556" }}>背景色</span>
                    {BG_COLORS.map((c) => (
                      <button key={c} onClick={() => setBgs(bgs.map((x, j) => j === i ? { ...x, color: c } : x))}
                        title={NB_COLOR_LABEL[c] || c}
                        style={{ width: 24, height: 24, borderRadius: 6, background: NB_COLOR_MAP[c], cursor: "pointer", flex: "0 0 auto",
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

        {/* 通知ボタン（1ボタンに①②の2か所・残り時間で鳴らす） */}
        {!t.tenKey && (
        <div style={{ ...fieldGap, marginTop: 12 }}>
          <span style={lbl}>通知ボタン（押すと「残り◯分◯秒」で鳴る・1つに2か所・最大4）</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {nbs.map((nb, i) => {
              const patch = (p) => setNbs(nbs.map((x, j) => j === i ? { ...x, ...p } : x));
              // ①②の各発火点（番号バッジ＋役割＋色分けで境目を明確化）
              const point = (badge, caption, minKey, secKey, soundKey, tint) => (
                <div style={{ border: "1px solid #cfd8e3", borderRadius: 8, padding: 8, background: tint }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "#3b4a5e", color: "#fff", fontSize: 12, fontWeight: 800, flex: "0 0 auto" }}>{badge}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#445" }}>{caption}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12 }}>残り</span>
                    <select style={{ ...sel, height: 30 }} value={nb[minKey]} onChange={(e) => patch({ [minKey]: Number(e.target.value) })}>
                      {MIN_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select><span style={{ fontSize: 12 }}>分</span>
                    <select style={{ ...sel, height: 30 }} value={nb[secKey]} onChange={(e) => patch({ [secKey]: Number(e.target.value) })}>
                      {SEC_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select><span style={{ fontSize: 12 }}>秒</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <SoundSelect value={nb[soundKey]} onChange={(v) => patch({ [soundKey]: v })} opts={nOpts} />
                  </div>
                </div>
              );
              // 並び替え（表示上の配置に直結するので上下移動できる）
              const moveNb = (to) => {
                if (to < 0 || to >= nbs.length) return;
                const arr = [...nbs];
                const [x] = arr.splice(i, 1);
                arr.splice(to, 0, x);
                setNbs(arr);
              };
              const orderBtn = { width: 26, height: 26, padding: 0, borderRadius: 6, border: "1px solid #888", background: "#fff", fontSize: 13, lineHeight: 1, color: "#333" };
              return (
                <div key={nb.id} style={{ border: "2px solid #9fb0c6", borderRadius: 10, background: "#fff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
                  {/* ヘッダ: 通知ボタン番号 + 名前 + 並び替え/削除 */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 8px", background: "#e9eef5", borderBottom: "1px solid #cfd8e3" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#2f3b4c", whiteSpace: "nowrap" }}>ボタン{i + 1}</span>
                    <input style={{ ...inp, height: 30, width: 74 }} maxLength={4} placeholder="ボタン名" value={nb.label}
                      onChange={(e) => patch({ label: e.target.value })} />
                    <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
                      <button onClick={() => moveNb(i - 1)} disabled={i === 0} title="上へ"
                        style={{ ...orderBtn, opacity: i === 0 ? 0.35 : 1 }}>{"▲︎"}</button>
                      <button onClick={() => moveNb(i + 1)} disabled={i === nbs.length - 1} title="下へ"
                        style={{ ...orderBtn, opacity: i === nbs.length - 1 ? 0.35 : 1 }}>{"▼︎"}</button>
                      <button onClick={() => setNbs(nbs.filter((_, j) => j !== i))} title="削除"
                        style={{ padding: "2px 6px", borderRadius: 6, border: "1px solid #e53935", color: "#e53935", background: "#fff", fontSize: 11 }}>×</button>
                    </div>
                  </div>
                  {/* 本体: ①②の2か所（色分け） */}
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {point("1", "1つ目に鳴らす", "min", "sec", "sound", "#eef5ff")}
                    {point("2", "2つ目（「（無音）」でなし）", "min2", "sec2", "sound2", "#fff6e9")}
                  </div>
                </div>
              );
            })}
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
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {savedKey === "__all__" && <span style={{ fontSize: 13, color: "#2a7", fontWeight: 700 }}>すべて保存しました</span>}
          <button onClick={() => flashSaved("__all__")} title="すべてのタイマー設定を保存"
            style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #2a7", background: "#2a7", color: "#fff", fontWeight: 800 }}>まとめて保存</button>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #888", background: "#f5f5f5", fontWeight: 700 }}>閉じる</button>
        </div>
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
