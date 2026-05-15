<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🍙 おむすび 営業管理</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
/* ─── リセット & ベース ─────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f7f5f0;
  --surface:#ffffff;
  --border:#e2ddd6;
  --text:#2a2520;
  --muted:#7a7268;
  --accent:#c85a2a;
  --accent-light:#f5ede7;
  --accent2:#2a7a5a;
  --accent2-light:#e7f5ef;
  --amber:#d4820a;
  --amber-light:#fef3dc;
  --radius:10px;
  --shadow:0 2px 8px rgba(0,0,0,.08);
}
body{font-family:'Hiragino Sans','Meiryo',sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.6}
button{font-family:inherit;cursor:pointer}
input,select,textarea{font-family:inherit;font-size:14px}

/* ─── ヘッダー ─────────────────────────────────── */
#header{background:var(--surface);border-bottom:1px solid var(--border);padding:0 20px;display:flex;align-items:center;gap:16px;height:52px;position:sticky;top:0;z-index:100}
#header h1{font-size:16px;font-weight:700;letter-spacing:.03em}
#header h1 span{color:var(--accent)}
.tab-bar{display:flex;gap:4px;margin-left:auto}
.tab{padding:6px 14px;border-radius:6px;border:none;background:transparent;color:var(--muted);font-size:13px;font-weight:500;transition:all .15s}
.tab.active,.tab:hover{background:var(--accent-light);color:var(--accent)}
#save-indicator{font-size:12px;color:var(--muted);min-width:60px;text-align:right}

/* ─── メインコンテンツ ─────────────────────────── */
#main{max-width:1100px;margin:0 auto;padding:20px}
.panel{display:none}
.panel.active{display:block}

/* ─── ダッシュボード ─────────────────────────────── */
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center}
.stat-card .num{font-size:28px;font-weight:700;color:var(--accent)}
.stat-card .lbl{font-size:12px;color:var(--muted);margin-top:2px}
.section-title{font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px}
.card-list{display:flex;flex-direction:column;gap:8px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px}
.card .card-head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.card .card-name{font-weight:600;font-size:14px}
.card .card-meta{font-size:12px;color:var(--muted)}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:640px){.two-col{grid-template-columns:1fr}}

