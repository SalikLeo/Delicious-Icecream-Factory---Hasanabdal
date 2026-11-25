/**
 * Delicious Superstar Foods - Supabase Cloud Sync Engine
 * 
 * Provides cloud snapshot backup and restore across multiple laptops.
 * The Electron app stays 100% offline-first with local SQLite.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

// Dedicated Supabase project: Icecream Factory Hasanabdal
const DEFAULT_URL = 'https://tqkxnzbxyrxwiptmxdcd.supabase.co';
const DEFAULT_KEY = 'sb_publishable_ktFPYCbGxymdiQzgiqeKgg_0P-64k8u';

let SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_URL;
let SUPABASE_KEY = process.env.SUPABASE_KEY || DEFAULT_KEY;

let dbInstance = null;

function setDb(db) {
  dbInstance = db;
  try {
    if (dbInstance && typeof dbInstance.getAllKv === 'function') {
      const kv = dbInstance.getAllKv();
      if (Array.isArray(kv)) {
        const u = kv.find(x => x.key === 'supabase_url');
        const k = kv.find(x => x.key === 'supabase_key');
        if (u && u.value && !process.env.SUPABASE_URL) SUPABASE_URL = u.value.trim().replace(/\/$/, '');
        if (k && k.value && !process.env.SUPABASE_KEY) SUPABASE_KEY = k.value.trim();
      }
    }
  } catch (e) {}
}

function setCredentials(url, key) {
  if (url) SUPABASE_URL = url.trim().replace(/\/$/, '');
  if (key) SUPABASE_KEY = key.trim();
  if (dbInstance && typeof dbInstance.setKv === 'function') {
    try {
      if (url) dbInstance.setKv('supabase_url', SUPABASE_URL);
      if (key) dbInstance.setKv('supabase_key', SUPABASE_KEY);
    } catch (e) {}
  }
  return { success: true, supabaseUrl: SUPABASE_URL };
}

async function supabaseFetch(endpoint, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase URL or API Key is not configured yet. Please configure your Supabase credentials.');
  }

  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = Object.assign({
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  }, options.headers || {});

  const timeoutMs = options.timeoutMs || 25000;
  const signal = options.signal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined);

  const fetchOptions = { ...options, headers };
  if (signal) fetchOptions.signal = signal;

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloud error (${res.status}): ${errorText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return null;
}

/**
 * Upload entire local database snapshot to Supabase cloud
 */
async function uploadToCloud() {
  if (!dbInstance) throw new Error('Database not initialized');

  if (typeof dbInstance.exportAllData !== 'function') {
    throw new Error('Database does not support exportAllData');
  }

  const dump = dbInstance.exportAllData();
  const timestamp = new Date().toISOString();
  const hostname = os.hostname();

  const payload = {
    appName: 'Delicious Superstar Foods',
    timestamp: timestamp,
    device: hostname,
    counts: dump.counts,
    data: dump
  };

  const backupKey = 'icecream_factory_cloud_backup';
  const metaKey = 'icecream_factory_cloud_meta';

  const metaData = {
    appName: 'Delicious Superstar Foods',
    timestamp: timestamp,
    device: hostname,
    counts: dump.counts
  };

  // 1. Upload metadata
  await supabaseFetch('app_kv_store', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      key: metaKey,
      value: JSON.stringify(metaData),
      branch_id: 'factory'
    })
  });

  // 2. Upload full snapshot
  await supabaseFetch('app_kv_store', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      key: backupKey,
      value: JSON.stringify(payload),
      branch_id: 'factory'
    })
  });

  // Save local record of sync
  if (typeof dbInstance.setKv === 'function') {
    try {
      dbInstance.setKv('last_cloud_sync_time', timestamp);
      dbInstance.setKv('last_cloud_sync_device', hostname);
    } catch (e) {}
  }

  return {
    success: true,
    timestamp: timestamp,
    device: hostname,
    counts: dump.counts
  };
}

/**
 * Restore database from the latest Supabase cloud snapshot
 */
