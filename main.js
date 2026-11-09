const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('delicious-superstar-foods');
const db = require('./database');

let mainWindow;
let isQuitting = false;

const getSavedAppZoom = () => {
  try {
    const s = db.getSettings();
    if (s && s.app_zoom) {
      let val = s.app_zoom;
      try { val = JSON.parse(val); } catch (e) {}
      const z = parseFloat(val);
      if (!isNaN(z) && z >= 0.5 && z <= 1.5) return z;
    }
  } catch (e) {}
  try {
    const allKv = db.getAllKv ? db.getAllKv() : [];
    const item = allKv.find(x => x.key === 'app_zoom');
    if (item && item.value) {
      let val = item.value;
      try { val = JSON.parse(val); } catch (e) {}
      const z = parseFloat(val);
      if (!isNaN(z) && z >= 0.5 && z <= 1.5) return z;
    }
  } catch (e) {}
  return 0.82; // ~18% reduction (ideal 15-20% for laptops)
};

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Delicious Superstar Foods',
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.on('dom-ready', () => {
    try { mainWindow.webContents.setZoomFactor(getSavedAppZoom()); } catch (e) {}
  });

  mainWindow.webContents.on('did-finish-load', () => {
    try { mainWindow.webContents.setZoomFactor(getSavedAppZoom()); } catch (e) {}
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  // Intercept F6 and F8 globally before Chromium's native handlers intercept or suppress them
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const key = (input.key || '').toUpperCase();
      const code = (input.code || '').toUpperCase();
      const isF6 = key === 'F6' || code === 'F6';
      const isF8 = key === 'F8' || code === 'F8';

      if (isF6 || isF8) {
        event.preventDefault();
        mainWindow.webContents.send('trigger-price-checker');
      }
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') || url.startsWith('mailto:')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('close', async (e) => {
    if (isQuitting) return;

    e.preventDefault();
    isQuitting = true;

    // Save final zoom factor on close so next launch remembers exact scale
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const z = mainWindow.webContents.getZoomFactor();
        if (z && !isNaN(z) && z >= 0.5 && z <= 1.5) {
          const zStr = z.toFixed(2);
          db.saveSettings({ app_zoom: zStr });
          if (db.setKv) db.setKv('app_zoom', JSON.stringify(zStr));
        }
      }
    } catch (err) {}

    try {
      // Sync any unsaved localStorage into SQLite store before backup
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        try {
          await mainWindow.webContents.executeJavaScript(`
            (async () => {
              if (window.api && window.api.saveAllKv) {
                const allKv = {};
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key) allKv[key] = localStorage.getItem(key);
                }
                await window.api.saveAllKv(allKv);
              }
            })()
          `, true);
        } catch (syncErr) {
          console.warn('LocalStorage pre-close sync warning:', syncErr);
        }
      }

      await performAutoBackup();
    } catch (err) {
      console.error('Failed to perform auto backup on window close:', err);
    } finally {
      try { db.close(); } catch (e) {}
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
      app.quit();
    }
  });
}

