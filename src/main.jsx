import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initAudioStore } from "./lib/audio-store"; // 音声ライブラリ(IndexedDB)を先行初期化
import { registerSW } from "virtual:pwa-register"; // 追加

initAudioStore();

registerSW({ immediate: true }); // 追加

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);