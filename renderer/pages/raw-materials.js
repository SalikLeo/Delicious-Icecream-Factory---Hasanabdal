// Stage 1: Raw Materials Stock & Management
window.RawMaterials = {
  materials: [],
  logs: [],
  activeTab: 'inventory', // 'inventory' | 'purchase' | 'logs'
  searchQuery: '',

  async render(container) {
    this.container = container;
    await this.loadData();
  },

  async loadData() {
    try {
      this.materials = await window.api.getRawMaterials() || [];
      this.logs = await window.api.getRawMaterialLogs() || [];
      this.renderUI();
    } catch (e) {
      console.error('Failed to load raw materials:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading raw materials: ${e.message}</div>`;
      }
    }
  },

  renderUI() {
    if (!this.container) return;

    const totalMaterials = this.materials.length;
    const totalValue = this.materials.reduce((sum, m) => sum + (m.total_value || (m.current_stock * m.cost_price)), 0);
    const lowStockCount = this.materials.filter(m => m.current_stock <= (m.min_stock_alert || 0)).length;

    const filtered = this.materials.filter(m => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (m.name || '').toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q);
    });

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-5 max-w-7xl mx-auto">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-emerald-800/40">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-black border border-emerald-500/30">STAGE 1</span>
              <h2 class="text-2xl font-black tracking-tight text-white">Raw Materials Stock Management</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Manage factory raw stock (Milk, Sugar, Sticks, Wrappers, Cocoa). Track what is purchased and what is left behind.</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="RawMaterials.openAddModal()" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> + Add New Material
            </button>
            <button onclick="RawMaterials.openPurchaseModal()" class="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="shopping-bag" class="w-4 h-4 text-emerald-600"></i> + Purchase / Stock-In
            </button>
            <button onclick="RawMaterials.printReport()" class="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer" title="Print Stock Sheet">
              <i data-lucide="printer" class="w-4 h-4"></i> Print
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Raw Materials</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">${totalMaterials} <span class="text-xs font-bold text-slate-400">items</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <i data-lucide="boxes" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Raw Stock Value</p>
              <h3 class="text-2xl font-black text-emerald-700 mt-1 tabular-nums">Rs. ${Math.round(totalValue).toLocaleString()}</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <i data-lucide="coins" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Low Stock Warning</p>
              <h3 class="text-2xl font-black ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'} mt-1 tabular-nums">
                ${lowStockCount} <span class="text-xs font-bold text-slate-400">items need refill</span>
              </h3>
            </div>
            <div class="w-11 h-11 rounded-xl ${lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center font-black">
              <i data-lucide="alert-triangle" class="w-5 h-5"></i>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs & Search -->
        <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-3">
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button onclick="RawMaterials.switchTab('inventory')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Current Stock Inventory
            </button>
            <button onclick="RawMaterials.switchTab('logs')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Usage &amp; Stock Movement Log
            </button>
          </div>

          <div class="relative w-full sm:w-72">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" placeholder="Search raw material..." value="${this.searchQuery}" oninput="RawMaterials.onSearch(this.value)"
                   class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-400">
          </div>
        </div>

        <!-- Content Area -->
        <div class="flex-1 bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          ${this.activeTab === 'inventory' ? this.renderInventoryTable(filtered) : this.renderLogsTable()}
        </div>

      </div>

      <!-- Add/Edit Material Modal Container -->
      <div id="rm-modal-container"></div>
    `;

    if (window.lucide) lucide.createIcons({ root: this.container });
  },

  renderInventoryTable(items) {
    if (items.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="package-x" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No raw materials found</h4>
          <p class="text-xs text-slate-400 mt-1">Click "+ Add New Material" to register Milk, Sugar, Sticks, etc.</p>
        </div>
      `;
    }

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-3 px-4 border-r border-slate-200">Material Name</th>
              <th class="py-3 px-4 border-r border-slate-200">Category</th>
              <th class="py-3 px-4 border-r border-slate-200">Unit</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Current Stock (Left Behind)</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Cost Price / Unit</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Total Stock Value</th>
              <th class="py-3 px-4 text-center border-r border-slate-200">Status</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${items.map(m => {
              const isLow = m.current_stock <= (m.min_stock_alert || 0);
              const val = Math.round(m.current_stock * m.cost_price);
              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-3 px-4 border-r border-slate-200">
                    <div class="font-black text-slate-900 text-sm">${m.name}</div>
                    ${m.notes ? `<div class="text-[10px] text-slate-400 font-normal">${m.notes}</div>` : ''}
                  </td>
                  <td class="py-3 px-4 border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">${m.category || 'General'}</span>
                  </td>
                  <td class="py-3 px-4 font-mono font-bold text-slate-600 border-r border-slate-200">${m.unit}</td>
                  <td class="py-3 px-4 text-right font-black text-base tabular-nums border-r border-slate-200 ${isLow ? 'text-rose-600' : 'text-emerald-700'}">
                    ${Number(m.current_stock).toFixed(1).replace(/\.0$/, '')} <span class="text-xs font-normal text-slate-400">${m.unit}</span>
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-bold text-slate-700 tabular-nums border-r border-slate-200">Rs. ${Number(m.cost_price).toFixed(2).replace(/\.00$/, '')}</td>
                  <td class="py-3 px-4 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">Rs. ${val.toLocaleString()}</td>
                  <td class="py-3 px-4 text-center border-r border-slate-200">
                    ${isLow 
                      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-[10px] border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Low Stock</span>`
                      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">In Stock</span>`
                    }
                  </td>
                  <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button onclick="RawMaterials.openPurchaseModal(${m.id})" title="Stock-In / Add Purchase" class="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="RawMaterials.openEditModal(${m.id})" title="Edit Material" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="RawMaterials.deleteMaterial(${m.id})" title="Delete" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderLogsTable() {
    if (this.logs.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="history" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No stock movement logs yet</h4>
          <p class="text-xs text-slate-400 mt-1">Purchases and production usage deductions will appear here automatically.</p>
        </div>
      `;
    }

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-3 px-4 border-r border-slate-200 whitespace-nowrap min-w-[95px]">Date</th>
              <th class="py-3 px-4 border-r border-slate-200">Action</th>
              <th class="py-3 px-4 border-r border-slate-200">Material</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Change (+ / -)</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Stock Before</th>
              <th class="py-3 px-4 text-right font-black text-slate-800 border-r border-slate-200">Stock Left Behind</th>
              <th class="py-3 px-4">Details / Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${this.logs.map(log => {
              const isAdd = (log.qty_change || 0) > 0;
              return `
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-2.5 px-4 font-mono text-[11px] text-slate-500">${log.date || ''}</td>
                  <td class="py-2.5 px-4">
                    ${log.action === 'PURCHASE' 
                      ? `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px]">PURCHASE</span>`
                      : `<span class="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-black text-[10px]">PRODUCTION</span>`
                    }
                  </td>
                  <td class="py-2.5 px-4 font-black text-slate-900">${log.material_name}</td>
                  <td class="py-2.5 px-4 text-right font-black tabular-nums ${isAdd ? 'text-emerald-600' : 'text-rose-600'}">
                    ${isAdd ? '+' : ''}${log.qty_change}
                  </td>
                  <td class="py-2.5 px-4 text-right font-mono text-slate-400 tabular-nums">${log.stock_before}</td>
                  <td class="py-2.5 px-4 text-right font-black text-slate-900 tabular-nums">${log.stock_after}</td>
                  <td class="py-2.5 px-4 text-slate-500 text-[11px]">${log.notes || ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.renderUI();
  },

  onSearch(query) {
    this.searchQuery = query;
    this.renderUI();
  },

  openAddModal() {
    this.showMaterialModal({
      id: null,
      name: '',
      category: 'General',
      unit: 'Kg',
      current_stock: 0,
      cost_price: 0,
      min_stock_alert: 5,
      notes: ''
    });
  },

  openEditModal(id) {
    const m = this.materials.find(x => x.id === id);
    if (!m) return;
    this.showMaterialModal(m);
  },

  showMaterialModal(m) {
    const isEdit = Boolean(m.id);
    const modalEl = document.getElementById('rm-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) RawMaterials.closeModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <h3 class="text-base font-black tracking-tight">${isEdit ? 'Edit Raw Material' : 'Add New Raw Material'}</h3>
            <button onclick="RawMaterials.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="RawMaterials.handleMaterialSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="rm-id" value="${m.id || ''}">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Material Name *</label>
              <input type="text" id="rm-name" required value="${m.name || ''}" placeholder="e.g. Fresh Milk, Sugar, Chocbar Sticks..."
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Category</label>
                <select id="rm-category" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500">
                  <option value="Dairy" ${m.category === 'Dairy' ? 'selected' : ''}>Dairy (Milk/Cream)</option>
                  <option value="Sweeteners" ${m.category === 'Sweeteners' ? 'selected' : ''}>Sweeteners (Sugar)</option>
                  <option value="Flavors & Coating" ${m.category === 'Flavors & Coating' ? 'selected' : ''}>Flavors & Coating</option>
                  <option value="Packaging & Sticks" ${m.category === 'Packaging & Sticks' ? 'selected' : ''}>Packaging & Sticks</option>
                  <option value="General" ${m.category === 'General' ? 'selected' : ''}>General Raw Material</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Unit of Measure *</label>
                <input type="text" id="rm-unit" required value="${m.unit || 'Kg'}" placeholder="Liter, Kg, Pcs, Bag..."
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Opening Stock</label>
                <input type="number" step="any" min="0" id="rm-stock" value="${m.current_stock || 0}"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Price / Unit (Rs.)</label>
                <input type="number" step="any" min="0" id="rm-cost" value="${m.cost_price || 0}"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Min Stock Alert Level</label>
              <input type="number" step="any" min="0" id="rm-min-alert" value="${m.min_stock_alert || 0}" placeholder="Alert when stock falls below this"
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes</label>
              <input type="text" id="rm-notes" value="${m.notes || ''}" placeholder="Supplier, grade, storage location..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="RawMaterials.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">Save Material</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  openPurchaseModal(defaultMaterialId = null) {
    const modalEl = document.getElementById('rm-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) RawMaterials.closeModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-emerald-950 py-3.5 px-6 text-white flex justify-between items-center border-b border-emerald-800">
            <div>
              <h3 class="text-base font-black tracking-tight">Stock-In / Purchase Raw Material</h3>
              <p class="text-[11px] text-emerald-300">Add purchased quantity to factory stock</p>
            </div>
            <button onclick="RawMaterials.closeModal()" class="text-emerald-300 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="RawMaterials.handlePurchaseSubmit(event)" class="p-6 space-y-4">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Select Raw Material *</label>
              <select id="po-material-id" required onchange="RawMaterials.onPurchaseMaterialChange(this.value)"
                      class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
                <option value="">-- Choose Material --</option>
                ${this.materials.map(m => `
                  <option value="${m.id}" ${m.id === defaultMaterialId ? 'selected' : ''}>
                    ${m.name} (Current: ${m.current_stock} ${m.unit} @ Rs. ${m.cost_price})
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Quantity Purchased *</label>
                <input type="number" step="any" min="0.01" id="po-qty" required placeholder="0" oninput="RawMaterials.calcPurchaseTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Per Unit (Rs.) *</label>
                <input type="number" step="any" min="0" id="po-cost" required placeholder="0" oninput="RawMaterials.calcPurchaseTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-500 tabular-nums">
              </div>
            </div>
            <div class="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span class="text-xs font-black text-emerald-900">Total Purchase Cost:</span>
              <span id="po-total-display" class="text-lg font-black text-emerald-700 tabular-nums">Rs. 0</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Supplier Name</label>
                <input type="text" id="po-supplier" placeholder="e.g. Dairy Milk Farms..."
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Purchase Date</label>
                <input type="date" id="po-date" value="${new Date().toISOString().split('T')[0]}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 font-mono">
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes / Bill #</label>
              <input type="text" id="po-notes" placeholder="Invoice #, vehicle #, payment status..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="RawMaterials.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">Confirm Stock-In</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });

    if (defaultMaterialId) {
      this.onPurchaseMaterialChange(defaultMaterialId);
    }
  },

  onPurchaseMaterialChange(id) {
    const m = this.materials.find(x => x.id === Number(id));
    if (m) {
      const costEl = document.getElementById('po-cost');
      if (costEl && (!costEl.value || Number(costEl.value) === 0)) {
        costEl.value = m.cost_price || 0;
      }
      this.calcPurchaseTotal();
    }
  },

  calcPurchaseTotal() {
    const qty = Number(document.getElementById('po-qty')?.value) || 0;
    const cost = Number(document.getElementById('po-cost')?.value) || 0;
    const total = qty * cost;
    const display = document.getElementById('po-total-display');
    if (display) display.textContent = `Rs. ${Math.round(total).toLocaleString()}`;
  },

  closeModal() {
    const modalEl = document.getElementById('rm-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async handleMaterialSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('rm-id').value;
    const data = {
      id: id ? Number(id) : null,
      name: document.getElementById('rm-name').value,
      category: document.getElementById('rm-category').value,
      unit: document.getElementById('rm-unit').value,
      current_stock: Number(document.getElementById('rm-stock').value) || 0,
      cost_price: Number(document.getElementById('rm-cost').value) || 0,
      min_stock_alert: Number(document.getElementById('rm-min-alert').value) || 0,
      notes: document.getElementById('rm-notes').value
    };

    const res = await window.api.saveRawMaterial(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast('Raw material saved successfully!', 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to save raw material.' });
    }
  },

  async handlePurchaseSubmit(e) {
    e.preventDefault();
    const matId = Number(document.getElementById('po-material-id').value);
    const qty = Number(document.getElementById('po-qty').value);
    const unitCost = Number(document.getElementById('po-cost').value);

    if (!matId || qty <= 0) {
      app.showAlert({ title: 'Invalid Input', message: 'Please select a material and enter a valid quantity.' });
      return;
    }

    const data = {
      material_id: matId,
      qty,
      unit_cost: unitCost,
      supplier_name: document.getElementById('po-supplier').value,
      date: document.getElementById('po-date').value,
      notes: document.getElementById('po-notes').value
    };

    const res = await window.api.addRawMaterialPurchase(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast(`Stock-In complete! New stock: ${res.newStock}`, 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to add purchase.' });
    }
  },

  async deleteMaterial(id) {
    const ok = await new Promise(resolve => {
      app.showConfirm({
        title: 'Delete Raw Material?',
        message: 'Are you sure you want to delete this raw material item?',
        confirmText: 'Delete',
        confirmColor: 'red',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (ok) {
      const res = await window.api.deleteRawMaterial(id);
      if (res && res.success) {
        app.showToast('Material deleted', 'success');
        await this.loadData();
      } else {
        app.showAlert({ title: 'Cannot Delete', message: res.error || 'Failed to delete material.' });
      }
    }
  },

  printReport() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Ice Cream Factory';
    const date = new Date().toLocaleDateString('en-GB');
    const totalVal = this.materials.reduce((sum, m) => sum + (m.current_stock * m.cost_price), 0);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">${company}</h1>
          <p style="font-size: 9px; color: #475569; margin: 2px 0 0 0; font-weight: 600;">STAGE 1: RAW MATERIALS STOCK INVENTORY REPORT</p>
          <p style="font-size: 9px; color: #64748b; margin: 1px 0 0 0;">Generated Date: ${date} | Total Raw Stock Value: Rs. ${Math.round(totalVal).toLocaleString()}</p>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">S#</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Material</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center;">Unit</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">In-Stock Left</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Cost/Unit</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.materials.map((m, idx) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 4px;">${idx + 1}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; font-weight: 700;">${m.name}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: center;">${m.unit}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right; font-weight: 800;">${m.current_stock}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right;">Rs. ${m.cost_price}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right; font-weight: 800;">Rs. ${Math.round(m.current_stock * m.cost_price).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 10px; font-weight: 800;">
          <span>TOTAL MATERIALS: ${this.materials.length}</span>
          <span>GRAND TOTAL VALUE: Rs. ${Math.round(totalVal).toLocaleString()}</span>
        </div>

        <div class="a5-signatures" style="margin-top: 25px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1px dashed #64748b; width: 40%; text-align: center; font-size: 9px; padding-top: 4px;">
            Store Incharge Signature
          </div>
          <div class="a5-sig-line" style="border-top: 1px dashed #64748b; width: 40%; text-align: center; font-size: 9px; padding-top: 4px;">
            Factory Manager Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Raw Materials Stock Report (A5)');
  }
};
