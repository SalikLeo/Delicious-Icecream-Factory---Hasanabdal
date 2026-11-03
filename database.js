const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;
function getDbPath() {
  const newFilename = 'delicious_superstar_foods.db';
  let targetDir;
  if (app && typeof app.getPath === 'function') {
    targetDir = app.getPath('userData');
  } else {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
    targetDir = path.join(appData, 'delicious-superstar-foods');
  }
  if (!fs.existsSync(targetDir)) {
    try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
  }

  const targetPath = path.join(targetDir, newFilename);

  // Automatic Migration from old location to ensure no data loss
  if (!fs.existsSync(targetPath)) {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
    const oldDbPath = path.join(appData, 'ishaq-jadoon-traders', 'ishaq_jadoon.db');
    const sameDirLegacy = path.join(targetDir, 'ishaq_jadoon.db');
    
    if (fs.existsSync(oldDbPath)) {
      try {
        fs.copyFileSync(oldDbPath, targetPath);
        if (fs.existsSync(oldDbPath + '-wal')) fs.copyFileSync(oldDbPath + '-wal', targetPath + '-wal');
        if (fs.existsSync(oldDbPath + '-shm')) fs.copyFileSync(oldDbPath + '-shm', targetPath + '-shm');
        console.log('[Database] Seamlessly migrated database from ishaq-jadoon-traders to', targetPath);
      } catch (err) {
        console.warn('[Database] Migration copy warning, using old path:', err);
        return oldDbPath;
      }
    } else if (fs.existsSync(sameDirLegacy)) {
      try {
        fs.copyFileSync(sameDirLegacy, targetPath);
      } catch (err) {
        return sameDirLegacy;
      }
    }
  }

  return targetPath;
}

function getDbPathForBranch() {
  return getDbPath();
}

function init(customPath = null) {
  const dbPath = customPath || getDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -64000');
  createTables();
  seedInitialData();
  return db;
}

function createTables() {
  // Settings & App Storage
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS app_kv_store (key TEXT PRIMARY KEY, value TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS product_rate_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_slug TEXT,
    product_id INTEGER,
    item_name TEXT,
    old_stock INTEGER,
    added_qty INTEGER,
    new_stock INTEGER,
    old_cost_price REAL,
    purchase_price REAL,
    new_cost_price REAL,
    retail_price REAL,
    wholesale_price REAL,
    source TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS category_labels (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, label TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS product_units (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);

  // Check if we already have categories. If not, this is a fresh DB, create standard tables.
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='category_labels'").get();
  const hasCategories = tableExists && db.prepare("SELECT COUNT(*) as c FROM category_labels").get().c > 0;

  if (!hasCategories) {
    // Initial Products Tables
    db.exec(`CREATE TABLE IF NOT EXISTS products_panels (id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT, wattage TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_inverters (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, brand TEXT, model TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_structures (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_cables (id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT, size TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_breakers (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, brand TEXT, spec TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_batteries (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, brand TEXT, model TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_misc (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, type TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_others (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
  }

  // Migration: Add columns if missing to ALL product tables
  const productTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'products_%'").all();
  productTables.forEach(row => {
    const tableName = row.name;
    const cat = tableName.replace('products_', '');

    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const columns = tableInfo.map(c => c.name);
    
    if (!columns.includes('item_name')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN item_name TEXT`);
          // Migration: Populate item_name from old fields
          if (cat === 'panels') db.exec(`UPDATE products_panels SET item_name = brand || ' ' || wattage`);
          else if (cat === 'inverters' || cat === 'batteries') db.exec(`UPDATE products_${cat} SET item_name = brand || ' ' || model`);
          else if (cat === 'structures') db.exec(`UPDATE products_structures SET item_name = type`);
          else if (cat === 'cables') db.exec(`UPDATE products_cables SET item_name = brand || ' ' || size`);
          else if (cat === 'breakers') db.exec(`UPDATE products_breakers SET item_name = type || ' ' || brand`);
        } catch(e) {}
    }
    if (columns.includes('item_name')) {
      try {
        if (cat === 'panels') db.exec(`UPDATE products_panels SET item_name = brand || ' ' || wattage WHERE item_name IS NULL`);
        else if (cat === 'inverters' || cat === 'batteries') db.exec(`UPDATE products_${cat} SET item_name = brand || ' ' || model WHERE item_name IS NULL`);
        else if (cat === 'structures') db.exec(`UPDATE products_structures SET item_name = type WHERE item_name IS NULL`);
        else if (cat === 'cables') db.exec(`UPDATE products_cables SET item_name = brand || ' ' || size WHERE item_name IS NULL`);
        else if (cat === 'breakers') db.exec(`UPDATE products_breakers SET item_name = type || ' ' || brand WHERE item_name IS NULL`);
      } catch(e) {}
    }
    if (!columns.includes('description')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN description TEXT`); } catch(e) {}
    }
    if (!columns.includes('current_stock')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN current_stock INTEGER DEFAULT 0`); } catch(e) {}
    }
    if (!columns.includes('unit')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN unit TEXT DEFAULT 'pcs'`); } catch(e) {}
    }
    if (!columns.includes('company_id')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN company_id INTEGER`); } catch(e) {}
    }
    if (!columns.includes('wholesale_cost_price')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN wholesale_cost_price REAL DEFAULT 0`);
          db.exec(`UPDATE ${tableName} SET wholesale_cost_price = cost_price WHERE wholesale_cost_price IS NULL OR wholesale_cost_price = 0`);
        } catch(e) {}
    }
    if (!columns.includes('wholesale_price')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN wholesale_price REAL DEFAULT 0`);
          db.exec(`UPDATE ${tableName} SET wholesale_price = retail_price WHERE wholesale_price IS NULL OR wholesale_price = 0`);
        } catch(e) {}
    }
    if (!columns.includes('pieces_per_carton')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN pieces_per_carton INTEGER DEFAULT NULL`);
        } catch(e) {}
    }
    if (!columns.includes('barcode')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN barcode TEXT`);
        } catch(e) {}
    }
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_barcode ON ${tableName}(barcode)`);
    } catch(e) {}
  });

  // Ensure stock floats are clean (never more than 2 decimals)
  productTables.forEach(row => {
    try {
      db.exec(`UPDATE ${row.name} SET current_stock = ROUND(current_stock, 2) WHERE current_stock IS NOT NULL`);
    } catch(e) {}
  });

  // Performance Indexes
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, category_slug TEXT, product_id INTEGER, UNIQUE(category_slug, product_id))`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_favorites_cat_prod ON favorites(category_slug, product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_rate_hist_prod ON product_rate_history(product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_rate_hist_cat_prod ON product_rate_history(category_slug, product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_proposals_cust ON proposals(customer_name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_proposal_items_pid ON proposal_items(proposal_id)`);
    productTables.forEach(row => {
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${row.name}_name ON ${row.name}(item_name)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${row.name}_comp ON ${row.name}(company_id)`);
      } catch(e) {}
    });
  } catch(e) {}

  db.exec(`CREATE TABLE IF NOT EXISTS product_units (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.exec(`DELETE FROM product_units WHERE name IN ('BAG', 'FEET', 'RUNNING FEET', 'KG', 'LITER', 'METER', 'COTTON')`);
  ['CARTON', 'PCS', 'SET'].forEach(u => {
    try { db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)').run(u); } catch(e) {}
  });

  // Proposals
  db.exec(`CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    proposal_number TEXT, 
    customer_name TEXT, 
    location TEXT, 
    phone TEXT, 
    date TEXT, 
    retail_total REAL, 
    cost_total REAL, 
    profit REAL, 
    status TEXT, 
    received_amount REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    seller_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Force columns if missing (Migrations)
  const tableInfo = db.prepare("PRAGMA table_info(proposals)").all();
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes('received_amount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN received_amount REAL DEFAULT 0'); } catch(e) { console.error("Migration failed (received_amount):", e); }
  }
  if (!columns.includes('discount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN discount REAL DEFAULT 0'); } catch(e) { console.error("Migration failed (discount):", e); }
  }
  if (!columns.includes('seller_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN seller_name TEXT'); } catch(e) { console.error("Migration failed (seller_name):", e); }
  }
  if (!columns.includes('created_at')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) { console.error("Migration failed (created_at):", e); }
  }
  if (!columns.includes('booking_day')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN booking_day TEXT'); } catch(e) {}
  }
  if (!columns.includes('delivery_day')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN delivery_day TEXT'); } catch(e) {}
  }
  if (!columns.includes('shop_id')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_id INTEGER'); } catch(e) {}
  }
  if (!columns.includes('shop_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_name TEXT'); } catch(e) {}
  }
  if (!columns.includes('shop_address')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_address TEXT'); } catch(e) {}
  }
  if (!columns.includes('salesman_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN salesman_name TEXT'); } catch(e) {}
  }
  if (!columns.includes('salesman_contact')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN salesman_contact TEXT'); } catch(e) {}
  }
  if (!columns.includes('sys_rating')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN sys_rating TEXT'); } catch(e) { console.error("Migration failed (sys_rating):", e); }
  }
  if (!columns.includes('sys_type')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN sys_type TEXT'); } catch(e) { console.error("Migration failed (sys_type):", e); }
  }
  if (!columns.includes('pv_rating')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN pv_rating TEXT'); } catch(e) { console.error("Migration failed (pv_rating):", e); }
  }
  if (!columns.includes('inverter')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN inverter TEXT'); } catch(e) { console.error("Migration failed (inverter):", e); }
  }
  if (!columns.includes('payment_method')) {
    try { db.exec("ALTER TABLE proposals ADD COLUMN payment_method TEXT DEFAULT 'Cash'"); } catch(e) { console.error("Migration failed (payment_method):", e); }
  }
  if (!columns.includes('tax_percent')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN tax_percent REAL DEFAULT 0.5'); } catch(e) {}
  }
  if (!columns.includes('tax_amount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN tax_amount REAL DEFAULT 0'); } catch(e) {}
  }
  if (!columns.includes('subtotal')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN subtotal REAL DEFAULT 0'); } catch(e) {}
  }
  if (!columns.includes('sale_mode')) {
    try { db.exec("ALTER TABLE proposals ADD COLUMN sale_mode TEXT DEFAULT 'retail'"); } catch(e) { console.error("Migration failed (sale_mode):", e); }
  }

  // Same for expenses
  const expInfo = db.prepare("PRAGMA table_info(expenses)").all().map(c => c.name);
  if (!expInfo.includes('created_at')) {
    try { db.exec('ALTER TABLE expenses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}
  }

  // Same for employees 
  const empInfo = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
  if (!empInfo.includes('created_at')) {
    try { db.exec('ALTER TABLE employees ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}
  }
  if (!empInfo.includes('date_inactive')) {
    try { db.exec('ALTER TABLE employees ADD COLUMN date_inactive TEXT'); } catch(e) {}
  }

  db.exec(`CREATE TABLE IF NOT EXISTS proposal_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    proposal_id INTEGER, 
    item_id INTEGER,
    section TEXT, 
    description TEXT, 
    qty REAL, 
    unit_cost REAL, 
    unit_retail REAL, 
    line_cost REAL, 
    line_retail REAL, 
    line_profit REAL,
    FOREIGN KEY(proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
  )`);

  // Migration: Add item_id if missing
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN item_id INTEGER'); } catch(e) {}
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN unit_discounted REAL'); } catch(e) {}
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN unit TEXT'); } catch(e) {}

  // Expenses
  db.exec(`CREATE TABLE IF NOT EXISTS expense_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.exec(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    date TEXT, 
    category TEXT, 
    amount REAL, 
    description TEXT, 
    paid_by TEXT, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Employees
  db.exec(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    full_name TEXT, 
    role TEXT, 
    phone TEXT, 
    email TEXT, 
    date_joined TEXT, 
    salary REAL, 
    status TEXT, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Companies
  db.exec(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    description TEXT, 
    amount REAL DEFAULT 0, 
    phone TEXT, 
    email TEXT, 
    address TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Customers
  db.exec(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    description TEXT, 
    amount REAL DEFAULT 0, 
    phone TEXT, 
    email TEXT, 
    address TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Shops
  db.exec(`CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    owner_name TEXT, 
    phone TEXT, 
    address TEXT, 
    city TEXT DEFAULT 'Hasan Abdal', 
    amount REAL DEFAULT 0, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration for shops
  try {
    const shopCols = db.prepare("PRAGMA table_info(shops)").all().map(c => c.name);
    if (!shopCols.includes('owner_name')) db.exec('ALTER TABLE shops ADD COLUMN owner_name TEXT');
    if (!shopCols.includes('city')) db.exec("ALTER TABLE shops ADD COLUMN city TEXT DEFAULT 'Hasan Abdal'");
    if (!shopCols.includes('notes')) db.exec('ALTER TABLE shops ADD COLUMN notes TEXT');
    if (!shopCols.includes('amount')) db.exec('ALTER TABLE shops ADD COLUMN amount REAL DEFAULT 0');
  } catch(e) {}

  // Favorites
  db.exec(`CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_slug TEXT,
    product_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_slug, product_id)
  )`);

  // Performance Indexes for ultra-fast queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prop_num ON proposals(proposal_number)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prop_cust ON proposals(customer_name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prop_items_pid ON proposal_items(proposal_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cust_name ON customers(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers(phone)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_comp_name ON companies(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_favs_cat_prod ON favorites(category_slug, product_id)`);
  } catch(e) {}

  createIcecreamFactoryTables();
}

function seedInitialData() {
  try {
    const defaultCompanyName = 'Delicious Superstar Foods';
    const defaultAddress = 'Hasan Abdal';
    const defaultPhone = '0315-6795995';
    const defaultTagline = 'Delicious Superstar Foods & Ice Cream Products';

    // Update settings table with new branding
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('company_name', ?)").run(defaultCompanyName);
    db.prepare("DELETE FROM settings WHERE key IN ('branch_id', 'branch_name')").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('address', ?)").run(defaultAddress);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('phone', ?)").run(defaultPhone);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('tagline', ?)").run(defaultTagline);

    // Clean up stale logo if it belongs to Baba Waziristan or temporary downloads
    const existingLogo = db.prepare("SELECT value FROM settings WHERE key = 'logo_path'").get();
    if (existingLogo && existingLogo.value && (
      existingLogo.value.toLowerCase().includes('baba') ||
      existingLogo.value.toLowerCase().includes('waziristan') ||
      existingLogo.value.toLowerCase().includes('downloads\\logo.jpg') ||
      existingLogo.value.toLowerCase().includes('downloads/logo.jpg')
    )) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('logo_path', ?)").run('');
    }

    // Default auto backup directory in Documents
    const defaultBackupDir = (app && typeof app.getPath === 'function') 
      ? path.join(app.getPath('documents'), 'Delicious Superstar Foods Backups')
      : path.join(require('os').homedir(), 'Documents', 'Delicious Superstar Foods Backups');
    const existingBackupDir = db.prepare("SELECT value FROM settings WHERE key = 'auto_backup_dir'").get();
    if (!existingBackupDir || !existingBackupDir.value || existingBackupDir.value.includes('Ishaq Jadoon') || existingBackupDir.value.includes('Ice Cream Factory')) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_backup_dir', ?)").run(defaultBackupDir);
    }
    try {
      if (!fs.existsSync(defaultBackupDir)) {
        fs.mkdirSync(defaultBackupDir, { recursive: true });
      }
    } catch(e) {}

    // Default expense categories
    const cats = ['Office', 'Transport', 'Utilities', 'Salaries', 'Purchase', 'Other'];
    const expenseStmt = db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)');
    cats.forEach(c => expenseStmt.run(c));

    // Update / Ensure FMCG Product category labels
    const productLabels = [
      { slug: 'panels', label: 'Biscuits' },
      { slug: 'inverters', label: 'Cold Drinks' },
      { slug: 'structures', label: 'Jellies & Candies' },
      { slug: 'cables', label: 'Snacks & Chips' },
      { slug: 'breakers', label: 'Chocolates' },
      { slug: 'batteries', label: 'Dairy & Groceries' },
      { slug: 'misc', label: 'Juices & Beverages' },
      { slug: 'others', label: 'General Items' }
    ];
    
    // Always upsert the 8 standard categories and wipe out any legacy solar labels
    productLabels.forEach(l => {
      const existing = db.prepare('SELECT id, label FROM category_labels WHERE slug = ?').get(l.slug);
      if (!existing) {
        db.prepare('INSERT INTO category_labels (slug, label) VALUES (?, ?)').run(l.slug, l.label);
      } else {
        const lowerLabel = String(existing.label || '').toLowerCase().trim();
        const solarKeywords = ['panels', 'solar panels', 'inverters', 'solar inverters', 'structures', 'cables', 'breakers', 'batteries', 'accessories', 'solar', ''];
        if (solarKeywords.includes(lowerLabel)) {
          db.prepare('UPDATE category_labels SET label = ? WHERE slug = ?').run(l.label, l.slug);
        }
      }
    });

    // Delete any stray/orphan categories created with solar names
    try {
      db.prepare(`
        DELETE FROM category_labels 
        WHERE LOWER(label) IN ('panels', 'solar panels', 'inverters', 'solar inverters', 'structures', 'cables', 'breakers', 'batteries', 'accessories', 'solar')
          AND slug NOT IN ('panels', 'inverters', 'structures', 'cables', 'breakers', 'batteries', 'misc', 'others')
      `).run();
    } catch(e) {}

    // Default units
    db.exec(`DELETE FROM product_units WHERE name IN ('FEET', 'RUNNING FEET', 'METER', 'COTTON')`);
    const productUnits = ['PACK', 'PCS', 'BOX', 'BOTTLE', 'CARTON', 'SET'];
    const unitStmt = db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)');
    productUnits.forEach(u => unitStmt.run(u));

    // Seed default Ice Cream Factory data
    seedIcecreamFactoryData();
  } catch (e) {
    console.error("Failed to seed initial data:", e);
  }
}

