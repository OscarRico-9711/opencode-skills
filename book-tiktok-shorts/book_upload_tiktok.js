const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const UPLOAD_URL = 'https://www.tiktok.com/tiktokstudio/upload?from=webapp&tab=video';
const DEBUG_DIR = process.env.TEMP || process.cwd();
const MAX_SCHEDULE_DAYS = 10;
const HASHTAG_POOL = [
  '#boombaptypebeat', '#beatmakers', '#hiphopbeats', '#freestylebeat', '#rapbeat', '#boombapbeat', '#hiphopinstrumental', '#oldschoolbeat',
  '#hiphop', '#newmusicfriday', '#boombap', '#hiphopproducer', '#beatmaking', '#beats', '#lofi', '#mpc', '#mpclive2', '#lofihiphop',
  '#goldenera', '#instrumentals', '#beatmaker', '#mpc2000xl', '#chillbeats', '#chill', '#lofibeats', '#lofichill', '#producertok',
  '#producer', '#instrumentalhiphop', '#instrumental', '#nujabes', '#duet', '#duetwithme'
];

const configPath = process.argv[2];
if (!configPath) {
  console.error('ERROR: falta ruta del JSON config');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
const {
  videos,
  caption,
  captions,
  scheduleType,
  time,
  intervalHours,
  intervalDays,
  dryRun = false,
  quiet = false,
  captionExtra = '',
  addSoundToVideo = true,
  soundSearchTerm = '',
  soundSearchTerms,
  startDate,
} = config;

function log(message) {
  if (!quiet) console.log(message);
}

function assertChromeDebugPort() {
  if (process.platform !== 'win32') return;
  const command = "$p=Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess; if ($p) { (Get-Process -Id $p -ErrorAction Stop).ProcessName }";
  let processName = '';
  try {
    processName = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8' }).trim().toLowerCase();
  } catch (err) {
    throw new Error('No pude verificar que el puerto 9222 sea Chrome. Aborto para no tocar Brave.');
  }
  if (!processName) throw new Error('Chrome no esta abierto con --remote-debugging-port=9222. Abre Chrome con ese puerto antes de ejecutar.');
  if (processName === 'brave') throw new Error('El puerto 9222 pertenece a Brave. Cierra ese modo debug y abre Chrome; no se permite automatizar Brave.');
  if (processName !== 'chrome') throw new Error(`El puerto 9222 pertenece a ${processName}. Solo se permite Chrome.`);
}

if (!time) {
  console.error('ERROR: falta time. Use formato "HH:MM AM/PM"');
  process.exit(1);
}

const timeParts = time.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
if (!timeParts) {
  console.error('ERROR: formato de hora invalido. Use "HH:MM AM/PM"');
  process.exit(1);
}

let hour = Number(timeParts[1]);
const minute = Number(timeParts[2]);
const ampm = timeParts[3].toUpperCase();
if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
  console.error('ERROR: formato de hora invalido');
  process.exit(1);
}
if (minute % 5 !== 0) {
  console.error('ERROR: TikTok solo permite minutos en intervalos de 5. Use 00, 05, 10, ..., 55');
  process.exit(1);
}
if (ampm === 'PM' && hour !== 12) hour += 12;
if (ampm === 'AM' && hour === 12) hour = 0;

function parseStartDate(value) {
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return checkedDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return checkedDate(Number(match[3]), Number(match[2]), Number(match[1]));
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
}

