// src/components/board/Board.jsx
// 本番ボード。各枠(frame)に割り当てられたセット(帯)を TimerWindow(窓)で表示する。
// 表示数 1/4/9・ページ送り・設定（初期化 / エクスポート・インポート）。

import React, { useState, useEffect, useMemo, useRef } from "react";
import TimerWindow from "./TimerWindow";
import TimerRegistry from "./TimerRegistry";
import AudioLibraryModal from "../AudioLibraryModal";
import SetEditor from "./SetEditor";
import BoardAssign from "./BoardAssign";
import {
  loadData, saveData, resetToDefaults, setById, timerById,
  exportConfig, importConfig, makeTimer, makeSet, makeFrame,
  relinkTimersByHints,
} from "../../lib/store";

const FRAMES_PER_PAGE = 9;

const PAGE_TINTS = ["#FFF8E8", "#EAF4FF", "#F7EEFC", "#F0FFF5", "#FFF5F5", "#F5F7FF"];

export default function Board() {
  const [data, setData] = useState(loadData);
  const { timers, sets, board } = data;
  const [menuOpen, setMenuOpen] = useState(false);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [setEditorOpen, setSetEditorOpen] = useState(false);
  const [boardAssignOpen, setBoardAssignOpen] = useState(false);
  const [audioLibOpen, setAudioLibOpen] = useState(false);
  const [ioText, setIoText] = useState("");
  const [ioMsg, setIoMsg] = useState("");

  // タイマー登録の「保存しないで閉じる」用スナップショット（開いた時点/最後に保存した時点の timers・sets）
  const registrySnapRef = useRef(null);
  const snapshotRegistry = () => { registrySnapRef.current = JSON.parse(JSON.stringify({ timers, sets })); };
  const openRegistry = () => { snapshotRegistry(); setRegistryOpen(true); setMenuOpen(false); };
  const saveRegistry = () => { saveData({ timers, sets, board }); snapshotRegistry(); };
  // スナップショットへ戻すだけ（画面の開閉は呼び出し側で行う）
  const revertRegistry = () => {
    const s = registrySnapRef.current;
    if (s) setData((d) => ({ ...d, timers: s.timers, sets: s.sets }));
  };

  // 登録タイマー（プール）CRUD
  const updateTimer = (id, patch) =>
    setData((d) => ({ ...d, timers: d.timers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const addTimer = () =>
    setData((d) => ({ ...d, timers: [...d.timers, makeTimer({ name: `タイマー${d.timers.length + 1}` })] }));
  const duplicateTimer = (idx) =>
    setData((d) => {
      const src = d.timers[idx];
      if (!src) return d;
      const dup = makeTimer({
        ...src, id: undefined,
        notifyBg: (src.notifyBg || []).map((bg) => ({ ...bg, id: undefined })),
        notifyButtons: (src.notifyButtons || []).map((nb) => ({ ...nb, id: undefined })),
      });
      const arr = [...d.timers];
      arr.splice(idx + 1, 0, dup);
      return { ...d, timers: arr };
    });
  const moveTimer = (idx, toIdx) =>
    setData((d) => {
      if (toIdx < 0 || toIdx >= d.timers.length || idx === toIdx) return d;
      const arr = [...d.timers];
      const [x] = arr.splice(idx, 1);
      arr.splice(toIdx, 0, x);
      return { ...d, timers: arr };
    });
  const deleteTimer = (id) =>
    setData((d) => ({
      ...d,
      timers: d.timers.filter((t) => t.id !== id),
      sets: d.sets.map((s) => ({ ...s, timerIds: s.timerIds.filter((tid) => tid !== id) })),
    }));

  // セット CRUD
  const addSet = () =>
    setData((d) => ({ ...d, sets: [...d.sets, makeSet({ name: `セット${d.sets.length + 1}` })] }));
  const updateSet = (id, patch) =>
    setData((d) => ({ ...d, sets: d.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const deleteSet = (id) =>
    setData((d) => ({
      ...d,
      sets: d.sets.filter((s) => s.id !== id),
      // このセットを使っていた枠は未割り当てに
      board: { ...d.board, frames: (d.board.frames || []).map((f) => (f.setId === id ? { ...f, setId: null } : f)) },
    }));

  // ボード枠 CRUD
  const updateFrame = (idx, patch) =>
    setData((d) => ({ ...d, board: { ...d.board, frames: d.board.frames.map((f, i) => (i === idx ? { ...f, ...patch } : f)) } }));
  const addBoardPage = () =>
    setData((d) => {
      const s = d.sets[0];
      const add = Array.from({ length: FRAMES_PER_PAGE }, () => makeFrame({ setId: s?.id ?? null, initialIndex: 0 }));
      return { ...d, board: { ...d.board, frames: [...(d.board.frames || []), ...add] } };
    });
  const deleteBoardPage = (pageIdx) =>
    setData((d) => {
      const frames = [...(d.board.frames || [])];
      frames.splice(pageIdx * FRAMES_PER_PAGE, FRAMES_PER_PAGE);
      return { ...d, board: { ...d.board, frames, page: 0 } };
    });

  // 保存
  useEffect(() => { saveData({ timers, sets, board }); }, [timers, sets, board]);

  const setBoard = (patch) =>
    setData((d) => ({ ...d, board: { ...d.board, ...(typeof patch === "function" ? patch(d.board) : patch) } }));

  const viewMode = board.viewMode || "9";
  const cols = viewMode === "9" ? 3 : viewMode === "4" ? 2 : 1;
  const rows = cols;
  const perPage = cols * rows;
  const frames = board.frames || [];
  const pageCount = Math.max(1, Math.ceil(frames.length / perPage));
  const page = Math.min(board.page || 0, pageCount - 1);

  useEffect(() => {
    if ((board.page || 0) > pageCount - 1) setBoard({ page: pageCount - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);

  const pageFrames = useMemo(() => {
    const start = page * perPage;
    return frames.slice(start, start + perPage).map((f, i) => ({ f, globalIndex: start + i }));
  }, [frames, page, perPage]);

  // frame → その枠のセットに含まれるタイマー定義配列
  const timersForFrame = (f) => {
    const s = setById(sets, f.setId);
    if (!s) return [];
    return s.timerIds.map((id) => timerById(timers, id)).filter(Boolean);
  };

  const setViewMode = (v) => setBoard({ viewMode: v, page: 0 });
  const gotoPage = (p) => setBoard({ page: Math.max(0, Math.min(pageCount - 1, p)) });

  const doReset = () => {
    if (!window.confirm("すべての設定を初期状態に戻します。よろしいですか？")) return;
    setData(resetToDefaults());
    setMenuOpen(false);
  };
  const doExport = () => {
    const text = exportConfig({ timers, sets, board });
    setIoText(text);
    navigator.clipboard?.writeText(text).then(
      () => setIoMsg("クリップボードにコピーしました"),
      () => setIoMsg("下のテキストをコピーしてください")
    );
  };
  const doImport = () => {
    try {
      const next = importConfig(ioText);
      setData(next);
      setIoMsg("読み込みました");
      setMenuOpen(false);
    } catch (e) {
      setIoMsg("読み込み失敗: " + (e?.message || "不正なデータ"));
    }
  };

  const tint = PAGE_TINTS[page % PAGE_TINTS.length];

  const container = {
    position: "fixed", inset: 0, padding: 8, boxSizing: "border-box",
    background: tint, overflow: "hidden", overscrollBehavior: "none",
  };
  const grid = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: 8,
    width: "100%",
    height: "100%",
  };
  // 右上カードの「隣ボタン(上)」と「歯車(下)」の間の右エッジに配置し、重なりを回避
  const floatBtn = {
    position: "fixed", right: 6, top: 75, zIndex: 1001, padding: "8px 16px",
    borderRadius: 12, border: "1px solid #888", background: "#fff", fontWeight: 700, fontSize: 15,
    boxShadow: "0 2px 6px rgba(0,0,0,.15)",
  };

  return (
    <div style={container}>
      <button style={floatBtn} onClick={() => setMenuOpen((m) => !m)}>設定</button>

      {menuOpen && (
        <div style={{
          position: "fixed", right: 6, top: 122, zIndex: 1000, width: 300, padding: 12,
          borderRadius: 12, border: "1px solid #ddd", background: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,.18)", maxHeight: "80vh", overflow: "auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 700 }}>表示数</span>
            <div style={{ display: "flex", gap: 6 }}>
              {["1", "4", "9"].map((v) => (
                <button key={v} onClick={() => setViewMode(v)}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #888", background: viewMode === v ? "#ddd" : "#f5f5f5", fontWeight: 700 }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontWeight: 700 }}>ページ</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => gotoPage(page - 1)} disabled={page <= 0} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #888", background: "#fff", color: "#333" }}>{"◀︎"}</button>
              <span>{page + 1}/{pageCount}</span>
              <button onClick={() => gotoPage(page + 1)} disabled={page >= pageCount - 1} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #888", background: "#fff", color: "#333" }}>{"▶︎"}</button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
            <span style={{ fontWeight: 700 }}>スワイプ切替の長押し</span>
            <select value={board.unlockSec ?? 0.5}
              onChange={(e) => setBoard({ unlockSec: Number(e.target.value) })}
              style={{ height: 32, borderRadius: 8, border: "1px solid #bbb", background: "#fff", fontWeight: 700, padding: "0 6px" }}>
              <option value={0}>長押しなし</option>
              {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((s) => (
                <option key={s} value={s}>{s.toFixed(1)}秒</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 11, color: "#889", marginBottom: 12 }}>
            走行中に時間を長押しするとスワイプで別タイマーへ切替。短いほど切り替えやすく、長いほど誤操作しにくい。「長押しなし」はいつでもスワイプ可。
          </div>

          <hr style={{ margin: "10px 0", border: 0, borderTop: "1px solid #eee" }} />

          <button onClick={openRegistry}
            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #2a7", background: "#eaf7ef", color: "#1a7", fontWeight: 800, marginBottom: 8 }}>
            タイマー登録
          </button>

          <button onClick={() => { setSetEditorOpen(true); setMenuOpen(false); }}
            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #2a7", background: "#eaf7ef", color: "#1a7", fontWeight: 800, marginBottom: 8 }}>
            セット作成
          </button>

          <button onClick={() => { setBoardAssignOpen(true); setMenuOpen(false); }}
            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #2a7", background: "#eaf7ef", color: "#1a7", fontWeight: 800, marginBottom: 8 }}>
            ボード割り当て
          </button>

          <button onClick={() => { setAudioLibOpen(true); setMenuOpen(false); }}
            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #37a", background: "#eaf1f9", color: "#248", fontWeight: 800, marginBottom: 8 }}>
            音声ライブラリ
          </button>

          <hr style={{ margin: "10px 0", border: 0, borderTop: "1px solid #eee" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={doExport} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #888", background: "#f5f5f5", fontWeight: 700 }}>設定を書き出す</button>
            <textarea value={ioText} onChange={(e) => setIoText(e.target.value)} placeholder="ここに設定JSONを貼り付けて「読み込む」"
              style={{ width: "100%", height: 90, fontFamily: "monospace", fontSize: 11, border: "1px solid #ccc", borderRadius: 8, padding: 6, boxSizing: "border-box" }} />
            <button onClick={doImport} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #888", background: "#f5f5f5", fontWeight: 700 }}>読み込む</button>
            {ioMsg && <div style={{ fontSize: 12, color: "#357" }}>{ioMsg}</div>}
            <button onClick={doReset} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e53935", color: "#e53935", background: "#fff", fontWeight: 700 }}>初期状態に戻す</button>
          </div>
        </div>
      )}

      <div style={grid}>
        {pageFrames.map(({ f, globalIndex }) => {
          const setTimers = timersForFrame(f);
          return (
            <TimerWindow
              key={`${globalIndex}:${f.setId ?? "none"}:${f.initialIndex}`}
              timers={setTimers}
              initialIndex={f.initialIndex}
              displayNo={globalIndex + 1}
              unlockMs={Math.round((board.unlockSec ?? 0.5) * 1000)}
            />
          );
        })}
      </div>

      {/* 常駐ページ送り（下中央） */}
      {pageCount > 1 && (
        <div style={{
          position: "fixed", left: "50%", bottom: 10, transform: "translateX(-50%)",
          display: "flex", gap: 10, alignItems: "center", zIndex: 900,
          background: "#fff", borderRadius: 999, padding: "4px 10px", boxShadow: "0 2px 6px rgba(0,0,0,.15)",
        }}>
          <button onClick={() => gotoPage(page - 1)} disabled={page <= 0} style={{ border: "none", background: "none", fontSize: 18, color: "#333" }}>{"◀︎"}</button>
          <span style={{ fontWeight: 700 }}>{page + 1}/{pageCount}</span>
          <button onClick={() => gotoPage(page + 1)} disabled={page >= pageCount - 1} style={{ border: "none", background: "none", fontSize: 18, color: "#333" }}>{"▶︎"}</button>
        </div>
      )}

      {registryOpen && (
        <TimerRegistry
          timers={timers}
          onUpdate={updateTimer}
          onDuplicate={duplicateTimer}
          onDelete={deleteTimer}
          onAdd={addTimer}
          onMove={moveTimer}
          onSave={saveRegistry}
          onRevert={revertRegistry}
          onGoToSets={() => { setRegistryOpen(false); setSetEditorOpen(true); }}
          onClose={() => setRegistryOpen(false)}
        />
      )}

      {setEditorOpen && (
        <SetEditor
          sets={sets}
          timers={timers}
          onAddSet={addSet}
          onUpdateSet={updateSet}
          onDeleteSet={deleteSet}
          onGoToBoard={() => { setSetEditorOpen(false); setBoardAssignOpen(true); }}
          onClose={() => setSetEditorOpen(false)}
        />
      )}

      {boardAssignOpen && (
        <BoardAssign
          board={board}
          sets={sets}
          timers={timers}
          framesPerPage={FRAMES_PER_PAGE}
          onUpdateFrame={updateFrame}
          onAddPage={addBoardPage}
          onDeletePage={deleteBoardPage}
          onSave={() => saveData({ timers, sets, board })}
          onClose={() => setBoardAssignOpen(false)}
        />
      )}

      <AudioLibraryModal
        open={audioLibOpen}
        onClose={() => setAudioLibOpen(false)}
        onChange={(lib) => setData((d) => {
          const timers = relinkTimersByHints(d.timers, lib);
          return timers === d.timers ? d : { ...d, timers };
        })}
      />
    </div>
  );
}