function clearAllData() {
  try {
    const transaction = db.transaction(() => {
      // 1. Delete all rows from dynamic product tables
      const productTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'products_%'").all();
      productTables.forEach(row => {
        try {
          db.exec(`DELETE FROM ${row.name}`);
        } catch (e) {
          console.error(`Error clearing ${row.name}:`, e);
        }
      });

      // 2. Delete all records from transactional & operational tables
      const tablesToClear = [
        'proposals',
        'proposal_items',
        'product_rate_history',
        'expenses',
        'companies',
        'customers',
        'shops',
        'employees',
        'favorites',
        'app_kv_store'
      ];

      tablesToClear.forEach(tbl => {
        try {
          const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tbl);
          if (tableExists) {
            db.exec(`DELETE FROM ${tbl}`);
          }
        } catch (e) {
          console.error(`Error clearing table ${tbl}:`, e);
        }
      });

      // 3. Reset all auto-increment counters to start back from 1
      try {
        db.exec(`DELETE FROM sqlite_sequence`);
      } catch (e) {}

      // 4. Ensure standard category labels and units remain intact
      const productLabels = [
        { slug: 'panels', label: 'Biscuits' },
        { slug: 'inverters', label: 'Cold Drinks' },
        { slug: 'structures', label: 'Jellies & Candies' },
        { slug: 'cables', label: 'Snacks & Chips' },
        { slug: 'breakers', label: 'Chocolates' },
        { slug: 'batteries', label: 'Dairy & Groceries' },
        { slug: 'misc', label: 'Juices & Beverages' },
        { slug: 'others', label: 'General Items' }
      ];
      productLabels.forEach(l => {
        try {
          db.prepare('INSERT OR IGNORE INTO category_labels (slug, label) VALUES (?, ?)').run(l.slug, l.label);
        } catch (e) {}
      });

      const defaultUnits = ['PACK', 'PCS', 'BOX', 'BOTTLE', 'CARTON', 'SET'];
      defaultUnits.forEach(u => {
        try {
          db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)').run(u);
        } catch (e) {}
      });

      const defaultExpCats = ['Office', 'Transport', 'Utilities', 'Salaries', 'Purchase', 'Other'];
      defaultExpCats.forEach(c => {
        try {
          db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)').run(c);
        } catch (e) {}
      });
    });

    transaction();

    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.exec('VACUUM');
    } catch (e) {
      console.error('Vacuum error:', e);
    }

    return { success: true };
  } catch (err) {
    console.error('clearAllData error:', err);
    return { success: false, error: err.message };
  }
}

// ------ SETTINGS ------
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  return settings;
}

function saveSettings(data) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(data)) {
      stmt.run(key, value);
    }
  });
  transaction();
}

// ------ APP KV STORAGE ------
function getAllKv() {
  try {
    return db.prepare('SELECT key, value FROM app_kv_store').all();
  } catch (e) {
    return [];
  }
}