function checkedDate(year, month, day) {
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function firstScheduleDate() {
  const now = new Date();

  if (startDate) {
    const d = parseStartDate(startDate);
    if (!d) {
      console.error(`ERROR: startDate invalido: "${startDate}"`);
      process.exit(1);
    }
    d.setHours(hour, minute, 0, 0);
    if (d <= now) {
      console.error(`ERROR: startDate + time queda en el pasado`);
      process.exit(1);
    }
    return d;
  }

  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

function nextScheduleDate(prev) {
  let d;
  if (scheduleType === 'days') {
    d = new Date(prev);
    d.setDate(d.getDate() + Number(intervalDays || 1));
  } else if (scheduleType === 'interval') {
    d = new Date(prev.getTime() + Number(intervalHours) * 3600000);
  } else {
    d = new Date(prev);
    d.setDate(d.getDate() + 1);
  }

  return d;
}

function assertWithinTikTokLimit(plan) {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_SCHEDULE_DAYS);
  maxDate.setSeconds(59, 999);

  const firstExceeded = plan.find((item) => item.date > maxDate);
  if (firstExceeded) {
    throw new Error(`TikTok solo permite programar hasta ${MAX_SCHEDULE_DAYS} dias. La fecha ${formatDateStr(firstExceeded.date)} excede el limite ${formatDateStr(maxDate)}. Reduce cantidad/intervalo o usa una estrategia de subida en vivo.`);
  }
}

function baseTitleFromPath(videoPath) {
  const base = path.basename(videoPath, path.extname(videoPath));
  return base
    .replace(/_clip_\d+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function generatedCaption(videoPath, index) {
  const counter = String(index + 1).padStart(3, '0');
  const extra = captionExtra ? ` ${captionExtra.trim()}` : '';
  return `${baseTitleFromPath(videoPath)} ${counter}${extra} ${randomHashtags(5)}`;
}

function randomHashtags(count) {
  return [...new Set(HASHTAG_POOL)].sort(() => Math.random() - 0.5).slice(0, count).join(' ');
}

function captionFor(videoPath, index) {
  if (Array.isArray(captions) && captions[index]) return captions[index];
  if (caption) return caption;
  return generatedCaption(videoPath, index);
}

function formatDateStr(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let h12 = date.getHours() % 12;
  if (h12 === 0) h12 = 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${h12}:${String(date.getMinutes()).padStart(2, '0')} ${date.getHours() < 12 ? 'AM' : 'PM'}`;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime24(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function validateConfig() {
  if (!Array.isArray(videos) || videos.length === 0) throw new Error('Config invalido: videos debe tener al menos un archivo');
  const seen = new Set();
  for (const video of videos) {
    if (!fs.existsSync(video)) throw new Error(`No existe el video: ${video}`);
    const key = video.toLowerCase();
    if (seen.has(key)) throw new Error(`Video duplicado en config: ${video}`);
    seen.add(key);
  }
  if (Array.isArray(captions) && captions.length !== videos.length) throw new Error('Config invalido: captions debe tener la misma cantidad que videos');
  for (let i = 0; i < videos.length; i++) {
    const value = captionFor(videos[i], i);
    if (value.length > 4000) throw new Error(`Caption ${i + 1} excede 4000 caracteres`);
  }
  if (scheduleType === 'interval' && !(Number(intervalHours) > 0)) throw new Error('Config invalido: intervalHours debe ser mayor que 0');
  if (scheduleType === 'days' && !(Number(intervalDays) > 0)) throw new Error('Config invalido: intervalDays debe ser mayor que 0');
  if (!['daily', 'interval', 'days'].includes(scheduleType)) throw new Error('Config invalido: scheduleType debe ser daily, interval o days');
}

function buildPlan() {
  let currentDate = firstScheduleDate();
  return videos.map((video, index) => {
    const item = { video, caption: captionFor(video, index), date: new Date(currentDate) };
    currentDate = nextScheduleDate(currentDate);
    return item;
  });
}

function printPlan(plan) {
  console.log(`Plan: ${plan.length} videos`);
  for (let i = 0; i < plan.length; i++) {
    console.log(`${i + 1}. ${path.basename(plan[i].video)} -> ${formatDateStr(plan[i].date)} -> ${plan[i].caption}`);
  }
}

async function debug(page, name) {
  const base = path.join(DEBUG_DIR, `tiktok_${name}_${Date.now()}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  console.log(`Debug: ${base}.png`);
}

async function dismissLeavePrompt(page) {
  const dismissed = await page.evaluate(() => {
    const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/seguro que quieres salir|progreso y los cambios no se guardar/i.test(text)) return false;
    const buttons = Array.from(document.querySelectorAll('button'));
    const cancelBtn = buttons.find((b) => /cancelar|cancel/i.test((b.textContent || '').trim()) && b.offsetWidth > 0 && b.offsetHeight > 0);
    if (cancelBtn) { cancelBtn.click(); return true; }
    return false;
  }).catch(() => false);
  if (dismissed) await page.waitForTimeout(1000);
  return dismissed;
}

async function dismissReviewPopup(page) {
  return page.evaluate(() => {
    const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/seguir con la publicaci[oó]n|a[uú]n estamos comprobando|still checking your video/i.test(text)) return false;
    const buttons = Array.from(document.querySelectorAll('button'));
    const cancelBtn = buttons.find(b => {
      const t = (b.textContent || '').trim();
      return /cancelar|cancel/i.test(t) && b.offsetWidth > 0 && b.offsetHeight > 0;
    });
    if (cancelBtn) { cancelBtn.click(); return true; }
    return false;
  }).catch(() => false);
}

async function waitForContentCheckPassed(page, index) {
  let waited = 0;
  const timeout = 600000;
  while (waited < timeout) {
    await dismissReviewPopup(page);
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => {
      const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
      const checkDone = /no se encontraron problemas|no issues found/i.test(text);
      const checkLimit = /alcanzaste tu l[ií]mite de comprobaciones|limite de comprobaciones/i.test(text);
      const hasEditor = !!document.querySelector('[contenteditable="true"]');
      const hasProcessing = /verificaci[oó]n en curso|comprobaci[oó]n de contenido|checking your video|processing|still checking/i.test(text);
      return { checkDone, checkLimit, hasEditor, hasProcessing };
    }).catch(() => ({ checkDone: false, checkLimit: false, hasEditor: false, hasProcessing: true }));

    if ((state.checkDone || state.checkLimit) && state.hasEditor) return;
    await page.waitForTimeout(3000);
    waited += 3000;
    if (waited % 30000 === 0) log(`  Aun en verificacion... (${waited / 1000}s)`);
  }

  await debug(page, `content_check_timeout_${index}`);
  throw new Error('TikTok no mostro "No se encontraron problemas" ni "limite de comprobaciones" antes del timeout. No hice clic en Programar.');
}

async function waitForCommunityGuidelinesClear(page, index) {
  let waited = 0;
  const timeout = 300000;
  while (waited < timeout) {
    await dismissReviewPopup(page);
    const state = await page.evaluate(() => {
      const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
      const spanishClear = /No se encontraron problemas,? pero tu video podr[ií]a ser eliminado m[aá]s tarde si infringe las Normas de la comunidad/i.test(text);
      const englishClear = /No issues found\.? However,? your video could still be removed later if it violates our Community Guidelines/i.test(text);
      return { ok: spanishClear || englishClear, sample: text.slice(0, 500) };
    }).catch(() => ({ ok: false, sample: '' }));

    if (state.ok) return;
    await page.waitForTimeout(5000);
    waited += 5000;
    if (waited % 30000 === 0) log(`  Esperando mensaje final de Normas de la comunidad... (${waited / 1000}s)`);
  }

  await debug(page, `community_guidelines_check_timeout_${index}`);
  throw new Error('TikTok no mostro el mensaje final de Normas de la comunidad antes del timeout. No hice clic en Programar.');
}

