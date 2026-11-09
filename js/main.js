/* ==========================================================================
   AI-FIKR — aifikr.attt25.uz
   Vanilla JS, kutubxonasiz.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     SOZLAMALAR — sayt ishga tushishidan oldin shu uch qiymatni to‘ldiring.
     Bo‘sh qoldirilsa, tugmalar "Aloqa" bo‘limiga olib boradi.
     --------------------------------------------------------------------- */
  const CONFIG = {
    email: '',
    sheetsApiUrl: 'https://script.google.com/macros/s/AKfycbyf0xDNCYcKmzLw_1UHnB3Uvc6mMi9r6DUeX1JoJTczkbdAT8Euu9gSocGMMeS-6-m4/exec'
  };

  const root = document.documentElement;
  root.classList.add('js');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- 1. Sozlamalarni ulash ---------- */
  function applyConfig() {
    const mail = $('[data-config-email]');
    const email = (CONFIG.email || '').trim();
    if (mail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mail.href = 'mailto:' + email;
      mail.textContent = email;
    }
  }

  /* ---------- 2. Mobil menyu ---------- */
  function initNav() {
    const toggle = $('.nav-toggle');
    const nav = $('#asosiy-menyu');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !e.target.closest('.site-header')) setOpen(false);
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- 3. Sarlavha soyasi ---------- */
  function initHeaderShadow() {
    const header = $('.site-header');
    if (!header) return;
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------- 4. Faol menyu bandi ---------- */
  function initActiveLink() {
    if (!hasIO) return;
    const links = $$('.site-nav a[href^="#"]:not(.btn)');
    const map = new Map();
    links.forEach((a) => {
      const sec = $(a.getAttribute('href'));
      if (sec) map.set(sec, a);
    });
    const clear = () => links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        clear();
        const link = map.get(entry.target);
        if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, sec) => io.observe(sec));
    window.addEventListener('scroll', () => { if (window.scrollY < 120) clear(); }, { passive: true });
  }

  /* ---------- 5. Ko‘rinish animatsiyasi (reveal) ---------- */
  function initReveal() {
    const items = $$('.reveal, .budget');
    if (!hasIO || reduceMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- 6. Raqamlar sanog‘i ---------- */
  function initCounters() {
    const counters = $$('.count[data-count]');
    if (!hasIO || reduceMotion) return;

    const animate = (el) => {
      const target = Number(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 1100;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => io.observe(el));
  }

  /* ---------- 7. Bosqichlar (akkordeon) ---------- */
  function initSteps() {
    const steps = $$('.step');
    steps.forEach((step) => {
      const btn = $('.step-head', step);
      btn.addEventListener('click', () => {
        const open = !step.classList.contains('is-open');
        step.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ---------- 8. Yil ---------- */
  function setYear() {
    const el = $('#yil');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- Ishtirok formalarini Sheets'ga yuborish ---------- */
  function initParticipationForms() {
    const forms = [
      { id: 'survey-form', statusId: 'survey-status', type: 'survey', message: 'Sörovnomangiz qabul qilindi. Rahmat!' },
      { id: 'volunteer-form', statusId: 'volunteer-status', type: 'participant', message: 'Arizangiz qabul qilindi. Tez orada siz bilan boğlanamiz.' },
      { id: 'organizer-form', statusId: 'organizer-status', type: 'organizer', message: 'Arizangiz qabul qilindi. Tez orada siz bilan boğlanamiz.' }
    ];

    forms.forEach(({ id, statusId, type, message }) => {
      const form = document.getElementById(id);
      const status = document.getElementById(statusId);
      if (!form || !status) return;
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
          status.textContent = 'Iltimos, majburiy maydonlarni töldiring.';
          status.classList.add('is-error');
          form.reportValidity();
          return;
        }
        if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/i.test(CONFIG.sheetsApiUrl)) {
          status.textContent = 'Saqlash xizmati hali sozlanmagan. Apps Script Web App URL manzilini kiriting.';
          status.classList.add('is-error');
          return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        status.classList.remove('is-error');
        status.textContent = 'Saqlanmoqda…';
        try {
          const data = Object.fromEntries(new FormData(form).entries());
          data.tools = Array.from(form.querySelectorAll('input[name="tools"]:checked')).map((input) => input.value);
          data['usage-purpose'] = Array.from(form.querySelectorAll('input[name="usage-purpose"]:checked')).map((input) => input.value);
          const response = await fetch(CONFIG.sheetsApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ type, data })
          });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error(result.error || 'Saqlashda xatolik yuz berdi.');
          status.textContent = message;
          form.reset();
        } catch (error) {
          status.textContent = error.message || 'Saqlashda xatolik yuz berdi. Qayta urinib köriñ.';
          status.classList.add('is-error');
        } finally {
          if (submitButton) submitButton.disabled = false;
          status.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
        }
      });
    });

    const survey = document.getElementById('survey-form');
    const frequency = survey && survey.elements.namedItem('frequency');
    const usageDetails = survey && survey.querySelector('.usage-details');
    const usagePurpose = survey && survey.querySelectorAll('input[name="usage-purpose"]');
    const progressValue = document.getElementById('survey-progress-value');
    const progressBar = document.getElementById('survey-progress-bar');
    if (!survey || !frequency || !usageDetails || !progressValue || !progressBar) return;

    const updateUsageQuestions = () => {
      const skipDetails = frequency.value === 'Heç qaçon';
      usageDetails.classList.toggle('is-hidden', skipDetails);
      Array.from(usageDetails.querySelectorAll('select, input, textarea')).forEach((input) => {
        input.disabled = skipDetails;
      });
      updateProgress();
    };
    const updateProgress = () => {
      const required = Array.from(survey.querySelectorAll('[required]:not(:disabled)'));
      const complete = required.filter((input) => input.type === 'checkbox' || input.type === 'radio'
        ? survey.querySelector(`[name="${CSS.escape(input.name)}"]:checked`)
        : input.value.trim()).length;
      const percent = required.length ? Math.round((complete / required.length) * 100) : 0;
      progressValue.textContent = `${percent}%`;
      progressBar.style.width = `${percent}%`;
    };
    frequency.addEventListener('change', updateUsageQuestions);
    if (usagePurpose.length) {
      const updateUsagePurposeValidity = () => {
        const message = Array.from(usagePurpose).some((input) => input.checked)
          ? ''
          : 'Kamida bitta maqsadni tanlang.';
        usagePurpose[0].setCustomValidity(message);
      };
      usagePurpose.forEach((input) => input.addEventListener('change', updateUsagePurposeValidity));
      updateUsagePurposeValidity();
    }
    survey.addEventListener('input', updateProgress);
    survey.addEventListener('change', updateProgress);
    updateUsageQuestions();
  }

  function initRatingChoices() {
    $$('.rating-options input[type="radio"]').forEach((input) => {
      const choice = document.createElement('label');
      choice.className = 'rating-choice';
      choice.textContent = input.value;
      input.parentNode.insertBefore(choice, input);
      choice.appendChild(input);
    });
  }

  /* ---------- Alohida ariza va so‘rovnoma oynalari ---------- */
  function initParticipationModals() {
    const modals = $$('dialog.participation-modal');
    if (!modals.length) return;

    $$('[data-modal-target]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const modal = document.getElementById(trigger.dataset.modalTarget);
        if (modal && typeof modal.showModal === 'function') {
          modal.showModal();
          $$('.reveal', modal).forEach((item) => item.classList.add('is-visible'));
        }
      });
    });

    modals.forEach((modal) => {
      $$('[data-modal-close]', modal).forEach((close) => {
        close.addEventListener('click', () => modal.close());
      });
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close();
      });
      modal.addEventListener('close', () => {
        const form = $('form', modal);
        if (form) {
          form.reset();
          const progressValue = $('#survey-progress-value', modal);
          const progressBar = $('#survey-progress-bar', modal);
          if (progressValue) progressValue.textContent = '0%';
          if (progressBar) progressBar.style.width = '0';
        }
      });
    });
  }

  /* ---------- Ishga tushirish ---------- */
  applyConfig();
  initNav();
  initHeaderShadow();
  initActiveLink();
  initReveal();
  initCounters();
  initSteps();
  setYear();
  initRatingChoices();
  initParticipationForms();
  initParticipationModals();
})();
