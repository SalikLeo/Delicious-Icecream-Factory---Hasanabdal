// Item Wise Purchases: Comprehensive item-by-item breakdown of all raw materials purchased
window.ItemPurchases = {
  items: [],
  categories: [],
  suppliers: [],
  currentPeriodType: 'day',
  currentSort: 'spend-desc',
  currentPage: 1,
  pageSize: 50,
  currentFilteredGrouped: [],
  expandedItems: new Set(),
  selectedCategory: 'All',
  selectedSupplier: 'All',

  async render(container) {
    this.container = container;
    const savedShowStats = window.storage ? window.storage.get('item_purchases_show_stats') : null;
    const isStatsVisible = savedShowStats !== null ? Boolean(savedShowStats) : true;

    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        <!-- Top Bar / Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 no-print">
          <div>
            <div class="flex items-center gap-3">
              <button onclick="app.navigate('purchases')" class="h-10 px-3 hover:bg-slate-50 bg-white border border-slate-200 text-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95" title="Back to Raw Material Purchases">
                <i data-lucide="arrow-left" class="w-4 h-4 text-slate-600"></i>
                <span>Purchases</span>
              </button>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <i data-lucide="package" class="w-5 h-5"></i>
              </div>
              <div>
                <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Item Wise Purchases</h2>
                <p class="text-xs text-slate-500 font-medium">Aggregated stock materials purchased, average cost trends, and supplier purchase orders.</p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="app.navigate('suppliers')" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer" title="Manage Suppliers & Vendor Purchases">
              <i data-lucide="users" class="w-4 h-4 text-blue-500"></i>
              <span>Suppliers</span>
            </button>
            <button onclick="ItemPurchases.printReport()" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer" title="Print Item Purchases Report (A5)">
              <i data-lucide="printer" class="w-4 h-4 text-slate-500"></i>
              <span>Print</span>
            </button>
            <button onclick="ItemPurchases.toggleStats()" id="item-pur-stats-toggle-btn" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer">
              <i data-lucide="${isStatsVisible ? 'eye-off' : 'eye'}" class="w-4 h-4 text-slate-400" id="item-pur-stats-toggle-icon"></i>
              <span id="item-pur-stats-toggle-text">${isStatsVisible ? 'Hide Stats' : 'Show Stats'}</span>
            </button>
          </div>
        </div>

        <!-- KPI Stats Cards -->
        <div id="item-pur-stats-container" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0 ${isStatsVisible ? '' : 'hidden'}">
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
              <i data-lucide="banknote" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-emerald-600 tracking-wider truncate">Total Spend</p>
              <h3 class="text-base font-black text-emerald-700 font-mono truncate" id="item-pur-stat-spend">Rs. 0</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
              <i data-lucide="package" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate">Total Quantity</p>
              <h3 class="text-base font-black text-slate-800 font-mono truncate" id="item-pur-stat-qty">0 Units</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 border border-purple-100">
              <i data-lucide="layers" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-purple-600 tracking-wider truncate">Unique Materials</p>
              <h3 class="text-base font-black text-purple-700 font-mono truncate" id="item-pur-stat-materials">0</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
              <i data-lucide="truck" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-blue-600 tracking-wider truncate">Active Suppliers</p>
              <h3 class="text-base font-black text-blue-700 font-mono truncate" id="item-pur-stat-suppliers">0</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
              <i data-lucide="shopping-bag" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-amber-600 tracking-wider truncate">Purchase Orders</p>
              <h3 class="text-base font-black text-amber-700 font-mono truncate" id="item-pur-stat-orders">0</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 border border-slate-200">
              <i data-lucide="calculator" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-slate-500 tracking-wider truncate">Avg Unit Cost</p>
              <h3 class="text-base font-black text-slate-800 font-mono truncate" id="item-pur-stat-avgcost">Rs. 0</h3>
            </div>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div class="relative w-full">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
              <input type="text" id="item-pur-search" oninput="ItemPurchases.applyFilters()"
                     placeholder="Search material, category, supplier, invoice #..."
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 outline-none transition-all">
              <button id="item-pur-search-clear-btn" onclick="ItemPurchases.clearSearch()" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 hidden cursor-pointer">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Sort dropdown -->
          <div class="flex items-center gap-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sort</label>
            <select id="item-pur-sort-select" onchange="ItemPurchases.setSort(this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold hover:bg-white text-slate-700 transition-all outline-none cursor-pointer">
              <option value="spend-desc">Total Spend (High to Low)</option>
              <option value="spend-asc">Total Spend (Low to High)</option>
              <option value="qty-desc">Quantity Purchased (High to Low)</option>
              <option value="qty-asc">Quantity Purchased (Low to High)</option>
              <option value="name-asc">Material Name (A to Z)</option>
              <option value="name-desc">Material Name (Z to A)</option>
              <option value="orders-desc">Orders Count (High to Low)</option>
              <option value="avgcost-desc">Avg Unit Cost (High to Low)</option>
            </select>
          </div>

          <!-- Category dropdown -->
          <div class="flex items-center gap-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <select id="item-pur-cat-select" onchange="ItemPurchases.applyFilters()" class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold hover:bg-white text-slate-700 transition-all outline-none cursor-pointer min-w-[120px]">
              <option value="All">All Categories</option>
            </select>
          </div>

          <!-- Supplier dropdown -->
          <div class="flex items-center gap-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supplier</label>
            <select id="item-pur-supplier-select" onchange="ItemPurchases.applyFilters()" class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold hover:bg-white text-slate-700 transition-all outline-none cursor-pointer min-w-[120px]">
              <option value="All">All Suppliers</option>
            </select>
          </div>

          <!-- Period controls -->
          <div class="flex items-center gap-2 flex-wrap">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Period</label>
            <div class="flex bg-slate-100 p-1 rounded-xl">
              <button id="item-pur-period-day-tab" onclick="ItemPurchases.setPeriodType('day')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all bg-white shadow-2xs text-slate-800 cursor-pointer">Daily</button>
              <button id="item-pur-period-month-tab" onclick="ItemPurchases.setPeriodType('month')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Monthly</button>
              <button id="item-pur-period-year-tab" onclick="ItemPurchases.setPeriodType('year')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Annual</button>
              <button id="item-pur-period-custom-tab" onclick="ItemPurchases.setPeriodType('custom')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Custom Range</button>
              <button id="item-pur-period-all-tab" onclick="ItemPurchases.setPeriodType('all')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer">All</button>
            </div>

            <!-- Daily navigation controls -->
            <div id="item-pur-daily-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
              <button onclick="ItemPurchases.changeDateStep(-1)" class="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Day">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
              </button>
              <input type="date" id="item-pur-stats-date-picker" onchange="ItemPurchases.applyFilters()" oninput="ItemPurchases.applyFilters()" class="bg-transparent border-0 px-1 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
              <button onclick="ItemPurchases.changeDateStep(1)" class="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Day">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="ItemPurchases.setToday()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg transition-all cursor-pointer ml-0.5">Today</button>
            </div>

            <!-- Monthly navigation controls -->
            <div id="item-pur-monthly-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 hidden">
              <button onclick="ItemPurchases.changeMonthStep(-1)" class="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Month">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
              </button>
              <select id="item-pur-stats-month-select" onchange="ItemPurchases.applyFilters()" oninput="ItemPurchases.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
              <select id="item-pur-stats-month-year-select" onchange="ItemPurchases.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
              </select>
              <button onclick="ItemPurchases.changeMonthStep(1)" class="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Month">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="ItemPurchases.setThisMonth()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg transition-all cursor-pointer ml-0.5">This Month</button>
            </div>

            <!-- Annual controls -->
            <div id="item-pur-annual-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 hidden">
              <select id="item-pur-stats-year-picker" onchange="ItemPurchases.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
              </select>
            </div>

            <!-- Custom Range controls -->
            <div id="item-pur-custom-controls" class="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-xl hidden">
              <span class="text-[10px] font-black uppercase text-slate-400">From</span>
              <input type="date" id="item-pur-start-date" onchange="ItemPurchases.applyFilters()" oninput="ItemPurchases.applyFilters()" class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
              <span class="text-[10px] font-black uppercase text-slate-400">To</span>
              <input type="date" id="item-pur-end-date" onchange="ItemPurchases.applyFilters()" oninput="ItemPurchases.applyFilters()" class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
            </div>

            <button id="item-pur-clear-period-btn" onclick="ItemPurchases.resetPeriodToDefault()" class="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all hidden cursor-pointer active:scale-95" title="Reset to Daily (Today)">
              <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
            </button>
          </div>
        </div>

        <!-- Table View Card -->
        <div class="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[400px]">
          <div class="overflow-auto flex-1 relative custom-scrollbar">
            <table class="w-full text-sm text-left border-collapse">
              <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider sticky top-0 z-10 shadow-2xs border-b border-slate-200">
                <tr>
                  <th class="px-3 py-3 text-center w-12 border-r border-slate-200 text-slate-400 font-black">#</th>
                  <th class="px-4 py-3 border-r border-slate-200 font-black cursor-pointer hover:bg-slate-100 transition-colors" onclick="ItemPurchases.toggleColumnSort('name')">
                    <div class="flex items-center justify-between gap-1">
                      <span>Raw Material / Item Name</span>
                      <i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>
                    </div>
                  </th>
                  <th class="px-3 py-3 border-r border-slate-200 text-center w-28">Category</th>
                  <th class="px-3 py-3 border-r border-slate-200 text-center w-20">Unit</th>
                  <th class="px-4 py-3 border-r border-slate-200 text-right font-black cursor-pointer hover:bg-slate-100 transition-colors w-28" onclick="ItemPurchases.toggleColumnSort('qty')">
                    <div class="flex items-center justify-end gap-1">
                      <span>Qty Bought</span>
                      <i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>
                    </div>
                  </th>
                  <th class="px-4 py-3 border-r border-slate-200 text-right font-black cursor-pointer hover:bg-slate-100 transition-colors w-28" onclick="ItemPurchases.toggleColumnSort('avgcost')">
                    <div class="flex items-center justify-end gap-1">
                      <span>Avg Cost</span>
                      <i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>
                    </div>
                  </th>
                  <th class="px-4 py-3 border-r border-slate-200 text-right font-black w-28">Last Cost</th>
                  <th class="px-4 py-3 border-r border-slate-200 text-right font-black cursor-pointer hover:bg-slate-100 transition-colors w-32" onclick="ItemPurchases.toggleColumnSort('spend')">
                    <div class="flex items-center justify-end gap-1">
                      <span>Total Spend</span>
                      <i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>
                    </div>
                  </th>
                  <th class="px-3 py-3 border-r border-slate-200 text-center font-black cursor-pointer hover:bg-slate-100 transition-colors w-24" onclick="ItemPurchases.toggleColumnSort('orders')">
                    <div class="flex items-center justify-center gap-1">
                      <span>Orders</span>
                      <i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>
                    </div>
                  </th>
                  <th class="px-4 py-3 border-r border-slate-200">Suppliers</th>
                  <th class="px-3 py-3 text-center w-16">Details</th>
                </tr>
              </thead>
              <tbody id="item-pur-list-body" class="divide-y divide-slate-100 bg-white">
                <tr>
                  <td colspan="11" class="text-center py-12 text-slate-400 font-bold text-xs">
                    Loading item-wise purchases...
                  </td>
                </tr>
              </tbody>
              <tfoot id="item-pur-tfoot" class="bg-slate-50 border-t-2 border-slate-200 font-black text-xs text-slate-800 sticky bottom-0 z-10 shadow-sm">
                <!-- Dynamically filled in applyFilters -->
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: container });

    // Set default daily picker to today
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const datePicker = document.getElementById('item-pur-stats-date-picker');
    if (datePicker && !datePicker.value) {
      datePicker.value = todayStr;
    }

    await this.loadData();
  },

  async loadData() {
    try {
      this.items = await window.api.getRawMaterialPurchases({}) || [];

      // Populate Categories Dropdown
      const catSelect = document.getElementById('item-pur-cat-select');
      if (catSelect) {
        const curCat = catSelect.value || 'All';
        const cats = new Set();
        this.items.forEach(i => {
          if (i.material_category) cats.add(i.material_category);
        });
        let catOptions = `<option value="All">All Categories</option>`;
        Array.from(cats).sort().forEach(c => {
          catOptions += `<option value="${c}">${c}</option>`;
        });
        catSelect.innerHTML = catOptions;
        catSelect.value = curCat;
      }

      // Populate Suppliers Dropdown
      const supSelect = document.getElementById('item-pur-supplier-select');
      if (supSelect) {
        const curSup = supSelect.value || 'All';
        const sups = new Set();
        this.items.forEach(i => {
          if (i.supplier_name) sups.add(i.supplier_name.trim());
        });
        let supOptions = `<option value="All">All Suppliers</option>`;
        Array.from(sups).sort().forEach(s => {
          supOptions += `<option value="${s}">${s}</option>`;
        });
        supSelect.innerHTML = supOptions;
        supSelect.value = curSup;
      }

      // Populate Year Dropdowns
      const now = new Date();
      const monthYearSelect = document.getElementById('item-pur-stats-month-year-select');
      const yearPicker = document.getElementById('item-pur-stats-year-picker');
      const yearSet = new Set([now.getFullYear()]);
      this.items.forEach(item => {
        if (item.date) {
          const parsed = this.parseDate(item.date);
          if (parsed && parsed.year) yearSet.add(parsed.year);
        }
      });
      const years = Array.from(yearSet).sort((a, b) => b - a);

      if (monthYearSelect) {
        const curMYear = monthYearSelect.value;
        monthYearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (curMYear && years.some(y => String(y) === String(curMYear))) {
          monthYearSelect.value = curMYear;
        } else {
          monthYearSelect.value = now.getFullYear();
        }
      }

      if (yearPicker) {
        const curY = yearPicker.value;
        yearPicker.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (curY && years.some(y => String(y) === String(curY))) {
          yearPicker.value = curY;
        } else {
          yearPicker.value = now.getFullYear();
        }
      }

      this.applyFilters();
    } catch (e) {
      console.error('[ITEM-PURCHASES] loadData error:', e);
    }
  },

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
          dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        };
      }
    } catch (e) {}

    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return {
        year: parseInt(m[1]),
        month: parseInt(m[2]),
        day: parseInt(m[3]),
        dateStr: `${m[1]}-${m[2]}-${m[3]}`
      };
    }
    return null;
  },

  setPeriodType(type) {
    this.currentPeriodType = type;
    if (type === 'custom') {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const sDate = document.getElementById('item-pur-start-date');
      const eDate = document.getElementById('item-pur-end-date');
      if (sDate && !sDate.value) sDate.value = document.getElementById('item-pur-stats-date-picker')?.value || todayStr;
      if (eDate && !eDate.value) eDate.value = document.getElementById('item-pur-stats-date-picker')?.value || todayStr;
    }

    ['day', 'month', 'year', 'custom', 'all'].forEach(t => {
      const tab = document.getElementById(`item-pur-period-${t}-tab`);
      if (tab) {
        if (t === type) {
          tab.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all bg-white shadow-2xs text-slate-800 cursor-pointer';
        } else {
          tab.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer';
        }
      }
    });

    const dailyEl = document.getElementById('item-pur-daily-controls');
    const monthlyEl = document.getElementById('item-pur-monthly-controls');
    const annualEl = document.getElementById('item-pur-annual-controls');
    const customEl = document.getElementById('item-pur-custom-controls');

    if (dailyEl) dailyEl.classList.toggle('hidden', type !== 'day');
    if (monthlyEl) monthlyEl.classList.toggle('hidden', type !== 'month');
    if (annualEl) annualEl.classList.toggle('hidden', type !== 'year');
    if (customEl) customEl.classList.toggle('hidden', type !== 'custom');

    this.applyFilters();
  },

  setToday() {
    const now = new Date();
    const datePicker = document.getElementById('item-pur-stats-date-picker');
    if (datePicker) {
      datePicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    this.applyFilters();
  },

  setThisMonth() {
    const now = new Date();
    const monthSelect = document.getElementById('item-pur-stats-month-select');
    const monthYearSelect = document.getElementById('item-pur-stats-month-year-select');
    if (monthSelect) monthSelect.value = now.getMonth() + 1;
    if (monthYearSelect) monthYearSelect.value = now.getFullYear();
    this.applyFilters();
  },

  changeDateStep(step) {
    const picker = document.getElementById('item-pur-stats-date-picker');
    if (!picker || !picker.value) return;
    const parts = picker.value.split('-');
    const curDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    curDate.setDate(curDate.getDate() + step);
    picker.value = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
    this.applyFilters();
  },

  changeMonthStep(step) {
    const mSelect = document.getElementById('item-pur-stats-month-select');
    const ySelect = document.getElementById('item-pur-stats-month-year-select');
    if (!mSelect || !ySelect) return;
    let m = parseInt(mSelect.value) + step;
    let y = parseInt(ySelect.value);
    if (m < 1) { m = 12; y -= 1; }
    else if (m > 12) { m = 1; y += 1; }

    let optionExists = false;
    for (let i = 0; i < ySelect.options.length; i++) {
      if (parseInt(ySelect.options[i].value) === y) {
        optionExists = true;
        break;
      }
    }
    if (!optionExists) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      ySelect.prepend(opt);
    }
    mSelect.value = m;
    ySelect.value = y;
    this.applyFilters();
  },

  setSort(sortValue) {
    this.currentSort = sortValue;
    const select = document.getElementById('item-pur-sort-select');
    if (select) select.value = sortValue;
    this.applyFilters();
  },

  toggleColumnSort(col) {
    if (col === 'qty') {
      this.currentSort = (this.currentSort === 'qty-desc') ? 'qty-asc' : 'qty-desc';
    } else if (col === 'spend') {
      this.currentSort = (this.currentSort === 'spend-desc') ? 'spend-asc' : 'spend-desc';
    } else if (col === 'avgcost') {
      this.currentSort = (this.currentSort === 'avgcost-desc') ? 'avgcost-asc' : 'avgcost-desc';
    } else if (col === 'orders') {
      this.currentSort = (this.currentSort === 'orders-desc') ? 'orders-asc' : 'orders-desc';
    } else if (col === 'name') {
      this.currentSort = (this.currentSort === 'name-asc') ? 'name-desc' : 'name-asc';
    }
    const select = document.getElementById('item-pur-sort-select');
    if (select) select.value = this.currentSort;
    this.applyFilters();
  },

  clearSearch() {
    const input = document.getElementById('item-pur-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applyFilters();
  },

  resetPeriodToDefault() {
    this.setPeriodType('day');
    this.setToday();
  },

  updateClearPeriodButton() {
    const btn = document.getElementById('item-pur-clear-period-btn');
    if (!btn) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selDate = document.getElementById('item-pur-stats-date-picker')?.value;
    const isDefaultDay = (this.currentPeriodType === 'day' && selDate === todayStr);
    if (!isDefaultDay) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  },

  toggleStats() {
    const container = document.getElementById('item-pur-stats-container');
    const textEl = document.getElementById('item-pur-stats-toggle-text');
    const iconEl = document.getElementById('item-pur-stats-toggle-icon');
    if (!container) return;

    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
      container.classList.remove('hidden');
      if (textEl) textEl.textContent = 'Hide Stats';
      if (iconEl) iconEl.setAttribute('data-lucide', 'eye-off');
      if (window.storage) window.storage.set('item_purchases_show_stats', true);
    } else {
      container.classList.add('hidden');
      if (textEl) textEl.textContent = 'Show Stats';
      if (iconEl) iconEl.setAttribute('data-lucide', 'eye');
      if (window.storage) window.storage.set('item_purchases_show_stats', false);
    }
    if (window.lucide) lucide.createIcons();
  },

  toggleExpand(key) {
    if (this.expandedItems.has(key)) {
      this.expandedItems.delete(key);
    } else {
      this.expandedItems.add(key);
    }
    this.renderList(this.currentFilteredGrouped);
  },

  applyFilters() {
    const searchInput = document.getElementById('item-pur-search');
    const clearBtn = document.getElementById('item-pur-search-clear-btn');
    const term = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const selDate = document.getElementById('item-pur-stats-date-picker')?.value;
    const selCat = document.getElementById('item-pur-cat-select')?.value || 'All';
    const selSupplier = document.getElementById('item-pur-supplier-select')?.value || 'All';

    // 1. Filter raw items
    const filteredRaw = this.items.filter(item => {
      const matName = (item.material_name || '').toLowerCase();
      const cat = (item.material_category || '').toLowerCase();
      const sup = (item.supplier_name || '').toLowerCase();
      const inv = (item.invoice_no || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();

      const matchesSearch = matName.includes(term) || cat.includes(term) || sup.includes(term) || inv.includes(term) || notes.includes(term);

      let matchesCat = true;
      if (selCat !== 'All') {
        matchesCat = ((item.material_category || '').toLowerCase() === selCat.toLowerCase());
      }

      let matchesSup = true;
      if (selSupplier !== 'All') {
        matchesSup = ((item.supplier_name || '').trim().toLowerCase() === selSupplier.trim().toLowerCase());
      }

      let matchesPeriod = true;
      if (item.date && this.currentPeriodType !== 'all') {
        const parsed = this.parseDate(item.date);
        if (parsed) {
          if (this.currentPeriodType === 'day' && selDate) {
            matchesPeriod = (parsed.dateStr === selDate);
          } else if (this.currentPeriodType === 'month') {
            const targetM = parseInt(document.getElementById('item-pur-stats-month-select')?.value);
            const targetY = parseInt(document.getElementById('item-pur-stats-month-year-select')?.value);
            if (targetM && targetY) {
              matchesPeriod = (parsed.year === targetY && parsed.month === targetM);
            }
          } else if (this.currentPeriodType === 'year') {
            const targetY = parseInt(document.getElementById('item-pur-stats-year-picker')?.value);
            if (targetY) {
              matchesPeriod = (parsed.year === targetY);
            }
          } else if (this.currentPeriodType === 'custom') {
            const startDate = document.getElementById('item-pur-start-date')?.value;
            const endDate = document.getElementById('item-pur-end-date')?.value;
            if (startDate && endDate) {
              matchesPeriod = (parsed.dateStr >= startDate && parsed.dateStr <= endDate);
            }
          }
        }
      }

      return matchesSearch && matchesCat && matchesSup && matchesPeriod;
    });

    // 2. Group items by material (material_name)
    const groupedMap = new Map();

    filteredRaw.forEach(item => {
      const key = `${(item.material_name || 'Unknown').trim().toLowerCase()}__${(item.unit || '').trim().toLowerCase()}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          key,
          material_id: item.material_id,
          material_name: (item.material_name || 'Unknown').trim(),
          category: item.material_category || 'Raw Material',
          unit: item.unit || 'units',
          totalQty: 0,
          totalSpend: 0,
          ordersCount: 0,
          unitCosts: [],
          suppliersSet: new Set(),
          purchases: []
        });
      }
      const g = groupedMap.get(key);
      const qty = Number(item.qty) || 0;
      const totalCost = Number(item.total_cost) || 0;
      const unitCost = Number(item.unit_cost) || 0;

      g.totalQty += qty;
      g.totalSpend += totalCost;
      g.ordersCount += 1;
      if (unitCost > 0) g.unitCosts.push(unitCost);
      if (item.supplier_name) g.suppliersSet.add(item.supplier_name.trim());
      g.purchases.push(item);
    });

    let groupedList = Array.from(groupedMap.values()).map(g => {
      // Sort internal purchases newest first
      g.purchases.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
      g.avgCost = g.totalQty > 0 ? (g.totalSpend / g.totalQty) : (g.unitCosts[0] || 0);
      g.minCost = g.unitCosts.length ? Math.min(...g.unitCosts) : 0;
      g.maxCost = g.unitCosts.length ? Math.max(...g.unitCosts) : 0;
      g.lastCost = g.purchases.length ? Number(g.purchases[0].unit_cost) || 0 : 0;
      g.suppliers = Array.from(g.suppliersSet);
      return g;
    });

    // 3. Sort grouped items
    groupedList.sort((a, b) => {
      if (term) {
        const nameA = a.material_name.toLowerCase();
        const nameB = b.material_name.toLowerCase();
        const getScore = (name) => {
          if (name.startsWith(term)) return 1;
          const words = name.split(/[\s\-&/]+/);
          if (words.some(w => w.startsWith(term))) return 2;
          return 3;
        };
        const scoreA = getScore(nameA);
        const scoreB = getScore(nameB);
        if (scoreA !== scoreB) return scoreA - scoreB;
      }

      switch (this.currentSort) {
        case 'spend-desc': return b.totalSpend - a.totalSpend;
        case 'spend-asc': return a.totalSpend - b.totalSpend;
        case 'qty-desc': return b.totalQty - a.totalQty;
        case 'qty-asc': return a.totalQty - b.totalQty;
        case 'name-asc': return a.material_name.localeCompare(b.material_name);
        case 'name-desc': return b.material_name.localeCompare(a.material_name);
        case 'orders-desc': return b.ordersCount - a.ordersCount;
        case 'orders-asc': return a.ordersCount - b.ordersCount;
        case 'avgcost-desc': return b.avgCost - a.avgCost;
        case 'avgcost-asc': return a.avgCost - b.avgCost;
        default: return b.totalSpend - a.totalSpend;
      }
    });

    this.currentFilteredGrouped = groupedList;
    this.updateStats(groupedList);
    this.renderList(groupedList);
    this.updateClearPeriodButton();
  },

  updateStats(list) {
    let totalSpend = 0;
    let totalQty = 0;
    let totalOrders = 0;
    const allSuppliers = new Set();

    list.forEach(item => {
      totalSpend += item.totalSpend;
      totalQty += item.totalQty;
      totalOrders += item.ordersCount;
      item.suppliers.forEach(s => allSuppliers.add(s));
    });

    const avgUnitCost = totalQty > 0 ? (totalSpend / totalQty) : 0;

    const elSpend = document.getElementById('item-pur-stat-spend');
    const elQty = document.getElementById('item-pur-stat-qty');
    const elMaterials = document.getElementById('item-pur-stat-materials');
    const elSuppliers = document.getElementById('item-pur-stat-suppliers');
    const elOrders = document.getElementById('item-pur-stat-orders');
    const elAvgCost = document.getElementById('item-pur-stat-avgcost');

    if (elSpend) elSpend.textContent = `Rs. ${totalSpend.toLocaleString()}`;
    if (elQty) elQty.textContent = `${totalQty.toLocaleString()} Units`;
    if (elMaterials) elMaterials.textContent = `${list.length}`;
    if (elSuppliers) elSuppliers.textContent = `${allSuppliers.size}`;
    if (elOrders) elOrders.textContent = `${totalOrders}`;
    if (elAvgCost) elAvgCost.textContent = `Rs. ${avgUnitCost.toFixed(2)}`;
  },

  renderList(list) {
    const tbody = document.getElementById('item-pur-list-body');
    const tfoot = document.getElementById('item-pur-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center py-16">
            <div class="flex flex-col items-center justify-center">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                <i data-lucide="package-search" class="w-7 h-7"></i>
              </div>
              <h4 class="text-sm font-black text-slate-700">No Purchased Items Found</h4>
              <p class="text-xs text-slate-400 mt-0.5">No raw material purchases match your active search, category, or time filters.</p>
            </div>
          </td>
        </tr>
      `;
      if (tfoot) tfoot.innerHTML = '';
      if (window.lucide) lucide.createIcons({ root: tbody });
      return;
    }

    let totalQty = 0;
    let totalSpend = 0;
    let totalOrders = 0;

    tbody.innerHTML = list.map((item, index) => {
      totalQty += item.totalQty;
      totalSpend += item.totalSpend;
      totalOrders += item.ordersCount;

      const isExpanded = this.expandedItems.has(item.key);
      const categoryColor = this.getCategoryBadgeColor(item.category);

      let subtableHtml = '';
      if (isExpanded) {
        subtableHtml = `
          <tr class="bg-slate-50/70 border-b border-slate-200">
            <td colspan="11" class="p-3 pl-12 pr-6">
              <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div class="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i data-lucide="history" class="w-4 h-4 text-emerald-600"></i>
                    <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Purchase History: ${item.material_name}</span>
                    <span class="text-[11px] font-bold text-slate-500">(${item.purchases.length} orders in period)</span>
                  </div>
                  <div class="text-xs font-black text-emerald-700">
                    Total: Rs. ${item.totalSpend.toLocaleString()} (${item.totalQty.toLocaleString()} ${item.unit})
                  </div>
                </div>
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 text-slate-500 font-black uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th class="px-3 py-2">Date</th>
                      <th class="px-3 py-2">Invoice #</th>
                      <th class="px-3 py-2">Supplier</th>
                      <th class="px-3 py-2 text-right">Quantity</th>
                      <th class="px-3 py-2 text-right">Cost Rate</th>
                      <th class="px-3 py-2 text-right">Line Total</th>
                      <th class="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${item.purchases.map(p => `
                      <tr class="hover:bg-slate-50">
                        <td class="px-3 py-2 font-mono font-bold text-slate-700">${app.formatDateOnly ? app.formatDateOnly(p.date) : p.date}</td>
                        <td class="px-3 py-2 font-mono font-bold text-emerald-700">${p.invoice_no || `#${p.id}`}</td>
                        <td class="px-3 py-2 font-bold text-slate-800">${p.supplier_name || 'Standard Supplier'}</td>
                        <td class="px-3 py-2 text-right font-mono font-bold text-slate-900">${Number(p.qty).toLocaleString()} ${item.unit}</td>
                        <td class="px-3 py-2 text-right font-mono font-bold text-slate-700">Rs. ${Number(p.unit_cost).toLocaleString()}</td>
                        <td class="px-3 py-2 text-right font-mono font-black text-emerald-700">Rs. ${Number(p.total_cost).toLocaleString()}</td>
                        <td class="px-3 py-2 text-slate-500 text-[11px] italic max-w-xs truncate">${p.notes || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        `;
      }

      const supplierBadges = item.suppliers.length > 0 
        ? item.suppliers.slice(0, 2).map(s => `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 mr-1 inline-block">${s}</span>`).join('') + (item.suppliers.length > 2 ? `<span class="text-[10px] font-bold text-slate-400">+${item.suppliers.length - 2} more</span>` : '')
        : '<span class="text-slate-400 text-xs italic">-</span>';

      return `
        <tr class="hover:bg-emerald-50/40 transition-colors border-b border-slate-100 cursor-pointer ${isExpanded ? 'bg-emerald-50/30' : ''}" onclick="ItemPurchases.toggleExpand('${item.key}')">
          <td class="px-3 py-3 text-center border-r border-slate-100 text-slate-400 font-mono text-xs font-black">${index + 1}</td>
          <td class="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
            <div class="flex items-center gap-2">
              <button class="p-1 rounded-md hover:bg-slate-200 text-slate-400 transition-colors" title="Toggle order details">
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" class="w-4 h-4"></i>
              </button>
              <div>
                <span class="text-slate-900 font-black text-[13px]">${item.material_name}</span>
                ${item.minCost !== item.maxCost ? `<span class="text-[10px] text-slate-400 font-normal ml-1.5">(rates: Rs. ${item.minCost} - ${item.maxCost})</span>` : ''}
              </div>
            </div>
          </td>
          <td class="px-3 py-3 text-center border-r border-slate-100">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${categoryColor}">
              ${item.category}
            </span>
          </td>
          <td class="px-3 py-3 text-center border-r border-slate-100 font-bold text-slate-600 text-xs uppercase">${item.unit}</td>
          <td class="px-4 py-3 text-right border-r border-slate-100 font-mono font-black text-slate-900 text-xs">
            ${item.totalQty.toLocaleString()} <span class="text-[10px] font-bold text-slate-400 lowercase">${item.unit}</span>
          </td>
          <td class="px-4 py-3 text-right border-r border-slate-100 font-mono font-bold text-slate-700 text-xs">
            Rs. ${item.avgCost.toFixed(2)}
          </td>
          <td class="px-4 py-3 text-right border-r border-slate-100 font-mono font-bold text-slate-600 text-xs">
            Rs. ${item.lastCost.toLocaleString()}
          </td>
          <td class="px-4 py-3 text-right border-r border-slate-100 font-mono font-black text-emerald-700 text-xs">
            Rs. ${item.totalSpend.toLocaleString()}
          </td>
          <td class="px-3 py-3 text-center border-r border-slate-100 font-mono font-bold text-xs">
            <span class="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 font-black text-[11px]">
              ${item.ordersCount} ${item.ordersCount === 1 ? 'order' : 'orders'}
            </span>
          </td>
          <td class="px-4 py-3 border-r border-slate-100">
            ${supplierBadges}
          </td>
          <td class="px-3 py-3 text-center">
            <button class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all" title="View purchases breakdown">
              <i data-lucide="${isExpanded ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        </tr>
        ${subtableHtml}
      `;
    }).join('');

    if (tfoot) {
      tfoot.innerHTML = `
        <tr class="bg-slate-100 border-t-2 border-slate-300">
          <td class="px-3 py-3 text-center text-slate-500 font-black">â€¢</td>
          <td class="px-4 py-3 text-slate-900 uppercase tracking-wider font-black">
            TOTAL (${list.length} RAW MATERIALS)
          </td>
          <td colspan="2" class="px-3 py-3 text-center text-slate-500 font-bold text-[11px]">-</td>
          <td class="px-4 py-3 text-right font-mono font-black text-slate-900">
            ${totalQty.toLocaleString()} Units
          </td>
          <td class="px-4 py-3 text-right font-mono font-bold text-slate-600 text-[11px]">
            Avg: Rs. ${(totalQty > 0 ? (totalSpend / totalQty) : 0).toFixed(2)}
          </td>
          <td class="px-4 py-3 text-right text-slate-400 font-bold text-[11px]">-</td>
          <td class="px-4 py-3 text-right font-mono font-black text-emerald-800 text-sm">
            Rs. ${totalSpend.toLocaleString()}
          </td>
          <td class="px-3 py-3 text-center font-mono font-black text-slate-800">
            ${totalOrders}
          </td>
          <td colspan="2" class="px-4 py-3 text-slate-400 text-right text-[11px] font-bold">
            All records in selected period
          </td>
        </tr>
      `;
    }

    if (window.lucide) lucide.createIcons({ root: tbody });
  },

  getCategoryBadgeColor(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('dairy') || cat.includes('milk')) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (cat.includes('sugar') || cat.includes('sweet')) return 'bg-pink-100 text-pink-800 border border-pink-200';
    if (cat.includes('flavor') || cat.includes('colour') || cat.includes('color')) return 'bg-purple-100 text-purple-800 border border-purple-200';
    if (cat.includes('pack') || cat.includes('box') || cat.includes('shoper')) return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (cat.includes('stick') || cat.includes('wood')) return 'bg-orange-100 text-orange-800 border border-orange-200';
    if (cat.includes('fat') || cat.includes('oil') || cat.includes('butter')) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  },

  async printReport() {
    const list = this.currentFilteredGrouped || [];
    if (list.length === 0) {
      app.showAlert("No items to print for the selected period.");
      return;
    }

    try {
      app.showLoading();
      const settings = (await window.api.getSettings()) || {};
      const companyName = settings.company_name || 'Delicious Superstar Foods';
      const address = settings.address || 'Hasan Abdal';
      const phone = settings.phone || '0315-6795995';

      let periodLabel = 'All Time';
      if (this.currentPeriodType === 'day') {
        const d = document.getElementById('item-pur-stats-date-picker')?.value;
        periodLabel = `Daily: ${d || 'Today'}`;
      } else if (this.currentPeriodType === 'month') {
        const m = document.getElementById('item-pur-stats-month-select')?.value;
        const y = document.getElementById('item-pur-stats-month-year-select')?.value;
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        periodLabel = `Monthly: ${monthNames[parseInt(m)] || m} ${y}`;
      } else if (this.currentPeriodType === 'year') {
        const y = document.getElementById('item-pur-stats-year-picker')?.value;
        periodLabel = `Annual: ${y}`;
      } else if (this.currentPeriodType === 'custom') {
        const s = document.getElementById('item-pur-start-date')?.value;
        const e = document.getElementById('item-pur-end-date')?.value;
        periodLabel = `Custom: ${s ? (app.formatDateOnly ? app.formatDateOnly(s) : s) : ''} - ${e ? (app.formatDateOnly ? app.formatDateOnly(e) : e) : ''}`;
      }

      let totalQty = 0, totalSpend = 0, totalOrders = 0;
      list.forEach(i => {
        totalQty += i.totalQty;
        totalSpend += i.totalSpend;
        totalOrders += i.ordersCount;
      });

      const rowsHtml = list.map((item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 5px 6px; text-align: center; font-size: 10px; color: #64748b; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 5px 6px; font-weight: bold; font-size: 11px; color: #0f172a;">${item.material_name}</td>
          <td style="padding: 5px 6px; text-align: center; font-size: 10px; color: #475569;">${item.category}</td>
          <td style="padding: 5px 6px; text-align: center; font-size: 10px; text-transform: uppercase;">${item.unit}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; font-size: 11px; font-family: monospace;">${item.totalQty.toLocaleString()}</td>
          <td style="padding: 5px 6px; text-align: right; font-size: 10px; font-family: monospace;">Rs. ${item.avgCost.toFixed(2)}</td>
          <td style="padding: 5px 6px; text-align: right; font-size: 10px; font-family: monospace;">Rs. ${item.lastCost.toLocaleString()}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; font-size: 11px; color: #047857; font-family: monospace;">Rs. ${item.totalSpend.toLocaleString()}</td>
          <td style="padding: 5px 6px; text-align: center; font-size: 10px; font-weight: bold;">${item.ordersCount}</td>
          <td style="padding: 5px 6px; font-size: 9.5px; color: #475569;">${item.suppliers.join(', ') || '-'}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Item Wise Purchases Report</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; font-size: 10.5px; }
            .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; }
            .kpi-table { width: 100%; margin-bottom: 8px; border-collapse: collapse; }
            .kpi-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; text-align: center; }
            .kpi-val { font-size: 13px; font-weight: 800; color: #0f172a; }
            .kpi-lbl { font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            table.data-table th { background-color: #0f172a; color: #ffffff; font-size: 9px; text-transform: uppercase; padding: 5px 6px; letter-spacing: 0.5px; }
            table.data-table td { font-size: 10px; }
            .footer-row td { background: #e2e8f0; font-weight: 800; border-top: 2px solid #0f172a; padding: 6px; font-size: 10.5px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <h2 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${companyName}</h2>
                <div style="font-size: 9.5px; color: #475569; margin-top: 1px;">${address} â€¢ Tel: ${phone}</div>
                <div style="font-size: 10px; font-weight: 800; color: #047857; margin-top: 2px;">ITEM WISE RAW MATERIAL PURCHASES REPORT</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div style="font-size: 10px; font-weight: 800; color: #0f172a;">PERIOD: <span style="color: #047857;">${periodLabel}</span></div>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Generated: ${new Date().toLocaleString()}</div>
              </td>
            </tr>
          </table>

          <table class="kpi-table">
            <tr>
              <td style="width: 25%; padding-right: 4px;">
                <div class="kpi-box">
                  <div class="kpi-lbl">Total Spend</div>
                  <div class="kpi-val" style="color: #047857;">Rs. ${totalSpend.toLocaleString()}</div>
                </div>
              </td>
              <td style="width: 25%; padding-right: 4px;">
                <div class="kpi-box">
                  <div class="kpi-lbl">Total Quantity</div>
                  <div class="kpi-val">${totalQty.toLocaleString()} Units</div>
                </div>
              </td>
              <td style="width: 25%; padding-right: 4px;">
                <div class="kpi-box">
                  <div class="kpi-lbl">Raw Materials</div>
                  <div class="kpi-val">${list.length} Items</div>
                </div>
              </td>
              <td style="width: 25%;">
                <div class="kpi-box">
                  <div class="kpi-lbl">Total Orders</div>
                  <div class="kpi-val">${totalOrders}</div>
                </div>
              </td>
            </tr>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 24px; text-align: center;">#</th>
                <th style="text-align: left;">Material Name</th>
                <th style="text-align: center; width: 65px;">Category</th>
                <th style="text-align: center; width: 45px;">Unit</th>
                <th style="text-align: right; width: 65px;">Qty Bought</th>
                <th style="text-align: right; width: 65px;">Avg Cost</th>
                <th style="text-align: right; width: 65px;">Last Cost</th>
                <th style="text-align: right; width: 85px;">Total Spend</th>
                <th style="text-align: center; width: 45px;">Orders</th>
                <th style="text-align: left;">Suppliers</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr class="footer-row">
                <td style="text-align: center;">â€¢</td>
                <td colspan="3">GRAND TOTAL (${list.length} RAW MATERIALS)</td>
                <td style="text-align: right; font-family: monospace;">${totalQty.toLocaleString()}</td>
                <td style="text-align: right; font-family: monospace;">Rs. ${(totalQty > 0 ? (totalSpend / totalQty) : 0).toFixed(2)}</td>
                <td></td>
                <td style="text-align: right; color: #047857; font-family: monospace;">Rs. ${totalSpend.toLocaleString()}</td>
                <td style="text-align: center; font-family: monospace;">${totalOrders}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </body>
        </html>
      `;

      app.hideLoading();
      app.showA5Preview(html, 'Item Wise Purchases Report (A5)');
    } catch (err) {
      app.hideLoading();
      console.error('Failed to print item purchases report:', err);
      app.showAlert('Failed to generate printable report: ' + err.message);
    }
  }
};