async function detectScheduleLimitBlocker(page) {
  return page.evaluate(() => {
    const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
    const match = text.match(/Solo puedes programar hasta 30 publicaciones\.?|You can only schedule up to 30 posts\.?|You can schedule up to 30 posts\.?/i);
    return match ? { blocked: true, message: match[0] } : { blocked: false, message: '' };
  }).catch(() => ({ blocked: false, message: '' }));
}

async function fillCaption(page, text) {
  const editor = page.locator('[contenteditable="true"]');
  if (!(await editor.isVisible().catch(() => false))) {
    return { ok: false, reason: 'contenteditable not visible' };
  }
  await editor.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+A');
  await page.waitForTimeout(200);
  await editor.type(text, { delay: 5 });
  await page.waitForTimeout(500);
  const current = ((await editor.textContent().catch(() => '')) || '').trim();
  if (current !== text.trim()) {
    return { ok: false, reason: `caption mismatch. esperado="${text.trim()}" actual="${current}"` };
  }
  return { ok: true };
}

async function selectSchedule(page, scheduleDate) {
  const result = await page.evaluate(() => {
    const scheduleRadio = document.querySelector('input[type="radio"][name="postSchedule"][value="schedule"]');
    if (!scheduleRadio) return { ok: false, reason: 'schedule radio not found' };
    scheduleRadio.click();
    scheduleRadio.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  });
  await page.waitForTimeout(1500);
  return result;
}

async function openCalendar(page) {
  const result = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input.TUXTextInputCore-input'));
    const dateInput = inputs.find(i => /^\d{4}-\d{2}-\d{2}$/.test(i.value || ''));
    if (!dateInput || dateInput.offsetWidth === 0) return { ok: false, reason: 'date input not visible' };
    dateInput.click();
    dateInput.dispatchEvent(new Event('focus', { bubbles: true }));
    return { ok: true };
  });
  if (!result.ok) return result;
  await page.waitForTimeout(1500);
  return { ok: true };
}

async function findCalendarWidget(page) {
  const selectors = ['.calendar-wrapper', '.TUXCalendar', '[class*="calendar"]', '[class*="Calendar"]', 'div[class*="popup"] div[class*="calendar"]'];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) return { ok: true, selector: sel };
  }
  // Broader fallback: any visible element containing a month name
  const result = await page.evaluate(() => {
    const monthNames = /enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december/i;
    const allDivs = document.querySelectorAll('div, section');
    for (const div of allDivs) {
      if (div.offsetWidth > 0 && div.offsetHeight > 0 && monthNames.test(div.textContent || '')) {
        const parent = div.closest('[class*="popup"], [class*="modal"], [class*="overlay"], [class*="calendar"], [class*="Calendar"]');
        if (parent && parent.offsetWidth > 0) return { selector: 'custom', found: true };
      }
    }
    return { selector: '', found: false };
  });
  if (result.found) return { ok: true, selector: 'custom' };
  return { ok: false, reason: 'no calendar widget found on page' };
}

async function selectCalendarMonth(page, scheduleDate) {
  const targetMonth = scheduleDate.getMonth();
  const targetYear = scheduleDate.getFullYear();

  for (let attempt = 0; attempt < 12; attempt++) {
    const state = await page.evaluate(() => {
      const bodyText = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
      // Try finding month text in popup/calendar areas
      const popupEls = document.querySelectorAll('[class*="popup"] [class*="calendar"], [class*="calendar"], [class*="Calendar"], .calendar-wrapper, .TUXCalendar');
      let wrapper = null;
      for (const el of popupEls) {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) { wrapper = el; break; }
      }
      if (!wrapper) {
        // Fallback: look for visible date-related popup
        const allPopups = document.querySelectorAll('[class*="popup"], [class*="modal"], [class*="overlay"]');
        for (const p of allPopups) {
          if (p.offsetWidth > 0 && p.offsetHeight > 0) {
            const txt = (p.textContent || '').trim().replace(/\s+/g, ' ');
            if (/\d{4}/.test(txt) && /enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december/i.test(txt)) {
              wrapper = p; break;
            }
          }
        }
      }
      if (!wrapper) return { ok: false, reason: 'calendar not found' };
      const text = (wrapper.textContent || '').trim().replace(/\s+/g, ' ');
      const match = text.match(/(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Setiembre|Octubre|Noviembre|Diciembre|January|February|March|April|May|June|July|August|September|October|November|December)\s*[\/\s,]+\s*(\d{4})/i);
      if (!match) return { ok: false, reason: `month not readable: ${text.slice(0, 100)}` };
      const monthMap = {
        enero: 0, january: 0,
        febrero: 1, february: 1,
        marzo: 2, march: 2,
        abril: 3, april: 3,
        mayo: 4, may: 4,
        junio: 5, june: 5,
        julio: 6, july: 6,
        agosto: 7, august: 7,
        septiembre: 8, setiembre: 8, september: 8,
        octubre: 9, october: 9,
        noviembre: 10, november: 10,
        diciembre: 11, december: 11,
      };
      const monthName = match[1].toLowerCase();
      return { ok: true, month: monthMap[monthName], year: Number(match[2]), wrapper: wrapper, text: text.slice(0, 120) };
    });

    if (!state.ok) {
      // If calendar not found, wait and retry
      await page.waitForTimeout(1000);
      continue;
    }
    if (state.month === targetMonth && state.year === targetYear) return { ok: true };

    const direction = (state.year < targetYear || (state.year === targetYear && state.month < targetMonth)) ? 'next' : 'prev';
    const clicked = await page.evaluate((dir) => {
      // Find nav buttons in calendar popup
      const popupAreas = document.querySelectorAll('[class*="popup"] [class*="calendar"], [class*="calendar"], [class*="Calendar"], .calendar-wrapper, .TUXCalendar');
      let wrapper = null;
      for (const el of popupAreas) {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) { wrapper = el; break; }
      }
      if (!wrapper) {
        const allPopups = document.querySelectorAll('[class*="popup"], [class*="modal"], [class*="overlay"]');
        for (const p of allPopups) {
          if (p.offsetWidth > 0 && p.offsetHeight > 0 && /\d{4}/.test(p.textContent || '')) { wrapper = p; break; }
        }
      }
      if (!wrapper) return { ok: false, reason: 'wrapper not found for nav' };
      // Try various nav button patterns
      const buttons = Array.from(wrapper.querySelectorAll('button, [role="button"], [data-testid]'));
      const icon = buttons.find(b => {
        const t = (b.textContent || '').trim();
        const testId = (b.getAttribute('data-testid') || '').toLowerCase();
        if (dir === 'next') return /next|siguiente|chevronright|arrowright|chevron_right|arrow_forward/i.test(t) || /chevronright|arrowright/i.test(testId);
        return /prev|previous|anterior|chevronleft|arrowleft|chevron_left|arrow_back/i.test(t) || /chevronleft|arrowleft/i.test(testId);
      });
      if (icon) { icon.click(); return { ok: true }; }
      // Last resort: click last/first button in the header area
      const headerBtns = Array.from(wrapper.querySelectorAll('button')).filter(b => b.offsetWidth > 0);
      if (headerBtns.length >= 2) {
        const btn = dir === 'next' ? headerBtns[headerBtns.length - 1] : headerBtns[0];
        btn.click();
        return { ok: true, note: 'fallback_nav' };
      }
      return { ok: false, reason: `${dir} nav button not found` };
    }, direction);

    if (!clicked.ok) return clicked;
    await page.waitForTimeout(500);
  }
  return { ok: false, reason: `calendar did not reach ${formatDateISO(scheduleDate)}` };
}

