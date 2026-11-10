// Suppliers Management & Vendor Stock Purchases
window.Suppliers = {
  suppliersList: [],
  allPurchases: [],
  currentPeriodType: 'day',
  currentSort: 'spend-desc',
  expandedSuppliers: new Set(),
  editingSupplierId: null,
  currentFilteredData: [],

  async render(container) {
    this.container = container;
    const savedShowStats = window.storage ? window.storage.get('suppliers_show_stats') : null;
    const isStatsVisible = savedShowStats !== null ? Boolean(savedShowStats) : true;

    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 no-print">
          <div>
            <div class="flex items-center gap-3">
              <button onclick="app.navigate('purchases')" class="h-10 px-3 hover:bg-slate-50 bg-white border border-slate-200 text-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95" title="Back to Raw Material Purchases">
                <i data-lucide="arrow-left" class="w-4 h-4 text-slate-600"></i>
                <span>Purchases</span>
              </button>
              <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <i data-lucide="users" class="w-5 h-5"></i>
              </div>
              <div>
                <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Suppliers &amp; Vendor Purchases</h2>
                <p class="text-xs text-slate-500 font-medium">Manage raw material suppliers, vendor contacts, and view stock purchase volumes.</p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="Suppliers.openSupplierModal()" class="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
              <span>+ New Supplier</span>
            </button>
            <button onclick="app.navigate('item-purchases')" class="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95" title="View Item Purchases breakdown">
              <i data-lucide="package" class="w-4 h-4 text-emerald-400"></i>
              <span>Item Purchases</span>
            </button>
            <button onclick="Suppliers.printReport()" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer" title="Print Suppliers Report (A5)">
              <i data-lucide="printer" class="w-4 h-4 text-slate-500"></i>
              <span>Print</span>
            </button>
            <button onclick="Suppliers.toggleStats()" id="sup-stats-toggle-btn" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer">
              <i data-lucide="${isStatsVisible ? 'eye-off' : 'eye'}" class="w-4 h-4 text-slate-400" id="sup-stats-toggle-icon"></i>
              <span id="sup-stats-toggle-text">${isStatsVisible ? 'Hide Stats' : 'Show Stats'}</span>
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div id="sup-stats-container" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0 ${isStatsVisible ? '' : 'hidden'}">
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
              <i data-lucide="users" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-blue-600 tracking-wider truncate">Total Suppliers</p>
              <h3 class="text-base font-black text-blue-700 font-mono truncate" id="sup-stat-total-count">0</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
              <i data-lucide="banknote" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-emerald-600 tracking-wider truncate">Spend in Period</p>
              <h3 class="text-base font-black text-emerald-700 font-mono truncate" id="sup-stat-spend">Rs. 0</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
              <i data-lucide="shopping-bag" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-amber-600 tracking-wider truncate">Purchase Orders</p>
              <h3 class="text-base font-black text-amber-700 font-mono truncate" id="sup-stat-orders">0</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 border border-purple-100">
              <i data-lucide="activity" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-purple-600 tracking-wider truncate">Active in Period</p>
              <h3 class="text-base font-black text-purple-700 font-mono truncate" id="sup-stat-active">0</h3>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
              <i data-lucide="crown" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-indigo-600 tracking-wider truncate">Top Supplier</p>
              <h3 class="text-xs font-black text-slate-800 truncate" id="sup-stat-top">None</h3>
            </div>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div class="relative w-full">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
              <input type="text" id="sup-search" oninput="Suppliers.applyFilters()"
                     placeholder="Search supplier, contact, phone, materials..."
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 outline-none transition-all">
              <button id="sup-search-clear-btn" onclick="Suppliers.clearSearch()" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 hidden cursor-pointer">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Sort dropdown -->
          <div class="flex items-center gap-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sort</label>
            <select id="sup-sort-select" onchange="Suppliers.setSort(this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold hover:bg-white text-slate-700 transition-all outline-none cursor-pointer">
              <option value="spend-desc">Total Spend (High to Low)</option>
              <option value="spend-asc">Total Spend (Low to High)</option>
              <option value="orders-desc">Orders Count (High to Low)</option>
              <option value="orders-asc">Orders Count (Low to High)</option>
              <option value="name-asc">Supplier Name (A to Z)</option>
              <option value="name-desc">Supplier Name (Z to A)</option>
              <option value="recent-desc">Latest Purchase</option>
            </select>
          </div>

          <!-- Period controls -->
          <div class="flex items-center gap-2 flex-wrap">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Period</label>
            <div class="flex bg-slate-100 p-1 rounded-xl">
              <button id="sup-period-day-tab" onclick="Suppliers.setPeriodType('day')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all bg-white shadow-2xs text-slate-800 cursor-pointer">Daily</button>
              <button id="sup-period-month-tab" onclick="Suppliers.setPeriodType('month')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Monthly</button>
              <button id="sup-period-year-tab" onclick="Suppliers.setPeriodType('year')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Annual</button>
              <button id="sup-period-custom-tab" onclick="Suppliers.setPeriodType('custom')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Custom Range</button>
              <button id="sup-period-all-tab" onclick="Suppliers.setPeriodType('all')" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer">All</button>
            </div>

            <!-- Daily navigation controls -->
            <div id="sup-daily-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
              <button onclick="Suppliers.changeDateStep(-1)" class="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Day">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
              </button>
              <input type="date" id="sup-stats-date-picker" onchange="Suppliers.applyFilters()" oninput="Suppliers.applyFilters()" class="bg-transparent border-0 px-1 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
              <button onclick="Suppliers.changeDateStep(1)" class="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Day">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="Suppliers.setToday()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg transition-all cursor-pointer ml-0.5">Today</button>
            </div>

            <!-- Monthly navigation controls -->
            <div id="sup-monthly-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 hidden">
              <button onclick="Suppliers.changeMonthStep(-1)" class="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Month">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
              </button>
              <select id="sup-stats-month-select" onchange="Suppliers.applyFilters()" oninput="Suppliers.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
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
              <select id="sup-stats-month-year-select" onchange="Suppliers.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
              </select>
              <button onclick="Suppliers.changeMonthStep(1)" class="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Month">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="Suppliers.setThisMonth()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg transition-all cursor-pointer ml-0.5">This Month</button>
            </div>

            <!-- Annual controls -->
            <div id="sup-annual-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 hidden">
              <select id="sup-stats-year-picker" onchange="Suppliers.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
              </select>
            </div>

            <!-- Custom Range controls -->
            <div id="sup-custom-controls" class="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-xl hidden">
              <span class="text-[10px] font-black uppercase text-slate-400">From</span>
              <input type="date" id="sup-start-date" onchange="Suppliers.applyFilters()" oninput="Suppliers.applyFilters()" class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
              <span class="text-[10px] font-black uppercase text-slate-400">To</span>
              <input type="date" id="sup-end-date" onchange="Suppliers.applyFilters()" oninput="Suppliers.applyFilters()" class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
            </div>

            <button id="sup-clear-period-btn" onclick="Suppliers.resetPeriodToDefault()" class="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all hidden cursor-pointer active:scale-95" title="Reset to Daily (Today)">
              <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
            </button>
          </div>
        </div>

        <!-- Main Suppliers Table Card -->
        <div class="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[400px]">
          <div class="overflow-auto flex-1 relative custom-scrollbar">
            <table class="w-full text-sm text-left border-collapse">
              <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider sticky top-0 z-10 shadow-2xs border-b border-slate-200">
                <tr>
                  <th class="px-3 py-3 text-center w-12 border-r border-slate-200 text-slate-400 font-black">#</th>
                  <th class="px-4 py-3 border-r border-slate-200 font-black cursor-pointer hover:bg-slate-100 transition-colors" onclick="Suppliers.toggleColumnSort('name')">
                    <div class="flex items-center justify-between gap-1">
                      <span>Supplier Name &amp; Contact</span>
                      <i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>
                    </div>
                  </th>
                  <th class="px-3 py-3 border-r border-slate-200 w-36">Phone / Contact</th>
                  <th class="px-3 py-3 border-r border-slate-200 w-44">Address / City</th>
                  <th class="px-4 py-3 border-r border-slate-200">Materials Supplied</th>
                  <th class="px-3 py-3 border-r border-slate-200 text-center font-black cursor-pointer hover:bg-slate-100 transition-colors w-24" onclick="Suppliers.toggleColumnSort('orders')">
                    <div class="flex items-center justify-center gap-1">
                      <span>Orders</span>
                      <i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>
                    </div>
                  </th>
                  <th class="px-4 py-3 border-r border-slate-200 text-right font-black cursor-pointer hover:bg-slate-100 transition-colors w-32" onclick="Suppliers.toggleColumnSort('spend')">
                    <div class="flex items-center justify-end gap-1">
                      <span>Total Spend</span>
                      <i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400"></i>
                    </div>
                  </th>
                  <th class="px-3 py-3 border-r border-slate-200 text-center w-28">Last Order</th>
                  <th class="px-3 py-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody id="sup-list-body" class="divide-y divide-slate-100 bg-white">
                <tr>
                  <td colspan="9" class="text-center py-12 text-slate-400 font-bold text-xs">
                    Loading suppliers and stock purchase data...
                  </td>
                </tr>
              </tbody>
              <tfoot id="sup-tfoot" class="bg-slate-50 border-t-2 border-slate-200 font-black text-xs text-slate-800 sticky bottom-0 z-10 shadow-sm">
                <!-- Dynamically filled in applyFilters -->
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Supplier Modal (Add / Edit) -->
      <div id="sup-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div class="px-6 py-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
                <i data-lucide="truck" class="w-4 h-4"></i>
              </div>
              <h3 id="sup-modal-title" class="font-black text-base text-white">Add New Supplier</h3>
            </div>
            <button onclick="Suppliers.closeModal()" class="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="sup-form" onsubmit="Suppliers.saveSupplier(event)" class="p-6 space-y-4">
            <input type="hidden" id="sup-form-id">
            
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Supplier / Vendor Name *</label>
              <input type="text" id="sup-form-name" required placeholder="e.g. Dairy Milk Farms, Habib Sugar Mills..."
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Contact Person</label>
                <input type="text" id="sup-form-contact" placeholder="e.g. Malik Imran / Manager"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Phone Number</label>
                <input type="text" id="sup-form-phone" placeholder="e.g. 0300-1234567"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Address / City</label>
              <input type="text" id="sup-form-address" placeholder="e.g. Hasan Abdal / Rawalpindi Road"
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all">
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Description / Notes</label>
              <textarea id="sup-form-desc" rows="2" placeholder="e.g. Supplies pure milk daily, payment on 15 days terms..."
                        class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"></textarea>
            </div>

            <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button type="button" onclick="Suppliers.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95">
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: container });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const datePicker = document.getElementById('sup-stats-date-picker');
    if (datePicker && !datePicker.value) {
      datePicker.value = todayStr;
    }

    await this.loadData();
  },

  async loadData() {
    try {
      this.suppliersList = await window.api.getCompanies() || [];
      this.allPurchases = await window.api.getRawMaterialPurchases({}) || [];

      // Populate Year Dropdowns
      const now = new Date();
      const monthYearSelect = document.getElementById('sup-stats-month-year-select');
      const yearPicker = document.getElementById('sup-stats-year-picker');
      const yearSet = new Set([now.getFullYear()]);
      this.allPurchases.forEach(item => {
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
      console.error('[SUPPLIERS] loadData error:', e);
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
      const sDate = document.getElementById('sup-start-date');
      const eDate = document.getElementById('sup-end-date');
      if (sDate && !sDate.value) sDate.value = document.getElementById('sup-stats-date-picker')?.value || todayStr;
      if (eDate && !eDate.value) eDate.value = document.getElementById('sup-stats-date-picker')?.value || todayStr;
    }

    ['day', 'month', 'year', 'custom', 'all'].forEach(t => {
      const tab = document.getElementById(`sup-period-${t}-tab`);
      if (tab) {
        if (t === type) {
          tab.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all bg-white shadow-2xs text-slate-800 cursor-pointer';
        } else {
          tab.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer';
        }
      }
    });

    const dailyEl = document.getElementById('sup-daily-controls');
    const monthlyEl = document.getElementById('sup-monthly-controls');
    const annualEl = document.getElementById('sup-annual-controls');
    const customEl = document.getElementById('sup-custom-controls');

    if (dailyEl) dailyEl.classList.toggle('hidden', type !== 'day');
    if (monthlyEl) monthlyEl.classList.toggle('hidden', type !== 'month');
    if (annualEl) annualEl.classList.toggle('hidden', type !== 'year');
    if (customEl) customEl.classList.toggle('hidden', type !== 'custom');

    this.applyFilters();
  },

  setToday() {
    const now = new Date();
    const datePicker = document.getElementById('sup-stats-date-picker');
    if (datePicker) {
      datePicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    this.applyFilters();
  },

  setThisMonth() {
    const now = new Date();
    const monthSelect = document.getElementById('sup-stats-month-select');
    const monthYearSelect = document.getElementById('sup-stats-month-year-select');
    if (monthSelect) monthSelect.value = now.getMonth() + 1;
    if (monthYearSelect) monthYearSelect.value = now.getFullYear();
    this.applyFilters();
  },

  changeDateStep(step) {
    const picker = document.getElementById('sup-stats-date-picker');
    if (!picker || !picker.value) return;
    const parts = picker.value.split('-');
    const curDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    curDate.setDate(curDate.getDate() + step);
    picker.value = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
    this.applyFilters();
  },

  changeMonthStep(step) {
    const mSelect = document.getElementById('sup-stats-month-select');
    const ySelect = document.getElementById('sup-stats-month-year-select');
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
    const select = document.getElementById('sup-sort-select');
    if (select) select.value = sortValue;
    this.applyFilters();
  },

  toggleColumnSort(col) {
    if (col === 'spend') {
      this.currentSort = (this.currentSort === 'spend-desc') ? 'spend-asc' : 'spend-desc';
    } else if (col === 'orders') {
      this.currentSort = (this.currentSort === 'orders-desc') ? 'orders-asc' : 'orders-desc';
    } else if (col === 'name') {
      this.currentSort = (this.currentSort === 'name-asc') ? 'name-desc' : 'name-asc';
    }
    const select = document.getElementById('sup-sort-select');
    if (select) select.value = this.currentSort;
    this.applyFilters();
  },

  clearSearch() {
    const input = document.getElementById('sup-search');
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
    const btn = document.getElementById('sup-clear-period-btn');
    if (!btn) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selDate = document.getElementById('sup-stats-date-picker')?.value;
    const isDefaultDay = (this.currentPeriodType === 'day' && selDate === todayStr);
    if (!isDefaultDay) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  },

  toggleStats() {
    const container = document.getElementById('sup-stats-container');
    const textEl = document.getElementById('sup-stats-toggle-text');
    const iconEl = document.getElementById('sup-stats-toggle-icon');
    if (!container) return;

    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
      container.classList.remove('hidden');
      if (textEl) textEl.textContent = 'Hide Stats';
      if (iconEl) iconEl.setAttribute('data-lucide', 'eye-off');
      if (window.storage) window.storage.set('suppliers_show_stats', true);
    } else {
      container.classList.add('hidden');
      if (textEl) textEl.textContent = 'Show Stats';
      if (iconEl) iconEl.setAttribute('data-lucide', 'eye');
      if (window.storage) window.storage.set('suppliers_show_stats', false);
    }
    if (window.lucide) lucide.createIcons();
  },

  toggleExpand(key) {
    if (this.expandedSuppliers.has(key)) {
      this.expandedSuppliers.delete(key);
    } else {
      this.expandedSuppliers.add(key);
    }
    this.renderList(this.currentFilteredData);
  },

  applyFilters() {
    const searchInput = document.getElementById('sup-search');
    const clearBtn = document.getElementById('sup-search-clear-btn');
    const term = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const selDate = document.getElementById('sup-stats-date-picker')?.value;

    // 1. Filter purchases by period
    const periodPurchases = this.allPurchases.filter(item => {
      if (!item.date || this.currentPeriodType === 'all') return true;
      const parsed = this.parseDate(item.date);
      if (!parsed) return true;

      if (this.currentPeriodType === 'day' && selDate) {
        return parsed.dateStr === selDate;
      } else if (this.currentPeriodType === 'month') {
        const targetM = parseInt(document.getElementById('sup-stats-month-select')?.value);
        const targetY = parseInt(document.getElementById('sup-stats-month-year-select')?.value);
        if (targetM && targetY) return (parsed.year === targetY && parsed.month === targetM);
      } else if (this.currentPeriodType === 'year') {
        const targetY = parseInt(document.getElementById('sup-stats-year-picker')?.value);
        if (targetY) return (parsed.year === targetY);
      } else if (this.currentPeriodType === 'custom') {
        const sDate = document.getElementById('sup-start-date')?.value;
        const eDate = document.getElementById('sup-end-date')?.value;
        if (sDate && eDate) return (parsed.dateStr >= sDate && parsed.dateStr <= eDate);
      }
      return true;
    });

    // 2. Map of purchases grouped by supplier name
    const purchasesBySupplier = new Map();
    periodPurchases.forEach(p => {
      const supName = (p.supplier_name || 'Standard Supplier').trim();
      const key = supName.toLowerCase();
      if (!purchasesBySupplier.has(key)) {
        purchasesBySupplier.set(key, []);
      }
      purchasesBySupplier.get(key).push(p);
    });

    // 3. Build unified suppliers list (registered + any unique in purchases)
    const unifiedMap = new Map();

    // Add registered suppliers
    this.suppliersList.forEach(s => {
      const name = (s.name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      unifiedMap.set(key, {
        id: s.id,
        name: name,
        contact_person: s.contact_person || '',
        phone: s.phone || '',
        address: s.address || '',
        description: s.description || '',
        isRegistered: true,
        purchases: purchasesBySupplier.get(key) || []
      });
    });

    // Add any suppliers from purchases that aren't registered yet
    purchasesBySupplier.forEach((pList, key) => {
      if (!unifiedMap.has(key)) {
        const first = pList[0];
        unifiedMap.set(key, {
          id: null,
          name: (first.supplier_name || 'Standard Supplier').trim(),
          contact_person: '',
          phone: '',
          address: '',
          description: '',
          isRegistered: false,
          purchases: pList
        });
      }
    });

    let suppliersArray = Array.from(unifiedMap.values()).map(s => {
      s.purchases.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
      s.totalSpend = s.purchases.reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);
      s.totalQty = s.purchases.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
      s.ordersCount = s.purchases.length;
      s.lastOrderDate = s.purchases.length ? s.purchases[0].date : null;

      // Unique materials supplied
      const matSet = new Set();
      s.purchases.forEach(p => {
        if (p.material_name) matSet.add(p.material_name.trim());
      });
      s.materialsSupplied = Array.from(matSet);

      return s;
    });

    // 4. Filter by search term
    if (term) {
      suppliersArray = suppliersArray.filter(s => {
        const name = s.name.toLowerCase();
        const contact = s.contact_person.toLowerCase();
        const phone = s.phone.toLowerCase();
        const addr = s.address.toLowerCase();
        const desc = s.description.toLowerCase();
        const mats = s.materialsSupplied.join(' ').toLowerCase();
        return name.includes(term) || contact.includes(term) || phone.includes(term) || addr.includes(term) || desc.includes(term) || mats.includes(term);
      });
    }

    // 5. Sort
    suppliersArray.sort((a, b) => {
      switch (this.currentSort) {
        case 'spend-desc': return b.totalSpend - a.totalSpend;
        case 'spend-asc': return a.totalSpend - b.totalSpend;
        case 'orders-desc': return b.ordersCount - a.ordersCount;
        case 'orders-asc': return a.ordersCount - b.ordersCount;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'recent-desc': return (b.lastOrderDate || '').localeCompare(a.lastOrderDate || '');
        default: return b.totalSpend - a.totalSpend;
      }
    });

    this.currentFilteredData = suppliersArray;
    this.updateStats(suppliersArray, periodPurchases);
    this.renderList(suppliersArray);
    this.updateClearPeriodButton();
  },

  updateStats(suppliers, periodPurchases) {
    let totalSpend = 0;
    let totalOrders = periodPurchases.length;
    let activeSuppliers = 0;
    let topSupplier = null;

    periodPurchases.forEach(p => {
      totalSpend += (Number(p.total_cost) || 0);
    });

    suppliers.forEach(s => {
      if (s.ordersCount > 0) activeSuppliers++;
      if (!topSupplier || s.totalSpend > topSupplier.totalSpend) {
        if (s.totalSpend > 0) topSupplier = s;
      }
    });

    const elTotal = document.getElementById('sup-stat-total-count');
    const elSpend = document.getElementById('sup-stat-spend');
    const elOrders = document.getElementById('sup-stat-orders');
    const elActive = document.getElementById('sup-stat-active');
    const elTop = document.getElementById('sup-stat-top');

    if (elTotal) elTotal.textContent = `${this.suppliersList.length} Suppliers`;
    if (elSpend) elSpend.textContent = `Rs. ${totalSpend.toLocaleString()}`;
    if (elOrders) elOrders.textContent = `${totalOrders} Orders`;
    if (elActive) elActive.textContent = `${activeSuppliers} Active`;
    if (elTop) elTop.textContent = topSupplier ? `${topSupplier.name} (Rs. ${topSupplier.totalSpend.toLocaleString()})` : 'None';
  },

  renderList(list) {
    const tbody = document.getElementById('sup-list-body');
    const tfoot = document.getElementById('sup-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-16">
            <div class="flex flex-col items-center justify-center">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                <i data-lucide="users" class="w-7 h-7"></i>
              </div>
              <h4 class="text-sm font-black text-slate-700">No Suppliers Found</h4>
              <p class="text-xs text-slate-400 mt-0.5">Click "+ New Supplier" above to add your first supplier, or adjust your filters.</p>
            </div>
          </td>
        </tr>
      `;
      if (tfoot) tfoot.innerHTML = '';
      if (window.lucide) lucide.createIcons({ root: tbody });
      return;
    }

    let totalSpend = 0;
    let totalOrders = 0;
    let totalQty = 0;

    tbody.innerHTML = list.map((s, index) => {
      totalSpend += s.totalSpend;
      totalOrders += s.ordersCount;
      totalQty += s.totalQty;

      const isExpanded = this.expandedSuppliers.has(s.name.toLowerCase());
      const hasPurchases = s.purchases.length > 0;

      let subtableHtml = '';
      if (isExpanded && hasPurchases) {
        subtableHtml = `
          <tr class="bg-slate-50/70 border-b border-slate-200">
            <td colspan="9" class="p-3 pl-12 pr-6">
              <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div class="px-4 py-2.5 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i data-lucide="shopping-bag" class="w-4 h-4 text-blue-600"></i>
                    <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Purchase History: ${s.name}</span>
                    <span class="text-[11px] font-bold text-slate-500">(${s.purchases.length} orders in period)</span>
                  </div>
                  <div class="text-xs font-black text-emerald-700">
                    Total Spend: Rs. ${s.totalSpend.toLocaleString()}
                  </div>
                </div>
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 text-slate-500 font-black uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th class="px-3 py-2">Date</th>
                      <th class="px-3 py-2">Invoice #</th>
                      <th class="px-3 py-2">Material / Stock Item</th>
                      <th class="px-3 py-2 text-right">Quantity</th>
                      <th class="px-3 py-2 text-right">Unit Rate</th>
                      <th class="px-3 py-2 text-right">Total Amount</th>
                      <th class="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${s.purchases.map(p => `
                      <tr class="hover:bg-slate-50">
                        <td class="px-3 py-2 font-mono font-bold text-slate-700">${app.formatDateOnly ? app.formatDateOnly(p.date) : p.date}</td>
                        <td class="px-3 py-2 font-mono font-bold text-blue-700">${p.invoice_no || `#${p.id}`}</td>
                        <td class="px-3 py-2 font-bold text-slate-900">
                          ${p.material_name}
                          ${p.material_category ? `<span class="ml-1 text-[9.5px] font-semibold text-slate-400">(${p.material_category})</span>` : ''}
                        </td>
                        <td class="px-3 py-2 text-right font-mono font-bold text-slate-900">${Number(p.qty).toLocaleString()} ${p.unit || ''}</td>
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
      } else if (isExpanded && !hasPurchases) {
        subtableHtml = `
          <tr class="bg-slate-50 border-b border-slate-200">
            <td colspan="9" class="p-4 text-center text-xs text-slate-400 italic">
              No purchases recorded from ${s.name} during the active time filter.
            </td>
          </tr>
        `;
      }

      const materialsBadges = s.materialsSupplied.length > 0
        ? s.materialsSupplied.slice(0, 3).map(m => `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 mr-1 inline-block">${m}</span>`).join('') + (s.materialsSupplied.length > 3 ? `<span class="text-[10px] font-bold text-slate-400">+${s.materialsSupplied.length - 3} more</span>` : '')
        : '<span class="text-slate-400 text-xs italic">No items yet</span>';

      return `
        <tr class="hover:bg-blue-50/40 transition-colors border-b border-slate-100 cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}" onclick="Suppliers.toggleExpand('${s.name.toLowerCase()}')">
          <td class="px-3 py-3 text-center border-r border-slate-100 text-slate-400 font-mono text-xs font-black">${index + 1}</td>
          
          <td class="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
            <div class="flex items-center gap-2">
              <button class="p-1 rounded-md hover:bg-slate-200 text-slate-400 transition-colors" title="Toggle purchases">
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" class="w-4 h-4"></i>
              </button>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-900 font-black text-[13.5px]">${s.name}</span>
                  ${s.isRegistered ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">SAVED</span>' : '<span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">FROM INVOICES</span>'}
                </div>
                ${s.contact_person ? `<div class="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1"><i data-lucide="user" class="w-3 h-3 text-slate-400"></i> ${s.contact_person}</div>` : ''}
              </div>
            </div>
          </td>

          <td class="px-3 py-3 border-r border-slate-100 font-mono text-xs font-bold text-slate-700">
            ${s.phone ? `<span class="flex items-center gap-1"><i data-lucide="phone" class="w-3 h-3 text-blue-500"></i> ${s.phone}</span>` : '<span class="text-slate-400 italic font-sans">-</span>'}
          </td>

          <td class="px-3 py-3 border-r border-slate-100 text-xs text-slate-600 truncate max-w-[160px]">
            ${s.address || '<span class="text-slate-400 italic">-</span>'}
          </td>

          <td class="px-4 py-3 border-r border-slate-100">
            ${materialsBadges}
          </td>

          <td class="px-3 py-3 text-center border-r border-slate-100 font-mono font-bold text-xs">
            <span class="px-2 py-0.5 rounded-lg ${s.ordersCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/80 font-black' : 'bg-slate-100 text-slate-400'} text-[11px]">
              ${s.ordersCount} ${s.ordersCount === 1 ? 'order' : 'orders'}
            </span>
          </td>

          <td class="px-4 py-3 text-right border-r border-slate-100 font-mono font-black text-xs ${s.totalSpend > 0 ? 'text-emerald-700' : 'text-slate-400'}">
            Rs. ${s.totalSpend.toLocaleString()}
          </td>

          <td class="px-3 py-3 text-center border-r border-slate-100 font-mono text-xs text-slate-600">
            ${s.lastOrderDate ? (app.formatDateOnly ? app.formatDateOnly(s.lastOrderDate) : s.lastOrderDate) : '<span class="text-slate-400 italic">-</span>'}
          </td>

          <td class="px-3 py-3 text-center" onclick="event.stopPropagation()">
            <div class="flex items-center justify-center gap-1">
              <button onclick="Suppliers.openSupplierModal('${encodeURIComponent(JSON.stringify(s))}')" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer" title="Edit Supplier Details">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              ${s.id ? `
                <button onclick="Suppliers.deleteSupplier(${s.id}, '${s.name.replace(/'/g, "\\'")}')" class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer" title="Delete Supplier">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
            </div>
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
            TOTAL (${list.length} SUPPLIERS)
          </td>
          <td colspan="3" class="px-3 py-3 text-slate-500 font-bold text-[11px]">-</td>
          <td class="px-3 py-3 text-center font-mono font-black text-slate-800">
            ${totalOrders} Orders
          </td>
          <td class="px-4 py-3 text-right font-mono font-black text-emerald-800 text-sm">
            Rs. ${totalSpend.toLocaleString()}
          </td>
          <td colspan="2" class="px-4 py-3 text-slate-400 text-right text-[11px] font-bold">
            All vendor purchases in period
          </td>
        </tr>
      `;
    }

    if (window.lucide) lucide.createIcons({ root: tbody });
  },

  openSupplierModal(rawJson = null) {
    const modal = document.getElementById('sup-modal-backdrop');
    if (!modal) return;

    let s = null;
    if (rawJson) {
      try {
        s = JSON.parse(decodeURIComponent(rawJson));
      } catch (e) {
        console.error('Error parsing supplier JSON:', e);
      }
    }

    const titleEl = document.getElementById('sup-modal-title');
    const idEl = document.getElementById('sup-form-id');
    const nameEl = document.getElementById('sup-form-name');
    const contactEl = document.getElementById('sup-form-contact');
    const phoneEl = document.getElementById('sup-form-phone');
    const addrEl = document.getElementById('sup-form-address');
    const descEl = document.getElementById('sup-form-desc');

    if (s) {
      if (titleEl) titleEl.textContent = 'Edit Supplier Details';
      if (idEl) idEl.value = s.id || '';
      if (nameEl) nameEl.value = s.name || '';
      if (contactEl) contactEl.value = s.contact_person || '';
      if (phoneEl) phoneEl.value = s.phone || '';
      if (addrEl) addrEl.value = s.address || '';
      if (descEl) descEl.value = s.description || '';
    } else {
      if (titleEl) titleEl.textContent = 'Add New Supplier';
      if (idEl) idEl.value = '';
      if (nameEl) nameEl.value = '';
      if (contactEl) contactEl.value = '';
      if (phoneEl) phoneEl.value = '';
      if (addrEl) addrEl.value = '';
      if (descEl) descEl.value = '';
    }

    modal.classList.remove('hidden');
    if (nameEl) nameEl.focus();
    if (window.lucide) lucide.createIcons({ root: modal });
  },

  closeModal() {
    const modal = document.getElementById('sup-modal-backdrop');
    if (modal) modal.classList.add('hidden');
  },

  async saveSupplier(e) {
    if (e && e.preventDefault) e.preventDefault();

    const id = document.getElementById('sup-form-id')?.value;
    const name = document.getElementById('sup-form-name')?.value.trim();
    const contact_person = document.getElementById('sup-form-contact')?.value.trim();
    const phone = document.getElementById('sup-form-phone')?.value.trim();
    const address = document.getElementById('sup-form-address')?.value.trim();
    const description = document.getElementById('sup-form-desc')?.value.trim();

    if (!name) {
      app.showAlert('Please enter the supplier name.');
      return;
    }

    try {
      app.showLoading();
      const payload = {
        name,
        contact_person,
        phone,
        address,
        description
      };
      if (id) payload.id = parseInt(id);

      await window.api.saveCompany(payload);
      this.closeModal();
      await this.loadData();
      app.hideLoading();
      app.showAlert(`Supplier "${name}" saved successfully!`, 'success');
    } catch (err) {
      app.hideLoading();
      console.error('Error saving supplier:', err);
      app.showAlert('Failed to save supplier: ' + err.message);
    }
  },

  async deleteSupplier(id, name) {
    if (!confirm(`Are you sure you want to delete supplier "${name}" from your registered suppliers list?`)) {
      return;
    }

    try {
      app.showLoading();
      await window.api.deleteCompany(id);
      await this.loadData();
      app.hideLoading();
      app.showAlert(`Supplier "${name}" removed.`, 'success');
    } catch (err) {
      app.hideLoading();
      console.error('Error deleting supplier:', err);
      app.showAlert('Failed to delete supplier: ' + err.message);
    }
  },

  async printReport() {
    const list = this.currentFilteredData || [];
    if (list.length === 0) {
      app.showAlert("No suppliers to print for the selected period.");
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
        const d = document.getElementById('sup-stats-date-picker')?.value;
        periodLabel = `Daily: ${d || 'Today'}`;
      } else if (this.currentPeriodType === 'month') {
        const m = document.getElementById('sup-stats-month-select')?.value;
        const y = document.getElementById('sup-stats-month-year-select')?.value;
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        periodLabel = `Monthly: ${monthNames[parseInt(m)] || m} ${y}`;
      } else if (this.currentPeriodType === 'year') {
        const y = document.getElementById('sup-stats-year-picker')?.value;
        periodLabel = `Annual: ${y}`;
      } else if (this.currentPeriodType === 'custom') {
        const s = document.getElementById('sup-start-date')?.value;
        const e = document.getElementById('sup-end-date')?.value;
        periodLabel = `Custom: ${s ? (app.formatDateOnly ? app.formatDateOnly(s) : s) : ''} - ${e ? (app.formatDateOnly ? app.formatDateOnly(e) : e) : ''}`;
      }

      let totalSpend = 0, totalOrders = 0;
      list.forEach(s => {
        totalSpend += s.totalSpend;
        totalOrders += s.ordersCount;
      });

      const rowsHtml = list.map((s, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 5px 6px; text-align: center; font-size: 10px; color: #64748b; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 5px 6px; font-weight: bold; font-size: 11px; color: #0f172a;">
            ${s.name} ${s.contact_person ? `<span style="font-weight: normal; font-size: 9.5px; color: #64748b;">(${s.contact_person})</span>` : ''}
          </td>
          <td style="padding: 5px 6px; font-size: 10px; font-family: monospace;">${s.phone || '-'}</td>
          <td style="padding: 5px 6px; font-size: 10px; color: #475569;">${s.address || '-'}</td>
          <td style="padding: 5px 6px; font-size: 9.5px; color: #475569;">${s.materialsSupplied.join(', ') || '-'}</td>
          <td style="padding: 5px 6px; text-align: center; font-weight: bold; font-size: 10px;">${s.ordersCount}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: bold; font-size: 11px; color: #047857; font-family: monospace;">Rs. ${s.totalSpend.toLocaleString()}</td>
          <td style="padding: 5px 6px; text-align: center; font-size: 10px; font-family: monospace;">${s.lastOrderDate || '-'}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Suppliers & Vendor Purchases Report</title>
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
                <div style="font-size: 10px; font-weight: 800; color: #1d4ed8; margin-top: 2px;">SUPPLIERS & VENDOR PURCHASES REPORT</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div style="font-size: 10px; font-weight: 800; color: #0f172a;">PERIOD: <span style="color: #047857;">${periodLabel}</span></div>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Generated: ${new Date().toLocaleString()}</div>
              </td>
            </tr>
          </table>

          <table class="kpi-table">
            <tr>
              <td style="width: 33.3%; padding-right: 4px;">
                <div class="kpi-box">
                  <div class="kpi-lbl">Total Spend in Period</div>
                  <div class="kpi-val" style="color: #047857;">Rs. ${totalSpend.toLocaleString()}</div>
                </div>
              </td>
              <td style="width: 33.3%; padding-right: 4px;">
                <div class="kpi-box">
                  <div class="kpi-lbl">Total Purchases</div>
                  <div class="kpi-val">${totalOrders} Orders</div>
                </div>
              </td>
              <td style="width: 33.3%;">
                <div class="kpi-box">
                  <div class="kpi-lbl">Active Suppliers</div>
                  <div class="kpi-val">${list.length} Vendors</div>
                </div>
              </td>
            </tr>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 24px; text-align: center;">#</th>
                <th style="text-align: left;">Supplier Name</th>
                <th style="text-align: left; width: 85px;">Phone</th>
                <th style="text-align: left; width: 95px;">Address</th>
                <th style="text-align: left;">Materials Supplied</th>
                <th style="text-align: center; width: 45px;">Orders</th>
                <th style="text-align: right; width: 85px;">Total Spend</th>
                <th style="text-align: center; width: 65px;">Last Order</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr class="footer-row">
                <td style="text-align: center;">â€¢</td>
                <td colspan="4">GRAND TOTAL (${list.length} SUPPLIERS)</td>
                <td style="text-align: center; font-family: monospace;">${totalOrders}</td>
                <td style="text-align: right; color: #047857; font-family: monospace;">Rs. ${totalSpend.toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </body>
        </html>
      `;

      app.hideLoading();
      app.showA5Preview(html, 'Suppliers & Vendor Purchases Report (A5)');
    } catch (err) {
      app.hideLoading();
      console.error('Failed to print suppliers report:', err);
      app.showAlert('Failed to generate printable report: ' + err.message);
    }
  }
};
