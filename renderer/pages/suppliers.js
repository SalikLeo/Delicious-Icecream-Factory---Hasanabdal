// Suppliers & Vendor Khata Accounts for Factory Raw Materials
window.Suppliers = {
  suppliers: [],
  filteredSuppliers: [],
  selectedSupplierId: null,
  activeLedger: null,
  filterType: 'all', // 'all' | 'due' | 'zero'
  searchQuery: '',
  container: null,

  async render(container) {
    this.container = container;
    
    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-hidden">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 no-print">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="users" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Suppliers &amp; Vendor Khata</h2>
              <p class="text-xs text-slate-500 font-medium">Manage raw material suppliers, vendor payable debt, make debt payments, and print A5 ledger statements.</p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" onclick="Suppliers.printSuppliersBalancesList()"
                    class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95" title="Print Suppliers Balances & Advance List">
              <i data-lucide="printer" class="w-4 h-4 text-slate-600"></i> Print
            </button>
            <button type="button" onclick="Suppliers.openSupplierModal()"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="user-plus" class="w-4 h-4"></i> Add New Supplier
            </button>
          </div>
        </div>

        <!-- KPI Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-500 tracking-wider">Total Suppliers</p>
            <h3 class="text-2xl font-black text-slate-900 mt-1" id="sup-stat-count">0</h3>
            <p class="text-xs font-semibold text-slate-500 mt-1">All suppliers</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-500 tracking-wider">Total Balance</p>
            <h3 class="text-2xl font-black text-rose-600 mt-1" id="sup-stat-due">Rs. 0</h3>
            <p class="text-xs font-semibold text-rose-600 mt-1">Pending to pay</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-500 tracking-wider">To Pay</p>
            <h3 class="text-2xl font-black text-amber-600 mt-1" id="sup-stat-pending">0</h3>
            <p class="text-xs font-semibold text-amber-600 mt-1">Suppliers with balance</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[11px] font-black uppercase text-slate-500 tracking-wider">Zero Balance</p>
            <h3 class="text-2xl font-black text-emerald-700 mt-1" id="sup-stat-clean">0</h3>
            <p class="text-xs font-semibold text-emerald-600 mt-1">Fully cleared</p>
          </div>
        </div>

        <!-- Master-Detail Split Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
          
          <!-- Left 5 Cols: Supplier List -->
          <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-0 overflow-hidden">
            <!-- Search & Filters -->
            <div class="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2 shrink-0">
              <div class="relative w-full">
                <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="sup-search" oninput="Suppliers.onSearch(this.value)"
                       placeholder="Search supplier, contact, city, phone..."
                       class="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-400">
              </div>

              <!-- Filter tabs -->
              <div class="flex bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-black">
                <button type="button" onclick="Suppliers.setFilter('all')" id="sup-filter-all"
                        class="flex-1 py-1 rounded-lg transition-all cursor-pointer bg-white text-slate-900 shadow-2xs text-center">
                  All Suppliers
                </button>
                <button type="button" onclick="Suppliers.setFilter('due')" id="sup-filter-due"
                        class="flex-1 py-1 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-slate-900 text-center">
                  Balance
                </button>
                <button type="button" onclick="Suppliers.setFilter('advance')" id="sup-filter-advance"
                        class="flex-1 py-1 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-slate-900 text-center">
                  Advance
                </button>
                <button type="button" onclick="Suppliers.setFilter('zero')" id="sup-filter-zero"
                        class="flex-1 py-1 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-slate-900 text-center">
                  Zero Balance
                </button>
              </div>
            </div>

            <!-- Scrollable Suppliers List -->
            <div id="suppliers-list-container" class="flex-1 overflow-y-auto custom-scrollbar">
              <!-- Injected by renderSuppliersList() -->
            </div>

            <!-- Sticky Footer for Total (# and amount) -->
            <div id="suppliers-list-footer" class="p-2.5 px-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs">
              <!-- Injected by renderSuppliersList() -->
            </div>
          </div>

          <!-- Right 7 Cols: Supplier Details & Ledger Statement -->
          <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-0 overflow-hidden" id="supplier-detail-panel">
            <!-- Injected by renderSupplierDetail() -->
          </div>

        </div>

      </div>

      <!-- Supplier Add/Edit Modal -->
      <div id="supplier-edit-modal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[1300] p-4 cursor-pointer" onclick="if(event.target===this) Suppliers.closeSupplierModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col cursor-default" onclick="event.stopPropagation()">
          <div class="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex justify-between items-center shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-black shadow-2xs shrink-0">
                <i data-lucide="truck" class="w-4.5 h-4.5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 tracking-tight leading-snug" id="supplier-modal-title">Add New Supplier</h3>
                <p class="text-[11px] font-semibold text-slate-400 leading-none mt-0.5" id="supplier-modal-subtitle">Supplier &amp; vendor profile, contact &amp; khata</p>
              </div>
            </div>
            <button type="button" onclick="Suppliers.closeSupplierModal()" class="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 active:scale-95 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs" title="Close (Esc)">
              <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
            </button>
          </div>

          <form id="supplier-form" onsubmit="Suppliers.saveSupplierForm(event)" class="p-5 space-y-3">
            <input type="hidden" id="sup-sf-id">
            
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Supplier / Business Name *</label>
              <input type="text" id="sup-sf-name" required placeholder="e.g. Fauji Foods, National Dairy..."
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Contact Person</label>
                <input type="text" id="sup-sf-contact" placeholder="e.g. Tariq Mehmood"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Phone Number</label>
                <input type="text" id="sup-sf-phone" placeholder="0300-1234567"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400 font-mono">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">City / Area</label>
                <input type="text" id="sup-sf-city" placeholder="e.g. Rawalpindi, Hasan Abdal"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Opening Payable Balance (Rs.)</label>
                <input type="number" step="any" min="0" id="sup-sf-amount" placeholder="0"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400 tabular-nums">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Address</label>
              <input type="text" id="sup-sf-address" placeholder="e.g. Industrial Area, Plot # 12"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-400">
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Notes / Remarks</label>
              <textarea id="sup-sf-notes" rows="2" placeholder="e.g. Milk & Sweeteners vendor, deliveries every Tuesday"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-400"></textarea>
            </div>

            <div class="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onclick="Suppliers.closeSupplierModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">
                Cancel
              </button>
              <button type="submit" id="sup-sf-submit-btn" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer">
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Pay Supplier Modal -->
      <div id="supplier-payment-modal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[1300] p-4 cursor-pointer" onclick="if(event.target===this) Suppliers.closePaymentModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 flex flex-col cursor-default" onclick="event.stopPropagation()">
          <div class="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex justify-between items-center shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black shadow-2xs shrink-0">
                <i data-lucide="banknote" class="w-4.5 h-4.5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 tracking-tight leading-snug">Pay Supplier / Advance</h3>
                <p class="text-[11px] font-semibold text-slate-400 leading-none mt-0.5">Pay outstanding khata debt or advance for future purchases</p>
              </div>
            </div>
            <button type="button" onclick="Suppliers.closePaymentModal()" class="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 active:scale-95 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs" title="Close (Esc)">
              <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
            </button>
          </div>

          <form id="supplier-payment-form" onsubmit="Suppliers.savePaymentForm(event)" class="p-5 space-y-3">
            <input type="hidden" id="spf-supplier-id">

            <div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center text-xs">
              <div>
                <span class="text-[10px] font-black uppercase text-emerald-800 block">Supplier:</span>
                <span class="font-black text-slate-900 text-xs" id="spf-supplier-name">--</span>
              </div>
              <div class="text-right">
                <span id="spf-current-balance-label" class="text-[10px] font-black uppercase text-emerald-800 block">Balance:</span>
                <span class="font-black text-rose-600 text-sm tabular-nums" id="spf-current-balance">Rs. 0</span>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-[11px] font-black uppercase text-slate-500">Payment Amount (Rs.) *</label>
                <button type="button" onclick="Suppliers.fillFullPayment()" class="text-[10px] font-black text-emerald-700 hover:underline cursor-pointer">
                  Pay Full Balance
                </button>
              </div>
              <input type="number" step="any" min="1" id="spf-amount" required placeholder="Enter payment or advance amount..."
                     class="w-full px-3 py-2 text-base font-black text-slate-900 bg-white border-2 border-emerald-400 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200 tabular-nums">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Payment Method</label>
                <select id="spf-method" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none">
                  <option value="Cash">💵 Cash</option>
                  <option value="Online">💳 Online</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Payment Date &amp; Time</label>
                <input type="datetime-local" id="spf-date" value="${(() => { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); return n.toISOString().slice(0, 16); })()}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Notes / Paid By / Receipt #</label>
              <input type="text" id="spf-notes" placeholder="e.g. Paid by Factory Manager via Cash"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none">
            </div>

            <div class="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onclick="Suppliers.closePaymentModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">
                Cancel
              </button>
              <button type="submit" id="spf-submit-btn" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Record &amp; Print Voucher
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadData();
  },

  async loadData() {
    try {
      this.suppliers = await window.api.getSuppliers() || [];
      // Sort with balance high to low, then alphabetical A-Z
      this.suppliers.sort((a, b) => {
        const balA = Number(a.amount) || 0;
        const balB = Number(b.amount) || 0;
        if (balB !== balA) return balB - balA;
        return (a.name || '').localeCompare(b.name || '');
      });
      if (!this.selectedSupplierId && this.suppliers.length > 0) {
        this.selectedSupplierId = this.suppliers[0].id;
      }
      this.applyFilters();
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    }
  },

  onSearch(val) {
    this.searchQuery = val.toLowerCase().trim();
    this.applyFilters();
  },

  setFilter(filter) {
    this.filterType = filter;
    ['all', 'due', 'advance', 'zero'].forEach(f => {
      const btn = document.getElementById(`sup-filter-${f}`);
      if (!btn) return;
      if (f === filter) {
        btn.className = 'flex-1 py-1 rounded-lg transition-all cursor-pointer bg-white text-slate-900 shadow-2xs text-center font-black';
      } else {
        btn.className = 'flex-1 py-1 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-slate-900 text-center font-semibold';
      }
    });
    this.applyFilters();
  },

  applyFilters() {
    let list = [...this.suppliers];

    // Filter by balance
    if (this.filterType === 'due') {
      list = list.filter(s => (Number(s.amount) || 0) > 0);
    } else if (this.filterType === 'advance') {
      list = list.filter(s => (Number(s.amount) || 0) < 0);
    } else if (this.filterType === 'zero') {
      list = list.filter(s => (Number(s.amount) || 0) === 0);
    }

    // Search query
    if (this.searchQuery) {
      list = list.filter(s => {
        const name = (s.name || '').toLowerCase();
        const contact = (s.contact_person || '').toLowerCase();
        const city = (s.city || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        return name.includes(this.searchQuery) || contact.includes(this.searchQuery) || city.includes(this.searchQuery) || phone.includes(this.searchQuery);
      });
    }

    // Sort with balance high to low, then alphabetical A-Z
    list.sort((a, b) => {
      const balA = Number(a.amount) || 0;
      const balB = Number(b.amount) || 0;
      if (balB !== balA) return balB - balA;
      return (a.name || '').localeCompare(b.name || '');
    });

    this.filteredSuppliers = list;
    this.updateKPIs();
    this.renderSuppliersList();
    this.renderSupplierDetail();
  },

  updateKPIs() {
    let totalDue = 0;
    let pendingSuppliers = 0;
    let cleanSuppliers = 0;

    this.suppliers.forEach(s => {
      const bal = Number(s.amount) || 0;
      if (bal > 0) {
        totalDue += bal;
        pendingSuppliers++;
      } else {
        cleanSuppliers++;
      }
    });

    const cntEl = document.getElementById('sup-stat-count');
    const dueEl = document.getElementById('sup-stat-due');
    const pendEl = document.getElementById('sup-stat-pending');
    const cleanEl = document.getElementById('sup-stat-clean');

    if (cntEl) cntEl.textContent = `${this.suppliers.length} Suppliers`;
    if (dueEl) dueEl.textContent = `Rs. ${Math.round(totalDue).toLocaleString()}`;
    if (pendEl) pendEl.textContent = `${pendingSuppliers} Suppliers`;
    if (cleanEl) cleanEl.textContent = `${cleanSuppliers} Suppliers`;
  },

  renderSuppliersList() {
    const container = document.getElementById('suppliers-list-container');
    const footer = document.getElementById('suppliers-list-footer');
    if (!container) return;

    if (this.filteredSuppliers.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 font-bold text-xs">
          No suppliers found matching your filter.
        </div>
      `;
      if (footer) {
        footer.innerHTML = `
          <div class="flex items-center justify-between w-full text-slate-400 font-bold text-[11px]">
            <span>Total: 0 Suppliers</span>
            <span>Rs. 0</span>
          </div>
        `;
      }
      return;
    }

    let totalAmount = 0;
    container.innerHTML = this.filteredSuppliers.map((s, idx) => {
      const isSelected = s.id === this.selectedSupplierId;
      const bal = Number(s.amount) || 0;
      totalAmount += bal;
      return `
        <div onclick="Suppliers.selectSupplier(${s.id})"
             class="relative py-2.5 px-3 transition-all cursor-pointer flex items-center justify-between gap-3 border-b border-slate-100 ${isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'}">
          ${isSelected ? '<span class="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r shadow-xs"></span>' : ''}
          <div class="min-w-0 flex-1">
            <h4 class="font-black text-xs text-slate-900 truncate">${s.name}</h4>
            <div class="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 leading-tight">
              <span>${s.contact_person || 'No Contact'}</span>
              <span>•</span>
              <span>${s.city || 'Factory Vendor'}</span>
            </div>
            ${s.phone ? `<div class="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">${window.app && app.formatPhone ? app.formatPhone(s.phone) : s.phone}</div>` : ''}
          </div>

          <div class="text-right shrink-0">
            <span class="text-[10px] font-black uppercase ${bal < 0 ? 'text-emerald-700' : 'text-slate-400'} block">${bal < 0 ? 'Advance' : 'Balance'}</span>
            <span class="font-black text-xs tabular-nums ${bal > 0 ? 'text-rose-600 font-mono' : 'text-emerald-700 font-mono'}">
              Rs. ${Math.round(Math.abs(bal)).toLocaleString()}
            </span>
          </div>
        </div>
      `;
    }).join('');

    if (footer) {
      footer.innerHTML = `
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-black uppercase text-slate-400">Total:</span>
          <span class="font-mono font-black text-xs text-slate-800 px-2 py-0.5 rounded-md bg-slate-200/80 border border-slate-300/60">${this.filteredSuppliers.length} Suppliers</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-black uppercase text-slate-400 block leading-tight">Total Payable</span>
          <span class="font-black text-xs font-mono tabular-nums ${totalAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}">
            Rs. ${Math.round(totalAmount).toLocaleString()}
          </span>
        </div>
      `;
    }
  },

  async selectSupplier(id) {
    this.selectedSupplierId = id;
    this.renderSuppliersList();
    await this.renderSupplierDetail();
  },

  async renderSupplierDetail() {
    const panel = document.getElementById('supplier-detail-panel');
    if (!panel) return;

    const supplier = this.suppliers.find(s => s.id === this.selectedSupplierId);
    if (!supplier) {
      panel.innerHTML = `
        <div class="p-12 text-center text-slate-400 font-bold flex flex-col items-center justify-center h-full">
          <i data-lucide="users" class="w-10 h-10 mb-2 opacity-30"></i>
          Select a supplier from the list to view profile and vendor khata ledger.
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Load ledger data
    let ledger = null;
    try {
      ledger = await window.api.getSupplierLedger(supplier.id);
    } catch (e) {
      console.warn('Could not load supplier ledger:', e);
    }
    this.activeLedger = ledger;

    const currentBal = Number(supplier.amount) || 0;
    const entries = ledger ? ledger.entries : [];

    let totalDebit = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    entries.forEach(e => {
      const isPurchase = e.record_type === 'purchase';
      const isOpening = e.record_type === 'opening_balance';
      if (isPurchase) {
        totalDebit += Number(e.total_cost) || 0;
        totalPaid += Number(e.paid_amount) || 0;
        totalRemaining += Number(e.remaining_balance) || 0;
      } else if (isOpening) {
        totalDebit += Number(e.total_cost || e.amount || 0);
        totalRemaining += Number(e.remaining_balance || e.amount || 0);
      } else {
        totalPaid += Number(e.paid_amount) || 0;
      }
    });

    panel.innerHTML = `
      <!-- Top Supplier Profile & Quick Action Bar -->
      <div class="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-black text-base text-slate-900">${supplier.name}</h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${currentBal > 0 ? 'bg-rose-100 text-rose-700' : (currentBal < 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}">
              ${currentBal > 0 ? 'Balance' : (currentBal < 0 ? 'Advance' : 'Settled')}
            </span>
          </div>
          <p class="text-[11px] text-slate-500 font-medium mt-0.5">
            Contact: <strong>${supplier.contact_person || 'N/A'}</strong> • Phone: <strong>${supplier.phone ? (window.app && app.formatPhone ? app.formatPhone(supplier.phone) : supplier.phone) : 'N/A'}</strong> • Area: <strong>${supplier.city || ''} ${supplier.address || ''}</strong>
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button type="button" onclick="Suppliers.openPaymentModal(${supplier.id})"
                  class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Record debt payment or advance payment to supplier">
            <i data-lucide="banknote" class="w-3.5 h-3.5"></i> Pay Supplier
          </button>

          <button type="button" onclick="Suppliers.printSupplierStatement(${supplier.id})"
                  class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="printer" class="w-3.5 h-3.5 text-blue-400"></i> Print Khata
          </button>

          <button type="button" onclick="Suppliers.openSupplierModal(${supplier.id})"
                  class="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Edit Supplier Details">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="Suppliers.deleteSupplier(${supplier.id}, '${supplier.name}')"
                  class="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Delete Supplier">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Outstanding Khata Banner -->
      <div class="p-3 px-4 ${currentBal < 0 ? 'bg-emerald-50/70 border-b border-emerald-100' : 'bg-blue-50/70 border-b border-blue-100'} flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <i data-lucide="wallet" class="w-4 h-4 ${currentBal < 0 ? 'text-emerald-600' : 'text-blue-600'}"></i>
          <span class="text-xs font-black ${currentBal < 0 ? 'text-emerald-950' : 'text-blue-950'}">
            ${currentBal < 0 ? 'Advance:' : 'Balance:'}
          </span>
        </div>
        <div class="font-black text-base ${currentBal > 0 ? 'text-rose-600 font-mono' : 'text-emerald-700 font-mono'} tabular-nums">
          Rs. ${Math.round(Math.abs(currentBal)).toLocaleString()}
        </div>
      </div>

      <!-- Ledger Transactions Table -->
      <div class="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead class="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th class="py-2 px-2 text-center w-10 border-r border-slate-200 text-slate-400 font-black">#</th>
              <th class="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[95px]">Date</th>
              <th class="py-2 px-3 border-r border-slate-200">Invoice #</th>
              <th class="py-2 px-3 border-r border-slate-200">Description</th>
              <th class="py-2 px-3 text-right border-r border-slate-200">Total Bill</th>
              <th class="py-2 px-3 text-right border-r border-slate-200">Paid</th>
              <th class="py-2 px-3 text-right border-r border-slate-200">Balance</th>
              <th class="py-2 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${entries.length > 0 ? entries.map((e, idx) => {
              const isPurchase = e.record_type === 'purchase';
              const isOpening = e.record_type === 'opening_balance';
              const totalCost = Number(e.total_cost) || 0;
              const paidAmt = Number(e.paid_amount) || 0;
              const remaining = Number(e.remaining_balance) || 0;

              return `
                <tr class="hover:bg-slate-50/70 transition-colors ${isOpening ? 'bg-amber-50/40' : ''}">
                  <td class="py-1.5 px-2 text-center text-slate-400 font-bold border-r border-slate-200 text-xs">${idx + 1}</td>
                  <td class="py-1.5 px-3 text-[11px] font-bold text-slate-600 border-r border-slate-200 whitespace-nowrap">${app.formatDateTime(e.date, e.created_at)}</td>
                  <td class="py-1.5 px-3 font-mono font-black text-slate-900 border-r border-slate-200">${e.invoice_no || `REF-${e.id}`}</td>
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isOpening ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      isPurchase ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }">
                      ${isOpening ? '🏛️ Starting Amount' : isPurchase ? '📦 Raw Material Purchase' : '💵 Payment to Supplier'}
                    </span>
                    <div class="text-[10px] text-slate-500 mt-0.5 leading-tight font-medium">
                      ${isOpening ? 'Opening balance recorded on registration' : (e.summary_name || e.notes || '')}
                    </div>
                  </td>
                  <td class="py-1.5 px-3 text-right font-black ${isPurchase || isOpening ? 'text-slate-900 font-mono' : 'text-slate-400'} text-xs tabular-nums border-r border-slate-200">
                    ${isPurchase || isOpening ? `Rs. ${Math.round(totalCost).toLocaleString()}` : '-'}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black ${!isOpening && paidAmt > 0 ? 'text-emerald-700 font-mono' : 'text-slate-400'} text-xs tabular-nums border-r border-slate-200">
                    ${isOpening ? '-' : `Rs. ${Math.round(paidAmt).toLocaleString()}`}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black text-xs tabular-nums border-r border-slate-200">
                    ${isOpening ? `<span class="text-rose-600 font-mono">Rs. ${Math.round(remaining).toLocaleString()}</span>` : (isPurchase && remaining > 0 ? `<span class="text-rose-600 font-mono">Rs. ${Math.round(remaining).toLocaleString()}</span>` : (isPurchase ? '<span class="text-emerald-700">Paid</span>' : '-'))}
                  </td>
                  <td class="py-1.5 px-3 text-center">
                    ${isOpening ? `
                      <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="Suppliers.openSupplierModal(${supplier.id})"
                                class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Edit Opening Balance in Supplier Details">
                          <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    ` : isPurchase ? `
                      <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="Purchases.viewReceipt(${e.id})"
                                class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Print Purchase Inward Voucher (A5)">
                          <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="Purchases.openPurchaseModal(${e.id})"
                                class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Edit Purchase">
                          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="Purchases.deletePurchase(${e.id})"
                                class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Delete Purchase (reverts stock &amp; balance)">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    ` : `
                      <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="Suppliers.printPaymentReceipt(${e.id})"
                                class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Print Payment Receipt (A5)">
                          <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="Suppliers.openEditPaymentModal(${e.id})"
                                class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Edit Payment Details">
                          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="Suppliers.deletePayment(${e.id})"
                                class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Delete Payment (reverts balance)">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    `}
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="8" class="py-8 text-center text-slate-400 font-bold text-xs">
                  No purchase or payment records found for this supplier.
                </td>
              </tr>
            `}
          </tbody>
          ${entries.length > 0 ? `
            <tfoot class="sticky bottom-0 bg-slate-100/95 font-black text-slate-900 border-t-2 border-slate-300 shadow-sm z-10">
              <tr class="bg-slate-100/95 text-slate-900 border-t-2 border-slate-300">
                <td colspan="4" class="py-2.5 px-3 uppercase tracking-wider font-black text-[11px] border-r border-slate-200 text-left">
                  <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                    <span class="text-blue-700 font-black">TOTAL:</span>
                    <span>${entries.length} ${entries.length === 1 ? 'RECORD' : 'RECORDS'}</span>
                  </div>
                </td>
                <td class="py-2.5 px-3 text-right font-black text-slate-900 text-xs tabular-nums border-r border-slate-200">
                  Rs. ${Math.round(totalDebit).toLocaleString()}
                </td>
                <td class="py-2.5 px-3 text-right font-black text-emerald-700 text-xs tabular-nums border-r border-slate-200">
                  Rs. ${Math.round(totalPaid).toLocaleString()}
                </td>
                <td class="py-2.5 px-3 text-right font-black text-xs tabular-nums border-r border-slate-200 ${currentBal > 0 ? 'text-rose-600 font-mono' : 'text-emerald-700 font-mono'}">
                  Rs. ${Math.round(Math.abs(currentBal)).toLocaleString()}
                </td>
                <td class="py-2.5 px-3 text-center text-slate-400 font-bold text-xs">—</td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: panel });
  },

  async openSupplierModal(supplierId = null) {
    if (supplierId && window.app && typeof app.checkActionPassword === 'function') {
      const allowed = await app.checkActionPassword('Edit Supplier');
      if (!allowed) return;
    }

    const isEdit = Boolean(supplierId);
    let s = null;
    if (isEdit) {
      s = (this.suppliers || []).find(x => x.id === Number(supplierId));
      if (!s && this.activeLedger && this.activeLedger.supplier && this.activeLedger.supplier.id === Number(supplierId)) {
        s = this.activeLedger.supplier;
      }
    }

    const modal = document.getElementById('supplier-edit-modal');
    if (!modal) return;

    const titleEl = document.getElementById('supplier-modal-title');
    const subtitleEl = document.getElementById('supplier-modal-subtitle');
    const submitBtn = document.getElementById('sup-sf-submit-btn');
    if (titleEl) titleEl.textContent = isEdit ? 'Edit Supplier' : 'Add New Supplier';
    if (subtitleEl) subtitleEl.textContent = isEdit ? 'Update vendor details, contact & khata' : 'Supplier & vendor profile, contact & khata';
    if (submitBtn) submitBtn.textContent = isEdit ? 'Update Supplier' : 'Save Supplier';

    document.getElementById('sup-sf-id').value = s ? s.id : '';
    document.getElementById('sup-sf-name').value = s ? s.name : '';
    document.getElementById('sup-sf-contact').value = s ? (s.contact_person || '') : '';
    document.getElementById('sup-sf-phone').value = s ? (s.phone || '') : '';
    document.getElementById('sup-sf-city').value = s ? (s.city || '') : '';
    document.getElementById('sup-sf-amount').value = s ? (s.opening_balance !== undefined && s.opening_balance !== null ? s.opening_balance : (s.amount || 0)) : '';
    document.getElementById('sup-sf-address').value = s ? (s.address || '') : '';
    document.getElementById('sup-sf-notes').value = s ? (s.notes || '') : '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons({ root: modal });
  },

  closeSupplierModal() {
    const modal = document.getElementById('supplier-edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  async saveSupplierForm(e) {
    e.preventDefault();
    const id = document.getElementById('sup-sf-id').value;
    const name = document.getElementById('sup-sf-name').value.trim();
    const contact = document.getElementById('sup-sf-contact').value.trim();
    const phone = document.getElementById('sup-sf-phone').value.trim();
    const city = document.getElementById('sup-sf-city').value.trim();
    const amount = Number(document.getElementById('sup-sf-amount').value) || 0;
    const address = document.getElementById('sup-sf-address').value.trim();
    const notes = document.getElementById('sup-sf-notes').value.trim();

    if (!name) {
      return app.showAlert({ title: 'Validation Error', message: 'Supplier name is required.' });
    }

    const dup = (this.suppliers || []).find(s => (!id || s.id !== Number(id)) && s.name.trim().toLowerCase() === name.toLowerCase());
    if (dup) {
      return app.showAlert({ title: 'Duplicate Supplier', message: `A supplier with the name "<b>${name}</b>" already exists.<br><br>Duplicate supplier names are not allowed.` });
    }

    const payload = {
      id: id ? Number(id) : null,
      name,
      contact_person: contact,
      phone,
      city,
      amount,
      opening_balance: amount,
      address,
      notes
    };

    try {
      const res = await window.api.saveSupplier(payload);
      if (res && res.success) {
        this.closeSupplierModal();
        app.showToast(id ? 'Supplier updated successfully' : 'Supplier registered successfully', 'success');
        this.selectedSupplierId = id ? Number(id) : res.id;
        await this.loadData();
        if (window.Purchases && Purchases.container) {
          Purchases.loadData();
        }
      } else {
        app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to save supplier.' });
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      app.showAlert({ title: 'Error', message: err.message || 'Failed to save supplier.' });
    }
  },

  async deleteSupplier(id, name) {
    if (window.app && typeof app.checkActionPassword === 'function') {
      const allowed = await app.checkActionPassword('Delete Supplier');
      if (!allowed) return;
    }

    const ok = await new Promise(resolve => {
      app.showConfirm({
        title: `Delete Supplier "${name}"?`,
        message: `Are you sure you want to delete this supplier?<br><br>
          <span class="text-rose-600 font-bold">This will permanently remove the supplier profile and their balance record.</span>`,
        confirmText: 'Yes, Delete Supplier',
        confirmColor: 'red',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (ok) {
      try {
        const res = await window.api.deleteSupplier(id);
        if (res && res.success) {
          app.showToast(`Supplier "${name}" deleted`, 'success');
          this.selectedSupplierId = null;
          await this.loadData();
          if (window.Purchases && Purchases.container) {
            Purchases.loadData();
          }
        } else {
          app.showAlert({ title: 'Cannot Delete', message: (res && res.error) || 'Failed to delete supplier.' });
        }
      } catch (err) {
        console.error('Error deleting supplier:', err);
        app.showAlert({ title: 'Cannot Delete', message: err.message || 'Failed to delete supplier.' });
      }
    }
  },

  // ==========================================
  // PAY SUPPLIER DEBT MODAL & PAYMENT RECEIPT
  // ==========================================

  openPaymentModal(supplierId) {
    const s = (this.suppliers || []).find(x => x.id === Number(supplierId));
    if (!s) return;

    const modal = document.getElementById('supplier-payment-modal');
    if (!modal) return;

    const bal = Number(s.amount) || 0;
    document.getElementById('spf-supplier-id').value = s.id;
    document.getElementById('spf-supplier-name').textContent = s.name;
    document.getElementById('spf-current-balance').textContent = `Rs. ${Math.round(Math.abs(bal)).toLocaleString()}`;
    const curBalLabel = document.getElementById('spf-current-balance-label');
    if (curBalLabel) curBalLabel.textContent = bal < 0 ? 'Advance:' : 'Balance:';
    document.getElementById('spf-amount').value = bal > 0 ? bal : '';
    document.getElementById('spf-amount').removeAttribute('max');
    document.getElementById('spf-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('spf-notes').value = '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons({ root: modal });
  },

  closePaymentModal() {
    const modal = document.getElementById('supplier-payment-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  fillFullPayment() {
    const sId = document.getElementById('spf-supplier-id').value;
    const s = (this.suppliers || []).find(x => x.id === Number(sId));
    if (s) {
      const bal = Number(s.amount) || 0;
      document.getElementById('spf-amount').value = bal > 0 ? Math.round(bal) : '';
    }
  },

  async savePaymentForm(e) {
    e.preventDefault();
    const supplierId = Number(document.getElementById('spf-supplier-id').value);
    const amount = Number(document.getElementById('spf-amount').value);
    const paymentMethod = document.getElementById('spf-method').value;
    const date = document.getElementById('spf-date').value;
    const notes = document.getElementById('spf-notes').value.trim();

    if (!supplierId || amount <= 0) {
      return app.showAlert({ title: 'Invalid Payment', message: 'Please enter a valid payment amount.' });
    }

    const supplier = this.suppliers.find(s => s.id === supplierId);
    const supplierName = supplier ? supplier.name : 'Supplier';
    const curBal = supplier ? (Number(supplier.amount) || 0) : 0;
    const newBal = curBal - amount;

    const payload = {
      supplier_id: supplierId,
      amount,
      payment_method: paymentMethod,
      date,
      notes
    };

    app.showConfirm({
      title: 'Confirm Supplier Payment',
      message: `
        <div class="space-y-2.5 text-left mt-2 text-xs">
          <p class="text-slate-600 font-medium">Please confirm recording cash outflow payment to supplier:</p>
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">Supplier:</span>
              <span class="font-black text-slate-900">${supplierName}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">Paid Outflow Amount:</span>
              <span class="font-mono font-black text-emerald-700">Rs. ${Math.round(amount).toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">${newBal < 0 ? 'Advance:' : 'Balance:'}</span>
              <span class="font-mono font-black ${newBal > 0 ? 'text-rose-600' : 'text-emerald-700'}">
                Rs. ${Math.round(Math.abs(newBal)).toLocaleString()}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">Payment Method:</span>
              <span class="font-black text-slate-900">${paymentMethod}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">Payment Date:</span>
              <span class="font-mono font-bold text-slate-800">${date}</span>
            </div>
          </div>
        </div>
      `,
      confirmText: 'Confirm & Pay',
      confirmColor: 'green',
      onConfirm: async () => {
        try {
          const res = await window.api.paySupplier(payload);
          if (res && res.success) {
            this.closePaymentModal();
            const balNotice = res.new_balance < 0 
              ? `Advance: Rs. ${Math.round(Math.abs(res.new_balance)).toLocaleString()}`
              : `Balance: Rs. ${Math.round(res.new_balance).toLocaleString()}`;
            app.showToast(`Paid Rs. ${Math.round(amount).toLocaleString()} to ${res.supplier_name}. ${balNotice}`, 'success');
            
            await this.loadData();
            if (window.Purchases && Purchases.container) {
              Purchases.loadData();
            }

            // Automatically show A5 payment receipt preview
            setTimeout(() => {
              this.printPaymentReceipt(res.id);
            }, 200);
          } else {
            app.showAlert({ title: 'Payment Failed', message: (res && res.error) || 'Failed to record supplier payment.' });
          }
        } catch (err) {
          console.error('Error paying supplier:', err);
          app.showAlert({ title: 'Payment Failed', message: err.message || 'Failed to record supplier payment.' });
        }
      }
    });
  },

  async deletePayment(paymentId) {
    if (window.app && typeof app.checkActionPassword === 'function') {
      const allowed = await app.checkActionPassword('Delete Supplier Payment');
      if (!allowed) return;
    }

    const ok = await new Promise(resolve => {
      app.showConfirm({
        title: 'Delete Payment?',
        message: 'Are you sure you want to delete this payment record?<br><br><span class="text-rose-600 font-bold">This will add the payment amount back to the supplier\'s payable balance!</span>',
        confirmText: 'Yes, Revert Payment',
        confirmColor: 'red',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (ok) {
      try {
        const res = await window.api.deleteSupplierPayment(paymentId);
        if (res && res.success) {
          app.showToast('Payment deleted and supplier balance reverted', 'success');
          await this.loadData();
          if (window.Purchases && Purchases.container) {
            Purchases.loadData();
          }
        } else {
          app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to revert payment.' });
        }
      } catch (err) {
        console.error('Error deleting payment:', err);
        app.showAlert({ title: 'Error', message: err.message || 'Failed to revert payment.' });
      }
    }
  },

  openEditPaymentModal(paymentId) {
    const entries = this.activeLedger ? this.activeLedger.entries : [];
    const pay = entries.find(e => e.id === Number(paymentId) && e.record_type === 'payment');
    if (!pay) return app.showAlert({ title: 'Error', message: 'Payment record not found.' });

    const rawDate = pay.date ? pay.date.split(' ')[0] : new Date().toISOString().split('T')[0];
    const currentMethod = (pay.payment_method || 'Cash').toLowerCase().includes('online') ? 'Online' : 'Cash';
    const s = (this.activeLedger && this.activeLedger.supplier) ? this.activeLedger.supplier : {};

    const content = `
      <form onsubmit="Suppliers.saveEditedPayment(event, ${pay.id})" class="space-y-4">
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span>Supplier: <strong class="text-slate-800">${s.name || 'Vendor'}</strong></span>
            <span>Receipt: <strong class="text-slate-800 font-mono">${pay.invoice_no || `PAY-${pay.id}`}</strong></span>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
            <span>Amount Paid: <strong class="text-emerald-700">Rs. ${Number(pay.amount || 0).toLocaleString()}</strong></span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Payment Date</label>
            <input type="date" id="edit-sup-pay-date" value="${rawDate}" required
                   class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-emerald-500 bg-white">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
            <select id="edit-sup-pay-method" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-emerald-500 bg-white">
              <option value="Cash" ${currentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
              <option value="Online" ${currentMethod === 'Online' ? 'selected' : ''}>Online</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Notes / Remarks</label>
          <input type="text" id="edit-sup-pay-notes" value="${pay.notes || ''}"
                 placeholder="Cheque #, transaction ref, remarks..."
                 class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-emerald-500 bg-white">
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onclick="app.closeModal()"
                  class="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button type="submit"
                  class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer">
            Save Changes
          </button>
        </div>
      </form>
    `;

    app.showModal({
      title: `Edit Payment Record (${pay.invoice_no || `PAY-${pay.id}`})`,
      content,
      maxWidth: 'max-w-md'
    });
  },

  async saveEditedPayment(e, paymentId) {
    e.preventDefault();
    const date = document.getElementById('edit-sup-pay-date')?.value;
    const payment_method = document.getElementById('edit-sup-pay-method')?.value || 'Cash';
    const notes = document.getElementById('edit-sup-pay-notes')?.value || '';

    try {
      app.showLoading();
      const res = await window.api.updateSupplierPayment(paymentId, { date, payment_method, notes });
      if (res && res.error) {
        app.showAlert({ title: 'Error', message: res.error });
        return;
      }
      app.closeModal();
      await this.loadData();
      app.showAlert({ title: 'Updated', message: 'Supplier payment details updated.' });
    } catch (err) {
      app.showAlert({ title: 'Error', message: err.message });
    } finally {
      app.hideLoading();
    }
  },

  async printPaymentReceipt(paymentId) {
    if (!this.activeLedger) {
      if (this.selectedSupplierId) {
        this.activeLedger = await window.api.getSupplierLedger(this.selectedSupplierId);
      }
    }
    const entries = this.activeLedger ? this.activeLedger.entries : [];
    const pay = entries.find(e => e.id === Number(paymentId) && e.record_type === 'payment');

    const s = this.suppliers.find(x => x.id === this.selectedSupplierId);
    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const phone = settings.company_phone || '';
    const address = settings.company_address || '';

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 6px 8px 0 8px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box; line-height: 1.35;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 17px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          ${address ? `<p style="font-size: 10px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${address}</p>` : ''}
          ${phone ? `<p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 500;">Tel: ${phone}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 4px 0 6px 0;">
          <span style="display: inline-block; padding: 3px 14px; background: #fff; border: 1.5px solid #000; border-radius: 9999px; font-size: 11px; font-weight: 800; color: #000; letter-spacing: 0.8px; text-transform: uppercase;">
            SUPPLIER PAYMENT VOUCHER
          </span>
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 8px; padding: 7px 10px; background: #fff; border: 1.5px solid #000; color: #000; line-height: 1.55;">
          <div>
            <div><strong>Receipt / Ref #:</strong> <span style="font-weight: 800;">${pay ? pay.invoice_no : `PAY-${paymentId}`}</span></div>
            <div><strong>Paid To Supplier:</strong> ${s ? s.name : 'Supplier'}</div>
            ${s && s.contact_person ? `<div><strong>Contact:</strong> ${s.contact_person} (${s.phone || ''})</div>` : ''}
          </div>
          <div style="text-align: right; line-height: 1.55;">
            <div><strong>Date &amp; Time:</strong> ${app.formatDateTime(pay ? (pay.date || pay.created_at) : new Date(), pay ? pay.created_at : null)}</div>
            <div><strong>Payment Mode:</strong> <span style="font-weight: 800;">${pay ? (pay.payment_method || 'Cash') : 'Cash'}</span></div>
          </div>
        </div>

        <div style="background: #fff; border: 1.5px solid #000; border-radius: 4px; padding: 10px; text-align: center; margin: 8px 0; color: #000;">
          <span style="font-size: 9.5px; font-weight: 800; color: #000; text-transform: uppercase; letter-spacing: 0.8px; display: block;">AMOUNT PAID</span>
          <span style="font-size: 24px; font-weight: 800; color: #000; display: block; margin-top: 2px;">
            Rs. ${pay ? Math.round(Number(pay.paid_amount) || 0).toLocaleString() : '0'}
          </span>
          ${pay && pay.notes ? `<p style="font-size: 9.5px; color: #000; margin: 4px 0 0 0; font-weight: 600;">Remarks: ${pay.notes}</p>` : ''}
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 8.5px; margin-top: 6px; background: #fff;">
          <tr>
            <td style="border: 1px solid #000; padding: 4px 6px; font-weight: 600; color: #000; font-size: 8.5px;">${(s && Number(s.amount) < 0) ? 'Remaining Advance Balance:' : 'Remaining Payable Balance:'}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 10px; color: #000;">
              Rs. ${(s ? Math.round(Math.abs(Number(s.amount) || 0)).toLocaleString() : '0')}
            </td>
          </tr>
        </table>

        <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 9px;">
          <div style="border-top: 1.5px solid #000; width: 38%; text-align: center; padding-top: 4px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">
            Paid By (Factory Cashier)
          </div>
          <div style="border-top: 1.5px solid #000; width: 38%; text-align: center; padding-top: 4px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">
            Received By (Supplier / Vendor)
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Supplier Payment Voucher (${pay ? pay.invoice_no : `PAY-${paymentId}`})`);
  },

  async printSupplierStatement(supplierId) {
    const s = this.suppliers.find(x => x.id === Number(supplierId));
    if (!s) return;

    let ledger = null;
    try {
      ledger = await window.api.getSupplierLedger(s.id);
    } catch (e) {}
    const entries = ledger ? ledger.entries : [];

    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const date = new Date().toLocaleDateString('en-GB');

    let totalPurchased = 0;
    let totalPaid = 0;

    // 1. Calculate running balance chronologically (oldest first)
    const chronological = [...entries].sort((a, b) => {
      const dateA = (a.date || '').split('T')[0].split(' ')[0];
      const dateB = (b.date || '').split('T')[0].split(' ')[0];
      if (dateA && dateB && dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      if (a.record_type === 'opening_balance' && b.record_type !== 'opening_balance') return -1;
      if (b.record_type === 'opening_balance' && a.record_type !== 'opening_balance') return 1;
      const ta = (new Date(a.created_at || a.date).getTime()) || 0;
      const tb = (new Date(b.created_at || b.date).getTime()) || 0;
      if (ta !== tb) return ta - tb;
      return (a.id || 0) - (b.id || 0);
    });

    let runningBalance = 0;
    chronological.forEach(e => {
      const isPurchase = e.record_type === 'purchase';
      const isOpening = e.record_type === 'opening_balance';
      const debit = isPurchase ? (Number(e.total_cost) || 0) : (isOpening ? (Number(e.total_cost || e.amount) || 0) : 0);
      const credit = Number(e.paid_amount) || 0;
      totalPurchased += debit;
      totalPaid += credit;
      runningBalance = runningBalance + debit - credit;
      e._runningBalance = runningBalance;
    });

    // 2. Display latest first
    const displayEntries = [...chronological].reverse();

    const rows = displayEntries.map((e, idx) => {
      const isPurchase = e.record_type === 'purchase';
      const isOpening = e.record_type === 'opening_balance';
      const debit = isPurchase ? (Number(e.total_cost) || 0) : (isOpening ? (Number(e.total_cost || e.amount) || 0) : 0);
      const credit = Number(e.paid_amount) || 0;

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 4px 4px; text-align: center; font-size: 8px; color: #000;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 4px 5px; font-size: 8px; color: #000; white-space: nowrap;">${app.formatDateTime(e.date, e.created_at)}</td>
          <td style="border: 1px solid #000; padding: 4px 5px; font-weight: 700; font-size: 8.5px; color: #000;">${e.invoice_no || `REF-${e.id}`}</td>
          <td style="border: 1px solid #000; padding: 4px 5px; font-size: 8.5px; color: #000;">${isOpening ? 'Starting Balance' : (isPurchase ? 'Purchase' : 'Payment')} • ${e.summary_name || e.notes || ''}</td>
          <td style="border: 1px solid #000; padding: 4px 5px; text-align: right; font-weight: 600; font-size: 8.5px; color: #000;">${debit > 0 ? `Rs. ${Math.round(debit).toLocaleString()}` : '-'}</td>
          <td style="border: 1px solid #000; padding: 4px 5px; text-align: right; font-weight: 600; font-size: 8.5px; color: #000;">${credit > 0 ? `Rs. ${Math.round(credit).toLocaleString()}` : '-'}</td>
          <td style="border: 1px solid #000; padding: 4px 5px; text-align: right; font-weight: 700; font-size: 8.5px; color: #000;">
            Rs. ${Math.round(e._runningBalance || 0).toLocaleString()}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 6px 8px 0 8px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box; line-height: 1.35;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 17px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          <p style="font-size: 10px; color: #000; margin: 2px 0 0 0; font-weight: 600;">SUPPLIER KHATA LEDGER STATEMENT</p>
          <p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 500;">Statement Date: ${date}</p>
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 8px; padding: 7px 10px; background: #fff; border: 1.5px solid #000; color: #000; line-height: 1.55;">
          <div>
            <div><strong>Supplier:</strong> <span style="font-weight: 800;">${s.name}</span></div>
            ${s.contact_person ? `<div><strong>Contact:</strong> ${s.contact_person} (${s.phone || ''})</div>` : ''}
            ${s.city ? `<div><strong>Location:</strong> ${s.city} ${s.address || ''}</div>` : ''}
          </div>
          <div style="text-align: right; line-height: 1.55;">
            <div><strong>Total Billed:</strong> Rs. ${Math.round(totalPurchased).toLocaleString()}</div>
            <div><strong>Total Paid:</strong> Rs. ${Math.round(totalPaid).toLocaleString()}</div>
            <div><strong>${Number(s.amount) < 0 ? 'Advance:' : 'Balance:'}</strong> <span style="font-weight: 800; font-size: 11.5px;">Rs. ${Math.round(Math.abs(Number(s.amount) || 0)).toLocaleString()}</span></div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 8.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr style="background: #fff; border-bottom: 1.5px solid #000;">
              <th style="border: 1px solid #000; padding: 4.5px 4px; text-align: center; width: 20px; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #000;">#</th>
              <th style="border: 1px solid #000; padding: 4.5px 5px; text-align: left; width: 62px; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #000;">Date</th>
              <th style="border: 1px solid #000; padding: 4.5px 5px; text-align: left; width: 50px; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #000;">Ref #</th>
              <th style="border: 1px solid #000; padding: 4.5px 5px; text-align: left; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #000;">Description</th>
              <th style="border: 1px solid #000; padding: 4.5px 5px; text-align: right; width: 55px; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #000;">Billed</th>
              <th style="border: 1px solid #000; padding: 4.5px 5px; text-align: right; width: 55px; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #000;">Paid</th>
              <th style="border: 1px solid #000; padding: 4.5px 5px; text-align: right; width: 58px; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #000;">Running Due</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="7" style="border: 1px solid #000; padding: 12px; text-align: center; color: #000;">No transactions found.</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="background: #fff; font-weight: 800; border-top: 2px solid #000; color: #000;">
              <td colspan="4" style="border: 1px solid #000; padding: 4.5px 5px; text-align: right; text-transform: uppercase; font-size: 8.5px;">GRAND TOTALS:</td>
              <td style="border: 1px solid #000; padding: 4.5px 5px; text-align: right; font-size: 9px;">Rs. ${Math.round(totalPurchased).toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 4.5px 5px; text-align: right; font-size: 9px;">Rs. ${Math.round(totalPaid).toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 4.5px 5px; text-align: right; font-size: 9px;">
                Rs. ${Math.round(Math.abs(Number(s.amount) || 0)).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 32px; display: flex; justify-content: space-between; font-size: 9px;">
          <div style="border-top: 1.5px solid #000; width: 38%; text-align: center; padding-top: 4px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">
            Factory Accountant Signature
          </div>
          <div style="border-top: 1.5px solid #000; width: 38%; text-align: center; padding-top: 4px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">
            Supplier Confirmation Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Supplier Statement (${s.name})`);
  },

  printSuppliersBalancesList() {
    const list = (this.suppliers || []).filter(s => {
      const bal = Number(s.amount) || 0;
      return bal !== 0; // Exclude 0 balance value entries
    });

    if (list.length === 0) {
      return app.showAlert({
        title: 'No Balances to Print',
        message: 'There are currently no suppliers with an outstanding balance or advance payment (all suppliers have 0 balance).'
      });
    }

    // Sort: highest payable debt first, then advances
    list.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));

    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const address = settings.company_address || '';
    const phone = settings.company_phone || '';
    const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const printTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    let totalPayable = 0;
    let totalAdvance = 0;
    let payableCount = 0;
    let advanceCount = 0;

    list.forEach(s => {
      const bal = Number(s.amount) || 0;
      if (bal > 0) {
        totalPayable += bal;
        payableCount++;
      } else if (bal < 0) {
        totalAdvance += Math.abs(bal);
        advanceCount++;
      }
    });

    const rows = list.map((s, idx) => {
      const bal = Number(s.amount) || 0;
      const isAdv = bal < 0;
      const absBal = Math.abs(bal);
      const typeLabel = isAdv ? 'Advance' : 'Balance';

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 5px 4px; text-align: center; font-size: 9.5px; color: #000;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px 6px; font-size: 10px; font-weight: 700; color: #000;">
            ${s.name}
            ${s.contact_person ? `<span style="display: block; font-size: 8.5px; font-weight: 500; color: #000;">Contact: ${s.contact_person}</span>` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 4px 6px; font-size: 8.5px; font-weight: 500; color: #000;">${s.phone || '-'}</td>
          <td style="border: 1px solid #000; padding: 4px 6px; font-size: 8.5px; font-weight: 500; color: #000;">${s.city || s.address || '-'}</td>
          <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #000;">
            ${typeLabel}
          </td>
          <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 9px; font-weight: 700; color: #000;">
            Rs. ${Math.round(absBal).toLocaleString()}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 6px 8px 0 8px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box; line-height: 1.35;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 17px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          ${address ? `<p style="font-size: 10px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${address}</p>` : ''}
          ${phone ? `<p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 500;">Tel: ${phone}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 4px 0 6px 0;">
          <span style="display: inline-block; padding: 3px 14px; background: #fff; border: 1.5px solid #000; border-radius: 9999px; font-size: 11px; font-weight: 800; color: #000; letter-spacing: 0.8px; text-transform: uppercase;">
            SUPPLIERS BALANCE &amp; ADVANCE LIST
          </span>
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 8px; padding: 7px 10px; background: #fff; border: 1.5px solid #000; color: #000; line-height: 1.55;">
          <div>
            <div><strong>Report:</strong> Active Balances &amp; Advances</div>
            <div><strong>Generated:</strong> ${printDate} at ${printTime}</div>
          </div>
          <div style="text-align: right; line-height: 1.55;">
            <div><strong>Balance:</strong> Rs. ${Math.round(totalPayable).toLocaleString()} (${payableCount} ${payableCount === 1 ? 'vendor' : 'vendors'})</div>
            ${totalAdvance > 0 ? `<div><strong>Advance Paid:</strong> Rs. ${Math.round(totalAdvance).toLocaleString()} (${advanceCount} ${advanceCount === 1 ? 'vendor' : 'vendors'})</div>` : ''}
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 8.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr style="background: #fff; border-bottom: 1.5px solid #000;">
              <th style="border: 1px solid #000; padding: 4.5px 4px; text-align: center; width: 22px; font-weight: 800; font-size: 8.5px; text-transform: uppercase; color: #000;">#</th>
              <th style="border: 1px solid #000; padding: 4.5px 6px; text-align: left; font-weight: 800; font-size: 8.5px; text-transform: uppercase; color: #000;">Supplier Name</th>
              <th style="border: 1px solid #000; padding: 4.5px 6px; text-align: left; font-weight: 800; font-size: 8.5px; text-transform: uppercase; color: #000;">Phone</th>
              <th style="border: 1px solid #000; padding: 4.5px 6px; text-align: left; font-weight: 800; font-size: 8.5px; text-transform: uppercase; color: #000;">Area / City</th>
              <th style="border: 1px solid #000; padding: 4.5px 6px; text-align: center; font-weight: 800; font-size: 8.5px; text-transform: uppercase; width: 65px; color: #000;">Status</th>
              <th style="border: 1px solid #000; padding: 4.5px 6px; text-align: right; font-weight: 800; font-size: 8.5px; text-transform: uppercase; width: 80px; color: #000;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr style="background: #fff; font-weight: 800; border-top: 2px solid #000; color: #000;">
              <td colspan="4" style="border: 1px solid #000; padding: 4.5px 6px; text-align: right; text-transform: uppercase; font-size: 9px; color: #000;">TOTAL BALANCE:</td>
              <td colspan="2" style="border: 1px solid #000; padding: 4.5px 6px; text-align: right; font-size: 10px; font-weight: 800; color: #000;">Rs. ${Math.round(totalPayable).toLocaleString()}</td>
            </tr>
            ${totalAdvance > 0 ? `
            <tr style="background: #fff; font-weight: 800;">
              <td colspan="4" style="border: 1px solid #000; padding: 4.5px 6px; text-align: right; text-transform: uppercase; font-size: 9px; color: #000;">TOTAL ADVANCE:</td>
              <td colspan="2" style="border: 1px solid #000; padding: 4.5px 6px; text-align: right; font-size: 10px; font-weight: 800; color: #000;">Rs. ${Math.round(totalAdvance).toLocaleString()}</td>
            </tr>
            ` : ''}
          </tfoot>
        </table>

        <div style="margin-top: 32px; display: flex; justify-content: space-between; font-size: 9.5px;">
          <div style="border-top: 1.5px solid #000; width: 38%; text-align: center; padding-top: 5px; font-weight: 800; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">
            Accountant
          </div>
          <div style="border-top: 1.5px solid #000; width: 38%; text-align: center; padding-top: 5px; font-weight: 800; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">
            Manager / Owner
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Suppliers Balance & Advance Summary');
  }
};