app.whenReady().then(() => {
  db.init(); // Initialize database
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Settings IPC
ipcMain.handle('get-settings', () => db.getSettings());
ipcMain.handle('save-settings', (event, data) => db.saveSettings(data));

// Products IPC
ipcMain.handle('get-products', (event, category) => db.getProducts(category));
ipcMain.handle('add-product', (event, category, data) => db.addProduct(category, data));
ipcMain.handle('update-product', (event, category, id, data) => db.updateProduct(category, id, data));
ipcMain.handle('change-product-category', (event, oldCategory, newCategory, id, data) => db.changeProductCategory(oldCategory, newCategory, id, data));
ipcMain.handle('delete-product', (event, category, id) => db.deleteProduct(category, id));
ipcMain.handle('find-product-by-name', (event, name, excludeCategory, excludeId) => db.findProductByName(name, excludeCategory, excludeId));
ipcMain.handle('find-product-by-barcode', (event, barcode, excludeCategory, excludeId) => db.findProductByBarcode(barcode, excludeCategory, excludeId));
ipcMain.handle('get-category-labels', () => db.getCategoryLabels());
ipcMain.handle('get-category-stats', () => db.getCategoryStats());
ipcMain.handle('update-category-label', (event, slug, label) => db.updateCategoryLabel(slug, label));
ipcMain.handle('add-category', (event, label) => db.addCategory(label));
ipcMain.handle('delete-category', (event, slug) => db.deleteCategory(slug));
ipcMain.handle('search-all-products', (event, query, companyId) => db.searchAllProducts(query, companyId));
ipcMain.handle('add-product-stock', (event, data) => db.addProductStock(data));
ipcMain.handle('get-rate-history', (event, category, productId) => db.getRateHistory(category, productId));
ipcMain.handle('delete-rate-history', (event, id) => db.deleteRateHistory(id));
ipcMain.handle('get-all-rates-list', () => db.getAllRatesList());

// Units IPC
ipcMain.handle('get-units', () => db.getUnits());
ipcMain.handle('add-unit', (event, name) => db.addUnit(name));
ipcMain.handle('update-unit', (event, id, name) => db.updateUnit(id, name));
ipcMain.handle('delete-unit', (event, id) => db.deleteUnit(id));

// Proposals IPC
ipcMain.handle('get-proposals', () => db.getProposals());
ipcMain.handle('get-proposal', (event, id) => db.getProposal(id));
ipcMain.handle('get-all-proposal-items', () => db.getAllProposalItems());
ipcMain.handle('save-proposal', (event, data) => db.saveProposal(data));
ipcMain.handle('delete-proposal', (event, id) => db.deleteProposal(id));
ipcMain.handle('update-proposal-status', (event, id, status) => db.updateProposalStatus(id, status));
ipcMain.handle('receive-payment', (event, id, amount, paymentMethod) => db.receivePayment(id, amount, paymentMethod));
ipcMain.handle('mark-proposal-paid', (event, idOrNumber) => db.markProposalPaid(idOrNumber));
ipcMain.handle('get-next-proposal-number', () => db.getNextProposalNumber());
ipcMain.handle('get-next-customer-name', () => db.getNextCustomerName());

// Expenses IPC
ipcMain.handle('get-expenses', (event, filters) => db.getExpenses(filters));
ipcMain.handle('save-expense', (event, data) => db.saveExpense(data));
ipcMain.handle('delete-expense', (event, id) => db.deleteExpense(id));
ipcMain.handle('get-expenses-summary', (event, filters) => db.getExpensesSummary(filters));
ipcMain.handle('get-expense-categories', () => db.getExpenseCategories());
ipcMain.handle('add-expense-category', (event, name) => db.addExpenseCategory(name));
ipcMain.handle('delete-expense-category', (event, id) => db.deleteExpenseCategory(id));

// Employees IPC
ipcMain.handle('get-employees', (event, status) => db.getEmployees(status));
ipcMain.handle('save-employee', (event, data) => db.saveEmployee(data));
ipcMain.handle('delete-employee', (event, id) => db.deleteEmployee(id));

// Companies IPC
ipcMain.handle('get-companies', () => db.getCompanies());
ipcMain.handle('save-company', (event, data) => db.saveCompany(data));
ipcMain.handle('delete-company', (event, id) => db.deleteCompany(id));

// Customers IPC
ipcMain.handle('get-customers', () => db.getCustomers());
ipcMain.handle('save-customer', (event, data) => db.saveCustomer(data));
ipcMain.handle('delete-customer', (event, id) => db.deleteCustomer(id));

// Shops IPC
ipcMain.handle('get-shops', () => db.getShops());
ipcMain.handle('get-shop', (event, id) => db.getShop(id));
ipcMain.handle('save-shop', (event, data) => db.saveShop(data));
ipcMain.handle('delete-shop', (event, id) => db.deleteShop(id));

// ==========================================
// Ice Cream Factory 5-Stage System IPC Handlers
// ==========================================

// Stage 1: Raw Materials
ipcMain.handle('get-raw-materials', () => db.getRawMaterials());
ipcMain.handle('get-raw-material', (event, id) => db.getRawMaterial(id));
ipcMain.handle('save-raw-material', (event, data) => db.saveRawMaterial(data));
ipcMain.handle('delete-raw-material', (event, id) => db.deleteRawMaterial(id));
ipcMain.handle('add-raw-material-purchase', (event, data) => db.addRawMaterialPurchase(data));
ipcMain.handle('get-raw-material-logs', (event, filters) => db.getRawMaterialLogs(filters));
ipcMain.handle('get-raw-material-purchases', (event, filters) => db.getRawMaterialPurchases(filters));
ipcMain.handle('get-raw-material-purchase', (event, id) => db.getRawMaterialPurchase(id));
ipcMain.handle('update-raw-material-purchase', (event, id, data) => db.updateRawMaterialPurchase(id, data));
ipcMain.handle('delete-raw-material-purchase', (event, id) => db.deleteRawMaterialPurchase(id));
ipcMain.handle('get-raw-material-suppliers', () => db.getRawMaterialSuppliers());

// Stage 2: Single Items Production
ipcMain.handle('get-icecream-items', () => db.getIcecreamItems());
ipcMain.handle('get-icecream-item', (event, id) => db.getIcecreamItem(id));
ipcMain.handle('save-icecream-item', (event, data) => db.saveIcecreamItem(data));
ipcMain.handle('delete-icecream-item', (event, id) => db.deleteIcecreamItem(id));
ipcMain.handle('run-production-batch', (event, data) => db.runProductionBatch(data));
ipcMain.handle('get-production-batches', (event, filters) => db.getProductionBatches(filters));
ipcMain.handle('delete-production-batch', (event, id) => db.deleteProductionBatch(id));

// Stage 3: Packed Cartons (Sellable Inventory)
ipcMain.handle('get-packed-cartons', () => db.getPackedCartons());
ipcMain.handle('get-packed-carton', (event, id) => db.getPackedCarton(id));
ipcMain.handle('find-carton-by-barcode', (event, barcode) => db.findCartonByBarcode(barcode));
ipcMain.handle('save-packed-carton', (event, data) => db.savePackedCarton(data));
ipcMain.handle('delete-packed-carton', (event, id) => db.deletePackedCarton(id));
ipcMain.handle('increment-stickers-printed', (event, data) => db.incrementCartonStickersPrinted(data?.id, data?.qty));
ipcMain.handle('run-carton-packing', (event, data) => db.runCartonPacking(data));
ipcMain.handle('get-packing-batches', (event, filters) => db.getPackingBatches(filters));
ipcMain.handle('delete-packing-batch', (event, id) => db.deletePackingBatch(id));

// Stage 4: Cars & Delivery Loading
ipcMain.handle('get-cars', () => db.getCars());
ipcMain.handle('get-car', (event, id) => db.getCar(id));
ipcMain.handle('save-car', (event, data) => db.saveCar(data));
ipcMain.handle('delete-car', (event, id) => db.deleteCar(id));
ipcMain.handle('get-car-inventory', (event, carId) => db.getCarInventory(carId));
ipcMain.handle('load-car-stock', (event, data) => db.loadCarStock(data));
ipcMain.handle('unload-car-stock', (event, data) => db.unloadCarStock(data));
ipcMain.handle('get-car-loading-batches', (event, carId) => db.getCarLoadingBatches(carId));
ipcMain.handle('get-car-loading-batch', (event, id) => db.getCarLoadingBatch(id));
ipcMain.handle('delete-car-loading-batch', (event, id) => db.deleteCarLoadingBatch(id));

// Stage 5: Shop Deliveries, Sales & Returns
ipcMain.handle('save-shop-delivery', (event, data) => db.saveShopDelivery(data));
ipcMain.handle('process-shop-return', (event, data) => db.processShopReturn(data));
ipcMain.handle('get-shop-deliveries', (event, filters) => db.getShopDeliveries(filters));
ipcMain.handle('get-shop-returns', (event, deliveryId) => db.getShopReturns(deliveryId));
ipcMain.handle('get-shop-delivery', (event, id) => db.getShopDelivery(id));
ipcMain.handle('get-shop-return', (event, id) => db.getShopReturn(id));
ipcMain.handle('delete-shop-delivery', (event, id) => db.deleteShopDelivery(id));
ipcMain.handle('receive-shop-payment', (event, data) => db.receiveShopPayment(data));
ipcMain.handle('get-shop-ledger', (event, shopId) => db.getShopLedger(shopId));
ipcMain.handle('delete-shop-payment', (event, id) => db.deleteShopPayment(id));
ipcMain.handle('get-car-sales-report', (event, carId, fromDate, toDate) => db.getCarSalesReport(carId, fromDate, toDate));
ipcMain.handle('get-icecream-factory-summary', () => db.getIcecreamFactorySummary());

// Dashboard Stats IPC
ipcMain.handle('get-dashboard-stats', (event, period) => db.getDashboardStats(period));
ipcMain.handle('get-item-sales', (event, section, period, targetDate) => db.getItemSales(section, period, targetDate));
ipcMain.handle('get-report-summary', (event, filters) => db.getReportSummary(filters));
ipcMain.handle('toggle-favorite', (event, category, id) => db.toggleFavorite(category, id));
ipcMain.handle('get-favorite-products', () => db.getFavoriteProducts());

// File Dialog for Logo
ipcMain.handle('select-logo-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]; // Return the absolute file path
  }
  return null;
});