async function clickCalendarDay(page, targetDay) {
  return page.evaluate((dayStr) => {
    // Find all potential calendar popups
    const calendarSelectors = ['[class*="calendar"]', '[class*="Calendar"]', '.calendar-wrapper', '.TUXCalendar'];
    let wrapper = null;
    for (const sel of calendarSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) {
          const txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
          if (/\d{4}/.test(txt)) { wrapper = el; break; }
        }
      }
      if (wrapper) break;
    }
    if (!wrapper) {
      const allPopups = document.querySelectorAll('[class*="popup"], [class*="modal"], [class*="overlay"]');
      for (const p of allPopups) {
        if (p.offsetWidth > 0 && p.offsetHeight > 0 && /\d{4}/.test(p.textContent || '')) { wrapper = p; break; }
      }
    }
    if (!wrapper) return { ok: false, reason: 'calendar popup not found for day click' };

    // Find ALL clickable day elements to see what's available
    const allClickable = Array.from(wrapper.querySelectorAll('span, div, button')).filter(el => el.offsetWidth > 0);
    const matching = allClickable.filter(el => el.textContent.trim() === dayStr);
    const firstFew = matching.slice(0, 3).map(el => ({
      tag: el.tagName,
      text: el.textContent.trim(),
      className: (el.className || '').slice(0, 80),
      rect: { w: el.offsetWidth, h: el.offsetHeight, x: el.offsetLeft, y: el.offsetTop },
      parentClass: el.parentElement ? (el.parentElement.className || '').slice(0, 60) : ''
    }));
    console.log(`  Day "${dayStr}" candidates:`, JSON.stringify(firstFew));

    // Click the FIRST matching day element that is not disabled
    for (const el of matching) {
      const isDisabled = el.closest('[class*="disabled"], [class*="outside"]') || el.classList.contains('disabled');
      if (!isDisabled && el.offsetHeight > 0) {
        el.click();
        return { ok: true, clicked: el.tagName, class: (el.className || '').slice(0, 60) };
      }
    }

    // If none found, try without the disabled check
    if (matching.length > 0) {
      matching[0].click();
      return { ok: true, note: 'clicked despite possible disabled' };
    }

    // Last resort: scan for buttons with aria-label containing the day
    const buttons = wrapper.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.offsetWidth > 0) {
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (aria.includes(dayStr)) { btn.click(); return { ok: true, note: 'aria_label_match' }; }
      }
    }

    return { ok: false, reason: `day ${dayStr} not clickable`, totalCandidates: allClickable.length, matching: matching.length };
  }, String(targetDay));
}

async function openTimePicker(page) {
  const result = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input.TUXTextInputCore-input'));
    const timeInput = inputs.find(i => /^\d{2}:\d{2}$/.test(i.value || ''));
    if (!timeInput || timeInput.offsetWidth === 0) return { ok: false, reason: 'time input not visible' };
    timeInput.click();
    timeInput.dispatchEvent(new Event('focus', { bubbles: true }));
    return { ok: true };
  });
  if (!result.ok) return result;
  await page.waitForTimeout(1000);
  return { ok: true };
}

