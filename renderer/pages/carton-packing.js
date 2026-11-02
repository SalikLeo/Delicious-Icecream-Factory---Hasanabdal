// Stage 3: Carton Packing (Single Items -> Packed Cartons / Actual Sellable Stock)
window.CartonPacking = {
  cartons: [],
  singleItems: [],
  batches: [],
  activeTab: 'inventory', // 'inventory' | 'batches'
  searchQuery: '',
  periodType: 'day', // 'day' | 'month' | 'all'
  selectedDate: new Date().toISOString().slice(0, 10),

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

  renderUI() {
    if (!this.container) return;

    const totalVariants = this.cartons.length;
    const totalWarehouseCartons = this.cartons.reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);
    const totalInCars = this.cartons.reduce((sum, c) => sum + (c.total_loaded_in_cars || 0), 0);
    const totalFinishedStock = totalWarehouseCartons + totalInCars;
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
              <h2 class="text-2xl font-black tracking-tight text-white">Carton Packing (Sellable Inventory)</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Pack loose pieces into sellable cartons (e.g. 5 cartons of 20 pcs = 100 pcs consumed @ Rs. 200/carton cost, set sale price).</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="CartonPacking.openPackModal()" class="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 active:scale-95 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="package-plus" class="w-4 h-4"></i> Pack Cartons Now
            </button>
            <button onclick="CartonPacking.openCartonConfigModal()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer">
              <i data-lucide="settings" class="w-4 h-4 text-purple-400"></i> New Carton Type
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
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Warehouse Cartons</p>
              <h3 class="text-2xl font-black text-purple-700 mt-1 tabular-nums">${totalWarehouseCartons.toLocaleString()} <span class="text-xs font-bold text-slate-400">cartons</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <i data-lucide="warehouse" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Loaded in Cars</p>
              <h3 class="text-2xl font-black text-blue-600 mt-1 tabular-nums">${totalInCars.toLocaleString()} <span class="text-xs font-bold text-slate-400">cartons</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <i data-lucide="truck" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Finished Cartons</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">${totalFinishedStock.toLocaleString()} <span class="text-xs font-bold text-slate-400">total</span></h3>
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
              Ready-to-Sell Carton Stock
            </button>
            <button onclick="CartonPacking.switchTab('batches')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'batches' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Packing Batches Log
            </button>
          </div>

          <!-- Controls: Search + Time Filters -->
          <div class="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
            <!-- Search -->
            <div class="relative w-full sm:w-52">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" placeholder="Search carton item..." value="${this.searchQuery}" oninput="CartonPacking.onSearch(this.value)"
                     class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-400">
            </div>

            <!-- Period Switcher: Daily | Monthly | Annual | All -->
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
              <button type="button" onclick="CartonPacking.setPeriod('all')" id="pck-tab-all"
                      class="px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all ${this.periodType === 'all' ? 'font-black bg-white text-slate-900 shadow-2xs' : 'font-bold text-slate-500 hover:text-slate-900'}">
                All
              </button>
            </div>

            <!-- Date Picker for Day/Month/Year -->
            ${this.periodType !== 'all' ? `
              <div id="pck-date-picker-wrap" class="shrink-0">
                ${this.periodType === 'year' ? `
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
      : (this.periodType === 'month' ? `Month (${this.selectedDate.slice(5, 7)}/${this.selectedDate.slice(0, 4)})` : `Annual (${this.selectedDate.slice(0, 4)})`);
    const badgeText = this.periodType === 'day' 
      ? 'Daily Packing' 
      : (this.periodType === 'month' ? 'Monthly Packing' : 'Annual Packing');
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
          <div>Cartons Packed: <span class="font-black text-purple-800 font-mono">+${stats.totalCartonsPacked.toLocaleString()} ctns</span></div>
          <div>Pcs Consumed: <span class="font-black text-rose-700 font-mono">-${stats.totalPiecesConsumed.toLocaleString()} pcs</span></div>
          <div>Sale Value: <span class="font-black text-emerald-700 font-mono">Rs. ${Math.round(stats.totalSaleValue).toLocaleString()}</span></div>
        </div>
      </div>
    `;
  },

  renderContentArea() {
    const filtered = (this.cartons || []).filter(c => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (c.carton_name || '').toLowerCase().includes(q) || (c.item_name || '').toLowerCase().includes(q);
    });
    return this.activeTab === 'inventory' ? this.renderInventoryTable(filtered) : this.renderBatchesTable();
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

  onDateChange(val) {
    if (!val) return;
    this.selectedDate = val;
    this.updateContentArea();
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
    let list = this.batches || [];
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
        (b.packing_number || '').toLowerCase().includes(q) ||
        (b.item_name || '').toLowerCase().includes(q) ||
        (b.carton_name || '').toLowerCase().includes(q)
      );
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

  renderInventoryTable(cartons) {
    if (cartons.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="package-x" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No packed cartons configured</h4>
          <p class="text-xs text-slate-400 mt-1">Click "+ New Carton Type" to register carton packing rules.</p>
        </div>
      `;
    }

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-3 px-4 border-r border-slate-200">Carton Item</th>
              <th class="py-3 px-4 text-center border-r border-slate-200">Packing Spec</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Factory Warehouse Stock</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Loaded in Cars</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Carton Cost</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Carton Sale Price</th>
              <th class="py-3 px-4 text-right font-black text-slate-800 border-r border-slate-200">Warehouse Value</th>
              <th class="py-3 px-4 text-center border-r border-slate-200">Loose Pcs in Pool</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${cartons.map(c => {
              const stock = c.factory_carton_stock || 0;
              const loaded = c.total_loaded_in_cars || 0;
              const pcsAvailable = c.available_single_pieces || 0;
              const val = Math.round(stock * (c.carton_sale_price || 0));

              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-3.5 px-4 border-r border-slate-200">
                    <div class="font-black text-slate-900 text-sm">${c.carton_name}</div>
                    <div class="text-[11px] text-slate-400">Base: ${c.base_item_name}</div>
                  </td>
                  <td class="py-3.5 px-4 text-center border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-mono text-[11px] font-black border border-purple-200">
                      ${c.pieces_per_carton} pcs/ctn
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right border-r border-slate-200">
                    <span class="text-base font-black ${stock > 0 ? 'text-purple-700' : 'text-slate-400'} tabular-nums">
                      ${stock.toLocaleString()}
                    </span>
                    <span class="text-xs font-bold text-slate-400">ctns</span>
                  </td>
                  <td class="py-3.5 px-4 text-right border-r border-slate-200">
                    <span class="text-sm font-black ${loaded > 0 ? 'text-blue-600' : 'text-slate-400'} tabular-nums">
                      ${loaded.toLocaleString()}
                    </span>
                    <span class="text-xs font-bold text-slate-400">ctns</span>
                  </td>
                  <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-600 tabular-nums border-r border-slate-200">
                    Rs. ${c.carton_cost_price}
                  </td>
                  <td class="py-3.5 px-4 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">
                    Rs. ${c.carton_sale_price}
                  </td>
                  <td class="py-3.5 px-4 text-right font-black text-emerald-700 tabular-nums border-r border-slate-200">
                    Rs. ${val.toLocaleString()}
                  </td>
                  <td class="py-3.5 px-4 text-center border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-full ${pcsAvailable >= c.pieces_per_carton ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' : 'bg-rose-50 text-rose-700 border border-rose-200'} text-[10px] font-black">
                      ${pcsAvailable} pcs available
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="CartonPacking.openPackModal(${c.id})" class="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer">
                        <i data-lucide="package" class="w-3.5 h-3.5"></i> Pack
                      </button>
                      <button onclick="CartonPacking.openCartonConfigModal(${c.id})" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer" title="Edit Pricing/Spec">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
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
          <p class="text-xs text-slate-400 mt-1">Pack cartons to record batch history.</p>
        </div>
      `;
    }

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-3 px-4 border-r border-slate-200">Packing #</th>
              <th class="py-3 px-4 border-r border-slate-200 whitespace-nowrap min-w-[95px]">Date</th>
              <th class="py-3 px-4 border-r border-slate-200">Item Packed</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Cartons Packed</th>
              <th class="py-3 px-4 text-center border-r border-slate-200">Spec</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Single Pcs Consumed</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Carton Cost</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Total Cost</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Sale Price</th>
              <th class="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${batches.map(b => `
              <tr class="hover:bg-slate-50/60 transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-purple-800 border-r border-slate-200">${b.packing_number}</td>
                <td class="py-3 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap border-r border-slate-200">${app.formatDateTime(b.date, b.created_at)}</td>
                <td class="py-3 px-4 font-black text-slate-900 border-r border-slate-200">${b.item_name}</td>
                <td class="py-3 px-4 text-right font-black text-purple-700 text-sm tabular-nums border-r border-slate-200">
                  +${b.cartons_packed} ctns
                </td>
                <td class="py-3 px-4 text-center font-mono text-[11px] text-slate-500 border-r border-slate-200">${b.pieces_per_carton} pcs/ctn</td>
                <td class="py-3 px-4 text-right font-mono font-bold text-rose-600 tabular-nums border-r border-slate-200">-${b.total_pieces_consumed} pcs</td>
                <td class="py-3 px-4 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200">Rs. ${b.carton_cost}</td>
                <td class="py-3 px-4 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">Rs. ${Math.round(b.total_cost).toLocaleString()}</td>
                <td class="py-3 px-4 text-right font-black text-emerald-700 tabular-nums border-r border-slate-200">Rs. ${b.carton_sale_price}</td>
                <td class="py-3 px-4 text-right">
                  <button onclick="CartonPacking.deleteBatch(${b.id})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer" title="Delete &amp; Reverse Stock">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
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

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) CartonPacking.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
          <div class="bg-purple-950 py-4 px-6 text-white flex justify-between items-center border-b border-purple-800">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-purple-400 text-slate-950 font-mono text-[10px] font-black">STAGE 3</span>
                <h3 class="text-base font-black tracking-tight">Pack Single Pieces into Cartons</h3>
              </div>
              <p class="text-[11px] text-purple-300 mt-0.5">Deducts loose pieces from pool and adds ready cartons to factory stock</p>
            </div>
            <button onclick="CartonPacking.closeModal()" class="text-purple-300 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <form onsubmit="CartonPacking.handlePackingSubmit(event)" class="p-6 space-y-4">
            <!-- 1. Select Carton Product -->
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Select Carton Product *</label>
              <select id="pk-carton-id" required onchange="CartonPacking.onCartonSelectChange(this.value)"
                      class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500">
                <option value="">-- Choose Carton Product --</option>
                ${this.cartons.map(c => `
                  <option value="${c.id}" ${c.id === defaultCartonId ? 'selected' : ''}>
                    ${c.carton_name} (Loose Pcs in Pool: ${c.available_single_pieces || 0} pcs)
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Single Pcs Available Banner -->
            <div id="pk-pool-indicator" class="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span class="font-bold text-slate-600">Available Single Pieces in Pool:</span>
              <span id="pk-available-display" class="font-black text-slate-900 tabular-nums">0 pcs</span>
            </div>

            <!-- 2. Quantity & Pcs per carton -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Pieces Per Carton</label>
                <input type="number" step="1" min="1" id="pk-pcs-per-carton" value="20" required oninput="CartonPacking.calcPackingTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Number of Cartons to Pack *</label>
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
                <span class="font-bold text-purple-900">Cost Per Carton:</span>
                <span id="pk-carton-cost-display" class="font-black text-purple-900 tabular-nums">Rs. 0</span>
              </div>
              <div class="flex justify-between items-center pt-1 border-t border-purple-200/80 text-sm font-black">
                <span class="text-purple-950">Total Packing Cost:</span>
                <span id="pk-total-cost-display" class="text-purple-700 tabular-nums">Rs. 0</span>
              </div>
              <div id="pk-insufficient-warning" class="text-xs font-black text-rose-600 hidden pt-1">
                ⚠️ Warning: Not enough single pieces in production pool!
              </div>
            </div>

            <!-- 3. Prices -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Set Carton Sale Price (Rs.) *</label>
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
                <i data-lucide="check" class="w-4 h-4"></i> Complete Carton Packing
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

  onCartonSelectChange(id) {
    const c = this.cartons.find(x => x.id === Number(id));
    if (c) {
      document.getElementById('pk-pcs-per-carton').value = c.pieces_per_carton || 20;
      document.getElementById('pk-sale-price').value = c.carton_sale_price || 250;
      document.getElementById('pk-available-display').textContent = `${c.available_single_pieces || 0} pieces`;
      this.calcPackingTotal();
    }
  },

  calcPackingTotal() {
    const cartonId = Number(document.getElementById('pk-carton-id')?.value);
    const c = this.cartons.find(x => x.id === cartonId);
    if (!c) return;

    const pcsPerCarton = Number(document.getElementById('pk-pcs-per-carton')?.value) || 20;
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

    if (pcsDisplay) pcsDisplay.textContent = `${totalPcsNeeded.toLocaleString()} pieces (${cartonsQty} ctns × ${pcsPerCarton} pcs)`;
    if (costDisplay) costDisplay.textContent = `Rs. ${Math.round(cartonCost)}`;
    if (totalCostDisplay) totalCostDisplay.textContent = `Rs. ${Math.round(totalCost).toLocaleString()}`;

    const availablePcs = c.available_single_pieces || 0;
    const isExceeding = totalPcsNeeded > availablePcs;
    const isZeroOrNegative = cartonsQty <= 0;
    const qtyInput = document.getElementById('pk-cartons-qty');

    if (isExceeding) {
      if (warning) {
        warning.classList.remove('hidden');
        warning.textContent = `⚠️ Insufficient pieces in pool! Need ${totalPcsNeeded.toLocaleString()} pcs, but only ${availablePcs.toLocaleString()} available.`;
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
          submitBtn.title = 'Enter number of cartons to pack';
        } else {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
          submitBtn.classList.add('cursor-pointer', 'hover:bg-purple-500', 'active:scale-95');
          submitBtn.title = 'Complete Carton Packing';
        }
      }
    }
  },

  openCartonConfigModal(id = null) {
    const c = id ? this.cartons.find(x => x.id === id) : {
      id: null,
      item_id: this.singleItems[0]?.id || null,
      carton_name: '',
      pieces_per_carton: 20,
      carton_cost_price: 200,
      carton_sale_price: 250,
      carton_wholesale_price: 240,
      factory_carton_stock: 0
    };
    if (!c) return;

    const modalEl = document.getElementById('pck-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) CartonPacking.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <h3 class="text-base font-black tracking-tight">${c.id ? 'Edit Carton Product' : 'New Carton Product'}</h3>
            <button onclick="CartonPacking.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="CartonPacking.handleCartonConfigSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="cfg-id" value="${c.id || ''}">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Base Ice Cream Item *</label>
              <select id="cfg-item-id" required class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500">
                ${this.singleItems.map(it => `
                  <option value="${it.id}" ${it.id === c.item_id ? 'selected' : ''}>${it.name}</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Carton Full Title *</label>
              <input type="text" id="cfg-name" required value="${c.carton_name || ''}" placeholder="e.g. Chocbar Carton (20 Pcs)..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Pieces Per Carton *</label>
                <input type="number" step="1" min="1" id="cfg-pcs" value="${c.pieces_per_carton || 20}" required
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Warehouse Cartons Stock</label>
                <input type="number" step="1" min="0" id="cfg-stock" value="${c.factory_carton_stock || 0}"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Carton Cost (Rs.)</label>
                <input type="number" step="any" min="0" id="cfg-cost" value="${c.carton_cost_price || 200}" required
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Carton Sale Price (Rs.) *</label>
                <input type="number" step="any" min="0" id="cfg-sale" value="${c.carton_sale_price || 250}" required
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-emerald-700 outline-none focus:bg-white focus:border-purple-500 tabular-nums">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="CartonPacking.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">Save Carton Config</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
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
      app.showToast(`Packed +${cartonsPacked} cartons successfully! (${res.totalPiecesNeeded} pcs consumed)`, 'success');
      await this.loadData();
    } else {
      // Show error inline in modal instead of popup alert
      const warning = document.getElementById('pk-insufficient-warning');
      const submitBtn = document.getElementById('pk-submit-btn');
      if (warning) {
        warning.classList.remove('hidden');
        warning.textContent = `⚠️ ${res.error || 'Failed to pack cartons.'}`;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
      }
    }
  },

  async handleCartonConfigSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('cfg-id').value;
    const data = {
      id: id ? Number(id) : null,
      item_id: Number(document.getElementById('cfg-item-id').value),
      carton_name: document.getElementById('cfg-name').value,
      pieces_per_carton: Number(document.getElementById('cfg-pcs').value) || 20,
      factory_carton_stock: Number(document.getElementById('cfg-stock').value) || 0,
      carton_cost_price: Number(document.getElementById('cfg-cost').value) || 0,
      carton_sale_price: Number(document.getElementById('cfg-sale').value) || 0
    };

    const res = await window.api.savePackedCarton(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast('Carton configuration saved!', 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to save carton config.' });
    }
  },

  async deleteBatch(id) {
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
  },

  printReport() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Ice Cream Factory';
    const date = new Date().toLocaleDateString('en-GB');
    const totalWarehouseCartons = this.cartons.reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);
    const totalLoaded = this.cartons.reduce((sum, c) => sum + (c.total_loaded_in_cars || 0), 0);
    const totalVal = this.cartons.reduce((sum, c) => sum + ((c.factory_carton_stock || 0) * (c.carton_sale_price || 0)), 0);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 600;">Date: ${app.formatDateTime(new Date())} | Warehouse Finished Stock &amp; Cars Loaded Stock</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          STAGE 3: FINISHED GOODS &amp; CARTON INVENTORY REPORT
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Carton Product</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 55px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Packing</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 70px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Warehouse</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 65px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">In Cars</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 65px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Total Ctns</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 65px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Sale Rate</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Stock Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.cartons.map((c, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; font-weight: 800; color: #000;">${c.carton_name}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9.5px; color: #000;">${c.pieces_per_carton} pcs</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${c.factory_carton_stock} ctns</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 9.5px; color: #000;">${c.total_loaded_in_cars || 0} ctns</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${(c.factory_carton_stock || 0) + (c.total_loaded_in_cars || 0)} ctns</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${c.carton_sale_price}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round((c.factory_carton_stock || 0) * c.carton_sale_price).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 5px 0; font-size: 10px; font-weight: 900; color: #000;">
          <span>WAREHOUSE CARTONS: ${totalWarehouseCartons} | IN CARS: ${totalLoaded}</span>
          <span style="font-family: -apple-system, monospace;">WAREHOUSE STOCK VALUE: Rs. ${Math.round(totalVal).toLocaleString()}</span>
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

    app.showA5Preview(html, 'Finished Goods Cartons Report (A5)');
  }
};