// --- Automatic Backup Logic & IPC ---
function pruneOldBackups(dir, keepCount = 50) {
  try {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir)
      .filter(f => (f.startsWith('DeliciousSuperstarFoods-AutoBackup-') || f.startsWith('IceCreamFactory-AutoBackup-') || f.startsWith('IshaqJadoonTraders-AutoBackup-')) && f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(dir, f);
        return { name: f, fullPath, mtime: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > keepCount) {
      for (let i = keepCount; i < files.length; i++) {
        try { fs.unlinkSync(files[i].fullPath); } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('[AutoBackup] Prune warning:', e);
  }
}

async function performAutoBackup() {
  try {
    const settings = db.getSettings();
    let targetDir = settings.auto_backup_dir;
    const defaultDir = path.join(app.getPath('documents'), 'Delicious Superstar Foods Backups');

    if (!targetDir || !fs.existsSync(targetDir)) {
      try {
        if (targetDir) fs.mkdirSync(targetDir, { recursive: true });
      } catch (e) {
        targetDir = defaultDir;
      }
    }
    if (!targetDir || !fs.existsSync(targetDir)) {
      targetDir = defaultDir;
      try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datetimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const fileName = `DeliciousSuperstarFoods-AutoBackup-${datetimeStr}.db`;
    const destPath = path.join(targetDir, fileName);

    console.log(`[AutoBackup] Backing up database to: ${destPath}`);
    await db.backupDatabase(destPath);
    console.log(`[AutoBackup] Successfully created backup at: ${destPath}`);

    pruneOldBackups(targetDir, 50);

    return { success: true, path: destPath };
  } catch (err) {
    console.error('[AutoBackup] Error during auto-backup:', err);
    return { success: false, error: err.message };
  }
}

ipcMain.handle('get-backup-directory', () => {
  const settings = db.getSettings();
  if (settings.auto_backup_dir && fs.existsSync(settings.auto_backup_dir)) {
    return settings.auto_backup_dir;
  }
  return path.join(app.getPath('documents'), 'Delicious Superstar Foods Backups');
});

ipcMain.handle('select-backup-directory', async () => {
  const settings = db.getSettings();
  const defaultDir = (settings.auto_backup_dir && fs.existsSync(settings.auto_backup_dir))
    ? settings.auto_backup_dir
    : path.join(app.getPath('documents'), 'Delicious Superstar Foods Backups');
  if (!fs.existsSync(defaultDir)) {
    try { fs.mkdirSync(defaultDir, { recursive: true }); } catch (e) {}
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Automatic Backup Directory',
    defaultPath: defaultDir,
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedDir = result.filePaths[0];
    db.saveSettings({ auto_backup_dir: selectedDir });
    return { success: true, path: selectedDir };
  }
  return { success: false, cancelled: true };
});

ipcMain.handle('open-backup-directory', async () => {
  const settings = db.getSettings();
  let dir = settings.auto_backup_dir;
  if (!dir || !fs.existsSync(dir)) {
    dir = path.join(app.getPath('documents'), 'Delicious Superstar Foods Backups');
  }
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  const { shell } = require('electron');
  await shell.openPath(dir);
  return { success: true };
});

// Backup/Restore IPC
ipcMain.handle('backup-data', async () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datetimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Factory Database',
    defaultPath: `DeliciousSuperstarFoods-Backup-${datetimeStr}.db`,
    filters: [
      { name: 'SQLite Database (*.db)', extensions: ['db'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      return await db.backupDatabase(result.filePath);
    } catch (err) {
      console.error('Backup error:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Cancelled' };
});

ipcMain.handle('restore-data', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Factory Database',
    properties: ['openFile'],
    filters: [
      { name: 'SQLite Database (*.db)', extensions: ['db'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const backupPath = result.filePaths[0];
      const dbPath = db.getDbPath();

      // 1. Verify selected file is a valid healthy SQLite database before touching active DB
      const Database = require('better-sqlite3');
      let testDb = null;
      try {
        testDb = new Database(backupPath, { readonly: true, fileMustExist: true });
        const check = testDb.pragma('quick_check');
        if (!check || !check[0] || check[0].quick_check !== 'ok') {
          throw new Error('Database integrity check failed');
        }
      } catch (checkErr) {
        if (testDb) { try { testDb.close(); } catch(e) {} }
        return { success: false, error: 'The selected file is not a valid SQLite database: ' + checkErr.message };
      } finally {
        if (testDb) { try { testDb.close(); } catch(e) {} }
      }

      // 2. Close active DB, remove any existing WAL/SHM files
      db.close();

      const walPath = dbPath + '-wal';
      const shmPath = dbPath + '-shm';
      if (fs.existsSync(walPath)) {
        try { fs.unlinkSync(walPath); } catch(e) {}
      }
      if (fs.existsSync(shmPath)) {
        try { fs.unlinkSync(shmPath); } catch(e) {}
      }

      // 3. Replace database file with selected backup
      fs.copyFileSync(backupPath, dbPath);

      // 4. Verify & run any missing migrations on the restored database
      try {
        db.init();
        db.close();
      } catch (migrateErr) {
        console.warn('Restored DB init check warning:', migrateErr);
      }

      // 5. Relaunch app cleanly
      app.relaunch();
      app.exit(0);
      return { success: true };
    } catch (err) {
      console.error('Restore error:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Cancelled' };
});

ipcMain.handle('clear-app-data', async () => {
  try {
    if (db && typeof db.clearAllData === 'function') {
      const res = db.clearAllData();
      if (!res.success) throw new Error(res.error || 'Failed to clear database');
    }
    return { success: true };
  } catch (err) {
    console.error('Clear app data error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('relaunch-app', () => {
  try {
    app.relaunch();
    app.exit(0);
  } catch (err) {
    console.error('Relaunch app error:', err);
  }
});

// KV Store IPC
ipcMain.handle('get-all-kv', () => db.getAllKv());
ipcMain.handle('set-kv', (event, key, value) => db.setKv(key, value));
ipcMain.handle('save-all-kv', (event, data) => db.saveAllKv(data));
ipcMain.handle('generate-pdf', async (event, filename) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: 'Save Quotation as PDF',
    defaultPath: filename,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (!result.canceled && result.filePath) {
    try {
        const pdfOptions = {
            pageSize: 'A5',
            printBackground: true,
            margins: {
                marginType: 'none',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            }
        };
        const pdfData = await event.sender.printToPDF(pdfOptions);
        fs.writeFileSync(result.filePath, pdfData);
        return { success: true, path: result.filePath };
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
  }
  return { success: false };
});

// Printer IPC
ipcMain.handle('get-printers', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return [];
  return await win.webContents.getPrintersAsync();
});

ipcMain.handle('print-receipt', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No active window' };

  const currentZoom = win.webContents.getZoomFactor();

  try {
    if (currentZoom !== 1.0) {
      win.webContents.setZoomFactor(1.0);
    }
    const printers = await win.webContents.getPrintersAsync();
    let targetPrinter = options.deviceName;
    
    // Only auto-target thermal printer when NOT printing A5
    if (!targetPrinter && options.pageSize !== 'A5' && !options.isA5) {
      const posPrinter = printers.find(p => /pos|receipt|thermal|xp-|80mm|58mm|xprinter|speed-x|sp-650/i.test(p.name));
      if (posPrinter) targetPrinter = posPrinter.name;
    }

    const printOptions = {
      silent: options.silent !== undefined ? options.silent : false,
      printBackground: true,
      pageSize: options.pageSize || 'A5',
      margins: {
        marginType: 'none',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    };

    if (targetPrinter) {
      printOptions.deviceName = targetPrinter;
    }
    if (options.pageSize) {
      printOptions.pageSize = options.pageSize;
    }
    if (options.copies && Number(options.copies) > 1) {
      printOptions.copies = Number(options.copies);
    }

    return new Promise((resolve) => {
      win.webContents.print(printOptions, (success, failureReason) => {
        if (win && !win.isDestroyed()) {
          win.webContents.setZoomFactor(currentZoom);
        }
        resolve({ success, failureReason });
      });
    });
  } catch (err) {
    if (win && !win.isDestroyed()) {
      win.webContents.setZoomFactor(currentZoom);
    }
    console.error('print-receipt error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print-barcode-stickers', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No active window' };

  const currentZoom = win.webContents.getZoomFactor();

  try {
    if (currentZoom !== 1.0) {
      win.webContents.setZoomFactor(1.0);
    }
    const printers = await win.webContents.getPrintersAsync();
    // Prioritize 4BARCODE 3B-365B / sticker printer first, avoid POS80 receipt printer
    const labelPrinter = options.deviceName || 
      (printers.find(p => /4barcode|3b-365/i.test(p.name))?.name) ||
      (printers.find(p => /label|sticker|speed|sp-|650/i.test(p.name))?.name) ||
      (printers.find(p => /barcode/i.test(p.name))?.name) ||
      (printers.find(p => /pos|receipt|thermal|xp-|80|58|xprinter/i.test(p.name))?.name);

    const printOptions = {
      silent: options.silent !== undefined ? options.silent : false,
      printBackground: true,
      margins: {
        marginType: 'none',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    };

    if (labelPrinter) {
      printOptions.deviceName = labelPrinter;
    }

    if (options.pageSize) {
      printOptions.pageSize = options.pageSize;
    }

    if (options.copies && Number(options.copies) > 1) {
      printOptions.copies = Number(options.copies);
    }

    return new Promise((resolve) => {
      win.webContents.print(printOptions, (success, failureReason) => {
        if (win && !win.isDestroyed()) {
          win.webContents.setZoomFactor(currentZoom);
        }
        resolve({ success, failureReason, deviceName: printOptions.deviceName });
      });
    });
  } catch (err) {
    if (win && !win.isDestroyed()) {
      win.webContents.setZoomFactor(currentZoom);
    }
    console.error('print-barcode-stickers error:', err);
    return { success: false, error: err.message };
  }
});

// App Zoom Controls IPC
ipcMain.handle('get-zoom-factor', (event) => {
  const saved = getSavedAppZoom();
  if (saved && !isNaN(saved)) return saved;
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.webContents.getZoomFactor() : 0.82;
});

ipcMain.handle('set-zoom-factor', (event, factor) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const z = Math.min(1.4, Math.max(0.6, parseFloat(factor) || 0.82));
  if (win && !win.isDestroyed()) {
    win.webContents.setZoomFactor(z);
  }
  const zStr = z.toFixed(2);
  try {
    db.saveSettings({ app_zoom: zStr });
  } catch (e) {}
  try {
    if (db.setKv) {
      db.setKv('app_zoom', JSON.stringify(zStr));
    }
  } catch (e) {}
  return z;
});

ipcMain.handle('restore-app-zoom', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const z = getSavedAppZoom();
  if (win && !win.isDestroyed()) {
    win.webContents.setZoomFactor(z);
  }
  return z;
});
