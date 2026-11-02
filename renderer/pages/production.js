// Stage 2: Single Items Production (Raw Materials -> Single Items Pool)
window.Production = {
  items: [],
  rawMaterials: [],
  batches: [],
  activeTab: 'catalog', // 'catalog' | 'batches'
  searchQuery: '',

  async render(container) {
    this.container = container;
    await this.loadData();
  },

  async loadData() {
    try {
      this.items = await window.api.getIcecreamItems() || [];
      this.rawMaterials = await window.api.getRawMaterials() || [];
      this.batches = await window.api.getProductionBatches() || [];
      this.renderUI();
    } catch (e) {
      console.error('Failed to load production data:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading production: ${e.message}</div>`;
      }
    }
  },

  renderUI() {
    if (!this.container) return;

    const totalItems = this.items.length;
    const totalSinglePieces = this.items.reduce((sum, it) => sum + (it.current_single_stock || 0), 0);
    const totalPoolCost = this.items.reduce((sum, it) => sum + ((it.current_single_stock || 0) * (it.unit_cost || 0)), 0);

    const filtered = this.items.filter(it => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (it.name || '').toLowerCase().includes(q) || (it.flavor || '').toLowerCase().includes(q);
    });

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-5 max-w-7xl mx-auto">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-cyan-800/40">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-black border border-cyan-500/30">STAGE 2</span>
              <h2 class="text-2xl font-black tracking-tight text-white">Single Items Production</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Produce loose individual pieces (e.g. Chocbar 100 pcs @ Rs. 10, Ice Loly 40 pcs @ Rs. 25). Raw materials are deducted automatically.</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="Production.openProductionModal()" class="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="play-circle" class="w-4 h-4"></i> + Run Production (Make Pieces)
            </button>
            <button onclick="Production.openItemModal()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4 text-cyan-400"></i> + New Flavor / Item
            </button>
            <button onclick="Production.printReport()" class="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer" title="Print Production Report">
              <i data-lucide="printer" class="w-4 h-4"></i> Print
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Ice Cream Flavors / Items</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">${totalItems} <span class="text-xs font-bold text-slate-400">types</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
              <i data-lucide="layers" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Loose Pieces in Pool</p>
              <h3 class="text-2xl font-black text-cyan-700 mt-1 tabular-nums">${totalSinglePieces.toLocaleString()} <span class="text-xs font-bold text-slate-400">pieces ready to pack</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
              <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Unpacked Production Cost</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">Rs. ${Math.round(totalPoolCost).toLocaleString()}</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
              <i data-lucide="coins" class="w-5 h-5"></i>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs & Search -->
        <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-3">
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button onclick="Production.switchTab('catalog')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'catalog' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Single Pieces Catalog &amp; Pool
            </button>
            <button onclick="Production.switchTab('batches')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'batches' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Production Runs History
            </button>
          </div>

          <div class="relative w-full sm:w-72">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" placeholder="Search ice cream item..." value="${this.searchQuery}" oninput="Production.onSearch(this.value)"
                   class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-cyan-400">
          </div>
        </div>

        <!-- Content Area -->
        <div class="flex-1 bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          ${this.activeTab === 'catalog' ? this.renderCatalogGrid(filtered) : this.renderBatchesTable()}
        </div>

      </div>

      <!-- Modal Container -->
      <div id="prd-modal-container"></div>
    `;

    if (window.lucide) lucide.createIcons({ root: this.container });
  },

  renderCatalogGrid(items) {
    if (items.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="package-x" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No ice cream items defined</h4>
          <p class="text-xs text-slate-400 mt-1">Click "+ New Flavor / Item" to add Chocbar, Ice Loly, Mango Bar, etc.</p>
        </div>
      `;
    }

    return `
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto flex-1">
        ${items.map(it => {
          const pieces = it.current_single_stock || 0;
          const cost = it.unit_cost || 0;
          const retail = it.retail_piece_price || 0;
          const totalCostVal = Math.round(pieces * cost);

          return `
            <div class="bg-gradient-to-b from-slate-50/70 to-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-cyan-300 hover:shadow-md transition-all group">
              <div>
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 class="font-black text-base text-slate-900 group-hover:text-cyan-700 transition-colors">${it.name}</h3>
                    <p class="text-xs text-slate-500 font-medium">${it.flavor || 'Standard Flavor'}</p>
                  </div>
                  <span class="px-2.5 py-1 rounded-xl bg-cyan-100/70 text-cyan-800 font-mono text-[10px] font-black border border-cyan-200">
                    ${it.default_pcs_per_carton || 20} pcs/ctn
                  </span>
                </div>

                <!-- Stock Pool Display -->
                <div class="my-4 p-3.5 bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span class="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Available in Production Pool</span>
                    <span class="text-2xl font-black ${pieces > 0 ? 'text-cyan-700' : 'text-slate-400'} tabular-nums">
                      ${pieces.toLocaleString()}
                    </span>
                    <span class="text-xs font-bold text-slate-500 ml-1">pieces</span>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] font-bold text-slate-400 block">Total Pool Cost</span>
                    <span class="text-xs font-black text-slate-700 tabular-nums">Rs. ${totalCostVal.toLocaleString()}</span>
                  </div>
                </div>

                <!-- Cost & Retail Prices -->
                <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 mb-4">
                  <div class="bg-white p-2 rounded-lg border border-slate-200/70">
                    <span class="text-[10px] font-bold text-slate-400 block uppercase">Making Cost</span>
                    <span class="font-black text-slate-800 tabular-nums">Rs. ${cost} <span class="text-[10px] font-normal text-slate-400">/ pc</span></span>
                  </div>
                  <div class="bg-white p-2 rounded-lg border border-slate-200/70">
                    <span class="text-[10px] font-bold text-slate-400 block uppercase">Retail MRP</span>
                    <span class="font-black text-emerald-700 tabular-nums">Rs. ${retail} <span class="text-[10px] font-normal text-slate-400">/ pc</span></span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button onclick="Production.openProductionModal(${it.id})" class="flex-1 py-2 px-3 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Produce Pcs
                </button>
                <button onclick="app.navigate('carton-packing')" title="Pack into Cartons (Stage 3)" class="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer">
                  <i data-lucide="package" class="w-3.5 h-3.5"></i> Pack
                </button>
                <button onclick="Production.openItemModal(${it.id})" title="Edit Item" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer">
                  <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderBatchesTable() {
    if (this.batches.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="history" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No production batches recorded yet</h4>
          <p class="text-xs text-slate-400 mt-1">Run production to generate batch logs.</p>
        </div>
      `;
    }

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-3 px-4 border-r border-slate-200">Batch #</th>
              <th class="py-3 px-4 border-r border-slate-200 whitespace-nowrap min-w-[95px]">Date</th>
              <th class="py-3 px-4 border-r border-slate-200">Item Produced</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Quantity Produced</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Unit Cost</th>
              <th class="py-3 px-4 text-right border-r border-slate-200">Total Batch Cost</th>
              <th class="py-3 px-4 border-r border-slate-200">Raw Materials Used</th>
              <th class="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${this.batches.map(b => `
              <tr class="hover:bg-slate-50/60 transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-cyan-800 text-xs border-r border-slate-200">${b.batch_number}</td>
                <td class="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap border-r border-slate-200">${b.date}</td>
                <td class="py-3 px-4 font-black text-slate-900 text-sm border-r border-slate-200">${b.item_name}</td>
                <td class="py-3 px-4 text-right font-black text-cyan-700 text-sm tabular-nums border-r border-slate-200">
                  +${b.produced_pieces.toLocaleString()} <span class="text-xs font-normal text-slate-400">pcs</span>
                </td>
                <td class="py-3 px-4 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200">Rs. ${b.unit_cost}</td>
                <td class="py-3 px-4 text-right font-black text-slate-900 tabular-nums border-r border-slate-200">Rs. ${Math.round(b.total_cost).toLocaleString()}</td>
                <td class="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate border-r border-slate-200">${b.raw_materials_summary || 'Standard ingredients'}</td>
                <td class="py-3 px-4 text-right">
                  <button onclick="Production.deleteBatch(${b.id})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer" title="Delete &amp; Reverse Stock">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.renderUI();
  },

  onSearch(q) {
    this.searchQuery = q;
    this.renderUI();
  },

  openProductionModal(defaultItemId = null) {
    const modalEl = document.getElementById('prd-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) Production.closeModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
          <div class="bg-cyan-950 py-4 px-6 text-white flex justify-between items-center border-b border-cyan-800 shrink-0">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[10px] font-black">STAGE 2</span>
                <h3 class="text-base font-black tracking-tight">Run Production (Make Single Pieces)</h3>
              </div>
              <p class="text-[11px] text-cyan-300 mt-0.5">Produce unpacked pieces (e.g. 100 pcs Chocbar) and deduct raw materials</p>
            </div>
            <button onclick="Production.closeModal()" class="text-cyan-300 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <form onsubmit="Production.handleProductionSubmit(event)" class="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            <!-- 1. Select Item -->
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Select Ice Cream Item to Produce *</label>
              <select id="pr-item-id" required onchange="Production.onProductionItemChange(this.value)"
                      class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500">
                <option value="">-- Choose Item --</option>
                ${this.items.map(it => `
                  <option value="${it.id}" ${it.id === defaultItemId ? 'selected' : ''}>
                    ${it.name} (Currently in Pool: ${it.current_single_stock} pcs @ Cost Rs. ${it.unit_cost})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- 2. Quantity & Cost -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Pieces to Produce *</label>
                <input type="number" step="1" min="1" id="pr-pieces" required placeholder="e.g. 100" oninput="Production.calcProductionTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost Per Piece (Rs.) *</label>
                <input type="number" step="any" min="0" id="pr-unit-cost" required placeholder="Rs. 10" oninput="Production.calcProductionTotal()"
                       class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
            </div>

            <!-- Live Calculation Banner -->
            <div class="p-3.5 bg-cyan-50/80 border border-cyan-200 rounded-2xl flex items-center justify-between">
              <div>
                <span class="text-[10px] font-black uppercase text-cyan-900 tracking-wider block">Production Batch Value</span>
                <span id="pr-calc-summary" class="text-xs font-bold text-cyan-700">0 pieces × Rs. 0</span>
              </div>
              <span id="pr-total-display" class="text-xl font-black text-cyan-800 tabular-nums">Rs. 0</span>
            </div>

            <!-- 3. Raw Materials to Deduct (Optional / Quick Multi-Select) -->
            <div class="pt-2 border-t border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <label class="text-[11px] font-black uppercase text-slate-700 tracking-wider block">Deduct Raw Materials Consumed</label>
                  <span class="text-[10px] text-slate-400">Stock will be automatically deducted from Raw Materials inventory</span>
                </div>
                <button type="button" onclick="Production.addMaterialDeductionRow()" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> + Add Material
                </button>
              </div>

              <div id="pr-materials-list" class="space-y-2">
                <!-- Injected dynamically -->
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Production Date</label>
                <input type="date" id="pr-date" value="${new Date().toISOString().split('T')[0]}"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500 font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes / Shift</label>
                <input type="text" id="pr-notes" placeholder="e.g. Morning Batch #1..."
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500">
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="Production.closeModal()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Complete Production Run
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });

    if (defaultItemId) {
      this.onProductionItemChange(defaultItemId);
    } else {
      // Add one default row for convenience
      this.addMaterialDeductionRow();
    }
  },

  onProductionItemChange(id) {
    const it = this.items.find(x => x.id === Number(id));
    if (it) {
      const costEl = document.getElementById('pr-unit-cost');
      if (costEl && (!costEl.value || Number(costEl.value) === 0)) {
        costEl.value = it.unit_cost || 10;
      }
      this.calcProductionTotal();

      // Pre-populate sensible defaults if empty
      const matContainer = document.getElementById('pr-materials-list');
      if (matContainer && matContainer.children.length === 0) {
        this.addMaterialDeductionRow();
      }
    }
  },

  calcProductionTotal() {
    const pieces = Number(document.getElementById('pr-pieces')?.value) || 0;
    const cost = Number(document.getElementById('pr-unit-cost')?.value) || 0;
    const total = pieces * cost;
    const display = document.getElementById('pr-total-display');
    const summary = document.getElementById('pr-calc-summary');
    if (display) display.textContent = `Rs. ${Math.round(total).toLocaleString()}`;
    if (summary) summary.textContent = `${pieces.toLocaleString()} pieces × Rs. ${cost}`;
  },

  addMaterialDeductionRow() {
    const list = document.getElementById('pr-materials-list');
    if (!list) return;

    const rowId = 'mat-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const div = document.createElement('div');
    div.id = rowId;
    div.className = 'flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl';
    div.innerHTML = `
      <select class="flex-2 pr-mat-select px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none">
        <option value="">-- Select Material to Deduct --</option>
        ${this.rawMaterials.map(m => `
          <option value="${m.id}">${m.name} (Stock: ${m.current_stock} ${m.unit})</option>
        `).join('')}
      </select>
      <div class="flex items-center gap-1 flex-1">
        <input type="number" step="any" min="0" placeholder="Qty used" class="w-full pr-mat-qty px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none tabular-nums">
      </div>
      <button type="button" onclick="document.getElementById('${rowId}').remove()" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer" title="Remove row">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    `;
    list.appendChild(div);
    if (window.lucide) lucide.createIcons({ root: div });
  },

  openItemModal(id = null) {
    const it = id ? this.items.find(x => x.id === id) : {
      id: null,
      name: '',
      flavor: '',
      unit_cost: 10,
      retail_piece_price: 40,
      current_single_stock: 0,
      default_pcs_per_carton: 20
    };
    if (!it) return;

    const modalEl = document.getElementById('prd-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) Production.closeModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <h3 class="text-base font-black tracking-tight">${it.id ? 'Edit Ice Cream Item' : 'New Ice Cream Item'}</h3>
            <button onclick="Production.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="Production.handleItemSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="ii-id" value="${it.id || ''}">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Item Name *</label>
              <input type="text" id="ii-name" required value="${it.name || ''}" placeholder="e.g. Chocbar, Ice Loly, Mango Bar..."
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500">
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Flavor / Description</label>
              <input type="text" id="ii-flavor" value="${it.flavor || ''}" placeholder="e.g. Rich Chocolate, Orange Twist..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Cost To Make 1 Pc (Rs.)</label>
                <input type="number" step="any" min="0" id="ii-cost" value="${it.unit_cost || 10}"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Retail Price / MRP (Rs.)</label>
                <input type="number" step="any" min="0" id="ii-retail" value="${it.retail_piece_price || 40}"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-emerald-700 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Opening Single Stock</label>
                <input type="number" step="1" min="0" id="ii-stock" value="${it.current_single_stock || 0}"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Default Pcs / Carton</label>
                <input type="number" step="1" min="1" id="ii-pcs-carton" value="${it.default_pcs_per_carton || 20}"
                       class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-cyan-500 tabular-nums">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="Production.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">Save Item</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  closeModal() {
    const modalEl = document.getElementById('prd-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async handleItemSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('ii-id').value;
    const data = {
      id: id ? Number(id) : null,
      name: document.getElementById('ii-name').value,
      flavor: document.getElementById('ii-flavor').value,
      unit_cost: Number(document.getElementById('ii-cost').value) || 0,
      retail_piece_price: Number(document.getElementById('ii-retail').value) || 0,
      current_single_stock: Number(document.getElementById('ii-stock').value) || 0,
      default_pcs_per_carton: Number(document.getElementById('ii-pcs-carton').value) || 20
    };

    const res = await window.api.saveIcecreamItem(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast('Ice cream item saved!', 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to save item.' });
    }
  },

  async handleProductionSubmit(e) {
    e.preventDefault();
    const itemId = Number(document.getElementById('pr-item-id').value);
    const pieces = Number(document.getElementById('pr-pieces').value);
    const unitCost = Number(document.getElementById('pr-unit-cost').value);

    if (!itemId || pieces <= 0) {
      app.showAlert({ title: 'Invalid Production', message: 'Please select an item and enter valid pieces produced.' });
      return;
    }

    // Collect materials
    const materials = [];
    const matRows = document.querySelectorAll('#pr-materials-list > div');
    matRows.forEach(row => {
      const select = row.querySelector('.pr-mat-select');
      const qtyInput = row.querySelector('.pr-mat-qty');
      const matId = Number(select?.value);
      const qty = Number(qtyInput?.value);
      if (matId && qty > 0) {
        materials.push({ material_id: matId, qty_used: qty });
      }
    });

    const data = {
      item_id: itemId,
      produced_pieces: pieces,
      unit_cost: unitCost,
      date: document.getElementById('pr-date').value,
      notes: document.getElementById('pr-notes').value,
      materials
    };

    const res = await window.api.runProductionBatch(data);
    if (res && res.success) {
      this.closeModal();
      app.showToast(`Production Run ${res.batchNumber} complete! +${pieces} pieces added to pool.`, 'success');
      await this.loadData();
    } else {
      app.showAlert({ title: 'Production Error', message: res.error || 'Failed to complete production run.' });
    }
  },

  async deleteBatch(id) {
    const ok = await new Promise(resolve => {
      app.showConfirm({
        title: 'Delete Production Run?',
        message: 'Are you sure you want to delete this batch? The produced pieces will be deducted from stock.',
        confirmText: 'Delete Batch',
        confirmColor: 'red',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (ok) {
      const res = await window.api.deleteProductionBatch(id);
      if (res && res.success) {
        app.showToast('Batch deleted & stock reversed', 'success');
        await this.loadData();
      } else {
        app.showAlert({ title: 'Error', message: res.error || 'Could not delete batch.' });
      }
    }
  },

  printReport() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Ice Cream Factory';
    const date = new Date().toLocaleDateString('en-GB');

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0;">${company}</h1>
          <p style="font-size: 9px; color: #475569; margin: 2px 0 0 0; font-weight: 700;">STAGE 2: SINGLE ITEMS PRODUCTION POOL REPORT</p>
          <p style="font-size: 9px; color: #64748b; margin: 1px 0 0 0;">Date: ${date} | Loose Pieces In Factory Floor</p>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">S#</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Item / Flavor</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Pieces in Pool</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Cost/Piece</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Total Cost Value</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right;">Retail MRP</th>
            </tr>
          </thead>
          <tbody>
            ${this.items.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 4px;">${idx + 1}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; font-weight: 800;">${it.name} <span style="font-weight: normal; color: #64748b;">(${it.flavor || ''})</span></td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right; font-weight: 800; color: #0e7490;">${it.current_single_stock} pcs</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right;">Rs. ${it.unit_cost}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right; font-weight: 700;">Rs. ${Math.round(it.current_single_stock * it.unit_cost).toLocaleString()}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right; color: #047857; font-weight: 700;">Rs. ${it.retail_piece_price}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="a5-signatures" style="margin-top: 25px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1px dashed #64748b; width: 40%; text-align: center; font-size: 9px; padding-top: 4px;">
            Production Floor Manager
          </div>
          <div class="a5-sig-line" style="border-top: 1px dashed #64748b; width: 40%; text-align: center; font-size: 9px; padding-top: 4px;">
            Quality Assurance Officer
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, 'Production Pool Report (A5)');
  }
};
