/**
 * Return Sales Page
 * View customer and salesman returns, item-wise return breakdown, restocked inventory and refund history.
 * Designed uniformly with Sales History (Proposals).
 */

const ReturnSales = {
  returns: [],
  cars: [],
  shops: [],
  selectedCarId: '',
  selectedShopId: '',
  selectedDestination: 'all', // 'all' | 'car' | 'stock'
  searchQuery: '',
  sortField: 'date',
  sortOrder: 'desc',
  periodType: 'day', // 'day' | 'month' | 'year' | 'custom' | 'all'
  selectedDate: '',
  selectedMonth: '',
  selectedYear: '',
  customStartDate: '',
  customEndDate: '',
  container: null,

  async render(container) {
    this.container = container;
    const now = new Date();
    const todayStr = (window.app && typeof app.getTodayDate === 'function')
      ? app.getTodayDate()
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (!this.selectedDate) this.selectedDate = todayStr;
    if (!this.selectedMonth) this.selectedMonth = String(now.getMonth() + 1);
    if (!this.selectedYear) this.selectedYear = String(now.getFullYear());
    if (!this.customStartDate) this.customStartDate = todayStr;
    if (!this.customEndDate) this.customEndDate = todayStr;

    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div class="flex items-center gap-3">
            <button type="button" onclick="app.navigate('proposals')" 
                    class="h-10 px-3 hover:bg-slate-50 bg-white border border-slate-200 text-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer" 
                    title="Back to Sales History">
              <i data-lucide="arrow-left" class="w-4 h-4 text-slate-600"></i>
              <span>Sales History</span>
            </button>
            <div class="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="rotate-ccw" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Return Sales</h2>
              <p class="text-xs text-slate-500 font-medium">All vehicle dispatch returns, returned carton breakdown, restocked items, and refund records.</p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" onclick="ReturnSales.printReport()"
                    class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    title="Print Returns Summary Report (A5)">
              <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i> Print Return Report
            </button>
            <button type="button" onclick="app.navigate('item-sales')"
                    class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95" 
                    title="View item-wise carton sales breakdown">
              <i data-lucide="package" class="w-4 h-4 text-amber-400"></i> Item Sales
            </button>
            <button type="button" onclick="app.navigate('shop-sales')"
                    class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="plus" class="w-4 h-4"></i> New Sale
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-600 tracking-wider">Total Returns</p>
            <h3 class="text-xl font-black text-slate-900 mt-1" id="ret-stat-count">0</h3>
            <p class="text-[11px] font-bold text-slate-500 mt-0.5">Return vouchers</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-600 tracking-wider">Cartons Returned</p>
            <h3 class="text-xl font-black text-rose-600 mt-1" id="ret-stat-cartons">0 Ctns</h3>
            <p class="text-[11px] font-bold text-rose-500 mt-0.5">Returned by shops</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-600 tracking-wider">Total Refund Value</p>
            <h3 class="text-xl font-black text-amber-600 mt-1" id="ret-stat-refund">Rs. 0</h3>
            <p class="text-[11px] font-bold text-amber-700/80 mt-0.5">Bill adjustments</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-600 tracking-wider">Restocked in Car</p>
            <h3 class="text-xl font-black text-blue-700 mt-1" id="ret-stat-car">0 Ctns</h3>
            <p class="text-[11px] font-bold text-blue-600 mt-0.5">Kept in delivery vehicle</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-600 tracking-wider">Restocked in Warehouse</p>
            <h3 class="text-xl font-black text-emerald-700 mt-1" id="ret-stat-stock">0 Ctns</h3>
            <p class="text-[11px] font-bold text-emerald-600 mt-0.5">Sent to factory stock</p>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-3 flex-wrap flex-1 min-w-[300px]">
            <!-- Search -->
            <div class="relative flex-1 min-w-[200px]">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="ret-search" oninput="ReturnSales.onSearchChange(this.value)"
                     placeholder="Search by Return #, Inv #, Salesman, Vehicle, Flavor..."
                     value="${this.searchQuery}"
                     class="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-400">
              <button type="button" id="ret-search-clear" onclick="ReturnSales.clearSearch()" title="Clear search"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer ${this.searchQuery ? '' : 'hidden'}">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Sort Dropdown -->
            <div>
              <select id="ret-sort-select" onchange="ReturnSales.onSortSelect(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none hover:bg-white focus:border-amber-400 cursor-pointer">
                <option value="date_desc" ${this.sortField==='date'&&this.sortOrder==='desc'?'selected':''}>Date (Newest First)</option>
                <option value="date_asc" ${this.sortField==='date'&&this.sortOrder==='asc'?'selected':''}>Date (Oldest First)</option>
                <option value="return_desc" ${this.sortField==='return'&&this.sortOrder==='desc'?'selected':''}>Return # (Newest)</option>
                <option value="invoice_desc" ${this.sortField==='invoice'&&this.sortOrder==='desc'?'selected':''}>Sale Invoice # (Newest)</option>
                <option value="cartons_desc" ${this.sortField==='cartons'&&this.sortOrder==='desc'?'selected':''}>Cartons (High-Low)</option>
                <option value="cartons_asc" ${this.sortField==='cartons'&&this.sortOrder==='asc'?'selected':''}>Cartons (Low-High)</option>
                <option value="refund_desc" ${this.sortField==='refund'&&this.sortOrder==='desc'?'selected':''}>Refund Value (High-Low)</option>
                <option value="refund_asc" ${this.sortField==='refund'&&this.sortOrder==='asc'?'selected':''}>Refund Value (Low-High)</option>
                <option value="shop_asc" ${this.sortField==='shop'&&this.sortOrder==='asc'?'selected':''}>Salesman (A-Z)</option>
              </select>
            </div>

            <!-- Vehicle Filter -->
            <div>
              <select id="ret-car-select" onchange="ReturnSales.onCarChange(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer">
                <option value="">-- All Delivery Cars --</option>
              </select>
            </div>

            <!-- Salesman Filter -->
            <div>
              <select id="ret-shop-select" onchange="ReturnSales.onShopChange(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer">
                <option value="">-- All Salesmen --</option>
              </select>
            </div>

            <!-- Restock Destination Filter -->
            <div>
              <select id="ret-dest-select" onchange="ReturnSales.onDestinationChange(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer">
                <option value="all" ${this.selectedDestination==='all'?'selected':''}>-- All Destinations --</option>
                <option value="car" ${this.selectedDestination==='car'?'selected':''}>Stayed in Car</option>
                <option value="stock" ${this.selectedDestination==='stock'?'selected':''}>Returned to Stock</option>
              </select>
            </div>

            <!-- Period Switcher: Daily | Monthly | Annual | Custom Range | All -->
            <div class="flex bg-slate-200/70 p-0.5 rounded-xl border border-slate-300/70 shadow-inner">
              <button type="button" onclick="ReturnSales.setPeriod('day')" id="ret-tab-day"
                      class="px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all ${this.periodType==='day'?'bg-white text-slate-950 shadow-xs border border-slate-200/80':'text-slate-700 font-bold hover:text-slate-950 hover:bg-white/60'}">
                Daily
              </button>
              <button type="button" onclick="ReturnSales.setPeriod('month')" id="ret-tab-month"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${this.periodType==='month'?'bg-white text-slate-950 shadow-xs border border-slate-200/80':'text-slate-700 font-bold hover:text-slate-950 hover:bg-white/60'}">
                Monthly
              </button>
              <button type="button" onclick="ReturnSales.setPeriod('year')" id="ret-tab-year"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${this.periodType==='year'?'bg-white text-slate-950 shadow-xs border border-slate-200/80':'text-slate-700 font-bold hover:text-slate-950 hover:bg-white/60'}">
                Annual
              </button>
              <button type="button" onclick="ReturnSales.setPeriod('custom')" id="ret-tab-custom"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${this.periodType==='custom'?'bg-white text-slate-950 shadow-xs border border-slate-200/80':'text-slate-700 font-bold hover:text-slate-950 hover:bg-white/60'}">
                Custom Range
              </button>
              <button type="button" onclick="ReturnSales.setPeriod('all')" id="ret-tab-all"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${this.periodType==='all'?'bg-white text-slate-950 shadow-xs border border-slate-200/80':'text-slate-700 font-bold hover:text-slate-950 hover:bg-white/60'}">
                All
              </button>
            </div>

            <!-- Date Picker for Day/Month/Custom -->
            <div id="ret-date-picker-wrap">
              <input type="date" id="ret-date-input" value="${this.selectedDate}" onchange="ReturnSales.onDateChange(this.value)"
                     class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
            </div>

            <!-- Red Cross Reset to Current Date/Period -->
            <div id="ret-reset-filter-wrap" class="shrink-0 flex items-center">
              ${this.isFilteredFromCurrent() ? `
                <button type="button" onclick="ReturnSales.resetToCurrent()" 
                        class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                        title="Go back to current (Today)">
                  <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Returns Table -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-left text-xs border-collapse border border-slate-200">
              <thead id="ret-table-head" class="bg-slate-100/90 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="py-2.5 px-2 text-center w-10 border-r border-slate-200 text-slate-400 font-black">#</th>
                  <th onclick="ReturnSales.toggleSort('date')" class="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Date &amp; Time</span>
                      ${this.getSortIcon('date')}
                    </div>
                  </th>
                  <th onclick="ReturnSales.toggleSort('return')" class="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Return #</span>
                      ${this.getSortIcon('return')}
                    </div>
                  </th>
                  <th onclick="ReturnSales.toggleSort('invoice')" class="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Sale Inv #</span>
                      ${this.getSortIcon('invoice')}
                    </div>
                  </th>
                  <th onclick="ReturnSales.toggleSort('shop')" class="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Salesman</span>
                      ${this.getSortIcon('shop')}
                    </div>
                  </th>
                  <th class="py-2.5 px-3 border-r border-slate-200 select-none">
                    <span>Vehicle &amp; Restock Dest</span>
                  </th>
                  <th class="py-2.5 px-3 border-r border-slate-200 select-none">
                    <span>Returned Items Breakdown</span>
                  </th>
                  <th onclick="ReturnSales.toggleSort('cartons')" class="py-2.5 px-2 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-center gap-1">
                      <span>Ctns</span>
                      ${this.getSortIcon('cartons')}
                    </div>
                  </th>
                  <th onclick="ReturnSales.toggleSort('refund')" class="py-2.5 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-end gap-1">
                      <span>Total Refund</span>
                      ${this.getSortIcon('refund')}
                    </div>
                  </th>
                  <th class="py-2.5 px-3 border-r border-slate-200 select-none">Reason</th>
                  <th class="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody id="ret-table-body" class="divide-y divide-slate-100 font-semibold text-slate-700">
                <!-- Injected via renderTable() -->
              </tbody>
              <tfoot id="ret-table-foot" class="sticky bottom-0 bg-slate-100/95 font-black text-slate-900 border-t-2 border-slate-300 shadow-sm z-10">
                <!-- Injected via renderTable() -->
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadData();
  },

  async loadData() {
    try {
      this.cars = (await window.api.getCars()) || [];
      this.shops = (await window.api.getShops()) || [];
      this.returns = (await window.api.getShopReturns()) || [];

      // Populate Car selector
      const carSel = document.getElementById('ret-car-select');
      if (carSel) {
        carSel.innerHTML = '<option value="">-- All Delivery Cars --</option>' + 
          this.cars.map(c => `<option value="${c.id}" ${String(c.id) === String(this.selectedCarId) ? 'selected' : ''}>${c.car_number} (${c.driver_name})</option>`).join('');
      }

      // Populate Shop selector
      const shopSel = document.getElementById('ret-shop-select');
      if (shopSel) {
        shopSel.innerHTML = '<option value="">-- All Salesmen --</option>' + 
          this.shops.map(s => `<option value="${s.id}" ${String(s.id) === String(this.selectedShopId) ? 'selected' : ''}>${s.name} (${s.owner_name || s.city || ''})</option>`).join('');
      }

      this.applyFilters();
    } catch (e) {
      console.error('Failed to load returns history:', e);
    }
  },

  clearSearch() {
    this.searchQuery = '';
    const inp = document.getElementById('ret-search');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    const clr = document.getElementById('ret-search-clear');
    if (clr) clr.classList.add('hidden');
    this.applyFilters();
  },

  onSearchChange(val) {
    this.searchQuery = (val || '').toLowerCase().trim();
    const clr = document.getElementById('ret-search-clear');
    if (clr) clr.classList.toggle('hidden', !this.searchQuery);
    this.applyFilters();
  },

  onCarChange(val) {
    this.selectedCarId = val;
    this.applyFilters();
  },

  onShopChange(val) {
    this.selectedShopId = val;
    this.applyFilters();
  },

  onDestinationChange(val) {
    this.selectedDestination = val;
    this.applyFilters();
  },

  toggleSort(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = ['cartons', 'refund', 'date', 'return', 'invoice'].includes(field) ? 'desc' : 'asc';
    }
    const sel = document.getElementById('ret-sort-select');
    if (sel) sel.value = `${this.sortField}_${this.sortOrder}`;
    this.applyFilters();
  },

  onSortSelect(val) {
    if (!val) return;
    const parts = val.split('_');
    const order = parts.pop();
    const field = parts.join('_');
    this.sortField = field;
    this.sortOrder = order || 'asc';
    this.applyFilters();
  },

  getSortIcon(field) {
    if (this.sortField !== field) {
      return `<i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-300 ml-1 inline-block"></i>`;
    }
    return this.sortOrder === 'asc'
      ? `<i data-lucide="arrow-up" class="w-3 h-3 text-amber-600 ml-1 inline-block"></i>`
      : `<i data-lucide="arrow-down" class="w-3 h-3 text-amber-600 ml-1 inline-block"></i>`;
  },

  setPeriod(type) {
    this.periodType = type;
    ['day', 'month', 'year', 'custom', 'all'].forEach(t => {
      const btn = document.getElementById(`ret-tab-${t}`);
      if (btn) {
        if (t === type) {
          btn.className = 'px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer bg-white text-slate-950 shadow-xs border border-slate-200/80';
        } else {
          btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer text-slate-700 hover:text-slate-950 hover:bg-white/60';
        }
      }
    });

    const wrap = document.getElementById('ret-date-picker-wrap');
    if (wrap) {
      if (type === 'day') {
        wrap.innerHTML = `<input type="date" id="ret-date-input" value="${this.selectedDate}" onchange="ReturnSales.onDateChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">`;
      } else if (type === 'month') {
        const [y, m] = (this.selectedDate || '').split('-');
        const currentMonthVal = `${y || new Date().getFullYear()}-${String(m || new Date().getMonth() + 1).padStart(2, '0')}`;
        wrap.innerHTML = `<input type="month" id="ret-month-input" value="${currentMonthVal}" onchange="ReturnSales.onMonthChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">`;
      } else if (type === 'year') {
        const curY = (this.selectedDate || '').split('-')[0] || new Date().getFullYear();
        wrap.innerHTML = `
          <select id="ret-year-input" onchange="ReturnSales.onYearChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
            <option value="${curY}">${curY}</option>
            <option value="${Number(curY) - 1}">${Number(curY) - 1}</option>
            <option value="${Number(curY) - 2}">${Number(curY) - 2}</option>
          </select>
        `;
      } else if (type === 'custom') {
        wrap.innerHTML = `
          <div class="flex items-center gap-1.5">
            <input type="date" id="ret-custom-start" value="${this.customStartDate}" onchange="ReturnSales.onCustomRangeChange()" class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
            <span class="text-xs text-slate-400 font-bold">to</span>
            <input type="date" id="ret-custom-end" value="${this.customEndDate}" onchange="ReturnSales.onCustomRangeChange()" class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
          </div>
        `;
      } else {
        wrap.innerHTML = '';
      }
    }

    this.updateResetButton();
    this.applyFilters();
  },

  onDateChange(val) {
    if (!val) return;
    this.selectedDate = val;
    this.updateResetButton();
    this.applyFilters();
  },

  onMonthChange(val) {
    if (!val) return;
    const [y, m] = val.split('-');
    this.selectedYear = y;
    this.selectedMonth = m;
    this.selectedDate = `${y}-${m}-01`;
    this.updateResetButton();
    this.applyFilters();
  },

  onYearChange(val) {
    if (!val) return;
    this.selectedYear = val;
    this.selectedDate = `${val}-01-01`;
    this.updateResetButton();
    this.applyFilters();
  },

  onCustomRangeChange() {
    const s = document.getElementById('ret-custom-start')?.value;
    const e = document.getElementById('ret-custom-end')?.value;
    if (s) this.customStartDate = s;
    if (e) this.customEndDate = e;
    this.updateResetButton();
    this.applyFilters();
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
    this.selectedDate = today;
    this.customStartDate = today;
    this.customEndDate = today;
    this.setPeriod('day');
  },

  updateResetButton() {
    const wrap = document.getElementById('ret-reset-filter-wrap');
    if (wrap) {
      wrap.innerHTML = this.isFilteredFromCurrent() ? `
        <button type="button" onclick="ReturnSales.resetToCurrent()" 
                class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                title="Go back to current (Today)">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
        </button>
      ` : '';
      if (window.lucide) lucide.createIcons({ root: wrap });
    }
  },

  applyFilters() {
    let filtered = [...this.returns];

    // Period filter
    if (this.periodType === 'day' && this.selectedDate) {
      filtered = filtered.filter(r => (r.date || '').startsWith(this.selectedDate));
    } else if (this.periodType === 'month') {
      const [y, m] = (this.selectedDate || '').split('-');
      if (y && m) {
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        filtered = filtered.filter(r => (r.date || '').startsWith(ym));
      }
    } else if (this.periodType === 'year' && this.selectedYear) {
      filtered = filtered.filter(r => (r.date || '').startsWith(String(this.selectedYear)));
    } else if (this.periodType === 'custom' && this.customStartDate && this.customEndDate) {
      filtered = filtered.filter(r => {
        const d = (r.date || '').split('T')[0];
        return d >= this.customStartDate && d <= this.customEndDate;
      });
    }

    // Car filter
    if (this.selectedCarId) {
      filtered = filtered.filter(r => String(r.car_id) === String(this.selectedCarId));
    }

    // Shop/Salesman filter
    if (this.selectedShopId) {
      filtered = filtered.filter(r => String(r.shop_id) === String(this.selectedShopId));
    }

    // Destination filter
    if (this.selectedDestination && this.selectedDestination !== 'all') {
      filtered = filtered.filter(r => (r.return_destination || 'car').toLowerCase() === this.selectedDestination.toLowerCase());
    }

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery;
      filtered = filtered.filter(r => {
        const inReturn = (r.return_no || '').toLowerCase().includes(q);
        const inInv = (r.invoice_no || '').toLowerCase().includes(q);
        const inShop = (r.shop_name || '').toLowerCase().includes(q);
        const inCar = (r.car_number || '').toLowerCase().includes(q);
        const inReason = (r.reason || '').toLowerCase().includes(q);
        const inItems = (r.items || []).some(it => (it.carton_name || '').toLowerCase().includes(q));
        return inReturn || inInv || inShop || inCar || inReason || inItems;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let va = 0, vb = 0;
      switch (this.sortField) {
        case 'date':
          va = (a.created_at || a.date || '');
          vb = (b.created_at || b.date || '');
          return this.sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        case 'return':
          va = (a.return_no || '');
          vb = (b.return_no || '');
          return this.sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        case 'invoice':
          va = Number(a.invoice_no) || 0;
          vb = Number(b.invoice_no) || 0;
          return this.sortOrder === 'asc' ? va - vb : vb - va;
        case 'cartons':
          va = Number(a.total_cartons_returned) || 0;
          vb = Number(b.total_cartons_returned) || 0;
          return this.sortOrder === 'asc' ? va - vb : vb - va;
        case 'refund':
          va = Number(a.total_refund_amount) || 0;
          vb = Number(b.total_refund_amount) || 0;
          return this.sortOrder === 'asc' ? va - vb : vb - va;
        case 'shop':
          va = (a.shop_name || '');
          vb = (b.shop_name || '');
          return this.sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        default:
          return 0;
      }
    });

    this.filteredReturns = filtered;
    this.updateStats(filtered);
    this.renderTable(filtered);
  },

  updateStats(list) {
    let count = list.length;
    let totalCartons = 0;
    let totalRefund = 0;
    let carCartons = 0;
    let stockCartons = 0;

    list.forEach(r => {
      const ctns = Number(r.total_cartons_returned) || 0;
      const ref = Number(r.total_refund_amount) || 0;
      totalCartons += ctns;
      totalRefund += ref;

      const dest = (r.return_destination || 'car').toLowerCase();
      if (dest === 'stock') {
        stockCartons += ctns;
      } else {
        carCartons += ctns;
      }
    });

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('ret-stat-count', count.toLocaleString());
    setEl('ret-stat-cartons', `${totalCartons.toLocaleString()} Ctns`);
    setEl('ret-stat-refund', `Rs. ${Math.round(totalRefund).toLocaleString()}`);
    setEl('ret-stat-car', `${carCartons.toLocaleString()} Ctns`);
    setEl('ret-stat-stock', `${stockCartons.toLocaleString()} Ctns`);
  },

  renderTable(list) {
    const tbody = document.getElementById('ret-table-body');
    const tfoot = document.getElementById('ret-table-foot');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="py-12 text-center text-slate-400 font-bold border-b border-slate-200">
            <div class="flex flex-col items-center justify-center gap-2">
              <i data-lucide="inbox" class="w-8 h-8 text-slate-300 stroke-1"></i>
              <span>No return sales records found matching the current filters.</span>
            </div>
          </td>
        </tr>
      `;
      if (tfoot) tfoot.innerHTML = '';
      if (window.lucide) lucide.createIcons({ root: tbody });
      return;
    }

    let sumCartons = 0;
    let sumRefund = 0;

    tbody.innerHTML = list.map((r, idx) => {
      const ctns = Number(r.total_cartons_returned) || 0;
      const refund = Number(r.total_refund_amount) || 0;
      sumCartons += ctns;
      sumRefund += refund;

      const isCarDest = (r.return_destination || 'car').toLowerCase() === 'car';
      const destBadge = isCarDest
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-800 border border-blue-200"><i data-lucide="truck" class="w-3 h-3 text-blue-600"></i> Kept in Car</span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"><i data-lucide="warehouse" class="w-3 h-3 text-emerald-600"></i> Factory Stock</span>`;

      // Items list pills
      const items = r.items || [];
      const itemsHtml = items.length > 0 ? items.map(it => {
        const qty = Number(it.returned_cartons) || 0;
        const price = Number(it.carton_price) || 0;
        const lineRef = Number(it.refund_amount) || (qty * price);
        const pkg = (it.package_type || 'Carton').toUpperCase();
        return `
          <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] leading-tight font-medium text-slate-800 shadow-2xs mr-1 mb-1">
            <span class="font-black text-slate-900">${it.carton_name}</span>
            <span class="text-[9.5px] font-bold uppercase text-slate-400 bg-slate-200/60 px-1 py-0.5 rounded">${pkg}</span>
            <span class="font-black text-rose-600">&times; ${qty}</span>
            <span class="text-slate-400">@ Rs. ${price}</span>
            <span class="font-black text-slate-700">= Rs. ${Math.round(lineRef).toLocaleString()}</span>
          </div>
        `;
      }).join('') : `<span class="text-slate-400 text-[11px]">No items listed</span>`;

      const formattedDate = (window.app && typeof app.formatDateTime === 'function')
        ? app.formatDateTime(r.date, r.created_at)
        : `${r.date || ''} ${r.created_at ? r.created_at.split(' ')[1] || '' : ''}`;

      return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
          <td class="py-2.5 px-2 text-center text-slate-400 font-bold border-r border-slate-200 w-10">${idx + 1}</td>
          <td class="py-2.5 px-3 whitespace-nowrap text-slate-800 border-r border-slate-200 text-xs font-bold">
            ${formattedDate}
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 text-xs font-black text-slate-900 whitespace-nowrap">
            <span class="font-mono">${r.return_no || `#${r.id}`}</span>
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 text-xs font-bold whitespace-nowrap">
            <button type="button" onclick="ReturnSales.viewSaleInvoice('${r.delivery_id}')" class="text-amber-700 hover:text-amber-900 font-black underline cursor-pointer" title="View Sale Invoice">
              #${r.invoice_no || r.delivery_id || 'N/A'}
            </button>
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 text-xs font-black text-slate-900 whitespace-nowrap">
            ${r.shop_name || 'Direct / Counter'}
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 text-xs whitespace-nowrap">
            <div class="font-bold text-slate-800">${r.car_number || 'Direct'}</div>
            <div class="mt-0.5">${destBadge}</div>
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 text-xs min-w-[240px]">
            <div class="flex flex-wrap items-center">
              ${itemsHtml}
            </div>
          </td>
          <td class="py-2.5 px-2 text-center border-r border-slate-200 text-xs font-black text-rose-700 tabular-nums">
            ${ctns} Ctns
          </td>
          <td class="py-2.5 px-3 text-right border-r border-slate-200 text-xs font-black text-slate-900 tabular-nums whitespace-nowrap">
            Rs. ${Math.round(refund).toLocaleString()}
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200 text-xs text-slate-500 font-medium max-w-[160px] truncate" title="${r.reason || 'None'}">
            ${r.reason || '<span class="text-slate-300">—</span>'}
          </td>
          <td class="py-2.5 px-3 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-1.5">
              <button type="button" onclick="ReturnSales.printReturnVoucher(${r.id})" 
                      class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer active:scale-95" 
                      title="Print A5 Return Voucher">
                <i data-lucide="printer" class="w-4 h-4 text-slate-600"></i>
              </button>
              <button type="button" onclick="ReturnSales.deleteReturn(${r.id}, '${r.return_no || r.id}')" 
                      class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer active:scale-95" 
                      title="Delete & Revert Return">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (tfoot) {
      tfoot.innerHTML = `
        <tr class="bg-slate-100 text-slate-900">
          <td colspan="7" class="py-2.5 px-3 text-right uppercase tracking-wider text-[11px] font-black border-r border-slate-300">
            TOTAL FILTERED RETURNS (${list.length} Vouchers):
          </td>
          <td class="py-2.5 px-2 text-center text-xs font-black text-rose-700 border-r border-slate-300 tabular-nums">
            ${sumCartons.toLocaleString()} Ctns
          </td>
          <td class="py-2.5 px-3 text-right text-xs font-black text-slate-900 border-r border-slate-300 tabular-nums whitespace-nowrap">
            Rs. ${Math.round(sumRefund).toLocaleString()}
          </td>
          <td colspan="2"></td>
        </tr>
      `;
    }

    if (window.lucide) lucide.createIcons({ root: tbody });
  },

  viewSaleInvoice(deliveryId) {
    if (!deliveryId) return;
    if (window.ShopSales && typeof window.ShopSales.printDeliveryInvoice === 'function') {
      window.ShopSales.printDeliveryInvoice(deliveryId);
    } else if (window.ShopSales && typeof window.ShopSales.printA5Invoice === 'function') {
      window.ShopSales.printA5Invoice(deliveryId);
    } else {
      app.navigate('proposals');
    }
  },

  async printReturnVoucher(returnId) {
    if (!returnId) return;
    if (window.ShopSales && typeof window.ShopSales.printReturnNote === 'function') {
      await window.ShopSales.printReturnNote(returnId);
    } else {
      const ret = await window.api.getShopReturn(returnId);
      if (!ret) return;
      app.showToast(`Previewing Return Voucher ${ret.return_no}...`, 'info');
    }
  },

  async deleteReturn(returnId, returnNo) {
    const actionPassword = window.storage ? window.storage.get('action_password') : null;
    const confirmDelete = () => {
      app.showConfirm({
        title: 'Delete Sale Return?',
        message: `Are you sure you want to delete return <b>${returnNo}</b>?<br><br><span class="text-rose-600 text-xs font-bold">⚠️ Warning: The returned stock will be deducted back from the vehicle/factory stock, and the customer sale bill will be restored.</span>`,
        confirmText: 'Delete & Revert Return',
        confirmColor: 'red',
        onConfirm: async () => {
          try {
            app.showLoading?.();
            const res = await window.api.deleteShopReturn(returnId);
            if (res && res.success) {
              app.showToast(`Return ${returnNo} deleted & stock reverted successfully.`, 'success');
              await this.loadData();
              if (window.Proposals && typeof window.Proposals.loadData === 'function') {
                window.Proposals.loadData();
              }
            } else {
              app.showAlert({ title: 'Delete Failed', message: res?.error || 'Could not delete return.' });
            }
          } catch (err) {
            console.error('deleteReturn error:', err);
            app.showAlert({ title: 'Error', message: err.message || 'Failed to delete return.' });
          } finally {
            app.hideLoading?.();
          }
        }
      });
    };

    if (actionPassword && String(actionPassword).trim()) {
      app.authorizeAction(confirmDelete, `deleting return record ${returnNo}`);
    } else {
      confirmDelete();
    }
  },

  async printReport() {
    const list = this.filteredReturns || this.returns || [];
    if (list.length === 0) {
      app.showAlert({ title: 'No Data', message: 'There are no return records to print for the selected filter.' });
      return;
    }

    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const phone = settings.phone || '0315-6795995';
    const address = settings.address || 'Hasan Abdal';

    let totalCtns = 0;
    let totalRefund = 0;

    const rowsHtml = list.map((r, idx) => {
      const ctns = Number(r.total_cartons_returned) || 0;
      const ref = Number(r.total_refund_amount) || 0;
      totalCtns += ctns;
      totalRefund += ref;

      const itemsSummary = (r.items || []).map(it => `${it.carton_name} (${it.returned_cartons} ctns)`).join(', ');

      return `
        <tr style="border-bottom: 1px solid #ccc; font-size: 9px;">
          <td style="padding: 4px 2px; text-align: center;">${idx + 1}</td>
          <td style="padding: 4px; white-space: nowrap;">${r.date || ''}</td>
          <td style="padding: 4px; font-weight: bold;">${r.return_no || r.id}</td>
          <td style="padding: 4px;">#${r.invoice_no || ''}</td>
          <td style="padding: 4px;">${r.shop_name || 'Counter'}</td>
          <td style="padding: 4px;">${r.car_number || 'Direct'}</td>
          <td style="padding: 4px;">${itemsSummary || '-'}</td>
          <td style="padding: 4px; text-align: center; font-weight: bold;">${ctns}</td>
          <td style="padding: 4px; text-align: right; font-weight: bold;">Rs. ${Math.round(ref).toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px 4px 0 4px; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; font-size: 10px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
          <h2 style="font-size: 15px; font-weight: bold; margin: 0; text-transform: uppercase;">${company}</h2>
          <p style="font-size: 9px; margin: 2px 0 0 0;">${address} • Phone: ${phone}</p>
          <h3 style="font-size: 12px; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; border: 1px solid #000; display: inline-block; padding: 2px 8px;">
            SALES RETURNS SUMMARY REPORT
          </h3>
        </div>

        <div style="font-size: 9.5px; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span><strong>Filter:</strong> ${this.periodType.toUpperCase()} (${this.selectedDate || 'All'})</span>
          <span><strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')}</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 8.5px;">
          <thead>
            <tr style="background: #f0f0f0; border-bottom: 1.5px solid #000;">
              <th style="padding: 4px 2px; text-align: center; width: 20px;">#</th>
              <th style="padding: 4px; text-align: left;">Date</th>
              <th style="padding: 4px; text-align: left;">Return #</th>
              <th style="padding: 4px; text-align: left;">Inv #</th>
              <th style="padding: 4px; text-align: left;">Salesman</th>
              <th style="padding: 4px; text-align: left;">Vehicle</th>
              <th style="padding: 4px; text-align: left;">Items Returned</th>
              <th style="padding: 4px; text-align: center;">Ctns</th>
              <th style="padding: 4px; text-align: right;">Refund</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f0f0f0; border-top: 2px solid #000; font-weight: bold;">
              <td colspan="7" style="padding: 5px 4px; text-align: right;">TOTAL (${list.length} Returns):</td>
              <td style="padding: 5px 4px; text-align: center;">${totalCtns}</td>
              <td style="padding: 5px 4px; text-align: right;">Rs. ${Math.round(totalRefund).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    app.showA5Preview(html, 'Sales Return Report (A5)');
  }
};

window.ReturnSales = ReturnSales;
