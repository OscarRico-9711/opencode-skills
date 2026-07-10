const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_CHANNEL_ID = 'UCDZGMK9cr4B-XgF_OyOx1MQ';
const DEBUG_DIR = process.env.TEMP || process.cwd();

const configPath = process.argv[2];
if (!configPath) {
  console.error('ERROR: falta ruta del JSON config');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
const {
  videos,
  title,
  titles,
  description,
  scheduleType,
  time,
  intervalHours,
  intervalDays,
  channelId = DEFAULT_CHANNEL_ID,
  dryRun = false,
  quiet = false,
  titleExtra = '',
  startDate,
} = config;

const UPLOAD_URL = `https://studio.youtube.com/channel/${channelId}/videos/upload?d=ud`;
const DEFAULT_DESCRIPTION = 'https://open.spotify.com/intl-es/artist/57AW2Xl73JztY2BsJAUg9o?si=AjKGujOwQ2yeWDvNWA3pnA';
const MAX_TITLE_LENGTH = 100;
const HASHTAG_POOL = [
  '#boombaptypebeat', '#beatmakers', '#hiphopbeats', '#freestylebeat', '#rapbeat', '#boombapbeat', '#hiphopinstrumental', '#oldschoolbeat',
  '#hiphop', '#newmusicfriday', '#boombap', '#hiphopproducer', '#beatmaking', '#beats', '#lofi', '#mpc', '#mpclive2', '#lofihiphop',
  '#goldenera', '#instrumentals', '#beatmaker', '#mpc2000xl', '#chillbeats', '#chill', '#lofibeats', '#lofichill', '#producertok',
  '#producer', '#instrumentalhiphop', '#instrumental', '#nujabes', '#duet', '#duetwithme'
];

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
  console.error('ERROR: formato de hora invalido. Use hora 1-12 y minutos 0-59');
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
  if (startDate) {
    const d = parseStartDate(startDate);
    if (!d) {
      console.error(`ERROR: startDate invalido: "${startDate}". Use formato como "Jun 15, 2026", "2026-06-15" o "15/06/2026"`);
      process.exit(1);
    }
    d.setHours(hour, minute, 0, 0);
    if (d <= new Date()) {
      console.error(`ERROR: startDate + time queda en el pasado: "${startDate}" ${time}`);
      process.exit(1);
    }
    return d;
  }
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d;
}

function nextScheduleDate(prev) {
  if (scheduleType === 'days') {
    const d = new Date(prev);
    d.setDate(d.getDate() + Number(intervalDays || 1));
    return d;
  }
  if (scheduleType === 'interval') return new Date(prev.getTime() + Number(intervalHours) * 3600000);
  const d = new Date(prev);
  d.setDate(d.getDate() + 1);
  return d;
}

