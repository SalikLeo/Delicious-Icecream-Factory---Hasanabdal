// Raw Material Purchases: Management, multi-item purchase orders, and vendor khata tracking
window.Purchases = {
  purchases: [],
  filteredPurchases: [],
  materials: [],
  suppliersList: [],
  suppliers: [], // supplier names list
  selectedMaterialId: '',
  selectedSupplier: '',
  periodType: 'day', // 'day' | 'month' | 'year' | 'custom' | 'all'
  selectedDate: '',
  startDate: '',
  endDate: '',
  selectedYear: new Date().getFullYear(),
  searchQuery: '',
  sortField: 'date',
  sortOrder: 'desc',
  container: null,
  _modalItems: [],

  async render(container) {
    this.container = container;
    const today = new Date().toISOString().slice(0, 10);
    if (!this.selectedDate) this.selectedDate = today;
    if (!this.startDate) this.startDate = today;
    if (!this.endDate) this.endDate = today;

    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 no-print">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="shopping-bag" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Raw Material Purchases</h2>
              <p class="text-xs text-slate-500 font-medium">Record factory raw material purchases, multi-item bills, vendor debt &amp; payment tracking.</p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" onclick="app.navigate('suppliers')"
                    class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    title="Manage suppliers and view purchases per supplier">
              <i data-lucide="users" class="w-4 h-4 text-blue-400"></i> Suppliers / Khata
            </button>
            <button type="button" onclick="app.navigate('item-purchases')"
                    class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    title="View item-wise raw material purchases breakdown">
              <i data-lucide="package" class="w-4 h-4 text-emerald-400"></i> Item Purchases
            </button>
            <button type="button" onclick="Purchases.printReport()"
                    class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    title="Print Purchases Report (A5)">
              <i data-lucide="printer" class="w-4 h-4"></i> Print
            </button>
            <button type="button" onclick="Purchases.openPurchaseModal()"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="plus" class="w-4 h-4"></i> + Record Purchase
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Total Purchases</p>
            <h3 class="text-xl font-black text-slate-900 mt-1" id="pur-stat-count">0</h3>
            <p class="text-[11px] font-bold text-slate-400 mt-0.5">Orders in period</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Total Purchase Spend</p>
            <h3 class="text-xl font-black text-emerald-700 mt-1" id="pur-stat-total">Rs. 0</h3>
            <p class="text-[11px] font-bold text-emerald-600 mt-0.5">Gross materials cost</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Amount Paid (Outflow)</p>
            <h3 class="text-xl font-black text-blue-700 mt-1" id="pur-stat-paid">Rs. 0</h3>
            <p class="text-[11px] font-bold text-blue-600 mt-0.5">Paid in cash / bank</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Pending to Supplier Khata</p>
            <h3 class="text-xl font-black text-rose-600 mt-1" id="pur-stat-pending">Rs. 0</h3>
            <p class="text-[11px] font-bold text-rose-500 mt-0.5">Added to vendor debt</p>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-3 flex-wrap flex-1 min-w-[300px]">
            <!-- Search -->
            <div class="relative flex-1 min-w-[200px]">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="pur-search" oninput="Purchases.onSearchChange(this.value)"
                     placeholder="Search by Invoice #, Material, Supplier, Notes..."
                     value="${this.searchQuery}"
                     class="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500">
              <button id="pur-search-clear" onclick="Purchases.clearSearch()" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${this.searchQuery ? '' : 'hidden'} cursor-pointer">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Material Filter -->
            <select id="pur-material-select" onchange="Purchases.onMaterialChange(this.value)"
                    class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer">
              <option value="">-- All Materials --</option>
            </select>

            <!-- Supplier Filter -->
            <select id="pur-supplier-select" onchange="Purchases.onSupplierChange(this.value)"
                    class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer">
              <option value="">-- All Suppliers --</option>
            </select>
          </div>

          <!-- Time Period Tabs & Picker -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex bg-slate-100 p-1 rounded-xl">
              <button type="button" id="pur-tab-day" onclick="Purchases.setPeriod('day')" 
                      class="px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'day' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}">Daily</button>
              <button type="button" id="pur-tab-month" onclick="Purchases.setPeriod('month')" 
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${this.periodType === 'month' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'}">Monthly</button>
              <button type="button" id="pur-tab-year" onclick="Purchases.setPeriod('year')" 
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${this.periodType === 'year' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'}">Annual</button>
              <button type="button" id="pur-tab-custom" onclick="Purchases.setPeriod('custom')" 
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${this.periodType === 'custom' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'}">Custom Range</button>
              <button type="button" id="pur-tab-all" onclick="Purchases.setPeriod('all')" 
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${this.periodType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'}">All</button>
            </div>

            <div id="pur-date-picker-wrap">
              ${this.renderDatePickerHtml()}
            </div>

            <div id="pur-reset-filter-wrap">
              ${this.isFilteredFromCurrent() ? `
                <button type="button" onclick="Purchases.resetToCurrent()" 
                        class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                        title="Go back to current (Today)">
                  <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Purchases Table -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-left text-xs border-collapse border border-slate-200">
              <thead id="pur-table-head" class="bg-slate-100/90 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th onclick="Purchases.toggleSort('date')" class="py-2 px-3 border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Date</span>
                      ${this.getSortIcon('date')}
                    </div>
                  </th>
                  <th onclick="Purchases.toggleSort('invoice')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Invoice #</span>
                      ${this.getSortIcon('invoice')}
                    </div>
                  </th>
                  <th class="py-2 px-3 border-r border-slate-200">
                    <span>Raw Materials / Items</span>
                  </th>
                  <th onclick="Purchases.toggleSort('supplier')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Supplier</span>
                      ${this.getSortIcon('supplier')}
                    </div>
                  </th>
                  <th onclick="Purchases.toggleSort('total_cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-end gap-1">
                      <span>Total Bill</span>
                      ${this.getSortIcon('total_cost')}
                    </div>
                  </th>
                  <th class="py-2 px-3 text-right border-r border-slate-200">
                    <span>Paid (Cash)</span>
                  </th>
                  <th class="py-2 px-3 text-right border-r border-slate-200">
                    <span>Khata Balance</span>
                  </th>
                  <th class="py-2 px-3 border-r border-slate-200">Notes</th>
                  <th class="py-2 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody id="pur-table-body" class="divide-y divide-slate-100 font-semibold text-slate-700">
                <!-- Injected via renderTable() -->
              </tbody>
              <tfoot id="pur-table-foot" class="sticky bottom-0 bg-slate-100/95 font-black text-slate-900 border-t-2 border-slate-300 shadow-sm z-10">
                <!-- Injected via renderTable() -->
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: container });
    await this.loadData();
  },

  async loadData() {
    try {
      this.purchases = await window.api.getRawMaterialPurchases() || [];
      this.materials = await window.api.getRawMaterials() || [];
      this.suppliersList = await window.api.getSuppliers() || [];
      this.suppliers = await window.api.getRawMaterialSuppliers() || [];

      this.populateDropdowns();
      this.applyFilters();
    } catch (err) {
      console.error('[Purchases.loadData] Error:', err);
      app.showToast('Failed to load purchases data', 'error');
    }
  },

  populateDropdowns() {
    const matSelect = document.getElementById('pur-material-select');
    if (matSelect) {
      matSelect.innerHTML = `
        <option value="">-- All Materials --</option>
        ${this.materials.map(m => `
          <option value="${m.id}" ${String(this.selectedMaterialId) === String(m.id) ? 'selected' : ''}>${m.name} (${m.unit})</option>
        `).join('')}
      `;
    }

    const supSelect = document.getElementById('pur-supplier-select');
    if (supSelect) {
      supSelect.innerHTML = `
        <option value="">-- All Suppliers --</option>
        ${this.suppliers.map(s => `
          <option value="${s}" ${this.selectedSupplier === s ? 'selected' : ''}>${s}</option>
        `).join('')}
      `;
    }
  },

  renderDatePickerHtml() {
    if (this.periodType === 'all') return '';
    if (this.periodType === 'custom') {
      return `
        <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
          <span class="text-[10px] font-black uppercase text-slate-400">From</span>
          <input type="date" id="pur-start-date" value="${this.startDate || this.selectedDate}" 
                 onchange="Purchases.onCustomDateChange('start', this.value)"
                 oninput="Purchases.onCustomDateChange('start', this.value)"
                 class="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer font-mono">
          <span class="text-[10px] font-black uppercase text-slate-400">To</span>
          <input type="date" id="pur-end-date" value="${this.endDate || this.selectedDate}" 
                 onchange="Purchases.onCustomDateChange('end', this.value)"
                 oninput="Purchases.onCustomDateChange('end', this.value)"
                 class="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer font-mono">
        </div>
      `;
    }
    if (this.periodType === 'year') {
      const curYear = new Date().getFullYear();
      const years = [curYear, curYear - 1, curYear - 2, curYear + 1];
      return `
        <select id="pur-date-input" onchange="Purchases.onDateChange(this.value)"
                class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 cursor-pointer">
          ${years.map(y => `<option value="${y}" ${String(this.selectedYear) === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      `;
    }
    return `
      <input type="${this.periodType === 'month' ? 'month' : 'date'}" id="pur-date-input"
             value="${this.periodType === 'month' ? (this.selectedDate || '').slice(0, 7) : this.selectedDate}"
             onchange="Purchases.onDateChange(this.value)" oninput="Purchases.onDateChange(this.value)"
             class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 font-mono">
    `;
  },

  applyFilters() {
    let list = [...this.purchases];

    // Period filter
    if (this.periodType === 'day' && this.selectedDate) {
      list = list.filter(p => (p.date || '').slice(0, 10) === this.selectedDate);
    } else if (this.periodType === 'month' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      list = list.filter(p => (p.date || '').slice(0, 7) === ym);
    } else if (this.periodType === 'year' && this.selectedYear) {
      const y = String(this.selectedYear);
      list = list.filter(p => (p.date || '').slice(0, 4) === y);
    } else if (this.periodType === 'custom') {
      if (this.startDate) list = list.filter(p => (p.date || '').slice(0, 10) >= this.startDate);
      if (this.endDate) list = list.filter(p => (p.date || '').slice(0, 10) <= this.endDate);
    }

    // Material filter
    if (this.selectedMaterialId) {
      list = list.filter(p => {
        if (String(p.material_id) === String(this.selectedMaterialId)) return true;
        if (p.items && p.items.some(it => String(it.material_id) === String(this.selectedMaterialId))) return true;
        return false;
      });
    }

    // Supplier filter
    if (this.selectedSupplier) {
      const selSupLower = this.selectedSupplier.toLowerCase();
      list = list.filter(p => {
        const s1 = (p.supplier_name || '').toLowerCase();
        const s2 = (p.supplier_official_name || '').toLowerCase();
        return s1 === selSupLower || s2 === selSupLower;
      });
    }

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => {
        if (p.invoice_no && p.invoice_no.toLowerCase().includes(q)) return true;
        if (p.material_name && p.material_name.toLowerCase().includes(q)) return true;
        if (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) return true;
        if (p.supplier_official_name && p.supplier_official_name.toLowerCase().includes(q)) return true;
        if (p.notes && p.notes.toLowerCase().includes(q)) return true;
        if (p.items && p.items.some(it => it.material_name && it.material_name.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    // Sorting
    list.sort((a, b) => {
      let va, vb;
      switch (this.sortField) {
        case 'date':
          va = a.date || '';
          vb = b.date || '';
          break;
        case 'invoice':
          va = (a.invoice_no || '').toLowerCase();
          vb = (b.invoice_no || '').toLowerCase();
          break;
        case 'material':
          va = (a.material_name || '').toLowerCase();
          vb = (b.material_name || '').toLowerCase();
          break;
        case 'supplier':
          va = (a.supplier_official_name || a.supplier_name || '').toLowerCase();
          vb = (b.supplier_official_name || b.supplier_name || '').toLowerCase();
          break;
        case 'total_cost':
          va = Number(a.total_cost) || 0;
          vb = Number(b.total_cost) || 0;
          break;
        default:
          va = a.id;
          vb = b.id;
      }
      if (va < vb) return this.sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredPurchases = list;
    this.renderStats();
    this.renderTable();
    this.updateResetButton();
  },

  renderStats() {
    const list = this.filteredPurchases;
    const totalCount = list.length;
    const totalCost = list.reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);
    const totalPaid = list.reduce((sum, p) => sum + (p.paid_amount != null ? Number(p.paid_amount) : Number(p.total_cost) || 0), 0);
    const totalPending = list.reduce((sum, p) => sum + (Number(p.remaining_balance) || 0), 0);

    const countEl = document.getElementById('pur-stat-count');
    const totalEl = document.getElementById('pur-stat-total');
    const paidEl = document.getElementById('pur-stat-paid');
    const pendEl = document.getElementById('pur-stat-pending');

    if (countEl) countEl.textContent = `${totalCount} Orders`;
    if (totalEl) totalEl.textContent = `Rs. ${Math.round(totalCost).toLocaleString()}`;
    if (paidEl) paidEl.textContent = `Rs. ${Math.round(totalPaid).toLocaleString()}`;
    if (pendEl) pendEl.textContent = `Rs. ${Math.round(totalPending).toLocaleString()}`;
  },

  renderTable() {
    const tbody = document.getElementById('pur-table-body');
    const tfoot = document.getElementById('pur-table-foot');
    if (!tbody) return;

    if (this.filteredPurchases.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="p-12 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center">
              <i data-lucide="shopping-bag" class="w-12 h-12 mb-3 text-slate-300"></i>
              <h4 class="text-sm font-black text-slate-600">No Raw Material Purchases Found</h4>
              <p class="text-xs text-slate-400 mt-1">Try selecting a different date range or record a new purchase.</p>
              <button onclick="Purchases.openPurchaseModal()" class="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2">
                <i data-lucide="plus" class="w-4 h-4"></i> + Record First Purchase
              </button>
            </div>
          </td>
        </tr>
      `;
      if (tfoot) tfoot.innerHTML = '';
      if (window.lucide) lucide.createIcons({ root: tbody });
      return;
    }

    let sumCost = 0;
    let sumPaid = 0;
    let sumPending = 0;

    tbody.innerHTML = this.filteredPurchases.map(p => {
      const totalCost = Number(p.total_cost) || 0;
      const paidAmount = p.paid_amount != null ? Number(p.paid_amount) : totalCost;
      const remaining = Number(p.remaining_balance) || 0;
      sumCost += totalCost;
      sumPaid += paidAmount;
      sumPending += remaining;

      const items = p.items && p.items.length > 0 ? p.items : null;
      let itemsHtml = '';
      if (items && items.length > 1) {
        const itemNames = items.map(it => `${it.material_name} (${it.qty} ${it.unit})`).join(', ');
        itemsHtml = `
          <div title="${itemNames}">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-black text-slate-900">${items[0].material_name}</span>
              <span class="text-[10px] text-slate-500 font-bold">(${items[0].qty} ${items[0].unit})</span>
              <span class="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                +${items.length - 1} more (${items.length} items)
              </span>
            </div>
          </div>
        `;
      } else {
        const matName = p.material_name || (items && items[0] ? items[0].material_name : 'Raw Material');
        const qtyStr = p.qty ? `${p.qty} ${p.unit || ''}` : (items && items[0] ? `${items[0].qty} ${items[0].unit}` : '');
        itemsHtml = `
          <div class="flex items-center gap-1.5">
            <span class="font-black text-slate-900">${matName}</span>
            ${qtyStr ? `<span class="text-[10px] text-slate-500 font-bold">(${qtyStr})</span>` : ''}
          </div>
        `;
      }

      const supplierDisplay = p.supplier_official_name || p.supplier_name || 'Walk-in / Cash';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap border-r border-slate-200">${app.formatDateTime(p.date, p.created_at)}</td>
          <td class="py-2.5 px-3 font-mono font-black text-slate-900 whitespace-nowrap border-r border-slate-200">${p.invoice_no || `PUR-${p.id}`}</td>
          <td class="py-2.5 px-3 border-r border-slate-200 min-w-[200px]">
            ${itemsHtml}
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200">
            <span class="font-bold text-slate-800">${supplierDisplay}</span>
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-xs border-r border-slate-200">
            Rs. ${Math.round(totalCost).toLocaleString()}
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 text-xs border-r border-slate-200">
            Rs. ${Math.round(paidAmount).toLocaleString()}
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-xs border-r border-slate-200">
            ${remaining > 0 
              ? `<span class="text-rose-600 font-black">Rs. ${Math.round(remaining).toLocaleString()}</span>` 
              : `<span class="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Paid</span>`}
          </td>
          <td class="py-2.5 px-3 text-slate-500 text-[11px] max-w-[150px] truncate border-r border-slate-200" title="${p.notes || ''}">
            ${p.notes || '—'}
          </td>
          <td class="py-2.5 px-3 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="Purchases.viewReceipt(${p.id})" title="View / Print Inward Voucher (A5)"
                      class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="Purchases.openPurchaseModal(${p.id})" title="Edit Purchase"
                      class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="Purchases.deletePurchase(${p.id})" title="Delete Purchase"
                      class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (tfoot) {
      tfoot.innerHTML = `
        <tr class="bg-slate-100/90 text-slate-900 border-t-2 border-slate-300">
          <td colspan="4" class="py-2.5 px-3 uppercase tracking-wider font-black text-[11px] border-r border-slate-200">
            TOTAL: ${this.filteredPurchases.length} PURCHASES
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-xs border-r border-slate-200">
            Rs. ${Math.round(sumCost).toLocaleString()}
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-xs border-r border-slate-200">
            Rs. ${Math.round(sumPaid).toLocaleString()}
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-rose-600 text-xs border-r border-slate-200">
            Rs. ${Math.round(sumPending).toLocaleString()}
          </td>
          <td colspan="2" class="py-2.5 px-3"></td>
        </tr>
      `;
    }

    if (window.lucide) lucide.createIcons({ root: tbody });
  },

  toggleSort(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = (field === 'material' || field === 'supplier') ? 'asc' : 'desc';
    }
    this.updateSortHeader();
    this.applyFilters();
  },

  updateSortHeader() {
    const head = document.getElementById('pur-table-head');
    if (!head) return;
    head.querySelectorAll('th[onclick]').forEach(th => {
      const fieldMatch = th.getAttribute('onclick')?.match(/toggleSort\('([^']+)'\)/);
      if (fieldMatch) {
        const f = fieldMatch[1];
        const span = th.querySelector('.sort-icon-wrap');
        if (span) span.innerHTML = this.getSortIcon(f);
      }
    });
  },

  getSortIcon(field) {
    const isActive = this.sortField === field;
    if (!isActive) {
      return `<span class="sort-icon-wrap opacity-40"><i data-lucide="chevrons-up-down" class="w-3.5 h-3.5"></i></span>`;
    }
    return `<span class="sort-icon-wrap text-emerald-600"><i data-lucide="${this.sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5"></i></span>`;
  },

  onSearchChange(val) {
    this.searchQuery = val;
    const clearBtn = document.getElementById('pur-search-clear');
    if (clearBtn) {
      if (val) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }
    this.applyFilters();
  },

  clearSearch() {
    this.searchQuery = '';
    const input = document.getElementById('pur-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('pur-search-clear');
    if (clearBtn) clearBtn.classList.add('hidden');
    this.applyFilters();
  },

  onMaterialChange(val) {
    this.selectedMaterialId = val;
    this.applyFilters();
  },

  onSupplierChange(val) {
    this.selectedSupplier = val;
    this.applyFilters();
  },

  setPeriod(type) {
    this.periodType = type;
    ['day', 'month', 'year', 'custom', 'all'].forEach(t => {
      const btn = document.getElementById(`pur-tab-${t}`);
      if (!btn) return;
      if (t === type) {
        btn.className = 'px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer bg-white text-slate-900 shadow-2xs';
      } else {
        btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer text-slate-500 hover:text-slate-900';
      }
    });

    const pickerWrap = document.getElementById('pur-date-picker-wrap');
    if (pickerWrap) {
      pickerWrap.innerHTML = this.renderDatePickerHtml();
      if (window.lucide) lucide.createIcons({ root: pickerWrap });
    }
    this.applyFilters();
  },

  onDateChange(val) {
    if (!val) return;
    if (this.periodType === 'year') {
      this.selectedYear = Number(val);
    } else if (this.periodType === 'month') {
      this.selectedDate = `${val}-01`;
    } else {
      this.selectedDate = val;
    }
    this.applyFilters();
  },

  onCustomDateChange(type, val) {
    if (!val) return;
    if (type === 'start') this.startDate = val;
    if (type === 'end') this.endDate = val;
    this.applyFilters();
  },

  isFilteredFromCurrent() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.periodType === 'custom') return true;
    if (this.periodType !== 'day') return true;
    if (this.selectedDate && this.selectedDate !== today) return true;
    if (this.selectedMaterialId || this.selectedSupplier || this.searchQuery) return true;
    return false;
  },

  resetToCurrent() {
    const today = new Date().toISOString().slice(0, 10);
    this.periodType = 'day';
    this.selectedDate = today;
    this.startDate = today;
    this.endDate = today;
    this.selectedMaterialId = '';
    this.selectedSupplier = '';
    this.searchQuery = '';

    const searchInput = document.getElementById('pur-search');
    if (searchInput) searchInput.value = '';
    const matSelect = document.getElementById('pur-material-select');
    if (matSelect) matSelect.value = '';
    const supSelect = document.getElementById('pur-supplier-select');
    if (supSelect) supSelect.value = '';

    this.setPeriod('day');
  },

  updateResetButton() {
    const resetWrap = document.getElementById('pur-reset-filter-wrap');
    if (!resetWrap) return;
    if (this.isFilteredFromCurrent()) {
      resetWrap.innerHTML = `
        <button type="button" onclick="Purchases.resetToCurrent()" 
                class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                title="Go back to current (Today)">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
        </button>
      `;
      if (window.lucide) lucide.createIcons({ root: resetWrap });
    } else {
      resetWrap.innerHTML = '';
    }
  },

  // ==========================================
  // MULTI-ITEM PURCHASE MODAL & VENDOR KHATA
  // ==========================================

  async openPurchaseModal(purchaseId = null, prefill = {}) {
    if (purchaseId) {
      const allowed = await app.checkActionPassword('Edit Purchase');
      if (!allowed) return;
    }

    const isEdit = Boolean(purchaseId);
    let p = null;
    if (isEdit) {
      try {
        p = await window.api.getRawMaterialPurchase(purchaseId);
      } catch (e) {
        p = (this.purchases || []).find(x => x.id === Number(purchaseId));
      }
    }

    // Refresh suppliers and materials list to ensure up-to-date balance and stock
    try {
      this.suppliersList = await window.api.getSuppliers() || [];
      this.materials = await window.api.getRawMaterials() || [];
    } catch (e) {}

    const materials = this.materials || [];
    const suppliers = this.suppliersList || [];

    // Initialize items array for modal
    if (isEdit && p && Array.isArray(p.items) && p.items.length > 0) {
      this._modalItems = p.items.map(it => ({
        material_id: it.material_id,
        qty: it.qty,
        unit_cost: it.unit_cost,
        line_total: (Number(it.qty) || 0) * (Number(it.unit_cost) || 0)
      }));
    } else if (isEdit && p && p.material_id) {
      this._modalItems = [{
        material_id: p.material_id,
        qty: p.qty,
        unit_cost: p.unit_cost,
        line_total: (Number(p.qty) || 0) * (Number(p.unit_cost) || 0)
      }];
    } else if (prefill && prefill.material_id) {
      const m = materials.find(x => x.id === Number(prefill.material_id));
      this._modalItems = [{
        material_id: m ? m.id : (materials[0]?.id || ''),
        qty: 1,
        unit_cost: m ? (m.cost_price || 0) : (materials[0]?.cost_price || 0),
        line_total: m ? (m.cost_price || 0) : (materials[0]?.cost_price || 0)
      }];
    } else {
      const firstMat = materials[0];
      this._modalItems = [{
        material_id: firstMat ? firstMat.id : '',
        qty: '',
        unit_cost: firstMat ? (firstMat.cost_price || 0) : '',
        line_total: 0
      }];
    }

    const selectedSupplierId = prefill.supplier_id || (p ? p.supplier_id : '');
    const invoiceNo = isEdit ? (p.invoice_no || `PUR-${p.id}`) : (await window.api.getNextPurchaseInvoiceNo().catch(() => 'PUR-Auto'));

    let modalEl = document.getElementById('purchase-modal-container');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'purchase-modal-container';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4 cursor-pointer" onclick="if(event.target === this) Purchases.closeModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 cursor-default" onclick="event.stopPropagation()">
          
          <!-- Header -->
          <div class="p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex justify-between items-center shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner">
                <i data-lucide="${isEdit ? 'edit-3' : 'shopping-bag'}" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-black text-lg tracking-tight">${isEdit ? 'Edit Raw Material Purchase' : 'Record Raw Material Purchase'}</h3>
                <p class="text-xs text-emerald-200 font-medium">Multi-item stock-in with paid &amp; supplier khata balance tracking.</p>
              </div>
            </div>
            <button type="button" onclick="Purchases.closeModal()" class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form onsubmit="Purchases.handlePurchaseSubmit(event, ${purchaseId || 'null'})" class="p-6 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
            
            <!-- Meta Bar: Invoice #, Date, Payment Method -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Invoice / PO #</label>
                <div class="font-mono font-black text-xs text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-2xs">
                  <i data-lucide="receipt" class="w-3.5 h-3.5 text-emerald-600"></i>
                  <span id="pmo-invoice-display">${invoiceNo}</span>
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Purchase Date *</label>
                <input type="date" id="pmo-date" required value="${p ? (p.date || '').slice(0, 10) : new Date().toISOString().split('T')[0]}"
                       class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 font-mono shadow-2xs">
              </div>

              <div>
                <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Method</label>
                <select id="pmo-payment-method" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 shadow-2xs">
                  <option value="Cash" ${p && p.payment_method === 'Cash' ? 'selected' : ''}>💵 Cash</option>
                  <option value="Online" ${p && (p.payment_method === 'Online' || p.payment_method === 'Bank') ? 'selected' : ''}>💳 Online</option>
                </select>
              </div>
            </div>

            <!-- Supplier Selection & Outstanding Balance -->
            <div class="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl">
              <div class="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label class="text-[11px] font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                  <i data-lucide="users" class="w-3.5 h-3.5 text-blue-600"></i> Select Supplier / Vendor *
                </label>
              </div>

              <div class="flex items-center gap-2">
                <select id="pmo-supplier-id" onchange="Purchases.onModalSupplierChange(this.value)" required
                        class="flex-1 px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
                  <option value="" ${!selectedSupplierId ? 'selected' : ''} disabled>-- Select Supplier (Required) --</option>
                  ${suppliers.map(s => {
                    const bal = Number(s.amount) || 0;
                    const balText = bal > 0 ? `• Balance Due: Rs. ${Math.round(bal).toLocaleString()}` : `• All Clear`;
                    return `
                      <option value="${s.id}" ${String(selectedSupplierId) === String(s.id) ? 'selected' : ''} data-name="${s.name}" data-balance="${bal}">
                        ${s.name} ${s.phone ? `(${s.phone})` : ''} ${s.city ? `• ${s.city}` : ''} ${balText}
                      </option>
                    `;
                  }).join('')}
                </select>
              </div>

              <!-- Supplier Current Balance Banner -->
              <div id="pmo-supplier-badge" class="mt-2 text-xs flex items-center justify-between font-bold text-slate-700 bg-white/80 px-3 py-1.5 rounded-lg border border-blue-100">
                <span id="pmo-supplier-name-info">${selectedSupplierId ? 'Supplier Selected' : 'No Supplier Selected'}</span>
                <span id="pmo-supplier-balance-info" class="text-slate-500 font-mono font-bold">${selectedSupplierId ? 'Calculating...' : 'Please select supplier above'}</span>
              </div>
            </div>

            <!-- Items Purchased Table -->
            <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div class="p-3 bg-slate-100/80 border-b border-slate-200 flex justify-between items-center">
                <span class="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <i data-lucide="boxes" class="w-4 h-4 text-emerald-600"></i> Purchased Raw Materials
                </span>
                <button type="button" onclick="Purchases.addModalItemRow()"
                        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> + Add Another Material
                </button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th class="py-2 px-3 border-r border-slate-200 min-w-[220px]">Raw Material *</th>
                      <th class="py-2 px-2 border-r border-slate-200 text-center w-24">Current Stock</th>
                      <th class="py-2 px-3 border-r border-slate-200 text-right w-28">Quantity *</th>
                      <th class="py-2 px-3 border-r border-slate-200 text-right w-28">Rate / Unit (Rs.) *</th>
                      <th class="py-2 px-3 border-r border-slate-200 text-right w-32">Total (Rs.)</th>
                      <th class="py-2 px-2 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody id="pmo-items-tbody" class="divide-y divide-slate-100 font-semibold">
                    <!-- Populated by renderModalItemRows() -->
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Financial Summary & Balance Tracking -->
            <div class="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl border-2 border-emerald-200/80 space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                
                <!-- Grand Total -->
                <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span class="text-[10px] font-black uppercase text-slate-400 block">Grand Total Bill</span>
                  <span id="pmo-total-display" class="text-xl font-black text-slate-900 font-mono block mt-0.5">Rs. 0</span>
                  <span class="text-[10px] text-slate-400 font-bold">Sum of all purchased items</span>
                </div>

                <!-- Amount Paid -->
                <div class="bg-white p-3 rounded-xl border border-emerald-300 shadow-2xs">
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-[10px] font-black uppercase text-emerald-800">Amount Paid Now (Rs.) *</span>
                  </div>
                  <input type="number" step="any" min="0" id="pmo-paid" placeholder="0"
                         value="${p && p.paid_amount != null ? p.paid_amount : ''}"
                         oninput="Purchases.calcModalSummary()"
                         class="w-full px-2.5 py-1.5 text-base font-black text-emerald-800 bg-emerald-50/30 border border-emerald-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 font-mono tabular-nums">
                  
                </div>

                <!-- Pending Balance to Supplier Khata -->
                <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs" id="pmo-pending-box">
                  <span class="text-[10px] font-black uppercase text-slate-400 block">Pending to Khata</span>
                  <span id="pmo-pending-display" class="text-xl font-black text-rose-600 font-mono block mt-0.5">Rs. 0</span>
                  <span id="pmo-pending-note" class="text-[10px] text-slate-500 font-bold block mt-0.5">All clear / no pending balance</span>
                </div>

              </div>

              <!-- Real-time Khata Impact Notice -->
              <div id="pmo-khata-notice" class="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                <i data-lucide="info" class="w-4 h-4 text-emerald-600 shrink-0"></i>
                <span id="pmo-khata-notice-text">Fully paid order. No debt will be added to the supplier's balance.</span>
              </div>
            </div>

            <!-- Notes & Remarks -->
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes / Bill Reference</label>
              <input type="text" id="pmo-notes" placeholder="e.g. Bilty #, Truck registration, Quality check remarks..."
                     value="${p ? (p.notes || '') : ''}"
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
            </div>

            <!-- Footer Buttons -->
            <div class="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="Purchases.closeModal()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all">
                Cancel
              </button>
              <button type="submit" id="pmo-submit-btn" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2 active:scale-95">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                <span>${isEdit ? 'Save Changes' : 'Confirm Purchase & Stock-In'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.renderModalItemRows();
    this.onModalSupplierChange(selectedSupplierId);
    this.calcModalSummary();

    if (window.lucide) lucide.createIcons({ root: modalEl });

    if (this._escListener) {
      document.removeEventListener('keydown', this._escListener);
    }
    this._escListener = (e) => {
      if (e.key === 'Escape') {
        Purchases.closeModal();
      }
    };
    document.addEventListener('keydown', this._escListener);
  },

  renderModalItemRows() {
    const tbody = document.getElementById('pmo-items-tbody');
    if (!tbody) return;

    const materials = this.materials || [];

    tbody.innerHTML = this._modalItems.map((item, idx) => {
      const selectedMat = materials.find(m => m.id === Number(item.material_id));
      const lineTotal = (Number(item.qty) || 0) * (Number(item.unit_cost) || 0);

      return `
        <tr class="hover:bg-slate-50/70 transition-colors">
          <td class="py-2 px-3 border-r border-slate-200">
            <select onchange="Purchases.onModalItemSelect(${idx}, this.value)"
                    class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
              <option value="">-- Select Material --</option>
              ${materials.map(m => `
                <option value="${m.id}" ${String(item.material_id) === String(m.id) ? 'selected' : ''}>
                  ${m.name} (${m.unit})
                </option>
              `).join('')}
            </select>
          </td>

          <td class="py-2 px-2 text-center border-r border-slate-200">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
              ${selectedMat ? `${selectedMat.current_stock} ${selectedMat.unit}` : '—'}
            </span>
          </td>

          <td class="py-2 px-3 border-r border-slate-200">
            <input type="number" step="any" min="0.01" value="${item.qty !== '' ? item.qty : ''}" placeholder="0"
                   oninput="Purchases.onModalItemChange(${idx}, 'qty', this.value)"
                   class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 text-right outline-none focus:bg-white focus:border-emerald-500 font-mono tabular-nums">
          </td>

          <td class="py-2 px-3 border-r border-slate-200">
            <input type="number" step="any" min="0" value="${item.unit_cost !== '' ? item.unit_cost : ''}" placeholder="0"
                   oninput="Purchases.onModalItemChange(${idx}, 'unit_cost', this.value)"
                   class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 text-right outline-none focus:bg-white focus:border-emerald-500 font-mono tabular-nums">
          </td>

          <td class="py-2 px-3 text-right font-mono font-black text-emerald-800 text-xs border-r border-slate-200 tabular-nums">
            Rs. ${Math.round(lineTotal).toLocaleString()}
          </td>

          <td class="py-2 px-2 text-center">
            ${this._modalItems.length > 1 ? `
              <button type="button" onclick="Purchases.removeModalItemRow(${idx})" class="w-6 h-6 rounded-md hover:bg-rose-50 text-rose-500 hover:text-rose-700 flex items-center justify-center cursor-pointer mx-auto transition-all">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons({ root: tbody });
  },

  addModalItemRow() {
    const materials = this.materials || [];
    const firstMat = materials[0];
    this._modalItems.push({
      material_id: firstMat ? firstMat.id : '',
      qty: 1,
      unit_cost: firstMat ? (firstMat.cost_price || 0) : 0,
      line_total: firstMat ? (firstMat.cost_price || 0) : 0
    });
    this.renderModalItemRows();
    this.calcModalSummary();
  },

  removeModalItemRow(idx) {
    if (this._modalItems.length <= 1) return;
    this._modalItems.splice(idx, 1);
    this.renderModalItemRows();
    this.calcModalSummary();
  },

  onModalItemSelect(idx, matId) {
    if (!this._modalItems[idx]) return;
    this._modalItems[idx].material_id = matId ? Number(matId) : '';
    const mat = (this.materials || []).find(m => m.id === Number(matId));
    if (mat) {
      this._modalItems[idx].unit_cost = mat.cost_price || 0;
      if (!this._modalItems[idx].qty) this._modalItems[idx].qty = 1;
    }
    this.renderModalItemRows();
    this.calcModalSummary();
  },

  onModalItemChange(idx, field, val) {
    if (!this._modalItems[idx]) return;
    this._modalItems[idx][field] = val !== '' ? Number(val) : '';
    this.calcModalSummary();
  },

  onModalSupplierChange(supplierId) {
    const sId = supplierId ? Number(supplierId) : null;
    const s = (this.suppliersList || []).find(x => x.id === sId);
    
    const nameInfo = document.getElementById('pmo-supplier-name-info');
    const balanceInfo = document.getElementById('pmo-supplier-balance-info');

    if (s) {
      const bal = Number(s.amount) || 0;
      if (nameInfo) nameInfo.textContent = `${s.name} ${s.phone ? `(${s.phone})` : ''} ${s.city ? `• ${s.city}` : ''}`;
      if (balanceInfo) {
        balanceInfo.textContent = `Current Payable Debt: Rs. ${Math.round(bal).toLocaleString()}`;
        balanceInfo.className = bal > 0 ? 'text-rose-600 font-mono font-black' : 'text-emerald-700 font-mono font-black';
      }
    } else {
      if (nameInfo) nameInfo.textContent = 'No Supplier Selected';
      if (balanceInfo) {
        balanceInfo.textContent = 'Please select supplier above';
        balanceInfo.className = 'text-slate-500 font-mono font-bold';
      }
    }

    this.calcModalSummary();
  },

  setPaymentShortcut(type) {
    const grandTotal = this._modalItems.reduce((sum, it) => sum + ((Number(it.qty) || 0) * (Number(it.unit_cost) || 0)), 0);
    const paidInput = document.getElementById('pmo-paid');
    if (!paidInput) return;

    if (type === 'full') {
      paidInput.value = Math.round(grandTotal);
    } else if (type === 'half') {
      paidInput.value = Math.round(grandTotal / 2);
    } else if (type === 'credit') {
      paidInput.value = 0;
      const methodSelect = document.getElementById('pmo-payment-method');
      if (methodSelect) methodSelect.value = 'Credit';
    }

    this.calcModalSummary();
  },

  calcModalSummary() {
    let grandTotal = 0;
    this._modalItems.forEach(it => {
      const line = (Number(it.qty) || 0) * (Number(it.unit_cost) || 0);
      grandTotal += line;
    });

    const paidInput = document.getElementById('pmo-paid');
    let paidAmount = paidInput && paidInput.value !== '' ? Number(paidInput.value) : grandTotal;
    if (paidAmount < 0) paidAmount = 0;

    const remaining = Math.max(0, grandTotal - paidAmount);

    const totalDisplay = document.getElementById('pmo-total-display');
    const pendingDisplay = document.getElementById('pmo-pending-display');
    const pendingNote = document.getElementById('pmo-pending-note');
    const khataNoticeText = document.getElementById('pmo-khata-notice-text');

    if (totalDisplay) totalDisplay.textContent = `Rs. ${Math.round(grandTotal).toLocaleString()}`;
    if (pendingDisplay) pendingDisplay.textContent = `Rs. ${Math.round(remaining).toLocaleString()}`;

    const sId = document.getElementById('pmo-supplier-id')?.value;
    const supplier = (this.suppliersList || []).find(x => x.id === Number(sId));
    const curBal = supplier ? (Number(supplier.amount) || 0) : 0;
    const newBal = curBal + remaining;

    if (remaining > 0) {
      if (supplier) {
        if (pendingNote) pendingNote.textContent = `Rs. ${Math.round(remaining).toLocaleString()} will be added to ${supplier.name}'s balance`;
        if (khataNoticeText) khataNoticeText.innerHTML = `⚠️ <b>Khata Credit:</b> Rs. ${Math.round(remaining).toLocaleString()} will be added to <b>${supplier.name}</b>'s payable balance (New Balance: <b>Rs. ${Math.round(newBal).toLocaleString()}</b>).`;
      } else {
        if (pendingNote) pendingNote.textContent = 'Pending balance (select a supplier to track khata)';
        if (khataNoticeText) khataNoticeText.innerHTML = `⚠️ <b>Pending Balance:</b> Please select a registered supplier so this Rs. ${Math.round(remaining).toLocaleString()} is recorded in their Khata account.`;
      }
    } else {
      if (pendingNote) pendingNote.textContent = 'Bill fully settled (Rs. 0 pending)';
      if (khataNoticeText) khataNoticeText.textContent = 'Fully paid order. No debt will be added to the supplier balance.';
    }
  },

  async quickAddNewSupplier() {
    const name = await new Promise(resolve => {
      app.showPrompt({
        title: 'Add New Supplier',
        message: 'Enter the business or supplier name to register them:',
        placeholder: 'e.g. Fauji Foods, National Dairy, Agro Milk...',
        onConfirm: (val) => resolve(val ? val.trim() : null),
        onCancel: () => resolve(null)
      });
    });

    if (!name) return;

    const res = await window.api.saveSupplier({ name, amount: 0 });
    if (res && res.success) {
      app.showToast(`Supplier "${name}" registered!`, 'success');
      this.suppliersList = await window.api.getSuppliers() || [];
      
      const supSelect = document.getElementById('pmo-supplier-id');
      if (supSelect) {
        supSelect.innerHTML = `
          <option value="">-- Direct Cash / Walk-in Supplier --</option>
          ${this.suppliersList.map(s => `
            <option value="${s.id}" ${s.id === res.id ? 'selected' : ''}>
              ${s.name} ${s.phone ? `(${s.phone})` : ''} • Balance Due: Rs. ${Number(s.amount).toLocaleString()}
            </option>
          `).join('')}
        `;
        this.onModalSupplierChange(res.id);
      }
    }
  },

  async handlePurchaseSubmit(e, purchaseId = null) {
    e.preventDefault();

    // Validate items
    const validItems = [];
    for (let i = 0; i < this._modalItems.length; i++) {
      const it = this._modalItems[i];
      const matId = Number(it.material_id);
      const qty = Number(it.qty);
      const cost = Number(it.unit_cost);

      if (!matId) {
        return app.showAlert({ title: 'Select Material', message: `Please select a raw material for row #${i + 1}.` });
      }
      if (qty <= 0) {
        return app.showAlert({ title: 'Invalid Quantity', message: `Please enter a valid quantity greater than 0 for row #${i + 1}.` });
      }

      validItems.push({
        material_id: matId,
        qty,
        unit_cost: cost,
        total_cost: qty * cost
      });
    }

    if (validItems.length === 0) {
      return app.showAlert({ title: 'No Materials', message: 'Please add at least one material item to this purchase.' });
    }

    const supplierId = document.getElementById('pmo-supplier-id').value;
    if (!supplierId) {
      return app.showAlert({
        title: 'Supplier Required',
        message: 'Please select a supplier from the list to record this raw material purchase.'
      });
    }
    const supplierObj = (this.suppliersList || []).find(s => s.id === Number(supplierId));
    const supplierName = supplierObj ? supplierObj.name : '';

    const date = document.getElementById('pmo-date').value;
    const paymentMethod = document.getElementById('pmo-payment-method').value;
    const notes = document.getElementById('pmo-notes').value.trim();

    const grandTotal = validItems.reduce((sum, it) => sum + it.total_cost, 0);
    const paidInput = document.getElementById('pmo-paid');
    let paidAmount = paidInput && paidInput.value !== '' ? Number(paidInput.value) : grandTotal;
    if (paidAmount < 0) paidAmount = 0;
    if (paidAmount > grandTotal) paidAmount = grandTotal;

    const remainingBalance = Math.max(0, grandTotal - paidAmount);

    if (remainingBalance > 0 && !supplierId) {
      return app.showAlert({
        title: 'Supplier Required for Credit',
        message: 'This purchase has a pending balance of Rs. ' + Math.round(remainingBalance).toLocaleString() + '. Please select a registered supplier so this amount can be tracked in their Khata account.'
      });
    }

    const payload = {
      supplier_id: supplierId ? Number(supplierId) : null,
      supplier_name: supplierName,
      date,
      payment_method: paymentMethod,
      paid_amount: paidAmount,
      notes,
      items: validItems
    };

    let res;
    if (purchaseId) {
      res = await window.api.updateRawMaterialPurchase(purchaseId, payload);
    } else {
      res = await window.api.addRawMaterialPurchase(payload);
    }

    if (res && res.success) {
      const newPurchaseId = purchaseId || res.id;
      this.closeModal();
      
      const successMsg = remainingBalance > 0
        ? `Purchase recorded! Rs. ${Math.round(paidAmount).toLocaleString()} paid, Rs. ${Math.round(remainingBalance).toLocaleString()} added to ${supplierName}'s Khata.`
        : `Stock-In purchase recorded successfully!`;
      app.showToast(successMsg, 'success');

      await this.loadData();
      if (window.Suppliers && typeof Suppliers.loadData === 'function') {
        Suppliers.loadData();
      }
      if (window.RawMaterials && RawMaterials.container) {
        RawMaterials.loadData();
      }

      // Automatically show A5 receipt preview
      if (newPurchaseId) {
        setTimeout(() => {
          this.viewReceipt(newPurchaseId);
        }, 200);
      }
    } else {
      app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to save purchase.' });
    }
  },

  closeModal() {
    const modalEl = document.getElementById('purchase-modal-container');
    if (modalEl) modalEl.remove();
    if (this._escListener) {
      document.removeEventListener('keydown', this._escListener);
      this._escListener = null;
    }
  },

  async deletePurchase(id) {
    const allowed = await app.checkActionPassword('Delete Purchase');
    if (!allowed) return;

    const p = (this.purchases || []).find(x => x.id === Number(id));
    const title = p ? `Delete Purchase #${p.invoice_no || p.id}?` : 'Delete Purchase?';
    const message = `Are you sure you want to delete this purchase record?<br><br>
      <b>Invoice:</b> #${p ? (p.invoice_no || p.id) : ''}<br>
      <b>Total Bill:</b> Rs. ${p ? Number(p.total_cost).toLocaleString() : '0'}<br>
      <b>Supplier:</b> ${p ? (p.supplier_official_name || p.supplier_name || 'Walk-in') : ''}<br><br>
      <span class="text-rose-600 font-bold">Inventory stock will be deducted back, and any Khata debt will be reversed from the supplier account!</span>`;

    const ok = await new Promise(resolve => {
      app.showConfirm({
        title,
        message,
        confirmText: 'Yes, Delete & Revert Stock',
        confirmColor: 'red',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (ok) {
      const res = await window.api.deleteRawMaterialPurchase(id);
      if (res && res.success) {
        app.showToast('Purchase deleted, stock reverted, and supplier khata adjusted', 'success');
        await this.loadData();
        if (window.Suppliers && typeof Suppliers.loadData === 'function') {
          Suppliers.loadData();
        }
        if (window.RawMaterials && RawMaterials.container) {
          RawMaterials.loadData();
        }
      } else {
        app.showAlert({ title: 'Cannot Delete', message: res.error || 'Failed to delete purchase.' });
      }
    }
  },

  async viewReceipt(id) {
    let p = null;
    try {
      p = await window.api.getRawMaterialPurchase(id);
    } catch (e) {
      p = (this.purchases || []).find(x => x.id === Number(id));
    }
    if (!p) return;

    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const phone = settings.company_phone || '';
    const address = settings.company_address || '';

    const items = p.items && p.items.length > 0 ? p.items : [{
      material_name: p.material_name,
      unit: p.unit,
      qty: p.qty,
      unit_cost: p.unit_cost,
      total_cost: p.total_cost
    }];

    const totalBill = Number(p.total_cost) || 0;
    const paidAmt = p.paid_amount != null ? Number(p.paid_amount) : totalBill;
    const remainingDue = Number(p.remaining_balance) || 0;
    const supplierCurrentBal = p.supplier_current_balance != null ? Number(p.supplier_current_balance) : null;

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; background: #fff; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          ${address ? `<p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${address}</p>` : ''}
          ${phone ? `<p style="font-size: 9px; color: #000; margin: 1px 0 0 0; font-weight: 500;">Tel: ${phone}</p>` : ''}
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          RAW MATERIAL INWARD / PURCHASE VOUCHER
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; padding: 5px 8px; background: #fff; border: 1px solid #000; color: #000;">
          <div style="line-height: 1.45;">
            <div><strong>Purchase Order / Inv #:</strong> #${p.invoice_no || `PUR-${p.id}`}</div>
            <div><strong>Supplier:</strong> ${p.supplier_official_name || p.supplier_name || 'Walk-in / Cash'}</div>
            ${p.supplier_phone ? `<div><strong>Contact:</strong> ${p.supplier_phone}</div>` : ''}
          </div>
          <div style="text-align: right; line-height: 1.45;">
            <div><strong>Date &amp; Time:</strong> ${app.formatDateTime(p.date, p.created_at)}</div>
            <div><strong>Payment Mode:</strong> ${p.payment_method || 'Cash'}</div>
            <div><strong>Status:</strong> ${remainingDue > 0 ? 'Khata Credit Due' : 'Fully Paid'}</div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr style="background: #fff; border-bottom: 1.5px solid #000;">
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 25px; font-weight: 900; font-size: 9px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9px; text-transform: uppercase; color: #000; background: #fff;">Raw Material Description</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 45px; font-weight: 900; font-size: 9px; text-transform: uppercase; color: #000; background: #fff;">Unit</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; width: 65px; font-weight: 900; font-size: 9px; text-transform: uppercase; color: #000; background: #fff;">Quantity</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 75px; font-weight: 900; font-size: 9px; text-transform: uppercase; color: #000; background: #fff;">Cost / Unit</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9px; text-transform: uppercase; color: #000; background: #fff;">Total (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-weight: 800; font-size: 9.5px; color: #000;">${it.material_name}</td>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; text-transform: uppercase; font-size: 9px; color: #000;">${it.unit || ''}</td>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${it.qty}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Number(it.unit_cost).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round(it.total_cost).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #fff; font-weight: 900; border-top: 1.5px solid #000; color: #000;">
              <td colspan="5" style="border: 1px solid #000; padding: 4px 6px; text-align: right; text-transform: uppercase; color: #000;">Grand Total Purchase Bill:</td>
              <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 10px; color: #000;">Rs. ${Math.round(totalBill).toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="5" style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; color: #000;">Amount Paid (${p.payment_method || 'Cash'}):</td>
              <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 10px; color: #000;">Rs. ${Math.round(paidAmt).toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="5" style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; color: #000;">Remaining Balance Due (This Invoice):</td>
              <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; font-family: -apple-system, monospace; font-size: 10px; color: #000;">Rs. ${Math.round(remainingDue).toLocaleString()}</td>
            </tr>
            ${supplierCurrentBal !== null ? `
              <tr style="border-top: 1.5px solid #000;">
                <td colspan="5" style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; text-transform: uppercase; color: #000;">Supplier Total Outstanding Balance:</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 900; font-family: -apple-system, monospace; font-size: 10px; color: #000;">Rs. ${Math.round(supplierCurrentBal).toLocaleString()}</td>
              </tr>
            ` : ''}
          </tfoot>
        </table>

        ${p.notes ? `
          <div style="margin-top: 6px; font-size: 9.5px; color: #000; padding: 5px 8px; background: #fff; border: 1px solid #000;">
            <b>Notes / Remarks:</b> ${p.notes}
          </div>
        ` : ''}

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 9px;">
          <div style="border-top: 1.5px solid #000; width: 35%; text-align: center; padding-top: 4px; font-weight: 800; text-transform: uppercase; color: #000;">
            Store Keeper Signature
          </div>
          <div style="border-top: 1.5px solid #000; width: 35%; text-align: center; padding-top: 4px; font-weight: 800; text-transform: uppercase; color: #000;">
            Supplier / Receiver Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Raw Material Purchase Inward Voucher (#${p.invoice_no || p.id})`);
  },

  printReport() {
    const list = this.filteredPurchases || [];
    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const date = new Date().toLocaleDateString('en-GB');

    const totalCost = list.reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);
    const totalPaid = list.reduce((sum, p) => sum + (p.paid_amount != null ? Number(p.paid_amount) : Number(p.total_cost) || 0), 0);
    const totalPending = list.reduce((sum, p) => sum + (Number(p.remaining_balance) || 0), 0);

    const periodDesc = this.periodType === 'day' 
      ? `Daily Report (${this.selectedDate})` 
      : (this.periodType === 'month' 
        ? `Monthly Report (${this.selectedDate.slice(0, 7)})` 
        : (this.periodType === 'year' 
          ? `Annual Report (${this.selectedYear})` 
          : (this.periodType === 'custom' 
            ? `Custom Range (${this.startDate} to ${this.endDate})` 
            : 'All Historical Purchases')));

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; background: #fff; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 700;">RAW MATERIAL PURCHASES REPORT</p>
          <p style="font-size: 9px; color: #000; margin: 1px 0 0 0;">Period: ${periodDesc} | Printed: ${date}</p>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr style="background: #fff; border-bottom: 1.5px solid #000;">
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Date</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Invoice #</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Supplier</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Items</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Total Bill</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Paid</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: right; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Pending</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => {
              const itemsCount = p.items && p.items.length > 0 ? p.items.length : 1;
              const summaryName = p.items && p.items.length > 0 ? `${p.items[0].material_name} (${itemsCount} items)` : (p.material_name || 'Raw Material');
              const paid = p.paid_amount != null ? Number(p.paid_amount) : Number(p.total_cost);
              const pending = Number(p.remaining_balance) || 0;
              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 8.5px; color: #000;">${app.formatDateTime(p.date, p.created_at)}</td>
                  <td style="border: 1px solid #000; padding: 3.5px 5px; font-weight: 700; font-family: -apple-system, monospace; font-size: 8.5px; color: #000;">${p.invoice_no || `PUR-${p.id}`}</td>
                  <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 8.5px; color: #000;">${p.supplier_official_name || p.supplier_name || 'Walk-in'}</td>
                  <td style="border: 1px solid #000; padding: 3.5px 5px; font-weight: 700; font-size: 8.5px; color: #000;">${summaryName}</td>
                  <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 8.5px; color: #000;">Rs. ${Math.round(p.total_cost).toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 8.5px; color: #000;">Rs. ${Math.round(paid).toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 8.5px; color: #000;">Rs. ${Math.round(pending).toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #fff; font-weight: 900; border-top: 1.5px solid #000; color: #000;">
              <td colspan="4" style="border: 1px solid #000; padding: 4px; text-align: right; text-transform: uppercase; color: #000;">TOTAL (${list.length} ORDERS):</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right; font-family: -apple-system, monospace; color: #000;">Rs. ${Math.round(totalCost).toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right; font-family: -apple-system, monospace; color: #000;">Rs. ${Math.round(totalPaid).toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right; font-family: -apple-system, monospace; color: #000;">Rs. ${Math.round(totalPending).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 8.5px;">
          <div style="border-top: 1.5px solid #000; width: 40%; text-align: center; padding-top: 4px; font-weight: 800; text-transform: uppercase; color: #000;">
            Store Incharge Signature
          </div>
          <div style="border-top: 1.5px solid #000; width: 40%; text-align: center; padding-top: 4px; font-weight: 800; text-transform: uppercase; color: #000;">
            Factory Manager Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Raw Material Purchases Report (A5)');
  }
};

// Maintain compatibility with legacy references
window.Companies = window.Purchases;