async function setDateTime(page, scheduleDate) {
  const dateISO = formatDateISO(scheduleDate);
  const time24 = formatTime24(scheduleDate);
  const [targetHour, targetMinute] = time24.split(':').map(Number);

  // Open calendar
  const opened = await openCalendar(page);
  if (!opened.ok) return opened;

  // Wait for calendar widget
  await page.waitForTimeout(2000);

  // Navigate calendar to correct month/year
  const monthReady = await selectCalendarMonth(page, scheduleDate);
  console.log(`  Calendar month check:`, JSON.stringify(monthReady));
  if (!monthReady.ok) return monthReady;

  // Click the target day using Playwright locator for reliable click
  const dayBtn = page.locator('.day-span-container').filter({ hasText: String(scheduleDate.getDate()) }).first();
  if (await dayBtn.isVisible().catch(() => false)) {
    await dayBtn.click();
    console.log(`  Clicked day ${scheduleDate.getDate()} via locator`);
  } else {
    // Fallback: click via evaluate
    const dayClicked = await clickCalendarDay(page, scheduleDate.getDate());
    console.log(`  Calendar day click (eval):`, JSON.stringify(dayClicked));
  }

  // Wait for the date input value to actually update
  let dateUpdated = false;
  for (let w = 0; w < 20; w++) {
    await page.waitForTimeout(500);
    const val = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input.TUXTextInputCore-input'));
      const d = inputs.find(i => /^\d{4}-\d{2}-\d{2}$/.test(i.value || ''));
      return d ? d.value : '';
    });
    console.log(`  Date input wait: "${val}" == "${dateISO}"`);
    if (val === dateISO) { dateUpdated = true; break; }
  }

  // Fallback: directly set value if calendar click didn't work
  if (!dateUpdated) {
    console.log(`  Calendar click didnt update date. Setting directly via JS...`);
    const setOk = await page.evaluate((d) => {
      const inputs = Array.from(document.querySelectorAll('input.TUXTextInputCore-input'));
      const inp = inputs.find(i => /^\d{4}-\d{2}-\d{2}$/.test(i.value || ''));
      if (!inp) return false;
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(inp, d);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, dateISO);
    console.log(`  Direct set: ${setOk}`);
    await page.waitForTimeout(1000);
  }

  // Open time picker
  const timeOpened = await openTimePicker(page);
  if (!timeOpened.ok) return timeOpened;

  await page.waitForTimeout(1000);

  // Click hour in dropdown
  const hourClicked = await page.evaluate((h) => {
    const hourStr = String(h).padStart(2, '0');
    const items = document.querySelectorAll('.tiktok-timepicker-option-text, [class*="timepicker"] [class*="option"], [class*="time"] [class*="option"]');
    for (const item of items) {
      if (item.textContent.trim() === hourStr && item.offsetWidth > 0) {
        const parent = item.closest('[class*="left"], [class*="hour"]');
        if (parent || !document.querySelector('[class*="left"], [class*="hour"]')) {
          item.click();
          return { ok: true, value: hourStr };
        }
      }
    }
    // Try all items matching just the number
    for (const item of items) {
      if (item.textContent.trim() === hourStr && item.offsetWidth > 0) {
        item.click();
        return { ok: true, value: hourStr };
      }
    }
    return { ok: false, reason: `hour ${hourStr} not found in time picker` };
  }, targetHour);
  await page.waitForTimeout(500);

  if (!hourClicked.ok) return hourClicked;

  // Click minute in dropdown
  const minuteClicked = await page.evaluate((m) => {
    const minStr = String(m).padStart(2, '0');
    const items = document.querySelectorAll('.tiktok-timepicker-option-text, [class*="timepicker"] [class*="option"], [class*="time"] [class*="option"]');
    for (const item of items) {
      if (item.textContent.trim() === minStr && item.offsetWidth > 0) {
        const parent = item.closest('[class*="right"], [class*="minute"]');
        if (parent || !document.querySelector('[class*="right"], [class*="minute"]')) {
          item.click();
          return { ok: true, value: minStr };
        }
      }
    }
    for (const item of items) {
      if (item.textContent.trim() === minStr && item.offsetWidth > 0) {
        item.click();
        return { ok: true, value: minStr, note: 'fallback' };
      }
    }
    return { ok: false, reason: `minute ${minStr} not found in time picker` };
  }, targetMinute);
  await page.waitForTimeout(500);

  if (!minuteClicked.ok) return minuteClicked;

  // Close time dropdown
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Wait for the time input value to actually update
  for (let w = 0; w < 20; w++) {
    await page.waitForTimeout(500);
    const val = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input.TUXTextInputCore-input'));
      const t = inputs.find(i => /^\d{2}:\d{2}$/.test(i.value || ''));
      return t ? t.value : '';
    });
    log(`  Time input check: "${val}" == "${time24}"`);
    if (val === time24) break;
  }

  return { ok: true };
}

async function verifyDateTime(page, scheduleDate) {
  const dateISO = formatDateISO(scheduleDate);
  const time24 = formatTime24(scheduleDate);

  const values = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input.TUXTextInputCore-input');
    let dateV = '', timeV = '';
    for (const input of inputs) {
      const val = input.value || '';
      if (val.match(/^\d{4}-\d{2}-\d{2}$/)) dateV = val;
      else if (val.match(/^\d{2}:\d{2}$/)) timeV = val;
    }
    return { dateV, timeV };
  });

  return values.dateV === dateISO && values.timeV === time24;
}

async function clickScheduleSubmit(page) {
  const result = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const scheduleBtn = buttons.find((b) => {
      const text = (b.textContent || '').trim();
      return /^(Programar|Schedule)$/i.test(text) && b.offsetWidth > 0 && b.offsetHeight > 0;
    });
    if (!scheduleBtn) return { ok: false, reason: 'Programar/Schedule button not found' };
    const isDisabled = scheduleBtn.disabled || scheduleBtn.hasAttribute('disabled') || scheduleBtn.getAttribute('aria-disabled') === 'true';
    if (isDisabled) return { ok: false, reason: 'Programar button is disabled' };
    scheduleBtn.click();
    return { ok: true };
  });
  await page.waitForTimeout(5000);
  return result;
}

