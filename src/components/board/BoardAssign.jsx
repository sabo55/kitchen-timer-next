// src/components/board/BoardAssign.jsx
// ボード割り当て画面。各枠に「セット＋初期位置」を割り当てる。
// - ページ（3x3=9枠）単位で編集。ページ追加/削除。
// - 各枠: セットを選び、その中の初期位置（起動時に表示するタイマー）を選ぶ。

import React, { useState, useEffect } from "react";

const sel = { height: 34, borderRadius: 8, border: "1px solid #bbb", padding: "0 8px", background: "#fff", fontSize: 14, width: "100%", boxSizing: "border-box" };
const lbl = { fontSize: 12, color: "#556", fontWeight: 700, marginBottom: 2 };

export default function BoardAssign({ board, sets = [], timers = [], framesPerPage = 9, onUpdateFrame, onAddPage, onDeletePage, onClose, onSave }) {
  const frames = board.frames || [];
  const pageCount = Math.max(1, Math.ceil(frames.length / framesPerPage));
  const [page, setPage] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (page > pageCount - 1) setPage(pageCount - 1); }, [pageCount, page]);

  const setById = (id) => sets.find((s) => s.id === id) || null;
  const timerName = (id) => (timers.find((t) => t.id === id)?.name) || "（無名）";

  const start = page * framesPerPage;
  const pageFrames = Array.from({ length: framesPerPage }, (_, i) => start + i).filter((g) => g < frames.length);

  const del = () => {
    if (pageCount <= 1) { window.alert("最後の1ページは削除できません。"); return; }
    if (!window.confirm(`${page + 1}ページを削除します。よろしいですか？`)) return;
    onDeletePage(page);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>ボード割り当て</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 13, color: "#2a7", fontWeight: 700 }}>保存しました</span>}
          <button onClick={() => { onSave && onSave(); setSaved(true); setTimeout(onClose, 300); }} title="割り当てを保存してボードに反映"
            style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #2a7", background: "#2a7", color: "#fff", fontWeight: 800 }}>保存して閉じる</button>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #888", background: "#f5f5f5", fontWeight: 700 }}>閉じる</button>
        </div>
      </div>

      {/* ページ選択 */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {Array.from({ length: pageCount }, (_, p) => (
          <button key={p} onClick={() => setPage(p)}
            style={{ padding: "8px 14px", borderRadius: 999, fontWeight: 700,
              border: p === page ? "2px solid #2a7" : "1px solid #bbb",
              background: p === page ? "#eaf7ef" : "#fff", color: p === page ? "#1a7" : "#333" }}>
            {p + 1}ページ
          </button>
        ))}
        <button onClick={onAddPage}
          style={{ padding: "8px 14px", borderRadius: 999, border: "2px dashed #aaa", background: "#fff", fontWeight: 700, color: "#556" }}>＋ページ追加</button>
        <button onClick={del}
          style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8, border: "1px solid #e53935", color: "#e53935", background: "#fff", fontWeight: 700 }}>このページを削除</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{ fontSize: 12, color: "#778", marginBottom: 10 }}>
          各枠にセットを割り当て、起動時に表示するタイマー（初期位置）を選びます。走行中でなければ、スワイプでそのセット内の他のタイマーに切り替えられます。
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 900 }}>
          {pageFrames.map((g) => {
            const f = frames[g];
            const s = setById(f.setId);
            return (
              <div key={g} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, background: "#fafafa" }}>
                <div style={{ fontWeight: 800, color: "#334", marginBottom: 8 }}>枠 {(g % framesPerPage) + 1}</div>

                <div style={{ marginBottom: 8 }}>
                  <div style={lbl}>セット</div>
                  <select style={sel} value={f.setId || ""}
                    onChange={(e) => onUpdateFrame(g, { setId: e.target.value || null, initialIndex: 0 })}>
                    <option value="">（未割り当て）</option>
                    {sets.map((st) => <option key={st.id} value={st.id}>{st.name}（{st.timerIds.length}）</option>)}
                  </select>
                </div>

                <div>
                  <div style={lbl}>初期位置（起動時に表示）</div>
                  <select style={sel} value={f.initialIndex}
                    disabled={!s || s.timerIds.length === 0}
                    onChange={(e) => onUpdateFrame(g, { initialIndex: Number(e.target.value) })}>
                    {s && s.timerIds.length > 0
                      ? s.timerIds.map((tid, i) => <option key={i} value={i}>{i + 1}. {timerName(tid)}</option>)
                      : <option value={0}>（タイマーなし）</option>}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