function setKv(key, value) {
  try {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    db.prepare('INSERT OR REPLACE INTO app_kv_store (key, value) VALUES (?, ?)').run(key, val);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

function saveAllKv(entries) {
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO app_kv_store (key, value) VALUES (?, ?)');
    const transaction = db.transaction((items) => {
      for (const [key, value] of Object.entries(items)) {
        const val = typeof value === 'string' ? value : JSON.stringify(value);
        stmt.run(key, val);
      }
    });
    transaction(entries);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

function getProducts(category, companyId = null) {
  if (!category || category === 'all') {
    return searchAllProducts('', companyId);
  }
  let sql = `
    SELECT p.*, c.name as company_name, (f.id IS NOT NULL) as is_favorite, '${category}' as slug,
      (SELECT prh.purchase_price FROM product_rate_history prh WHERE prh.category_slug = '${category}' AND prh.product_id = p.id AND prh.purchase_price > 0 ORDER BY prh.id DESC LIMIT 1) as last_purchase_price
    FROM products_${category} p
    LEFT JOIN favorites f ON f.category_slug = '${category}' AND f.product_id = p.id
    LEFT JOIN companies c ON c.id = p.company_id
  `;
  
  const params = [];
  if (companyId) {
    sql += ` WHERE p.company_id = ?`;
    params.push(companyId);
  }
  
  sql += ` ORDER BY p.id DESC`;
  try {
    return db.prepare(sql).all(...params);
  } catch (e) {
    console.error(`getProducts error for category "${category}":`, e);
    return [];
  }
}

function findProductByName(itemName, excludeCategory = null, excludeId = null) {
  if (!itemName || typeof itemName !== 'string') return null;
  const cleanName = itemName.trim().replace(/\s+/g, ' ');
  if (!cleanName) return null;
  const lowerName = cleanName.toLowerCase();

  const labels = getCategoryLabels();
  for (const l of labels) {
    const cat = l.slug;
    const catLabel = l.label || cat;
    let sql = `
      SELECT id, item_name, current_stock, '${cat}' as slug, '${catLabel.replace(/'/g, "''")}' as category_label 
      FROM products_${cat} 
      WHERE LOWER(TRIM(COALESCE(item_name, description, ''))) = ?
    `;
    const params = [lowerName];
    if (excludeCategory && excludeId && String(cat).toLowerCase() === String(excludeCategory).toLowerCase()) {
      sql += ' AND id != ?';
      params.push(Number(excludeId));
    }
    try {
      const match = db.prepare(sql).get(...params);
      if (match) {
        return match;
      }
    } catch (e) {}
  }
  return null;
}

function findProductByBarcode(barcode, excludeCategory = null, excludeId = null) {
  if (!barcode || typeof barcode !== 'string') return null;
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;
  const lowerBarcode = cleanBarcode.toLowerCase();

  const labels = getCategoryLabels();
  for (const l of labels) {
    const cat = l.slug;
    const catLabel = l.label || cat;
    let sql = `
      SELECT p.*, c.name as company_name, '${cat}' as slug, '${catLabel.replace(/'/g, "''")}' as category_label 
      FROM products_${cat} p
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE LOWER(TRIM(COALESCE(p.barcode, ''))) = ?
    `;
    const params = [lowerBarcode];
    if (excludeCategory && excludeId && String(cat).toLowerCase() === String(excludeCategory).toLowerCase()) {
      sql += ' AND p.id != ?';
      params.push(Number(excludeId));
    }
    try {
      const match = db.prepare(sql).get(...params);
      if (match) {
        return match;
      }
    } catch (e) {}
  }
  return null;
}

function addProduct(category, data) {
  const itemName = (data.item_name || data.description || '').trim();
  if (itemName) {
    const existing = findProductByName(itemName);
    if (existing) {
      const catName = existing.category_label || existing.slug;
      throw new Error(`Item "${existing.item_name || itemName}" is already in stock under "${catName}". Duplicate items cannot be added.`);
    }
  }

  if (data.barcode !== undefined && data.barcode !== null) {
    const cleanBarcode = String(data.barcode).trim();
    if (cleanBarcode) {
      const existingBarcode = findProductByBarcode(cleanBarcode);
      if (existingBarcode) {
        const catName = existingBarcode.category_label || existingBarcode.slug;
        throw new Error(`Barcode "${cleanBarcode}" is already assigned to "${existingBarcode.item_name}" under "${catName}".`);
      }
      data.barcode = cleanBarcode;
    } else {
      delete data.barcode;
    }
  }

  if (data.current_stock !== undefined) {
    data.current_stock = Math.round((Number(data.current_stock) || 0) * 100) / 100;
  }
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const info = db.prepare(`INSERT INTO products_${category} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
  return info.lastInsertRowid;
}

function updateProduct(category, id, data) {
  if (data.current_stock !== undefined) {
    data.current_stock = Math.round((Number(data.current_stock) || 0) * 100) / 100;
  }
  if (data.item_name !== undefined) {
    const itemName = String(data.item_name || '').trim();
    if (itemName) {
      const existing = findProductByName(itemName, category, id);
      if (existing) {
        const catName = existing.category_label || existing.slug;
        throw new Error(`Item "${existing.item_name || itemName}" is already in stock under "${catName}". Duplicate items cannot be added.`);
      }
    }
  }

  if (data.barcode !== undefined && data.barcode !== null) {
    const cleanBarcode = String(data.barcode).trim();
    if (cleanBarcode) {
      const existingBarcode = findProductByBarcode(cleanBarcode, category, id);
      if (existingBarcode) {
        const catName = existingBarcode.category_label || existingBarcode.slug;
        throw new Error(`Barcode "${cleanBarcode}" is already assigned to "${existingBarcode.item_name}" under "${catName}".`);
      }
      data.barcode = cleanBarcode;
    } else {
      data.barcode = null;
    }
  }

  const tableInfo = db.prepare(`PRAGMA table_info(products_${category})`).all();
  const columns = tableInfo.map(c => c.name);
  const cleanData = {};
  for (const [key, value] of Object.entries(data)) {
    if (columns.includes(key) && key !== 'id') cleanData[key] = value;
  }
  const updates = Object.keys(cleanData).map(k => `${k} = ?`).join(', ');
  const values = Object.values(cleanData);
  db.prepare(`UPDATE products_${category} SET ${updates} WHERE id = ?`).run(...values, id);
}

function changeProductCategory(oldCategory, newCategory, id, data = {}) {
  if (!oldCategory || !newCategory || !id) {
    throw new Error('Old category, new category, and item ID are required.');
  }

  const oldTable = getProductTable(oldCategory);
  const newTable = getProductTable(newCategory);
  if (!oldTable) throw new Error(`Source category table for "${oldCategory}" does not exist.`);
  if (!newTable) throw new Error(`Target category table for "${newCategory}" does not exist.`);

  if (oldCategory === newCategory) {
    updateProduct(newCategory, id, data);
    return { id, category: newCategory };
  }

  const oldRow = db.prepare(`SELECT * FROM ${oldTable} WHERE id = ?`).get(id);
  if (!oldRow) {
    throw new Error(`Item not found in category "${oldCategory}".`);
  }

  const itemName = (data.item_name !== undefined)
    ? String(data.item_name || '').trim()
    : String(oldRow.item_name || oldRow.description || '').trim();

  if (itemName) {
    const existing = findProductByName(itemName, oldCategory, id);
    if (existing) {
      const catName = existing.category_label || existing.slug;
      throw new Error(`Item "${existing.item_name || itemName}" is already in stock under "${catName}". Duplicate items cannot be added.`);
    }
  }

  const targetTableInfo = db.prepare(`PRAGMA table_info(${newTable})`).all();
  const targetColumns = targetTableInfo.map(c => c.name);

  // Merge oldRow with incoming data updates
  const merged = { ...oldRow, ...data };
  delete merged.id;

  const cleanData = {};
  for (const [key, value] of Object.entries(merged)) {
    if (targetColumns.includes(key)) {
      cleanData[key] = value;
    }
  }

  if (targetColumns.includes('item_name') && cleanData.item_name === undefined) {
    cleanData.item_name = itemName;
  }
  if (targetColumns.includes('wholesale_cost_price') && (cleanData.wholesale_cost_price === undefined || cleanData.wholesale_cost_price === null)) {
    cleanData.wholesale_cost_price = cleanData.cost_price || 0;
  }
  if (targetColumns.includes('wholesale_price') && (cleanData.wholesale_price === undefined || cleanData.wholesale_price === null)) {
    cleanData.wholesale_price = cleanData.retail_price || 0;
  }

  const slugToCode = {
    panels: 'pnl', inverters: 'inv', structures: 'str', cables: 'cab',
    breakers: 'brk', batteries: 'bat', misc: 'msc', others: 'oth'
  };
  const oldCode = slugToCode[oldCategory] || oldCategory;

  let newId = null;

  const migrateTx = db.transaction(() => {
    // 1. Insert into new category table
    const keys = Object.keys(cleanData);
    const placeholders = keys.map(() => '?').join(', ');
    const insertStmt = db.prepare(`INSERT INTO ${newTable} (${keys.join(', ')}) VALUES (${placeholders})`);
    const info = insertStmt.run(...Object.values(cleanData));
    newId = info.lastInsertRowid;

    // 2. Delete from old category table
    db.prepare(`DELETE FROM ${oldTable} WHERE id = ?`).run(id);

    // 3. Update favorites
    try {
      db.prepare('DELETE FROM favorites WHERE category_slug = ? AND product_id = ?').run(newCategory, newId);
      db.prepare('UPDATE favorites SET category_slug = ?, product_id = ? WHERE category_slug = ? AND product_id = ?').run(newCategory, newId, oldCategory, id);
    } catch (e) {
      console.warn('[changeProductCategory] favorites migration error:', e.message);
    }

    // 4. Update product_rate_history
    try {
      db.prepare('UPDATE product_rate_history SET category_slug = ?, product_id = ?, item_name = COALESCE(?, item_name) WHERE category_slug = ? AND product_id = ?').run(newCategory, newId, itemName || null, oldCategory, id);
    } catch (e) {
      console.warn('[changeProductCategory] rate history migration error:', e.message);
    }

    // 5. Update proposal_items
    try {
      db.prepare('UPDATE proposal_items SET section = ?, item_id = ? WHERE (section = ? OR section = ?) AND item_id = ?').run(newCategory, newId, oldCategory, oldCode, id);
    } catch (e) {
      console.warn('[changeProductCategory] proposal items migration error:', e.message);
    }
  });

  migrateTx();

  return { id: newId, category: newCategory };
}

function deleteProduct(category, id) {
  db.prepare(`DELETE FROM products_${category} WHERE id = ?`).run(id);
}

function getCategoryLabels() {
  const legacyMap = {
    panels: 'Biscuits',
    inverters: 'Cold Drinks',
    structures: 'Jellies & Candies',
    cables: 'Snacks & Chips',
    breakers: 'Chocolates',
    batteries: 'Dairy & Groceries',
    misc: 'Juices & Beverages',
    others: 'General Items'
  };
  const solarKeywords = ['panels', 'solar panels', 'inverters', 'solar inverters', 'structures', 'cables', 'breakers', 'batteries', 'accessories', 'solar'];
  const rows = db.prepare('SELECT * FROM category_labels').all();
  return rows.map(r => {
    let lbl = (r.label || '').trim();
    if (!lbl || solarKeywords.includes(lbl.toLowerCase())) {
      lbl = legacyMap[r.slug] || 'General Items';
    }
    return { ...r, label: lbl };
  });
}

function updateCategoryLabel(slug, label) {
  db.prepare('UPDATE category_labels SET label = ? WHERE slug = ?').run(label, slug);
}

function searchAllProducts(query = '', companyId = null) {
  const labels = getCategoryLabels();
  let results = [];
  const qClean = (query || '').trim();
  const qLower = qClean.toLowerCase();
  const qFuzzy = `%${qClean}%`;

  labels.forEach(l => {
    const cat = l.slug;
    const escapedLabel = (l.label || '').replace(/'/g, "''");
    let sql = `
      SELECT p.*, c.name as company_name, (f.id IS NOT NULL) as is_favorite, '${cat}' as slug, '${escapedLabel}' as category_label,
        (SELECT prh.purchase_price FROM product_rate_history prh WHERE prh.category_slug = '${cat}' AND prh.product_id = p.id AND prh.purchase_price > 0 ORDER BY prh.id DESC LIMIT 1) as last_purchase_price
      FROM products_${cat} p 
      LEFT JOIN favorites f ON f.category_slug = '${cat}' AND f.product_id = p.id
      LEFT JOIN companies c ON c.id = p.company_id
    `;
    let params = [];

    if (qClean) {
      const labelMatches = l.label.toLowerCase().includes(qLower);
      if (labelMatches) {
        if (companyId) {
          sql += " WHERE p.company_id = ?";
          params.push(companyId);
        }
      } else {
        sql += ` WHERE (p.item_name LIKE ? OR p.description LIKE ? OR p.barcode LIKE ?)`;
        params.push(qFuzzy, qFuzzy, qFuzzy);
        if (companyId) {
          sql += ` AND p.company_id = ?`;
          params.push(companyId);
        }
      }
    } else if (companyId) {
      sql += " WHERE p.company_id = ?";
      params.push(companyId);
    }

    sql += " ORDER BY p.item_name ASC";
    try {
      const rows = db.prepare(sql).all(...params);
      results = results.concat(rows);
    } catch(e) {}
  });

  return results;
}

function toggleFavorite(category, id) {
  const exists = db.prepare('SELECT id FROM favorites WHERE category_slug = ? AND product_id = ?').get(category, id);
  if (exists) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(exists.id);
    return { status: 'removed' };
  } else {
    db.prepare('INSERT INTO favorites (category_slug, product_id) VALUES (?, ?)').run(category, id);
    return { status: 'added' };
  }
}

function getFavoriteProducts() {
  const labels = getCategoryLabels();
  let results = [];
  labels.forEach(l => {
    const cat = l.slug;
    const sql = `
      SELECT p.*, '${cat}' as slug, 1 as is_favorite 
      FROM products_${cat} p
      INNER JOIN favorites f ON f.category_slug = '${cat}' AND f.product_id = p.id
    `;
    const rows = db.prepare(sql).all();
    results = results.concat(rows);
  });
  return results;
}

function getCategoryStats() {
    try {
        const labels = getCategoryLabels();
        return labels.map(l => {
            let count = 0;
            try {
                const row = db.prepare(`SELECT COUNT(*) as c FROM products_${l.slug}`).get();
                count = row ? (row.c || 0) : 0;
            } catch(e) {
                count = 0;
            }
            return { ...l, count };
        });
    } catch(e) {
        console.error('getCategoryStats error:', e);
        return [];
    }
}

function addCategory(label) {
    const slug = label.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    
    // Check if exists
    const exists = db.prepare('SELECT id FROM category_labels WHERE slug = ?').get(slug);
    if (exists) return { error: 'Category already exists' };

    const transaction = db.transaction(() => {
        db.prepare('INSERT INTO category_labels (slug, label) VALUES (?, ?)').run(slug, label);
        db.exec(`CREATE TABLE products_${slug} (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            item_name TEXT, 
            description TEXT, 
            current_stock INTEGER DEFAULT 0, 
            unit TEXT DEFAULT 'pcs', 
            cost_price REAL DEFAULT 0, 
            retail_price REAL DEFAULT 0,
            wholesale_cost_price REAL DEFAULT 0,
            wholesale_price REAL DEFAULT 0,
            company_id INTEGER,
            pieces_per_carton INTEGER DEFAULT 12
        )`);
    });
    transaction();
    return { success: true, slug };
}

function deleteCategory(slug) {
    const transaction = db.transaction(() => {
        db.prepare('DELETE FROM category_labels WHERE slug = ?').run(slug);
        db.prepare('DELETE FROM favorites WHERE category_slug = ?').run(slug);
        db.exec(`DROP TABLE IF EXISTS products_${slug}`);
    });
    transaction();
    return { success: true };
}

// ------ PROPOSALS ------
function getProposals() {
  return db.prepare('SELECT * FROM proposals ORDER BY id DESC').all();
}

function getProposal(id) {
  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  if (proposal) {
    proposal.items = db.prepare('SELECT * FROM proposal_items WHERE proposal_id = ?').all(id);
  }
  return proposal;
}

function getNextProposalNumber() {
  const last = db.prepare('SELECT proposal_number FROM proposals ORDER BY id DESC LIMIT 1').get();
  if (!last) return 'INV-1';
  
  // Try to match INV- first, then fallback to SE- for legacy support
  let match = last.proposal_number.match(/INV-(\d+)/);
  if (!match) match = last.proposal_number.match(/SE-(\d+)/);
  
  if (match) {
    const num = parseInt(match[1]) + 1;
    return `INV-${num}`;
  }
  return 'INV-1';
}

function getNextCustomerName() {
  const last = db.prepare("SELECT customer_name FROM proposals WHERE customer_name LIKE 'Customer-%' OR customer_name LIKE 'CST-%' ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'Customer-1';
  
  const match = last.customer_name.match(/(?:Customer|CST)-(\d+)/);
  if (match) {
    const num = parseInt(match[1]) + 1;
    return `Customer-${num}`;
  }
  return 'Customer-1';
}

function getProductTable(section) {
  if (!section) return null;
  const stockMap = {
    pnl: 'panels', inv: 'inverters', str: 'structures', cab: 'cables',
    brk: 'breakers', bat: 'batteries', msc: 'misc', oth: 'others'
  };
  const tableSlug = stockMap[section] || section;
  const tableName = `products_${tableSlug}`;
  try {
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
    return exists ? tableName : null;
  } catch (e) {
    return null;
  }
}

function saveProposal(data) {
  const { items, ...proposalData } = data;
  let proposalId;
  const transaction = db.transaction(() => {
    // Determine existing columns in proposals table to avoid unknown column errors
    const tableInfo = db.prepare("PRAGMA table_info(proposals)").all();
    const columns = tableInfo.map(c => c.name);
    const cleanData = {};
    for (const [k, v] of Object.entries(proposalData)) {
      if (columns.includes(k)) cleanData[k] = v;
    }

    if (proposalData.id) {
      proposalId = proposalData.id;

      // 1. Restore previous items to stock before updating
      const oldItems = db.prepare('SELECT item_id, section, qty FROM proposal_items WHERE proposal_id = ?').all(proposalId);
      for (const oldItem of oldItems) {
        if (oldItem.item_id && oldItem.section) {
          const table = getProductTable(oldItem.section);
          if (table) {
            try {
              db.prepare(`UPDATE ${table} SET current_stock = ROUND(current_stock + ?, 2) WHERE id = ?`).run(oldItem.qty, oldItem.item_id);
            } catch (stockErr) {
              console.error(`[STOCK RESTORE EDIT] Failed to restore for ${table}:`, stockErr);
            }
          }
        }
      }

      const updates = Object.keys(cleanData).filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE proposals SET ${updates} WHERE id = @id`).run(cleanData);
      db.prepare('DELETE FROM proposal_items WHERE proposal_id = ?').run(proposalId);
    } else {
      const keys = Object.keys(cleanData);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO proposals (${keys.join(', ')}) VALUES (${placeholders})`).run(cleanData);
      proposalId = info.lastInsertRowid;
    }

    if (items && items.length > 0) {
      const stmt = db.prepare(`INSERT INTO proposal_items (proposal_id, item_id, section, description, qty, unit, unit_cost, unit_retail, unit_discounted, line_cost, line_retail, line_profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      for (const item of items) {
        const discPrice = (item.unit_discounted !== undefined && item.unit_discounted !== null) ? item.unit_discounted : item.unit_retail;
        stmt.run(proposalId, item.item_id, item.section, item.description, item.qty, item.unit, item.unit_cost, item.unit_retail, discPrice, item.line_cost, item.line_retail, item.line_profit);
        
        // Deduct stock for all completed/saved sales (both new and edited)
        if (item.item_id && item.section) {
            const table = getProductTable(item.section);
            if (table) {
              try {
                db.prepare(`UPDATE ${table} SET current_stock = MAX(0, ROUND(current_stock - ?, 2)) WHERE id = ?`).run(item.qty, item.item_id);
              } catch(stockErr) {
                console.error(`[STOCK DEDUCT] Failed to deduct for ${table}:`, stockErr);
              }
            }
        }
      }
    }
  });
  transaction();
  return proposalId;
}

function deleteProposal(id) {
  const transaction = db.transaction(() => {
    // 1. Restore all items sold in this proposal back to current_stock
    const items = db.prepare('SELECT item_id, section, qty FROM proposal_items WHERE proposal_id = ?').all(id);
    for (const item of items) {
      if (item.item_id && item.section) {
        const table = getProductTable(item.section);
        if (table) {
          try {
            db.prepare(`UPDATE ${table} SET current_stock = ROUND(current_stock + ?, 2) WHERE id = ?`).run(item.qty, item.item_id);
          } catch (stockErr) {
            console.error(`[STOCK RESTORE DELETE] Failed to restore for ${table}:`, stockErr);
          }
        }
      }
    }

    db.prepare('DELETE FROM proposal_items WHERE proposal_id = ?').run(id);
    db.prepare('DELETE FROM proposals WHERE id = ?').run(id);
  });
  transaction();
}

function updateProposalStatus(id, status) {
  db.prepare('UPDATE proposals SET status = ? WHERE id = ?').run(status, id);
}

function receivePayment(idOrNumber, addedAmount, paymentMethod = 'Cash') {
  let p;
  if (typeof idOrNumber === 'number' || (!isNaN(idOrNumber) && !String(idOrNumber).startsWith('INV-'))) {
    p = db.prepare('SELECT id, proposal_number, retail_total, received_amount FROM proposals WHERE id = ?').get(idOrNumber);
  }
  if (!p) {
    p = db.prepare('SELECT id, proposal_number, retail_total, received_amount FROM proposals WHERE proposal_number = ?').get(String(idOrNumber).replace(/^#/, ''));
  }
  if (!p) return null;
  
  const newReceived = (p.received_amount || 0) + Number(addedAmount || 0);
  const status = newReceived >= (p.retail_total || 0) ? 'Paid' : 'Partial';
  
  db.prepare('UPDATE proposals SET received_amount = ?, status = ?, payment_method = ? WHERE id = ?').run(newReceived, status, paymentMethod, p.id);
  return { newReceived, status, id: p.id, proposalNumber: p.proposal_number };
}

// ------ EXPENSES ------
function getExpenses(filters) {
  let sql = 'SELECT * FROM expenses';
  let params = [];
  
  if (filters && filters.month !== undefined && filters.year !== undefined) {
    const monthStr = String(filters.month + 1).padStart(2, '0');
    sql += ' WHERE date LIKE ?';
    params.push(`${filters.year}-${monthStr}-%`);
  }
  
  sql += ' ORDER BY date DESC';
  return db.prepare(sql).all(...params);
}

function saveExpense(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE expenses SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO expenses (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteExpense(id) {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

function getExpenseCategories() {
  return db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();
}

function addExpenseCategory(name) {
  try {
    const info = db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(name);
    return info.lastInsertRowid;
  } catch (e) {
    return { error: 'Category already exists or error occurred' };
  }
}

function deleteExpenseCategory(id) {
  db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);
}

function getExpensesSummary(filters) {
  const now = new Date();
  let m = now.getMonth();
  let y = now.getFullYear();

  if (filters && filters.month !== undefined && filters.year !== undefined) {
    m = filters.month;
    y = filters.year;
  }

  const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const monthTotal = db.prepare(`SELECT SUM(amount) as s FROM expenses WHERE date LIKE '${monthStr}-%'`).get().s || 0;
  const dailyTotal = db.prepare("SELECT SUM(amount) as s FROM expenses WHERE substr(date, 1, 10) = ?").get(todayStr)?.s || 0;
  const salariesTotal = db.prepare(`SELECT SUM(amount) as s FROM expenses WHERE LOWER(category) LIKE '%salary%' AND date LIKE '${monthStr}-%'`).get().s || 0;
  
  return { selectedMonth: monthTotal, daily: dailyTotal, salaries: salariesTotal };
}

// ------ EMPLOYEES ------
function getEmployees(status) {
  if (status && status !== 'All') {
    return db.prepare('SELECT * FROM employees WHERE status = ? ORDER BY full_name').all(status);
  }
  return db.prepare('SELECT * FROM employees ORDER BY full_name').all();
}

function saveEmployee(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE employees SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO employees (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteEmployee(id) {
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
}

// ------ COMPANIES ------
function getCompanies() {
  return db.prepare('SELECT * FROM companies ORDER BY name ASC').all();
}

function saveCompany(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE companies SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO companies (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteCompany(id) {
  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
}

// ------ CUSTOMERS ------
function getCustomers() {
  return db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
}

function saveCustomer(data) {
  let customerId;
  const transaction = db.transaction(() => {
    if (data.id) {
      const { id, ...updates } = data;
      const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE customers SET ${clause} WHERE id = @id`).run(data);
      customerId = data.id;
    } else {
      const keys = Object.keys(data);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO customers (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
      customerId = info.lastInsertRowid;
    }
  });
  transaction();
  return customerId;
}

function deleteCustomer(id) {
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
}

// ------ DASHBOARD ------
function getDashboardStats(filter = 'daily') {
  console.log('[DASHBOARD] Fetching stats with filter:', filter);
  let period = typeof filter === 'string' ? filter : (filter.period || 'daily');
  
  let propConditions = [];
  let expConditions = [];
  let propParams = [];
  let expParams = [];
  let topSoldConditions = [];
  let topSoldParams = [];

  if (period === 'daily') {
    const targetDate = (typeof filter === 'object' && filter.targetDate) ? filter.targetDate : null;
    if (targetDate) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetDate);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) = ?");
      expParams.push(targetDate);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetDate);
    } else {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') = date('now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) = date('now', 'localtime')");
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = date('now', 'localtime')");
    }
  } else if (period === 'monthly') {
    let targetMonth = null;
    if (typeof filter === 'object') {
      if (filter.targetMonth) {
        targetMonth = filter.targetMonth;
      } else if (filter.year && filter.month) {
        targetMonth = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
      }
    }
    if (targetMonth) {
      propConditions.push("strftime('%Y-%m', COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetMonth);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 7) = ?");
      expParams.push(targetMonth);
      topSoldConditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetMonth);
    } else {
      propConditions.push("strftime('%Y-%m', COALESCE(date, created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 7) = strftime('%Y-%m', 'now', 'localtime')");
      topSoldConditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
    }
  } else if (period === 'annual') {
    let targetYear = null;
    if (typeof filter === 'object') {
      if (filter.targetYear) targetYear = String(filter.targetYear);
      else if (filter.year) targetYear = String(filter.year);
    }
    if (targetYear) {
      propConditions.push("strftime('%Y', COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetYear);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 4) = ?");
      expParams.push(targetYear);
      topSoldConditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetYear);
    } else {
      propConditions.push("strftime('%Y', COALESCE(date, created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 4) = strftime('%Y', 'now', 'localtime')");
      topSoldConditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
    }
  } else if (period === 'custom') {
    let start = typeof filter === 'object' && filter.startDate ? filter.startDate : '';
    let end = typeof filter === 'object' && filter.endDate ? filter.endDate : '';
    if (start && end) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') >= ? AND date(COALESCE(date, created_at), 'localtime') <= ?");
      propParams.push(start, end);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ? AND substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?");
      expParams.push(start, end);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') >= ? AND date(COALESCE(p.date, p.created_at), 'localtime') <= ?");
      topSoldParams.push(start, end);
    } else if (start) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') >= ?");
      propParams.push(start);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ?");
      expParams.push(start);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') >= ?");
      topSoldParams.push(start);
    } else if (end) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') <= ?");
      propParams.push(end);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?");
      expParams.push(end);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') <= ?");
      topSoldParams.push(end);
    }
  }

  const propWhereClause = propConditions.length > 0 ? "WHERE " + propConditions.join(" AND ") : "";
  const expWhereClause = expConditions.length > 0 ? "WHERE " + expConditions.join(" AND ") : "";
  const topSoldWhereClause = topSoldConditions.length > 0 ? "WHERE " + topSoldConditions.join(" AND ") : "";

  const proposalCount = db.prepare(`SELECT COUNT(*) as c FROM proposals ${propWhereClause}`).get(...propParams)?.c || 0;
  const revenueStr = db.prepare(`SELECT SUM(retail_total) as r FROM proposals ${propWhereClause}`).get(...propParams)?.r || 0;
  const profitStr = db.prepare(`SELECT SUM(profit) as p FROM proposals ${propWhereClause}`).get(...propParams)?.p || 0;
  const discountStr = db.prepare(`SELECT SUM(discount) as d FROM proposals ${propWhereClause}`).get(...propParams)?.d || 0;
  const expensesStr = db.prepare(`SELECT SUM(amount) as a FROM expenses ${expWhereClause}`).get(...expParams)?.a || 0;

  const employeesCount = db.prepare("SELECT COUNT(*) as c FROM employees WHERE status = 'Active'").get()?.c || 0;
  const totalCustomers = db.prepare("SELECT COUNT(*) as c FROM customers").get()?.c || 0;
  const totalVendors = db.prepare("SELECT COUNT(*) as c FROM companies").get()?.c || 0;
  const totalReceivables = db.prepare("SELECT COALESCE(SUM(amount), 0) as r FROM customers WHERE amount > 0").get()?.r || 0;

  let totalStockUnits = 0;
  let totalStockValuation = 0;
  try {
    const labels = getCategoryLabels();
    labels.forEach(l => {
      const row = db.prepare(`SELECT SUM(current_stock) as s, SUM(current_stock * cost_price) as val FROM products_${l.slug}`).get();
      totalStockUnits += (row?.s || 0);
      totalStockValuation += (row?.val || 0);
    });
  } catch(e) {}

  const recentProposals = db.prepare(`SELECT proposal_number, customer_name, shop_name, phone, date, retail_total, received_amount, status FROM proposals ${propWhereClause} ORDER BY id DESC LIMIT 5`).all(...propParams);
  const recentExpenses = db.prepare(`SELECT date, category, amount, description FROM expenses ${expWhereClause} ORDER BY id DESC LIMIT 5`).all(...expParams);

  // Top Sold for the specific period
  const topSold = db.prepare(`
    SELECT pi.description, SUM(pi.qty) as qty 
    FROM proposal_items pi 
    JOIN proposals p ON pi.proposal_id = p.id 
    ${topSoldWhereClause}
    GROUP BY pi.description 
    ORDER BY qty DESC 
    LIMIT 1
  `).get(...topSoldParams) || { description: '-', qty: 0 };

  // Handle "Name - Desc" format for Dashboard display
  let itemName = topSold.description || '-';
  if (itemName.includes(' - ')) {
    itemName = itemName.split(' - ')[0];
  }

  // Fetch available years for dashboard dropdowns
  const currentYr = new Date().getFullYear();
  const yearsSet = new Set([currentYr, currentYr - 1, currentYr - 2]);
  try {
    const yrRows = db.prepare("SELECT DISTINCT strftime('%Y', COALESCE(date, created_at), 'localtime') as yr FROM proposals WHERE yr IS NOT NULL").all();
    yrRows.forEach(r => { if (r.yr) yearsSet.add(parseInt(r.yr)); });
  } catch(e) {}
  const availableYears = Array.from(yearsSet).filter(Boolean).sort((a, b) => b - a);

  return {
    proposalCount,
    totalRevenue: revenueStr,
    totalProfit: profitStr,
    totalDiscount: discountStr,
    totalExpenses: expensesStr,
    activeEmployees: employeesCount,
    topSold: itemName,
    recentProposals,
    recentExpenses,
    totalCustomers,
    totalVendors,
    totalReceivables,
    totalStockUnits,
    totalStockValuation,
    availableYears
  };
}

// ------ SALES STATS ------
function getItemSales(section, period, targetDate = null) {
  const params = [];
  const conditions = [];

  if (section && section !== 'all') {
    const slugToCode = {
      'panels': 'pnl', 'inverters': 'inv', 'structures': 'str', 'cables': 'cab',
      'breakers': 'brk', 'batteries': 'bat', 'misc': 'msc', 'others': 'oth'
    };
    const codeToSlug = {
      'pnl': 'panels', 'inv': 'inverters', 'str': 'structures', 'cab': 'cables',
      'brk': 'breakers', 'bat': 'batteries', 'msc': 'msc', 'oth': 'others'
    };

    const alt = slugToCode[section] || codeToSlug[section];
    if (alt) {
        conditions.push("(pi.section = ? OR pi.section = ?)");
        params.push(section, alt);
    } else {
        conditions.push("pi.section = ?");
        params.push(section);
    }
  }

  if (period === 'daily') {
    if (targetDate) {
      conditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(targetDate);
    } else {
      conditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = date('now', 'localtime')");
    }
  } else if (period === 'monthly') {
    if (targetDate) {
      conditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(targetDate);
    } else {
      conditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
    }
  } else if (period === 'annual') {
    if (targetDate) {
      conditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(String(targetDate));
    } else {
      conditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
    }
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const joinClause = "JOIN proposals p ON pi.proposal_id = p.id";

  const sql = `
    SELECT 
      pi.description,
      pi.section,
      SUM(pi.qty) as total_qty,
      SUM(pi.line_cost) as total_cost,
      SUM(pi.line_retail) as total_revenue,
      SUM(pi.line_profit) as total_profit
    FROM proposal_items pi
    ${joinClause}
    ${whereClause}
    GROUP BY pi.description, pi.section
    ORDER BY total_qty DESC
  `;

  console.log("[STATS] Executing SQL:", sql);
  console.log("[STATS] Params:", params);

  return db.prepare(sql).all(...params);
}

function getReportSummary(filters) {
  const { start, end } = filters;
  
  // Sales Summary
  const sales = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(retail_total) as amount,
      SUM(cost_total) as cost,
      SUM(profit) as profit
    FROM proposals 
    WHERE date(COALESCE(date, created_at), 'localtime') >= ? AND date(COALESCE(date, created_at), 'localtime') <= ?
  `).get(start, end) || { count: 0, amount: 0, cost: 0, profit: 0 };
  
  const itemsRow = db.prepare(`
    SELECT SUM(qty) as items
    FROM proposal_items pi
    JOIN proposals p ON pi.proposal_id = p.id
    WHERE date(COALESCE(p.date, p.created_at), 'localtime') >= ? AND date(COALESCE(p.date, p.created_at), 'localtime') <= ?
  `).get(start, end);
  const itemsSold = (itemsRow && itemsRow.items) || 0;

  // Expenses Summary
  const expenses = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(amount) as amount
    FROM expenses
    WHERE substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ? AND substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?
  `).get(start, end) || { count: 0, amount: 0 };

  // Vendor Balances (Current total)
  const vendors = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(amount) as amount
    FROM companies
  `).get() || { count: 0, amount: 0 };

  return {
    sales: {
      count: sales.count || 0,
      amount: sales.amount || 0,
      cost: sales.cost || 0,
      profit: sales.profit || 0,
      itemsSold: itemsSold
    },
    expenses: {
      count: expenses.count || 0,
      amount: expenses.amount || 0
    },
    vendors: {
      count: vendors.count || 0,
      amount: vendors.amount || 0
    }
  };
}

function getAllProposalItems() {
  const sql = `
    SELECT 
      pi.id,
      pi.proposal_id,
      pi.item_id,
      pi.section,
      pi.description,
      pi.qty,
      pi.unit,
      pi.unit_cost,
      pi.unit_retail,
      pi.unit_discounted,
      pi.line_cost,
      pi.line_retail,
      pi.line_profit,
      p.proposal_number,
      p.customer_name,
      p.phone,
      p.seller_name,
      p.payment_method,
      p.sale_mode,
      p.date,
      p.created_at
    FROM proposal_items pi
    JOIN proposals p ON pi.proposal_id = p.id
    ORDER BY p.id DESC, pi.id ASC
  `;
  return db.prepare(sql).all();
}

function getShops() {
  return db.prepare('SELECT * FROM shops ORDER BY name ASC').all();
}

function getShop(id) {
  return db.prepare('SELECT * FROM shops WHERE id = ?').get(id);
}

function saveShop(data) {
  let shopId;
  const transaction = db.transaction(() => {
    if (data.id) {
      const { id, ...updates } = data;
      const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE shops SET ${clause} WHERE id = @id`).run(data);
      shopId = data.id;
    } else {
      const keys = Object.keys(data);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO shops (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
      shopId = info.lastInsertRowid;
    }
  });
  transaction();
  return shopId;
}

function deleteShop(id) {
  db.prepare('DELETE FROM shops WHERE id = ?').run(id);
}

function getUnits() {
  return db.prepare('SELECT * FROM product_units ORDER BY name ASC').all();
}

function addUnit(name) {
  try {
    return db.prepare('INSERT INTO product_units (name) VALUES (?)').run(name.toUpperCase());
  } catch(e) { return { error: e.message }; }
}

function updateUnit(id, name) {
  try {
    return db.prepare('UPDATE product_units SET name = ? WHERE id = ?').run(name.toUpperCase(), id);
  } catch(e) { return { error: e.message }; }
}

function deleteUnit(id) {
  try {
    return db.prepare('DELETE FROM product_units WHERE id = ?').run(id);
  } catch(e) { return { error: e.message }; }
}



function close() {
  try {
    if (db && db.open) db.close();
  } catch(e) {}
}


async function backupDatabase(destinationPath) {
  if (!db) throw new Error('Database not initialized');
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {
    console.error('WAL checkpoint error during backup:', e);
  }
  try {
    if (typeof db.backup === 'function') {
      await db.backup(destinationPath);
      return { success: true, path: destinationPath };
    }
  } catch (e) {
    console.warn('db.backup failed, falling back to VACUUM INTO / copy:', e);
  }
  try {
    if (fs.existsSync(destinationPath)) {
      fs.unlinkSync(destinationPath);
    }
    db.prepare('VACUUM INTO ?').run(destinationPath);
    return { success: true, path: destinationPath };
  } catch (e) {
    const dbPath = getDbPath();
    fs.copyFileSync(dbPath, destinationPath);
    return { success: true, path: destinationPath };
  }
}

// Rate History & Stock Management Functions
function addProductStock(data) {
  const {
    category,
    productId,
    addedQty = 0,
    purchasePrice = 0,
    retailPrice = null,
    wholesalePrice = null,
    source = 'Manual Stock Add',
    notes = ''
  } = data;

  const current = db.prepare(`SELECT * FROM products_${category} WHERE id = ?`).get(productId);
  if (!current) throw new Error('Product not found');

  const oldStock = Number(current.current_stock) || 0;
  const oldCost = Number(current.cost_price) || 0;
  const inQty = Number(addedQty) || 0;
  const inPrice = Number(purchasePrice) || 0;

  let newCost = inPrice;
  if (oldStock > 0 && oldCost > 0 && inQty > 0) {
    const totalOldVal = oldStock * oldCost;
    const totalInVal = inQty * inPrice;
    const totalQty = oldStock + inQty;
    newCost = totalQty > 0 ? (totalOldVal + totalInVal) / totalQty : inPrice;
  }
  newCost = Math.round(newCost * 100) / 100;

  const newStock = Math.round((Math.max(0, oldStock) + inQty) * 100) / 100;
  const newRetail = (retailPrice !== null && retailPrice !== undefined && retailPrice !== '') 
    ? Number(retailPrice) 
    : (current.retail_price || 0);
  const newWholesale = (wholesalePrice !== null && wholesalePrice !== undefined && wholesalePrice !== '')
    ? Number(wholesalePrice)
    : (current.wholesale_price || current.retail_price || 0);

  const stmt = db.prepare(`
    UPDATE products_${category} 
    SET current_stock = ?, cost_price = ?, wholesale_cost_price = ?, retail_price = ?, wholesale_price = ?
    WHERE id = ?
  `);
  stmt.run(newStock, newCost, newCost, newRetail, newWholesale, productId);

  const historyStmt = db.prepare(`
    INSERT INTO product_rate_history (
      category_slug, product_id, item_name,
      old_stock, added_qty, new_stock,
      old_cost_price, purchase_price, new_cost_price,
      retail_price, wholesale_price, source, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);

  const itemName = current.item_name || current.description || 'Product #' + productId;
  const result = historyStmt.run(
    category, productId, itemName,
    oldStock, inQty, newStock,
    oldCost, inPrice, newCost,
    newRetail, newWholesale, source, notes
  );

  return {
    success: true,
    newStock,
    newCost,
    retailPrice: newRetail,
    wholesalePrice: newWholesale,
    historyId: result.lastInsertRowid
  };
}

function getRateHistory(category = null, productId = null) {
  let sql = `SELECT * FROM product_rate_history`;
  const params = [];
  if (category && productId) {
    sql += ` WHERE category_slug = ? AND product_id = ?`;
    params.push(category, productId);
  } else if (category) {
    sql += ` WHERE category_slug = ?`;
    params.push(category);
  }
  sql += ` ORDER BY id DESC LIMIT 500`;
  return db.prepare(sql).all(...params);
}

function deleteRateHistory(id) {
  return db.prepare('DELETE FROM product_rate_history WHERE id = ?').run(id);
}

function getAllRatesList() {
  const labels = getCategoryLabels();
  let allItems = [];
  
  const histStmt = db.prepare(`
    SELECT created_at, purchase_price, old_cost_price, new_cost_price, source, added_qty 
    FROM product_rate_history 
    WHERE category_slug = ? AND product_id = ? AND purchase_price > 0
    ORDER BY id DESC LIMIT 1
  `);

  labels.forEach(l => {
    const cat = l.slug;
    const catLabel = l.label;
    try {
      const rows = db.prepare(`
        SELECT p.*, '${cat}' as slug, '${catLabel.replace(/'/g, "''")}' as category_label
        FROM products_${cat} p
        ORDER BY p.item_name ASC
      `).all();

      rows.forEach(r => {
        const cost = Number(r.cost_price) || 0;
        const retail = Number(r.retail_price) || 0;
        const profit = retail - cost;
        const profitPct = cost > 0 ? ((profit / cost) * 100) : 0;
        
        let latestHist = null;
        try {
          latestHist = histStmt.get(cat, r.id);
        } catch(e) {}

        allItems.push({
          id: r.id,
          slug: cat,
          category_label: catLabel,
          item_name: r.item_name || r.description || `Item #${r.id}`,
          description: r.description || '',
          unit: r.unit || 'pcs',
          current_stock: r.current_stock || 0,
          cost_price: cost,
          retail_price: retail,
          wholesale_price: r.wholesale_price || retail,
          profit: profit,
          profit_margin_pct: Math.round(profitPct * 10) / 10,
          last_update: latestHist ? latestHist.created_at : null,
          last_purchase_price: latestHist ? latestHist.purchase_price : null,
          last_added_qty: latestHist ? latestHist.added_qty : null
        });
      });
    } catch (e) {
      console.error(`Error loading rates for ${cat}:`, e);
    }
  });

  return allItems;
}

function markProposalPaid(idOrNumber) {
  let p = null;
  if (typeof idOrNumber === 'number' || (!isNaN(Number(idOrNumber)) && !String(idOrNumber).includes('INV') && !String(idOrNumber).includes('-'))) {
    p = db.prepare('SELECT id, retail_total FROM proposals WHERE id = ?').get(Number(idOrNumber));
  }
  if (!p) {
    const cleanNum = String(idOrNumber).replace(/^#/, '').trim();
    p = db.prepare('SELECT id, retail_total FROM proposals WHERE proposal_number = ? OR proposal_number = ? OR id = ?').get(cleanNum, 'INV-' + cleanNum, Number(cleanNum) || 0);
  }
  if (!p) return { error: 'Proposal not found' };

  db.prepare("UPDATE proposals SET received_amount = retail_total, status = 'Paid' WHERE id = ?").run(p.id);
  return { success: true, id: p.id };
}



// ==========================================
// ICE CREAM FACTORY 5-STAGE WORKFLOW MODULE
// ==========================================

// Helper functions for Ice Cream Factory
function createIcecreamFactoryTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS raw_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      unit TEXT NOT NULL,
      current_stock REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      min_stock_alert REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS raw_material_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES raw_materials(id),
      material_name TEXT,
      qty REAL NOT NULL,
      unit TEXT,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      supplier_name TEXT,
      invoice_no TEXT,
      date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS raw_material_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      material_name TEXT,
      action TEXT,
      qty_change REAL,
      stock_before REAL,
      stock_after REAL,
      reference_id INTEGER,
      date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS icecream_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      flavor TEXT,
      unit_cost REAL DEFAULT 0,
      retail_piece_price REAL DEFAULT 0,
      current_single_stock INTEGER DEFAULT 0,
      default_pcs_per_carton INTEGER DEFAULT 20,
      barcode TEXT,
      image_path TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS production_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_number TEXT UNIQUE,
      date TEXT NOT NULL,
      item_id INTEGER NOT NULL REFERENCES icecream_items(id),
      item_name TEXT NOT NULL,
      produced_pieces INTEGER NOT NULL,
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      raw_materials_summary TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS production_batch_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
      material_id INTEGER NOT NULL,
      material_name TEXT NOT NULL,
      qty_used REAL NOT NULL,
      unit TEXT NOT NULL,
      unit_cost REAL DEFAULT 0,
      line_cost REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS packed_cartons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES icecream_items(id),
      item_name TEXT NOT NULL,
      carton_name TEXT NOT NULL,
      pieces_per_carton INTEGER NOT NULL,
      carton_cost_price REAL DEFAULT 0,
      carton_sale_price REAL NOT NULL,
      carton_wholesale_price REAL DEFAULT 0,
      factory_carton_stock INTEGER DEFAULT 0,
      barcode TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS packing_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      packing_number TEXT UNIQUE,
      date TEXT NOT NULL,
      carton_id INTEGER NOT NULL REFERENCES packed_cartons(id),
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      cartons_packed INTEGER NOT NULL,
      pieces_per_carton INTEGER NOT NULL,
      total_pieces_consumed INTEGER NOT NULL,
      carton_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      carton_sale_price REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_number TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      phone TEXT,
      area TEXT,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      address TEXT,
      city TEXT DEFAULT 'Wah Cantt',
      amount REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS car_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL REFERENCES cars(id),
      carton_id INTEGER NOT NULL REFERENCES packed_cartons(id),
      cartons_loaded INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(car_id, carton_id)
    );

    CREATE TABLE IF NOT EXISTS car_loading_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_no TEXT UNIQUE,
      car_id INTEGER NOT NULL REFERENCES cars(id),
      date TEXT NOT NULL,
      total_cartons INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS car_loading_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL REFERENCES car_loading_batches(id) ON DELETE CASCADE,
      carton_id INTEGER NOT NULL,
      carton_name TEXT NOT NULL,
      pieces_per_carton INTEGER NOT NULL,
      cartons_loaded INTEGER NOT NULL,
      sale_price REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shop_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE,
      date TEXT NOT NULL,
      shop_id INTEGER,
      shop_name TEXT NOT NULL,
      shop_phone TEXT,
      shop_address TEXT,
      car_id INTEGER REFERENCES cars(id),
      car_number TEXT,
      driver_name TEXT,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      received_amount REAL DEFAULT 0,
      previous_balance REAL DEFAULT 0,
      remaining_balance REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'Cash',
      notes TEXT,
      status TEXT DEFAULT 'Completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shop_delivery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER NOT NULL REFERENCES shop_deliveries(id) ON DELETE CASCADE,
      carton_id INTEGER NOT NULL,
      carton_name TEXT NOT NULL,
      pieces_per_carton INTEGER NOT NULL,
      ordered_cartons INTEGER DEFAULT 0,
      delivered_cartons INTEGER NOT NULL,
      returned_cartons INTEGER DEFAULT 0,
      return_destination TEXT DEFAULT 'car',
      carton_price REAL NOT NULL,
      line_total REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shop_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_no TEXT UNIQUE,
      delivery_id INTEGER REFERENCES shop_deliveries(id),
      invoice_no TEXT,
      shop_id INTEGER REFERENCES shops(id),
      shop_name TEXT,
      car_id INTEGER REFERENCES cars(id),
      car_number TEXT,
      date TEXT NOT NULL,
      total_cartons_returned INTEGER DEFAULT 0,
      total_refund_amount REAL DEFAULT 0,
      return_destination TEXT DEFAULT 'car',
      adjustment_type TEXT DEFAULT 'khata',
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS shop_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES shop_returns(id) ON DELETE CASCADE,
      delivery_item_id INTEGER,
      carton_id INTEGER NOT NULL,
      carton_name TEXT NOT NULL,
      pieces_per_carton INTEGER DEFAULT 20,
      returned_cartons INTEGER NOT NULL,
      carton_price REAL NOT NULL,
      refund_amount REAL NOT NULL,
      return_destination TEXT DEFAULT 'car'
    );
    CREATE TABLE IF NOT EXISTS shop_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      receipt_no TEXT,
      date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    const carCols = db.prepare("PRAGMA table_info(cars)").all().map(c => c.name);
    if (!carCols.includes('is_active')) db.exec('ALTER TABLE cars ADD COLUMN is_active INTEGER DEFAULT 1');
    if (!carCols.includes('area')) db.exec('ALTER TABLE cars ADD COLUMN area TEXT');
  } catch(e) {}

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_inv_car ON car_inventory(car_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_car_inv_carton ON car_inventory(carton_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_del_date ON shop_deliveries(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_del_car ON shop_deliveries(car_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_del_shop ON shop_deliveries(shop_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prod_batches_date ON production_batches(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_packing_batches_date ON packing_batches(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_payments_shop ON shop_payments(shop_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_payments_date ON shop_payments(date)`);
  } catch (e) {}
}

function seedIcecreamFactoryData() {
  try {
    // 1. Raw Materials seed
    const rawCount = db.prepare('SELECT COUNT(*) as c FROM raw_materials').get().c;
    if (rawCount === 0) {
      const stmt = db.prepare('INSERT INTO raw_materials (name, category, unit, current_stock, cost_price, min_stock_alert) VALUES (?, ?, ?, ?, ?, ?)');
      const defaults = [
        ['Fresh Whole Milk', 'Dairy', 'Liter', 150, 180, 30],
        ['Refined Sugar', 'Sweeteners', 'Kg', 100, 150, 20],
        ['Dairy Cream (35%)', 'Dairy', 'Kg', 50, 650, 10],
        ['Cocoa & Chocolate Coating', 'Flavors & Coating', 'Kg', 30, 950, 5],
        ['Wooden Chocbar Sticks', 'Packaging & Sticks', 'Pcs', 5000, 0.8, 500],
        ['Ice Loly Sticks', 'Packaging & Sticks', 'Pcs', 3000, 0.5, 300],
        ['Ice Cream Wrappers & Foils', 'Packaging & Sticks', 'Pcs', 4000, 1.5, 500],
        ['Corrugated Outer Cartons', 'Packaging & Sticks', 'Pcs', 300, 35, 30],
        ['Pure Vanilla & Fruit Extracts', 'Flavors & Coating', 'Liter', 15, 850, 3]
      ];
      defaults.forEach(d => stmt.run(...d));
    }

    // 2. Ice Cream Items seed (single pieces)
    const itemCount = db.prepare('SELECT COUNT(*) as c FROM icecream_items').get().c;
    if (itemCount === 0) {
      const stmt = db.prepare('INSERT INTO icecream_items (name, flavor, unit_cost, retail_piece_price, current_single_stock, default_pcs_per_carton) VALUES (?, ?, ?, ?, ?, ?)');
      const defaults = [
        ['Chocbar', 'Rich Milk Chocolate', 10, 40, 100, 20],
        ['Ice Loly', 'Orange & Mango Twist', 7, 25, 80, 20],
        ['Mango Bar', 'Alphonso Mango', 12, 40, 60, 20],
        ['Kulfi Stick', 'Traditional Khoya Pista', 15, 50, 50, 20],
        ['Crunch Cone', 'Vanilla Chocolate Crisp', 20, 60, 40, 15]
      ];
      defaults.forEach(d => stmt.run(...d));
    }

    // 3. Packed Cartons seed (warehouse ready-to-sell inventory)
    const cartonCount = db.prepare('SELECT COUNT(*) as c FROM packed_cartons').get().c;
    if (cartonCount === 0) {
      const items = db.prepare('SELECT id, name, unit_cost, default_pcs_per_carton FROM icecream_items').all();
      const insertCarton = db.prepare('INSERT INTO packed_cartons (item_id, item_name, carton_name, pieces_per_carton, carton_cost_price, carton_sale_price, carton_wholesale_price, factory_carton_stock, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      
      const cartonSpecs = {
        'Chocbar': { pcs: 20, sale: 250, wholesale: 240, stock: 15 },
        'Ice Loly': { pcs: 20, sale: 200, wholesale: 190, stock: 10 },
        'Mango Bar': { pcs: 20, sale: 300, wholesale: 280, stock: 8 },
        'Kulfi Stick': { pcs: 20, sale: 380, wholesale: 360, stock: 6 },
        'Crunch Cone': { pcs: 15, sale: 420, wholesale: 400, stock: 5 }
      };

      items.forEach(item => {
        const spec = cartonSpecs[item.name] || { pcs: item.default_pcs_per_carton || 20, sale: 250, wholesale: 240, stock: 5 };
        const cost = (item.unit_cost || 10) * spec.pcs;
        const autoBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        insertCarton.run(item.id, item.name, `${item.name} Carton (${spec.pcs} Pcs)`, spec.pcs, cost, spec.sale, spec.wholesale, spec.stock, autoBarcode);
      });
    }

    // Ensure all packed cartons have a unique random 12-digit barcode for thermal sticker printing & scanning
    try {
      const unbarcoded = db.prepare("SELECT id FROM packed_cartons WHERE barcode IS NULL OR TRIM(barcode) = '' OR barcode LIKE '8900000000%'").all();
      if (unbarcoded && unbarcoded.length > 0) {
        const updateBc = db.prepare("UPDATE packed_cartons SET barcode = ? WHERE id = ?");
        unbarcoded.forEach(c => {
          const randCode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
          updateBc.run(randCode, c.id);
        });
      }
    } catch (e) {
      console.warn('Packed cartons barcode backfill check:', e);
    }

    // 4. Cars seed
    const carsCount = db.prepare('SELECT COUNT(*) as c FROM cars').get().c;
    if (carsCount === 0) {
      const insertCar = db.prepare('INSERT INTO cars (car_number, driver_name, phone, area) VALUES (?, ?, ?, ?)');
      const c1 = insertCar.run('Suzuki Bolan - LEA-4521', 'Muhammad Ali', '0301-5551234', 'Route 1: Wah Cantt & Taxila');
      const c2 = insertCar.run('Shahzore Van - RIP-8820', 'Tariq Shahzad', '0313-7778899', 'Route 2: Rawalpindi City & Saddar');

      // Seed initial loaded stock for car 1
      const cartons = db.prepare('SELECT id, carton_name FROM packed_cartons').all();
      if (cartons.length >= 2) {
        const loadStmt = db.prepare('INSERT INTO car_inventory (car_id, carton_id, cartons_loaded) VALUES (?, ?, ?)');
        loadStmt.run(c1.lastInsertRowid, cartons[0].id, 5); // 5 Chocbar cartons
        loadStmt.run(c1.lastInsertRowid, cartons[1].id, 4); // 4 Ice Loly cartons
      }
    }

    // 5. Shops seed
    const shopsCount = db.prepare('SELECT COUNT(*) as c FROM shops').get().c;
    if (shopsCount === 0) {
      const insertShop = db.prepare('INSERT INTO shops (name, owner_name, phone, address, city, amount) VALUES (?, ?, ?, ?, ?, ?)');
      insertShop.run('Madina Bakers & Cold Point', 'Haji Aslam', '0300-9876543', 'Main GT Road, Wah Cantt', 'Wah Cantt', 0);
      insertShop.run('Al-Rehman Super Store', 'M. Tariq', '0321-4567890', 'Barrier 3, Taxila', 'Taxila', 0);
      insertShop.run('Bismillah Karyana & Refreshment', 'Rashid Khan', '0333-1122334', 'Saddar Bazar, Rawalpindi', 'Rawalpindi', 0);
    }
  } catch (err) {
    console.error('Failed to seed ice cream factory data:', err);
  }
}


// Ice Cream Factory Methods

// --- STAGE 1: RAW MATERIALS ---
function getRawMaterials() {
  return db.prepare(`
    SELECT rm.*, 
           ROUND(rm.current_stock * rm.cost_price, 2) as total_value,
           (SELECT COUNT(*) FROM raw_material_logs rml WHERE rml.material_id = rm.id) as log_count
    FROM raw_materials rm
    ORDER BY rm.name ASC
  `).all();
}

function getRawMaterial(id) {
  return db.prepare('SELECT * FROM raw_materials WHERE id = ?').get(id);
}

function saveRawMaterial(data) {
  if (data.id) {
    db.prepare(`
      UPDATE raw_materials 
      SET name = ?, category = ?, unit = ?, current_stock = ?, cost_price = ?, min_stock_alert = ?, notes = ?
      WHERE id = ?
    `).run(
      data.name.trim(),
      data.category || 'General',
      data.unit || 'Kg',
      Number(data.current_stock) || 0,
      Number(data.cost_price) || 0,
      Number(data.min_stock_alert) || 0,
      data.notes || '',
      data.id
    );
    return { success: true, id: data.id };
  } else {
    const res = db.prepare(`
      INSERT INTO raw_materials (name, category, unit, current_stock, cost_price, min_stock_alert, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name.trim(),
      data.category || 'General',
      data.unit || 'Kg',
      Number(data.current_stock) || 0,
      Number(data.cost_price) || 0,
      Number(data.min_stock_alert) || 0,
      data.notes || ''
    );
    return { success: true, id: res.lastInsertRowid };
  }
}

function deleteRawMaterial(id) {
  const usage = db.prepare('SELECT COUNT(*) as c FROM production_batch_materials WHERE material_id = ?').get(id).c;
  if (usage > 0) {
    return { error: 'Cannot delete material that has been used in production batches.' };
  }
  db.prepare('DELETE FROM raw_material_logs WHERE material_id = ?').run(id);
  db.prepare('DELETE FROM raw_material_purchases WHERE material_id = ?').run(id);
  db.prepare('DELETE FROM raw_materials WHERE id = ?').run(id);
  return { success: true };
}

function addRawMaterialPurchase(data) {
  const mat = db.prepare('SELECT * FROM raw_materials WHERE id = ?').get(data.material_id);
  if (!mat) return { error: 'Raw material not found' };

  const qty = Number(data.qty) || 0;
  const unitCost = Number(data.unit_cost) || 0;
  const totalCost = qty * unitCost;
  const date = data.date || new Date().toISOString().split('T')[0];

  let purchaseId;
  const tx = db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO raw_material_purchases (material_id, material_name, qty, unit, unit_cost, total_cost, supplier_name, invoice_no, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mat.id,
      mat.name,
      qty,
      mat.unit,
      unitCost,
      totalCost,
      data.supplier_name || '',
      data.invoice_no || '',
      date,
      data.notes || ''
    );
    purchaseId = res.lastInsertRowid;

    const stockBefore = mat.current_stock;
    const stockAfter = stockBefore + qty;

    db.prepare('UPDATE raw_materials SET current_stock = ?, cost_price = ? WHERE id = ?').run(stockAfter, unitCost, mat.id);

    db.prepare(`
      INSERT INTO raw_material_logs (material_id, material_name, action, qty_change, stock_before, stock_after, reference_id, date, notes)
      VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?)
    `).run(
      mat.id,
      mat.name,
      qty,
      stockBefore,
      stockAfter,
      purchaseId,
      date,
      `Purchased ${qty} ${mat.unit} from ${data.supplier_name || 'Supplier'} @ Rs. ${unitCost}`
    );
  });

  tx();
  return { success: true, purchaseId, newStock: mat.current_stock + qty };
}

function getRawMaterialLogs(filters = {}) {
  let query = 'SELECT * FROM raw_material_logs WHERE 1=1';
  const params = [];

  if (filters.material_id) {
    query += ' AND material_id = ?';
    params.push(filters.material_id);
  }
  if (filters.action) {
    query += ' AND action = ?';
    params.push(filters.action);
  }
  if (filters.fromDate) {
    query += ' AND date >= ?';
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    query += ' AND date <= ?';
    params.push(filters.toDate);
  }

  query += ' ORDER BY id DESC LIMIT 200';
  return db.prepare(query).all(...params);
}

// --- STAGE 2: SINGLE ITEMS PRODUCTION ---
function getIcecreamItems() {
  return db.prepare(`
    SELECT ii.*,
           ROUND(ii.current_single_stock * ii.unit_cost, 2) as total_stock_cost,
           ROUND(ii.current_single_stock * ii.retail_piece_price, 2) as total_stock_retail,
           (SELECT COUNT(*) FROM packed_cartons pc WHERE pc.item_id = ii.id) as carton_variants_count
    FROM icecream_items ii
    ORDER BY ii.name ASC
  `).all();
}

function getIcecreamItem(id) {
  return db.prepare('SELECT * FROM icecream_items WHERE id = ?').get(id);
}

function saveIcecreamItem(data) {
  if (data.id) {
    db.prepare(`
      UPDATE icecream_items 
      SET name = ?, flavor = ?, unit_cost = ?, retail_piece_price = ?, current_single_stock = ?, default_pcs_per_carton = ?, barcode = ?, image_path = ?, notes = ?
      WHERE id = ?
    `).run(
      data.name.trim(),
      data.flavor || '',
      Number(data.unit_cost) || 0,
      Number(data.retail_piece_price) || 0,
      Number(data.current_single_stock) || 0,
      Number(data.default_pcs_per_carton) || 20,
      data.barcode || '',
      data.image_path || '',
      data.notes || '',
      data.id
    );
    // Also update name on associated packed cartons if exists
    db.prepare('UPDATE packed_cartons SET item_name = ? WHERE item_id = ?').run(data.name.trim(), data.id);
    return { success: true, id: data.id };
  } else {
    const res = db.prepare(`
      INSERT INTO icecream_items (name, flavor, unit_cost, retail_piece_price, current_single_stock, default_pcs_per_carton, barcode, image_path, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name.trim(),
      data.flavor || '',
      Number(data.unit_cost) || 0,
      Number(data.retail_piece_price) || 0,
      Number(data.current_single_stock) || 0,
      Number(data.default_pcs_per_carton) || 20,
      data.barcode || '',
      data.image_path || '',
      data.notes || ''
    );
    const newId = res.lastInsertRowid;
    // Auto-create default packed carton configuration if none exists
    const defaultPcs = Number(data.default_pcs_per_carton) || 20;
    const cost = (Number(data.unit_cost) || 10) * defaultPcs;
    const sale = (Number(data.retail_piece_price) || 20) * defaultPcs * 0.8; // default 20% discount wholesale
    db.prepare(`
      INSERT INTO packed_cartons (item_id, item_name, carton_name, pieces_per_carton, carton_cost_price, carton_sale_price, carton_wholesale_price, factory_carton_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(newId, data.name.trim(), `${data.name.trim()} Carton (${defaultPcs} Pcs)`, defaultPcs, cost, sale, sale);

    return { success: true, id: newId };
  }
}

function deleteIcecreamItem(id) {
  const cartons = db.prepare('SELECT COUNT(*) as c FROM packed_cartons WHERE item_id = ?').get(id).c;
  if (cartons > 0) {
    return { error: 'Please remove associated packed cartons first before deleting this item.' };
  }
  db.prepare('DELETE FROM production_batches WHERE item_id = ?').run(id);
  db.prepare('DELETE FROM icecream_items WHERE id = ?').run(id);
  return { success: true };
}

function runProductionBatch(data) {
  const item = db.prepare('SELECT * FROM icecream_items WHERE id = ?').get(data.item_id);
  if (!item) return { error: 'Ice cream item not found' };

  const pieces = Number(data.produced_pieces) || 0;
  if (pieces <= 0) return { error: 'Produced pieces must be greater than 0' };

  const unitCost = Number(data.unit_cost) || Number(item.unit_cost) || 0;
  const totalCost = pieces * unitCost;
  const date = data.date || new Date().toISOString().split('T')[0];

  // Generate unique batch number
  const todayStr = date.replace(/-/g, '');
  const countToday = db.prepare('SELECT COUNT(*) as c FROM production_batches WHERE date = ?').get(date).c + 1;
  const batchNumber = `PRD-${todayStr}-${String(countToday).padStart(3, '0')}`;

  let batchId;
  const materialsSummaryList = [];

  const tx = db.transaction(() => {
    // 1. Check & deduct raw materials if specified
    if (Array.isArray(data.materials) && data.materials.length > 0) {
      for (const matUsage of data.materials) {
        const matId = matUsage.material_id;
        const qtyUsed = Number(matUsage.qty_used) || 0;
        if (matId && qtyUsed > 0) {
          const mat = db.prepare('SELECT * FROM raw_materials WHERE id = ?').get(matId);
          if (mat) {
            const stockBefore = mat.current_stock;
            const stockAfter = Math.max(0, stockBefore - qtyUsed);
            db.prepare('UPDATE raw_materials SET current_stock = ? WHERE id = ?').run(stockAfter, mat.id);

            db.prepare(`
              INSERT INTO raw_material_logs (material_id, material_name, action, qty_change, stock_before, stock_after, date, notes)
              VALUES (?, ?, 'PRODUCTION_USED', ?, ?, ?, ?, ?)
            `).run(
              mat.id,
              mat.name,
              -qtyUsed,
              stockBefore,
              stockAfter,
              date,
              `Used in Production Batch ${batchNumber} (${pieces} pcs ${item.name})`
            );

            materialsSummaryList.push(`${mat.name}: ${qtyUsed} ${mat.unit}`);
          }
        }
      }
    }

    const summaryText = materialsSummaryList.join(', ') || (data.raw_materials_summary || 'Standard ingredients');

    // 2. Insert batch record
    const res = db.prepare(`
      INSERT INTO production_batches (batch_number, date, item_id, item_name, produced_pieces, unit_cost, total_cost, raw_materials_summary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      batchNumber,
      date,
      item.id,
      item.name,
      pieces,
      unitCost,
      totalCost,
      summaryText,
      data.notes || ''
    );
    batchId = res.lastInsertRowid;

    // 3. Add to single items pool
    db.prepare('UPDATE icecream_items SET current_single_stock = current_single_stock + ?, unit_cost = ? WHERE id = ?')
      .run(pieces, unitCost, item.id);
  });

  tx();
  return { 
    success: true, 
    batchId, 
    batchNumber, 
    produced_pieces: pieces, 
    item_name: item.name, 
    new_single_stock: item.current_single_stock + pieces 
  };
}

function getProductionBatches(filters = {}) {
  let query = 'SELECT pb.* FROM production_batches pb WHERE 1=1';
  const params = [];

  if (filters.item_id) {
    query += ' AND pb.item_id = ?';
    params.push(filters.item_id);
  }
  if (filters.fromDate) {
    query += ' AND pb.date >= ?';
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    query += ' AND pb.date <= ?';
    params.push(filters.toDate);
  }

  query += ' ORDER BY pb.id DESC LIMIT 100';
  return db.prepare(query).all(...params);
}

function deleteProductionBatch(id) {
  const batch = db.prepare('SELECT * FROM production_batches WHERE id = ?').get(id);
  if (!batch) return { error: 'Batch not found' };

  db.transaction(() => {
    // Reverse single stock
    db.prepare('UPDATE icecream_items SET current_single_stock = MAX(0, current_single_stock - ?) WHERE id = ?')
      .run(batch.produced_pieces, batch.item_id);
    db.prepare('DELETE FROM production_batches WHERE id = ?').run(id);
  })();

  return { success: true };
}

// --- STAGE 3: CARTON PACKING (SELLABLE INVENTORY) ---
function getPackedCartons() {
  return db.prepare(`
    SELECT pc.*,
           ii.name as base_item_name,
           ii.current_single_stock as available_single_pieces,
           ROUND(pc.factory_carton_stock * pc.carton_cost_price, 2) as total_warehouse_cost,
           ROUND(pc.factory_carton_stock * pc.carton_sale_price, 2) as total_warehouse_value,
           COALESCE((SELECT SUM(ci.cartons_loaded) FROM car_inventory ci WHERE ci.carton_id = pc.id), 0) as total_loaded_in_cars
    FROM packed_cartons pc
    JOIN icecream_items ii ON ii.id = pc.item_id
    ORDER BY pc.carton_name ASC
  `).all();
}

function getPackedCarton(id) {
  return db.prepare('SELECT * FROM packed_cartons WHERE id = ?').get(id);
}

function findCartonByBarcode(barcode) {
  if (!barcode) return null;
  const clean = String(barcode).trim().toLowerCase();
  if (!clean) return null;
  return db.prepare(`
    SELECT pc.*,
           ii.name as base_item_name,
           ii.current_single_stock as available_single_pieces
    FROM packed_cartons pc
    JOIN icecream_items ii ON ii.id = pc.item_id
    WHERE LOWER(TRIM(COALESCE(pc.barcode, ''))) = ?
  `).get(clean);
}

function savePackedCarton(data) {
  if (data.id) {
    db.prepare(`
      UPDATE packed_cartons
      SET item_id = ?, carton_name = ?, pieces_per_carton = ?, carton_cost_price = ?, carton_sale_price = ?, carton_wholesale_price = ?, factory_carton_stock = ?, barcode = ?, notes = ?
      WHERE id = ?
    `).run(
      data.item_id,
      data.carton_name.trim(),
      Number(data.pieces_per_carton) || 20,
      Number(data.carton_cost_price) || 0,
      Number(data.carton_sale_price) || 0,
      Number(data.carton_wholesale_price) || 0,
      Number(data.factory_carton_stock) || 0,
      data.barcode || '',
      data.notes || '',
      data.id
    );
    return { success: true, id: data.id };
  } else {
    const item = db.prepare('SELECT * FROM icecream_items WHERE id = ?').get(data.item_id);
    const itemName = item ? item.name : '';
    const res = db.prepare(`
      INSERT INTO packed_cartons (item_id, item_name, carton_name, pieces_per_carton, carton_cost_price, carton_sale_price, carton_wholesale_price, factory_carton_stock, barcode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.item_id,
      itemName,
      data.carton_name.trim(),
      Number(data.pieces_per_carton) || 20,
      Number(data.carton_cost_price) || 0,
      Number(data.carton_sale_price) || 0,
      Number(data.carton_wholesale_price) || 0,
      Number(data.factory_carton_stock) || 0,
      data.barcode || '',
      data.notes || ''
    );
    return { success: true, id: res.lastInsertRowid };
  }
}

function deletePackedCarton(id) {
  const loaded = db.prepare('SELECT SUM(cartons_loaded) as s FROM car_inventory WHERE carton_id = ?').get(id).s || 0;
  if (loaded > 0) {
    return { error: `Cannot delete: ${loaded} cartons are currently loaded in delivery cars.` };
  }
  db.prepare('DELETE FROM car_inventory WHERE carton_id = ?').run(id);
  db.prepare('DELETE FROM packing_batches WHERE carton_id = ?').run(id);
  db.prepare('DELETE FROM packed_cartons WHERE id = ?').run(id);
  return { success: true };
}

function runCartonPacking(data) {
  const carton = db.prepare('SELECT * FROM packed_cartons WHERE id = ?').get(data.carton_id);
  if (!carton) return { error: 'Packed carton configuration not found' };

  const item = db.prepare('SELECT * FROM icecream_items WHERE id = ?').get(carton.item_id);
  if (!item) return { error: 'Associated single ice cream item not found' };

  const cartonsPacked = Number(data.cartons_packed) || 0;
  if (cartonsPacked <= 0) return { error: 'Cartons to pack must be greater than 0' };

  const piecesPerCarton = Number(data.pieces_per_carton) || Number(carton.pieces_per_carton) || 20;
  const totalPiecesNeeded = cartonsPacked * piecesPerCarton;

  if (item.current_single_stock < totalPiecesNeeded) {
    return { 
      error: `Insufficient single pieces! Required: ${totalPiecesNeeded} pieces of ${item.name}, but only ${item.current_single_stock} available in production stock.` 
    };
  }

  const cartonCost = Number(data.carton_cost) || (item.unit_cost * piecesPerCarton);
  const totalCost = cartonsPacked * cartonCost;
  const cartonSalePrice = Number(data.carton_sale_price) || carton.carton_sale_price;
  const date = data.date || new Date().toISOString().split('T')[0];

  // Batch number
  const todayStr = date.replace(/-/g, '');
  const countToday = db.prepare('SELECT COUNT(*) as c FROM packing_batches WHERE date = ?').get(date).c + 1;
  const packingNumber = `PCK-${todayStr}-${String(countToday).padStart(3, '0')}`;

  let batchId;
  const tx = db.transaction(() => {
    // 1. Deduct single pieces from item pool
    db.prepare('UPDATE icecream_items SET current_single_stock = current_single_stock - ? WHERE id = ?')
      .run(totalPiecesNeeded, item.id);

    // 2. Add cartons to warehouse stock and update prices
    db.prepare(`
      UPDATE packed_cartons 
      SET factory_carton_stock = factory_carton_stock + ?, 
          pieces_per_carton = ?,
          carton_cost_price = ?, 
          carton_sale_price = ? 
      WHERE id = ?
    `).run(cartonsPacked, piecesPerCarton, cartonCost, cartonSalePrice, carton.id);

    // 3. Insert packing batch record
    const res = db.prepare(`
      INSERT INTO packing_batches (packing_number, date, carton_id, item_id, item_name, cartons_packed, pieces_per_carton, total_pieces_consumed, carton_cost, total_cost, carton_sale_price, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      packingNumber,
      date,
      carton.id,
      item.id,
      item.name,
      cartonsPacked,
      piecesPerCarton,
      totalPiecesNeeded,
      cartonCost,
      totalCost,
      cartonSalePrice,
      data.notes || ''
    );
    batchId = res.lastInsertRowid;
  });

  tx();
  return { 
    success: true, 
    batchId, 
    packingNumber, 
    cartonsPacked, 
    totalPiecesNeeded,
    newCartonStock: carton.factory_carton_stock + cartonsPacked,
    remainingSingleStock: item.current_single_stock - totalPiecesNeeded 
  };
}

function getPackingBatches(filters = {}) {
  let query = 'SELECT pb.* FROM packing_batches pb WHERE 1=1';
  const params = [];

  if (filters.carton_id) {
    query += ' AND pb.carton_id = ?';
    params.push(filters.carton_id);
  }
  if (filters.fromDate) {
    query += ' AND pb.date >= ?';
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    query += ' AND pb.date <= ?';
    params.push(filters.toDate);
  }

  query += ' ORDER BY pb.id DESC LIMIT 100';
  return db.prepare(query).all(...params);
}

function deletePackingBatch(id) {
  const batch = db.prepare('SELECT * FROM packing_batches WHERE id = ?').get(id);
  if (!batch) return { error: 'Packing batch not found' };

  db.transaction(() => {
    // Reverse: add back single items, deduct cartons
    db.prepare('UPDATE icecream_items SET current_single_stock = current_single_stock + ? WHERE id = ?')
      .run(batch.total_pieces_consumed, batch.item_id);
    db.prepare('UPDATE packed_cartons SET factory_carton_stock = MAX(0, factory_carton_stock - ?) WHERE id = ?')
      .run(batch.cartons_packed, batch.carton_id);
    db.prepare('DELETE FROM packing_batches WHERE id = ?').run(id);
  })();

  return { success: true };
}

// --- STAGE 4: CARS & DELIVERY LOADING ---
function getCars() {
  return db.prepare(`
    SELECT c.*,
           COALESCE((SELECT SUM(ci.cartons_loaded) FROM car_inventory ci WHERE ci.car_id = c.id), 0) as total_loaded_cartons,
           (SELECT COUNT(*) FROM shop_deliveries sd WHERE sd.car_id = c.id) as total_deliveries_count
    FROM cars c
    ORDER BY c.id ASC
  `).all();
}

function getCar(id) {
  return db.prepare('SELECT * FROM cars WHERE id = ?').get(id);
}

function saveCar(data) {
  if (data.id) {
    db.prepare(`
      UPDATE cars 
      SET car_number = ?, driver_name = ?, phone = ?, area = ?, is_active = ?, notes = ?
      WHERE id = ?
    `).run(
      data.car_number.trim(),
      data.driver_name.trim(),
      data.phone || '',
      data.area || '',
      data.is_active !== undefined ? Number(data.is_active) : 1,
      data.notes || '',
      data.id
    );
    return { success: true, id: data.id };
  } else {
    const res = db.prepare(`
      INSERT INTO cars (car_number, driver_name, phone, area, is_active, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.car_number.trim(),
      data.driver_name.trim(),
      data.phone || '',
      data.area || '',
      data.is_active !== undefined ? Number(data.is_active) : 1,
      data.notes || ''
    );
    return { success: true, id: res.lastInsertRowid };
  }
}

function deleteCar(id) {
  const loaded = db.prepare('SELECT SUM(cartons_loaded) as s FROM car_inventory WHERE car_id = ?').get(id).s || 0;
  if (loaded > 0) {
    return { error: `Cannot delete car: It currently has ${loaded} cartons loaded. Return them to stock first.` };
  }
  db.prepare('DELETE FROM car_inventory WHERE car_id = ?').run(id);
  db.prepare('DELETE FROM cars WHERE id = ?').run(id);
  return { success: true };
}

function getCarInventory(carId) {
  return db.prepare(`
    SELECT pc.id as carton_id,
           pc.carton_name,
           pc.pieces_per_carton,
           pc.carton_sale_price,
           pc.carton_cost_price,
           pc.factory_carton_stock,
           COALESCE(ci.cartons_loaded, 0) as cartons_loaded,
           ROUND(COALESCE(ci.cartons_loaded, 0) * pc.carton_sale_price, 2) as loaded_value
    FROM packed_cartons pc
    LEFT JOIN car_inventory ci ON ci.carton_id = pc.id AND ci.car_id = ?
    ORDER BY pc.carton_name ASC
  `).all(carId);
}

function loadCarStock(data) {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(data.car_id);
  if (!car) return { error: 'Car / Vehicle not found' };

  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { error: 'No items selected to load' };
  }

  const date = data.date || new Date().toISOString().split('T')[0];
  const todayStr = date.replace(/-/g, '');
  const countToday = db.prepare('SELECT COUNT(*) as c FROM car_loading_batches WHERE date = ?').get(date).c + 1;
  const dispatchNo = `DISP-${todayStr}-${String(countToday).padStart(3, '0')}`;

  let totalCartonsLoaded = 0;
  let batchId;

  const tx = db.transaction(() => {
    // Check factory stock first
    for (const item of data.items) {
      const qty = Number(item.cartons_to_load) || 0;
      if (qty > 0) {
        const pc = db.prepare('SELECT * FROM packed_cartons WHERE id = ?').get(item.carton_id);
        if (!pc || pc.factory_carton_stock < qty) {
          throw new Error(`Insufficient warehouse stock for ${pc ? pc.carton_name : 'item'}. Available: ${pc ? pc.factory_carton_stock : 0}, requested to load: ${qty}`);
        }
      }
    }

    // Insert loading batch
    const batchRes = db.prepare(`
      INSERT INTO car_loading_batches (dispatch_no, car_id, date, total_cartons, notes)
      VALUES (?, ?, ?, 0, ?)
    `).run(dispatchNo, car.id, date, data.notes || '');
    batchId = batchRes.lastInsertRowid;

    for (const item of data.items) {
      const qty = Number(item.cartons_to_load) || 0;
      if (qty > 0) {
        const pc = db.prepare('SELECT * FROM packed_cartons WHERE id = ?').get(item.carton_id);
        // Deduct from factory warehouse
        db.prepare('UPDATE packed_cartons SET factory_carton_stock = factory_carton_stock - ? WHERE id = ?')
          .run(qty, pc.id);

        // Add to car inventory (upsert)
        db.prepare(`
          INSERT INTO car_inventory (car_id, carton_id, cartons_loaded, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(car_id, carton_id) DO UPDATE SET 
            cartons_loaded = car_inventory.cartons_loaded + ?,
            updated_at = CURRENT_TIMESTAMP
        `).run(car.id, pc.id, qty, qty);

        // Insert item log
        db.prepare(`
          INSERT INTO car_loading_items (dispatch_id, carton_id, carton_name, pieces_per_carton, cartons_loaded, sale_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(batchId, pc.id, pc.carton_name, pc.pieces_per_carton, qty, pc.carton_sale_price);

        totalCartonsLoaded += qty;
      }
    }

    db.prepare('UPDATE car_loading_batches SET total_cartons = ? WHERE id = ?').run(totalCartonsLoaded, batchId);
  });

  try {
    tx();
    return { success: true, batchId, dispatchNo, totalCartonsLoaded, car_number: car.car_number };
  } catch (err) {
    return { error: err.message };
  }
}

function unloadCarStock(data) {
  const carId = Number(data.car_id);
  const cartonId = Number(data.carton_id);
  const qty = Number(data.cartons_to_unload);

  if (!carId || !cartonId || isNaN(qty) || qty <= 0) {
    return { error: 'Invalid car, carton, or quantity specified.' };
  }

  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId);
  if (!car) return { error: 'Car / Vehicle not found.' };

  const pc = db.prepare('SELECT * FROM packed_cartons WHERE id = ?').get(cartonId);
  if (!pc) return { error: 'Packed carton flavor not found.' };

  const ci = db.prepare('SELECT * FROM car_inventory WHERE car_id = ? AND carton_id = ?').get(carId, cartonId);
  const currentLoaded = ci ? Number(ci.cartons_loaded) : 0;
  if (!ci || currentLoaded < qty) {
    return { error: `Cannot unload ${qty} cartons. This vehicle only has ${currentLoaded} loaded.` };
  }

  const tx = db.transaction(() => {
    // 1. Deduct from car inventory
    const newLoaded = currentLoaded - qty;
    if (newLoaded <= 0) {
      db.prepare('DELETE FROM car_inventory WHERE car_id = ? AND carton_id = ?').run(carId, cartonId);
    } else {
      db.prepare('UPDATE car_inventory SET cartons_loaded = ?, updated_at = CURRENT_TIMESTAMP WHERE car_id = ? AND carton_id = ?')
        .run(newLoaded, carId, cartonId);
    }

    // 2. Add back to factory warehouse stock
    db.prepare('UPDATE packed_cartons SET factory_carton_stock = factory_carton_stock + ? WHERE id = ?')
      .run(qty, cartonId);
  });

  try {
    tx();
    return {
      success: true,
      carId,
      cartonId,
      qtyUnloaded: qty,
      carton_name: pc.carton_name,
      car_number: car.car_number
    };
  } catch (err) {
    return { error: err.message };
  }
}

function getCarLoadingBatches(carId = null) {
  let query = `
    SELECT clb.*, c.car_number, c.driver_name
    FROM car_loading_batches clb
    JOIN cars c ON c.id = clb.car_id
    WHERE 1=1
  `;
  const params = [];
  if (carId) {
    query += ' AND clb.car_id = ?';
    params.push(carId);
  }
  query += ' ORDER BY clb.id DESC LIMIT 100';
  return db.prepare(query).all(...params);
}

function getCarLoadingBatch(id) {
  const batch = db.prepare(`
    SELECT clb.*, c.car_number, c.driver_name, c.phone, c.area
    FROM car_loading_batches clb
    JOIN cars c ON c.id = clb.car_id
    WHERE clb.id = ?
  `).get(id);
  if (!batch) return null;
  batch.items = db.prepare('SELECT * FROM car_loading_items WHERE dispatch_id = ?').all(id);
  return batch;
}

// --- STAGE 5: SHOP DELIVERIES, SALES & RETURNS ---
function saveShopDelivery(data) {
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return { error: 'No items in delivery order' };
  }

  const car = data.car_id ? db.prepare('SELECT * FROM cars WHERE id = ?').get(data.car_id) : null;
  const shop = data.shop_id ? db.prepare('SELECT * FROM shops WHERE id = ?').get(data.shop_id) : null;
  const shopName = data.shop_name || (shop ? shop.name : 'Counter Sale');
  const shopPhone = data.shop_phone || (shop ? shop.phone : '');
  const shopAddress = data.shop_address || (shop ? shop.address : '');

  const date = data.date || new Date().toISOString().split('T')[0];
  const todayStr = date.replace(/-/g, '');
  const countToday = db.prepare('SELECT COUNT(*) as c FROM shop_deliveries WHERE date = ?').get(date).c + 1;
  const invoiceNo = `INV-${todayStr}-${String(countToday).padStart(3, '0')}`;

  const discount = Number(data.discount) || 0;
  const receivedAmount = Number(data.received_amount) || 0;
  const paymentMethod = data.payment_method || 'Cash';

  let subtotal = 0;
  data.items.forEach(it => {
    const qty = Number(it.delivered_cartons) || Number(it.ordered_cartons) || Number(it.quantity) || 1;
    const price = Number(it.carton_price) || 0;
    subtotal += qty * price;
  });

  const totalAmount = Math.max(0, subtotal - discount);
  if (receivedAmount > totalAmount) {
    return { error: `Received amount (Rs. ${receivedAmount.toLocaleString()}) cannot be more than the net bill total (Rs. ${totalAmount.toLocaleString()})` };
  }
  const previousBalance = shop ? Number(shop.amount || 0) : 0;
  const remainingBillBalance = Math.max(0, totalAmount - receivedAmount);
  const newShopBalance = previousBalance + remainingBillBalance;

  let deliveryId;

  const tx = db.transaction(() => {
    // 1. Insert delivery invoice
    const res = db.prepare(`
      INSERT INTO shop_deliveries (
        invoice_no, date, shop_id, shop_name, shop_phone, shop_address,
        car_id, car_number, driver_name, subtotal, discount, total_amount,
        received_amount, previous_balance, remaining_balance, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNo,
      date,
      shop ? shop.id : null,
      shopName,
      shopPhone,
      shopAddress,
      car ? car.id : null,
      car ? car.car_number : 'Direct Warehouse',
      car ? car.driver_name : 'Direct Dispatch',
      subtotal,
      discount,
      totalAmount,
      receivedAmount,
      previousBalance,
      remainingBillBalance,
      paymentMethod,
      data.notes || ''
    );
    deliveryId = res.lastInsertRowid;

    // 2. Process each item (clean normal sale)
    for (const it of data.items) {
      const pc = db.prepare('SELECT * FROM packed_cartons WHERE id = ?').get(it.carton_id);
      const cartonName = pc ? pc.carton_name : (it.carton_name || 'Ice Cream Carton');
      const pcsPerCarton = pc ? pc.pieces_per_carton : (Number(it.pieces_per_carton) || 20);
      const qty = Number(it.delivered_cartons) || Number(it.ordered_cartons) || Number(it.quantity) || 1;
      const price = Number(it.carton_price) || 0;
      const lineTotal = qty * price;

      // Insert item
      db.prepare(`
        INSERT INTO shop_delivery_items (
          delivery_id, carton_id, carton_name, pieces_per_carton,
          ordered_cartons, delivered_cartons, returned_cartons, return_destination,
          carton_price, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 'car', ?, ?)
      `).run(
        deliveryId,
        it.carton_id,
        cartonName,
        pcsPerCarton,
        qty,
        qty,
        price,
        lineTotal
      );

      // Handle stock and car inventory deduction:
      if (car) {
        db.prepare(`
          UPDATE car_inventory 
          SET cartons_loaded = MAX(0, cartons_loaded - ?), updated_at = CURRENT_TIMESTAMP
          WHERE car_id = ? AND carton_id = ?
        `).run(qty, car.id, it.carton_id);
      } else {
        db.prepare(`
          UPDATE packed_cartons 
          SET factory_carton_stock = MAX(0, factory_carton_stock - ?)
          WHERE id = ?
        `).run(qty, it.carton_id);
      }
    }

    // 3. Update shop balance if registered shop
    if (shop) {
      db.prepare('UPDATE shops SET amount = ? WHERE id = ?').run(newShopBalance, shop.id);
    }
  });

  tx();
  return {
    success: true,
    id: deliveryId,
    invoice_no: invoiceNo,
    total_amount: totalAmount,
    received_amount: receivedAmount,
    remaining_balance: remainingBillBalance,
    previous_balance: previousBalance,
    new_shop_balance: newShopBalance
  };
}

function processShopReturn(data) {
  if (!data.delivery_id) return { error: 'Delivery ID is required' };
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return { error: 'No items specified for return' };
  }

  const delivery = db.prepare('SELECT * FROM shop_deliveries WHERE id = ?').get(data.delivery_id);
  if (!delivery) return { error: 'Sale record not found' };

  const validItems = data.items.filter(it => (Number(it.return_quantity) || 0) > 0);
  if (validItems.length === 0) {
    return { error: 'Please enter a return quantity greater than 0 for at least one item' };
  }

  const date = data.date || new Date().toISOString().split('T')[0];
  const todayStr = date.replace(/-/g, '');
  const countToday = db.prepare('SELECT COUNT(*) as c FROM shop_returns WHERE date = ?').get(date).c + 1;
  const returnNo = `RET-${todayStr}-${String(countToday).padStart(3, '0')}`;
  const returnDest = (data.return_destination || 'car').toLowerCase(); // 'car' or 'stock'
  const adjType = data.adjustment_type || 'khata'; // 'khata' or 'cash'

  let totalCartonsReturned = 0;
  let totalRefund = 0;

  validItems.forEach(it => {
    const qty = Number(it.return_quantity) || 0;
    const price = Number(it.carton_price) || 0;
    totalCartonsReturned += qty;
    totalRefund += qty * price;
  });

  let returnId;

  const tx = db.transaction(() => {
    // 1. Insert return header
    const res = db.prepare(`
      INSERT INTO shop_returns (
        return_no, delivery_id, invoice_no, shop_id, shop_name,
        car_id, car_number, date, total_cartons_returned, total_refund_amount,
        return_destination, adjustment_type, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      returnNo,
      delivery.id,
      delivery.invoice_no,
      delivery.shop_id,
      delivery.shop_name,
      delivery.car_id,
      delivery.car_number,
      date,
      totalCartonsReturned,
      totalRefund,
      returnDest,
      adjType,
      data.reason || ''
    );
    returnId = res.lastInsertRowid;

    // 2. Process each returned item
    for (const it of validItems) {
      const qty = Number(it.return_quantity) || 0;
      const price = Number(it.carton_price) || 0;
      const itemRefund = qty * price;

      db.prepare(`
        INSERT INTO shop_return_items (
          return_id, carton_id, carton_name, pieces_per_carton,
          returned_cartons, carton_price, refund_amount, return_destination
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        returnId,
        it.carton_id,
        it.carton_name,
        it.pieces_per_carton || 20,
        qty,
        price,
        itemRefund,
        returnDest
      );

      // Update delivery item returned count and line total
      if (it.delivery_item_id) {
        db.prepare('UPDATE shop_delivery_items SET returned_cartons = returned_cartons + ?, line_total = MAX(0, line_total - ?) WHERE id = ?')
          .run(qty, itemRefund, it.delivery_item_id);
      } else {
        db.prepare('UPDATE shop_delivery_items SET returned_cartons = returned_cartons + ?, line_total = MAX(0, line_total - ?) WHERE delivery_id = ? AND carton_id = ?')
          .run(qty, itemRefund, delivery.id, it.carton_id);
      }

      // Add inventory back to either the CAR or FACTORY STOCK!
      if (returnDest === 'car' && delivery.car_id) {
        // Stays in car: add back to car inventory
        const existingCarInv = db.prepare('SELECT id FROM car_inventory WHERE car_id = ? AND carton_id = ?').get(delivery.car_id, it.carton_id);
        if (existingCarInv) {
          db.prepare('UPDATE car_inventory SET cartons_loaded = cartons_loaded + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(qty, existingCarInv.id);
        } else {
          db.prepare('INSERT INTO car_inventory (car_id, carton_id, cartons_loaded) VALUES (?, ?, ?)')
            .run(delivery.car_id, it.carton_id, qty);
        }
      } else {
        // Return to factory warehouse stock
        db.prepare('UPDATE packed_cartons SET factory_carton_stock = factory_carton_stock + ? WHERE id = ?')
          .run(qty, it.carton_id);
      }
    }

    // 3. Reduce sale amount from shop_deliveries
    const discount = Number(delivery.discount) || 0;
    const newSubtotal = Math.max(0, (Number(delivery.subtotal) || Number(delivery.total_amount)) - totalRefund);
    const newTotalAmount = Math.max(0, newSubtotal - discount);

    let newReceivedAmount = Number(delivery.received_amount) || 0;
    let newRemainingBalance = Number(delivery.remaining_balance) || 0;

    if (adjType === 'cash') {
      // Cash refund given back to customer from sale proceeds
      newReceivedAmount = Math.max(0, newReceivedAmount - totalRefund);
      newRemainingBalance = Math.max(0, newTotalAmount - newReceivedAmount);
    } else {
      // Khata adjustment: reduce bill debt balance first
      newRemainingBalance = Math.max(0, newRemainingBalance - totalRefund);
      // Reduce the shop's ledger balance
      if (delivery.shop_id) {
        db.prepare('UPDATE shops SET amount = MAX(0, amount - ?) WHERE id = ?')
          .run(totalRefund, delivery.shop_id);
      }
    }

    db.prepare(`
      UPDATE shop_deliveries 
      SET subtotal = ?, total_amount = ?, received_amount = ?, remaining_balance = ? 
      WHERE id = ?
    `).run(newSubtotal, newTotalAmount, newReceivedAmount, newRemainingBalance, delivery.id);
  });

  tx();
  return { 
    success: true, 
    returnId, 
    returnNo, 
    totalRefund, 
    totalCartonsReturned, 
    returnDest,
    newTotalAmount: Math.max(0, (delivery.total_amount || 0) - totalRefund)
  };
}

function getShopReturns(deliveryId = null) {
  if (deliveryId) {
    return db.prepare('SELECT * FROM shop_returns WHERE delivery_id = ? ORDER BY id DESC').all(deliveryId);
  }
  return db.prepare('SELECT * FROM shop_returns ORDER BY id DESC').all();
}

function getShopReturn(id) {
  const ret = db.prepare('SELECT * FROM shop_returns WHERE id = ?').get(id);
  if (!ret) return null;
  ret.items = db.prepare('SELECT * FROM shop_return_items WHERE return_id = ?').all(id);
  return ret;
}

function getShopDeliveries(filters = {}) {
  let query = `
    SELECT sd.*, 
           (SELECT COUNT(*) FROM shop_delivery_items sdi WHERE sdi.delivery_id = sd.id) as total_items_count,
           (SELECT SUM(sdi.delivered_cartons) FROM shop_delivery_items sdi WHERE sdi.delivery_id = sd.id) as total_cartons_delivered,
           (SELECT SUM(sdi.returned_cartons) FROM shop_delivery_items sdi WHERE sdi.delivery_id = sd.id) as total_cartons_returned
    FROM shop_deliveries sd
    WHERE 1=1
  `;
  const params = [];

  if (filters.car_id) {
    query += ' AND sd.car_id = ?';
    params.push(filters.car_id);
  }
  if (filters.shop_id) {
    query += ' AND sd.shop_id = ?';
    params.push(filters.shop_id);
  }
  if (filters.fromDate) {
    query += ' AND sd.date >= ?';
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    query += ' AND sd.date <= ?';
    params.push(filters.toDate);
  }

  query += ' ORDER BY sd.id DESC LIMIT 150';
  return db.prepare(query).all(...params);
}

function getShopDelivery(id) {
  const delivery = db.prepare('SELECT * FROM shop_deliveries WHERE id = ?').get(id);
  if (!delivery) return null;
  delivery.items = db.prepare('SELECT * FROM shop_delivery_items WHERE delivery_id = ?').all(id);
  return delivery;
}

function deleteShopDelivery(id) {
  const delivery = db.prepare('SELECT * FROM shop_deliveries WHERE id = ?').get(id);
  if (!delivery) return { error: 'Delivery invoice not found' };

  db.transaction(() => {
    // If shop balance was updated, reverse the remaining balance
    if (delivery.shop_id && delivery.remaining_balance > 0) {
      db.prepare('UPDATE shops SET amount = MAX(0, amount - ?) WHERE id = ?')
        .run(delivery.remaining_balance, delivery.shop_id);
    }
    db.prepare('DELETE FROM shop_deliveries WHERE id = ?').run(id);
  })();

  return { success: true };
}

function receiveShopPayment(data) {
  if (!data.shop_id) return { error: 'Shop ID is required' };
  const amount = Number(data.amount) || 0;
  if (amount <= 0) return { error: 'Payment amount must be greater than 0' };

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(data.shop_id);
  if (!shop) return { error: 'Shop not found' };

  const currentBalance = Number(shop.amount) || 0;
  if (currentBalance <= 0) {
    return { error: 'This shop has no outstanding balance in khata' };
  }
  if (amount > currentBalance) {
    return { error: `Received payment (Rs. ${amount.toLocaleString()}) cannot be more than the balance in shop's khata (Rs. ${currentBalance.toLocaleString()})` };
  }

  const date = data.date || new Date().toISOString().split('T')[0];
  const todayStr = date.replace(/-/g, '');
  const countToday = db.prepare('SELECT COUNT(*) as c FROM shop_payments WHERE date = ?').get(date)?.c || 0;
  const receiptNo = `REC-${todayStr}-${String(countToday + 1).padStart(3, '0')}`;

  let paymentId;
  let newBalance = 0;
  db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO shop_payments (shop_id, amount, payment_method, receipt_no, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.shop_id,
      amount,
      data.payment_method || 'Cash',
      receiptNo,
      date,
      data.notes || ''
    );
    paymentId = res.lastInsertRowid;
    newBalance = Math.max(0, currentBalance - amount);
    db.prepare('UPDATE shops SET amount = ? WHERE id = ?').run(newBalance, data.shop_id);
  })();

  return {
    success: true,
    id: paymentId,
    receipt_no: receiptNo,
    shop_id: data.shop_id,
    shop_name: shop.name,
    amount_paid: amount,
    previous_balance: currentBalance,
    new_balance: newBalance,
    date,
    payment_method: data.payment_method || 'Cash',
    notes: data.notes || ''
  };
}

function getShopLedger(shopId) {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
  if (!shop) return null;

  // Deliveries (debit to shop account)
  const deliveries = db.prepare(`
    SELECT sd.id, sd.invoice_no, sd.date, sd.created_at, sd.total_amount, sd.received_amount, sd.remaining_balance,
           sd.car_number, sd.driver_name, sd.payment_method, sd.notes,
           'delivery' as record_type,
           COALESCE((SELECT SUM(delivered_cartons) FROM shop_delivery_items WHERE delivery_id = sd.id), 0) as cartons_count
    FROM shop_deliveries sd
    WHERE sd.shop_id = ?
  `).all(shopId);

  // Cash Payments (credit to shop account)
  const payments = db.prepare(`
    SELECT sp.id, sp.receipt_no as invoice_no, sp.date, sp.created_at, 0 as total_amount, sp.amount as received_amount, 0 as remaining_balance,
           'Factory Office' as car_number, '' as driver_name, sp.payment_method, sp.notes,
           'payment' as record_type,
           0 as cartons_count
    FROM shop_payments sp
    WHERE sp.shop_id = ?
  `).all(shopId);

  // Combine and sort chronologically
  const entries = [...deliveries, ...payments].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (da !== db) return da - db;
    return a.id - b.id;
  });

  return {
    shop,
    current_balance: shop.amount || 0,
    entries
  };
}

function deleteShopPayment(id) {
  const payment = db.prepare('SELECT * FROM shop_payments WHERE id = ?').get(id);
  if (!payment) return { error: 'Payment not found' };

  db.transaction(() => {
    db.prepare('UPDATE shops SET amount = amount + ? WHERE id = ?').run(payment.amount, payment.shop_id);
    db.prepare('DELETE FROM shop_payments WHERE id = ?').run(id);
  })();

  return { success: true };
}

function getCarSalesReport(carId, fromDate = null, toDate = null) {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId);
  if (!car) return { error: 'Car not found' };

  let query = 'SELECT * FROM shop_deliveries WHERE car_id = ?';
  const params = [carId];
  if (fromDate) {
    query += ' AND date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND date <= ?';
    params.push(toDate);
  }
  query += ' ORDER BY id DESC';

  const deliveries = db.prepare(query).all(...params);
  let totalSales = 0;
  let totalReceived = 0;
  let totalCartons = 0;

  deliveries.forEach(d => {
    totalSales += d.total_amount || 0;
    totalReceived += d.received_amount || 0;
    const cartons = db.prepare('SELECT SUM(delivered_cartons - returned_cartons) as s FROM shop_delivery_items WHERE delivery_id = ?').get(d.id).s || 0;
    d.cartons_delivered = cartons;
    totalCartons += cartons;
  });

  const currentInventory = getCarInventory(carId);

  return {
    car,
    fromDate,
    toDate,
    totalSales,
    totalReceived,
    totalCartons,
    totalCartonsDelivered: totalCartons,
    deliveriesCount: deliveries.length,
    totalDeliveries: deliveries.length,
    deliveries,
    currentInventory
  };
}

function getIcecreamFactorySummary() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Raw Materials Summary
  const rawStats = db.prepare(`
    SELECT COUNT(*) as total_materials,
           COALESCE(SUM(current_stock * cost_price), 0) as total_raw_value,
           COALESCE(SUM(CASE WHEN current_stock <= min_stock_alert THEN 1 ELSE 0 END), 0) as low_stock_count
    FROM raw_materials
  `).get();

  // 2. Single Items Production Pool Summary
  const singleStats = db.prepare(`
    SELECT COUNT(*) as total_items,
           COALESCE(SUM(current_single_stock), 0) as total_single_pieces,
           COALESCE(SUM(current_single_stock * unit_cost), 0) as total_single_cost,
           COALESCE(SUM(current_single_stock * retail_piece_price), 0) as total_single_retail
    FROM icecream_items
  `).get();

  // 3. Packed Cartons Warehouse Stock Summary
  const cartonStats = db.prepare(`
    SELECT COUNT(*) as total_carton_variants,
           COALESCE(SUM(factory_carton_stock), 0) as total_warehouse_cartons,
           COALESCE(SUM(factory_carton_stock * carton_cost_price), 0) as total_warehouse_cost,
           COALESCE(SUM(factory_carton_stock * carton_sale_price), 0) as total_warehouse_sale_value
    FROM packed_cartons
  `).get();

  // 4. Cars & Loaded Stock Summary
  const carStats = db.prepare(`
    SELECT COUNT(*) as total_cars,
           COALESCE(SUM(is_active), 0) as active_cars,
           COALESCE((SELECT SUM(cartons_loaded) FROM car_inventory), 0) as total_cartons_in_cars
    FROM cars
  `).get();

  // 5. Today's Delivery & Sales Performance
  const todaySales = db.prepare(`
    SELECT COUNT(*) as total_invoices_today,
           COALESCE(SUM(total_amount), 0) as total_sales_today,
           COALESCE(SUM(received_amount), 0) as total_received_today
    FROM shop_deliveries
    WHERE date = ?
  `).get(today);

  const todayCartons = db.prepare(`
    SELECT COALESCE(SUM(sdi.delivered_cartons - sdi.returned_cartons), 0) as cartons_sold_today
    FROM shop_delivery_items sdi
    JOIN shop_deliveries sd ON sd.id = sdi.delivery_id
    WHERE sd.date = ?
  `).get(today).cartons_sold_today;

  return {
    rawMaterials: rawStats,
    singleItems: singleStats,
    packedCartons: cartonStats,
    cars: carStats,
    today: {
      date: today,
      sales: todaySales.total_sales_today,
      received: todaySales.total_received_today,
      invoices: todaySales.total_invoices_today,
      cartons_sold: todayCartons
    }
  };
}


module.exports = {
  // Stage 1: Raw Materials
  getRawMaterials, getRawMaterial, saveRawMaterial, deleteRawMaterial, addRawMaterialPurchase, getRawMaterialLogs,
  // Stage 2: Single Items Production
  getIcecreamItems, getIcecreamItem, saveIcecreamItem, deleteIcecreamItem, runProductionBatch, getProductionBatches, deleteProductionBatch,
  // Stage 3: Packed Cartons
  getPackedCartons, getPackedCarton, findCartonByBarcode, savePackedCarton, deletePackedCarton, runCartonPacking, getPackingBatches, deletePackingBatch,
  // Stage 4: Cars & Delivery Loading
  getCars, getCar, saveCar, deleteCar, getCarInventory, loadCarStock, unloadCarStock, getCarLoadingBatches, getCarLoadingBatch,
  // Stage 5: Shop Deliveries, Sales & Returns
  saveShopDelivery, getShopDeliveries, getShopDelivery, deleteShopDelivery, receiveShopPayment, getShopLedger, deleteShopPayment, getCarSalesReport, getIcecreamFactorySummary,
  processShopReturn, getShopReturns, getShopReturn,

  init, getDbPath, getDbPathForBranch, close, backupDatabase, clearAllData,
    addProductStock, getRateHistory, deleteRateHistory, getAllRatesList, markProposalPaid,
  getSettings, saveSettings,
  getProducts, addProduct, updateProduct, deleteProduct, findProductByName, findProductByBarcode, changeProductCategory,
  getCategoryLabels, updateCategoryLabel, searchAllProducts, getCategoryStats, addCategory, deleteCategory,
  getProposals, getProposal, saveProposal, deleteProposal, updateProposalStatus, receivePayment, getNextProposalNumber, getNextCustomerName,
  getAllProposalItems,
  getExpenses, saveExpense, deleteExpense, getExpensesSummary,
  getExpenseCategories, addExpenseCategory, deleteExpenseCategory,
  getEmployees, saveEmployee, deleteEmployee,
  getCompanies, saveCompany, deleteCompany,
  getCustomers, saveCustomer, deleteCustomer,
  getShops, saveShop, deleteShop, getShop,
  getDashboardStats,
  getItemSales,
  getReportSummary,
  toggleFavorite,
  getFavoriteProducts,
  getUnits, addUnit, updateUnit, deleteUnit,
  getAllKv, setKv, saveAllKv
};
