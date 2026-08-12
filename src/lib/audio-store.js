// src/lib/audio-store.js
// 音声ライブラリの保存先。
// localStorage(~5MB)だと音声ファイル(base64)を十数個入れるとすぐ容量オーバーになるため、
// 実データは容量の大きい IndexedDB に保存する。
// 既存コードは loadAudioLibrary() を「同期」で多数呼ぶので、
// 起動時に IndexedDB から全件を読み込んでメモリミラー(mem)に載せ、同期参照できるようにする。

const DB_NAME = "ktimer_audio_v1";
const STORE = "sounds";
const LEGACY_LS = "timerBoard_sounds_v1"; // 旧localStorage保存キー（移行元）

let mem = null;      // 同期参照用の全件ミラー（source of truth）
let ready = null;    // 初期化Promise（多重初期化防止）

function openDB() {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch (e) {
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll(db) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    r.onsuccess = () => resolve(Array.isArray(r.result) ? r.result : []);
    r.onerror = () => reject(r.error);
  });
}

function replaceAll(db, items) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const os = t.objectStore(STORE);
    os.clear();
    for (const it of items) os.put(it);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("transaction aborted"));
  });
}

function loadLegacyLS() {
  try {
    const raw = localStorage.getItem(LEGACY_LS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// 起動時初期化。IndexedDBから全件をメモリへ。空なら旧localStorageから一度だけ移行。
export function initAudioStore() {
  if (ready) return ready;
  ready = (async () => {
    try {
      const db = await openDB();
      let items = await getAll(db);
      if (items.length === 0) {
        const legacy = loadLegacyLS();
        if (legacy.length) {
          try { await replaceAll(db, legacy); } catch {}
          items = legacy;
        }
      }
      mem = items;
    } catch {
      // IndexedDBが使えない環境ではlocalStorageの内容で代替（従来動作）
      mem = loadLegacyLS();
    }
    return mem;
  })();
  return ready;
}

// 初期化完了を待つ（モーダルを開くときなどに使用）
export function whenAudioReady() {
  return initAudioStore();
}

// 同期で現在の全件を返す（loadAudioLibrary の実体）
export function getAudioLibSync() {
  return mem || [];
}

// 保存（全件置き換え）。容量超過などは呼び出し側で捕捉できるよう throw する。
export async function saveAudioLibrary(next) {
  const items = Array.isArray(next) ? next : [];
  mem = items; // UIは即時反映。永続化は下で。
  const db = await openDB();
  await replaceAll(db, items);
}

// モジュール読み込み時に先行して初期化を開始（再生は必ずユーザー操作後なので間に合う）
initAudioStore();
