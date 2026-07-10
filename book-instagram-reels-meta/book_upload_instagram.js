const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const META_REELS_URL = 'https://business.facebook.com/latest/reels_composer/?asset_id=447899401733961&business_id=1834159863730210&ir_qe_exposed=1&context_ref=HOME';
const DEBUG_DIR = process.env.TEMP || process.cwd();
const IG_HASHTAGS = ['#rap', '#boombap', '#perpetuobeats', '#beatmaker', '#hiphop', '#instrumental', '#lofi', '#chill', '#producer', '#beats'];
const IG_DOT_SEPARATOR = Array(11).fill('.').join('\n');

const configPath = process.argv[2];
if (!configPath) {
  console.error('ERROR: falta ruta del JSON config');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
const {
  videos,
  captions,
  scheduleType,
  time,
  intervalHours,
  intervalDays,
  dryRun = false,
  quiet = false,
  startDate,
  extraText = '',
  audioEnabled = false,
  audioQuery = '',
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

function buildHashtagBlock(extra) {
  if (extra) {
    const tags = extra.split(/\s+/).filter((t) => t.startsWith('#')).slice(0, 5);
    if (tags.length) return tags.join('\n');
  }
  return IG_HASHTAGS.slice(0, 3).join('\n');
}

function generatedCaption(videoPath, index) {
  const counter = String(index + 1).padStart(3, '0');
  const title = `${baseTitleFromPath(videoPath)} ${counter}`;
  return `${title}\n\n${IG_DOT_SEPARATOR}\n\n${buildHashtagBlock(extraText)}`;
}

function captionFor(videoPath, index) {
  if (Array.isArray(captions) && captions[index]) {
    return `${captions[index]}\n\n${IG_DOT_SEPARATOR}\n\n${extraText || buildHashtagBlock(extraText)}`;
  }
  return generatedCaption(videoPath, index);
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
  if (scheduleType === 'interval' && !(Number(intervalHours) > 0)) throw new Error('Config invalido: intervalHours debe ser mayor que 0');
  if (scheduleType === 'days' && !(Number(intervalDays) > 0)) throw new Error('Config invalido: intervalDays debe ser mayor que 0');
  if (!['daily', 'interval', 'days'].includes(scheduleType)) throw new Error('Config invalido: scheduleType debe ser daily, interval o days');
}

function buildPlan() {
  let currentDate = firstScheduleDate();
  return videos.map((video, index) => {
    const item = { video, caption: captionFor(video, index), date: currentDate };
    currentDate = nextScheduleDate(currentDate);
    return item;
  });
}

function printPlan(plan) {
  console.log(`Plan: ${plan.length} videos`);
  for (let i = 0; i < plan.length; i++) {
    const { dateStr, timeStr } = formatDateTime(plan[i].date);
    console.log(`${i + 1}. ${path.basename(plan[i].video)} -> ${dateStr} ${timeStr} -> ${plan[i].caption}`);
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
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatInputDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

async function debug(page, name) {
  const base = path.join(DEBUG_DIR, `instagram_${name}_${Date.now()}`);
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
          out.push(`${tag} name=${name || ''} role=${role || ''} aria=${aria || ''} checked=${checked || ''} text="${text.slice(0, 120)}"`);
        }
        if (el.shadowRoot) walk(el.shadowRoot, out);
      }
      return out;
    }
    return walk(document).join('\n');
  });
}

async function clickNext(page, stepLabel) {
  const nextBtns = page.locator('div[role="button"]:has-text("Next"), div[role="button"]:has-text("Siguiente"), span:has-text("Next"), span:has-text("Siguiente"), button:has-text("Siguiente"), button:has-text("Next")');
  for (let i = await nextBtns.count() - 1; i >= 0; i--) {
    const nextBtn = nextBtns.nth(i);
    const text = ((await nextBtn.textContent().catch(() => '')) || '').replace(/\u200b/g, '').trim();
    if (!/^(Next|Siguiente)$/.test(text)) continue;
    if (await nextBtn.isVisible().catch(() => false) && await nextBtn.isEnabled().catch(() => false)) {
      await nextBtn.click({ force: true });
      await page.waitForTimeout(3000);
      return true;
    }
  }
  return false;
}

