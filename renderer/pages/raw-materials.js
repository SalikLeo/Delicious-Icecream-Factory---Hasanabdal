// Stage 1: Raw Materials Stock & Management
window.RawMaterials = {
  materials: [],
  logs: [],
  activeTab: 'inventory', // 'inventory' | 'purchase' | 'logs'
  searchQuery: '',
  selectedCategory: 'all',
  sortField: 'name', // 'name' | 'category' | 'unit' | 'stock' | 'cost' | 'value' | 'status' for inventory; 'date' | 'material' | 'action' | 'qty' | 'stock_after' for logs
  sortOrder: 'asc', // 'asc' | 'desc'
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
      this.logs = await window.api.getRawMaterialLogs() || [];
      this.renderUI();
    } catch (e) {
      console.error('Failed to load raw materials:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading raw materials: ${e.message}</div>`;
      }
    }
  },

  renderUI() {
    if (!this.container) return;

    const totalMaterials = this.materials.length;
    const totalValue = this.materials.reduce((sum, m) => sum + (m.total_value || (m.current_stock * m.cost_price)), 0);
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
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Raw Materials</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">${totalMaterials} <span class="text-xs font-bold text-slate-400">items</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <i data-lucide="boxes" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Raw Stock Value</p>
              <h3 class="text-2xl font-black text-emerald-700 mt-1 tabular-nums">Rs. ${Math.round(totalValue).toLocaleString()}</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <i data-lucide="coins" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Low Stock Warning</p>
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
          <div>Purchased: <span class="font-black text-emerald-700 font-mono">+${stats.totalAdded} units (Rs. ${stats.purchasedWorth.toLocaleString()})</span> (${stats.purchasesCount} orders)</div>
          <div>Factory Consumed: <span class="font-black text-rose-700 font-mono">-${stats.totalConsumed} units (Rs. ${stats.consumedWorth.toLocaleString()})</span> (${stats.productionCount} batches)</div>
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
          const valA = (a.current_stock || 0) * (a.cost_price || 0);
          const valB = (b.current_stock || 0) * (b.cost_price || 0);
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
    const defaultCats = ['Dairy', 'Sweeteners', 'Flavors & Coating', 'Packaging & Sticks', 'General'];
    const dynamicCats = (this.materials || []).map(m => m.category).filter(Boolean);
    const set = new Set([...defaultCats, ...dynamicCats]);
    return Array.from(set).sort();
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
      const cost = mat ? (Number(mat.cost_price) || 0) : 0;
      purchasedWorth += Math.max(0, l.qty_change || 0) * cost;
    });

    let consumedWorth = 0;
    prodLogs.forEach(l => {
      const mat = (this.materials || []).find(m => m.id === l.material_id);
      const cost = mat ? (Number(mat.cost_price) || 0) : 0;
      consumedWorth += Math.abs(l.qty_change || 0) * cost;
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
    const totalStockValue = items.reduce((sum, m) => sum + ((Number(m.current_stock) || 0) * (Number(m.cost_price) || 0)), 0);
    const lowStockCount = items.filter(m => (Number(m.current_stock) || 0) <= (Number(m.min_stock_alert) || 0)).length;

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-2 px-2 text-center w-10 border-r border-slate-200 text-slate-400 font-black">#</th>
              <th onclick="RawMaterials.toggleSort('name')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Material Name</span>
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
                  <span>Current Stock</span>
                  ${this.getSortIcon('stock')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Cost Price / Unit</span>
                  ${this.getSortIcon('cost')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('value')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Total Stock Value</span>
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
              const isLow = m.current_stock <= (m.min_stock_alert || 0);
              const val = Math.round(m.current_stock * m.cost_price);
              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-1.5 px-2 text-center text-slate-400 font-bold border-r border-slate-200 text-xs">${idx + 1}</td>
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    <div class="font-black text-slate-900 text-xs">${m.name}</div>
                    ${m.notes ? `<div class="text-[10px] text-slate-400 font-normal leading-tight">${m.notes}</div>` : ''}
                  </td>
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">${m.category || 'General'}</span>
                  </td>
                  <td class="py-1.5 px-3 text-right font-black text-sm tabular-nums border-r border-slate-200 ${isLow ? 'text-rose-600' : 'text-emerald-700'}">
                    ${Number(m.current_stock).toFixed(1).replace(/\.0$/, '')} <span class="text-xs font-black text-slate-700 ml-1 inline-block">${m.unit}</span>
                  </td>
                  <td class="py-1.5 px-3 text-right font-mono font-bold text-slate-700 tabular-nums border-r border-slate-200">Rs. ${Number(m.cost_price).toFixed(2).replace(/\.00$/, '')} <span class="text-[11px] font-bold text-slate-500">/ ${m.unit}</span></td>
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
                  <span>Quantity Change</span>
                  ${this.getSortIcon('qty')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('stock_before')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Stock Before</span>
                  ${this.getSortIcon('stock_before')}
                </div>
              </th>
              <th onclick="RawMaterials.toggleSort('stock_after')" class="py-2 px-3 text-right font-black text-slate-800 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Stock Left</span>
                  ${this.getSortIcon('stock_after')}
                </div>
              </th>
              <th class="py-2 px-3 border-r border-slate-200">Details / Notes</th>
              <th class="py-2 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${logs.map((log, idx) => {
              const isAdd = (log.qty_change || 0) > 0;
              const isProd = log.action === 'PRODUCTION_USED' || log.action === 'PRODUCTION';
              const mat = (this.materials || []).find(m => m.id === log.material_id);
              const matUnit = mat ? mat.unit : '';
              const actionBadge = log.action === 'PURCHASE'
                ? `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] tracking-wide">PURCHASE</span>`
                : (isProd
                    ? `<span class="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-black text-[10px] tracking-wide">PRODUCTION</span>`
                    : `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] tracking-wide">${log.action || 'LOG'}</span>`
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
                    ${isAdd ? '+' : ''}${log.qty_change} ${matUnit ? `<span class="text-xs font-black text-slate-700 ml-0.5">${matUnit}</span>` : ''}
                  </td>
                  <td class="py-1.5 px-3 text-right font-mono text-slate-500 tabular-nums border-r border-slate-200">${log.stock_before ?? '-'} ${matUnit && log.stock_before !== undefined && log.stock_before !== null ? `<span class="text-[11px] font-bold text-slate-500">${matUnit}</span>` : ''}</td>
                  <td class="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">${log.stock_after ?? '-'} ${matUnit && log.stock_after !== undefined && log.stock_after !== null ? `<span class="text-xs font-black text-slate-700 ml-0.5">${matUnit}</span>` : ''}</td>
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
      unit: 'Kg',
      current_stock: 0,
      cost_price: 0,
      min_stock_alert: 5,
      notes: ''
    });
  },

  openEditModal(id) {
    const m = this.materials.find(x => x.id === id);
    if (!m) return;
    app.authorizeAction(() => {
      this.showMaterialModal(m);
    }, 'editing raw material');
  },

  showMaterialModal(m) {
    const isEdit = Boolean(m.id);
    const modalEl = document.getElementById('rm-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) RawMaterials.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <h3 class="text-base font-black tracking-tight">${isEdit ? 'Edit Raw Material' : 'Add New Raw Material'}</h3>
            <button onclick="RawMaterials.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="RawMaterials.handleMaterialSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="rm-id" value="${m.id || ''}">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Material Name *</label>
              <input type="text" id="rm-name" required value="${m.name || ''}" placeholder="e.g. Fresh Milk, Sugar, Chocbar Sticks..."
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Category</label>
                <select id="rm-category" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500">
                  <option value="Dairy" ${m.category === 'Dairy' ? 'selected' : ''}>Dairy (Milk/Cream)</option>
                  <option value="Sweeteners" ${m.category === 'Sweeteners' ? 'selected' : ''}>Sweeteners (Sugar)</option>
                  <option value="Flavors & Coating" ${m.category === 'Flavors & Coating' ? 'selected' : ''}>Flavors & Coating</option>
                  <option value="Packaging & Sticks" ${m.category === 'Packaging & Sticks' ? 'selected' : ''}>Packaging & Sticks</option>
                  <option value="General" ${m.category === 'General' ? 'selected' : ''}>General Raw Material</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Unit of Measure *</label>
                <input type="text" id="rm-unit" required value="${isEdit ? (m.unit || '') : ''}" placeholder="Kg"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Opening Stock</label>
                <input type="number" step="any" min="0" id="rm-stock" value="${isEdit ? (m.current_stock ?? '') : ''}" placeholder="0"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Price / Unit (Rs.)</label>
                <input type="number" step="any" min="0" id="rm-cost" value="${isEdit ? (m.cost_price ?? '') : ''}" placeholder="0"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Min Stock Alert Level</label>
              <input type="number" step="any" min="0" id="rm-min-alert" value="${isEdit ? (m.min_stock_alert ?? '') : ''}" placeholder="5"
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes</label>
              <input type="text" id="rm-notes" value="${m.notes || ''}" placeholder="Supplier, grade, storage location..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
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
          <div class="bg-emerald-950 py-3.5 px-6 text-white flex justify-between items-center border-b border-emerald-800">
            <div>
              <h3 class="text-base font-black tracking-tight">Stock-In / Purchase Raw Material</h3>
              <p class="text-[11px] text-emerald-300">Add purchased quantity to factory stock</p>
            </div>
            <button onclick="RawMaterials.closeModal()" class="text-emerald-300 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
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
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Per Unit (Rs.) *</label>
                <input type="number" step="any" min="0" id="po-cost" required placeholder="0" oninput="RawMaterials.calcPurchaseTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
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
      return `
        <div class="px-3.5 py-2.5 hover:bg-emerald-50/80 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-50 font-black text-emerald-950' : 'text-slate-800'}"
             onclick="RawMaterials.selectPurchaseMaterial(${m.id})">
          <div>
            <div class="text-xs font-black text-slate-900">${m.name}</div>
            <div class="text-[10px] text-slate-500 font-bold mt-0.5">${m.category || 'General'} • Current: <span class="font-black text-slate-700">${m.current_stock} ${m.unit}</span></div>
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

  calcPurchaseTotal() {
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

  closeModal() {
    const modalEl = document.getElementById('rm-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async handleMaterialSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('rm-id').value;
    const data = {
      id: id ? Number(id) : null,
      name: document.getElementById('rm-name').value,
      category: document.getElementById('rm-category').value,
      unit: document.getElementById('rm-unit').value,
      current_stock: Number(document.getElementById('rm-stock').value) || 0,
      cost_price: Number(document.getElementById('rm-cost').value) || 0,
      min_stock_alert: Number(document.getElementById('rm-min-alert').value) || 0,
      notes: document.getElementById('rm-notes').value
    };

    const res = await window.api.saveRawMaterial(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast('Raw material saved successfully!', 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to save raw material.' });
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
    const unit = selMat ? selMat.unit : '';

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
            <div class="flex justify-between">
              <span class="text-emerald-900 font-bold">Quantity Received:</span>
              <span class="font-mono font-black text-emerald-800 text-sm">+${qty} ${unit}</span>
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
      const ok = await new Promise(resolve => {
        app.showConfirm({
          title: 'Delete Raw Material?',
          message: 'Are you sure you want to delete this raw material item?',
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (ok) {
        const res = await window.api.deleteRawMaterial(id);
        if (res && res.success) {
          app.showToast('Material deleted', 'success');
          await this.loadData();
        } else {
          app.showAlert({ title: 'Cannot Delete', message: res.error || 'Failed to delete material.' });
        }
      }
    }, 'deleting raw material');
  },

  printReport() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Ice Cream Factory';
    const date = new Date().toLocaleDateString('en-GB');
    const totalVal = this.materials.reduce((sum, m) => sum + (m.current_stock * m.cost_price), 0);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 600;">Date: ${app.formatDateTime(new Date())} | Total Raw Stock Value: Rs. ${Math.round(totalVal).toLocaleString()}</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          STAGE 1: RAW MATERIALS STOCK INVENTORY REPORT
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Material Name</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 100px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Current Stock</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 80px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Cost/Unit</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 95px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.materials.map((m, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; font-weight: 800; color: #000;">${m.name}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${m.current_stock} ${m.unit || ''}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${m.cost_price}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round(m.current_stock * m.cost_price).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 5px 0; font-size: 10px; font-weight: 900; color: #000;">
          <span>TOTAL MATERIALS: ${this.materials.length}</span>
          <span style="font-family: -apple-system, monospace;">GRAND TOTAL VALUE: Rs. ${Math.round(totalVal).toLocaleString()}</span>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Store Incharge Signature
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
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
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; background: #fff; box-sizing: border-box; font-size: 9.5px; line-height: 1.35;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          <p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${address}</p>
          <p style="font-size: 9px; color: #000; margin: 1px 0 0 0; font-weight: 500;">Tel: ${phone}</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          RAW MATERIAL STOCK MOVEMENT SLIP
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; padding: 5px 8px; background: #fff; border: 1px solid #000; color: #000;">
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

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin: 6px 0; background: #fff;">
          <thead>
            <tr style="background: #fff; border-bottom: 1.5px solid #000;">
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; color: #000;">Item / Raw Material</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-weight: 900; color: #000;">Quantity Change</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; color: #000;">Stock Before</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; color: #000;">Stock After</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-weight: 800; color: #000;">${log.material_name}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: 900; color: #000;">${isAdd ? '+' : ''}${log.qty_change} ${unit}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right; font-family: monospace; color: #000;">${log.stock_before ?? '-'} ${unit}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right; font-family: monospace; font-weight: 900; color: #000;">${log.stock_after ?? '-'} ${unit}</td>
            </tr>
          </tbody>
        </table>

        ${log.notes ? `
          <div style="border: 1px solid #000; padding: 5px 8px; font-size: 9.5px; margin-top: 6px; background: #fff; color: #000;">
            <strong>Details / Notes:</strong> ${log.notes}
          </div>
        ` : ''}

        <div class="a5-signatures" style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 9px;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; padding-top: 4px; font-weight: 800; text-transform: uppercase; color: #000;">
            Store Keeper Signature
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; padding-top: 4px; font-weight: 800; text-transform: uppercase; color: #000;">
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
  }
};
