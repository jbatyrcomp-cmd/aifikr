/**
 * AI-FIKR formalarini Google Sheets'ga saqlash va admin dashboard API'si.
 *
 * Bir martalik sozlash:
 * 1. setupSheets() funksiyasini bir marta ishga tushiring.
 * 2. Script Properties'ga quyidagilarni kiriting:
 *    SPREADSHEET_ID = Google Sheets ID
 *    ADMIN_USERS_JSON = {"admin":"SHA256_HASH"}
 * 3. Web app sifatida deploy qiling: Execute as Me, Who has access: Anyone.
 */
const RESPONSE_TYPES_ = ['survey', 'participant', 'organizer'];
const ADMIN_STATUSES_ = ['yangi', 'ko‘rib chiqilmoqda', 'qabul qilindi', 'rad etildi'];
const SESSION_TTL_SECONDS_ = 21600;

function setupSheets() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('AI-FIKR — Sayt javoblari');
    spreadsheetId = spreadsheet.getId();
    properties.setProperty('SPREADSHEET_ID', spreadsheetId);
  }

  RESPONSE_TYPES_.forEach(function (type) {
    const sheetName = getSheetName_(type);
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
    ensureHeaders_(sheet, []);
  });

  Logger.log('Google Sheets: ' + spreadsheet.getUrl());
}

function doGet() {
  return jsonResponse_({ ok: true, service: 'AI-FIKR API', version: '2' });
}

function doPost(event) {
  try {
    const body = getRequestBody_(event);
    if (!body) return jsonResponse_({ ok: false, error: 'Ma’lumot yuborilmadi.' });

    switch (body.action) {
      case 'login':
        return login_(body);
      case 'list':
        return listResponses_(body);
      case 'updateStatus':
        return updateStatus_(body);
      case 'logout':
        return logout_(body);
      default:
        return saveResponse_(body);
    }
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: error.message || 'Server xatosi yuz berdi.' });
  }
}

function getRequestBody_(event) {
  if (!event || !event.postData || !event.postData.contents) return null;
  const contents = String(event.postData.contents).trim();
  if (!contents) return null;
  const body = JSON.parse(contents);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Yuborilgan ma’lumot JSON obyekt bo‘lishi kerak.');
  }
  return body;
}

function saveResponse_(payload) {
  const type = String(payload.type || '');
  const data = payload.data;
  if (!RESPONSE_TYPES_.includes(type) || !isPlainObject_(data)) {
    return jsonResponse_({ ok: false, error: 'Yuborilgan ma’lumot formati noto‘g‘ri.' });
  }

  const sheet = getSheet_(type);
  ensureHeaders_(sheet, Object.keys(data));
  const headers = getHeaders_(sheet);
  const row = headers.map(function (header, index) {
    if (index === 0) return new Date();
    if (header === 'Status') return 'yangi';
    return normalizeValue_(data[header]);
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
  const storedHash = users[username.toLowerCase()];
  if (!storedHash || storedHash !== hashPassword_(password)) {
    return jsonResponse_({ ok: false, error: 'Login yoki parol noto‘g‘ri.' });
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(
    'ADMIN_SESSION_' + token,
    username,
    SESSION_TTL_SECONDS_
  );
  return jsonResponse_({ ok: true, token: token, username: username });
}

function listResponses_(payload) {
  requireAdmin_(payload.token);
  const requestedType = String(payload.type || '');
  const types = requestedType ? [requestedType] : RESPONSE_TYPES_;

  types.forEach(function (type) {
    if (!RESPONSE_TYPES_.includes(type)) throw new Error('Forma turi noto‘g‘ri.');
  });

  const responses = [];
  types.forEach(function (type) {
    readResponses_(type).forEach(function (response) {
      responses.push(response);
    });
  });
  return jsonResponse_({ ok: true, responses: responses });
}

function updateStatus_(payload) {
  requireAdmin_(payload.token);
  const type = String(payload.type || '');
  const rowNumber = Number(payload.rowNumber);
  const status = String(payload.status || '');

  if (!RESPONSE_TYPES_.includes(type) || !Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error('Status yangilash ma’lumotlari noto‘g‘ri.');
  }
  if (!ADMIN_STATUSES_.includes(status)) throw new Error('Status qiymati noto‘g‘ri.');

  const sheet = getSheet_(type);
  ensureHeaders_(sheet, []);
  const headers = getHeaders_(sheet);
  let statusColumn = headers.indexOf('Status') + 1;
  if (!statusColumn) {
    statusColumn = headers.length + 1;
    sheet.getRange(1, statusColumn).setValue('Status');
  }
  if (rowNumber > sheet.getLastRow()) throw new Error('Javob topilmadi.');

  sheet.getRange(rowNumber, statusColumn).setValue(status);
  return jsonResponse_({ ok: true });
}

function logout_(payload) {
  const token = String(payload.token || '');
  if (token) CacheService.getScriptCache().remove('ADMIN_SESSION_' + token);
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
    sheet.getRange(1, 1, 1, newKeys.length + 2)
      .setValues([['Vaqt'].concat(newKeys).concat(['Status'])]);
    sheet.setFrozenRows(1);
    return;
  }

  const headers = getHeaders_(sheet);
  const missing = newKeys.filter(function (key) {
    return headers.indexOf(key) === -1;
  });
  if (headers.indexOf('Status') === -1) missing.push('Status');
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }
}

function getSheet_(type) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID topilmadi. setupSheets() ni ishga tushiring.');

  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(getSheetName_(type));
  if (!sheet) throw new Error('Jadval varag‘i topilmadi: ' + getSheetName_(type));
  return sheet;
}

function getHeaders_(sheet) {
  if (sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function getAdminUsers_() {
  const raw = PropertiesService.getScriptProperties().getProperty('ADMIN_USERS_JSON');
  if (!raw) throw new Error('ADMIN_USERS_JSON Script Properties’da sozlanmagan.');

  const value = String(raw).trim();
  let users;
  try {
    users = JSON.parse(value);
  } catch (error) {
    if (/^[a-f0-9]{64}$/i.test(value)) {
      users = { admin: value };
    } else {
      throw new Error('ADMIN_USERS_JSON formati noto‘g‘ri.');
    }
  }

  if (!isPlainObject_(users)) throw new Error('ADMIN_USERS_JSON obyekt bo‘lishi kerak.');
  const normalizedUsers = {};
  Object.keys(users).forEach(function (username) {
    const normalizedName = String(username).trim().toLowerCase();
    const hash = String(users[username] || '').trim().toLowerCase();
    if (!normalizedName || !/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error('ADMIN_USERS_JSON ichidagi SHA-256 hash noto‘g‘ri.');
    }
    normalizedUsers[normalizedName] = hash;
  });
  return normalizedUsers;
}

function requireAdmin_(token) {
  const value = String(token || '');
  if (!value || !CacheService.getScriptCache().get('ADMIN_SESSION_' + value)) {
    throw new Error('Sessiya tugagan. Qayta login qiling.');
  }
}

function hashAdminPassword(password) {
  if (!password) throw new Error('Parolni hashAdminPassword("parol") ko‘rinishida kiriting.');
  Logger.log(hashPassword_(String(password)));
}

function hashPassword_(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return digest.map(function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function isPlainObject_(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeValue_(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  return String(value);
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