async function restoreFromCloud() {
  if (!dbInstance) throw new Error('Database not initialized');

  const backupKey = 'icecream_factory_cloud_backup';

  // 1. Fetch latest backup from Supabase
  const rows = await supabaseFetch(`app_kv_store?key=eq.${encodeURIComponent(backupKey)}&select=value,updated_at`);

  if (!rows || rows.length === 0 || !rows[0].value) {
    throw new Error('No cloud backup found on Supabase for Delicious Superstar Foods. Please click "Sync to Cloud Now" from your main PC first.');
  }

  let payload = null;
  try {
    payload = JSON.parse(rows[0].value);
  } catch (e) {
    throw new Error('Cloud backup payload is corrupted: ' + e.message);
  }

  if (!payload || !payload.data) {
    throw new Error('Cloud backup data is missing or empty.');
  }

  // 2. Take a local safety backup of current SQLite database on disk before restore
  try {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
    const dir = path.join(appData, 'delicious-superstar-foods');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const safetyFile = path.join(dir, `safety_backup_before_cloud_restore_${Date.now()}.db`);
    if (typeof dbInstance.getDbPath === 'function') {
      const currentDbPath = dbInstance.getDbPath();
      if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, safetyFile);
        console.log(`[CloudSync] Safety backup saved to: ${safetyFile}`);
      }
    }
  } catch (err) {
    console.warn('[CloudSync] Could not create local safety backup:', err);
  }

  // 3. Import full data into SQLite
  if (typeof dbInstance.importAllData !== 'function') {
    throw new Error('Database does not support importAllData');
  }

  const result = dbInstance.importAllData(payload.data);

  // 4. Record local restore timestamp
  if (typeof dbInstance.setKv === 'function') {
    try {
      dbInstance.setKv('last_cloud_restore_time', new Date().toISOString());
      dbInstance.setKv('last_cloud_restore_source_timestamp', payload.timestamp || '');
      dbInstance.setKv('last_cloud_restore_source_device', payload.device || '');
    } catch (e) {}
  }

  return {
    success: true,
    timestamp: payload.timestamp,
    device: payload.device,
    counts: result.counts || payload.counts
  };
}

/**
 * Get cloud backup metadata and status
 */
async function getCloudStatus() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return {
      configured: false,
      connected: false,
      cloudMeta: null,
      localSyncTime: null,
      localRestoreTime: null,
      supabaseUrl: ''
    };
  }

  const metaKey = 'icecream_factory_cloud_meta';
  let cloudMeta = null;
  let connected = false;

  try {
    const rows = await supabaseFetch(`app_kv_store?key=eq.${encodeURIComponent(metaKey)}&select=value,updated_at`, { timeoutMs: 8000 });
    if (rows && rows.length > 0 && rows[0].value) {
      cloudMeta = JSON.parse(rows[0].value);
    }
    connected = true;
  } catch (err) {
    connected = false;
  }

  let localSyncTime = null;
  let localRestoreTime = null;
  if (dbInstance) {
    if (typeof dbInstance.getKv === 'function') {
      try {
        localSyncTime = dbInstance.getKv('last_cloud_sync_time');
        localRestoreTime = dbInstance.getKv('last_cloud_restore_time');
      } catch (e) {}
    } else if (typeof dbInstance.getAllKv === 'function') {
      try {
        const kvList = dbInstance.getAllKv();
        if (Array.isArray(kvList)) {
          const syncItem = kvList.find(x => x.key === 'last_cloud_sync_time');
          const restoreItem = kvList.find(x => x.key === 'last_cloud_restore_time');
          if (syncItem) localSyncTime = syncItem.value;
          if (restoreItem) localRestoreTime = restoreItem.value;
        }
      } catch (e) {}
    }
  }

  const hostname = os.hostname();
  if (!localSyncTime && cloudMeta && cloudMeta.device === hostname && cloudMeta.timestamp) {
    localSyncTime = cloudMeta.timestamp;
  }

  return {
    configured: true,
    connected,
    cloudMeta,
    localSyncTime,
    localRestoreTime,
    supabaseUrl: SUPABASE_URL
  };
}

module.exports = {
  setDb,
  setCredentials,
  uploadToCloud,
  restoreFromCloud,
  getCloudStatus
};
