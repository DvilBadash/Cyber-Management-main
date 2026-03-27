#!/usr/bin/env node
/**
 * deploy.js — Cyber Management Deployment Tool
 * ─────────────────────────────────────────────
 * ארכוב גרסה קיימת ב-Production ופריסה בטוחה של גרסה חדשה.
 * מסנכרן שינויי DB אוטומטית ללא פגיעה בנתונים.
 *
 * Usage (interactive):   node deploy.js
 * Usage (archive only):  node deploy.js archive --prod <path> --dest <path>
 * Usage (deploy):        node deploy.js deploy  --prod <path> --src  <path> --dest <path>
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');
const rl   = require('readline');

// ── ANSI colors ───────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  bgBlue: '\x1b[44m',
};

const log  = (msg)        => console.log(`${C.cyan}▸${C.reset} ${msg}`);
const ok   = (msg)        => console.log(`${C.green}✔${C.reset} ${msg}`);
const warn = (msg)        => console.log(`${C.yellow}⚠${C.reset} ${msg}`);
const err  = (msg)        => console.log(`${C.red}✖${C.reset} ${msg}`);
const head = (msg)        => console.log(`\n${C.bold}${C.bgBlue} ${msg} ${C.reset}\n`);
const sep  = ()           => console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`);

// ── Directories to EXCLUDE during copy ───────────────────────────────────────
const EXCLUDE_COPY = new Set([
  'node_modules', '.git', 'dist',
  'deploy.js',           // this script itself (keep in dest if already there)
]);

// ── Files/dirs to ALWAYS PRESERVE from production (never overwrite) ───────────
const PRESERVE_FROM_PROD = new Set([
  'data',                // SQLite database
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively copy a directory, skipping excluded entries */
function copyDir(src, dest, excludeSet = new Set()) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeSet.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/** Count files recursively (for reporting) */
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}

/** Format bytes to human-readable */
function humanSize(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

/** Get total size of a directory */
function dirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) size += dirSize(p);
    else size += fs.statSync(p).size;
  }
  return size;
}

/** Run a shell command synchronously, stream output */
function run(cmd, cwd) {
  console.log(`${C.dim}$ ${cmd}${C.reset}`);
  const result = cp.spawnSync(cmd, {
    shell: true, cwd, stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  if (result.status !== 0) throw new Error(`Command failed: ${cmd}`);
}

/** Get git info if available */
function gitInfo(dir) {
  try {
    const hash    = cp.execSync('git rev-parse --short HEAD', { cwd: dir, stdio: ['pipe','pipe','pipe'] }).toString().trim();
    const branch  = cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: dir, stdio: ['pipe','pipe','pipe'] }).toString().trim();
    const message = cp.execSync('git log -1 --format=%s', { cwd: dir, stdio: ['pipe','pipe','pipe'] }).toString().trim();
    return { hash, branch, message };
  } catch {
    return null;
  }
}

/** Validate that a path exists and is a directory */
function assertDir(p, label) {
  if (!p) throw new Error(`${label} לא הוגדר`);
  if (!fs.existsSync(p)) throw new Error(`הנתיב אינו קיים: ${p}`);
  if (!fs.statSync(p).isDirectory()) throw new Error(`הנתיב אינו תיקייה: ${p}`);
}

