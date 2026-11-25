/**
 * Delicious Superstar Foods - Local LAN Multi-PC Sync Service
 * 
 * Enables 3 PCs in the factory to work together on the same Wi-Fi / Router:
 * - PC 1 (Main Server): Holds master SQLite DB, runs background LAN server.
 * - PC 2 (Packing Station): Connects to PC 1 via LAN, restricted to Carton Packing & Daily Scan List.
 * - PC 3 (Sales Counter): Connects to PC 1 via LAN, restricted to New Sale.
 */

const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

const DEFAULT_PORT = 4321;
let localDb = null;
let httpServer = null;
let sseClients = [];
let heartbeatTimer = null;
let pendingBroadcastTimer = null;
let pendingBroadcastEvents = [];

const MUTATION_REGEX = /^(save|add|update|delete|run|process|load|unload|pay|record|bulkSet|increment|toggle|create|clear|mark|sync|reconcile|import|receive|setAttendance)/i;

function shouldBroadcastMethod(method) {
  if (!method) return false;
  // Ignore KV storage operations (settings/license timestamp checks) to prevent recursive event loops
  if (['setKv', 'saveAllKv', 'getKv', 'getAllKv'].includes(method)) {
    return false;
  }
  return MUTATION_REGEX.test(method);
}

// Terminal configuration path in user data
function getConfigPath() {
  const baseDir = app ? app.getPath('userData') : process.cwd();
  return path.join(baseDir, 'terminal-config.json');
}

function loadConfig() {
  try {
    const file = getConfigPath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Object.assign({
        role: 'main', // 'main' | 'packing' | 'sales'
        serverHost: '', // e.g. '192.168.1.50:4321'
        port: DEFAULT_PORT
      }, data);
    }
  } catch (e) {
    console.warn('[LANService] Error reading terminal config:', e.message);
  }
  return {
    role: 'main',
    serverHost: '',
    port: DEFAULT_PORT
  };
}

let activeConfig = loadConfig();

/**
 * Automatically find the machine's local Wi-Fi / Ethernet IPv4 address
 */
function getLocalIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // IPv4 only, not internal loopback (127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        // Prioritize standard local private subnets (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
          return net.address;
        }
        candidates.push(net.address);
      }
    }
  }

  return candidates.length > 0 ? candidates[0] : '127.0.0.1';
}

/**
 * Check if the target host points to the current machine (loopback / local testing)
 */
function isLocalHost(rawHost) {
  if (!rawHost) return true;
  const clean = String(rawHost).trim().replace(/^https?:\/\//i, '').split(':')[0].trim().toLowerCase();
  const myIp = getLocalIp().toLowerCase();
  return clean === '127.0.0.1' || clean === 'localhost' || clean === '::1' || clean === myIp;
}

function saveConfig(cfg) {
  try {
    activeConfig = Object.assign({}, activeConfig, cfg);
    const file = getConfigPath();
    fs.writeFileSync(file, JSON.stringify(activeConfig, null, 2), 'utf8');

    // Automatically manage background HTTP server:
    // ONLY PC 1 (role: 'main') runs the background LAN HTTP server.
    // Client terminals (packing, sales) are clients and must NEVER run their own server.
    if (activeConfig.role === 'main') {
      if (!httpServer && localDb) {
        startServer(localDb, activeConfig.port || DEFAULT_PORT);
      }
    } else {
      if (httpServer) {
        stopServer();
      }
    }
  } catch (e) {
    console.error('[LANService] Error saving terminal config:', e);
  }
  return activeConfig;
}

/**
 * Start lightweight local HTTP server on Main PC
 */
function startServer(db, port = DEFAULT_PORT) {
  if (httpServer) {
    try { httpServer.close(); } catch (e) {}
    httpServer = null;
  }

  localDb = db;

  httpServer = http.createServer((req, res) => {
    // Enable CORS for LAN access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Health check ping
    if (url.pathname === '/api/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        appName: 'Delicious Superstar Foods',
        role: 'server',
        hostIp: getLocalIp(),
        serverTime: Date.now()
      }));
      return;
    }

    // Server-Sent Events (SSE) for live sync broadcast
    if (url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write('\n');
      sseClients.push(res);

      req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res);
      });
      return;
    }

    // Remote Database RPC Handler
    if (url.pathname === '/api/call' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 50 * 1024 * 1024) { // 50MB safety limit
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
          req.destroy();
        }
      });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const { method, args = [] } = payload;

          if (!method || typeof localDb[method] !== 'function') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: `Invalid database method: "${method}"` }));
            return;
          }

          // If any arguments were serialized as null (from undefined in JSON), restore to undefined so default parameter values work
          const sanitizedArgs = (Array.isArray(args) ? args : []).map(a => (a === null ? undefined : a));
          const result = await localDb[method](...sanitizedArgs);

          // If this was a write / mutation method, broadcast update to all connected terminals
          if (shouldBroadcastMethod(method)) {
            broadcastEvent({ type: 'data-changed', method: method, timestamp: Date.now() });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } catch (err) {
          console.error('[LANServer RPC Error]:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message || 'Server error' }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[LANServer] Port ${port} is in use, retrying on ${port + 1}...`);
      startServer(db, port + 1);
    } else {
      console.error('[LANServer Error]:', err);
    }
  });

  // Start periodic 15-second heartbeat ping to keep SSE connections alive across factory Wi-Fi routers
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (sseClients.length === 0) return;
    const dead = [];
    for (const client of sseClients) {
      try {
        client.write(': ping\n\n');
      } catch (e) {
        dead.push(client);
      }
    }
    if (dead.length > 0) {
      sseClients = sseClients.filter(c => !dead.includes(c));
    }
  }, 15000);

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[LANServer] Server active on http://${getLocalIp()}:${port}`);
  });
}

