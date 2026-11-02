window.SalesForm = {
  cart: [],
  availableItems: [],
  searchResults: [],
  highlightedSearchIndex: 0,
  customerSearchResults: [],
  highlightedCustomerIndex: 0,
  settings: {},
  categoryLabels: [],
  discountType: 'flat',
  editingSaleId: null,
  customers: [],
  customerId: null,
  customerName: '',
  customerPhone: '',
  customerBalance: 0,
  paymentMethod: 'Cash',
  additionalDiscount: 0,
  receivedAmount: 0,
  isReceivedManuallyEdited: false,

  getCategoryName(item) {
    if (!item) return '';
    const slug = (item.slug || item.section || item.category || '').toLowerCase();
    const solarKeywords = ['panels', 'inverters', 'structures', 'cables', 'breakers', 'batteries', 'misc', 'others', 'solar'];
    
    if (this.categoryLabels && this.categoryLabels.length > 0) {
      const match = this.categoryLabels.find(l => (l.slug || '').toLowerCase() === slug);
      if (match && match.label) return match.label;
    }
    const rawCat = (item.category_label || item.category_name || '').trim();
    if (rawCat && !solarKeywords.includes(rawCat.toLowerCase())) {
      return rawCat;
    }
    const catMap = {
      panels: 'Biscuits',
      inverters: 'Cold Drinks',
      structures: 'Jellies & Candies',
      cables: 'Snacks & Chips',
      breakers: 'Chocolates',
      batteries: 'Dairy & Groceries',
      misc: 'Juices & Beverages',
      others: 'General Items'
    };
    return catMap[slug] || (rawCat || (slug ? slug.toUpperCase() : ''));
  },

  async render(container, args) {
    this.settings = await window.api.getSettings();
    this.customers = await window.api.getCustomers() || [];
    this.categoryLabels = await window.api.getCategoryLabels() || [];
    this.paymentMethod = 'Cash';
    this.cart = [];
    this.searchResults = [];
    this.highlightedSearchIndex = 0;
    this.customerSearchResults = [];
    this.highlightedCustomerIndex = 0;
    this.isReceivedManuallyEdited = false;
    this.cashTendered = '';
    this.lastCalculatedGrandTotal = 0;
    
    // Fetch all items for instant client-side searching
    this.availableItems = await window.api.searchAllProducts('');

    // Disable parent scrolling for this page to keep our custom layout stable
    container.style.overflow = 'hidden';
    container.style.height = '100vh';
    
    this.editingSaleId = args?.id || null;
    this.originalTotal = 0;
    this.alreadyReceived = 0;
    this.originalItemsMap = {};
    this.customerId = null;
    this.customerName = '';
    this.customerPhone = '';
    this.customerBalance = 0;

    const savedDiscEnabled = window.storage ? window.storage.get('disc_enabled') : null;
    const savedDiscType = window.storage ? window.storage.get('disc_type') : null;
    const savedDiscValue = window.storage ? window.storage.get('disc_value') : null;
    this.isDiscountEnabled = savedDiscEnabled !== null ? Boolean(savedDiscEnabled) : false;
    this.discountType = savedDiscType || 'flat';
    this.additionalDiscount = (savedDiscValue !== null && savedDiscValue !== undefined) ? savedDiscValue : '';

    const savedTaxEnabled = window.storage ? window.storage.get('tax_enabled') : null;
    const savedTaxPercent = window.storage ? window.storage.get('tax_percent') : null;
    this.taxPercent = savedTaxPercent !== null ? parseFloat(savedTaxPercent) : 2;
    this.isTaxEnabled = savedTaxEnabled !== null ? Boolean(savedTaxEnabled) : false;
    
    if (this.editingSaleId) {
      const sale = await window.api.getProposal(this.editingSaleId);
      if (sale) {
        this.originalItemsMap = {};
        if (sale.items) {
          sale.items.forEach(it => {
            const key = `${it.section}-${it.item_id}`;
            this.originalItemsMap[key] = (this.originalItemsMap[key] || 0) + (it.qty || 0);
          });
        }
        this.originalTotal = sale.retail_total;
        this.alreadyReceived = sale.received_amount !== undefined ? sale.received_amount : (sale.retail_total || 0);
        this.taxPercent = (sale.tax_percent !== undefined && sale.tax_percent !== null && sale.tax_percent > 0) ? sale.tax_percent : (savedTaxPercent !== null ? parseFloat(savedTaxPercent) : 0.5);
        this.isTaxEnabled = (sale.tax_percent > 0 || (sale.tax_amount !== undefined && sale.tax_amount > 0));
        this.cart = sale.items.map(item => ({
          id: item.item_id,
          description: item.description,
          item_name: item.description.split(' - ')[0],
          retail_price: item.unit_retail,
          original_retail_price: item.unit_retail,
          cost_price: item.unit_cost,
          qty: item.qty,
          slug: item.section,
          unit: item.unit || 'pcs',
          discount: (item.unit_retail - (item.unit_discounted || item.unit_retail)) || '',
          discountType: 'flat'
        }));
        this.customerName = sale.customer_name || sale.shop_name || '';
        this.customerPhone = sale.phone || '';
        this.saleNumber = sale.proposal_number;
        this.receivedAmount = this.alreadyReceived;
        this.isReceivedManuallyEdited = (this.receivedAmount !== sale.retail_total);
        
        const matchedCust = this.customers.find(c => c.name.toLowerCase() === this.customerName.toLowerCase() || (this.customerPhone && c.phone === this.customerPhone));
        if (matchedCust) {
          this.customerId = matchedCust.id;
          this.customerBalance = matchedCust.amount || 0;
        }

        const itemDiscountSum = sale.items.reduce((sum, item) => {
          return sum + ((item.unit_retail - (item.unit_discounted || item.unit_retail)) * item.qty);
        }, 0);
        this.additionalDiscount = (sale.discount || 0) - itemDiscountSum;
        if (this.additionalDiscount < 0) this.additionalDiscount = 0;
        if (sale.payment_method) this.paymentMethod = sale.payment_method;
      }
    } else {
      this.originalItemsMap = {};
      this.additionalDiscount = 0;
      this.saleNumber = await window.api.getNextProposalNumber();
      this.customerName = '';
      this.customerPhone = '';
      this.customerId = null;
      this.customerBalance = 0;
      this.receivedAmount = 0;
    }

    container.innerHTML = `
      <div class="flex flex-col h-full bg-slate-100 overflow-hidden select-none" id="sales-form-root">
        
        <!-- Top Status Bar & Invoice Header -->
        <div class="bg-slate-900 text-white px-5 py-2.5 flex justify-between items-center shrink-0 shadow-md flex-wrap gap-2">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2.5">
              <span class="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm"></span>
              <h2 class="text-xl font-black tracking-wide uppercase text-white flex items-center gap-2">
                ${this.editingSaleId ? `<span class="text-blue-400">EDIT INVOICE</span> #${this.saleNumber}` : (this.settings?.company_name || 'ISHAQ JADOON TRADERS').replace(/\s*\(Branch \d+\)/i, '').trim()}
                <span id="header-branch-badge" class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${app.activeBranch === 'b2' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
                  ${app.activeBranch === 'b2' ? 'BRANCH 2' : 'BRANCH 1'}
                </span>
              </h2>
            </div>
            <div class="h-4 w-[1px] bg-slate-700"></div>
            <div id="sf-live-clock" class="text-xs font-bold text-amber-400 font-display tabular-nums tracking-wide">
              Loading...
            </div>
          </div>

          <!-- Shortcut Keys Strip -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-slate-200 shadow-sm">
              <kbd class="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black shadow-sm">F1</kbd> Customer
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-slate-200 shadow-sm">
              <kbd class="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black shadow-sm">F2</kbd> Items Search
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-slate-200 shadow-sm">
              <kbd class="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black shadow-sm">F3</kbd> Received
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-slate-200 shadow-sm">
              <kbd class="px-1.5 py-0.5 rounded bg-sky-400 text-slate-950 font-mono text-[10px] font-black shadow-sm">F4</kbd> Cash Rec.
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-slate-200 shadow-sm">
              <kbd class="px-1.5 py-0.5 rounded bg-emerald-500 text-white font-mono text-[10px] font-black shadow-sm">F5</kbd> Complete
            </span>
            <button type="button" onclick="app.openPriceChecker()" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-600/80 text-[11px] font-bold text-amber-300 shadow-sm transition-all cursor-pointer" title="Quick Price Inquiry (Press F6)">
              <kbd class="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black shadow-sm">F6</kbd> Price Check
            </button>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-[11px] font-bold text-slate-200 shadow-sm">
              <kbd class="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-[10px] font-black border border-slate-600">ESC</kbd> Back
            </span>
          </div>
        </div>

        <!-- Main Body: Compact Customer & Quick Settings Header + Search Line + High-Speed Table -->
        <div class="flex-1 flex flex-col px-3.5 py-2 gap-2 min-h-0 overflow-hidden">
          
          <!-- Top Row: Customer Selection & 11-Digit Phone Number -->
          <div class="bg-white rounded-xl px-3 py-2 shadow-xs border border-slate-200/80 shrink-0">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              
              <!-- Customer Name Custom Dropdown Field -->
              <div class="md:col-span-7 relative" id="sf-customer-container">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5 flex items-center justify-between">
                  <span class="flex items-center gap-1.5">
                    Customer Name <span class="text-rose-500">*</span>
                    <kbd class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9px] font-black">Press F1 Key</kbd>
                  </span>
                  <div class="flex items-center gap-2">
                    <span id="sf-customer-balance-badge" class="${this.customerBalance > 0 ? '' : 'hidden'} px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black font-display">
                      Khata Due: Rs. ${app.formatAmount(this.customerBalance)}
                    </span>
                    <a href="javascript:void(0)" onclick="app.navigate('customers')" class="text-amber-600 hover:underline font-bold">Manage Khata</a>
                  </div>
                </label>
                <div class="relative flex items-center">
                  <i data-lucide="user" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none"></i>
                  <input type="text" 
                         id="sf-customer-name" 
                         autocomplete="off" 
                         oninput="SalesForm.handleCustomerInput(this.value)" 
                         onfocus="SalesForm.handleCustomerFocus()" 
                         onclick="SalesForm.handleCustomerFocus()" 
                         onkeydown="SalesForm.handleCustomerKeyDown(event)" 
                         value="${this.customerName || ''}" 
                         placeholder="Search or enter customer name..." 
                         ${this.customerId ? 'readonly' : ''} 
                         class="w-full pl-8 pr-8 py-1.5 ${this.customerId ? 'bg-amber-50/70 border-amber-300 font-black cursor-default text-slate-900 shadow-sm' : 'bg-slate-50 border-slate-200 font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100'} border rounded-xl text-xs outline-none transition-all">
                  
                  <button type="button" 
                          id="sf-customer-clear-btn" 
                          onclick="SalesForm.clearSelectedCustomer()" 
                          title="Clear and select another customer"
                          class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer ${this.customerName ? '' : 'hidden'}">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                  </button>
                </div>

                <!-- Custom Uniform Customer Dropdown -->
                <div id="sf-customer-dropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden hidden max-h-[280px] overflow-y-auto z-50">
                  <!-- Injected dynamically via renderCustomerDropdown() -->
                </div>
              </div>

              <!-- Contact Phone Number -->
              <div class="md:col-span-5 relative">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
                  Contact Phone
                </label>
                <div class="relative">
                  <i data-lucide="phone" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
                  <input type="text" 
                         id="sf-customer-phone" 
                         value="${this.customerPhone || ''}" 
                         placeholder="e.g. 03001234567" 
                         maxlength="11" 
                         inputmode="numeric" 
                         pattern="[0-9]*" 
                         oninput="SalesForm.onCustomerPhoneChange(this)" 
                         onfocus="SalesForm.handleCustomerPhoneFocus()" 
                         onclick="SalesForm.handleCustomerPhoneFocus()" 
                         ${this.customerId ? 'readonly' : ''} 
                         class="w-full pl-8 pr-2 py-1.5 ${this.customerId ? 'bg-slate-100/90 text-slate-700 font-black cursor-default border-slate-200' : 'bg-slate-50 text-slate-800 font-bold focus:bg-white focus:border-amber-500 border-slate-200'} border rounded-xl text-xs outline-none transition-all">
                </div>
              </div>

            </div>
          </div>

          <!-- Product Search Box with Instant 1-Letter Dropdown & Barcode Scanner Ready -->
          <div class="relative shrink-0 z-20" id="sf-search-container">
            <div class="relative bg-white rounded-xl shadow-xs border-2 border-amber-400 focus-within:ring-3 focus-within:ring-amber-100 transition-all">
              <i data-lucide="scan-barcode" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500"></i>
              <input type="text" 
                     id="sf-fast-item-search" 
                     autocomplete="off"
                     oninput="SalesForm.handleSearchInput(this.value)"
                     onfocus="SalesForm.handleSearchFocus()"
                     onclick="SalesForm.handleSearchFocus()"
                     onkeydown="SalesForm.handleSearchKeyDown(event)"
                     placeholder="Scan barcode with scanner or search item..." 
                     class="w-full pl-10 pr-48 py-2 bg-transparent text-slate-900 font-bold text-sm outline-none placeholder:text-slate-400">
              <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span class="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shadow-2xs select-none">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Scanner Ready
                </span>
                <button type="button" 
                        id="sf-item-search-clear-btn" 
                        onclick="SalesForm.clearSearchInput()" 
                        title="Clear search text"
                        class="w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
                <kbd class="px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9px] font-black shadow-2xs pointer-events-none select-none">F2</kbd>
              </div>
            </div>

            <!-- Autocomplete Dropdown List (Tight single-line rows) -->
            <div id="sf-search-dropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden hidden max-h-[420px] overflow-y-auto z-50">
              <!-- Injected dynamically via renderSearchDropdown() -->
            </div>
          </div>

          <!-- Cart Items Table: Full Width Fast Billing Grid -->
          <div class="flex-1 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col min-h-0">
            <div class="px-3 py-1.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <i data-lucide="shopping-cart" class="w-4 h-4 text-amber-500"></i>
                <h3 class="font-black text-sm text-slate-800 tracking-tight" id="sf-cart-header-title">Invoice Items (0)</h3>
              </div>
              
              <div class="flex items-center gap-2 flex-wrap">
                <!-- Clear Bill Button -->
                <button type="button" 
                        onclick="SalesForm.confirmClearForm()" 
                        class="px-2 py-0.5 text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer" 
                        title="Clear all added items and start a fresh bill">
                  <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                  <span>Clear Bill</span>
                </button>

                <!-- Invoice Number Field -->
                <div class="flex items-center gap-1.5 bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg shadow-xs">
                  <span class="text-slate-400 text-[10px] uppercase font-black tracking-wider">INV:</span>
                  <input type="text" id="sf-sale-number" value="${this.saleNumber}" class="w-16 bg-slate-50 border border-slate-200 text-slate-900 font-black text-xs uppercase tabular-nums focus:outline-none focus:border-amber-500 px-1 py-0.5 rounded-md text-center" title="Invoice Number">
                </div>

                <!-- Payment Method (Cash / Online) -->
                <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-xs">
                  <span class="text-xs font-bold text-slate-600">Method:</span>
                  <div class="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
                    <button type="button" id="btn-method-cash" onclick="SalesForm.setPaymentMethod('Cash')" class="px-2.5 py-0.5 text-[10px] font-black rounded transition-colors cursor-pointer ${this.paymentMethod === 'Cash' ? 'bg-slate-900 text-white shadow-xs hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}">CASH</button>
                    <button type="button" id="btn-method-online" onclick="SalesForm.setPaymentMethod('Online')" class="px-2.5 py-0.5 text-[10px] font-black rounded transition-colors cursor-pointer ${this.paymentMethod === 'Online' ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 hover:text-white' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-200/50'}">ONLINE</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table Header & Scrollable Body -->
            <div class="flex-1 overflow-y-auto custom-scrollbar">
              <table class="w-full text-left border-collapse" id="sf-cart-table">
                <thead class="bg-slate-100 sticky top-0 z-10 border-b border-slate-300 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th class="py-1 px-2 w-10 text-center border-r border-slate-300">#</th>
                    <th class="py-1 px-3 border-r border-slate-300">Item Description</th>
                    <th class="py-1 px-2 w-28 text-center border-r border-slate-300">Qty</th>
                    <th class="py-1 px-2 w-28 text-right border-r border-slate-300">Rate (Rs.)</th>
                    <th class="py-1 px-2 w-32 text-center border-r border-slate-300">Discount</th>
                    <th class="py-1 px-3 w-28 text-right border-r border-slate-300">Line Total</th>
                    <th class="py-1 px-2 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody id="sf-cart-tbody" class="divide-y divide-slate-200 border-b border-slate-200">
                  <!-- Injected via renderCart() -->
                </tbody>
              </table>
              <div id="sf-cart-empty-state" class="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                  <i data-lucide="scan-barcode" class="w-8 h-8"></i>
                </div>
                <p class="font-bold text-slate-700 text-sm">No items in cart</p>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">Type any letter in the search box above to instantly search and press <kbd class="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[11px]">Enter</kbd> to add items.</p>
              </div>
            </div>
          </div>

          <!-- Bottom Bar: Totals, Discounts, Partial/Received Amount & Complete Sale -->
          <div class="bg-white rounded-xl px-3 py-2 shadow-xs border border-slate-200/80 shrink-0">
            <div class="flex flex-wrap items-center justify-between gap-2.5">
              
              <!-- Left side: Additional Discount, Adv Tax & Summary Breakdown -->
              <div class="flex items-center gap-2.5 flex-wrap">

                <!-- Additional Discount Input (With Checkbox to show/hide) -->
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 transition-all">
                  <label class="flex items-center gap-1.5 cursor-pointer select-none" title="Enable additional discount on bill">
                    <input type="checkbox" 
                           id="sf-disc-enable" 
                           ${this.isDiscountEnabled ? 'checked' : ''} 
                           onchange="SalesForm.toggleDiscountEnable(this.checked)" 
                           class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 accent-amber-600 cursor-pointer">
                    <span class="text-xs font-bold text-slate-600">Disc:</span>
                  </label>
                  <div id="sf-disc-controls" class="${this.isDiscountEnabled ? 'flex' : 'hidden'} items-center gap-1.5">
                    <div class="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300/80">
                      <button type="button" id="btn-disc-flat" onclick="SalesForm.toggleDiscountType('flat')" class="px-2 py-0.5 text-[10px] font-black rounded ${this.discountType === 'flat' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}">RS.</button>
                      <button type="button" id="btn-disc-pct" onclick="SalesForm.toggleDiscountType('percent')" class="px-2 py-0.5 text-[10px] font-black rounded ${this.discountType === 'percent' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}">%</button>
                    </div>
                    <input type="number" 
                           id="sf-additional-discount" 
                           value="${this.additionalDiscount || ''}" 
                           placeholder="0" 
                           oninput="SalesForm.onAdditionalDiscountInput(this.value)" 
                           min="0" 
                           step="any" 
                           class="w-16 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-right font-black text-slate-900 focus:border-amber-500 outline-none">
                  </div>
                </div>

                <!-- Adv Tax Input (With Checkbox to show/hide) -->
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 transition-all">
                  <label class="flex items-center gap-1.5 cursor-pointer select-none" title="Include tax in bill">
                    <input type="checkbox" 
                           id="sf-tax-enable" 
                           ${this.isTaxEnabled ? 'checked' : ''} 
                           onchange="SalesForm.toggleTaxEnable(this.checked)" 
                           class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 accent-amber-600 cursor-pointer">
                    <span class="text-xs font-bold text-slate-600">Tax:</span>
                  </label>
                  <div id="sf-tax-controls" class="${this.isTaxEnabled ? 'flex' : 'hidden'} items-center gap-1">
                    <input type="number" 
                           id="sf-tax-percent" 
                           value="${this.taxPercent !== undefined ? this.taxPercent : 2}" 
                           placeholder="2" 
                           oninput="SalesForm.onTaxPercentInput()" 
                           min="0" 
                           step="any" 
                           class="w-14 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-center font-black text-slate-900 focus:border-amber-500 outline-none">
                    <span class="text-xs font-black text-slate-500">%</span>
                  </div>
                </div>

                <!-- Received Amount (Partial / Full payment) -->
                <div class="flex items-center gap-1.5 bg-amber-50/70 border border-amber-300/80 rounded-lg px-2.5 py-1">
                  <span class="text-xs font-black text-amber-900 flex items-center gap-1">
                    Received (Rs.):
                    <kbd class="px-1 py-0.2 rounded bg-amber-200/90 text-amber-950 font-mono text-[9px] font-black border border-amber-300">F3</kbd>
                  </span>
                  <input type="number" 
                         id="sf-received-amount" 
                         value="${this.receivedAmount || ''}" 
                         placeholder="0" 
                         oninput="SalesForm.onReceivedInput(this.value)" 
                         min="0" 
                         step="any" 
                         class="w-28 bg-white border border-amber-300 rounded-md px-2 py-0.5 text-xs text-right font-black text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-display">
                </div>

                <!-- Cash Rec. (Quick Calculator for Customer Cash Handed & Change Return) -->
                <div class="flex items-center gap-1.5 bg-sky-50/80 border border-sky-300/90 rounded-lg px-2 py-1 shadow-2xs">
                  <span class="text-xs font-black text-sky-950 flex items-center gap-1">
                    Cash Rec.:
                    <kbd class="px-1 py-0.2 rounded bg-sky-200/90 text-sky-950 font-mono text-[9px] font-black border border-sky-300">F4</kbd>
                  </span>
                  <input type="number" 
                         id="sf-cash-tendered" 
                         value="${this.cashTendered || ''}" 
                         placeholder="0" 
                         oninput="SalesForm.onCashTenderedInput(this.value)" 
                         min="0" 
                         step="any" 
                         class="w-24 bg-white border border-sky-300 rounded-md px-2 py-0.5 text-xs text-right font-black text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-display"
                         title="Enter total cash given by customer to quickly calculate return change (Press F4)">
                  <span id="sf-return-change-badge" class="hidden text-xs font-black px-1.5 py-0.2 rounded-md bg-emerald-600 text-white font-display shadow-2xs tabular-nums"></span>
                </div>

                <!-- Subtotal, Discounts and Tax text -->
                <div class="flex items-center gap-2.5 text-xs font-bold text-slate-500 pl-1 border-l border-slate-200">
                  <div>Subtotal: <span class="text-slate-800 font-black" id="sf-subtotal">Rs. 0</span></div>
                  <div>Disc: <span class="text-rose-500 font-black" id="sf-discount-amount">- Rs. 0</span></div>
                  <div id="sf-tax-breakdown-row" class="${this.isTaxEnabled ? '' : 'hidden'}">Tax: <span class="text-amber-600 font-black" id="sf-tax-amount">+ Rs. 0</span></div>
                </div>
              </div>

              <!-- Right side: Grand Total, Khata Due / Change & Checkout Action Buttons -->
              <div class="flex items-center gap-3 ml-auto">
                <div class="text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight">Total</span>
                    <span id="sf-payment-status-badge" class="hidden text-[10px] font-black px-1.5 py-0.5 rounded-md"></span>
                  </div>
                  <span class="text-2xl font-black text-emerald-600 font-display tabular-nums leading-tight block" id="sf-grand-total">Rs. 0</span>
                  <div id="sf-khata-due-msg" class="text-[11px] font-black text-rose-600 font-display hidden">
                    Remaining to Khata: Rs. 0
                  </div>
                  <div id="sf-change-msg" class="text-[11px] font-black text-emerald-600 font-display hidden">
                    Change: Rs. 0
                  </div>
                </div>

                ${this.editingSaleId ? `
                  <button type="button" onclick="app.navigate('proposals')" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
                    <i data-lucide="x" class="w-4 h-4"></i>
                    Cancel
                  </button>
                  <button type="button" 
                          id="sf-save-btn"
                          onclick="SalesForm.completeSale(false)" 
                          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer">
                    <i data-lucide="save" class="w-4 h-4 text-emerald-400"></i>
                    <span>SAVE</span>
                  </button>
                  <button type="button" 
                          id="sf-complete-btn"
                          onclick="SalesForm.completeSale(true)" 
                          class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer">
                    <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i>
                    <span>SAVE & PRINT (F5)</span>
                  </button>
                ` : `
                  <button type="button" 
                          id="sf-complete-btn"
                          onclick="SalesForm.completeSale(true)" 
                          class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm flex items-center gap-2.5 shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer">
                    <i data-lucide="check-circle" class="w-5 h-5 text-amber-400"></i>
                    <span>COMPLETE & PRINT (F5)</span>
                  </button>
                `}
              </div>

            </div>
          </div>

        </div>
      </div>
    `;

    this.renderCart();
    this.updateSummary();
    this.initClock();
    this.setupGlobalShortcuts();

    if (window.lucide) lucide.createIcons();

    // Default Focus: Items search field by default when app opens
    setTimeout(() => {
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }, 100);

    // Global document click to dismiss dropdowns if clicked outside
    document.addEventListener('click', (e) => {
      const custContainer = document.getElementById('sf-customer-container');
      const custDropdown = document.getElementById('sf-customer-dropdown');
      if (custDropdown && custContainer && !custContainer.contains(e.target)) {
        custDropdown.classList.add('hidden');
      }

      const searchContainer = document.getElementById('sf-search-container');
      const searchDropdown = document.getElementById('sf-search-dropdown');
      if (searchDropdown && searchContainer && !searchContainer.contains(e.target)) {
        searchDropdown.classList.add('hidden');
      }
    });
  },

  initClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    const update = () => {
      const el = document.getElementById('sf-live-clock');
      if (!el) {
        if (this.clockInterval) clearInterval(this.clockInterval);
        return;
      }
      const now = new Date();
      el.textContent = now.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }).toUpperCase() + ' • ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  },

  // --- Custom Customer Dropdown Methods ---
  async refreshCustomers() {
    try {
      this.customers = await window.api.getCustomers() || [];
    } catch (e) {
      console.error("Failed to refresh customers in SalesForm:", e);
    }
  },

  async handleCustomerFocus() {
    // Keep customer list always synchronized
    await this.refreshCustomers();
    const input = document.getElementById('sf-customer-name');
    if (input && !input.readOnly) {
      const val = (input.value || '').trim();
      const clearBtn = document.getElementById('sf-customer-clear-btn');
      if (clearBtn) {
        if (val.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }
      if (val.length > 0) {
        this.handleCustomerInput(val);
      } else {
        this.customerSearchResults = (this.customers || []).slice(0, 15);
        this.highlightedCustomerIndex = 0;
        this.renderCustomerDropdown();
      }
    }
  },

  handleCustomerPhoneFocus() {
    const dropdown = document.getElementById('sf-customer-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  },

  async handleCustomerInput(val) {
    const q = (val || '').trim().toLowerCase();
    const dropdown = document.getElementById('sf-customer-dropdown');
    const clearBtn = document.getElementById('sf-customer-clear-btn');

    if (clearBtn) {
      if ((val || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    if (!dropdown) return;

    if (q.length === 0) {
      this.customerSearchResults = (this.customers || []).slice(0, 15);
      this.highlightedCustomerIndex = 0;
      this.renderCustomerDropdown();
      return;
    } else {
      if (!this.customers || this.customers.length === 0) {
        await this.refreshCustomers();
      }
      const all = this.customers || [];
      let matches = all.filter(c => {
        const name = (c.name || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        return name.includes(q) || phone.includes(q);
      });

      // Sort by relevance:
      // 1. Customer Name starts directly with query (e.g. "S...")
      // 2. Any individual word in customer name starts with query (e.g. "M. SALMAN", "ADNAN SWEETS")
      // 3. Customer Phone starts with query
      // 4. Customer Phone includes query
      // 5. Customer Name contains query elsewhere
      matches.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        const phoneA = (a.phone || '').toLowerCase();
        const phoneB = (b.phone || '').toLowerCase();

        const getScore = (name, phone) => {
          if (name.startsWith(q)) return 1;
          const words = name.split(/[\s\-&/]+/);
          if (words.some(w => w.startsWith(q))) return 2;
          if (phone.startsWith(q)) return 3;
          if (phone.includes(q)) return 4;
          return 5;
        };

        const scoreA = getScore(nameA, phoneA);
        const scoreB = getScore(nameB, phoneB);

        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }

        return nameA.localeCompare(nameB);
      });

      this.customerSearchResults = matches.slice(0, 15);
    }

    this.highlightedCustomerIndex = 0;
    this.renderCustomerDropdown();
  },

  renderCustomerDropdown() {
    const dropdown = document.getElementById('sf-customer-dropdown');
    if (!dropdown) return;

    if (this.customerSearchResults.length === 0) {
      const val = document.getElementById('sf-customer-name')?.value || '';
      dropdown.innerHTML = `
        <div class="p-3 text-center text-slate-400">
          <p class="font-bold text-xs text-slate-600">New Customer: "${val}"</p>
          <p class="text-[10px] text-slate-400 mt-0.5">Press Enter or Tab to proceed and enter contact phone.</p>
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = this.customerSearchResults.map((c, idx) => {
      const isHighlighted = idx === this.highlightedCustomerIndex;
      const balance = c.amount || 0;
      const isDue = balance > 0.01;

      return `
        <div id="sf-cust-item-${idx}" 
             onmousedown="SalesForm.selectCustomerOption(${idx})"
             class="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 last:border-0 cursor-pointer transition-all ${isHighlighted ? 'bg-amber-600 text-white font-bold shadow-xs' : 'hover:bg-slate-50 text-slate-800'}">
          <!-- Left side: Index, Customer Name, Phone -->
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span class="w-5.5 h-5.5 rounded ${isHighlighted ? 'bg-white/25 text-white border border-white/30' : 'bg-slate-100 text-slate-600'} flex items-center justify-center text-xs font-black shrink-0 font-mono">${idx + 1}</span>
            <span class="text-sm font-black uppercase truncate ${isHighlighted ? 'text-white' : 'text-slate-900'}">${c.name}</span>
            ${c.phone ? `<span class="text-[13px] font-mono ${isHighlighted ? 'text-amber-100 font-bold' : 'text-slate-500'} shrink-0">(${c.phone})</span>` : ''}
          </div>

          <!-- Right side: Khata Balance Badge -->
          <div class="shrink-0 text-right pl-2">
            <span class="px-2.5 py-0.5 rounded text-xs font-black font-display ${isDue ? (isHighlighted ? 'bg-white/20 text-rose-100 border border-white/30' : 'bg-rose-50 text-rose-700 border border-rose-200') : (isHighlighted ? 'bg-white/20 text-emerald-100 border border-white/30' : 'bg-slate-100 text-slate-600')}">
              ${isDue ? `Khata: Rs. ${app.formatAmount(balance)}` : 'Cleared'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');

    const activeEl = document.getElementById(`sf-cust-item-${this.highlightedCustomerIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  },

  handleCustomerKeyDown(e) {
    const dropdown = document.getElementById('sf-customer-dropdown');
    const isDropdownOpen = dropdown && !dropdown.classList.contains('hidden') && this.customerSearchResults.length > 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isDropdownOpen) {
        if (this.highlightedCustomerIndex < this.customerSearchResults.length - 1) {
          this.highlightedCustomerIndex++;
          this.renderCustomerDropdown();
        }
      } else {
        this.customerSearchResults = (this.customers || []).slice(0, 12);
        this.highlightedCustomerIndex = 0;
        this.renderCustomerDropdown();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDropdownOpen && this.highlightedCustomerIndex > 0) {
        this.highlightedCustomerIndex--;
        this.renderCustomerDropdown();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isDropdownOpen && this.customerSearchResults[this.highlightedCustomerIndex]) {
        this.selectCustomerOption(this.highlightedCustomerIndex);
      } else {
        // Close dropdown and jump to phone or item search
        if (dropdown) dropdown.classList.add('hidden');
        const phoneInput = document.getElementById('sf-customer-phone');
        if (phoneInput && !phoneInput.readOnly && !phoneInput.value) {
          phoneInput.focus();
        } else {
          document.getElementById('sf-fast-item-search')?.focus();
        }
      }
    } else if (e.key === 'Escape') {
      if (dropdown) dropdown.classList.add('hidden');
    }
  },

  selectCustomerOption(index) {
    const cust = this.customerSearchResults[index];
    if (!cust) return;

    this.customerId = cust.id;
    this.customerName = cust.name;
    this.customerPhone = cust.phone || '';
    this.customerBalance = cust.amount || 0;

    const nameInput = document.getElementById('sf-customer-name');
    const phoneInput = document.getElementById('sf-customer-phone');
    const clearBtn = document.getElementById('sf-customer-clear-btn');
    const badge = document.getElementById('sf-customer-balance-badge');
    const dropdown = document.getElementById('sf-customer-dropdown');

    if (dropdown) dropdown.classList.add('hidden');

    if (nameInput) {
      nameInput.value = cust.name;
      nameInput.setAttribute('readonly', 'true');
      nameInput.className = 'w-full pl-9 pr-9 py-2 bg-amber-50/70 border-amber-300 font-black cursor-default text-slate-900 shadow-sm border rounded-xl text-xs outline-none transition-all';
    }
    if (phoneInput) {
      phoneInput.value = this.customerPhone;
      phoneInput.setAttribute('readonly', 'true');
      phoneInput.className = 'w-full pl-8 pr-2 py-2 bg-slate-100/90 text-slate-700 font-black cursor-default border-slate-200 border rounded-xl text-xs outline-none transition-all';
    }
    if (clearBtn) {
      clearBtn.classList.remove('hidden');
    }
    if (badge) {
      if (this.customerBalance > 0) {
        badge.textContent = `Khata Due: Rs. ${app.formatAmount(this.customerBalance)}`;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (window.lucide) lucide.createIcons();

    // Auto move focus to fast item search for rapid billing
    setTimeout(() => {
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }, 50);
  },

  onCustomerPhoneChange(inputOrVal) {
    let el = null;
    let val = '';
    if (inputOrVal && typeof inputOrVal === 'object' && inputOrVal.value !== undefined) {
      el = inputOrVal;
      val = el.value;
    } else {
      val = inputOrVal || '';
      el = document.getElementById('sf-customer-phone');
    }

    // Restrict strictly to digits only and maximum 11 digits
    const cleaned = (val || '').replace(/\D/g, '').slice(0, 11);
    if (el && el.value !== cleaned) {
      el.value = cleaned;
    }
    this.customerPhone = cleaned;

    // If not selected from list, see if phone matches an existing customer
    if (!this.customerId && this.customerPhone.length >= 10) {
      const match = this.customers.find(c => (c.phone || '').replace(/\D/g, '') === this.customerPhone);
      if (match) {
        const idx = this.customers.indexOf(match);
        if (idx !== -1) {
          this.customerSearchResults = [match];
          this.selectCustomerOption(0);
        }
      }
    }
  },

  clearSelectedCustomer() {
    this.customerId = null;
    this.customerName = '';
    this.customerPhone = '';
    this.customerBalance = 0;

    const nameInput = document.getElementById('sf-customer-name');
    const phoneInput = document.getElementById('sf-customer-phone');
    const clearBtn = document.getElementById('sf-customer-clear-btn');
    const badge = document.getElementById('sf-customer-balance-badge');
    const dropdown = document.getElementById('sf-customer-dropdown');

    if (dropdown) dropdown.classList.add('hidden');

    if (nameInput) {
      nameInput.value = '';
      nameInput.removeAttribute('readonly');
      nameInput.className = 'w-full pl-9 pr-9 py-2 bg-slate-50 border-slate-200 font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 border rounded-xl text-xs outline-none transition-all';
      nameInput.focus();
    }
    if (phoneInput) {
      phoneInput.value = '';
      phoneInput.removeAttribute('readonly');
      phoneInput.className = 'w-full pl-8 pr-2 py-2 bg-slate-50 text-slate-800 font-bold focus:bg-white focus:border-amber-500 border-slate-200 border rounded-xl text-xs outline-none transition-all';
    }
    if (clearBtn) {
      clearBtn.classList.add('hidden');
    }
    if (badge) {
      badge.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  },

  setPaymentMethod(method) {
    this.paymentMethod = method;
    const btnCash = document.getElementById('btn-method-cash');
    const btnOnline = document.getElementById('btn-method-online');
    if (!btnCash || !btnOnline) return;

    if (method === 'Online') {
      btnOnline.className = 'px-2.5 py-0.5 text-[10px] font-black rounded transition-colors cursor-pointer bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 hover:text-white';
      btnCash.className = 'px-2.5 py-0.5 text-[10px] font-black rounded transition-colors cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-200/50';
    } else {
      btnCash.className = 'px-2.5 py-0.5 text-[10px] font-black rounded transition-colors cursor-pointer bg-slate-900 text-white shadow-xs hover:bg-slate-800 hover:text-white';
      btnOnline.className = 'px-2.5 py-0.5 text-[10px] font-black rounded transition-colors cursor-pointer text-slate-600 hover:text-indigo-600 hover:bg-slate-200/50';
    }
  },

  onReceivedInput(val) {
    this.isReceivedManuallyEdited = true;
    this.updateSummary();
  },

  setFullPayment() {
    this.isReceivedManuallyEdited = false;
    this.updateSummary();
  },

  onCashTenderedInput(val) {
    this.cashTendered = val;
    this.updateCashChangeReturn();
  },

  updateCashChangeReturn() {
    const badge = document.getElementById('sf-return-change-badge');
    if (!badge) return;

    const tenderedInput = document.getElementById('sf-cash-tendered');
    const tenderedStr = (this.cashTendered !== undefined && this.cashTendered !== null) 
      ? String(this.cashTendered).trim() 
      : (tenderedInput ? (tenderedInput.value || '').trim() : '');

    if (tenderedStr === '') {
      badge.classList.add('hidden');
      return;
    }

    const tendered = parseFloat(tenderedStr);
    if (isNaN(tendered) || tendered <= 0) {
      badge.classList.add('hidden');
      return;
    }

    // Calculate change to return against the actual Received payment amount
    const recInput = document.getElementById('sf-received-amount');
    let targetAmount = (this.receivedAmount !== undefined && this.receivedAmount !== null && !isNaN(Number(this.receivedAmount)))
      ? Number(this.receivedAmount)
      : (this.lastCalculatedGrandTotal || 0);

    if (recInput && recInput.value !== '' && !isNaN(parseFloat(recInput.value))) {
      targetAmount = parseFloat(recInput.value);
    }

    const diff = tendered - targetAmount;

    if (diff > 0) {
      badge.innerHTML = `Return: <span class="font-black">Rs. ${app.formatAmount(diff)}</span>`;
      badge.className = 'text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-display shadow-2xs tabular-nums';
      badge.classList.remove('hidden');
    } else if (diff === 0) {
      badge.innerHTML = `<span>Exact Cash</span>`;
      badge.className = 'text-xs font-black px-2 py-0.5 rounded-lg bg-slate-700 text-white font-display shadow-2xs tabular-nums';
      badge.classList.remove('hidden');
    } else {
      badge.innerHTML = `Short: <span class="font-black">Rs. ${app.formatAmount(Math.abs(diff))}</span>`;
      badge.className = 'text-xs font-black px-2 py-0.5 rounded-lg bg-amber-500 text-white font-display shadow-2xs tabular-nums';
      badge.classList.remove('hidden');
    }
  },

  getItemAvailableStock(item) {
    if (!item) return 0;
    const itemId = item.id !== undefined ? item.id : item.item_id;
    const itemSlug = item.slug || item.section;
    const prod = (this.availableItems || []).find(p => String(p.id) === String(itemId) && String(p.slug || '').toLowerCase() === String(itemSlug || '').toLowerCase());
    let stock = prod ? (prod.current_stock || 0) : (item.current_stock || 0);
    if (this.editingSaleId && this.originalItemsMap) {
      const origQty = this.originalItemsMap[`${itemSlug}-${itemId}`] || 0;
      stock += origQty;
    }
    return Math.round(Math.max(0, stock) * 100) / 100;
  },

  getItemLatestCost(item) {
    if (!item) return 0;
    const itemId = item.id !== undefined ? item.id : item.item_id;
    const itemSlug = item.slug || item.section;
    const prod = (this.availableItems || []).find(p => String(p.id) === String(itemId) && String(p.slug || '').toLowerCase() === String(itemSlug || '').toLowerCase());

    let raw = null;
    if (prod) {
      if (prod.last_purchase_price !== undefined && prod.last_purchase_price !== null && prod.last_purchase_price !== '') {
        raw = prod.last_purchase_price;
      } else if (prod.latest_cost_price !== undefined && prod.latest_cost_price !== null && prod.latest_cost_price !== '') {
        raw = prod.latest_cost_price;
      } else if (prod.cost_price !== undefined && prod.cost_price !== null && prod.cost_price !== '') {
        raw = prod.cost_price;
      }
    }

    if (raw === null || raw === undefined) {
      if (item.latest_cost !== undefined && item.latest_cost !== null && item.latest_cost !== '') {
        raw = item.latest_cost;
      } else if (item.last_purchase_price !== undefined && item.last_purchase_price !== null && item.last_purchase_price !== '') {
        raw = item.last_purchase_price;
      } else if (item.latest_cost_price !== undefined && item.latest_cost_price !== null && item.latest_cost_price !== '') {
        raw = item.latest_cost_price;
      } else {
        raw = item.cost_price || 0;
      }
    }
    return Number(raw) || 0;
  },

  // --- Instant Keyboard-Driven Item Search & Dropdown (Tight Single Line) ---
  clearSearchInput() {
    const input = document.getElementById('sf-fast-item-search');
    const clearBtn = document.getElementById('sf-item-search-clear-btn');
    const dropdown = document.getElementById('sf-search-dropdown');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (clearBtn) {
      clearBtn.classList.add('hidden');
    }
    this.searchResults = [];
    this.highlightedSearchIndex = 0;
    if (dropdown) dropdown.classList.add('hidden');
  },

  handleSearchFocus() {
    const input = document.getElementById('sf-fast-item-search');
    if (input) {
      const val = (input.value || '').trim();
      const clearBtn = document.getElementById('sf-item-search-clear-btn');
      if (clearBtn) {
        if (val.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }
      if (val.length > 0) {
        this.handleSearchInput(val);
      } else {
        const dropdown = document.getElementById('sf-search-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
      }
    }
  },

  handleSearchInput(value) {
    const q = (value || '').trim().toLowerCase();
    const dropdown = document.getElementById('sf-search-dropdown');
    const clearBtn = document.getElementById('sf-item-search-clear-btn');

    if (clearBtn) {
      if ((value || '').length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }

    if (!dropdown) return;

    if (q.length === 0) {
      this.searchResults = [];
      this.highlightedSearchIndex = 0;
      dropdown.classList.add('hidden');
      return;
    }

    const all = this.availableItems || [];

    // Filter all matching products (name, description, company, category, barcode)
    let matches = all.filter(i => {
      const name = (i.item_name || '').toLowerCase();
      const desc = (i.description || '').toLowerCase();
      const comp = (i.company_name || '').toLowerCase();
      const cat = (this.getCategoryName(i) || '').toLowerCase();
      const slug = (i.slug || '').toLowerCase();
      const barcode = (i.barcode || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || comp.includes(q) || cat.includes(q) || slug.includes(q) || barcode.includes(q);
    });

    // Priority sort by search relevance:
    // 0. exact barcode match
    // 1. item_name starts with query (e.g. "Catry..." when typing "cat")
    // 2. any word in item_name starts with query
    // 3. description or company starts with query
    // 4. word in description starts with query
    // 5. barcode contains query
    // 6. general substring match
    matches.sort((a, b) => {
      const bcA = (a.barcode || '').toLowerCase();
      const bcB = (b.barcode || '').toLowerCase();
      if (bcA === q && bcB !== q) return -1;
      if (bcB === q && bcA !== q) return 1;

      const nameA = (a.item_name || '').toLowerCase();
      const nameB = (b.item_name || '').toLowerCase();
      const descA = (a.description || '').toLowerCase();
      const descB = (b.description || '').toLowerCase();

      const getScore = (name, desc, bc) => {
        if (bc === q) return 0;
        if (name.startsWith(q)) return 1;
        const words = name.split(/[\s\-&/]+/);
        if (words.some(w => w.startsWith(q))) return 2;
        if (desc.startsWith(q)) return 3;
        if (desc.split(/[\s\-&/]+/).some(w => w.startsWith(q))) return 4;
        if (bc.includes(q)) return 5;
        return 6;
      };

      const scoreA = getScore(nameA, descA, bcA);
      const scoreB = getScore(nameB, descB, bcB);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      return nameA.localeCompare(nameB);
    });

    this.searchResults = matches.slice(0, 18);

    // Default highlight to the first item that is not already in the cart
    const firstAvail = this.searchResults.findIndex(i => !this.cart.some(c => c.id === i.id && c.slug === i.slug));
    this.highlightedSearchIndex = firstAvail !== -1 ? firstAvail : 0;
    this.renderSearchDropdown();
  },

  renderSearchDropdown() {
    const dropdown = document.getElementById('sf-search-dropdown');
    if (!dropdown) return;

    if (this.searchResults.length === 0) {
      dropdown.innerHTML = `
        <div class="p-4 text-center text-slate-400">
          <p class="font-bold text-xs text-slate-600">No matching products found</p>
          <p class="text-[10px] text-slate-400 mt-0.5">Check spelling or add item in Stock tab.</p>
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = this.searchResults.map((item, idx) => {
      const isAlreadyInCart = this.cart.some(c => c.id === item.id && c.slug === item.slug);
      const isHighlighted = idx === this.highlightedSearchIndex && !isAlreadyInCart;
      const stock = this.getItemAvailableStock(item);
      const price = item.retail_price || 0;
      const cost = item.cost_price || 0;
      const rawLatestCost = (item.last_purchase_price !== null && item.last_purchase_price !== undefined && item.last_purchase_price > 0)
        ? item.last_purchase_price
        : (item.latest_cost_price || item.cost_price || 0);
      const latestCost = Number(rawLatestCost) || 0;
      const categoryName = this.getCategoryName(item);

      if (isAlreadyInCart) {
        return `
          <div id="sf-search-item-${idx}" 
               class="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 last:border-0 bg-slate-50/80 text-slate-400 cursor-not-allowed select-none opacity-60">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <span class="w-5.5 h-5.5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0 font-mono">✓</span>
              <span class="text-sm font-bold text-slate-500 truncate line-through">${item.item_name}</span>
              ${categoryName ? `<span class="text-xs text-slate-400 shrink-0 uppercase tracking-tight">(${categoryName})</span>` : ''}
            </div>
            <div class="flex items-center gap-3 shrink-0 text-right">
              <span class="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-slate-200 text-slate-600">In Bill</span>
              <span class="text-[13px] font-semibold text-slate-400 font-display tabular-nums">(C: Rs. ${app.formatAmount(cost)}) (L.Cost: Rs. ${app.formatAmount(latestCost)})</span>
              <span class="text-sm font-bold tabular-nums text-slate-400 font-display min-w-[70px] text-right">Rs. ${app.formatAmount(price)}</span>
            </div>
          </div>
        `;
      }

      return `
        <div id="sf-search-item-${idx}" 
             onmousedown="SalesForm.selectSearchItem(${idx})"
             class="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 last:border-0 cursor-pointer transition-all ${isHighlighted ? 'bg-amber-600 text-white font-bold shadow-xs' : 'hover:bg-slate-50 text-slate-800'}">
          <!-- Single Line: Index, Item Name, Barcode, Category Tag -->
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-5.5 h-5.5 rounded ${isHighlighted ? 'bg-white/25 text-white border border-white/30' : 'bg-slate-100 text-slate-600'} flex items-center justify-center text-xs font-black shrink-0 font-mono">${idx + 1}</span>
            <span class="text-sm font-black truncate ${isHighlighted ? 'text-white' : 'text-slate-900'}">${item.item_name}</span>
            ${item.barcode ? `<span class="text-[10px] font-mono font-bold ${isHighlighted ? 'text-amber-100 bg-amber-700/60' : 'text-slate-600 bg-slate-100'} px-1.5 py-0.2 rounded border ${isHighlighted ? 'border-amber-400/40' : 'border-slate-300'}">#${item.barcode}</span>` : ''}
            ${categoryName ? `<span class="text-xs ${isHighlighted ? 'text-amber-100 font-bold' : 'text-slate-400'} shrink-0 uppercase tracking-tight">(${categoryName})</span>` : ''}
          </div>

          <!-- Single Line: Stock, Cost Price (C: Rs. XX), Latest Cost (L.Cost: Rs. XX), Sale Price -->
          <div class="flex items-center gap-3.5 shrink-0 text-right">
            <span class="text-[13px] font-black ${stock > 0 ? (isHighlighted ? 'text-amber-100' : 'text-emerald-700') : (isHighlighted ? 'text-rose-200' : 'text-rose-600')} tabular-nums">
              ${app.formatQty(stock)} ${item.unit || 'pcs'} avail
            </span>
            <span class="text-[13px] font-bold ${isHighlighted ? 'text-amber-100/90' : 'text-slate-500'} font-display tabular-nums">
              (C: Rs. ${app.formatAmount(cost)}) (L.Cost: Rs. ${app.formatAmount(latestCost)})
            </span>
            <span class="text-sm font-black tabular-nums font-display ${isHighlighted ? 'text-white' : 'text-slate-900'} min-w-[70px] text-right">
              Rs. ${app.formatAmount(price)}
            </span>
          </div>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');

    const activeEl = document.getElementById(`sf-search-item-${this.highlightedSearchIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  },

  handleSearchKeyDown(e) {
    const dropdown = document.getElementById('sf-search-dropdown');
    const isDropdownOpen = dropdown && !dropdown.classList.contains('hidden') && this.searchResults.length > 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isDropdownOpen) {
        let nextIdx = this.highlightedSearchIndex + 1;
        while (nextIdx < this.searchResults.length) {
          const item = this.searchResults[nextIdx];
          const isAlready = this.cart.some(c => c.id === item.id && c.slug === item.slug);
          if (!isAlready) {
            this.highlightedSearchIndex = nextIdx;
            this.renderSearchDropdown();
            return;
          }
          nextIdx++;
        }
      } else if (this.cart.length > 0) {
        this.focusCartField(0, 'qty');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDropdownOpen) {
        let prevIdx = this.highlightedSearchIndex - 1;
        while (prevIdx >= 0) {
          const item = this.searchResults[prevIdx];
          const isAlready = this.cart.some(c => c.id === item.id && c.slug === item.slug);
          if (!isAlready) {
            this.highlightedSearchIndex = prevIdx;
            this.renderSearchDropdown();
            return;
          }
          prevIdx--;
        }
      }
    } else if (e.key === 'Enter') {
      const searchInput = document.getElementById('sf-fast-item-search');
      const searchVal = (searchInput?.value || '').trim();

      // Check if search query matches an exact barcode first
      if (searchVal) {
        const barcodeMatch = (this.availableItems || []).find(i => String(i.barcode || '').trim().toLowerCase() === searchVal.toLowerCase());
        if (barcodeMatch) {
          e.preventDefault();
          e.stopPropagation();
          this.handleBarcodeScan(searchVal);
          return;
        }
      }

      if (isDropdownOpen && this.searchResults[this.highlightedSearchIndex]) {
        e.preventDefault();
        this.selectSearchItem(this.highlightedSearchIndex);
      } else if (this.cart.length > 0) {
        e.preventDefault();
        this.focusCartField(0, 'qty');
      }
    } else if (e.key === 'Escape') {
      if (isDropdownOpen) {
        dropdown.classList.add('hidden');
      }
    }
  },

  handleBarcodeScan(rawBarcode) {
    if (!rawBarcode) return false;
    const barcode = String(rawBarcode).trim();
    if (!barcode) return false;

    const all = this.availableItems || [];
    const item = all.find(i => String(i.barcode || '').trim().toLowerCase() === barcode.toLowerCase());

    if (item) {
      const maxStock = this.getItemAvailableStock(item);
      const existing = this.cart.find(c => c.id === item.id && c.slug === item.slug);

      if (existing) {
        if (existing.qty < maxStock) {
          existing.qty++;
          this.renderCart();
          this.updateSummary();
          app.playBeep('success');
        } else {
          app.playBeep('warning');
          app.showAlert({
            title: 'Stock Limit Reached',
            message: `Cannot add more <b>${item.item_name}</b>.<br>Maximum available stock is ${maxStock} ${item.unit || 'pcs'}.`
          });
        }
      } else {
        if (maxStock <= 0) {
          app.playBeep('warning');
          app.showAlert({
            title: 'Out of Stock',
            message: `<b>${item.item_name}</b> is currently out of stock.`
          });
        } else {
          this.addToCart(item);
          app.playBeep('success');
        }
      }

      this.clearSearchInput();
      const cartIdx = this.cart.findIndex(c => c.id === item.id && c.slug === item.slug);
      if (cartIdx !== -1) {
        setTimeout(() => {
          this.focusCartField(cartIdx, 'qty');
        }, 40);
      }
      return true;
    } else {
      app.playBeep('error');
      app.showToast(`Barcode "${barcode}" not recognized in stock`, 'error');
      return false;
    }
  },

  selectSearchItem(index) {
    const item = this.searchResults[index];
    if (!item) return;

    const existing = this.cart.find(c => c.id === item.id && c.slug === item.slug);
    const maxStock = this.getItemAvailableStock(item);

    if (existing) {
      if (existing.qty < maxStock) {
        existing.qty++;
        this.renderCart();
        this.updateSummary();
        app.playBeep('success');
      } else {
        app.playBeep('warning');
        app.showToast(`Max stock reached for ${item.item_name}`, 'warning');
      }
    } else {
      this.addToCart(item);
      app.playBeep('success');
    }

    const searchInput = document.getElementById('sf-fast-item-search');
    const clearBtn = document.getElementById('sf-item-search-clear-btn');
    const dropdown = document.getElementById('sf-search-dropdown');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (dropdown) dropdown.classList.add('hidden');
    this.searchResults = [];
    this.highlightedSearchIndex = 0;

    const cartIdx = this.cart.findIndex(c => c.id === item.id && c.slug === item.slug);
    if (cartIdx !== -1) {
      setTimeout(() => {
        this.focusCartField(cartIdx, 'qty');
      }, 40);
    }
  },

  addToCart(item) {
    const maxStock = this.getItemAvailableStock(item);
    if (maxStock <= 0) {
      app.showAlert({ title: 'Out of Stock', message: `<b>${item.item_name}</b> is currently out of stock.` });
      return;
    }

    const existing = this.cart.find(i => i.id === item.id && i.slug === item.slug);
    if (existing) {
      if (existing.qty < maxStock) {
        existing.qty++;
      }
    } else {
      const activePrice = item.retail_price || 0;
      const activeCost = item.cost_price || 0;
      const rawLatestCost = (item.last_purchase_price !== undefined && item.last_purchase_price !== null && item.last_purchase_price !== '') 
        ? item.last_purchase_price 
        : (item.latest_cost_price || item.cost_price || 0);
      const latestCost = Number(rawLatestCost) || 0;

      const catLabel = this.getCategoryName(item);
      this.cart.push({
        id: item.id,
        description: item.item_name + (catLabel ? ' - ' + catLabel : ''),
        item_name: item.item_name,
        barcode: item.barcode || '',
        retail_price: activePrice,
        original_retail_price: activePrice,
        cost_price: activeCost,
        latest_cost: latestCost,
        last_purchase_price: item.last_purchase_price,
        latest_cost_price: item.latest_cost_price,
        qty: 1,
        slug: item.slug,
        unit: item.unit || 'pcs',
        discount: '',
        discountType: 'flat'
      });
    }

    this.renderCart();
    this.updateSummary();
  },

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.renderCart();
    this.updateSummary();
  },

  focusCartField(index, fieldName) {
    const id = `cart-${fieldName}-input-${index}`;
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      el.select();
    }
  },

  handleCartKeyDown(e, rowIdx, fieldName) {
    const numRows = this.cart.length;

    if (e.key === 'Tab') {
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.flushPendingCartQty();
      if (fieldName === 'qty') {
        this.focusCartField(rowIdx, 'price');
      } else if (fieldName === 'price') {
        this.focusCartField(rowIdx, 'discount');
      } else if (fieldName === 'discount') {
        if (rowIdx < numRows - 1) {
          this.focusCartField(rowIdx + 1, 'qty');
        } else {
          const searchInput = document.getElementById('sf-fast-item-search');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.flushPendingCartQty();
      if (fieldName === 'discount') {
        this.focusCartField(rowIdx, 'price');
      } else if (fieldName === 'price') {
        this.focusCartField(rowIdx, 'qty');
      } else if (fieldName === 'qty') {
        if (rowIdx > 0) {
          this.focusCartField(rowIdx - 1, 'discount');
        } else {
          const searchInput = document.getElementById('sf-fast-item-search');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
      }
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      this.flushPendingCartQty();
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.flushPendingCartQty();
      if (rowIdx > 0) {
        this.focusCartField(rowIdx - 1, fieldName);
      } else {
        const searchInput = document.getElementById('sf-fast-item-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    }
  },

  updateCartQty(index, qty, inputEl) {
    if (this._isScanning) return;

    if (this._qtyUpdateTimeout) {
      clearTimeout(this._qtyUpdateTimeout);
      this._qtyUpdateTimeout = null;
    }

    this._pendingQtyUpdate = { index, qty, inputEl };

    // Debounce by 40ms to prevent rapid scanner bursts from contaminating active qty field
    this._qtyUpdateTimeout = setTimeout(() => {
      if (this._isScanning) return;
      this._applyCartQty(index, qty, inputEl);
      this._qtyUpdateTimeout = null;
      this._pendingQtyUpdate = null;
    }, 40);
  },

  flushPendingCartQty() {
    if (this._qtyUpdateTimeout) {
      clearTimeout(this._qtyUpdateTimeout);
      this._qtyUpdateTimeout = null;
    }
    if (this._pendingQtyUpdate) {
      const { index, qty, inputEl } = this._pendingQtyUpdate;
      this._pendingQtyUpdate = null;
      if (!this._isScanning) {
        this._applyCartQty(index, qty, inputEl);
      }
    }
  },

  _applyCartQty(index, qty, inputEl) {
    const item = this.cart[index];
    if (!item) return;
    const maxStock = this.getItemAvailableStock(item);

    if (qty === '' || qty === null || qty === undefined) {
      item.qty = 0;
      this.updateLineTotal(index);
      this.updateSummary();
      return;
    }

    let parsed = parseFloat(qty);
    if (isNaN(parsed)) parsed = 0;
    parsed = Math.round(parsed * 100) / 100;

    if (parsed > maxStock) {
      parsed = maxStock;
      if (inputEl) inputEl.value = maxStock;
    } else if (parsed < 0) {
      parsed = 0;
      if (inputEl) inputEl.value = 0;
    }

    item.qty = parsed;
    this.updateLineTotal(index);
    this.updateSummary();
  },

  onCartQtyBlur(index, inputEl) {
    if (this._isScanning) return;
    this.flushPendingCartQty();
    const item = this.cart[index];
    if (!item) return;
    const maxStock = this.getItemAvailableStock(item);
    let parsed = parseFloat(inputEl.value);

    if (isNaN(parsed) || parsed <= 0) {
      parsed = maxStock > 0 ? 1 : 0;
      inputEl.value = parsed;
    } else if (parsed > maxStock) {
      parsed = maxStock;
      inputEl.value = maxStock;
    } else {
      parsed = Math.round(parsed * 100) / 100;
      inputEl.value = parsed;
    }

    item.qty = parsed;
    this.updateLineTotal(index);
    this.updateSummary();
  },

  updateCartPrice(index, price) {
    if (this._isScanning) return;
    const item = this.cart[index];
    if (!item) return;
    item.retail_price = parseFloat(price) || 0;
    
    if (item.discountType === 'flat' && item.discount > item.retail_price) {
      item.discount = item.retail_price;
    }
    
    this.updateLineTotal(index);
    this.updateSummary();
  },

  resetCartPrice(index) {
    const item = this.cart[index];
    if (!item) return;
    item.retail_price = item.original_retail_price;
    item.discount = '';
    item.discountType = 'flat';
    this.renderCart();
    this.updateSummary();
  },

  toggleItemDiscountType(index, type) {
    if (!this.cart[index]) return;
    this.cart[index].discountType = type;
    this.renderCart();
    this.updateSummary();
  },

  updateItemDiscount(index, val) {
    if (this._isScanning) return;
    const item = this.cart[index];
    if (!item) return;

    if (val === '' || val === null || val === undefined || parseFloat(val) === 0) {
      item.discount = '';
      const input = document.getElementById(`cart-discount-input-${index}`);
      if (input && input.value !== '') input.value = '';
      this.updateLineTotal(index);
      this.updateSummary();
      return;
    }

    let disc = parseFloat(val);
    if (isNaN(disc)) disc = 0;
    
    const maxVal = item.discountType === 'percent' ? 100 : item.retail_price;
    if (disc > maxVal) {
      disc = maxVal;
      const input = document.getElementById(`cart-discount-input-${index}`);
      if (input) input.value = disc;
      item.discount = disc;
    } else if (disc <= 0) {
      disc = 0;
      const input = document.getElementById(`cart-discount-input-${index}`);
      if (input) input.value = '';
      item.discount = '';
    } else {
      item.discount = val;
    }

    this.updateLineTotal(index);
    this.updateSummary();
  },

  updateLineTotal(index) {
    const item = this.cart[index];
    if (!item) return;
    const el = document.getElementById(`cart-line-total-${index}`);
    const discEl = document.getElementById(`cart-line-discount-${index}`);
    if (el) {
      const sub = item.qty * item.retail_price;
      let discAmt = 0;
      const discNum = parseFloat(item.discount) || 0;
      if (item.discountType === 'percent') {
        discAmt = (sub * discNum) / 100;
      } else {
        discAmt = discNum * item.qty;
      }
      const total = Math.max(0, sub - discAmt);
      el.textContent = app.formatCurrency(total);
      if (discEl) {
        discEl.textContent = discAmt > 0 ? `- ${app.formatCurrency(discAmt)}` : '';
        discEl.style.display = discAmt > 0 ? 'block' : 'none';
      }
    }
  },

  renderCart() {
    const tbody = document.getElementById('sf-cart-tbody');
    const emptyState = document.getElementById('sf-cart-empty-state');
    const headerTitle = document.getElementById('sf-cart-header-title');

    if (headerTitle) {
      headerTitle.textContent = `Invoice Items (${this.cart.length})`;
    }

    if (!tbody) return;

    if (this.cart.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = this.cart.map((item, idx) => {
      const maxStock = this.getItemAvailableStock(item);
      const subtotal = item.qty * item.retail_price;
      const discNum = parseFloat(item.discount) || 0;
      const discountVal = item.discountType === 'percent' 
        ? (subtotal * discNum / 100) 
        : (discNum * item.qty);
      const categoryLabel = SalesForm.getCategoryName(item);
      const latestCost = this.getItemLatestCost(item);

      return `
        <tr class="hover:bg-amber-50/40 transition-colors group">
          <!-- Row Number -->
          <td class="py-1 px-2 text-center text-xs font-bold text-slate-500 tabular-nums border-r border-slate-200">
            ${idx + 1}
          </td>

          <!-- Item Name & Category / Stock Info -->
          <td class="py-1 px-3 border-r border-slate-200">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-black text-slate-900 text-xs truncate max-w-[280px]">${item.item_name}</span>
              ${item.barcode ? `<span class="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-300 px-1 py-0.2 rounded" title="Barcode: ${item.barcode}">#${item.barcode}</span>` : ''}
              ${categoryLabel ? `<span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight font-sans">(${categoryLabel})</span>` : ''}
              <span class="text-[9px] font-bold ${maxStock > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60' : 'text-rose-600 bg-rose-50 border-rose-200/60'} px-1.5 py-0.2 rounded border tabular-nums ml-auto sm:ml-0">${app.formatQty(maxStock)} in stock</span>
            </div>
          </td>

          <!-- Qty Input with Unit -->
          <td class="py-1 px-2 text-center border-r border-slate-200">
            <div class="inline-flex items-center justify-center gap-1">
              <input type="number" 
                     id="cart-qty-input-${idx}"
                     value="${app.formatQty(item.qty)}"
                     min="1"
                     max="${maxStock}"
                     step="any"
                     onkeydown="SalesForm.handleCartKeyDown(event, ${idx}, 'qty')"
                     oninput="SalesForm.updateCartQty(${idx}, this.value, this)"
                     onblur="SalesForm.onCartQtyBlur(${idx}, this)"
                     class="w-14 bg-white/60 focus:bg-amber-100 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 text-right font-black text-slate-900 text-xs outline-none transition-all tabular-nums py-0.5 px-1 rounded shadow-2xs">
              <span class="w-14 text-left text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate shrink-0">${item.unit || 'pcs'}</span>
            </div>
          </td>

          <!-- Price Input -->
          <td class="py-1 px-2 text-right border-r border-slate-200">
            <div class="inline-flex items-center justify-end">
              <span class="text-[10px] font-bold text-slate-400 mr-1">Rs.</span>
              <input type="number" 
                     id="cart-price-input-${idx}"
                     value="${item.retail_price}"
                     step="any"
                     onkeydown="SalesForm.handleCartKeyDown(event, ${idx}, 'price')"
                     oninput="SalesForm.updateCartPrice(${idx}, this.value)"
                     class="w-20 bg-white/60 focus:bg-amber-100 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 text-right font-black text-slate-900 text-xs outline-none transition-all tabular-nums py-0.5 px-1 rounded shadow-2xs">
            </div>
          </td>

          <!-- Discount -->
          <td class="py-1 px-2 border-r border-slate-200">
            <div class="flex items-center gap-1 justify-center">
              <div class="flex p-0.5 shrink-0 gap-0.5">
                <button type="button" onclick="SalesForm.toggleItemDiscountType(${idx}, 'flat')" class="px-1 py-0.2 text-[9px] font-black rounded ${item.discountType === 'flat' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 bg-slate-100'}">RS.</button>
                <button type="button" onclick="SalesForm.toggleItemDiscountType(${idx}, 'percent')" class="px-1 py-0.2 text-[9px] font-black rounded ${item.discountType === 'percent' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 bg-slate-100'}">%</button>
              </div>
              <input type="number" 
                     id="cart-discount-input-${idx}"
                     value="${item.discount !== undefined && item.discount !== null && item.discount !== '' && parseFloat(item.discount) > 0 ? item.discount : ''}"
                     placeholder="0"
                     min="0"
                     step="any"
                     onkeydown="SalesForm.handleCartKeyDown(event, ${idx}, 'discount')"
                     oninput="SalesForm.updateItemDiscount(${idx}, this.value)"
                     class="w-14 bg-white/60 focus:bg-amber-100 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 text-right font-black text-slate-900 text-xs outline-none transition-all tabular-nums py-0.5 px-1 rounded shadow-2xs">
            </div>
          </td>

          <!-- Line Total -->
          <td class="py-1 px-3 text-right border-r border-slate-200">
            <p id="cart-line-discount-${idx}" class="text-[9px] font-bold text-rose-500 leading-none mb-0.5" style="display: ${discountVal > 0 ? 'block' : 'none'}">- ${app.formatCurrency(discountVal)}</p>
            <p class="text-xs font-black text-slate-900 tabular-nums font-display leading-none" id="cart-line-total-${idx}">${app.formatCurrency(subtotal - discountVal)}</p>
          </td>

          <!-- Actions -->
          <td class="py-1 px-2 text-center">
            <div class="flex items-center justify-center gap-0.5">
              <button type="button" onclick="SalesForm.resetCartPrice(${idx})" class="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer" title="Reset Rate">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="SalesForm.removeFromCart(${idx})" class="p-0.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Remove Item">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  toggleDiscountEnable(enabled) {
    this.isDiscountEnabled = Boolean(enabled);
    if (window.storage) {
      window.storage.set('disc_enabled', this.isDiscountEnabled);
    }
    const ctrl = document.getElementById('sf-disc-controls');
    if (ctrl) {
      if (this.isDiscountEnabled) {
        ctrl.classList.remove('hidden');
        ctrl.classList.add('flex');
        const input = document.getElementById('sf-additional-discount');
        if (input) input.focus();
      } else {
        ctrl.classList.remove('flex');
        ctrl.classList.add('hidden');
      }
    }
    this.updateSummary();
  },

  toggleDiscountType(type) {
    this.discountType = type;
    if (window.storage) {
      window.storage.set('disc_type', type);
    }
    const btnFlat = document.getElementById('btn-disc-flat');
    const btnPct = document.getElementById('btn-disc-pct');
    if (type === 'percent') {
      btnPct?.classList.add('bg-slate-900', 'text-white');
      btnPct?.classList.remove('text-slate-600');
      btnFlat?.classList.remove('bg-slate-900', 'text-white');
      btnFlat?.classList.add('text-slate-600');
    } else {
      btnFlat?.classList.add('bg-slate-900', 'text-white');
      btnFlat?.classList.remove('text-slate-600');
      btnPct?.classList.remove('bg-slate-900', 'text-white');
      btnPct?.classList.add('text-slate-600');
    }
    this.updateSummary();
  },

  onAdditionalDiscountInput(val) {
    this.additionalDiscount = val;
    if (window.storage) {
      window.storage.set('disc_value', val);
    }
    this.updateSummary();
  },

  toggleTaxEnable(enabled) {
    this.isTaxEnabled = Boolean(enabled);
    if (window.storage) {
      window.storage.set('tax_enabled', this.isTaxEnabled);
    }
    const ctrl = document.getElementById('sf-tax-controls');
    if (ctrl) {
      if (this.isTaxEnabled) {
        ctrl.classList.remove('hidden');
        ctrl.classList.add('flex');
        const input = document.getElementById('sf-tax-percent');
        if (input) input.focus();
      } else {
        ctrl.classList.remove('flex');
        ctrl.classList.add('hidden');
      }
    }
    this.updateSummary();
  },

  onTaxPercentInput() {
    const taxInput = document.getElementById('sf-tax-percent');
    if (taxInput && taxInput.value !== '') {
      const parsedTax = parseFloat(taxInput.value);
      if (!isNaN(parsedTax)) {
        this.taxPercent = parsedTax;
        if (window.storage) {
          window.storage.set('tax_percent', parsedTax);
        }
      }
    }
    this.updateSummary();
  },

  updateSummary() {
    let subtotal = 0;
    let totalDiscount = 0;

    this.cart.forEach(item => {
      const itemLineSub = item.qty * item.retail_price;
      subtotal += itemLineSub;

      let itemDiscAmt = 0;
      const discNum = parseFloat(item.discount) || 0;
      if (item.discountType === 'percent') {
        itemDiscAmt = (itemLineSub * discNum) / 100;
      } else {
        itemDiscAmt = discNum * item.qty;
      }
      totalDiscount += itemDiscAmt;
    });

    let additionalDisc = 0;
    const discCheckbox = document.getElementById('sf-disc-enable');
    if (discCheckbox) {
      this.isDiscountEnabled = discCheckbox.checked;
    }
    const addDiscInput = document.getElementById('sf-additional-discount');
    if (this.isDiscountEnabled && addDiscInput) {
      const val = parseFloat(addDiscInput.value) || 0;
      if (val > 0) {
        if (this.discountType === 'percent') {
          additionalDisc = (subtotal * val) / 100;
        } else {
          additionalDisc = val;
        }
      }
    }

    const netSubtotal = Math.max(0, subtotal - totalDiscount - additionalDisc);

    // Adv Tax calculation
    const taxCheckbox = document.getElementById('sf-tax-enable');
    if (taxCheckbox) {
      this.isTaxEnabled = taxCheckbox.checked;
    }

    let taxPercent = 2;
    const taxInput = document.getElementById('sf-tax-percent');
    if (taxInput && taxInput.value !== '') {
      const parsedTax = parseFloat(taxInput.value);
      taxPercent = !isNaN(parsedTax) ? parsedTax : 2;
    } else if (this.taxPercent !== undefined) {
      taxPercent = this.taxPercent;
    }
    this.taxPercent = taxPercent;

    const taxAmount = this.isTaxEnabled ? ((netSubtotal * taxPercent) / 100) : 0;
    const grandTotal = netSubtotal + taxAmount;

    // Received Amount handling
    const recInput = document.getElementById('sf-received-amount');
    if (recInput) {
      if (!this.isReceivedManuallyEdited || recInput.value === '') {
        this.receivedAmount = grandTotal;
        recInput.value = grandTotal > 0 ? grandTotal : '';
      } else {
        const val = parseFloat(recInput.value);
        this.receivedAmount = !isNaN(val) ? val : 0;
      }
    } else {
      if (!this.isReceivedManuallyEdited) {
        this.receivedAmount = grandTotal;
      }
    }

    const subtotalEl = document.getElementById('sf-subtotal');
    if (subtotalEl) subtotalEl.textContent = app.formatCurrency(subtotal);

    const discEl = document.getElementById('sf-discount-amount');
    if (discEl) discEl.textContent = `- ${app.formatCurrency(totalDiscount + additionalDisc)}`;

    const taxRowEl = document.getElementById('sf-tax-breakdown-row');
    const taxAmountEl = document.getElementById('sf-tax-amount');
    if (taxRowEl) {
      if (this.isTaxEnabled) {
        taxRowEl.classList.remove('hidden');
        if (taxAmountEl) taxAmountEl.textContent = `+ ${app.formatCurrency(taxAmount)}`;
      } else {
        taxRowEl.classList.add('hidden');
      }
    }

    const grandTotalEl = document.getElementById('sf-grand-total');
    if (grandTotalEl) grandTotalEl.textContent = app.formatCurrency(grandTotal);

    // Badges & Messages for Khata / Partial / Change
    const khataDueMsg = document.getElementById('sf-khata-due-msg');
    const changeMsg = document.getElementById('sf-change-msg');
    const statusBadge = document.getElementById('sf-payment-status-badge');

    const due = Math.max(0, grandTotal - (this.receivedAmount || 0));
    const change = Math.max(0, (this.receivedAmount || 0) - grandTotal);

    if (due > 0 && grandTotal > 0) {
      if (khataDueMsg) {
        khataDueMsg.textContent = `Remaining to Khata: Rs. ${app.formatAmount(due)}`;
        khataDueMsg.classList.remove('hidden');
      }
      if (changeMsg) changeMsg.classList.add('hidden');
      if (statusBadge) {
        statusBadge.textContent = this.receivedAmount > 0 ? 'PARTIAL' : 'CREDIT / KHATA';
        statusBadge.className = 'text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-300';
        statusBadge.classList.remove('hidden');
      }
    } else if (change > 0) {
      if (changeMsg) {
        changeMsg.textContent = `Change Return: Rs. ${app.formatAmount(change)}`;
        changeMsg.classList.remove('hidden');
      }
      if (khataDueMsg) khataDueMsg.classList.add('hidden');
      if (statusBadge) {
        statusBadge.textContent = 'PAID (CHANGE)';
        statusBadge.className = 'text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300';
        statusBadge.classList.remove('hidden');
      }
    } else {
      if (khataDueMsg) khataDueMsg.classList.add('hidden');
      if (changeMsg) changeMsg.classList.add('hidden');
      if (statusBadge) {
        statusBadge.classList.add('hidden');
      }
    }

    this.lastCalculatedGrandTotal = grandTotal;
    this.updateCashChangeReturn();
  },

  setupGlobalShortcuts() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler, true);
    }

    this._scanBuffer = '';
    this._lastScanTime = 0;
    this._isScanning = false;
    this._scanActiveEl = null;
    this._scanActivePrevVal = null;
    this._scanCartSnapshot = null;

    this._keyHandler = (e) => {
      if (app.currentPage !== 'proposal-form') return;

      const now = Date.now();
      const diff = now - this._lastScanTime;
      this._lastScanTime = now;

      // Check if interactive modals (alert, confirm, payment, price checker) are open
      const priceModal = document.getElementById('price-checker-modal');
      const isPriceOpen = priceModal && !priceModal.classList.contains('hidden') && priceModal.classList.contains('flex');
      if (isPriceOpen) {
        const isDismissKey = e.key === 'Escape' || e.key === 'F6' || e.code === 'F6' || e.key === 'F8' || e.code === 'F8';
        if (isDismissKey) {
          e.preventDefault();
          e.stopPropagation();
          app.closePriceChecker();
        }
        return;
      }

      const confirmModal = document.getElementById('confirm-modal');
      const isConfirmOpen = confirmModal && !confirmModal.classList.contains('hidden') && confirmModal.classList.contains('flex');
      const paymentModal = document.getElementById('payment-modal');
      const isPaymentOpen = paymentModal && !paymentModal.classList.contains('hidden') && paymentModal.classList.contains('flex');

      if (!isConfirmOpen && !isPaymentOpen) {
        // Fast burst scanner stream detection (scanner keystrokes arrive < 55ms apart)
        if (diff > 55) {
          this._scanBuffer = '';
          this._isScanning = false;

          // Snapshot active element state in case this first character is the beginning of a scanner burst
          this._scanActiveEl = document.activeElement;
          this._scanActivePrevVal = this._scanActiveEl && (this._scanActiveEl.tagName === 'INPUT' || this._scanActiveEl.tagName === 'TEXTAREA')
            ? this._scanActiveEl.value
            : null;

          const cartMatch = this._scanActiveEl?.id ? this._scanActiveEl.id.match(/^cart-(qty|price|discount)-input-(\d+)$/) : null;
          if (cartMatch) {
            const fieldType = cartMatch[1];
            const rowIdx = parseInt(cartMatch[2], 10);
            this._scanCartSnapshot = {
              rowIdx,
              fieldType,
              qty: this.cart[rowIdx]?.qty,
              price: this.cart[rowIdx]?.retail_price,
              discount: this.cart[rowIdx]?.discount
            };
          } else {
            this._scanCartSnapshot = null;
          }
        } else {
          // diff <= 55ms: Hardware scanner burst confirmed!
          if (this._scanBuffer.length >= 1) {
            this._isScanning = true;

            // Cancel any pending debounced quantity updates
            if (this._qtyUpdateTimeout) {
              clearTimeout(this._qtyUpdateTimeout);
              this._qtyUpdateTimeout = null;
              this._pendingQtyUpdate = null;
            }

            // If the active element was a cart row input, restore its original state and blur it
            if (this._scanCartSnapshot && this.cart[this._scanCartSnapshot.rowIdx]) {
              const { rowIdx, qty, price, discount } = this._scanCartSnapshot;
              this.cart[rowIdx].qty = qty;
              this.cart[rowIdx].retail_price = price;
              this.cart[rowIdx].discount = discount;
              if (this._scanActiveEl) {
                this._scanActiveEl.value = this._scanActivePrevVal !== null ? this._scanActivePrevVal : (qty || 1);
                this._scanActiveEl.blur();
              }
              this.updateLineTotal(rowIdx);
              this.updateSummary();
              this._scanCartSnapshot = null;
            } else if (this._scanActiveEl && this._scanActiveEl.id !== 'sf-fast-item-search') {
              if (this._scanActivePrevVal !== null) {
                this._scanActiveEl.value = this._scanActivePrevVal;
              }
              this._scanActiveEl.blur();
            }
          }
        }

        if (e.key === 'Enter') {
          if (this._scanBuffer.length >= 3) {
            const scannedCode = this._scanBuffer;
            this._scanBuffer = '';
            this._isScanning = false;
            const handled = this.handleBarcodeScan(scannedCode);
            if (handled) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }
          this._scanBuffer = '';
          this._isScanning = false;
        } else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          if (this._isScanning) {
            // Once confirmed in a scanner burst, suppress keystroke from typing into any input
            e.preventDefault();
            e.stopPropagation();
          }
          this._scanBuffer += e.key;
        }
      }

      if (e.key === 'F1') {
        e.preventDefault();
        const customerInput = document.getElementById('sf-customer-name');
        if (customerInput) {
          if (customerInput.readOnly) {
            this.clearSelectedCustomer();
          }
          const freshInput = document.getElementById('sf-customer-name');
          if (freshInput) {
            freshInput.focus();
            freshInput.select();
            this.handleCustomerFocus();
          }
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('sf-fast-item-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        const recInput = document.getElementById('sf-received-amount');
        if (recInput) {
          recInput.focus();
          recInput.select();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        const cashInput = document.getElementById('sf-cash-tendered');
        if (cashInput) {
          cashInput.focus();
          cashInput.select();
        }
      } else if (e.key === 'F5' || e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        this.completeSale();
      } else if (e.key === 'F6' || e.code === 'F6' || e.key === 'F8' || e.code === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        app.openPriceChecker();
      }
    };
    window.addEventListener('keydown', this._keyHandler, true);
  },

  async completeSale(andPrint = true) {
    if (this.cart.length === 0) {
      app.showAlert({ title: 'Invoice Empty', message: 'Please add at least one item to complete the invoice.' });
      return;
    }

    for (const item of this.cart) {
      const itemQty = parseFloat(item.qty);
      if (isNaN(itemQty) || itemQty <= 0) {
        return app.showAlert({ title: 'Invalid Quantity', message: `Please enter a valid quantity for <b>${item.item_name}</b>.` });
      }
      const maxStock = this.getItemAvailableStock(item);
      if (itemQty > maxStock) {
        item.qty = maxStock;
      }
    }
    
    const customerNameInput = document.getElementById('sf-customer-name')?.value || this.customerName;
    const customerPhoneInput = document.getElementById('sf-customer-phone')?.value || this.customerPhone;
    const currentSaleNo = document.getElementById('sf-sale-number')?.value || this.saleNumber;
    
    let finalCustomerName = (customerNameInput || '').trim();
    let finalCustomerPhone = (customerPhoneInput || '').trim();

    let subtotal = 0;
    let totalDiscount = 0;
    let totalCost = 0;

    const items = this.cart.map(i => {
      const itemLineSub = i.qty * i.retail_price;
      subtotal += itemLineSub;

      let itemDiscAmt = 0;
      const discNum = parseFloat(i.discount) || 0;
      if (i.discountType === 'percent') {
        itemDiscAmt = (itemLineSub * discNum) / 100;
      } else {
        itemDiscAmt = discNum * i.qty;
      }
      totalDiscount += itemDiscAmt;
      totalCost += (i.qty * i.cost_price);

      const lineRetail = itemLineSub - itemDiscAmt;
      const unitDiscounted = lineRetail / i.qty;

      return {
        item_id: i.id,
        section: i.slug,
        description: i.description,
        qty: i.qty,
        unit: i.unit,
        unit_cost: i.cost_price,
        unit_retail: i.retail_price,
        unit_discounted: unitDiscounted,
        line_cost: i.qty * i.cost_price,
        line_retail: lineRetail,
        line_profit: lineRetail - (i.qty * i.cost_price)
      };
    });

    let additionalDisc = 0;
    const discCheckbox = document.getElementById('sf-disc-enable');
    const isDiscEnabled = discCheckbox ? discCheckbox.checked : this.isDiscountEnabled;
    const addDiscInput = document.getElementById('sf-additional-discount');
    if (isDiscEnabled && addDiscInput) {
      const val = parseFloat(addDiscInput.value) || 0;
      if (val > 0) {
        if (this.discountType === 'percent') {
          additionalDisc = (subtotal * val) / 100;
        } else {
          additionalDisc = val;
        }
      }
    }

    totalDiscount += additionalDisc;
    const netSubtotal = Math.max(0, subtotal - totalDiscount);

    // Adv Tax calculation
    const taxCheckbox = document.getElementById('sf-tax-enable');
    const isTaxEnabled = taxCheckbox ? taxCheckbox.checked : this.isTaxEnabled;

    let taxPercent = 2;
    const taxInput = document.getElementById('sf-tax-percent');
    if (taxInput && taxInput.value !== '') {
      const parsedTax = parseFloat(taxInput.value);
      taxPercent = !isNaN(parsedTax) ? parsedTax : 2;
    } else if (this.taxPercent !== undefined) {
      taxPercent = this.taxPercent;
    }
    const taxAmount = isTaxEnabled ? ((netSubtotal * taxPercent) / 100) : 0;
    const effectiveTaxPercent = isTaxEnabled ? taxPercent : 0;
    const grandTotal = netSubtotal + taxAmount;
    const totalProfit = grandTotal - totalCost;

    // Received amount
    const recInput = document.getElementById('sf-received-amount');
    let receivedAmount = grandTotal;
    if (recInput && recInput.value !== '') {
      const parsedRec = parseFloat(recInput.value);
      if (!isNaN(parsedRec)) receivedAmount = parsedRec;
    }

    const dueAmount = Math.max(0, grandTotal - receivedAmount);

    // Partial/Khata Payment Validation: Customer name is strictly required when there is a remaining balance
    if (dueAmount > 0) {
      if (!finalCustomerName) {
        return app.showAlert({
          title: 'Customer Name Required',
          message: 'This sale has an unpaid Khata balance of <b>Rs. ' + app.formatAmount(dueAmount) + '</b>.<br><br>Please enter the <b>Customer Name</b> and <b>Contact Phone</b> to add this to their Khata ledger.'
        });
      }

      // Check if new customer and phone is missing or invalid
      const existingCust = this.customers.find(c => c.name.toLowerCase() === finalCustomerName.toLowerCase() || (this.customerId && c.id === this.customerId));
      if (!existingCust && (!finalCustomerPhone || finalCustomerPhone.replace(/\D/g, '').length < 10)) {
        return app.showAlert({
          title: 'Phone Required',
          message: 'Please enter a valid 11-digit contact number for new customer <b>' + finalCustomerName + '</b> so their Khata account can be recorded properly.'
        });
      }
    }

    const saleStatus = (receivedAmount >= grandTotal) ? 'Paid' : (receivedAmount > 0 ? 'Partial' : 'Unpaid');

    const saleData = {
      proposal_number: currentSaleNo,
      customer_name: finalCustomerName || 'Walk-in Customer',
      shop_name: finalCustomerName || 'Walk-in Customer',
      shop_address: 'Wah Cantt',
      location: 'Wah Cantt',
      phone: finalCustomerPhone || '',
      date: new Date().toISOString(),
      subtotal: subtotal,
      tax_percent: effectiveTaxPercent,
      tax_amount: taxAmount,
      retail_total: grandTotal,
      cost_total: totalCost,
      profit: totalProfit,
      status: saleStatus,
      received_amount: receivedAmount,
      discount: totalDiscount,
      payment_method: this.paymentMethod || 'Cash',
      sale_mode: 'retail',
      items: items
    };

    if (this.editingSaleId) {
      saleData.id = this.editingSaleId;
    }

    const doSaveSale = async (shouldPrint = false) => {
      app.showLoading();
      try {
        const id = await window.api.saveProposal(saleData);

        // Update Customer Khata balance if due > 0 or if customer is registered
        let registeredCust = finalCustomerName ? this.customers.find(c => c.name.toLowerCase() === finalCustomerName.toLowerCase() || (this.customerId && c.id === this.customerId)) : null;
        let activeCustId = registeredCust ? registeredCust.id : null;

        if (dueAmount > 0 || registeredCust) {
          if (!registeredCust) {
            try {
              activeCustId = await window.api.saveCustomer({
                name: finalCustomerName,
                phone: finalCustomerPhone || '',
                address: 'Wah Cantt',
                amount: dueAmount,
                description: 'Created during invoice #' + currentSaleNo
              });
            } catch(e) {
              console.error("Failed to auto-create customer:", e);
            }
          } else {
            // Update existing customer balance
            const newBalance = (Number(registeredCust.amount) || 0) + dueAmount;
            try {
              await window.api.saveCustomer({
                id: registeredCust.id,
                name: registeredCust.name,
                phone: finalCustomerPhone || registeredCust.phone || '',
                address: registeredCust.address || 'Wah Cantt',
                amount: newBalance,
                description: registeredCust.description || ''
              });
            } catch(e) {
              console.error("Failed to update customer balance:", e);
            }
          }

          // Record Khata Ledger transaction
          if (activeCustId) {
            try {
              const txKey = `customers-${activeCustId}-transactions`;
              const txList = window.storage ? (window.storage.get(txKey) || []) : [];
              const priorBal = registeredCust ? (Number(registeredCust.amount) || 0) : 0;
              const closingBal = priorBal + dueAmount;

              txList.push({
                id: Date.now(),
                date: new Date().toISOString(),
                type: 'sale',
                invoice_number: currentSaleNo,
                amount: grandTotal,
                received: receivedAmount,
                due: dueAmount,
                balance: closingBal,
                method: this.paymentMethod || 'Cash',
                notes: `Invoice #${currentSaleNo} (Billed: Rs. ${grandTotal}, Received: Rs. ${receivedAmount}${dueAmount > 0 ? ', Due: Rs. ' + dueAmount : ''})`
              });

              if (window.storage) window.storage.set(txKey, txList);
            } catch(txErr) {
              console.error("Failed to append customer khata transaction:", txErr);
            }
          }
        }

        // Invalidate and refresh cache for Proposals, Dashboard, ItemSales, Customers, MasterDB
        try {
          if (window.Proposals) {
            const searchInput = document.getElementById('prop-search');
            if (searchInput) {
              searchInput.value = '';
              const clearBtn = document.getElementById('prop-search-clear-btn');
              if (clearBtn) clearBtn.classList.add('hidden');
            }
            if (typeof Proposals.resetPeriodToDefault === 'function') {
              Proposals.resetPeriodToDefault();
            }
            if (typeof Proposals.loadData === 'function') {
              Proposals.loadData();
            }
          }
          if (window.Dashboard && typeof Dashboard.loadStats === 'function') {
            Dashboard.loadStats();
          }
          if (window.ItemSales && typeof ItemSales.loadData === 'function') {
            ItemSales.loadData();
          }
          if (window.Customers && typeof Customers.loadData === 'function') {
            Customers.loadData();
          }
          if (window.MasterDB && typeof MasterDB.loadData === 'function') {
            MasterDB.loadData();
          }
        } catch(refreshErr) {
          console.warn("Background tab refresh error after sale:", refreshErr);
        }

        app.hideLoading();
        if (shouldPrint) {
          await this.generateReceipt(saleData);
          await app.printReceipt();
        }

        if (this.editingSaleId) {
          app.showAlert({ title: 'Invoice Saved', message: `Invoice <b>#${currentSaleNo}</b> updated successfully.` });
          app.navigate('proposals');
        } else {
          app.showToast(`Invoice #${currentSaleNo} completed successfully!`, 'success');
          app.navigate('proposal-form', { reset: true });
        }
      } catch (e) {
        console.error("Sale save error:", e);
        app.hideLoading();
        app.showAlert("Error saving invoice: " + (e.message || e));
      }
    };

    // If Save (no print) is triggered directly from the button when editing
    if (this.editingSaleId && andPrint === false) {
      await doSaveSale(false);
      return;
    }

    const receiptHtml = await this.generateReceipt(saleData);

    const summaryHtml = `
      <div class="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
        ${finalCustomerName ? `
        <div class="flex justify-between items-center text-slate-500">
          <span>Customer</span>
          <span class="font-bold text-slate-800">${finalCustomerName}</span>
        </div>` : ''}
        ${finalCustomerPhone ? `
        <div class="flex justify-between items-center text-slate-500">
          <span>Phone</span>
          <span class="font-bold text-slate-800">${finalCustomerPhone}</span>
        </div>` : ''}
        <div class="flex justify-between items-center text-slate-500">
          <span>Total Items</span>
          <span class="font-bold text-slate-800">${items.length} item${items.length === 1 ? '' : 's'} (${app.formatQty(items.reduce((s, i) => s + (Number(i.qty) || 0), 0))} qty)</span>
        </div>
        ${totalDiscount > 0 ? `
        <div class="flex justify-between items-center text-slate-500">
          <span>Sub Total</span>
          <span class="font-bold text-slate-800">${app.formatCurrency(subtotal)}</span>
        </div>
        <div class="flex justify-between items-center text-rose-500">
          <span>Total Discount</span>
          <span class="font-bold font-display">- ${app.formatCurrency(totalDiscount)}</span>
        </div>` : ''}
        ${(isTaxEnabled && taxAmount > 0) ? `
        <div class="flex justify-between items-center text-amber-600">
          <span>Tax (${taxPercent}%)</span>
          <span class="font-bold font-display">+ ${app.formatCurrency(taxAmount)}</span>
        </div>` : ''}
        <div class="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
          <span class="font-bold text-slate-700">Total Billed</span>
          <span class="font-black text-slate-900 text-base">${app.formatCurrency(grandTotal)}</span>
        </div>
        <div class="flex justify-between items-center text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
          <span>Amount Received (${this.paymentMethod})</span>
          <span class="font-black text-emerald-800 font-display">${app.formatCurrency(receivedAmount)}</span>
        </div>
        ${dueAmount > 0 ? `
        <div class="flex justify-between items-center text-sm font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg">
          <span>Added to Khata (Due)</span>
          <span class="font-black text-rose-800 font-display">${app.formatCurrency(dueAmount)}</span>
        </div>` : ''}
      </div>
    `;

    app.showConfirm({
      title: this.editingSaleId ? 'Confirm Update' : 'Confirm Invoice',
      message: `<p class="text-sm text-slate-600 leading-relaxed">${this.editingSaleId ? 'Save changes for invoice' : 'Save and print invoice'} <b class="font-black text-slate-900">#${currentSaleNo}</b>${finalCustomerName ? ' for <b class="font-black text-slate-900">' + finalCustomerName + '</b>' : ''}?</p>${summaryHtml}`,
      confirmText: this.editingSaleId ? 'Save & Print' : 'Complete & Print',
      confirmColor: 'green',
      altText: this.editingSaleId ? 'Save' : null,
      onAlt: this.editingSaleId ? (() => doSaveSale(false)) : null,
      previewHtml: receiptHtml,
      onConfirm: () => doSaveSale(true)
    });
  },

  // Exact matching 80mm thermal paper receipt design
  async generateReceipt(data) {
    const previewEl = document.getElementById('preview-paper');

    if (!this.settings || !this.settings.company_name) {
      this.settings = await window.api.getSettings();
    }

    const invoiceDate = data.date ? new Date(data.date) : new Date();
    const formattedDate = `${invoiceDate.getDate()}/${invoiceDate.getMonth() + 1}/${invoiceDate.getFullYear()}`;
    const invoiceTime = invoiceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawCustomerName = (data.customer_name || data.shop_name || '').trim();
    const isWalkIn = !rawCustomerName || 
      rawCustomerName.toLowerCase() === 'walk-in' || 
      rawCustomerName.toLowerCase() === 'walk-in customer' || 
      rawCustomerName.toLowerCase() === 'cash customer' || 
      rawCustomerName.toLowerCase() === 'parking canteen';
    const customerName = !isWalkIn ? rawCustomerName.toUpperCase() : '';
    const customerPhone = data.phone || '';
    const invNumber = data.proposal_number || this.saleNumber || '';

    const items = data.items || [];
    const totalQty = items.reduce((acc, item) => acc + (Number(item.qty) || 0), 0);

    if ((!this.availableItems || this.availableItems.length === 0) && window.api && typeof window.api.searchAllProducts === 'function') {
      try {
        this.availableItems = await window.api.searchAllProducts('');
      } catch (e) {}
    }

    let rowsHtml = '';
    let itemsGrossSubtotal = 0;
    if (items.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 8px 0; font-style: italic; color: #444;">No items</td>
        </tr>
      `;
    } else {
      items.forEach((item, i) => {
        const desc = (item.description || '').split(' - ')[0].toUpperCase();
        const rate = (item.unit_retail !== undefined && item.unit_retail !== null && Number(item.unit_retail) > 0)
          ? Number(item.unit_retail)
          : ((item.unit_discounted !== undefined && item.unit_discounted !== null) ? Number(item.unit_discounted) : Number(item.rate || 0));
        const lineTotal = (item.unit_retail !== undefined && item.unit_retail !== null && Number(item.unit_retail) > 0)
          ? (Number(item.qty) || 0) * Number(item.unit_retail)
          : (Number(item.line_retail) || ((Number(item.qty) || 0) * rate));
        
        itemsGrossSubtotal += lineTotal;
        const isLast = i === items.length - 1;

        let unitStr = (item.unit || item.unit_name || '').trim();
        if (!unitStr && this.availableItems && this.availableItems.length > 0) {
          const match = this.availableItems.find(p => (item.item_id && p.id === item.item_id) || (item.id && p.id === item.id) || (p.item_name && item.description && item.description.toUpperCase().startsWith(p.item_name.toUpperCase())));
          if (match && match.unit) {
            unitStr = match.unit.trim();
          }
        }
        if (!unitStr) {
          unitStr = 'PC';
        }
        let unitDisplay = unitStr.toUpperCase();
        if (unitDisplay === 'PCS' && Math.abs(Number(item.qty)) === 1) {
          unitDisplay = 'PC';
        }

        rowsHtml += `
          <tr style="border-bottom: ${isLast ? 'none' : '1px solid #000'}; font-size: 9.5px;">
            <td style="padding: 2.5px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000;">${i + 1}</td>
            <td style="padding: 2.5px 4px; text-align: left; font-weight: 800; word-break: break-word; line-height: 1.2; border-right: 1px solid #000;">
              <div>${desc}</div>
            </td>
            <td style="padding: 2.5px 2px; text-align: center; font-weight: 800; white-space: nowrap; border-right: 1px solid #000;">${app.formatQty(item.qty)} ${unitDisplay}</td>
            <td style="padding: 2.5px 3px; text-align: right; font-weight: 600; white-space: nowrap; border-right: 1px solid #000;">${app.formatAmount(rate)}</td>
            <td style="padding: 2.5px 4px; text-align: right; font-weight: 800; white-space: nowrap;">${app.formatAmount(lineTotal)}</td>
          </tr>
        `;
      });
    }

    const discountAmount = Number(data.discount) || 0;
    const taxPercent = (data.tax_percent !== undefined && data.tax_percent !== null) ? Number(data.tax_percent) : 0;
    const taxAmount = (data.tax_amount !== undefined && data.tax_amount !== null && Number(data.tax_amount) > 0)
      ? Number(data.tax_amount)
      : (taxPercent > 0 ? (((itemsGrossSubtotal - discountAmount) * taxPercent) / 100) : 0);

    const grandTotal = (data.retail_total !== undefined && data.retail_total !== null)
      ? Number(data.retail_total)
      : (itemsGrossSubtotal - discountAmount + taxAmount);

    const grossSubtotal = (itemsGrossSubtotal > 0)
      ? itemsGrossSubtotal
      : ((data.subtotal !== undefined && data.subtotal !== null && Number(data.subtotal) > grandTotal)
          ? Number(data.subtotal)
          : (grandTotal + discountAmount - taxAmount));

    const receivedAmount = (data.received_amount !== undefined && data.received_amount !== null)
      ? data.received_amount
      : grandTotal;

    const remainingDue = Math.max(0, grandTotal - receivedAmount);
    const paymentMethod = data.payment_method || 'Cash';

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace, sans-serif; color: #000; box-sizing: border-box; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 4px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${(this.settings.company_name || 'ISHAQ JADOON TRADERS').replace(/\s*\(Branch \d+\)/i, '').trim()}</h1>
          <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">${this.settings.address || 'Near CB Plaza, Barrier 3, Main GT Road, Wah Cantt'}</div>
          <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
            <div>M.Ishaq: 0301-2630481</div>
            <div>Ch. Shakir: 0300-5074410</div>
          </div>
          <div style="margin-top: 5px;">
            <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 12px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">SALES INVOICE</span>
          </div>
        </div>

        <!-- Invoice Details / Metadata -->
        <div style="font-size: 11px; line-height: 1.35; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
          <div style="display: flex; justify-content: space-between;">
            <span><b>INV #:</b> #${invNumber}</span>
            <span><b>DATE:</b> ${formattedDate} ${invoiceTime}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 1.5px;">
            ${customerName ? `<span><b>CUSTOMER:</b> ${customerName}</span>` : ''}
            <span style="${customerName ? '' : 'margin-left: auto;'}"><b>METHOD:</b> ${paymentMethod.toUpperCase()}</span>
          </div>
          ${(customerName && customerPhone) ? `
          <div style="display: flex; justify-content: space-between; margin-top: 1.5px;">
            <span><b>PHONE:</b> ${customerPhone}</span>
          </div>` : ''}
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5px; border: 1.5px solid #000;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
              <th style="padding: 3px 2px; text-align: center; width: 6%; border-right: 1px solid #000;">#</th>
              <th style="padding: 3px 4px; text-align: left; width: 42%; border-right: 1px solid #000;">ITEM</th>
              <th style="padding: 3px 2px; text-align: center; width: 20%; border-right: 1px solid #000;">QTY</th>
              <th style="padding: 3px 3px; text-align: right; width: 16%; border-right: 1px solid #000;">RATE</th>
              <th style="padding: 3px 4px; text-align: right; width: 16%;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div style="border-top: 1px dashed #000; padding-top: 4px; font-size: 11.5px; line-height: 1.45;">
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>SUB TOTAL:</span>
            <span style="font-weight: 800;">${app.formatAmount(grossSubtotal)}</span>
          </div>
          ${discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>DISCOUNT:</span>
            <span style="font-weight: 800;">-${app.formatAmount(discountAmount)}</span>
          </div>` : ''}
          ${(taxAmount > 0) ? `
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>TAX (${taxPercent}%):</span>
            <span style="font-weight: 800;">${app.formatAmount(taxAmount)}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; margin-top: 4px; font-size: 14.5px; font-weight: 900;">
            <span>TOTAL BILL:</span>
            <span style="font-size: 16.5px; font-weight: 900;">Rs. ${app.formatAmount(grandTotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px; font-size: 12px; font-weight: 900;">
            <span>RECEIVED (${paymentMethod.toUpperCase()}):</span>
            <span>Rs. ${app.formatAmount(receivedAmount)}</span>
          </div>
          ${remainingDue > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-top: 2px; font-size: 12px; font-weight: 900; color: #000; border-top: 1px dashed #000; padding-top: 2px;">
            <span>KHATA REMAINING:</span>
            <span>Rs. ${app.formatAmount(remainingDue)}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-top: 3px; font-size: 10px; font-weight: 600;">
            <span>Total Items: ${items.length} (Qty: ${app.formatQty(totalQty)})</span>
            <span>Status: <b>${remainingDue > 0 ? (receivedAmount > 0 ? 'PARTIAL' : 'CREDIT') : 'PAID'}</b></span>
          </div>
        </div>

        <!-- Footer Notice -->
        <div style="border-top: 1px dashed #000; margin-top: 6px; padding-top: 5px; text-align: center;">
          <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">
            *** Thank You For Shopping With Us! ***
          </div>
          <div style="font-size: 9.5px; font-weight: 700; color: #1e293b; margin-top: 2px;">
            Please Visit Again!
          </div>
        </div>

      </div>
    `;

    app.setPrintContent('receipt-print', html);
    if (previewEl) previewEl.innerHTML = html;
    return html;
  },

  generateReceiptHTML(data) {
    return this.generateReceipt(data);
  },

  showPrintPreview() {
    const titleEl = document.getElementById('preview-title');
    const subtitleEl = document.getElementById('preview-subtitle');
    if (titleEl) titleEl.textContent = 'Invoice Receipt Preview';
    if (subtitleEl) subtitleEl.textContent = '80MM THERMAL RECEIPT PREVIEW';
    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      printBtn.onclick = () => app.confirmPrint();
    }

    if (window.lucide) lucide.createIcons();
  },

  onClosePreview() {
    app.navigate('proposal-form');
  },

  onAfterPrint() {
    this.onClosePreview();
  },

  async loadAllItems() {
    this.availableItems = await window.api.searchAllProducts('');
  },

  confirmClearForm() {
    if (this.cart.length === 0 && !this.customerName) {
      this.resetForm();
      return;
    }
    app.showConfirm({
      title: 'Clear Current Bill',
      message: 'Are you sure you want to clear all items and start a fresh bill?',
      confirmText: 'Clear Bill',
      confirmColor: 'red',
      onConfirm: () => {
        this.resetForm();
      }
    });
  },

  async resetForm() {
    this.cart = [];
    this.customerId = null;
    this.customerName = '';
    this.customerPhone = '';
    this.customerBalance = 0;
    this.isReceivedManuallyEdited = false;
    this.receivedAmount = 0;
    this.cashTendered = '';
    this.editingSaleId = null;
    this.saleNumber = await window.api.getNextProposalNumber();
    const numInput = document.getElementById('sf-sale-number');
    if (numInput) numInput.value = this.saleNumber;
    this.clearSelectedCustomer();
    this.clearSearchInput();
    const tenderedInput = document.getElementById('sf-cash-tendered');
    if (tenderedInput) tenderedInput.value = '';
    const recInput = document.getElementById('sf-received-amount');
    if (recInput) recInput.value = '';
    this.renderCart();
    this.updateSummary();
    app.showToast('Bill cleared', 'info');
  },

  async refreshStockIndicators() {
    try {
      this.availableItems = await window.api.searchAllProducts('');
      this.renderCart();
    } catch (e) {
      console.error('Failed to refresh stock indicators:', e);
    }
  }
};