/** Write a JSON manifest file into the archive */
function writeManifest(archiveDir, info) {
  const manifestPath = path.join(archiveDir, '_DEPLOYMENT_MANIFEST.json');
  const manifest = {
    timestamp:       new Date().toISOString(),
    archivedFrom:    info.prodPath,
    archivedTo:      archiveDir,
    git:             info.git || null,
    dbFiles:         info.dbFiles || [],
    fileCount:       info.fileCount || 0,
    sizeBytes:       info.sizeBytes || 0,
    sizeHuman:       humanSize(info.sizeBytes || 0),
    deployedFrom:    info.srcPath || null,
    nodeVersion:     process.version,
    platform:        process.platform,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  return manifest;
}

/** Build a timestamp string for folder names */
function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ── STEP 1: ARCHIVE ───────────────────────────────────────────────────────────

/**
 * Archive the current production version.
 * Copies ALL files (including data/) to dest/archive_TIMESTAMP/
 * Returns the archive directory path.
 */
function archiveProduction(prodPath, destBase) {
  head('שלב 1 — ארכוב גרסה קיימת');

  assertDir(prodPath, 'Production path');
  if (!fs.existsSync(destBase)) fs.mkdirSync(destBase, { recursive: true });

  const ts         = timestamp();
  const archiveDir = path.join(destBase, `archive_${ts}`);
  fs.mkdirSync(archiveDir, { recursive: true });

  log(`Production: ${C.cyan}${prodPath}${C.reset}`);
  log(`Archive destination: ${C.cyan}${archiveDir}${C.reset}`);

  // ── Copy source code (exclude node_modules, .git) ──────────────────────────
  log('מעתיק קוד מקור...');
  const codeExclude = new Set(['node_modules', '.git']);
  const codeArchive = path.join(archiveDir, 'code');
  copyDir(prodPath, codeArchive, codeExclude);
  ok(`קוד מקור הועתק → ${codeArchive}`);

  // ── Copy data directory separately ────────────────────────────────────────
  const dataDir = path.join(prodPath, 'data');
  if (fs.existsSync(dataDir)) {
    log('מעתיק בסיס נתונים...');
    const dataArchive = path.join(archiveDir, 'data');
    copyDir(dataDir, dataArchive);
    const dbFiles = fs.readdirSync(dataDir);
    dbFiles.forEach(f => {
      const size = humanSize(fs.statSync(path.join(dataDir, f)).size);
      ok(`  ${f}  (${size})`);
    });
  } else {
    warn('תיקיית data/ לא נמצאה — מדלג על ארכוב DB');
  }

  // ── Git info ───────────────────────────────────────────────────────────────
  const git = gitInfo(prodPath);
  if (git) {
    log(`Git: ${C.bold}${git.branch}@${git.hash}${C.reset} — ${git.message}`);
  }

  // ── Manifest ───────────────────────────────────────────────────────────────
  const fileCount = countFiles(archiveDir);
  const sizeBytes = dirSize(archiveDir);
  const dbFiles   = fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [];
  writeManifest(archiveDir, { prodPath, git, dbFiles, fileCount, sizeBytes });

  sep();
  ok(`${C.bold}ארכוב הושלם${C.reset}`);
  ok(`  תיקיות:     ${archiveDir}`);
  ok(`  קבצים:      ${fileCount}`);
  ok(`  גודל כולל:  ${humanSize(sizeBytes)}`);

  return archiveDir;
}

// ── STEP 2: DEPLOY ────────────────────────────────────────────────────────────

/**
 * Deploy a new version to production.
 * 1. Archives current production first (safety net).
 * 2. Copies new source files, SKIPPING data/ (DB preserved).
 * 3. Installs npm dependencies.
 * 4. Builds the frontend.
 * 5. Server will auto-run new migrations on next start.
 */
function deployNew(prodPath, srcPath, destBase) {
  head('שלב 2 — פריסת גרסה חדשה');

  assertDir(prodPath, 'Production path');
  assertDir(srcPath,  'Source path');

  // ── Safety: archive current production first ───────────────────────────────
  warn('מבצע ארכוב אוטומטי של הגרסה הנוכחית לפני כל שינוי...');
  const archiveDir = archiveProduction(prodPath, destBase);
  sep();

  head('שלב 2 — העתקת קוד חדש');
  log(`מקור:      ${C.cyan}${srcPath}${C.reset}`);
  log(`Production: ${C.cyan}${prodPath}${C.reset}`);

  // ── Build set of items to skip when copying new source → production ────────
  // We skip: node_modules, .git, dist (will rebuild), AND data/ (preserve DB)
  const skipOnDeploy = new Set([...EXCLUDE_COPY, ...PRESERVE_FROM_PROD]);

  // ── Copy new source files into production ─────────────────────────────────
  log('מעתיק קבצי גרסה חדשה...');
  copyDir(srcPath, prodPath, skipOnDeploy);
  ok('קבצי קוד הועתקו');

  // ── Ensure data/ directory is preserved (it was never touched) ────────────
  const prodData = path.join(prodPath, 'data');
  if (fs.existsSync(prodData)) {
    ok('בסיס נתונים נשמר ללא שינוי ✔');
  } else {
    warn('תיקיית data/ לא קיימת ב-Production — תיווצר בהפעלה הראשונה');
  }

  // ── Install root dependencies ─────────────────────────────────────────────
  head('שלב 3 — התקנת Dependencies');
  log('מתקין תלויות Frontend...');
  run('npm install', prodPath);
  ok('Frontend dependencies מותקנות');

  const serverDir = path.join(prodPath, 'server');
  if (fs.existsSync(path.join(serverDir, 'package.json'))) {
    log('מתקין תלויות Server...');
    run('npm install', serverDir);
    ok('Server dependencies מותקנות');
  }

  // ── Build frontend ────────────────────────────────────────────────────────
  head('שלב 4 — בניית Frontend');
  log('מריץ npm run build...');
  run('npm run build', prodPath);
  ok('Frontend נבנה בהצלחה → dist/');

  // ── DB migration note ─────────────────────────────────────────────────────
  head('שלב 5 — סנכרון מסד נתונים');
  log('מנגנון המיגרציה יפעל אוטומטית בהפעלת השרת.');
  log('הסרוויס בודק את טבלת _migrations ומריץ רק קבצי .sql חדשים.');
  ok('נתונים קיימים ב-soc.db מוגנים ✔');
  ok('פריסה הסתיימה בהצלחה!');

  // ── Final summary ─────────────────────────────────────────────────────────
  sep();
  console.log(`\n${C.bold}${C.green}═══ סיכום פריסה ════════════════════════════════════${C.reset}`);
  console.log(`  ארכוב גרסה קודמת:  ${archiveDir}`);
  console.log(`  Production עודכן:   ${prodPath}`);
  console.log(`  DB:                 ${prodData} ${C.green}(ללא שינוי)${C.reset}`);
  console.log(`  הפעלה:              node server/server.js`);
  console.log(`${C.bold}${C.green}═══════════════════════════════════════════════════${C.reset}\n`);
}

// ── DB MIGRATION STATUS ───────────────────────────────────────────────────────

/**
 * Show which migrations are applied in the production DB.
 */
function showMigrationStatus(prodPath) {
  head('סטטוס מיגרציות DB');

  const dbPath = path.join(prodPath, 'data', 'soc.db');
  if (!fs.existsSync(dbPath)) {
    warn(`DB לא נמצא: ${dbPath}`);
    return;
  }

  // Check migration SQL files on disk
  const migrationsDir = path.join(prodPath, 'server', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    log(`קבצי מיגרציה בתיקייה (${files.length}):`);
    files.forEach(f => console.log(`  ${C.cyan}${f}${C.reset}`));
  }

  // Try to read applied migrations from DB (if sqlite3 CLI available)
  try {
    const result = cp.execSync(
      `sqlite3 "${dbPath}" "SELECT name, applied_at FROM _migrations ORDER BY id"`,
      { stdio: ['pipe','pipe','pipe'] }
    ).toString().trim();
    if (result) {
      log('מיגרציות שיושמו ב-DB:');
      result.split('\n').forEach(line => {
        const [name, at] = line.split('|');
        console.log(`  ${C.green}✔${C.reset} ${name}  ${C.dim}${at}${C.reset}`);
      });
    }
  } catch {
    warn('sqlite3 CLI לא זמין — לא ניתן לקרוא סטטוס מהDB ישירות');
    log('הסטטוס ייראה בלוג השרת בהפעלה הבאה.');
  }
}

// ── INTERACTIVE CLI ───────────────────────────────────────────────────────────

function prompt(question) {
  const iface = rl.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    iface.question(`${C.cyan}? ${C.reset}${question} `, answer => {
      iface.close();
      resolve(answer.trim());
    });
  });
}

