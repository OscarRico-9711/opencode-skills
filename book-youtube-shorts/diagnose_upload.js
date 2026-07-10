const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const UPLOAD_URL = 'https://studio.youtube.com/channel/UCDZGMK9cr4B-XgF_OyOx1MQ/videos/upload?d=ud';
const configPath = process.argv[2];
if (!configPath) {
  console.error('ERROR: falta ruta del JSON config');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
const videoPath = config.videos[0];
const outBase = path.join(process.env.TEMP || process.cwd(), `youtube_visibility_diagnose_${Date.now()}`);

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

async function dump(page) {
  const state = await page.evaluate(() => {
    function walk(root, out = []) {
      for (const el of root.querySelectorAll('*')) {
        const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        const name = el.getAttribute('name');
        const role = el.getAttribute('role');
        const aria = el.getAttribute('aria-label');
        const checked = el.checked || el.getAttribute('aria-checked') || el.hasAttribute('checked');
        const value = el.value;
        if (visible && (tag.includes('button') || tag.includes('radio') || tag.includes('picker') || tag === 'input' || role || name || /Programar|Schedule|Publicar|Crear/i.test(text))) {
          out.push(`${tag} name=${name || ''} role=${role || ''} aria=${aria || ''} checked=${checked || ''} value=${value || ''} text="${text.slice(0, 160)}"`);
        }
        if (el.shadowRoot) walk(el.shadowRoot, out);
      }
      return out;
    }
    return walk(document).join('\n');
  });
  await page.screenshot({ path: `${outBase}.png`, fullPage: true });
  fs.writeFileSync(`${outBase}.txt`, state, 'utf8');
}

(async () => {
  assertChromeDebugPort();
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages().find((p) => p.url().includes('studio.youtube.com')) || browser.contexts()[0].pages()[0];
  await page.bringToFront();
  await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.locator('input[type="file"]').setInputFiles(videoPath);

  const titleBox = page.locator('#textbox').first();
  await titleBox.waitFor({ state: 'visible', timeout: 180000 });
  await titleBox.click();
  await titleBox.fill('DIAGNOSTICO NO PUBLICAR');

  for (let step = 0; step < 3; step++) {
    const next = page.locator('ytcp-button:has-text("Siguiente"), ytcp-button:has-text("Next")').last();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(3000);
  }

  await dump(page);
  await browser.close();
  console.log(`Diagnostico guardado: ${outBase}.png / ${outBase}.txt`);
  console.log('No se hizo click en Programar, Crear ni Publicar. Revisa/cierra el borrador manualmente si YouTube lo dejo abierto.');
})().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
