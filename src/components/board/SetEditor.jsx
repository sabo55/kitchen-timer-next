// src/components/board/SetEditor.jsx
// セット作成画面。登録タイマーを並べて「帯（セット）」を作る。
// - セットの追加・名前変更・削除
// - 含めるタイマーをタップで追加/削除
// - 並び順（スワイプで巡る順）を ↑↓ で変更

import React, { useState, useEffect } from "react";

const inp = { height: 34, borderRadius: 8, border: "1px solid #bbb", padding: "0 8px", background: "#fff", fontSize: 14 };
const lbl = { fontSize: 13, color: "#556", fontWeight: 700, marginBottom: 6 };

export default function SetEditor({ sets = [], timers = [], onAddSet, onUpdateSet, onDeleteSet, onClose, onGoToBoard }) {
  const [selectedId, setSelectedId] = useState(sets[0]?.id ?? null);

  useEffect(() => {
    if (!sets.some((s) => s.id === selectedId)) setSelectedId(sets[0]?.id ?? null);
  }, [sets, selectedId]);

  const cur = sets.find((s) => s.id === selectedId) || null;
  const timerById = (id) => timers.find((t) => t.id === id) || null;

  const toggleTimer = (tid) => {
    if (!cur) return;
    const has = cur.timerIds.includes(tid);
    const next = has ? cur.timerIds.filter((x) => x !== tid) : [...cur.timerIds, tid];
    onUpdateSet(cur.id, { timerIds: next });
  };
  const move = (idx, dir) => {
    if (!cur) return;
    const arr = [...cur.timerIds];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    onUpdateSet(cur.id, { timerIds: arr });
  };
  const removeAt = (idx) => {
    if (!cur) return;
    onUpdateSet(cur.id, { timerIds: cur.timerIds.filter((_, i) => i !== idx) });
  };
  const del = () => {
    if (!cur) return;
    if (!window.confirm(`セット「${cur.name}」を削除します。よろしいですか？（このセットを使っていた枠は未割り当てになります）`)) return;
    onDeleteSet(cur.id);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>セット作成</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {onGoToBoard && (
            <button onClick={onGoToBoard} title="ボード割り当てへ進む"
              style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #2a7", background: "#eaf7ef", color: "#1a7", fontWeight: 800 }}>次へ：ボード割り当て →</button>
          )}
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #888", background: "#f5f5f5", fontWeight: 700 }}>閉じる</button>
        </div>
      </div>

      {/* セット選択 */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {sets.map((s) => (
          <button key={s.id} onClick={() => setSelectedId(s.id)}
            style={{ padding: "8px 14px", borderRadius: 999, fontWeight: 700,
              border: s.id === selectedId ? "2px solid #2a7" : "1px solid #bbb",
              background: s.id === selectedId ? "#eaf7ef" : "#fff", color: s.id === selectedId ? "#1a7" : "#333" }}>
            {s.name}（{s.timerIds.length}）
          </button>
        ))}
        <button onClick={onAddSet}
          style={{ padding: "8px 14px", borderRadius: 999, border: "2px dashed #aaa", background: "#fff", fontWeight: 700, color: "#556" }}>＋セット追加</button>
      </div>

      {!cur ? (
        <div style={{ padding: 24, color: "#778" }}>セットがありません。「＋セット追加」で作成してください。</div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* 左：セット名 + 含めるタイマー */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={lbl}>セット名</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} maxLength={12} value={cur.name}
                  onChange={(e) => onUpdateSet(cur.id, { name: e.target.value })} />
                <button onClick={del} style={{ padding: "0 12px", borderRadius: 8, border: "1px solid #e53935", color: "#e53935", background: "#fff", fontWeight: 700 }}>セット削除</button>
              </div>
            </div>

            <div style={lbl}>含めるタイマー（タップで追加／削除）</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {timers.map((t) => {
                const on = cur.timerIds.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleTimer(t.id)}
                    style={{ padding: "8px 12px", borderRadius: 10, fontWeight: 700,
                      border: on ? "2px solid #2a7" : "1px solid #bbb",
                      background: on ? "#eaf7ef" : "#fff", color: on ? "#177" : "#333" }}>
                    {on ? "✓ " : ""}{t.name || "（無名）"}
                  </button>
                );
              })}
              {timers.length === 0 && <span style={{ color: "#778" }}>タイマーが登録されていません（「タイマー登録」で作成してください）</span>}
            </div>
          </div>

          {/* 右：並び順 */}
          <div>
            <div style={lbl}>並び順（左スワイプで次に進む向き）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cur.timerIds.map((tid, i) => {
                const t = timerById(tid);
                return (
                  <div key={tid + "_" + i} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e5e5", borderRadius: 8, padding: "6px 10px", background: "#fafafa" }}>
                    <span style={{ width: 24, textAlign: "center", color: "#889", fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: 700 }}>{t ? t.name : "（削除済み）"}</span>
                    <button onClick={() => move(i, -1)} disabled={i === 0} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #999", background: "#fff" }}>↑</button>
                    <button onClick={() => move(i, +1)} disabled={i === cur.timerIds.length - 1} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #999", background: "#fff" }}>↓</button>
                    <button onClick={() => removeAt(i)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e53935", color: "#e53935", background: "#fff" }}>×</button>
                  </div>
                );
              })}
              {cur.timerIds.length === 0 && <span style={{ color: "#778" }}>左からタイマーを選ぶと、ここに並びます。</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