async function interactive() {
  console.clear();
  console.log(`${C.bold}${C.bgBlue}                                              ${C.reset}`);
  console.log(`${C.bold}${C.bgBlue}   Cyber Management — Deployment Tool v1.0    ${C.reset}`);
  console.log(`${C.bold}${C.bgBlue}                                              ${C.reset}`);
  console.log(`${C.dim}  Safe archiving & deployment with data preservation${C.reset}\n`);

  console.log('Select an action:');
  console.log(`  ${C.bold}1${C.reset} — Archive current Production (backup only)`);
  console.log(`  ${C.bold}2${C.reset} — Deploy new version (auto-archive before deploy)`);
  console.log(`  ${C.bold}3${C.reset} — Show DB migration status`);
  console.log(`  ${C.bold}4${C.reset} — Exit`);

  const choice = await prompt('\nChoice [1-4]:');

  if (choice === '4') {
    console.log('Goodbye!');
    process.exit(0);
  }

  const defaultProd = path.resolve(__dirname);

  if (choice === '1') {
    sep();
    const prodPath = (await prompt(`Production path [${defaultProd}]:`)) || defaultProd;
    const destBase = await prompt('Archive destination path (required):');
    if (!destBase) { err('Destination path is required.'); process.exit(1); }
    try {
      archiveProduction(path.resolve(prodPath), path.resolve(destBase));
    } catch (e) { err(e.message); process.exit(1); }

  } else if (choice === '2') {
    sep();
    const prodPath = (await prompt(`Production path [${defaultProd}]:`)) || defaultProd;
    const srcPath  = await prompt('New version source path (required):');
    if (!srcPath) { err('Source path is required.'); process.exit(1); }
    const destBase = await prompt('Archive destination path (required):');
    if (!destBase) { err('Archive path is required.'); process.exit(1); }

    console.log(`\n${C.yellow}Warning: This will update Production at ${C.bold}${path.resolve(prodPath)}${C.reset}`);
    const confirm = await prompt('Continue? [y/N]:');
    if (confirm.toLowerCase() !== 'y') {
      warn('Cancelled by user.');
      process.exit(0);
    }

    try {
      deployNew(
        path.resolve(prodPath),
        path.resolve(srcPath),
        path.resolve(destBase)
      );
    } catch (e) { err(e.message); process.exit(1); }

  } else if (choice === '3') {
    sep();
    const prodPath = (await prompt(`Production path [${defaultProd}]:`)) || defaultProd;
    showMigrationStatus(path.resolve(prodPath));

  } else {
    err('Invalid choice.');
    process.exit(1);
  }
}