/* ─── 施設リスト ─────────────────────────────────── */
.toolbar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.search-box{flex:1;min-width:180px;padding:7px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface)}
.search-box:focus{outline:none;border-color:var(--accent)}
select.filter{padding:7px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)}
.btn{padding:7px 14px;border-radius:6px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#b04a1f}
.btn-sm{padding:4px 10px;font-size:12px}
.btn-danger{background:#fee2e2;color:#b91c1c}
.btn-danger:hover{background:#fecaca}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{background:var(--bg)}
table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}
thead tr{background:var(--bg)}
th{padding:10px 12px;text-align:left;font-size:12px;color:var(--muted);font-weight:600;border-bottom:1px solid var(--border)}
td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#faf9f7}
.actions{display:flex;gap:6px}
.priority-star{color:#d4820a}
.empty-state{text-align:center;padding:48px;color:var(--muted)}

/* ─── ステータスバッジ ─────────────────────────── */
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.badge-未接触{background:#f1f1f1;color:#555}
.badge-アプローチ中{background:var(--amber-light);color:var(--amber)}
.badge-商談中{background:#dbeafe;color:#1d4ed8}
.badge-契約済{background:var(--accent2-light);color:var(--accent2)}
.badge-見送り{background:#fee2e2;color:#b91c1c}

/* ─── 地図 ─────────────────────────────────────── */
#map{height:520px;border-radius:var(--radius);border:1px solid var(--border);overflow:hidden}
.map-controls{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center}
.legend{display:flex;gap:12px;font-size:12px;color:var(--muted)}
.legend-item{display:flex;align-items:center;gap:4px}
.legend-dot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(0,0,0,.2)}

/* ─── モーダル ─────────────────────────────────── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto}
.overlay.hidden{display:none}
.modal{background:var(--surface);border-radius:14px;width:100%;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,.16);margin:auto}
.modal-head{padding:18px 20px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.modal-head h2{font-size:16px;font-weight:700}
.modal-body{padding:20px}
.modal-foot{padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px}
.form-row{margin-bottom:14px}
.form-row label{display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:5px}
.form-row input,.form-row select,.form-row textarea{width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface)}
.form-row input:focus,.form-row select:focus,.form-row textarea:focus{outline:none;border-color:var(--accent)}
.form-row textarea{resize:vertical;min-height:72px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.close-btn{background:none;border:none;font-size:20px;color:var(--muted);cursor:pointer;line-height:1;padding:2px}
.close-btn:hover{color:var(--text)}
.keyperson-list{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}
.kp-row{display:flex;gap:6px;align-items:flex-start}
.kp-row input{flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px}
.btn-icon{padding:6px 8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:14px;cursor:pointer}
.geocode-row{display:flex;gap:6px;margin-top:6px}
.geocode-row input{flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px}
.hint{font-size:11px;color:var(--muted);margin-top:4px}

/* ─── トースト ─────────────────────────────────── */
#toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#2a2520;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999;opacity:0;transition:opacity .3s;pointer-events:none}
#toast.show{opacity:1}

/* ─── ローディング ─────────────────────────────── */
#loading{position:fixed;inset:0;background:rgba(247,245,240,.8);display:flex;align-items:center;justify-content:center;z-index:300;font-size:14px;color:var(--muted)}
#loading.hidden{display:none}
</style>
</head>
<body>

<!-- ローディング -->
<div id="loading">読み込み中...</div>

<!-- ヘッダー -->
<div id="header">
  <h1>🍙 <span>おむすび</span> 営業管理</h1>
  <div class="tab-bar">
    <button class="tab active" onclick="showPanel('dash')">ダッシュボード</button>
    <button class="tab" onclick="showPanel('facilities')">施設一覧</button>
    <button class="tab" onclick="showPanel('map')">地図</button>
    <button class="tab" onclick="showPanel('visits')">訪問記録</button>
  </div>
  <div id="save-indicator"></div>
</div>

<!-- メイン -->
<div id="main">

  <!-- ダッシュボード -->
  <div id="panel-dash" class="panel active">
    <div class="stats-row" id="stats-row"></div>
    <div class="two-col">
      <div>
        <div class="section-title">次回アクション予定</div>
        <div class="card-list" id="upcoming-list"></div>
      </div>
      <div>
        <div class="section-title">最近の訪問記録</div>
        <div class="card-list" id="recent-visits-list"></div>
      </div>
    </div>
  </div>

  <!-- 施設一覧 -->
  <div id="panel-facilities" class="panel">
    <div class="toolbar">
      <input class="search-box" type="text" id="search" placeholder="施設名・住所で検索..." oninput="renderFacilities()">
      <select class="filter" id="filter-status" onchange="renderFacilities()">
        <option value="">全ステータス</option>
        <option>未接触</option><option>アプローチ中</option>
        <option>商談中</option><option>契約済</option><option>見送り</option>
      </select>
      <select class="filter" id="filter-cat" onchange="renderFacilities()">
        <option value="">全カテゴリ</option>
        <option>病院</option><option>クリニック</option><option>介護施設</option>
        <option>グループホーム</option><option>居宅介護支援</option><option>その他</option>
      </select>
      <button class="btn btn-primary" onclick="openFacilityModal(null)">＋ 施設追加</button>
    </div>
    <table id="fac-table">
      <thead>
        <tr>
          <th>優</th><th>施設名</th><th>カテゴリ</th>
          <th>ステータス</th><th>住所</th><th>TEL</th><th>操作</th>
        </tr>
      </thead>
      <tbody id="fac-tbody"></tbody>
    </table>
  </div>

  <!-- 地図 -->
  <div id="panel-map" class="panel">
    <div class="map-controls">
      <select class="filter" id="map-filter-status" onchange="refreshMarkers()">
        <option value="">全ステータス</option>
        <option>未接触</option><option>アプローチ中</option>
        <option>商談中</option><option>契約済</option><option>見送り</option>
      </select>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:#888"></div>未接触</div>
        <div class="legend-item"><div class="legend-dot" style="background:#d4820a"></div>アプローチ中</div>
        <div class="legend-item"><div class="legend-dot" style="background:#1d4ed8"></div>商談中</div>
        <div class="legend-item"><div class="legend-dot" style="background:#2a7a5a"></div>契約済</div>
        <div class="legend-item"><div class="legend-dot" style="background:#b91c1c"></div>見送り</div>
      </div>
    </div>
    <div id="map"></div>
    <div style="margin-top:10px;font-size:12px;color:var(--muted)">
      ※ 住所登録済みで座標がない施設は施設一覧の編集から「地図に登録」してください
    </div>
  </div>

  <!-- 訪問記録 -->
  <div id="panel-visits" class="panel">
    <div class="toolbar">
      <select class="filter" id="visit-fac-filter" onchange="renderVisits()">
        <option value="">全施設</option>
      </select>
      <select class="filter" id="visit-type-filter" onchange="renderVisits()">
        <option value="">全種別</option>
        <option>訪問</option><option>電話</option><option>WEB会議</option><option>メール</option><option>その他</option>
      </select>
      <button class="btn btn-primary" onclick="openVisitModal(null)">＋ 訪問記録追加</button>
    </div>
    <div class="card-list" id="visit-list"></div>
  </div>

</div><!-- /main -->

<!-- ======== 施設モーダル ======== -->
<div class="overlay hidden" id="fac-overlay">
  <div class="modal">
    <div class="modal-head">
      <h2 id="fac-modal-title">施設を追加</h2>
      <button class="close-btn" onclick="closeModal('fac-overlay')">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="fac-id">
      <div class="form-grid">
        <div class="form-row" style="grid-column:1/-1">
          <label>施設名 *</label>
          <input type="text" id="fac-name" placeholder="例：〇〇クリニック">
        </div>
        <div class="form-row">
          <label>カテゴリ</label>
          <select id="fac-category">
            <option>病院</option><option>クリニック</option><option>訪問診療所</option><option>介護施設</option>
            <option>グループホーム</option><option>居宅介護支援</option><option>その他</option>
          </select>
        </div>
        <div class="form-row">
          <label>ステータス</label>
          <select id="fac-status">
            <option>未接触</option><option>アプローチ中</option>
            <option>商談中</option><option>契約済</option><option>見送り</option>
          </select>
        </div>
        <div class="form-row">
          <label>関係性</label>
          <select id="fac-relation">
            <option>通常</option><option>懇意</option><option>開拓候補</option><option>苦手</option>
          </select>
        </div>
        <div class="form-row">
          <label>優先度</label>
          <select id="fac-priority">
            <option value="0">★なし</option><option value="1">★</option>
            <option value="2">★★</option><option value="3">★★★</option>
          </select>
        </div>
        <div class="form-row">
          <label>TEL</label>
          <input type="text" id="fac-tel" placeholder="06-XXXX-XXXX">
        </div>
        <div class="form-row">
          <label>FAX</label>
          <input type="text" id="fac-fax" placeholder="06-XXXX-XXXX">
        </div>
        <div class="form-row" style="grid-column:1/-1">
          <label>住所</label>
          <input type="text" id="fac-address" placeholder="大阪府〇〇市...">
          <div class="geocode-row">
            <button class="btn btn-ghost btn-sm" type="button" onclick="geocodeAddress()">📍 地図に登録（住所→座標）</button>
            <span id="geocode-status" style="font-size:12px;color:var(--muted);align-self:center"></span>
          </div>
          <div class="hint">住所を入力後「地図に登録」を押すと地図にピンが立ちます</div>
        </div>
        <input type="hidden" id="fac-lat">
        <input type="hidden" id="fac-lng">
        <div class="form-row" style="grid-column:1/-1">
          <label>メモ</label>
          <textarea id="fac-memo" placeholder="特記事項など"></textarea>
        </div>
      </div>

      <!-- キーパーソン -->
      <div style="margin-top:8px">
        <div class="section-title" style="margin-bottom:8px">キーパーソン</div>
        <div class="keyperson-list" id="kp-list"></div>
        <button class="btn btn-ghost btn-sm" type="button" onclick="addKpRow()">＋ キーパーソン追加</button>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal('fac-overlay')">キャンセル</button>
      <button class="btn btn-primary" onclick="saveFacility()">保存</button>
    </div>
  </div>

<!-- ======== 訪問記録モーダル ======== -->
<div class="overlay hidden" id="visit-overlay">
  <div class="modal">
    <div class="modal-head">
      <h2 id="visit-modal-title">訪問記録を追加</h2>
      <button class="close-btn" onclick="closeModal('visit-overlay')">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="visit-id">
      <div class="form-row">
        <label>施設 *</label>
        <select id="visit-fac-id"></select>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>日付 *</label>
          <input type="date" id="visit-date">
        </div>
        <div class="form-row">
          <label>種別</label>
          <select id="visit-type">
            <option>訪問</option><option>電話</option><option>WEB会議</option>
            <option>メール</option><option>その他</option>
          </select>
        </div>
        <div class="form-row" style="grid-column:1/-1">
          <label>内容・メモ</label>
          <textarea id="visit-content" placeholder="訪問内容・話した内容など"></textarea>
        </div>
        <div class="form-row" style="grid-column:1/-1">
          <label>次回アクション</label>
          <input type="text" id="visit-next-action" placeholder="例：資料送付、再訪問">
        </div>
        <div class="form-row">
          <label>次回予定日</label>
          <input type="date" id="visit-next-date">
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal('visit-overlay')">キャンセル</button>
      <button class="btn btn-primary" onclick="saveVisit()">保存</button>
    </div>
  </div>
</div>

<!-- トースト -->
<div id="toast"></div>

<script>
// ============================================================
// GAS API呼び出し
// ============================================================
var GAS_URL = ""; // デプロイ後に自動設定

// GASではgoogle.script.run を使う（HTMLファイルの場合）
// ※ スタンドアロンWebアプリとしてdoGet/doPostで使う場合はfetchを使う
// このファイルはGASのdoGet経由で配信されるため、google.script.runが使える

function api(action, data) {
  return new Promise(function(resolve, reject) {
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.ok) resolve(res.result);
        else reject(new Error(res ? res.error : "APIエラー"));
      })
      .withFailureHandler(function(err) {
        reject(new Error(err.message || "通信エラー"));
      })
      .handleRequest(action, data || null);
  });
}

// ============================================================
// 状態
// ============================================================
var facilities = [];
var visits     = [];
var map, markers = [];

// ============================================================
// 初期化
// ============================================================
window.onload = async function() {
  try {
    var res = await Promise.all([api("getFacilities"), api("getVisits")]);
    facilities = res[0] || [];
    visits     = res[1] || [];
    initMap();
    renderDash();
    renderFacilities();
    renderVisits();
    refreshMarkers();
    populateFacilitySelects();
    document.getElementById("loading").classList.add("hidden");
  } catch(e) {
    document.getElementById("loading").textContent = "読み込みエラー: " + e.message;
  }
};

// ============================================================
// タブ切替
// ============================================================
function showPanel(name) {
  document.querySelectorAll(".panel").forEach(function(p) { p.classList.remove("active"); });
  document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
  document.getElementById("panel-" + name).classList.add("active");
  event.target.classList.add("active");
  if (name === "map") { setTimeout(function(){ map.invalidateSize(); refreshMarkers(); }, 100); }
}

// ============================================================
// ダッシュボード
// ============================================================
function renderDash() {
  // 統計
  var statusCount = {};
  facilities.forEach(function(f) {
    statusCount[f.status] = (statusCount[f.status] || 0) + 1;
  });
  var stats = [
    { label:"施設数合計",  num: facilities.length, color:"var(--accent)" },
    { label:"契約済",      num: statusCount["契約済"] || 0, color:"var(--accent2)" },
    { label:"商談中",      num: statusCount["商談中"] || 0, color:"#1d4ed8" },
    { label:"アプローチ中",num: statusCount["アプローチ中"] || 0, color:"var(--amber)" },
    { label:"訪問記録数",  num: visits.length, color:"var(--muted)" },
  ];
  document.getElementById("stats-row").innerHTML = stats.map(function(s) {
    return '<div class="stat-card"><div class="num" style="color:'+s.color+'">'+s.num+'</div><div class="lbl">'+s.label+'</div></div>';
  }).join("");

  // 次回アクション
  var today = new Date().toISOString().slice(0,10);
  var upcoming = visits.filter(function(v){ return v.nextDate && v.nextDate >= today && v.nextAction; })
    .sort(function(a,b){ return a.nextDate.localeCompare(b.nextDate); })
    .slice(0, 6);
  var el = document.getElementById("upcoming-list");
  if (upcoming.length === 0) {
    el.innerHTML = '<div class="card"><div class="card-meta">予定なし</div></div>';
  } else {
    el.innerHTML = upcoming.map(function(v) {
      var fac = facilities.find(function(f){ return f.id === v.facilityId; });
      return '<div class="card"><div class="card-head"><span class="card-name">'+(fac?fac.name:"")+'</span></div>'
        +'<div class="card-meta">📅 '+v.nextDate+' — '+v.nextAction+'</div></div>';
    }).join("");
  }

  // 最近の訪問
  var recent = visits.slice().sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,5);
  var el2 = document.getElementById("recent-visits-list");
  el2.innerHTML = recent.map(function(v) {
    var fac = facilities.find(function(f){ return f.id === v.facilityId; });
    return '<div class="card"><div class="card-head"><span class="card-name">'+(fac?fac.name:"")+'</span>'
      +'<span class="badge" style="background:#f1f1f1;color:#555">'+v.type+'</span></div>'
      +'<div class="card-meta">'+v.date+' '+(v.content||"").slice(0,40)+'</div></div>';
  }).join("") || '<div class="card"><div class="card-meta">記録なし</div></div>';
}

// ============================================================
// 施設一覧
// ============================================================
function renderFacilities() {
  var q   = document.getElementById("search").value.toLowerCase();
  var st  = document.getElementById("filter-status").value;
  var cat = document.getElementById("filter-cat").value;
  var list = facilities.filter(function(f) {
    if (q  && !(f.name+f.address).toLowerCase().includes(q)) return false;
    if (st && f.status !== st) return false;
    if (cat && f.category !== cat) return false;
    return true;
  });
  var tbody = document.getElementById("fac-tbody");
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">該当する施設がありません</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(f) {
    var stars = f.priority > 0 ? '<span class="priority-star">' + "★".repeat(f.priority) + '</span>' : "";
    return '<tr>'
      +'<td>'+stars+'</td>'
      +'<td><strong>'+esc(f.name)+'</strong></td>'
      +'<td>'+esc(f.category||"")+'</td>'
      +'<td><span class="badge badge-'+f.status+'">'+f.status+'</span></td>'
      +'<td>'+esc(f.address||"")+'</td>'
      +'<td>'+esc(f.tel||"")+'</td>'
      +'<td><div class="actions">'
        +'<button class="btn btn-ghost btn-sm" onclick="openFacilityModal(\''+f.id+'\')">編集</button>'
        +'<button class="btn btn-ghost btn-sm" onclick="openVisitModal(null,\''+f.id+'\')">記録追加</button>'
        +'<button class="btn btn-danger btn-sm" onclick="deleteFacility(\''+f.id+'\')">削除</button>'
      +'</div></td>'
    +'</tr>';
  }).join("");
}

