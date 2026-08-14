// src/components/board/WhatsNew.jsx
// 「変更点・使い方」画面。設定メニューから開く。
// 掲示用に作った内容を画面表示向けに調整（印刷/A4は考慮しない）。
import React from "react";

const CSS = `
.wn{
  --ink:#23201D; --ink-soft:#5C564F; --muted:#8A857E; --line:#E2DCD3;
  --surface:#FFFFFF; --surface-2:#F1EDE8;
  --blue:#2C6E9B; --blue-soft:#E3EEF5; --red:#D84C3E; --red-soft:#FBE7E4;
  color:var(--ink);
  font-family:"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic","YuGothic","Noto Sans JP",Meiryo,system-ui,sans-serif;
  line-height:1.7;
}
.wn *{ box-sizing:border-box; }
.wn .eyebrow{
  display:inline-block; font-size:.8rem; font-weight:700; letter-spacing:.12em;
  color:var(--blue); background:var(--blue-soft); padding:6px 12px; border-radius:999px; margin-bottom:14px;
}
.wn h1{ font-size:1.7rem; font-weight:800; line-height:1.3; margin:0 0 10px; text-wrap:balance; }
.wn .lede{ font-size:1rem; color:var(--ink-soft); margin:0 0 4px; }
.wn .rule{ height:1px; background:var(--line); border:0; margin:26px 0; }
.wn .card{
  background:var(--surface); border:1px solid var(--line); border-radius:16px;
  padding:20px; margin:20px 0; box-shadow:0 1px 2px rgba(35,32,29,.05);
}
.wn .chead{ display:flex; align-items:center; gap:14px; margin-bottom:6px; }
.wn .num{
  flex:0 0 auto; width:42px; height:42px; border-radius:12px; display:grid; place-items:center;
  font-size:1.35rem; font-weight:800; color:#fff; background:var(--blue); font-variant-numeric:tabular-nums;
}
.wn .card.red .num{ background:var(--red); }
.wn .ctitle{ font-size:1.25rem; font-weight:800; line-height:1.3; margin:0; }
.wn .csub{ color:var(--muted); font-size:.9rem; font-weight:700; margin:2px 0 0; }
.wn .figwrap{ background:var(--surface-2); border-radius:14px; padding:16px; margin:18px 0; overflow-x:auto; }
.wn .figwrap svg{ display:block; margin:0 auto; max-width:100%; height:auto; }
.wn .figcap{ text-align:center; font-size:.9rem; color:var(--muted); margin:2px 0 0; }
.wn .steps{ list-style:none; margin:16px 0 0; padding:0; display:flex; flex-direction:column; gap:13px; }
.wn .steps li{ display:flex; gap:13px; align-items:flex-start; }
.wn .dot{
  flex:0 0 auto; margin-top:2px; width:26px; height:26px; border-radius:50%; display:grid; place-items:center;
  font-size:.85rem; font-weight:800; color:var(--blue); background:var(--blue-soft); font-variant-numeric:tabular-nums;
}
.wn .card.red .dot{ color:var(--red); background:var(--red-soft); }
.wn .steps b{ font-weight:800; }
.wn .steps .txt{ font-size:1.02rem; }
.wn .callout{ display:flex; gap:12px; align-items:flex-start; background:var(--red-soft); border-radius:12px; padding:14px 16px; margin-top:18px; font-size:.98rem; }
.wn .callout.blue{ background:var(--blue-soft); }
.wn .callout .mk{ font-size:1.2rem; line-height:1.5; flex:0 0 auto; }
.wn .callout b{ color:var(--red); }
.wn .callout.blue b{ color:var(--blue); }
.wn .loops{ display:flex; flex-direction:column; gap:20px; margin-top:6px; }
.wn .loop h3{ font-size:1.02rem; font-weight:800; margin:0 0 12px; display:flex; align-items:center; gap:10px; }
.wn .loop h3 .tag{ font-size:.72rem; font-weight:800; letter-spacing:.06em; color:var(--blue); background:var(--blue-soft); padding:3px 9px; border-radius:999px; }
.wn .chips{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.wn .chip{ font-weight:800; font-size:.98rem; background:var(--surface-2); border:1px solid var(--line); border-radius:10px; padding:8px 13px; white-space:nowrap; }
.wn .chip.ten{ border-style:dashed; color:var(--ink-soft); }
.wn .arw{ color:var(--blue); font-weight:800; font-size:1.05rem; }
.wn .loopback{ display:inline-flex; align-items:center; gap:6px; font-size:.82rem; font-weight:800; color:var(--blue); background:var(--blue-soft); border-radius:999px; padding:6px 12px; }
.wn .footnote{ margin-top:8px; color:var(--muted); font-size:.92rem; border-top:1px solid var(--line); padding-top:16px; }
.wn .kbd{ display:inline-block; font-weight:800; color:var(--blue); background:var(--blue-soft); border-radius:6px; padding:1px 8px; }
.wn .kbd.r{ color:var(--red); background:var(--red-soft); }
`;

