// ============================================================
// おむすび 営業管理ツール - GAS バックエンド
// ============================================================
var SPREADSHEET_ID = "1XnZBiPkshDCz0gWYkJ7Uj4t7ZoMJ-xjFptRWf3OKw1c";
var SHEET_FACILITIES = "施設";
var SHEET_VISITS     = "訪問記録";

var FACILITY_HEADERS = [
  "id","name","address","tel","fax","category","status","relation",
  "priority","memo","lat","lng","keypersons","createdAt","updatedAt"
];
var VISIT_HEADERS = [
  "id","facilityId","date","type","content","nextAction","nextDate","createdAt"
];

// ============================================================
// エントリーポイント
// ============================================================
function doGet(e) {
  var tmpl = HtmlService.createTemplateFromFile("index");
  return tmpl.evaluate()
    .setTitle("🍙 おむすび 営業管理")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function handleRequest(action, data) {
  if      (action === "getFacilities")  return { ok: true, result: getFacilities() };
  else if (action === "saveFacility")   return { ok: true, result: saveFacility(data) };
  else if (action === "deleteFacility") return { ok: true, result: deleteFacility(data.id) };
  else if (action === "getVisits")      return { ok: true, result: getVisits(data && data.facilityId) };
  else if (action === "saveVisit")      return { ok: true, result: saveVisit(data) };
  else if (action === "deleteVisit")    return { ok: true, result: deleteVisit(data.id) };
  else throw new Error("不明なアクション: " + action);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var result;
    if      (payload.action === "getFacilities")  result = getFacilities();
    else if (payload.action === "saveFacility")   result = saveFacility(payload.data);
    else if (payload.action === "deleteFacility") result = deleteFacility(payload.data.id);
    else if (payload.action === "getVisits")      result = getVisits(payload.data && payload.data.facilityId);
    else if (payload.action === "saveVisit")      result = saveVisit(payload.data);
    else if (payload.action === "deleteVisit")    result = deleteVisit(payload.data.id);
    else throw new Error("不明なアクション: " + payload.action);
    return jsonResponse({ ok: true, result: result });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// スプレッドシート初期化
// ============================================================
function getOrCreateSheet(name, headers) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

// ============================================================
// 施設 CRUD
// ============================================================
function getFacilities() {
  var sheet = getOrCreateSheet(SHEET_FACILITIES, FACILITY_HEADERS);
  var rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).map(function(row) {
    return rowToFacility(row);
  }).filter(function(f) { return f.id; });
}

function saveFacility(data) {
  var sheet = getOrCreateSheet(SHEET_FACILITIES, FACILITY_HEADERS);
  var now   = new Date().toISOString();
  if (data.id) {
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        data.updatedAt = now;
        data.createdAt = rows[i][13];
        sheet.getRange(i + 1, 1, 1, FACILITY_HEADERS.length)
             .setValues([facilityToRow(data)]);
        return data;
      }
    }
  }
  data.id        = "f_" + Date.now();
  data.createdAt = now;
  data.updatedAt = now;
  sheet.appendRow(facilityToRow(data));
  return data;
}

function deleteFacility(id) {
  var sheet = getOrCreateSheet(SHEET_FACILITIES, FACILITY_HEADERS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  throw new Error("施設が見つかりません: " + id);
}

function rowToFacility(row) {
  var keypersons = [];
  try { keypersons = JSON.parse(row[12] || "[]"); } catch(e) {}
  return {
    id:         String(row[0]),
    name:       row[1],
    address:    row[2],
    tel:        row[3],
    fax:        row[4],
    category:   row[5],
    status:     row[6],
    relation:   row[7] || "通常",
    priority:   Number(row[8]) || 0,
    memo:       row[9],
    lat:        row[10] !== "" ? Number(row[10]) : null,
    lng:        row[11] !== "" ? Number(row[11]) : null,
    keypersons: keypersons,
    createdAt:  row[13],
    updatedAt:  row[14]
  };
}

function facilityToRow(d) {
  return [
    d.id         || "",
    d.name       || "",
    d.address    || "",
    d.tel        || "",
    d.fax        || "",
    d.category   || "",
    d.status     || "",
    d.relation   || "通常",
    d.priority   || 0,
    d.memo       || "",
    d.lat  != null ? d.lat : "",
    d.lng  != null ? d.lng : "",
    JSON.stringify(d.keypersons || []),
    d.createdAt  || "",
    d.updatedAt  || ""
  ];
}

// ============================================================
// 訪問記録 CRUD
// ============================================================
function rowToVisit(row) {
  // 日付をYYYY-MM-DD形式に変換（スプレッドシートがDate型に変換してしまう対策）
  var dateVal = row[2];
  var dateStr = "";
  if (dateVal instanceof Date) {
    dateStr = Utilities.formatDate(dateVal, "Asia/Tokyo", "yyyy-MM-dd");
  } else {
    dateStr = String(dateVal || "").slice(0, 10);
  }
  // nextDateも同様に変換
  var nextDateVal = row[6];
  var nextDateStr = "";
  if (nextDateVal instanceof Date) {
    nextDateStr = Utilities.formatDate(nextDateVal, "Asia/Tokyo", "yyyy-MM-dd");
  } else {
    nextDateStr = String(nextDateVal || "").slice(0, 10);
  }
  return {
    id:         String(row[0]),
    facilityId: String(row[1]),
    date:       dateStr,
    type:       row[3],
    content:    row[4],
    nextAction: row[5],
    nextDate:   nextDateStr,
    createdAt:  row[7]
  };
}

function getVisits(facilityId) {
  var sheet = getOrCreateSheet(SHEET_VISITS, VISIT_HEADERS);
  var rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var visits = rows.slice(1).map(function(row) {
    return rowToVisit(row);
  }).filter(function(v) { return v.id; });
  if (facilityId) {
    visits = visits.filter(function(v) {
      return String(v.facilityId) === String(facilityId);
    });
  }
  return visits;
}

function saveVisit(data) {
  var sheet = getOrCreateSheet(SHEET_VISITS, VISIT_HEADERS);
  var now   = new Date().toISOString();
  if (data.id) {
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        data.createdAt = rows[i][7];
        sheet.getRange(i + 1, 1, 1, VISIT_HEADERS.length)
             .setValues([visitToRow(data)]);
        return data;
      }
    }
  }
  data.id        = "v_" + Date.now();
  data.createdAt = now;
  sheet.appendRow(visitToRow(data));
  return data;
}

function deleteVisit(id) {
  var sheet = getOrCreateSheet(SHEET_VISITS, VISIT_HEADERS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  throw new Error("訪問記録が見つかりません: " + id);
}

function visitToRow(d) {
  return [
    d.id         || "",
    d.facilityId || "",
    d.date       || "",
    d.type       || "",
    d.content    || "",
    d.nextAction || "",
    d.nextDate   || "",
    d.createdAt  || ""
  ];
}

// ============================================================
// テスト用
// ============================================================
function testGet() {
  var r = handleRequest("getFacilities", null);
  Logger.log(r);
}

function testVisits() {
  var r = getVisits(null);
  Logger.log("件数: " + r.length);
  Logger.log(JSON.stringify(r[0]));
}