// ============================================================
// 地図
// ============================================================
function initMap() {
  map = L.map("map").setView([34.68, 135.5], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:"© OpenStreetMap contributors"
  }).addTo(map);
}

var statusColors = {
  "未接触":"#888","アプローチ中":"#d4820a","商談中":"#1d4ed8","契約済":"#2a7a5a","見送り":"#b91c1c"
};

function refreshMarkers() {
  markers.forEach(function(m){ map.removeLayer(m); });
  markers = [];
  var st = document.getElementById("map-filter-status").value;
  facilities.forEach(function(f) {
    if (f.lat == null || f.lng == null) return;
    if (st && f.status !== st) return;
    var color = statusColors[f.status] || "#888";
    var icon = L.divIcon({
      className:"",
      html:'<div style="width:14px;height:14px;background:'+color+';border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
      iconSize:[14,14], iconAnchor:[7,7]
    });
    var kps = (f.keypersons||[]).map(function(k){ return k.name+(k.role?" ("+k.role+")":""); }).join(", ");
    var popup = "<strong>"+esc(f.name)+"</strong>"
      +"<br><span style='font-size:12px'>"+esc(f.category||"")+" / "+'<span style="color:'+color+'">'+f.status+"</span></span>"
      +(kps ? "<br><span style='font-size:12px'>"+esc(kps)+"</span>" : "")
      +(f.memo ? "<br><span style='font-size:12px;color:#888'>"+esc(f.memo.slice(0,60))+"</span>" : "");
    var m = L.marker([f.lat, f.lng], {icon:icon})
      .addTo(map)
      .bindPopup(popup);
    markers.push(m);
  });
}