async function detectReviewPopup(page) {
  return page.evaluate(() => {
    const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
    const hasReviewPrompt = /seguir con la publicaci[oó]n|still checking your video|checking your video/i.test(text);
    const hasPublishNow = /publicar ahora|publish now/i.test(text);
    return hasReviewPrompt || hasPublishNow;
  }).catch(() => false);
}

async function verifyScheduledSuccess(page) {
  return page.evaluate(() => {
    const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
    // Success message visible
    if (/programad[oa]|scheduled|publicaci[oó]n programada|se program[oó]/i.test(text)) return true;
    // File input is empty (previous upload was consumed)
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput && fileInput.files && fileInput.files.length === 0) return true;
    // Upload form reset: file input is present but no file selected
    const hasFileButtons = Array.from(document.querySelectorAll('button')).some(b => /seleccionar|select|upload|subir/i.test((b.textContent || '').trim()));
    if (hasFileButtons) return true;
    return false;
  }).catch(() => false);
}

function extractSoundSearchTerm(videoPath) {
  const base = baseTitleFromPath(videoPath);
  const firstWord = (base.split(' ')[0] || '').toLowerCase();
  return `${firstWord} perpetuo beats`;
}

function soundSearchTermFor(videoPath, index) {
  if (Array.isArray(soundSearchTerms) && soundSearchTerms[index]) return soundSearchTerms[index];
  if (soundSearchTerm) return soundSearchTerm;
  return extractSoundSearchTerm(videoPath);
}

async function addSound(page, searchTerm) {
  let soundBtn = page.locator('#open-new-editor [data-button-name="sounds"]').first();
  if (!(await soundBtn.isVisible().catch(() => false))) {
    soundBtn = page.locator('xpath=//*[@id="open-new-editor"]/div[2]/button').first();
  }
  if (!(await soundBtn.isVisible().catch(() => false))) {
    return { ok: false, reason: 'sounds button not found at #open-new-editor' };
  }
  await soundBtn.click();
  await page.waitForTimeout(2500);

  let searchInput = page.locator('input[placeholder="Buscar sonidos"]').first();
  if (!(await searchInput.isVisible().catch(() => false))) {
    searchInput = page.locator('input[placeholder="Search sounds"]').first();
  }
  if (!(await searchInput.isVisible().catch(() => false))) {
    return { ok: false, reason: 'Buscar sonidos input not found' };
  }
  await searchInput.click();
  await searchInput.fill(searchTerm);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);

  let addBtn = page.locator('button:not([disabled]):not([aria-disabled="true"]):not([data-disabled="true"])')
    .filter({ hasText: /Añadir|Agregar|Add|Añade/i }).first();
  if (!(await addBtn.isVisible().catch(() => false)) || !(await addBtn.isEnabled().catch(() => false))) {
    addBtn = page.locator('button:not([disabled]):not([aria-disabled="true"]):not([data-disabled="true"])')
      .filter({ has: page.locator('[data-icon="PlusBold"]') }).first();
  }
  if (!(await addBtn.isVisible().catch(() => false)) || !(await addBtn.isEnabled().catch(() => false))) {
    return { ok: false, reason: 'Add button not found in sound search results' };
  }
  await addBtn.click();
  await page.waitForTimeout(3000);

  return { ok: true };
}

async function readVisibleDbInputValue(page) {
  return page.evaluate(() => {
    const visible = (el) => el && el.offsetWidth > 0 && el.offsetHeight > 0;
    const input = Array.from(document.querySelectorAll('input')).find((el) => {
      if (!visible(el)) return false;
      const c = el.className || '';
      const pt = (el.parentElement && el.parentElement.textContent) || '';
      return typeof c === 'string' && c.includes('PropSettingInput__input') && /dB/i.test(pt);
    });
    if (!input) return 'NOT_FOUND';
    return input.value;
  }).catch(() => 'ERROR');
}

async function setAddedSoundVolumeToMinus58(page) {
  const marker = await page.evaluate(() => {
    const visible = (el) => el && el.offsetWidth > 0 && el.offsetHeight > 0;
    const input = Array.from(document.querySelectorAll('input')).find((el) => {
      if (!visible(el)) return false;
      const c = el.className || '';
      const pt = (el.parentElement && el.parentElement.textContent) || '';
      return typeof c === 'string' && c.includes('PropSettingInput__input') && /dB/i.test(pt);
    });
    if (!input) return null;
    input.dataset.opencodeDb = 'true';
    return { x: input.getBoundingClientRect().x, y: input.getBoundingClientRect().y };
  }).catch(() => null);
  if (!marker) return { ok: false, reason: 'dB PropSettingInput not found' };

  const inputLocator = page.locator('[data-opencode-db="true"]').first();
  await inputLocator.click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  await page.keyboard.type('-58', { delay: 100 });
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(1000);

  const inputValue = await readVisibleDbInputValue(page);

  if (inputValue === '-58') return { ok: true };
  return { ok: false, reason: `input dB value is "${inputValue}", expected "-58"` };
}

async function clickAudioSave(page) {
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => {
      return (b.textContent || '').trim() === 'Guardar' && b.offsetWidth > 0 && b.offsetHeight > 0 && !b.disabled;
    });
    if (!btn) return false;
    btn.click();
    return true;
  }).catch(() => false);
  if (clicked) await page.waitForTimeout(1500);
  return { ok: clicked };
}

