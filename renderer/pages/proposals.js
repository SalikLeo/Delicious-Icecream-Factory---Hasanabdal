// Delivery History: Primary dispatch, sales invoices & delivery log for Ice Cream Factory
window.Proposals = {
  deliveries: [],
  filteredDeliveries: [],
  cars: [],
  shops: [],
  selectedCarId: '',
  selectedShopId: '',
  periodType: 'day', // 'day' | 'month' | 'all'
  selectedDate: '',
  selectedMonth: '',
  selectedYear: new Date().getFullYear(),
  searchQuery: '',
  sortField: 'date', // 'date' | 'invoice' | 'car_driver' | 'shop' | 'cartons' | 'total' | 'received' | 'balance' | 'method'
  sortOrder: 'desc', // 'asc' | 'desc'

  async render(container) {
    this.container = container;
    const now = new Date();
    this.selectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.selectedMonth = String(now.getMonth() + 1);

    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="history" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Delivery &amp; Sales History</h2>
              <p class="text-xs text-slate-500 font-medium">All vehicle dispatch orders, delivered cartons, cash collected, and generated A5 bills.</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="app.navigate('shop-sales')"
                    class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="plus" class="w-4 h-4"></i> New Shop Delivery
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Total Deliveries</p>
            <h3 class="text-xl font-black text-slate-900 mt-1" id="prop-stat-count">0</h3>
            <p class="text-[11px] font-bold text-slate-400 mt-0.5">Orders dispatched</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Cartons Delivered</p>
            <h3 class="text-xl font-black text-blue-700 mt-1" id="prop-stat-cartons">0 Ctns</h3>
            <p class="text-[11px] font-bold text-blue-600 mt-0.5">Sold to shops</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Total Billed Sale</p>
            <h3 class="text-xl font-black text-slate-900 mt-1" id="prop-stat-total">Rs. 0</h3>
            <p class="text-[11px] font-bold text-slate-400 mt-0.5">Gross amount</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Cash Received</p>
            <h3 class="text-xl font-black text-emerald-700 mt-1" id="prop-stat-cash">Rs. 0</h3>
            <p class="text-[11px] font-bold text-emerald-600 mt-0.5">Collected by driver</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Pending Khata Credit</p>
            <h3 class="text-xl font-black text-rose-600 mt-1" id="prop-stat-due">Rs. 0</h3>
            <p class="text-[11px] font-bold text-rose-500 mt-0.5">Added to shop balance</p>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-3 flex-wrap flex-1 min-w-[300px]">
            <!-- Search -->
            <div class="relative flex-1 min-w-[200px]">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="prop-search" oninput="Proposals.onSearchChange(this.value)"
                     placeholder="Search by Invoice #, Shop, Driver, Vehicle..."
                     value="${this.searchQuery}"
                     class="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-400">
              <button type="button" id="prop-search-clear" onclick="Proposals.clearSearch()" title="Clear search"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer ${this.searchQuery ? '' : 'hidden'}">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Sort Dropdown -->
            <div>
              <select id="prop-sort-select" onchange="Proposals.onSortSelect(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none hover:bg-white focus:border-amber-400 cursor-pointer">
                <option value="date_desc" ${this.sortField==='date'&&this.sortOrder==='desc'?'selected':''}>Date (Newest First)</option>
                <option value="date_asc" ${this.sortField==='date'&&this.sortOrder==='asc'?'selected':''}>Date (Oldest First)</option>
                <option value="total_desc" ${this.sortField==='total'&&this.sortOrder==='desc'?'selected':''}>Total Amount (High-Low)</option>
                <option value="total_asc" ${this.sortField==='total'&&this.sortOrder==='asc'?'selected':''}>Total Amount (Low-High)</option>
                <option value="cartons_desc" ${this.sortField==='cartons'&&this.sortOrder==='desc'?'selected':''}>Cartons (High-Low)</option>
                <option value="received_desc" ${this.sortField==='received'&&this.sortOrder==='desc'?'selected':''}>Cash Received (High-Low)</option>
                <option value="balance_desc" ${this.sortField==='balance'&&this.sortOrder==='desc'?'selected':''}>Khata Remaining (High-Low)</option>
                <option value="shop_asc" ${this.sortField==='shop'&&this.sortOrder==='asc'?'selected':''}>Shop Name (A-Z)</option>
                <option value="invoice_desc" ${this.sortField==='invoice'&&this.sortOrder==='desc'?'selected':''}>Invoice # (Newest)</option>
              </select>
            </div>

            <!-- Vehicle Filter -->
            <div>
              <select id="prop-car-select" onchange="Proposals.onCarChange(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
                <option value="">-- All Delivery Cars --</option>
              </select>
            </div>

            <!-- Shop Filter -->
            <div>
              <select id="prop-shop-select" onchange="Proposals.onShopChange(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
                <option value="">-- All Shops --</option>
              </select>
            </div>

            <!-- Period Switcher: Daily | Monthly | Annual | All -->
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button type="button" onclick="Proposals.setPeriod('day')" id="prop-tab-day"
                      class="px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer bg-white text-slate-900 shadow-2xs">
                Daily
              </button>
              <button type="button" onclick="Proposals.setPeriod('month')" id="prop-tab-month"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer text-slate-500 hover:text-slate-900">
                Monthly
              </button>
              <button type="button" onclick="Proposals.setPeriod('year')" id="prop-tab-year"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer text-slate-500 hover:text-slate-900">
                Annual
              </button>
              <button type="button" onclick="Proposals.setPeriod('all')" id="prop-tab-all"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer text-slate-500 hover:text-slate-900">
                All
              </button>
            </div>

            <!-- Date Picker for Day/Month -->
            <div id="prop-date-picker-wrap">
              <input type="date" id="prop-date-input" value="${this.selectedDate}" onchange="Proposals.onDateChange(this.value)" oninput="Proposals.onDateChange(this.value)"
                     class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
            </div>
          </div>
        </div>

        <!-- Deliveries Table -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-left text-xs border-collapse border border-slate-200">
              <thead id="prop-table-head" class="bg-slate-100/90 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th onclick="Proposals.toggleSort('date')" class="py-2 px-3 border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Date</span>
                      ${this.getSortIcon('date')}
                    </div>
                  </th>
                  <th onclick="Proposals.toggleSort('invoice')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Invoice #</span>
                      ${this.getSortIcon('invoice')}
                    </div>
                  </th>
                  <th onclick="Proposals.toggleSort('car_driver')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Car &amp; Driver</span>
                      ${this.getSortIcon('car_driver')}
                    </div>
                  </th>
                  <th onclick="Proposals.toggleSort('shop')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Shop / Customer</span>
                      ${this.getSortIcon('shop')}
                    </div>
                  </th>
                  <th onclick="Proposals.toggleSort('cartons')" class="py-2 px-2 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-center gap-1">
                      <span>Cartons</span>
                      ${this.getSortIcon('cartons')}
                    </div>
                  </th>
                  <th onclick="Proposals.toggleSort('total')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-end gap-1">
                      <span>Total (Rs.)</span>
                      ${this.getSortIcon('total')}
                    </div>
                  </th>
                  <th onclick="Proposals.toggleSort('received')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-end gap-1">
                      <span>Cash Received</span>
                      ${this.getSortIcon('received')}
                    </div>
                  </th>
                  <th onclick="Proposals.toggleSort('balance')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-end gap-1">
                      <span>Khata Remaining</span>
                      ${this.getSortIcon('balance')}
                    </div>
                  </th>
                  <th onclick="Proposals.toggleSort('method')" class="py-2 px-2 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-center gap-1">
                      <span>Method</span>
                      ${this.getSortIcon('method')}
                    </div>
                  </th>
                  <th class="py-2 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody id="prop-table-body" class="divide-y divide-slate-100 font-semibold text-slate-700">
                <!-- Injected via renderTable() -->
              </tbody>
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
      this.cars = await window.api.getCars() || [];
      this.shops = await window.api.getShops() || [];
      this.deliveries = await window.api.getShopDeliveries() || [];

      // Populate Car selector
      const carSel = document.getElementById('prop-car-select');
      if (carSel) {
        carSel.innerHTML = '<option value="">-- All Delivery Cars --</option>' + 
          this.cars.map(c => `<option value="${c.id}" ${String(c.id) === String(this.selectedCarId) ? 'selected' : ''}>${c.car_number} (${c.driver_name})</option>`).join('');
      }

      // Populate Shop selector
      const shopSel = document.getElementById('prop-shop-select');
      if (shopSel) {
        shopSel.innerHTML = '<option value="">-- All Shops --</option>' + 
          this.shops.map(s => `<option value="${s.id}" ${String(s.id) === String(this.selectedShopId) ? 'selected' : ''}>${s.name} (${s.owner_name || s.city || ''})</option>`).join('');
      }

      this.applyFilters();
    } catch (e) {
      console.error('Failed to load delivery history:', e);
    }
  },

  clearSearch() {
    this.searchQuery = '';
    const inp = document.getElementById('prop-search');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    const clr = document.getElementById('prop-search-clear');
    if (clr) clr.classList.add('hidden');
    this.applyFilters();
  },

  onSearchChange(val) {
    this.searchQuery = val.toLowerCase().trim();
    const clr = document.getElementById('prop-search-clear');
    if (clr) clr.classList.toggle('hidden', !this.searchQuery);
    this.applyFilters();
  },

  toggleSort(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = ['cartons', 'total', 'received', 'balance', 'date', 'invoice'].includes(field) ? 'desc' : 'asc';
    }
    const sel = document.getElementById('prop-sort-select');
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

  renderTableHead() {
    const thead = document.getElementById('prop-table-head');
    if (!thead) return;
    thead.innerHTML = `
      <tr>
        <th onclick="Proposals.toggleSort('date')" class="py-2 px-3 border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-between gap-1">
            <span>Date</span>
            ${this.getSortIcon('date')}
          </div>
        </th>
        <th onclick="Proposals.toggleSort('invoice')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-between gap-1">
            <span>Invoice #</span>
            ${this.getSortIcon('invoice')}
          </div>
        </th>
        <th onclick="Proposals.toggleSort('car_driver')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-between gap-1">
            <span>Car &amp; Driver</span>
            ${this.getSortIcon('car_driver')}
          </div>
        </th>
        <th onclick="Proposals.toggleSort('shop')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-between gap-1">
            <span>Shop / Customer</span>
            ${this.getSortIcon('shop')}
          </div>
        </th>
        <th onclick="Proposals.toggleSort('cartons')" class="py-2 px-2 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-center gap-1">
            <span>Cartons</span>
            ${this.getSortIcon('cartons')}
          </div>
        </th>
        <th onclick="Proposals.toggleSort('total')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-end gap-1">
            <span>Total (Rs.)</span>
            ${this.getSortIcon('total')}
          </div>
        </th>
        <th onclick="Proposals.toggleSort('received')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-end gap-1">
            <span>Cash Received</span>
            ${this.getSortIcon('received')}
          </div>
        </th>
        <th onclick="Proposals.toggleSort('balance')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-end gap-1">
            <span>Khata Remaining</span>
            ${this.getSortIcon('balance')}
          </div>
        </th>
        <th onclick="Proposals.toggleSort('method')" class="py-2 px-2 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
          <div class="flex items-center justify-center gap-1">
            <span>Method</span>
            ${this.getSortIcon('method')}
          </div>
        </th>
        <th class="py-2 px-3 text-center">Actions</th>
      </tr>
    `;
    if (window.lucide) lucide.createIcons({ root: thead });
  },

  onCarChange(val) {
    this.selectedCarId = val;
    this.applyFilters();
  },

  onShopChange(val) {
    this.selectedShopId = val;
    this.applyFilters();
  },

  onDateChange(val) {
    if (!val) return;
    this.selectedDate = val;
    this.applyFilters();
  },

  getAvailableYears() {
    const curYear = new Date().getFullYear();
    const years = new Set([curYear, curYear - 1, curYear + 1]);
    (this.deliveries || []).forEach(d => {
      if (d.date) {
        const y = parseInt(d.date.slice(0, 4));
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  },

  setPeriod(period) {
    this.periodType = period;
    ['day', 'month', 'year', 'all'].forEach(p => {
      const btn = document.getElementById(`prop-tab-${p}`);
      if (!btn) return;
      if (p === period) {
        btn.className = 'px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer bg-white text-slate-900 shadow-2xs';
      } else {
        btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer text-slate-500 hover:text-slate-900';
      }
    });

    const wrap = document.getElementById('prop-date-picker-wrap');
    if (wrap) {
      if (period === 'day') {
        wrap.innerHTML = `<input type="date" id="prop-date-input" value="${this.selectedDate}" onchange="Proposals.onDateChange(this.value)" oninput="Proposals.onDateChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">`;
      } else if (period === 'month') {
        const ym = this.selectedDate ? this.selectedDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
        wrap.innerHTML = `<input type="month" id="prop-date-input" value="${ym}" onchange="Proposals.onDateChange(this.value)" oninput="Proposals.onDateChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">`;
      } else if (period === 'year') {
        const years = this.getAvailableYears();
        const selY = this.selectedDate ? this.selectedDate.slice(0, 4) : String(new Date().getFullYear());
        wrap.innerHTML = `
          <select id="prop-date-input" onchange="Proposals.onDateChange(this.value)" oninput="Proposals.onDateChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer">
            ${years.map(y => `<option value="${y}" ${String(selY) === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        `;
      } else {
        wrap.innerHTML = '';
      }
    }

    this.applyFilters();
  },

  applyFilters() {
    let list = this.deliveries;

    // Filter by car
    if (this.selectedCarId) {
      list = list.filter(d => String(d.car_id) === String(this.selectedCarId));
    }

    // Filter by shop
    if (this.selectedShopId) {
      list = list.filter(d => String(d.shop_id) === String(this.selectedShopId));
    }

    // Filter by date
    if (this.periodType === 'day' && this.selectedDate) {
      list = list.filter(d => d.date === this.selectedDate);
    } else if (this.periodType === 'month' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      list = list.filter(d => d.date && d.date.startsWith(ym));
    } else if (this.periodType === 'year' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      list = list.filter(d => d.date && d.date.startsWith(y));
    }

    // Search query
    if (this.searchQuery) {
      list = list.filter(d => {
        const inv = (d.invoice_no || '').toLowerCase();
        const shop = (d.shop_name || '').toLowerCase();
        const driver = (d.driver_name || '').toLowerCase();
        const car = (d.car_number || '').toLowerCase();
        const method = (d.payment_method || '').toLowerCase();
        return inv.includes(this.searchQuery) || shop.includes(this.searchQuery) || driver.includes(this.searchQuery) || car.includes(this.searchQuery) || method.includes(this.searchQuery);
      });
    }

    // Sort list
    const sf = this.sortField;
    const so = this.sortOrder === 'desc' ? -1 : 1;
    list = [...list].sort((a, b) => {
      if (sf === 'date') {
        const dA = new Date(a.date || a.created_at || 0).getTime() || 0;
        const dB = new Date(b.date || b.created_at || 0).getTime() || 0;
        return so * (dA - dB);
      }
      if (sf === 'invoice') return so * (a.invoice_no || '').localeCompare(b.invoice_no || '');
      if (sf === 'car_driver') return so * ((a.car_number || '') + (a.driver_name || '')).localeCompare((b.car_number || '') + (b.driver_name || ''));
      if (sf === 'shop') return so * (a.shop_name || '').localeCompare(b.shop_name || '');
      if (sf === 'cartons') return so * (((a.total_cartons_delivered || 0) - (a.total_cartons_returned || 0)) - ((b.total_cartons_delivered || 0) - (b.total_cartons_returned || 0)));
      if (sf === 'total') return so * ((a.total_amount || 0) - (b.total_amount || 0));
      if (sf === 'received') return so * ((a.received_amount || 0) - (b.received_amount || 0));
      if (sf === 'balance') return so * ((a.remaining_balance || 0) - (b.remaining_balance || 0));
      if (sf === 'method') return so * (a.payment_method || '').localeCompare(b.payment_method || '');
      return (new Date(b.date || b.created_at || 0).getTime() || 0) - (new Date(a.date || a.created_at || 0).getTime() || 0);
    });

    this.filteredDeliveries = list;
    this.updateStats();
    this.renderTableHead();
    this.renderTable();
  },

  updateStats() {
    let totalCartons = 0;
    let totalSales = 0;
    let totalCash = 0;
    let totalDue = 0;

    this.filteredDeliveries.forEach(d => {
      totalCartons += Math.max(0, (d.total_cartons_delivered || 0) - (d.total_cartons_returned || 0));
      totalSales += (d.total_amount || 0);
      totalCash += (d.received_amount || 0);
      totalDue += (d.remaining_balance || 0);
    });

    const cEl = document.getElementById('prop-stat-count');
    const ctEl = document.getElementById('prop-stat-cartons');
    const tEl = document.getElementById('prop-stat-total');
    const csEl = document.getElementById('prop-stat-cash');
    const dEl = document.getElementById('prop-stat-due');

    if (cEl) cEl.textContent = `${this.filteredDeliveries.length}`;
    if (ctEl) ctEl.textContent = `${totalCartons} Ctns`;
    if (tEl) tEl.textContent = `Rs. ${Math.round(totalSales).toLocaleString()}`;
    if (csEl) csEl.textContent = `Rs. ${Math.round(totalCash).toLocaleString()}`;
    if (dEl) dEl.textContent = `Rs. ${Math.round(totalDue).toLocaleString()}`;
  },

  renderTable() {
    const tbody = document.getElementById('prop-table-body');
    if (!tbody) return;

    if (this.filteredDeliveries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="p-12 text-center text-slate-400 font-bold">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
              <i data-lucide="package-search" class="w-6 h-6"></i>
            </div>
            No delivery records found matching your filters.
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = this.filteredDeliveries.map(d => {
      let badgeClass = 'bg-slate-100 text-slate-700';
      if (d.payment_method === 'Cash') badgeClass = 'bg-emerald-100 text-emerald-800';
      else if (d.payment_method === 'Online') badgeClass = 'bg-blue-100 text-blue-800';
      else if (d.payment_method === 'Credit') badgeClass = 'bg-amber-100 text-amber-800';

      return `
        <tr class="hover:bg-slate-50/70 transition-colors">
          <td class="py-1.5 px-3 text-[11px] font-bold text-slate-600 border-r border-slate-200 whitespace-nowrap">${app.formatDateTime(d.date, d.created_at)}</td>
          <td class="py-1.5 px-3 font-mono font-black text-slate-900 border-r border-slate-200">${d.invoice_no}</td>
          <td class="py-1.5 px-3 border-r border-slate-200">
            <div class="font-bold text-slate-800 text-xs">${d.car_number}</div>
            <div class="text-[10px] text-slate-400 font-medium leading-tight">${d.driver_name || ''}</div>
          </td>
          <td class="py-1.5 px-3 border-r border-slate-200">
            <div class="font-black text-slate-900 text-xs">${d.shop_name}</div>
            <div class="text-[10px] text-slate-400 leading-tight">${d.shop_phone || d.shop_address || ''}</div>
          </td>
          <td class="py-1.5 px-2 text-center font-black text-xs text-blue-700 bg-blue-50/30 border-r border-slate-200">
            <div>${Math.max(0, (d.total_cartons_delivered || 0) - (d.total_cartons_returned || 0))}</div>
            ${(d.total_cartons_returned || 0) > 0 ? `
              <span class="inline-block px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-black mt-0.5" title="${d.total_cartons_returned} cartons returned (orig: ${d.total_cartons_delivered})">
                -${d.total_cartons_returned} ret
              </span>
            ` : ''}
          </td>
          <td class="py-1.5 px-3 text-right font-black text-slate-900 text-xs tabular-nums border-r border-slate-200">
            Rs. ${Math.round(d.total_amount).toLocaleString()}
          </td>
          <td class="py-1.5 px-3 text-right font-black text-emerald-700 text-xs tabular-nums border-r border-slate-200">
            Rs. ${Math.round(d.received_amount).toLocaleString()}
          </td>
          <td class="py-1.5 px-3 text-right font-black text-xs tabular-nums border-r border-slate-200 ${d.remaining_balance > 0 ? 'text-rose-600' : 'text-slate-400'}">
            Rs. ${Math.round(d.remaining_balance).toLocaleString()}
          </td>
          <td class="py-1.5 px-2 text-center border-r border-slate-200">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${badgeClass}">
              ${d.payment_method || 'Cash'}
            </span>
          </td>
          <td class="py-1.5 px-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button type="button" onclick="ShopSales.openReturnModal(${d.id})"
                      class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                      title="Process Return (Keep in car or return to factory stock)">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="ShopSales.printDeliveryInvoice(${d.id})"
                      class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                      title="Print Delivery Invoice &amp; Bill (A5)">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="Proposals.deleteDeliveryOrder(${d.id}, '${d.invoice_no}')"
                      class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                      title="Delete Delivery Order">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  async deleteDeliveryOrder(id, invoiceNo) {
    app.showConfirm({
      title: 'Delete Delivery Order?',
      message: `Are you sure you want to delete delivery invoice "${invoiceNo}"? This will reverse any shop khata credit balance and restore records.`,
      confirmText: 'Yes, Delete',
      confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        try {
          app.showLoading();
          const res = await window.api.deleteShopDelivery(id);
          if (res && res.error) {
            app.showAlert({ title: 'Error', message: res.error });
            return;
          }
          await this.loadData();
          app.showAlert({ title: 'Deleted', message: `Delivery order ${invoiceNo} removed successfully.` });
        } catch (e) {
          app.showAlert({ title: 'Error', message: e.message });
        } finally {
          app.hideLoading();
        }
      }
    });
  }
};
