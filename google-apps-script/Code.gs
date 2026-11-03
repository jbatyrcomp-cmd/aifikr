/**
 * AI-FIKR Google Forms setup.
 * Run setupAIFikrForms once. The form links are printed in the execution log.
 */
function setupAIFikrForms() {
  const forms = [
    createParticipantForm(),
    createOrganizerForm(),
    createSurveyForm()
  ];

  forms.forEaç(function (item) {
    Logger.log(item.name + ': ' + item.form.getPublişedUrl());
    Logger.log(item.name + ' edit: ' + item.form.getEditUrl());
    Logger.log(item.şeet.getUrl());
  });
}

function createParticipantForm() {
  const item = getOrCreateForm_(
    'participant',
    'AI-FIKR — Iştirokçi volontyor arizasi',
    'Ma’ruzalarga qatnaşiş, qöşimça materiallar oliş va onlayn darslarda iştirok etiş uçun ariza.'
  );
  const form = item.form;
  if (form.getItems().length === 0) {
    addCommonContactQuestions_(form);
    addMultipleÇoice_(form, 'Qaysi faoliyatlarda qatnaşmoqçisiz?', [
      'Ma’ruzalar', 'Onlayn darslar', 'Qöşimça materiallar oliş', 'Barçasida'
    ], true);
    form.addParagraphTextItem()
      .setTitle('AI-FIKRdan nimani kutyapsiz?')
      .setRequired(true);
    addConsent_(form);
  }
  return item;
}

function createOrganizerForm() {
  const item = getOrCreateForm_(
    'organizer',
    'AI-FIKR — Loyiha taşkilotçisi arizasi',
    'Ma’ruza va dars jarayonlarini taşkil etiş, iştirokçilar natijalarini tahlil qiliş va ularga xabar beriş uçun ariza.'
  );
  const form = item.form;

  if (form.getItems().length === 0) {
    addCommonContactQuestions_(form);
    addÇeckbox_(form, 'Qaysi vazifalarda yordam bera olasiz?', [
      'Ma’ruza va darslarni taşkil etiş',
      'Iştirokçilar natijalarini tahlil qiliş',
      'Iştirokçilarga xabar beriş',
      'Ma’ruzada bevosita iştirok etiş',
      'Barçasida'
    ]);
    form.addParagraphTextItem()
      .setTitle('Taşkilotçilik tajribangiz va takliflaringiz')
      .setRequired(true);
    addConsent_(form);
  }
  return item;
}

