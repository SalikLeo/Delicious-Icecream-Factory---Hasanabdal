// Factory Reports: Comprehensive A5 Reporting Hub for Ice Cream Factory
window.Reports = {
  currentTab: 'cars', // 'cars' | 'raw' | 'inventory' | 'finance'
  periodType: 'daily', // 'daily' | 'monthly' | 'annual' | 'custom' | 'all'
  selectedDate: '',
  startDate: '',
  endDate: '',
  selectedCarId: '',
  selectedRawCategory: '',
  selectedCartonId: '',
  settings: {},

  // Cached data
  cars: [],
  rawMaterials: [],
  rawMaterialsPurchases: [],
  packedCartons: [],
  packingBatches: [],
  singleItems: [],
  deliveries: [],
  expenses: [],

  async render(container) {
    this.container = container;
    const now = new Date();
    this.selectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.settings = await window.api.getSettings() || {};
    this.cars = await window.api.getCars() || [];

    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-4 px-5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-slate-700 shrink-0">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[11px] font-black">REPORTS HUB</span>
              <h2 class="text-xl md:text-2xl font-black tracking-tight text-white">Ice Cream Factory Reports</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Daily &amp; monthly tracking for delivery vehicles, raw materials stock balance, and warehouse inventory in standard A5 format.</p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="Reports.printCurrentReport()"
                    class="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="printer" class="w-4 h-4"></i> Print Report
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex bg-slate-200/80 p-1.5 rounded-2xl gap-1 shrink-0 overflow-x-auto">
          <button type="button" onclick="Reports.switchTab('cars')" id="rpt-tab-cars"
                  class="flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-white text-slate-900 shadow-sm">
            <i data-lucide="truck" class="w-4 h-4 text-blue-600"></i> 1. Cars &amp; Sales
          </button>
          <button type="button" onclick="Reports.switchTab('raw')" id="rpt-tab-raw"
                  class="flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
            <i data-lucide="boxes" class="w-4 h-4 text-emerald-600"></i> 2. Raw Material Stock
          </button>
          <button type="button" onclick="Reports.switchTab('inventory')" id="rpt-tab-inventory"
                  class="flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
            <i data-lucide="package" class="w-4 h-4 text-purple-600"></i> 3. Carton &amp; Shoper Stock
          </button>
          <button type="button" onclick="Reports.switchTab('finance')" id="rpt-tab-finance"
                  class="flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
            <i data-lucide="badge-dollar-sign" class="w-4 h-4 text-amber-600"></i> 4. Profit &amp; Expenses
          </button>
        </div>

        <!-- Dynamic Content Body -->
        <div id="reports-tab-content" class="flex-1 min-h-0 flex flex-col gap-4">
          <!-- Loaded dynamically -->
        </div>

      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadTabContent();
  },

  async switchTab(tab) {
    this.currentTab = tab;
    ['cars', 'raw', 'inventory', 'finance'].forEach(t => {
      const btn = document.getElementById(`rpt-tab-${t}`);
      if (!btn) return;
      if (t === tab) {
        btn.className = 'flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-white text-slate-900 shadow-sm';
      } else {
        btn.className = 'flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900';
      }
    });

    await this.loadTabContent();
  },

  async loadTabContent() {
    const container = document.getElementById('reports-tab-content');
    if (!container) return;

    if (this.currentTab === 'cars') {
      await this.renderCarsReport(container);
    } else if (this.currentTab === 'raw') {
      await this.renderRawReport(container);
    } else if (this.currentTab === 'inventory') {
      await this.renderInventoryReport(container);
    } else if (this.currentTab === 'finance') {
      await this.renderFinanceReport(container);
    }

    if (window.lucide) lucide.createIcons();
  },

  // -------------------------------------------------------------
  // TAB 1: CAR SALES & DELIVERIES
  // -------------------------------------------------------------
  async renderCarsReport(container) {
    const allDeliveries = await window.api.getShopDeliveries() || [];
    this.deliveries = allDeliveries;

    // Filter by selected car and date
    let filtered = allDeliveries;
    if (this.selectedCarId) {
      filtered = filtered.filter(d => String(d.car_id) === String(this.selectedCarId));
    }
    if (this.periodType === 'daily' && this.selectedDate) {
      filtered = filtered.filter(d => d.date === this.selectedDate);
    } else if (this.periodType === 'monthly' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      filtered = filtered.filter(d => d.date && d.date.startsWith(ym));
    } else if (this.periodType === 'annual' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      filtered = filtered.filter(d => d.date && d.date.startsWith(y));
    } else if (this.periodType === 'custom') {
      if (this.startDate) filtered = filtered.filter(d => (d.date || '').slice(0, 10) >= this.startDate);
      if (this.endDate) filtered = filtered.filter(d => (d.date || '').slice(0, 10) <= this.endDate);
    }

    let totalDeliveredCartons = 0;
    let totalSales = 0;
    let totalCashReceived = 0;
    let totalRemainingKhata = 0;

    filtered.forEach(d => {
      totalDeliveredCartons += Math.max(0, (d.total_cartons_delivered || 0) - (d.total_cartons_returned || 0));
      totalSales += (d.total_amount || 0);
      totalCashReceived += (d.received_amount || 0);
      totalRemainingKhata += (d.remaining_balance || 0);
    });

    // Also get in-car stock for selected car
    let carInventoryHtml = '';
    if (this.selectedCarId) {
      const inv = await window.api.getCarInventory(this.selectedCarId) || [];
      const loaded = inv.filter(i => (i.cartons_loaded || 0) > 0);
      carInventoryHtml = `
        <div class="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 mb-4 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span class="font-black text-slate-800">Current Stock Loaded Inside This Car:</span>
          </div>
          <div class="flex gap-2 flex-wrap">
            ${loaded.length > 0 ? loaded.map(i => `
              <span class="px-2.5 py-1 bg-white border border-blue-200 rounded-lg font-bold text-blue-900 text-[11px] shadow-2xs">
                ${i.carton_name}: <strong class="text-blue-700">${i.cartons_loaded} ctns</strong>
              </span>
            `).join('') : '<span class="text-slate-400 font-bold">No stock loaded inside car right now.</span>'}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Filter Controls -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-end gap-3 flex-wrap">
          <div>
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Select Vehicle / Car</label>
            <select id="rpt-car-select" onchange="Reports.onCarChange(this.value)"
                    class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none h-[34px] cursor-pointer">
              <option value="">-- All Delivery Cars --</option>
              ${this.cars.map(c => `
                <option value="${c.id}" ${String(c.id) === String(this.selectedCarId) ? 'selected' : ''}>
                  ${c.car_number} (${c.driver_name})
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Period</label>
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 h-[34px] items-center">
              <button type="button" onclick="Reports.setPeriod('daily')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'daily' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Daily
              </button>
              <button type="button" onclick="Reports.setPeriod('monthly')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Monthly
              </button>
              <button type="button" onclick="Reports.setPeriod('annual')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'annual' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Annual
              </button>
              <button type="button" onclick="Reports.setPeriod('custom')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'custom' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Custom Range
              </button>
              <button type="button" onclick="Reports.setPeriod('all')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                All Time
              </button>
            </div>
          </div>

          ${this.periodType !== 'all' ? `
            <div>
              <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">
                ${this.periodType === 'custom' ? 'Date Range' : (this.periodType === 'annual' ? 'Year' : (this.periodType === 'monthly' ? 'Month' : 'Date'))}
              </label>
              ${this.periodType === 'custom' ? `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-xl h-[34px]">
                  <span class="text-[10px] font-black uppercase text-slate-400">From</span>
                  <input type="date" id="rpt-cars-start-date" value="${this.startDate || this.selectedDate}" 
                         onchange="Reports.onCustomDateChange('start', this.value)"
                         oninput="Reports.onCustomDateChange('start', this.value)"
                         class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
                  <span class="text-[10px] font-black uppercase text-slate-400">To</span>
                  <input type="date" id="rpt-cars-end-date" value="${this.endDate || this.selectedDate}" 
                         onchange="Reports.onCustomDateChange('end', this.value)"
                         oninput="Reports.onCustomDateChange('end', this.value)"
                         class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
                </div>
              ` : this.periodType === 'annual' ? `
                <select id="rpt-cars-date-input" onchange="Reports.onDateChange(this.value)" oninput="Reports.onDateChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer h-[34px]">
                  ${this.getAvailableYears().map(y => `
                    <option value="${y}" ${String(this.selectedDate || '').startsWith(String(y)) ? 'selected' : ''}>${y}</option>
                  `).join('')}
                </select>
              ` : `
                <input type="${this.periodType === 'monthly' ? 'month' : 'date'}" id="rpt-cars-date-input"
                       value="${this.periodType === 'monthly' ? this.selectedDate.slice(0, 7) : this.selectedDate}"
                       onchange="Reports.onDateChange(this.value)"
                       oninput="Reports.onDateChange(this.value)"
                       class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer h-[34px]">
              `}
            </div>
          ` : ''}

          <!-- Red Cross Reset to Current Date/Period -->
          <div id="rpt-cars-reset-wrap" class="shrink-0 flex items-center h-[34px]">
            ${this.isFilteredFromCurrent() ? `
              <button type="button" onclick="Reports.resetToCurrent()" 
                      class="w-[34px] h-[34px] rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0" 
                      title="Reset to current (Today)">
                <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <button type="button" onclick="Reports.printCarReport()"
                class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
          <i data-lucide="printer" class="w-3.5 h-3.5 text-amber-400"></i> Print Report
        </button>
      </div>

      <div id="rpt-cars-body" class="flex-1 flex flex-col gap-4">
        ${this.renderCarsBody(filtered, totalDeliveredCartons, totalSales, totalCashReceived, totalRemainingKhata, carInventoryHtml)}
      </div>
    `;
  },

  renderCarsBody(filtered, totalDeliveredCartons, totalSales, totalCashReceived, totalRemainingKhata, carInventoryHtml) {
    return `
      ${carInventoryHtml}

      <!-- Summary KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Total Deliveries</p>
          <h3 class="text-xl font-black text-slate-900 mt-1">${filtered.length} Orders</h3>
          <p class="text-[11px] font-bold text-blue-600 mt-0.5">${totalDeliveredCartons} Cartons Sold</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Total Sales Value</p>
          <h3 class="text-xl font-black text-emerald-700 mt-1">Rs. ${Math.round(totalSales).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-slate-400 mt-0.5">Gross Invoiced</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Cash Collected</p>
          <h3 class="text-xl font-black text-slate-900 mt-1">Rs. ${Math.round(totalCashReceived).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-emerald-600 mt-0.5">Driver Handover Cash</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Pending Khata Credit</p>
          <h3 class="text-xl font-black text-rose-600 mt-1">Rs. ${Math.round(totalRemainingKhata).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-rose-500 mt-0.5">Added to Shop Ledger</p>
        </div>
      </div>

      <!-- Deliveries Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col">
        <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 class="font-black text-xs text-slate-800 uppercase tracking-wider">Vehicle Delivery Log (${filtered.length} entries)</h4>
          <span class="text-[11px] font-bold text-slate-400">All amounts in PKR</span>
        </div>

        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-xs border-collapse border border-slate-200">
            <thead class="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[85px]">Date</th>
                <th class="py-2 px-3 border-r border-slate-200">Invoice #</th>
                <th class="py-2 px-3 border-r border-slate-200">Vehicle &amp; Driver</th>
                <th class="py-2 px-3 border-r border-slate-200">Shop / Customer</th>
                <th class="py-2 px-2 text-center border-r border-slate-200">Cartons</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Total (Rs.)</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Cash (Rs.)</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Khata Due</th>
                <th class="py-2 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
              ${filtered.length > 0 ? filtered.map(d => `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="py-1.5 px-3 text-[11px] font-bold text-slate-600 border-r border-slate-200 whitespace-nowrap">${app.formatDateTime(d.date, d.created_at)}</td>
                  <td class="py-1.5 px-3 font-mono font-black text-slate-900 border-r border-slate-200">${d.invoice_no}</td>
                  <td class="py-1.5 px-3 text-slate-800 font-bold border-r border-slate-200 text-xs">${d.car_number}<br><span class="text-[10px] text-slate-400 font-normal leading-tight">${d.driver_name || ''}</span></td>
                  <td class="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200 text-xs">${d.shop_name}</td>
                  <td class="py-1.5 px-2 text-center font-black text-xs text-blue-700 bg-blue-50/40 border-r border-slate-200">
                    <div>${Math.max(0, (d.total_cartons_delivered || 0) - (d.total_cartons_returned || 0))}</div>
                    ${(d.total_cartons_returned || 0) > 0 ? `
                      <span class="inline-block px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-black mt-0.5">
                        -${d.total_cartons_returned} ret
                      </span>
                    ` : ''}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black text-slate-900 text-xs border-r border-slate-200">Rs. ${Math.round(d.total_amount).toLocaleString()}</td>
                  <td class="py-1.5 px-3 text-right font-black text-emerald-700 text-xs border-r border-slate-200">Rs. ${Math.round(d.received_amount).toLocaleString()}</td>
                  <td class="py-1.5 px-3 text-right font-black text-xs ${d.remaining_balance > 0 ? 'text-rose-600' : 'text-slate-400'} border-r border-slate-200">
                    Rs. ${Math.round(d.remaining_balance).toLocaleString()}
                  </td>
                  <td class="py-1.5 px-3 text-center">
                    <button type="button" onclick="ShopSales.printDeliveryInvoice(${d.id})"
                            class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs mx-auto"
                            title="Print Delivery Invoice (A5)">
                      <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400 font-bold">No deliveries found for the selected vehicle and date.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async updateCarsBody() {
    const el = document.getElementById('rpt-cars-body');
    if (!el) return;
    const allDeliveries = this.deliveries || [];
    let filtered = allDeliveries;
    if (this.selectedCarId) {
      filtered = filtered.filter(d => String(d.car_id) === String(this.selectedCarId));
    }
    if (this.periodType === 'daily' && this.selectedDate) {
      filtered = filtered.filter(d => d.date === this.selectedDate);
    } else if (this.periodType === 'monthly' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      filtered = filtered.filter(d => d.date && d.date.startsWith(ym));
    } else if (this.periodType === 'annual' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      filtered = filtered.filter(d => d.date && d.date.startsWith(y));
    } else if (this.periodType === 'custom') {
      if (this.startDate) filtered = filtered.filter(d => (d.date || '').slice(0, 10) >= this.startDate);
      if (this.endDate) filtered = filtered.filter(d => (d.date || '').slice(0, 10) <= this.endDate);
    }

    let totalDeliveredCartons = 0;
    let totalSales = 0;
    let totalCashReceived = 0;
    let totalRemainingKhata = 0;

    filtered.forEach(d => {
      totalDeliveredCartons += Math.max(0, (d.total_cartons_delivered || 0) - (d.total_cartons_returned || 0));
      totalSales += (d.total_amount || 0);
      totalCashReceived += (d.received_amount || 0);
      totalRemainingKhata += (d.remaining_balance || 0);
    });

    let carInventoryHtml = '';
    if (this.selectedCarId) {
      const inv = await window.api.getCarInventory(this.selectedCarId) || [];
      const loaded = inv.filter(i => (i.cartons_loaded || 0) > 0);
      carInventoryHtml = `
        <div class="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 mb-4 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span class="font-black text-slate-800">Current Stock Loaded Inside This Car:</span>
          </div>
          <div class="flex gap-2 flex-wrap">
            ${loaded.length > 0 ? loaded.map(i => `
              <span class="px-2.5 py-1 bg-white border border-blue-200 rounded-lg font-bold text-blue-900 text-[11px] shadow-2xs">
                ${i.carton_name}: <strong class="text-blue-700">${i.cartons_loaded} ctns</strong>
              </span>
            `).join('') : '<span class="text-slate-400 font-bold">No stock loaded inside car right now.</span>'}
          </div>
        </div>
      `;
    }

    el.innerHTML = this.renderCarsBody(filtered, totalDeliveredCartons, totalSales, totalCashReceived, totalRemainingKhata, carInventoryHtml);
    if (window.lucide) lucide.createIcons({ root: el });
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
    (this.expenses || []).forEach(e => {
      if (e.date) {
        const y = parseInt(e.date.slice(0, 4));
        if (!isNaN(y)) years.add(y);
      }
    });
    (this.rawMaterialsPurchases || []).forEach(p => {
      if (p.date) {
        const y = parseInt(p.date.slice(0, 4));
        if (!isNaN(y)) years.add(y);
      }
    });
    (this.packingBatches || []).forEach(b => {
      if (b.date) {
        const y = parseInt(b.date.slice(0, 4));
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  },

  formatPeriodDate(val) {
    if (!val || this.periodType === 'all') return 'All Time';
    if (this.periodType === 'daily') return app.formatDateOnly(val);
    if (this.periodType === 'monthly') {
      const ym = String(val).slice(0, 7);
      if (ym.includes('-')) {
        const [y, m] = ym.split('-');
        return `${m}/${y}`;
      }
      return ym;
    }
    if (this.periodType === 'annual') return String(val).slice(0, 4);
    if (this.periodType === 'custom') return `${app.formatDateOnly(this.startDate || this.selectedDate)} – ${app.formatDateOnly(this.endDate || this.selectedDate)}`;
    return val;
  },

  onCarChange(val) {
    this.selectedCarId = val;
    this.loadTabContent();
  },

  onRawCategoryChange(val) {
    this.selectedRawCategory = val;
    this.loadTabContent();
  },

  onCartonChange(val) {
    this.selectedCartonId = val;
    this.loadTabContent();
  },

  isFilteredFromCurrent() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.periodType === 'custom') return true;
    if (this.periodType !== 'daily') return true;
    if (this.selectedDate && this.selectedDate !== today) return true;
    if (this.currentTab === 'cars' && this.selectedCarId) return true;
    if (this.currentTab === 'raw' && this.selectedRawCategory) return true;
    if (this.currentTab === 'inventory' && this.selectedCartonId) return true;
    return false;
  },

  resetToCurrent() {
    const today = new Date().toISOString().slice(0, 10);
    this.periodType = 'daily';
    this.selectedDate = today;
    this.startDate = today;
    this.endDate = today;
    this.selectedCarId = '';
    this.selectedRawCategory = '';
    this.selectedCartonId = '';
    this.loadTabContent();
  },

  updateResetButtons() {
    const wraps = ['rpt-cars-reset-wrap', 'rpt-raw-reset-wrap', 'rpt-inventory-reset-wrap', 'rpt-finance-reset-wrap'];
    wraps.forEach(id => {
      const wrap = document.getElementById(id);
      if (!wrap) return;
      wrap.innerHTML = this.isFilteredFromCurrent() ? `
        <button type="button" onclick="Reports.resetToCurrent()" 
                class="w-[34px] h-[34px] rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0" 
                title="Reset to current (Today)">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
        </button>
      ` : '';
      if (window.lucide) lucide.createIcons({ root: wrap });
    });
  },

  onDateChange(val) {
    if (!val) return;
    this.selectedDate = val;
    if (this.currentTab === 'cars') {
      this.updateCarsBody();
    } else if (this.currentTab === 'raw') {
      this.updateRawBody();
    } else if (this.currentTab === 'inventory') {
      this.updateInventoryBody();
    } else if (this.currentTab === 'finance') {
      this.updateFinanceBody();
    }
    this.updateResetButtons();
  },

  onCustomDateChange(type, val) {
    if (!val) return;
    if (type === 'start') this.startDate = val;
    if (type === 'end') this.endDate = val;
    if (this.currentTab === 'cars') {
      this.updateCarsBody();
    } else if (this.currentTab === 'raw') {
      this.updateRawBody();
    } else if (this.currentTab === 'inventory') {
      this.updateInventoryBody();
    } else if (this.currentTab === 'finance') {
      this.updateFinanceBody();
    }
    this.updateResetButtons();
  },

  setPeriod(period) {
    this.periodType = period;
    this.loadTabContent();
  },

  // -------------------------------------------------------------
  // TAB 2: RAW MATERIALS STOCK & BALANCE
  // -------------------------------------------------------------
  async renderRawReport(container) {
    const rawListAll = await window.api.getRawMaterials() || [];
    const purchasesAll = await window.api.getRawMaterialPurchases() || [];
    this.rawMaterials = rawListAll;
    this.rawMaterialsPurchases = purchasesAll;

    const categories = [...new Set(rawListAll.map(m => m.category).filter(Boolean))].sort();

    container.innerHTML = `
      <!-- Filter Controls -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-end gap-3 flex-wrap">
          <div>
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Filter Category</label>
            <select id="rpt-raw-cat-select" onchange="Reports.onRawCategoryChange(this.value)"
                    class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none h-[34px] cursor-pointer">
              <option value="">-- All Categories --</option>
              ${categories.map(cat => `
                <option value="${cat}" ${this.selectedRawCategory === cat ? 'selected' : ''}>${cat}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Period</label>
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 h-[34px] items-center">
              <button type="button" onclick="Reports.setPeriod('daily')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'daily' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Daily
              </button>
              <button type="button" onclick="Reports.setPeriod('monthly')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Monthly
              </button>
              <button type="button" onclick="Reports.setPeriod('annual')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'annual' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Annual
              </button>
              <button type="button" onclick="Reports.setPeriod('custom')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'custom' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Custom Range
              </button>
              <button type="button" onclick="Reports.setPeriod('all')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                All Time
              </button>
            </div>
          </div>

          ${this.periodType !== 'all' ? `
            <div>
              <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">
                ${this.periodType === 'custom' ? 'Date Range' : (this.periodType === 'annual' ? 'Year' : (this.periodType === 'monthly' ? 'Month' : 'Date'))}
              </label>
              ${this.periodType === 'custom' ? `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-xl h-[34px]">
                  <span class="text-[10px] font-black uppercase text-slate-400">From</span>
                  <input type="date" id="rpt-raw-start-date" value="${this.startDate || this.selectedDate}" 
                         onchange="Reports.onCustomDateChange('start', this.value)"
                         oninput="Reports.onCustomDateChange('start', this.value)"
                         class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
                  <span class="text-[10px] font-black uppercase text-slate-400">To</span>
                  <input type="date" id="rpt-raw-end-date" value="${this.endDate || this.selectedDate}" 
                         onchange="Reports.onCustomDateChange('end', this.value)"
                         oninput="Reports.onCustomDateChange('end', this.value)"
                         class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
                </div>
              ` : this.periodType === 'annual' ? `
                <select id="rpt-raw-date-input" onchange="Reports.onDateChange(this.value)" oninput="Reports.onDateChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer h-[34px]">
                  ${this.getAvailableYears().map(y => `
                    <option value="${y}" ${String(this.selectedDate || '').startsWith(String(y)) ? 'selected' : ''}>${y}</option>
                  `).join('')}
                </select>
              ` : `
                <input type="${this.periodType === 'monthly' ? 'month' : 'date'}" id="rpt-raw-date-input"
                       value="${this.periodType === 'monthly' ? this.selectedDate.slice(0, 7) : this.selectedDate}"
                       onchange="Reports.onDateChange(this.value)"
                       oninput="Reports.onDateChange(this.value)"
                       class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer h-[34px]">
              `}
            </div>
          ` : ''}

          <!-- Red Cross Reset to Current Date/Period -->
          <div id="rpt-raw-reset-wrap" class="shrink-0 flex items-center h-[34px]">
            ${this.isFilteredFromCurrent() ? `
              <button type="button" onclick="Reports.resetToCurrent()" 
                      class="w-[34px] h-[34px] rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0" 
                      title="Reset to current (Today)">
                <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <button type="button" onclick="Reports.printRawReport()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer">
          <i data-lucide="printer" class="w-3.5 h-3.5 text-amber-400"></i> Print Report
        </button>
      </div>

      <div id="rpt-raw-body" class="flex-1 flex flex-col gap-4">
        ${this.renderRawBody()}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  renderRawBody() {
    const rawListAll = this.rawMaterials || [];
    const purchasesAll = this.rawMaterialsPurchases || [];

    // Filter purchases by period
    let filteredPurchases = purchasesAll;
    if (this.periodType === 'daily' && this.selectedDate) {
      filteredPurchases = purchasesAll.filter(p => p.date === this.selectedDate);
    } else if (this.periodType === 'monthly' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      filteredPurchases = purchasesAll.filter(p => p.date && p.date.startsWith(ym));
    } else if (this.periodType === 'annual' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      filteredPurchases = purchasesAll.filter(p => p.date && p.date.startsWith(y));
    } else if (this.periodType === 'custom') {
      if (this.startDate) filteredPurchases = filteredPurchases.filter(p => (p.date || '').slice(0, 10) >= this.startDate);
      if (this.endDate) filteredPurchases = filteredPurchases.filter(p => (p.date || '').slice(0, 10) <= this.endDate);
    }

    // Purchases mapped by material
    const purchasesByMaterial = {};
    let totalPurchasedCostInPeriod = 0;
    filteredPurchases.forEach(p => {
      const mid = p.material_id;
      if (!purchasesByMaterial[mid]) purchasesByMaterial[mid] = { qty: 0, cost: 0, count: 0 };
      purchasesByMaterial[mid].qty += (p.quantity || 0);
      purchasesByMaterial[mid].cost += (p.total_price || 0);
      purchasesByMaterial[mid].count += 1;
      totalPurchasedCostInPeriod += (p.total_price || 0);
    });

    // Filter materials by selected category
    let rawList = rawListAll;
    if (this.selectedRawCategory) {
      rawList = rawList.filter(m => m.category === this.selectedRawCategory);
    }

    let totalValuation = 0;
    let lowStockCount = 0;
    rawList.forEach(m => {
      totalValuation += (m.total_value || (m.current_stock * m.cost_price) || 0);
      if (m.current_stock <= m.min_stock_alert) lowStockCount++;
    });

    return `
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Total Registered Materials</p>
          <h3 class="text-xl font-black text-slate-900 mt-1">${rawList.length} Items</h3>
          <p class="text-[11px] font-bold text-slate-400 mt-0.5">${this.selectedRawCategory ? `Filtered by ${this.selectedRawCategory}` : 'All categories'}</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Warehouse Stock Valuation</p>
          <h3 class="text-xl font-black text-emerald-700 mt-1">Rs. ${Math.round(totalValuation).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-emerald-600 mt-0.5">Current Stock at Cost</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Purchases in Period</p>
          <h3 class="text-xl font-black text-blue-700 mt-1">Rs. ${Math.round(totalPurchasedCostInPeriod).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-blue-600 mt-0.5">${filteredPurchases.length} POs (${this.formatPeriodDate(this.selectedDate)})</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Low Stock Alerts</p>
          <h3 class="text-xl font-black ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'} mt-1">${lowStockCount} Materials</h3>
          <p class="text-[11px] font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'} mt-0.5">Below alert threshold</p>
        </div>
      </div>

      <!-- Raw Materials Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col">
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-2 px-3 border-r border-slate-200">Material Name</th>
                <th class="py-2 px-3 border-r border-slate-200">Category</th>
                <th class="py-2 px-2 text-center border-r border-slate-200">Unit</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Inward / Purchased (Period)</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Remaining Stock Balance</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Cost Price / Unit</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Total Value (Rs.)</th>
                <th class="py-2 px-3 text-center">Stock Alert Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
              ${rawList.map(m => {
                const isLow = m.current_stock <= m.min_stock_alert;
                const pur = purchasesByMaterial[m.id];
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-1.5 px-3 font-black text-slate-900 text-xs border-r border-slate-200">${m.name}</td>
                    <td class="py-1.5 px-3 text-slate-500 text-xs border-r border-slate-200">${m.category}</td>
                    <td class="py-1.5 px-2 text-center font-bold text-slate-600 border-r border-slate-200">${m.unit}</td>
                    <td class="py-1.5 px-3 text-right tabular-nums border-r border-slate-200">
                      ${pur && pur.qty > 0 ? `
                        <span class="font-black text-blue-700">+${pur.qty} <span class="text-[10px] text-blue-500">${m.unit}</span></span>
                        <div class="text-[10px] font-bold text-slate-400">Rs. ${Math.round(pur.cost).toLocaleString()}</div>
                      ` : '<span class="text-slate-400 font-normal">None in period</span>'}
                    </td>
                    <td class="py-1.5 px-3 text-right font-black text-xs text-slate-900 tabular-nums border-r border-slate-200">
                      ${m.current_stock} <span class="text-[10px] text-slate-400 font-bold">${m.unit}</span>
                    </td>
                    <td class="py-1.5 px-3 text-right text-slate-600 tabular-nums border-r border-slate-200">Rs. ${m.cost_price}</td>
                    <td class="py-1.5 px-3 text-right font-black text-emerald-800 tabular-nums border-r border-slate-200">
                      Rs. ${Math.round(m.total_value || (m.current_stock * m.cost_price)).toLocaleString()}
                    </td>
                    <td class="py-1.5 px-3 text-center">
                      ${isLow ? `
                        <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                          ⚠️ Low Stock (Alert &le; ${m.min_stock_alert})
                        </span>
                      ` : `
                        <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          ✓ Adequate Stock
                        </span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  updateRawBody() {
    const el = document.getElementById('rpt-raw-body');
    if (!el) return;
    el.innerHTML = this.renderRawBody();
    if (window.lucide) lucide.createIcons({ root: el });
  },

  // -------------------------------------------------------------
  // TAB 3: FINISHED GOODS WAREHOUSE INVENTORY
  // -------------------------------------------------------------
  async renderInventoryReport(container) {
    const cartonsAll = await window.api.getPackedCartons() || [];
    const packingBatchesAll = await window.api.getPackingBatches() || [];
    const deliveriesAll = await window.api.getShopDeliveries() || [];
    const singleItems = await window.api.getIcecreamItems() || [];
    const cars = await window.api.getCars() || [];
    this.packedCartons = cartonsAll;
    this.packingBatches = packingBatchesAll;
    this.inventoryDeliveries = deliveriesAll;
    this.singleItems = singleItems;
    this.inventoryCars = cars;

    // Cache car inventory
    this.carInventories = {};
    for (const car of cars) {
      this.carInventories[car.id] = await window.api.getCarInventory(car.id) || [];
    }

    container.innerHTML = `
      <!-- Filter Controls -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-end gap-3 flex-wrap">
          <div>
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Filter Carton</label>
            <select id="rpt-carton-select" onchange="Reports.onCartonChange(this.value)"
                    class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none h-[34px] cursor-pointer">
              <option value="">-- All Packed Cartons --</option>
              ${cartonsAll.map(c => `
                <option value="${c.id}" ${String(this.selectedCartonId) === String(c.id) ? 'selected' : ''}>${c.carton_name}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Period</label>
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 h-[34px] items-center">
              <button type="button" onclick="Reports.setPeriod('daily')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'daily' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Daily
              </button>
              <button type="button" onclick="Reports.setPeriod('monthly')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Monthly
              </button>
              <button type="button" onclick="Reports.setPeriod('annual')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'annual' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Annual
              </button>
              <button type="button" onclick="Reports.setPeriod('custom')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'custom' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Custom Range
              </button>
              <button type="button" onclick="Reports.setPeriod('all')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                All Time
              </button>
            </div>
          </div>

          ${this.periodType !== 'all' ? `
            <div>
              <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">
                ${this.periodType === 'custom' ? 'Date Range' : (this.periodType === 'annual' ? 'Year' : (this.periodType === 'monthly' ? 'Month' : 'Date'))}
              </label>
              ${this.periodType === 'custom' ? `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-xl h-[34px]">
                  <span class="text-[10px] font-black uppercase text-slate-400">From</span>
                  <input type="date" id="rpt-inv-start-date" value="${this.startDate || this.selectedDate}" 
                         onchange="Reports.onCustomDateChange('start', this.value)"
                         oninput="Reports.onCustomDateChange('start', this.value)"
                         class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
                  <span class="text-[10px] font-black uppercase text-slate-400">To</span>
                  <input type="date" id="rpt-inv-end-date" value="${this.endDate || this.selectedDate}" 
                         onchange="Reports.onCustomDateChange('end', this.value)"
                         oninput="Reports.onCustomDateChange('end', this.value)"
                         class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
                </div>
              ` : this.periodType === 'annual' ? `
                <select id="rpt-inv-date-input" onchange="Reports.onDateChange(this.value)" oninput="Reports.onDateChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer h-[34px]">
                  ${this.getAvailableYears().map(y => `
                    <option value="${y}" ${String(this.selectedDate || '').startsWith(String(y)) ? 'selected' : ''}>${y}</option>
                  `).join('')}
                </select>
              ` : `
                <input type="${this.periodType === 'monthly' ? 'month' : 'date'}" id="rpt-inv-date-input"
                       value="${this.periodType === 'monthly' ? this.selectedDate.slice(0, 7) : this.selectedDate}"
                       onchange="Reports.onDateChange(this.value)"
                       oninput="Reports.onDateChange(this.value)"
                       class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer h-[34px]">
              `}
            </div>
          ` : ''}

          <!-- Red Cross Reset to Current Date/Period -->
          <div id="rpt-inventory-reset-wrap" class="shrink-0 flex items-center h-[34px]">
            ${this.isFilteredFromCurrent() ? `
              <button type="button" onclick="Reports.resetToCurrent()" 
                      class="w-[34px] h-[34px] rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0" 
                      title="Reset to current (Today)">
                <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <button type="button" onclick="Reports.printInventoryReport()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer">
          <i data-lucide="printer" class="w-3.5 h-3.5 text-amber-400"></i> Print Report
        </button>
      </div>

      <div id="rpt-inventory-body" class="flex-1 flex flex-col gap-4">
        ${this.renderInventoryBody()}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  renderInventoryBody() {
    const cartonsAll = this.packedCartons || [];
    const packingBatchesAll = this.packingBatches || [];
    const deliveriesAll = this.inventoryDeliveries || this.deliveries || [];

    // Filter packing batches and deliveries by period
    let filteredPacking = packingBatchesAll;
    let filteredDeliveries = deliveriesAll;
    if (this.periodType === 'daily' && this.selectedDate) {
      filteredPacking = packingBatchesAll.filter(p => p.date === this.selectedDate);
      filteredDeliveries = deliveriesAll.filter(d => d.date === this.selectedDate);
    } else if (this.periodType === 'monthly' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      filteredPacking = packingBatchesAll.filter(p => p.date && p.date.startsWith(ym));
      filteredDeliveries = deliveriesAll.filter(d => d.date && d.date.startsWith(ym));
    } else if (this.periodType === 'annual' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      filteredPacking = packingBatchesAll.filter(p => p.date && p.date.startsWith(y));
      filteredDeliveries = deliveriesAll.filter(d => d.date && d.date.startsWith(y));
    } else if (this.periodType === 'custom') {
      if (this.startDate) {
        filteredPacking = filteredPacking.filter(p => (p.date || '').slice(0, 10) >= this.startDate);
        filteredDeliveries = filteredDeliveries.filter(d => (d.date || '').slice(0, 10) >= this.startDate);
      }
      if (this.endDate) {
        filteredPacking = filteredPacking.filter(p => (p.date || '').slice(0, 10) <= this.endDate);
        filteredDeliveries = filteredDeliveries.filter(d => (d.date || '').slice(0, 10) <= this.endDate);
      }
    }

    // Packed in period map
    const packedByCarton = {};
    let totalPackedInPeriod = 0;
    filteredPacking.forEach(p => {
      const cid = p.carton_id;
      packedByCarton[cid] = (packedByCarton[cid] || 0) + (p.cartons_packed || 0);
      totalPackedInPeriod += (p.cartons_packed || 0);
    });

    // Delivered in period
    let totalDeliveredInPeriod = 0;
    filteredDeliveries.forEach(d => {
      totalDeliveredInPeriod += Math.max(0, (d.total_cartons_delivered || 0) - (d.total_cartons_returned || 0));
    });

    let cartons = cartonsAll;
    if (this.selectedCartonId) {
      cartons = cartons.filter(c => String(c.id) === String(this.selectedCartonId));
    }

    let totalWarehouseCartons = 0;
    let totalSaleValuation = 0;
    let totalCostValuation = 0;

    cartons.forEach(c => {
      totalWarehouseCartons += (c.factory_carton_stock || 0);
      totalSaleValuation += ((c.factory_carton_stock || 0) * (c.carton_sale_price || 0));
      totalCostValuation += ((c.factory_carton_stock || 0) * (c.carton_cost_price || 0));
    });

    // Compute stock loaded in cars
    let totalCartonsInCars = 0;
    const carInvs = this.carInventories || {};
    Object.values(carInvs).forEach(inv => {
      inv.forEach(i => {
        if (!this.selectedCartonId || String(i.carton_id) === String(this.selectedCartonId)) {
          totalCartonsInCars += (i.cartons_loaded || 0);
        }
      });
    });

    const whCtns = cartons.filter(c => (c.package_type || 'carton') !== 'shoper').reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);
    const whShopers = cartons.filter(c => c.package_type === 'shoper').reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);

    return `
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Warehouse Stock</p>
          <h3 class="text-xl font-black text-slate-900 mt-1">${totalWarehouseCartons} Units</h3>
          <p class="text-[11px] font-bold text-purple-600 mt-0.5">${whCtns} ctns • ${whShopers} shopers</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Loaded in Delivery Cars</p>
          <h3 class="text-xl font-black text-blue-700 mt-1">${totalCartonsInCars} Units</h3>
          <p class="text-[11px] font-bold text-blue-600 mt-0.5">On the Road in Vehicles</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Packed in Period</p>
          <h3 class="text-xl font-black text-emerald-700 mt-1">${totalPackedInPeriod} Units</h3>
          <p class="text-[11px] font-bold text-emerald-600 mt-0.5">${filteredPacking.length} batches (${this.formatPeriodDate(this.selectedDate)})</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Dispatched in Period</p>
          <h3 class="text-xl font-black text-amber-700 mt-1">${totalDeliveredInPeriod} Units</h3>
          <p class="text-[11px] font-bold text-amber-600 mt-0.5">Delivered to Shops</p>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Warehouse Sale Value</p>
          <h3 class="text-xl font-black text-emerald-700 mt-1">Rs. ${Math.round(totalSaleValuation).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-emerald-600 mt-0.5">Expected Revenue</p>
        </div>
      </div>

      <!-- Inventory Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col">
        <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 class="font-black text-xs text-slate-800 uppercase tracking-wider">Carton &amp; Shoper Inventory Catalog</h4>
          <span class="text-[11px] font-bold text-slate-400">${cartons.length} Products</span>
        </div>

        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-2 px-3 border-r border-slate-200">Product / Packaging</th>
                <th class="py-2 px-2 text-center border-r border-slate-200">Packing Spec</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Packed in Period</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Unit Cost (Rs.)</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Sale Price (Rs.)</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Margin / Unit</th>
                <th class="py-2 px-3 text-right border-r border-slate-200">Warehouse Stock</th>
                <th class="py-2 px-3 text-right">Total Sale Worth</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
              ${cartons.map(c => {
                const isShoper = c.package_type === 'shoper';
                const unitAbbr = isShoper ? 'shoper' : 'ctn';
                const unitsAbbr = isShoper ? 'shopers' : 'ctns';
                const margin = (c.carton_sale_price || 0) - (c.carton_cost_price || 0);
                const stockWorth = (c.factory_carton_stock || 0) * (c.carton_sale_price || 0);
                const packed = packedByCarton[c.id] || 0;
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-1.5 px-3 font-black text-slate-900 text-xs border-r border-slate-200">
                      <div class="flex items-center gap-1.5">
                        <span>${c.carton_name}</span>
                        <span class="px-1.5 py-0.2 rounded ${isShoper ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-purple-50 text-purple-800 border-purple-200'} border text-[9px] font-black uppercase">${isShoper ? 'Shoper' : 'Carton'}</span>
                      </div>
                    </td>
                    <td class="py-1.5 px-2 text-center font-bold ${isShoper ? 'text-sky-700' : 'text-purple-700'} border-r border-slate-200 text-xs">${c.pieces_per_carton} pcs/${unitAbbr}</td>
                    <td class="py-1.5 px-3 text-right tabular-nums border-r border-slate-200">
                      ${packed > 0 ? `
                        <span class="font-black text-emerald-700">+${packed} <span class="text-[10px] text-emerald-600">${unitsAbbr}</span></span>
                      ` : `<span class="text-slate-400 font-normal">0 ${unitsAbbr}</span>`}
                    </td>
                    <td class="py-1.5 px-3 text-right text-slate-600 border-r border-slate-200 text-xs">Rs. ${c.carton_cost_price}</td>
                    <td class="py-1.5 px-3 text-right font-black text-slate-900 border-r border-slate-200 text-xs">Rs. ${c.carton_sale_price}</td>
                    <td class="py-1.5 px-3 text-right font-bold text-emerald-700 border-r border-slate-200 text-xs">+Rs. ${margin}</td>
                    <td class="py-1.5 px-3 text-right font-black text-xs ${isShoper ? 'text-sky-800' : 'text-purple-800'} border-r border-slate-200">
                      ${c.factory_carton_stock} <span class="text-[10px] text-slate-400 font-bold">${unitsAbbr}</span>
                    </td>
                    <td class="py-1.5 px-3 text-right font-black text-emerald-800 text-xs">
                      Rs. ${Math.round(stockWorth).toLocaleString()}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  updateInventoryBody() {
    const el = document.getElementById('rpt-inventory-body');
    if (!el) return;
    el.innerHTML = this.renderInventoryBody();
    if (window.lucide) lucide.createIcons({ root: el });
  },

  // -------------------------------------------------------------
  // TAB 4: FACTORY PROFIT & LOSS / EXPENSES
  // -------------------------------------------------------------
  async renderFinanceReport(container) {
    const deliveries = await window.api.getShopDeliveries() || [];
    const expenses = await window.api.getExpenses() || [];
    this.financeDeliveries = deliveries;
    this.expenses = expenses;

    // Filter by period
    let filtDeliv = deliveries;
    let filtExp = expenses;

    if (this.periodType === 'daily' && this.selectedDate) {
      filtDeliv = filtDeliv.filter(d => d.date === this.selectedDate);
      filtExp = filtExp.filter(e => e.date === this.selectedDate);
    } else if (this.periodType === 'monthly' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      filtDeliv = filtDeliv.filter(d => d.date && d.date.startsWith(ym));
      filtExp = filtExp.filter(e => e.date && e.date.startsWith(ym));
    } else if (this.periodType === 'annual' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      filtDeliv = filtDeliv.filter(d => d.date && d.date.startsWith(y));
      filtExp = filtExp.filter(e => e.date && e.date.startsWith(y));
    } else if (this.periodType === 'custom') {
      if (this.startDate) {
        filtDeliv = filtDeliv.filter(d => (d.date || '').slice(0, 10) >= this.startDate);
        filtExp = filtExp.filter(e => (e.date || '').slice(0, 10) >= this.startDate);
      }
      if (this.endDate) {
        filtDeliv = filtDeliv.filter(d => (d.date || '').slice(0, 10) <= this.endDate);
        filtExp = filtExp.filter(e => (e.date || '').slice(0, 10) <= this.endDate);
      }
    }

    let totalSales = 0;
    let totalCashReceived = 0;
    filtDeliv.forEach(d => {
      totalSales += (d.total_amount || 0);
      totalCashReceived += (d.received_amount || 0);
    });

    let totalExpenses = 0;
    filtExp.forEach(e => {
      totalExpenses += (e.amount || 0);
    });

    // Approximate cost of goods at ~70% of gross sales or exact carton costs
    const estCogs = Math.round(totalSales * 0.70);
    const grossProfit = totalSales - estCogs;
    const netProfit = grossProfit - totalExpenses;

    container.innerHTML = `
      <!-- Filters -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-end gap-3 flex-wrap">
          <div>
            <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Financial Period</label>
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 h-[34px] items-center">
              <button type="button" onclick="Reports.setPeriod('daily')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'daily' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Daily
              </button>
              <button type="button" onclick="Reports.setPeriod('monthly')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Monthly
              </button>
              <button type="button" onclick="Reports.setPeriod('annual')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'annual' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Annual
              </button>
              <button type="button" onclick="Reports.setPeriod('custom')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'custom' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                Custom Range
              </button>
              <button type="button" onclick="Reports.setPeriod('all')"
                      class="px-3 py-1 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">
                All Time
              </button>
            </div>
          </div>

          ${this.periodType !== 'all' ? `
            <div>
              <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">
                ${this.periodType === 'custom' ? 'Date Range' : (this.periodType === 'annual' ? 'Year' : (this.periodType === 'monthly' ? 'Month' : 'Date'))}
              </label>
              ${this.periodType === 'custom' ? `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-xl h-[34px]">
                  <span class="text-[10px] font-black uppercase text-slate-400">From</span>
                  <input type="date" id="rpt-finance-start-date" value="${this.startDate || this.selectedDate}" 
                         onchange="Reports.onCustomDateChange('start', this.value)"
                         oninput="Reports.onCustomDateChange('start', this.value)"
                         class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
                  <span class="text-[10px] font-black uppercase text-slate-400">To</span>
                  <input type="date" id="rpt-finance-end-date" value="${this.endDate || this.selectedDate}" 
                         onchange="Reports.onCustomDateChange('end', this.value)"
                         oninput="Reports.onCustomDateChange('end', this.value)"
                         class="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer">
                </div>
              ` : this.periodType === 'annual' ? `
                <select id="rpt-finance-date-input" onchange="Reports.onDateChange(this.value)" oninput="Reports.onDateChange(this.value)" class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer h-[34px]">
                  ${this.getAvailableYears().map(y => `
                    <option value="${y}" ${String(this.selectedDate || '').startsWith(String(y)) ? 'selected' : ''}>${y}</option>
                  `).join('')}
                </select>
              ` : `
                <input type="${this.periodType === 'monthly' ? 'month' : 'date'}" id="rpt-finance-date-input"
                       value="${this.periodType === 'monthly' ? this.selectedDate.slice(0, 7) : this.selectedDate}"
                       onchange="Reports.onDateChange(this.value)"
                       oninput="Reports.onDateChange(this.value)"
                       class="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer h-[34px]">
              `}
            </div>
          ` : ''}

          <!-- Red Cross Reset to Current Date/Period -->
          <div id="rpt-finance-reset-wrap" class="shrink-0 flex items-center h-[34px]">
            ${this.isFilteredFromCurrent() ? `
              <button type="button" onclick="Reports.resetToCurrent()" 
                      class="w-[34px] h-[34px] rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0" 
                      title="Reset to current (Today)">
                <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <button type="button" onclick="Reports.printFinanceReport()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer">
          <i data-lucide="printer" class="w-3.5 h-3.5 text-amber-400"></i> Print Report
        </button>
      </div>

      <div id="rpt-finance-body" class="flex-1 flex flex-col gap-4">
        ${this.renderFinanceBody(totalSales, totalCashReceived, estCogs, totalExpenses, netProfit, filtExp)}
      </div>
    `;
  },

  renderFinanceBody(totalSales, totalCashReceived, estCogs, totalExpenses, netProfit, filtExp) {
    return `
      <!-- Financial Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Gross Sales Revenue</p>
          <h3 class="text-xl font-black text-slate-900 mt-1">Rs. ${Math.round(totalSales).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-slate-500 mt-0.5">Cash: Rs. ${Math.round(totalCashReceived).toLocaleString()}</p>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Est. Production Cost</p>
          <h3 class="text-xl font-black text-rose-700 mt-1">Rs. ${Math.round(estCogs).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-rose-500 mt-0.5">Raw materials &amp; packs</p>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Operating Expenses</p>
          <h3 class="text-xl font-black text-amber-700 mt-1">Rs. ${Math.round(totalExpenses).toLocaleString()}</h3>
          <p class="text-[11px] font-bold text-amber-600 mt-0.5">Fuel, power, labor, repairs</p>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-[10px] font-black uppercase text-slate-400">Estimated Net Profit</p>
          <h3 class="text-xl font-black ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'} mt-1">
            Rs. ${Math.round(netProfit).toLocaleString()}
          </h3>
          <p class="text-[11px] font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} mt-0.5">
            ${totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) + '% net margin' : '0%'}
          </p>
        </div>
      </div>

      <!-- Expenses Breakdown Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col">
        <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 class="font-black text-xs text-slate-800 uppercase tracking-wider">Recorded Expenses Log (${filtExp.length} items)</h4>
          <span class="text-[11px] font-bold text-slate-400">Total Expenses: Rs. ${Math.round(totalExpenses).toLocaleString()}</span>
        </div>

        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[85px]">Date</th>
                <th class="py-2 px-3 border-r border-slate-200">Category</th>
                <th class="py-2 px-3 border-r border-slate-200">Description / Remarks</th>
                <th class="py-2 px-3 text-right">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
              ${filtExp.length > 0 ? filtExp.map(e => `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="py-1.5 px-3 text-slate-600 font-bold border-r border-slate-200 whitespace-nowrap">${app.formatDateTime(e.date, e.created_at)}</td>
                  <td class="py-1.5 px-3 font-black text-slate-800 text-xs border-r border-slate-200">${e.category}</td>
                  <td class="py-1.5 px-3 text-slate-600 text-xs border-r border-slate-200">${e.description || e.notes || 'Expense entry'}</td>
                  <td class="py-1.5 px-3 text-right font-black text-slate-900 text-xs tabular-nums">
                    Rs. ${Math.round(e.amount).toLocaleString()}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="4" class="p-8 text-center text-slate-400 font-bold">No expenses recorded for this period.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  updateFinanceBody() {
    const el = document.getElementById('rpt-finance-body');
    if (!el) return;
    const deliveries = this.financeDeliveries || this.deliveries || [];
    const expenses = this.expenses || [];

    let filtDeliv = deliveries;
    let filtExp = expenses;

    if (this.periodType === 'daily' && this.selectedDate) {
      filtDeliv = filtDeliv.filter(d => d.date === this.selectedDate);
      filtExp = filtExp.filter(e => e.date === this.selectedDate);
    } else if (this.periodType === 'monthly' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      filtDeliv = filtDeliv.filter(d => d.date && d.date.startsWith(ym));
      filtExp = filtExp.filter(e => e.date && e.date.startsWith(ym));
    } else if (this.periodType === 'annual' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      filtDeliv = filtDeliv.filter(d => d.date && d.date.startsWith(y));
      filtExp = filtExp.filter(e => e.date && e.date.startsWith(y));
    } else if (this.periodType === 'custom') {
      if (this.startDate) {
        filtDeliv = filtDeliv.filter(d => (d.date || '').slice(0, 10) >= this.startDate);
        filtExp = filtExp.filter(e => (e.date || '').slice(0, 10) >= this.startDate);
      }
      if (this.endDate) {
        filtDeliv = filtDeliv.filter(d => (d.date || '').slice(0, 10) <= this.endDate);
        filtExp = filtExp.filter(e => (e.date || '').slice(0, 10) <= this.endDate);
      }
    }

    let totalSales = 0;
    let totalCashReceived = 0;
    filtDeliv.forEach(d => {
      totalSales += (d.total_amount || 0);
      totalCashReceived += (d.received_amount || 0);
    });

    let totalExpenses = 0;
    filtExp.forEach(e => {
      totalExpenses += (e.amount || 0);
    });

    const estCogs = Math.round(totalSales * 0.70);
    const grossProfit = totalSales - estCogs;
    const netProfit = grossProfit - totalExpenses;

    el.innerHTML = this.renderFinanceBody(totalSales, totalCashReceived, estCogs, totalExpenses, netProfit, filtExp);
    if (window.lucide) lucide.createIcons({ root: el });
  },

  // -------------------------------------------------------------
  // PRINT ROUTERS & A5 GENERATORS
  // -------------------------------------------------------------
  printCurrentReport() {
    if (this.currentTab === 'cars') this.printCarReport();
    else if (this.currentTab === 'raw') this.printRawReport();
    else if (this.currentTab === 'inventory') this.printInventoryReport();
    else if (this.currentTab === 'finance') this.printFinanceReport();
  },

  async printCarReport() {
    const s = this.settings;
    const car = this.cars.find(c => String(c.id) === String(this.selectedCarId));
    const carName = car ? `${car.car_number} (${car.driver_name})` : 'All Delivery Vehicles';

    let filtered = this.deliveries;
    if (this.selectedCarId) filtered = filtered.filter(d => String(d.car_id) === String(this.selectedCarId));
    if (this.periodType === 'daily' && this.selectedDate) filtered = filtered.filter(d => d.date === this.selectedDate);
    else if (this.periodType === 'monthly' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      filtered = filtered.filter(d => d.date && d.date.startsWith(ym));
    } else if (this.periodType === 'annual' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      filtered = filtered.filter(d => d.date && d.date.startsWith(y));
    }

    let totalCartons = 0;
    let totalSales = 0;
    let totalCash = 0;
    let totalDue = 0;

    filtered.forEach(d => {
      totalCartons += (d.total_cartons_delivered || 0);
      totalSales += (d.total_amount || 0);
      totalCash += (d.received_amount || 0);
      totalDue += (d.remaining_balance || 0);
    });

    const html = `
      <div class="a5-container">
        <div class="a5-header" style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <div class="a5-title" style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000;">${s.company_name || 'DELICIOUS SUPERSTAR FOODS'}</div>
          <div class="a5-subtitle" style="font-size: 9px; font-weight: 500; color: #000; margin-top: 1px;">${s.address || 'Hasan Abdal'} • Phone: ${s.phone || '0315-6795995'}</div>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase; margin: 4px 0 6px 0;">
          DELIVERY VEHICLE SALES &amp; PERFORMANCE REPORT
        </div>

        <div class="a5-meta-box" style="border: 1.5px solid #000; padding: 5px 8px; margin: 6px 0; display: flex; justify-content: space-between; font-size: 9px; line-height: 1.45; background: #fff; color: #000;">
          <div>
            <div><strong>Vehicle:</strong> <span style="font-weight: 800;">${carName}</span></div>
            <div><strong>Driver Phone:</strong> ${car?.phone || 'N/A'}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Period:</strong> ${this.periodType.toUpperCase()} (${this.formatPeriodDate(this.selectedDate)})</div>
            <div><strong>Printed On:</strong> ${app.formatDateTime(new Date())}</div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; width: 68px; white-space: nowrap; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Date</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; width: 80px; white-space: nowrap; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Inv #</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Shop / Customer</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 35px; white-space: nowrap; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Ctns</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 65px; white-space: nowrap; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Total (Rs.)</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 60px; white-space: nowrap; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Cash (Rs.)</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 65px; white-space: nowrap; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Khata Due</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(d => `
              <tr>
                <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 8.5px; color: #000; white-space: nowrap;">${app.formatDateTime(d.date, d.created_at)}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 8.5px; font-weight: 700; font-family: -apple-system, monospace; color: #000; white-space: nowrap;">${d.invoice_no}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 8.5px; font-weight: 600; color: #000;">${d.shop_name}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: center; font-size: 8.5px; font-weight: 800; color: #000; white-space: nowrap;">${d.total_cartons_delivered || 0}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-family: -apple-system, monospace; font-size: 8.5px; color: #000; white-space: nowrap;">Rs. ${Math.round(d.total_amount).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-weight: 700; font-family: -apple-system, monospace; font-size: 8.5px; color: #000; white-space: nowrap;">Rs. ${Math.round(d.received_amount).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-weight: 700; font-family: -apple-system, monospace; font-size: 8.5px; color: #000; white-space: nowrap;">Rs. ${Math.round(d.remaining_balance).toLocaleString()}</td>
              </tr>
            `).join('')}
            ${filtered.length === 0 ? '<tr><td colspan="7" style="border: 1px solid #000; padding: 10px; text-align: center; color: #000;">No delivery orders found for this selection.</td></tr>' : ''}
          </tbody>
        </table>

        <div class="a5-summary-box" style="border: 1.5px solid #000; padding: 5px 8px; margin-top: 6px; font-size: 9.5px; background: #fff; color: #000;">
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 1.5px 0;">
            <span>Total Deliveries Completed:</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">${filtered.length} Orders</span>
          </div>
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 1.5px 0;">
            <span>Total Cartons Delivered to Shops:</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">${totalCartons} Cartons</span>
          </div>
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 1.5px 0;">
            <span>Gross Sales Value:</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">Rs. ${Math.round(totalSales).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 1.5px 0;">
            <span>Cash Collected by Driver:</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">Rs. ${Math.round(totalCash).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row a5-total" style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; padding-top: 3px; margin-top: 2px; font-weight: 900; font-size: 10.5px;">
            <span>Outstanding Khata Added:</span>
            <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(totalDue).toLocaleString()}</span>
          </div>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Driver Signature</div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Cashier / Manager</div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Car Delivery Report - ${carName}`);
  },

  async printRawReport() {
    const s = this.settings;
    let rawList = await window.api.getRawMaterials() || [];
    if (this.selectedRawCategory) {
      rawList = rawList.filter(m => m.category === this.selectedRawCategory);
    }
    let totalVal = 0;
    rawList.forEach(m => totalVal += (m.total_value || (m.current_stock * m.cost_price) || 0));

    const html = `
      <div class="a5-container">
        <div class="a5-header" style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <div class="a5-title" style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000;">${s.company_name || 'DELICIOUS SUPERSTAR FOODS'}</div>
          <div class="a5-subtitle" style="font-size: 9px; font-weight: 500; color: #000; margin-top: 1px;">${s.address || 'Hasan Abdal'} • Phone: ${s.phone || '0315-6795995'}</div>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase; margin: 4px 0 6px 0;">
          RAW MATERIALS STOCK &amp; REMAINING BALANCE SHEET
        </div>

        <div class="a5-meta-box" style="border: 1.5px solid #000; padding: 5px 8px; margin: 6px 0; display: flex; justify-content: space-between; font-size: 9px; line-height: 1.45; background: #fff; color: #000;">
          <div>
            <div><strong>Factory Stage:</strong> Stage 1: Raw Materials Inventory</div>
            <div><strong>Category:</strong> ${this.selectedRawCategory || 'All Categories'} (${rawList.length} Items)</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Period:</strong> ${this.periodType.toUpperCase()} (${this.formatPeriodDate(this.selectedDate)})</div>
            <div><strong>Printed On:</strong> ${app.formatDateTime(new Date())}</div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Material</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Category</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 45px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Unit</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 85px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Remaining Balance</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 75px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Cost / Unit</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 85px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Value (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${rawList.map(m => `
              <tr>
                <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 8.5px; font-weight: 700; color: #000;">${m.name}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 8.5px; color: #000;">${m.category}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: center; font-size: 8.5px; color: #000;">${m.unit}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-size: 8.5px; font-weight: 800; color: #000;">${m.current_stock} ${m.unit}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-family: -apple-system, monospace; font-size: 8.5px; color: #000;">Rs. ${m.cost_price}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-family: -apple-system, monospace; font-size: 8.5px; font-weight: 700; color: #000;">Rs. ${Math.round(m.total_value || (m.current_stock * m.cost_price)).toLocaleString()}</td>
              </tr>
            `).join('')}
            ${rawList.length === 0 ? '<tr><td colspan="6" style="border: 1px solid #000; padding: 10px; text-align: center; color: #000;">No raw materials found.</td></tr>' : ''}
          </tbody>
        </table>

        <div class="a5-summary-box" style="border: 1.5px solid #000; padding: 5px 8px; margin-top: 6px; font-size: 9.5px; background: #fff; color: #000;">
          <div class="a5-summary-row a5-total" style="display: flex; justify-content: space-between; font-weight: 900; font-size: 10.5px;">
            <span>Total Raw Material Valuation:</span>
            <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(totalVal).toLocaleString()}</span>
          </div>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Store Keeper</div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Factory Supervisor</div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Raw Material Stock Balance Sheet');
  },

  async printInventoryReport() {
    const s = this.settings;
    let cartons = await window.api.getPackedCartons() || [];
    if (this.selectedCartonId) {
      cartons = cartons.filter(c => String(c.id) === String(this.selectedCartonId));
    }
    let totalStock = 0;
    let totalWorth = 0;

    cartons.forEach(c => {
      totalStock += (c.factory_carton_stock || 0);
      totalWorth += ((c.factory_carton_stock || 0) * (c.carton_sale_price || 0));
    });

    const html = `
      <div class="a5-container">
        <div class="a5-header" style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <div class="a5-title" style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000;">${s.company_name || 'DELICIOUS SUPERSTAR FOODS'}</div>
          <div class="a5-subtitle" style="font-size: 9px; font-weight: 500; color: #000; margin-top: 1px;">${s.address || 'Hasan Abdal'} • Phone: ${s.phone || '0315-6795995'}</div>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase; margin: 4px 0 6px 0;">
          FINISHED GOODS WAREHOUSE INVENTORY SHEET
        </div>

        <div class="a5-meta-box" style="border: 1.5px solid #000; padding: 5px 8px; margin: 6px 0; display: flex; justify-content: space-between; font-size: 9px; line-height: 1.45; background: #fff; color: #000;">
          <div>
            <div><strong>Inventory Location:</strong> Main Cold Storage Warehouse</div>
            <div><strong>Carton:</strong> ${this.selectedCartonId && cartons[0] ? cartons[0].carton_name : `All Cartons (${cartons.length} Products)`}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Period:</strong> ${this.periodType.toUpperCase()} (${this.formatPeriodDate(this.selectedDate)})</div>
            <div><strong>Printed On:</strong> ${app.formatDateTime(new Date())}</div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Carton Product</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 55px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Pcs/Ctn</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 65px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Cost (Rs.)</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 65px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Sale (Rs.)</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 85px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Warehouse Stock</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 85px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${cartons.map(c => `
              <tr>
                <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 8.5px; font-weight: 700; color: #000;">${c.carton_name}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: center; font-size: 8.5px; color: #000;">${c.pieces_per_carton}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-family: -apple-system, monospace; font-size: 8.5px; color: #000;">Rs. ${c.carton_cost_price}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-family: -apple-system, monospace; font-size: 8.5px; font-weight: 700; color: #000;">Rs. ${c.carton_sale_price}</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-size: 8.5px; font-weight: 800; color: #000;">${c.factory_carton_stock} ctns</td>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-family: -apple-system, monospace; font-size: 8.5px; font-weight: 700; color: #000;">Rs. ${Math.round((c.factory_carton_stock || 0) * (c.carton_sale_price || 0)).toLocaleString()}</td>
              </tr>
            `).join('')}
            ${cartons.length === 0 ? '<tr><td colspan="6" style="border: 1px solid #000; padding: 10px; text-align: center; color: #000;">No packed cartons in warehouse.</td></tr>' : ''}
          </tbody>
        </table>

        <div class="a5-summary-box" style="border: 1.5px solid #000; padding: 5px 8px; margin-top: 6px; font-size: 9.5px; background: #fff; color: #000;">
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 1.5px 0;">
            <span>Total Packed Cartons in Stock:</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">${totalStock} Cartons</span>
          </div>
          <div class="a5-summary-row a5-total" style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; padding-top: 3px; margin-top: 2px; font-weight: 900; font-size: 10.5px;">
            <span>Total Warehouse Realizable Value:</span>
            <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(totalWorth).toLocaleString()}</span>
          </div>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Cold Storage Incharge</div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Factory Manager</div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Finished Goods Warehouse Stock Sheet');
  },

  async printFinanceReport() {
    const s = this.settings;
    const deliveries = await window.api.getShopDeliveries() || [];
    const expenses = await window.api.getExpenses() || [];

    let filtDeliv = deliveries;
    let filtExp = expenses;
    if (this.periodType === 'daily' && this.selectedDate) {
      filtDeliv = filtDeliv.filter(d => d.date === this.selectedDate);
      filtExp = filtExp.filter(e => e.date === this.selectedDate);
    } else if (this.periodType === 'monthly' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      filtDeliv = filtDeliv.filter(d => d.date && d.date.startsWith(ym));
      filtExp = filtExp.filter(e => e.date && e.date.startsWith(ym));
    } else if (this.periodType === 'annual' && this.selectedDate) {
      const y = this.selectedDate.slice(0, 4);
      filtDeliv = filtDeliv.filter(d => d.date && d.date.startsWith(y));
      filtExp = filtExp.filter(e => e.date && e.date.startsWith(y));
    } else if (this.periodType === 'custom') {
      if (this.startDate) {
        filtDeliv = filtDeliv.filter(d => (d.date || '').slice(0, 10) >= this.startDate);
        filtExp = filtExp.filter(e => (e.date || '').slice(0, 10) >= this.startDate);
      }
      if (this.endDate) {
        filtDeliv = filtDeliv.filter(d => (d.date || '').slice(0, 10) <= this.endDate);
        filtExp = filtExp.filter(e => (e.date || '').slice(0, 10) <= this.endDate);
      }
    }

    let totalSales = 0;
    let totalCash = 0;
    filtDeliv.forEach(d => {
      totalSales += (d.total_amount || 0);
      totalCash += (d.received_amount || 0);
    });

    let totalExpenses = 0;
    filtExp.forEach(e => totalExpenses += (e.amount || 0));

    const estCogs = Math.round(totalSales * 0.70);
    const grossProfit = totalSales - estCogs;
    const netProfit = grossProfit - totalExpenses;

    const html = `
      <div class="a5-container">
        <div class="a5-header" style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <div class="a5-title" style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000;">${s.company_name || 'DELICIOUS SUPERSTAR FOODS'}</div>
          <div class="a5-subtitle" style="font-size: 9px; font-weight: 500; color: #000; margin-top: 1px;">${s.address || 'Hasan Abdal'} • Phone: ${s.phone || '0315-6795995'}</div>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase; margin: 4px 0 6px 0;">
          FACTORY PROFIT &amp; LOSS FINANCIAL STATEMENT
        </div>

        <div class="a5-meta-box" style="border: 1.5px solid #000; padding: 5px 8px; margin: 6px 0; display: flex; justify-content: space-between; font-size: 9px; line-height: 1.45; background: #fff; color: #000;">
          <div>
            <div><strong>Financial Period:</strong> ${this.periodType.toUpperCase()} (${this.formatPeriodDate(this.selectedDate)})</div>
            <div><strong>Currency:</strong> Pakistani Rupee (PKR)</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Generated:</strong> ${app.formatDateTime(new Date())}</div>
            <div><strong>Audited By:</strong> Management</div>
          </div>
        </div>

        <div class="a5-summary-box" style="border: 1.5px solid #000; padding: 6px 10px; margin-top: 10px; font-size: 9.5px; background: #fff; color: #000;">
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 2px 0;">
            <span>Gross Ice Cream Sales Revenue:</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">Rs. ${Math.round(totalSales).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 2px 0;">
            <span>Estimated Cost of Goods Sold (Raw Materials &amp; Packaging):</span>
            <span style="font-weight: 700; font-family: -apple-system, monospace;">- Rs. ${Math.round(estCogs).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding: 3px 0; margin-top: 2px;">
            <span>Gross Manufacturing Profit:</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">Rs. ${Math.round(grossProfit).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 2px 0;">
            <span>Factory Operating &amp; Delivery Expenses:</span>
            <span style="font-weight: 700; font-family: -apple-system, monospace;">- Rs. ${Math.round(totalExpenses).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row a5-total" style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; font-size: 11.5px; margin-top: 4px; padding-top: 4px; font-weight: 900;">
            <span>Net Factory Profit / (Loss):</span>
            <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(netProfit).toLocaleString()}</span>
          </div>
        </div>

        <div style="margin-top: 12px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; color: #000;">Key Operating Expenses Summary</div>
          <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9px; background: #fff;">
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Category</th>
                <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Remarks</th>
                <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 85px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${filtExp.slice(0, 8).map(e => `
                <tr>
                  <td style="border: 1px solid #000; padding: 3px 5px; font-weight: 700; color: #000;">${e.category}</td>
                  <td style="border: 1px solid #000; padding: 3px 5px; color: #000;">${e.description || e.notes || 'Operating expense'}</td>
                  <td style="border: 1px solid #000; padding: 3px 5px; text-align: right; font-weight: 700; font-family: -apple-system, monospace; color: #000;">Rs. ${Math.round(e.amount).toLocaleString()}</td>
                </tr>
              `).join('')}
              ${filtExp.length === 0 ? '<tr><td colspan="3" style="border: 1px solid #000; padding: 8px; text-align: center; color: #000;">No operating expenses recorded.</td></tr>' : ''}
            </tbody>
          </table>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Accountant</div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Factory Owner / Director</div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Factory Profit & Loss Statement');
  }
};