async function geocodeAddress() {
  var addr = document.getElementById("fac-address").value.trim();
  if (!addr) { toast("住所を入力してください"); return; }
  document.getElementById("geocode-status").textContent = "検索中...";
  try {
    var res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(addr+" 日本"),
      {headers:{"Accept-Language":"ja"}});
    var data = await res.json();
    if (!data || data.length === 0) throw new Error("座標が見つかりませんでした");
    document.getElementById("fac-lat").value = data[0].lat;
    document.getElementById("fac-lng").value = data[0].lon;
    document.getElementById("geocode-status").textContent = "✓ 座標取得: "+Number(data[0].lat).toFixed(4)+", "+Number(data[0].lon).toFixed(4);
  } catch(e) {
    document.getElementById("geocode-status").textContent = "⚠ "+e.message;
  }
}

// ============================================================
// 施設モーダル
// ============================================================
function openFacilityModal(id) {
  var f = id ? facilities.find(function(x){ return x.id === id; }) : null;
  document.getElementById("fac-modal-title").textContent = f ? "施設を編集" : "施設を追加";
  document.getElementById("fac-id").value      = f ? f.id : "";
  document.getElementById("fac-name").value    = f ? f.name : "";
  document.getElementById("fac-category").value= f ? f.category : "クリニック";
  document.getElementById("fac-status").value  = f ? f.status : "未接触";
  document.getElementById("fac-priority").value= f ? String(f.priority||0) : "0";
  document.getElementById("fac-relation").value = f ? (f.relation||"通常") : "通常";
  document.getElementById("fac-tel").value     = f ? f.tel||"" : "";
  document.getElementById("fac-fax").value     = f ? f.fax||"" : "";
  document.getElementById("fac-address").value = f ? f.address||"" : "";
  document.getElementById("fac-memo").value    = f ? f.memo||"" : "";
  document.getElementById("fac-lat").value     = f && f.lat != null ? f.lat : "";
  document.getElementById("fac-lng").value     = f && f.lng != null ? f.lng : "";
  document.getElementById("geocode-status").textContent = f && f.lat ? "✓ 座標登録済" : "";
  // キーパーソン
  var kps = f ? (f.keypersons||[]) : [];
  document.getElementById("kp-list").innerHTML = kps.map(kpRowHTML).join("") || "";
  document.getElementById("fac-overlay").classList.remove("hidden");
  document.getElementById("fac-name").focus();
}