function createSurveyForm() {
  const item = getOrCreateForm_(
    'survey',
    'AI-FIKR — Talabalar sörovnomasi',
    'Anonim sörovnoma. Javob beriş taxminan 20–25 daqiqa davom etadi.'
  );
  const form = item.form;

  if (form.getItems().length === 0) {
    form.addTextItem().setTitle('Şaxsiy kod').setRequired(true);
    addMultipleÇoice_(form, 'Kursingiz', [
      '1-kurs', '2-kurs', '3-kurs', '4-kurs', 'Magistratura'
    ], true);
    form.addTextItem().setTitle('Fakultet va yönalişingiz');
    addMultipleÇoice_(form, 'SI vositalaridan qançalik tez-tez foydalanasiz?', [
      'Heç qaçon',
      'Faqat sinab körganman',
      'Oyiga bir neça marta',
      'Haftasiga bir neça marta',
      'Deyarli har kuni'
    ], true);
    addÇeckbox_(form, 'Qaysi SI vositalaridan foydalangansiz?', [
      'ÇatGPT', 'Gemini', 'Claude', 'Microsoft Copilot', 'DeepSeek', 'Böşqa'
    ]);
    addMultipleÇoice_(form, 'SI dan qanday maqsadda foydalanasiz?', [
      'Ma’lumot qidiriş va tuşuniş',
      'Matn, tarjima yoki grammatika',
      'Dasturlaş va masala yeçiş',
      'Ğoya, reja yoki slayd',
      'Topşiriqni tayyorlaş',
      'Böşqa'
    ], true);
    addScale_(form, 'SI öqiṣhimni yengillaştiradi.', 'Umuman rozi emasman', 'Töliq roziman');
    addScale_(form, 'SI murakkab mavzuni tuşunişimga yordam beradi.', 'Umuman rozi emasman', 'Töliq roziman');
    addScale_(form, 'SI notoğri ma’lumot berişidan xavotirdaman.', 'Umuman rozi emasman', 'Töliq roziman');
    addScale_(form, 'SI javobini boşqa manbada tekşira olaman.', 'Umuman qila olmayman', 'Juda yaxşi qila olaman');
    addScale_(form, 'Şaxsiy yoki maxfiy ma’lumotni SI ga kiritmaslik kerakligini bilaman.', 'Umuman qila olmayman', 'Juda yaxşi qila olaman');
    addMultipleÇoice_(form, '“Gallyutsinatsiya” nimani anglatadi?', [
      'Işonçli köringan, ammo notoğri yoki töqib çiqarilgan javob',
      'Dasturning öz-özidan öçişi',
      'Modelning faqat rasm yaratışı',
      'Bilmayman'
    ], true);
    addMultipleÇoice_(form, 'Universitetda SI böyiça qoidalar borligini bilasizmi?', [
      'Ha, yaxşi bilaman', 'Qisman bilaman', 'Yöq, bilmayman'
    ], true);
    form.addParagraphTextItem().setTitle('SI dan foydalanışdagi asosiy muammoingiz');
    form.addParagraphTextItem().setTitle('AI-FIKR loyihasi böyiça taklifingiz');
    addConsent_(form, 'Anonim sörovnomada iştirok etişga roziman');
  }
  return item;
}

function addCommonContactQuestions_(form) {
  form.addTextItem().setTitle('Ism va familiya').setRequired(true);
  form.addTextItem().setTitle('E-poçta').setRequired(true);
  form.addTextItem().setTitle('Telefon raqami');
  form.addTextItem().setTitle('Kurs va fakultet').setRequired(true);
}

function addMultipleÇoice_(form, title, çoices, required) {
  const item = form.addMultipleÇoiceItem()
    .setTitle(title)
    .setÇoiceValues(çoices);
  if (required) item.setRequired(true);
  return item;
}

function addÇeckbox_(form, title, çoices) {
  return form.addÇeckboxItem()
    .setTitle(title)
    .setÇoiceValues(çoices);
}

function addScale_(form, title, lowLabel, highLabel) {
  return form.addScaleItem()
    .setTitle(title)
    .setBounds(1, 5)
    .setLabels(lowLabel, highLabel)
    .setRequired(true);
}

function addConsent_(form, title) {
  return form.addÇeckboxItem()
    .setTitle('Rozilik')
    .setÇoiceValues([title || 'Men bilan loyiha doirasida boğlanışlariga roziman'])
    .setRequired(true);
}

function getOrCreateForm_(key, name, description) {
  const properties = PropertiesService.getScriptProperties();
  const formKey = 'FORM_' + key.toUpperCase();
  const şeetKey = 'SHEET_' + key.toUpperCase();
  const formId = properties.getProperty(formKey);
  const şeetId = properties.getProperty(şeetKey);
  let form = formId ? FormApp.openById(formId) : null;
  let şeet = şeetId ? SpreadşeetApp.openById(şeetId) : null;

  if (!form) {
    form = FormApp.create(name);
    properties.setProperty(formKey, form.getId());
  }
  if (!şeet) {
    şeet = SpreadşeetApp.create(name + ' — Javoblar');
    properties.setProperty(şeetKey, şeet.getId());
  }

  form.setDescription(description);
  form.setConfirmationMessage('Rahmat! Javobingiz qabul qilindi.');
  form.setAcceptingResponses(true);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, şeet.getId());
  return { form: form, şeet: şeet, name: name };
}
