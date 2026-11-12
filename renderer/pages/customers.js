// Shops & Khata Ledger Management for Ice Cream Factory
window.Customers = {
  shops: [],
  filteredShops: [],
  selectedShopId: null,
  activeLedger: null,
  filterType: 'all', // 'all' | 'due' | 'zero'
  searchQuery: '',

  async render(container) {
    this.container = container;
    
    container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-hidden">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="store" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Shops &amp; Khata Accounts</h2>
              <p class="text-xs text-slate-500 font-medium">Manage customer shops, track credit balances, collect cash payments, and print A5 ledger statements.</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="Customers.openShopModal()"
                    class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="plus" class="w-4 h-4"></i> Add New Shop
            </button>
          </div>
        </div>

        <!-- KPI Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Registered Shops</p>
            <h3 class="text-xl font-black text-slate-900 mt-1" id="shop-stat-count">0</h3>
            <p class="text-[11px] font-bold text-slate-400 mt-0.5">Active retail customers</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Total Khata Balance Due</p>
            <h3 class="text-xl font-black text-rose-600 mt-1" id="shop-stat-due">Rs. 0</h3>
            <p class="text-[11px] font-bold text-rose-500 mt-0.5">Receivable from all shops</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Shops With Credit Due</p>
            <h3 class="text-xl font-black text-amber-600 mt-1" id="shop-stat-pending-shops">0</h3>
            <p class="text-[11px] font-bold text-amber-600 mt-0.5">Have pending balance</p>
          </div>

          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <p class="text-[10px] font-black uppercase text-slate-400">Clean / Zero Balance</p>
            <h3 class="text-xl font-black text-emerald-700 mt-1" id="shop-stat-clean-shops">0</h3>
            <p class="text-[11px] font-bold text-emerald-600 mt-0.5">Fully paid accounts</p>
          </div>
        </div>

        <!-- Master-Detail Split Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
          
          <!-- Left 5 Cols: Shop List -->
          <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-0 overflow-hidden">
            <!-- Search & Filters -->
            <div class="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2 shrink-0">
              <div class="relative w-full">
                <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="shop-search" oninput="Customers.onSearch(this.value)"
                       placeholder="Search shop, owner, area, phone..."
                       class="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-400">
              </div>

              <!-- Filter tabs -->
              <div class="flex bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-black">
                <button type="button" onclick="Customers.setFilter('all')" id="shop-filter-all"
                        class="flex-1 py-1 rounded-lg transition-all cursor-pointer bg-white text-slate-900 shadow-2xs text-center">
                  All Shops
                </button>
                <button type="button" onclick="Customers.setFilter('due')" id="shop-filter-due"
                        class="flex-1 py-1 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-slate-900 text-center">
                  Due Balances
                </button>
                <button type="button" onclick="Customers.setFilter('zero')" id="shop-filter-zero"
                        class="flex-1 py-1 rounded-lg transition-all cursor-pointer text-slate-500 hover:text-slate-900 text-center">
                  Zero Balance
                </button>
              </div>
            </div>

            <!-- Scrollable Shops List -->
            <div id="shops-list-container" class="flex-1 overflow-y-auto custom-scrollbar">
              <!-- Injected by renderShopsList() -->
            </div>

            <!-- Sticky Footer for Total (# and amount) -->
            <div id="shops-list-footer" class="p-2.5 px-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs">
              <!-- Injected by renderShopsList() -->
            </div>
          </div>

          <!-- Right 7 Cols: Shop Details & Ledger Statement -->
          <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-0 overflow-hidden" id="shop-detail-panel">
            <!-- Injected by renderShopDetail() -->
          </div>

        </div>

      </div>

      <!-- Shop Add/Edit Modal -->
      <div id="shop-edit-modal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 p-4 cursor-pointer" onclick="if(event.target === this) Customers.closeShopModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col cursor-default" onclick="event.stopPropagation()">
          <div class="p-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 class="font-black text-sm text-white flex items-center gap-2" id="shop-modal-title">
              <i data-lucide="store" class="w-4 h-4 text-amber-400"></i> Add New Shop
            </h3>
            <button type="button" onclick="Customers.closeShopModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form id="shop-form" onsubmit="Customers.saveShopForm(event)" class="p-5 space-y-3">
            <input type="hidden" id="sf-id">
            
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Shop / Business Name *</label>
              <input type="text" id="sf-name" required placeholder="e.g. Madina Bakers & Cold Point"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Owner Name</label>
                <input type="text" id="sf-owner" placeholder="e.g. Haji Aslam"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Phone Number *</label>
                <input type="text" id="sf-phone" required placeholder="0300-1234567"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Opening Khata Balance (Rs.)</label>
              <input type="number" step="any" min="0" id="sf-amount" placeholder="0"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Shop Address</label>
              <input type="text" id="sf-address" placeholder="e.g. Main GT Road, Near Bus Stand, Hasan Abdal"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-amber-400">
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Notes / Instructions</label>
              <textarea id="sf-notes" rows="2" placeholder="e.g. Delivers every Monday & Thursday morning"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-amber-400"></textarea>
            </div>

            <div class="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onclick="Customers.closeShopModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">
                Cancel
              </button>
              <button type="submit" class="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer">
                Save Shop
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Receive Payment Modal -->
      <div id="shop-payment-modal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 p-4 cursor-pointer" onclick="if(event.target === this) Customers.closePaymentModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 flex flex-col cursor-default" onclick="event.stopPropagation()">
          <div class="p-4 bg-emerald-800 text-white flex justify-between items-center">
            <h3 class="font-black text-sm text-white flex items-center gap-2">
              <i data-lucide="hand-coins" class="w-4 h-4 text-emerald-300"></i> Receive Cash Payment
            </h3>
            <button type="button" onclick="Customers.closePaymentModal()" class="text-emerald-200 hover:text-white p-1 cursor-pointer">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form id="payment-form" onsubmit="Customers.savePaymentForm(event)" class="p-5 space-y-3">
            <input type="hidden" id="pf-shop-id">

            <div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center text-xs">
              <div>
                <span class="text-[10px] font-black uppercase text-emerald-800 block">Shop:</span>
                <span class="font-black text-slate-900" id="pf-shop-name">--</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-black uppercase text-emerald-800 block">Current Balance:</span>
                <span class="font-black text-rose-600 text-sm tabular-nums" id="pf-current-balance">Rs. 0</span>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-[11px] font-black uppercase text-slate-500">Cash Payment Received (Rs.) *</label>
                <span id="pf-max-hint" class="text-[10px] font-bold text-slate-400"></span>
              </div>
              <input type="number" step="any" min="1" id="pf-amount" required placeholder="Enter amount..."
                     oninput="Customers.onPaymentAmountInput(this.value)"
                     class="w-full px-3 py-2 text-base font-black text-slate-900 bg-white border-2 border-emerald-400 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200 tabular-nums">
              <p id="pf-amount-error" class="text-[11px] font-bold text-rose-600 mt-1.5 hidden flex items-center gap-1"></p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Payment Method</label>
                <select id="pf-method" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none">
                  <option value="Cash">💵 Cash</option>
                  <option value="Online">💳 Online</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Receipt Date</label>
                <input type="date" id="pf-date" value="${new Date().toISOString().split('T')[0]}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Notes / Received By</label>
              <input type="text" id="pf-notes" placeholder="e.g. Collected by driver Ali or factory counter"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none">
            </div>

            <div class="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onclick="Customers.closePaymentModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">
                Cancel
              </button>
              <button type="submit" id="pf-submit-btn" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Record &amp; Print Receipt
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
      this.shops = await window.api.getShops() || [];
      // Sort with balance high to low, then alphabetical A-Z
      this.shops.sort((a, b) => {
        const balA = Number(a.amount) || 0;
        const balB = Number(b.amount) || 0;
        if (balB !== balA) return balB - balA;
        return (a.name || '').localeCompare(b.name || '');
      });
      if (!this.selectedShopId && this.shops.length > 0) {
        this.selectedShopId = this.shops[0].id;
      }
      this.applyFilters();
    } catch (e) {
      console.error('Failed to load shops:', e);
    }
  },

  onSearch(val) {
    this.searchQuery = val.toLowerCase().trim();
    this.applyFilters();
  },

  setFilter(filter) {
    this.filterType = filter;
    ['all', 'due', 'zero'].forEach(f => {
      const btn = document.getElementById(`shop-filter-${f}`);
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
    let list = [...this.shops];

    // Filter by type
    if (this.filterType === 'due') {
      list = list.filter(s => (Number(s.amount) || 0) > 0);
    } else if (this.filterType === 'zero') {
      list = list.filter(s => (Number(s.amount) || 0) <= 0);
    }

    // Search
    if (this.searchQuery) {
      list = list.filter(s => {
        const name = (s.name || '').toLowerCase();
        const owner = (s.owner_name || '').toLowerCase();
        const city = (s.city || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        return name.includes(this.searchQuery) || owner.includes(this.searchQuery) || city.includes(this.searchQuery) || phone.includes(this.searchQuery);
      });
    }

    // Sort with balance high to low, then alphabetical A-Z
    list.sort((a, b) => {
      const balA = Number(a.amount) || 0;
      const balB = Number(b.amount) || 0;
      if (balB !== balA) return balB - balA;
      return (a.name || '').localeCompare(b.name || '');
    });

    this.filteredShops = list;
    this.updateKPIs();
    this.renderShopsList();
    this.renderShopDetail();
  },

  updateKPIs() {
    let totalDue = 0;
    let pendingShops = 0;
    let cleanShops = 0;

    this.shops.forEach(s => {
      const bal = Number(s.amount) || 0;
      if (bal > 0) {
        totalDue += bal;
        pendingShops++;
      } else {
        cleanShops++;
      }
    });

    const cntEl = document.getElementById('shop-stat-count');
    const dueEl = document.getElementById('shop-stat-due');
    const pendEl = document.getElementById('shop-stat-pending-shops');
    const cleanEl = document.getElementById('shop-stat-clean-shops');

    if (cntEl) cntEl.textContent = `${this.shops.length} Shops`;
    if (dueEl) dueEl.textContent = `Rs. ${Math.round(totalDue).toLocaleString()}`;
    if (pendEl) pendEl.textContent = `${pendingShops} Shops`;
    if (cleanEl) cleanEl.textContent = `${cleanShops} Shops`;
  },

  renderShopsList() {
    const container = document.getElementById('shops-list-container');
    const footer = document.getElementById('shops-list-footer');
    if (!container) return;

    if (this.filteredShops.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 font-bold text-xs">
          No shops found matching your search.
        </div>
      `;
      if (footer) {
        footer.innerHTML = `
          <div class="flex items-center justify-between w-full text-slate-400 font-bold text-[11px]">
            <span>Total: 0 Shops</span>
            <span>Rs. 0</span>
          </div>
        `;
      }
      return;
    }

    let totalAmount = 0;
    container.innerHTML = this.filteredShops.map((s, idx) => {
      const isSelected = s.id === this.selectedShopId;
      const bal = Number(s.amount) || 0;
      totalAmount += bal;
      return `
        <div onclick="Customers.selectShop(${s.id})"
             class="relative py-2.5 px-3 transition-all cursor-pointer flex items-center justify-between gap-3 border-b border-slate-100 ${isSelected ? 'bg-amber-500/10 font-bold' : 'hover:bg-slate-50'}">
          ${isSelected ? '<span class="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r shadow-xs"></span>' : ''}
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-6 h-6 rounded-lg ${isSelected ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-500 font-bold'} font-mono text-[11px] flex items-center justify-center shrink-0 border ${isSelected ? 'border-amber-400' : 'border-slate-200'}">
              ${idx + 1}
            </span>
            <div class="min-w-0">
              <h4 class="font-black text-xs text-slate-900 truncate">${s.name}</h4>
              <div class="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 leading-tight">
                <span>${s.owner_name || 'No Owner'}</span>
                <span>•</span>
                <span>${s.city || 'Wah Cantt'}</span>
              </div>
              ${s.phone ? `<div class="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">${window.app && app.formatPhone ? app.formatPhone(s.phone) : s.phone}</div>` : ''}
            </div>
          </div>

          <div class="text-right shrink-0">
            <span class="text-[10px] font-black uppercase text-slate-400 block">Balance</span>
            <span class="font-black text-xs tabular-nums ${bal > 0 ? 'text-rose-600' : 'text-emerald-700'}">
              Rs. ${Math.round(bal).toLocaleString()}
            </span>
          </div>
        </div>
      `;
    }).join('');

    if (footer) {
      footer.innerHTML = `
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-black uppercase text-slate-400">Total:</span>
          <span class="font-mono font-black text-xs text-slate-800 px-2 py-0.5 rounded-md bg-slate-200/80 border border-slate-300/60">${this.filteredShops.length} Shops</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-black uppercase text-slate-400 block leading-tight">Total Balance</span>
          <span class="font-black text-xs font-mono tabular-nums ${totalAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}">
            Rs. ${Math.round(totalAmount).toLocaleString()}
          </span>
        </div>
      `;
    }
  },

  async selectShop(id) {
    this.selectedShopId = id;
    this.renderShopsList();
    await this.renderShopDetail();
  },

  async renderShopDetail() {
    const panel = document.getElementById('shop-detail-panel');
    if (!panel) return;

    const shop = this.shops.find(s => s.id === this.selectedShopId);
    if (!shop) {
      panel.innerHTML = `
        <div class="p-12 text-center text-slate-400 font-bold flex flex-col items-center justify-center h-full">
          <i data-lucide="store" class="w-10 h-10 mb-2 opacity-30"></i>
          Select a shop from the list to view profile and khata ledger.
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Load ledger data
    let ledger = null;
    try {
      ledger = await window.api.getShopLedger(shop.id);
    } catch(e) {
      console.warn('Could not load ledger:', e);
    }
    this.activeLedger = ledger;

    const currentBal = Number(shop.amount) || 0;
    const entries = ledger ? ledger.entries : [];

    let totalCartons = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    entries.forEach(e => {
      const isDelivery = e.record_type === 'delivery';
      const isOpening = e.record_type === 'opening_balance';
      if (isDelivery) {
        totalCartons += Number(e.cartons_count) || 0;
        totalDebit += Number(e.total_amount) || 0;
        totalCredit += Number(e.received_amount) || 0;
      } else if (isOpening) {
        totalDebit += Number(e.total_amount) || 0;
      } else {
        totalCredit += Number(e.received_amount) || 0;
      }
    });

    panel.innerHTML = `
      <!-- Top Shop Profile & Quick Action Bar -->
      <div class="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-black text-base text-slate-900">${shop.name}</h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${currentBal > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}">
              ${currentBal > 0 ? 'Khata Due' : 'Balance Settled'}
            </span>
          </div>
          <p class="text-[11px] text-slate-500 font-medium mt-0.5">
            Owner: <strong>${shop.owner_name || 'N/A'}</strong> • Phone: <strong>${shop.phone ? (window.app && app.formatPhone ? app.formatPhone(shop.phone) : shop.phone) : 'N/A'}</strong> • Area: <strong>${shop.city || ''} ${shop.address || ''}</strong>
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          ${currentBal > 0 ? `
            <button type="button" onclick="Customers.openPaymentModal(${shop.id})"
                    class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
              <i data-lucide="hand-coins" class="w-3.5 h-3.5"></i> Receive Cash
            </button>
          ` : `
            <button type="button" disabled title="Khata balance is already Rs. 0 (all clear)"
                    class="px-3 py-1.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-not-allowed opacity-75">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> Balance Clear
            </button>
          `}
          <button type="button" onclick="Customers.printShopStatement(${shop.id})"
                  class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="printer" class="w-3.5 h-3.5 text-amber-400"></i> Print Khata
          </button>
          <button type="button" onclick="Customers.openShopModal(${shop.id})"
                  class="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Edit Shop Details">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="Customers.deleteShop(${shop.id}, '${shop.name}')"
                  class="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Delete Shop">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Outstanding Khata Banner -->
      <div class="p-3 px-4 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <i data-lucide="wallet" class="w-4 h-4 text-amber-600"></i>
          <span class="text-xs font-black text-amber-950">Current Outstanding Balance:</span>
        </div>
        <div class="font-black text-base ${currentBal > 0 ? 'text-rose-600' : 'text-emerald-700'} tabular-nums">
          Rs. ${Math.round(currentBal).toLocaleString()}
        </div>
      </div>

      <!-- Ledger Transactions Table -->
      <div class="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead class="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th class="py-2 px-2 text-center w-10 border-r border-slate-200 text-slate-400 font-black">#</th>
              <th class="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[95px]">Date</th>
              <th class="py-2 px-3 border-r border-slate-200">Ref / Invoice</th>
              <th class="py-2 px-3 border-r border-slate-200">Type &amp; Remarks</th>
              <th class="py-2 px-2 text-center border-r border-slate-200">Cartons</th>
              <th class="py-2 px-3 text-right border-r border-slate-200">Debit / Billed</th>
              <th class="py-2 px-3 text-right border-r border-slate-200">Credit / Paid</th>
              <th class="py-2 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${entries.length > 0 ? entries.map((e, idx) => {
              const isDelivery = e.record_type === 'delivery';
              const isOpening = e.record_type === 'opening_balance';
              return `
                <tr class="hover:bg-slate-50/70 transition-colors ${isOpening ? 'bg-amber-50/40' : ''}">
                  <td class="py-1.5 px-2 text-center text-slate-400 font-bold border-r border-slate-200 text-xs">${idx + 1}</td>
                  <td class="py-1.5 px-3 text-[11px] font-bold text-slate-600 border-r border-slate-200 whitespace-nowrap">${app.formatDateTime(e.date, e.created_at)}</td>
                  <td class="py-1.5 px-3 font-mono font-black text-slate-900 border-r border-slate-200">${e.invoice_no}</td>
                  <td class="py-1.5 px-3 border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isOpening ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      isDelivery ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }">
                      ${isOpening ? '🏛️ Starting Balance' : isDelivery ? '📦 Delivery Order' : '💵 Cash Received'}
                    </span>
                    <div class="text-[10px] text-slate-500 mt-0.5 leading-tight font-medium">
                      ${isOpening ? 'Opening balance recorded' : isDelivery ? (e.car_number ? `${e.car_number}${e.driver_name ? ` (${e.driver_name})` : ''}` : 'Direct Warehouse') : (e.notes ? e.notes : (e.payment_method ? `Paid via ${e.payment_method}` : 'Cash Payment'))}
                    </div>
                  </td>
                  <td class="py-1.5 px-2 text-center font-bold text-blue-700 border-r border-slate-200 text-xs">
                    ${isDelivery ? (e.cartons_count || 0) : '-'}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black ${isDelivery || isOpening ? 'text-slate-900' : 'text-slate-400'} text-xs tabular-nums border-r border-slate-200">
                    ${(isDelivery || isOpening) ? `Rs. ${Math.round(e.total_amount).toLocaleString()}` : '-'}
                  </td>
                  <td class="py-1.5 px-3 text-right font-black ${!isDelivery && !isOpening || e.received_amount > 0 ? 'text-emerald-700' : 'text-slate-400'} text-xs tabular-nums border-r border-slate-200">
                    ${isOpening ? '-' : `Rs. ${Math.round(e.received_amount).toLocaleString()}`}
                  </td>
                  <td class="py-1.5 px-3 text-center">
                    ${isOpening ? `
                      <button type="button" onclick="Customers.openShopModal(${shop.id})"
                              class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs mx-auto"
                              title="Edit Opening Balance (Shop Settings)">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                      </button>
                    ` : isDelivery ? `
                      <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="ShopSales.printDeliveryInvoice(${e.id})"
                                class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Print Delivery Bill (A5)">
                          <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="Proposals.openEditDeliveryModal(${e.id})"
                                class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Edit Delivery Order Details">
                          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="Proposals.deleteDeliveryOrder(${e.id}, '${e.invoice_no}')"
                                class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Delete Delivery Order">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    ` : `
                      <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="Customers.printPaymentReceipt(${e.id})"
                                class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Print Payment Receipt (A5)">
                          <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="Customers.openEditPaymentModal(${e.id})"
                                class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Edit Payment Receipt">
                          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="Customers.deletePayment(${e.id})"
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
                <td colspan="8" class="p-8 text-center text-slate-400 font-bold">
                  No delivery orders or payments recorded yet for this shop.
                </td>
              </tr>
            `}
          </tbody>
          ${entries.length > 0 ? `
            <tfoot class="sticky bottom-0 bg-slate-100/95 font-black text-slate-900 border-t-2 border-slate-300 shadow-sm z-10">
              <tr class="bg-slate-100/95 text-slate-900 border-t-2 border-slate-300">
                <td colspan="4" class="py-2.5 px-3 uppercase tracking-wider font-black text-[11px] border-r border-slate-200 text-left">
                  <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                    <span class="text-amber-700 font-black">TOTAL:</span>
                    <span>${entries.length} ${entries.length === 1 ? 'RECORD' : 'RECORDS'}</span>
                  </div>
                </td>
                <td class="py-2.5 px-2 text-center font-black text-xs text-blue-800 bg-blue-100/40 border-r border-slate-200 tabular-nums">
                  ${totalCartons}
                </td>
                <td class="py-2.5 px-3 text-right font-black text-slate-900 text-xs tabular-nums border-r border-slate-200">
                  Rs. ${Math.round(totalDebit).toLocaleString()}
                </td>
                <td class="py-2.5 px-3 text-right font-black text-emerald-700 text-xs tabular-nums border-r border-slate-200">
                  Rs. ${Math.round(totalCredit).toLocaleString()}
                </td>
                <td class="py-2.5 px-3 text-center text-slate-400 font-bold text-xs">—</td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  // Modal handlers
  openShopModal(shopId = null) {
    if (shopId) {
      app.authorizeAction(() => this._renderShopModal(shopId), 'editing shop');
    } else {
      this._renderShopModal(null);
    }
  },

  _renderShopModal(shopId = null) {
    const modal = document.getElementById('shop-edit-modal');
    const title = document.getElementById('shop-modal-title');
    const fId = document.getElementById('sf-id');
    const fName = document.getElementById('sf-name');
    const fOwner = document.getElementById('sf-owner');
    const fPhone = document.getElementById('sf-phone');
    const fAmount = document.getElementById('sf-amount');
    const fAddress = document.getElementById('sf-address');
    const fNotes = document.getElementById('sf-notes');

    if (shopId) {
      const s = this.shops.find(x => x.id === shopId);
      if (title) title.innerHTML = '<i data-lucide="store" class="w-4 h-4 text-amber-400"></i> Edit Shop Details';
      if (fId) fId.value = s.id;
      if (fName) fName.value = s.name || '';
      if (fOwner) fOwner.value = s.owner_name || '';
      if (fPhone) fPhone.value = s.phone || '';
      if (fAmount) fAmount.value = s.opening_balance !== undefined && s.opening_balance !== null ? s.opening_balance : (s.amount || 0);
      if (fAddress) fAddress.value = s.address || s.city || '';
      if (fNotes) fNotes.value = s.notes || '';
    } else {
      if (title) title.innerHTML = '<i data-lucide="store" class="w-4 h-4 text-amber-400"></i> Add New Shop';
      if (fId) fId.value = '';
      if (fName) fName.value = '';
      if (fOwner) fOwner.value = '';
      if (fPhone) fPhone.value = '';
      if (fAmount) fAmount.value = '0';
      if (fAddress) fAddress.value = '';
      if (fNotes) fNotes.value = '';
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (window.lucide) lucide.createIcons();
  },

  closeShopModal() {
    const modal = document.getElementById('shop-edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  async saveShopForm(e) {
    e.preventDefault();
    try {
      app.showLoading();
      const id = document.getElementById('sf-id')?.value;
      const phone = document.getElementById('sf-phone')?.value?.trim();
      if (!phone) {
        app.showAlert({ title: 'Phone Required', message: 'Please enter a valid phone number for the shop.' });
        return;
      }
      const existingShop = id ? this.shops.find(x => x.id === Number(id)) : null;
      const openingBal = Number(document.getElementById('sf-amount')?.value) || 0;
      const addressVal = document.getElementById('sf-address')?.value?.trim() || '';
      const data = {
        name: document.getElementById('sf-name')?.value?.trim(),
        owner_name: document.getElementById('sf-owner')?.value?.trim() || '',
        phone: phone,
        city: addressVal ? addressVal.split(',')[0].trim() : (existingShop?.city || 'Hasan Abdal'),
        opening_balance: openingBal,
        amount: openingBal,
        address: addressVal,
        notes: document.getElementById('sf-notes')?.value?.trim() || ''
      };
      if (id) data.id = Number(id);

      const savedId = await window.api.saveShop(data);
      this.closeShopModal();
      this.selectedShopId = id ? Number(id) : savedId;
      await this.loadData();
      app.showAlert({ title: 'Saved', message: 'Shop information updated successfully.' });
    } catch(err) {
      app.showAlert({ title: 'Error', message: err.message });
    } finally {
      app.hideLoading();
    }
  },

  async deleteShop(id, name) {
    app.authorizeAction(() => {
      app.showConfirm({
        title: 'Delete Shop?',
        message: `Are you sure you want to delete shop "${name}"?`,
        confirmText: 'Yes, Delete',
        confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white',
        onConfirm: async () => {
          try {
            app.showLoading();
            await window.api.deleteShop(id);
            this.selectedShopId = null;
            await this.loadData();
            app.showAlert({ title: 'Deleted', message: `Shop "${name}" removed.` });
          } catch(e) {
            app.showAlert({ title: 'Error', message: e.message });
          } finally {
            app.hideLoading();
          }
        }
      });
    }, 'deleting shop');
  },

  // Payment Modal
  openPaymentModal(shopId) {
    const shop = this.shops.find(s => s.id === shopId);
    if (!shop) return;

    this.activePaymentShop = shop;
    const currentBalance = Number(shop.amount) || 0;

    const modal = document.getElementById('shop-payment-modal');
    const sId = document.getElementById('pf-shop-id');
    const sName = document.getElementById('pf-shop-name');
    const sBal = document.getElementById('pf-current-balance');
    const sAmt = document.getElementById('pf-amount');
    const sDate = document.getElementById('pf-date');
    const sMaxHint = document.getElementById('pf-max-hint');

    if (sId) sId.value = shop.id;
    if (sName) sName.textContent = shop.name;
    if (sBal) sBal.textContent = `Rs. ${Math.round(currentBalance).toLocaleString()}`;
    if (sDate) sDate.value = new Date().toISOString().split('T')[0];
    if (sMaxHint) sMaxHint.textContent = `Max: Rs. ${Math.round(currentBalance).toLocaleString()}`;

    if (sAmt) {
      sAmt.max = currentBalance;
      sAmt.value = currentBalance > 0 ? currentBalance : '';
      sAmt.disabled = currentBalance <= 0;
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    this.onPaymentAmountInput(sAmt ? sAmt.value : 0);

    if (window.lucide) lucide.createIcons();
  },

  onPaymentAmountInput(val) {
    const shop = this.activePaymentShop;
    const currentBalance = shop ? Number(shop.amount) || 0 : 0;
    const amount = Number(val) || 0;
    const sAmt = document.getElementById('pf-amount');
    const errText = document.getElementById('pf-amount-error');
    const submitBtn = document.getElementById('pf-submit-btn');

    if (currentBalance <= 0) {
      if (errText) {
        errText.textContent = 'This shop has no outstanding balance in khata (Rs. 0).';
        errText.classList.remove('hidden');
      }
      if (sAmt) {
        sAmt.className = "w-full px-3 py-2 text-base font-black text-slate-900 bg-slate-100 border-2 border-slate-300 rounded-xl outline-none tabular-nums";
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.className = "px-5 py-2 bg-slate-200 text-slate-400 font-black text-xs rounded-xl shadow-xs cursor-not-allowed flex items-center gap-1.5 opacity-60";
      }
      return;
    }

    if (amount > currentBalance) {
      if (errText) {
        errText.textContent = `Received payment cannot be more than khata balance of Rs. ${Math.round(currentBalance).toLocaleString()}`;
        errText.classList.remove('hidden');
      }
      if (sAmt) {
        sAmt.className = "w-full px-3 py-2 text-base font-black text-rose-700 bg-rose-50 border-2 border-rose-500 rounded-xl outline-none focus:ring-2 focus:ring-rose-200 tabular-nums";
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.className = "px-5 py-2 bg-slate-200 text-slate-400 font-black text-xs rounded-xl shadow-xs cursor-not-allowed flex items-center gap-1.5 opacity-60";
      }
    } else if (amount <= 0) {
      if (errText) {
        errText.textContent = 'Please enter an amount greater than Rs. 0';
        errText.classList.remove('hidden');
      }
      if (sAmt) {
        sAmt.className = "w-full px-3 py-2 text-base font-black text-slate-900 bg-white border-2 border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200 tabular-nums";
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.className = "px-5 py-2 bg-slate-200 text-slate-400 font-black text-xs rounded-xl shadow-xs cursor-not-allowed flex items-center gap-1.5 opacity-60";
      }
    } else {
      if (errText) {
        errText.textContent = '';
        errText.classList.add('hidden');
      }
      if (sAmt) {
        sAmt.className = "w-full px-3 py-2 text-base font-black text-slate-900 bg-white border-2 border-emerald-400 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200 tabular-nums";
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.className = "px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all";
      }
    }
  },

  closePaymentModal() {
    const modal = document.getElementById('shop-payment-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  async savePaymentForm(e) {
    e.preventDefault();
    try {
      const shopId = Number(document.getElementById('pf-shop-id')?.value);
      const amount = Number(document.getElementById('pf-amount')?.value);
      const shop = this.shops.find(s => s.id === shopId) || this.activePaymentShop;
      const currentBalance = shop ? Number(shop.amount) || 0 : 0;

      if (currentBalance <= 0) {
        app.showAlert({ title: 'No Balance', message: 'This shop has no outstanding khata balance to receive payment for.' });
        return;
      }

      if (amount > currentBalance) {
        app.showAlert({
          title: 'Amount Exceeds Khata Balance',
          message: `Received payment (Rs. ${amount.toLocaleString()}) cannot be more than the balance in shop's khata (Rs. ${currentBalance.toLocaleString()}).`
        });
        return;
      }

      if (amount <= 0) {
        app.showAlert({ title: 'Invalid Amount', message: 'Payment amount must be greater than Rs. 0' });
        return;
      }

      app.showLoading();
      const paymentMethod = document.getElementById('pf-method')?.value || 'Cash';
      const date = document.getElementById('pf-date')?.value || new Date().toISOString().split('T')[0];
      const notes = document.getElementById('pf-notes')?.value || '';

      const res = await window.api.receiveShopPayment({
        shop_id: shopId,
        amount,
        payment_method: paymentMethod,
        date,
        notes
      });

      if (res && res.error) {
        app.showAlert({ title: 'Error', message: res.error });
        return;
      }

      this.closePaymentModal();
      await this.loadData();

      // Print A5 Payment Voucher Receipt
      this.printPaymentVoucherReceipt(res);

    } catch(err) {
      app.showAlert({ title: 'Error', message: err.message });
    } finally {
      app.hideLoading();
    }
  },

  // -------------------------------------------------------------
  // PRINT A5 KHATA STATEMENT & PAYMENT VOUCHERS
  // -------------------------------------------------------------
  async printShopStatement(shopId) {
    const shop = this.shops.find(s => s.id === shopId);
    if (!shop) return;

    const ledger = await window.api.getShopLedger(shopId);
    const settings = await window.api.getSettings() || {};
    const entries = ledger ? ledger.entries : [];

    let totalBilled = 0;
    let totalPaid = 0;
    entries.forEach(e => {
      if (e.record_type === 'delivery' || e.record_type === 'opening_balance') totalBilled += (e.total_amount || 0);
      totalPaid += (e.received_amount || 0);
    });

    const html = `
      <div class="a5-container">
        <div class="a5-header" style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <div class="a5-title" style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000;">${settings.company_name || 'DELICIOUS SUPERSTAR FOODS'}</div>
          <div class="a5-subtitle" style="font-size: 9px; font-weight: 500; color: #000; margin-top: 1px;">${settings.address || 'Hasan Abdal'} • Phone: ${settings.phone || '0315-6795995'}</div>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          SHOP KHATA ACCOUNT STATEMENT
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; border: 1px solid #000; padding: 5px 8px; background: #fff; color: #000;">
          <div style="line-height: 1.45;">
            <div><strong>Shop Name:</strong> <span style="font-weight: 800;">${shop.name}</span></div>
            <div><strong>Owner / Contact:</strong> ${shop.owner_name || 'N/A'} • ${shop.phone || 'N/A'}</div>
            <div><strong>Area / Address:</strong> ${shop.city || ''} ${shop.address || ''}</div>
          </div>
          <div style="text-align: right; line-height: 1.45;">
            <div><strong>Statement Date:</strong> ${app.formatDateTime(new Date())}</div>
            <div><strong>Total Transactions:</strong> ${entries.length} Records</div>
            <div style="font-size: 11px; font-weight: 900; color: #000; margin-top: 2px;">
              Outstanding Balance: Rs. ${Math.round(shop.amount || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Date</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Ref / Inv #</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Type / Description</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 45px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Ctns</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Debit Billed (Rs.)</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Credit Paid (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e => {
              const isDelivery = e.record_type === 'delivery';
              const isOpening = e.record_type === 'opening_balance';
              let desc = 'Cash Payment Received';
              if (isDelivery) desc = `Delivery (${e.car_number || 'Van'})`;
              else if (isOpening) desc = 'Starting Balance (Opening Khata)';
              return `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000; white-space: nowrap;">${app.formatDateTime(e.date, e.created_at)}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; font-weight: 700; font-family: -apple-system, monospace; color: #000;">${e.invoice_no}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000;">${desc}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9.5px; color: #000;">${isDelivery ? (e.cartons_count || 0) : '-'}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 700; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">${(isDelivery || isOpening) ? `Rs. ${Math.round(e.total_amount).toLocaleString()}` : '-'}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 700; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">${!isOpening ? `Rs. ${Math.round(e.received_amount).toLocaleString()}` : '-'}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="a5-summary-box" style="border: 1.5px solid #000; padding: 5px 8px; margin-top: 6px; font-size: 9.5px; background: #fff; color: #000;">
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 1.5px 0;">
            <span>Total Goods Billed (Debits):</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">Rs. ${Math.round(totalBilled).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; padding: 1.5px 0;">
            <span>Total Payments Received (Credits):</span>
            <span style="font-weight: 800; font-family: -apple-system, monospace;">Rs. ${Math.round(totalPaid).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row a5-total" style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; padding-top: 3px; margin-top: 2px; font-weight: 900; font-size: 10.5px;">
            <span>Current Outstanding Khata Balance:</span>
            <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(shop.amount || 0).toLocaleString()}</span>
          </div>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Shop Owner Signature</div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Factory Accountant</div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Khata Statement - ${shop.name}`);
  },

  async printPaymentReceipt(paymentId) {
    // Look up in ledger
    const shop = this.shops.find(s => s.id === this.selectedShopId);
    const ledger = this.activeLedger || await window.api.getShopLedger(shop.id);
    const entry = ledger?.entries?.find(e => e.id === paymentId && e.record_type === 'payment');
    if (!entry) return;

    this.printPaymentVoucherReceipt({
      receipt_no: entry.invoice_no,
      date: entry.date,
      shop_name: shop.name,
      amount_paid: entry.received_amount,
      payment_method: entry.payment_method || 'Cash',
      notes: entry.notes || '',
      new_balance: shop.amount || 0
    });
  },

  async printPaymentVoucherReceipt(data) {
    const settings = await window.api.getSettings() || {};

    const html = `
      <div class="a5-container">
        <div class="a5-header" style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <div class="a5-title" style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000;">${settings.company_name || 'DELICIOUS SUPERSTAR FOODS'}</div>
          <div class="a5-subtitle" style="font-size: 9px; font-weight: 500; color: #000; margin-top: 1px;">${settings.address || 'Hasan Abdal'} • Phone: ${settings.phone || '0315-6795995'}</div>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          OFFICIAL CASH PAYMENT RECEIPT VOUCHER
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; border: 1px solid #000; padding: 5px 8px; background: #fff; color: #000;">
          <div style="line-height: 1.45;">
            <div><strong>Receipt No:</strong> <span style="font-family: -apple-system, monospace; font-weight: 800;">${data.receipt_no}</span></div>
            <div><strong>Received From:</strong> <span style="font-weight: 800;">${data.shop_name}</span></div>
          </div>
          <div style="text-align: right; line-height: 1.45;">
            <div><strong>Payment Date &amp; Time:</strong> ${app.formatDateTime(data.date, data.created_at)}</div>
            <div><strong>Payment Mode:</strong> ${data.payment_method}</div>
          </div>
        </div>

        <div class="a5-summary-box" style="margin-top: 12px; border: 1.5px solid #000; padding: 8px 10px; font-size: 10px; background: #fff; color: #000;">
          <div class="a5-summary-row a5-total" style="font-size: 13px; font-weight: 900; color: #000; display: flex; justify-content: space-between;">
            <span>Amount Received:</span>
            <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(data.amount_paid).toLocaleString()}</span>
          </div>
          <div class="a5-summary-row" style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; font-weight: 700; color: #000;">
            <span>Remaining Khata Balance:</span>
            <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(data.new_balance).toLocaleString()}</span>
          </div>
          ${data.notes ? `
            <div class="a5-summary-row" style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 9.5px; color: #000;">
              <span>Remarks / Notes:</span>
              <span>${data.notes}</span>
            </div>
          ` : ''}
        </div>

        <div style="margin-top: 25px; font-size: 9px; color: #000; text-align: center; border-top: 1px dotted #000; padding-top: 6px; font-weight: 500;">
          Thank you for your payment. This voucher is an official computer-generated receipt.
        </div>

        <div class="a5-signatures" style="margin-top: 45px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Payer / Shopkeeper</div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Authorized Collector</div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Cash Receipt - ${data.receipt_no}`);
  },

  openEditPaymentModal(paymentId) {
    const shop = (this.shops || []).find(s => s.id === this.selectedShopId) || {};
    const ledger = this.activeLedger;
    const pay = ledger?.entries?.find(e => e.id === Number(paymentId) && e.record_type === 'payment');
    if (!pay) return app.showAlert({ title: 'Error', message: 'Payment record not found.' });

    const rawDate = pay.date ? pay.date.split(' ')[0] : new Date().toISOString().split('T')[0];
    const currentMethod = (pay.payment_method || 'Cash').toLowerCase().includes('online') ? 'Online' : 'Cash';

    const content = `
      <form onsubmit="Customers.saveEditedPayment(event, ${pay.id})" class="space-y-4">
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span>Shop: <strong class="text-slate-800">${shop.name || 'Customer'}</strong></span>
            <span>Receipt: <strong class="text-slate-800 font-mono">${pay.invoice_no || ('PAY-' + pay.id)}</strong></span>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
            <span>Amount Received: <strong class="text-emerald-700">Rs. ${Number(pay.received_amount || 0).toLocaleString()}</strong></span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Payment Date</label>
            <input type="date" id="edit-shop-pay-date" value="${rawDate}" required
                   class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-emerald-500 bg-white">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
            <select id="edit-shop-pay-method" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-emerald-500 bg-white">
              <option value="Cash" ${currentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
              <option value="Online" ${currentMethod === 'Online' ? 'selected' : ''}>Online</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Notes / Remarks</label>
          <input type="text" id="edit-shop-pay-notes" value="${pay.notes || ''}"
                 placeholder="Collected by driver, cheque #, online transaction ID..."
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
      title: `Edit Payment Receipt #${pay.invoice_no || pay.id}`,
      content,
      maxWidth: 'max-w-md'
    });
  },

  async saveEditedPayment(e, paymentId) {
    e.preventDefault();
    const date = document.getElementById('edit-shop-pay-date')?.value;
    const payment_method = document.getElementById('edit-shop-pay-method')?.value || 'Cash';
    const notes = document.getElementById('edit-shop-pay-notes')?.value || '';

    try {
      app.showLoading();
      const res = await window.api.updateShopPayment(paymentId, { date, payment_method, notes });
      if (res && res.error) {
        app.showAlert({ title: 'Error', message: res.error });
        return;
      }
      app.closeModal();
      await this.loadData();
      if (this.selectedShopId) this.selectShop(this.selectedShopId);
      app.showAlert({ title: 'Updated', message: 'Shop payment details updated successfully.' });
    } catch (err) {
      app.showAlert({ title: 'Error', message: err.message });
    } finally {
      app.hideLoading();
    }
  },

  async deletePayment(paymentId) {
    if (window.app && typeof app.checkActionPassword === 'function') {
      const allowed = await app.checkActionPassword('Delete Shop Payment');
      if (!allowed) return;
    }

    const ok = await new Promise(resolve => {
      app.showConfirm({
        title: 'Delete Shop Payment?',
        message: 'Are you sure you want to delete this payment record?<br><br><span class="text-rose-600 font-bold">This will add the payment amount back to the shop\'s outstanding khata balance!</span>',
        confirmText: 'Yes, Revert Payment',
        confirmColor: 'red',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (ok) {
      try {
        app.showLoading();
        const res = await window.api.deleteShopPayment(paymentId);
        if (res && res.success) {
          app.showToast('Payment deleted and shop khata balance reverted', 'success');
          await this.loadData();
          if (this.selectedShopId) this.selectShop(this.selectedShopId);
        } else {
          app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to revert payment.' });
        }
      } catch (err) {
        app.showAlert({ title: 'Error', message: err.message });
      } finally {
        app.hideLoading();
      }
    }
  }
};