function stopServer() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (httpServer) {
    try { httpServer.close(); } catch (e) {}
    httpServer = null;
  }
}

function broadcastEvent(data) {
  pendingBroadcastEvents.push(data);
  if (pendingBroadcastTimer) return;

  pendingBroadcastTimer = setTimeout(() => {
    pendingBroadcastTimer = null;
    const latestEvent = pendingBroadcastEvents[pendingBroadcastEvents.length - 1];
    pendingBroadcastEvents = [];
    if (!latestEvent) return;

    const msg = `data: ${JSON.stringify(latestEvent)}\n\n`;
    const dead = [];
    for (const client of sseClients) {
      try {
        client.write(msg);
      } catch (e) {
        dead.push(client);
      }
    }
    if (dead.length > 0) {
      sseClients = sseClients.filter(c => !dead.includes(c));
    }
    // Also notify local Electron windows
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('lan-data-changed', latestEvent);
        }
      }
    } catch (e) {}
  }, 100);
}

function normalizeHost(rawHost) {
  let host = (rawHost || '').trim().replace(/\/$/, '');
  if (!host) return '';
  // Strip protocol to check for port
  let withoutProto = host.replace(/^https?:\/\//, '');
  if (!withoutProto.includes(':')) {
    withoutProto = `${withoutProto}:${activeConfig.port || DEFAULT_PORT}`;
  }
  return host.startsWith('https://') ? `https://${withoutProto}` : `http://${withoutProto}`;
}

/**
 * Auto-discover PC 1 (Main Server) on factory local Wi-Fi subnet (/24)
 * Returns '192.168.X.Y:PORT' if found, or null
 */
async function discoverServer() {
  const localIp = getLocalIp();
  if (!localIp || localIp === '127.0.0.1') return null;

  const parts = localIp.split('.');
  if (parts.length !== 4) return null;

  const subnetPrefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
  const port = activeConfig.port || DEFAULT_PORT;

  return new Promise((resolve) => {
    let resolved = false;
    let pending = 254;

    for (let i = 1; i <= 254; i++) {
      const targetIp = `${subnetPrefix}${i}`;
      const req = http.get(`http://${targetIp}:${port}/api/ping`, { timeout: 1200 }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          if (!resolved) {
            try {
              const json = JSON.parse(raw);
              if (json && json.appName === 'Delicious Superstar Foods' && json.role === 'server') {
                resolved = true;
                return resolve(`${targetIp}:${port}`);
              }
            } catch (e) {}
          }
          if (--pending === 0 && !resolved) resolve(null);
        });
      });

      req.on('error', () => {
        if (--pending === 0 && !resolved) resolve(null);
      });
      req.on('timeout', () => {
        req.destroy();
        if (--pending === 0 && !resolved) resolve(null);
      });
    }
  });
}

/**
 * Call Main PC server across LAN from Client terminals (PC 2 / PC 3)
 */