function kpRowHTML(kp, i) {
  var idx = typeof i === "number" ? i : "";
  return '<div class="kp-row" id="kp-'+idx+'">'
    +'<input type="text" placeholder="氏名" value="'+esc(kp.name||"")+'" data-field="name">'
    +'<input type="text" placeholder="役職" style="max-width:110px" value="'+esc(kp.role||"")+'" data-field="role">'
    +'<input type="text" placeholder="連絡先" style="max-width:140px" value="'+esc(kp.contact||"")+'" data-field="contact">'
    +'<button class="btn-icon" type="button" onclick="this.parentElement.remove()">🗑</button>'
  +'</div>';
}

function addKpRow() {
  var list = document.getElementById("kp-list");
  var div = document.createElement("div");
  div.innerHTML = kpRowHTML({});
  list.appendChild(div.firstChild);
}

async function saveFacility() {
  var name = document.getElementById("fac-name").value.trim();
  if (!name) { toast("施設名を入力してください"); return; }
  var kps = [];
  document.getElementById("kp-list").querySelectorAll(".kp-row").forEach(function(row) {
    var n = row.querySelector('[data-field="name"]').value.trim();
    if (n) kps.push({
      name: n,
      role: row.querySelector('[data-field="role"]').value.trim(),
      contact: row.querySelector('[data-field="contact"]').value.trim()
    });
  });
  var lat = document.getElementById("fac-lat").value;
  var lng = document.getElementById("fac-lng").value;
  var data = {
    id:         document.getElementById("fac-id").value || null,
    name:       name,
    category:   document.getElementById("fac-category").value,
    status:     document.getElementById("fac-status").value,
    relation: document.getElementById("fac-relation").value,
    priority:   Number(document.getElementById("fac-priority").value),
    tel:        document.getElementById("fac-tel").value.trim(),
    fax:        document.getElementById("fac-fax").value.trim(),
    address:    document.getElementById("fac-address").value.trim(),
    memo:       document.getElementById("fac-memo").value.trim(),
    lat:        lat ? Number(lat) : null,
    lng:        lng ? Number(lng) : null,
    keypersons: kps
  };
  setSaving(true);
  try {
    var saved = await api("saveFacility", data);
    var idx = facilities.findIndex(function(f){ return f.id === saved.id; });
    if (idx >= 0) facilities[idx] = saved; else facilities.push(saved);
    closeModal("fac-overlay");
    renderDash(); renderFacilities(); refreshMarkers(); populateFacilitySelects();
    toast("保存しました");
  } catch(e) { toast("エラー: "+e.message); }
  finally { setSaving(false); }
}