async function uploadVideo(browser, videoPath, scheduleDate, index, total) {
  const page = browser.contexts()[0].pages().find((p) => p.url().includes('facebook.com')) || browser.contexts()[0].pages()[0];
  const { dateStr, timeStr, time24Str } = formatDateTime(scheduleDate);
  const videoCaption = captionFor(videoPath, index);
  console.log(`[${index + 1}/${total}] ${path.basename(videoPath)} -> ${dateStr} ${timeStr}`);

  await page.bringToFront();
  await page.keyboard.press('Escape').catch(() => {});
  await page.goto(META_REELS_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const addVideoBtn = page.locator('div[role="button"]:has-text("Add Video"), div[role="button"]:has-text("Add Videos")').first();
  if (!(await addVideoBtn.isVisible().catch(() => false))) {
    await debug(page, `add_video_btn_not_found_${index + 1}`);
    throw new Error('No encontre boton Add Video en la pagina');
  }

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null),
    addVideoBtn.click(),
  ]);

  if (!fileChooser) {
    await debug(page, `filechooser_not_opened_${index + 1}`);
    throw new Error('No se abrio el dialogo de seleccion de archivos');
  }

  await fileChooser.setFiles(videoPath);
  log('  Video seleccionado, subiendo...');
  await page.waitForTimeout(3000);

  for (let attempt = 0; attempt < 20; attempt++) {
    const done = await page.evaluate(() => {
      const text = document.body.innerText || '';
      return text.includes('Createcompleted') || text.includes('Editpending') || text.includes('Describe your reel');
    });
    if (done) break;
    await page.waitForTimeout(2000);
    log(`  Procesando... (${(attempt + 1) * 2}s)`);
  }
  await page.waitForTimeout(3000);
  await debug(page, `after_upload_${index + 1}`);

  const captionBox = page.locator('div[role="textbox"][aria-label*="Describe your reel"], div[role="textbox"][aria-label*="descripc"i], div[aria-label*="Describe your reel"], div[aria-label*="Write"i], div[aria-label*="caption"i]').first();
  if (await captionBox.isVisible().catch(() => false)) {
    await captionBox.click();
    await captionBox.fill('');
    await captionBox.type(videoCaption, { delay: 10 });
    await page.keyboard.press('Escape').catch(() => {});
    log('  Caption escrito');
    await page.waitForTimeout(1000);
  } else {
    log('  No encontre caja de caption, continuando...');
  }

  if (await clickNext(page, 'caption')) {
    await page.waitForTimeout(1000);
  } else {
    await debug(page, `next_btn_not_found_1_${index + 1}`);
    throw new Error('No encontre boton Next despues del caption');
  }

  await page.waitForTimeout(3000);

  if (audioEnabled && audioQuery) {
    await debug(page, `before_audio_${index + 1}`);
    const searchBox = page.locator('div[role="group"] input, input[aria-label*="search"i], input[placeholder*="search"i], input[placeholder*="buscar"i]').first();
    if (await searchBox.isVisible().catch(() => false)) {
      await searchBox.click();
      await searchBox.fill(audioQuery);
      await page.waitForTimeout(3000);

      const songResult = page.locator('li[role="listitem"] div[role="button"]:not([aria-label*="Previous"]):not([aria-label*="Back"])').first();
      if (await songResult.isVisible().catch(() => false)) {
        await songResult.click({ force: true, timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2000);
        log(`  Cancion "${audioQuery}" seleccionada`);

        const addAudioBtn = page.locator('div[role="button"]:has-text("Add audio"), div[role="button"]:has-text("Done")').first();
        if (await addAudioBtn.isVisible().catch(() => false) && await addAudioBtn.isEnabled().catch(() => false)) {
          await addAudioBtn.click();
          await page.waitForTimeout(2000);
          log('  Audio confirmado (Done)');
        } else {
          log('  No encontre boton Done/Add audio, puede que ya se haya confirmado');
        }
      } else {
        log('  No encontre resultados para la busqueda de audio');
      }
    } else {
      log('  No encontre campo de busqueda de audio');
    }
    await debug(page, `after_audio_${index + 1}`);
  }

  if (await clickNext(page, 'edit/audio')) {
    await page.waitForTimeout(2000);
    log('  Edit Next clickeado, yendo a Share...');
  } else {
    await debug(page, `edit_next_btn_not_found_${index + 1}`);
    throw new Error('No encontre boton Next en la pantalla de edit/audio');
  }

  const scheduleOptionBtn = page.locator('div[role="group"] div[role="button"]:has-text("Schedule"), div[role="group"] div[role="button"]:has-text("Programar")').first();
  if (await scheduleOptionBtn.isVisible().catch(() => false)) {
    await scheduleOptionBtn.click();
    await page.waitForTimeout(3000);
    log('  Opcion Schedule seleccionada');
  } else {
    await debug(page, `schedule_option_not_found_${index + 1}`);
    throw new Error('No encontre opcion Schedule/Programar. Aborto.');
  }

  await debug(page, `before_schedule_form_${index + 1}`);
  await page.waitForTimeout(2000);

  const formattedDate = `${scheduleDate.getMonth() + 1}/${scheduleDate.getDate()}/${scheduleDate.getFullYear()}`;
  const dateSet = await page.evaluate((dateStr) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const visible = inputs.filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);
    const dateCandidates = visible.filter((el) => {
      const val = (el.value || '').trim();
      const ph = (el.placeholder || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      return val.length > 0 || ph.includes('date') || ph.includes('dd') || ph.includes('mm') || ph.includes('yyyy') || aria.includes('date') || aria.includes('fecha');
    });
    const target = dateCandidates[0] || visible[0];
    if (!target) return false;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input') {
      target.focus();
      target.click();
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (nativeSetter) {
        nativeSetter.set.call(target, dateStr);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        target.value = dateStr;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return target.value.trim() === dateStr;
    }
    return false;
  }, formattedDate);
  if (dateSet) {
    log(`  Fecha puesta: ${formattedDate}`);
  } else {
    log('  No encontre input de fecha editable, intentando con calendar...');
    const calendarTrigger = page.locator('div[role="button"]:has-text("Schedule")').first();
    const dateDisplay = page.locator('div[role="application"]').first();
    if (await dateDisplay.isVisible().catch(() => false)) {
      await dateDisplay.click();
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  }

  const allInputs = page.locator('input[role="spinbutton"]');
  const inputCount = await allInputs.count();
  const hour12 = scheduleDate.getHours() % 12 || 12;
  if (inputCount >= 1) {
    const hourEl = allInputs.nth(0);
    await hourEl.click();
    await hourEl.fill('');
    await hourEl.type(String(hour12), { delay: 5 });
    await page.waitForTimeout(300);
  }
  if (inputCount >= 2) {
    const minEl = allInputs.nth(1);
    await minEl.click();
    await minEl.fill('');
    await minEl.type(String(scheduleDate.getMinutes()).padStart(2, '0'), { delay: 5 });
    await page.waitForTimeout(300);
  }
  if (inputCount >= 3) {
    const merEl = allInputs.nth(2);
    await merEl.click();
    await merEl.fill('');
    const ampm = scheduleDate.getHours() < 12 ? 'AM' : 'PM';
    await merEl.type(ampm, { delay: 5 });
    await page.waitForTimeout(300);
    log(`  Hora puesta: ${hour12}:${String(scheduleDate.getMinutes()).padStart(2, '0')} ${ampm}`);
  }

  const allScheduleBtns = page.locator('div[role="button"]:has-text("Schedule")');
  const btnCount = await allScheduleBtns.count();
  const scheduleBtn = allScheduleBtns.nth(btnCount - 1);
  const btnText = ((await scheduleBtn.textContent().catch(() => '')) || '').trim();
  if (btnText === 'Share' || btnText === 'Compartir') {
    await debug(page, `share_instead_of_schedule_${index + 1}`);
    throw new Error(`Boton final es "${btnText}", no Schedule. Aborto.`);
  }
  if (btnText.includes('Schedule') || btnText.includes('Programar')) {
    await scheduleBtn.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(5000);
    log('  Schedule clickeado');
  } else {
    await debug(page, `schedule_btn_not_found_${index + 1}`);
    throw new Error(`No encontre boton final Schedule. Texto: "${btnText}". Aborto.`);
  }

  await page.waitForTimeout(3000);

  const pageText = await page.evaluate(() => document.body.innerText);
  const errorKeywords = ['A scheduled reel needs', 'needs to be shared', 'must be scheduled', 'try again', 'intenta de nuevo', 'vuelve a intentar'];
  for (const kw of errorKeywords) {
    if (pageText.toLowerCase().includes(kw.toLowerCase())) {
      await debug(page, `schedule_error_${index + 1}`);
      throw new Error(`Meta rechazo: encontré "${kw}". Revisa fecha/hora.`);
    }
  }

  const successKeywords = ['Your reel has been', 'publicado', 'published', 'programado', 'scheduled', 'successfully', 'processing your reel', 'procesando tu reel'];
  const foundSuccess = successKeywords.find((kw) => pageText.toLowerCase().includes(kw.toLowerCase()));
  if (foundSuccess) {
    log(`  Confirmacion: "${foundSuccess}"`);
  } else {
    await debug(page, `no_confirmation_${index + 1}`);
    log('  No vi confirmacion textual. Puede que haya fallado.');
    throw new Error('No se detecto confirmacion de programacion. Revisa debug files.');
  }

  console.log(quiet ? `${index + 1}/${total} OK` : '  Programado OK');
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
