const MasterDB = {
  currentCategory: 'all',
  categories: [], // Dynamically loaded
  products: [],
  allProducts: [],
  filteredProducts: [],
  pageSize: 50,
  displayLimit: 50,
  labels: {},
  currentSalesPeriod: 'daily',
  sectionMap: {}, // Dynamically loaded
  revSectionMap: {}, // Dynamically loaded
  isAllSalesView: false,
  _lastSalesData: [],
  units: [], // Dynamically loaded

  getCategoryLabel(slug) {
    if (!slug) return 'General Items';
    const s = String(slug).toLowerCase().trim();
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
    const solarKeywords = ['panels', 'solar panels', 'inverters', 'solar inverters', 'structures', 'cables', 'breakers', 'batteries', 'solar', 'accessories', 'misc', 'others'];
    if (this.labels && this.labels[s]) {
      const lbl = String(this.labels[s]).trim();
      if (!solarKeywords.includes(lbl.toLowerCase())) {
        return lbl;
      }
    }
    if (legacyMap[s]) return legacyMap[s];
    return (this.labels && this.labels[s]) || 'General Items';
  },

  async render(container) {
    this.displayLimit = this.pageSize;
    // Sync units and categories from DB
    let stats = [];
    try {
      this.settings = await window.api.getSettings();
      this.units = (await window.api.getUnits()) || [];
      stats = (await window.api.getCategoryStats()) || [];
    } catch (e) {
      console.error("[MasterDB.render] Failed to load initial settings/stats:", e);
      stats = [];
    }
    if (!Array.isArray(stats)) stats = [];
    this.currentCategory = this.currentCategory || 'all';

    this.sectionMap = {
        panels: 'pnl', inverters: 'inv', structures: 'str', cables: 'cab',
        breakers: 'brk', batteries: 'bat', misc: 'msc', others: 'oth'
    };
    this.revSectionMap = {};
    Object.entries(this.sectionMap).forEach(([k, v]) => {
        this.revSectionMap[v] = k;
        this.revSectionMap[k] = k; // Map slug to itself
    });

    this.categories = stats.map(s => {
        this.labels[s.slug] = s.label;
        if (!this.sectionMap[s.slug]) {
            this.sectionMap[s.slug] = s.slug; 
            this.revSectionMap[s.slug] = s.slug;
        }
        return { 
            id: s.slug, 
            label: s.label, 
            count: s.count || 0,
            fields: ['item_name']
        };
    });

    container.innerHTML = `
      <div class="flex justify-between items-center mb-6 gap-4 no-print flex-wrap lg:flex-nowrap">
        <div class="flex items-center flex-1 max-w-2xl gap-3 min-w-[300px]">
          <div class="flex items-center gap-3 shrink-0">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="database" class="w-5 h-5"></i>
            </div>
            <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Stock Inventory</h2>
          </div>
          <div class="relative flex-1 group no-print">
            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors"></i>
            <input type="text" id="db-search" 
              oninput="MasterDB.onSearchInput()"
              placeholder="Search item name..." 
              class="w-full h-10 bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-9 text-sm focus:border-accent focus:ring-4 focus:ring-amber-50/50 transition-all outline-none shadow-sm font-medium">
            <button type="button" id="db-search-clear-btn" onclick="MasterDB.clearDbSearch()" title="Clear search" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
          </div>
          <div class="flex items-center gap-2 no-print shrink-0">
            <div class="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <label class="text-[10px] font-black text-rose-500 uppercase tracking-widest whitespace-nowrap">Low Stock &le;</label>
            <input type="number" id="db-low-stock-filter" 
              oninput="MasterDB.onSearchInput()"
              placeholder="Any" 
              class="w-16 h-10 bg-white border border-slate-200 rounded-lg py-2 px-2 text-xs focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all outline-none shadow-sm font-black text-rose-600 text-center">
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <button onclick="app.openBarcodeStickerModal()" class="h-10 px-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer" title="Print Barcode Stickers (Speed-X SP-650UL)">
              <i data-lucide="printer" class="w-4 h-4"></i>
              <span>Print Stickers</span>
            </button>
            <div class="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <button onclick="MasterDB.openSalesStats(true)" class="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-slate-900 cursor-pointer">
              <i data-lucide="globe" class="w-4 h-4 text-amber-400"></i>
              <span>All Sales</span>
            </button>
            <div class="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <button onclick="MasterDB.openManageCategoriesModal(true)" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
              <i data-lucide="settings" class="w-4 h-4 text-slate-400"></i>
              <span>Categories</span>
            </button>
            <button onclick="MasterDB.openForm()" class="h-10 px-4 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4 stroke-[2.5]"></i>
              <span>Add Item</span>
            </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row overflow-hidden h-[calc(100vh-170px)]">
        
        <!-- Sidebar Tabs -->
        <div class="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 no-print">
          <div class="flex items-center justify-between mb-4 px-2">
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-slate-800">Categories</h3>
              <div class="flex items-center gap-0.5">
                <button onclick="MasterDB.printStockList()" class="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors" title="Print Current Category Stock">
                  <i data-lucide="printer" class="w-4 h-4"></i>
                </button>
                <button onclick="MasterDB.openCustomPrintModal()" class="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors" title="Select Categories to Print & Sort">
                  <i data-lucide="list-checks" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-0.5">
            <button onclick="MasterDB.switchTab('all')" id="tab-all" class="db-tab group w-full text-left px-3.5 py-1.5 rounded-lg transition-all flex justify-between items-center text-sm ${this.currentCategory === 'all' ? 'bg-white shadow-sm border border-slate-200 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-100 font-medium'}">
              <span class="truncate pr-2 flex items-center gap-1.5">
                <i data-lucide="layers" class="w-3.5 h-3.5 text-amber-500 shrink-0"></i>
                <span class="font-bold">All Items</span>
              </span>
              <span id="count-all" class="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200/80 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">${stats.reduce((acc, s) => acc + (s.count || 0), 0)}</span>
            </button>
            <div class="h-[1px] bg-slate-200 my-1"></div>
            ${this.categories.map(c => `
                <button onclick="MasterDB.switchTab('${c.id}')" id="tab-${c.id}" class="db-tab group w-full text-left px-3.5 py-1.5 rounded-lg transition-all flex justify-between items-center text-sm ${this.currentCategory === c.id ? 'bg-white shadow-sm border border-slate-200 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-100 font-medium'}">
                  <span class="truncate pr-2">${c.label}</span>
                  <span id="count-${c.id}" class="text-[10px] font-black bg-slate-200/50 text-slate-500 px-1.5 py-0.5 rounded-md min-w-[20px] text-center group-hover:bg-slate-200 transition-colors">${c.count || 0}</span>
                </button>
            `).join('')}
          </div>
        </div>

        <!-- Main Data Table Container -->
        <div class="flex-1 flex flex-col min-h-0 bg-white">
          <div class="flex-1 p-0 overflow-auto relative custom-scrollbar">
            <table class="w-full text-sm text-left border-b border-slate-200">
              <thead class="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[13px] font-black tracking-wider sticky top-0 z-10 shadow-sm" id="db-thead">
              </thead>
              <tbody id="db-tbody" class="divide-y divide-slate-200 bg-white">
              </tbody>
              <tfoot id="db-tfoot" class="sticky bottom-0 bg-slate-100 z-10 border-t-2 border-slate-300 font-black text-xs text-slate-900 shadow-md">
              </tfoot>
            </table>
          </div>
          <!-- Table Footer Pagination Bar -->
          <div id="db-table-footer" class="p-2.5 px-4 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500 flex justify-between items-center shrink-0">
          </div>
        </div>
      </div>

      <!-- Form Modal -->
      <div id="db-modal" onclick="if(event.target === this) MasterDB.closeForm()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-5xl w-full mx-4 transform transition-all scale-95 max-h-[92vh] overflow-y-auto custom-scrollbar" id="db-card">
          <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
            <h3 class="text-xl font-bold text-slate-800" id="db-modal-title">Add Item</h3>
            <button onclick="MasterDB.closeForm()" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form id="db-form" onkeydown="if(event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); event.stopPropagation(); }" onsubmit="MasterDB.saveForm(event)" class="space-y-4">
            <input type="hidden" id="db-id">
            
            <!-- Row 1: Item Name & Category -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="md:col-span-2">
                <div id="db-dynamic-fields"></div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Category *</label>
                <select id="db-category" onchange="MasterDB.onCategorySelectChange(this.value)" class="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-accent focus:border-accent text-sm">
                </select>
              </div>
            </div>

            <!-- Row 2: Barcode / SKU, Company / Supplier, Unit Type, Initial Stock -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div>
                <div class="flex items-center justify-between mb-1 gap-1">
                  <label class="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1 shrink-0">
                    <i data-lucide="scan-barcode" class="w-3.5 h-3.5 text-amber-500"></i> Barcode
                  </label>
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" id="db-btn-generate" onclick="MasterDB.generateRandomBarcode()" class="text-[10px] text-amber-700 hover:text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none" title="Auto-generate a unique 12-digit barcode">Generate</button>
                  </div>
                </div>
                <div class="relative">
                  <input type="text" id="db-barcode" placeholder="Scan or enter code..." 
                         oninput="MasterDB.onBarcodeChange(this.value)"
                         onkeydown="MasterDB.onBarcodeKeyDown(event)"
                         autocomplete="off"
                         class="w-full border border-amber-300/80 bg-amber-50/20 rounded-lg p-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-400 text-sm pl-8 pr-3">
                  <i data-lucide="barcode" class="w-4 h-4 text-amber-500 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
                </div>
                <div id="db-barcode-dup-warning" class="hidden text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  <i data-lucide="alert-circle" class="w-3 h-3 shrink-0 text-rose-600"></i>
                  <span id="db-barcode-dup-text"></span>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Company / Supplier <span class="text-[10px] text-slate-400 font-normal lowercase">(optional)</span></label>
                <select id="db-company" class="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-accent focus:border-accent text-sm">
                  <option value="">-- None --</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Type *</label>
                <select id="db-unit" class="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-accent focus:border-accent text-sm">
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Stock *</label>
                <input type="number" id="db-stock" min="0" step="any" placeholder="0" required class="w-full border border-slate-300 rounded-lg p-2.5 font-black text-emerald-800 bg-emerald-50/40 border-emerald-300 focus:bg-white focus:ring-2 focus:ring-accent focus:border-accent tabular-nums text-center text-sm">
              </div>
            </div>

            <!-- Row 3: Prices & Profit -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100" id="db-prices-row">
              <div id="db-last-purchase-container" class="hidden">
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Last Purchase</span>
                  <span class="text-[10px] text-slate-400 font-bold lowercase tracking-normal">(uneditable)</span>
                </label>
                <input type="text" id="db-last-purchase" readonly tabindex="-1" placeholder="Rs. 0" title="Last purchase price (uneditable)" class="w-full border border-slate-200 bg-slate-100 rounded-lg p-2.5 font-black text-slate-800 text-sm outline-none cursor-not-allowed tabular-nums select-all">
              </div>
              <div>
                <label class="block text-xs font-bold text-red-600 uppercase mb-1">Cost Price (Rs.) *</label>
                <input type="number" id="db-cost" min="0" step="any" required placeholder="0" oninput="MasterDB.updateFormProfits()" class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent">
              </div>
              <div>
                <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Sale Price (Rs.) *</label>
                <input type="number" id="db-retail" min="0" step="any" required placeholder="0" oninput="MasterDB.updateFormProfits()" class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent">
              </div>
              <div>
                <label class="block text-xs font-bold text-emerald-800 uppercase mb-1">Profit</label>
                <input type="text" id="db-retail-profit" readonly tabindex="-1" placeholder="Rs. 0 (0%)" class="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 font-bold text-slate-400 text-sm outline-none cursor-default">
              </div>
            </div>
            
            <div class="pt-4 flex justify-between gap-3">
              <button type="button" onclick="MasterDB.closeForm()" class="px-6 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all active:scale-95">Cancel</button>
              <div class="flex gap-2">
                <button type="button" onclick="MasterDB.saveForm(event, true)" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2">
                  <i data-lucide="plus" class="w-4 h-4"></i> Save & Add Another
                </button>
                <button type="submit" class="px-8 py-2.5 bg-accent hover:bg-amber-500 text-slate-900 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2">
                  <i data-lucide="save" class="w-4 h-4"></i> Save Item
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>


      <!-- Categories Manager Modal -->
      <div id="cat-modal" onclick="if(event.target === this) MasterDB.closeCategoriesModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-xl w-full mx-4 transform transition-all scale-95" id="cat-card">
          <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
            <h3 class="text-xl font-bold text-slate-800">Manage Categories & Units</h3>
            <button onclick="MasterDB.closeCategoriesModal()" class="text-slate-400 hover:text-slate-600 transition-colors hover:bg-slate-100 p-1.5 rounded-lg"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
            <button id="cat-tab-categories" onclick="MasterDB.switchManageTab('categories')" class="flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all bg-white shadow-sm text-slate-900">Categories</button>
            <button id="cat-tab-units" onclick="MasterDB.switchManageTab('units')" class="flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700">Units</button>
          </div>

          <!-- Categories Section -->
          <div id="cat-section-categories">
            <div class="mb-4">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Add New Category</label>
              <div class="flex gap-2">
                <input type="text" id="new-cat-name" placeholder="e.g. Smart Home, CCTV..." 
                  onkeydown="if(event.key==='Enter') MasterDB.addNewCategory()"
                  class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent focus:bg-white outline-none transition-all">
                <button onclick="MasterDB.addNewCategory()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                  <i data-lucide="plus" class="w-4 h-4 text-accent"></i> Add
                </button>
              </div>
            </div>

            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Manage Existing</label>
            <div class="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar" id="cat-list"></div>
          </div>

          <!-- Units Section -->
          <div id="cat-section-units" class="hidden">
            <div class="mb-4">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Add New Unit</label>
              <div class="flex gap-2">
                <input type="text" id="new-unit-name" placeholder="e.g. METER, PKT, BDL..." 
                  onkeydown="if(event.key==='Enter') MasterDB.addNewUnit()"
                  class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent focus:bg-white outline-none transition-all uppercase">
                <button onclick="MasterDB.addNewUnit()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                  <i data-lucide="plus" class="w-4 h-4 text-accent"></i> Add
                </button>
              </div>
            </div>

            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Manage Units</label>
            <div class="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar" id="units-list"></div>
          </div>

          <div class="pt-6 flex justify-end">
            <button onclick="MasterDB.closeCategoriesModal()" class="px-8 py-2.5 bg-accent hover:bg-amber-500 text-slate-900 rounded-xl font-bold shadow-lg transition-all active:scale-95">Done</button>
          </div>
        </div>
      </div>

      <div id="sales-modal" onclick="if(event.target === this) MasterDB.closeSalesStats()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-6xl w-full mx-4 transform transition-all scale-95" id="sales-card">
          <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-2xl font-bold text-slate-800">Sales Statistics</h3>
              <p class="text-slate-500 text-sm mt-1" id="sales-category-name">Category: Electronics</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <div class="bg-slate-100 p-1 rounded-lg flex gap-1">
                   <button onclick="MasterDB.switchSalesPeriod('daily')" id="btn-sales-daily" class="period-btn px-3 py-1.5 rounded-md text-xs font-black bg-white shadow-sm text-slate-900 transition-all cursor-pointer">Daily</button>
                   <button onclick="MasterDB.switchSalesPeriod('monthly')" id="btn-sales-monthly" class="period-btn px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer">Monthly</button>
                   <button onclick="MasterDB.switchSalesPeriod('annual')" id="btn-sales-annual" class="period-btn px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer">Annual</button>
                   <button onclick="MasterDB.switchSalesPeriod('all')" id="btn-sales-all" class="period-btn px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer">All Time</button>
                </div>

                <div id="sales-stat-date-wrap" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <input type="date" id="sales-stat-date" onchange="MasterDB.loadSalesData()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                </div>

                <div id="sales-stat-month-wrap" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
                  <input type="month" id="sales-stat-month" onchange="MasterDB.loadSalesData()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                </div>

                <button onclick="MasterDB.closeSalesStats()" class="p-2 text-slate-400 hover:text-slate-600 ml-2 cursor-pointer"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
             <div class="bg-blue-50 px-3.5 py-2.5 rounded-xl border border-blue-100">
                <span class="text-blue-600 text-[10px] font-bold uppercase tracking-wider block mb-0.5 truncate">Total Quantity Sold</span>
                <span class="text-lg font-black text-blue-900 truncate font-outfit" id="sales-total-qty">0</span>
             </div>
             <div class="bg-red-50 px-3.5 py-2.5 rounded-xl border border-red-100">
                <span class="text-red-600 text-[10px] font-bold uppercase tracking-wider block mb-0.5 truncate">Total Cost</span>
                <span class="text-lg font-black text-red-900 truncate font-outfit" id="sales-total-cost">Rs. 0</span>
             </div>
             <div class="bg-green-50 px-3.5 py-2.5 rounded-xl border border-green-100">
                <span class="text-green-600 text-[10px] font-bold uppercase tracking-wider block mb-0.5 truncate">Total Sale</span>
                <span class="text-lg font-black text-green-900 truncate font-outfit" id="sales-total-revenue">Rs. 0</span>
             </div>
             <div class="bg-amber-50 px-3.5 py-2.5 rounded-xl border border-amber-100">
                <span class="text-amber-600 text-[10px] font-bold uppercase tracking-wider block mb-0.5 truncate">Total Profit</span>
                <span class="text-lg font-black text-amber-900 truncate font-outfit" id="sales-total-profit">Rs. 0</span>
             </div>
          </div>

          <div class="mb-3 flex justify-between items-center gap-4 flex-wrap">
            <div class="relative group flex-1 min-w-[200px]">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors"></i>
              <input type="text" id="sales-search" 
                oninput="MasterDB.applySalesFilters()"
                placeholder="Search items..." 
                class="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-8 text-xs font-medium focus:bg-white focus:border-accent focus:ring-2 focus:ring-amber-50/50 transition-all outline-none">
              <button type="button" id="sales-search-clear-btn" onclick="MasterDB.clearSalesSearch()" title="Clear search" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>

            <div class="flex items-center gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Category</label>
              <select id="sales-cat-filter" onchange="MasterDB.applySalesFilters()" class="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:border-accent focus:ring-0 cursor-pointer outline-none transition-all max-w-[150px]">
                <option value="all">All Categories</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sort By</label>
              <select id="sales-sort" onchange="MasterDB.applySalesFilters()" class="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:border-accent focus:ring-0 cursor-pointer outline-none transition-all">
                <option value="revenue_desc">Most Sale</option>
                <option value="revenue_asc">Least Sale</option>
                <option value="qty_desc">Top Selling (Qty)</option>
                <option value="profit_desc">Most Profit</option>
                <option value="description_asc">Description (A-Z)</option>
              </select>
            </div>

            <!-- Global Reset -->
            <button id="sales-filter-reset" onclick="MasterDB.resetSalesFilters()" class="hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all border border-rose-100 shrink-0 shadow-sm self-center">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
              Clear Filters
            </button>
          </div>

          <div class="max-h-[380px] lg:max-h-[460px] overflow-y-auto border border-slate-200 rounded-xl shadow-inner">
            <table class="w-full text-sm text-left border-b border-slate-200">
              <thead class="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                <tr class="border-b border-slate-200">
                  <th class="px-2 py-2 font-bold uppercase text-[11px] text-center border-r border-slate-200 w-10 bg-slate-50 text-slate-400">#</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] bg-slate-50 text-slate-700 border-r border-slate-200">Item Description</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] text-center border-r border-slate-200 bg-slate-50 text-blue-700">Qty Sold</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] text-right border-r border-slate-200 bg-slate-50 text-red-600">Cost</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] text-right border-r border-slate-200 bg-slate-50 text-emerald-600">Sale</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] text-right bg-slate-50 text-amber-600">Profit</th>
                </tr>
              </thead>
              <tbody id="sales-tbody" class="divide-y divide-slate-200 bg-white">
                <!-- Dynamically filled -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Profits Modal -->
      <div id="profits-modal" onclick="if(event.target === this) MasterDB.closeProfitsModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-6xl w-full mx-4 transform transition-all scale-95 flex flex-col max-h-[90vh]" id="profits-card">
          <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
            <div>
              <h3 class="text-2xl font-bold text-slate-800">Proposal Profits</h3>
              <p class="text-slate-500 text-sm mt-1">Analytics and profit tracking across all proposals.</p>
            </div>
            <button onclick="MasterDB.closeProfitsModal()" class="p-2 text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-6 h-6"></i></button>
          </div>

          <!-- Summary Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
             <div class="bg-red-50 p-4 rounded-xl border border-red-100">
                <span class="text-red-600 text-xs font-bold uppercase tracking-widest block mb-1">Total Cost</span>
                <span class="text-2xl font-black text-red-900" id="prof-total-cost">Rs. 0</span>
             </div>
             <div class="bg-green-50 p-4 rounded-xl border border-green-100">
                <span class="text-green-600 text-xs font-bold uppercase tracking-widest block mb-1">Total Sell</span>
                <span class="text-2xl font-black text-green-900" id="prof-total-retail">Rs. 0</span>
             </div>
             <div class="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <span class="text-amber-600 text-xs font-bold uppercase tracking-widest block mb-1">Total Net Profit</span>
                <span class="text-2xl font-black text-amber-900" id="prof-total-profit">Rs. 0</span>
             </div>
          </div>

          <!-- Filters -->
          <div class="mb-4 flex flex-wrap gap-4 items-center shrink-0">
            <div class="relative flex-1 min-w-[200px]">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
              <input type="text" id="prof-search" oninput="MasterDB.applyProfitsFilters()" placeholder="Search by customer name or proposal #..." class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 pl-10 pr-9 text-sm focus:bg-white focus:border-accent outline-none">
              <button type="button" id="prof-search-clear-btn" onclick="MasterDB.clearProfSearch()" title="Clear search" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>

            <select id="prof-status-filter" onchange="MasterDB.applyProfitsFilters()" class="bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-4 text-xs font-bold text-slate-700 focus:bg-white focus:border-accent cursor-pointer outline-none w-36">
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>

            <select id="prof-sort" onchange="MasterDB.applyProfitsFilters()" class="bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-4 text-xs font-bold text-slate-700 focus:bg-white focus:border-accent cursor-pointer outline-none w-44">
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="profit_desc">Most Profit</option>
              <option value="profit_asc">Least Profit</option>
              <option value="total_desc">Highest Sell Total</option>
            </select>
            
            <button id="prof-filter-reset" onclick="MasterDB.resetProfitsFilters()" class="hidden flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all border border-rose-100 shrink-0 shadow-sm">
              <i data-lucide="x" class="w-4 h-4"></i> Clear
            </button>
          </div>

          <div class="flex-1 overflow-auto border border-slate-100 rounded-lg shadow-inner bg-white min-h-[250px]">
            <table class="w-full text-xs text-left border-b border-slate-100">
              <thead class="bg-slate-50 text-slate-500 sticky top-0 z-10">
                <tr>
                  <th class="px-2 py-2.5 font-black uppercase text-[10px] text-center w-8 border-b border-r border-slate-200 bg-slate-50">#</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] border-b border-r border-amber-100 bg-amber-50 text-amber-700">Prop #</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] border-b border-r border-indigo-100 bg-indigo-50 text-indigo-700">Customer</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] text-center border-b border-r border-blue-100 bg-blue-50 text-blue-700">Status</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] text-right bg-red-50 text-red-600 border-b border-r border-red-100">Total Cost</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] text-right bg-green-50 text-green-600 border-b border-r border-green-100">Total Sell</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] text-right bg-amber-50 text-amber-600 border-b border-amber-100">Net Profit</th>
                </tr>
              </thead>
              <tbody id="profits-tbody" class="divide-y divide-slate-100">
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Custom / Batch Stock Print Modal -->
      <div id="db-custom-print-modal" onclick="if(event.target === this) MasterDB.closeCustomPrintModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-xl w-full mx-4 transform transition-all scale-95 flex flex-col max-h-[90vh]" id="db-custom-print-card">
          <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <i data-lucide="printer" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-800 tracking-tight">Print Categories Stock</h3>
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select categories & sort options for A5 report</p>
              </div>
            </div>
            <button onclick="MasterDB.closeCustomPrintModal()" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            <!-- Category Selection Header & Quick Select -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-xs font-black text-slate-700 uppercase tracking-wider">Select Categories to Print</label>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="MasterDB.toggleAllPrintCats(true)" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline">Select All</button>
                  <span class="text-slate-300">|</span>
                  <button type="button" onclick="MasterDB.toggleAllPrintCats(false)" class="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline">Deselect All</button>
                </div>
              </div>

              <!-- Categories Grid -->
              <div class="grid grid-cols-2 gap-2" id="print-cats-list">
                <!-- Dynamically generated category checkboxes -->
              </div>
            </div>

            <!-- Sort and Filter Options -->
            <div class="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Sort Items By</label>
                <select id="print-stock-sort" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-accent outline-none">
                  <option value="name_asc">Item Name (A &rarr; Z)</option>
                  <option value="name_desc">Item Name (Z &rarr; A)</option>
                  <option value="stock_desc">Stock Quantity (Highest First)</option>
                  <option value="stock_asc">Stock Quantity (Lowest First / Low Stock)</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Stock Filter</label>
                  <select id="print-stock-filter-type" onchange="MasterDB.onPrintFilterChange()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-accent outline-none">
                    <option value="all">All Items</option>
                    <option value="in_stock">In Stock Only (&gt; 0)</option>
                    <option value="low_stock">Low Stock Only (&le; Limit)</option>
                  </select>
                </div>

                <div id="print-low-stock-limit-box" class="hidden">
                  <label class="block text-xs font-black text-rose-600 uppercase tracking-wider mb-1.5">Low Stock &le; (Boxes)</label>
                  <input type="number" id="print-low-stock-limit" value="5" min="0" step="1" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-accent outline-none text-center">
                </div>
              </div>

              <!-- Grouping Toggle -->
              <div class="flex items-center justify-between pt-1">
                <label for="print-group-by-cat" class="text-xs font-bold text-slate-600 cursor-pointer select-none">Group items under Category headers</label>
                <input type="checkbox" id="print-group-by-cat" checked class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer">
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-4 border-t border-slate-100 flex justify-between items-center gap-3 shrink-0">
            <button type="button" onclick="MasterDB.closeCustomPrintModal()" class="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs transition-all">Cancel</button>
            <button type="button" onclick="MasterDB.generateCustomStockPrint()" class="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer">
              <i data-lucide="eye" class="w-4 h-4 text-amber-400"></i>
              <span>Generate A5 Preview</span>
            </button>
          </div>
        </div>
      </div>


      <!-- Rate Changes Log / Cost History Modal -->
      <div id="rate-history-modal" onclick="if(event.target === this) MasterDB.closeRateHistoryModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden transform transition-all scale-95 flex flex-col max-h-[88vh]" id="rate-history-card">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <i data-lucide="history" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 id="rate-history-title" class="font-black text-base">Rate Changes Log</h3>
                <p id="rate-history-subtitle" class="text-[11px] text-slate-400 font-medium">Audit trail of stock additions and weighted cost updates</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="MasterDB.printRateHistory()" class="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer" title="Print History Sheet">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                <span>Print Log</span>
              </button>
              <button type="button" onclick="MasterDB.closeRateHistoryModal()" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100 text-slate-600 uppercase text-[10px] font-black tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th class="py-2.5 px-3">Date &amp; Time</th>
                  <th class="py-2.5 px-3">Source / Action</th>
                  <th class="py-2.5 px-3 text-center">Stock Shift</th>
                  <th class="py-2.5 px-3 text-right text-slate-700">Purchase Rate</th>
                  <th class="py-2.5 px-3 text-right text-slate-500">Old Cost</th>
                  <th class="py-2.5 px-3 text-right text-red-600 font-black">New Cost (WAC)</th>
                  <th class="py-2.5 px-3 text-right text-emerald-600 font-black">Fixed Sale</th>
                  <th class="py-2.5 px-3 text-right text-blue-600 font-black">Profit</th>
                  <th class="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody id="rate-history-tbody" class="divide-y divide-slate-100">
                <!-- Dynamically populated via MasterDB.renderRateHistory() -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Master Rate List & Cost Master Modal -->
      <div id="rate-list-modal" onclick="if(event.target === this) MasterDB.closeRateListModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden transform transition-all scale-95 flex flex-col max-h-[90vh]" id="rate-list-card">
          <!-- Header -->
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                <i data-lucide="tag" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="font-black text-base">Rate List &amp; Cost Master</h3>
                <p class="text-[11px] text-slate-400 font-medium">All Items Cost Rates, Sale Rates, Stock &amp; Profit Margins</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="MasterDB.printRateList()" class="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm" title="Print 80mm Rate Sheet">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                <span>Print Rate List</span>
              </button>
              <button type="button" onclick="MasterDB.closeRateListModal()" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
          </div>

          <!-- Summary Stat Cards -->
          <div class="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            <div class="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <i data-lucide="layers" class="w-4 h-4"></i>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total Items</span>
                <span id="rate-list-stat-count" class="text-lg font-black text-slate-800 tabular-nums">0</span>
              </div>
            </div>

            <div class="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <i data-lucide="wallet" class="w-4 h-4"></i>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total Stock Cost</span>
                <span id="rate-list-stat-cost-val" class="text-lg font-black text-red-600 tabular-nums">Rs. 0</span>
              </div>
            </div>

            <div class="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <i data-lucide="trending-up" class="w-4 h-4"></i>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total Retail Value</span>
                <span id="rate-list-stat-retail-val" class="text-lg font-black text-emerald-600 tabular-nums">Rs. 0</span>
              </div>
            </div>

            <div class="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <i data-lucide="percent" class="w-4 h-4"></i>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Avg Profit Margin</span>
                <span id="rate-list-stat-margin" class="text-lg font-black text-amber-600 tabular-nums">0%</span>
              </div>
            </div>
          </div>

          <!-- Filters Row -->
          <div class="p-3 bg-white border-b border-slate-100 flex items-center gap-3 flex-wrap shrink-0">
            <div class="relative flex-1 min-w-[220px]">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="rate-list-search" oninput="MasterDB.applyRateListFilters()" placeholder="Search item name, category..." class="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-500 outline-none">
              <button type="button" id="rate-list-search-clear-btn" onclick="MasterDB.clearRateListSearch()" title="Clear search" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>

            <div class="flex items-center gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Category:</label>
              <select id="rate-list-cat-filter" onchange="MasterDB.applyRateListFilters()" class="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer">
                <option value="all">All Categories</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sort:</label>
              <select id="rate-list-sort" onchange="MasterDB.applyRateListFilters()" class="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer">
                <option value="name_asc">Name (A &rarr; Z)</option>
                <option value="margin_desc">Highest Margin %</option>
                <option value="profit_desc">Highest Profit (Rs.)</option>
                <option value="cost_desc">Highest Cost</option>
                <option value="stock_desc">Highest Stock</option>
              </select>
            </div>
          </div>

          <!-- Rates Table -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100 text-slate-600 uppercase text-[10px] font-black tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th class="py-2.5 px-3 text-center w-10">#</th>
                  <th class="py-2.5 px-3">Item Name</th>
                  <th class="py-2.5 px-3">Category</th>
                  <th class="py-2.5 px-3 text-center">In Stock</th>
                  <th class="py-2.5 px-3 text-right text-red-600 font-black">Cost Price (Rs.)</th>
                  <th class="py-2.5 px-3 text-right text-emerald-600 font-black">Sale Price (Rs.)</th>
                  <th class="py-2.5 px-3 text-right text-blue-600 font-black">Profit (Rs.)</th>
                  <th class="py-2.5 px-3 text-center text-amber-600 font-black">Margin %</th>
                  <th class="py-2.5 px-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody id="rate-list-tbody" class="divide-y divide-slate-100">
                <!-- Injected via renderRateList() -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Style and local container removed, moved to global index.html and print.css -->
    `;

    try {
      await this.loadData();
    } catch(e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  },

  async switchTab(id) {
    this.currentCategory = id;
    
    // Update active tab styles
    document.querySelectorAll('.db-tab').forEach(btn => {
      if (btn.id === `tab-${id}`) {
        btn.className = 'db-tab group w-full text-left px-4 py-1.5 rounded-lg transition-all flex justify-between items-center text-sm bg-white shadow-sm border border-slate-200 text-slate-900 font-bold';
      } else {
        btn.className = 'db-tab group w-full text-left px-4 py-1.5 rounded-lg transition-all flex justify-between items-center text-sm text-slate-600 hover:bg-slate-100 font-medium';
      }
    });

    await this.loadData();
  },

  capitalize(str) {
    if (str === 'item_name') return 'Name';
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  },

  async loadData() {
    // Update category counts in sidebar
    let stats = [];
    try {
      stats = (await window.api.getCategoryStats()) || [];
    } catch (e) {
      console.warn("[MasterDB.loadData] getCategoryStats failed:", e);
      stats = [];
    }
    if (!Array.isArray(stats)) stats = [];

    let totalAll = 0;
    this.categories = this.categories || [];
    stats.forEach(s => {
      totalAll += (s.count || 0);
      const cat = this.categories.find(c => c.id === s.slug);
      if (cat) {
        cat.count = s.count;
        const countSpan = document.getElementById(`count-${s.slug}`);
        if (countSpan) countSpan.textContent = s.count || 0;
      }
    });

    const countAllSpan = document.getElementById('count-all');
    if (countAllSpan) countAllSpan.textContent = totalAll;

    try {
      this.allProducts = (await window.api.getProducts(this.currentCategory || 'all')) || [];
    } catch (e) {
      console.error("[MasterDB.loadData] getProducts failed:", e);
      this.allProducts = [];
    }
    try {
      this.companies = (await window.api.getCompanies()) || [];
    } catch (e) {
      this.companies = [];
    }
    try {
      this.units = (await window.api.getUnits()) || [];
    } catch(e) {
      this.units = [];
    }
    this.applySearch();
  },

  clearDbSearch() {
    const input = document.getElementById('db-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applySearch();
  },

  onSearchInput() {
    const input = document.getElementById('db-search');
    const clearBtn = document.getElementById('db-search-clear-btn');
    if (clearBtn) {
      if ((input?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }
    if (this._searchDebounce) clearTimeout(this._searchDebounce);
    this._searchDebounce = setTimeout(() => this.applySearch(), 90);
  },

  applySearch() {
    this.displayLimit = this.pageSize;
    const searchInput = document.getElementById('db-search');
    const clearBtn = document.getElementById('db-search-clear-btn');
    const query = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const lowStockVal = document.getElementById('db-low-stock-filter')?.value;
    const cat = this.currentCategory === 'all'
      ? { label: 'All Items', fields: ['item_name'] }
      : (this.categories.find(c => c.id === this.currentCategory) || { label: 'Stock', fields: ['item_name'] });
    
    let filtered = this.allProducts || [];
    if (query) {
        filtered = filtered.filter(p => {
            return String(p.item_name || '').toLowerCase().includes(query) ||
                   String(p.description || '').toLowerCase().includes(query) ||
                   String(p.company_name || '').toLowerCase().includes(query) ||
                   String(p.barcode || '').toLowerCase().includes(query);
        });

        // Priority sort by search relevance:
        // 0. exact barcode match
        // 1. item_name starts with query (e.g. "Catry..." when typing "cat")
        // 2. any word in item_name starts with query
        // 3. description starts with query or word in description starts with query
        // 4. general substring match
        filtered.sort((a, b) => {
          const bcA = String(a.barcode || '').toLowerCase();
          const bcB = String(b.barcode || '').toLowerCase();
          if (bcA === query && bcB !== query) return -1;
          if (bcB === query && bcA !== query) return 1;

          const nameA = String(a.item_name || '').toLowerCase();
          const nameB = String(b.item_name || '').toLowerCase();
          const descA = String(a.description || '').toLowerCase();
          const descB = String(b.description || '').toLowerCase();

          const getScore = (name, desc, bc) => {
            if (bc === query) return 0;
            if (name.startsWith(query)) return 1;
            const words = name.split(/[\s\-&/]+/);
            if (words.some(w => w.startsWith(query))) return 2;
            if (desc.startsWith(query)) return 3;
            if (desc.split(/[\s\-&/]+/).some(w => w.startsWith(query))) return 4;
            if (bc.includes(query)) return 5;
            return 6;
          };

          const scoreA = getScore(nameA, descA, bcA);
          const scoreB = getScore(nameB, descB, bcB);

          if (scoreA !== scoreB) {
            return scoreA - scoreB;
          }

          return nameA.localeCompare(nameB);
        });
    }

    if (lowStockVal !== '' && lowStockVal !== undefined && lowStockVal !== null) {
        const limit = parseInt(lowStockVal);
        if (!isNaN(limit)) {
          filtered = filtered.filter(p => (p.current_stock || 0) <= limit);
        }
    }

    this.renderTableBody(filtered);
  },

  renderTableBody(list) {
    this.filteredProducts = list;
    const isAll = this.currentCategory === 'all';
    const cat = isAll
      ? { label: 'All Items', fields: ['item_name'] }
      : (this.categories.find(c => c.id === this.currentCategory) || { label: 'Stock', fields: ['item_name'] });
    
    // Render thead
    const thead = document.getElementById('db-thead');
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th class="px-2 py-2 font-black text-[13px] uppercase tracking-wider border-r border-slate-200 text-center w-10 text-slate-400 bg-slate-50">#</th>
          ${cat.fields.map((f, i) => {
            const colors = ['bg-amber-50 text-amber-700', 'bg-indigo-50 text-indigo-700', 'bg-purple-50 text-purple-700', 'bg-cyan-50 text-cyan-700', 'bg-rose-50 text-rose-700'];
            return `<th class="px-4 py-2 font-black text-[13px] uppercase tracking-wider border-r border-slate-200 ${colors[i % colors.length]}">${this.capitalize(f)}</th>`;
          }).join('')}
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-center text-amber-900 border-r border-slate-200 bg-amber-50">Stock</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right text-red-600 border-r border-slate-200 bg-red-50" title="Cost Price">Cost (Rs.)</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right text-green-600 border-r border-slate-200 bg-green-50" title="Sale Price">Sale (Rs.)</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right text-blue-600 border-r border-slate-200 bg-blue-50" title="Profit per Item">Profit (Rs.)</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right text-purple-700 border-r border-slate-200 bg-purple-50" title="Inventory Value = Stock × Cost">Value</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right bg-slate-100 text-slate-700">Actions</th>
        </tr>
      `;
    }

    // Fast inlined SVG icons to prevent blocking lucide DOM scans on 1,000+ items
    const svgHistory = '<svg class="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
    const svgPrinter = '<svg class="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>';
    const svgEdit = '<svg class="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
    const svgTrash = '<svg class="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';
    const svgStarFav = '<svg class="w-4 h-4 pointer-events-none fill-current" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    const svgStarUnfav = '<svg class="w-4 h-4 pointer-events-none group-hover/fav:fill-amber-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    // Render tbody
    const tbody = document.getElementById('db-tbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${cat.fields.length + 7}" class="px-6 py-12 text-center text-slate-400 border-b border-slate-200 italic font-medium">No items found matching your search.</td></tr>`;
    } else {
      const visibleList = list.slice(0, this.displayLimit);
      tbody.innerHTML = visibleList.map((p, index) => {
        const profit = (p.retail_price || 0) - (p.cost_price || 0);
        const totalBoxes = p.current_stock || 0;
        const itemSlug = p.slug || (this.currentCategory !== 'all' ? this.currentCategory : (this.categories[0]?.id || 'biscuits'));
        const catLabel = this.getCategoryLabel(itemSlug);
        const itemValue = (Number(p.current_stock) || 0) * (Number(p.cost_price) || 0);

        return `
        <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-200">
          <td class="px-2 py-1 border-r border-slate-200 text-center font-bold text-slate-400 tabular-nums">${index + 1}</td>
          ${cat.fields.map(f => {
            let val = p[f] || '-';
            if (f === 'item_name') {
              val = `
                <div class="flex flex-col">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold">${val}</span>
                    ${p.barcode ? `<span class="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded shadow-2xs" title="Barcode: ${p.barcode}"><svg class="w-2.5 h-2.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/></svg>${p.barcode}</span>` : ''}
                    ${isAll ? `<span class="text-[9px] font-black text-amber-800 bg-amber-100/90 border border-amber-200 px-1.5 py-0.2 rounded uppercase">${catLabel}</span>` : ''}
                  </div>
                  ${p.company_name ? `<span class="text-[9px] font-black text-blue-500 uppercase mt-0.5 tracking-widest">${p.company_name}</span>` : ''}
                </div>
              `;
            }
            return `<td class="px-4 py-1 font-medium text-slate-800 border-r border-slate-200 text-xs">${val}</td>`;
          }).join('')}
          <td class="px-3 py-1 text-center border-r border-slate-200 font-bold text-xs whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5 ${totalBoxes > 0 ? 'bg-amber-50/80 border border-amber-200 text-amber-950 font-black' : 'bg-rose-50 border border-rose-200 text-rose-700 font-bold'} px-2.5 py-0.5 rounded-lg shadow-sm" title="${app.formatQty(totalBoxes)} ${p.unit || 'pcs'} in stock">
              <span>${app.formatQty(totalBoxes)}</span>
              <span class="text-[10px] text-slate-500 font-bold uppercase">${p.unit || 'pcs'}</span>
            </div>
          </td>
          <td class="px-3 py-1 tabular-nums text-xs text-right bg-red-50/30 text-red-700 border-r border-slate-200 font-medium">${app.formatNumber(p.cost_price)}</td>
          <td class="px-3 py-1 tabular-nums text-xs text-right bg-green-50/30 text-green-700 border-r border-slate-200 font-medium">${app.formatNumber(p.retail_price)}</td>
          <td class="px-3 py-1 tabular-nums text-xs text-right bg-blue-50/30 text-blue-700 border-r border-slate-200 font-medium">${app.formatNumber(profit)}</td>
          <td class="px-3 py-1 tabular-nums text-xs text-right bg-purple-50/30 text-purple-900 border-r border-slate-200 font-black">${app.formatNumber(Math.round(itemValue))}</td>
          <td class="px-3 py-1 text-right font-medium">
            <div class="flex items-center justify-end gap-1.5 transition-opacity">
              <button onclick="app.navigate('rate-list', { slug: '${itemSlug}', id: ${p.id} })" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer" title="Rate Changes Log &amp; Cost History">
                ${svgHistory}
              </button>
              <button onclick="MasterDB.toggleFavorite('${itemSlug}', ${p.id})" class="group/fav p-1.5 ${p.is_favorite ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'} rounded-lg transition-all flex items-center justify-center cursor-pointer" title="Toggle Favorite">
                ${p.is_favorite ? svgStarFav : svgStarUnfav}
              </button>
              <button onclick="MasterDB.printRowSticker(${p.id}, '${itemSlug}')" class="p-1.5 ${p.barcode ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'} rounded-lg transition-all cursor-pointer" title="${p.barcode ? 'Print Barcode Sticker (Speed-X)' : 'No barcode assigned (Edit item to generate)'}">
                ${svgPrinter}
              </button>
              <button onclick="MasterDB.openForm(${p.id}, '${itemSlug}')" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer" title="Edit Item">
                ${svgEdit}
              </button>
              <button onclick="MasterDB.deleteItem(${p.id}, '${itemSlug}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Delete Item">
                ${svgTrash}
              </button>
            </div>
          </td>
        </tr>
      `;}).join('');
    }

    // Render bottom row for total in tfoot
    const tfoot = document.getElementById('db-tfoot');
    if (tfoot) {
      if (list.length === 0) {
        tfoot.innerHTML = '';
      } else {
        const totalStock = list.reduce((sum, p) => sum + (Number(p.current_stock) || 0), 0);
        const totalValue = list.reduce((sum, p) => sum + ((Number(p.current_stock) || 0) * (Number(p.cost_price) || 0)), 0);

        tfoot.innerHTML = `
          <tr class="bg-slate-100 border-t-2 border-slate-300 font-black text-xs text-slate-900 shadow-sm">
            <td class="px-2 py-2 text-center text-slate-400 font-black border-r border-slate-300 bg-slate-100">#</td>
            <td class="px-4 py-2 font-black text-slate-900 border-r border-slate-300 text-xs uppercase tracking-wider bg-slate-100">
              <div class="flex items-center gap-2">
                <span class="text-amber-700 uppercase font-black tracking-widest text-[11px]">Total:</span>
                <span class="text-slate-700 font-bold text-xs">${list.length} Items</span>
              </div>
            </td>
            ${cat.fields.slice(1).map(() => '<td class="border-r border-slate-300 bg-slate-100"></td>').join('')}
            <td class="px-3 py-2 text-center border-r border-slate-300 font-black text-xs text-amber-950 bg-amber-100/90 whitespace-nowrap">
              ${app.formatQty(totalStock)}
            </td>
            <td class="px-3 py-2 text-right border-r border-slate-300 font-bold text-xs text-slate-400 bg-slate-100">-</td>
            <td class="px-3 py-2 text-right border-r border-slate-300 font-bold text-xs text-slate-400 bg-slate-100">-</td>
            <td class="px-3 py-2 text-right border-r border-slate-300 font-bold text-xs text-slate-400 bg-slate-100">-</td>
            <td class="px-3 py-2 text-right border-r border-slate-300 font-black text-xs text-purple-950 bg-purple-100 tabular-nums whitespace-nowrap shadow-2xs">
              Rs. ${app.formatNumber(Math.round(totalValue))}
            </td>
            <td class="px-3 py-2 text-right font-medium text-slate-400 bg-slate-100">-</td>
          </tr>
        `;
      }
    }

    // Render footer pagination
    const footer = document.getElementById('db-table-footer');
    if (footer) {
      const total = list.length;
      const current = Math.min(this.displayLimit, total);
      const hasMore = total > current;
      const totalStock = list.reduce((sum, p) => sum + (Number(p.current_stock) || 0), 0);
      const totalValue = list.reduce((sum, p) => sum + ((Number(p.current_stock) || 0) * (Number(p.cost_price) || 0)), 0);

      footer.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span>Showing <span class="text-slate-900 font-black">${current}</span> of <span class="text-slate-900 font-black">${total}</span> items</span>
          <span class="text-slate-300 mx-1">|</span>
          <span class="text-slate-600">Total Stock: <span class="text-amber-900 font-black">${app.formatQty(totalStock)}</span></span>
          <span class="text-slate-300 mx-1">|</span>
          <span class="text-slate-600">Total Value: <span class="text-purple-900 font-black">Rs. ${app.formatNumber(Math.round(totalValue))}</span></span>
        </div>
        <div class="flex items-center gap-2">
          ${hasMore ? `
            <button onclick="MasterDB.loadMore()" class="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-xs font-black shadow-2xs transition-all cursor-pointer flex items-center gap-1.5">
              <span>+ Load ${Math.min(this.pageSize, total - current)} More</span>
            </button>
            <button onclick="MasterDB.showAll()" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer">
              <span>Show All (${total})</span>
            </button>
          ` : `
            <span class="text-slate-400 font-medium">All items loaded</span>
          `}
        </div>
      `;
    }
  },

  loadMore() {
    this.displayLimit += this.pageSize;
    this.renderTableBody(this.filteredProducts || this.allProducts || []);
  },

  showAll() {
    this.displayLimit = (this.filteredProducts || this.allProducts || []).length;
    this.renderTableBody(this.filteredProducts || this.allProducts || []);
  },

  syncStockInputs(source = null) {
    // No-op - stock is managed directly in boxes
  },

  openForm(dataOrId = null, targetSlug = null) {
    let data = (typeof dataOrId === 'object' && dataOrId !== null) ? dataOrId : null;
    const itemSlug = targetSlug || (data && data.slug) || (this.currentCategory !== 'all' ? this.currentCategory : (this.categories[0]?.id || 'biscuits'));
    this._editingCatSlug = itemSlug;

    if (!data && (typeof dataOrId === 'number' || typeof dataOrId === 'string')) {
      const targetId = Number(dataOrId);
      // Priority 1: Match by both ID and category slug (essential because each category table has independent IDs 1, 2, 3...)
      if (itemSlug) {
        data = (this.filteredProducts || []).find(p => p.id == targetId && String(p.slug || '').toLowerCase() === String(itemSlug || '').toLowerCase()) ||
               (this.allProducts || []).find(p => p.id == targetId && String(p.slug || '').toLowerCase() === String(itemSlug || '').toLowerCase()) ||
               (this.rateListItems || []).find(p => p.id == targetId && String(p.slug || '').toLowerCase() === String(itemSlug || '').toLowerCase()) || null;
      }
      // Priority 2: Fallback if category slug wasn't matched
      if (!data) {
        data = (this.filteredProducts || []).find(p => p.id == targetId) ||
               (this.allProducts || []).find(p => p.id == targetId) ||
               (this.rateListItems || []).find(p => p.id == targetId) || null;
      }
    }
    const cat = this.categories.find(c => c.id === itemSlug) || { label: 'Stock', fields: ['item_name'] };
    
    document.getElementById('db-modal-title').textContent = data ? `Edit ${cat.label} Item` : `Add Item (${cat.label})`;
    document.getElementById('db-id').value = data ? data.id : '';
    document.getElementById('db-stock').value = data ? (data.current_stock ?? '') : '';
    document.getElementById('db-cost').value = data ? data.cost_price : '';
    document.getElementById('db-retail').value = data ? data.retail_price : '';

    const barcodeInput = document.getElementById('db-barcode');
    if (barcodeInput) {
      barcodeInput.value = data ? (data.barcode || '') : '';
      barcodeInput.classList.remove('border-rose-500', 'bg-rose-50/20');
    }
    const bcWarning = document.getElementById('db-barcode-dup-warning');
    if (bcWarning) bcWarning.classList.add('hidden');

    // Handle Last Purchase field (visible only when editing an item, uneditable)
    const lpContainer = document.getElementById('db-last-purchase-container');
    const lpInput = document.getElementById('db-last-purchase');
    const pricesRow = document.getElementById('db-prices-row');

    if (data) {
      if (lpContainer) lpContainer.classList.remove('hidden');
      if (pricesRow) {
        pricesRow.classList.remove('md:grid-cols-3');
        pricesRow.classList.add('grid-cols-2', 'md:grid-cols-4');
      }

      // Initial price from product data (last_purchase_price or fallback to cost_price)
      const initialPrice = (data.last_purchase_price !== null && data.last_purchase_price !== undefined && Number(data.last_purchase_price) > 0)
        ? Number(data.last_purchase_price)
        : (Number(data.cost_price) || 0);

      if (lpInput) {
        lpInput.value = initialPrice > 0 ? `Rs. ${app.formatQty(initialPrice)}` : 'Rs. 0';
        lpInput.title = `Recent Purchase Price: Rs. ${app.formatQty(initialPrice)}`;
      }

      // Asynchronously query latest rate history to guarantee freshest purchase rate
      if (data.id && window.api && window.api.getRateHistory) {
        window.api.getRateHistory(itemSlug, data.id).then(history => {
          const purchases = (history || []).filter(h => Number(h.purchase_price) > 0);
          if (purchases.length > 0) {
            const recent = purchases[0];
            const pPrice = Number(recent.purchase_price);
            if (lpInput) {
              lpInput.value = `Rs. ${app.formatQty(pPrice)}`;
              const dateStr = recent.created_at ? ` on ${app.formatDate(recent.created_at)}` : '';
              const srcStr = recent.source ? ` (${recent.source})` : '';
              lpInput.title = `Last purchase${dateStr} at Rs. ${app.formatQty(pPrice)}${srcStr}`;
            }
          }
        }).catch(err => {
          console.warn('[openForm] Failed to load rate history:', err);
        });
      }
    } else {
      if (lpContainer) lpContainer.classList.add('hidden');
      if (pricesRow) {
        pricesRow.classList.remove('grid-cols-2', 'md:grid-cols-4');
        pricesRow.classList.add('grid-cols-1', 'md:grid-cols-3');
      }
      if (lpInput) {
        lpInput.value = '';
        lpInput.title = '';
      }
    }

    const unitSelect = document.getElementById('db-unit');
    if (unitSelect) {
      const currentUnit = (data && data.unit) ? String(data.unit).toUpperCase() : 'PCS';
      const unitsList = (this.units && this.units.length) ? this.units : [
        { name: 'PCS' }, { name: 'PACKET' }, { name: 'BOTTLE' }, { name: 'KG' },
        { name: 'GRAM' }, { name: 'LITER' }, { name: 'BOX' }, { name: 'CARTON' },
        { name: 'CAN' }, { name: 'BAG' }, { name: 'DOZEN' }, { name: 'SET' }
      ];
      const hasUnit = unitsList.some(u => u.name.toUpperCase() === currentUnit);
      let opts = unitsList.map(u => {
        const uName = u.name.toUpperCase();
        return `<option value="${uName.toLowerCase()}" ${uName === currentUnit ? 'selected' : ''}>${uName}</option>`;
      }).join('');
      if (!hasUnit && currentUnit) {
        opts = `<option value="${currentUnit.toLowerCase()}" selected>${currentUnit}</option>` + opts;
      }
      unitSelect.innerHTML = opts;
    }

    const compSelect = document.getElementById('db-company');
    if (compSelect) {
      const currentCompId = (data && data.company_id) ? String(data.company_id) : '';
      const compList = (this.companies && this.companies.length) ? this.companies : [];
      let compOpts = '<option value="">-- None (No Supplier) --</option>';
      compOpts += compList.map(c => `
        <option value="${c.id}" ${String(c.id) === currentCompId ? 'selected' : ''}>${c.name}</option>
      `).join('');
      compSelect.innerHTML = compOpts;
    }

    const catSelect = document.getElementById('db-category');
    if (catSelect) {
      const catList = (this.categories && this.categories.length) ? this.categories : [];
      catSelect.innerHTML = catList.map(c => `
        <option value="${c.id}" ${c.id === itemSlug ? 'selected' : ''}>${c.label}</option>
      `).join('');
      catSelect.value = itemSlug;
    }

    const dynamicContainer = document.getElementById('db-dynamic-fields');
    dynamicContainer.innerHTML = cat.fields.map(f => {
      const isReq = f !== 'description';
      const labelText = f === 'item_name' ? 'Item Name' : this.capitalize(f);
      const onInputAttr = f === 'item_name' ? 'oninput="MasterDB.onItemNameInput(this.value)"' : '';
      return `
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">${labelText} ${isReq ? '*' : '<span class="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>'}</label>
        <input type="text" id="db-field-${f}" ${isReq ? 'required' : ''} ${onInputAttr} class="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-accent focus:border-accent text-sm" value="${data ? (data[f] || '') : ''}">
        ${f === 'item_name' ? `
          <div id="db-item-name-dup-warning" class="hidden text-xs font-bold text-rose-600 mt-1.5 flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg">
            <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-rose-600"></i>
            <span id="db-item-name-dup-text"></span>
          </div>
        ` : ''}
      </div>
    `;}).join('');

    const modal = document.getElementById('db-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const btnNext = document.getElementById('btn-save-next');
    if (btnNext) {
      if (data) btnNext.classList.add('hidden');
      else btnNext.classList.remove('hidden');
    }

    this.updateFormProfits();
    this.updateStickerButtonState(data ? (data.barcode || '') : '');

    setTimeout(() => {
      modal.classList.remove('opacity-0');
      document.getElementById('db-card').classList.remove('scale-95');
    }, 10);
  },

  onCategorySelectChange(newCatSlug) {
    const isEditing = Boolean(document.getElementById('db-id')?.value);
    const cat = (this.categories || []).find(c => c.id === newCatSlug);
    const catLabel = cat ? cat.label : newCatSlug;
    const titleEl = document.getElementById('db-modal-title');
    if (titleEl) {
      titleEl.textContent = isEditing ? `Edit ${catLabel} Item` : `Add Item (${catLabel})`;
    }
    const nameInput = document.getElementById('db-field-item_name');
    if (nameInput) {
      this.onItemNameInput(nameInput.value);
    }
  },

  _nameCheckTimeout: null,
  onItemNameInput(val) {
    clearTimeout(this._nameCheckTimeout);
    const warningEl = document.getElementById('db-item-name-dup-warning');
    const warningText = document.getElementById('db-item-name-dup-text');
    const inputEl = document.getElementById('db-field-item_name');

    const cleanName = (val || '').trim();
    if (!cleanName || cleanName.length < 2) {
      if (warningEl) warningEl.classList.add('hidden');
      if (inputEl) inputEl.classList.remove('border-rose-500', 'focus:ring-rose-200', 'bg-rose-50/20');
      return;
    }

    this._nameCheckTimeout = setTimeout(async () => {
      const id = document.getElementById('db-id')?.value;
      const originalCat = this._editingCatSlug || (this.currentCategory !== 'all' ? this.currentCategory : (this.categories[0]?.id || 'biscuits'));
      try {
        const dup = await window.api.findProductByName(cleanName, originalCat, id ? parseInt(id) : null);
        if (dup && inputEl && inputEl.value.trim().toLowerCase() === cleanName.toLowerCase()) {
          if (warningEl && warningText) {
            warningText.innerHTML = `Item <b>"${dup.item_name}"</b> is already in stock under <b>${dup.category_label || dup.slug}</b>. Duplicate items cannot be added.`;
            warningEl.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
          }
          inputEl.classList.add('border-rose-500', 'focus:ring-rose-200', 'bg-rose-50/20');
        } else {
          if (warningEl) warningEl.classList.add('hidden');
          if (inputEl) inputEl.classList.remove('border-rose-500', 'focus:ring-rose-200', 'bg-rose-50/20');
        }
      } catch(e) {}
    }, 250);
  },

  generateRandomBarcode() {
    const input = document.getElementById('db-barcode');
    const currentVal = (input?.value || '').trim();
    if (currentVal) {
      app.showToast('Item already has a barcode assigned. Barcodes can only be generated once.', 'warning');
      return;
    }
    // Generate a clean 12-digit EAN-style barcode starting with 200 (store custom range)
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    const generated = `200${randomDigits}`;
    if (input) {
      input.value = generated;
      this.onBarcodeChange(generated);
      this.updateStickerButtonState(generated);
      app.playBeep('success');
      app.showToast(`Generated barcode: ${generated}. Save item to apply.`, 'info');
    }
  },

  updateStickerButtonState(barcodeVal = null) {
    if (barcodeVal === null) {
      barcodeVal = (document.getElementById('db-barcode')?.value || '').trim();
    }
    const clean = String(barcodeVal || '').trim();
    const hasBarcode = clean.length > 0;

    const generateBtn = document.getElementById('db-btn-generate');
    if (generateBtn) {
      if (hasBarcode) {
        generateBtn.disabled = true;
        generateBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        generateBtn.classList.remove('cursor-pointer');
        generateBtn.title = 'Barcode already assigned. An item can only receive a barcode once.';
      } else {
        generateBtn.disabled = false;
        generateBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        generateBtn.classList.add('cursor-pointer');
        generateBtn.title = 'Auto-generate a unique 12-digit barcode';
      }
    }
  },

  printRowSticker(id, itemSlug) {
    const item = (this.filteredProducts || []).find(p => p.id === Number(id) && (!itemSlug || p.slug === itemSlug)) ||
                 (this.allProducts || []).find(p => p.id === Number(id) && (!itemSlug || p.slug === itemSlug)) ||
                 (this.products || []).find(p => p.id === Number(id)) ||
                 (this.allProducts || []).find(p => p.id === Number(id));
    if (!item) {
      app.showAlert({ title: 'Item Not Found', message: 'Could not find the requested item to print stickers.' });
      return;
    }
    if (!item.barcode || !String(item.barcode).trim()) {
      app.showAlert({
        title: 'Missing Barcode',
        message: `Item <b>"${item.item_name}"</b> has no barcode assigned yet.<br><br>Please click <b>Edit</b> (<svg class="inline w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>) to generate and save a barcode first before printing stickers.`,
        buttonText: 'OK'
      });
      return;
    }
    if (!item.category_label || ['panels', 'solar panels', 'inverters', 'structures', 'cables', 'breakers', 'batteries'].includes(String(item.category_label).toLowerCase())) {
      item.category_label = this.getCategoryLabel(itemSlug || item.slug);
    }
    app.openBarcodeStickerModal(item, itemSlug);
  },

  _barcodeCheckTimeout: null,
  onBarcodeChange(val) {
    this.updateStickerButtonState(val);
    clearTimeout(this._barcodeCheckTimeout);
    const warningEl = document.getElementById('db-barcode-dup-warning');
    const warningText = document.getElementById('db-barcode-dup-text');
    const inputEl = document.getElementById('db-barcode');

    const cleanBc = (val || '').trim();
    if (!cleanBc) {
      if (warningEl) warningEl.classList.add('hidden');
      if (inputEl) inputEl.classList.remove('border-rose-500', 'bg-rose-50/20');
      return;
    }

    this._barcodeCheckTimeout = setTimeout(async () => {
      const id = document.getElementById('db-id')?.value;
      const originalCat = this._editingCatSlug || (this.currentCategory !== 'all' ? this.currentCategory : (this.categories[0]?.id || 'biscuits'));
      try {
        const dup = await window.api.findProductByBarcode(cleanBc, originalCat, id ? parseInt(id) : null);
        if (dup && inputEl && inputEl.value.trim().toLowerCase() === cleanBc.toLowerCase()) {
          if (warningEl && warningText) {
            warningText.innerHTML = `Barcode already used by <b>"${dup.item_name}"</b> (${dup.category_label || dup.slug}).`;
            warningEl.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
          }
          inputEl.classList.add('border-rose-500', 'bg-rose-50/20');
        } else {
          if (warningEl) warningEl.classList.add('hidden');
          if (inputEl) inputEl.classList.remove('border-rose-500', 'bg-rose-50/20');
        }
      } catch (e) {}
    }, 250);
  },

  onBarcodeKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      app.playBeep('success');
      // Keep barcode in the field without auto-saving
    }
  },

  updateFormProfits() {
    const costInput = document.getElementById('db-cost');
    const retailInput = document.getElementById('db-retail');

    if (!costInput || !retailInput) return;

    const cost = parseFloat(costInput.value) || 0;
    const retail = parseFloat(retailInput.value) || 0;

    // Profit calculations
    const retailProfit = retail - cost;
    const retailMargin = retail > 0 ? ((retailProfit / retail) * 100) : 0;

    const elRetailProfit = document.getElementById('db-retail-profit');
    if (elRetailProfit) {
      if (!costInput.value && !retailInput.value) {
        elRetailProfit.value = 'Rs. 0 (0%)';
        elRetailProfit.className = 'w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 font-bold text-slate-400 text-sm outline-none cursor-default';
      } else if (retailProfit >= 0) {
        elRetailProfit.value = `Rs. ${Math.round(retailProfit).toLocaleString()} (${retailMargin.toFixed(1)}%)`;
        elRetailProfit.className = 'w-full border border-emerald-300 bg-emerald-50/90 rounded-lg p-2.5 font-black text-emerald-700 text-sm outline-none cursor-default shadow-sm';
      } else {
        elRetailProfit.value = `-Rs. ${Math.abs(Math.round(retailProfit)).toLocaleString()} (${retailMargin.toFixed(1)}%)`;
        elRetailProfit.className = 'w-full border border-red-300 bg-red-50/90 rounded-lg p-2.5 font-black text-red-600 text-sm outline-none cursor-default shadow-sm';
      }
    }
  },

  closeForm() {
    const modal = document.getElementById('db-modal');
    modal.classList.add('opacity-0');
    document.getElementById('db-card').classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 200);
  },

  closeModal() {
    this.closeForm();
  },

  printCurrentFormSticker() {
    const id = document.getElementById('db-id')?.value;
    const name = document.getElementById('db-field-item_name')?.value || 'New Item';
    const barcode = (document.getElementById('db-barcode')?.value || '').trim();
    if (!barcode) {
      app.showToast('Please generate or enter a barcode first.', 'warning');
      return;
    }
    const price = Number(document.getElementById('db-retail')?.value || 0);
    const stock = Number(document.getElementById('db-stock')?.value || 1);
    const cat = document.getElementById('db-category')?.value || this.currentCategory;
    app.openBarcodeStickerModal({
      id: id ? parseInt(id) : 0,
      item_name: name,
      barcode: barcode,
      retail_price: price,
      current_stock: stock,
      slug: cat,
      category_label: this.getCategoryLabel(cat)
    });
  },


  async saveForm(e, stayOpen = false) {
    if (e) e.preventDefault();
    const form = document.getElementById('db-form');
    if (form && !form.reportValidity()) return;

    const id = document.getElementById('db-id').value;
    const originalCat = this._editingCatSlug || (this.currentCategory !== 'all' ? this.currentCategory : (this.categories[0]?.id || 'biscuits'));
    const selectedCat = document.getElementById('db-category')?.value || originalCat;
    const cat = this.categories.find(c => c.id === selectedCat) || this.categories.find(c => c.id === originalCat) || { fields: ['item_name'] };
    
    const costPrice = parseFloat(document.getElementById('db-cost').value) || 0;
    const retailPrice = parseFloat(document.getElementById('db-retail').value) || 0;

    const unitVal = (document.getElementById('db-unit')?.value || 'pcs').trim().toLowerCase();
    const compVal = document.getElementById('db-company')?.value;
    const companyId = compVal ? parseInt(compVal) : null;
    const data = {
      current_stock: parseFloat(document.getElementById('db-stock').value) || 0,
      unit: unitVal,
      cost_price: costPrice,
      retail_price: retailPrice,
      wholesale_cost_price: costPrice,
      wholesale_price: retailPrice,
      company_id: companyId
    };

    if (data.cost_price <= 0) {
      app.showAlert({
        title: 'Invalid Cost',
        message: 'Cost must be greater than 0.'
      });
      return;
    }

    if (data.retail_price <= data.cost_price) {
      app.showAlert({
        title: 'Invalid Prices',
        message: 'Sell Price must be greater than Cost to ensure profit.'
      });
      return;
    }
    
    cat.fields.forEach(f => {
      data[f] = document.getElementById(`db-field-${f}`).value;
    });

    const barcodeVal = (document.getElementById('db-barcode')?.value || '').trim();
    if (barcodeVal) {
      data.barcode = barcodeVal;
    } else {
      data.barcode = null;
    }

    const itemName = (data.item_name || '').trim();
    if (!itemName) {
      app.showAlert({
        title: 'Missing Item Name',
        message: 'Please enter an item name.'
      });
      return;
    }
    data.item_name = itemName;

    // Validate duplicate item in stock across categories
    try {
      const dup = await window.api.findProductByName(itemName, originalCat, id ? parseInt(id) : null);
      if (dup) {
        app.showAlert({
          title: 'Duplicate Item in Stock',
          message: `An item named <b>"${dup.item_name || itemName}"</b> is already in stock under <b>${dup.category_label || dup.slug}</b>.<br><br>Duplicate stock items cannot be added.`
        });
        const inputEl = document.getElementById('db-field-item_name');
        if (inputEl) {
          inputEl.focus();
          inputEl.select();
        }
        return;
      }

      if (barcodeVal) {
        const dupBc = await window.api.findProductByBarcode(barcodeVal, originalCat, id ? parseInt(id) : null);
        if (dupBc) {
          app.showAlert({
            title: 'Duplicate Barcode',
            message: `Barcode <b>"${barcodeVal}"</b> is already assigned to <b>"${dupBc.item_name}"</b> under <b>${dupBc.category_label || dupBc.slug}</b>.`
          });
          const bcInput = document.getElementById('db-barcode');
          if (bcInput) {
            bcInput.focus();
            bcInput.select();
          }
          return;
        }
      }
    } catch (checkErr) {
      console.error('Duplicate check error:', checkErr);
    }

    app.showLoading();
    try {
      if (id) {
        if (selectedCat !== originalCat) {
          await window.api.changeProductCategory(originalCat, selectedCat, parseInt(id), data);
          this._editingCatSlug = selectedCat;
        } else {
          await window.api.updateProduct(originalCat, parseInt(id), data);
        }
      } else {
        await window.api.addProduct(selectedCat, data);
      }
      
      if (stayOpen) {
        this.openForm(null, selectedCat);
        app.showNotification?.({
          title: 'Success',
          message: 'Item saved successfully. You can now enter the next one.',
          type: 'success'
        });
      } else {
        this.closeForm();
      }
      await this.loadData();
    } catch(err) {
      console.error(err);
      app.showAlert({
        title: 'Cannot Save Item',
        message: err.message || 'An error occurred while saving the item.'
      });
    } finally {
      app.hideLoading();
    }
  },

  deleteItem(id, targetSlug = null) {
    const targetCat = targetSlug || (this.currentCategory !== 'all' ? this.currentCategory : (this.categories[0]?.id || 'biscuits'));
    app.verifyPassword({
      title: 'Delete Item Verification',
      message: 'Please enter password to delete this item:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Item',
          message: 'Are you sure you want to delete this item from the catalog?',
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            await window.api.deleteProduct(targetCat, id);
            await this.loadData();
            app.hideLoading();
          }
        });
      }
    });
  },

  async toggleFavorite(category, id) {
    await window.api.toggleFavorite(category, id);
    await this.loadData();
  },

  async openManageCategoriesModal(resetTab = false) {
    if (resetTab) {
      const btnCat = document.getElementById('cat-tab-categories');
      const btnUni = document.getElementById('cat-tab-units');
      const secCat = document.getElementById('cat-section-categories');
      const secUni = document.getElementById('cat-section-units');
      if (btnCat && btnUni && secCat && secUni) {
        btnCat.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all bg-white shadow-sm text-slate-900';
        btnUni.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700';
        secCat.classList.remove('hidden');
        secUni.classList.add('hidden');
      }
    }
    const stats = await window.api.getCategoryStats();
    const list = document.getElementById('cat-list');

    list.innerHTML = `
      <div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table class="w-full text-sm text-left border-collapse">
          <thead class="sticky top-0 z-10">
            <tr>
              <th class="px-2 py-2 border-b border-r border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-10 bg-slate-50">#</th>
              <th class="px-4 py-2 border-b border-r border-amber-100 text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50">Category Name</th>
              <th class="px-4 py-2 border-b border-r border-blue-100 text-[10px] font-black text-blue-700 uppercase tracking-widest text-center bg-blue-50">Items</th>
              <th class="px-4 py-2 border-b border-rose-100 text-[10px] font-black text-rose-700 uppercase tracking-widest text-center bg-rose-50">Actions</th>
            </tr>
          </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              ${stats.map((s, idx) => {
                return `
                  <tr class="group hover:bg-slate-50/50 transition-colors">
                    <td class="px-3 py-1.5 border-r border-slate-100 text-center font-bold text-slate-400 tabular-nums">${idx + 1}</td>
                    <td class="px-4 py-1.5 border-r border-slate-100">
                      <input type="text" id="cat-input-${s.slug}" value="${s.label}" 
                         onfocus="MasterDB.enterEditMode('${s.slug}')"
                         onkeydown="if(event.key==='Enter') MasterDB.handleCategoryRename('${s.slug}', this.value)"
                         class="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-800 font-bold text-sm transition-colors cursor-text focus:text-accent">
                    </td>
                    <td class="px-4 py-1.5 border-r border-slate-100 text-right tabular-nums font-bold text-sm text-slate-800">
                      ${s.count}
                    </td>
                    <td class="px-4 py-1.5 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <!-- Normal State -->
                        <div id="cat-actions-normal-${s.slug}" class="flex items-center gap-1">
                          <button onclick="MasterDB.handleCategoryDelete('${s.slug}')" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5" stroke-width="2.5"></i>
                          </button>
                          <button onclick="document.getElementById('cat-input-${s.slug}').focus()" class="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Rename">
                            <i data-lucide="edit-2" class="w-3.5 h-3.5" stroke-width="2.5"></i>
                          </button>
                        </div>
                        <!-- Edit State -->
                        <div id="cat-actions-edit-${s.slug}" class="flex items-center gap-1 hidden">
                          <button onmousedown="MasterDB.handleCategoryRename('${s.slug}', document.getElementById('cat-input-${s.slug}').value)" class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Save">
                            <i data-lucide="check" class="w-4 h-4" stroke-width="3"></i>
                          </button>
                          <button onmousedown="MasterDB.openManageCategoriesModal()" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Cancel">
                            <i data-lucide="x" class="w-4 h-4" stroke-width="3"></i>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
        </table>
      </div>
    `;
    const modal = document.getElementById('cat-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      document.getElementById('cat-card').classList.remove('scale-95');
    }, 10);
    if (window.lucide) lucide.createIcons();
  },

  enterEditMode(slug) {
    const normal = document.getElementById(`cat-actions-normal-${slug}`);
    const edit = document.getElementById(`cat-actions-edit-${slug}`);
    if (normal && edit) {
        normal.classList.add('hidden');
        edit.classList.remove('hidden');
    }
  },

  async addNewCategory() {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    if (!name) return;

    app.showLoading();
    const res = await window.api.addCategory(name);
    app.hideLoading();

    if (res.error) {
      app.showAlert(res.error);
    } else {
      input.value = '';
      const c = document.getElementById('tab-panel-master-db') || document.getElementById('app-content');
      await this.render(c); // Refresh sidebar
      await this.openManageCategoriesModal();
    }
  },

  async handleCategoryRename(slug, newLabel) {
    if (!newLabel || newLabel.trim() === '') return;
    app.showLoading();
    await window.api.updateCategoryLabel(slug, newLabel.trim());
    app.hideLoading();
    const c = document.getElementById('tab-panel-master-db') || document.getElementById('app-content');
    await this.render(c); // Refresh sidebar
    await this.openManageCategoriesModal();
  },

  async handleCategoryDelete(slug) {
    app.verifyPassword({
      title: 'Delete Category Verification',
      message: 'Please enter password to delete this category and all its items:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Category',
          message: 'Are you sure you want to delete this category? This will PERMANENTLY delete ALL ITEMS in this category and cannot be undone.',
          confirmText: 'Delete Everything',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            const res = await window.api.deleteCategory(slug);
            if (res.error) {
              app.hideLoading();
              app.showAlert(res.error);
            } else {
              if (this.currentCategory === slug) {
                const stats = await window.api.getCategoryStats();
                this.currentCategory = stats.length > 0 ? stats[0].slug : '';
              }
              const c = document.getElementById('tab-panel-master-db') || document.getElementById('app-content');
              await this.render(c);
              await this.openManageCategoriesModal();
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  closeCategoriesModal() {
    const modal = document.getElementById('cat-modal');
    modal.classList.add('opacity-0');
    document.getElementById('cat-card').classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 200);
  },

  switchManageTab(tab) {
    const btnCat = document.getElementById('cat-tab-categories');
    const btnUni = document.getElementById('cat-tab-units');
    const secCat = document.getElementById('cat-section-categories');
    const secUni = document.getElementById('cat-section-units');

    if (tab === 'categories') {
        btnCat.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all bg-white shadow-sm text-slate-900';
        btnUni.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700';
        secCat.classList.remove('hidden');
        secUni.classList.add('hidden');
        this.openManageCategoriesModal();
    } else {
        btnUni.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all bg-white shadow-sm text-slate-900';
        btnCat.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700';
        secUni.classList.remove('hidden');
        secCat.classList.add('hidden');
        this.renderUnitsList();
    }
    if (window.lucide) lucide.createIcons();
  },

  async renderUnitsList() {
    this.units = await window.api.getUnits();
    const list = document.getElementById('units-list');
    
    list.innerHTML = `
      <div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table class="w-full text-sm text-left border-collapse">
          <thead>
            <tr>
              <th class="px-2 py-2 border-b border-r border-slate-200 text-[10px] font-black text-slate-500 bg-slate-50 text-center w-10">#</th>
              <th class="px-4 py-2 border-b border-r border-amber-100 text-[10px] font-black text-amber-700 bg-amber-50">Unit Name</th>
              <th class="px-4 py-2 border-b border-rose-100 text-[10px] font-black text-rose-700 bg-rose-50 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${this.units.map((u, idx) => `
              <tr class="group hover:bg-slate-50/50">
                <td class="px-3 py-1.5 border-r border-slate-100 text-center font-bold text-slate-400 tabular-nums text-xs">${idx + 1}</td>
                <td class="px-4 py-1.5 border-r border-slate-100">
                  <input type="text" id="unit-input-${u.id}" value="${u.name}" 
                    onfocus="MasterDB.enterUnitEditMode(${u.id})"
                    onkeydown="if(event.key==='Enter') MasterDB.handleUnitRename(${u.id}, this.value)"
                    class="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-800 font-bold text-sm transition-colors uppercase cursor-text focus:text-accent">
                </td>
                <td class="px-4 py-1.5 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <div id="unit-actions-normal-${u.id}" class="flex items-center gap-1">
                      <button onclick="MasterDB.handleUnitDelete(${u.id})" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5" stroke-width="2.5"></i>
                      </button>
                      <button onclick="document.getElementById('unit-input-${u.id}').focus()" class="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="Rename">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5" stroke-width="2.5"></i>
                      </button>
                    </div>
                    <div id="unit-actions-edit-${u.id}" class="flex items-center gap-1 hidden">
                      <button onmousedown="MasterDB.handleUnitRename(${u.id}, document.getElementById('unit-input-${u.id}').value)" class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Save">
                        <i data-lucide="check" class="w-4 h-4" stroke-width="3"></i>
                      </button>
                      <button onmousedown="MasterDB.renderUnitsList()" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Cancel">
                        <i data-lucide="x" class="w-4 h-4" stroke-width="3"></i>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  },

  enterUnitEditMode(id) {
    document.getElementById(`unit-actions-normal-${id}`)?.classList.add('hidden');
    document.getElementById(`unit-actions-edit-${id}`)?.classList.remove('hidden');
  },

  async addNewUnit() {
    const name = document.getElementById('new-unit-name').value.trim();
    if (!name) return;
    await window.api.addUnit(name);
    document.getElementById('new-unit-name').value = '';
    await this.renderUnitsList();
  },

  async handleUnitRename(id, newName) {
    if (!newName.trim()) return;
    await window.api.updateUnit(id, newName.trim());
    await this.renderUnitsList();
  },

  async handleUnitDelete(id) {
    app.verifyPassword({
      title: 'Delete Unit Verification',
      message: 'Please enter password to delete this unit:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Unit',
          message: 'Are you sure? Removing this unit may affect how items are displayed.',
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: async () => {
            await window.api.deleteUnit(id);
            await this.renderUnitsList();
          }
        });
      }
    });
  },

  _profitsData: [],

  async openProfitsModal() {
    const modal = document.getElementById('profits-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      document.getElementById('profits-card').classList.remove('scale-95');
    }, 10);
    
    app.showLoading();
    this._profitsData = await window.api.getProposals() || [];
    app.hideLoading();
    
    this.resetProfitsFilters(false);
    this.applyProfitsFilters();
  },

  closeProfitsModal() {
    const modal = document.getElementById('profits-modal');
    modal.classList.add('opacity-0');
    document.getElementById('profits-card').classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 200);
  },

  resetProfitsFilters(apply = true) {
    document.getElementById('prof-search').value = '';
    document.getElementById('prof-status-filter').value = 'all';
    document.getElementById('prof-sort').value = 'date_desc';
    if(apply) this.applyProfitsFilters();
  },

  clearProfSearch() {
    const input = document.getElementById('prof-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applyProfitsFilters();
  },

  applyProfitsFilters() {
     const searchInput = document.getElementById('prof-search');
     const clearBtn = document.getElementById('prof-search-clear-btn');
     const term = (searchInput?.value || '').toLowerCase().trim();

     if (clearBtn) {
       if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
       else clearBtn.classList.add('hidden');
     }

     const statusFilter = document.getElementById('prof-status-filter').value;
     const sort = document.getElementById('prof-sort').value;
     
     let filtered = this._profitsData.filter(p => {
        const propNum = String(p.proposal_number || '').toLowerCase();
        const custName = String(p.customer_name || '').toLowerCase();
        const matchesSearch = propNum.includes(term) || custName.includes(term);
        const matchesStatus = (statusFilter === 'all') || (p.status === statusFilter);
        return matchesSearch && matchesStatus;
     });

     if (term) {
       filtered.sort((a, b) => {
         const custA = String(a.customer_name || '').toLowerCase();
         const custB = String(b.customer_name || '').toLowerCase();
         const numA = String(a.proposal_number || '').toLowerCase();
         const numB = String(b.proposal_number || '').toLowerCase();

         const getScore = (cust, num) => {
           if (cust.startsWith(term) || num.startsWith(term)) return 1;
           const words = cust.split(/[\s\-&/]+/);
           if (words.some(w => w.startsWith(term))) return 2;
           if (num.includes(term)) return 3;
           return 4;
         };

         const scoreA = getScore(custA, numA);
         const scoreB = getScore(custB, numB);

         if (scoreA !== scoreB) {
           return scoreA - scoreB;
         }

         if (sort === 'date_desc') return new Date(b.date) - new Date(a.date);
         if (sort === 'date_asc') return new Date(a.date) - new Date(b.date);
         if (sort === 'profit_desc') return (b.profit || 0) - (a.profit || 0);
         if (sort === 'profit_asc') return (a.profit || 0) - (b.profit || 0);
         if (sort === 'total_desc') return (b.retail_total || 0) - (a.retail_total || 0);
         return 0;
       });
     } else {
       if (sort === 'date_desc') filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
       else if (sort === 'date_asc') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
       else if (sort === 'profit_desc') filtered.sort((a,b) => (b.profit || 0) - (a.profit || 0));
       else if (sort === 'profit_asc') filtered.sort((a,b) => (a.profit || 0) - (b.profit || 0));
       else if (sort === 'total_desc') filtered.sort((a,b) => (b.retail_total || 0) - (a.retail_total || 0));
     }

     this.renderProfitsList(filtered);
     
     const hasFilters = term !== '' || statusFilter !== 'all' || sort !== 'date_desc';
     const resetBtn = document.getElementById('prof-filter-reset');
     if (resetBtn) resetBtn.classList.toggle('hidden', !hasFilters);
  },

  renderProfitsList(list) {
     const tbody = document.getElementById('profits-tbody');
     if (!tbody) return;

     if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-slate-400">No proposals found matching criteria</td></tr>';
        document.getElementById('prof-total-cost').textContent = "Rs. 0";
        document.getElementById('prof-total-retail').textContent = "Rs. 0";
        document.getElementById('prof-total-profit').textContent = "Rs. 0";
        return;
     }

     let sumCost = 0;
     let sumRetail = 0;
     let sumProfit = 0;

     tbody.innerHTML = list.map((p, idx) => {
         const dateDisplay = app.formatDateTime ? app.formatDateTime(p.date) : app.formatDate(p.date);
         
         const sColor = {
             'Paid': 'bg-green-100 text-green-700',
             'Partial': 'bg-blue-100 text-blue-700',
             'Pending': 'bg-red-100 text-red-700',
             // Draft logic removed
             'Finalized': 'bg-cyan-100 text-cyan-700'
         }[p.status || 'Pending'] || 'bg-slate-100 text-slate-500';

         const cTotal = p.cost_total || 0;
         const rTotal = p.retail_total || 0;
         const prof = p.profit || 0;

         sumCost += cTotal;
         sumRetail += rTotal;
         sumProfit += prof;

         return `
            <tr class="hover:bg-slate-50 transition-colors group">
               <td class="px-2 py-1.5 border-b border-r border-slate-100 text-center font-bold text-slate-400 tabular-nums text-xs">${idx + 1}</td>
               <td class="px-3 py-1.5 border-b border-r border-slate-100 text-slate-800 font-bold whitespace-nowrap text-xs">${p.proposal_number}</td>
               <td class="px-3 py-1.5 border-b border-r border-slate-100 text-slate-800 break-words text-xs">${p.customer_name || '-'} <br><span class="text-[10px] text-slate-400 font-normal">${dateDisplay}</span></td>
               <td class="px-3 py-1.5 border-b border-r border-slate-100 text-center">
                   <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${sColor}">${p.status || 'Pending'}</span>
               </td>
               <td class="px-3 py-1.5 text-right border-b border-r border-red-100/50 bg-red-50/20 text-red-700 font-medium tabular-nums text-xs">${app.formatCurrency(cTotal)}</td>
               <td class="px-3 py-1.5 text-right border-b border-r border-green-100/50 bg-green-50/20 text-green-700 font-medium tabular-nums text-xs">${app.formatCurrency(rTotal)}</td>
               <td class="px-3 py-1.5 text-right bg-amber-50/20 text-amber-600 border-b border-amber-100/50 font-black tabular-nums text-xs">${app.formatCurrency(prof)}</td>
            </tr>
         `;
     }).join('');

     document.getElementById('prof-total-cost').textContent = app.formatCurrency(sumCost);
     document.getElementById('prof-total-retail').textContent = app.formatCurrency(sumRetail);
     document.getElementById('prof-total-profit').textContent = app.formatCurrency(sumProfit);
     if (window.lucide) lucide.createIcons();
  },

  async openSalesStats(isAll = false) {
    this.isAllSalesView = isAll;
    const cat = this.categories.find(c => c.id === this.currentCategory);
    document.getElementById('sales-category-name').textContent = isAll ? `All Categories collectively` : `Category: ${cat?.label || 'Current Category'}`;
    
    const now = new Date();
    const dateInput = document.getElementById('sales-stat-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    const monthInput = document.getElementById('sales-stat-month');
    if (monthInput && !monthInput.value) {
      monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Show modal
    const modal = document.getElementById('sales-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      document.getElementById('sales-card').classList.remove('scale-95');
    }, 10);

    await this.loadSalesData();
  },

  async switchSalesPeriod(period) {
    this.currentSalesPeriod = period;
    await this.loadSalesData();
  },

  async loadSalesData() {
    // Update button styles
    document.querySelectorAll('.period-btn').forEach(btn => {
      if (btn.id === `btn-sales-${this.currentSalesPeriod}`) {
        btn.className = 'period-btn px-4 py-1.5 rounded-md text-xs font-black bg-white shadow-sm text-slate-900 transition-all';
      } else {
        btn.className = 'period-btn px-4 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all';
      }
    });

    const isDaily = this.currentSalesPeriod === 'daily';
    const isMonthly = this.currentSalesPeriod === 'monthly';
    document.getElementById('sales-stat-date-wrap')?.classList.toggle('hidden', !isDaily);
    document.getElementById('sales-stat-month-wrap')?.classList.toggle('hidden', !isMonthly);

    let targetDate = null;
    if (isDaily) {
      targetDate = document.getElementById('sales-stat-date')?.value || null;
    } else if (isMonthly) {
      targetDate = document.getElementById('sales-stat-month')?.value || null;
    }

    const tbody = document.getElementById('sales-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">Loading sales data...</td></tr>`;

    const section = this.isAllSalesView ? 'all' : this.currentCategory;
    const sales = await window.api.getItemSales(section, this.currentSalesPeriod, targetDate);
    
    // Populate Category Filter if in All View
    const catFilter = document.getElementById('sales-cat-filter');
    catFilter.innerHTML = '<option value="all">All Categories</option>' + 
        this.categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('');

    if (!this.isAllSalesView) {
        catFilter.value = section;
        catFilter.disabled = true;
    } else {
        catFilter.value = 'all';
        catFilter.disabled = false;
    }

    this._lastSalesData = sales;
    document.getElementById('sales-search').value = '';
    document.getElementById('sales-sort').value = 'revenue_desc';
    this.applySalesFilters();

    if (window.lucide) lucide.createIcons();
    this.checkSalesFilterChanges();
  },

  checkSalesFilterChanges() {
    const query = document.getElementById('sales-search')?.value || '';
    const sortBy = document.getElementById('sales-sort')?.value || 'revenue_desc';
    const catFilter = document.getElementById('sales-cat-filter')?.value || 'all';
    const period = this.currentSalesPeriod || 'daily';
    
    const hasFilters = query !== '' || sortBy !== 'revenue_desc' || (this.isAllSalesView && catFilter !== 'all') || period !== 'daily';
    
    const resetBtn = document.getElementById('sales-filter-reset');
    if (resetBtn) {
        resetBtn.classList.toggle('hidden', !hasFilters);
    }
  },

  resetSalesFilters() {
    const search = document.getElementById('sales-search');
    if (search) search.value = '';
    
    const sort = document.getElementById('sales-sort');
    if (sort) sort.value = 'revenue_desc';
    
    const cat = document.getElementById('sales-cat-filter');
    if (cat && this.isAllSalesView) cat.value = 'all';
    
    this.currentSalesPeriod = 'daily';
    this.loadSalesData();
  },

  clearSalesSearch() {
    const input = document.getElementById('sales-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applySalesFilters();
  },

  applySalesFilters() {
    const searchInput = document.getElementById('sales-search');
    const clearBtn = document.getElementById('sales-search-clear-btn');
    const query = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const sortBy = document.getElementById('sales-sort')?.value || 'revenue_desc';
    const catFilter = document.getElementById('sales-cat-filter')?.value || 'all';
    
    let data = [...this._lastSalesData];
    
    // Category Filter
    if (catFilter !== 'all') {
        data = data.filter(s => {
            const sSlug = this.revSectionMap[s.section] || s.section;
            return sSlug === catFilter;
        });
    }

    // Search Filter
    if (query) {
        data = data.filter(s => 
            s.description.toLowerCase().includes(query) || 
            (s.section && s.section.toLowerCase().includes(query))
        );
    }
    
    // Sort
    data.sort((a, b) => {
        if (query) {
          const nameA = (a.description || '').toLowerCase();
          const nameB = (b.description || '').toLowerCase();
          const getScore = (name) => {
            if (name.startsWith(query)) return 1;
            const words = name.split(/[\s\-&/]+/);
            if (words.some(w => w.startsWith(query))) return 2;
            return 3;
          };
          const scoreA = getScore(nameA);
          const scoreB = getScore(nameB);
          if (scoreA !== scoreB) {
            return scoreA - scoreB;
          }
        }

        if (sortBy === 'revenue_desc') return b.total_revenue - a.total_revenue;
        if (sortBy === 'revenue_asc') return a.total_revenue - b.total_revenue;
        if (sortBy === 'qty_desc') return b.total_qty - a.total_qty;
        if (sortBy === 'profit_desc') return b.total_profit - a.total_profit;
        if (sortBy === 'description_asc') return a.description.localeCompare(b.description);
        return 0;
    });
    
    this.renderSalesList(data);
    this.updateSalesTotals(data);
    this.checkSalesFilterChanges();
  },

  renderSalesList(sales) {
    const tbody = document.getElementById('sales-tbody');
    if (sales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">No sales found for this criteria</td></tr>`;
      return;
    }

    tbody.innerHTML = sales.map((s, index) => {
      const catSlug = this.revSectionMap[s.section];
      const catLabel = this.labels[catSlug] || s.section;
      const cost = Number(s.total_cost) || 0;
      const profit = Number(s.total_profit) || 0;
      const profitPct = cost > 0 ? Math.round((profit / cost) * 100) : (s.total_revenue > 0 ? 100 : 0);

      return `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
          <td class="px-2 py-1 border-r border-slate-200 text-center font-bold text-slate-400 tabular-nums text-xs">${index + 1}</td>
          <td class="px-4 py-1 font-medium text-slate-800 border-r border-slate-200">
            <div class="flex items-center gap-2">
              <span class="text-slate-800 font-bold text-xs">${s.description}</span>
              ${this.isAllSalesView ? `<span class="text-[9px] text-accent font-bold uppercase tracking-wider px-1.5 py-0.2 bg-amber-50 rounded border border-amber-200/60 leading-none">${catLabel}</span>` : ''}
            </div>
          </td>
          <td class="px-4 py-1 text-center font-bold text-slate-700 border-r border-slate-200 text-xs font-outfit tabular-nums">${s.total_qty}</td>
          <td class="px-4 py-1 text-right font-bold text-red-700 border-r border-slate-200 text-xs font-outfit tabular-nums">${app.formatCurrency(s.total_cost || 0)}</td>
          <td class="px-4 py-1 text-right font-bold text-emerald-700 border-r border-slate-200 text-xs font-outfit tabular-nums">${app.formatCurrency(s.total_revenue)}</td>
          <td class="px-4 py-1 text-right font-bold text-amber-700 text-xs font-outfit tabular-nums whitespace-nowrap">
            ${app.formatCurrency(s.total_profit)} <span class="text-[10px] text-slate-500 font-semibold">(${profitPct > 0 ? '+' : ''}${profitPct}%)</span>
          </td>
        </tr>
      `;
    }).join('');
  },

  updateSalesTotals(sales) {
    let totalQty = 0;
    let totalCost = 0;
    let totalRev = 0;
    let totalProf = 0;

    sales.forEach(s => {
      totalQty += s.total_qty;
      totalCost += s.total_cost || 0;
      totalRev += s.total_revenue;
      totalProf += s.total_profit;
    });

    const totalProfPct = totalCost > 0 ? Math.round((totalProf / totalCost) * 100) : 0;

    document.getElementById('sales-total-qty').textContent = totalQty.toLocaleString();
    document.getElementById('sales-total-cost').textContent = app.formatCurrency(totalCost);
    document.getElementById('sales-total-revenue').textContent = app.formatCurrency(totalRev);
    document.getElementById('sales-total-profit').textContent = `${app.formatCurrency(totalProf)} (${totalProfPct > 0 ? '+' : ''}${totalProfPct}%)`;
  },

  closeSalesStats() {
    const modal = document.getElementById('sales-modal');
    modal.classList.add('opacity-0');
    document.getElementById('sales-card').classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 200);
  },

  async printStockList() {
    const isAll = this.currentCategory === 'all';
    const cat = isAll 
      ? { id: 'all', label: 'All Items', fields: ['item_name'] }
      : this.categories.find(c => c.id === this.currentCategory);
    if (!cat) return;
    
    if (!this.settings || !this.settings.company_name) {
      this.settings = await window.api.getSettings();
    }

    const query = document.getElementById('db-search')?.value.toLowerCase() || '';
    const lowStockVal = document.getElementById('db-low-stock-filter')?.value;
    let list = [...this.allProducts];
    if (query) {
        list = list.filter(p => {
            return String(p.item_name || '').toLowerCase().includes(query) ||
                   String(p.description || '').toLowerCase().includes(query);
        });
    }

    if (lowStockVal !== '' && lowStockVal !== undefined && lowStockVal !== null) {
        const limit = parseInt(lowStockVal);
        list = list.filter(p => (p.current_stock || 0) <= limit);
    }

    if (list.length === 0) {
        app.showAlert("No items to print in this category.");
        return;
    }

    const totalStock = list.reduce((sum, p) => sum + (p.current_stock || 0), 0);

    const rowHtml = list.length === 0 ? `
      <tr>
        <td colspan="4" style="text-align: center; padding: 6px 0; font-style: italic; color: #444;">No items found</td>
      </tr>
    ` : list.map((p, idx, arr) => {
      const itemCat = isAll && p.slug ? (this.labels[p.slug] || p.slug) : '';
      return `
        <tr style="border-bottom: ${idx === arr.length - 1 ? 'none' : '1px solid #000'}; font-size: 9.5px;">
            <td style="padding: 2.5px 2px; text-align: center; color: #000; font-weight: 700; border-right: 1px solid #000;">${idx + 1}</td>
            <td style="padding: 2.5px 4px; color: #000; font-weight: 800; word-break: break-word; line-height: 1.2; border-right: 1px solid #000;">
              <div>${p.item_name || 'Unnamed Item'}</div>
              ${itemCat ? `<div style="font-size: 7.5px; font-weight: normal; color: #444;">${itemCat}</div>` : ''}
            </td>
            <td style="padding: 2.5px 3px; text-align: right; color: #000; font-weight: 600; border-right: 1px solid #000;">${Number(p.retail_price || 0).toLocaleString()}</td>
            <td style="padding: 2.5px 4px; text-align: center; color: #000; font-weight: 800;">${app.formatQty(p.current_stock || 0)}</td>
        </tr>
      `;
    }).join('');

    const html = `
        <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace, sans-serif; color: #000; box-sizing: border-box; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 4px;">
                <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${this.settings.company_name || 'ISHAQ JADOON TRADERS'}</h1>
                <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">${this.settings.address || 'Near CB Plaza, Barrier 3, Main GT Road, Wah Cantt'}</div>
                <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
                    <div>M.Ishaq: 0301-2630481</div>
                    <div>Ch. Shakir: 0300-5074410</div>
                </div>
                <div style="margin-top: 5px;">
                    <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">${isAll ? 'ALL ITEMS STOCK REPORT' : 'CATEGORY STOCK REPORT'}</span>
                </div>
            </div>
            
            <!-- Metadata -->
            <div style="font-size: 11px; line-height: 1.35; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
                <div style="display: flex; justify-content: space-between;">
                    <span><b>Category:</b> ${cat.label}</span>
                    <span><b>Items:</b> ${list.length}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 1px;">
                    <span><b>Date:</b> ${app.formatDateTime ? app.formatDateTime(new Date().toISOString()) : new Date().toLocaleString()}</span>
                </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5px; border: 1.5px solid #000;">
                <thead>
                    <tr style="border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
                        <th style="padding: 3px 2px; text-align: center; width: 7%; border-right: 1px solid #000;">#</th>
                        <th style="padding: 3px 4px; text-align: left; width: 55%; border-right: 1px solid #000;">ITEM NAME</th>
                        <th style="padding: 3px 3px; text-align: right; width: 20%; border-right: 1px solid #000;">RATE</th>
                        <th style="padding: 3px 2px; text-align: center; width: 18%;">STOCK</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowHtml}
                </tbody>
            </table>

            <!-- Summary Box -->
            <div style="border-top: 1px dashed #000; padding-top: 4px; font-size: 11.5px; line-height: 1.45;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Total Items:</span>
                    <span style="font-weight: 800;">${list.length}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 0; margin-top: 3px; font-size: 13.5px; font-weight: 900;">
                    <span>TOTAL STOCK:</span>
                    <span>${totalStock} Units</span>
                </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 10px;">
                <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** END OF STOCK REPORT ***</p>
            </div>
        </div>
    `;

    app.setPrintContent('db-print-container', html);

    // Show Preview Modal
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;

    document.getElementById('preview-title').textContent = isAll ? 'All Items Stock Preview' : 'Category Stock Preview';
    document.getElementById('preview-subtitle').textContent = `80MM THERMAL RECEIPT • ${cat.label.toUpperCase()}`;

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
        printBtn.onclick = () => app.confirmPrint();
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    if (window.lucide) lucide.createIcons();
  },

  openCustomPrintModal() {
    const listEl = document.getElementById('print-cats-list');
    if (listEl) {
      listEl.innerHTML = this.categories.map(c => `
        <label class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer select-none transition-all group has-[:checked]:bg-indigo-50/70 has-[:checked]:border-indigo-300">
          <div class="flex items-center gap-2 min-w-0 pr-1">
            <input type="checkbox" value="${c.id}" class="print-cat-checkbox w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" ${c.id === this.currentCategory || this.currentCategory === 'all' ? 'checked' : ''}>
            <span class="text-xs font-bold text-slate-800 group-hover:text-slate-900 truncate">${c.label}</span>
          </div>
          <span class="text-[10px] font-black bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded group-hover:bg-slate-200 shrink-0 tabular-nums">${c.count || 0}</span>
        </label>
      `).join('');
    }

    const modal = document.getElementById('db-custom-print-modal');
    const card = document.getElementById('db-custom-print-card');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      if (card) card.classList.remove('scale-95');
    }, 10);
    if (window.lucide) lucide.createIcons();
  },

  closeCustomPrintModal() {
    const modal = document.getElementById('db-custom-print-modal');
    const card = document.getElementById('db-custom-print-card');
    if (!modal) return;

    modal.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 200);
  },

  toggleAllPrintCats(selectAll) {
    document.querySelectorAll('.print-cat-checkbox').forEach(cb => {
      cb.checked = selectAll;
    });
  },

  onPrintFilterChange() {
    const filterType = document.getElementById('print-stock-filter-type')?.value;
    const limitBox = document.getElementById('print-low-stock-limit-box');
    if (limitBox) {
      if (filterType === 'low_stock') {
        limitBox.classList.remove('hidden');
      } else {
        limitBox.classList.add('hidden');
      }
    }
  },

  async generateCustomStockPrint() {
    const checkedBoxes = Array.from(document.querySelectorAll('.print-cat-checkbox:checked'));
    const selectedCatIds = checkedBoxes.map(cb => cb.value);

    if (selectedCatIds.length === 0) {
      return app.showAlert("Please select at least one category to print.");
    }

    if (!this.settings || !this.settings.company_name) {
      this.settings = await window.api.getSettings();
    }

    const sortBy = document.getElementById('print-stock-sort')?.value || 'name_asc';
    const filterType = document.getElementById('print-stock-filter-type')?.value || 'all';
    const lowStockLimit = parseInt(document.getElementById('print-low-stock-limit')?.value) || 5;
    const isGrouped = document.getElementById('print-group-by-cat')?.checked ?? true;

    // Fetch all products across store
    app.showLoading();
    let allProds = [];
    try {
      allProds = await window.api.searchAllProducts('') || [];
    } catch(err) {
      console.error(err);
      app.hideLoading();
      return app.showAlert("Error loading products for print.");
    }
    app.hideLoading();

    // Filter by selected categories
    let filtered = allProds.filter(p => selectedCatIds.includes(p.slug));

    // Filter by stock condition
    if (filterType === 'in_stock') {
      filtered = filtered.filter(p => (p.current_stock || 0) > 0);
    } else if (filterType === 'low_stock') {
      filtered = filtered.filter(p => (p.current_stock || 0) <= lowStockLimit);
    }

    if (filtered.length === 0) {
      return app.showAlert("No items match the selected categories and stock filter.");
    }

    // Sort function
    const sortItems = (items) => {
      return [...items].sort((a, b) => {
        if (sortBy === 'name_asc') return (a.item_name || '').localeCompare(b.item_name || '');
        if (sortBy === 'name_desc') return (b.item_name || '').localeCompare(a.item_name || '');
        if (sortBy === 'stock_desc') return (b.current_stock || 0) - (a.current_stock || 0);
        if (sortBy === 'stock_asc') return (a.current_stock || 0) - (b.current_stock || 0);
        return 0;
      });
    };

    const sortLabelsMap = {
      name_asc: 'Name (A-Z)',
      name_desc: 'Name (Z-A)',
      stock_desc: 'Stock (High to Low)',
      stock_asc: 'Stock (Low to High)'
    };
    const sortDisplay = sortLabelsMap[sortBy] || 'Name (A-Z)';

    const totalStock = filtered.reduce((sum, p) => sum + (p.current_stock || 0), 0);

    let sectionsHtml = '';
    if (isGrouped) {
      selectedCatIds.forEach(catId => {
        const catObj = this.categories.find(c => c.id === catId);
        const catLabel = catObj ? catObj.label : (this.labels[catId] || catId);
        const catItems = sortItems(filtered.filter(p => p.slug === catId));
        if (catItems.length === 0) return;

        const catStockSum = catItems.reduce((s, p) => s + (p.current_stock || 0), 0);
        const catRowsHtml = catItems.map((p, idx) => `
          <tr style="border-bottom: 1px dotted #000;">
            <td style="border: 1px solid #000; padding: 2.5px 2px; font-size: 9.5px; text-align: center; color: #000; font-weight: 600; line-height: 1.25;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; color: #000; font-weight: 500; word-break: break-word; line-height: 1.25;">${p.item_name || 'Unnamed Item'}</td>
            <td style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; text-align: center; color: #000; font-weight: 700; line-height: 1.25;">${app.formatQty(p.current_stock || 0)}</td>
          </tr>
        `).join('');

        sectionsHtml += `
          <div style="margin-bottom: 4px;">
            <div style="background: #000; color: #fff; padding: 2.5px 4px; font-weight: 700; font-size: 9.5px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
              <span>${catLabel}</span>
              <span style="font-size: 8.5px; font-weight: 500;">${catItems.length} items &bull; ${app.formatQty(catStockSum)} Bx</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; color: #000; margin-bottom: 2px;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid #000; background: #fff;">
                  <th style="border: 1px solid #000; padding: 2.5px 2px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; text-align: center; width: 22px; color: #000;">#</th>
                  <th style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #000;">Item Name</th>
                  <th style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; text-align: center; width: 38px; color: #000;">Stock</th>
                </tr>
              </thead>
              <tbody>
                ${catRowsHtml}
              </tbody>
            </table>
          </div>
        `;
      });
    } else {
      const sortedAll = sortItems(filtered);
      const allRowsHtml = sortedAll.map((p, idx) => `
        <tr style="border-bottom: 1px dotted #000;">
          <td style="border: 1px solid #000; padding: 2.5px 2px; font-size: 9.5px; text-align: center; color: #000; font-weight: 600; line-height: 1.25;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; color: #000; font-weight: 500; word-break: break-word; line-height: 1.25;">
            ${p.item_name || 'Unnamed Item'}${selectedCatIds.length > 1 ? ` <span style="font-size: 8px; color: #444; font-weight: 400;">(${this.labels[p.slug] || p.slug})</span>` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; text-align: center; color: #000; font-weight: 700; line-height: 1.25;">${app.formatQty(p.current_stock || 0)}</td>
        </tr>
      `).join('');

      sectionsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1.5px solid #000; color: #000; background: #fff;">
          <thead>
            <tr style="text-align: left; border-bottom: 1.5px solid #000; background: #fff;">
              <th style="border: 1px solid #000; padding: 7px 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; text-align: center; width: 6%; color: #000;">#</th>
              <th style="border: 1px solid #000; padding: 7px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #000;">Item Name</th>
              <th style="border: 1px solid #000; padding: 7px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; text-align: center; width: 20%; color: #000;">Stock Available</th>
            </tr>
          </thead>
          <tbody>
            ${allRowsHtml}
          </tbody>
        </table>
      `;
    }

    const selectedLabelsList = selectedCatIds.map(id => this.labels[id] || id).join(', ');

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace, sans-serif; color: #000; box-sizing: border-box; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 4px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${this.settings.company_name || 'ISHAQ JADOON TRADERS'}</h1>
          <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">${this.settings.address || 'Near CB Plaza, Barrier 3, Main GT Road, Wah Cantt'}</div>
          <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
            <div>M.Ishaq: 0301-2630481</div>
            <div>Ch. Shakir: 0300-5074410</div>
          </div>
          <div style="margin-top: 5px;">
            <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">STOCK INVENTORY REPORT</span>
          </div>
        </div>
        
        <!-- Metadata -->
        <div style="font-size: 11px; line-height: 1.35; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
          <div style="display: flex; justify-content: space-between;">
            <span><b>Categories (${selectedCatIds.length}):</b> ${selectedLabelsList}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 1px;">
            <span><b>Sort:</b> ${sortDisplay}</span>
            <span><b>Date:</b> ${app.formatDateTime ? app.formatDateTime(new Date().toISOString()) : new Date().toLocaleString()}</span>
          </div>
        </div>

        ${sectionsHtml}

        <!-- Summary Box -->
        <div style="border-top: 1px dashed #000; padding-top: 4px; font-size: 11.5px; line-height: 1.45;">
          <div style="display: flex; justify-content: space-between;">
            <span>Total Categories:</span>
            <span style="font-weight: 700;">${selectedCatIds.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Total Items:</span>
            <span style="font-weight: 700;">${filtered.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 0; margin-top: 3px; font-size: 13.5px; font-weight: 900;">
            <span>TOTAL STOCK:</span>
            <span>${totalStock} Units</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 10px;">
          <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** END OF STOCK REPORT ***</p>
        </div>
      </div>
    `;

    // Close selection modal
    this.closeCustomPrintModal();

    // Set content and open Preview Modal
    app.setPrintContent('db-print-container', html);
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;

    document.getElementById('preview-title').textContent = 'Stock Report Preview';
    document.getElementById('preview-subtitle').textContent = `80MM THERMAL RECEIPT • ${selectedCatIds.length} CATEGORIES`;

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      printBtn.onclick = () => app.confirmPrint();
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (window.lucide) lucide.createIcons();
  },


  // --- RATE CHANGES LOG & COST HISTORY ---
  async openRateHistoryModal(category, id) {
    let product = (this.filteredProducts || []).find(p => p.id == id && String(p.slug || '').toLowerCase() === String(category || '').toLowerCase()) ||
                  (this.allProducts || []).find(p => p.id == id && String(p.slug || '').toLowerCase() === String(category || '').toLowerCase()) ||
                  (this.rateListItems || []).find(p => p.id == id && String(p.slug || '').toLowerCase() === String(category || '').toLowerCase()) ||
                  (this.allProducts || []).find(p => p.id == id);

    const modal = document.getElementById('rate-history-modal');
    const card = document.getElementById('rate-history-card');
    const title = document.getElementById('rate-history-title');
    const subtitle = document.getElementById('rate-history-subtitle');
    const tbody = document.getElementById('rate-history-tbody');

    if (!modal) return;

    const itemName = product ? (product.item_name || product.description) : `Item #${id}`;
    this.activeRateHistoryItem = { category, id, itemName, product };

    title.textContent = `Rate Changes Log: ${itemName}`;
    subtitle.textContent = `Category: ${this.labels[category] || category.toUpperCase()} • Full audit trail of stock & rate updates`;

    tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-400 font-medium"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500"></i>Loading history logs...</td></tr>`;
    if (window.lucide) lucide.createIcons();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      card.classList.remove('scale-95');
    }, 20);

    try {
      const logs = await window.api.getRateHistory(category, id) || [];
      this.currentRateLogs = logs;
      this.renderRateHistory(logs);
    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-rose-500 font-bold">Failed to load history logs.</td></tr>`;
    }
  },

  renderRateHistory(logs) {
    const tbody = document.getElementById('rate-history-tbody');
    if (!tbody) return;

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-10 text-center text-slate-400">
            <i data-lucide="clock" class="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400"></i>
            <p class="font-bold text-sm text-slate-600">No Rate Changes Recorded Yet</p>
            <p class="text-xs text-slate-400 mt-1">Rates and cost updates will be logged here automatically whenever stock or cost is changed.</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = logs.map((l) => {
      const profit = (l.retail_price || 0) - (l.new_cost_price || 0);
      const isDirect = l.source === 'Direct Edit';

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="py-2.5 px-3 font-semibold text-slate-600 tabular-nums">
            ${l.created_at ? app.formatDateTime(l.created_at) : '-'}
          </td>
          <td class="py-2.5 px-3">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isDirect ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-800 border border-amber-200'}">
              ${l.source || 'Manual Add'}
            </span>
          </td>
          <td class="py-2.5 px-3 text-center tabular-nums">
            <span class="text-slate-400">${l.old_stock || 0}</span>
            <span class="font-bold text-amber-600"> +${l.added_qty || 0} </span>
            <span class="font-black text-slate-900">&rarr; ${l.new_stock || 0}</span>
          </td>
          <td class="py-2.5 px-3 text-right font-bold text-slate-700 tabular-nums">
            ${app.formatCurrency(l.purchase_price || 0)}
          </td>
          <td class="py-2.5 px-3 text-right font-medium text-slate-500 tabular-nums">
            ${app.formatCurrency(l.old_cost_price || 0)}
          </td>
          <td class="py-2.5 px-3 text-right font-black text-red-600 tabular-nums font-display">
            ${app.formatCurrency(l.new_cost_price || 0)}
          </td>
          <td class="py-2.5 px-3 text-right font-black text-emerald-600 tabular-nums font-display">
            ${app.formatCurrency(l.retail_price || 0)}
          </td>
          <td class="py-2.5 px-3 text-right font-black text-blue-600 tabular-nums font-display">
            ${app.formatCurrency(profit)}
          </td>
          <td class="py-2.5 px-3 text-slate-500 italic max-w-[160px] truncate">
            ${l.notes || '-'}
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  closeRateHistoryModal() {
    const modal = document.getElementById('rate-history-modal');
    const card = document.getElementById('rate-history-card');
    if (!modal || !card) return;

    modal.classList.add('opacity-0');
    card.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      this.activeRateHistoryItem = null;
      this.currentRateLogs = [];
    }, 150);
  },

  printRateHistory() {
    if (!this.activeRateHistoryItem || !this.currentRateLogs || this.currentRateLogs.length === 0) {
      app.showAlert({ title: 'No Logs', message: 'No rate history records to print.' });
      return;
    }

    const { itemName, category } = this.activeRateHistoryItem;
    const logs = this.currentRateLogs;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; font-family: 'Courier New', Courier, monospace, system-ui; color: #000; font-size: 11px; line-height: 1.35; background: #fff; box-sizing: border-box;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 5px; border-bottom: 1.5px dashed #000; padding-bottom: 5px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">ISHAQ JADOON TRADERS</h1>
          <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700; line-height: 1.3;">Near CB Plaza, Barrier 3, Main GT Road, Wah Cantt</p>
          <p style="margin: 2px 0 0 0; font-size: 9.5px; font-weight: 700; line-height: 1.3;">M.Ishaq 0301-2630481 &bull; Ch. Shakir 0300-5074410</p>
          <div style="margin-top: 4px; padding: 2px 0; background: #000; color: #fff; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
            RATE CHANGES AUDIT LOG
          </div>
        </div>

        <!-- Product Info -->
        <div style="margin-bottom: 4px; border-bottom: 1px dashed #000; padding-bottom: 3px; font-size: 10.5px; font-weight: 700;">
          <div>ITEM: ${itemName}</div>
          <div style="display: flex; justify-content: space-between; margin-top: 1px; font-size: 9.5px; color: #333;">
            <span>CAT: ${(this.labels[category] || category).toUpperCase()}</span>
            <span>DATE: ${dateStr} ${timeStr}</span>
          </div>
        </div>

        <!-- Log List -->
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 5px; border: 1.5px solid #000;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
              <th style="padding: 3px 2px; text-align: center; width: 8%; border-right: 1px solid #000;">#</th>
              <th style="padding: 3px 4px; text-align: left; width: 34%; border-right: 1px solid #000;">DATE / EVENT</th>
              <th style="padding: 3px 2px; text-align: center; width: 18%; border-right: 1px solid #000;">STOCK</th>
              <th style="padding: 3px 3px; text-align: right; width: 20%; border-right: 1px solid #000;">COST</th>
              <th style="padding: 3px 4px; text-align: right; width: 20%;">SALE</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 6px 0; font-style: italic; color: #444;">No rate change history</td></tr>
            ` : logs.map((l, idx, arr) => `
              <tr style="border-bottom: ${idx === arr.length - 1 ? 'none' : '1px solid #000'}; font-size: 9.5px;">
                <td style="padding: 2.5px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000; vertical-align: top;">${idx + 1}</td>
                <td style="padding: 2.5px 4px; text-align: left; vertical-align: top; border-right: 1px solid #000;">
                  <div style="font-weight: 800;">${l.created_at ? l.created_at.split('T')[0] : ''}</div>
                  <div style="font-size: 7.5px; color: #444;">${l.source || ''}</div>
                </td>
                <td style="padding: 2.5px 2px; text-align: center; vertical-align: top; font-weight: 800; border-right: 1px solid #000;">
                  +${l.added_qty || 0} &rarr; ${l.new_stock || 0}
                </td>
                <td style="padding: 2.5px 3px; text-align: right; vertical-align: top; font-weight: 600; border-right: 1px solid #000;">
                  ${app.formatCurrency(l.new_cost_price || 0)}
                </td>
                <td style="padding: 2.5px 4px; text-align: right; vertical-align: top; font-weight: 800;">
                  ${app.formatCurrency(l.retail_price || 0)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 9px;">
          <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** END OF RATE LOG ***</p>
        </div>
      </div>
    `;

    app.setPrintContent('db-print-container', html);
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;

    document.getElementById('preview-title').textContent = 'Rate Log Preview';
    document.getElementById('preview-subtitle').textContent = `80MM THERMAL RECEIPT • ${itemName.toUpperCase()}`;

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      printBtn.onclick = () => app.confirmPrint();
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  // --- MASTER RATE LIST & COST MASTER ---
  async openRateListModal() {
    const modal = document.getElementById('rate-list-modal');
    const card = document.getElementById('rate-list-card');
    const catSelect = document.getElementById('rate-list-cat-filter');
    const tbody = document.getElementById('rate-list-tbody');

    if (!modal) return;

    // Populate category dropdown
    if (catSelect) {
      catSelect.innerHTML = `<option value="all">All Categories</option>` + 
        this.categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
    }

    tbody.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-slate-400 font-medium"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-500"></i>Loading Master Rate List...</td></tr>`;
    if (window.lucide) lucide.createIcons();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      card.classList.remove('scale-95');
    }, 20);

    try {
      this.rateListItems = await window.api.getAllRatesList() || [];
      this.applyRateListFilters();
    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-rose-500 font-bold">Failed to load rate list.</td></tr>`;
    }
  },

  closeRateListModal() {
    const modal = document.getElementById('rate-list-modal');
    const card = document.getElementById('rate-list-card');
    if (!modal || !card) return;

    modal.classList.add('opacity-0');
    card.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 150);
  },

  clearRateListSearch() {
    const input = document.getElementById('rate-list-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applyRateListFilters();
  },

  applyRateListFilters() {
    if (!this.rateListItems) return;

    const searchInput = document.getElementById('rate-list-search');
    const clearBtn = document.getElementById('rate-list-search-clear-btn');
    const q = (searchInput?.value || '').trim().toLowerCase();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const cat = document.getElementById('rate-list-cat-filter')?.value || 'all';
    const sort = document.getElementById('rate-list-sort')?.value || 'name_asc';

    let filtered = this.rateListItems.filter(item => {
      const matchQ = !q || item.item_name.toLowerCase().includes(q) || item.category_label.toLowerCase().includes(q);
      const matchCat = cat === 'all' || item.slug === cat;
      return matchQ && matchCat;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (q) {
        const nameA = (a.item_name || '').toLowerCase();
        const nameB = (b.item_name || '').toLowerCase();
        const getScore = (name) => {
          if (name.startsWith(q)) return 1;
          const words = name.split(/[\s\-&/]+/);
          if (words.some(w => w.startsWith(q))) return 2;
          return 3;
        };
        const scoreA = getScore(nameA);
        const scoreB = getScore(nameB);
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
      }

      if (sort === 'name_asc') return a.item_name.localeCompare(b.item_name);
      if (sort === 'margin_desc') return (b.profit_margin_pct || 0) - (a.profit_margin_pct || 0);
      if (sort === 'profit_desc') return (b.profit || 0) - (a.profit || 0);
      if (sort === 'cost_desc') return (b.cost_price || 0) - (a.cost_price || 0);
      if (sort === 'stock_desc') return (b.current_stock || 0) - (a.current_stock || 0);
      return 0;
    });

    this.renderRateList(filtered);
  },

  renderRateList(items) {
    const tbody = document.getElementById('rate-list-tbody');
    const statCount = document.getElementById('rate-list-stat-count');
    const statCost = document.getElementById('rate-list-stat-cost-val');
    const statRetail = document.getElementById('rate-list-stat-retail-val');
    const statMargin = document.getElementById('rate-list-stat-margin');

    if (!tbody) return;

    let totalCostVal = 0;
    let totalRetailVal = 0;
    let marginSum = 0;

    items.forEach(it => {
      const stock = Math.max(0, it.current_stock || 0);
      totalCostVal += stock * (it.cost_price || 0);
      totalRetailVal += stock * (it.retail_price || 0);
      marginSum += (it.profit_margin_pct || 0);
    });

    const avgMargin = items.length > 0 ? (marginSum / items.length).toFixed(1) : 0;

    if (statCount) statCount.textContent = items.length;
    if (statCost) statCost.textContent = app.formatCurrency(totalCostVal);
    if (statRetail) statRetail.textContent = app.formatCurrency(totalRetailVal);
    if (statMargin) statMargin.textContent = `${avgMargin}%`;

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-12 text-center text-slate-400">
            <p class="font-bold text-sm text-slate-600">No items found</p>
            <p class="text-xs text-slate-400 mt-1">Try adjusting search or category filter.</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = items.map((it, idx) => {
      const profit = (it.retail_price || 0) - (it.cost_price || 0);
      const marginPct = it.profit_margin_pct || 0;
      const stock = it.current_stock || 0;

      return `
        <tr class="hover:bg-slate-50 transition-colors group">
          <td class="py-2.5 px-3 text-center text-slate-400 font-bold tabular-nums">${idx + 1}</td>
          
          <td class="py-2.5 px-3">
            <span class="font-black text-slate-900 text-xs block">${it.item_name}</span>
          </td>

          <td class="py-2.5 px-3">
            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">${it.category_label}</span>
          </td>

          <td class="py-2.5 px-3 text-center tabular-nums">
            <span class="px-2 py-0.5 rounded font-black text-xs ${stock > 0 ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">${stock} ${it.unit || 'pcs'}</span>
          </td>

          <td class="py-2.5 px-3 text-right font-black text-red-600 tabular-nums font-display">
            ${app.formatCurrency(it.cost_price || 0)}
          </td>

          <td class="py-2.5 px-3 text-right font-black text-emerald-600 tabular-nums font-display">
            ${app.formatCurrency(it.retail_price || 0)}
          </td>

          <td class="py-2.5 px-3 text-right font-black text-blue-600 tabular-nums font-display">
            ${app.formatCurrency(profit)}
          </td>

          <td class="py-2.5 px-3 text-center font-black tabular-nums ${marginPct >= 15 ? 'text-emerald-600' : marginPct >= 5 ? 'text-amber-600' : 'text-rose-600'}">
            ${marginPct}%
          </td>

          <td class="py-2.5 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button onclick="MasterDB.openRateHistoryModal('${it.slug}', ${it.id})" class="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer" title="Rates Log">
                <i data-lucide="history" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="MasterDB.closeRateListModal(); MasterDB.openForm(${it.id}, '${it.slug}')" class="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Edit Item">
                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  printRateList() {
    if (!this.rateListItems || this.rateListItems.length === 0) {
      app.showAlert({ title: 'No Items', message: 'No items found in rate list to print.' });
      return;
    }

    const items = this.rateListItems;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; font-family: 'Courier New', Courier, monospace, system-ui; color: #000; font-size: 11px; line-height: 1.35; background: #fff; box-sizing: border-box;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 5px; border-bottom: 1.5px dashed #000; padding-bottom: 5px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">ISHAQ JADOON TRADERS</h1>
          <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700; line-height: 1.3;">Near CB Plaza, Barrier 3, Main GT Road, Wah Cantt</p>
          <p style="margin: 2px 0 0 0; font-size: 9.5px; font-weight: 700; line-height: 1.3;">M.Ishaq 0301-2630481 &bull; Ch. Shakir 0300-5074410</p>
          <div style="margin-top: 4px; padding: 2px 0; background: #000; color: #fff; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
            OFFICIAL RATE LIST / COST MASTER
          </div>
        </div>

        <!-- Meta -->
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; margin-bottom: 4px; border-bottom: 1px dashed #000; padding-bottom: 3px;">
          <span>DATE: ${dateStr} ${timeStr}</span>
          <span>ITEMS: ${items.length}</span>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 5px; border: 1.5px solid #000;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
              <th style="padding: 3px 2px; text-align: center; width: 7%; border-right: 1px solid #000;">#</th>
              <th style="padding: 3px 4px; text-align: left; width: 45%; border-right: 1px solid #000;">ITEM</th>
              <th style="padding: 3px 3px; text-align: right; width: 16%; border-right: 1px solid #000;">COST</th>
              <th style="padding: 3px 3px; text-align: right; width: 16%; border-right: 1px solid #000;">SALE</th>
              <th style="padding: 3px 4px; text-align: right; width: 16%;">PROFIT</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 6px 0; font-style: italic; color: #444;">No items found</td></tr>
            ` : items.map((it, idx, arr) => {
              const profit = (it.retail_price || 0) - (it.cost_price || 0);
              return `
                <tr style="border-bottom: ${idx === arr.length - 1 ? 'none' : '1px solid #000'}; font-size: 9.5px;">
                  <td style="padding: 2.5px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000; vertical-align: top;">${idx + 1}</td>
                  <td style="padding: 2.5px 4px; text-align: left; vertical-align: top; border-right: 1px solid #000;">
                    <div style="font-weight: 800; word-break: break-word; line-height: 1.2;">${it.item_name}</div>
                    <div style="font-size: 7.5px; color: #444;">[${it.category_label}] • Stk: ${app.formatQty(it.current_stock || 0)}</div>
                  </td>
                  <td style="padding: 2.5px 3px; text-align: right; vertical-align: top; font-weight: 600; border-right: 1px solid #000;">
                    ${Number(it.cost_price || 0).toLocaleString()}
                  </td>
                  <td style="padding: 2.5px 3px; text-align: right; vertical-align: top; font-weight: 800; border-right: 1px solid #000;">
                    ${Number(it.retail_price || 0).toLocaleString()}
                  </td>
                  <td style="padding: 2.5px 4px; text-align: right; vertical-align: top; font-weight: 700;">
                    +${Number(profit || 0).toLocaleString()}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 9px;">
          <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** END OF RATE LIST ***</p>
          <p style="margin: 1px 0 0 0; color: #555; font-size: 8.5px;">Software by Ishaq Jadoon Traders</p>
        </div>
      </div>
    `;

    app.setPrintContent('db-print-container', html);
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;

    document.getElementById('preview-title').textContent = 'Rate List Preview';
    document.getElementById('preview-subtitle').textContent = `80MM THERMAL RECEIPT • ${items.length} ITEMS`;

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      printBtn.onclick = () => app.confirmPrint();
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }
};
