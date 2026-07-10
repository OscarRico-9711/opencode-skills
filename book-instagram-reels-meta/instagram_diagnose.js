const { chromium } = require('playwright');
const { execFileSync } = require('child_process');

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

async function dump(page, outBase) {
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
        if (visible && (tag.includes('button') || tag.includes('radio') || tag.includes('picker') || tag === 'input' || role || name || /Schedule|Programar|Share|Compartir|Next|Siguiente|Add|Video|Audio/i.test(text))) {
          out.push(`${tag} name=${name || ''} role=${role || ''} aria=${aria || ''} checked=${checked || ''} value=${value || ''} text="${text.slice(0, 160)}"`);
        }
        if (el.shadowRoot) walk(el.shadowRoot, out);
      }
      return out;
    }
    return walk(document).join('\n');
  });
  await page.screenshot({ path: `${outBase}.png`, fullPage: true });
  require('fs').writeFileSync(`${outBase}.txt`, state, 'utf8');
}

(async () => {
  assertChromeDebugPort();
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  let page = browser.contexts()[0].pages().find(p => p.url().includes('facebook.com')) || browser.contexts()[0].pages()[0];
  console.log('Current URL:', page.url());
  await page.bringToFront();
  await page.goto('https://business.facebook.com/latest/reels_composer/?asset_id=447899401733961&business_id=1834159863730210', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);
  console.log('After nav URL:', page.url());

  const outBase = require('path').join(process.env.TEMP || process.cwd(), `instagram_diagnose_${Date.now()}`);
  await dump(page, outBase);
  console.log(`Diagnostico guardado: ${outBase}.png / ${outBase}.txt`);
  console.log('No se hizo click en Schedule, Share ni Programar.');
  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