const CONTENT = `
  <span class="eyebrow">タイマーアプリ ＝ 操作の変更点</span>
  <h1>タイマーの切り替えがスワイプでできるようになりました</h1>
  <p class="lede">これまでは上のボタンだけで切り替えていましたが、時間の表示を指でスワイプするだけで切り替えられます。走行中でも切り替え可能です。覚えるのは下の内容だけです。</p>

  <hr class="rule">

  <!-- 変更1 -->
  <section class="card">
    <div class="chead">
      <div class="num">1</div>
      <div>
        <p class="ctitle">時間表示をスワイプで切り替え</p>
        <p class="csub">上のボタンに加えて「時間を指でスワイプ」もOK</p>
      </div>
    </div>

    <div class="figwrap">
      <svg viewBox="0 0 470 340" role="img" aria-label="タイマーカードの時間表示を左右にスワイプする図">
        <rect x="8" y="8" width="454" height="324" rx="26" fill="#EDEFF1" stroke="#Dfe3e6" stroke-width="2"/>
        <text x="40" y="78" font-size="40" font-weight="800" fill="#1F2D3D" font-family="inherit">中太麺</text>
        <g font-family="inherit" font-weight="800" font-size="20">
          <rect x="286" y="44" width="50" height="40" rx="10" fill="#FFFFFF" stroke="#C9CED2" stroke-width="2"/>
          <text x="311" y="72" text-anchor="middle" fill="#5C6672">硬</text>
          <rect x="342" y="44" width="50" height="40" rx="10" fill="#CFE4F5" stroke="#2C6E9B" stroke-width="2"/>
          <text x="367" y="72" text-anchor="middle" fill="#1F5E86">普</text>
          <rect x="398" y="44" width="50" height="40" rx="10" fill="#FFFFFF" stroke="#C9CED2" stroke-width="2"/>
          <text x="423" y="72" text-anchor="middle" fill="#5C6672">柔</text>
        </g>
        <text x="235" y="188" text-anchor="middle" font-size="88" font-weight="800" fill="#1F2D3D" font-family="inherit" style="font-variant-numeric:tabular-nums">02:00</text>
        <rect x="70" y="120" width="330" height="86" rx="12" fill="none" stroke="#2C6E9B" stroke-width="2.5" stroke-dasharray="7 7"/>
        <g stroke="#2C6E9B" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="120" y1="163" x2="350" y2="163"/>
          <polyline points="338,151 352,163 338,175"/>
          <polyline points="132,151 118,163 132,175"/>
        </g>
        <circle cx="235" cy="163" r="17" fill="#2C6E9B" opacity="0.16"/>
        <circle cx="235" cy="163" r="8" fill="#2C6E9B"/>
        <rect x="40" y="232" width="196" height="80" rx="14" fill="#33A457"/>
        <text x="138" y="282" text-anchor="middle" font-size="26" font-weight="800" fill="#FFFFFF" font-family="inherit">スタート</text>
        <g font-family="inherit" font-weight="800" font-size="18" fill="#3B434B">
          <rect x="252" y="232" width="118" height="52" rx="12" fill="#FFFFFF" stroke="#C9CED2" stroke-width="2"/>
          <text x="311" y="264" text-anchor="middle">細麺かた</text>
          <rect x="378" y="232" width="82" height="52" rx="12" fill="#FFFFFF" stroke="#C9CED2" stroke-width="2"/>
          <text x="419" y="264" text-anchor="middle">細麺</text>
          <rect x="252" y="290" width="118" height="52" rx="12" fill="#FFFFFF" stroke="#C9CED2" stroke-width="2"/>
          <text x="311" y="322" text-anchor="middle">麺かた</text>
        </g>
      </svg>
    </div>
    <p class="figcap">青い点線の「時間表示」の上を左右にスワイプすると切り替わります。</p>

    <ul class="steps">
      <li><span class="dot">A</span><span class="txt"><b>今まで通り</b>：右上の <b>硬 / 普 / 柔</b>（前・現・次）ボタンで切り替えられます。</span></li>
      <li><span class="dot">B</span><span class="txt"><b>追加</b>：真ん中の大きな<b>時間表示の上を左右にスワイプ</b>しても切り替わります。</span></li>
      <li><span class="dot">C</span><span class="txt"><b>スワイプで動かした後、そのまま20秒放置</b>すると<b>最初の位置に自動で戻ります</b>（スタート前のときだけ）。</span></li>
    </ul>
  </section>

  <!-- セット構成（ループ） -->
  <section class="card">
    <div class="chead">
      <div class="num" style="background:var(--surface-2);color:var(--blue)">↻</div>
      <div>
        <p class="ctitle">スワイプの並び（ループします）</p>
        <p class="csub">端まで行くと最初に戻る＝ぐるぐる回る</p>
      </div>
    </div>

    <div class="loops">
      <div class="loop">
        <h3><span class="tag">上段・中段</span>麺のタイマー</h3>
        <div class="chips">
          <span class="chip">中太麺</span><span class="arw">↔</span>
          <span class="chip">細麺</span><span class="arw">↔</span>
          <span class="chip">汁なし中太麺</span><span class="arw">↔</span>
          <span class="chip">汁なし細麺</span><span class="arw">↔</span>
          <span class="loopback">↩ 中太麺に戻る</span>
        </div>
      </div>
      <div class="loop">
        <h3><span class="tag">下段</span>サイド・その他</h3>
        <div class="chips">
          <span class="chip">ブロッコリー</span><span class="arw">↔</span>
          <span class="chip">ワンタン</span><span class="arw">↔</span>
          <span class="chip">冷やし</span><span class="arw">↔</span>
          <span class="chip">ゆで卵</span><span class="arw">↔</span>
          <span class="chip ten">10キータイマー</span><span class="arw">↔</span>
          <span class="loopback">↩ ブロッコリーに戻る</span>
        </div>
      </div>
    </div>
  </section>

  <hr class="rule">

  <!-- 変更2 -->
  <section class="card red">
    <div class="chead">
      <div class="num">2</div>
      <div>
        <p class="ctitle">スタート後の「押し間違い」は長押しスワイプで変更</p>
        <p class="csub">走行中でも別のタイマーに切り替えできる</p>
      </div>
    </div>

    <div class="figwrap">
      <svg viewBox="0 0 720 252" role="img" aria-label="中太麺1:55を長押しで赤枠にし、スワイプで麺かた1:25へ切り替える流れ。時間は経過が引き継がれる図">
        <text x="110" y="22" text-anchor="middle" font-size="13" font-weight="800" fill="#5C6672" font-family="inherit">走行中（ロック中）</text>
        <rect x="10" y="34" width="200" height="176" rx="16" fill="#EDEFF1" stroke="#DFE3E6" stroke-width="2"/>
        <text x="26" y="76" font-size="20" font-weight="800" fill="#1F2D3D" font-family="inherit">中太麺</text>
        <g font-family="inherit" font-weight="800" font-size="13">
          <rect x="96" y="52" width="30" height="24" rx="7" fill="#FFFFFF" stroke="#C9CED2" stroke-width="1.5"/><text x="111" y="69" text-anchor="middle" fill="#5C6672">硬</text>
          <rect x="131" y="52" width="30" height="24" rx="7" fill="#CFE4F5" stroke="#2C6E9B" stroke-width="1.5"/><text x="146" y="69" text-anchor="middle" fill="#1F5E86">普</text>
          <rect x="166" y="52" width="30" height="24" rx="7" fill="#FFFFFF" stroke="#C9CED2" stroke-width="1.5"/><text x="181" y="69" text-anchor="middle" fill="#5C6672">柔</text>
        </g>
        <text x="110" y="152" text-anchor="middle" font-size="44" font-weight="800" fill="#1F2D3D" font-family="inherit" style="font-variant-numeric:tabular-nums">01:55</text>
        <rect x="34" y="106" width="152" height="50" rx="9" fill="none" stroke="#D84C3E" stroke-width="2" stroke-dasharray="6 5"/>
        <circle cx="150" cy="131" r="14" fill="#D84C3E" opacity="0.18"/><circle cx="150" cy="131" r="6.5" fill="#D84C3E"/>
        <text x="110" y="170" text-anchor="middle" font-size="11" font-weight="800" fill="#D84C3E" font-family="inherit">時間を長押し</text>
        <rect x="26" y="176" width="100" height="30" rx="8" fill="#33A457"/><text x="76" y="197" text-anchor="middle" font-size="13" font-weight="800" fill="#FFFFFF" font-family="inherit">スタート</text>
        <text x="110" y="234" text-anchor="middle" font-size="12" fill="#8A857E" font-family="inherit">スワイプしても動かない</text>

        <text x="235" y="112" text-anchor="middle" font-size="12" font-weight="800" fill="#D84C3E" font-family="inherit">長押し</text>
        <g stroke="#D84C3E" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="214" y1="128" x2="256" y2="128"/><polyline points="248,119 258,128 248,137"/>
        </g>

        <text x="360" y="22" text-anchor="middle" font-size="13" font-weight="800" fill="#D84C3E" font-family="inherit">ロック解除中＝赤枠</text>
        <rect x="260" y="34" width="200" height="176" rx="16" fill="#EDEFF1" stroke="#D84C3E" stroke-width="5"/>
        <text x="276" y="76" font-size="20" font-weight="800" fill="#1F2D3D" font-family="inherit">中太麺</text>
        <g font-family="inherit" font-weight="800" font-size="13">
          <rect x="346" y="52" width="30" height="24" rx="7" fill="#FFFFFF" stroke="#C9CED2" stroke-width="1.5"/><text x="361" y="69" text-anchor="middle" fill="#5C6672">硬</text>
          <rect x="381" y="52" width="30" height="24" rx="7" fill="#CFE4F5" stroke="#2C6E9B" stroke-width="1.5"/><text x="396" y="69" text-anchor="middle" fill="#1F5E86">普</text>
          <rect x="416" y="52" width="30" height="24" rx="7" fill="#FFFFFF" stroke="#C9CED2" stroke-width="1.5"/><text x="431" y="69" text-anchor="middle" fill="#5C6672">柔</text>
        </g>
        <text x="360" y="152" text-anchor="middle" font-size="44" font-weight="800" fill="#1F2D3D" font-family="inherit" style="font-variant-numeric:tabular-nums">01:55</text>
        <rect x="284" y="106" width="152" height="50" rx="9" fill="none" stroke="#2C6E9B" stroke-width="2" stroke-dasharray="6 5"/>
        <g stroke="#2C6E9B" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="302" y1="131" x2="418" y2="131"/><polyline points="409,123 419,131 409,139"/><polyline points="311,123 301,131 311,139"/>
        </g>
        <text x="360" y="170" text-anchor="middle" font-size="11" font-weight="800" fill="#2C6E9B" font-family="inherit">時間をスワイプ</text>
        <rect x="276" y="176" width="100" height="30" rx="8" fill="#33A457"/><text x="326" y="197" text-anchor="middle" font-size="13" font-weight="800" fill="#FFFFFF" font-family="inherit">スタート</text>
        <text x="360" y="234" text-anchor="middle" font-size="12" fill="#B03A2E" font-family="inherit">この状態でスワイプ</text>

        <text x="485" y="112" text-anchor="middle" font-size="12" font-weight="800" fill="#2C6E9B" font-family="inherit">スワイプ</text>
        <g stroke="#2C6E9B" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="464" y1="128" x2="506" y2="128"/><polyline points="498,119 508,128 498,137"/>
        </g>

        <text x="610" y="22" text-anchor="middle" font-size="12.5" font-weight="800" fill="#D84C3E" font-family="inherit">別タイマーへ（時間は継続）</text>
        <rect x="510" y="34" width="200" height="176" rx="16" fill="#EDEFF1" stroke="#D84C3E" stroke-width="5"/>
        <text x="526" y="76" font-size="20" font-weight="800" fill="#1F2D3D" font-family="inherit">麺かた</text>
        <g font-family="inherit" font-weight="800" font-size="13">
          <rect x="596" y="52" width="30" height="24" rx="7" fill="#CFE4F5" stroke="#2C6E9B" stroke-width="1.5"/><text x="611" y="69" text-anchor="middle" fill="#1F5E86">硬</text>
          <rect x="631" y="52" width="30" height="24" rx="7" fill="#FFFFFF" stroke="#C9CED2" stroke-width="1.5"/><text x="646" y="69" text-anchor="middle" fill="#5C6672">普</text>
          <rect x="666" y="52" width="30" height="24" rx="7" fill="#FFFFFF" stroke="#C9CED2" stroke-width="1.5"/><text x="681" y="69" text-anchor="middle" fill="#5C6672">柔</text>
        </g>
        <text x="610" y="152" text-anchor="middle" font-size="44" font-weight="800" fill="#1F2D3D" font-family="inherit" style="font-variant-numeric:tabular-nums">01:25</text>
        <rect x="526" y="176" width="100" height="30" rx="8" fill="#33A457"/><text x="576" y="197" text-anchor="middle" font-size="13" font-weight="800" fill="#FFFFFF" font-family="inherit">スタート</text>
        <text x="610" y="234" text-anchor="middle" font-size="12" fill="#8A857E" font-family="inherit">1:30が1:25で始まる</text>
      </svg>
    </div>
    <p class="figcap">例：中太麺で5秒たった（残り<b>1:55</b>）状態でスワイプ → 麺かた（1:30）は経過が引き継がれ<b>1:25</b>から。時間はリセットされません。<br>赤枠は「切り替えた印」ではなく<b>ロックが外れている（動かせる）状態</b>の印。決まったら<b>もう一度長押し／3秒放置</b>で固定＝赤枠が消えます。</p>

    <ul class="steps">
      <li><span class="dot">1</span><span class="txt"><b>スタート後に間違いに気付いたら</b> —— 時間表示を<b>長押し</b>してロックを外す。<b>赤枠</b>が付きます。</span></li>
      <li><span class="dot">2</span><span class="txt">赤枠の間に<b>スワイプして別のタイマーへ変更</b>。切り替えても<b>時間はリセットされず経過したまま</b>続きます。</span></li>
      <li><span class="dot">3</span><span class="txt">決まったら<b>もう一度長押し</b>、または<b>3秒そのまま放置</b>すると<b>固定（ロック）</b>され、赤枠が消えます。</span></li>
    </ul>

    <div class="callout blue">
      <span class="mk">💡</span>
      <span>走行中は誤操作を防ぐため、<b>ロック中はスワイプしても動きません</b>。必ず<b>長押しでロックを外して（赤枠）</b>から操作してください。停止中は長押しなしで自由に切り替えできます。</span>
    </div>
  </section>

  <p class="footnote">
    まとめ：切り替えは <span class="kbd">ボタン</span> か <span class="kbd">時間をスワイプ</span>（並びはループ）。走行中に変えるときは <span class="kbd r">長押し→赤枠</span> → スワイプ → <span class="kbd">長押し / 3秒放置で固定</span>。赤枠＝<b>ロック解除中</b>のしるし。
  </p>
`;

export default function WhatsNew({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: 16, overflow: "auto", overscrollBehavior: "contain",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 780,
          margin: "24px auto", boxShadow: "0 12px 40px rgba(0,0,0,.3)",
          display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 48px)", overflow: "hidden",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "13px 18px", borderBottom: "1px solid #eee", flex: "0 0 auto",
        }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>変更点・使い方</span>
          <button onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #888", background: "#f5f5f5", fontWeight: 700, fontSize: 15 }}>
            閉じる
          </button>
        </div>
        <div className="wn" style={{ overflow: "auto", padding: "18px 20px 28px", WebkitOverflowScrolling: "touch" }}>
          <style>{CSS}</style>
          <div dangerouslySetInnerHTML={{ __html: CONTENT }} />
        </div>
      </div>
    </div>
  );
}