async function callRemote(method, args = [], isRetry = false) {
  let host = (activeConfig.serverHost || '').trim();
  if (!host) {
    throw new Error('Main Server IP address is not configured. Please open Settings and enter the IP address of PC 1.');
  }

  const base = normalizeHost(host);
  const url = `${base}/api/call`;

  const timeoutSignal = AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args }),
      signal: timeoutSignal
    });
  } catch (networkErr) {
    // If first attempt failed on a LAN client, attempt to auto-discover PC 1 if its IP changed via DHCP
    if (!isRetry) {
      try {
        const foundHost = await discoverServer();
        if (foundHost && foundHost !== host) {
          console.log(`[LANService] Auto-discovered PC 1 moved to ${foundHost}, updating configuration...`);
          saveConfig({ serverHost: foundHost });
          return await callRemote(method, args, true);
        }
      } catch (e) {}

      // If read method, retry once after 350ms in case of a brief Wi-Fi packet drop
      if (/^(get|find|search|list|check)/i.test(method)) {
        await new Promise(r => setTimeout(r, 350));
        return await callRemote(method, args, true);
      }
    }
    throw new Error(`Cannot connect to Main PC at ${host}. Please ensure PC 1 is on and both PCs are on the same Wi-Fi.`);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Server returned status ${res.status}: ${errText}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Server error occurred');
  }

  return json.result;
}

/**
 * Test connectivity to Main PC
 */
async function pingServer(targetHost) {
  const host = (targetHost || activeConfig.serverHost || '').trim();
  if (!host) return { ok: false, error: 'No host address provided' };

  const base = normalizeHost(host);
  try {
    const res = await fetch(`${base}/api/ping`, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.appName === 'Delicious Superstar Foods') {
        return { ok: true, data };
      }
      return { ok: false, error: 'Server responded, but is not Delicious Superstar Foods Main Server.' };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message || 'Host unreachable' };
  }
}

/**
 * Create a transparent proxy over the database
 * If Role === 'main': calls local SQLite db
 * If Role === 'packing' or 'sales': ALWAYS calls remote server on PC 1
 */
function createDbProxy(db) {
  localDb = db;

  return new Proxy(db, {
    get(target, prop, receiver) {
      if (typeof target[prop] === 'function') {
        return function(...args) {
          // If in Client Terminal Mode (PC 2: packing, PC 3: sales) -> ALWAYS route to Main PC 1 over LAN
          if (activeConfig.role !== 'main') {
            // Local-only methods that don't need network
            if (['init', 'close', 'getDbPath', 'getDbPathForBranch'].includes(prop)) {
              return target[prop](...args);
            }
            if (!activeConfig.serverHost) {
              throw new Error('Main Server (PC 1) IP address is not configured. Please open Terminal Settings and enter the IP address of PC 1.');
            }
            // Trim trailing undefined arguments so [undefined] does not serialize to JSON [null]
            const cleanArgs = [...args];
            while (cleanArgs.length > 0 && cleanArgs[cleanArgs.length - 1] === undefined) {
              cleanArgs.pop();
            }
            return callRemote(prop, cleanArgs);
          }

          // Default: execute locally on Master SQLite database (PC 1)
          const res = target[prop](...args);
          // If Main Server executed a mutation, broadcast update to all connected terminals
          if (httpServer && shouldBroadcastMethod(prop)) {
            if (res && typeof res.then === 'function') {
              res.then(val => {
                broadcastEvent({ type: 'data-changed', method: prop, timestamp: Date.now() });
                return val;
              }).catch(() => {});
            } else {
              broadcastEvent({ type: 'data-changed', method: prop, timestamp: Date.now() });
            }
          }
          return res;
        };
      }
      return target[prop];
    }
  });
}

/**
 * Initialize LAN Service with Database
 */
function init(db) {
  localDb = db;
  activeConfig = loadConfig();

  // ONLY PC 1 (role: 'main') runs the background LAN HTTP server
  if (activeConfig.role === 'main') {
    startServer(db, activeConfig.port || DEFAULT_PORT);
  } else {
    stopServer();
  }

  return createDbProxy(db);
}

module.exports = {
  init,
  getLocalIp,
  isLocalHost,
  loadConfig,
  saveConfig,
  startServer,
  stopServer,
  pingServer,
  discoverServer,
  callRemote,
  createDbProxy,
  get activeConfig() { return activeConfig; }
};
