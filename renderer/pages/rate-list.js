const RateList = {
  items: [],
  categories: [],
  filteredItems: [],
  selectedItem: null,
  historyLogs: [],
  searchQuery: '',
  selectedCategory: 'all',
  settings: null,
  pageSize: 50,
  displayLimit: 50,

  async render(container, args) {
    this.settings = await window.api.getSettings();
    this.categories = await window.api.getCategoryLabels();
    this.displayLimit = this.pageSize;
    await this.loadData();

    if (args && args.slug && args.id) {
      const found = this.items.find(i => i.slug === args.slug && i.id === Number(args.id));
      if (found) this.selectedItem = found;
    }

    if (!this.selectedItem && this.items.length > 0) {
      this.selectedItem = this.items[0];
    }

    container.innerHTML = `
      <div class="flex flex-col h-[calc(100vh-120px)] overflow-hidden gap-4">
        <!-- Top Bar Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 shrink-0 no-print">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <i data-lucide="tags" class="w-5 h-5"></i>
            </div>
            <h2 class="text-3xl font-bold text-slate-800">Rate List & Cost Analysis</h2>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="RateList.printAllRates()" class="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-slate-900 cursor-pointer">
              <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i>
              <span>Print Full Rate List</span>
            </button>
          </div>
        </div>

        <!-- Master-Detail 2-Column Grid -->
        <div class="flex-1 grid grid-cols-12 gap-4 min-h-0 overflow-hidden">
          
          <!-- LEFT COLUMN: Master Products Table (5 cols) -->
          <div class="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <!-- Search & Filters Header -->
            <div class="p-3 border-b border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
              <div class="relative">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                <input type="text" id="ratelist-search" 
                  value="${this.searchQuery}"
                  oninput="RateList.onSearch(this.value)" 
                  placeholder="Search item name or code..." 
                  class="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-accent focus:ring-2 focus:ring-amber-100 transition-all">
                <button type="button" 
                        id="ratelist-search-clear-btn" 
                        onclick="RateList.clearSearch()" 
                        title="Clear search" 
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer ${this.searchQuery ? '' : 'hidden'}">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              <!-- Category Filter Pills (Multi-line Wrap) -->
              <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                <button onclick="RateList.onCategoryChange('all')" 
                  class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${this.selectedCategory === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                  All (${this.items.length})
                </button>
                ${this.categories.map(c => {
                  const count = this.items.filter(i => i.slug === c.slug).length;
                  const isAct = this.selectedCategory === c.slug;
                  return `
                    <button onclick="RateList.onCategoryChange('${c.slug}')" 
                      class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${isAct ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                      ${c.label} (${count})
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Items Table List -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-0">
              <table class="w-full text-left border-collapse text-xs">
                <thead class="bg-slate-50 text-slate-600 sticky top-0 z-10 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th class="py-2.5 px-3 border-r border-slate-200">Item / Category</th>
                    <th class="py-2.5 px-2 text-right border-r border-slate-200 w-16">Stock</th>
                    <th class="py-2.5 px-2 text-right border-r border-slate-200 w-20">Cost</th>
                    <th class="py-2.5 px-2 text-right border-r border-slate-200 w-20">Sale</th>
                    <th class="py-2.5 px-3 text-right w-16">Profit</th>
                  </tr>
                </thead>
                <tbody id="ratelist-items-tbody" class="divide-y divide-slate-100">
                  ${this.renderItemsTableRows()}
                </tbody>
              </table>
            </div>

            <!-- Table Footer Stats & Pagination -->
            <div id="ratelist-table-footer" class="p-2.5 px-3.5 bg-slate-50 border-t border-slate-200 text-[11px] font-bold text-slate-500 flex justify-between items-center shrink-0">
              ${this.renderTableFooter()}
            </div>
          </div>

          <!-- RIGHT COLUMN: Detail View (Stats Cards + Rate History Log) (7 cols) -->
          <div class="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden" id="ratelist-detail-panel">
            ${this.renderDetailPanel()}
          </div>

        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    if (this.selectedItem) {
      await this.loadItemHistory(this.selectedItem.slug, this.selectedItem.id);
    }
  },

  async loadData() {
    try {
      this.items = await window.api.getAllRatesList();
      this.applyFilter();
    } catch (e) {
      console.error("Failed to load rate list:", e);
      this.items = [];
      this.filteredItems = [];
    }
  },

  applyFilter() {
    const q = (this.searchQuery || '').trim().toLowerCase();
    this.filteredItems = this.items.filter(item => {
      const matchCat = this.selectedCategory === 'all' || item.slug === this.selectedCategory;
      const matchQuery = !q || 
        (item.item_name && item.item_name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.barcode && item.barcode.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });

    if (q) {
      this.filteredItems.sort((a, b) => {
        const bcA = String(a.barcode || '').toLowerCase();
        const bcB = String(b.barcode || '').toLowerCase();
        if (bcA === q && bcB !== q) return -1;
        if (bcB === q && bcA !== q) return 1;

        const nameA = String(a.item_name || '').toLowerCase();
        const nameB = String(b.item_name || '').toLowerCase();
        const descA = String(a.description || '').toLowerCase();
        const descB = String(b.description || '').toLowerCase();

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
    }

    if (this.selectedItem) {
      const updated = this.items.find(i => i.slug === this.selectedItem.slug && i.id === this.selectedItem.id);
      if (updated) this.selectedItem = updated;
    }
  },

  renderItemsTableRows() {
    if (this.filteredItems.length === 0) {
      return `
        <tr>
          <td colspan="5" class="py-12 text-center text-slate-400">
            <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
            <p class="font-bold text-xs">No matching products found</p>
          </td>
        </tr>
      `;
    }

    const visibleItems = this.filteredItems.slice(0, this.displayLimit);
    return visibleItems.map(item => {
      const isSelected = this.selectedItem && this.selectedItem.slug === item.slug && this.selectedItem.id === item.id;
      const margin = item.retail_price - item.cost_price;
      const marginPct = item.cost_price > 0 ? Math.round((margin / item.cost_price) * 100) : 0;
      const isLowStock = item.current_stock <= 5;

      return `
        <tr id="ratelist-row-${item.slug}-${item.id}"
          data-slug="${item.slug}"
          data-id="${item.id}"
          onclick="RateList.selectItem('${item.slug}', ${item.id})" 
          class="ratelist-row cursor-pointer transition-all ${isSelected ? 'is-selected bg-amber-100/90 border-l-[5px] border-l-amber-600 font-black text-slate-950 ring-1 ring-inset ring-amber-300/80 shadow-xs' : 'hover:bg-slate-50/80'}">
          <td class="py-2.5 px-3 border-r border-slate-200">
            <div class="font-bold text-slate-800 truncate max-w-[180px]">${item.item_name}</div>
            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
              ${item.barcode ? `<span class="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded" title="Barcode: ${item.barcode}">#${item.barcode}</span>` : ''}
              <span class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">${item.category_label}</span>
              ${item.unit ? `<span class="text-[9px] font-bold text-slate-400">${item.unit}</span>` : ''}
            </div>
          </td>
          <td class="py-2.5 px-2 text-right border-r border-slate-200">
            <span class="px-2 py-0.5 rounded-full font-black text-[11px] ${isLowStock ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-700'}">
              ${app.formatQty(item.current_stock)}
            </span>
          </td>
          <td class="py-2.5 px-2 text-right font-bold text-slate-600 border-r border-slate-200">
            Rs. ${Number(item.cost_price || 0).toLocaleString()}
          </td>
          <td class="py-2.5 px-2 text-right font-black text-slate-800 border-r border-slate-200">
            Rs. ${Number(item.retail_price || 0).toLocaleString()}
          </td>
          <td class="py-2.5 px-3 text-right">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-black ${margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
              ${marginPct > 0 ? '+' : ''}${marginPct}%
            </span>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderDetailPanel() {
    if (!this.selectedItem) {
      return `
        <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <i data-lucide="cursor-click" class="w-12 h-12 text-slate-300 mb-3 animate-bounce"></i>
          <h3 class="text-base font-bold text-slate-700">Select an Item</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-xs">Click on any product from the table on the left to view its rate details, stock valuation, and cost change history.</p>
        </div>
      `;
    }

    const item = this.selectedItem;
    const stock = Number(item.current_stock) || 0;
    const cost = Number(item.cost_price) || 0;
    const retail = Number(item.retail_price) || 0;
    const stockValuation = stock * cost;
    const margin = retail - cost;
    const marginPct = cost > 0 ? Math.round((margin / cost) * 100 * 10) / 10 : 0;
    const latestCost = Number(
      (this.historyLogs && this.historyLogs.find(l => Number(l.purchase_price) > 0)?.purchase_price) || 
      item.last_purchase_price || 
      item.cost_price || 
      0
    );

    return `
      <!-- Selected Item Header -->
      <div class="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-black text-slate-900 tracking-tight">${item.item_name}</h2>
            <span class="px-2 py-0.5 bg-amber-500/10 text-amber-800 border border-amber-500/20 text-[10px] font-black uppercase rounded-md">${item.category_label}</span>
            <span class="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md uppercase">${item.unit || 'PCS'}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5 font-medium">${item.description || 'No description provided'}</p>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="app.openBarcodeStickerModal(RateList.selectedItem)" class="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer" title="Print Barcode Stickers (Speed-X SP-650UL)">
            <i data-lucide="scan-barcode" class="w-3.5 h-3.5"></i>
            <span>Print Sticker</span>
          </button>
          <button onclick="RateList.printItemHistory()" class="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer" title="Print Item Rate History">
            <i data-lucide="printer" class="w-3.5 h-3.5 text-slate-500"></i>
            <span>Print Item Log</span>
          </button>
        </div>
      </div>

      <!-- Detail Body (Scrollable) -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        
        <!-- 5 STATS CARDS FOR SELECTED ITEM (NO ICONS FOR CLEAN SPACE) -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <!-- Card 1: Current Stock & Valuation -->
          <div class="bg-gradient-to-br from-slate-50 to-slate-100/60 p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">In-Stock Qty</span>
            <div class="mt-2">
              <div class="text-xl font-black text-slate-900">${stock} <span class="text-xs font-bold text-slate-500">${item.unit || 'pcs'}</span></div>
              <div class="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">Value: <span class="text-slate-800 font-bold"><span class="text-[9px] font-medium text-slate-400">Rs.</span> ${stockValuation.toLocaleString()}</span></div>
            </div>
          </div>

          <!-- Card 2: Latest Cost Price -->
          <div class="bg-gradient-to-br from-sky-50/50 to-sky-100/40 p-3.5 rounded-xl border border-sky-200/80 shadow-xs flex flex-col justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-sky-800">Latest Cost Price</span>
            <div class="mt-2">
              <div id="ratelist-latest-cost-val" class="text-xl font-black text-sky-950"><span class="text-xs font-bold text-sky-700/60 mr-0.5">Rs.</span>${latestCost.toLocaleString()}</div>
              <div class="text-[10px] font-bold text-sky-700/80 mt-0.5">Last Purchase Rate</div>
            </div>
          </div>

          <!-- Card 3: Avg Cost Price -->
          <div class="bg-gradient-to-br from-amber-50/40 to-amber-100/30 p-3.5 rounded-xl border border-amber-200/70 shadow-xs flex flex-col justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-800">Avg Cost Price</span>
            <div class="mt-2">
              <div class="text-xl font-black text-amber-950"><span class="text-xs font-bold text-amber-700/60 mr-0.5">Rs.</span>${cost.toLocaleString()}</div>
              <div class="text-[10px] font-bold text-amber-700/80 mt-0.5">Weighted Avg Cost</div>
            </div>
          </div>

          <!-- Card 4: Fixed Sale Price -->
          <div class="bg-gradient-to-br from-indigo-50/40 to-indigo-100/30 p-3.5 rounded-xl border border-indigo-200/70 shadow-xs flex flex-col justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-indigo-800">Sale Price</span>
            <div class="mt-2">
              <div class="text-xl font-black text-indigo-950"><span class="text-xs font-bold text-indigo-700/60 mr-0.5">Rs.</span>${retail.toLocaleString()}</div>
              <div class="text-[10px] font-semibold text-indigo-700/80 mt-0.5">Fixed Sale Rate</div>
            </div>
          </div>

          <!-- Card 5: Profit -->
          <div class="bg-gradient-to-br from-emerald-50/40 to-emerald-100/30 p-3.5 rounded-xl border border-emerald-200/70 shadow-xs flex flex-col justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-800">Profit</span>
            <div class="mt-2">
              <div class="text-xl font-black text-emerald-950"><span class="text-xs font-bold text-emerald-700/60 mr-0.5">Rs.</span>${margin.toLocaleString()}</div>
              <div class="text-[10px] font-extrabold ${margin >= 0 ? 'text-emerald-700' : 'text-rose-600'} mt-0.5">
                ${marginPct > 0 ? '+' : ''}${marginPct}% Net Profit
              </div>
            </div>
          </div>

        </div>

        <!-- RATE CHANGES & COST LOG TABLE -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i data-lucide="history" class="w-4 h-4 text-slate-600"></i>
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Rate Changes & Cost Calculation History</h3>
            </div>
            <span class="text-[10px] font-bold text-slate-400" id="ratelist-log-count">
              ${this.historyLogs.length} entries recorded
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100/70 text-slate-500 border-b border-slate-200 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th class="py-2.5 px-3 border-r border-slate-200">Date / Time</th>
                  <th class="py-2.5 px-2.5 border-r border-slate-200">Source / Action</th>
                  <th class="py-2.5 px-2.5 text-right border-r border-slate-200">Added Qty</th>
                  <th class="py-2.5 px-2.5 text-right border-r border-slate-200">Purchase Price</th>
                  <th class="py-2.5 px-2.5 text-right border-r border-slate-200">Cost Price (Old &rarr; New)</th>
                  <th class="py-2.5 px-2.5 text-right border-r border-slate-200">Sale Price</th>
                  <th class="py-2.5 px-3 border-r border-slate-200">Notes</th>
                  <th class="py-2.5 px-2 text-center no-print">Action</th>
                </tr>
              </thead>
              <tbody id="ratelist-history-tbody" class="divide-y divide-slate-100">
                ${this.renderHistoryTableRows()}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  renderHistoryTableRows() {
    if (!this.historyLogs || this.historyLogs.length === 0) {
      return `
        <tr>
          <td colspan="8" class="py-10 text-center text-slate-400">
            <i data-lucide="file-clock" class="w-8 h-8 mx-auto mb-1.5 text-slate-300"></i>
            <p class="font-bold text-xs">No rate change logs recorded yet</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Purchases and stock adjustments will automatically log here.</p>
          </td>
        </tr>
      `;
    }

    return this.historyLogs.map(log => {
      const isStockIn = log.source === 'Stock In';
      const isManual = log.source === 'Manual Edit';
      const isInitial = log.source === 'Initial';

      let sourceBadge = `bg-slate-100 text-slate-700`;
      if (isStockIn) sourceBadge = `bg-emerald-50 text-emerald-700 border border-emerald-200`;
      else if (isManual) sourceBadge = `bg-amber-50 text-amber-700 border border-amber-200`;
      else if (isInitial) sourceBadge = `bg-blue-50 text-blue-700 border border-blue-200`;

      const oldCost = Number(log.old_cost_price) || 0;
      const newCost = Number(log.new_cost_price) || 0;
      const inPrice = Number(log.purchase_price) || 0;
      const inQty = Number(log.added_qty) || 0;
      const costChanged = oldCost !== newCost;

      return `
        <tr class="hover:bg-slate-50/60 transition-colors">
          <td class="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap text-[11px] border-r border-slate-200">
            ${app.formatDateTime(log.created_at) || 'Just now'}
          </td>
          <td class="py-2.5 px-2.5 whitespace-nowrap border-r border-slate-200">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${sourceBadge}">
              ${log.source || 'Stock In'}
            </span>
          </td>
          <td class="py-2.5 px-2.5 text-right font-black text-slate-800 whitespace-nowrap border-r border-slate-200">
            ${inQty > 0 ? `+${inQty}` : inQty}
            <span class="text-[10px] text-slate-400 font-normal"> (Tot: ${log.new_stock})</span>
          </td>
          <td class="py-2.5 px-2.5 text-right font-bold text-slate-700 whitespace-nowrap border-r border-slate-200">
            Rs. ${inPrice.toLocaleString()}
          </td>
          <td class="py-2.5 px-2.5 text-right whitespace-nowrap border-r border-slate-200">
            <div class="flex items-center justify-end gap-1 font-bold">
              <span class="text-slate-400 line-through text-[10px]">Rs. ${oldCost.toLocaleString()}</span>
              <i data-lucide="arrow-right" class="w-3 h-3 text-amber-500"></i>
              <span class="font-black ${costChanged ? 'text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200' : 'text-slate-800'}">Rs. ${newCost.toLocaleString()}</span>
            </div>
          </td>
          <td class="py-2.5 px-2.5 text-right font-bold text-slate-800 whitespace-nowrap border-r border-slate-200">
            Rs. ${Number(log.retail_price || 0).toLocaleString()}
          </td>
          <td class="py-2.5 px-3 text-slate-500 text-[11px] max-w-[150px] truncate border-r border-slate-200" title="${log.notes || ''}">
            ${log.notes || '-'}
          </td>
          <td class="py-2.5 px-2 text-center whitespace-nowrap no-print">
            <button onclick="RateList.deleteHistoryLog(${log.id})" class="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Delete Log Entry">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async selectItem(slug, id) {
    const numId = Number(id);
    const found = this.items.find(i => i.slug === slug && i.id === numId);
    if (!found) return;
    this.selectedItem = found;

    // Fast DOM selection class toggle (0ms instant response)
    const prevSelected = document.querySelector('#ratelist-items-tbody tr.is-selected');
    if (prevSelected) {
      prevSelected.className = 'ratelist-row cursor-pointer transition-all hover:bg-slate-50/80';
    }
    const curRow = document.getElementById(`ratelist-row-${slug}-${numId}`);
    if (curRow) {
      curRow.className = 'ratelist-row cursor-pointer transition-all is-selected bg-amber-100/90 border-l-[5px] border-l-amber-600 font-black text-slate-950 ring-1 ring-inset ring-amber-300/80 shadow-xs';
    }

    const detailPanel = document.getElementById('ratelist-detail-panel');
    if (detailPanel) {
      detailPanel.innerHTML = this.renderDetailPanel();
      if (window.lucide) lucide.createIcons({ root: detailPanel });
    }

    await this.loadItemHistory(slug, numId);
  },

  async loadItemHistory(slug, id) {
    try {
      this.historyLogs = await window.api.getRateHistory(slug, id);
    } catch (e) {
      console.error("Failed to load rate history:", e);
      this.historyLogs = [];
    }

    const countElem = document.getElementById('ratelist-log-count');
    if (countElem) countElem.innerText = `${this.historyLogs.length} entries recorded`;

    const latestLog = (this.historyLogs || []).find(l => Number(l.purchase_price) > 0);
    const latestCostElem = document.getElementById('ratelist-latest-cost-val');
    if (latestCostElem) {
      const val = latestLog ? Number(latestLog.purchase_price) : (this.selectedItem?.last_purchase_price || this.selectedItem?.cost_price || 0);
      latestCostElem.innerHTML = `<span class="text-xs font-bold text-sky-700/60 mr-0.5">Rs.</span>${Number(val).toLocaleString()}`;
    }

    const histTbody = document.getElementById('ratelist-history-tbody');
    if (histTbody) {
      histTbody.innerHTML = this.renderHistoryTableRows();
      if (window.lucide) lucide.createIcons({ root: histTbody });
    }
  },

  renderTableFooter() {
    const total = this.filteredItems.length;
    const current = Math.min(this.displayLimit, total);
    const hasMore = total > current;

    return `
      <div class="flex items-center gap-1.5">
        <span>Showing <span class="text-slate-900 font-black">${current}</span> of <span class="text-slate-900 font-black">${total}</span></span>
      </div>
      <div class="flex items-center gap-1.5">
        ${hasMore ? `
          <button onclick="RateList.loadMore()" class="px-2.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-xs font-black shadow-2xs transition-all cursor-pointer">
            + Load ${Math.min(this.pageSize, total - current)} More
          </button>
          <button onclick="RateList.showAll()" class="px-2.5 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer">
            Show All
          </button>
        ` : `
          <span class="text-slate-400 font-medium">All loaded</span>
        `}
      </div>
    `;
  },

  loadMore() {
    this.displayLimit += this.pageSize;
    this.updateTable();
  },

  showAll() {
    this.displayLimit = this.filteredItems.length;
    this.updateTable();
  },

  updateTable() {
    const tbody = document.getElementById('ratelist-items-tbody');
    if (tbody) {
      tbody.innerHTML = this.renderItemsTableRows();
    }
    const footer = document.getElementById('ratelist-table-footer');
    if (footer) {
      footer.innerHTML = this.renderTableFooter();
    }
  },

  clearSearch() {
    const input = document.getElementById('ratelist-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.onSearch('');
  },

  onSearch(query) {
    this.searchQuery = query;
    const clearBtn = document.getElementById('ratelist-search-clear-btn');
    if (clearBtn) {
      if ((query || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }
    this.displayLimit = this.pageSize;
    this.applyFilter();
    this.updateTable();
  },

  onCategoryChange(catSlug) {
    this.selectedCategory = catSlug;
    this.displayLimit = this.pageSize;
    this.applyFilter();
    const container = document.getElementById('tab-panel-rate-list') || document.getElementById('app-content');
    if (container) {
      this.render(container);
    }
  },

  async deleteHistoryLog(logId) {
    app.showConfirm("Are you sure you want to delete this rate log entry? This will not revert current stock.", async () => {
      try {
        await window.api.deleteRateHistory(logId);
        app.showToast("Rate log entry deleted", "info");
        if (this.selectedItem) {
          await this.loadItemHistory(this.selectedItem.slug, this.selectedItem.id);
        }
      } catch (e) {
        app.showToast("Failed to delete log: " + e.message, "error");
      }
    });
  },


  // 80MM RECEIPT PRINTING
  printItemHistory() {
    if (!this.selectedItem) return;
    const item = this.selectedItem;
    const s = this.settings || {};
    const stock = Number(item.current_stock) || 0;
    const cost = Number(item.cost_price) || 0;
    const retail = Number(item.retail_price) || 0;
    const margin = retail - cost;
    const marginPct = cost > 0 ? Math.round((margin / cost) * 100) : 0;
    const logs = this.historyLogs || [];

    const rowsHtml = logs.length === 0 ? `
      <tr>
        <td colspan="5" style="text-align: center; padding: 6px 0; font-style: italic; color: #444;">No rate change history</td>
      </tr>
    ` : logs.map((h, i, arr) => `
      <tr style="border-bottom: ${i === arr.length - 1 ? 'none' : '1px solid #000'}; font-size: 9.5px;">
        <td style="padding: 2.5px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000;">${i + 1}</td>
        <td style="padding: 2.5px 4px; text-align: left; font-weight: 600; border-right: 1px solid #000;">${(h.created_at || '').substring(0, 10)}</td>
        <td style="padding: 2.5px 2px; text-align: center; font-weight: 800; border-right: 1px solid #000;">+${h.added_qty || 0}</td>
        <td style="padding: 2.5px 3px; text-align: right; font-weight: 600; border-right: 1px solid #000;">${Number(h.purchase_price || 0).toLocaleString()}</td>
        <td style="padding: 2.5px 4px; text-align: right; font-weight: 800;">${Number(h.new_cost_price || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <div class="receipt-80mm" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; color: #000; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
        <div style="text-align: center; margin-bottom: 4px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${s.company_name || 'ISHAQ JADOON TRADERS'}</h1>
          <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">Near CB Plaza, Barrier 3, Main GT Road, Wah Cantt</div>
          <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
            <div>M.Ishaq: 0301-2630481</div>
            <div>Ch. Shakir: 0300-5074410</div>
          </div>
          <div style="margin-top: 5px;">
            <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">ITEM RATE & COST LOG</span>
          </div>
        </div>

        <div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000; font-size: 10.5px; line-height: 1.4;">
          <div><strong>Item:</strong> ${item.item_name}</div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>Category:</strong> ${item.category_label || '-'}</span>
            <span><strong>Unit:</strong> ${item.unit || 'pcs'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>Current Stock:</strong> ${stock}</span>
            <span><strong>Valuation:</strong> Rs. ${(stock * cost).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>Avg Cost Price:</strong> Rs. ${cost.toLocaleString()}</span>
            <span><strong>Sale Price:</strong> Rs. ${retail.toLocaleString()} (${marginPct}%)</span>
          </div>
          <div style="font-size: 9.5px; color: #444; margin-top: 1px;">
            <span><strong>Date:</strong> ${app.formatDateTime ? app.formatDateTime(new Date().toISOString()) : new Date().toLocaleString()}</span>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5px; border: 1.5px solid #000;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
              <th style="padding: 3px 2px; text-align: center; width: 8%; border-right: 1px solid #000;">#</th>
              <th style="padding: 3px 4px; text-align: left; width: 32%; border-right: 1px solid #000;">DATE</th>
              <th style="padding: 3px 2px; text-align: center; width: 16%; border-right: 1px solid #000;">+QTY</th>
              <th style="padding: 3px 3px; text-align: right; width: 22%; border-right: 1px solid #000;">IN-PRICE</th>
              <th style="padding: 3px 4px; text-align: right; width: 22%;">NEW COST</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="text-align: center; font-size: 9px; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px;">
          <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** Ishaq Jadoon Traders - Internal Record ***</p>
        </div>
      </div>
    `;

    app.showPreview(html, `Rate Log: ${item.item_name}`, '80MM THERMAL RECEIPT • RATE LOG');
  },

  printAllRates() {
    const s = this.settings || {};
    const items = this.filteredItems || this.items || [];

    const rowsHtml = items.length === 0 ? `
      <tr>
        <td colspan="5" style="text-align: center; padding: 6px 0; font-style: italic; color: #444;">No items found</td>
      </tr>
    ` : items.map((i, idx, arr) => `
      <tr style="border-bottom: ${idx === arr.length - 1 ? 'none' : '1px solid #000'}; font-size: 9.5px;">
        <td style="padding: 2.5px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000;">${idx + 1}</td>
        <td style="padding: 2.5px 4px; text-align: left; font-weight: 800; word-break: break-word; line-height: 1.2; border-right: 1px solid #000;">
          <div>${i.item_name}</div>
          <div style="font-size: 7.5px; font-weight: normal; color: #333;">${i.category_label || ''}</div>
        </td>
        <td style="padding: 2.5px 2px; text-align: center; font-weight: 800; border-right: 1px solid #000;">${app.formatQty(i.current_stock || 0)}</td>
        <td style="padding: 2.5px 3px; text-align: right; font-weight: 600; border-right: 1px solid #000;">${Number(i.cost_price || 0).toLocaleString()}</td>
        <td style="padding: 2.5px 4px; text-align: right; font-weight: 800;">${Number(i.retail_price || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <div class="receipt-80mm" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; color: #000; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
        <div style="text-align: center; margin-bottom: 4px;">
          <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${s.company_name || 'ISHAQ JADOON TRADERS'}</h1>
          <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">Near CB Plaza, Barrier 3, Main GT Road, Wah Cantt</div>
          <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
            <div>M.Ishaq: 0301-2630481</div>
            <div>Ch. Shakir: 0300-5074410</div>
          </div>
          <div style="margin-top: 5px;">
            <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">MASTER RATE LIST</span>
          </div>
          <div style="font-size: 9px; color: #444; margin-top: 2px;">Generated: ${app.formatDateTime ? app.formatDateTime(new Date().toISOString()) : new Date().toLocaleString()} (${items.length} items)</div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5px; border: 1.5px solid #000;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
              <th style="padding: 3px 2px; text-align: center; width: 7%; border-right: 1px solid #000;">#</th>
              <th style="padding: 3px 4px; text-align: left; width: 45%; border-right: 1px solid #000;">ITEM</th>
              <th style="padding: 3px 2px; text-align: center; width: 14%; border-right: 1px solid #000;">STK</th>
              <th style="padding: 3px 3px; text-align: right; width: 17%; border-right: 1px solid #000;">COST</th>
              <th style="padding: 3px 4px; text-align: right; width: 17%;">SALE</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="text-align: center; font-size: 9px; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px;">
          <p style="margin: 0; font-weight: 700; text-transform: uppercase;">*** Ishaq Jadoon Traders ***</p>
        </div>
      </div>
    `;

    app.showPreview(html, `Master Rate List`, `80MM THERMAL RECEIPT • ${items.length} ITEMS`);
  }
};

window.RateList = RateList;
