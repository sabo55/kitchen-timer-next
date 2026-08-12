// src/lib/store.js
// 新3層モデルのデータ層（登録タイマー / セット / ボード枠）
// - 登録タイマー timers[]  … 個々のタイマー定義（名前・ラベル・時間・音・通知ボタン）
// - セット        sets[]   … 登録タイマーを並べた「帯」（スワイプで巡る単位）
// - ボード        board    … 各枠に「セット＋初期位置」を割り当て + 表示設定
//
// 旧形式（timerConfig_card_* の3モード）とは非互換。まっさらから作り直す方針。

import { loadAudioLibrary } from "./sounds-helper";

const LS = {
  timers: "ktimer_timers_v2",
  sets: "ktimer_sets_v2",
  board: "ktimer_board_v2",
};

/* ========== 生成ユーティリティ ========== */
let _seq = 0;
export function genId(prefix = "id") {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

export function makeTimer(partial = {}) {
  return {
    id: partial.id || genId("t"),
    name: partial.name ?? "タイマー",
    label: (partial.label ?? "").slice(0, 2), // 1〜2文字（隣ラベル用）
    timeMin: Number(partial.timeMin ?? 0),
    timeSec: Number(partial.timeSec ?? 0),
    // 10キー（自由入力）タイマー: true だと固定時間ではなくテンキーで都度入力
    tenKey: !!partial.tenKey,
    tenKeyKeepLast: partial.tenKeyKeepLast != null ? !!partial.tenKeyKeepLast : true,
    startSound: partial.startSound ?? "builtin-beep",
    endSound: partial.endSound ?? "alarm8",
    endLoopSec: Number(partial.endLoopSec ?? 10),
    // 終了音ループ中に挟む音声（"" = 挟まない）。ピピピッ→音声→ピピピッループ。
    endInsertVoiceSound: partial.endInsertVoiceSound ?? "",
    endInsertGapSec: Number(partial.endInsertGapSec ?? 1), // 挟む音声の後の間隔（秒）

    resetSec: Number(partial.resetSec ?? 15), // 終了後の自動リセット秒（0=自動リセットしない）
    // 通知（背景色）: 走行中に「残り◯分◯秒」で自動的に音声＋背景色（最大3）
    notifyBg: Array.isArray(partial.notifyBg) ? partial.notifyBg.map(makeNotifyBg) : [],
    // 通知ボタン（各タイマーが持つ）: 押すと「経過◯分◯秒」でその時だけ音を鳴らす
    notifyButtons: Array.isArray(partial.notifyButtons)
      ? partial.notifyButtons.map(makeNotifyBtn)
      : [],
  };
}

export function makeNotifyBg(partial = {}) {
  return {
    id: partial.id || genId("bg"),
    min: Number(partial.min ?? 0),
    sec: Number(partial.sec ?? 0),   // 残り時間（この値になったら発火）
    sound: partial.sound ?? "builtin-beep3",
    color: partial.color ?? "yellow",
  };
}

export function makeNotifyBtn(partial = {}) {
  return {
    id: partial.id || genId("nb"),
    label: (partial.label ?? "").slice(0, 4),
    min: Number(partial.min ?? 0),
    sec: Number(partial.sec ?? 0),
    sound: partial.sound ?? "builtin-beep3",
  };
}

export function makeSet(partial = {}) {
  return {
    id: partial.id || genId("s"),
    name: partial.name ?? "セット",
    timerIds: Array.isArray(partial.timerIds) ? [...partial.timerIds] : [],
  };
}

export function makeFrame(partial = {}) {
  return {
    setId: partial.setId ?? null,
    initialIndex: Number(partial.initialIndex ?? 0),
  };
}

export function makeBoard(partial = {}) {
  return {
    viewMode: partial.viewMode === "1" || partial.viewMode === "4" ? partial.viewMode : "9",
    page: 0,
    pageLock: !!partial.pageLock,
    // 枠は最大 27（3x3 x 3ページ）想定。足りない分は後で補完。
    frames: Array.isArray(partial.frames) ? partial.frames.map(makeFrame) : [],
  };
}

/* ========== 既定データ（初回シード） ========== */
export function defaultData() {
  const t = (o) => makeTimer(o);
  const timers = [
    t({ name: "麺かた",   label: "かた", timeMin: 0, timeSec: 40 }),
    t({ name: "バリかた", label: "バリ", timeMin: 0, timeSec: 20 }),
    t({ name: "普通",     label: "普",   timeMin: 1, timeSec: 0 }),
    t({ name: "柔らかめ", label: "柔",   timeMin: 1, timeSec: 20 }),
    t({ name: "替玉",     label: "替",   timeMin: 0, timeSec: 45 }),
    t({ name: "味玉",     label: "味",   timeMin: 6, timeSec: 0 }),
    t({ name: "チャーシュー", label: "チャ", timeMin: 40, timeSec: 0 }),
    t({ name: "スープ",   label: "スー", timeMin: 3, timeSec: 0 }),
  ];
  const menSet = makeSet({
    name: "麺",
    timerIds: [timers[0].id, timers[1].id, timers[2].id, timers[3].id, timers[4].id],
  });
  const otherSet = makeSet({
    name: "その他",
    timerIds: [timers[5].id, timers[6].id, timers[7].id],
  });

  // 3x3 の9枠：1〜6は麺セット、7〜9はその他セット。それぞれ初期位置を散らす。
  const frames = [
    makeFrame({ setId: menSet.id, initialIndex: 0 }),
    makeFrame({ setId: menSet.id, initialIndex: 1 }),
    makeFrame({ setId: menSet.id, initialIndex: 2 }),
    makeFrame({ setId: menSet.id, initialIndex: 3 }),
    makeFrame({ setId: menSet.id, initialIndex: 4 }),
    makeFrame({ setId: menSet.id, initialIndex: 0 }),
    makeFrame({ setId: otherSet.id, initialIndex: 0 }),
    makeFrame({ setId: otherSet.id, initialIndex: 1 }),
    makeFrame({ setId: otherSet.id, initialIndex: 2 }),
  ];

  return {
    timers,
    sets: [menSet, otherSet],
    board: makeBoard({ viewMode: "9", frames }),
  };
}

/* ========== 読み込み / 保存 ========== */
export function loadData() {
  try {
    const timersRaw = localStorage.getItem(LS.timers);
    const setsRaw = localStorage.getItem(LS.sets);
    const boardRaw = localStorage.getItem(LS.board);
    if (!timersRaw || !setsRaw || !boardRaw) return defaultData();

    const timers = JSON.parse(timersRaw);
    const sets = JSON.parse(setsRaw);
    const board = JSON.parse(boardRaw);
    if (!Array.isArray(timers) || !Array.isArray(sets)) return defaultData();

    return {
      timers: timers.map(makeTimer),
      sets: sets.map(makeSet),
      board: makeBoard(board),
    };
  } catch {
    return defaultData();
  }
}

export function saveData({ timers, sets, board }) {
  try {
    if (timers) localStorage.setItem(LS.timers, JSON.stringify(timers));
    if (sets) localStorage.setItem(LS.sets, JSON.stringify(sets));
    if (board) localStorage.setItem(LS.board, JSON.stringify(board));
  } catch {}
}

export function resetToDefaults() {
  const d = defaultData();
  saveData(d);
  return d;
}

/* ========== エクスポート / インポート（PC↔iPad 受け渡し用） ========== */
// 音の実データは含めない（設定＝文字情報のみ）。
// カスタム音声は端末ごとにIDが異なるため、「ID→名前」の対応を soundNames に含める。
// 読込先で同じ名前の音声が登録されていれば、そのローカルIDに付け替えて鳴らす。
const BUILTIN_OR_TIME = (id) => {
  const s = String(id || "");
  return !s || ["builtin-beep", "builtin-beep3", "alarm8"].includes(s) || s.startsWith("t:");
};
const timerSoundIds = (t) => [
  t.startSound, t.endSound, t.endInsertVoiceSound,
  ...(t.notifyBg || []).map((b) => b.sound),
  ...(t.notifyButtons || []).map((b) => b.sound),
];

function buildSoundNameMap(timers) {
  const lib = loadAudioLibrary(); // [{id,name,...}]
  const byId = new Map(lib.map((s) => [String(s.id), s.name]));
  const map = {};
  for (const t of timers) {
    for (const id of timerSoundIds(t)) {
      const s = String(id || "");
      if (BUILTIN_OR_TIME(s)) continue;
      if (byId.has(s)) map[s] = byId.get(s); // カスタム音声のID→名前
    }
  }
  return map;
}

// 読込時: soundNames を使い、各音声IDをローカルの同名音声IDに付け替える
function remapSoundsByName(timers, soundNames = {}) {
  const lib = loadAudioLibrary();
  const byName = new Map(lib.map((s) => [String(s.name).trim(), String(s.id)]));
  const resolve = (id) => {
    const s = String(id || "");
    if (BUILTIN_OR_TIME(s)) return s;
    const name = soundNames[s];
    if (!name) return s; // 名前情報なし → そのまま
    const localId = byName.get(String(name).trim());
    return localId || s; // 同名がローカルに無ければ元のまま（＝無音フォールバック）
  };
  return timers.map((t) => ({
    ...t,
    startSound: resolve(t.startSound),
    endSound: resolve(t.endSound),
    endInsertVoiceSound: resolve(t.endInsertVoiceSound),
    notifyBg: (t.notifyBg || []).map((b) => ({ ...b, sound: resolve(b.sound) })),
    notifyButtons: (t.notifyButtons || []).map((b) => ({ ...b, sound: resolve(b.sound) })),
  }));
}

export function exportConfig({ timers, sets, board }) {
  return JSON.stringify({ version: 2, soundNames: buildSoundNameMap(timers), timers, sets, board }, null, 2);
}

export function importConfig(text) {
  const obj = JSON.parse(text);
  if (!obj || obj.version !== 2) throw new Error("対応していない設定データです");
  const timers = remapSoundsByName((obj.timers || []).map(makeTimer), obj.soundNames || {});
  return {
    timers,
    sets: (obj.sets || []).map(makeSet),
    board: makeBoard(obj.board || {}),
  };
}

/* ========== 参照ヘルパ ========== */
export function timerById(timers, id) {
  return timers.find((t) => t.id === id) || null;
}
export function setById(sets, id) {
  return sets.find((s) => s.id === id) || null;
}
export function totalSecOf(timer) {
  if (!timer) return 0;
  return Number(timer.timeMin || 0) * 60 + Number(timer.timeSec || 0);
}