async function deleteFacility(id) {
  if (!confirm("この施設を削除しますか？")) return;
  setSaving(true);
  try {
    await api("deleteFacility", {id:id});
    facilities = facilities.filter(function(f){ return f.id !== id; });
    visits     = visits.filter(function(v){ return v.facilityId !== id; });
    renderDash(); renderFacilities(); refreshMarkers(); renderVisits(); populateFacilitySelects();
    toast("削除しました");
  } catch(e) { toast("エラー: "+e.message); }
  finally { setSaving(false); }
}

// ============================================================
// 訪問記録
// ============================================================
function renderVisits() {
  var facId = document.getElementById("visit-fac-filter").value;
  var type  = document.getElementById("visit-type-filter").value;
  var list  = visits.filter(function(v) {
    if (facId && v.facilityId !== facId) return false;
    if (type  && v.type !== type) return false;
    return true;
  }).sort(function(a,b){ return b.date.localeCompare(a.date); });
  var el = document.getElementById("visit-list");
  if (list.length === 0) {
    el.innerHTML = '<div class="card"><div class="empty-state">記録なし</div></div>';
    return;
  }
  el.innerHTML = list.map(function(v) {
    var fac = facilities.find(function(f){ return f.id === v.facilityId; });
    return '<div class="card">'
      +'<div class="card-head">'
        +'<span class="card-name">'+(fac?esc(fac.name):"不明")+'</span>'
        +'<span class="badge" style="background:#f1f1f1;color:#555">'+v.type+'</span>'
        +'<span style="margin-left:auto;display:flex;gap:4px">'
          +'<button class="btn btn-ghost btn-sm" onclick="openVisitModal(\''+v.id+'\')">編集</button>'
          +'<button class="btn btn-danger btn-sm" onclick="deleteVisit(\''+v.id+'\')">削除</button>'
        +'</span>'
      +'</div>'
      +'<div class="card-meta">📅 '+v.date+(v.content ? ' — '+esc(v.content.slice(0,80)) : '')+'</div>'
      +(v.nextAction ? '<div class="card-meta" style="color:var(--amber)">➡ '+esc(v.nextAction)+(v.nextDate?" ("+v.nextDate+")" : "")+'</div>' : "")
    +'</div>';
  }).join("");
}

