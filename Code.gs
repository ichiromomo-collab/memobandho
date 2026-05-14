const SHEET_ID = '1Ix1NUutrebej-Wc7ZIobFc6qkhccq6J6TxQYTeX1URY';
const SHEET_NAME = 'シート1';
const SAVE_EMOJI = 'pushpin';
const CARE_SHEET_NAME = '患者ケア記録';
const CARE_CHANNEL = 'C0981JUPKRT';

function extractPatientName(text) {
  const match = text.match(/([^\s　、。\n]+(?:様|さま|さん))/);
  return match ? match[1] : null;
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  if (payload.type === 'url_verification') {
    return ContentService.createTextOutput(payload.challenge);
  }
  const event = payload.event;
  if (!event) return ContentService.createTextOutput('ok');

  // 患者ケア記録の保存
  if (event.type === 'message' && !event.subtype && !event.bot_id &&
      event.channel === CARE_CHANNEL && event.text) {
    const patientName = extractPatientName(event.text);
    if (patientName) saveCareRecord(event, patientName);
  }

  // @メンションで時系列返信
  if (event.type === 'app_mention' && event.channel === CARE_CHANNEL) {
    const patientName = extractPatientName(event.text);
    if (patientName) replyPatientHistory(event.channel, event.ts, patientName);
    return ContentService.createTextOutput('ok');
  }

  // メモ番長
  let message = null;
  let trigger = '';
  if (event.type === 'reaction_added' && event.reaction === SAVE_EMOJI) {
    trigger = '📌 リアクション';
    message = fetchSlackMessage(event.item.channel, event.item.ts);
  }
  if (event.type === 'app_mention') {
    trigger = '@メンション';
    message = { text: event.text, user: event.user, channel: event.channel, ts: event.ts };
  }
  if (event.type === 'message' && event.text && event.text.includes('#保存')) {
    trigger = '#保存 キーワード';
    message = { text: event.text, user: event.user, channel: event.channel, ts: event.ts };
  }
  if (message) saveToSheet(message, trigger);

  return ContentService.createTextOutput('ok');
}

// ─── 患者ケア記録を保存してスレッドに返信 ───────────────────────────
function saveCareRecord(event, patientName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(CARE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CARE_SHEET_NAME);
    sheet.appendRow(['日時', '患者名', '投稿者', '内容', 'Slackリンク']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  const date = new Date(parseFloat(event.ts) * 1000);
  const link = `https://slack.com/archives/${event.channel}/p${event.ts.replace('.', '')}`;
  const userName = getUserName(event.user);

  sheet.appendRow([
    Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    patientName,
    userName,
    event.text,
    link
  ]);

  // 直近10件を取得してスレッドに返信
  const rows = sheet.getDataRange().getValues();
  const records = rows.slice(1)
    .filter(row => row[1] === patientName)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const recent = records.slice(-10);

  let text = `📋 *${patientName}* の記録（直近${recent.length}件／計${records.length}件）\n`;
  text += '─'.repeat(30) + '\n';
  recent.forEach(row => {
    const d = new Date(row[0]);
    const dateStr = isNaN(d) ? row[0] : Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
    text += `*${dateStr}* ${row[2]}\n${row[3]}\n\n`;
  });

  const token = PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
  UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    payload: JSON.stringify({
      channel: event.channel,
      thread_ts: event.ts,
      text: text
    })
  });
}  // ← saveCareRecord の閉じ括弧

// ─── @メンションで患者の過去記録を返信 ──────────────────────────────
function replyPatientHistory(channel, ts, patientName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(CARE_SHEET_NAME);
  if (!sheet) return;

  const rows = sheet.getDataRange().getValues();
  const records = rows.slice(1)
    .filter(row => row[1] === patientName)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]));

  let text;
  if (records.length === 0) {
    text = `📋 *${patientName}* の記録はまだありません。`;
  } else {
    text = `📋 *${patientName}* の記録（${records.length}件）\n`;
    text += '─'.repeat(30) + '\n';
    records.forEach(row => {
      const d = new Date(row[0]);
      const dateStr = isNaN(d) ? row[0] : Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
      text += `*${dateStr}* ${row[2]}\n${row[3]}\n\n`;
    });
  }  // ← if-else の閉じ括弧

  const token = PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
  UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    payload: JSON.stringify({ channel: channel, thread_ts: ts, text: text })
  });
}  // ← replyPatientHistory の閉じ括弧

// ─── Slackメッセージ取得 ─────────────────────────────────────────────
function fetchSlackMessage(channel, ts) {
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
  const url = `https://slack.com/api/conversations.history?channel=${channel}&latest=${ts}&limit=1&inclusive=true`;
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = JSON.parse(res.getContentText());
  if (data.ok && data.messages.length > 0) {
    return { text: data.messages[0].text, user: data.messages[0].user, channel: channel, ts: ts };
  }
  return null;
}