async function closeSoundPanel(page) {
  const stillOpen = async () => page.locator('input[placeholder="Buscar sonidos"]').first().isVisible().catch(() => false);

  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(1000);

  if (!(await stillOpen())) return { ok: true };

  const sbBtn = page.locator('#open-new-editor [data-button-name="sounds"]').first();
  const sbVisible = await sbBtn.isVisible().catch(() => false);
  if (sbVisible) {
    await sbBtn.click();
    await page.waitForTimeout(1500);
  }

  if (!(await stillOpen())) return { ok: true };

  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(1500);

  return { ok: true, stillOpen: await stillOpen() };
}

async function uploadVideo(browser, videoPath, scheduleDate, index, total) {
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = [...pages].reverse().find((p) => p.url().startsWith(UPLOAD_URL)) || pages[pages.length - 1] || await context.newPage();
  const videoCaption = captionFor(videoPath, index);
  console.log(`[${index + 1}/${total}] ${path.basename(videoPath)} -> ${formatDateStr(scheduleDate)}`);

  await page.bringToFront();
  await dismissLeavePrompt(page);
  if (!page.url().startsWith(UPLOAD_URL)) {
    await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(5000);
  await dismissLeavePrompt(page);

  // Check if we're logged in
  const loginVisible = await page.locator('text=Iniciar sesión').first().isVisible().catch(() => false);
  if (loginVisible) {
    throw new Error('Sesion de TikTok expirada. Abre TikTok en Chrome y vuelve a iniciar sesion.');
  }

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(videoPath);
  log('  Subiendo...');

  // Wait for TikTok video processing to complete
  log('  Esperando verificacion de contenido...');
  await waitForContentCheckPassed(page, index + 1);
  await page.waitForTimeout(2000);

  // Fill caption
  const fillResult = await fillCaption(page, videoCaption);
  if (!fillResult.ok) {
    await debug(page, `caption_fail_${index + 1}`);
    throw new Error(`No se pudo llenar caption: ${fillResult.reason}`);
  }
  log(`  Caption: "${videoCaption}"`);
  if (await dismissLeavePrompt(page)) log('  Leave prompt cancelled after caption');

  // Select schedule radio
  const scheduleResult = await selectSchedule(page, scheduleDate);
  if (!scheduleResult.ok) {
    await debug(page, `schedule_radio_fail_${index + 1}`);
    throw new Error(`No se pudo seleccionar Programacion: ${scheduleResult.reason}`);
  }
  log('  Schedule radio selected');

  // Wait for date/time inputs to appear
  await page.waitForTimeout(2000);

  // Set date and time
  const dtResult = await setDateTime(page, scheduleDate);
  if (!dtResult.ok) {
    await debug(page, `datetime_fail_${index + 1}`);
    throw new Error(`No se pudo establecer fecha/hora: ${dtResult.reason}`);
  }
  log(`  Fecha: ${formatDateISO(scheduleDate)} Hora: ${formatTime24(scheduleDate)}`);

  // Verify the values were set correctly
  await page.waitForTimeout(1500);
  const actualValues = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input.TUXTextInputCore-input');
    let dateV = '', timeV = '';
    for (const input of inputs) {
      const val = input.value || '';
      if (val.match(/^\d{4}-\d{2}-\d{2}$/)) dateV = val;
      else if (val.match(/^\d{2}:\d{2}$/)) timeV = val;
    }
    return { dateV, timeV };
  });
  const verified = await verifyDateTime(page, scheduleDate);
  if (!verified) {
    console.log(`  VERIFY FAIL: expected date=${formatDateISO(scheduleDate)} time=${formatTime24(scheduleDate)} actual date=${actualValues.dateV} time=${actualValues.timeV}`);
    await debug(page, `datetime_verify_fail_${index + 1}`);
    throw new Error(`No se pudo verificar fecha/hora. Aborto para no publicar por error.`);
  }

  // Add sound after caption and schedule are ready
  if (addSoundToVideo !== false) {
    const searchTerm = soundSearchTermFor(videoPath, index);
    if (await dismissLeavePrompt(page)) log('  Leave prompt cancelled before sound');
    const soundResult = await addSound(page, searchTerm);
    if (soundResult.ok) {
      log(`  Sound added (search: "${searchTerm}")`);
      await closeSoundPanel(page).catch(() => log('  Sound panel close (may auto-close)'));
      const volResult = await setAddedSoundVolumeToMinus58(page);
      if (volResult.ok) {
        log('  Volume set to -58 dB (verified on input)');
        const saveResult = await clickAudioSave(page);
        if (saveResult.ok) log('  Audio Guardar clicked');
        else log('  No Guardar button found (may auto-save)');
        const valueAfterSave = await readVisibleDbInputValue(page);
        if (valueAfterSave === 'NOT_FOUND') {
          log('  Volume input closed after Guardar; keeping verified -58 dB');
        } else if (valueAfterSave !== '-58') {
          await debug(page, `volume_after_save_fail_${index + 1}`);
          throw new Error(`Volumen cambio despues de Guardar: "${valueAfterSave}". Aborto antes de Programar.`);
        }
        if (valueAfterSave === '-58') log('  Volume still -58 dB after Guardar');
      } else {
        await debug(page, `volume_fail_${index + 1}`);
        throw new Error(`No se pudo fijar volumen a -58 dB: ${volResult.reason}`);
      }
    } else {
      await debug(page, `sound_add_fail_${index + 1}`);
      throw new Error(`No se pudo agregar sonido: ${soundResult.reason}`);
    }
  } else {
    log('  Sound skipped by config');
  }

  // TikTok may keep checking while the form is editable. Never submit before the pass text is visible.
  await waitForContentCheckPassed(page, index + 1);
  await waitForCommunityGuidelinesClear(page, index + 1);
  await dismissReviewPopup(page);
  await page.waitForTimeout(1000);

  // Click the Programar button
  const submitResult = await clickScheduleSubmit(page);
  if (!submitResult.ok) {
    await debug(page, `submit_fail_${index + 1}`);
    throw new Error(`No se pudo hacer clic en Programar: ${submitResult.reason}. Aborto para no publicar por error.`);
  }

  const immediateLimitBlocker = await detectScheduleLimitBlocker(page);
  if (immediateLimitBlocker.blocked) {
    await debug(page, `schedule_limit_blocker_${index + 1}`);
    throw new Error(`Bloqueante TikTok: ${immediateLimitBlocker.message}`);
  }

  // Handle confirmation popup after clicking Programar
  let confirmResult = { ok: false, reason: 'not_checked' };
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.waitForTimeout(1500);
    confirmResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();

      const scheduleLimit = text.match(/Solo puedes programar hasta 30 publicaciones\.?|You can only schedule up to 30 posts\.?|You can schedule up to 30 posts\.?/i);
      if (scheduleLimit) return { ok: false, reason: `schedule_limit_blocker: ${scheduleLimit[0]}` };

      const hasReviewPrompt = /seguir con la publicaci[oó]n|a[uú]n estamos comprobando|still checking your video|checking your video|quieres seguir publicando/i.test(text);
      if (hasReviewPrompt) {
        const confirmBtn = buttons.find((b) => {
          const t = (b.textContent || '').trim();
          return (t === 'Programar' || /seguir|programar|confirmar|schedule|confirm|continuar|continue|publicar/i.test(t)) && b.offsetWidth > 0 && b.offsetHeight > 0;
        });
        if (confirmBtn) {
          confirmBtn.click();
          return { ok: true, action: 'confirmed_popup' };
        }
        return { ok: false, reason: 'review_popup_without_confirm_button', popupText: text.slice(0, 200) };
      }
      return { ok: true, action: 'no_popup' };
    });
    if (confirmResult.ok) break;
    log(`  Esperando popup... intento ${attempt + 1}`);
  }
  await page.waitForTimeout(3000);

  if (!confirmResult.ok) {
    if (/schedule_limit_blocker/i.test(confirmResult.reason || '')) {
      await debug(page, `schedule_limit_blocker_${index + 1}`);
      throw new Error(`Bloqueante TikTok: ${confirmResult.reason.replace(/^schedule_limit_blocker:\s*/i, '')}`);
    }
    await debug(page, `review_popup_${index + 1}`);
    throw new Error(`TikTok mostro popup inesperado. Revisa el debug. ${confirmResult.reason}`);
  }

  // Wait for any success state or navigation (and any post-submit processing)
  log('  Esperando confirmacion de programacion...');
  let confirmWaited = 0;
  const CONFIRM_TIMEOUT = 300000;
  let scheduled = false;
  while (confirmWaited < CONFIRM_TIMEOUT) {
    const state = await page.evaluate(() => {
      const text = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
      const scheduleLimit = /Solo puedes programar hasta 30 publicaciones\.?|You can only schedule up to 30 posts\.?|You can schedule up to 30 posts\.?/i.test(text);
      const hasProcessing = /verificaci[oó]n en curso|comprobaci[oó]n de contenido|checking your video|processing|still checking/i.test(text);
      const hasSuccess = /programad[oa]|scheduled|publicaci[oó]n programada|se program[oó]|video publicado|publicado|se public[oó]/i.test(text);
      const fileInput = document.querySelector('input[type="file"]');
      const noFile = fileInput && fileInput.files && fileInput.files.length === 0;
      const noProgramarBtn = !Array.from(document.querySelectorAll('button')).some(b =>
        (b.textContent || '').trim() === 'Programar' && b.offsetWidth > 0 && b.offsetHeight > 0
      );
      return { scheduleLimit, hasSuccess, noFile, noProgramarBtn, hasProcessing };
    }).catch(() => ({ scheduleLimit: false, hasSuccess: false, noFile: false, noProgramarBtn: false, hasProcessing: true }));

    if (state.scheduleLimit) {
      await debug(page, `schedule_limit_blocker_${index + 1}`);
      throw new Error('Bloqueante TikTok: Solo puedes programar hasta 30 publicaciones.');
    }

    if (state.hasSuccess || (state.noFile && state.noProgramarBtn && !state.hasProcessing)) {
      scheduled = true;
      break;
    }
    await page.waitForTimeout(3000);
    confirmWaited += 3000;
    if (confirmWaited % 30000 === 0) log(`  Esperando confirmacion... (${confirmWaited / 1000}s)`);
  }

  if (!scheduled) {
    await debug(page, `schedule_success_not_confirmed_${index + 1}`);
    throw new Error('No pude confirmar que TikTok programo el video. Revisa el debug antes de continuar.');
  }

  console.log(quiet ? `${index + 1}/${total} OK` : '  Programado OK');
  await page.close().catch(() => {});
}

(async () => {
  validateConfig();
  const plan = buildPlan();
  assertWithinTikTokLimit(plan);
  if (dryRun) {
    printPlan(plan);
    return;
  }

  let browser;
  try {
    assertChromeDebugPort();
    browser = await chromium.connectOverCDP('http://localhost:9222');
    for (let i = 0; i < plan.length; i++) {
      await uploadVideo(browser, plan[i].video, plan[i].date, i, plan.length);
    }
    console.log(`Completado: ${plan.length} videos programados en TikTok`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
})().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
