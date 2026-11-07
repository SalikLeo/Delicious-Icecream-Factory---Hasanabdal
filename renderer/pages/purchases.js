// Raw Material Purchases: Management and ledger of all factory raw material stock purchases
window.Purchases = {
  purchases: [],
  filteredPurchases: [],
  materials: [],
  suppliers: [],
  selectedMaterialId: '',
  selectedSupplier: '',
  periodType: 'day', // 'day' | 'month' | 'year' | 'custom' | 'all'
  selectedDate: '',
  startDate: '',
  endDate: '',
  selectedYear: new Date().getFullYear(),
  searchQuery: '',
  sortField: 'date', // 'date' | 'invoice' | 'material' | 'supplier' | 'qty' | 'unit_cost' | 'total_cost'
  sortOrder: 'desc', // 'asc' | 'desc'
  container: null,

  async render(container) {
    this.container = container;
    const today = new Date().toISOString().slice(0, 10);
    if (!this.selectedDate) this.selectedDate = today;
    if (!this.startDate) this.startDate = today;
    if (!this.endDate) this.endDate = today;

    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="shopping-bag" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Raw Material Purchases</h2>
              <p class="text-xs text-slate-500 font-medium">All factory raw stock purchases, supplier invoices, cost rates, and purchase history.</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="Purchases.printReport()"
                    class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    title="Print Purchases Report">
              <i data-lucide="printer" class="w-4 h-4"></i> Print
            </button>
            <button type="button" onclick="Purchases.openPurchaseModal()"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="plus" class="w-4 h-4"></i> Record Purchase
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Total Purchases</p>
            <h3 class="text-xl font-black text-slate-900 mt-1" id="pur-stat-count">0</h3>
            <p class="text-[11px] font-bold text-slate-400 mt-0.5">Orders recorded</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Total Purchase Cost</p>
            <h3 class="text-xl font-black text-emerald-700 mt-1" id="pur-stat-total">Rs. 0</h3>
            <p class="text-[11px] font-bold text-emerald-600 mt-0.5">Total spend</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Total Quantity</p>
            <h3 class="text-xl font-black text-blue-700 mt-1" id="pur-stat-qty">0 Units</h3>
            <p class="text-[11px] font-bold text-blue-600 mt-0.5">Received into store</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Active Suppliers</p>
            <h3 class="text-xl font-black text-slate-900 mt-1" id="pur-stat-suppliers">0</h3>
            <p class="text-[11px] font-bold text-slate-400 mt-0.5">Suppliers in period</p>
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
              <button type="button" id="pur-search-clear" onclick="Purchases.clearSearch()" title="Clear search"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer ${this.searchQuery ? '' : 'hidden'}">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Sort Dropdown -->
            <div>
              <select id="pur-sort-select" onchange="Purchases.onSortSelect(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none hover:bg-white focus:border-emerald-500 cursor-pointer">
                <option value="date_desc" ${this.sortField==='date'&&this.sortOrder==='desc'?'selected':''}>Date (Newest First)</option>
                <option value="date_asc" ${this.sortField==='date'&&this.sortOrder==='asc'?'selected':''}>Date (Oldest First)</option>
                <option value="total_desc" ${this.sortField==='total_cost'&&this.sortOrder==='desc'?'selected':''}>Total Cost (High-Low)</option>
                <option value="total_asc" ${this.sortField==='total_cost'&&this.sortOrder==='asc'?'selected':''}>Total Cost (Low-High)</option>
                <option value="qty_desc" ${this.sortField==='qty'&&this.sortOrder==='desc'?'selected':''}>Quantity (High-Low)</option>
                <option value="qty_asc" ${this.sortField==='qty'&&this.sortOrder==='asc'?'selected':''}>Quantity (Low-High)</option>
                <option value="material_asc" ${this.sortField==='material'&&this.sortOrder==='asc'?'selected':''}>Material Name (A-Z)</option>
                <option value="supplier_asc" ${this.sortField==='supplier'&&this.sortOrder==='asc'?'selected':''}>Supplier Name (A-Z)</option>
                <option value="invoice_desc" ${this.sortField==='invoice'&&this.sortOrder==='desc'?'selected':''}>Invoice # (Newest)</option>
              </select>
            </div>

            <!-- Raw Material Filter -->
            <div>
              <select id="pur-material-select" onchange="Purchases.onMaterialChange(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none hover:bg-white focus:border-emerald-500 cursor-pointer">
                <option value="">-- All Materials --</option>
              </select>
            </div>

            <!-- Supplier Filter -->
            <div>
              <select id="pur-supplier-select" onchange="Purchases.onSupplierChange(this.value)"
                      class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none hover:bg-white focus:border-emerald-500 cursor-pointer">
                <option value="">-- All Suppliers --</option>
              </select>
            </div>

            <!-- Period Switcher: Daily | Monthly | Annual | Custom Range | All -->
            <div class="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button type="button" onclick="Purchases.setPeriod('day')" id="pur-tab-day"
                      class="px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer ${this.periodType === 'day' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900 font-bold'}">
                Daily
              </button>
              <button type="button" onclick="Purchases.setPeriod('month')" id="pur-tab-month"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${this.periodType === 'month' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900 font-bold'}">
                Monthly
              </button>
              <button type="button" onclick="Purchases.setPeriod('year')" id="pur-tab-year"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${this.periodType === 'year' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900 font-bold'}">
                Annual
              </button>
              <button type="button" onclick="Purchases.setPeriod('custom')" id="pur-tab-custom"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${this.periodType === 'custom' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900 font-bold'}">
                Custom Range
              </button>
              <button type="button" onclick="Purchases.setPeriod('all')" id="pur-tab-all"
                      class="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${this.periodType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900 font-bold'}">
                All
              </button>
            </div>

            <!-- Date Picker for Day/Month/Year/Custom -->
            <div id="pur-date-picker-wrap">
              ${this.renderDatePickerHtml()}
            </div>

            <!-- Red Cross Reset to Current Date/Period -->
            <div id="pur-reset-filter-wrap" class="shrink-0 flex items-center">
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
                  <th onclick="Purchases.toggleSort('material')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Raw Material</span>
                      ${this.getSortIcon('material')}
                    </div>
                  </th>
                  <th onclick="Purchases.toggleSort('supplier')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-between gap-1">
                      <span>Supplier</span>
                      ${this.getSortIcon('supplier')}
                    </div>
                  </th>
                  <th onclick="Purchases.toggleSort('qty')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-end gap-1">
                      <span>Quantity</span>
                      ${this.getSortIcon('qty')}
                    </div>
                  </th>
                  <th onclick="Purchases.toggleSort('unit_cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-end gap-1">
                      <span>Unit Cost</span>
                      ${this.getSortIcon('unit_cost')}
                    </div>
                  </th>
                  <th onclick="Purchases.toggleSort('total_cost')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-200/70 select-none transition-colors">
                    <div class="flex items-center justify-end gap-1">
                      <span>Total Cost</span>
                      ${this.getSortIcon('total_cost')}
                    </div>
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
      const years = [curYear, curYear - 1, curYear + 1];
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
      list = list.filter(p => String(p.material_id) === String(this.selectedMaterialId));
    }

    // Supplier filter
    if (this.selectedSupplier) {
      list = list.filter(p => (p.supplier_name || '').toLowerCase() === this.selectedSupplier.toLowerCase());
    }

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.invoice_no && p.invoice_no.toLowerCase().includes(q)) ||
        (p.material_name && p.material_name.toLowerCase().includes(q)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.unit && p.unit.toLowerCase().includes(q))
      );
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
          va = (a.supplier_name || '').toLowerCase();
          vb = (b.supplier_name || '').toLowerCase();
          break;
        case 'qty':
          va = Number(a.qty) || 0;
          vb = Number(b.qty) || 0;
          break;
        case 'unit_cost':
          va = Number(a.unit_cost) || 0;
          vb = Number(b.unit_cost) || 0;
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
    const totalQty = list.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
    const suppliersSet = new Set(list.map(p => (p.supplier_name || '').trim()).filter(Boolean));

    const countEl = document.getElementById('pur-stat-count');
    const totalEl = document.getElementById('pur-stat-total');
    const qtyEl = document.getElementById('pur-stat-qty');
    const supEl = document.getElementById('pur-stat-suppliers');

    if (countEl) countEl.textContent = `${totalCount}`;
    if (totalEl) totalEl.textContent = `Rs. ${Math.round(totalCost).toLocaleString()}`;
    if (qtyEl) qtyEl.textContent = `${Math.round(totalQty * 10) / 10} Units`;
    if (supEl) supEl.textContent = `${suppliersSet.size}`;
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
                <i data-lucide="plus" class="w-4 h-4"></i> Record First Purchase
              </button>
            </div>
          </td>
        </tr>
      `;
      if (tfoot) tfoot.innerHTML = '';
      if (window.lucide) lucide.createIcons({ root: tbody });
      return;
    }

    let sumQty = 0;
    let sumCost = 0;

    tbody.innerHTML = this.filteredPurchases.map(p => {
      const qty = Number(p.qty) || 0;
      const unitCost = Number(p.unit_cost) || 0;
      const totalCost = Number(p.total_cost) || 0;
      sumQty += qty;
      sumCost += totalCost;

      const categoryBadge = p.material_category 
        ? `<span class="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/80">${p.material_category}</span>`
        : '';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap border-r border-slate-200">${p.date || '—'}</td>
          <td class="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap border-r border-slate-200">${p.invoice_no || `PO-${p.id}`}</td>
          <td class="py-2.5 px-3 border-r border-slate-200">
            <div class="flex items-center gap-2">
              <span class="font-black text-slate-900">${p.material_name}</span>
              ${categoryBadge}
            </div>
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200">
            <span class="font-bold text-slate-700">${p.supplier_name || 'Walk-in / Cash'}</span>
          </td>
          <td class="py-2.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">
            ${qty} <span class="text-[10px] text-slate-500 uppercase font-bold">${p.unit || ''}</span>
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-700 border-r border-slate-200">
            Rs. ${unitCost.toLocaleString()}
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-emerald-800 text-xs border-r border-slate-200">
            Rs. ${Math.round(totalCost).toLocaleString()}
          </td>
          <td class="py-2.5 px-3 text-slate-500 text-[11px] max-w-[200px] truncate border-r border-slate-200" title="${p.notes || ''}">
            ${p.notes || '—'}
          </td>
          <td class="py-2.5 px-3 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="Purchases.viewReceipt(${p.id})" title="View / Print Receipt"
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
          <td class="py-2.5 px-3 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">
            ${Math.round(sumQty * 10) / 10} Units
          </td>
          <td class="py-2.5 px-3 border-r border-slate-200"></td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-emerald-900 text-xs border-r border-slate-200">
            Rs. ${Math.round(sumCost).toLocaleString()}
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

  onSortSelect(val) {
    const [field, order] = val.split('_');
    if (field === 'total') this.sortField = 'total_cost';
    else this.sortField = field;
    this.sortOrder = order;
    this.updateSortHeader();
    this.applyFilters();
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

  async openPurchaseModal(purchaseId = null) {
    if (purchaseId) {
      const allowed = await app.checkActionPassword('Edit Purchase');
      if (!allowed) return;
    }

    const isEdit = Boolean(purchaseId);
    let p = null;
    if (isEdit) {
      p = (this.purchases || []).find(x => x.id === Number(purchaseId));
      if (!p) {
        try {
          p = await window.api.getRawMaterialPurchase(purchaseId);
        } catch (e) {}
      }
    }

    const materials = this.materials || [];
    const defaultMat = isEdit ? materials.find(m => m.id === p.material_id) : materials[0];

    let modalEl = document.getElementById('purchase-modal-container');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'purchase-modal-container';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4 cursor-pointer" onclick="if(event.target === this) Purchases.closeModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 cursor-default" onclick="event.stopPropagation()">
          <div class="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <i data-lucide="${isEdit ? 'edit-3' : 'shopping-bag'}" class="w-4 h-4"></i>
              </div>
              <h3 class="font-black text-base">${isEdit ? 'Edit Raw Material Purchase' : 'Record Raw Material Purchase'}</h3>
            </div>
            <button type="button" onclick="Purchases.closeModal()" class="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center cursor-pointer">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form onsubmit="Purchases.handlePurchaseSubmit(event, ${purchaseId || 'null'})" class="p-6 space-y-4">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Select Raw Material *</label>
              <select id="pmo-material-id" required onchange="Purchases.onModalMaterialChange(this.value)"
                      class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
                ${materials.map(m => `
                  <option value="${m.id}" ${(p && p.material_id === m.id) || (!p && defaultMat && defaultMat.id === m.id) ? 'selected' : ''}>
                    ${m.name} (${m.unit}) — Current Stock: ${m.current_stock}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Quantity Purchased *</label>
                <input type="number" step="any" min="0.01" id="pmo-qty" required placeholder="0" 
                       value="${p ? p.qty : ''}" oninput="Purchases.calcModalTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Per Unit (Rs.) *</label>
                <input type="number" step="any" min="0" id="pmo-cost" required placeholder="0" 
                       value="${p ? p.unit_cost : (defaultMat ? defaultMat.cost_price : '')}" oninput="Purchases.calcModalTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
            </div>

            <div class="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span class="text-xs font-black text-emerald-900">Total Purchase Cost:</span>
              <span id="pmo-total-display" class="text-lg font-black text-emerald-700 tabular-nums">
                Rs. ${p ? Math.round(p.total_cost).toLocaleString() : '0'}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Supplier Name</label>
                <input type="text" id="pmo-supplier" placeholder="e.g. Dairy Milk Farms..."
                       value="${p ? (p.supplier_name || '') : ''}" list="pmo-suppliers-datalist"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
                <datalist id="pmo-suppliers-datalist">
                  ${this.suppliers.map(s => `<option value="${s}">`).join('')}
                </datalist>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Invoice / Bill #</label>
                <input type="text" id="pmo-invoice" placeholder="e.g. INV-10024"
                       value="${p ? (p.invoice_no || '') : ''}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 font-mono">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Purchase Date</label>
                <input type="date" id="pmo-date" value="${p ? p.date : new Date().toISOString().split('T')[0]}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes / Remarks</label>
                <input type="text" id="pmo-notes" placeholder="Vehicle #, payment terms..."
                       value="${p ? (p.notes || '') : ''}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="Purchases.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">
                ${isEdit ? 'Save Changes' : 'Confirm Stock-In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

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

  onModalMaterialChange(matId) {
    const mat = (this.materials || []).find(m => m.id === Number(matId));
    if (mat) {
      const costEl = document.getElementById('pmo-cost');
      if (costEl && !costEl.value) {
        costEl.value = mat.cost_price || 0;
      }
      this.calcModalTotal();
    }
  },

  calcModalTotal() {
    const qty = Number(document.getElementById('pmo-qty')?.value) || 0;
    const cost = Number(document.getElementById('pmo-cost')?.value) || 0;
    const totalEl = document.getElementById('pmo-total-display');
    if (totalEl) {
      totalEl.textContent = `Rs. ${Math.round(qty * cost).toLocaleString()}`;
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

  async handlePurchaseSubmit(e, purchaseId = null) {
    e.preventDefault();
    const matId = Number(document.getElementById('pmo-material-id').value);
    const qty = Number(document.getElementById('pmo-qty').value);
    const unitCost = Number(document.getElementById('pmo-cost').value);
    const supplier = document.getElementById('pmo-supplier').value.trim();
    const invoiceNo = document.getElementById('pmo-invoice').value.trim();
    const date = document.getElementById('pmo-date').value;
    const notes = document.getElementById('pmo-notes').value.trim();

    if (!matId || qty <= 0) {
      return app.showAlert({ title: 'Invalid Entry', message: 'Please select a material and enter a valid quantity.' });
    }

    const payload = {
      material_id: matId,
      qty,
      unit_cost: unitCost,
      supplier_name: supplier,
      invoice_no: invoiceNo,
      date,
      notes
    };

    let res;
    if (purchaseId) {
      res = await window.api.updateRawMaterialPurchase(purchaseId, payload);
    } else {
      res = await window.api.addRawMaterialPurchase(payload);
    }

    if (res && res.success) {
      this.closeModal();
      app.showToast(purchaseId ? 'Purchase updated successfully' : 'Stock-In recorded successfully', 'success');
      await this.loadData();
      if (window.RawMaterials && RawMaterials.container) {
        RawMaterials.loadData();
      }
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to save purchase.' });
    }
  },

  async deletePurchase(id) {
    const allowed = await app.checkActionPassword('Delete Purchase');
    if (!allowed) return;

    const p = (this.purchases || []).find(x => x.id === Number(id));
    const title = p ? `Delete Purchase #${p.invoice_no || p.id}?` : 'Delete Purchase?';
    const message = `Are you sure you want to delete this purchase record?<br><br>
      <b>Material:</b> ${p ? p.material_name : 'Raw Material'}<br>
      <b>Quantity to Deduct:</b> ${p ? `${p.qty} ${p.unit || ''}` : ''}<br>
      <b>Total Cost:</b> Rs. ${p ? Number(p.total_cost).toLocaleString() : '0'}<br><br>
      <span class="text-rose-600 font-bold">Stock will be deducted back from factory inventory!</span>`;

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
        app.showToast('Purchase deleted and inventory stock reverted', 'success');
        await this.loadData();
        if (window.RawMaterials && RawMaterials.container) {
          RawMaterials.loadData();
        }
      } else {
        app.showAlert({ title: 'Cannot Delete', message: res.error || 'Failed to delete purchase.' });
      }
    }
  },

  async viewReceipt(id) {
    const p = (this.purchases || []).find(x => x.id === Number(id));
    if (!p) return;

    const settings = app.settings || {};
    const company = settings.company_name || 'Ice Cream Factory';
    const phone = settings.company_phone || '';
    const address = settings.company_address || '';

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 12px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
          <h1 style="font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">${company}</h1>
          ${address ? `<p style="font-size: 10px; color: #475569; margin: 2px 0 0 0;">${address}</p>` : ''}
          ${phone ? `<p style="font-size: 10px; color: #475569; margin: 1px 0 0 0;">Tel: ${phone}</p>` : ''}
          <div style="margin-top: 6px; display: inline-block; padding: 2px 10px; background: #0f172a; color: #fff; font-size: 10px; font-weight: 900; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
            RAW MATERIAL INWARD / PURCHASE VOUCHER
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 10px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
          <div>
            <div><b>Purchase Ref:</b> #${p.invoice_no || `PO-${p.id}`}</div>
            <div><b>Supplier:</b> ${p.supplier_name || 'Direct Walk-in / Cash'}</div>
          </div>
          <div style="text-align: right;">
            <div><b>Date:</b> ${p.date || '—'}</div>
            <div><b>Category:</b> ${p.material_category || 'Raw Materials'}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1.5px solid #0f172a;">
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">S#</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Raw Material Description</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">Unit</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">Quantity</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">Cost / Unit</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">1</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; font-weight: 800;">${p.material_name}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${p.unit || ''}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; font-weight: 800;">${p.qty}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">Rs. ${Number(p.unit_cost).toLocaleString()}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; font-weight: 900;">Rs. ${Math.round(p.total_cost).toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 900; border-top: 1.5px solid #0f172a;">
              <td colspan="5" style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; text-transform: uppercase;">Grand Total Purchase Cost:</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-size: 11px;">Rs. ${Math.round(p.total_cost).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        ${p.notes ? `
          <div style="margin-top: 8px; font-size: 9.5px; color: #475569; padding: 6px; background: #fff; border: 1px dashed #cbd5e1; border-radius: 4px;">
            <b>Notes / Remarks:</b> ${p.notes}
          </div>
        ` : ''}

        <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 9px;">
          <div style="border-top: 1px dashed #64748b; width: 35%; text-align: center; padding-top: 4px;">
            Store Keeper Signature
          </div>
          <div style="border-top: 1px dashed #64748b; width: 35%; text-align: center; padding-top: 4px;">
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
    const company = settings.company_name || 'Ice Cream Factory';
    const date = new Date().toLocaleDateString('en-GB');

    const totalQty = list.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
    const totalCost = list.reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);

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
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 8px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">${company}</h1>
          <p style="font-size: 9px; color: #475569; margin: 2px 0 0 0; font-weight: 700;">RAW MATERIAL PURCHASES REPORT</p>
          <p style="font-size: 9px; color: #64748b; margin: 1px 0 0 0;">Period: ${periodDesc} | Printed: ${date}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 6px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Date</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Invoice #</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Material</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Supplier</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Qty</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Unit Cost</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 4px;">${p.date || '—'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; font-weight: 700;">${p.invoice_no || `PO-${p.id}`}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; font-weight: 800;">${p.material_name}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px;">${p.supplier_name || 'Walk-in'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right; font-weight: 800;">${p.qty} ${p.unit || ''}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right;">Rs. ${Number(p.unit_cost).toLocaleString()}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right; font-weight: 900;">Rs. ${Math.round(p.total_cost).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 900; border-top: 1.5px solid #0f172a;">
              <td colspan="4" style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">TOTAL (${list.length} ORDERS):</td>
              <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">${Math.round(totalQty * 10) / 10}</td>
              <td style="border: 1px solid #cbd5e1; padding: 4px;"></td>
              <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Rs. ${Math.round(totalCost).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 8.5px;">
          <div style="border-top: 1px dashed #64748b; width: 40%; text-align: center; padding-top: 4px;">
            Store Incharge Signature
          </div>
          <div style="border-top: 1px dashed #64748b; width: 40%; text-align: center; padding-top: 4px;">
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
