/**
 * AI-FIKR sayt javoblarini Google Sheets'ga saqlash API'si.
 *
 * 1. setupSheets() funksiyasini bir marta ishga tushiring.
 * 2. Apps Script'ni Web app sifatida deploy qiling:
 *    Execute as: Me; Who has access: Anyone.
 * 3. Web app URL'ini saytning js/main.js faylidagi sheetsApiUrl qiymatiga yozing.
 */
function setupSheets() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.create('AI-FIKR — Sayt javoblari');

  if (!spreadsheetId) {
    properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  }

  ['survey', 'participant', 'organizer'].forEach(function (type) {
    const sheetName = getSheetName_(type);
    if (!spreadsheet.getSheetByName(sheetName)) {
      spreadsheet.insertSheet(sheetName);
    }
  });

  Logger.log(spreadsheet.getUrl());
}

function doPost(event) {
  try {
    if (!event || !event.postData || !event.postData.contents) {
      return jsonResponse_({ ok: false, error: 'Ma’lumot yuborilmadi.' });
    }

    const payload = JSON.parse(event.postData.contents);
    const type = String(payload.type || '');
    const data = payload.data;
    if (!['survey', 'participant', 'organizer'].includes(type) || !data || typeof data !== 'object') {
      return jsonResponse_({ ok: false, error: 'Yuborilgan ma’lumot formati noto‘g‘ri.' });
    }

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID topilmadi. Avval setupSheets() funksiyasini ishga tushiring.');
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(getSheetName_(type));
    if (!sheet) {
      throw new Error('Jadval varag‘i topilmadi: ' + getSheetName_(type));
    }

    const row = [
      new Date(),
      ...Object.keys(data).map(function (key) {
        return Array.isArray(data[key]) ? data[key].join(', ') : String(data[key] || '');
      })
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Vaqt', ...Object.keys(data)]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(row);

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: error.message || 'Saqlashda xatolik yuz berdi.' });
  }
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
