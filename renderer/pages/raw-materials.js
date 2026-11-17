// Stage 1: Raw Materials Stock & Management
window.RawMaterials = {
  materials: [],
  categories: [],
  logs: [],
  activeTab: 'inventory', // 'inventory' | 'purchase' | 'logs'
  searchQuery: '',
  selectedCategory: 'all',
  sortField: 'name', // 'name' | 'category' | 'unit' | 'stock' | 'cost' | 'value' | 'status' for inventory; 'date' | 'material' | 'action' | 'qty' | 'stock_after' for logs
  sortOrder: 'asc', // 'asc' | 'desc'
  categorySortOrder: 'count_desc', // 'count_desc' | 'alpha'
  periodType: 'day', // 'day' | 'month' | 'year' | 'custom' | 'all'
  selectedDate: new Date().toISOString().slice(0, 10),
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),

  async render(container) {
    this.container = container;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.selectedDate = today;
    this.startDate = today;
    this.endDate = today;
    await this.loadData();
  },

  async loadData() {
    try {
      this.materials = await window.api.getRawMaterials() || [];
      this.categories = await window.api.getRawMaterialCategories() || [];
      this.logs = await window.api.getRawMaterialLogs() || [];
      this.renderUI();
    } catch (e) {
      console.error('Failed to load raw materials:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading raw materials: ${e.message}</div>`;
      }
    }
  },

  getMaterialUnitSpecs(m) {
    if (!m) {
      return {
        isBulk: false,
        mainUnit: 'PCS',
        subUnit: 'PCS',
        mainPlural: 'PCS',
        subPlural: 'PCS',
        packageUnit: 'PCS',
        contentUnit: 'PCS',
        packagePlural: 'PCS',
        contentPlural: 'PCS',
        packSize: 1,
        specText: 'PCS',
        specBadge: ''
      };
    }
    const mainUnit = (m.unit || 'PCS').trim();
    const subUnit = (m.pack_unit || 'Pack').trim();
    const packSize = Number(m.pack_size) > 0 ? Number(m.pack_size) : 1;
    const isBulk = Boolean((m.has_bulk === 1 || m.has_bulk === '1' || m.has_bulk === true) && packSize > 1);

    const getPlural = (u) => {
      const trimmed = (u || '').trim();
      if (!trimmed) return '';
      const lower = trimmed.toLowerCase();
      if (lower.endsWith('s')) return trimmed;
      if (lower === 'box') return 'Boxes';
      if (['kg', 'gm', 'g', 'l', 'ltr', 'liter', 'litre', 'ml', 'pcs'].includes(lower)) return trimmed;
      return `${trimmed}s`;
    };

    if (!isBulk) {
      return {
        isBulk: false,
        mainUnit,
        subUnit: mainUnit,
        mainPlural: getPlural(mainUnit),
        subPlural: getPlural(mainUnit),
        packageUnit: mainUnit,
        contentUnit: mainUnit,
        packagePlural: getPlural(mainUnit),
        contentPlural: getPlural(mainUnit),
        packSize: 1,
        specText: mainUnit,
        specBadge: ''
      };
    }

    const mainPlural = getPlural(mainUnit);
    const subPlural = getPlural(subUnit);

    return {
      isBulk: true,
      mainUnit,
      subUnit,
      mainPlural,
      subPlural,
      packageUnit: mainUnit,
      contentUnit: subUnit,
      packagePlural: mainPlural,
      contentPlural: subPlural,
      packSize,
      specText: `${packSize} ${subUnit} per ${mainUnit}`,
      specBadge: `${packSize} ${subUnit}/${mainUnit}`
    };
  },

  formatStockDisplay(m) {
    if (!m) return '0';
    const current = Number(m.current_stock) || 0;
    const spec = this.getMaterialUnitSpecs(m);
    if (!spec.isBulk) {
      return `${Number(current).toFixed(1).replace(/\.0$/, '')} ${spec.mainUnit}`;
    }

    const packs = Math.floor(current / spec.packSize);
    const loose = Math.round((current % spec.packSize) * 10) / 10;
    const pUnit = packs === 1 ? spec.mainUnit : spec.mainPlural;

    if (packs > 0 && loose > 0) {
      return `${packs} ${pUnit} ${loose} ${spec.subUnit} (${spec.packSize} ${spec.subUnit}/${spec.mainUnit.toLowerCase()})`;
    } else if (packs > 0 && loose === 0) {
      return `${packs} ${pUnit} (${spec.packSize} ${spec.subUnit}/${spec.mainUnit.toLowerCase()})`;
    } else {
      return `${loose} ${spec.subUnit} (${spec.packSize} ${spec.subUnit}/${spec.mainUnit.toLowerCase()})`;
    }
  },

  formatStockBadge(m) {
    return this.formatStockDisplay(m);
  },

  formatLogQuantity(qty, mat, isChange = false) {
    if (qty === null || qty === undefined || isNaN(qty)) return '-';
    const num = Number(qty);
    if (!mat) {
      const sign = (isChange && num > 0) ? '+' : '';
      return `${sign}${num}`;
    }
    const spec = this.getMaterialUnitSpecs(mat);
    if (!spec.isBulk) {
      const sign = (isChange && num > 0) ? '+' : '';
      return `${sign}${Number(num.toFixed(2)).toLocaleString()} ${spec.mainUnit}`;
    }

    const sign = isChange ? (num > 0 ? '+' : (num < 0 ? '-' : '')) : '';
    const absVal = Math.abs(num);
    const packs = Math.floor(absVal / spec.packSize);
    const loose = Math.round((absVal % spec.packSize) * 10) / 10;
    const pUnit = packs === 1 ? spec.packageUnit : spec.packagePlural;

    let packPart = '';
    if (packs > 0 && loose > 0) {
      packPart = `${sign}${packs} ${pUnit} ${loose} ${spec.subUnit}`;
    } else if (packs > 0 && loose === 0) {
      packPart = `${sign}${packs} ${pUnit}`;
    } else {
      packPart = `${sign}${loose} ${spec.subUnit}`;
    }

    if (packs > 0) {
      return `${packPart} <span class="text-[10px] font-bold text-slate-400">(${sign}${absVal.toLocaleString()} ${spec.subUnit})</span>`;
    }
    return packPart;
  },

  formatUsageQuantity(qty, mat) {
    if (!mat) return `${qty}`;
    const num = Number(qty) || 0;
    const spec = this.getMaterialUnitSpecs(mat);
    if (!spec.isBulk) {
      return `${Number(num.toFixed(2)).toLocaleString()} ${spec.mainUnit}`;
    }
    const packSize = spec.packSize || 1;
    const p = Math.floor(num / packSize);
    const l = Math.round((num % packSize) * 10) / 10;
    const pUnit = p === 1 ? spec.packageUnit : spec.packagePlural;
    if (p > 0 && l > 0) {
      return `${p} ${pUnit} + ${l} ${spec.subUnit} (${num} ${spec.subUnit})`;
    } else if (p > 0) {
      return `${p} ${pUnit} (${num} ${spec.subUnit})`;
    } else {
      return `${l} ${spec.subUnit}`;
    }
  },

  getMaterialStockValue(m) {
    if (!m) return 0;
    const isBulk = Boolean((m.has_bulk === 1 || m.has_bulk === '1' || m.has_bulk === true) && Number(m.pack_size) > 1);
    const stock = Number(m.current_stock) || 0;
    const cost = Number(m.cost_price) || 0;
    if (isBulk) {
      const spec = this.getMaterialUnitSpecs(m);
      return (stock / spec.packSize) * cost;
    }
    return stock * cost;
  },

  renderUI() {
    if (!this.container) return;

    const totalMaterials = this.materials.length;
    const totalValue = this.materials.reduce((sum, m) => sum + this.getMaterialStockValue(m), 0);
    const lowStockCount = this.materials.filter(m => m.current_stock <= (m.min_stock_alert || 0)).length;

    const filtered = this.materials.filter(m => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (m.name || '').toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q);
    });

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 px-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border border-emerald-800/40">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-black border border-emerald-500/30">STAGE 1</span>
              <h2 class="text-2xl font-black tracking-tight text-white">Raw Materials Stock Management</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Manage factory raw stock (Milk, Sugar, Sticks, Wrappers, Cocoa). Track what is purchased and what is left behind.</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="RawMaterials.openChocolateModal()" class="px-3.5 py-2.5 bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs rounded-xl border border-amber-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95" title="Chocolate Production & Processed Stock">
              <i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i> Chocolate Production
            </button>
            <button onclick="RawMaterials.openCategoriesModal()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95" title="Manage Raw Material Categories">
              <i data-lucide="tags" class="w-4 h-4 text-emerald-400"></i> Manage Categories
            </button>
            <button onclick="RawMaterials.openAddModal()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="plus-circle" class="w-4 h-4 text-white"></i> Add New Material
            </button>
            <button onclick="RawMaterials.printReport()" class="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer" title="Print Stock Sheet">
              <i data-lucide="printer" class="w-4 h-4"></i> Print
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-600 tracking-wider">Total Raw Materials</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">${totalMaterials} <span class="text-xs font-bold text-slate-400">items</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <i data-lucide="boxes" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-600 tracking-wider">Total Raw Stock Value</p>
              <h3 class="text-2xl font-black text-emerald-700 mt-1 tabular-nums">Rs. ${Math.round(totalValue).toLocaleString()}</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <i data-lucide="coins" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-600 tracking-wider">Low Stock Warning</p>
              <h3 class="text-2xl font-black ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'} mt-1 tabular-nums">
                ${lowStockCount} <span class="text-xs font-bold text-slate-400">items need refill</span>
              </h3>
            </div>
            <div class="w-11 h-11 rounded-xl ${lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center font-black">
              <i data-lucide="alert-triangle" class="w-5 h-5"></i>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs & Search & Date Filters -->
        <div class="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row justify-between items-center gap-3">
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full lg:w-auto shrink-0">
            <button onclick="RawMaterials.switchTab('inventory')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Current Stock
            </button>
            <button onclick="RawMaterials.switchTab('logs')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Stock History
            </button>
          </div>

          <!-- Controls: Search + Sort + Time Filters -->
          <div class="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
            <!-- Search -->
            <div class="relative w-full sm:w-56">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="rm-search" placeholder="${this.activeTab === 'inventory' ? 'Search material, category...' : 'Search logs, material, action...'}"
                     value="${this.searchQuery}" oninput="RawMaterials.onSearch(this.value)"
                     class="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-400">
              <button type="button" id="rm-search-clear" onclick="RawMaterials.clearSearch()" title="Clear search"
                      class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer ${this.searchQuery ? '' : 'hidden'}">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Category Filter Dropdown -->
            <div class="flex items-center gap-1.5 shrink-0">
              <select id="rm-category-filter" onchange="RawMaterials.onCategorySelect(this.value)"
                      class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-emerald-400 cursor-pointer">
                <option value="all" ${this.selectedCategory === 'all' ? 'selected' : ''}>All Categories</option>
                ${this.getCategories().map(cat => `
                  <option value="${cat}" ${this.selectedCategory === cat ? 'selected' : ''}>${cat}</option>
                `).join('')}
              </select>
            </div>

            <!-- Sort Dropdown -->
            <div class="flex items-center gap-1.5 shrink-0">
              <select id="rm-sort-select" onchange="RawMaterials.onSortSelect(this.value)"
                      class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-emerald-400 cursor-pointer">
                ${this.activeTab === 'inventory' ? `
                  <option value="name_asc" ${this.sortField==='name'&&this.sortOrder==='asc'?'selected':''}>Name (A-Z)</option>
                  <option value="name_desc" ${this.sortField==='name'&&this.sortOrder==='desc'?'selected':''}>Name (Z-A)</option>
                  <option value="stock_desc" ${this.sortField==='stock'&&this.sortOrder==='desc'?'selected':''}>Highest Stock</option>
                  <option value="stock_asc" ${this.sortField==='stock'&&this.sortOrder==='asc'?'selected':''}>Lowest Stock</option>
                  <option value="value_desc" ${this.sortField==='value'&&this.sortOrder==='desc'?'selected':''}>Highest Stock Value</option>
                  <option value="cost_desc" ${this.sortField==='cost'&&this.sortOrder==='desc'?'selected':''}>Highest Cost Price</option>
                  <option value="category_asc" ${this.sortField==='category'&&this.sortOrder==='asc'?'selected':''}>Category (A-Z)</option>
                  <option value="status_desc" ${this.sortField==='status'&&this.sortOrder==='desc'?'selected':''}>Low Stock First</option>
                ` : `
                  <option value="date_desc" ${this.sortField==='date'&&this.sortOrder==='desc'?'selected':''}>Newest First</option>
                  <option value="date_asc" ${this.sortField==='date'&&this.sortOrder==='asc'?'selected':''}>Oldest First</option>
                  <option value="material_asc" ${this.sortField==='material'&&this.sortOrder==='asc'?'selected':''}>Material (A-Z)</option>
                  <option value="qty_desc" ${this.sortField==='qty'&&this.sortOrder==='desc'?'selected':''}>Highest Quantity</option>
                  <option value="stock_after_desc" ${this.sortField==='stock_after'&&this.sortOrder==='desc'?'selected':''}>Highest Stock Left</option>
                  <option value="action_asc" ${this.sortField==='action'&&this.sortOrder==='asc'?'selected':''}>Action (A-Z)</option>
                `}
              </select>
            </div>

            <!-- Period Switcher: Daily | Monthly | Annual | Custom Range | All -->
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button type="button" onclick="RawMaterials.setPeriod('day')" id="rm-tab-day"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'day' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Daily
              </button>
              <button type="button" onclick="RawMaterials.setPeriod('month')" id="rm-tab-month"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'month' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Monthly
              </button>
              <button type="button" onclick="RawMaterials.setPeriod('year')" id="rm-tab-year"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'year' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Annual
              </button>
              <button type="button" onclick="RawMaterials.setPeriod('custom')" id="rm-tab-custom"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'custom' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Custom Range
              </button>
              <button type="button" onclick="RawMaterials.setPeriod('all')" id="rm-tab-all"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'all' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                All
              </button>
            </div>

            <!-- Date Picker for Day/Month/Year/Custom -->
            ${this.periodType !== 'all' ? `
              <div id="rm-date-picker-wrap" class="shrink-0">
                ${this.periodType === 'custom' ? `
                  <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
                    <span class="text-[10px] font-black uppercase text-slate-400">From</span>
                    <input type="date" id="rm-start-date" value="${this.startDate || this.selectedDate}" 
                           onchange="RawMaterials.onCustomDateChange('start', this.value)"
                           oninput="RawMaterials.onCustomDateChange('start', this.value)"
                           class="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer">
                    <span class="text-[10px] font-black uppercase text-slate-400">To</span>
                    <input type="date" id="rm-end-date" value="${this.endDate || this.selectedDate}" 
                           onchange="RawMaterials.onCustomDateChange('end', this.value)"
                           oninput="RawMaterials.onCustomDateChange('end', this.value)"
                           class="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer">
                  </div>
                ` : this.periodType === 'year' ? `
                  <select id="rm-date-input" onchange="RawMaterials.onDateChange(this.value)" oninput="RawMaterials.onDateChange(this.value)"
                          class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer">
                    ${this.getAvailableYears().map(y => `
                      <option value="${y}" ${String(this.selectedDate || '').startsWith(String(y)) ? 'selected' : ''}>${y}</option>
                    `).join('')}
                  </select>
                ` : `
                  <input type="${this.periodType === 'month' ? 'month' : 'date'}" id="rm-date-input" 
                         value="${this.periodType === 'month' ? this.selectedDate.slice(0, 7) : this.selectedDate}" 
                         onchange="RawMaterials.onDateChange(this.value)"
                         oninput="RawMaterials.onDateChange(this.value)"
                         class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer">
                `}
              </div>
            ` : ''}

            <!-- Red Cross Reset to Current Date/Period -->
            <div id="rm-reset-filter-wrap" class="shrink-0 flex items-center">
              ${this.isFilteredFromCurrent() ? `
                <button type="button" onclick="RawMaterials.resetToCurrent()" 
                        class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                        title="Go back to current (Today)">
                  <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Period Stats Bar (Shown for Daily, Monthly & Annual) -->
        <div id="rm-stats-container">
          ${this.renderStatsBar()}
        </div>

        <!-- Content Area -->
        <div id="rm-content-area" class="flex-1 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          ${this.renderContentArea()}
        </div>

      </div>

      <!-- Add/Edit Material Modal Container -->
      <div id="rm-modal-container"></div>
    `;

    if (window.lucide) lucide.createIcons({ root: this.container });
  },

  renderStatsBar() {
    if (this.periodType === 'all') return '';
    const stats = this.getPeriodStats();
    const periodLabel = this.periodType === 'day' 
      ? `Today (${app.formatDateOnly(this.selectedDate)})` 
      : (this.periodType === 'month' 
        ? `Month (${this.selectedDate.slice(5, 7)}/${this.selectedDate.slice(0, 4)})` 
        : (this.periodType === 'year' 
          ? `Annual (${this.selectedDate.slice(0, 4)})` 
          : `Custom (${app.formatDateOnly(this.startDate)} – ${app.formatDateOnly(this.endDate)})`));
    const badgeText = this.periodType === 'day' 
      ? 'Daily Stats' 
      : (this.periodType === 'month' 
        ? 'Monthly Stats' 
        : (this.periodType === 'year' 
          ? 'Annual Stats' 
          : 'Custom Range Stats'));
    return `
      <div class="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-lg bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider">
            ${badgeText}
          </span>
          <span class="font-bold text-slate-700">
            Period: <span class="font-mono font-black text-slate-900">${periodLabel}</span>
          </span>
        </div>
        <div class="flex items-center gap-4 flex-wrap font-bold text-slate-600">
          <div>Movements: <span class="font-black text-slate-900 font-mono">${stats.totalMovements}</span></div>
          <div>Purchased: <span class="font-black text-emerald-700 font-mono">Rs. ${stats.purchasedWorth.toLocaleString()}</span> (${stats.purchasesCount} ${stats.purchasesCount === 1 ? 'order' : 'orders'})</div>
          <div>Factory Consumed: <span class="font-black text-rose-700 font-mono">Rs. ${stats.consumedWorth.toLocaleString()}</span> (${stats.productionCount} ${stats.productionCount === 1 ? 'batch' : 'batches'})</div>
          <button type="button" onclick="app.navigate('reports'); setTimeout(() => Reports.switchTab('raw'), 100);"
                  class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg border border-emerald-300 font-black text-[11px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer ml-auto"
                  title="View complete tabular Raw Materials Report">
            <i data-lucide="bar-chart-2" class="w-3.5 h-3.5 text-emerald-600"></i> Full Report
          </button>
        </div>
      </div>
    `;
  },

  renderContentArea() {
    let filtered = [...(this.materials || [])];
    if (this.selectedCategory && this.selectedCategory !== 'all') {
      filtered = filtered.filter(m => (m.category || 'General').toLowerCase() === this.selectedCategory.toLowerCase());
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q) ||
        (m.unit || '').toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q)
      );
    }

    if (this.activeTab === 'inventory') {
      const sf = this.sortField;
      const so = this.sortOrder === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        if (sf === 'name') return so * (a.name || '').localeCompare(b.name || '');
        if (sf === 'category') return so * (a.category || '').localeCompare(b.category || '');
        if (sf === 'unit') return so * (a.unit || '').localeCompare(b.unit || '');
        if (sf === 'stock') return so * ((a.current_stock || 0) - (b.current_stock || 0));
        if (sf === 'cost') return so * ((a.cost_price || 0) - (b.cost_price || 0));
        if (sf === 'value') {
          const valA = this.getMaterialStockValue(a);
          const valB = this.getMaterialStockValue(b);
          return so * (valA - valB);
        }
        if (sf === 'status') {
          const lowA = (a.current_stock <= (a.min_stock_alert || 0)) ? 1 : 0;
          const lowB = (b.current_stock <= (b.min_stock_alert || 0)) ? 1 : 0;
          return so * (lowA - lowB);
        }
        return so * (a.name || '').localeCompare(b.name || '');
      });
      return this.renderInventoryTable(filtered);
    } else {
      return this.renderLogsTable();
    }
  },

  updateContentArea() {
    const statsContainer = document.getElementById('rm-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = this.renderStatsBar();
    }
    const contentArea = document.getElementById('rm-content-area');
    if (contentArea) {
      contentArea.innerHTML = this.renderContentArea();
      if (window.lucide) lucide.createIcons({ root: contentArea });
    }
  },

  getCategories() {
    const dbCatNames = (this.categories || []).map(c => c.name);
    const dynamicCats = (this.materials || []).map(m => m.category).filter(Boolean);
    const set = new Set([...dbCatNames, ...dynamicCats]);
    if (set.size === 0) {
      ['Dairy', 'Sweeteners', 'Flavors & Coating', 'Packaging & Sticks', 'General'].forEach(c => set.add(c));
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  },

  onCategorySelect(val) {
    this.selectedCategory = val || 'all';
    this.updateContentArea();
    this.updateResetButton();
  },

  setPeriod(period) {
    this.periodType = period;
    this.renderUI();
  },

  isFilteredFromCurrent() {
    const today = (window.app && typeof app.getTodayDate === 'function')
      ? app.getTodayDate()
      : (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    if (this.selectedCategory && this.selectedCategory !== 'all') return true;
    if (this.periodType === 'custom') return true;
    if (this.periodType !== 'day') return true;
    if (this.selectedDate && this.selectedDate !== today) return true;
    return false;
  },

  resetToCurrent() {
    const today = (window.app && typeof app.getTodayDate === 'function')
      ? app.getTodayDate()
      : (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    this.selectedCategory = 'all';
    this.periodType = 'day';
    this.selectedDate = today;
    this.startDate = today;
    this.endDate = today;
    this.renderUI();
  },

  updateResetButton() {
    const wrap = document.getElementById('rm-reset-filter-wrap');
    if (wrap) {
      wrap.innerHTML = this.isFilteredFromCurrent() ? `
        <button type="button" onclick="RawMaterials.resetToCurrent()" 
                class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                title="Go back to current (Today)">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
        </button>
      ` : '';
      if (window.lucide) lucide.createIcons({ root: wrap });
    }
  },

  onDateChange(val) {
    if (!val) return;
    this.selectedDate = val;
    this.updateContentArea();
    this.updateResetButton();
  },

  onCustomDateChange(type, val) {
    if (!val) return;
    if (type === 'start') this.startDate = val;
    if (type === 'end') this.endDate = val;
    this.updateContentArea();
    this.updateResetButton();
  },

  getAvailableYears() {
    const curYear = new Date().getFullYear();
    const years = new Set([curYear, curYear - 1, curYear + 1]);
    (this.logs || []).forEach(l => {
      if (l.date) {
        const y = parseInt(l.date.slice(0, 4));
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  },

  getFilteredLogs() {
    let list = [...(this.logs || [])];
    if (this.selectedCategory && this.selectedCategory !== 'all') {
      list = list.filter(l => {
        const mat = (this.materials || []).find(m => m.id === l.material_id);
        const cat = mat ? (mat.category || 'General') : (l.material_category || 'General');
        return cat.toLowerCase() === this.selectedCategory.toLowerCase();
      });
    }
    if (this.periodType === 'day' && this.selectedDate) {
      list = list.filter(l => l.date === this.selectedDate);
    } else if (this.periodType === 'month' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      list = list.filter(l => l.date && l.date.startsWith(ym));
    } else if (this.periodType === 'year' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      list = list.filter(l => l.date && l.date.startsWith(y));
    } else if (this.periodType === 'custom') {
      if (this.startDate) list = list.filter(l => (l.date || '').slice(0, 10) >= this.startDate);
      if (this.endDate) list = list.filter(l => (l.date || '').slice(0, 10) <= this.endDate);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(l =>
        (l.material_name || '').toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }

    if (this.activeTab === 'logs') {
      const sf = this.sortField;
      const so = this.sortOrder === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        if (sf === 'date') {
          const dA = new Date(a.date || a.created_at || 0).getTime() || 0;
          const dB = new Date(b.date || b.created_at || 0).getTime() || 0;
          return so * (dA - dB);
        }
        if (sf === 'material') return so * (a.material_name || '').localeCompare(b.material_name || '');
        if (sf === 'action') return so * (a.action || '').localeCompare(b.action || '');
        if (sf === 'qty') return so * (Math.abs(a.qty_change || 0) - Math.abs(b.qty_change || 0));
        if (sf === 'stock_before') return so * ((a.stock_before || 0) - (b.stock_before || 0));
        if (sf === 'stock_after') return so * ((a.stock_after || 0) - (b.stock_after || 0));
        const dA = new Date(a.date || a.created_at || 0).getTime() || 0;
        const dB = new Date(b.date || b.created_at || 0).getTime() || 0;
        return (dB - dA);
      });
    }

    return list;
  },

  getPeriodStats() {
    const list = this.getFilteredLogs();
    const purchaseLogs = list.filter(l => l.action === 'PURCHASE');
    const prodLogs = list.filter(l => l.action === 'PRODUCTION' || (l.qty_change || 0) < 0);
    const totalAdded = purchaseLogs.reduce((sum, l) => sum + Math.max(0, l.qty_change || 0), 0);
    const totalConsumed = prodLogs.reduce((sum, l) => sum + Math.abs(l.qty_change || 0), 0);

    let purchasedWorth = 0;
    purchaseLogs.forEach(l => {
      const mat = (this.materials || []).find(m => m.id === l.material_id);
      if (!mat) return;
      const cost = Number(mat.cost_price) || 0;
      const spec = this.getMaterialUnitSpecs(mat);
      const unitCost = spec && spec.isBulk ? (cost / spec.packSize) : cost;
      purchasedWorth += Math.max(0, l.qty_change || 0) * unitCost;
    });

    let consumedWorth = 0;
    prodLogs.forEach(l => {
      const mat = (this.materials || []).find(m => m.id === l.material_id);
      if (!mat) return;
      const cost = Number(mat.cost_price) || 0;
      const spec = this.getMaterialUnitSpecs(mat);
      const unitCost = spec && spec.isBulk ? (cost / spec.packSize) : cost;
      consumedWorth += Math.abs(l.qty_change || 0) * unitCost;
    });

    return {
      totalMovements: list.length,
      purchasesCount: purchaseLogs.length,
      productionCount: prodLogs.length,
      totalAdded: Math.round(totalAdded * 10) / 10,
      totalConsumed: Math.round(totalConsumed * 10) / 10,
      purchasedWorth: Math.round(purchasedWorth),
      consumedWorth: Math.round(consumedWorth)
    };
  },

  toggleSort(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = ['stock', 'cost', 'value', 'date', 'qty', 'stock_before', 'stock_after'].includes(field) ? 'desc' : 'asc';
    }
    const sel = document.getElementById('rm-sort-select');
    if (sel) sel.value = `${this.sortField}_${this.sortOrder}`;
    this.updateContentArea();
  },

  onSortSelect(val) {
    if (!val) return;
    const parts = val.split('_');
    const order = parts.pop();
    const field = parts.join('_');
    this.sortField = field;
    this.sortOrder = order || 'asc';
    this.updateContentArea();
  },

  getSortIcon(field) {
    if (this.sortField !== field) {
      return `<i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-300 ml-1 inline-block"></i>`;
    }
    return this.sortOrder === 'asc'
      ? `<i data-lucide="arrow-up" class="w-3 h-3 text-emerald-600 ml-1 inline-block"></i>`
      : `<i data-lucide="arrow-down" class="w-3 h-3 text-emerald-600 ml-1 inline-block"></i>`;
  },

  clearSearch() {
    this.searchQuery = '';
    const inp = document.getElementById('rm-search');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    const clr = document.getElementById('rm-search-clear');
    if (clr) clr.classList.add('hidden');
    this.updateContentArea();
  },

  onSearch(query) {
    this.searchQuery = query;
    const clr = document.getElementById('rm-search-clear');
    if (clr) clr.classList.toggle('hidden', !query);
    this.updateContentArea();
  },

  switchTab(tab) {
    this.activeTab = tab;
    if (tab === 'inventory') {
      this.sortField = 'name';
      this.sortOrder = 'asc';
    } else {
      this.sortField = 'date';
      this.sortOrder = 'desc';
    }
    this.renderUI();
  },

  renderInventoryTable(items) {
    if (items.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="package-x" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No raw materials found</h4>
          <p class="text-xs text-slate-400 mt-1">Click "+ Add New Material" to register Milk, Sugar, Sticks, etc.</p>
        </div>
      `;
    }

    const totalMaterials = items.length;
    const totalStockValue = items.reduce((sum, m) => sum + this.getMaterialStockValue(m), 0);
    const lowStockCount = items.filter(m => (Number(m.current_stock) || 0) <= (Number(m.min_stock_alert) || 0)).length;

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-2 px-2 text-center w-10 border-r border-slate-200 text-slate-400 font-black">#</th>
              <th onclick="RawMaterials.toggleSort('name')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Material</span>
                  ${this.getSortIcon('name')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('category')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Category</span>
                  ${this.getSortIcon('category')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('stock')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Stock</span>
                  ${this.getSortIcon('stock')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Cost / Unit</span>
                  ${this.getSortIcon('cost')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('value')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Stock Value</span>
                  ${this.getSortIcon('value')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('status')" class="py-2 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-center gap-1">
                  <span>Status</span>
                  ${this.getSortIcon('status')}
                </div>
              </th>
              <th class="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${items.map((m, idx) => {
              const spec = this.getMaterialUnitSpecs(m);
              const isLow = m.current_stock <= (m.min_stock_alert || 0);
              const val = Math.round(this.getMaterialStockValue(m));
              const hasBulk = spec.isBulk;
              const stockDisplay = RawMaterials.formatStockDisplay(m);

              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-1.5 px-2 text-center text-slate-400 font-bold border-r border-slate-200 text-xs">${idx + 1}</td>
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-black text-slate-900 text-xs">${m.name}</span>
                      ${hasBulk ? `
                        <span class="px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200 font-mono text-[9px] font-black" title="Bulk Spec: ${spec.specText}">
                          ${spec.specBadge}
                        </span>
                      ` : ''}
                    </div>
                  </td>
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">${m.category || 'General'}</span>
                  </td>
                  <td class="py-1.5 px-3 text-right border-r border-slate-200">
                    <div class="font-black text-sm tabular-nums ${isLow ? 'text-rose-600' : 'text-emerald-700'}">
                      ${stockDisplay}
                    </div>
                    ${hasBulk ? `
                      <div class="text-[10px] font-bold text-slate-400 tabular-nums">
                        ${Number(m.current_stock).toLocaleString()} ${spec.contentUnit} total
                      </div>
                    ` : ''}
                  </td>
                  <td class="py-1.5 px-3 text-right font-mono font-bold text-slate-700 tabular-nums border-r border-slate-200">
                    <div>Rs. ${Number(m.cost_price).toFixed(2).replace(/\.00$/, '')} <span class="text-[11px] font-bold text-slate-500">/ ${hasBulk ? spec.packageUnit : spec.contentUnit}</span></div>
                    ${hasBulk ? `
                      <div class="text-[10px] font-bold text-purple-700 font-mono">Rs. ${(m.cost_price / spec.packSize).toFixed(2).replace(/\.00$/, '')} / ${spec.contentUnit}</div>
                    ` : ''}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">Rs. ${val.toLocaleString()}</td>
                  <td class="py-1.5 px-3 text-center border-r border-slate-200">
                    ${isLow 
                      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-[10px] border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Low Stock</span>`
                      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">In Stock</span>`
                    }
                  </td>
                  <td class="py-1.5 px-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="Purchases.openPurchaseModal(null, { material_id: ${m.id} })" title="Record Purchase for this Material" class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="RawMaterials.openEditModal(${m.id})" title="Edit Material" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="RawMaterials.deleteMaterial(${m.id})" title="Delete Material" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot class="bg-slate-100/95 border-t-2 border-slate-300 font-black text-xs text-slate-900 sticky bottom-0 z-10 shadow-sm">
            <tr class="bg-slate-100 border-t-2 border-slate-300">
              <td class="py-2.5 px-2 text-center text-slate-400 font-bold border-r border-slate-300">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-left">
                <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                  <span class="text-emerald-700 font-black">TOTAL:</span>
                  <span>${totalMaterials} ${totalMaterials === 1 ? 'Material' : 'Materials'}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-slate-400 font-bold text-center">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-slate-500 text-xs">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-400 text-xs">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-emerald-800 text-sm tabular-nums bg-emerald-50/80">
                Rs. ${Math.round(totalStockValue).toLocaleString()}
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center">
                ${lowStockCount > 0 
                  ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black text-[10px] border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> ${lowStockCount} Low</span>`
                  : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] border border-emerald-200">All In Stock</span>`
                }
              </td>
              <td class="py-2.5 px-3 text-right text-slate-400 font-bold text-xs">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  renderLogsTable() {
    const logs = this.getFilteredLogs();
    if (logs.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="history" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No stock movement logs found</h4>
          <p class="text-xs text-slate-400 mt-1">Purchases, stock additions, and production consumption deductions will appear here automatically.</p>
        </div>
      `;
    }

    const totalLogs = logs.length;
    const totalNetChange = logs.reduce((sum, l) => sum + (Number(l.qty_change) || 0), 0);

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-2 px-2 text-center w-10 border-r border-slate-200 text-slate-400 font-black">#</th>
              <th onclick="RawMaterials.toggleSort('date')" class="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[95px] cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Date</span>
                  ${this.getSortIcon('date')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('action')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Action</span>
                  ${this.getSortIcon('action')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('material')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Material</span>
                  ${this.getSortIcon('material')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('qty')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Qty Change</span>
                  ${this.getSortIcon('qty')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('stock_before')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Before</span>
                  ${this.getSortIcon('stock_before')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('stock_after')" class="py-2 px-3 text-right font-black text-slate-800 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Current</span>
                  ${this.getSortIcon('stock_after')}
                </div>
              </th>
              <th class="py-2 px-3 border-r border-slate-200">Notes</th>
              <th class="py-2 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${logs.map((log, idx) => {
              const isAdd = (log.qty_change || 0) > 0;
              const isProd = log.action === 'PRODUCTION_USED' || log.action === 'PRODUCTION';
              const isChoc = log.action === 'CHOCOLATE_PRODUCTION';
              const mat = (this.materials || []).find(m => m.id === log.material_id);
              const actionBadge = log.action === 'PURCHASE'
                ? `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] tracking-wide">PURCHASE</span>`
                : (isChoc
                    ? `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[10px] tracking-wide">CHOCOLATE</span>`
                    : (isProd
                        ? `<span class="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-black text-[10px] tracking-wide">PRODUCTION</span>`
                        : `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-black text-[10px] tracking-wide">${log.action || 'LOG'}</span>`
                      )
                  );

              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-1.5 px-2 text-center text-slate-400 font-bold border-r border-slate-200 text-xs">${idx + 1}</td>
                  <td class="py-1.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap border-r border-slate-200">${app.formatDateTime(log.date, log.created_at)}</td>
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    ${actionBadge}
                  </td>
                  <td class="py-1.5 px-3 font-black text-slate-900 text-xs border-r border-slate-200">${log.material_name}</td>
                  <td class="py-1.5 px-3 text-right font-black tabular-nums border-r border-slate-200 ${isAdd ? 'text-emerald-600' : 'text-rose-600'}">
                    ${this.formatLogQuantity(log.qty_change, mat, true)}
                  </td>
                  <td class="py-1.5 px-3 text-right font-mono text-slate-600 tabular-nums border-r border-slate-200">
                    ${this.formatLogQuantity(log.stock_before, mat, false)}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">
                    ${this.formatLogQuantity(log.stock_after, mat, false)}
                  </td>
                  <td class="py-1.5 px-3 text-slate-500 text-[11px] border-r border-slate-200">${log.notes || ''}</td>
                  <td class="py-1.5 px-3 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="RawMaterials.viewLog(${log.id})" title="View / Print Document (A5)"
                              class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs">
                        <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="RawMaterials.editLog(${log.id})" title="Edit Details / Notes"
                              class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="RawMaterials.deleteLogEntry(${log.id})" title="Delete Transaction"
                              class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot class="bg-slate-100/95 border-t-2 border-slate-300 font-black text-xs text-slate-900 sticky bottom-0 z-10 shadow-sm">
            <tr class="bg-slate-100 border-t-2 border-slate-300">
              <td class="py-2.5 px-3 border-r border-slate-300 text-left" colspan="4">
                <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                  <span class="text-emerald-700 font-black">TOTAL:</span>
                  <span>${totalLogs} ${totalLogs === 1 ? 'Movement' : 'Movements'}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black tabular-nums text-xs ${totalNetChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}">
                ${totalNetChange >= 0 ? '+' : ''}${Math.round(totalNetChange * 10) / 10}
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 text-slate-400 font-bold text-xs border-r border-slate-300">-</td>
              <td class="py-2.5 px-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  openAddModal() {
    this.showMaterialModal({
      id: null,
      name: '',
      category: 'General',
      unit: 'PCS',
      has_bulk: 0,
      pack_unit: 'Pack',
      pack_size: 500,
      current_stock: 0,
      cost_price: 0,
      min_stock_alert: 5,
      notes: ''
    });
  },

  async openEditModal(id) {
    let m = this.materials.find(x => x.id === id);
    if (!m) return;
    try {
      if (window.api && typeof window.api.getRawMaterial === 'function') {
        const fresh = await window.api.getRawMaterial(id);
        if (fresh) m = fresh;
      }
    } catch (e) {}
    app.authorizeAction(() => {
      this.showMaterialModal(m);
    }, 'editing raw material');
  },

  showMaterialModal(m) {
    const isEdit = Boolean(m.id);
    const spec = this.getMaterialUnitSpecs(m);
    const isBulk = Boolean(m.has_bulk === 1 || m.has_bulk === '1' || m.has_bulk === true);
    const packUnit = m.pack_unit || 'Pack';
    const packSize = Number(m.pack_size) > 0 ? Number(m.pack_size) : 500;
    const currentStock = Number(m.current_stock) || 0;
    const initialPacks = isBulk ? Math.floor(currentStock / spec.packSize) : 0;
    const initialLoose = isBulk ? Math.round((currentStock % spec.packSize) * 100) / 100 : 0;
    const modalEl = document.getElementById('rm-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) RawMaterials.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black shadow-2xs shrink-0">
                <i data-lucide="boxes" class="w-4.5 h-4.5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 tracking-tight leading-snug">${isEdit ? 'Edit Raw Material' : 'Add New Raw Material'}</h3>
                <p class="text-[11px] font-semibold text-slate-400 leading-none mt-0.5">Stage 1 • Raw Materials Inventory</p>
              </div>
            </div>
            <button type="button" onclick="RawMaterials.closeModal()" class="modal-close-btn" title="Close (Esc)">
              <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
            </button>
          </div>
          <form onsubmit="RawMaterials.handleMaterialSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="rm-id" value="${m.id || ''}">
            <input type="hidden" id="rm-stock" value="${currentStock}">

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Material Name *</label>
              <input type="text" id="rm-name" required value="${m.name || ''}" placeholder="e.g. Fresh Milk, Sugar, Chocbar Sticks..."
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Category</label>
                <select id="rm-category" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500">
                  ${this.getCategories().map(cat => `
                    <option value="${cat}" ${(m.category || 'General').toLowerCase() === cat.toLowerCase() ? 'selected' : ''}>${cat}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Unit *</label>
                <input type="text" id="rm-unit" required value="${isEdit ? (m.unit || '') : (m.unit || 'PCS')}" placeholder="Bag, Box, PCS, KG..."
                       oninput="RawMaterials.syncBulkCalculations()"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
              </div>
            </div>

            <!-- Variable / Bulk Packaging Checkbox & Config -->
            <div class="p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-2.5">
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" id="rm-has-bulk" ${isBulk ? 'checked' : ''} onchange="RawMaterials.toggleBulkFields()"
                       class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-black text-slate-800">Variable / Bulk Packaging</span>
                  <span class="text-[10px] text-slate-500 font-semibold">(e.g. 500 pcs/pack, 100 cones/box)</span>
                </div>
              </label>

              <div id="rm-bulk-fields" class="${isBulk ? '' : 'hidden'} pt-2 border-t border-emerald-200/60">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-black uppercase text-slate-600 tracking-wider mb-1">Sub-Unit</label>
                    <input type="text" id="rm-pack-unit" value="${packUnit}" placeholder="KG, Liters, Pcs, Pack..."
                           oninput="RawMaterials.syncBulkCalculations()"
                           class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-emerald-500">
                  </div>
                  <div>
                    <label class="block text-[10px] font-black uppercase text-slate-600 tracking-wider mb-1">Qty Per Pack</label>
                    <input type="number" step="any" min="1" id="rm-pack-size" value="${packSize}" placeholder="500"
                           oninput="RawMaterials.syncBulkCalculations()"
                           class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 outline-none focus:border-emerald-500 tabular-nums">
                  </div>
                </div>
              </div>
            </div>

            <!-- Opening Stock Inputs -->
            <!-- Single Stock Input (when Bulk is unchecked) -->
            <div id="rm-single-stock-field" class="${isBulk ? 'hidden' : ''}">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Current Stock</label>
                <input type="number" step="any" min="0" id="rm-stock-single" value="${isEdit && !isBulk ? (m.current_stock ?? '') : ''}" placeholder="0"
                       oninput="RawMaterials.syncSingleStock()"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
            </div>

            <!-- Bulk Stock Inputs (when Bulk is checked) -->
            <div id="rm-bulk-stock-fields" class="${isBulk ? '' : 'hidden'} space-y-2">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1" id="rm-stock-packs-label">Current Stock (<span class="rm-pack-unit-text">${spec.isBulk ? spec.packagePlural : 'Packs'}</span>)</label>
                  <input type="number" step="any" min="0" id="rm-stock-packs" value="${isEdit && isBulk ? initialPacks : ''}" placeholder="0"
                         oninput="RawMaterials.syncBulkCalculations()"
                         class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
                </div>
                <div>
                  <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1" id="rm-stock-loose-label">Loose Items (<span class="rm-content-unit-text">${spec.isBulk ? spec.contentUnit : 'Units'}</span>)</label>
                  <input type="number" step="any" min="0" id="rm-stock-loose" value="${isEdit && isBulk ? initialLoose : ''}" placeholder="0"
                         oninput="RawMaterials.syncBulkCalculations()"
                         class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
                </div>
              </div>
              <div class="flex items-center justify-between px-3 py-1.5 bg-slate-100 rounded-lg text-[11px]">
                <span class="font-bold text-slate-500">Total Current Stock:</span>
                <span id="rm-bulk-total-display" class="font-black text-emerald-800 font-mono">${isBulk ? `${initialPacks} ${spec.packagePlural} (${currentStock.toLocaleString()} ${spec.contentUnit} total)` : `${currentStock.toLocaleString()} ${m.unit || 'PCS'} total`}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Price / Unit (Rs.)</label>
                <input type="number" step="any" min="0" id="rm-cost" value="${isEdit ? (m.cost_price ?? '') : ''}" placeholder="0"
                       oninput="RawMaterials.calcMaterialValue(); RawMaterials.syncBulkCalculations();"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
                <div id="rm-pack-cost-hint" class="text-[10px] text-emerald-700 font-bold mt-1 ${isBulk ? '' : 'hidden'}"></div>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Min Stock Alert Level</label>
                <input type="number" step="any" min="0" id="rm-min-alert" value="${isEdit ? (m.min_stock_alert ?? '') : ''}" placeholder="5"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Stock Value (Rs.)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">Rs.</span>
                <input type="text" id="rm-value-display" readonly
                       value="${isEdit ? Math.round(this.getMaterialStockValue(m)).toLocaleString() : '0'}"
                       placeholder="0"
                       class="w-full pl-9 pr-3.5 py-2 bg-slate-100/90 border border-slate-300 rounded-xl text-xs font-mono font-black text-emerald-800 outline-none tabular-nums select-none cursor-default">
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="RawMaterials.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">Save Material</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
    if (isBulk) {
      this.syncBulkCalculations();
    }
  },

  async openPurchaseModal(defaultMaterialId = null) {
    const modalEl = document.getElementById('rm-modal-container');
    if (!modalEl) return;

    let suppliers = [];
    try {
      suppliers = await window.api.getSuppliers() || [];
    } catch (e) {
      suppliers = [];
    }

    const defaultMaterial = defaultMaterialId ? this.materials.find(x => x.id === Number(defaultMaterialId)) : null;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) RawMaterials.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black shadow-2xs shrink-0">
                <i data-lucide="plus-circle" class="w-4.5 h-4.5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 tracking-tight leading-snug">Stock-In / Purchase Raw Material</h3>
                <p class="text-[11px] font-semibold text-slate-400 leading-none mt-0.5">Add purchased inward quantity to factory stock</p>
              </div>
            </div>
            <button type="button" onclick="RawMaterials.closeModal()" class="modal-close-btn" title="Close (Esc)">
              <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
            </button>
          </div>
          <form onsubmit="RawMaterials.handlePurchaseSubmit(event)" class="p-6 space-y-4">
            <!-- Searchable Dropdown for Material Selection -->
            <div class="relative dropdown-wrap" id="po-material-wrap">
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Select Raw Material *</label>
              <input type="hidden" id="po-material-id" value="${defaultMaterial ? defaultMaterial.id : ''}">
              
              <div class="relative">
                <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                <input type="text" id="po-material-search" autocomplete="off"
                       placeholder="Search material by name, category..."
                       value="${defaultMaterial ? defaultMaterial.name : ''}"
                       onfocus="RawMaterials.openPurchaseMaterialDropdown()"
                       onclick="RawMaterials.openPurchaseMaterialDropdown()"
                       oninput="RawMaterials.filterPurchaseMaterialDropdown(this.value)"
                       onkeydown="RawMaterials.onPurchaseMaterialKeydown(event)"
                       class="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition-all cursor-pointer">
                <button type="button" onclick="RawMaterials.togglePurchaseMaterialDropdown()"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer">
                  <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </button>
              </div>

              <!-- Floating Searchable Dropdown -->
              <div id="po-material-dropdown" class="search-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden hidden max-h-56 overflow-y-auto z-[1300] divide-y divide-slate-100">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Quantity Purchased *</label>
                <input type="number" step="any" min="0.01" id="po-qty" required placeholder="0" oninput="RawMaterials.calcPurchaseTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
                <div id="po-qty-unit-hint" class="text-[11px] font-bold text-slate-500 mt-1"></div>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Per Unit (Rs.) *</label>
                <input type="number" step="any" min="0" id="po-cost" required placeholder="0" oninput="RawMaterials.calcPurchaseTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
                <div id="po-cost-unit-hint" class="text-[11px] font-bold text-slate-500 mt-1"></div>
              </div>
            </div>
            <div class="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span class="text-xs font-black text-emerald-900">Total Purchase Cost:</span>
              <span id="po-total-display" class="text-lg font-black text-emerald-700 tabular-nums">Rs. 0</span>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider">Select Supplier (Required) *</label>
              </div>
              <select id="po-supplier-id" onchange="RawMaterials.onSupplierSelectChange(this.value)" required
                      class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer">
                <option value="" disabled selected>-- Select Supplier (Required) --</option>
                ${suppliers.map(s => {
                  const bal = Number(s.amount) || 0;
                  const balText = bal > 0 ? `• Due: Rs. ${Math.round(bal).toLocaleString()}` : '• Clear';
                  return `<option value="${s.id}" data-name="${s.name}" data-balance="${bal}">${s.name} ${s.phone ? `(${s.phone})` : ''} ${balText}</option>`;
                }).join('')}
              </select>
              <div id="po-supplier-bal-info" class="mt-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hidden"></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Purchase Date</label>
                <input type="date" id="po-date" value="${new Date().toISOString().split('T')[0]}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Payment Method</label>
                <select id="po-payment-mode"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer">
                  <option value="Cash">💵 Cash</option>
                  <option value="Online">💳 Online</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Amount Paid Now (Rs.)</label>
              <input type="number" step="any" min="0" id="po-paid-amount" placeholder="0" oninput="delete this.dataset.autoFilled; RawMaterials.calcPartialBalance()"
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              <p id="po-partial-pending-text" class="text-[11px] font-bold text-slate-500 mt-1"></p>
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes / Remarks</label>
              <input type="text" id="po-notes" placeholder="Vehicle #, payment status, terms..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="RawMaterials.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">Confirm Stock-In</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });

    if (defaultMaterialId) {
      this.onPurchaseMaterialChange(defaultMaterialId);
    }
  },

  openPurchaseMaterialDropdown() {
    const dropdown = document.getElementById('po-material-dropdown');
    if (!dropdown) return;
    const searchVal = document.getElementById('po-material-search')?.value || '';
    this.filterPurchaseMaterialDropdown(searchVal);
    if (window.lucide) lucide.createIcons({ root: dropdown });
  },

  togglePurchaseMaterialDropdown() {
    const dropdown = document.getElementById('po-material-dropdown');
    if (!dropdown) return;
    if (dropdown.classList.contains('hidden')) {
      this.openPurchaseMaterialDropdown();
      document.getElementById('po-material-search')?.focus();
    } else {
      dropdown.classList.add('hidden');
    }
  },

  filterPurchaseMaterialDropdown(query = '') {
    const dropdown = document.getElementById('po-material-dropdown');
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();
    const currentId = Number(document.getElementById('po-material-id')?.value) || null;

    const allMaterials = [...(this.materials || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let matches = [];
    if (!q) {
      matches = allMaterials;
    } else {
      const getWords = (str) => (str || '').toLowerCase().split(/[\s\-_\/,\.]+/).filter(Boolean);
      const scored = [];

      for (const m of allMaterials) {
        const name = (m.name || '').toLowerCase();
        const cat = (m.category || '').toLowerCase();
        const unit = (m.unit || '').toLowerCase();
        const words = getWords(name);

        let tier = 999;
        if (name.startsWith(q)) tier = 1;
        else if (words.some(w => w.startsWith(q))) tier = 2;
        else if (cat.startsWith(q)) tier = 3;
        else if (q.length >= 2 && name.includes(q)) tier = 4;
        else if (q.length >= 2 && cat.includes(q)) tier = 5;

        if (tier < 999) {
          scored.push({ m, tier });
        }
      }

      scored.sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return (a.m.name || '').localeCompare(b.m.name || '');
      });

      matches = scored.map(item => item.m);
    }

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="p-4 text-center text-xs font-bold text-slate-400">
          No raw materials match "${query}"
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    this.purchaseMaterialMatches = matches;
    this.purchaseMaterialActiveIdx = 0;

    dropdown.innerHTML = matches.map((m, idx) => {
      const isSelected = m.id === currentId;
      const stockText = this.formatStockDisplay(m);
      return `
        <div class="px-3.5 py-2.5 hover:bg-emerald-50/80 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-50 font-black text-emerald-950' : 'text-slate-800'}"
             onclick="RawMaterials.selectPurchaseMaterial(${m.id})">
          <div>
            <div class="text-xs font-black text-slate-900">${m.name}</div>
            <div class="text-[10px] text-slate-500 font-bold mt-0.5">${m.category || 'General'} • Current: <span class="font-black text-slate-700">${stockText}</span></div>
          </div>
          <div class="text-right">
            <span class="text-xs font-mono font-black text-emerald-700">Rs. ${m.cost_price}</span>
            <span class="text-[10px] text-slate-400 block font-normal">/ ${m.unit}</span>
          </div>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');
  },

  selectPurchaseMaterial(id) {
    const m = (this.materials || []).find(x => x.id === Number(id));
    if (!m) return;
    const hiddenInp = document.getElementById('po-material-id');
    const searchInp = document.getElementById('po-material-search');
    const dropdown = document.getElementById('po-material-dropdown');

    if (hiddenInp) hiddenInp.value = m.id;
    if (searchInp) searchInp.value = m.name;
    if (dropdown) dropdown.classList.add('hidden');

    this.onPurchaseMaterialChange(m.id);
  },

  onPurchaseMaterialKeydown(e) {
    const dropdown = document.getElementById('po-material-dropdown');
    if (!dropdown || dropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        this.openPurchaseMaterialDropdown();
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.purchaseMaterialMatches && this.purchaseMaterialMatches.length > 0) {
        const item = this.purchaseMaterialMatches[this.purchaseMaterialActiveIdx || 0] || this.purchaseMaterialMatches[0];
        if (item) this.selectPurchaseMaterial(item.id);
      }
    }
  },

  onPurchaseMaterialChange(id) {
    const m = this.materials.find(x => x.id === Number(id));
    if (m) {
      const costEl = document.getElementById('po-cost');
      if (costEl && (!costEl.value || Number(costEl.value) === 0)) {
        costEl.value = m.cost_price || 0;
      }
      this.calcPurchaseTotal();
    }
  },

  toggleBulkFields() {
    const isBulk = document.getElementById('rm-has-bulk')?.checked;
    const bulkFields = document.getElementById('rm-bulk-fields');
    const bulkStockFields = document.getElementById('rm-bulk-stock-fields');
    const singleStockField = document.getElementById('rm-single-stock-field');
    const packCostHint = document.getElementById('rm-pack-cost-hint');

    if (isBulk) {
      bulkFields?.classList.remove('hidden');
      bulkStockFields?.classList.remove('hidden');
      singleStockField?.classList.add('hidden');
      packCostHint?.classList.remove('hidden');

      const rawUnit = document.getElementById('rm-unit')?.value?.trim() || 'PCS';
      const rawPackUnit = document.getElementById('rm-pack-unit')?.value?.trim() || 'Pack';
      const packSize = Number(document.getElementById('rm-pack-size')?.value) || 500;
      const spec = this.getMaterialUnitSpecs({ unit: rawUnit, pack_unit: rawPackUnit, pack_size: packSize, has_bulk: 1 });
      const pSize = spec.packSize || 500;

      const singleVal = Number(document.getElementById('rm-stock-single')?.value) || 0;
      const packsInput = document.getElementById('rm-stock-packs');
      const looseInput = document.getElementById('rm-stock-loose');
      if (singleVal > 0 && packsInput && (!packsInput.value || Number(packsInput.value) === 0)) {
        packsInput.value = Math.floor(singleVal / pSize);
        looseInput.value = Math.round((singleVal % pSize) * 100) / 100;
      }
      this.syncBulkCalculations();
    } else {
      bulkFields?.classList.add('hidden');
      bulkStockFields?.classList.add('hidden');
      singleStockField?.classList.remove('hidden');
      packCostHint?.classList.add('hidden');

      const masterVal = Number(document.getElementById('rm-stock')?.value) || 0;
      const singleInput = document.getElementById('rm-stock-single');
      if (singleInput) {
        singleInput.value = masterVal;
      }
      this.syncSingleStock();
    }
  },

  syncBulkCalculations() {
    const rawUnit = document.getElementById('rm-unit')?.value?.trim() || 'PCS';
    const rawPackUnit = document.getElementById('rm-pack-unit')?.value?.trim() || 'Pack';
    const packSize = Number(document.getElementById('rm-pack-size')?.value) || 1;
    const isBulk = document.getElementById('rm-has-bulk')?.checked;

    const spec = this.getMaterialUnitSpecs({
      unit: rawUnit,
      pack_unit: rawPackUnit,
      pack_size: packSize,
      has_bulk: isBulk ? 1 : 0
    });

    const packs = Number(document.getElementById('rm-stock-packs')?.value) || 0;
    const loose = Number(document.getElementById('rm-stock-loose')?.value) || 0;
    const cost = Number(document.getElementById('rm-cost')?.value) || 0;

    document.querySelectorAll('.rm-unit-text').forEach(el => el.textContent = spec.mainUnit);
    document.querySelectorAll('.rm-pack-unit-text').forEach(el => el.textContent = spec.mainPlural || spec.mainUnit);
    document.querySelectorAll('.rm-content-unit-text').forEach(el => el.textContent = spec.subUnit);

    const totalBase = (packs * spec.packSize) + loose;
    const stockEl = document.getElementById('rm-stock');
    if (stockEl) stockEl.value = totalBase;

    const totalDisplay = document.getElementById('rm-bulk-total-display');
    if (totalDisplay) {
      const pUnit = packs === 1 ? spec.mainUnit : spec.mainPlural;
      totalDisplay.textContent = `${packs} ${pUnit} (${totalBase.toLocaleString()} ${spec.subUnit} total)`;
    }

    const packCostHint = document.getElementById('rm-pack-cost-hint');
    if (packCostHint) {
      if (spec.packSize > 0 && cost > 0) {
        const unitCost = Math.round((cost / spec.packSize) * 100) / 100;
        packCostHint.textContent = `(= Rs. ${unitCost.toLocaleString()} per ${spec.subUnit})`;
      } else {
        packCostHint.textContent = '';
      }
    }

    this.calcMaterialValue();
  },

  syncSingleStock() {
    const singleVal = Number(document.getElementById('rm-stock-single')?.value) || 0;
    const stockEl = document.getElementById('rm-stock');
    if (stockEl) stockEl.value = singleVal;
    this.calcMaterialValue();
  },

  calcMaterialValue() {
    const isBulk = document.getElementById('rm-has-bulk')?.checked;
    const cost = Number(document.getElementById('rm-cost')?.value) || 0;
    const valDisplay = document.getElementById('rm-value-display');
    if (!valDisplay) return;

    if (isBulk) {
      const packs = Number(document.getElementById('rm-stock-packs')?.value) || 0;
      const loose = Number(document.getElementById('rm-stock-loose')?.value) || 0;
      const packSize = Number(document.getElementById('rm-pack-size')?.value) || 1;
      const totalPacks = packs + (packSize > 0 ? (loose / packSize) : 0);
      valDisplay.value = Math.round(totalPacks * cost).toLocaleString();
    } else {
      const single = Number(document.getElementById('rm-stock-single')?.value) || Number(document.getElementById('rm-stock')?.value) || 0;
      valDisplay.value = Math.round(single * cost).toLocaleString();
    }
  },

  calcPurchaseTotal() {
    const matId = Number(document.getElementById('po-material-id')?.value) || null;
    const mat = (this.materials || []).find(m => m.id === matId);
    const qty = Number(document.getElementById('po-qty')?.value) || 0;
    const cost = Number(document.getElementById('po-cost')?.value) || 0;
    const total = qty * cost;
    const display = document.getElementById('po-total-display');
    if (display) display.textContent = `Rs. ${Math.round(total).toLocaleString()}`;
    const paidInput = document.getElementById('po-paid-amount');
    if (paidInput && (!paidInput.value || Number(paidInput.value) === 0 || paidInput.dataset.autoFilled === 'true')) {
      paidInput.value = total > 0 ? total : 0;
      paidInput.dataset.autoFilled = 'true';
    }

    const qtyHint = document.getElementById('po-qty-unit-hint');
    const costHint = document.getElementById('po-cost-unit-hint');
    if (mat) {
      const spec = this.getMaterialUnitSpecs(mat);
      if (qtyHint) {
        if (spec.isBulk) {
          const totalSub = qty * spec.packSize;
          qtyHint.innerHTML = `<span class="text-emerald-700 font-black">${spec.mainUnit}</span> <span class="text-slate-400 font-semibold">(= ${totalSub} ${spec.subUnit})</span>`;
        } else {
          qtyHint.innerHTML = `<span class="text-slate-600 font-bold">${spec.mainUnit}</span>`;
        }
      }
      if (costHint) {
        costHint.innerHTML = `<span class="text-slate-600 font-bold">per ${spec.mainUnit}</span>`;
      }
    } else {
      if (qtyHint) qtyHint.innerHTML = '';
      if (costHint) costHint.innerHTML = '';
    }

    this.calcPartialBalance();
  },

  onSupplierSelectChange(val) {
    const sel = document.getElementById('po-supplier-id');
    const badge = document.getElementById('po-supplier-bal-info');
    if (!sel || !badge) return;
    const opt = sel.options[sel.selectedIndex];
    if (!val || !opt) {
      badge.classList.add('hidden');
      badge.innerHTML = '';
      return;
    }
    const bal = Number(opt.getAttribute('data-balance')) || 0;
    badge.classList.remove('hidden');
    if (bal > 0) {
      badge.innerHTML = `<span class="text-rose-600 font-black">Current Payable to Supplier: Rs. ${Math.round(bal).toLocaleString()}</span>`;
    } else {
      badge.innerHTML = `<span class="text-emerald-700 font-bold">No outstanding balance (All Clear)</span>`;
    }
  },

  calcPartialBalance() {
    const qty = Number(document.getElementById('po-qty')?.value) || 0;
    const cost = Number(document.getElementById('po-cost')?.value) || 0;
    const total = qty * cost;
    const paidInput = document.getElementById('po-paid-amount');
    const paid = Number(paidInput?.value) || 0;
    const pending = Math.max(0, total - paid);
    const textEl = document.getElementById('po-partial-pending-text');
    if (textEl) {
      if (pending > 0) {
        textEl.className = 'text-[11px] font-bold text-rose-600 mt-1';
        textEl.textContent = `Pending Rs. ${Math.round(pending).toLocaleString()} will be added to Supplier Khata`;
      } else {
        textEl.className = 'text-[11px] font-bold text-emerald-600 mt-1';
        textEl.textContent = 'Bill fully settled (Rs. 0 pending)';
      }
    }
  },

  async quickAddSupplier() {
    const name = await new Promise(resolve => {
      app.showPrompt({
        title: 'Add New Supplier',
        message: 'Enter supplier / vendor company name:',
        placeholder: 'e.g. Dairy Milk Farms...',
        confirmText: 'Save Supplier',
        onConfirm: (val) => resolve(val ? val.trim() : null),
        onCancel: () => resolve(null)
      });
    });
    if (!name) return;

    const res = await window.api.saveSupplier({ name, amount: 0 });
    if (res && res.success) {
      app.showToast(`Supplier "${name}" added!`, 'success');
      const sel = document.getElementById('po-supplier-id');
      if (sel) {
        const opt = document.createElement('option');
        opt.value = res.id;
        opt.textContent = `${name} • Clear`;
        opt.setAttribute('data-name', name);
        opt.setAttribute('data-balance', '0');
        opt.selected = true;
        sel.appendChild(opt);
        this.onSupplierSelectChange(res.id);
      }
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to add supplier.' });
    }
  },

  openCategoriesModal() {
    const modalEl = document.getElementById('rm-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4 animate-in fade-in duration-150" onclick="if(event.target===this) RawMaterials.closeCategoriesModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200" onclick="event.stopPropagation()">
          <div class="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black shadow-2xs shrink-0">
                <i data-lucide="tags" class="w-4.5 h-4.5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 tracking-tight leading-snug">Manage Raw Material Categories</h3>
                <p class="text-[11px] font-semibold text-slate-400 leading-none mt-0.5">Stage 1 • Material classification groups</p>
              </div>
            </div>
            <button type="button" onclick="RawMaterials.closeCategoriesModal()" class="modal-close-btn" title="Close (Esc)">
              <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Add New Category Form -->
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Add New Category</label>
              <form onsubmit="RawMaterials.handleAddCategory(event)" class="flex gap-2">
                <input type="text" id="rm-new-cat-name" placeholder="e.g. Fruits, Nuts, Packaging..." required
                       class="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
                <button type="submit" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add
                </button>
              </form>
            </div>

            <!-- Categories List -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider">Existing Categories (${this.categories.length})</label>
                <button type="button" onclick="RawMaterials.toggleCategorySort()" 
                        class="text-[10px] font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Click to toggle sorting">
                  <i data-lucide="${this.categorySortOrder === 'alpha' ? 'arrow-down-a-z' : 'arrow-down-wide-narrow'}" class="w-3 h-3"></i>
                  <span>${this.categorySortOrder === 'alpha' ? 'Name (A-Z)' : 'Highest to Lowest'}</span>
                </button>
              </div>
              <div class="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 custom-scrollbar">
                ${(() => {
                  if (!this.categories || this.categories.length === 0) {
                    return `<div class="p-6 text-center text-slate-400 text-xs font-bold">No custom categories yet.</div>`;
                  }

                  const sortOrder = this.categorySortOrder || 'count_desc';
                  const catsWithCounts = this.categories.map(cat => {
                    const count = (this.materials || []).filter(m => (m.category || '').toLowerCase() === cat.name.toLowerCase()).length;
                    return { ...cat, count };
                  });

                  if (sortOrder === 'count_desc') {
                    catsWithCounts.sort((a, b) => {
                      if (b.count !== a.count) return b.count - a.count;
                      return (a.name || '').localeCompare(b.name || '');
                    });
                  } else {
                    catsWithCounts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                  }

                  return catsWithCounts.map(cat => {
                    const count = cat.count;
                    const hasEntries = count > 0;
                    return `
                      <div class="px-3.5 py-2 flex items-center justify-between hover:bg-white transition-colors">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <span class="w-2 h-2 rounded-full ${hasEntries ? 'bg-emerald-500' : 'bg-slate-300'} shrink-0"></span>
                          <span class="text-xs font-bold text-slate-800 truncate">${cat.name}</span>
                          <span class="px-2 py-0.5 rounded-md ${hasEntries ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : 'bg-slate-100 text-slate-400'} font-mono text-[10px] font-bold shrink-0">${count} ${count === 1 ? 'material' : 'materials'}</span>
                        </div>
                        ${hasEntries ? `
                          <button type="button" onclick="RawMaterials.deleteCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}', ${count})"
                                  class="w-7 h-7 rounded-lg bg-slate-100/90 text-slate-400 border border-slate-200/80 flex items-center justify-center transition-all cursor-not-allowed hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 shrink-0"
                                  title="Cannot delete: ${count} raw material ${count === 1 ? 'entry' : 'entries'} in this category">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 opacity-50"></i>
                          </button>
                        ` : `
                          <button type="button" onclick="RawMaterials.deleteCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}', 0)"
                                  class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
                                  title="Delete Category">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        `}
                      </div>
                    `;
                  }).join('');
                })()}
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <button type="button" onclick="RawMaterials.closeCategoriesModal()" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  closeCategoriesModal() {
    this.closeModal();
  },

  toggleCategorySort() {
    this.categorySortOrder = (this.categorySortOrder === 'count_desc') ? 'alpha' : 'count_desc';
    this.openCategoriesModal();
  },

  async handleAddCategory(e) {
    e.preventDefault();
    const input = document.getElementById('rm-new-cat-name');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    const res = await window.api.addRawMaterialCategory(name);
    if (res && res.error) {
      app.showAlert({ title: 'Error', message: res.error });
      return;
    }

    input.value = '';
    this.categories = await window.api.getRawMaterialCategories() || [];
    this.openCategoriesModal();
    this.renderUI();
    app.showToast(`Category "${name}" added successfully!`, 'success');
  },

  async deleteCategory(id, name, count) {
    if (count > 0) {
      app.showAlert({
        title: 'Category Cannot Be Deleted',
        message: `Category "<b>${name}</b>" cannot be deleted because it currently has <b>${count}</b> raw material ${count === 1 ? 'entry' : 'entries'}.<br><br>Please reassign or delete these raw materials first before deleting this category.`
      });
      return;
    }

    app.showConfirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete category "<b>${name}</b>"?`,
      confirmText: 'Delete Category',
      confirmColor: 'red',
      onConfirm: async () => {
        const res = await window.api.deleteRawMaterialCategory(id);
        if (res && res.error) {
          app.showAlert({ title: 'Error', message: res.error });
          return;
        }
        this.categories = await window.api.getRawMaterialCategories() || [];
        this.openCategoriesModal();
        this.renderUI();
        app.showToast(`Category "${name}" deleted.`, 'success');
      }
    });
  },

  closeModal() {
    const modalEl = document.getElementById('rm-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async handleMaterialSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('rm-id').value;
    const nameVal = (document.getElementById('rm-name')?.value || '').trim();
    if (!nameVal) {
      return app.showAlert({ title: 'Name Required', message: 'Please enter a raw material name.' });
    }

    const dup = (this.materials || []).find(m => (!id || m.id !== Number(id)) && m.name.trim().toLowerCase() === nameVal.toLowerCase());
    if (dup) {
      return app.showAlert({ title: 'Duplicate Material Name', message: `A raw material with the name "<b>${nameVal}</b>" already exists.<br><br>Duplicate raw material names are not allowed.` });
    }

    const hasBulk = document.getElementById('rm-has-bulk')?.checked ? 1 : 0;
    const packUnit = document.getElementById('rm-pack-unit')?.value?.trim() || 'Pack';
    const packSize = Number(document.getElementById('rm-pack-size')?.value) || 1;

    let stockVal = 0;
    if (hasBulk) {
      const packs = Number(document.getElementById('rm-stock-packs')?.value) || 0;
      const loose = Number(document.getElementById('rm-stock-loose')?.value) || 0;
      stockVal = (packs * packSize) + loose;
    } else {
      stockVal = Number(document.getElementById('rm-stock-single')?.value) || Number(document.getElementById('rm-stock')?.value) || 0;
    }

    const data = {
      id: id ? Number(id) : null,
      name: document.getElementById('rm-name').value.trim(),
      category: document.getElementById('rm-category').value,
      unit: document.getElementById('rm-unit').value.trim(),
      has_bulk: hasBulk,
      pack_unit: packUnit,
      pack_size: packSize,
      current_stock: stockVal,
      cost_price: Number(document.getElementById('rm-cost').value) || 0,
      min_stock_alert: Number(document.getElementById('rm-min-alert').value) || 0,
      notes: document.getElementById('rm-notes') ? document.getElementById('rm-notes').value : ''
    };

    try {
      const res = await window.api.saveRawMaterial(data);
      if (res && res.success) {
        this.closeModal();
        app.showToast('Raw material saved successfully!', 'success');
        await this.loadData();
      } else {
        app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to save raw material.' });
      }
    } catch (err) {
      console.error('Error saving raw material:', err);
      app.showAlert({ title: 'Error', message: err.message || 'Failed to save raw material.' });
    }
  },

  async handlePurchaseSubmit(e) {
    e.preventDefault();
    const matId = Number(document.getElementById('po-material-id').value);
    const qty = Number(document.getElementById('po-qty').value);
    const unitCost = Number(document.getElementById('po-cost').value);

    if (!matId || qty <= 0) {
      app.showAlert({ title: 'Invalid Input', message: 'Please select a material and enter a valid quantity.' });
      return;
    }

    const supplierSel = document.getElementById('po-supplier-id');
    const supplierId = supplierSel && supplierSel.value ? Number(supplierSel.value) : null;
    if (!supplierId) {
      app.showAlert({ 
        title: 'Supplier Required', 
        message: 'Please select a registered supplier from the list to record this purchase.' 
      });
      return;
    }
    const selectedOpt = supplierSel && supplierSel.selectedIndex >= 0 ? supplierSel.options[supplierSel.selectedIndex] : null;
    const supplierName = selectedOpt && supplierId ? (selectedOpt.getAttribute('data-name') || selectedOpt.text.split('•')[0].trim()) : '';

    const paymentMode = document.getElementById('po-payment-mode')?.value || 'Cash';
    const totalCost = qty * unitCost;
    const paidVal = document.getElementById('po-paid-amount')?.value;
    const paidAmount = paidVal !== '' && paidVal != null ? Math.max(0, Math.min(totalCost, Number(paidVal) || 0)) : totalCost;
    const pending = totalCost - paidAmount;

    if (pending > 0 && !supplierId) {
      app.showAlert({ 
        title: 'Supplier Required', 
        message: `Please select a registered supplier to record the pending balance of Rs. ${Math.round(pending).toLocaleString()} in their Khata.` 
      });
      return;
    }

    const data = {
      material_id: matId,
      qty,
      unit_cost: unitCost,
      supplier_id: supplierId,
      supplier_name: supplierName || 'Walk-in / Cash',
      payment_method: paymentMode,
      paid_amount: paidAmount,
      date: document.getElementById('po-date').value,
      notes: document.getElementById('po-notes').value
    };

    const selMat = (this.materials || []).find(m => m.id === matId);
    const matName = selMat ? selMat.name : 'Material';
    const spec = selMat ? this.getMaterialUnitSpecs(selMat) : { isBulk: false, mainUnit: (selMat ? selMat.unit : ''), subUnit: '', packSize: 1 };
    const unit = spec.mainUnit || (selMat ? selMat.unit : '');
    const subHint = spec.isBulk ? ` <span class="text-slate-500 font-semibold text-xs">(= ${qty * spec.packSize} ${spec.subUnit})</span>` : '';

    app.showConfirm({
      title: 'Confirm Quick Stock-In',
      message: `
        <div class="space-y-3 text-left mt-2 text-xs">
          <p class="text-slate-600 font-medium">Please confirm stocking in this raw material:</p>
          <div class="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1.5">
            <div class="flex justify-between">
              <span class="text-emerald-900 font-bold">Raw Material:</span>
              <span class="font-black text-emerald-950">${matName}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-emerald-900 font-bold">Quantity Received:</span>
              <span class="font-mono font-black text-emerald-800 text-sm">+${qty} ${unit}${subHint}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600 font-bold">Supplier:</span>
              <span class="font-black text-slate-900">${supplierName || 'Walk-in / Cash'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600 font-bold">Total Bill:</span>
              <span class="font-mono font-black text-slate-900">Rs. ${Math.round(totalCost).toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600 font-bold">Paid Now:</span>
              <span class="font-mono font-black text-emerald-700">Rs. ${Math.round(paidAmount).toLocaleString()}</span>
            </div>
            ${pending > 0 ? `
              <div class="flex justify-between border-t border-rose-200 pt-1 text-rose-700 font-black">
                <span>Added to Supplier Khata:</span>
                <span class="font-mono">Rs. ${Math.round(pending).toLocaleString()}</span>
              </div>
            ` : `
              <div class="text-[11px] font-bold text-emerald-700 pt-0.5">
                ✓ Fully paid. No debt added to khata.
              </div>
            `}
          </div>
        </div>
      `,
      confirmText: 'Confirm & Stock-In',
      confirmColor: 'green',
      onConfirm: async () => {
        app.showLoading?.();
        try {
          const res = await window.api.addRawMaterialPurchase(data);
          if (res && res.success) {
            this.closeModal();
            app.showToast(`Stock-In complete! New stock: ${res.newStock} ${unit}`, 'success');
            await this.loadData();
            if (window.Purchases && typeof window.Purchases.loadData === 'function') {
              window.Purchases.loadData();
            }
            if (window.Suppliers && typeof window.Suppliers.loadData === 'function') {
              window.Suppliers.loadData();
            }
          } else {
            app.showAlert({ title: 'Error', message: res.error || 'Failed to add purchase.' });
          }
        } finally {
          app.hideLoading?.();
        }
      }
    });
  },

  async deleteMaterial(id) {
    app.authorizeAction(async () => {
      const mat = (this.materials || []).find(m => m.id === id);
      const matName = mat ? mat.name : 'this raw material item';

      const ok = await new Promise(resolve => {
        app.showConfirm({
          title: 'Delete Raw Material?',
          message: `Are you sure you want to delete "<b>${matName}</b>"?`,
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (ok) {
        try {
          app.showLoading();
          const res = await window.api.deleteRawMaterial(id);
          app.hideLoading();

          if (res && res.success) {
            app.showToast(`Material "${matName}" deleted successfully`, 'success');
            await this.loadData();
          } else if (res && res.canForce) {
            // Material has linked batches or purchases - offer Force Delete confirmation
            app.showConfirm({
              title: 'Force Delete Raw Material?',
              message: `
                <div class="space-y-3 text-left">
                  <div class="flex items-start gap-2.5 text-amber-900 font-bold text-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
                    <span>${res.error}</span>
                  </div>
                  <p class="text-xs text-slate-600 font-medium leading-relaxed">
                    Would you like to <b>Force Delete</b> this material? This will permanently remove <b>${res.materialName || matName}</b> from your raw materials inventory and clean up its stock movement logs.
                  </p>
                  <p class="text-[11px] text-slate-500 italic">
                    Historical production batch reports and sales data will safely preserve their material names and cost archives.
                  </p>
                </div>
              `,
              confirmText: 'Yes, Force Delete',
              confirmColor: 'red',
              onConfirm: async () => {
                try {
                  app.showLoading();
                  const forceRes = await window.api.deleteRawMaterial(id, true);
                  app.hideLoading();
                  if (forceRes && forceRes.success) {
                    app.showToast(`Material "${res.materialName || matName}" deleted`, 'success');
                    await this.loadData();
                  } else {
                    app.showAlert({ title: 'Delete Failed', message: (forceRes && forceRes.error) || 'Failed to force delete material.' });
                  }
                } catch (fErr) {
                  app.hideLoading();
                  app.showAlert({ title: 'Delete Failed', message: fErr.message || 'Error force deleting material.' });
                }
              }
            });
            if (window.lucide) lucide.createIcons();
          } else {
            app.showAlert({ title: 'Cannot Delete', message: (res && res.error) || 'Failed to delete material.' });
          }
        } catch (err) {
          app.hideLoading();
          console.error('Error deleting raw material:', err);
          app.showAlert({ title: 'Cannot Delete', message: err.message || 'Failed to delete material.' });
        }
      }
    }, 'deleting raw material');
  },

  printReport() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Ice Cream Factory';
    const date = new Date().toLocaleDateString('en-GB');
    const totalVal = this.materials.reduce((sum, m) => sum + this.getMaterialStockValue(m), 0);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 600;">Date: ${app.formatDateTime(new Date())} | Total Raw Stock Value: Rs. ${Math.round(totalVal).toLocaleString()}</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          STAGE 1: RAW MATERIALS STOCK INVENTORY REPORT
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 8.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 600; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 600; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Material Name</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 100px; font-weight: 600; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Current Stock</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 80px; font-weight: 600; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Cost/Unit</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 95px; font-weight: 600; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.materials.map((m, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 8.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 3px 6px; font-size: 8.5px; font-weight: 500; color: #000;">${m.name}</td>
                <td style="border: 1px solid #000; padding: 3px 6px; text-align: right; font-weight: 500; font-size: 8.5px; color: #000;">${this.formatStockDisplay(m)}</td>
                <td style="border: 1px solid #000; padding: 3px 6px; text-align: right;  font-size: 8.5px; color: #000;">Rs. ${m.cost_price}</td>
                <td style="border: 1px solid #000; padding: 3px 6px; text-align: right; font-weight: 500;  font-size: 8.5px; color: #000;">Rs. ${Math.round(this.getMaterialStockValue(m)).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 5px 8px; font-size: 10px; font-weight: 700; color: #000;">
          <span>TOTAL MATERIALS: ${this.materials.length}</span>
          <span>GRAND TOTAL VALUE: Rs. ${Math.round(totalVal).toLocaleString()}</span>
        </div>

        <div class="a5-signatures" style="margin-top: 18px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 40%; text-align: center; font-size: 9px; padding-top: 4px; font-weight: 600; text-transform: uppercase;">
            Store Incharge Signature
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 40%; text-align: center; font-size: 9px; padding-top: 4px; font-weight: 600; text-transform: uppercase;">
            Factory Manager Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Raw Materials Stock Report (A5)');
  },

  async viewLog(id) {
    const log = (this.logs || []).find(l => l.id === id);
    if (!log) return;
    if (log.action === 'PURCHASE' && log.reference_id && window.Purchases) {
      return Purchases.viewReceipt(log.reference_id);
    }
    if ((log.action === 'PRODUCTION_USED' || log.action === 'PRODUCTION') && log.reference_id && window.Production) {
      return Production.printBatchSlip(log.reference_id);
    }
    this.printLogSlip(log);
  },

  printLogSlip(log) {
    if (!log) return;
    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const address = settings.address || 'Hasan Abdal';
    const phone = settings.phone || '0315-6795995';
    const mat = (this.materials || []).find(m => m.id === log.material_id);
    const unit = mat ? mat.unit : '';
    const isAdd = (log.qty_change || 0) > 0;

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box; font-size: 9.5px; line-height: 1.35;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          <p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${address}</p>
          <p style="font-size: 9px; color: #000; margin: 1px 0 0 0; font-weight: 500;">Tel: ${phone}</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          RAW MATERIAL STOCK MOVEMENT SLIP
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 8px; padding: 7px 11px; background: #fff; border: 1.5px solid #000; color: #000; line-height: 1.55;">
          <div>
            <div><strong>Log Ref #:</strong> #LOG-${log.id}</div>
            <div><strong>Action Type:</strong> ${log.action || 'Stock Adjustment'}</div>
            ${log.reference_id ? `<div><strong>Source Ref:</strong> #${log.reference_id}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div><strong>Date &amp; Time:</strong> ${app.formatDateTime(log.date, log.created_at)}</div>
            <div><strong>Material:</strong> <strong>${log.material_name}</strong></div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 8.5px; margin: 6px 0; background: #fff;">
          <thead>
            <tr style="background: #fff; border-bottom: 1.5px solid #000;">
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 600; font-size: 8.5px; color: #000;">Item / Raw Material</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-weight: 600; font-size: 8.5px; color: #000;">Quantity Change</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 600; font-size: 8.5px; color: #000;">Stock Before</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 600; font-size: 8.5px; color: #000;">Stock After</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 5px 6px; font-weight: 500; font-size: 8.5px; color: #000;">${log.material_name}</td>
              <td style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-weight: 500; font-size: 8.5px; color: #000;">${isAdd ? '+' : ''}${log.qty_change} ${unit}</td>
              <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: 8.5px; color: #000;">${log.stock_before ?? '-'} ${unit}</td>
              <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-weight: 500; font-size: 8.5px; color: #000;">${log.stock_after ?? '-'} ${unit}</td>
            </tr>
          </tbody>
        </table>

        ${log.notes ? `
          <div style="border: 1px solid #000; padding: 5px 8px; font-size: 9.5px; margin-top: 6px; background: #fff; color: #000;">
            <strong>Details / Notes:</strong> ${log.notes}
          </div>
        ` : ''}

        <div class="a5-signatures" style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 9px;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; padding-top: 4px; font-weight: 600; text-transform: uppercase; color: #000;">
            Store Keeper Signature
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; padding-top: 4px; font-weight: 600; text-transform: uppercase; color: #000;">
            Factory Manager Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Stock Movement Memo (#LOG-${log.id})`);
  },

  async editLog(id) {
    const log = (this.logs || []).find(l => l.id === id);
    if (!log) return;
    if (log.action === 'PURCHASE' && log.reference_id && window.Purchases) {
      return Purchases.openPurchaseModal(log.reference_id);
    }
    this.openEditLogModal(log);
  },

  openEditLogModal(log) {
    const container = this.getModalContainer();
    const dVal = (log.date || '').split('T')[0] || new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4 animate-in fade-in duration-150" onclick="if(event.target===this) RawMaterials.closeModal()">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all">
          <div class="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div class="flex items-center gap-2">
              <i data-lucide="edit-3" class="w-5 h-5 text-amber-400"></i>
              <h3 class="font-black text-sm text-white">Edit Stock Movement Log (#LOG-${log.id})</h3>
            </div>
            <button onclick="RawMaterials.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="RawMaterials.saveEditedLog(event, ${log.id})" class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Material</label>
              <input type="text" value="${log.material_name} (${log.qty_change > 0 ? '+' : ''}${log.qty_change})" disabled class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none">
            </div>
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Transaction Date *</label>
              <input type="date" id="edit-log-date" value="${dVal}" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500">
            </div>
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Details / Remarks</label>
              <textarea id="edit-log-notes" rows="3" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500">${log.notes || ''}</textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" onclick="RawMaterials.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: container });
  },

  async saveEditedLog(e, logId) {
    e.preventDefault();
    const date = document.getElementById('edit-log-date')?.value;
    const notes = document.getElementById('edit-log-notes')?.value;
    try {
      app.showLoading();
      const res = await window.api.updateRawMaterialLog(logId, { date, notes });
      app.hideLoading();
      if (res && res.error) {
        app.showAlert({ title: 'Error', message: res.error });
        return;
      }
      this.closeModal();
      app.showToast('Stock log updated successfully', 'success');
      await this.loadData();
    } catch (err) {
      app.hideLoading();
      app.showAlert({ title: 'Error', message: err.message });
    }
  },

  async deleteLogEntry(id) {
    const log = (this.logs || []).find(l => l.id === id);
    if (!log) return;
    if (log.action === 'PURCHASE' && log.reference_id && window.Purchases) {
      return Purchases.deletePurchase(log.reference_id);
    }
    if ((log.action === 'PRODUCTION_USED' || log.action === 'PRODUCTION') && log.reference_id && window.Production) {
      return Production.deleteBatch(log.reference_id);
    }
    app.authorizeAction(() => {
      app.showConfirm({
        title: 'Delete Stock Movement Log?',
        message: `Are you sure you want to delete this log entry for "${log.material_name}"? This action will remove the history record.`,
        confirmText: 'Yes, Delete',
        confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white',
        onConfirm: async () => {
          try {
            app.showLoading();
            const res = await window.api.deleteRawMaterialLog(id, false);
            app.hideLoading();
            if (res && res.error) {
              app.showAlert({ title: 'Error', message: res.error });
              return;
            }
            app.showToast('Stock movement log deleted successfully', 'success');
            await this.loadData();
          } catch (err) {
            app.hideLoading();
            app.showAlert({ title: 'Error', message: err.message });
          }
        }
      });
    }, 'delete stock log');
  },

  // --- CHOCOLATE PRODUCTION (PROCESSED MATERIAL) ---
  _chocActiveTab: 'produce',

  async openChocolateModal(activeTab = 'produce') {
    this._chocActiveTab = activeTab;
    const modalEl = document.getElementById('rm-modal-container');
    if (!modalEl) return;

    app.showLoading?.();
    let chocStock = { stock: 0, unit: 'Liters' };
    let batches = [];
    let logs = [];
    try {
      chocStock = (await window.api.getChocolateStock?.()) || { stock: 0, unit: 'Liters' };
      batches = (await window.api.getChocolateBatches?.()) || [];
      logs = (await window.api.getChocolateLogs?.()) || [];
    } catch (err) {
      console.error('Error fetching chocolate data:', err);
    }
    app.hideLoading?.();

    const todayStr = new Date().toISOString().split('T')[0];

    if (!this._chocPeriodType) this._chocPeriodType = 'day';
    if (!this._chocSelectedDate) this._chocSelectedDate = todayStr;
    if (!this._chocStartDate) this._chocStartDate = todayStr;
    if (!this._chocEndDate) this._chocEndDate = todayStr;
    if (this._chocSearchQuery === undefined) this._chocSearchQuery = '';
    if (!this._chocSortField) this._chocSortField = 'date';
    if (!this._chocSortOrder) this._chocSortOrder = 'desc';
    this._chocBatches = batches;
    this._chocLogs = logs;
    this._chocStock = chocStock;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[1200] overflow-y-auto animate-fade-in" onclick="if(event.target===this) RawMaterials.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh]" onclick="event.stopPropagation()">
          
          <!-- MODAL HEADER -->
          <div class="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 p-4 px-6 text-white flex items-center justify-between border-b border-amber-800/50 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-black text-xl shadow-inner">
                🍫
              </div>
              <div>
                <h3 class="text-base font-black tracking-tight text-white flex items-center gap-2">
                  Chocolate Production
                  <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30 uppercase">Processed Material</span>
                </h3>
                <p class="text-xs text-amber-200/70 font-medium">Prepare liquid chocolate in Liters from raw materials for carton packaging</p>
              </div>
            </div>
            <button type="button" onclick="RawMaterials.closeModal()" class="w-8 h-8 rounded-lg bg-amber-800/40 hover:bg-amber-800/70 text-amber-200 flex items-center justify-center transition-all cursor-pointer" title="Close (Esc)">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- PROMINENT CURRENT STOCK BANNER & SUB-TABS -->
          <div class="bg-amber-50/80 border-b border-amber-200/70 p-3 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-amber-100 border border-amber-300/80 text-amber-900">
                <i data-lucide="droplet" class="w-5 h-5 text-amber-700"></i>
              </div>
              <div>
                <p class="text-[10px] font-black uppercase text-amber-800 tracking-wider">Current Chocolate In Stock</p>
                <div class="flex items-baseline gap-1.5">
                  <span class="text-2xl font-black text-amber-950 font-mono tabular-nums">${chocStock.stock.toLocaleString()}</span>
                  <span class="text-xs font-black text-amber-800 uppercase">Liters</span>
                  <span class="text-[11px] font-medium text-amber-700/80 ml-2">(Ready for Carton Packing)</span>
                </div>
              </div>
            </div>

            <!-- Sub Navigation Tabs -->
            <div class="flex items-center gap-1 bg-amber-100/70 p-1 rounded-xl border border-amber-200 shrink-0">
              <button type="button" onclick="RawMaterials.switchChocTab('produce')" 
                      class="px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${this._chocActiveTab === 'produce' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-900 hover:bg-amber-200/60'}">
                + Prepare Chocolate
              </button>
              <button type="button" onclick="RawMaterials.switchChocTab('batches')" 
                      class="px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${this._chocActiveTab === 'batches' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-900 hover:bg-amber-200/60'}">
                Batches (${batches.length})
              </button>
              <button type="button" onclick="RawMaterials.switchChocTab('movements')" 
                      class="px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${this._chocActiveTab === 'movements' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-900 hover:bg-amber-200/60'}">
                Stock History (${logs.length})
              </button>
            </div>
          </div>

          <!-- TAB CONTENT AREA -->
          <div id="choc-tab-content-area" class="flex-1 overflow-y-auto p-6 custom-scrollbar">
            ${this._chocActiveTab === 'produce' ? this.renderChocolateProduceTab(todayStr) : ''}
            ${this._chocActiveTab === 'batches' ? this.renderChocolateBatchesTab() : ''}
            ${this._chocActiveTab === 'movements' ? this.renderChocolateMovementsTab() : ''}
          </div>

        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: modalEl });

    if (this._chocActiveTab === 'produce') {
      this.addChocolateMatRow();
    }
  },

  renderChocolateProduceTab(todayStr) {
    return `
      <form onsubmit="RawMaterials.handleChocolateSubmit(event)" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Quantity to Produce -->
          <div>
            <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">
              Quantity of Chocolate to Produce (Liters) *
            </label>
            <div class="relative">
              <input type="number" step="any" min="0.1" id="choc-liters" required placeholder="e.g. 100"
                     oninput="RawMaterials.calcChocCost()"
                     class="w-full pl-3.5 pr-14 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-amber-600 tabular-nums">
              <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-800 uppercase pointer-events-none">Liters</span>
            </div>
            <p class="text-[11px] font-medium text-slate-500 mt-1">This amount will be added to Chocolate inventory.</p>
          </div>

          <!-- Date -->
          <div>
            <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Production Date *</label>
            <input type="date" id="choc-date" required value="${todayStr}"
                   class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-600 font-mono">
          </div>
        </div>

        <!-- RAW MATERIALS CONSUMED -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                <i data-lucide="layers" class="w-4 h-4 text-amber-700"></i>
                Raw Materials Consumed (Recipe)
              </h4>
              <p class="text-[11px] text-slate-500 font-medium">Select the raw materials and quantities used to produce this chocolate</p>
            </div>
            <button type="button" id="choc-add-mat-btn" onclick="RawMaterials.addChocolateMatRow()"
                    class="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Material
            </button>
          </div>

          <div id="choc-mat-list" class="space-y-2">
            <!-- Dynamic rows inserted here -->
          </div>

          <!-- Live Cost Estimator -->
          <div class="bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs">
            <span class="font-bold text-amber-900">Total Material Cost:</span>
            <div class="flex items-baseline gap-3">
              <span id="choc-total-cost" class="font-mono font-black text-sm text-amber-950">Rs. 0</span>
              <span id="choc-per-liter" class="text-[11px] font-bold text-amber-800">(= Rs. 0 / Liter)</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Notes / Remarks</label>
          <input type="text" id="choc-notes" placeholder="Batch formula, temperature, operator, notes..."
                 class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-600">
        </div>

        <!-- Footer Buttons -->
        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="RawMaterials.closeModal()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
          <button type="submit" id="choc-submit-btn" class="px-6 py-2.5 bg-amber-800 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer">
            <i data-lucide="check" class="w-4 h-4 text-amber-300"></i> Confirm & Prepare Chocolate
          </button>
        </div>
      </form>
    `;
  },

  addChocolateMatRow() {
    const list = document.getElementById('choc-mat-list');
    if (!list) return;

    const materials = this.materials || [];
    const currentSelects = Array.from(list.querySelectorAll('.choc-mat-select'));
    const currentSelected = new Set(currentSelects.map(s => String(s.value)).filter(v => v && v !== ''));

    if (materials.length > 0 && currentSelected.size >= materials.length) {
      app.showToast('All raw materials have already been added.', 'info');
      return;
    }

    const unselected = materials.filter(m => !currentSelected.has(String(m.id)));
    let defaultVal = '';

    const rowId = 'choc-mat-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const div = document.createElement('div');
    div.id = rowId;
    div.className = 'p-2 bg-white border border-slate-200/90 rounded-xl space-y-1 shadow-2xs hover:border-amber-400 transition-all';
    div.innerHTML = `
      <div class="flex items-center gap-1.5">
        <input type="hidden" class="choc-mat-select" id="${rowId}-val" value="${defaultVal}">
        <div id="${rowId}-selector-wrap" class="flex-1 min-w-0 relative dropdown-wrap"></div>
        <div id="${rowId}-inputs-wrap" class="flex items-center gap-1 shrink-0"></div>
        <button type="button" onclick="RawMaterials.removeChocMaterialRow('${rowId}')"
                class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Remove ingredient">
          <i data-lucide="x" class="w-3.5 h-3.5 stroke-[2.5]"></i>
        </button>
      </div>
      <div id="${rowId}-hint" class="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 hidden"></div>
    `;
    list.appendChild(div);
    if (window.lucide) lucide.createIcons({ root: div });

    this.renderChocRowSelector(rowId);
    this.renderChocRowInputs(rowId);
    this.updateChocMatDropdowns();

    setTimeout(() => {
      document.getElementById(`${rowId}-search`)?.focus();
    }, 50);
  },

  renderChocRowSelector(rowId) {
    const valInput = document.getElementById(`${rowId}-val`);
    const selectorWrap = document.getElementById(`${rowId}-selector-wrap`);
    if (!valInput || !selectorWrap) return;

    const val = String(valInput.value || '').trim();

    if (val) {
      const matId = Number(val);
      const mat = (this.materials || []).find(m => m.id === matId);
      const stockTxt = mat ? this.formatStockDisplay(mat) : '';
      selectorWrap.innerHTML = `
        <div class="flex items-center justify-between px-2.5 py-1.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs font-black text-slate-900 select-none shadow-2xs min-w-0">
          <div class="flex items-center gap-1.5 min-w-0 truncate">
            <i data-lucide="box" class="w-3.5 h-3.5 text-amber-700 shrink-0"></i>
            <span class="truncate">${mat ? mat.name : 'Raw Material'}</span>
            <span class="text-[10.5px] font-bold text-amber-800 ml-0.5 shrink-0">(Stock: ${stockTxt})</span>
          </div>
          <button type="button" onclick="RawMaterials.unselectChocRowMaterial('${rowId}')"
                  class="ml-1.5 w-5 h-5 rounded-md hover:bg-amber-200/80 text-slate-500 hover:text-amber-900 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  title="Unselect material to choose another item">
            <i data-lucide="x" class="w-3.5 h-3.5 stroke-[2.5]"></i>
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons({ root: selectorWrap });
      return;
    }

    // Unselected state: Search input with dropdown
    selectorWrap.innerHTML = `
      <div class="relative w-full">
        <i data-lucide="search" class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
        <input type="text" id="${rowId}-search" autocomplete="off"
               placeholder="Search material..."
               onfocus="RawMaterials.openChocMatDropdown('${rowId}')"
               onclick="RawMaterials.openChocMatDropdown('${rowId}')"
               oninput="RawMaterials.filterChocMatDropdown('${rowId}', this.value)"
               onkeydown="RawMaterials.onChocMatSearchKeydown('${rowId}', event)"
               class="choc-mat-search w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-600 transition-all cursor-pointer">
        <button type="button" onclick="RawMaterials.toggleChocMatDropdown('${rowId}')"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer">
          <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
        </button>
        <div id="${rowId}-dropdown" class="search-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden hidden max-h-52 overflow-y-auto z-[1300] divide-y divide-slate-100">
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: selectorWrap });
  },

  selectChocRowMaterial(rowId, itemId) {
    const valInput = document.getElementById(`${rowId}-val`);
    if (!valInput) return;

    if (itemId) {
      const otherVals = Array.from(document.querySelectorAll('#choc-mat-list input[id$="-val"]'))
        .filter(inp => inp.id !== `${rowId}-val`)
        .map(inp => inp.value);
      if (otherVals.includes(String(itemId))) {
        app.showAlert({ title: 'Duplicate Item', message: 'This raw material is already added to the chocolate recipe.' });
        return;
      }
    }

    valInput.value = itemId;

    const dropdown = document.getElementById(`${rowId}-dropdown`);
    if (dropdown) dropdown.classList.add('hidden');

    this.renderChocRowSelector(rowId);
    this.renderChocRowInputs(rowId);
    this.updateChocMatDropdowns();
    this.calcChocCost();
  },

  unselectChocRowMaterial(rowId) {
    const valInput = document.getElementById(`${rowId}-val`);
    if (!valInput) return;
    valInput.value = '';

    this.renderChocRowSelector(rowId);
    this.renderChocRowInputs(rowId);
    this.updateChocMatDropdowns();
    this.calcChocCost();

    setTimeout(() => {
      this.openChocMatDropdown(rowId);
      document.getElementById(`${rowId}-search`)?.focus();
    }, 40);
  },

  toggleChocMatDropdown(rowId) {
    const dropdown = document.getElementById(`${rowId}-dropdown`);
    if (!dropdown) return;
    if (dropdown.classList.contains('hidden')) {
      this.openChocMatDropdown(rowId);
      document.getElementById(`${rowId}-search`)?.focus();
    } else {
      dropdown.classList.add('hidden');
    }
  },

  openChocMatDropdown(rowId) {
    const dropdown = document.getElementById(`${rowId}-dropdown`);
    if (!dropdown) return;
    document.querySelectorAll('.search-dropdown').forEach(d => {
      if (d !== dropdown) d.classList.add('hidden');
    });
    const searchVal = document.getElementById(`${rowId}-search`)?.value || '';
    this.filterChocMatDropdown(rowId, searchVal);
  },

  onChocMatSearchKeydown(rowId, e) {
    if (e.key === 'Escape') {
      const dd = document.getElementById(`${rowId}-dropdown`);
      if (dd) dd.classList.add('hidden');
      e.preventDefault();
    }
  },

  filterChocMatDropdown(rowId, query = '') {
    const dropdown = document.getElementById(`${rowId}-dropdown`);
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();

    const allSelects = Array.from(document.querySelectorAll('.choc-mat-select'));
    const selectedInOtherRows = new Set(
      allSelects
        .filter(s => s.id !== `${rowId}-val`)
        .map(s => String(s.value))
        .filter(Boolean)
    );

    const items = (this.materials || []).map(m => ({
      id: String(m.id),
      name: m.name,
      category: m.category || 'Raw Material',
      stockTxt: this.formatStockDisplay(m)
    }));

    let matches = items;
    if (q) {
      matches = items.filter(it => 
        it.name.toLowerCase().includes(q) || 
        it.category.toLowerCase().includes(q)
      );
    }

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="p-3 text-center text-xs font-bold text-slate-400">
          No materials match "${query}"
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = matches.map(it => {
      const isAlreadyAdded = selectedInOtherRows.has(it.id);
      if (isAlreadyAdded) {
        return `
          <div class="px-3 py-2 bg-slate-50 opacity-50 flex items-center justify-between text-xs font-bold text-slate-400 cursor-not-allowed select-none">
            <div class="flex items-center gap-1.5 min-w-0 truncate">
              <span>📦</span>
              <span class="truncate">${it.name}</span>
            </div>
            <span class="text-[10px] font-semibold text-slate-400 shrink-0">Already added</span>
          </div>
        `;
      }

      return `
        <div onclick="RawMaterials.selectChocRowMaterial('${rowId}', '${it.id}')"
             class="px-3 py-2 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-100 last:border-b-0">
          <div class="min-w-0 truncate">
            <div class="text-xs font-black text-slate-900">${it.name}</div>
            <div class="text-[10px] text-slate-500 font-bold mt-0.5">${it.category} • Stock: <span class="font-black text-slate-700">${it.stockTxt}</span></div>
          </div>
          <span class="text-[10px] font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded shrink-0">Select</span>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ root: dropdown });
  },

  removeChocMaterialRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    this.updateChocMatDropdowns();
    this.calcChocCost();
  },

  updateChocMatDropdowns() {
    const list = document.getElementById('choc-mat-list');
    if (!list) return;

    const selects = Array.from(list.querySelectorAll('.choc-mat-select'));
    const selectedIds = new Set(selects.map(s => String(s.value)).filter(Boolean));

    const addBtn = document.getElementById('choc-add-mat-btn');
    if (addBtn) {
      const allSelected = selectedIds.size >= (this.materials || []).length && (this.materials || []).length > 0;
      addBtn.disabled = allSelected;
      if (allSelected) {
        addBtn.classList.add('opacity-40', 'cursor-not-allowed');
        addBtn.title = 'All raw materials have already been added';
      } else {
        addBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        addBtn.title = 'Add another raw material';
      }
    }
  },

  renderChocRowInputs(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const select = row.querySelector('.choc-mat-select');
    const wrap = document.getElementById(`${rowId}-inputs-wrap`);
    const hint = document.getElementById(`${rowId}-hint`);
    if (!wrap) return;

    const matId = Number(select?.value);
    const mat = (this.materials || []).find(m => m.id === matId);

    if (!mat) {
      wrap.innerHTML = `<span class="text-[10px] text-slate-400 italic">Select material</span>`;
      if (hint) { hint.classList.add('hidden'); hint.textContent = ''; }
      return;
    }

    const spec = this.getMaterialUnitSpecs(mat);
    const isBulk = spec.isBulk;
    const packUnit = spec.packageUnit;
    const baseUnit = spec.contentUnit;

    if (isBulk) {
      wrap.innerHTML = `
        <div class="relative w-28">
          <input type="number" step="any" min="0" placeholder="0"
                 oninput="RawMaterials.syncChocRowStock('${rowId}')"
                 class="choc-mat-packs w-full pr-14 pl-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-none tabular-nums focus:bg-white focus:border-amber-600 text-right"
                 title="Packs consumed">
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase pointer-events-none">${packUnit}</span>
        </div>

        <span class="text-[11px] font-bold text-slate-400 shrink-0">+</span>

        <div class="relative w-24">
          <input type="number" step="any" min="0" placeholder="0"
                 oninput="RawMaterials.syncChocRowStock('${rowId}')"
                 class="choc-mat-loose w-full pr-10 pl-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-none tabular-nums focus:bg-white focus:border-amber-600 text-right"
                 title="Loose ${baseUnit} consumed">
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase pointer-events-none">${baseUnit}</span>
        </div>

        <input type="hidden" class="choc-mat-qty" value="0">
      `;
    } else {
      wrap.innerHTML = `
        <div class="relative w-28">
          <input type="number" step="any" min="0" placeholder="0"
                 oninput="RawMaterials.syncChocRowStock('${rowId}')"
                 class="choc-mat-qty w-full pr-14 pl-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-none tabular-nums focus:bg-white focus:border-amber-600 text-right"
                 title="Quantity consumed (${baseUnit})">
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase pointer-events-none">${baseUnit}</span>
        </div>
      `;
    }

    this.syncChocRowStock(rowId);
  },

  syncChocRowStock(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const select = row.querySelector('.choc-mat-select');
    const matId = Number(select?.value);
    const mat = (this.materials || []).find(m => m.id === matId);
    const hint = document.getElementById(`${rowId}-hint`);
    const qtyInput = row.querySelector('.choc-mat-qty');

    if (!mat) {
      if (qtyInput) qtyInput.value = 0;
      if (hint) { hint.classList.add('hidden'); hint.textContent = ''; }
      this.calcChocCost();
      return;
    }

    const spec = this.getMaterialUnitSpecs(mat);
    const packSize = spec.packSize;
    let totalQty = 0;

    if (spec.isBulk) {
      const packsInput = row.querySelector('.choc-mat-packs');
      const looseInput = row.querySelector('.choc-mat-loose');
      const packs = Number(packsInput?.value) || 0;
      const loose = Number(looseInput?.value) || 0;
      totalQty = (packs * packSize) + loose;
      if (qtyInput) qtyInput.value = totalQty;
    } else {
      totalQty = Number(qtyInput?.value) || 0;
    }

    const avail = Number(mat.current_stock) || 0;
    if (hint) {
      if (totalQty > 0) {
        if (totalQty > avail) {
          hint.className = 'text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-0.5 block';
          hint.innerHTML = `⚠️ Insufficient Stock! Only ${this.formatStockDisplay(mat)} available (need ${totalQty.toLocaleString()} ${spec.subUnit})`;
        } else {
          hint.className = 'text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 block';
          hint.innerHTML = `✓ Consumes ${totalQty.toLocaleString()} ${spec.subUnit} (Stock left: ${(avail - totalQty).toLocaleString()} ${spec.subUnit})`;
        }
      } else {
        hint.classList.add('hidden');
        hint.textContent = '';
      }
    }

    this.calcChocCost();
  },

  calcChocCost() {
    const rows = document.querySelectorAll('#choc-mat-list > div');
    let totalCost = 0;

    rows.forEach(r => {
      const matId = Number(r.querySelector('.choc-mat-select')?.value);
      const qty = Number(r.querySelector('.choc-mat-qty')?.value) || 0;
      const mat = (this.materials || []).find(m => m.id === matId);
      if (mat && qty > 0) {
        const spec = this.getMaterialUnitSpecs(mat);
        const unitCost = spec.isBulk ? ((Number(mat.cost_price) || 0) / spec.packSize) : (Number(mat.cost_price) || 0);
        totalCost += (qty * unitCost);
      }
    });

    const liters = Number(document.getElementById('choc-liters')?.value) || 0;
    const perLiter = liters > 0 ? (totalCost / liters) : 0;

    const totalEl = document.getElementById('choc-total-cost');
    const perLiterEl = document.getElementById('choc-per-liter');
    if (totalEl) totalEl.textContent = `Rs. ${Math.round(totalCost).toLocaleString()}`;
    if (perLiterEl) perLiterEl.textContent = `(= Rs. ${Math.round(perLiter).toLocaleString()} / Liter)`;
  },

  async handleChocolateSubmit(e) {
    e.preventDefault();
    const liters = Number(document.getElementById('choc-liters')?.value) || 0;
    if (liters <= 0) {
      return app.showAlert({ title: 'Invalid Quantity', message: 'Please enter a valid quantity of chocolate in Liters.' });
    }

    const date = document.getElementById('choc-date')?.value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('choc-notes')?.value || '';

    const rows = document.querySelectorAll('#choc-mat-list > div');
    const materials = [];
    const seenMatIds = new Set();
    for (const r of rows) {
      const matId = Number(r.querySelector('.choc-mat-select')?.value);
      const qty = Number(r.querySelector('.choc-mat-qty')?.value) || 0;
      if (matId && qty > 0) {
        if (seenMatIds.has(matId)) {
          return app.showAlert({
            title: 'Duplicate Material',
            message: 'Duplicate raw materials cannot be added to the recipe. Please remove the duplicate entry.'
          });
        }
        seenMatIds.add(matId);
        const mat = (this.materials || []).find(m => m.id === matId);
        if (mat && (mat.current_stock || 0) < qty) {
          return app.showAlert({
            title: 'Insufficient Stock',
            message: `Not enough stock for <b>${mat.name}</b>.<br>Available: ${this.formatStockDisplay(mat)}<br>Required: ${this.formatUsageQuantity(qty, mat)}`
          });
        }
        materials.push({ material_id: matId, qty_used: qty });
      }
    }

    if (materials.length === 0) {
      return app.showAlert({ title: 'Materials Required', message: 'Please select at least one raw material and enter the quantity consumed to prepare chocolate.' });
    }

    const matSummaryHtml = materials.map(m => {
      const mat = (this.materials || []).find(x => x.id === m.material_id);
      return `<li class="font-bold text-slate-800">${mat ? mat.name : 'Material'}: <span class="font-mono text-amber-900">${this.formatUsageQuantity(m.qty_used, mat)}</span></li>`;
    }).join('');

    app.showConfirm({
      title: 'Confirm Chocolate Production',
      message: `
        <div class="space-y-3 text-left mt-2 text-xs">
          <p class="text-slate-600 font-medium">Please confirm preparing this chocolate batch:</p>
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
            <div class="flex justify-between">
              <span class="text-amber-900 font-bold">Liters to Produce:</span>
              <span class="font-mono font-black text-amber-950 text-base">${liters} Liters</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600 font-bold">Date:</span>
              <span class="font-mono font-bold text-slate-800">${date}</span>
            </div>
            <div class="border-t border-amber-200 pt-1.5 mt-1.5">
              <span class="text-[11px] font-black uppercase text-amber-900 tracking-wider">Raw Materials To Deduct:</span>
              <ul class="list-disc list-inside mt-1 space-y-0.5">
                ${matSummaryHtml}
              </ul>
            </div>
          </div>
        </div>
      `,
      confirmText: 'Confirm & Prepare',
      confirmColor: 'green',
      onConfirm: async () => {
        app.showLoading?.();
        try {
          const res = await window.api.createChocolateBatch({
            liters_produced: liters,
            date,
            notes,
            materials
          });
          app.hideLoading?.();

          if (res && res.success) {
            app.showToast(`Batch ${res.batchNumber} created! Chocolate stock is now ${res.newStock} Liters.`, 'success');
            await this.loadData();
            this.openChocolateModal('batches');
          } else {
            app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to create chocolate batch.' });
          }
        } catch (err) {
          app.hideLoading?.();
          console.error('Error creating chocolate batch:', err);
          app.showAlert({ title: 'Error', message: err.message || 'Failed to create chocolate batch.' });
        }
      }
    });
  },

  switchChocTab(tab) {
    this._chocActiveTab = tab;
    const content = document.getElementById('choc-tab-content-area');
    if (!content) {
      this.openChocolateModal(tab);
      return;
    }

    const btns = document.querySelectorAll('#rm-modal-container button[onclick^="RawMaterials.switchChocTab"]');
    btns.forEach(btn => {
      const isCurrent = btn.getAttribute('onclick').includes(`'${tab}'`);
      if (isCurrent) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer bg-amber-900 text-white shadow-xs';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-amber-900 hover:bg-amber-200/60';
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    if (tab === 'produce') {
      content.innerHTML = this.renderChocolateProduceTab(todayStr);
      this.addChocolateMatRow();
    } else if (tab === 'batches') {
      content.innerHTML = this.renderChocolateBatchesTab();
    } else if (tab === 'movements') {
      content.innerHTML = this.renderChocolateMovementsTab();
    }
    if (window.lucide) lucide.createIcons({ root: content });
  },

  setChocPeriod(type) {
    this._chocPeriodType = type;
    this.refreshChocModalContent();
  },

  onChocDateChange(val) {
    this._chocSelectedDate = val;
    this.refreshChocModalContent();
  },

  onChocCustomDateChange(type, val) {
    if (type === 'start') this._chocStartDate = val;
    if (type === 'end') this._chocEndDate = val;
    this.refreshChocModalContent();
  },

  resetChocToCurrent() {
    const today = new Date().toISOString().slice(0, 10);
    this._chocPeriodType = 'day';
    this._chocSelectedDate = today;
    this._chocStartDate = today;
    this._chocEndDate = today;
    this._chocSearchQuery = '';
    this.refreshChocModalContent();
  },

  onChocSearch(val) {
    this._chocSearchQuery = (val || '').trim();
    this.refreshChocModalContent();
  },

  sortChocBatches(field) {
    if (this._chocSortField === field) {
      this._chocSortOrder = this._chocSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this._chocSortField = field;
      this._chocSortOrder = 'desc';
    }
    this.refreshChocModalContent();
  },

  refreshChocModalContent() {
    const content = document.getElementById('choc-tab-content-area');
    if (!content) return;
    if (this._chocActiveTab === 'batches') {
      content.innerHTML = this.renderChocolateBatchesTab();
    } else if (this._chocActiveTab === 'movements') {
      content.innerHTML = this.renderChocolateMovementsTab();
    }
    if (window.lucide) lucide.createIcons({ root: content });
  },

  renderChocDateFilterToolbar(type = 'batches') {
    const today = new Date().toISOString().slice(0, 10);
    const isFilteredFromToday = this._chocPeriodType !== 'day' || this._chocSelectedDate !== today || Boolean(this._chocSearchQuery);

    return `
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60 shrink-0">
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Period Pills -->
          <div class="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button type="button" onclick="RawMaterials.setChocPeriod('day')"
                    class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this._chocPeriodType === 'day' ? 'font-black bg-amber-900 text-white shadow-2xs' : 'font-bold text-slate-600 hover:text-slate-900'}">
              Daily
            </button>
            <button type="button" onclick="RawMaterials.setChocPeriod('month')"
                    class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this._chocPeriodType === 'month' ? 'font-black bg-amber-900 text-white shadow-2xs' : 'font-bold text-slate-600 hover:text-slate-900'}">
              Monthly
            </button>
            <button type="button" onclick="RawMaterials.setChocPeriod('year')"
                    class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this._chocPeriodType === 'year' ? 'font-black bg-amber-900 text-white shadow-2xs' : 'font-bold text-slate-600 hover:text-slate-900'}">
              Annual
            </button>
            <button type="button" onclick="RawMaterials.setChocPeriod('custom')"
                    class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this._chocPeriodType === 'custom' ? 'font-black bg-amber-900 text-white shadow-2xs' : 'font-bold text-slate-600 hover:text-slate-900'}">
              Custom Range
            </button>
            <button type="button" onclick="RawMaterials.setChocPeriod('all')"
                    class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this._chocPeriodType === 'all' ? 'font-black bg-amber-900 text-white shadow-2xs' : 'font-bold text-slate-600 hover:text-slate-900'}">
              All
            </button>
          </div>

          <!-- Date Picker for Day/Month/Year/Custom -->
          ${this._chocPeriodType !== 'all' ? `
            <div class="shrink-0">
              ${this._chocPeriodType === 'custom' ? `
                <div class="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                  <span class="text-[10px] font-black uppercase text-slate-400">From</span>
                  <input type="date" value="${this._chocStartDate}"
                         onchange="RawMaterials.onChocCustomDateChange('start', this.value)"
                         class="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer">
                  <span class="text-[10px] font-black uppercase text-slate-400">To</span>
                  <input type="date" value="${this._chocEndDate}"
                         onchange="RawMaterials.onChocCustomDateChange('end', this.value)"
                         class="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer">
                </div>
              ` : `
                <div class="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                  <input type="${this._chocPeriodType === 'month' ? 'month' : this._chocPeriodType === 'year' ? 'number' : 'date'}"
                         value="${this._chocPeriodType === 'year' ? (this._chocSelectedDate || today).slice(0, 4) : this._chocPeriodType === 'month' ? (this._chocSelectedDate || today).slice(0, 7) : (this._chocSelectedDate || today)}"
                         onchange="RawMaterials.onChocDateChange(this.value)"
                         ${this._chocPeriodType === 'year' ? 'min="2020" max="2099" step="1"' : ''}
                         class="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer">
                </div>
              `}
            </div>
          ` : ''}

          <!-- Reset Filter Button -->
          ${isFilteredFromToday ? `
            <button type="button" onclick="RawMaterials.resetChocToCurrent()"
                    class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                    title="Reset to Today">
              <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
            </button>
          ` : ''}
        </div>

        <!-- Search Input -->
        <div class="relative w-full sm:w-56">
          <i data-lucide="search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" value="${this._chocSearchQuery || ''}"
                 oninput="RawMaterials.onChocSearch(this.value)"
                 placeholder="Search ${type === 'batches' ? 'batches' : 'movements'}..."
                 class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-600 shadow-2xs transition-all">
        </div>
      </div>
    `;
  },

  renderChocolateBatchesTab() {
    let list = [...(this._chocBatches || [])];
    const today = new Date().toISOString().slice(0, 10);

    if (this._chocPeriodType === 'day' && this._chocSelectedDate) {
      list = list.filter(b => (b.date || '').slice(0, 10) === this._chocSelectedDate);
    } else if (this._chocPeriodType === 'month' && this._chocSelectedDate) {
      const ym = this._chocSelectedDate.slice(0, 7);
      list = list.filter(b => (b.date || '').startsWith(ym));
    } else if (this._chocPeriodType === 'year' && this._chocSelectedDate) {
      const y = this._chocSelectedDate.slice(0, 4);
      list = list.filter(b => (b.date || '').startsWith(y));
    } else if (this._chocPeriodType === 'custom') {
      if (this._chocStartDate) list = list.filter(b => (b.date || '').slice(0, 10) >= this._chocStartDate);
      if (this._chocEndDate) list = list.filter(b => (b.date || '').slice(0, 10) <= this._chocEndDate);
    }

    if (this._chocSearchQuery) {
      const q = this._chocSearchQuery.toLowerCase();
      list = list.filter(b =>
        (b.batch_number || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q) ||
        (b.materials_summary || '').toLowerCase().includes(q)
      );
    }

    const sf = this._chocSortField || 'date';
    const so = this._chocSortOrder === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sf === 'date') {
        const dA = new Date(a.date || a.created_at || 0).getTime();
        const dB = new Date(b.date || b.created_at || 0).getTime();
        return so * (dA - dB);
      }
      if (sf === 'liters') return so * ((Number(a.liters_produced) || 0) - (Number(b.liters_produced) || 0));
      if (sf === 'cost') return so * ((Number(a.total_cost) || 0) - (Number(b.total_cost) || 0));
      if (sf === 'cost_per_liter') return so * ((Number(a.cost_per_liter) || 0) - (Number(b.cost_per_liter) || 0));
      return so * String(a[sf] || '').localeCompare(String(b[sf] || ''));
    });

    const toolbar = this.renderChocDateFilterToolbar('batches');

    if (list.length === 0) {
      return `
        ${toolbar}
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
          <div class="w-12 h-12 mb-3 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center text-2xl">🍫</div>
          <h4 class="text-sm font-black text-slate-700">No Chocolate Batches Found</h4>
          <p class="text-xs text-slate-400 mt-1">No batches match the selected date period or search query.</p>
        </div>
      `;
    }

    return `
      ${toolbar}
      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-amber-950/5 border-b border-slate-200 text-[10px] font-black uppercase text-amber-950 tracking-wider select-none">
              <th class="py-2.5 px-3 border-r border-slate-200 text-center w-10">#</th>
              <th onclick="RawMaterials.sortChocBatches('date')" class="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-amber-100/60 transition-colors">
                <div class="flex items-center gap-1">
                  <span>Date</span>
                  <i data-lucide="arrow-up-down" class="w-3 h-3 text-amber-800/60"></i>
                </div>
              </th>
              <th onclick="RawMaterials.sortChocBatches('batch_number')" class="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-amber-100/60 transition-colors">
                <div class="flex items-center gap-1">
                  <span>Batch #</span>
                  <i data-lucide="arrow-up-down" class="w-3 h-3 text-amber-800/60"></i>
                </div>
              </th>
              <th onclick="RawMaterials.sortChocBatches('liters')" class="py-2.5 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-amber-100/60 transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Liters</span>
                  <i data-lucide="arrow-up-down" class="w-3 h-3 text-amber-800/60"></i>
                </div>
              </th>
              <th class="py-2.5 px-3 border-r border-slate-200">Raw Materials Consumed</th>
              <th onclick="RawMaterials.sortChocBatches('cost')" class="py-2.5 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-amber-100/60 transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Total Cost</span>
                  <i data-lucide="arrow-up-down" class="w-3 h-3 text-amber-800/60"></i>
                </div>
              </th>
              <th onclick="RawMaterials.sortChocBatches('cost_per_liter')" class="py-2.5 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-amber-100/60 transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Cost / Liter</span>
                  <i data-lucide="arrow-up-down" class="w-3 h-3 text-amber-800/60"></i>
                </div>
              </th>
              <th class="py-2.5 px-3 border-r border-slate-200">Notes</th>
              <th class="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${list.map((b, idx) => `
              <tr class="hover:bg-amber-50/40 transition-colors">
                <td class="py-2.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200">${idx + 1}</td>
                <td class="py-2.5 px-3 font-mono text-xs text-slate-800 whitespace-nowrap border-r border-slate-200 font-bold">
                  ${app.formatDateTime ? app.formatDateTime(b.date, b.created_at) : b.date}
                </td>
                <td class="py-2.5 px-3 font-black text-amber-950 font-mono text-xs border-r border-slate-200">${b.batch_number}</td>
                <td class="py-2.5 px-3 text-right font-black font-mono text-emerald-800 text-xs border-r border-slate-200 tabular-nums">
                  +${Number(b.liters_produced).toLocaleString()} Liters
                </td>
                <td class="py-2.5 px-3 text-xs text-slate-700 border-r border-slate-200">
                  ${b.materials_summary || '—'}
                </td>
                <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200 tabular-nums">
                  Rs. ${Math.round(b.total_cost || 0).toLocaleString()}
                </td>
                <td class="py-2.5 px-3 text-right font-mono font-bold text-amber-900 border-r border-slate-200 tabular-nums">
                  Rs. ${Math.round(b.cost_per_liter || 0).toLocaleString()}
                </td>
                <td class="py-2.5 px-3 text-[11px] text-slate-500 border-r border-slate-200">${b.notes || '—'}</td>
                <td class="py-2.5 px-3 text-center whitespace-nowrap">
                  <div class="flex items-center justify-center gap-1.5">
                    <button type="button" onclick="RawMaterials.printChocolateBatchSlip(${b.id})"
                            class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                            title="View &amp; Print Batch Slip (A5)">
                      <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                    </button>
                    <button type="button" onclick="RawMaterials.deleteChocolateBatch(${b.id}, '${b.batch_number}')"
                            class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer" title="Delete &amp; Revert Batch">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderChocolateMovementsTab() {
    let list = [...(this._chocLogs || [])];

    if (this._chocPeriodType === 'day' && this._chocSelectedDate) {
      list = list.filter(l => (l.date || '').slice(0, 10) === this._chocSelectedDate);
    } else if (this._chocPeriodType === 'month' && this._chocSelectedDate) {
      const ym = this._chocSelectedDate.slice(0, 7);
      list = list.filter(l => (l.date || '').startsWith(ym));
    } else if (this._chocPeriodType === 'year' && this._chocSelectedDate) {
      const y = this._chocSelectedDate.slice(0, 4);
      list = list.filter(l => (l.date || '').startsWith(y));
    } else if (this._chocPeriodType === 'custom') {
      if (this._chocStartDate) list = list.filter(l => (l.date || '').slice(0, 10) >= this._chocStartDate);
      if (this._chocEndDate) list = list.filter(l => (l.date || '').slice(0, 10) <= this._chocEndDate);
    }

    if (this._chocSearchQuery) {
      const q = this._chocSearchQuery.toLowerCase();
      list = list.filter(l =>
        (l.action || '').toLowerCase().includes(q) ||
        (l.reference_no || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }

    const toolbar = this.renderChocDateFilterToolbar('movements');

    if (list.length === 0) {
      return `
        ${toolbar}
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
          <i data-lucide="history" class="w-10 h-10 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-700">No Chocolate Movements Found</h4>
          <p class="text-xs text-slate-400 mt-1">No stock changes match the selected period or search query.</p>
        </div>
      `;
    }

    return `
      ${toolbar}
      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600 tracking-wider">
              <th class="py-2.5 px-3 border-r border-slate-200 text-center w-10">#</th>
              <th class="py-2.5 px-3 border-r border-slate-200">Date</th>
              <th class="py-2.5 px-3 border-r border-slate-200">Action</th>
              <th class="py-2.5 px-3 text-right border-r border-slate-200">Quantity (Liters)</th>
              <th class="py-2.5 px-3 text-right border-r border-slate-200">Before</th>
              <th class="py-2.5 px-3 text-right border-r border-slate-200">Current</th>
              <th class="py-2.5 px-3 border-r border-slate-200">Reference #</th>
              <th class="py-2.5 px-3">Details / Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${list.map((l, idx) => {
              const isAdd = (l.liters_change || 0) > 0;
              const actionBadge = l.action === 'PRODUCTION'
                ? `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px]">PRODUCTION</span>`
                : (l.action === 'CARTON_PACKED'
                    ? `<span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black text-[10px]">PACKED IN CARTON</span>`
                    : `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-black text-[10px]">${l.action}</span>`
                  );
              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-2 px-3 text-center text-slate-400 font-bold border-r border-slate-200">${idx + 1}</td>
                  <td class="py-2 px-3 font-mono text-xs text-slate-800 font-bold whitespace-nowrap border-r border-slate-200">
                    ${app.formatDateTime ? app.formatDateTime(l.date, l.created_at) : l.date}
                  </td>
                  <td class="py-2 px-3 border-r border-slate-200">${actionBadge}</td>
                  <td class="py-2 px-3 text-right font-black font-mono text-xs border-r border-slate-200 tabular-nums ${isAdd ? 'text-emerald-700' : 'text-rose-600'}">
                    ${isAdd ? '+' : ''}${Number(l.liters_change).toLocaleString()} L
                  </td>
                  <td class="py-2 px-3 text-right font-mono text-slate-500 border-r border-slate-200 tabular-nums">${l.stock_before} L</td>
                  <td class="py-2 px-3 text-right font-mono font-black text-slate-900 border-r border-slate-200 tabular-nums">${l.stock_after} L</td>
                  <td class="py-2 px-3 font-mono text-[11px] text-amber-900 font-black border-r border-slate-200">${l.reference_no || '—'}</td>
                  <td class="py-2 px-3 text-slate-500 text-[11px]">${l.notes || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async printChocolateBatchSlip(batchId) {
    try {
      app.showLoading?.();
      const batches = (await window.api.getChocolateBatches?.()) || [];
      app.hideLoading?.();
      const batch = batches.find(b => b.id === batchId);
      if (!batch) {
        return app.showAlert({ title: 'Error', message: 'Chocolate batch record not found.' });
      }

      const settings = app.settings || {};
      const company = settings.company_name || 'Delicious Superstar Foods';
      const address = settings.address || 'Hasan Abdal';
      const phone = settings.phone || '0315-6795995';

      let materialsList = [];
      try {
        materialsList = typeof batch.materials_json === 'string' ? JSON.parse(batch.materials_json) : (batch.materials_json || []);
      } catch (e) {
        materialsList = [];
      }

      const html = `
        <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box; font-size: 9.5px; line-height: 1.35;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
            <h1 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
            <p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${address}</p>
            <p style="font-size: 9px; color: #000; margin: 1px 0 0 0; font-weight: 500;">Tel: ${phone}</p>
          </div>

          <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
            CHOCOLATE PRODUCTION BATCH SLIP
          </div>

          <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 8px; padding: 7px 11px; background: #fff; border: 1.5px solid #000; color: #000; line-height: 1.55;">
            <div>
              <div><strong>Batch #:</strong> ${batch.batch_number}</div>
              <div><strong>Item Produced:</strong> <strong>Prepared Chocolate</strong></div>
              <div><strong>Liters Produced:</strong> <strong>+${Number(batch.liters_produced).toLocaleString()} Liters</strong></div>
            </div>
            <div style="text-align: right;">
              <div><strong>Production Date:</strong> ${batch.date}</div>
              <div><strong>Total Material Cost:</strong> <strong>Rs. ${Math.round(batch.total_cost || 0).toLocaleString()}</strong></div>
              <div><strong>Cost / Liter:</strong> <strong>Rs. ${Math.round(batch.cost_per_liter || 0).toLocaleString()} / Liter</strong></div>
            </div>
          </div>

          <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 8.5px; margin: 6px 0; background: #fff;">
            <thead>
              <tr style="background: #fff; border-bottom: 1.5px solid #000;">
                <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 26px; font-weight: 600; font-size: 8.5px; color: #000;">#</th>
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 600; font-size: 8.5px; color: #000;">Recipe Raw Material</th>
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 110px; font-weight: 600; font-size: 8.5px; color: #000;">Qty Consumed</th>
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 95px; font-weight: 600; font-size: 8.5px; color: #000;">Total Line Cost</th>
              </tr>
            </thead>
            <tbody>
              ${materialsList.length > 0 ? materialsList.map((m, idx) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 8.5px; color: #000;">${idx + 1}</td>
                  <td style="border: 1px solid #000; padding: 4px 6px; font-weight: 600; font-size: 8.5px; color: #000;">${m.material_name}</td>
                  <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 700; font-size: 8.5px; color: #000;">${m.display_qty || this.formatUsageQuantity(m.qty_used, (this.materials || []).find(x => x.id === m.material_id)) || `${m.qty_used} ${m.unit || ''}`}</td>
                  <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 8.5px; color: #000;">Rs. ${Math.round(m.line_cost || 0).toLocaleString()}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: center; color: #000;">
                    ${batch.materials_summary || 'Standard ingredients consumed.'}
                  </td>
                </tr>
              `}
            </tbody>
            <tfoot>
              <tr style="background: #fff; font-weight: 700; border-top: 1.5px solid #000; color: #000;">
                <td colspan="2" style="border: 1px solid #000; padding: 4px 6px; text-align: right; text-transform: uppercase; font-size: 8.5px;">Total Recipe Material Cost:</td>
                <td colspan="2" style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 8.5px;">Rs. ${Math.round(batch.total_cost || 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          ${batch.notes ? `
            <div style="border: 1px solid #000; padding: 4px 8px; font-size: 9px; margin-top: 4px; background: #fff; color: #000;">
              <strong>Remarks:</strong> ${batch.notes}
            </div>
          ` : ''}

          <div class="a5-signatures" style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 9px;">
            <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; padding-top: 4px; font-weight: 600; text-transform: uppercase; color: #000;">
              Chocolate Preparation Incharge
            </div>
            <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; padding-top: 4px; font-weight: 600; text-transform: uppercase; color: #000;">
              Factory / Store Incharge
            </div>
          </div>
        </div>
      `;

      app.showA5Preview(html, `Chocolate Production Voucher (${batch.batch_number})`);
    } catch (err) {
      app.hideLoading?.();
      console.error('Error generating chocolate batch slip:', err);
      app.showAlert({ title: 'Error', message: err.message || 'Failed to print chocolate batch slip.' });
    }
  },

  deleteChocolateBatch(id, batchNumber) {
    app.authorizeAction(() => {
      app.showConfirm({
        title: 'Delete & Revert Chocolate Batch?',
        message: `Are you sure you want to delete batch <b>${batchNumber}</b>?<br><br>• Deducted raw materials will be restored back to stock.<br>• Produced liters will be removed from Chocolate stock.`,
        confirmText: 'Yes, Delete & Revert',
        confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white',
        onConfirm: async () => {
          app.showLoading?.();
          try {
            const res = await window.api.deleteChocolateBatch(id);
            app.hideLoading?.();
            if (res && res.success) {
              app.showToast(`Batch ${batchNumber} deleted and stock reverted successfully!`, 'success');
              await this.loadData();
              this.openChocolateModal('batches');
            } else {
              app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to delete batch.' });
            }
          } catch (err) {
            app.hideLoading?.();
            console.error('Error deleting chocolate batch:', err);
            app.showAlert({ title: 'Error', message: err.message });
          }
        }
      });
    }, 'delete chocolate batch');
  }
};
