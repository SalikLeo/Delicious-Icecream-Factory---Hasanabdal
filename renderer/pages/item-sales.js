window.ItemSales = {
  items: [],
  categoryLabels: {},
  sellers: [],
  currentPeriodType: 'day',
  currentSort: 'qty-desc',
  currentPage: 1,
  pageSize: 50,
  currentFilteredGrouped: [],
  expandedItems: new Set(),
  selectedMethod: 'All',
  selectedSaleMode: 'All',
  selectedCategory: 'All',
  selectedSeller: 'All',

  async render(container) {
    const savedShowStats = window.storage.get('item_sales_show_stats');
    const isStatsVisible = savedShowStats !== null ? Boolean(savedShowStats) : true;

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 no-print">
        <div>
          <div class="flex items-center gap-3">
            <button onclick="app.navigate('proposals')" class="h-10 px-3 hover:bg-slate-50 bg-white border border-slate-200 text-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer" title="Back to Sales History">
              <i data-lucide="arrow-left" class="w-4 h-4 text-slate-600"></i>
              <span>Sales History</span>
            </button>
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="package" class="w-5 h-5"></i>
            </div>
            <h2 class="text-3xl font-bold text-slate-800">Item Wise Sales</h2>
          </div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <button onclick="ItemSales.toggleStats()" id="item-stats-toggle-btn" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
            <i data-lucide="${isStatsVisible ? 'eye-off' : 'eye'}" class="w-4 h-4 text-slate-400" id="item-stats-toggle-icon"></i>
            <span id="item-stats-toggle-text">${isStatsVisible ? 'Hide Stats' : 'Show Stats'}</span>
          </button>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div id="item-stats-container" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 ${isStatsVisible ? '' : 'hidden'}">
        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <i data-lucide="package" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Items Sold</p>
            <h3 class="text-base font-black text-slate-800 font-outfit" id="item-stat-qty">0</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <i data-lucide="banknote" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest truncate">Total Revenue</p>
            <h3 class="text-base font-black text-emerald-700 font-outfit truncate" id="item-stat-total">Rs. 0</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <i data-lucide="shopping-cart" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-red-500 uppercase tracking-widest truncate">Product Cost</p>
            <h3 class="text-base font-black text-red-700 font-outfit truncate" id="item-stat-cost">Rs. 0</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <i data-lucide="trending-up" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest truncate">Gross Profit</p>
            <h3 class="text-base font-black text-amber-700 font-outfit truncate" id="item-stat-profit">Rs. 0</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <i data-lucide="percent" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest truncate">Avg Margin</p>
            <h3 class="text-base font-black text-blue-700 font-outfit truncate" id="item-stat-margin">0%</h3>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <i data-lucide="layers" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-purple-600 uppercase tracking-widest truncate">Unique Products</p>
            <h3 class="text-base font-black text-purple-700 font-outfit truncate" id="item-stat-products">0</h3>
          </div>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-3 items-center flex-wrap">
        <!-- Search -->
        <div class="relative flex-1 min-w-[220px]">
          <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="item-search" oninput="ItemSales.applyFilters()" placeholder="Search by item name, description, section, invoice..." class="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-xs font-medium">
          <button type="button" id="item-search-clear-btn" onclick="ItemSales.clearSearch()" title="Clear search" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </div>
        
        <div class="flex gap-3 items-center flex-wrap pl-2 border-l border-slate-200">
          <!-- Sort Dropdown -->
          <div class="flex gap-1.5 items-center">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Sort</label>
            <select id="item-sort-select" onchange="ItemSales.setSort(this.value)" class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-white text-slate-700 transition-all outline-none cursor-pointer">
              <option value="qty-desc">Quantity Sold (High to Low)</option>
              <option value="qty-asc">Quantity Sold (Low to High)</option>
              <option value="revenue-desc">Total Revenue (High to Low)</option>
              <option value="revenue-asc">Total Revenue (Low to High)</option>
              <option value="profit-desc">Gross Profit (High to Low)</option>
              <option value="profit-asc">Gross Profit (Low to High)</option>
              <option value="name-asc">Item Name (A to Z)</option>
              <option value="name-desc">Item Name (Z to A)</option>
              <option value="orders-desc">Orders Count (High to Low)</option>
            </select>
          </div>

          <!-- Category dropdown -->
          <div class="flex gap-1.5 items-center">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</label>
            <select id="item-cat-select" onchange="ItemSales.applyFilters()" class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-white text-slate-700 transition-all outline-none cursor-pointer min-w-[110px]">
              <option value="All">All Categories</option>
            </select>
          </div>

          <!-- Payment Method dropdown -->
          <div class="flex gap-1.5 items-center">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Method</label>
            <select id="item-method-select" onchange="ItemSales.applyFilters()" class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-white text-slate-700 transition-all outline-none cursor-pointer">
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
            </select>
          </div>

          <!-- Period controls -->
          <div class="flex gap-2 items-center flex-wrap">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Period</label>
            <div class="flex bg-slate-100 p-1 rounded-lg">
               <button id="item-period-day-tab" onclick="ItemSales.setPeriodType('day')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer">Daily</button>
               <button id="item-period-month-tab" onclick="ItemSales.setPeriodType('month')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Monthly</button>
               <button id="item-period-year-tab" onclick="ItemSales.setPeriodType('year')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Annual</button>
               <button id="item-period-all-tab" onclick="ItemSales.setPeriodType('all')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">All</button>
            </div>

            <!-- Daily navigation controls -->
            <div id="item-daily-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
               <button onclick="ItemSales.changeDateStep(-1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Day">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <input type="date" id="item-stats-date-picker" onchange="ItemSales.applyFilters()" oninput="ItemSales.applyFilters()" class="bg-transparent border-0 px-1 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               <button onclick="ItemSales.changeDateStep(1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Day">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button onclick="ItemSales.setToday()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer ml-0.5">Today</button>
            </div>

            <!-- Monthly navigation controls -->
            <div id="item-monthly-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <button onclick="ItemSales.changeMonthStep(-1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Month">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <select id="item-stats-month-select" onchange="ItemSales.applyFilters()" oninput="ItemSales.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
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
               <select id="item-stats-month-year-select" onchange="ItemSales.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
               <button onclick="ItemSales.changeMonthStep(1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Month">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button onclick="ItemSales.setThisMonth()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer ml-0.5">This Month</button>
            </div>

            <!-- Annual controls -->
            <div id="item-annual-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <select id="item-stats-year-picker" onchange="ItemSales.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
            </div>

            <button id="item-clear-period-btn" onclick="ItemSales.resetPeriodToDefault()" class="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-md transition-all hidden cursor-pointer" title="Reset to Daily (Today)">
               <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Item Sales Table -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-230px)] flex flex-col">
        <div class="overflow-auto flex-1 relative">
          <table class="w-full text-sm text-left border-collapse border-b border-slate-200">
            <thead class="bg-slate-50 text-slate-500 uppercase text-[11px] font-black tracking-wider sticky top-0 z-10 shadow-sm border-b border-slate-200">
              <tr class="border-b border-slate-200">
                <th class="px-2 py-2.5 text-center w-10 border-r border-slate-200 text-slate-400 bg-slate-50 font-black text-[12px]">#</th>
                <th class="px-4 py-2.5 border-r border-slate-200 bg-slate-50 font-black text-[11px] uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onclick="ItemSales.toggleColumnSort('name')">
                  <div class="flex items-center justify-between gap-1">
                    <span>Item Name / Description</span>
                    <i data-lucide="arrow-up-down" class="w-3.5 h-3.5 text-slate-400"></i>
                  </div>
                </th>
                <th class="px-4 py-2.5 border-r border-slate-200 bg-slate-50 font-black text-[11px] uppercase tracking-wider text-center w-20">Unit</th>
                <th class="px-4 py-2.5 border-r border-slate-200 bg-slate-50 font-black text-[11px] uppercase tracking-wider text-center w-24 cursor-pointer hover:bg-slate-100 transition-colors" onclick="ItemSales.toggleColumnSort('qty')">
                  <div class="flex items-center justify-center gap-1">
                    <span>Qty Sold</span>
                    <i data-lucide="arrow-up-down" class="w-3.5 h-3.5 text-slate-400"></i>
                  </div>
                </th>
                <th class="px-4 py-2.5 border-r border-slate-200 text-right bg-slate-50 font-black text-[11px] uppercase tracking-wider w-28">Avg Price</th>
                <th class="px-4 py-2.5 border-r border-slate-200 text-right bg-slate-50 font-black text-[11px] uppercase tracking-wider w-28">Total Cost</th>
                <th class="px-4 py-2.5 border-r border-slate-200 text-right bg-slate-50 font-black text-[11px] uppercase tracking-wider w-32 cursor-pointer hover:bg-slate-100 transition-colors" onclick="ItemSales.toggleColumnSort('revenue')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Total Sales</span>
                    <i data-lucide="arrow-up-down" class="w-3.5 h-3.5 text-slate-400"></i>
                  </div>
                </th>
                <th class="px-4 py-2.5 border-r border-slate-200 text-right bg-slate-50 font-black text-[11px] uppercase tracking-wider w-32 cursor-pointer hover:bg-slate-100 transition-colors" onclick="ItemSales.toggleColumnSort('profit')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Profit</span>
                    <i data-lucide="arrow-up-down" class="w-3.5 h-3.5 text-slate-400"></i>
                  </div>
                </th>
                <th class="px-4 py-2.5 text-center bg-slate-50 font-black text-[11px] uppercase tracking-wider w-20">Margin</th>
              </tr>
            </thead>
            <tbody id="item-sales-list-body" class="divide-y divide-slate-200 bg-white"></tbody>
          </table>
        </div>
        <div id="item-sales-pagination-footer" class="shrink-0"></div>
      </div>
    `;

    try {
      app.showLoading();
      const now = new Date();
      const datePicker = document.getElementById('item-stats-date-picker');
      const monthSelect = document.getElementById('item-stats-month-select');
      
      if (datePicker) {
        datePicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }
      if (monthSelect) {
        monthSelect.value = now.getMonth() + 1;
      }

      await this.loadData();
      this.setPeriodType('day');
      app.hideLoading();
    } catch (e) {
      console.error('[ITEM-SALES] Render error:', e);
      app.hideLoading();
    }
    if (window.lucide) lucide.createIcons();
  },

  async loadData() {
    try {
      this.items = await window.api.getAllProposalItems() || [];
      const tbody = document.getElementById('item-sales-list-body');
      if (!tbody) {
        return;
      }
      const catLabels = await window.api.getCategoryLabels() || [];
      this.categoryLabels = {};
      catLabels.forEach(c => {
        this.categoryLabels[c.slug] = c.label;
      });

      // Populate Category Dropdown
      const catSelect = document.getElementById('item-cat-select');
      if (catSelect) {
        const curCat = catSelect.value || 'All';
        let catOptions = `<option value="All">All Categories</option>`;
        const sections = new Set();
        this.items.forEach(i => {
          if (i.section) sections.add(i.section);
        });
        Array.from(sections).sort().forEach(sec => {
          const label = this.categoryLabels[sec] || sec.toUpperCase();
          catOptions += `<option value="${sec}">${label}</option>`;
        });
        catSelect.innerHTML = catOptions;
        catSelect.value = curCat;
      }

      const now = new Date();
      const monthYearSelect = document.getElementById('item-stats-month-year-select');
      const yearPicker = document.getElementById('item-stats-year-picker');
      
      const yearSet = new Set([now.getFullYear()]);
      this.items.forEach(item => {
        if (item.date) {
          const parsed = this.parseSaleDate(item.date);
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
      console.error('[ITEM-SALES] loadData error:', e);
    }
  },

  parseSaleDate(dateStr) {
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
    ['day', 'month', 'year', 'all'].forEach(t => {
      const tab = document.getElementById(`item-period-${t}-tab`);
      if (tab) {
        if (t === type) {
          tab.className = 'px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer';
        } else {
          tab.className = 'px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer';
        }
      }
    });

    const dailyEl = document.getElementById('item-daily-controls');
    const monthlyEl = document.getElementById('item-monthly-controls');
    const annualEl = document.getElementById('item-annual-controls');

    if (dailyEl) dailyEl.classList.toggle('hidden', type !== 'day');
    if (monthlyEl) monthlyEl.classList.toggle('hidden', type !== 'month');
    if (annualEl) annualEl.classList.toggle('hidden', type !== 'year');

    this.applyFilters();
  },

  setToday() {
    const now = new Date();
    const datePicker = document.getElementById('item-stats-date-picker');
    if (datePicker) {
      datePicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    this.applyFilters();
  },

  setThisMonth() {
    const now = new Date();
    const monthSelect = document.getElementById('item-stats-month-select');
    const monthYearSelect = document.getElementById('item-stats-month-year-select');
    if (monthSelect) monthSelect.value = now.getMonth() + 1;
    if (monthYearSelect) monthYearSelect.value = now.getFullYear();
    this.applyFilters();
  },

  changeDateStep(step) {
    const picker = document.getElementById('item-stats-date-picker');
    if (!picker || !picker.value) return;
    const parts = picker.value.split('-');
    const curDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    curDate.setDate(curDate.getDate() + step);
    picker.value = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
    this.applyFilters();
  },

  changeMonthStep(step) {
    const mSelect = document.getElementById('item-stats-month-select');
    const ySelect = document.getElementById('item-stats-month-year-select');
    if (!mSelect || !ySelect) return;
    let m = parseInt(mSelect.value) + step;
    let y = parseInt(ySelect.value);
    if (m < 1) { m = 12; y -= 1; }
    else if (m > 12) { m = 1; y += 1; }
    
    // Check if y exists in year options, if not add it
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
    const select = document.getElementById('item-sort-select');
    if (select) select.value = sortValue;
    this.applyFilters();
  },

  toggleColumnSort(col) {
    if (col === 'qty') {
      this.currentSort = (this.currentSort === 'qty-desc') ? 'qty-asc' : 'qty-desc';
    } else if (col === 'revenue') {
      this.currentSort = (this.currentSort === 'revenue-desc') ? 'revenue-asc' : 'revenue-desc';
    } else if (col === 'profit') {
      this.currentSort = (this.currentSort === 'profit-desc') ? 'profit-asc' : 'profit-desc';
    } else if (col === 'name') {
      this.currentSort = (this.currentSort === 'name-asc') ? 'name-desc' : 'name-asc';
    }
    const select = document.getElementById('item-sort-select');
    if (select) select.value = this.currentSort;
    this.applyFilters();
  },

  clearSearch() {
    const input = document.getElementById('item-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applyFilters();
  },

  applyFilters() {
    const searchInput = document.getElementById('item-search');
    const clearBtn = document.getElementById('item-search-clear-btn');
    const term = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const selDate = document.getElementById('item-stats-date-picker')?.value;
    const selCat = document.getElementById('item-cat-select')?.value || 'All';
    const selMethod = document.getElementById('item-method-select')?.value || 'All';

    // 1. Filter raw items matching period and criteria
    const filteredRaw = this.items.filter(item => {
      // Search match
      const desc = (item.description || '').toLowerCase();
      const sec = (item.section || '').toLowerCase();
      const catLabel = (this.categoryLabels[item.section] || '').toLowerCase();
      const propNum = (item.proposal_number || '').toLowerCase();
      const custName = (item.customer_name || '').toLowerCase();
      const seller = (item.seller_name || '').toLowerCase();

      const matchesSearch = desc.includes(term) || sec.includes(term) || catLabel.includes(term) || propNum.includes(term) || custName.includes(term) || seller.includes(term);

      // Category match
      let matchesCat = true;
      if (selCat !== 'All') {
        matchesCat = (item.section === selCat);
      }

      // Method match
      let matchesMethod = true;
      if (selMethod !== 'All') {
        matchesMethod = ((item.payment_method || 'Cash').toLowerCase() === selMethod.toLowerCase());
      }

      // Period match
      let matchesPeriod = true;
      if (item.date && this.currentPeriodType !== 'all') {
        const parsed = this.parseSaleDate(item.date);
        if (parsed) {
          if (this.currentPeriodType === 'day' && selDate) {
            matchesPeriod = (parsed.dateStr === selDate);
          } else if (this.currentPeriodType === 'month') {
            const targetM = parseInt(document.getElementById('item-stats-month-select')?.value);
            const targetY = parseInt(document.getElementById('item-stats-month-year-select')?.value);
            if (targetM && targetY) {
              matchesPeriod = (parsed.year === targetY && parsed.month === targetM);
            }
          } else if (this.currentPeriodType === 'year') {
            const targetY = parseInt(document.getElementById('item-stats-year-picker')?.value);
            if (targetY) {
              matchesPeriod = (parsed.year === targetY);
            }
          }
        }
      }

      return matchesSearch && matchesCat && matchesMethod && matchesPeriod;
    });

    // 2. Group items by item key (description + section)
    const groupedMap = new Map();

    filteredRaw.forEach(item => {
      const key = `${item.section || 'oth'}__${(item.description || 'Unknown').trim()}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          key,
          description: (item.description || 'Unknown').trim(),
          section: item.section || 'others',
          unit: item.unit || '-',
          totalQty: 0,
          totalCost: 0,
          totalRevenue: 0,
          totalProfit: 0,
          invoicesCount: 0,
          invoices: []
        });
      }
      const g = groupedMap.get(key);
      const qty = Number(item.qty) || 0;
      const cost = Number(item.line_cost) || 0;
      const rev = Number(item.line_retail) || 0;
      const profit = Number(item.line_profit) || (rev - cost);

      g.totalQty += qty;
      g.totalCost += cost;
      g.totalRevenue += rev;
      g.totalProfit += profit;
      g.invoicesCount += 1;
      g.invoices.push(item);
    });

    let groupedList = Array.from(groupedMap.values());

    // 3. Sort grouped items
    groupedList.sort((a, b) => {
      if (term) {
        const nameA = (a.description || '').toLowerCase();
        const nameB = (b.description || '').toLowerCase();
        const getScore = (name) => {
          if (name.startsWith(term)) return 1;
          const words = name.split(/[\s\-&/]+/);
          if (words.some(w => w.startsWith(term))) return 2;
          return 3;
        };
        const scoreA = getScore(nameA);
        const scoreB = getScore(nameB);
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
      }

      switch (this.currentSort) {
        case 'qty-desc': return b.totalQty - a.totalQty;
        case 'qty-asc': return a.totalQty - b.totalQty;
        case 'revenue-desc': return b.totalRevenue - a.totalRevenue;
        case 'revenue-asc': return a.totalRevenue - b.totalRevenue;
        case 'profit-desc': return b.totalProfit - a.totalProfit;
        case 'profit-asc': return a.totalProfit - b.totalProfit;
        case 'name-asc': return a.description.localeCompare(b.description);
        case 'name-desc': return b.description.localeCompare(a.description);
        case 'orders-desc': return b.invoicesCount - a.invoicesCount;
        default: return b.totalQty - a.totalQty;
      }
    });

    this.currentPage = 1;
    this.currentFilteredGrouped = groupedList;
    this.updateStats(groupedList);
    this.renderList(groupedList);
    this.updateClearPeriodButton();
  },

  changePage(page) {
    this.currentPage = page;
    this.renderList(this.currentFilteredGrouped || []);
  },

  updateStats(list) {
    let totalQty = 0, totalRev = 0, totalCost = 0, totalProfit = 0;
    list.forEach(g => {
      totalQty += g.totalQty;
      totalRev += g.totalRevenue;
      totalCost += g.totalCost;
      totalProfit += g.totalProfit;
    });

    const margin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0.0';

    const qtyEl = document.getElementById('item-stat-qty');
    const revEl = document.getElementById('item-stat-total');
    const costEl = document.getElementById('item-stat-cost');
    const profitEl = document.getElementById('item-stat-profit');
    const marginEl = document.getElementById('item-stat-margin');
    const productsEl = document.getElementById('item-stat-products');

    if (qtyEl) qtyEl.textContent = app.formatQty(totalQty);
    if (revEl) revEl.textContent = app.formatCurrency(totalRev);
    if (costEl) costEl.textContent = app.formatCurrency(totalCost);
    if (profitEl) profitEl.textContent = app.formatCurrency(totalProfit);
    if (marginEl) marginEl.textContent = `${margin}%`;
    if (productsEl) productsEl.textContent = list.length.toLocaleString();
  },

  renderList(list) {
    this.currentFilteredGrouped = list || [];
    const tbody = document.getElementById('item-sales-list-body');
    const footer = document.getElementById('item-sales-pagination-footer');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-12 text-center text-slate-400 font-medium">No item sales recorded for this period.</td></tr>`;
      if (footer) footer.innerHTML = '';
      if (window.lucide) lucide.createIcons();
      return;
    }

    const total = list.length;
    const totalPages = Math.ceil(total / this.pageSize);
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, total);
    const paginated = list.slice(startIdx, endIdx);

    let rowsHtml = '';
    paginated.forEach((item, idx) => {
      const rowNum = startIdx + idx + 1;
      const avgPrice = item.totalQty > 0 ? (item.totalRevenue / item.totalQty) : 0;
      const margin = item.totalRevenue > 0 ? ((item.totalProfit / item.totalRevenue) * 100).toFixed(1) : '0.0';
      const catLabel = this.categoryLabels[item.section] || item.section.toUpperCase();

      rowsHtml += `
        <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-200">
          <td class="px-2 py-2 text-center font-bold text-slate-400 tabular-nums border-r border-slate-200 text-xs">${rowNum}</td>
          <td class="px-4 py-2 border-r border-slate-200">
            <div class="font-bold text-slate-800 uppercase tracking-tight text-xs flex items-center gap-1.5 flex-wrap">
              <span>${item.description}</span>
              <span class="text-slate-500 font-bold text-[11px] normal-case">(${catLabel})</span>
            </div>
          </td>
          <td class="px-4 py-2 border-r border-slate-200 text-center font-bold text-slate-600 text-xs">${item.unit}</td>
          <td class="px-4 py-2 border-r border-slate-200 text-center">
            <span class="font-black text-slate-800 tabular-nums text-xs px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg inline-block">
              ${app.formatQty(item.totalQty)}
            </span>
          </td>
          <td class="px-4 py-2 border-r border-slate-200 text-right font-bold text-slate-700 text-xs tabular-nums">
            ${app.formatAmount(avgPrice)}
          </td>
          <td class="px-4 py-2 border-r border-slate-200 text-right font-bold text-red-600 text-xs tabular-nums">
            ${app.formatCurrency(item.totalCost)}
          </td>
          <td class="px-4 py-2 border-r border-slate-200 text-right font-black text-emerald-700 text-xs tabular-nums">
            ${app.formatCurrency(item.totalRevenue)}
          </td>
          <td class="px-4 py-2 border-r border-slate-200 text-right font-black text-amber-700 text-xs tabular-nums">
            ${app.formatCurrency(item.totalProfit)}
          </td>
          <td class="px-4 py-2 text-center">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${Number(margin) >= 20 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
              ${margin}%
            </span>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;

    if (footer) {
      if (total <= this.pageSize) {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500">
            <span>Showing all <span class="font-black text-slate-800">${total}</span> item${total === 1 ? '' : 's'}</span>
          </div>
        `;
      } else {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-600 flex-wrap gap-2 select-none">
            <div>
              Showing <span class="font-black text-slate-900">${startIdx + 1}</span> - <span class="font-black text-slate-900">${endIdx}</span> of <span class="font-black text-slate-900">${total}</span> items
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="ItemSales.changePage(' + (this.currentPage - 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                <span>Prev</span>
              </button>
              <span class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-black">
                Page ${this.currentPage} of ${totalPages}
              </span>
              <button type="button" ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="ItemSales.changePage(' + (this.currentPage + 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <span>Next</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  toggleExpand(encodedKey) {
    const key = decodeURIComponent(encodedKey);
    if (this.expandedItems.has(key)) {
      this.expandedItems.delete(key);
    } else {
      this.expandedItems.add(key);
    }
    this.renderList(this.currentFilteredGrouped || []);
  },

  async viewInvoiceReceipt(proposalId) {
    try {
      app.showLoading();
      const proposal = await window.api.getProposal(proposalId);
      app.hideLoading();
      if (proposal && window.SalesForm) {
        SalesForm.settings = await window.api.getSettings();
        const html = SalesForm.generateReceiptHTML(proposal);
        SalesForm.showPrintPreview();
      }
    } catch (e) {
      console.error(e);
      app.hideLoading();
    }
  },

  toggleStats() {
    const container = document.getElementById('item-stats-container');
    if (!container) return;
    container.classList.toggle('hidden');
    const isHidden = container.classList.contains('hidden');
    window.storage.set('item_sales_show_stats', !isHidden);
    const textEl = document.getElementById('item-stats-toggle-text');
    const iconEl = document.getElementById('item-stats-toggle-icon');
    if (textEl) textEl.textContent = isHidden ? 'Show Stats' : 'Hide Stats';
    if (iconEl) iconEl.setAttribute('data-lucide', isHidden ? 'eye' : 'eye-off');
    if (window.lucide) lucide.createIcons();
  },

  updateClearPeriodButton() {
    const btn = document.getElementById('item-clear-period-btn');
    if (!btn) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selDate = document.getElementById('item-stats-date-picker')?.value;

    const isDefaultDaily = (this.currentPeriodType === 'day' && selDate === todayStr);
    btn.classList.toggle('hidden', isDefaultDaily);
  },

  resetPeriodToDefault() {
    this.setToday();
    this.setPeriodType('day');
  },

  async printReport() {
    const list = this.currentFilteredGrouped || [];
    if (list.length === 0) {
      app.showAlert("No items to print for the selected period.");
      return;
    }

    try {
      app.showLoading();
      const settings = await window.api.getSettings();
      let periodLabel = 'All Time';
      if (this.currentPeriodType === 'day') {
        const d = document.getElementById('item-stats-date-picker')?.value;
        periodLabel = `Daily: ${d || 'Today'}`;
      } else if (this.currentPeriodType === 'month') {
        const m = document.getElementById('item-stats-month-select')?.value;
        const y = document.getElementById('item-stats-month-year-select')?.value;
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        periodLabel = `Monthly: ${monthNames[parseInt(m)]} ${y}`;
      } else if (this.currentPeriodType === 'year') {
        const y = document.getElementById('item-stats-year-picker')?.value;
        periodLabel = `Annual: ${y}`;
      }

      let totalQty = 0, totalRev = 0, totalCost = 0, totalProfit = 0;
      list.forEach(i => {
        totalQty += i.totalQty;
        totalRev += i.totalRevenue;
        totalCost += i.totalCost;
        totalProfit += i.totalProfit;
      });

      const rowsHtml = list.length === 0 ? `
        <tr>
          <td colspan="5" style="text-align: center; padding: 6px 0; font-style: italic; color: #444;">No items sold in this period</td>
        </tr>
      ` : list.map((item, idx, arr) => {
        let uStr = (item.unit && item.unit !== '-') ? item.unit.trim().toUpperCase() : '';
        if (uStr === 'PCS' && Math.abs(Number(item.totalQty)) === 1) uStr = 'PC';
        const unitSuffix = uStr ? ` ${uStr}` : '';
        return `
        <tr style="border-bottom: ${idx === arr.length - 1 ? 'none' : '1px solid #000'}; font-size: 9.5px;">
          <td style="padding: 2.5px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000;">${idx + 1}</td>
          <td style="padding: 2.5px 4px; text-align: left; font-weight: 800; word-break: break-word; line-height: 1.2; border-right: 1px solid #000;">${item.description} (${this.categoryLabels[item.section] || item.section.toUpperCase()})</td>
          <td style="padding: 2.5px 2px; text-align: center; font-weight: 800; white-space: nowrap; border-right: 1px solid #000;">${app.formatQty(item.totalQty)}${unitSuffix}</td>
          <td style="padding: 2.5px 3px; text-align: right; font-weight: 600; white-space: nowrap; border-right: 1px solid #000;">${app.formatAmount(item.totalRevenue / (item.totalQty || 1))}</td>
          <td style="padding: 2.5px 4px; text-align: right; font-weight: 800; white-space: nowrap;">${app.formatAmount(item.totalRevenue)}</td>
        </tr>
      `;
      }).join('');

      const html = `
        <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace, sans-serif; color: #000; box-sizing: border-box; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 4px;">
            <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${settings.company_name || 'DELICIOUS SUPERSTAR FOODS'}</h1>
            <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">${settings.address || 'Hasan Abdal'}</div>
            <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
              <div>Phone: ${settings.phone || '0315-6795995'}</div>
            </div>
            <div style="margin-top: 5px;">
              <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">ITEM SALES REPORT</span>
            </div>
          </div>
          
          <!-- Metadata -->
          <div style="font-size: 11px; line-height: 1.35; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
            <div style="display: flex; justify-content: space-between;">
              <span><b>Period:</b> ${periodLabel}</span>
              <span><b>Items:</b> ${list.length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 1px;">
              <span><b>Date:</b> ${app.formatDateTime(new Date().toISOString())}</span>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5px; border: 1.5px solid #000;">
            <thead>
              <tr style="border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
                <th style="padding: 3px 2px; text-align: center; width: 7%; border-right: 1px solid #000;">#</th>
                <th style="padding: 3px 4px; text-align: left; width: 45%; border-right: 1px solid #000;">ITEM</th>
                <th style="padding: 3px 2px; text-align: center; width: 14%; border-right: 1px solid #000;">QTY</th>
                <th style="padding: 3px 3px; text-align: right; width: 17%; border-right: 1px solid #000;">RATE</th>
                <th style="padding: 3px 4px; text-align: right; width: 17%;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Summary Box -->
          <div style="border-top: 1px dashed #000; padding-top: 4px; font-size: 11.5px; line-height: 1.45;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Units Sold:</span>
              <span style="font-weight: 700;">${app.formatQty(totalQty)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 0; margin-top: 3px; font-size: 13.5px; font-weight: 900;">
              <span>TOTAL REVENUE:</span>
              <span>${app.formatCurrency(totalRev)}</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 10px;">
            <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** END OF ITEM SALES REPORT ***</p>
          </div>
        </div>
      `;

      app.setPrintContent('report-print-container', html);
      const previewPaper = document.getElementById('preview-paper');
      const previewTitle = document.getElementById('preview-title');
      const previewSubtitle = document.getElementById('preview-subtitle');
      if (previewTitle) previewTitle.textContent = 'Item Sales Preview';
      if (previewSubtitle) previewSubtitle.textContent = '80MM THERMAL RECEIPT â€¢ ITEM SALES';
      if (previewPaper) previewPaper.innerHTML = html;

      const modal = document.getElementById('preview-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
      app.hideLoading();
    } catch (err) {
      console.error(err);
      app.hideLoading();
      app.showAlert("Failed to prepare Item Sales report.");
    }
  }
};
