#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const SKILLS_DIR = path.join(os.homedir(), '.config', 'opencode', 'skills');
const DEFAULT_YOUTUBE_DESCRIPTION = 'https://open.spotify.com/intl-es/artist/57AW2Xl73JztY2BsJAUg9o?si=AjKGujOwQ2yeWDvNWA3pnA';
const DEFAULT_YOUTUBE_TAGS = '#rap #hiphop #rapmexicano @perpetuobeats';

const AVAILABLE_SKILLS = {
  tiktok: {
    name: 'TikTok',
    skillDir: 'book-tiktok-shorts',
    script: 'book_upload_tiktok.js',
    maxScheduleDays: 10
  },
  youtube: {
    name: 'YouTube Shorts',
    skillDir: 'book-youtube-shorts',
    script: 'book_upload.js'
  },
  instagram: {
    name: 'Instagram Reels',
    skillDir: 'book-instagram-reels-meta',
    script: 'book_upload_instagram.js'
  }
};

function log(message) {
  console.log(`[programar-videos] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function askQuestion(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(`${question} `, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

function normalizeVideoPath(input) {
  return input.trim().replace(/^['"]|['"]$/g, '');
}

function parseVideoPaths(input) {
  return input
    .split(/[\n,]/)
    .map(normalizeVideoPath)
    .filter(Boolean);
}

function validateVideoPaths(videoPaths) {
  const normalized = videoPaths.map(normalizeVideoPath);
  const missing = normalized.filter((video) => !fs.existsSync(video));
  if (missing.length) fail(`Archivos no encontrados: ${missing.join(', ')}`);

  const seen = new Set();
  const duplicates = [];
  for (const video of normalized) {
    const key = path.resolve(video).toLowerCase();
    if (seen.has(key)) duplicates.push(video);
    seen.add(key);
  }
  if (duplicates.length) fail(`Videos duplicados: ${duplicates.join(', ')}`);

  return normalized;
}

function titleFromFile(video) {
  return path
    .basename(video, path.extname(video))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseNetworkSelection(input) {
  const options = Object.keys(AVAILABLE_SKILLS);
  const selected = input
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .map((item) => {
      if (item === '1' || item === 'tiktok') return 'tiktok';
      if (item === '2' || item === 'youtube' || item === 'youtube shorts') return 'youtube';
      if (item === '3' || item === 'instagram' || item === 'instagram reels' || item === 'reels') return 'instagram';
      return options[Number(item) - 1];
    })
    .filter(Boolean);

  return [...new Set(selected)].filter((network) => AVAILABLE_SKILLS[network]);
}

function normalizeScheduleType(input) {
  const value = input.trim().toLowerCase();
  if (!value || value === 'diario' || value === 'daily') return 'daily';
  if (value.includes('hora') || value === 'interval') return 'interval';
  if (value.includes('dia') || value.includes('día') || value === 'days') return 'days';
  fail(`Frecuencia no soportada: ${input}`);
}

function normalizeStartDate(input) {
  const value = input.trim();
  if (!value || value.toLowerCase() === 'manana' || value.toLowerCase() === 'mañana') {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return formatDate(date);
  }
  if (value.toLowerCase() === 'hoy') return formatDate(new Date());
  return value;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const IG_HASHTAGS = ['#rap', '#boombap', '#perpetuobeats', '#beatmaker', '#hiphop', '#instrumental', '#lofi', '#chill', '#producer', '#beats'];
const IG_DOT_SEPARATOR = Array(11).fill('.').join('\n');

function buildInstagramHashtags(extra) {
  if (extra) {
    const tags = extra.split(/\s+/).filter((t) => t.startsWith('#')).slice(0, 5);
    if (tags.length) return tags.join('\n');
  }
  return IG_HASHTAGS.slice(0, 3).join('\n');
}

function buildTikTokCaptions(videos, baseCaption, extraText) {
  return videos.map((video, index) => {
    const counter = String(index + 1).padStart(3, '0');
    const title = baseCaption || titleFromFile(video);
    return [title, counter, extraText].filter(Boolean).join(' ');
  });
}

function buildInstagramCaptions(videos, baseCaption, extraText) {
  return videos.map((video, index) => {
    const counter = String(index + 1).padStart(3, '0');
    const title = baseCaption || titleFromFile(video);
    return `${title} ${counter}\n\n${IG_DOT_SEPARATOR}\n\n${buildInstagramHashtags(extraText)}`;
  });
}

function buildYouTubeTitles(videos, baseTitle, extraText) {
  return videos.map((video, index) => {
    const counter = String(index + 1).padStart(3, '0');
    const title = baseTitle || titleFromFile(video);
    const beforeTags = [title, counter, extraText].filter(Boolean).join(' ');
    return `${beforeTags} - ${DEFAULT_YOUTUBE_TAGS}`;
  });
}

function buildConfig(network, input) {
  const common = {
    videos: input.videos,
    scheduleType: input.scheduleType,
    time: input.time,
    intervalHours: input.scheduleType === 'interval' ? input.intervalHours : 0,
    intervalDays: input.scheduleType === 'days' ? input.intervalDays : 0,
    startDate: input.startDate,
    dryRun: input.dryRun,
    quiet: true
  };

  if (network === 'tiktok') {
    return {
      ...common,
      captions: buildTikTokCaptions(input.videos, input.baseCaption, input.extraText)
    };
  }

  if (network === 'instagram') {
    return {
      ...common,
      captions: buildInstagramCaptions(input.videos, input.baseCaption, input.extraText),
      audioEnabled: input.audioEnabled || false,
      audioQuery: input.audioQuery || ''
    };
  }

  if (network === 'youtube') {
    return {
      ...common,
      titles: buildYouTubeTitles(input.videos, input.baseCaption, input.extraText),
      description: input.youtubeDescription || DEFAULT_YOUTUBE_DESCRIPTION,
      channelId: 'UCDZGMK9cr4B-XgF_OyOx1MQ'
    };
  }

  fail(`Red no soportada: ${network}`);
}

function writeConfigFile(config, network) {
  const configPath = path.join(os.tmpdir(), `programar_videos_${network}_${Date.now()}.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return configPath;
}

function runSkill(network, configPath) {
  const skill = AVAILABLE_SKILLS[network];
  const skillDir = path.join(SKILLS_DIR, skill.skillDir);
  const scriptPath = path.join(skillDir, skill.script);
  if (!fs.existsSync(scriptPath)) fail(`Script no encontrado: ${scriptPath}`);

  const result = spawnSync('node', [scriptPath, configPath], {
    cwd: skillDir,
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) fail(`${skill.name} fallo con codigo ${result.status}`);
}

function previewPlan(network, config) {
  console.log(`\n${AVAILABLE_SKILLS[network].name}:`);
  config.videos.forEach((video, index) => {
    let label, text;
    if (network === 'tiktok' || network === 'instagram') {
      label = 'Caption';
      text = config.captions[index];
    } else {
      label = 'Title';
      text = config.titles[index];
    }
    if (network === 'instagram') {
      const lines = text.split('\n');
      const titleLine = lines[0];
      const hashtags = lines.filter((l) => l.startsWith('#')).join(' ');
      console.log(`${index + 1}. ${path.basename(video)} -> ${config.startDate} ${config.time}`);
      console.log(`   ${label}: ${titleLine}`);
      console.log(`   Hashtags: ${hashtags}`);
    } else {
      console.log(`${index + 1}. ${path.basename(video)} -> ${config.startDate} ${config.time}`);
      console.log(`   ${label}: ${text}`);
    }
    if (network === 'instagram' && config.audioQuery) {
      console.log(`   Audio: "${config.audioQuery}"`);
    }
  });
}

async function main() {
  log('=== PROGRAMAR VIDEOS ===');
  console.log('1. TikTok');
  console.log('2. YouTube Shorts');
  console.log('3. Instagram Reels');

  const networks = parseNetworkSelection(await askQuestion('Redes (1,2 / tiktok,youtube):'));
  if (!networks.length) fail('No se selecciono ninguna red valida');

  const videos = validateVideoPaths(parseVideoPaths(await askQuestion('Videos (separados por coma):')));
  const scheduleType = normalizeScheduleType(await askQuestion('Frecuencia (diario / cada X horas / cada X dias):'));
  const time = (await askQuestion('Hora (ej: 6:00 PM):')) || '6:00 PM';
  const intervalHours = scheduleType === 'interval' ? Number(await askQuestion('Cada cuantas horas:')) : 0;
  const intervalDays = scheduleType === 'days' ? Number(await askQuestion('Cada cuantos dias:')) : 0;
  const startDate = normalizeStartDate(await askQuestion('Fecha inicio (manana/hoy/Jun 15, 2026):'));
  const baseCaption = await askQuestion('Caption/titulo base (opcional):');
  const extraText = await askQuestion('Hashtags/texto extra (opcional):');
  const youtubeDescription = networks.includes('youtube') ? await askQuestion('Descripcion YouTube (opcional):') : '';

  const input = { videos, scheduleType, time, intervalHours, intervalDays, startDate, baseCaption, extraText, youtubeDescription, audioEnabled: false, audioQuery: '', dryRun: true };
  const configs = Object.fromEntries(networks.map((network) => [network, buildConfig(network, input)]));

  console.log('\n=== DRY RUN ===');
  for (const [network, config] of Object.entries(configs)) previewPlan(network, config);

  if (networks.includes('instagram')) {
    const addMusic = (await askQuestion('Agregar musica a Instagram? (s/n):')).toLowerCase();
    if (addMusic === 's' || addMusic === 'si') {
      const audioQuery = await askQuestion('Nombre de cancion a buscar:');
      for (const [network, config] of Object.entries(configs)) {
        if (network === 'instagram') {
          config.audioEnabled = true;
          config.audioQuery = audioQuery;
        }
      }
      console.log('\n=== PLAN ACTUALIZADO ===');
      for (const [network, config] of Object.entries(configs)) previewPlan(network, config);
    }
  }

  const confirm = (await askQuestion('\nAprobar y ejecutar? (s/n):')).toLowerCase();
  if (confirm !== 's' && confirm !== 'si') {
    log('Cancelado por el usuario');
    return;
  }

  for (const network of networks) {
    configs[network].dryRun = false;
    const configPath = writeConfigFile(configs[network], network);
    log(`Ejecutando ${AVAILABLE_SKILLS[network].name}`);
    runSkill(network, configPath);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[programar-videos] ERROR: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  AVAILABLE_SKILLS,
  buildConfig,
  buildTikTokCaptions,
  buildInstagramCaptions,
  buildYouTubeTitles,
  parseNetworkSelection,
  parseVideoPaths,
  validateVideoPaths
};
