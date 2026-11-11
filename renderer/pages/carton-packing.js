// Stage 3: Carton Packing (Single Items -> Packed Cartons / Actual Sellable Stock)
window.CartonPacking = {
  cartons: [],
  singleItems: [],
  batches: [],
  activeTab: 'inventory', // 'inventory' | 'batches'
  searchQuery: '',
  packageFilter: 'all', // 'all' | 'carton' | 'shoper'
  sortField: 'name', // 'name' | 'spec' | 'stock' | 'loaded' | 'cost' | 'price' | 'value' | 'pool_pcs' for inventory; 'packing_number' | 'date' | 'item_name' | 'cartons_packed' | 'pieces_per_carton' | 'total_pieces_consumed' | 'carton_cost' | 'total_cost' | 'carton_sale_price' for batches
  sortOrder: 'asc', // 'asc' | 'desc'
  periodType: 'day', // 'day' | 'month' | 'year' | 'custom' | 'all'
  selectedDate: new Date().toISOString().slice(0, 10),
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),

  async render(container) {
    this.container = container;
    await this.loadData();
  },

  async loadData() {
    try {
      this.cartons = await window.api.getPackedCartons() || [];
      this.singleItems = await window.api.getIcecreamItems() || [];
      this.batches = await window.api.getPackingBatches() || [];
      this.renderUI();
    } catch (e) {
      console.error('Failed to load packing data:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading packing: ${e.message}</div>`;
      }
    }
  },

  onPackagingFilterChange(val) {
    this.packageFilter = val || 'all';
    this.updateContentArea();
  },

  renderUI() {
    if (!this.container) return;

    const totalVariants = this.cartons.length;
    const whCtns = this.cartons.filter(c => (c.package_type || 'carton') !== 'shoper').reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);
    const whShopers = this.cartons.filter(c => c.package_type === 'shoper').reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);
    const totalWarehouseUnits = whCtns + whShopers;

    const carCtns = this.cartons.filter(c => (c.package_type || 'carton') !== 'shoper').reduce((sum, c) => sum + (c.total_loaded_in_cars || 0), 0);
    const carShopers = this.cartons.filter(c => c.package_type === 'shoper').reduce((sum, c) => sum + (c.total_loaded_in_cars || 0), 0);
    const totalInCars = carCtns + carShopers;

    const totalFinishedStock = totalWarehouseUnits + totalInCars;
    const totalWarehouseValue = this.cartons.reduce((sum, c) => sum + ((c.factory_carton_stock || 0) * (c.carton_sale_price || 0)), 0);

    const filtered = this.cartons.filter(c => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (c.carton_name || '').toLowerCase().includes(q) || (c.item_name || '').toLowerCase().includes(q);
    });

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white p-4 px-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border border-purple-800/40">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[11px] font-black border border-purple-500/30">STAGE 3</span>
              <h2 class="text-2xl font-black tracking-tight text-white">Carton &amp; Shoper Packing (Sellable Inventory)</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Pack loose pieces into sellable cartons or shopers (e.g. 20 pcs/carton or 25 pcs/shoper).</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="app.openBarcodeStickerModal(null, 'carton')" class="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer" title="Print Barcode Stickers (Speed-X SP-650UL / 4Barcode)">
              <i data-lucide="barcode" class="w-4 h-4"></i> Barcode Stickers
            </button>
            <button onclick="CartonPacking.openPackModal()" class="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 active:scale-95 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="package-plus" class="w-4 h-4"></i> Pack Stock Now
            </button>
            <button onclick="CartonPacking.openCartonConfigModal()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer">
              <i data-lucide="settings" class="w-4 h-4 text-purple-400"></i> New Carton / Shoper
            </button>
            <button onclick="CartonPacking.printReport()" class="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer" title="Print Warehouse Stock Sheet">
              <i data-lucide="printer" class="w-4 h-4"></i> Print
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Warehouse Stock</p>
              <h3 class="text-2xl font-black text-purple-700 mt-1 tabular-nums">${totalWarehouseUnits.toLocaleString()} <span class="text-xs font-bold text-slate-400">units</span></h3>
              <p class="text-[10.5px] font-bold text-purple-600/90 mt-0.5">${whCtns.toLocaleString()} ctns • ${whShopers.toLocaleString()} shopers</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <i data-lucide="warehouse" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Loaded in Cars</p>
              <h3 class="text-2xl font-black text-blue-600 mt-1 tabular-nums">${totalInCars.toLocaleString()} <span class="text-xs font-bold text-slate-400">units</span></h3>
              <p class="text-[10.5px] font-bold text-blue-600/90 mt-0.5">${carCtns.toLocaleString()} ctns • ${carShopers.toLocaleString()} shopers</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <i data-lucide="truck" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Finished Stock</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">${totalFinishedStock.toLocaleString()} <span class="text-xs font-bold text-slate-400">total</span></h3>
              <p class="text-[10.5px] font-bold text-slate-500 mt-0.5">${(whCtns + carCtns).toLocaleString()} ctns • ${(whShopers + carShopers).toLocaleString()} shopers</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
              <i data-lucide="package-check" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Warehouse Sale Value</p>
              <h3 class="text-2xl font-black text-emerald-700 mt-1 tabular-nums">Rs. ${Math.round(totalWarehouseValue).toLocaleString()}</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <i data-lucide="coins" class="w-5 h-5"></i>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs & Search & Date Filters -->
        <div class="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row justify-between items-center gap-3">
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full lg:w-auto shrink-0">
            <button onclick="CartonPacking.switchTab('inventory')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Carton &amp; Shoper Stock
            </button>
            <button onclick="CartonPacking.switchTab('batches')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'batches' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Packing History
            </button>
          </div>

          <!-- Controls: Search + Packaging Filter + Sort + Time Filters -->
          <div class="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
            <!-- Search -->
            <div class="relative w-full sm:w-52">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="pck-search" placeholder="${this.activeTab === 'inventory' ? 'Search carton, shoper...' : 'Search packing #, name...'}"
                     value="${this.searchQuery}" oninput="CartonPacking.onSearch(this.value)"
                     class="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-400">
              <button type="button" id="pck-search-clear" onclick="CartonPacking.clearSearch()" title="Clear search"
                      class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer ${this.searchQuery ? '' : 'hidden'}">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Packaging Type Filter (Carton vs Shoper) -->
            ${this.activeTab === 'inventory' ? `
              <div class="flex items-center shrink-0">
                <select id="pck-pkg-filter" onchange="CartonPacking.onPackagingFilterChange(this.value)"
                        class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-purple-400 cursor-pointer">
                  <option value="all" ${this.packageFilter === 'all' ? 'selected' : ''}>All Packaging</option>
                  <option value="carton" ${this.packageFilter === 'carton' ? 'selected' : ''}>Cartons Only (ctn)</option>
                  <option value="shoper" ${this.packageFilter === 'shoper' ? 'selected' : ''}>Shopers Only (bag)</option>
                </select>
              </div>
            ` : ''}

            <!-- Sort Dropdown -->
            <div class="flex items-center gap-1.5 shrink-0">
              <select id="pck-sort-select" onchange="CartonPacking.onSortSelect(this.value)"
                      class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-purple-400 cursor-pointer">
                ${this.activeTab === 'inventory' ? `
                  <option value="name_asc" ${this.sortField==='name'&&this.sortOrder==='asc'?'selected':''}>Carton Name (A-Z)</option>
                  <option value="name_desc" ${this.sortField==='name'&&this.sortOrder==='desc'?'selected':''}>Carton Name (Z-A)</option>
                  <option value="stock_desc" ${this.sortField==='stock'&&this.sortOrder==='desc'?'selected':''}>Highest Warehouse Stock</option>
                  <option value="stock_asc" ${this.sortField==='stock'&&this.sortOrder==='asc'?'selected':''}>Lowest Warehouse Stock</option>
                  <option value="loaded_desc" ${this.sortField==='loaded'&&this.sortOrder==='desc'?'selected':''}>Most Loaded in Cars</option>
                  <option value="value_desc" ${this.sortField==='value'&&this.sortOrder==='desc'?'selected':''}>Highest Stock Value</option>
                  <option value="price_desc" ${this.sortField==='price'&&this.sortOrder==='desc'?'selected':''}>Highest Sale Price</option>
                  <option value="pool_pcs_desc" ${this.sortField==='pool_pcs'&&this.sortOrder==='desc'?'selected':''}>Most Loose Pcs in Stock</option>
                ` : `
                  <option value="date_desc" ${this.sortField==='date'&&this.sortOrder==='desc'?'selected':''}>Newest First</option>
                  <option value="date_asc" ${this.sortField==='date'&&this.sortOrder==='asc'?'selected':''}>Oldest First</option>
                  <option value="item_name_asc" ${this.sortField==='item_name'&&this.sortOrder==='asc'?'selected':''}>Item Packed (A-Z)</option>
                  <option value="cartons_packed_desc" ${this.sortField==='cartons_packed'&&this.sortOrder==='desc'?'selected':''}>Most Cartons Packed</option>
                  <option value="total_cost_desc" ${this.sortField==='total_cost'&&this.sortOrder==='desc'?'selected':''}>Highest Batch Cost</option>
                  <option value="packing_number_asc" ${this.sortField==='packing_number'&&this.sortOrder==='asc'?'selected':''}>Packing # (A-Z)</option>
                `}
              </select>
            </div>

            <!-- Period Switcher: Daily | Monthly | Annual | Custom Range | All -->
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button type="button" onclick="CartonPacking.setPeriod('day')" id="pck-tab-day"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'day' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Daily
              </button>
              <button type="button" onclick="CartonPacking.setPeriod('month')" id="pck-tab-month"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'month' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Monthly
              </button>
              <button type="button" onclick="CartonPacking.setPeriod('year')" id="pck-tab-year"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'year' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Annual
              </button>
              <button type="button" onclick="CartonPacking.setPeriod('custom')" id="pck-tab-custom"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'custom' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                Custom Range
              </button>
              <button type="button" onclick="CartonPacking.setPeriod('all')" id="pck-tab-all"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'all' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                All
              </button>
            </div>

            <!-- Date Picker for Day/Month/Year/Custom -->
            ${this.periodType !== 'all' ? `
              <div id="pck-date-picker-wrap" class="shrink-0">
                ${this.periodType === 'custom' ? `
                  <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
                    <span class="text-[10px] font-black uppercase text-slate-400">From</span>
                    <input type="date" id="pck-start-date" value="${this.startDate || this.selectedDate}" 
                           onchange="CartonPacking.onCustomDateChange('start', this.value)"
                           oninput="CartonPacking.onCustomDateChange('start', this.value)"
                           class="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer">
                    <span class="text-[10px] font-black uppercase text-slate-400">To</span>
                    <input type="date" id="pck-end-date" value="${this.endDate || this.selectedDate}" 
                           onchange="CartonPacking.onCustomDateChange('end', this.value)"
                           oninput="CartonPacking.onCustomDateChange('end', this.value)"
                           class="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer">
                  </div>
                ` : this.periodType === 'year' ? `
                  <select id="pck-date-input" onchange="CartonPacking.onDateChange(this.value)" oninput="CartonPacking.onDateChange(this.value)"
                          class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-500 cursor-pointer">
                    ${this.getAvailableYears().map(y => `
                      <option value="${y}" ${String(this.selectedDate || '').startsWith(String(y)) ? 'selected' : ''}>${y}</option>
                    `).join('')}
                  </select>
                ` : `
                  <input type="${this.periodType === 'month' ? 'month' : 'date'}" id="pck-date-input" 
                         value="${this.periodType === 'month' ? this.selectedDate.slice(0, 7) : this.selectedDate}" 
                         onchange="CartonPacking.onDateChange(this.value)"
                         oninput="CartonPacking.onDateChange(this.value)"
                         class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-500 cursor-pointer">
                `}
              </div>
            ` : ''}

            <!-- Red Cross Reset to Current Date/Period -->
            <div id="pck-reset-filter-wrap" class="shrink-0 flex items-center">
              ${this.isFilteredFromCurrent() ? `
                <button type="button" onclick="CartonPacking.resetToCurrent()" 
                        class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                        title="Go back to current (Today)">
                  <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Period Packing Stats Bar -->
        <div id="pck-stats-container">
          ${this.renderStatsBar()}
        </div>

        <!-- Content Area -->
        <div id="pck-content-area" class="flex-1 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          ${this.renderContentArea()}
        </div>

      </div>

      <!-- Modal Container -->
      <div id="pck-modal-container"></div>
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
      ? 'Daily Packing' 
      : (this.periodType === 'month' 
        ? 'Monthly Packing' 
        : (this.periodType === 'year' 
          ? 'Annual Packing' 
          : 'Custom Range Packing'));

    const list = this.getFilteredBatches();
    const batchCtns = list.filter(b => (b.package_type || 'carton') !== 'shoper').reduce((s, b) => s + (b.cartons_packed || 0), 0);
    const batchShopers = list.filter(b => b.package_type === 'shoper').reduce((s, b) => s + (b.cartons_packed || 0), 0);
    const packedBreakdown = (batchCtns > 0 && batchShopers > 0)
      ? ` (${batchCtns} ctns, ${batchShopers} shopers)`
      : (batchShopers > 0 ? ` (${batchShopers} shopers)` : ` (${batchCtns} ctns)`);

    return `
      <div class="bg-purple-50/70 border border-purple-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-lg bg-purple-700 text-white font-black text-[10px] uppercase tracking-wider">
            ${badgeText}
          </span>
          <span class="font-bold text-slate-700">
            Period: <span class="font-mono font-black text-slate-900">${periodLabel}</span>
          </span>
        </div>
        <div class="flex items-center gap-4 flex-wrap font-bold text-slate-600">
          <div>Packing Batches: <span class="font-black text-slate-900 font-mono">${stats.totalBatches} batches</span></div>
          <div>Units Packed: <span class="font-black text-purple-800 font-mono">+${stats.totalCartonsPacked.toLocaleString()}${packedBreakdown}</span></div>
          <div>Pcs Consumed: <span class="font-black text-rose-700 font-mono">-${stats.totalPiecesConsumed.toLocaleString()} pcs</span></div>
          <div>Sale Value: <span class="font-black text-emerald-700 font-mono">Rs. ${Math.round(stats.totalSaleValue).toLocaleString()}</span></div>
        </div>
      </div>
    `;
  },

  renderContentArea() {
    const q = (this.searchQuery || '').toLowerCase();
    let filtered = (this.cartons || []).filter(c => {
      if (this.packageFilter && this.packageFilter !== 'all') {
        if ((c.package_type || 'carton') !== this.packageFilter) return false;
      }
      if (!q) return true;
      return (c.carton_name || '').toLowerCase().includes(q) || (c.item_name || '').toLowerCase().includes(q);
    });

    if (this.activeTab === 'inventory') {
      const sf = this.sortField;
      const so = this.sortOrder === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        if (sf === 'name') return so * (a.carton_name || '').localeCompare(b.carton_name || '');
        if (sf === 'spec') return so * ((a.pieces_per_carton || 0) - (b.pieces_per_carton || 0));
        if (sf === 'stock') return so * ((a.factory_carton_stock || 0) - (b.factory_carton_stock || 0));
        if (sf === 'loaded') return so * ((a.total_loaded_in_cars || 0) - (b.total_loaded_in_cars || 0));
        if (sf === 'cost') return so * ((a.carton_cost || 0) - (b.carton_cost || 0));
        if (sf === 'price') return so * ((a.carton_sale_price || 0) - (b.carton_sale_price || 0));
        if (sf === 'value') {
          const valA = (a.factory_carton_stock || 0) * (a.carton_sale_price || 0);
          const valB = (b.factory_carton_stock || 0) * (b.carton_sale_price || 0);
          return so * (valA - valB);
        }
        if (sf === 'pool_pcs') return so * ((a.available_single_pieces || 0) - (b.available_single_pieces || 0));
        return so * (a.carton_name || '').localeCompare(b.carton_name || '');
      });
      return this.renderInventoryTable(filtered);
    } else {
      return this.renderBatchesTable();
    }
  },

  updateContentArea() {
    const statsContainer = document.getElementById('pck-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = this.renderStatsBar();
    }
    const contentArea = document.getElementById('pck-content-area');
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
    const today = (window.app && typeof app.getTodayDate === 'function')
      ? app.getTodayDate()
      : (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    if (this.periodType === 'custom') return true;
    if (this.periodType !== 'day') return true;
    if (this.selectedDate && this.selectedDate !== today) return true;
    return false;
  },

  resetToCurrent() {
    const today = (window.app && typeof app.getTodayDate === 'function')
      ? app.getTodayDate()
      : (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    this.periodType = 'day';
    this.selectedDate = today;
    this.startDate = today;
    this.endDate = today;
    this.renderUI();
  },

  updateResetButton() {
    const wrap = document.getElementById('pck-reset-filter-wrap');
    if (wrap) {
      wrap.innerHTML = this.isFilteredFromCurrent() ? `
        <button type="button" onclick="CartonPacking.resetToCurrent()" 
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
    } else if (this.periodType === 'custom') {
      if (this.startDate) list = list.filter(b => (b.date || '').slice(0, 10) >= this.startDate);
      if (this.endDate) list = list.filter(b => (b.date || '').slice(0, 10) <= this.endDate);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(b =>
        (b.packing_number || '').toLowerCase().includes(q) ||
        (b.item_name || '').toLowerCase().includes(q) ||
        (b.carton_name || '').toLowerCase().includes(q)
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
        if (sf === 'packing_number') return so * (a.packing_number || '').localeCompare(b.packing_number || '');
        if (sf === 'item_name') return so * (a.item_name || '').localeCompare(b.item_name || '');
        if (sf === 'cartons_packed') return so * ((a.cartons_packed || 0) - (b.cartons_packed || 0));
        if (sf === 'pieces_per_carton') return so * ((a.pieces_per_carton || 0) - (b.pieces_per_carton || 0));
        if (sf === 'total_pieces_consumed') return so * ((a.total_pieces_consumed || 0) - (b.total_pieces_consumed || 0));
        if (sf === 'carton_cost') return so * ((a.carton_cost || 0) - (b.carton_cost || 0));
        if (sf === 'total_cost') return so * ((a.total_cost || 0) - (b.total_cost || 0));
        if (sf === 'carton_sale_price') return so * ((a.carton_sale_price || 0) - (b.carton_sale_price || 0));
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
    const totalCartonsPacked = list.reduce((sum, b) => sum + (b.cartons_packed || 0), 0);
    const totalPiecesConsumed = list.reduce((sum, b) => sum + (b.total_pieces_consumed || 0), 0);
    const totalSaleValue = list.reduce((sum, b) => sum + ((b.cartons_packed || 0) * (b.carton_sale_price || 0)), 0);

    return {
      totalBatches,
      totalCartonsPacked,
      totalPiecesConsumed,
      totalSaleValue
    };
  },

  toggleSort(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = ['stock', 'loaded', 'cost', 'price', 'value', 'pool_pcs', 'cartons_packed', 'total_pieces_consumed', 'total_cost', 'date'].includes(field) ? 'desc' : 'asc';
    }
    const sel = document.getElementById('pck-sort-select');
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
      ? `<i data-lucide="arrow-up" class="w-3 h-3 text-purple-600 ml-1 inline-block"></i>`
      : `<i data-lucide="arrow-down" class="w-3 h-3 text-purple-600 ml-1 inline-block"></i>`;
  },

  clearSearch() {
    this.searchQuery = '';
    const inp = document.getElementById('pck-search');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    const clr = document.getElementById('pck-search-clear');
    if (clr) clr.classList.add('hidden');
    this.updateContentArea();
  },

  onSearch(q) {
    this.searchQuery = q;
    const clr = document.getElementById('pck-search-clear');
    if (clr) clr.classList.toggle('hidden', !q);
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

  renderInventoryTable(cartons) {
    if (cartons.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="package-x" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No packed products configured</h4>
          <p class="text-xs text-slate-400 mt-1">Click "+ New Carton / Shoper" to register packaging rules.</p>
        </div>
      `;
    }

    const totalCartonsCount = cartons.length;
    const totalWarehouseUnits = cartons.reduce((sum, c) => sum + (Number(c.factory_carton_stock) || 0), 0);
    const totalLoadedUnits = cartons.reduce((sum, c) => sum + (Number(c.total_loaded_in_cars) || 0), 0);
    const totalWarehouseValue = cartons.reduce((sum, c) => sum + ((Number(c.factory_carton_stock) || 0) * (Number(c.carton_sale_price) || 0)), 0);
    const totalPoolPcs = cartons.reduce((sum, c) => sum + (Number(c.available_single_pieces) || 0), 0);

    const totalWhCtns = cartons.filter(c => (c.package_type || 'carton') !== 'shoper').reduce((sum, c) => sum + (Number(c.factory_carton_stock) || 0), 0);
    const totalWhShopers = cartons.filter(c => c.package_type === 'shoper').reduce((sum, c) => sum + (Number(c.factory_carton_stock) || 0), 0);

    const totalCarCtns = cartons.filter(c => (c.package_type || 'carton') !== 'shoper').reduce((sum, c) => sum + (Number(c.total_loaded_in_cars) || 0), 0);
    const totalCarShopers = cartons.filter(c => c.package_type === 'shoper').reduce((sum, c) => sum + (Number(c.total_loaded_in_cars) || 0), 0);

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th onclick="CartonPacking.toggleSort('name')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Carton / Shoper Item</span>
                  ${this.getSortIcon('name')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('spec')" class="py-2 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-center gap-1">
                  <span>Packing Spec</span>
                  ${this.getSortIcon('spec')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('stock')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Factory Warehouse Stock</span>
                  ${this.getSortIcon('stock')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('loaded')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Loaded in Cars</span>
                  ${this.getSortIcon('loaded')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Unit Cost</span>
                  ${this.getSortIcon('cost')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('price')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Sale Price</span>
                  ${this.getSortIcon('price')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('value')" class="py-2 px-3 text-right font-black text-slate-800 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Warehouse Value</span>
                  ${this.getSortIcon('value')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('pool_pcs')" class="py-2 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-center gap-1">
                  <span>Loose Pcs in Stock</span>
                  ${this.getSortIcon('pool_pcs')}
                </div>
              </th>
              <th class="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${cartons.map(c => {
              const isShoper = (c.package_type || 'carton') === 'shoper';
              const unitAbbr = isShoper ? 'shoper' : 'ctn';
              const unitsAbbr = isShoper ? 'shopers' : 'ctns';
              const stock = c.factory_carton_stock || 0;
              const loaded = c.total_loaded_in_cars || 0;
              const pcsAvailable = c.available_single_pieces || 0;
              const val = Math.round(stock * (c.carton_sale_price || 0));

              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-black text-slate-900 text-xs">${c.carton_name}</span>
                      <span class="px-1.5 py-0.2 rounded ${isShoper ? 'bg-sky-50 text-sky-800 border border-sky-300' : 'bg-purple-50 text-purple-800 border border-purple-200'} text-[9px] font-black uppercase tracking-tight">
                        ${isShoper ? 'Shoper' : 'Carton'}
                      </span>
                    </div>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span class="text-[10px] text-slate-400 leading-tight">Base: ${c.base_item_name}</span>
                      ${c.barcode ? `<span class="px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-300 font-mono text-[9px] font-black" title="Barcode: ${c.barcode}">#${c.barcode}</span>` : '<span class="text-[9px] text-slate-400 italic">No barcode</span>'}
                    </div>
                  </td>
                  <td class="py-1.5 px-3 text-center border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-md ${isShoper ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-purple-50 text-purple-800 border border-purple-200'} font-mono text-[10px] font-black border whitespace-nowrap">
                      ${c.pieces_per_carton} pcs/${unitAbbr}
                    </span>
                  </td>
                  <td class="py-1.5 px-3 text-right border-r border-slate-200">
                    <span class="text-sm font-black ${stock > 0 ? (isShoper ? 'text-sky-700' : 'text-purple-700') : 'text-slate-400'} tabular-nums">
                      ${stock.toLocaleString()}
                    </span>
                    <span class="text-xs font-black text-slate-700 ml-1 inline-block">${unitsAbbr}</span>
                  </td>
                  <td class="py-1.5 px-3 text-right border-r border-slate-200">
                    <span class="text-xs font-black ${loaded > 0 ? 'text-blue-600' : 'text-slate-400'} tabular-nums">
                      ${loaded.toLocaleString()}
                    </span>
                    <span class="text-xs font-black text-slate-700 ml-1 inline-block">${unitsAbbr}</span>
                  </td>
                  <td class="py-1.5 px-3 text-right font-mono font-bold text-slate-600 tabular-nums border-r border-slate-200">
                    Rs. ${c.carton_cost_price}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">
                    Rs. ${c.carton_sale_price}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black text-emerald-700 tabular-nums border-r border-slate-200">
                    Rs. ${val.toLocaleString()}
                  </td>
                  <td class="py-1.5 px-3 text-center border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-full ${pcsAvailable >= c.pieces_per_carton ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' : 'bg-rose-50 text-rose-700 border border-rose-200'} text-[10px] font-black whitespace-nowrap">
                      ${pcsAvailable} pcs available
                    </span>
                  </td>
                  <td class="py-1.5 px-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="app.openBarcodeStickerModal(${c.id}, 'carton')" class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Print Barcode Stickers">
                        <i data-lucide="barcode" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="CartonPacking.openPackModal(${c.id})" class="w-7 h-7 rounded-lg ${isShoper ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200/80' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200/80'} border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="${isShoper ? 'Pack Loose Pieces into Shopers' : 'Pack Loose Pieces into Cartons'}">
                        <i data-lucide="${isShoper ? 'shopping-bag' : 'package'}" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="CartonPacking.openCartonConfigModal(${c.id})" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Edit Pricing / Spec">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="CartonPacking.deleteCarton(${c.id})" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Delete Product">
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
                  <span class="text-purple-700 font-black">TOTAL:</span>
                  <span>${totalCartonsCount} ${totalCartonsCount === 1 ? 'Product' : 'Products'}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-purple-800 text-sm tabular-nums">
                ${totalWarehouseUnits.toLocaleString()} <span class="text-xs font-black text-slate-700 ml-1 inline-block">units</span>
                <div class="text-[9.5px] font-bold text-slate-500">${totalWhCtns} ctns • ${totalWhShopers} shopers</div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-blue-700 text-sm tabular-nums">
                ${totalLoadedUnits.toLocaleString()} <span class="text-xs font-black text-slate-700 ml-1 inline-block">units</span>
                <div class="text-[9.5px] font-bold text-slate-500">${totalCarCtns} ctns • ${totalCarShopers} shopers</div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-400 text-xs">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-400 text-xs">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-emerald-800 text-sm tabular-nums bg-purple-50/70">
                Rs. ${Math.round(totalWarehouseValue).toLocaleString()}
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center font-bold text-slate-700 text-xs">
                ${totalPoolPcs.toLocaleString()} pcs
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
          <h4 class="text-sm font-black text-slate-600">No packing batches logged</h4>
          <p class="text-xs text-slate-400 mt-1">Pack cartons or shopers to record batch history.</p>
        </div>
      `;
    }

    const totalBatchesCount = batches.length;
    const totalPackedUnits = batches.reduce((sum, b) => sum + (Number(b.cartons_packed) || 0), 0);
    const totalPiecesUsed = batches.reduce((sum, b) => sum + (Number(b.total_pieces_consumed) || 0), 0);
    const grandTotalPackingCost = batches.reduce((sum, b) => sum + (Number(b.total_cost) || 0), 0);

    const batchCtns = batches.filter(b => (b.package_type || 'carton') !== 'shoper').reduce((sum, b) => sum + (Number(b.cartons_packed) || 0), 0);
    const batchShopers = batches.filter(b => b.package_type === 'shoper').reduce((sum, b) => sum + (Number(b.cartons_packed) || 0), 0);

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th onclick="CartonPacking.toggleSort('packing_number')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Packing #</span>
                  ${this.getSortIcon('packing_number')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('date')" class="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[95px] cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Date</span>
                  ${this.getSortIcon('date')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('item_name')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Item Packed</span>
                  ${this.getSortIcon('item_name')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('cartons_packed')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Units Packed</span>
                  ${this.getSortIcon('cartons_packed')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('pieces_per_carton')" class="py-2 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-center gap-1">
                  <span>Spec</span>
                  ${this.getSortIcon('pieces_per_carton')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('total_pieces_consumed')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Single Pcs Consumed</span>
                  ${this.getSortIcon('total_pieces_consumed')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('carton_cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Unit Cost</span>
                  ${this.getSortIcon('carton_cost')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('total_cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Total Cost</span>
                  ${this.getSortIcon('total_cost')}
                </div>
              </th>
              <th onclick="CartonPacking.toggleSort('carton_sale_price')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Sale Price</span>
                  ${this.getSortIcon('carton_sale_price')}
                </div>
              </th>
              <th class="py-2 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${batches.map(b => {
              const isShoper = (b.package_type || 'carton') === 'shoper';
              const unitAbbr = isShoper ? 'shoper' : 'ctn';
              const unitsAbbr = isShoper ? 'shopers' : 'ctns';

              return `
              <tr class="hover:bg-slate-50/60 transition-colors">
                <td class="py-1.5 px-3 font-mono font-bold text-purple-800 border-r border-slate-200">${b.packing_number}</td>
                <td class="py-1.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap border-r border-slate-200">${app.formatDateTime(b.date, b.created_at)}</td>
                <td class="py-1.5 px-3 font-black text-slate-900 border-r border-slate-200">
                  <div class="flex items-center gap-1.5">
                    <span>${b.item_name}</span>
                    <span class="px-1.5 py-0.2 rounded ${isShoper ? 'bg-sky-50 text-sky-800 border border-sky-300' : 'bg-purple-50 text-purple-800 border border-purple-200'} text-[9px] font-black uppercase">
                      ${isShoper ? 'Shoper' : 'Carton'}
                    </span>
                  </div>
                </td>
                <td class="py-1.5 px-3 text-right font-black ${isShoper ? 'text-sky-700' : 'text-purple-700'} text-xs tabular-nums border-r border-slate-200">
                  +${b.cartons_packed} ${unitsAbbr}
                </td>
                <td class="py-1.5 px-3 text-center font-mono text-[11px] text-slate-500 border-r border-slate-200">${b.pieces_per_carton} pcs/${unitAbbr}</td>
                <td class="py-1.5 px-3 text-right font-mono font-bold text-rose-600 tabular-nums border-r border-slate-200">-${b.total_pieces_consumed} pcs</td>
                <td class="py-1.5 px-3 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200">Rs. ${b.carton_cost}</td>
                <td class="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">Rs. ${Math.round(b.total_cost).toLocaleString()}</td>
                <td class="py-1.5 px-3 text-right font-black text-emerald-700 tabular-nums border-r border-slate-200">Rs. ${b.carton_sale_price}</td>
                <td class="py-1.5 px-3 text-center whitespace-nowrap">
                  <div class="flex items-center justify-center gap-1.5">
                    <button onclick="CartonPacking.printPackingSlip(${b.id})" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Print Packing Voucher (A5)">
                      <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="CartonPacking.openEditBatchModal(${b.id})" class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Edit Packing Batch">
                      <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="CartonPacking.deleteBatch(${b.id})" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Delete &amp; Reverse Stock">
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
              <td class="py-2.5 px-3 border-r border-slate-300 text-left" colspan="3">
                <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                  <span class="text-purple-700 font-black">TOTAL:</span>
                  <span>${totalBatchesCount} ${totalBatchesCount === 1 ? 'Packing Batch' : 'Packing Batches'}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-purple-700 text-xs tabular-nums">
                +${totalPackedUnits.toLocaleString()} units
                <div class="text-[9.5px] font-bold text-slate-500">+${batchCtns} ctns • +${batchShopers} shopers</div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-rose-600 text-xs tabular-nums">
                -${totalPiecesUsed.toLocaleString()} pcs
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-slate-900 text-xs tabular-nums bg-purple-50/70">
                Rs. ${Math.round(grandTotalPackingCost).toLocaleString()}
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.renderUI();
  },

  onSearch(q) {
    this.searchQuery = q;
    this.updateContentArea();
  },

  openPackModal(defaultCartonId = null) {
    const modalEl = document.getElementById('pck-modal-container');
    if (!modalEl) return;

    const defaultCarton = defaultCartonId ? this.cartons.find(x => x.id === Number(defaultCartonId)) : null;
    const isShoper = defaultCarton?.package_type === 'shoper';
    const unitSingular = isShoper ? 'Shoper' : 'Carton';
    const unitPlural = isShoper ? 'Shopers' : 'Cartons';

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) CartonPacking.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
          <div class="bg-purple-950 py-4 px-6 text-white flex justify-between items-center border-b border-purple-800">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-purple-400 text-slate-950 font-mono text-[10px] font-black">STAGE 3</span>
                <h3 class="text-base font-black tracking-tight">Pack Single Pieces into <span id="pk-header-unit">${unitPlural}</span></h3>
              </div>
              <p class="text-[11px] text-purple-300 mt-0.5">Deducts loose pieces from stock and adds ready inventory to factory stock</p>
            </div>
            <button onclick="CartonPacking.closeModal()" class="text-purple-300 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <form onsubmit="CartonPacking.handlePackingSubmit(event)" class="p-6 space-y-4">
            <!-- 1. Select Carton / Shoper Product (Searchable) -->
            <div class="relative dropdown-wrap" id="pk-carton-wrap">
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Select Product *</label>
              <input type="hidden" id="pk-carton-id" value="${defaultCarton ? defaultCarton.id : ''}">
              
              <div class="relative">
                <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                <input type="text" id="pk-carton-search" autocomplete="off"
                       placeholder="Type to search product (e.g. Chocbar, Lolly)..."
                       value="${defaultCarton ? defaultCarton.carton_name : ''}"
                       onfocus="CartonPacking.openCartonDropdown()"
                       onclick="CartonPacking.openCartonDropdown()"
                       oninput="CartonPacking.filterCartonDropdown(this.value)"
                       onkeydown="CartonPacking.onCartonKeydown(event)"
                       class="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 transition-all cursor-pointer">
                <button type="button" onclick="CartonPacking.toggleCartonDropdown()"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer">
                  <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </button>
              </div>

              <!-- Floating Searchable Dropdown -->
              <div id="pk-carton-dropdown" class="search-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden hidden max-h-56 overflow-y-auto z-[1300] divide-y divide-slate-100">
              </div>
            </div>

            <!-- Single Pcs Available Banner -->
            <div id="pk-pool-indicator" class="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span class="font-bold text-slate-600">Available Single Pieces in Stock:</span>
              <span id="pk-available-display" class="font-black text-slate-900 tabular-nums">0 pcs</span>
            </div>

            <!-- 2. Quantity & Pcs per carton/shoper -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label id="pk-label-pcs" class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Pieces Per ${unitSingular}</label>
                <input type="number" step="1" min="1" id="pk-pcs-per-carton" value="${isShoper ? 25 : 20}" required oninput="CartonPacking.calcPackingTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
              <div>
                <label id="pk-label-qty" class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Number of ${unitPlural} to Pack *</label>
                <input type="number" step="1" min="1" id="pk-cartons-qty" required placeholder="e.g. 5" oninput="CartonPacking.calcPackingTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-purple-700 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
            </div>

            <!-- Calculation Box matching user example -->
            <div class="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-1.5">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-purple-900">Single Pieces Needed:</span>
                <span id="pk-pcs-needed-display" class="font-black text-purple-900 tabular-nums">0 pieces</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span id="pk-label-cost" class="font-bold text-purple-900">Cost Per ${unitSingular}:</span>
                <span id="pk-carton-cost-display" class="font-black text-purple-900 tabular-nums">Rs. 0</span>
              </div>
              <div class="flex justify-between items-center pt-1 border-t border-purple-200/80 text-sm font-black">
                <span class="text-purple-950">Total Packing Cost:</span>
                <span id="pk-total-cost-display" class="text-purple-700 tabular-nums">Rs. 0</span>
              </div>
              <div id="pk-insufficient-warning" class="text-xs font-black text-rose-600 hidden pt-1">
                ⚠️ Warning: Not enough single pieces in stock!
              </div>
            </div>

            <!-- 3. Prices -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label id="pk-label-price" class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Set ${unitSingular} Sale Price (Rs.) *</label>
                <input type="number" step="any" min="0" id="pk-sale-price" required placeholder="e.g. 250"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-emerald-700 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Packing Date</label>
                <input type="date" id="pk-date" value="${new Date().toISOString().split('T')[0]}"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 font-mono">
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="CartonPacking.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" id="pk-submit-btn" class="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer">
                <i data-lucide="check" class="w-4 h-4"></i> Complete ${unitSingular} Packing
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });

    if (defaultCartonId) {
      this.onCartonSelectChange(defaultCartonId);
    }
  },

  openCartonDropdown() {
    const dropdown = document.getElementById('pk-carton-dropdown');
    if (!dropdown) return;
    const searchVal = document.getElementById('pk-carton-search')?.value || '';
    this.filterCartonDropdown(searchVal);
    if (window.lucide) lucide.createIcons({ root: dropdown });
  },

  toggleCartonDropdown() {
    const dropdown = document.getElementById('pk-carton-dropdown');
    if (!dropdown) return;
    if (dropdown.classList.contains('hidden')) {
      this.openCartonDropdown();
      document.getElementById('pk-carton-search')?.focus();
    } else {
      dropdown.classList.add('hidden');
    }
  },

  filterCartonDropdown(query = '') {
    const dropdown = document.getElementById('pk-carton-dropdown');
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();
    const currentId = Number(document.getElementById('pk-carton-id')?.value) || null;

    let matches = this.cartons || [];
    if (q) {
      matches = matches.filter(c => 
        (c.carton_name || '').toLowerCase().includes(q) ||
        (c.barcode || '').toLowerCase().includes(q)
      );
    }

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="p-4 text-center text-xs font-bold text-slate-400">
          No products match "${query}"
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    this.cartonMatches = matches;
    this.cartonActiveIdx = 0;

    dropdown.innerHTML = matches.map((c, idx) => {
      const isSelected = c.id === currentId;
      const isShoper = c.package_type === 'shoper';
      return `
        <div class="px-3.5 py-2.5 hover:bg-purple-50/80 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-purple-50 font-black text-purple-950' : 'text-slate-800'}"
             onclick="CartonPacking.selectCartonProduct(${c.id})">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-black text-slate-900">${c.carton_name}</span>
              <span class="px-1.5 py-0.2 rounded ${isShoper ? 'bg-sky-50 text-sky-800 border border-sky-300' : 'bg-purple-50 text-purple-800 border border-purple-200'} text-[9px] font-black uppercase">
                ${isShoper ? 'Shoper' : 'Carton'}
              </span>
            </div>
            <div class="text-[10px] text-slate-500 font-bold mt-0.5">Loose Pcs in Stock: <span class="font-black text-slate-700">${c.available_single_pieces || 0} pcs</span></div>
          </div>
          <div class="text-right">
            <span class="text-xs font-mono font-black text-purple-700">Rs. ${c.carton_sale_price || 0}</span>
            <span class="text-[10px] text-slate-400 block font-normal">${c.pieces_per_carton || 0} pcs/${isShoper ? 'shoper' : 'ctn'}</span>
          </div>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');
  },

  selectCartonProduct(id) {
    const c = (this.cartons || []).find(x => x.id === Number(id));
    if (!c) return;
    const hiddenInp = document.getElementById('pk-carton-id');
    const searchInp = document.getElementById('pk-carton-search');
    const dropdown = document.getElementById('pk-carton-dropdown');

    if (hiddenInp) hiddenInp.value = c.id;
    if (searchInp) searchInp.value = c.carton_name;
    if (dropdown) dropdown.classList.add('hidden');

    this.onCartonSelectChange(c.id);
  },

  onCartonKeydown(e) {
    const dropdown = document.getElementById('pk-carton-dropdown');
    if (!dropdown || dropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        this.openCartonDropdown();
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
      if (this.cartonMatches && this.cartonMatches.length > 0) {
        const item = this.cartonMatches[this.cartonActiveIdx || 0] || this.cartonMatches[0];
        if (item) this.selectCartonProduct(item.id);
      }
    }
  },

  onCartonSelectChange(id) {
    const c = this.cartons.find(x => x.id === Number(id));
    if (c) {
      const isShoper = c.package_type === 'shoper';
      const unitSingular = isShoper ? 'Shoper' : 'Carton';
      const unitPlural = isShoper ? 'Shopers' : 'Cartons';

      const unitHeader = document.getElementById('pk-header-unit');
      if (unitHeader) unitHeader.textContent = unitPlural;

      const pcsLabel = document.getElementById('pk-label-pcs');
      if (pcsLabel) pcsLabel.textContent = `Pieces Per ${unitSingular}`;

      const qtyLabel = document.getElementById('pk-label-qty');
      if (qtyLabel) qtyLabel.textContent = `Number of ${unitPlural} to Pack *`;

      const priceLabel = document.getElementById('pk-label-price');
      if (priceLabel) priceLabel.textContent = `Set ${unitSingular} Sale Price (Rs.) *`;

      const costLabel = document.getElementById('pk-label-cost');
      if (costLabel) costLabel.textContent = `Cost Per ${unitSingular}:`;

      const submitBtn = document.getElementById('pk-submit-btn');
      if (submitBtn) {
        submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Complete ${unitSingular} Packing`;
        if (window.lucide) lucide.createIcons({ root: submitBtn });
      }

      document.getElementById('pk-pcs-per-carton').value = c.pieces_per_carton || (isShoper ? 25 : 20);
      document.getElementById('pk-sale-price').value = c.carton_sale_price || 250;
      document.getElementById('pk-available-display').textContent = `${c.available_single_pieces || 0} pieces`;
      this.calcPackingTotal();
    }
  },

  calcPackingTotal() {
    const cartonId = Number(document.getElementById('pk-carton-id')?.value);
    const c = this.cartons.find(x => x.id === cartonId);
    if (!c) return;

    const isShoper = c.package_type === 'shoper';
    const unitAbbr = isShoper ? 'shoper' : 'ctn';
    const unitsAbbr = isShoper ? 'shopers' : 'ctns';

    const pcsPerCarton = Number(document.getElementById('pk-pcs-per-carton')?.value) || (isShoper ? 25 : 20);
    const cartonsQty = Number(document.getElementById('pk-cartons-qty')?.value) || 0;
    const totalPcsNeeded = pcsPerCarton * cartonsQty;

    const singleCost = (c.carton_cost_price && c.pieces_per_carton) ? (c.carton_cost_price / c.pieces_per_carton) : 10;
    const cartonCost = pcsPerCarton * singleCost;
    const totalCost = cartonsQty * cartonCost;

    const pcsDisplay = document.getElementById('pk-pcs-needed-display');
    const costDisplay = document.getElementById('pk-carton-cost-display');
    const totalCostDisplay = document.getElementById('pk-total-cost-display');
    const warning = document.getElementById('pk-insufficient-warning');
    const submitBtn = document.getElementById('pk-submit-btn');

    if (pcsDisplay) pcsDisplay.textContent = `${totalPcsNeeded.toLocaleString()} pieces (${cartonsQty} ${unitsAbbr} × ${pcsPerCarton} pcs)`;
    if (costDisplay) costDisplay.textContent = `Rs. ${Math.round(cartonCost)}`;
    if (totalCostDisplay) totalCostDisplay.textContent = `Rs. ${Math.round(totalCost).toLocaleString()}`;

    const availablePcs = c.available_single_pieces || 0;
    const isExceeding = totalPcsNeeded > availablePcs;
    const isZeroOrNegative = cartonsQty <= 0;
    const qtyInput = document.getElementById('pk-cartons-qty');

    if (isExceeding) {
      if (warning) {
        warning.classList.remove('hidden');
        warning.textContent = `⚠️ Insufficient pieces in stock! Need ${totalPcsNeeded.toLocaleString()} pcs, but only ${availablePcs.toLocaleString()} available.`;
      }
      if (qtyInput) {
        qtyInput.classList.add('border-rose-500', 'bg-rose-50/50', 'text-rose-700');
        qtyInput.classList.remove('border-slate-300', 'text-purple-700');
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.classList.remove('cursor-pointer', 'hover:bg-purple-500', 'active:scale-95');
        submitBtn.title = `Cannot pack: ${totalPcsNeeded} pcs needed exceeds available ${availablePcs} pcs`;
      }
    } else {
      if (warning) warning.classList.add('hidden');
      if (qtyInput) {
        qtyInput.classList.remove('border-rose-500', 'bg-rose-50/50', 'text-rose-700');
        qtyInput.classList.add('border-slate-300', 'text-purple-700');
      }
      if (submitBtn) {
        if (isZeroOrNegative) {
          submitBtn.disabled = true;
          submitBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
          submitBtn.classList.remove('cursor-pointer', 'hover:bg-purple-500', 'active:scale-95');
          submitBtn.title = `Enter number of ${isShoper ? 'shopers' : 'cartons'} to pack`;
        } else {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
          submitBtn.classList.add('cursor-pointer', 'hover:bg-purple-500', 'active:scale-95');
          submitBtn.title = `Complete ${isShoper ? 'Shoper' : 'Carton'} Packing`;
        }
      }
    }
  },

  openCartonConfigModal(id = null) {
    if (id) {
      app.authorizeAction(() => this._renderCartonConfigModal(id), 'editing product configuration');
    } else {
      this._renderCartonConfigModal(null);
    }
  },

  setPackagingType(type) {
    const isShoper = type === 'shoper';
    const hidden = document.getElementById('cfg-package-type');
    if (hidden) hidden.value = type;

    const cartonBtn = document.getElementById('cfg-type-carton-btn');
    const shoperBtn = document.getElementById('cfg-type-shoper-btn');

    if (cartonBtn && shoperBtn) {
      if (isShoper) {
        cartonBtn.className = 'py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100';
        shoperBtn.className = 'py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer bg-sky-600 text-white border-sky-600 shadow-sm';
      } else {
        cartonBtn.className = 'py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer bg-purple-600 text-white border-purple-600 shadow-sm';
        shoperBtn.className = 'py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100';
      }
    }

    const titleHeader = document.getElementById('cfg-modal-title');
    if (titleHeader) titleHeader.textContent = isShoper ? 'Shoper Product Configuration' : 'Carton Product Configuration';

    const nameLabel = document.getElementById('cfg-label-name');
    const nameInput = document.getElementById('cfg-name');
    const pcsLabel = document.getElementById('cfg-label-pcs');
    const pcsInput = document.getElementById('cfg-pcs');
    const stockLabel = document.getElementById('cfg-label-stock');
    const costLabel = document.getElementById('cfg-label-cost');
    const saleLabel = document.getElementById('cfg-label-sale');
    const saveBtn = document.getElementById('cfg-save-btn');
    const costCalc = document.getElementById('cfg-label-cost-calc');

    if (nameLabel) nameLabel.textContent = isShoper ? 'Shoper Full Title *' : 'Carton Full Title *';
    if (nameInput) {
      nameInput.placeholder = isShoper ? 'e.g. Ice Lolly Shoper (25 Pcs)...' : 'e.g. Chocbar Carton (20 Pcs)...';
      // If current title ends with carton or shoper, swap it
      if (nameInput.value.endsWith('Carton')) {
        nameInput.value = nameInput.value.replace(/Carton$/, 'Shoper');
      } else if (nameInput.value.endsWith('Shoper')) {
        nameInput.value = nameInput.value.replace(/Shoper$/, 'Carton');
      }
    }
    if (pcsLabel) pcsLabel.textContent = isShoper ? 'Pieces Per Shoper *' : 'Pieces Per Carton *';
    if (pcsInput && (!pcsInput.value || pcsInput.value === '20' || pcsInput.value === '25')) {
      pcsInput.value = isShoper ? 25 : 20;
    }
    if (stockLabel) stockLabel.textContent = isShoper ? 'Warehouse Shopers Stock' : 'Warehouse Cartons Stock';
    if (costLabel) costLabel.textContent = isShoper ? 'Shoper Cost (Rs.)' : 'Carton Cost (Rs.)';
    if (saleLabel) saleLabel.textContent = isShoper ? 'Shoper Sale Price (Rs.) *' : 'Carton Sale Price (Rs.) *';
    if (saveBtn) saveBtn.textContent = isShoper ? 'Save Shoper Config' : 'Save Carton Config';
    if (costCalc) costCalc.textContent = isShoper ? '(Cost × Shopers Stock)' : '(Cost × Cartons Stock)';

    if (window.lucide) lucide.createIcons();
  },

  _renderCartonConfigModal(id = null) {
    const c = id ? this.cartons.find(x => x.id === id) : {
      id: null,
      item_id: this.singleItems[0]?.id || null,
      package_type: 'carton',
      carton_name: '',
      pieces_per_carton: 20,
      carton_cost_price: 200,
      carton_sale_price: 250,
      carton_wholesale_price: 240,
      factory_carton_stock: 0
    };
    if (!c) return;

    const isNew = !c.id;
    const isShoper = c.package_type === 'shoper';
    const hasBarcode = Boolean(c && c.barcode && c.barcode.trim());
    const initStockVal = isNew ? 0 : ((Number(c.factory_carton_stock) || 0) * (Number(c.carton_cost_price) || 0));
    const activeItem = this.singleItems.find(it => it.id === c.item_id) || this.singleItems[0];

    const modalEl = document.getElementById('pck-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) CartonPacking.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <h3 id="cfg-modal-title" class="text-base font-black tracking-tight">${c.id ? (isShoper ? 'Edit Shoper Product' : 'Edit Carton Product') : 'New Product Configuration'}</h3>
            <button onclick="CartonPacking.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="CartonPacking.handleCartonConfigSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="cfg-id" value="${c.id || ''}">
            
            <!-- Packaging Format Toggle: Carton vs Shoper -->
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Packaging Format *</label>
              <input type="hidden" id="cfg-package-type" value="${c.package_type || 'carton'}">
              <div class="grid grid-cols-2 gap-2">
                <button type="button" id="cfg-type-carton-btn" onclick="CartonPacking.setPackagingType('carton')"
                        class="py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer ${!isShoper ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'}">
                  <i data-lucide="package" class="w-4 h-4"></i> Carton (ctn)
                </button>
                <button type="button" id="cfg-type-shoper-btn" onclick="CartonPacking.setPackagingType('shoper')"
                        class="py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer ${isShoper ? 'bg-sky-600 text-white border-sky-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'}">
                  <i data-lucide="shopping-bag" class="w-4 h-4"></i> Shoper (bag)
                </button>
              </div>
            </div>

            <div class="relative dropdown-wrap" id="cfg-item-wrap">
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Base Ice Cream Item *</label>
              <input type="hidden" id="cfg-item-id" value="${activeItem ? activeItem.id : ''}">
              
              <div class="relative">
                <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                <input type="text" id="cfg-item-search" autocomplete="off"
                       placeholder="Type to search base ice cream..."
                       value="${activeItem ? activeItem.name : ''}"
                       onfocus="CartonPacking.openBaseItemDropdown()"
                       onclick="CartonPacking.openBaseItemDropdown()"
                       oninput="CartonPacking.filterBaseItemDropdown(this.value)"
                       onkeydown="CartonPacking.onBaseItemKeydown(event)"
                       class="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 transition-all cursor-pointer">
                <button type="button" onclick="CartonPacking.toggleBaseItemDropdown()"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer">
                  <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </button>
              </div>

              <!-- Floating Searchable Dropdown -->
              <div id="cfg-item-dropdown" class="search-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden hidden max-h-56 overflow-y-auto z-[1300] divide-y divide-slate-100">
              </div>
            </div>

            <div>
              <label id="cfg-label-name" class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">${isShoper ? 'Shoper Full Title *' : 'Carton Full Title *'}</label>
              <input type="text" id="cfg-name" required value="${c.carton_name || ''}" placeholder="${isShoper ? 'e.g. Ice Lolly Shoper (25 Pcs)...' : 'e.g. Chocbar Carton (20 Pcs)...'}"
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500">
            </div>

            <div id="cfg-barcode-wrap">
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1 flex items-center justify-between">
                <span>Barcode</span>
                ${hasBarcode ? `
                  <span class="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                    <i data-lucide="lock" class="w-3 h-3 text-slate-400"></i> Permanent Barcode (Locked)
                  </span>
                ` : `
                  <button type="button" id="cfg-btn-gen-barcode" onclick="CartonPacking.generateConfigBarcode()" class="text-[10px] text-purple-600 hover:text-purple-700 font-bold cursor-pointer transition-colors">+ Auto Generate</button>
                `}
              </label>
              <div class="relative">
                <input type="text" id="cfg-barcode" value="${c.barcode || ''}" placeholder="Scan barcode with scanner or click generate..."
                       ${hasBarcode ? 'readonly' : ''}
                       class="w-full pl-3.5 pr-8 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 ${hasBarcode ? 'bg-slate-100 cursor-not-allowed text-slate-600' : 'bg-slate-50'}">
                <i data-lucide="${hasBarcode ? 'lock' : 'scan-barcode'}" class="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
              <p class="text-[10px] text-slate-400 mt-1 font-medium">Barcode can only be generated once and remains permanently linked to this product.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label id="cfg-label-pcs" class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">${isShoper ? 'Pieces Per Shoper *' : 'Pieces Per Carton *'}</label>
                <input type="number" step="1" min="1" id="cfg-pcs" value="${isNew ? (isShoper ? 25 : 20) : (c.pieces_per_carton || '')}" placeholder="${isShoper ? '25' : '20'}" required
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
              <div>
                <label id="cfg-label-stock" class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">${isShoper ? 'Warehouse Shopers Stock' : 'Warehouse Cartons Stock'}</label>
                <input type="number" step="1" min="0" id="cfg-stock" value="${isNew ? '' : (c.factory_carton_stock ?? '')}" placeholder="0"
                       oninput="CartonPacking.calcConfigValue()"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label id="cfg-label-cost" class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">${isShoper ? 'Shoper Cost (Rs.)' : 'Carton Cost (Rs.)'}</label>
                <input type="number" step="any" min="0" id="cfg-cost" value="${isNew ? '' : (c.carton_cost_price ?? '')}" placeholder="200" required
                       oninput="CartonPacking.calcConfigValue()"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
              <div>
                <label id="cfg-label-sale" class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">${isShoper ? 'Shoper Sale Price (Rs.) *' : 'Carton Sale Price (Rs.) *'}</label>
                <input type="number" step="any" min="0" id="cfg-sale" value="${isNew ? '' : (c.carton_sale_price ?? '')}" placeholder="250" required
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-emerald-700 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
            </div>

            <!-- Total Stock Value Display (Cost x Units Stock) -->
            <div class="bg-purple-50/80 border border-purple-200/90 rounded-xl p-2.5 px-3.5 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="calculator" class="w-4 h-4 text-purple-600"></i>
                <div>
                  <span class="text-[11px] font-black uppercase text-purple-900 tracking-wider block">Total Stock Value</span>
                  <span id="cfg-label-cost-calc" class="text-[10px] text-purple-600 font-bold block">${isShoper ? '(Cost × Shopers Stock)' : '(Cost × Cartons Stock)'}</span>
                </div>
              </div>
              <div class="text-right">
                <span id="cfg-stock-value" class="font-mono font-black text-sm text-purple-800 tabular-nums">
                  Rs. ${Math.round(initStockVal).toLocaleString()}
                </span>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="CartonPacking.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" id="cfg-save-btn" class="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">${isShoper ? 'Save Shoper Config' : 'Save Carton Config'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  openBaseItemDropdown() {
    const dropdown = document.getElementById('cfg-item-dropdown');
    if (!dropdown) return;
    const searchVal = document.getElementById('cfg-item-search')?.value || '';
    this.filterBaseItemDropdown(searchVal);
    if (window.lucide) lucide.createIcons({ root: dropdown });
  },

  toggleBaseItemDropdown() {
    const dropdown = document.getElementById('cfg-item-dropdown');
    if (!dropdown) return;
    if (dropdown.classList.contains('hidden')) {
      this.openBaseItemDropdown();
      document.getElementById('cfg-item-search')?.focus();
    } else {
      dropdown.classList.add('hidden');
    }
  },

  filterBaseItemDropdown(query = '') {
    const dropdown = document.getElementById('cfg-item-dropdown');
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();
    const currentId = Number(document.getElementById('cfg-item-id')?.value) || null;

    let matches = this.singleItems || [];
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

    this.baseItemMatches = matches;
    this.baseItemActiveIdx = 0;

    dropdown.innerHTML = matches.map((it, idx) => {
      const isSelected = it.id === currentId;
      return `
        <div class="px-3.5 py-2 hover:bg-purple-50/80 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-purple-50 font-black text-purple-950' : 'text-slate-800'}"
             onclick="CartonPacking.selectBaseItem(${it.id})">
          <div class="text-xs font-black text-slate-900">${it.name}</div>
          <span class="text-[10px] text-slate-400 font-mono">ID: #${it.id}</span>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');
  },

  selectBaseItem(id) {
    const it = (this.singleItems || []).find(x => x.id === Number(id));
    if (!it) return;
    const hiddenInp = document.getElementById('cfg-item-id');
    const searchInp = document.getElementById('cfg-item-search');
    const dropdown = document.getElementById('cfg-item-dropdown');

    if (hiddenInp) hiddenInp.value = it.id;
    if (searchInp) searchInp.value = it.name;
    if (dropdown) dropdown.classList.add('hidden');

    const nameInp = document.getElementById('cfg-name');
    const isShoper = (document.getElementById('cfg-package-type')?.value || 'carton') === 'shoper';
    if (nameInp && (!nameInp.value || nameInp.value.endsWith('Carton') || nameInp.value.endsWith('Shoper'))) {
      nameInp.value = `${it.name} ${isShoper ? 'Shoper' : 'Carton'}`;
    }
  },

  onBaseItemKeydown(e) {
    const dropdown = document.getElementById('cfg-item-dropdown');
    if (!dropdown || dropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        this.openBaseItemDropdown();
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
      if (this.baseItemMatches && this.baseItemMatches.length > 0) {
        const item = this.baseItemMatches[this.baseItemActiveIdx || 0] || this.baseItemMatches[0];
        if (item) this.selectBaseItem(item.id);
      }
    }
  },

  closeModal() {
    const modalEl = document.getElementById('pck-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async handlePackingSubmit(e) {
    e.preventDefault();
    const cartonId = Number(document.getElementById('pk-carton-id').value);
    const cartonsPacked = Number(document.getElementById('pk-cartons-qty').value);
    const pcsPerCarton = Number(document.getElementById('pk-pcs-per-carton').value);
    const salePrice = Number(document.getElementById('pk-sale-price').value);

    const c = this.cartons.find(x => x.id === cartonId);
    const totalPcsNeeded = pcsPerCarton * cartonsPacked;
    const availablePcs = c?.available_single_pieces || 0;

    // Silently block if exceeding or invalid (button is already disabled)
    if (!cartonId || cartonsPacked <= 0 || totalPcsNeeded > availablePcs) {
      this.calcPackingTotal();
      return;
    }

    const singleCost = (c && c.carton_cost_price && c.pieces_per_carton) ? (c.carton_cost_price / c.pieces_per_carton) : 10;
    const cartonCost = pcsPerCarton * singleCost;

    const data = {
      carton_id: cartonId,
      cartons_packed: cartonsPacked,
      pieces_per_carton: pcsPerCarton,
      carton_cost: cartonCost,
      carton_sale_price: salePrice,
      date: document.getElementById('pk-date').value
    };

    const res = await window.api.runCartonPacking(data);
    if (res && res.success) {
      this.closeModal();
      const isShoper = c?.package_type === 'shoper';
      const unitPlural = isShoper ? 'shopers' : 'cartons';
      app.showToast(`Packed +${cartonsPacked} ${unitPlural} successfully! (${res.totalPiecesNeeded} pcs consumed)`, 'success');
      await this.loadData();
    } else {
      // Show error inline in modal instead of popup alert
      const warning = document.getElementById('pk-insufficient-warning');
      const submitBtn = document.getElementById('pk-submit-btn');
      if (warning) {
        warning.classList.remove('hidden');
        warning.textContent = `⚠️ ${res.error || 'Failed to pack.'}`;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
      }
    }
  },

  generateConfigBarcode() {
    const inp = document.getElementById('cfg-barcode');
    if (!inp) return;
    if (inp.value && inp.value.trim()) {
      app.showToast('Barcode has already been generated and cannot be re-generated.', 'info');
      return;
    }
    const code = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    inp.value = code;
    inp.readOnly = true;
    inp.classList.remove('bg-slate-50');
    inp.classList.add('bg-slate-100', 'cursor-not-allowed', 'text-slate-600');

    const btn = document.getElementById('cfg-btn-gen-barcode');
    if (btn) {
      btn.outerHTML = `<span class="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Generated (Locked)</span>`;
    }
    const wrap = document.getElementById('cfg-barcode-wrap');
    if (wrap && window.lucide) lucide.createIcons({ root: wrap });

    app.showToast('Barcode generated and permanently locked!', 'success');
  },

  calcConfigValue() {
    const stock = Number(document.getElementById('cfg-stock')?.value) || 0;
    const cost = Number(document.getElementById('cfg-cost')?.value) || 0;
    const total = stock * cost;
    const el = document.getElementById('cfg-stock-value');
    if (el) {
      el.textContent = `Rs. ${Math.round(total).toLocaleString()}`;
    }
  },

  async handleCartonConfigSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('cfg-id').value;
    const data = {
      id: id ? Number(id) : null,
      item_id: Number(document.getElementById('cfg-item-id').value),
      carton_name: document.getElementById('cfg-name').value,
      package_type: document.getElementById('cfg-package-type')?.value || 'carton',
      pieces_per_carton: Number(document.getElementById('cfg-pcs').value) || 20,
      factory_carton_stock: Number(document.getElementById('cfg-stock').value) || 0,
      carton_cost_price: Number(document.getElementById('cfg-cost').value) || 0,
      carton_sale_price: Number(document.getElementById('cfg-sale').value) || 0,
      barcode: (document.getElementById('cfg-barcode')?.value || '').trim()
    };

    const res = await window.api.savePackedCarton(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast('Product configuration saved!', 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to save product config.' });
    }
  },

  async deleteCarton(id) {
    app.authorizeAction(async () => {
      const c = (this.cartons || []).find(x => x.id === id);
      const name = c ? c.carton_name : 'this carton product';
      const ok = await new Promise(resolve => {
        app.showConfirm({
          title: 'Delete Carton Product?',
          message: `Are you sure you want to delete "${name}"?<br><br><span class="text-rose-600 font-bold">This carton variant definition will be permanently removed.</span>`,
          confirmText: 'Delete Carton',
          confirmColor: 'red',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (ok) {
        const res = await window.api.deletePackedCarton(id);
        if (res && res.success) {
          app.showToast('Carton product deleted successfully.', 'success');
          await this.loadData();
        } else {
          app.showAlert({ title: 'Cannot Delete', message: res.error || 'Failed to delete carton product.' });
        }
      }
    }, 'deleting carton product');
  },

  async deleteBatch(id) {
    app.authorizeAction(async () => {
      const ok = await new Promise(resolve => {
        app.showConfirm({
          title: 'Delete Packing Batch?',
          message: 'Are you sure? This will reverse the stock (cartons deducted, single pieces restored).',
          confirmText: 'Delete Batch',
          confirmColor: 'red',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (ok) {
        const res = await window.api.deletePackingBatch(id);
        if (res && res.success) {
          app.showToast('Packing batch reversed', 'success');
          await this.loadData();
        } else {
          app.showAlert({ title: 'Error', message: res.error || 'Failed to reverse batch.' });
        }
      }
    }, 'deleting packing batch');
  },

  printReport() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Ice Cream Factory';
    const date = new Date().toLocaleDateString('en-GB');

    const whCtns = this.cartons.filter(c => (c.package_type || 'carton') !== 'shoper').reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);
    const whShopers = this.cartons.filter(c => c.package_type === 'shoper').reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);
    const totalWarehouseUnits = whCtns + whShopers;

    const carCtns = this.cartons.filter(c => (c.package_type || 'carton') !== 'shoper').reduce((sum, c) => sum + (c.total_loaded_in_cars || 0), 0);
    const carShopers = this.cartons.filter(c => c.package_type === 'shoper').reduce((sum, c) => sum + (c.total_loaded_in_cars || 0), 0);
    const totalLoaded = carCtns + carShopers;

    const totalVal = this.cartons.reduce((sum, c) => sum + ((c.factory_carton_stock || 0) * (c.carton_sale_price || 0)), 0);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 600;">Date: ${app.formatDateTime(new Date())} | Warehouse Finished Stock &amp; Cars Loaded Stock</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          STAGE 3: FINISHED GOODS (CARTONS &amp; SHOPERS) INVENTORY REPORT
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Item / Packaging</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 65px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Packing</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 65px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Warehouse</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 60px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">In Cars</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 65px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Total Stock</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 65px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Sale Rate</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Stock Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.cartons.map((c, idx) => {
              const isShoper = c.package_type === 'shoper';
              const unitAbbr = isShoper ? 'shoper' : 'ctn';
              const unitsAbbr = isShoper ? 'shopers' : 'ctns';
              return `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; font-weight: 800; color: #000;">
                  ${c.carton_name}
                  <span style="font-size: 8px; font-weight: 700; text-transform: uppercase; border: 1px solid #000; padding: 0.5px 3px; border-radius: 3px; margin-left: 3px;">${isShoper ? 'Shoper' : 'Carton'}</span>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9.5px; color: #000;">${c.pieces_per_carton} pcs/${unitAbbr}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${c.factory_carton_stock} ${unitsAbbr}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 9.5px; color: #000;">${c.total_loaded_in_cars || 0} ${unitsAbbr}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${(c.factory_carton_stock || 0) + (c.total_loaded_in_cars || 0)} ${unitsAbbr}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${c.carton_sale_price}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round((c.factory_carton_stock || 0) * c.carton_sale_price).toLocaleString()}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 5px 0; font-size: 9.5px; font-weight: 900; color: #000;">
          <span>WH: ${totalWarehouseUnits} units (${whCtns} ctns, ${whShopers} shopers) | CARS: ${totalLoaded} (${carCtns} ctns, ${carShopers} shopers)</span>
          <span style="font-family: -apple-system, monospace;">WH SALE VALUE: Rs. ${Math.round(totalVal).toLocaleString()}</span>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Finished Goods Warehouse Incharge
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Managing Director Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Finished Goods (Cartons & Shopers) Report (A5)');
  },

  async printPackingSlip(batchId) {
    try {
      app.showLoading();
      const batch = await window.api.getPackingBatch(batchId);
      app.hideLoading();
      if (!batch) {
        app.showAlert({ title: 'Error', message: 'Packing batch record not found.' });
        return;
      }

      const settings = app.settings || {};
      const company = settings.company_name || 'Delicious Superstar Foods';
      const address = settings.address || 'Hasan Abdal';
      const phone = settings.phone || '0315-6795995';
      const isShoper = (batch.package_type || 'carton') === 'shoper';
      const unitLabel = isShoper ? 'Shoper' : 'Carton';
      const unitsLabel = isShoper ? 'Shopers' : 'Cartons';

      const html = `
        <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; background: #fff; box-sizing: border-box; font-size: 9.5px; line-height: 1.35;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
            <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
            <p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${address}</p>
            <p style="font-size: 9px; color: #000; margin: 1px 0 0 0; font-weight: 500;">Tel: ${phone}</p>
          </div>

          <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
            PACKAGING VOUCHER &amp; WAREHOUSE INWARD SLIP
          </div>

          <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; padding: 5px 8px; background: #fff; border: 1px solid #000; color: #000;">
            <div>
              <div><strong>Packing Batch #:</strong> ${batch.packing_number}</div>
              <div><strong>Packaged Product:</strong> <strong>${batch.item_name} (${unitLabel})</strong></div>
              <div><strong>Total Packed:</strong> <strong>+${batch.cartons_packed} ${unitsLabel}</strong></div>
            </div>
            <div style="text-align: right;">
              <div><strong>Packing Date:</strong> ${app.formatDateTime(batch.date, batch.created_at)}</div>
              <div><strong>Pieces Consumed:</strong> -${batch.total_pieces_consumed} pcs</div>
              <div><strong>Total Pack Cost:</strong> <strong>Rs. ${Math.round(batch.total_cost).toLocaleString()}</strong></div>
            </div>
          </div>

          <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin: 6px 0; background: #fff;">
            <thead>
              <tr style="background: #fff; border-bottom: 1.5px solid #000;">
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; color: #000;">Item Name</th>
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-weight: 900; color: #000;">Type &amp; Pack Size</th>
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; color: #000;">Qty Packed</th>
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; color: #000;">Cost / Pack</th>
                <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; color: #000;">Wholesale Sale Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #000; padding: 6px; font-weight: 800; color: #000;">${batch.item_name}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; color: #000;">${unitLabel} (${batch.pieces_per_carton} pcs/${unitLabel.toLowerCase()})</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: 900; color: #000;">${batch.cartons_packed} ${unitsLabel}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right; font-family: monospace; color: #000;">Rs. ${batch.carton_cost}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right; font-family: monospace; font-weight: 900; color: #000;">Rs. ${batch.carton_sale_price}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: #fff; font-weight: 900; border-top: 1.5px solid #000; color: #000;">
                <td colspan="3" style="border: 1px solid #000; padding: 4px 6px; text-align: right; text-transform: uppercase;">Total Stock Manufacturing Value:</td>
                <td colspan="2" style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: monospace;">Rs. ${Math.round(batch.total_cost).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          ${batch.notes ? `
            <div style="border: 1px solid #000; padding: 4px 8px; font-size: 9px; margin-top: 4px; background: #fff; color: #000;">
              <strong>Remarks:</strong> ${batch.notes}
            </div>
          ` : ''}

          <div class="a5-signatures" style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 9px;">
            <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; padding-top: 4px; font-weight: 800; text-transform: uppercase; color: #000;">
              Packaging Floor Incharge
            </div>
            <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; padding-top: 4px; font-weight: 800; text-transform: uppercase; color: #000;">
              Warehouse Stock Receiver
            </div>
          </div>
        </div>
      `;

      app.showA5Preview(html, `Packaging Voucher (${batch.packing_number})`);
    } catch (err) {
      app.hideLoading();
      app.showAlert({ title: 'Error', message: err.message });
    }
  },

  openEditBatchModal(batchId) {
    const batch = (this.batches || []).find(b => b.id === batchId);
    if (!batch) return;
    const container = this.getModalContainer();
    const dVal = (batch.date || '').split('T')[0] || new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4 animate-in fade-in duration-150" onclick="if(event.target===this) CartonPacking.closeModal()">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
          <div class="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div class="flex items-center gap-2">
              <i data-lucide="edit-3" class="w-5 h-5 text-amber-400"></i>
              <h3 class="font-black text-sm text-white">Edit Packing Batch (${batch.packing_number})</h3>
            </div>
            <button onclick="CartonPacking.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="CartonPacking.saveEditedBatch(event, ${batch.id})" class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Product Packaged</label>
              <input type="text" value="${batch.item_name} (+${batch.cartons_packed} packed)" disabled class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none">
            </div>
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Packing Date *</label>
              <input type="date" id="edit-pack-date" value="${dVal}" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500">
            </div>
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Remarks / Packaging Notes</label>
              <textarea id="edit-pack-notes" rows="3" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500">${batch.notes || ''}</textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" onclick="CartonPacking.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: container });
  },

  async saveEditedBatch(e, batchId) {
    e.preventDefault();
    const date = document.getElementById('edit-pack-date')?.value;
    const notes = document.getElementById('edit-pack-notes')?.value;
    try {
      app.showLoading();
      const res = await window.api.updatePackingBatch(batchId, { date, notes });
      app.hideLoading();
      if (res && res.error) {
        app.showAlert({ title: 'Error', message: res.error });
        return;
      }
      this.closeModal();
      app.showToast('Packing batch updated successfully', 'success');
      await this.loadData();
    } catch (err) {
      app.hideLoading();
      app.showAlert({ title: 'Error', message: err.message });
    }
  }
};
