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

(async () => {
  assertChromeDebugPort();
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  let page = browser.contexts()[0].pages().find(p => p.url().includes('tiktok.com')) || browser.contexts()[0].pages()[0];
  console.log('Current URL:', page.url());
  await page.goto('https://www.tiktok.com/tiktokstudio/upload?from=webapp&tab=video', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);
  console.log('After nav URL:', page.url());
  
  const info = await page.evaluate(() => {
    const allInputs = Array.from(document.querySelectorAll('input'));
    const visible = allInputs.filter(i => i.offsetWidth > 0).map(i => ({
      type: i.type, name: i.name, value: i.value, placeholder: i.placeholder,
      className: (i.className || '').slice(0, 80), id: i.id
    }));
    const radios = allInputs.filter(i => i.type === 'radio').map(r => ({
      name: r.name, value: r.value, checked: r.checked
    }));
    const buttons = Array.from(document.querySelectorAll('button'))
      .filter(b => b.offsetWidth > 0)
      .map(b => ({ text: (b.textContent || '').trim().slice(0, 50), disabled: b.disabled }));
    const contenteditable = document.querySelector('[contenteditable="true"]');
    return {
      inputs: visible,
      radios,
      buttons,
      hasEditor: !!contenteditable,
      editorText: contenteditable ? (contenteditable.textContent || '').trim().slice(0, 200) : ''
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
