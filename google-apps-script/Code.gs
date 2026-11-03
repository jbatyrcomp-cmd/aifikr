/**
 * AI-FIKR sayt javoblari va admin dashboard API'si.
 *
 * Bir martalik sozlash:
 * 1. setupSheets() funksiyasini ishga tushiring.
 * 2. Script Properties'ga ADMIN_USERS_JSON qiymatini qo‘shing:
 *    {"admin":"SHA256_HASH","manager":"SHA256_HASH"}
 * 3. Parol hashini olish uchun hashAdminPassword('parol') funksiyasini
 *    Apps Script editorida ishga tushiring.
 * 4. Web app sifatida deploy qiling: Execute as Me, access Anyone.
 */
const RESPONSE_TYPES_ = ['survey', 'participant', 'organizer'];
const ADMIN_STATUSES_ = ['yangi', 'ko‘rib chiqilmoqda', 'qabul qilindi', 'rad etildi'];

function setupSheets() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.create('AI-FIKR — Sayt javoblari');

  if (!spreadsheetId) {
    properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  }

  RESPONSE_TYPES_.forEach(function (type) {
    const sheetName = getSheetName_(type);
    if (!spreadsheet.getSheetByName(sheetName)) {
      spreadsheet.insertSheet(sheetName);
    }
  });

  Logger.log(spreadsheet.getUrl());
}

function doGet() {
  return jsonResponse_({ ok: true, service: 'AI-FIKR API' });
}

function doPost(event) {
  try {
    if (!event || !event.postData || !event.postData.contents) {
      return jsonResponse_({ ok: false, error: 'Ma’lumot yuborilmadi.' });
    }

    const payload = JSON.parse(event.postData.contents);
    if (payload.action === 'login') return login_(payload);
    if (payload.action === 'list') return listResponses_(payload);
    if (payload.action === 'updateStatus') return updateStatus_(payload);
    if (payload.action === 'logout') return logout_(payload);
    return saveResponse_(payload);
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: error.message || 'Server xatosi yuz berdi.' });
  }
}

function saveResponse_(payload) {
  const type = String(payload.type || '');
  const data = payload.data;
  if (!RESPONSE_TYPES_.includes(type) || !data || typeof data !== 'object' || Array.isArray(data)) {
    return jsonResponse_({ ok: false, error: 'Yuborilgan ma’lumot formati noto‘g‘ri.' });
  }

  const sheet = getSheet_(type);
  const keys = Object.keys(data);
  ensureHeaders_(sheet, keys);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (header, index) {
    if (index === 0) return new Date();
    if (header === 'Status') return 'yangi';
    const value = data[header];
    return Array.isArray(value) ? value.join(', ') : String(value || '');
  });
  sheet.appendRow(row);
  return jsonResponse_({ ok: true });
}

function login_(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  if (!username || !password) {
    return jsonResponse_({ ok: false, error: 'Login va parolni kiriting.' });
  }

  const users = getAdminUsers_();
  const storedHash = users[username];
  if (!storedHash || storedHash !== hashPassword_(password)) {
    return jsonResponse_({ ok: false, error: 'Login yoki parol noto‘g‘ri.' });
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('ADMIN_SESSION_' + token, username, 21600);
  return jsonResponse_({ ok: true, token: token, username: username });
}

function listResponses_(payload) {
  requireAdmin_(payload.token);
  const requestedType = payload.type ? String(payload.type) : '';
  const types = requestedType ? [requestedType] : RESPONSE_TYPES_;
  if (types.some(function (type) { return !RESPONSE_TYPES_.includes(type); })) {
    throw new Error('Forma turi noto‘g‘ri.');
  }

  return jsonResponse_({
    ok: true,
    responses: types.reduce(function (all, type) {
      return all.concat(readResponses_(type));
    }, [])
  });
}

function updateStatus_(payload) {
  requireAdmin_(payload.token);
  const type = String(payload.type || '');
  const rowNumber = Number(payload.rowNumber);
  const status = String(payload.status || '');
  if (!RESPONSE_TYPES_.includes(type) || !Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error('Status yangilash ma’lumotlari noto‘g‘ri.');
  }
  if (!ADMIN_STATUSES_.includes(status)) {
    throw new Error('Status qiymati noto‘g‘ri.');
  }

  const sheet = getSheet_(type);
  ensureHeaders_(sheet, []);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let statusColumn = headers.indexOf('Status') + 1;
  if (!statusColumn) {
    statusColumn = sheet.getLastColumn() + 1;
    sheet.getRange(1, statusColumn).setValue('Status');
  }
  if (rowNumber > sheet.getLastRow()) throw new Error('Javob topilmadi.');
  sheet.getRange(rowNumber, statusColumn).setValue(status);
  return jsonResponse_({ ok: true });
}

function logout_(payload) {
  if (payload.token) CacheService.getScriptCache().remove('ADMIN_SESSION_' + String(payload.token));
  return jsonResponse_({ ok: true });
}

function readResponses_(type) {
  const sheet = getSheet_(type);
  ensureHeaders_(sheet, []);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).map(function (row, index) {
    const item = { type: type, rowNumber: index + 2 };
    headers.forEach(function (header, column) {
      item[header] = formatCell_(row[column]);
    });
    return item;
  });
}

function ensureHeaders_(sheet, newKeys) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Vaqt'].concat(newKeys).concat(['Status']));
    sheet.setFrozenRows(1);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const missing = newKeys.filter(function (key) {
    return headers.indexOf(key) === -1;
  });
  if (headers.indexOf('Status') === -1) missing.push('Status');
  if (missing.length) {
    sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  }
}

function getSheet_(type) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID topilmadi. Avval setupSheets() funksiyasini ishga tushiring.');
  }
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(getSheetName_(type));
  if (!sheet) throw new Error('Jadval varag‘i topilmadi: ' + getSheetName_(type));
  return sheet;
}

function getAdminUsers_() {
  const value = PropertiesService.getScriptProperties().getProperty('ADMIN_USERS_JSON');
  if (!value) {
    throw new Error('ADMIN_USERS_JSON sozlanmagan. Script Properties orqali adminlarni kiriting.');
  }
  const users = JSON.parse(value);
  if (!users || typeof users !== 'object' || Array.isArray(users)) {
    throw new Error('ADMIN_USERS_JSON formati noto‘g‘ri.');
  }
  return users;
}

function requireAdmin_(token) {
  if (!token || !CacheService.getScriptCache().get('ADMIN_SESSION_' + String(token))) {
    throw new Error('Sessiya tugagan. Qayta login qiling.');
  }
}

function hashAdminPassword(password) {
  if (!password) throw new Error('Parol berilmagan.');
  Logger.log(hashPassword_(String(password)));
}

function hashPassword_(password) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return digest.map(function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function formatCell_(value) {
  return value instanceof Date ? value.toISOString() : String(value == null ? '' : value);
}

function getSheetName_(type) {
  return {
    survey: 'So‘rovnoma',
    participant: 'İştirökçi volontyor',
    organizer: 'Loyiha tashkilotchisi'
  }[type];
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