// ── CLI ARGS MODE ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get  = flag => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const mode = args[0];

  if (!mode || mode === '--help' || mode === '-h') return null;

  const prodPath = get('--prod') || path.resolve(__dirname);
  const destBase = get('--dest');
  const srcPath  = get('--src');

  return { mode, prodPath, destBase, srcPath };
}

// ── ENTRY POINT ───────────────────────────────────────────────────────────────

(async () => {
  const args = parseArgs();

  if (!args) {
    // Interactive mode
    await interactive();
    return;
  }

  try {
    switch (args.mode) {
      case 'archive':
        if (!args.destBase) throw new Error('--dest חובה');
        archiveProduction(path.resolve(args.prodPath), path.resolve(args.destBase));
        break;

      case 'deploy':
        if (!args.srcPath)  throw new Error('--src חובה');
        if (!args.destBase) throw new Error('--dest חובה');
        deployNew(
          path.resolve(args.prodPath),
          path.resolve(args.srcPath),
          path.resolve(args.destBase)
        );
        break;

      case 'status':
        showMigrationStatus(path.resolve(args.prodPath));
        break;

      default:
        err(`פקודה לא מוכרת: ${args.mode}`);
        console.log('פקודות זמינות: archive | deploy | status');
        process.exit(1);
    }
  } catch (e) {
    err(e.message);
    process.exit(1);
  }
})();