function openVisitModal(id, facilityId) {
  var v = id ? visits.find(function(x){ return x.id === id; }) : null;
  document.getElementById("visit-modal-title").textContent = v ? "訪問記録を編集" : "訪問記録を追加";
  document.getElementById("visit-id").value = v ? v.id : "";
  document.getElementById("visit-date").value = v ? v.date : new Date().toISOString().slice(0,10);
  document.getElementById("visit-type").value = v ? v.type : "訪問";
  document.getElementById("visit-content").value = v ? v.content||"" : "";
  document.getElementById("visit-next-action").value = v ? v.nextAction||"" : "";
  document.getElementById("visit-next-date").value = v ? v.nextDate||"" : "";
  var sel = document.getElementById("visit-fac-id");
  sel.value = v ? v.facilityId : (facilityId || "");
  document.getElementById("visit-overlay").classList.remove("hidden");
}

async function saveVisit() {
  var facId = document.getElementById("visit-fac-id").value;
  var date  = document.getElementById("visit-date").value;
  if (!facId || !date) { toast("施設と日付は必須です"); return; }
  var data = {
    id:         document.getElementById("visit-id").value || null,
    facilityId: facId,
    date:       date,
    type:       document.getElementById("visit-type").value,
    content:    document.getElementById("visit-content").value.trim(),
    nextAction: document.getElementById("visit-next-action").value.trim(),
    nextDate:   document.getElementById("visit-next-date").value
  };
  setSaving(true);
  try {
    var saved = await api("saveVisit", data);
    var idx = visits.findIndex(function(v){ return v.id === saved.id; });
    if (idx >= 0) visits[idx] = saved; else visits.push(saved);
    closeModal("visit-overlay");
    renderDash(); renderVisits();
    toast("保存しました");
  } catch(e) { toast("エラー: "+e.message); }
  finally { setSaving(false); }
}

async function deleteVisit(id) {
  if (!confirm("この記録を削除しますか？")) return;
  setSaving(true);
  try {
    await api("deleteVisit", {id:id});
    visits = visits.filter(function(v){ return v.id !== id; });
    renderDash(); renderVisits();
    toast("削除しました");
  } catch(e) { toast("エラー: "+e.message); }
  finally { setSaving(false); }
}

function populateFacilitySelects() {
  var opts = facilities.sort(function(a,b){ return a.name.localeCompare(b.name); })
    .map(function(f){ return '<option value="'+f.id+'">'+esc(f.name)+'</option>'; }).join("");
  document.getElementById("visit-fac-id").innerHTML = opts;
  document.getElementById("visit-fac-filter").innerHTML = '<option value="">全施設</option>' + opts;
}

// ============================================================
// ユーティリティ
// ============================================================
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function esc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(msg) {
  var el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(function(){ el.classList.remove("show"); }, 2500);
}
function setSaving(v) {
  document.getElementById("save-indicator").textContent = v ? "保存中..." : "";
}
</script>
</body>
</html>
