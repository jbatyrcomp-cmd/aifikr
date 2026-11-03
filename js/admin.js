(() => {
  'use strict';

  const API_URL = 'https://script.google.com/macros/s/AKfycbyf0xDNCYcKmzLw_1UHnB3Uvc6mMi9r6DUeX1JoJTczkbdAT8Euu9gSocGMMeS-6-m4/exec';
  const STATUSES = ['yangi', 'ko‘rib chiqilmoqda', 'qabul qilindi', 'rad etildi'];
  const state = { token: sessionStorage.getItem('aifikr_admin_token') || '', username: sessionStorage.getItem('aifikr_admin_name') || '', responses: [] };
  const $ = (selector) => document.querySelector(selector);

  async function request(payload) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Server xatosi yuz berdi.');
    return result;
  }

  function showDashboard() {
    $('#login-view').hidden = true;
    $('#dashboard-view').hidden = false;
    $('#admin-name').textContent = state.username;
  }

  function showLogin() {
    $('#login-view').hidden = false;
    $('#dashboard-view').hidden = true;
  }

  async function loadResponses() {
    $('#dashboard-status').textContent = 'Yuklanmoqda…';
    try {
      const result = await request({ action: 'list', token: state.token });
      state.responses = result.responses;
      render();
      $('#dashboard-status').textContent = `${state.responses.length} ta javob yuklandi.`;
    } catch (error) {
      if (error.message.includes('Sessiya')) {
        state.token = '';
        sessionStorage.removeItem('aifikr_admin_token');
        showLogin();
      }
      $('#dashboard-status').textContent = error.message;
    }
  }

  function filteredResponses() {
    const type = $('#type-filter').value;
    const query = $('#search-input').value.trim().toLowerCase();
    return state.responses.filter((item) => (!type || item.type === type)
      && (!query || Object.values(item).some((value) => String(value).toLowerCase().includes(query))));
  }

  function render() {
    const rows = filteredResponses();
    const headers = ['Turi', 'Vaqt', 'Ism va familiya', 'E-poçta', 'Kurs va fakultet', 'Status'];
    $('#responses-head').innerHTML = `<tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>`;
    $('#responses-body').innerHTML = rows.length ? rows.map((item) => `
      <tr>
        <td>${escapeHtml(typeLabel(item.type))}</td>
        <td>${escapeHtml(item.Vaqt || '')}</td>
        <td>${escapeHtml(item.name || '')}</td>
        <td>${escapeHtml(item.email || '')}</td>
        <td>${escapeHtml(item.faculty || item.study || '')}</td>
        <td><select class="status-select" data-type="${escapeHtml(item.type)}" data-row="${item.rowNumber}">
          ${STATUSES.map((status) => `<option ${status === (item.Status || 'yangi') ? 'selected' : ''}>${status}</option>`).join('')}
        </select></td>
      </tr>`).join('') : '<tr><td colspan="6">Ma’lumot topilmadi.</td></tr>';

    $('#total-count').textContent = state.responses.length;
    $('#survey-count').textContent = state.responses.filter((item) => item.type === 'survey').length;
    $('#participant-count').textContent = state.responses.filter((item) => item.type === 'participant').length;
    $('#organizer-count').textContent = state.responses.filter((item) => item.type === 'organizer').length;
    document.querySelectorAll('.status-select').forEach((select) => {
      select.addEventListener('change', () => updateStatus(select));
    });
  }

  async function updateStatus(select) {
    select.disabled = true;
    try {
      await request({ action: 'updateStatus', token: state.token, type: select.dataset.type, rowNumber: Number(select.dataset.row), status: select.value });
      const item = state.responses.find((response) => response.type === select.dataset.type && response.rowNumber === Number(select.dataset.row));
      if (item) item.Status = select.value;
      $('#dashboard-status').textContent = 'Status yangilandi.';
    } catch (error) {
      $('#dashboard-status').textContent = error.message;
    } finally {
      select.disabled = false;
    }
  }

  function exportCsv() {
    const rows = filteredResponses();
    if (!rows.length) return;
    const headers = ['type', 'rowNumber', ...Object.keys(rows[0]).filter((key) => key !== 'type' && key !== 'rowNumber')];
    const csv = [headers, ...rows.map((row) => headers.map((header) => row[header] || ''))]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'aifikr-javoblar.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function typeLabel(type) {
    return { survey: 'So‘rovnoma', participant: 'İştirökçi volontyor', organizer: 'Loyiha tashkilotchisi' }[type] || type;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  }

  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    button.disabled = true;
    $('#login-status').textContent = 'Tekshirilmoqda…';
    try {
      const result = await request({ action: 'login', username: form.username.value, password: form.password.value });
      state.token = result.token;
      state.username = result.username;
      sessionStorage.setItem('aifikr_admin_token', state.token);
      sessionStorage.setItem('aifikr_admin_name', state.username);
      form.reset();
      showDashboard();
      await loadResponses();
    } catch (error) {
      $('#login-status').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  $('#logout-button').addEventListener('click', async () => {
    try { await request({ action: 'logout', token: state.token }); } catch (error) { console.error(error); }
    sessionStorage.clear();
    state.token = '';
    showLogin();
  });
  $('#type-filter').addEventListener('change', render);
  $('#search-input').addEventListener('input', render);
  $('#refresh-button').addEventListener('click', loadResponses);
  $('#export-button').addEventListener('click', exportCsv);

  if (state.token) { showDashboard(); loadResponses(); } else showLogin();
})();