// ─── メモ番長保存 ────────────────────────────────────────────────────
function saveToSheet(msg, trigger) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const date = new Date(parseFloat(msg.ts) * 1000);
  const link = `https://slack.com/archives/${msg.channel}/p${msg.ts.replace('.', '')}`;
  sheet.appendRow([
    Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    getUserName(msg.user), msg.channel, msg.text, link, trigger
  ]);
}

// ─── ユーザー名取得 ──────────────────────────────────────────────────
function getUserName(userId) {
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
  const url = `https://slack.com/api/users.info?user=${userId}`;
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = JSON.parse(res.getContentText());
  return data.ok ? (data.user.profile.display_name || data.user.profile.real_name) : userId;
}

// ─── FAX受信通知 ─────────────────────────────────────────────────────
const WEBHOOK_URL = 'https://hooks.slack.com/services/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';
const GMAIL_ADDRESS = 'houkan.omusubi1@gmail.com';
const FOLDER_ID = '1yshG201gmsdlKO_6riruv6uYFx0kn-lN';

function checkFaxEmails() {
  const slackToken = PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
  const threads = GmailApp.search('is:unread to:' + GMAIL_ADDRESS + ' ECOSYS', 0, 10);
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      if (message.isUnread()) {
        message.markRead();
        const subject = message.getSubject();
        const from = message.getFrom();
        const date = message.getDate();
        const attachments = message.getAttachments();
        const folder = DriveApp.getFolderById(FOLDER_ID);
        if (attachments.length > 0) {
          attachments.forEach(attachment => {
            const fileName = `FAX_${Utilities.formatDate(date, 'Asia/Tokyo', 'yyyyMMdd_HHmm')}_${subject}_${attachment.getName()}`;
            const file = folder.createFile(attachment.copyBlob().setName(fileName));
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            const driveUrl = file.getUrl();
            const getUrlResponse = UrlFetchApp.fetch('https://slack.com/api/files.getUploadURLExternal', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + slackToken, 'Content-Type': 'application/x-www-form-urlencoded' },
              payload: { filename: fileName, length: String(attachment.getBytes().length) }
            });
            const urlData = JSON.parse(getUrlResponse.getContentText());
            if (urlData.ok) {
              UrlFetchApp.fetch(urlData.upload_url, { method: 'POST', payload: attachment.copyBlob() });
              UrlFetchApp.fetch('https://slack.com/api/files.completeUploadExternal', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + slackToken, 'Content-Type': 'application/json' },
                payload: JSON.stringify({
                  files: [{ id: urlData.file_id }],
                  channel_id: 'C0ASTGU9PCH',
                  initial_comment: `📠 *FAX受信*\n• 受信日時：${Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')}\n• 送信元：${from}\n• 件名：${subject}\n• 📄 <${driveUrl}|Googleドライブで開く>`
                })
              });
            }
          });
        } else {
          const slackMessage = `📠 *FAX受信*\n• 受信日時：${Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')}\n• 送信元：${from}\n• 件名：${subject}`;
          UrlFetchApp.fetch(WEBHOOK_URL, { method: 'POST', contentType: 'application/json', payload: JSON.stringify({ text: slackMessage }) });
        }
      }
    });
  });
}

// ─── 求人メール通知 ──────────────────────────────────────────────────
const RECRUIT_WEBHOOK_URL = 'https://hooks.slack.com/services/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';
const RECRUIT_CHANNEL = 'C09SRSTNGS1';

function checkRecruitEmails() {
  const threads = GmailApp.search('is:unread subject:求人フォーム', 0, 10);
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      if (message.isUnread()) {
        message.markRead();
        const subject = message.getSubject();
        const body = message.getPlainBody();
        const date = message.getDate();
        let slackMessage = `🏥 *求人応募がありました！*\n`;
        slackMessage += `• 受信日時：${Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')}\n`;
        slackMessage += `• 件名：${subject}\n`;
        slackMessage += `\`\`\`${body.substring(0, 1000)}\`\`\``;
        UrlFetchApp.fetch(RECRUIT_WEBHOOK_URL, {
          method: 'POST', contentType: 'application/json',
          payload: JSON.stringify({ text: slackMessage, channel: RECRUIT_CHANNEL })
        });
      }
    });
  });
}

// ─── NTTメール通知 ───────────────────────────────────────────────────
const NTT_WEBHOOK_URL = 'https://hooks.slack.com/services/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';

function checkNTTEmails() {
  const threads = GmailApp.search('is:unread from:bp.nttdata-chugoku.co.jp', 0, 10);
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      if (message.isUnread()) {
        message.markRead();
        const subject = message.getSubject();
        const body = message.getPlainBody();
        const date = message.getDate();
        let slackMessage = `🔔 *NTTデータ中国からメールが届いています！*\n`;
        slackMessage += `• 受信日時：${Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')}\n`;
        slackMessage += `• 件名：${subject}\n`;
        slackMessage += `\`\`\`${body.substring(0, 1000)}\`\`\``;
        UrlFetchApp.fetch(NTT_WEBHOOK_URL, {
          method: 'POST', contentType: 'application/json',
          payload: JSON.stringify({ text: slackMessage })
        });
      }
    });
  });
}