function baseTitleFromPath(videoPath) {
  const base = path.basename(videoPath, path.extname(videoPath));
  return base
    .replace(/_clip_\d+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function generatedTitle(videoPath, index) {
  const counter = String(index + 1).padStart(3, '0');
  const extra = titleExtra ? ` ${titleExtra.trim()}` : '';
  const prefix = `${baseTitleFromPath(videoPath)} ${counter}${extra}`;
  const tags = randomHashtagsForTitle(prefix);
  if (!tags) return prefix.slice(0, MAX_TITLE_LENGTH).trim();
  return `${prefix} - ${tags}`;
}

function randomHashtagsForTitle(prefix) {
  const shuffled = [...new Set(HASHTAG_POOL)].sort(() => Math.random() - 0.5);
  const selected = [];
  for (const tag of shuffled) {
    const candidateTags = [...selected, tag].join(' ');
    if (`${prefix} - ${candidateTags}`.length <= MAX_TITLE_LENGTH) selected.push(tag);
    if (selected.length >= 3) break;
  }
  return selected.join(' ');
}

function titleFor(videoPath, index) {
  if (Array.isArray(titles) && titles[index]) return titles[index];
  if (title) return title;
  return generatedTitle(videoPath, index);
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
  if (Array.isArray(titles) && titles.length !== videos.length) throw new Error('Config invalido: titles debe tener la misma cantidad que videos');
  for (let i = 0; i < videos.length; i++) {
    const finalTitle = titleFor(videos[i], i);
    if (finalTitle.length > MAX_TITLE_LENGTH) {
      throw new Error(`Titulo demasiado largo (${finalTitle.length}/${MAX_TITLE_LENGTH}) en video ${i + 1} (${path.basename(videos[i])}): ${finalTitle}`);
    }
  }
  if (scheduleType === 'interval' && !(Number(intervalHours) > 0)) throw new Error('Config invalido: intervalHours debe ser mayor que 0');
  if (scheduleType === 'days' && !(Number(intervalDays) > 0)) throw new Error('Config invalido: intervalDays debe ser mayor que 0');
  if (!['daily', 'interval', 'days'].includes(scheduleType)) throw new Error('Config invalido: scheduleType debe ser daily, interval o days');
}

function buildPlan() {
  let currentDate = firstScheduleDate();
  return videos.map((video, index) => {
    const item = { video, title: titleFor(video, index), description: description || DEFAULT_DESCRIPTION, date: currentDate };
    currentDate = nextScheduleDate(currentDate);
    return item;
  });
}

function printPlan(plan) {
  console.log(`Plan: ${plan.length} videos`);
  for (let i = 0; i < plan.length; i++) {
    const { dateStr, timeStr } = formatDateTime(plan[i].date);
    console.log(`${i + 1}. ${path.basename(plan[i].video)} -> ${dateStr} ${timeStr} -> ${plan[i].title}`);
  }
}

function formatDateTime(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let h12 = date.getHours() % 12;
  if (h12 === 0) h12 = 12;
  return {
    dateStr: `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
    spanishDateStr: formatSpanishDate(date),
    time24Str: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    timeStr: `${h12}:${String(date.getMinutes()).padStart(2, '0')} ${date.getHours() < 12 ? 'AM' : 'PM'}`,
  };
}

function formatSpanishDate(date) {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function normalizeTimeValue(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value || '').toLowerCase().replace(/\s+/g, '');
  return `${Number(match[1])}:${match[2]}`;
}

async function debug(page, name) {
  const base = path.join(DEBUG_DIR, `youtube_${name}_${Date.now()}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  fs.writeFileSync(`${base}.txt`, await visibleState(page), 'utf8');
  console.log(`Debug: ${base}.png / ${base}.txt`);
}

async function visibleState(page) {
  return page.evaluate(() => {
    function walk(root, out = []) {
      for (const el of root.querySelectorAll('*')) {
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const tag = el.tagName.toLowerCase();
        const name = el.getAttribute('name');
        const role = el.getAttribute('role');
        const aria = el.getAttribute('aria-label');
        const checked = el.getAttribute('aria-checked') || el.checked || el.hasAttribute('checked');
        if (visible && (tag.includes('button') || tag.includes('radio') || tag.includes('picker') || tag === 'input' || role || name)) {
          const value = tag === 'input' ? ` value="${el.value || ''}" type="${el.type || ''}"` : '';
          out.push(`${tag} name=${name || ''} role=${role || ''} aria=${aria || ''} checked=${checked || ''}${value} text="${text.slice(0, 120)}"`);
        }
        if (el.shadowRoot) walk(el.shadowRoot, out);
      }
      return out;
    }
    return walk(document).join('\n');
  });
}

async function findAndClickSchedule(page) {
  const clicked = await page.evaluate(() => {
    function visible(el) {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }
    function clickCandidate(root) {
      for (const el of root.querySelectorAll('*')) {
        const name = el.getAttribute?.('name');
        const aria = el.getAttribute?.('aria-label') || '';
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        const looksLikeSchedule = name === 'SCHEDULE' || /\bProgramar\b|\bSchedule\b/i.test(aria) || /\bProgramar\b|\bSchedule\b/i.test(text);
        const looksUnsafe = /Crear|Create|Publicar|Publish|Guardar|Save/i.test(text);
        if (visible(el) && looksLikeSchedule && !looksUnsafe) {
          el.click();
          return true;
        }
        if (el.shadowRoot && clickCandidate(el.shadowRoot)) return true;
      }
      return false;
    }
    return clickCandidate(document);
  });

  await page.waitForTimeout(1000);
  const selected = await page.evaluate(() => {
    function visible(el) {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }
    const picker = document.querySelector('ytcp-datetime-picker');
    const hasFinalScheduleButton = Array.from(document.querySelectorAll('ytcp-button, button')).some((el) => {
      const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
      return visible(el) && /\bProgramar\b|\bSchedule\b/i.test(text) && !/Crear|Create|Publicar|Publish|Guardar|Save/i.test(text);
    });
    if (picker && visible(picker) && hasFinalScheduleButton) return true;

    function check(root) {
      for (const el of root.querySelectorAll('*')) {
        const name = el.getAttribute?.('name');
        const ariaChecked = el.getAttribute?.('aria-checked');
        const checked = el.checked || el.hasAttribute?.('checked') || ariaChecked === 'true';
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (visible(el) && (name === 'SCHEDULE' || /\bProgramar\b|\bSchedule\b/i.test(text)) && checked) return true;
        if (el.shadowRoot && check(el.shadowRoot)) return true;
      }
      return false;
    }
    return check(document);
  });

  return clicked && selected;
}

async function findScheduleInputs(page) {
  return page.evaluateHandle(() => {
    function visible(el) {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }
    function insideDatePicker(el) {
      let current = el;
      while (current) {
        if ((current.tagName || '').toLowerCase() === 'ytcp-date-picker') return true;
        current = current.parentElement || current.getRootNode?.().host;
      }
      return false;
    }
    function collect(root, out = []) {
      for (const el of root.querySelectorAll('*')) {
        const tag = el.tagName.toLowerCase();
        const isScheduleContainer = /uploads-dialog|datetime-picker|time-of-day-picker/i.test(tag) || /datetime-picker|time/i.test(el.id || '');
        if (isScheduleContainer) {
          for (const input of el.querySelectorAll('input')) {
            if (visible(input) && !insideDatePicker(input)) out.push(input);
          }
        }
        if (el.shadowRoot) collect(el.shadowRoot, out);
      }
      return out;
    }
    return collect(document)
      .filter((input) => input.type === 'text' || input.type === 'time')
      .sort((a, b) => (b.type === 'time') - (a.type === 'time'));
  });
}

async function waitForDatePickerClosed(page) {
  for (let i = 0; i < 10; i++) {
    const open = await page.locator('ytcp-date-picker').first().isVisible().catch(() => false);
    if (!open) return true;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }
  return false;
}

async function selectCalendarDate(page, scheduleDate) {
  const expectedSpanishDate = formatSpanishDate(scheduleDate).toLowerCase();
  const currentText = await page.evaluate(() => (document.querySelector('ytcp-datetime-picker')?.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase());
  if (currentText.includes(expectedSpanishDate)) return true;

  const trigger = page.locator('xpath=/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-uploads-review/div[2]/div[1]/ytcp-video-visibility-select/div[3]/div[2]/ytcp-visibility-scheduler/div/ytcp-datetime-picker/div/div[1]/ytcp-text-dropdown-trigger/ytcp-dropdown-trigger');
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
  } else {
    const fallback = page.locator('ytcp-datetime-picker ytcp-dropdown-trigger').first();
    if (!(await fallback.isVisible().catch(() => false))) return false;
    await fallback.click();
  }

  await page.waitForTimeout(1000);
  const selected = await page.evaluate(async (target) => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic'];
    const wantedMonth = `${monthNames[target.month]} ${target.year}`.toLowerCase();
    const wantedDay = String(target.day);

    const findDay = () => {
      const months = Array.from(document.querySelectorAll('.calendar-month'));
      for (const month of months) {
        const label = (month.querySelector('.calendar-month-label')?.textContent || '').trim().toLowerCase();
        if (label !== wantedMonth) continue;
        const days = Array.from(month.querySelectorAll('.calendar-day'));
        const day = days.find((el) => {
          const text = (el.textContent || '').trim();
          const cls = el.className || '';
          return text === wantedDay && !/disabled|invisible/.test(cls);
        });
        if (day) return day;
      }
      return null;
    };

    for (let attempt = 0; attempt < 24; attempt++) {
      const day = findDay();
      if (day) {
        day.click();
        return true;
      }

      const next = Array.from(document.querySelectorAll('*')).find((el) => {
        const aria = el.getAttribute?.('aria-label') || '';
        const text = (el.textContent || '').trim();
        return /Pr[oó]ximo mes|Next month/i.test(`${aria} ${text}`);
      });
      if (!next) return false;
      next.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  }, { day: scheduleDate.getDate(), month: scheduleDate.getMonth(), year: scheduleDate.getFullYear() });

  await page.waitForTimeout(1000);
  return selected;
}

async function setDateByText(page, dateInputStr) {
  const trigger = page.locator('xpath=/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-uploads-review/div[2]/div[1]/ytcp-video-visibility-select/div[3]/div[2]/ytcp-visibility-scheduler/div/ytcp-datetime-picker/div/div[1]/ytcp-text-dropdown-trigger/ytcp-dropdown-trigger');
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
  } else {
    const fallback = page.locator('ytcp-datetime-picker ytcp-dropdown-trigger').first();
    if (!(await fallback.isVisible().catch(() => false))) return false;
    await fallback.click();
  }

  await page.waitForTimeout(500);
  const input = page.locator('ytcp-date-picker input').first();
  if (!(await input.isVisible().catch(() => false))) return false;

  await input.click();
  await input.fill(dateInputStr);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForTimeout(1000);
  await waitForDatePickerClosed(page);

  const pickerText = await page.evaluate(() => {
    const picker = document.querySelector('ytcp-datetime-picker');
    return (picker?.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
  });

  return pickerText.includes(dateInputStr.toLowerCase());
}

async function setScheduleDateTime(page, scheduleDate, dateStr, timeStr, time24Str) {
  const expectedSpanishDate = formatSpanishDate(scheduleDate).toLowerCase();
  const dateSelected = await setDateByText(page, expectedSpanishDate) || await selectCalendarDate(page, scheduleDate);
  if (!dateSelected) return false;

  await waitForDatePickerClosed(page);
  await page.waitForTimeout(500);

  const pickerText = await page.evaluate(() => {
    const picker = document.querySelector('ytcp-datetime-picker');
    return (picker?.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
  });

  if (!pickerText.includes(expectedSpanishDate)) {
    return false;
  }

  const handle = await findScheduleInputs(page);
  const count = await handle.evaluate((inputs) => inputs.length);
  if (count < 1) return false;

  const timeInput = handle.asElement();
  await handle.evaluate((inputs) => inputs[0].scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForTimeout(300);
  const box = await handle.evaluate((inputs) => {
    const r = inputs[0].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(box.x, box.y);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type(time24Str);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(1000);
  const values = await handle.evaluate((inputs) => inputs.slice(0, 1).map((input) => input.value || ''));
  const expectedTime = normalizeTimeValue(time24Str);
  const actualTime = normalizeTimeValue(values[0]);
  return Boolean(values[0] && actualTime === expectedTime);
}

async function clickFinalSchedule(page) {
  const buttons = page.locator('ytcp-button').filter({ hasText: /Programar|Schedule/i });
  const count = await buttons.count();
  for (let i = count - 1; i >= 0; i--) {
    const btn = buttons.nth(i);
    const text = ((await btn.textContent().catch(() => '')) || '').trim();
    if (/Programar|Schedule/i.test(text) && !/Crear|Create|Publicar|Publish|Guardar|Save/i.test(text)) {
      if (await btn.isVisible().catch(() => false) && await btn.isEnabled().catch(() => false)) {
        await btn.click();
        return true;
      }
    }
  }
  return false;
}

async function uploadVideo(browser, videoPath, scheduleDate, index, total) {
  const context = browser.contexts()[0];
  const page = await context.newPage();
  const { dateStr, timeStr, time24Str } = formatDateTime(scheduleDate);
  const videoTitle = titleFor(videoPath, index);
  console.log(`[${index + 1}/${total}] ${path.basename(videoPath)} -> ${dateStr} ${timeStr}`);

  await page.bringToFront();
  await page.keyboard.press('Escape').catch(() => {});
  await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  await page.locator('input[type="file"]').setInputFiles(videoPath);
  log('  Subiendo...');

  const titleBox = page.locator('#textbox').first();
  await titleBox.waitFor({ state: 'visible', timeout: 180000 });
  await titleBox.click();
  await titleBox.fill('');
  await titleBox.type(videoTitle, { delay: 10 });

  const descBox = page.locator('#description-container #textbox').first();
  await descBox.click();
  await descBox.fill('');
  await descBox.type(description || DEFAULT_DESCRIPTION, { delay: 5 });

  for (let step = 0; step < 3; step++) {
    const next = page.locator('ytcp-button:has-text("Siguiente"), ytcp-button:has-text("Next")').last();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(3000);
  }

  const scheduleSelected = await findAndClickSchedule(page);
  if (!scheduleSelected) {
    await debug(page, `schedule_not_selected_${index + 1}`);
    throw new Error('No pude confirmar que Programar quedo seleccionado. Aborto para no publicar por error.');
  }

  const dateTimeSet = await setScheduleDateTime(page, scheduleDate, dateStr, timeStr, time24Str);
  if (!dateTimeSet) {
    await debug(page, `datetime_not_set_${index + 1}`);
    throw new Error(`No pude confirmar fecha/hora: ${dateStr} ${timeStr}. Aborto para no publicar por error.`);
  }

  const submitted = await clickFinalSchedule(page);
  if (!submitted) {
    await debug(page, `submit_not_found_${index + 1}`);
    throw new Error('No encontre boton final Programar. Aborto para no publicar por error.');
  }

  await page.waitForTimeout(6000);
  console.log(quiet ? `${index + 1}/${total} OK` : '  Programado OK');
  await page.close().catch(() => {});
}

(async () => {
  validateConfig();
  const plan = buildPlan();
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
    console.log(`Completado: ${plan.length} videos programados`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
})().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
