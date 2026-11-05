// Stage 2: Single Items Production (Raw Materials -> Single Items Pool)
window.Production = {
  items: [],
  rawMaterials: [],
  batches: [],
  activeTab: 'catalog', // 'catalog' | 'batches'
  searchQuery: '',
  sortField: 'name', // 'name' | 'spec' | 'stock' | 'cost' | 'retail' | 'total_cost' | 'status' for catalog; 'batch_number' | 'date' | 'item_name' | 'produced_pieces' | 'unit_cost' | 'total_cost' for batches
  sortOrder: 'asc', // 'asc' | 'desc'
  periodType: 'day', // 'day' | 'month' | 'all'
  selectedDate: new Date().toISOString().slice(0, 10),

  async render(container) {
    this.container = container;
    await this.loadData();
  },

  async loadData() {
    try {
      this.items = await window.api.getIcecreamItems() || [];
      this.rawMaterials = await window.api.getRawMaterials() || [];
      this.batches = await window.api.getProductionBatches() || [];
      this.renderUI();
    } catch (e) {
      console.error('Failed to load production data:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading production: ${e.message}</div>`;
      }
    }
  },

  renderUI() {
    if (!this.container) return;

    const totalItems = this.items.length;
    const totalSinglePieces = this.items.reduce((sum, it) => sum + (it.current_single_stock || 0), 0);
    const totalPoolCost = this.items.reduce((sum, it) => sum + ((it.current_single_stock || 0) * (it.unit_cost || 0)), 0);

    const filtered = this.items.filter(it => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (it.name || '').toLowerCase().includes(q) || (it.flavor || '').toLowerCase().includes(q);
    });

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 text-white p-4 px-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border border-cyan-800/40">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-black border border-cyan-500/30">STAGE 2</span>
              <h2 class="text-2xl font-black tracking-tight text-white">Single Items Production</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Produce loose individual pieces (e.g. Chocbar 100 pcs @ Rs. 10, Ice Loly 40 pcs @ Rs. 25). Raw materials are deducted automatically.</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="Production.openProductionModal()" class="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="play-circle" class="w-4 h-4"></i> Run Production (Make Pieces)
            </button>
            <button onclick="Production.openItemModal()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4 text-cyan-400"></i> New Flavor / Item
            </button>
            <button onclick="Production.printReport()" class="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer" title="Print Production Report">
              <i data-lucide="printer" class="w-4 h-4"></i> Print
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Ice Cream Flavors / Items</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">${totalItems} <span class="text-xs font-bold text-slate-400">types</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
              <i data-lucide="layers" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Loose Pieces in Pool</p>
              <h3 class="text-2xl font-black text-cyan-700 mt-1 tabular-nums">${totalSinglePieces.toLocaleString()} <span class="text-xs font-bold text-slate-400">pieces ready to pack</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
              <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Unpacked Production Cost</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">Rs. ${Math.round(totalPoolCost).toLocaleString()}</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
              <i data-lucide="coins" class="w-5 h-5"></i>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs & Search & Date Filters -->
        <div class="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row justify-between items-center gap-3">
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full lg:w-auto shrink-0">
            <button onclick="Production.switchTab('catalog')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'catalog' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Single Pieces Stock
            </button>
            <button onclick="Production.switchTab('batches')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'batches' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Production History
            </button>
          </div>

          <!-- Controls: Search + Sort + Time Filters -->
          <div class="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
            <!-- Search -->
            <div class="relative w-full sm:w-56">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="prd-search" placeholder="${this.activeTab === 'catalog' ? 'Search flavor, item name...' : 'Search batch #, item, ingredient...'}"
                     value="${this.searchQuery}" oninput="Production.onSearch(this.value)"
                     class="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-cyan-400">
              <button type="button" id="prd-search-clear" onclick="Production.clearSearch()" title="Clear search"
                      class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer ${this.searchQuery ? '' : 'hidden'}">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Sort Dropdown -->
            <div class="flex items-center gap-1.5 shrink-0">
              <select id="prd-sort-select" onchange="Production.onSortSelect(this.value)"
                      class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-cyan-400 cursor-pointer">
                ${this.activeTab === 'catalog' ? `
                  <option value="name_asc" ${this.sortField==='name'&&this.sortOrder==='asc'?'selected':''}>Item Name (A-Z)</option>
                  <option value="name_desc" ${this.sortField==='name'&&this.sortOrder==='desc'?'selected':''}>Item Name (Z-A)</option>
                  <option value="stock_desc" ${this.sortField==='stock'&&this.sortOrder==='desc'?'selected':''}>Highest Pool Stock</option>
                  <option value="stock_asc" ${this.sortField==='stock'&&this.sortOrder==='asc'?'selected':''}>Lowest Pool Stock</option>
                  <option value="cost_desc" ${this.sortField==='cost'&&this.sortOrder==='desc'?'selected':''}>Highest Making Cost</option>
                  <option value="retail_desc" ${this.sortField==='retail'&&this.sortOrder==='desc'?'selected':''}>Highest Retail MRP</option>
                  <option value="total_cost_desc" ${this.sortField==='total_cost'&&this.sortOrder==='desc'?'selected':''}>Highest Total Pool Cost</option>
                  <option value="status_desc" ${this.sortField==='status'&&this.sortOrder==='desc'?'selected':''}>Ready to Pack First</option>
                ` : `
                  <option value="date_desc" ${this.sortField==='date'&&this.sortOrder==='desc'?'selected':''}>Newest First</option>
                  <option value="date_asc" ${this.sortField==='date'&&this.sortOrder==='asc'?'selected':''}>Oldest First</option>
                  <option value="item_name_asc" ${this.sortField==='item_name'&&this.sortOrder==='asc'?'selected':''}>Item Produced (A-Z)</option>
                  <option value="produced_pieces_desc" ${this.sortField==='produced_pieces'&&this.sortOrder==='desc'?'selected':''}>Highest Produced Quantity</option>
                  <option value="total_cost_desc" ${this.sortField==='total_cost'&&this.sortOrder==='desc'?'selected':''}>Highest Total Batch Cost</option>
                  <option value="batch_number_asc" ${this.sortField==='batch_number'&&this.sortOrder==='asc'?'selected':''}>Batch # (A-Z)</option>
                `}
              </select>
            </div>

            <!-- Period Switcher: Daily | Monthly | Annual | All -->
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button type="button" onclick="Production.setPeriod('day')" id="prd-tab-day"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'day' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Daily
              </button>
              <button type="button" onclick="Production.setPeriod('month')" id="prd-tab-month"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'month' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Monthly
              </button>
              <button type="button" onclick="Production.setPeriod('year')" id="prd-tab-year"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'year' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Annual
              </button>
              <button type="button" onclick="Production.setPeriod('all')" id="prd-tab-all"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'all' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                All
              </button>
            </div>

            <!-- Date Picker for Day/Month/Year -->
            ${this.periodType !== 'all' ? `
              <div id="prd-date-picker-wrap" class="shrink-0">
                ${this.periodType === 'year' ? `
                  <select id="prd-date-input" onchange="Production.onDateChange(this.value)" oninput="Production.onDateChange(this.value)"
                          class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-cyan-500 cursor-pointer">
                    ${this.getAvailableYears().map(y => `
                      <option value="${y}" ${String(this.selectedDate || '').startsWith(String(y)) ? 'selected' : ''}>${y}</option>
                    `).join('')}
                  </select>
                ` : `
                  <input type="${this.periodType === 'month' ? 'month' : 'date'}" id="prd-date-input" 
                         value="${this.periodType === 'month' ? this.selectedDate.slice(0, 7) : this.selectedDate}" 
                         onchange="Production.onDateChange(this.value)"
                         oninput="Production.onDateChange(this.value)"
                         class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-cyan-500 cursor-pointer">
                `}
              </div>
            ` : ''}

            <!-- Red Cross Reset to Current Date/Period -->
            <div id="prd-reset-filter-wrap" class="shrink-0 flex items-center">
              ${this.isFilteredFromCurrent() ? `
                <button type="button" onclick="Production.resetToCurrent()" 
                        class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                        title="Go back to current (Today)">
                  <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Period Production Stats Bar -->
        <div id="prd-stats-container">
          ${this.renderStatsBar()}
        </div>

        <!-- Content Area -->
        <div id="prd-content-area" class="flex-1 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          ${this.renderContentArea()}
        </div>

      </div>

      <!-- Modal Container -->
      <div id="prd-modal-container"></div>
    `;

    if (window.lucide) lucide.createIcons({ root: this.container });
  },

  renderStatsBar() {
    if (this.periodType === 'all') return '';
    const stats = this.getPeriodStats();
    const periodLabel = this.periodType === 'day' 
      ? `Today (${app.formatDateOnly(this.selectedDate)})` 
      : (this.periodType === 'month' ? `Month (${this.selectedDate.slice(5, 7)}/${this.selectedDate.slice(0, 4)})` : `Annual (${this.selectedDate.slice(0, 4)})`);
    const badgeText = this.periodType === 'day' 
      ? 'Daily Production' 
      : (this.periodType === 'month' ? 'Monthly Production' : 'Annual Production');
    return `
      <div class="bg-cyan-50/70 border border-cyan-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-lg bg-cyan-700 text-white font-black text-[10px] uppercase tracking-wider">
            ${badgeText}
          </span>
          <span class="font-bold text-slate-700">
            Period: <span class="font-mono font-black text-slate-900">${periodLabel}</span>
          </span>
        </div>
        <div class="flex items-center gap-4 flex-wrap font-bold text-slate-600">
          <div>Batches Run: <span class="font-black text-slate-900 font-mono">${stats.totalBatches} runs</span></div>
          <div>Pieces Produced: <span class="font-black text-cyan-800 font-mono">+${stats.totalPiecesProduced.toLocaleString()} pcs</span></div>
          <div>Total Making Cost: <span class="font-black text-slate-900 font-mono">Rs. ${Math.round(stats.totalCost).toLocaleString()}</span></div>
        </div>
      </div>
    `;
  },

  renderContentArea() {
    const q = (this.searchQuery || '').toLowerCase();
    let filtered = (this.items || []).filter(it => {
      if (!q) return true;
      return (it.name || '').toLowerCase().includes(q) || (it.flavor || '').toLowerCase().includes(q);
    });

    if (this.activeTab === 'catalog') {
      const sf = this.sortField;
      const so = this.sortOrder === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        if (sf === 'name') return so * (a.name || '').localeCompare(b.name || '');
        if (sf === 'spec') return so * ((a.default_pcs_per_carton || 0) - (b.default_pcs_per_carton || 0));
        if (sf === 'stock') return so * ((a.current_single_stock || 0) - (b.current_single_stock || 0));
        if (sf === 'cost') return so * ((a.unit_cost || 0) - (b.unit_cost || 0));
        if (sf === 'retail') return so * ((a.retail_piece_price || 0) - (b.retail_piece_price || 0));
        if (sf === 'total_cost') {
          const cA = (a.current_single_stock || 0) * (a.unit_cost || 0);
          const cB = (b.current_single_stock || 0) * (b.unit_cost || 0);
          return so * (cA - cB);
        }
        if (sf === 'status') {
          const sA = (a.current_single_stock || 0) > 0 ? 1 : 0;
          const sB = (b.current_single_stock || 0) > 0 ? 1 : 0;
          return so * (sA - sB);
        }
        return so * (a.name || '').localeCompare(b.name || '');
      });
      return this.renderCatalogTable(filtered);
    } else {
      return this.renderBatchesTable();
    }
  },

  updateContentArea() {
    const statsContainer = document.getElementById('prd-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = this.renderStatsBar();
    }
    const contentArea = document.getElementById('prd-content-area');
    if (contentArea) {
      contentArea.innerHTML = this.renderContentArea();
      if (window.lucide) lucide.createIcons({ root: contentArea });
    }
  },

  setPeriod(period) {
    this.periodType = period;
    this.renderUI();
  },

  isFilteredFromCurrent() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.periodType !== 'day') return true;
    if (this.selectedDate && this.selectedDate !== today) return true;
    return false;
  },

  resetToCurrent() {
    this.periodType = 'day';
    this.selectedDate = new Date().toISOString().slice(0, 10);
    this.renderUI();
  },

  updateResetButton() {
    const wrap = document.getElementById('prd-reset-filter-wrap');
    if (wrap) {
      wrap.innerHTML = this.isFilteredFromCurrent() ? `
        <button type="button" onclick="Production.resetToCurrent()" 
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

  getAvailableYears() {
    const curYear = new Date().getFullYear();
    const years = new Set([curYear, curYear - 1, curYear + 1]);
    (this.batches || []).forEach(b => {
      if (b.date) {
        const y = parseInt(b.date.slice(0, 4));
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  },

  getFilteredBatches() {
    let list = [...(this.batches || [])];
    if (this.periodType === 'day' && this.selectedDate) {
      list = list.filter(b => b.date === this.selectedDate);
    } else if (this.periodType === 'month' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      list = list.filter(b => b.date && b.date.startsWith(ym));
    } else if (this.periodType === 'year' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      list = list.filter(b => b.date && b.date.startsWith(y));
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(b =>
        (b.batch_number || '').toLowerCase().includes(q) ||
        (b.item_name || '').toLowerCase().includes(q) ||
        (b.raw_materials_summary || '').toLowerCase().includes(q)
      );
    }

    if (this.activeTab === 'batches') {
      const sf = this.sortField;
      const so = this.sortOrder === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        if (sf === 'date') {
          const dA = new Date(a.date || a.created_at || 0).getTime() || 0;
          const dB = new Date(b.date || b.created_at || 0).getTime() || 0;
          return so * (dA - dB);
        }
        if (sf === 'batch_number') return so * (a.batch_number || '').localeCompare(b.batch_number || '');
        if (sf === 'item_name') return so * (a.item_name || '').localeCompare(b.item_name || '');
        if (sf === 'produced_pieces') return so * ((a.produced_pieces || 0) - (b.produced_pieces || 0));
        if (sf === 'unit_cost') return so * ((a.unit_cost || 0) - (b.unit_cost || 0));
        if (sf === 'total_cost') return so * ((a.total_cost || 0) - (b.total_cost || 0));
        const dA = new Date(a.date || a.created_at || 0).getTime() || 0;
        const dB = new Date(b.date || b.created_at || 0).getTime() || 0;
        return (dB - dA);
      });
    }

    return list;
  },

  getPeriodStats() {
    const list = this.getFilteredBatches();
    const totalBatches = list.length;
    const totalPiecesProduced = list.reduce((sum, b) => sum + (b.produced_pieces || 0), 0);
    const totalCost = list.reduce((sum, b) => sum + (b.total_cost || 0), 0);
    return {
      totalBatches,
      totalPiecesProduced,
      totalCost
    };
  },

  toggleSort(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = ['stock', 'cost', 'retail', 'total_cost', 'produced_pieces', 'unit_cost', 'date'].includes(field) ? 'desc' : 'asc';
    }
    const sel = document.getElementById('prd-sort-select');
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
      ? `<i data-lucide="arrow-up" class="w-3 h-3 text-cyan-600 ml-1 inline-block"></i>`
      : `<i data-lucide="arrow-down" class="w-3 h-3 text-cyan-600 ml-1 inline-block"></i>`;
  },

  clearSearch() {
    this.searchQuery = '';
    const inp = document.getElementById('prd-search');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    const clr = document.getElementById('prd-search-clear');
    if (clr) clr.classList.add('hidden');
    this.updateContentArea();
  },

  onSearch(q) {
    this.searchQuery = q;
    const clr = document.getElementById('prd-search-clear');
    if (clr) clr.classList.toggle('hidden', !q);
    this.updateContentArea();
  },

  switchTab(tab) {
    this.activeTab = tab;
    if (tab === 'catalog') {
      this.sortField = 'name';
      this.sortOrder = 'asc';
    } else {
      this.sortField = 'date';
      this.sortOrder = 'desc';
    }
    this.renderUI();
  },

  renderCatalogGrid(items) {
    return this.renderCatalogTable(items);
  },

  renderCatalogTable(items) {
    if (items.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="package-x" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No ice cream items defined</h4>
          <p class="text-xs text-slate-400 mt-1">Click "+ New Flavor / Item" to add Chocbar, Ice Loly, Mango Bar, etc.</p>
        </div>
      `;
    }

    const totalItems = items.length;
    const totalPieces = items.reduce((sum, it) => sum + (Number(it.current_single_stock) || 0), 0);
    const totalPoolCost = items.reduce((sum, it) => sum + ((Number(it.current_single_stock) || 0) * (Number(it.unit_cost) || 0)), 0);
    const readyCount = items.filter(it => (Number(it.current_single_stock) || 0) > 0).length;

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th onclick="Production.toggleSort('name')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Item / Flavor</span>
                  ${this.getSortIcon('name')}
                </div>
              </th>
              <th onclick="Production.toggleSort('spec')" class="py-2 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-center gap-1">
                  <span>Pack Spec</span>
                  ${this.getSortIcon('spec')}
                </div>
              </th>
              <th onclick="Production.toggleSort('stock')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Available Pool Stock</span>
                  ${this.getSortIcon('stock')}
                </div>
              </th>
              <th onclick="Production.toggleSort('cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Making Cost</span>
                  ${this.getSortIcon('cost')}
                </div>
              </th>
              <th onclick="Production.toggleSort('retail')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Retail MRP</span>
                  ${this.getSortIcon('retail')}
                </div>
              </th>
              <th onclick="Production.toggleSort('total_cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Total Pool Cost</span>
                  ${this.getSortIcon('total_cost')}
                </div>
              </th>
              <th onclick="Production.toggleSort('status')" class="py-2 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-center gap-1">
                  <span>Status</span>
                  ${this.getSortIcon('status')}
                </div>
              </th>
              <th class="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${items.map(it => {
              const pieces = it.current_single_stock || 0;
              const cost = it.unit_cost || 0;
              const retail = it.retail_piece_price || 0;
              const totalCostVal = Math.round(pieces * cost);

              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    <div class="font-black text-slate-900 text-xs">${it.name}</div>
                    ${it.flavor && it.flavor.trim() && it.flavor.trim().toLowerCase() !== 'standard flavor' ? `<div class="text-[10px] text-slate-400 font-medium leading-tight">${it.flavor.trim()}</div>` : ''}
                  </td>
                  <td class="py-1.5 px-3 text-center border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 font-mono text-[10px] font-black border border-cyan-200 whitespace-nowrap">
                      ${it.default_pcs_per_carton || 20} pcs/ctn
                    </span>
                  </td>
                  <td class="py-1.5 px-3 text-right border-r border-slate-200">
                    <span class="text-sm font-black ${pieces > 0 ? 'text-cyan-700' : 'text-slate-400'} tabular-nums">
                      ${pieces.toLocaleString()}
                    </span>
                    <span class="text-xs font-black text-slate-700 ml-1 inline-block">pcs</span>
                  </td>
                  <td class="py-1.5 px-3 text-right font-mono font-bold text-slate-700 tabular-nums border-r border-slate-200">
                    Rs. ${cost}
                    <span class="text-[11px] font-bold text-slate-500">/ pc</span>
                  </td>
                  <td class="py-1.5 px-3 text-right font-mono font-black text-emerald-700 tabular-nums border-r border-slate-200">
                    Rs. ${retail}
                    <span class="text-[11px] font-bold text-slate-500">/ pc</span>
                  </td>
                  <td class="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">
                    Rs. ${totalCostVal.toLocaleString()}
                  </td>
                  <td class="py-1.5 px-3 text-center border-r border-slate-200">
                    ${pieces > 0 
                      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-bold text-[10px] border border-cyan-200"><span class="w-1.5 h-1.5 rounded-full bg-cyan-600"></span> Ready to Pack</span>`
                      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] border border-slate-200">Empty Pool</span>`
                    }
                  </td>
                  <td class="py-1.5 px-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="Production.openProductionModal(${it.id})" class="w-7 h-7 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Produce Loose Pieces">
                        <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                      </button>
                      <button onclick="app.navigate('carton-packing')" class="w-7 h-7 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Pack into Cartons (Stage 3)">
                        <i data-lucide="package" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="Production.openItemModal(${it.id})" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Edit Item Details">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="Production.deleteItem(${it.id})" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Delete Item">
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
              <td class="py-2.5 px-3 border-r border-slate-300 text-left">
                <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                  <span class="text-cyan-700 font-black">TOTAL:</span>
                  <span>${totalItems} ${totalItems === 1 ? 'Item' : 'Items'}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-cyan-800 text-sm tabular-nums">
                ${totalPieces.toLocaleString()} <span class="text-xs font-black text-slate-700 ml-1 inline-block">pcs</span>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-400 text-xs">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-400 text-xs">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-slate-900 text-sm tabular-nums bg-cyan-50/70">
                Rs. ${Math.round(totalPoolCost).toLocaleString()}
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center">
                ${readyCount > 0 
                  ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-black text-[10px]"><span class="w-1.5 h-1.5 rounded-full bg-cyan-600"></span> ${readyCount} Ready</span>`
                  : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">Empty</span>`
                }
              </td>
              <td class="py-2.5 px-3 text-right text-slate-400 font-bold text-xs">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  renderBatchesTable() {
    const batches = this.getFilteredBatches();
    if (batches.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="history" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No production batches recorded yet</h4>
          <p class="text-xs text-slate-400 mt-1">Run production to generate batch logs.</p>
        </div>
      `;
    }

    const totalBatches = batches.length;
    const totalProducedPcs = batches.reduce((sum, b) => sum + (Number(b.produced_pieces) || 0), 0);
    const grandTotalBatchCost = batches.reduce((sum, b) => sum + (Number(b.total_cost) || 0), 0);

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th onclick="Production.toggleSort('batch_number')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Batch #</span>
                  ${this.getSortIcon('batch_number')}
                </div>
              </th>
              <th onclick="Production.toggleSort('date')" class="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[95px] cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Date</span>
                  ${this.getSortIcon('date')}
                </div>
              </th>
              <th onclick="Production.toggleSort('item_name')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Item Produced</span>
                  ${this.getSortIcon('item_name')}
                </div>
              </th>
              <th onclick="Production.toggleSort('produced_pieces')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Quantity Produced</span>
                  ${this.getSortIcon('produced_pieces')}
                </div>
              </th>
              <th onclick="Production.toggleSort('unit_cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Unit Cost</span>
                  ${this.getSortIcon('unit_cost')}
                </div>
              </th>
              <th onclick="Production.toggleSort('total_cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Total Batch Cost</span>
                  ${this.getSortIcon('total_cost')}
                </div>
              </th>
              <th class="py-2 px-3 border-r border-slate-200">Raw Materials Used</th>
              <th class="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${batches.map(b => `
              <tr class="hover:bg-slate-50/60 transition-colors">
                <td class="py-1.5 px-3 font-mono font-bold text-cyan-800 text-xs border-r border-slate-200">${b.batch_number}</td>
                <td class="py-1.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap border-r border-slate-200">${app.formatDateTime(b.date, b.created_at)}</td>
                <td class="py-1.5 px-3 font-black text-slate-900 text-xs border-r border-slate-200">${b.item_name}</td>
                <td class="py-1.5 px-3 text-right font-black text-cyan-700 text-xs tabular-nums border-r border-slate-200">
                  +${b.produced_pieces.toLocaleString()} <span class="text-[10px] font-normal text-slate-400">pcs</span>
                </td>
                <td class="py-1.5 px-3 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200">Rs. ${b.unit_cost}</td>
                <td class="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">Rs. ${Math.round(b.total_cost).toLocaleString()}</td>
                <td class="py-1.5 px-3 text-slate-600 text-[11px] max-w-xs truncate border-r border-slate-200">${b.raw_materials_summary || 'Standard ingredients'}</td>
                <td class="py-1.5 px-3 text-right">
                  <button onclick="Production.deleteBatch(${b.id})" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs ml-auto" title="Delete &amp; Reverse Stock">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot class="bg-slate-100/95 border-t-2 border-slate-300 font-black text-xs text-slate-900 sticky bottom-0 z-10 shadow-sm">
            <tr class="bg-slate-100 border-t-2 border-slate-300">
              <td class="py-2.5 px-3 border-r border-slate-300 text-left" colspan="3">
                <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                  <span class="text-cyan-700 font-black">TOTAL:</span>
                  <span>${totalBatches} ${totalBatches === 1 ? 'Production Batch' : 'Production Batches'}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-cyan-800 text-xs tabular-nums">
                +${totalProducedPcs.toLocaleString()} pcs
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-slate-900 text-xs tabular-nums bg-cyan-50/70">
                Rs. ${Math.round(grandTotalBatchCost).toLocaleString()}
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-slate-400 font-bold text-center">-</td>
              <td class="py-2.5 px-3 text-right text-slate-400 font-bold text-xs">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  openProductionModal(defaultItemId = null) {
    const modalEl = document.getElementById('prd-modal-container');
    if (!modalEl) return;

    const defaultItem = defaultItemId ? this.items.find(x => x.id === Number(defaultItemId)) : null;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) Production.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
          <div class="bg-cyan-950 py-4 px-6 text-white flex justify-between items-center border-b border-cyan-800 shrink-0">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[10px] font-black">STAGE 2</span>
                <h3 class="text-base font-black tracking-tight">Run Production (Make Single Pieces)</h3>
              </div>
              <p class="text-[11px] text-cyan-300 mt-0.5">Produce unpacked pieces (e.g. 100 pcs Chocbar) and deduct raw materials</p>
            </div>
            <button onclick="Production.closeModal()" class="text-cyan-300 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <form onsubmit="Production.handleProductionSubmit(event)" class="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            <!-- 1. Select Item (Searchable) -->
            <div class="relative dropdown-wrap" id="pr-item-wrap">
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Select Ice Cream Item to Produce *</label>
              <input type="hidden" id="pr-item-id" value="${defaultItem ? defaultItem.id : ''}">
              
              <div class="relative">
                <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                <input type="text" id="pr-item-search" autocomplete="off"
                       placeholder="Type to search item (e.g. Chocbar, Mango Bar)..."
                       value="${defaultItem ? defaultItem.name : ''}"
                       onfocus="Production.openItemDropdown()"
                       onclick="Production.openItemDropdown()"
                       oninput="Production.filterItemDropdown(this.value)"
                       onkeydown="Production.onItemKeydown(event)"
                       class="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500 transition-all cursor-pointer">
                <button type="button" onclick="Production.toggleItemDropdown()"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer">
                  <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </button>
              </div>

              <!-- Floating Searchable Dropdown -->
              <div id="pr-item-dropdown" class="search-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden hidden max-h-56 overflow-y-auto z-[1300] divide-y divide-slate-100">
              </div>
            </div>

            <!-- 2. Quantity & Cost -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Pieces to Produce *</label>
                <input type="number" step="1" min="1" id="pr-pieces" required placeholder="e.g. 100" oninput="Production.calcProductionTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Per Piece (Rs.) *</label>
                <input type="number" step="any" min="0" id="pr-unit-cost" required placeholder="Rs. 10" oninput="Production.calcProductionTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
            </div>

            <!-- Live Calculation Banner -->
            <div class="p-3.5 bg-cyan-50/80 border border-cyan-200 rounded-2xl flex items-center justify-between">
              <div>
                <span class="text-[10px] font-black uppercase text-cyan-900 tracking-wider block">Production Batch Value</span>
                <span id="pr-calc-summary" class="text-xs font-bold text-cyan-700">0 pieces × Rs. 0</span>
              </div>
              <span id="pr-total-display" class="text-xl font-black text-cyan-800 tabular-nums">Rs. 0</span>
            </div>

            <!-- 3. Raw Materials to Deduct (Optional / Quick Multi-Select) -->
            <div class="pt-2 border-t border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <label class="text-[11px] font-black uppercase text-slate-700 tracking-wider block">Deduct Raw Materials Consumed</label>
                  <span class="text-[10px] text-slate-400">Stock will be automatically deducted from Raw Materials inventory</span>
                </div>
                <button type="button" id="pr-add-mat-btn" onclick="Production.addMaterialDeductionRow()" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Material
                </button>
              </div>

              <div id="pr-materials-list" class="space-y-2">
                <!-- Injected dynamically -->
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Production Date</label>
                <input type="date" id="pr-date" value="${new Date().toISOString().split('T')[0]}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500 font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes / Shift</label>
                <input type="text" id="pr-notes" placeholder="e.g. Morning Batch #1..."
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500">
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="Production.closeModal()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Complete Production Run
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });

    if (defaultItemId) {
      this.onProductionItemChange(defaultItemId);
    } else {
      // Add one default row for convenience
      this.addMaterialDeductionRow();
    }
  },

  openItemDropdown() {
    const dropdown = document.getElementById('pr-item-dropdown');
    if (!dropdown) return;
    const searchVal = document.getElementById('pr-item-search')?.value || '';
    this.filterItemDropdown(searchVal);
    if (window.lucide) lucide.createIcons({ root: dropdown });
  },

  toggleItemDropdown() {
    const dropdown = document.getElementById('pr-item-dropdown');
    if (!dropdown) return;
    if (dropdown.classList.contains('hidden')) {
      this.openItemDropdown();
      document.getElementById('pr-item-search')?.focus();
    } else {
      dropdown.classList.add('hidden');
    }
  },

  filterItemDropdown(query = '') {
    const dropdown = document.getElementById('pr-item-dropdown');
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();
    const currentId = Number(document.getElementById('pr-item-id')?.value) || null;

    let matches = this.items || [];
    if (q) {
      matches = matches.filter(it => 
        (it.name || '').toLowerCase().includes(q)
      );
    }

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="p-4 text-center text-xs font-bold text-slate-400">
          No items match "${query}"
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    this.itemMatches = matches;
    this.itemActiveIdx = 0;

    dropdown.innerHTML = matches.map((it, idx) => {
      const isSelected = it.id === currentId;
      return `
        <div class="px-3.5 py-2.5 hover:bg-cyan-50/80 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-cyan-50 font-black text-cyan-950' : 'text-slate-800'}"
             onclick="Production.selectProductionItem(${it.id})">
          <div>
            <div class="text-xs font-black text-slate-900">${it.name}</div>
            <div class="text-[10px] text-slate-500 font-bold mt-0.5">In Pool: <span class="font-black text-slate-700">${it.current_single_stock} pcs</span></div>
          </div>
          <div class="text-right">
            <span class="text-xs font-mono font-black text-cyan-700">Rs. ${it.unit_cost}</span>
            <span class="text-[10px] text-slate-400 block font-normal">/ piece</span>
          </div>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');
  },

  selectProductionItem(id) {
    const it = (this.items || []).find(x => x.id === Number(id));
    if (!it) return;
    const hiddenInp = document.getElementById('pr-item-id');
    const searchInp = document.getElementById('pr-item-search');
    const dropdown = document.getElementById('pr-item-dropdown');

    if (hiddenInp) hiddenInp.value = it.id;
    if (searchInp) searchInp.value = it.name;
    if (dropdown) dropdown.classList.add('hidden');

    this.onProductionItemChange(it.id);
  },

  onItemKeydown(e) {
    const dropdown = document.getElementById('pr-item-dropdown');
    if (!dropdown || dropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        this.openItemDropdown();
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
      if (this.itemMatches && this.itemMatches.length > 0) {
        const item = this.itemMatches[this.itemActiveIdx || 0] || this.itemMatches[0];
        if (item) this.selectProductionItem(item.id);
      }
    }
  },

  onProductionItemChange(id) {
    const it = this.items.find(x => x.id === Number(id));
    if (it) {
      const costEl = document.getElementById('pr-unit-cost');
      if (costEl && (!costEl.value || Number(costEl.value) === 0)) {
        costEl.value = it.unit_cost || 10;
      }
      this.calcProductionTotal();

      // Pre-populate sensible defaults if empty
      const matContainer = document.getElementById('pr-materials-list');
      if (matContainer && matContainer.children.length === 0) {
        this.addMaterialDeductionRow();
      }
    }
  },

  calcProductionTotal() {
    const pieces = Number(document.getElementById('pr-pieces')?.value) || 0;
    const cost = Number(document.getElementById('pr-unit-cost')?.value) || 0;
    const total = pieces * cost;
    const display = document.getElementById('pr-total-display');
    const summary = document.getElementById('pr-calc-summary');
    if (display) display.textContent = `Rs. ${Math.round(total).toLocaleString()}`;
    if (summary) summary.textContent = `${pieces.toLocaleString()} pieces × Rs. ${cost}`;
  },

  addMaterialDeductionRow() {
    const list = document.getElementById('pr-materials-list');
    if (!list) return;

    // Check if all available materials are already in use
    const currentSelects = Array.from(list.querySelectorAll('.pr-mat-select'));
    const currentSelected = new Set(currentSelects.map(s => String(s.value)).filter(v => v && v !== ''));
    if (this.rawMaterials.length > 0 && currentSelected.size >= this.rawMaterials.length) {
      app.showToast('All raw materials have already been added.', 'info');
      return;
    }

    const rowId = 'mat-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const div = document.createElement('div');
    div.id = rowId;
    div.className = 'flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl';
    div.innerHTML = `
      <select onchange="Production.updateMaterialDropdowns()" class="flex-2 pr-mat-select px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-cyan-500">
        <option value="">-- Select Material to Deduct --</option>
        ${this.rawMaterials.map(m => `
          <option value="${m.id}">${m.name} (Stock: ${m.current_stock} ${m.unit})</option>
        `).join('')}
      </select>
      <div class="flex items-center gap-1 flex-1">
        <input type="number" step="any" min="0" placeholder="Qty used" oninput="Production.validateMaterialsStock()" class="w-full pr-mat-qty px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none tabular-nums focus:border-cyan-500">
      </div>
      <button type="button" onclick="Production.removeMaterialRow('${rowId}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer" title="Remove row">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    `;
    list.appendChild(div);
    if (window.lucide) lucide.createIcons({ root: div });

    // Automatically pick the first unselected material
    const newSelect = div.querySelector('.pr-mat-select');
    if (newSelect) {
      const firstAvailable = this.rawMaterials.find(m => !currentSelected.has(String(m.id)));
      if (firstAvailable) {
        newSelect.value = firstAvailable.id;
      }
    }

    this.updateMaterialDropdowns();
  },

  removeMaterialRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
    this.updateMaterialDropdowns();
  },

  updateMaterialDropdowns() {
    const list = document.getElementById('pr-materials-list');
    if (!list) return;

    const selects = Array.from(list.querySelectorAll('.pr-mat-select'));
    const selectedIds = new Set(selects.map(s => String(s.value)).filter(v => v && v !== ''));

    selects.forEach(select => {
      const currentVal = String(select.value || '');
      Array.from(select.options).forEach(opt => {
        if (!opt.value) return; // Keep placeholder enabled
        const isCurrent = String(opt.value) === currentVal;
        const isAlreadyAdded = !isCurrent && selectedIds.has(String(opt.value));
        const mat = this.rawMaterials.find(m => String(m.id) === String(opt.value));
        const baseLabel = mat ? `${mat.name} (Stock: ${mat.current_stock} ${mat.unit})` : opt.value;

        if (isAlreadyAdded) {
          opt.disabled = true;
          opt.textContent = `${mat ? mat.name : opt.value} (Already added)`;
        } else {
          opt.disabled = false;
          opt.textContent = baseLabel;
        }
      });
    });

    // Update "+ Add Material" button enabled state
    const addBtn = document.getElementById('pr-add-mat-btn');
    if (addBtn) {
      const allSelected = selects.length >= this.rawMaterials.length && this.rawMaterials.length > 0;
      addBtn.disabled = allSelected;
      if (allSelected) {
        addBtn.classList.add('opacity-40', 'cursor-not-allowed');
        addBtn.title = 'All available raw materials are already added';
      } else {
        addBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        addBtn.title = 'Add another raw material';
      }
    }

    this.validateMaterialsStock();
  },

  validateMaterialsStock() {
    const list = document.getElementById('pr-materials-list');
    const submitBtn = document.querySelector('#prd-modal-container button[type="submit"]');
    if (!list) return;

    let hasExceeding = false;
    const matRows = list.querySelectorAll('div[id^="mat-row-"]');
    matRows.forEach(row => {
      const select = row.querySelector('.pr-mat-select');
      const qtyInput = row.querySelector('.pr-mat-qty');
      const matId = Number(select?.value);
      const qty = Number(qtyInput?.value) || 0;
      const mat = this.rawMaterials.find(m => m.id === matId);

      if (mat && qty > (mat.current_stock || 0)) {
        hasExceeding = true;
        qtyInput?.classList.add('border-rose-500', 'bg-rose-50/70', 'text-rose-700');
        qtyInput?.classList.remove('border-slate-300', 'text-slate-900');
        qtyInput.title = `Exceeds available stock (${mat.current_stock} ${mat.unit})`;
      } else {
        qtyInput?.classList.remove('border-rose-500', 'bg-rose-50/70', 'text-rose-700');
        qtyInput?.classList.add('border-slate-300', 'text-slate-900');
        qtyInput.title = '';
      }
    });

    if (submitBtn) {
      if (hasExceeding) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.classList.remove('cursor-pointer', 'hover:bg-cyan-400', 'active:scale-95');
        submitBtn.title = 'Cannot complete: raw material quantity exceeds available stock';
      } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.classList.add('cursor-pointer', 'hover:bg-cyan-400', 'active:scale-95');
        submitBtn.title = 'Complete Production Run';
      }
    }
  },

  openItemModal(id = null) {
    if (id) {
      app.authorizeAction(() => this._renderItemModal(id), 'editing production product');
    } else {
      this._renderItemModal(null);
    }
  },

  _renderItemModal(id = null) {
    const it = id ? this.items.find(x => x.id === id) : {
      id: null,
      name: '',
      flavor: '',
      unit_cost: 10,
      retail_piece_price: 40,
      current_single_stock: 0,
      default_pcs_per_carton: 20
    };
    if (!it) return;

    const isNew = !it.id;

    const modalEl = document.getElementById('prd-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) Production.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <h3 class="text-base font-black tracking-tight">${it.id ? 'Edit Ice Cream Item' : 'New Ice Cream Item'}</h3>
            <button onclick="Production.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="Production.handleItemSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="ii-id" value="${it.id || ''}">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Item Name *</label>
              <input type="text" id="ii-name" required value="${it.name || ''}" placeholder="e.g. Chocbar, Ice Loly, Mango Bar..."
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500">
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Flavor / Description</label>
              <input type="text" id="ii-flavor" value="${it.flavor || ''}" placeholder="e.g. Rich Chocolate, Orange Twist..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost To Make 1 Pc (Rs.)</label>
                <input type="number" step="any" min="0" id="ii-cost" value="${isNew ? '' : (it.unit_cost ?? '')}" placeholder="10"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Retail Price / MRP (Rs.)</label>
                <input type="number" step="any" min="0" id="ii-retail" value="${isNew ? '' : (it.retail_piece_price ?? '')}" placeholder="40"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-emerald-700 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Opening Single Stock</label>
                <input type="number" step="1" min="0" id="ii-stock" value="${isNew ? '' : (it.current_single_stock ?? '')}" placeholder="0"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Default Pcs / Carton</label>
                <input type="number" step="1" min="1" id="ii-pcs-carton" value="${isNew ? '' : (it.default_pcs_per_carton ?? '')}" placeholder="20"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="Production.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">Save Item</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  closeModal() {
    const modalEl = document.getElementById('prd-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async handleItemSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('ii-id').value;
    const data = {
      id: id ? Number(id) : null,
      name: (document.getElementById('ii-name').value || '').trim(),
      flavor: (document.getElementById('ii-flavor').value || '').trim(),
      unit_cost: Number(document.getElementById('ii-cost').value) || 0,
      retail_piece_price: Number(document.getElementById('ii-retail').value) || 0,
      current_single_stock: Number(document.getElementById('ii-stock').value) || 0,
      default_pcs_per_carton: Number(document.getElementById('ii-pcs-carton').value) || 20
    };

    const res = await window.api.saveIcecreamItem(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast('Ice cream item saved!', 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to save item.' });
    }
  },

  async handleProductionSubmit(e) {
    e.preventDefault();
    const itemId = Number(document.getElementById('pr-item-id').value);
    const pieces = Number(document.getElementById('pr-pieces').value);
    const unitCost = Number(document.getElementById('pr-unit-cost').value);

    if (!itemId || pieces <= 0) {
      app.showAlert({ title: 'Invalid Production', message: 'Please select an item and enter valid pieces produced.' });
      return;
    }

    // Collect materials & prevent duplicates
    const materials = [];
    const seenMatIds = new Set();
    const matRows = document.querySelectorAll('#pr-materials-list > div');
    for (const row of matRows) {
      const select = row.querySelector('.pr-mat-select');
      const qtyInput = row.querySelector('.pr-mat-qty');
      const matId = Number(select?.value);
      const qty = Number(qtyInput?.value);
      if (matId && qty > 0) {
        if (seenMatIds.has(matId)) {
          app.showAlert({ title: 'Duplicate Material', message: 'The same raw material cannot be deducted multiple times in one batch.' });
          return;
        }
        seenMatIds.add(matId);
        materials.push({ material_id: matId, qty_used: qty });
      }
    }

    const data = {
      item_id: itemId,
      produced_pieces: pieces,
      unit_cost: unitCost,
      date: document.getElementById('pr-date').value,
      notes: document.getElementById('pr-notes').value,
      materials
    };

    const res = await window.api.runProductionBatch(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast(`Production Run ${res.batchNumber} complete! +${pieces} pieces added to pool.`, 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Production Error', message: res.error || 'Failed to complete production run.' });
    }
  },

  async deleteItem(id) {
    app.authorizeAction(async () => {
      const it = this.items.find(x => x.id === id);
      if (!it) return;
      const ok = await new Promise(resolve => {
        app.showConfirm({
          title: 'Delete Item?',
          message: `Are you sure you want to delete "${it.name}"? This item definition will be permanently removed.`,
          confirmText: 'Delete Item',
          confirmColor: 'red',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (ok) {
        const res = await window.api.deleteIcecreamItem(id);
        if (res && res.success) {
          app.showToast('Item deleted successfully.', 'success');
          await this.loadData();
        } else {
          app.showAlert({ title: 'Error', message: res.error || 'Failed to delete item.' });
        }
      }
    }, 'deleting production product');
  },

  async deleteBatch(id) {
    app.authorizeAction(async () => {
      const ok = await new Promise(resolve => {
        app.showConfirm({
          title: 'Delete Production Run?',
          message: 'Are you sure you want to delete this batch? The produced pieces will be deducted from stock.',
          confirmText: 'Delete Batch',
          confirmColor: 'red',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (ok) {
        const res = await window.api.deleteProductionBatch(id);
        if (res && res.success) {
          app.showToast('Batch deleted & stock reversed', 'success');
          await this.loadData();
        } else {
          app.showAlert({ title: 'Error', message: res.error || 'Could not delete batch.' });
        }
      }
    }, 'deleting production batch');
  },

  printReport() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Ice Cream Factory';
    const date = new Date().toLocaleDateString('en-GB');

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 600;">Date: ${app.formatDateTime(new Date())} | Loose Pieces In Factory Floor</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          STAGE 2: SINGLE ITEMS PRODUCTION POOL REPORT
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Item / Flavor</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Pieces in Pool</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 75px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Cost/Piece</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 90px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Total Cost Value</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 75px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Retail MRP</th>
            </tr>
          </thead>
          <tbody>
            ${this.items.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; font-weight: 800; color: #000;">${it.name}${it.flavor && it.flavor.trim() && it.flavor.trim().toLowerCase() !== 'standard flavor' ? ` <span style="font-weight: 500;">(${it.flavor.trim()})</span>` : ''}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${it.current_single_stock} pcs</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${it.unit_cost}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round(it.current_single_stock * it.unit_cost).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${it.retail_piece_price}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Production Floor Manager
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Quality Assurance Officer
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Production Pool Report (A5)');
  }
};
