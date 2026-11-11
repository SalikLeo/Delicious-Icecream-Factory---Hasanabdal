const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  selectLogoFile: () => ipcRenderer.invoke('select-logo-file'),

  // Products
  getProducts: (category) => ipcRenderer.invoke('get-products', category),
  addProduct: (category, data) => ipcRenderer.invoke('add-product', category, data),
  updateProduct: (category, id, data) => ipcRenderer.invoke('update-product', category, id, data),
  changeProductCategory: (oldCategory, newCategory, id, data) => ipcRenderer.invoke('change-product-category', oldCategory, newCategory, id, data),
  deleteProduct: (category, id) => ipcRenderer.invoke('delete-product', category, id),
  findProductByName: (name, excludeCategory, excludeId) => ipcRenderer.invoke('find-product-by-name', name, excludeCategory, excludeId),
  findProductByBarcode: (barcode, excludeCategory, excludeId) => ipcRenderer.invoke('find-product-by-barcode', barcode, excludeCategory, excludeId),
  getCategoryLabels: () => ipcRenderer.invoke('get-category-labels'),
  getCategoryStats: () => ipcRenderer.invoke('get-category-stats'),
  updateCategoryLabel: (slug, label) => ipcRenderer.invoke('update-category-label', slug, label),
  addCategory: (label) => ipcRenderer.invoke('add-category', label),
  deleteCategory: (slug) => ipcRenderer.invoke('delete-category', slug),
  searchAllProducts: (query, companyId) => ipcRenderer.invoke('search-all-products', query, companyId),
  addProductStock: (data) => ipcRenderer.invoke('add-product-stock', data),
  getRateHistory: (category, productId) => ipcRenderer.invoke('get-rate-history', category, productId),
  deleteRateHistory: (id) => ipcRenderer.invoke('delete-rate-history', id),
  getAllRatesList: () => ipcRenderer.invoke('get-all-rates-list'),

  // Units
  getUnits: () => ipcRenderer.invoke('get-units'),
  addUnit: (name) => ipcRenderer.invoke('add-unit', name),
  updateUnit: (id, name) => ipcRenderer.invoke('update-unit', id, name),
  deleteUnit: (id) => ipcRenderer.invoke('delete-unit', id),

  // Proposals
  getProposals: () => ipcRenderer.invoke('get-proposals'),
  getProposal: (id) => ipcRenderer.invoke('get-proposal', id),
  getAllProposalItems: () => ipcRenderer.invoke('get-all-proposal-items'),
  saveProposal: (data) => ipcRenderer.invoke('save-proposal', data),
  deleteProposal: (id) => ipcRenderer.invoke('delete-proposal', id),
  updateProposalStatus: (id, status) => ipcRenderer.invoke('update-proposal-status', id, status),
  receivePayment: (id, amount, paymentMethod) => ipcRenderer.invoke('receive-payment', id, amount, paymentMethod),
  markProposalPaid: (idOrNumber) => ipcRenderer.invoke('mark-proposal-paid', idOrNumber),
  getNextProposalNumber: () => ipcRenderer.invoke('get-next-proposal-number'),
  getNextCustomerName: () => ipcRenderer.invoke('get-next-customer-name'),

  // Expenses
  getExpenses: (filters) => ipcRenderer.invoke('get-expenses', filters),
  saveExpense: (data) => ipcRenderer.invoke('save-expense', data),
  deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),
  getExpensesSummary: () => ipcRenderer.invoke('get-expenses-summary'),
  getExpenseCategories: () => ipcRenderer.invoke('get-expense-categories'),
  addExpenseCategory: (name) => ipcRenderer.invoke('add-expense-category', name),
  deleteExpenseCategory: (id) => ipcRenderer.invoke('delete-expense-category', id),

  // Employees
  getEmployees: (status) => ipcRenderer.invoke('get-employees', status),
  saveEmployee: (data) => ipcRenderer.invoke('save-employee', data),
  deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),

  // Companies & Suppliers
  getCompanies: () => ipcRenderer.invoke('get-companies'),
  saveCompany: (data) => ipcRenderer.invoke('save-company', data),
  deleteCompany: (id) => ipcRenderer.invoke('delete-company', id),
  getSuppliers: () => ipcRenderer.invoke('get-companies'),
  saveSupplier: (data) => ipcRenderer.invoke('save-company', data),
  deleteSupplier: (id) => ipcRenderer.invoke('delete-company', id),

  // Customers
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  saveCustomer: (data) => ipcRenderer.invoke('save-customer', data),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),

  // Shops
  getShops: () => ipcRenderer.invoke('get-shops'),
  getShop: (id) => ipcRenderer.invoke('get-shop', id),
  saveShop: (data) => ipcRenderer.invoke('save-shop', data),
  deleteShop: (id) => ipcRenderer.invoke('delete-shop', id),

  // Dashboard
  getDashboardStats: (period) => ipcRenderer.invoke('get-dashboard-stats', period),
  getItemSales: (section, period, targetDate) => ipcRenderer.invoke('get-item-sales', section, period, targetDate),
  getReportSummary: (filters) => ipcRenderer.invoke('get-report-summary', filters),
  toggleFavorite: (category, id) => ipcRenderer.invoke('toggle-favorite', category, id),
  getFavoriteProducts: () => ipcRenderer.invoke('get-favorite-products'),

  // Backup & Restore
  backupData: () => ipcRenderer.invoke('backup-data'),
  restoreData: () => ipcRenderer.invoke('restore-data'),
  clearAppData: () => ipcRenderer.invoke('clear-app-data'),
  relaunchApp: () => ipcRenderer.invoke('relaunch-app'),
  generatePDF: (filename) => ipcRenderer.invoke('generate-pdf', filename),
  getBackupDirectory: () => ipcRenderer.invoke('get-backup-directory'),
  selectBackupDirectory: () => ipcRenderer.invoke('select-backup-directory'),
  openBackupDirectory: () => ipcRenderer.invoke('open-backup-directory'),

  // Ice Cream Factory 5-Stage System
  // Stage 1: Raw Materials
  getRawMaterials: () => ipcRenderer.invoke('get-raw-materials'),
  getRawMaterial: (id) => ipcRenderer.invoke('get-raw-material', id),
  saveRawMaterial: (data) => ipcRenderer.invoke('save-raw-material', data),
  deleteRawMaterial: (id) => ipcRenderer.invoke('delete-raw-material', id),
  addRawMaterialPurchase: (data) => ipcRenderer.invoke('add-raw-material-purchase', data),
  getRawMaterialLogs: (filters) => ipcRenderer.invoke('get-raw-material-logs', filters),
  deleteRawMaterialLog: (id, revertStock) => ipcRenderer.invoke('delete-raw-material-log', id, revertStock),
  updateRawMaterialLog: (id, data) => ipcRenderer.invoke('update-raw-material-log', id, data),
  getRawMaterialPurchases: (filters) => ipcRenderer.invoke('get-raw-material-purchases', filters),
  getRawMaterialPurchase: (id) => ipcRenderer.invoke('get-raw-material-purchase', id),
  updateRawMaterialPurchase: (id, data) => ipcRenderer.invoke('update-raw-material-purchase', id, data),
  deleteRawMaterialPurchase: (id) => ipcRenderer.invoke('delete-raw-material-purchase', id),
  getRawMaterialSuppliers: () => ipcRenderer.invoke('get-raw-material-suppliers'),
  getNextPurchaseInvoiceNo: () => ipcRenderer.invoke('get-next-purchase-invoice-no'),

  // Suppliers & Vendor Khata
  getSuppliers: () => ipcRenderer.invoke('get-suppliers'),
  getSupplier: (id) => ipcRenderer.invoke('get-supplier', id),
  saveSupplier: (data) => ipcRenderer.invoke('save-supplier', data),
  deleteSupplier: (id) => ipcRenderer.invoke('delete-supplier', id),
  paySupplier: (data) => ipcRenderer.invoke('pay-supplier', data),
  deleteSupplierPayment: (id) => ipcRenderer.invoke('delete-supplier-payment', id),
  updateSupplierPayment: (id, data) => ipcRenderer.invoke('update-supplier-payment', id, data),
  getSupplierLedger: (supplierId) => ipcRenderer.invoke('get-supplier-ledger', supplierId),

  // Stage 2: Single Items Production
  getIcecreamItems: () => ipcRenderer.invoke('get-icecream-items'),
  getIcecreamItem: (id) => ipcRenderer.invoke('get-icecream-item', id),
  saveIcecreamItem: (data) => ipcRenderer.invoke('save-icecream-item', data),
  deleteIcecreamItem: (id) => ipcRenderer.invoke('delete-icecream-item', id),
  runProductionBatch: (data) => ipcRenderer.invoke('run-production-batch', data),
  getProductionBatches: (filters) => ipcRenderer.invoke('get-production-batches', filters),
  getProductionBatch: (id) => ipcRenderer.invoke('get-production-batch', id),
  updateProductionBatch: (id, data) => ipcRenderer.invoke('update-production-batch', id, data),
  deleteProductionBatch: (id) => ipcRenderer.invoke('delete-production-batch', id),

  // Stage 3: Carton Packing (Sellable Inventory)
  getPackedCartons: () => ipcRenderer.invoke('get-packed-cartons'),
  getPackedCarton: (id) => ipcRenderer.invoke('get-packed-carton', id),
  findCartonByBarcode: (barcode) => ipcRenderer.invoke('find-carton-by-barcode', barcode),
  savePackedCarton: (data) => ipcRenderer.invoke('save-packed-carton', data),
  deletePackedCarton: (id) => ipcRenderer.invoke('delete-packed-carton', id),
  incrementStickersPrinted: (data) => ipcRenderer.invoke('increment-stickers-printed', data),
  runCartonPacking: (data) => ipcRenderer.invoke('run-carton-packing', data),
  getPackingBatches: (filters) => ipcRenderer.invoke('get-packing-batches', filters),
  getPackingBatch: (id) => ipcRenderer.invoke('get-packing-batch', id),
  updatePackingBatch: (id, data) => ipcRenderer.invoke('update-packing-batch', id, data),
  deletePackingBatch: (id) => ipcRenderer.invoke('delete-packing-batch', id),

  // Stage 4: Cars & Delivery Loading
  getCars: () => ipcRenderer.invoke('get-cars'),
  getCar: (id) => ipcRenderer.invoke('get-car', id),
  saveCar: (data) => ipcRenderer.invoke('save-car', data),
  deleteCar: (id) => ipcRenderer.invoke('delete-car', id),
  getCarInventory: (carId) => ipcRenderer.invoke('get-car-inventory', carId),
  loadCarStock: (data) => ipcRenderer.invoke('load-car-stock', data),
  unloadCarStock: (data) => ipcRenderer.invoke('unload-car-stock', data),
  getCarLoadingBatches: (carId) => ipcRenderer.invoke('get-car-loading-batches', carId),
  getCarLoadingBatch: (id) => ipcRenderer.invoke('get-car-loading-batch', id),
  updateCarLoadingBatch: (id, data) => ipcRenderer.invoke('update-car-loading-batch', id, data),
  deleteCarLoadingBatch: (id) => ipcRenderer.invoke('delete-car-loading-batch', id),

  // Stage 5: Shop Deliveries, Sales & Returns
  getNextDeliveryInvoiceNo: (date) => ipcRenderer.invoke('get-next-delivery-invoice-no', date),
  saveShopDelivery: (data) => ipcRenderer.invoke('save-shop-delivery', data),
  updateShopDelivery: (id, data) => ipcRenderer.invoke('update-shop-delivery', id, data),
  processShopReturn: (data) => ipcRenderer.invoke('process-shop-return', data),
  getShopDeliveries: (filters) => ipcRenderer.invoke('get-shop-deliveries', filters),
  getShopReturns: (deliveryId) => ipcRenderer.invoke('get-shop-returns', deliveryId),
  getShopDelivery: (id) => ipcRenderer.invoke('get-shop-delivery', id),
  getShopReturn: (id) => ipcRenderer.invoke('get-shop-return', id),
  deleteShopDelivery: (id) => ipcRenderer.invoke('delete-shop-delivery', id),
  receiveShopPayment: (data) => ipcRenderer.invoke('receive-shop-payment', data),
  updateShopPayment: (id, data) => ipcRenderer.invoke('update-shop-payment', id, data),
  getShopLedger: (shopId) => ipcRenderer.invoke('get-shop-ledger', shopId),
  deleteShopPayment: (id) => ipcRenderer.invoke('delete-shop-payment', id),
  getCarSalesReport: (carId, fromDate, toDate) => ipcRenderer.invoke('get-car-sales-report', carId, fromDate, toDate),
  getIcecreamFactorySummary: () => ipcRenderer.invoke('get-icecream-factory-summary'),

  // Storage Sync
  getAllKv: () => ipcRenderer.invoke('get-all-kv'),
  setKv: (key, value) => ipcRenderer.invoke('set-kv', key, value),
  saveAllKv: (data) => ipcRenderer.invoke('save-all-kv', data),

  // Thermal Printing & TIJ Export
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
  printBarcodeStickers: (options) => ipcRenderer.invoke('print-barcode-stickers', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  saveBmpFile: (data) => ipcRenderer.invoke('save-bmp-file', data),
  saveBmpBatch: (data) => ipcRenderer.invoke('save-bmp-batch', data),

  // App Zoom & Scale
  getZoomFactor: () => ipcRenderer.invoke('get-zoom-factor'),
  setZoomFactor: (factor) => {
    try { webFrame.setZoomFactor(factor); } catch (e) {}
    return ipcRenderer.invoke('set-zoom-factor', factor);
  },
  restoreAppZoom: () => ipcRenderer.invoke('restore-app-zoom'),

  // Global Shortcuts Event
  onTriggerPriceChecker: (callback) => {
    ipcRenderer.on('trigger-price-checker', () => callback());
  },
});
