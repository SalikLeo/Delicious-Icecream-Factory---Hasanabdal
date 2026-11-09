// Stage 4: Cars & Delivery Loading (Factory Warehouse -> Delivery Cars/Vans)
window.CarLoading = {
  cars: [],
  cartons: [],
  selectedCarId: null,
  activeTab: 'cars', // 'cars' | 'dispatch' | 'history'
  dispatchItems: {}, // { carton_id: qty_to_load }
  dispatches: [],
  searchQuery: '',
  sortField: 'car_number', // 'car_number' | 'driver_name' | 'loaded_cartons' | 'deliveries' for cars; 'date' | 'dispatch_no' | 'car_number' | 'driver_name' | 'total_cartons' for history
  sortOrder: 'asc', // 'asc' | 'desc'
  carInventories: {},
  expandedCarIds: new Set(),

  async render(container) {
    this.container = container;
    this.initScannerListener();
    await this.loadData();
  },

  async loadData() {
    try {
      this.cars = await window.api.getCars() || [];
      this.cartons = await window.api.getPackedCartons() || [];
      this.dispatches = await window.api.getCarLoadingBatches() || [];

      this.carInventories = {};
      await Promise.all((this.cars || []).map(async (c) => {
        try {
          const inv = await window.api.getCarInventory(c.id) || [];
          this.carInventories[c.id] = inv;
        } catch(err) {
          this.carInventories[c.id] = [];
        }
      }));

      if (this.selectedCarId && !this.cars.some(c => c.id === this.selectedCarId)) {
        this.selectedCarId = null;
      }

      this.renderUI();
    } catch (e) {
      console.error('Failed to load cars/loading data:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading cars: ${e.message}</div>`;
      }
    }
  },

  initScannerListener() {
    if (this._scannerBound) return;
    this._scannerBound = true;
    this._scanBuffer = '';
    this._lastScanTime = 0;
    this._isScanning = false;

    this._boundKeydown = (e) => {
      // Only process when currently on car-loading page
      if (app.currentPage !== 'car-loading') return;

      const now = performance.now();
      const diff = now - this._lastScanTime;
      this._lastScanTime = now;

      // Burst detection: scanner enters keystrokes rapidly (< 55ms)
      if (diff > 120) {
        this._scanBuffer = '';
        this._isScanning = false;
      } else if (diff < 55 && this._scanBuffer.length >= 2) {
        this._isScanning = true;
      }

      if (e.key === 'Enter') {
        if (this._scanBuffer.length >= 3) {
          const scannedCode = this._scanBuffer.trim();
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
          e.preventDefault();
          e.stopPropagation();
        }
        this._scanBuffer += e.key;
      }
    };

    document.addEventListener('keydown', this._boundKeydown, true);
  },

  handleManualBarcodeScan(val) {
    if (!val) return;
    this.handleBarcodeScan(val.trim());
  },

  handleBarcodeScan(rawBarcode) {
    if (!rawBarcode) return false;
    const barcode = String(rawBarcode).trim().toLowerCase();
    if (!barcode) return false;

    // Look up carton by barcode or carton_name
    let carton = (this.cartons || []).find(c => String(c.barcode || '').trim().toLowerCase() === barcode);
    if (!carton) {
      carton = (this.cartons || []).find(c => (c.carton_name || '').toLowerCase().includes(barcode));
    }

    if (!carton) {
      app.playBeep('warning');
      app.showToast(`No carton found matching barcode: "${rawBarcode}"`, 'warning');
      return false;
    }

    // If not currently on dispatch tab, switch to it automatically
    if (this.activeTab !== 'dispatch') {
      this.switchTab('dispatch');
    }

    const input = document.querySelector(`.dsp-qty-input[data-carton-id="${carton.id}"]`);
    if (input) {
      const cur = Number(input.value) || 0;
      const warehouse = Number(input.dataset.warehouse) || 0;
      if (cur < warehouse) {
        input.value = cur + 1;
        this.onLoadQtyChange(input);
        app.playBeep('success');
        app.showToast(`Scanned: ${carton.carton_name} (+1 ctn, To load: ${input.value})`, 'success');
        return true;
      } else {
        app.playBeep('warning');
        app.showToast(`Cannot load more ${carton.carton_name}. Warehouse stock limit (${warehouse} ctns) reached.`, 'warning');
        return false;
      }
    } else {
      app.playBeep('warning');
      app.showToast(`Carton "${carton.carton_name}" not available in current loading list.`, 'warning');
      return false;
    }
  },

  renderUI() {
    if (!this.container) return;

    const totalCars = this.cars.length;
    const totalCartonsLoaded = this.cars.reduce((sum, c) => sum + (c.total_loaded_cartons || 0), 0);

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white p-4 px-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border border-blue-800/40">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[11px] font-black border border-blue-500/30">STAGE 4</span>
              <h2 class="text-2xl font-black tracking-tight text-white">Car Loading &amp; Delivery Vans</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Load packed cartons into delivery cars/vans. Always know what is loaded in each car right now.</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="CarLoading.switchTab('dispatch')" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="package-check" class="w-4 h-4"></i> + Load Car
            </button>
            <button onclick="CarLoading.openCarsListModal()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95" title="View & Edit Registered Cars">
              <i data-lucide="list" class="w-4 h-4 text-amber-400"></i> Cars List
            </button>
            <button onclick="CarLoading.openCarModal()" class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer">
              <i data-lucide="truck" class="w-4 h-4 text-blue-400"></i> Add Car / Van
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div onclick="CarLoading.openCarsListModal()" class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all group" title="Click to View & Edit Cars List">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider group-hover:text-blue-600 transition-colors">Registered Delivery Cars</p>
              <h3 class="text-2xl font-black text-slate-900 mt-1 tabular-nums">${totalCars} <span class="text-xs font-bold text-slate-400">vehicles</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
              <i data-lucide="truck" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Cartons in Cars</p>
              <h3 class="text-2xl font-black text-blue-700 mt-1 tabular-nums">${totalCartonsLoaded.toLocaleString()} <span class="text-xs font-bold text-slate-400">cartons on road</span></h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <i data-lucide="package" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Available in Factory Stock</p>
              <h3 class="text-2xl font-black text-purple-700 mt-1 tabular-nums">
                ${this.cartons.reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0).toLocaleString()} <span class="text-xs font-bold text-slate-400">cartons in freezer</span>
              </h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <i data-lucide="warehouse" class="w-5 h-5"></i>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs & Search & Sort -->
        <div class="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row justify-between items-center gap-3">
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full lg:w-auto shrink-0">
            <button onclick="CarLoading.switchTab('cars')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'cars' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Delivery Cars &amp; Stock
            </button>
            <button onclick="CarLoading.openCarsListModal()" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-white/60" title="View & Edit Registered Cars">
              Cars List
            </button>
            <button onclick="CarLoading.switchTab('dispatch')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'dispatch' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              + Load Car
            </button>
            <button onclick="CarLoading.switchTab('history')" class="px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${this.activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}">
              Loading History
            </button>
          </div>

          ${this.activeTab !== 'dispatch' ? `
            <!-- Controls: Search + Sort -->
            <div class="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
              <!-- Search -->
              <div class="relative w-full sm:w-56">
                <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="cld-search" placeholder="${this.activeTab === 'cars' ? 'Search vehicle, driver, plate...' : 'Search loading slip #, vehicle, driver...'}"
                       value="${this.searchQuery}" oninput="CarLoading.onSearch(this.value)"
                       class="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-400">
                <button type="button" id="cld-search-clear" onclick="CarLoading.clearSearch()" title="Clear search"
                        class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer ${this.searchQuery ? '' : 'hidden'}">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              <!-- Sort Dropdown -->
              <div class="flex items-center gap-1.5 shrink-0">
                <select id="cld-sort-select" onchange="CarLoading.onSortSelect(this.value)"
                        class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-blue-400 cursor-pointer">
                  ${this.activeTab === 'cars' ? `
                    <option value="car_number_asc" ${this.sortField==='car_number'&&this.sortOrder==='asc'?'selected':''}>Vehicle / Plate (A-Z)</option>
                    <option value="car_number_desc" ${this.sortField==='car_number'&&this.sortOrder==='desc'?'selected':''}>Vehicle / Plate (Z-A)</option>
                    <option value="driver_name_asc" ${this.sortField==='driver_name'&&this.sortOrder==='asc'?'selected':''}>Driver Name (A-Z)</option>
                    <option value="loaded_cartons_desc" ${this.sortField==='loaded_cartons'&&this.sortOrder==='desc'?'selected':''}>Most Cartons Loaded</option>
                    <option value="deliveries_desc" ${this.sortField==='deliveries'&&this.sortOrder==='desc'?'selected':''}>Most Deliveries Done</option>
                    <option value="loaded_value_desc" ${this.sortField==='loaded_value'&&this.sortOrder==='desc'?'selected':''}>Highest Stock Value</option>
                  ` : `
                    <option value="date_desc" ${this.sortField==='date'&&this.sortOrder==='desc'?'selected':''}>Newest First</option>
                    <option value="date_asc" ${this.sortField==='date'&&this.sortOrder==='asc'?'selected':''}>Oldest First</option>
                    <option value="total_cartons_desc" ${this.sortField==='total_cartons'&&this.sortOrder==='desc'?'selected':''}>Most Cartons Loaded</option>
                    <option value="car_number_asc" ${this.sortField==='car_number'&&this.sortOrder==='asc'?'selected':''}>Vehicle (A-Z)</option>
                    <option value="driver_name_asc" ${this.sortField==='driver_name'&&this.sortOrder==='asc'?'selected':''}>Driver (A-Z)</option>
                    <option value="dispatch_no_asc" ${this.sortField==='dispatch_no'&&this.sortOrder==='asc'?'selected':''}>Loading Slip # (A-Z)</option>
                  `}
                </select>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Content Area -->
        <div id="cld-content-area" class="flex-1 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          ${this.renderActiveTabContent()}
        </div>

      </div>

      <!-- Modal Container -->
      <div id="car-modal-container"></div>
    `;

    if (window.lucide) lucide.createIcons({ root: this.container });

    if (this.activeTab === 'dispatch') {
      this.renderDispatchRows();
    }
  },

  renderActiveTabContent() {
    if (this.activeTab === 'cars') return this.renderCarsView();
    if (this.activeTab === 'dispatch') return this.renderDispatchView();
    if (this.activeTab === 'history') return this.renderHistoryView();
    return '';
  },

  setPeriod(period) {
    this.periodType = period;
    this.renderUI();
  },

  onDateChange(val) {
    this.selectedDate = val;
    this.renderUI();
  },

  getFilteredBatches() {
    let list = this.batches || [];
    if (this.periodType === 'day' && this.selectedDate) {
      list = list.filter(b => b.date === this.selectedDate);
    } else if (this.periodType === 'month' && this.selectedDate) {
      const ym = this.selectedDate.slice(0, 7);
      list = list.filter(b => b.date && b.date.startsWith(ym));
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(b =>
        (b.dispatch_no || '').toLowerCase().includes(q) ||
        (b.car_number || '').toLowerCase().includes(q) ||
        (b.driver_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  },

  getPeriodStats() {
    const list = this.getFilteredBatches();
    const totalDispatches = list.length;
    const totalCartonsLoaded = list.reduce((sum, b) => sum + (b.total_cartons || 0), 0);
    return {
      totalDispatches,
      totalCartonsLoaded
    };
  },

  toggleSort(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = ['loaded_cartons', 'deliveries', 'total_cartons', 'date'].includes(field) ? 'desc' : 'asc';
    }
    const sel = document.getElementById('cld-sort-select');
    if (sel) sel.value = `${this.sortField}_${this.sortOrder}`;
    this.renderActiveTabContentInPlace();
  },

  onSortSelect(val) {
    if (!val) return;
    const parts = val.split('_');
    const order = parts.pop();
    const field = parts.join('_');
    this.sortField = field;
    this.sortOrder = order || 'asc';
    this.renderActiveTabContentInPlace();
  },

  getSortIcon(field) {
    if (this.sortField !== field) {
      return `<i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-300 ml-1 inline-block"></i>`;
    }
    return this.sortOrder === 'asc'
      ? `<i data-lucide="arrow-up" class="w-3 h-3 text-blue-600 ml-1 inline-block"></i>`
      : `<i data-lucide="arrow-down" class="w-3 h-3 text-blue-600 ml-1 inline-block"></i>`;
  },

  clearSearch() {
    this.searchQuery = '';
    const inp = document.getElementById('cld-search');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    const clr = document.getElementById('cld-search-clear');
    if (clr) clr.classList.add('hidden');
    this.renderActiveTabContentInPlace();
  },

  onSearch(q) {
    this.searchQuery = q;
    const clr = document.getElementById('cld-search-clear');
    if (clr) clr.classList.toggle('hidden', !q);
    this.renderActiveTabContentInPlace();
  },

  renderActiveTabContentInPlace() {
    const area = document.getElementById('cld-content-area');
    if (area) {
      area.innerHTML = this.renderActiveTabContent();
      if (window.lucide) lucide.createIcons({ root: area });
      if (this.activeTab === 'cars') {
        if (this.selectedCarId) {
          this.loadSelectedCarInventory();
        }
      } else if (this.activeTab === 'dispatch') {
        this.renderDispatchRows();
      }
    } else {
      this.renderUI();
    }
  },

  renderCarsView() {
    if (this.cars.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="truck" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">No delivery cars registered</h4>
          <p class="text-xs text-slate-400 mt-1">Click "+ Add Car / Van" to add your vehicles and drivers.</p>
        </div>
      `;
    }

    let filteredCars = [...this.cars];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filteredCars = filteredCars.filter(c =>
        (c.car_number || '').toLowerCase().includes(q) ||
        (c.driver_name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    }

    const sf = this.sortField;
    const so = this.sortOrder === 'desc' ? -1 : 1;
    filteredCars.sort((a, b) => {
      if (sf === 'car_number') return so * (a.car_number || '').localeCompare(b.car_number || '');
      if (sf === 'driver_name') return so * (a.driver_name || '').localeCompare(b.driver_name || '');
      if (sf === 'loaded_cartons') return so * ((a.total_loaded_cartons || 0) - (b.total_loaded_cartons || 0));
      if (sf === 'deliveries') return so * ((a.total_deliveries_count || 0) - (b.total_deliveries_count || 0));
      if (sf === 'loaded_value') {
        const valA = (this.carInventories[a.id] || []).reduce((s, x) => s + (x.loaded_value || 0), 0);
        const valB = (this.carInventories[b.id] || []).reduce((s, x) => s + (x.loaded_value || 0), 0);
        return so * (valA - valB);
      }
      return so * (a.car_number || '').localeCompare(b.car_number || '');
    });

    const totalDeliveriesAll = filteredCars.reduce((sum, c) => sum + (c.total_deliveries_count || 0), 0);
    const totalCartonsLoaded = filteredCars.reduce((sum, c) => sum + (c.total_loaded_cartons || 0), 0);
    let grandTotalValue = 0;
    filteredCars.forEach(c => {
      const inv = this.carInventories[c.id] || [];
      grandTotalValue += inv.reduce((sum, it) => sum + (it.loaded_value || 0), 0);
    });

    return `
      <div class="flex-1 overflow-auto custom-scrollbar flex flex-col">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
            <tr>
              <th onclick="CarLoading.toggleCarSort('car_number')" class="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Vehicle / Van Number</span>
                  ${this.getCarSortIcon('car_number')}
                </div>
              </th>
              <th onclick="CarLoading.toggleCarSort('driver_name')" class="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Driver / Salesman</span>
                  ${this.getCarSortIcon('driver_name')}
                </div>
              </th>
              <th class="py-2.5 px-3 border-r border-slate-200">Phone</th>
              <th onclick="CarLoading.toggleCarSort('deliveries')" class="py-2.5 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-center gap-1">
                  <span>Completed Trips</span>
                  ${this.getCarSortIcon('deliveries')}
                </div>
              </th>
              <th onclick="CarLoading.toggleCarSort('loaded_cartons')" class="py-2.5 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Current Loaded Stock</span>
                  ${this.getCarSortIcon('loaded_cartons')}
                </div>
              </th>
              <th onclick="CarLoading.toggleCarSort('loaded_value')" class="py-2.5 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Est. Stock Value</span>
                  ${this.getCarSortIcon('loaded_value')}
                </div>
              </th>
              <th class="py-2.5 px-3 text-right w-48">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${filteredCars.length === 0 ? `
              <tr>
                <td colspan="7" class="p-8 text-center text-slate-400">
                  <p class="text-xs font-bold text-slate-500">No vehicles match "${this.searchQuery}"</p>
                  <button onclick="CarLoading.clearSearch()" class="text-xs text-blue-600 font-bold mt-1.5 underline cursor-pointer">Clear Search</button>
                </td>
              </tr>
            ` : filteredCars.map(c => {
                const inv = this.carInventories[c.id] || [];
                const loadedCartonsList = inv.filter(it => (it.cartons_loaded || 0) > 0);
                const loaded = c.total_loaded_cartons || 0;
                const loadedValue = loadedCartonsList.reduce((sum, it) => sum + (it.loaded_value || 0), 0);
                const isExpanded = this.expandedCarIds && this.expandedCarIds.has(c.id);

                return `
                  <tr class="${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'} transition-colors">
                    <td class="py-2 px-3 border-r border-slate-200">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg ${loaded > 0 ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'} flex items-center justify-center font-black shrink-0">
                          <i data-lucide="truck" class="w-3.5 h-3.5"></i>
                        </div>
                        <div>
                          <div class="font-black text-slate-900 text-xs">${c.car_number}</div>
                          ${c.notes ? `<div class="text-[10px] text-slate-400 font-medium">${c.notes}</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td class="py-2 px-3 border-r border-slate-200">
                      <div class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i> ${c.driver_name}
                      </div>
                    </td>
                    <td class="py-2 px-3 border-r border-slate-200 font-mono text-xs font-bold text-slate-600">
                      ${c.phone ? (window.app && app.formatPhone ? app.formatPhone(c.phone) : c.phone) : '<span class="text-slate-300">-</span>'}
                    </td>
                    <td class="py-2 px-3 text-center border-r border-slate-200">
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-black border border-slate-200">
                        ${c.total_deliveries_count || 0} deliveries
                      </span>
                    </td>
                    <td class="py-2 px-3 text-right border-r border-slate-200">
                      <span class="text-sm font-black ${loaded > 0 ? 'text-blue-700' : 'text-slate-400'} tabular-nums">
                        ${loaded.toLocaleString()}
                      </span>
                      <span class="text-xs font-black text-slate-700 ml-1 inline-block">ctns</span>
                    </td>
                    <td class="py-2 px-3 text-right border-r border-slate-200 font-mono font-black ${loadedValue > 0 ? 'text-emerald-700' : 'text-slate-400'} tabular-nums">
                      Rs. ${Math.round(loadedValue).toLocaleString()}
                    </td>
                    <td class="py-2 px-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button onclick="CarLoading.toggleCarExpand(${c.id})" class="px-2 py-1 rounded-lg ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80'} text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs" title="${isExpanded ? 'Hide Loaded Stock' : 'View Loaded Stock'}">
                          <i data-lucide="${isExpanded ? 'chevron-up' : 'package'}" class="w-3.5 h-3.5"></i>
                          <span>${isExpanded ? 'Close' : 'View Stock'}</span>
                        </button>
                        <button onclick="CarLoading.startLoadingForCar(${c.id})" class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Load Stock into this Car">
                          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="CarLoading.printCarStockSheet(${c.id})" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Print Vehicle Stock Sheet">
                          <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="CarLoading.openCarModal(${c.id})" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Edit Vehicle">
                          <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="CarLoading.deleteCar(${c.id})" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Delete Vehicle">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>

                  ${isExpanded ? `
                    <tr class="bg-blue-50/20 border-b-2 border-blue-200">
                      <td colspan="7" class="p-4 pl-10 bg-gradient-to-b from-blue-50/30 to-slate-50/50">
                        <div class="bg-white rounded-xl border border-blue-200/80 shadow-xs p-4 space-y-3">
                          <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div class="flex items-center gap-2">
                              <span class="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center"><i data-lucide="package" class="w-3.5 h-3.5"></i></span>
                              <h4 class="font-black text-xs text-slate-900 uppercase tracking-wider">Loaded Cartons in ${c.car_number}</h4>
                              <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">${loadedCartonsList.length} carton types</span>
                            </div>
                            <div class="flex items-center gap-2">
                              <button onclick="CarLoading.startLoadingForCar(${c.id})" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Load More Cartons
                              </button>
                              <button onclick="CarLoading.printCarStockSheet(${c.id})" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer" title="Print Stock Sheet">
                                <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print Stock Sheet
                              </button>
                            </div>
                          </div>

                          ${loadedCartonsList.length === 0 ? `
                            <div class="py-6 text-center text-slate-400">
                              <p class="text-xs font-bold text-slate-500">This vehicle is currently empty (0 cartons loaded).</p>
                              <button onclick="CarLoading.startLoadingForCar(${c.id})" class="text-xs text-blue-600 font-bold mt-1 underline cursor-pointer">+ Click here to load cartons into this vehicle</button>
                            </div>
                          ` : `
                            <table class="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                              <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                                <tr>
                                  <th class="py-2 px-3 border-r border-slate-200">Carton Item / Flavor</th>
                                  <th class="py-2 px-3 text-center border-r border-slate-200">Packing Spec</th>
                                  <th class="py-2 px-3 text-right border-r border-slate-200">Loaded Qty</th>
                                  <th class="py-2 px-3 text-right border-r border-slate-200">Unit Sale Rate</th>
                                  <th class="py-2 px-3 text-right">Total Value</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
                                ${loadedCartonsList.map(it => `
                                  <tr class="hover:bg-slate-50">
                                    <td class="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-900">${it.carton_name}</td>
                                    <td class="py-1.5 px-3 text-center border-r border-slate-200">
                                      <span class="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-200">${it.pieces_per_carton || 20} pcs/ctn</span>
                                    </td>
                                    <td class="py-1.5 px-3 text-right border-r border-slate-200 font-black text-blue-700 tabular-nums">
                                      ${it.cartons_loaded} <span class="text-[11px] font-bold text-slate-500">ctns</span>
                                    </td>
                                    <td class="py-1.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-slate-700 tabular-nums">
                                      Rs. ${(it.carton_sale_price || 0).toLocaleString()}
                                    </td>
                                    <td class="py-1.5 px-3 text-right font-black text-emerald-700 tabular-nums">
                                      Rs. ${Math.round(it.loaded_value || 0).toLocaleString()}
                                    </td>
                                  </tr>
                                `).join('')}
                              </tbody>
                              <tfoot class="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200">
                                <tr>
                                  <td class="py-2 px-3 border-r border-slate-200 text-slate-800 uppercase">Subtotal Inside Car</td>
                                  <td class="py-2 px-3 text-center border-r border-slate-200 text-slate-400 font-bold">-</td>
                                  <td class="py-2 px-3 text-right border-r border-slate-200 text-blue-700 tabular-nums">${loaded} ctns</td>
                                  <td class="py-2 px-3 text-right border-r border-slate-200 text-slate-400 font-bold">-</td>
                                  <td class="py-2 px-3 text-right text-emerald-700 tabular-nums">Rs. ${Math.round(loadedValue).toLocaleString()}</td>
                                </tr>
                              </tfoot>
                            </table>
                          `}
                        </div>
                      </td>
                    </tr>
                  ` : ''}
                `;
              }).join('')
            }
          </tbody>
          <tfoot class="bg-slate-100/95 border-t-2 border-slate-300 font-black text-xs text-slate-900 sticky bottom-0 z-10 shadow-sm">
            <tr class="bg-slate-100 border-t-2 border-slate-300">
              <td class="py-2.5 px-3 border-r border-slate-300 text-left">
                <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                  <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                  TOTAL: ${filteredCars.length} VEHICLES
                </div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-center font-black text-slate-900 tabular-nums">
                ${totalDeliveriesAll.toLocaleString()} deliveries
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-blue-700 text-sm tabular-nums">
                ${totalCartonsLoaded.toLocaleString()} ctns
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-emerald-800 text-sm tabular-nums">
                Rs. ${Math.round(grandTotalValue).toLocaleString()}
              </td>
              <td class="py-2.5 px-3 text-right text-slate-400 font-bold">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  toggleCarExpand(carId) {
    if (!this.expandedCarIds) this.expandedCarIds = new Set();
    if (this.expandedCarIds.has(carId)) {
      this.expandedCarIds.delete(carId);
    } else {
      this.expandedCarIds.add(carId);
    }
    this.renderUI();
  },

  toggleCarSort(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = ['loaded_cartons', 'loaded_value', 'deliveries'].includes(field) ? 'desc' : 'asc';
    }
    this.renderUI();
  },

  getCarSortIcon(field) {
    if (this.sortField !== field) {
      return `<i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-300 ml-1 inline-block"></i>`;
    }
    return this.sortOrder === 'asc'
      ? `<i data-lucide="arrow-up" class="w-3 h-3 text-blue-600 ml-1 inline-block"></i>`
      : `<i data-lucide="arrow-down" class="w-3 h-3 text-blue-600 ml-1 inline-block"></i>`;
  },

  async selectCar(carId) {
    this.selectedCarId = carId;
    this.toggleCarExpand(carId);
  },

  carInvSortField: 'carton_name',
  carInvSortOrder: 'asc',

  toggleCarInvSort(field) {
    if (this.carInvSortField === field) {
      this.carInvSortOrder = this.carInvSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.carInvSortField = field;
      this.carInvSortOrder = ['cartons_loaded', 'loaded_value', 'carton_sale_price'].includes(field) ? 'desc' : 'asc';
    }
    this.loadSelectedCarInventory();
  },

  getCarInvSortIcon(field) {
    if (this.carInvSortField !== field) {
      return `<i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-300 ml-1 inline-block"></i>`;
    }
    return this.carInvSortOrder === 'asc'
      ? `<i data-lucide="arrow-up" class="w-3 h-3 text-blue-600 ml-1 inline-block"></i>`
      : `<i data-lucide="arrow-down" class="w-3 h-3 text-blue-600 ml-1 inline-block"></i>`;
  },

  async loadSelectedCarInventory() {
    const target = document.getElementById('car-inventory-breakdown');
    if (!target) return;

    if (!this.selectedCarId) {
      target.innerHTML = `
        <div class="h-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center my-auto">
          <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center mb-3 shadow-2xs">
            <i data-lucide="truck" class="w-8 h-8 text-blue-600"></i>
          </div>
          <h4 class="text-base font-black text-slate-800 tracking-tight">Click on a car to view</h4>
          <p class="text-xs text-slate-400 font-medium max-w-sm mt-1 leading-relaxed">
            Select any vehicle from the list on the left to view loaded cartons, driver details, and inventory value.
          </p>
        </div>
      `;
      if (window.lucide) lucide.createIcons({ root: target });
      return;
    }

    const car = this.cars.find(c => c.id === this.selectedCarId);
    if (!car) return;

    const inv = await window.api.getCarInventory(car.id) || [];
    let loadedItems = inv.filter(it => (it.cartons_loaded || 0) > 0);
    const totalCartons = loadedItems.reduce((sum, it) => sum + it.cartons_loaded, 0);
    const totalLoadedValue = loadedItems.reduce((sum, it) => sum + (it.loaded_value || 0), 0);

    const csf = this.carInvSortField || 'carton_name';
    const cso = this.carInvSortOrder === 'desc' ? -1 : 1;
    loadedItems.sort((a, b) => {
      if (csf === 'carton_name') return cso * (a.carton_name || '').localeCompare(b.carton_name || '');
      if (csf === 'pieces_per_carton') return cso * ((a.pieces_per_carton || 0) - (b.pieces_per_carton || 0));
      if (csf === 'cartons_loaded') return cso * ((a.cartons_loaded || 0) - (b.cartons_loaded || 0));
      if (csf === 'carton_sale_price') return cso * ((a.carton_sale_price || 0) - (b.carton_sale_price || 0));
      if (csf === 'loaded_value') return cso * ((a.loaded_value || 0) - (b.loaded_value || 0));
      return cso * (a.carton_name || '').localeCompare(b.carton_name || '');
    });

    target.innerHTML = `
      <div class="flex items-start justify-between pb-4 border-b border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-mono text-[10px] font-black">CAR INVENTORY</span>
            <h3 class="text-lg font-black text-slate-900">${car.car_number}</h3>
          </div>
          <p class="text-xs text-slate-500 font-bold mt-1">Driver: ${car.driver_name} • Phone: ${car.phone ? (window.app && app.formatPhone ? app.formatPhone(car.phone) : car.phone) : 'N/A'}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="CarLoading.startLoadingForCar(${car.id})" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4"></i> Load Stock
          </button>
          <button onclick="CarLoading.printCarStockSheet(${car.id})" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer" title="Print Car Stock Sheet">
            <i data-lucide="printer" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <div class="my-4 grid grid-cols-2 gap-3">
        <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
          <span class="text-[10px] font-black uppercase text-blue-900 tracking-wider block">Total Cartons in Car</span>
          <span class="text-xl font-black text-blue-700 tabular-nums">${totalCartons} cartons</span>
        </div>
        <div class="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <span class="text-[10px] font-black uppercase text-emerald-900 tracking-wider block">Estimated Stock Value</span>
          <span class="text-xl font-black text-emerald-700 tabular-nums">Rs. ${Math.round(totalLoadedValue).toLocaleString()}</span>
        </div>
      </div>

      <h4 class="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Cartons Currently Loaded Inside This Car</h4>
      
      ${loadedItems.length === 0 ? `
        <div class="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p class="font-bold text-xs text-slate-500">This vehicle is currently empty.</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Click "Load Stock" to add cartons from factory stock into this car.</p>
        </div>
      ` : `
        <div class="border border-slate-200 rounded-2xl overflow-hidden">
          <table class="w-full text-left text-xs border-collapse border border-slate-200">
            <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
              <tr>
                <th onclick="CarLoading.toggleCarInvSort('carton_name')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div class="flex items-center justify-between gap-1">
                    <span>Item / Flavor</span>
                    ${this.getCarInvSortIcon('carton_name')}
                  </div>
                </th>
                <th onclick="CarLoading.toggleCarInvSort('pieces_per_carton')" class="py-2 px-3 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div class="flex items-center justify-center gap-1">
                    <span>Spec</span>
                    ${this.getCarInvSortIcon('pieces_per_carton')}
                  </div>
                </th>
                <th onclick="CarLoading.toggleCarInvSort('cartons_loaded')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div class="flex items-center justify-end gap-1">
                    <span>Loaded Qty</span>
                    ${this.getCarInvSortIcon('cartons_loaded')}
                  </div>
                </th>
                <th onclick="CarLoading.toggleCarInvSort('carton_sale_price')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div class="flex items-center justify-end gap-1">
                    <span>Rate</span>
                    ${this.getCarInvSortIcon('carton_sale_price')}
                  </div>
                </th>
                <th onclick="CarLoading.toggleCarInvSort('loaded_value')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div class="flex items-center justify-end gap-1">
                    <span>Total Value</span>
                    ${this.getCarInvSortIcon('loaded_value')}
                  </div>
                </th>
                <th class="py-2 px-2 text-center w-14">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
              ${loadedItems.map(it => `
                <tr class="hover:bg-slate-50">
                  <td class="py-1.5 px-3 font-black text-slate-900 text-xs border-r border-slate-200">${it.carton_name}</td>
                  <td class="py-1.5 px-3 text-center font-mono text-[10px] text-slate-500 border-r border-slate-200">${it.pieces_per_carton} pcs</td>
                  <td class="py-1.5 px-3 text-right font-black text-blue-700 text-xs tabular-nums border-r border-slate-200">${it.cartons_loaded} ctns</td>
                  <td class="py-1.5 px-3 text-right font-mono text-slate-600 text-xs tabular-nums border-r border-slate-200">Rs. ${it.carton_sale_price}</td>
                  <td class="py-1.5 px-3 text-right font-black text-emerald-700 text-xs tabular-nums border-r border-slate-200">Rs. ${Math.round(it.loaded_value).toLocaleString()}</td>
                  <td class="py-1.5 px-2 text-center">
                    <button type="button" onclick="CarLoading.openUnloadModal(${it.carton_id})"
                            class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs mx-auto"
                            title="Remove carton from car & move back to factory stock">
                      <i data-lucide="package-minus" class="w-3.5 h-3.5"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot class="bg-slate-100/95 border-t-2 border-slate-300 font-black text-xs text-slate-900 sticky bottom-0 z-10 shadow-sm">
              <tr class="bg-slate-100 border-t-2 border-slate-300">
                <td class="py-2.5 px-3 border-r border-slate-300 text-left">
                  <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                    <span class="text-blue-700 font-black">TOTAL:</span>
                    <span>${loadedItems.length} ${loadedItems.length === 1 ? 'Product' : 'Products'}</span>
                  </div>
                </td>
                <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
                <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-blue-700 text-sm tabular-nums">
                  ${loadedItems.reduce((sum, it) => sum + (Number(it.cartons_loaded) || 0), 0).toLocaleString()} <span class="text-xs font-black text-slate-700 ml-1 inline-block">ctns</span>
                </td>
                <td class="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-400 text-xs">-</td>
                <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-emerald-800 text-sm tabular-nums bg-blue-50/70">
                  Rs. ${Math.round(loadedItems.reduce((sum, it) => sum + (Number(it.loaded_value) || 0), 0)).toLocaleString()}
                </td>
                <td class="py-2.5 px-3 text-center text-slate-400 font-bold text-xs">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `}
    `;

    if (window.lucide) lucide.createIcons({ root: target });
  },

  renderDispatchView() {
    const activeCar = this.cars.find(c => c.id === this.selectedCarId) || this.cars[0];

    return `
      <div class="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar w-full space-y-4">
        <div class="w-full space-y-4">
          
          <!-- Dispatch Form Header -->
          <div class="p-5 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">CAR LOADING</span>
              <h3 class="text-lg font-black text-slate-900 mt-1">Load Cartons from Warehouse into Car</h3>
              <p class="text-xs text-slate-500 font-medium">Cartons will be deducted from factory freezer and transferred to car inventory.</p>
            </div>
            <div>
              <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Target Car / Vehicle *</label>
              <select id="dsp-car-select" onchange="CarLoading.onDispatchCarChange(this.value)"
                      class="px-3.5 py-2.5 bg-white border-2 border-blue-400 rounded-xl text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm">
                ${this.cars.map(c => `
                  <option value="${c.id}" ${activeCar && c.id === activeCar.id ? 'selected' : ''}>
                    ${c.car_number} (${c.driver_name} - currently has ${c.total_loaded_cartons || 0} ctns)
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Table of Carton Products to Load -->
          <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 class="font-black text-sm text-slate-900">Select Cartons to Load</h4>
                <p class="text-[11px] text-slate-400 font-medium">Scan carton barcode or enter quantity to load</p>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <!-- Barcode scan input -->
                <div class="relative min-w-[200px]">
                  <i data-lucide="scan-barcode" class="w-3.5 h-3.5 text-blue-500 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
                  <input type="text" id="dsp-barcode-scan"
                         onkeydown="if(event.key==='Enter'){event.preventDefault(); CarLoading.handleBarcodeScan(this.value); this.value='';}"
                         placeholder="Scan carton barcode..."
                         class="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-2xs">
                </div>
                <div class="text-right">
                  <span class="text-xs font-bold text-slate-500">Loading Date:</span>
                  <input type="date" id="dsp-date" value="${new Date().toISOString().split('T')[0]}" class="ml-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none">
                </div>
              </div>
            </div>

            <table class="w-full text-left text-xs">
              <thead class="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th class="py-2 px-3 border-r border-slate-200">Carton Item</th>
                  <th class="py-2 px-3 text-center border-r border-slate-200">Spec</th>
                  <th class="py-2 px-3 text-right border-r border-slate-200">Already In Car</th>
                  <th class="py-2 px-3 text-right border-r border-slate-200">Factory Warehouse Stock</th>
                  <th class="py-2 px-3 text-right w-44 border-r border-slate-200">Cartons to Load</th>
                  <th class="py-2 px-3 text-right">Total in Car After</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-700" id="dsp-table-body">
                <!-- Injected by loadDispatchTable -->
              </tbody>
              <tfoot class="bg-slate-100/95 border-t-2 border-slate-300 font-black text-xs text-slate-900 sticky bottom-0 z-10 shadow-sm" id="dsp-table-foot">
                <tr class="bg-slate-100 border-t-2 border-slate-300">
                  <td class="py-2.5 px-3 border-r border-slate-300 text-left">
                    <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                      <span class="text-blue-700 font-black">TOTAL:</span>
                      <span id="dsp-foot-items">0 Items</span>
                    </div>
                  </td>
                  <td class="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400 font-bold">-</td>
                  <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-blue-700 text-sm tabular-nums" id="dsp-foot-already">
                    0 ctns
                  </td>
                  <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-purple-800 text-sm tabular-nums" id="dsp-foot-warehouse">
                    0 ctns
                  </td>
                  <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-blue-700 text-sm tabular-nums bg-blue-50/70" id="dsp-foot-loading">
                    0 ctns
                  </td>
                  <td class="py-2.5 px-3 text-right font-black text-slate-900 text-sm tabular-nums" id="dsp-foot-after">
                    0 ctns
                  </td>
                </tr>
              </tfoot>
            </table>

            <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div class="text-xs font-black text-slate-700" id="dsp-summary-text">
                Total Cartons Being Loaded: <span class="text-blue-600 text-sm" id="dsp-total-load-count">0</span>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="CarLoading.dispatchItems = {}; CarLoading.switchTab('cars')" class="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer">Cancel</button>
                <button type="button" id="dsp-submit-btn" onclick="CarLoading.submitDispatch()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer">
                  <i data-lucide="check-circle" class="w-4 h-4"></i> Confirm Loading &amp; Print Sheet
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  async onDispatchCarChange(carId) {
    this.selectedCarId = Number(carId);
    this.dispatchItems = {};
    await this.renderDispatchRows();
  },

  async renderDispatchRows() {
    const tbody = document.getElementById('dsp-table-body');
    if (!tbody) return;

    if (!this.cartons || this.cartons.length === 0) {
      this.cartons = await window.api.getPackedCartons() || [];
    }
    if (!this.cars || this.cars.length === 0) {
      this.cars = await window.api.getCars() || [];
    }

    const selectEl = document.getElementById('dsp-car-select');
    const carId = Number(selectEl?.value) || this.selectedCarId || this.cars[0]?.id;
    if (!carId) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">Please register or select a delivery vehicle.</td></tr>`;
      return;
    }

    const inv = await window.api.getCarInventory(carId) || [];
    const invMap = {};
    inv.forEach(i => invMap[i.carton_id] = i.cartons_loaded || 0);

    if (this.cartons.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">No carton products registered in warehouse.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.cartons.map(c => {
      const inCar = invMap[c.id] || 0;
      const warehouse = c.factory_carton_stock || 0;
      const curQty = this.dispatchItems?.[c.id] || '';

      return `
        <tr class="hover:bg-slate-50">
          <td class="py-1.5 px-3 border-r border-slate-200">
            <div class="font-black text-slate-900 text-xs">${c.carton_name}</div>
            <div class="text-[10px] text-slate-400 leading-tight">Rate: Rs. ${c.carton_sale_price}</div>
          </td>
          <td class="py-1.5 px-3 text-center font-mono text-[10px] text-slate-500 border-r border-slate-200">${c.pieces_per_carton} pcs</td>
          <td class="py-1.5 px-3 text-right font-mono font-bold text-blue-600 text-xs tabular-nums border-r border-slate-200">${inCar} ctns</td>
          <td class="py-1.5 px-3 text-right font-black ${warehouse > 0 ? 'text-purple-700' : 'text-slate-400'} text-xs tabular-nums border-r border-slate-200">
            ${warehouse} ctns
          </td>
          <td class="py-1.5 px-3 text-right border-r border-slate-200">
            <div class="flex items-center justify-end gap-1.5">
              <input type="number" min="0" max="${warehouse}" data-carton-id="${c.id}" data-in-car="${inCar}" data-warehouse="${warehouse}"
                     value="${curQty}" placeholder="0" oninput="CarLoading.onLoadQtyChange(this)"
                     class="dsp-qty-input w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-slate-900 outline-none focus:border-blue-500 tabular-nums">
            </div>
          </td>
          <td class="py-1.5 px-3 text-right font-black text-slate-900 text-xs tabular-nums dsp-total-after" id="dsp-after-${c.id}">
            ${inCar + (Number(curQty) || 0)} ctns
          </td>
        </tr>
      `;
    }).join('');

    const totalItems = this.cartons.length;
    const totalAlreadyInCar = this.cartons.reduce((sum, c) => sum + (invMap[c.id] || 0), 0);
    const totalWarehouseStock = this.cartons.reduce((sum, c) => sum + (c.factory_carton_stock || 0), 0);
    this._dispatchTotalAlready = totalAlreadyInCar;

    const footItems = document.getElementById('dsp-foot-items');
    if (footItems) footItems.textContent = `${totalItems} Items`;
    const footAlready = document.getElementById('dsp-foot-already');
    if (footAlready) footAlready.textContent = `${totalAlreadyInCar.toLocaleString()} ctns`;
    const footWarehouse = document.getElementById('dsp-foot-warehouse');
    if (footWarehouse) footWarehouse.textContent = `${totalWarehouseStock.toLocaleString()} ctns`;

    this.updateDispatchTotalCount();
  },

  onLoadQtyChange(input) {
    if (!this.dispatchItems) this.dispatchItems = {};
    const cartonId = input.dataset.cartonId;
    const inCar = Number(input.dataset.inCar) || 0;
    const warehouse = Number(input.dataset.warehouse) || 0;
    const qty = Number(input.value) || 0;
    if (qty > 0) {
      this.dispatchItems[cartonId] = qty;
    } else {
      delete this.dispatchItems[cartonId];
    }
    const afterEl = document.getElementById(`dsp-after-${cartonId}`);
    if (afterEl) {
      afterEl.textContent = `${inCar + qty} ctns`;
    }

    if (qty > warehouse) {
      input.classList.add('border-rose-500', 'bg-rose-50/70', 'text-rose-700');
      input.classList.remove('border-slate-300', 'text-slate-900');
      input.title = `Exceeds available factory stock (${warehouse} ctns)`;
    } else {
      input.classList.remove('border-rose-500', 'bg-rose-50/70', 'text-rose-700');
      input.classList.add('border-slate-300', 'text-slate-900');
      input.title = '';
    }

    this.updateDispatchTotalCount();
  },

  updateDispatchTotalCount() {
    let total = 0;
    document.querySelectorAll('.dsp-qty-input').forEach(inp => {
      total += Number(inp.value) || 0;
    });
    const countEl = document.getElementById('dsp-total-load-count');
    if (countEl) countEl.textContent = `${total} cartons`;

    const footLoading = document.getElementById('dsp-foot-loading');
    if (footLoading) footLoading.textContent = `${total.toLocaleString()} ctns`;

    const footAfter = document.getElementById('dsp-foot-after');
    if (footAfter) {
      const already = this._dispatchTotalAlready || 0;
      footAfter.textContent = `${(already + total).toLocaleString()} ctns`;
    }

    const submitBtn = document.getElementById('dsp-submit-btn');
    let hasExceeding = false;
    document.querySelectorAll('.dsp-qty-input').forEach(inp => {
      const q = Number(inp.value) || 0;
      const w = Number(inp.dataset.warehouse) || 0;
      if (q > w) hasExceeding = true;
    });

    if (submitBtn) {
      if (hasExceeding || total <= 0) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.classList.remove('cursor-pointer', 'hover:bg-blue-500', 'active:scale-95');
      } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.classList.add('cursor-pointer', 'hover:bg-blue-500', 'active:scale-95');
      }
    }
  },

  async submitDispatch() {
    const carId = Number(document.getElementById('dsp-car-select')?.value);
    const date = document.getElementById('dsp-date')?.value || new Date().toISOString().split('T')[0];

    if (!carId) {
      app.showAlert({ title: 'Select Vehicle', message: 'Please select a delivery vehicle.' });
      return;
    }

    const items = [];
    document.querySelectorAll('.dsp-qty-input').forEach(inp => {
      const qty = Number(inp.value) || 0;
      if (qty > 0) {
        items.push({
          carton_id: Number(inp.dataset.cartonId),
          cartons_to_load: qty
        });
      }
    });

    if (items.length === 0) {
      app.showAlert({ title: 'No Cartons Selected', message: 'Please enter cartons to load for at least one item.' });
      return;
    }

    const targetCar = this.cars.find(c => c.id === carId);
    const carName = targetCar ? targetCar.car_number : `Vehicle #${carId}`;
    const driverName = targetCar ? targetCar.driver_name : '';
    const totalCtns = items.reduce((sum, it) => sum + it.cartons_to_load, 0);

    const itemsListHtml = items.map(it => {
      const c = this.cartons.find(x => x.id === it.carton_id);
      const name = c ? c.carton_name : `Carton #${it.carton_id}`;
      return `
        <div class="flex items-center justify-between py-1 px-2 border-b border-slate-100 last:border-0 text-xs">
          <span class="font-bold text-slate-800">${name}</span>
          <span class="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md tabular-nums">${it.cartons_to_load} ctns</span>
        </div>
      `;
    }).join('');

    app.showConfirm({
      title: 'Confirm Car Loading',
      message: `
        <div class="text-left space-y-3">
          <p class="text-xs text-slate-600">
            Are you sure you want to load <b class="font-black text-blue-700 text-sm">${totalCtns} cartons</b> into vehicle <b class="font-black text-slate-900">${carName}</b>${driverName ? ` (Driver: <b>${driverName}</b>)` : ''}?
          </p>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
            <div class="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Cartons Being Transferred:</div>
            ${itemsListHtml}
          </div>
          <p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
            ⚠️ Cartons will be deducted from Factory Warehouse Stock and transferred into this car's inventory.
          </p>
        </div>
      `,
      confirmText: 'Confirm & Load',
      confirmColor: 'blue',
      onConfirm: async () => {
        app.showLoading?.();
        try {
          const res = await window.api.loadCarStock({
            car_id: carId,
            date,
            items
          });

          if (res && res.success) {
            this.dispatchItems = {};
            app.showToast(`Stock loaded! Loading Slip #: ${res.dispatchNo}`, 'success');
            // Generate & preview A5 Loading Sheet
            await this.printLoadingGatePass(res.batchId);
            await this.loadData();
            this.switchTab('cars');
          } else {
            app.showAlert({ title: 'Loading Error', message: res.error || 'Failed to load cartons.' });
          }
        } finally {
          app.hideLoading?.();
        }
      }
    });
  },

  renderHistoryView() {
    let list = [...this.dispatches];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(d =>
        (d.dispatch_no || '').toLowerCase().includes(q) ||
        (d.car_number || '').toLowerCase().includes(q) ||
        (d.driver_name || '').toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q)
      );
    }

    const sf = this.sortField;
    const so = this.sortOrder === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      if (sf === 'date') {
        const dA = new Date(a.date || a.created_at || 0).getTime() || 0;
        const dB = new Date(b.date || b.created_at || 0).getTime() || 0;
        return so * (dA - dB);
      }
      if (sf === 'dispatch_no') return so * (a.dispatch_no || '').localeCompare(b.dispatch_no || '');
      if (sf === 'car_number') return so * (a.car_number || '').localeCompare(b.car_number || '');
      if (sf === 'driver_name') return so * (a.driver_name || '').localeCompare(b.driver_name || '');
      if (sf === 'total_cartons') return so * ((a.total_cartons || 0) - (b.total_cartons || 0));
      const dA = new Date(a.date || a.created_at || 0).getTime() || 0;
      const dB = new Date(b.date || b.created_at || 0).getTime() || 0;
      return (dB - dA);
    });

    if (list.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
          <i data-lucide="history" class="w-12 h-12 mb-3 text-slate-300"></i>
          <h4 class="text-sm font-black text-slate-600">${this.searchQuery ? 'No matching loading records found' : 'No loading records logged yet'}</h4>
          <p class="text-xs text-slate-400 mt-1">${this.searchQuery ? `No records matched "${this.searchQuery}"` : 'Car loading operations will be recorded here.'}</p>
          ${this.searchQuery ? `<button onclick="CarLoading.clearSearch()" class="text-xs text-blue-600 font-bold mt-2 underline cursor-pointer">Clear Search</button>` : ''}
        </div>
      `;
    }

    const totalDispatchesCount = list.length;
    const grandTotalCartonsLoaded = list.reduce((sum, d) => sum + (Number(d.total_cartons) || 0), 0);

    return `
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th onclick="CarLoading.toggleSort('dispatch_no')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Loading Slip #</span>
                  ${this.getSortIcon('dispatch_no')}
                </div>
              </th>
              <th onclick="CarLoading.toggleSort('date')" class="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[95px] cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Date</span>
                  ${this.getSortIcon('date')}
                </div>
              </th>
              <th onclick="CarLoading.toggleSort('car_number')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Vehicle</span>
                  ${this.getSortIcon('car_number')}
                </div>
              </th>
              <th onclick="CarLoading.toggleSort('driver_name')" class="py-2 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-between gap-1">
                  <span>Driver</span>
                  ${this.getSortIcon('driver_name')}
                </div>
              </th>
              <th onclick="CarLoading.toggleSort('total_cartons')" class="py-2 px-3 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                <div class="flex items-center justify-end gap-1">
                  <span>Total Cartons Loaded</span>
                  ${this.getSortIcon('total_cartons')}
                </div>
              </th>
              <th class="py-2 px-3 border-r border-slate-200">Notes</th>
              <th class="py-2 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            ${list.map(d => `
              <tr class="hover:bg-slate-50/60 transition-colors">
                <td class="py-1.5 px-3 font-mono font-bold text-blue-800 text-xs border-r border-slate-200 whitespace-nowrap">${d.dispatch_no}</td>
                <td class="py-1.5 px-3 font-mono text-slate-600 text-[11px] border-r border-slate-200 whitespace-nowrap">${app.formatDateTime(d.date, d.created_at)}</td>
                <td class="py-1.5 px-3 font-black text-slate-900 text-xs border-r border-slate-200">${d.car_number}</td>
                <td class="py-1.5 px-3 font-bold text-slate-700 text-xs border-r border-slate-200">${d.driver_name}</td>
                <td class="py-1.5 px-3 text-right font-black text-blue-700 text-xs tabular-nums border-r border-slate-200">${d.total_cartons} ctns</td>
                <td class="py-1.5 px-3 text-slate-400 text-[10px] border-r border-slate-200">${d.notes || ''}</td>
                <td class="py-1.5 px-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button onclick="CarLoading.printLoadingGatePass(${d.id})"
                            class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                            title="Print Loading Slip (A5)">
                      <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="CarLoading.deleteLoadingBatch(${d.id})"
                            class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                            title="Delete Loading Record">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot class="bg-slate-100/95 border-t-2 border-slate-300 font-black text-xs text-slate-900 sticky bottom-0 z-10 shadow-sm">
            <tr class="bg-slate-100 border-t-2 border-slate-300">
              <td class="py-2.5 px-3 border-r border-slate-300 text-left" colspan="4">
                <div class="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wider">
                  <span class="text-blue-700 font-black">TOTAL:</span>
                  <span>${totalDispatchesCount} ${totalDispatchesCount === 1 ? 'Loading Record' : 'Loading Records'}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-right font-black text-blue-700 text-sm tabular-nums">
                ${grandTotalCartonsLoaded.toLocaleString()} ctns
              </td>
              <td class="py-2.5 px-3 border-r border-slate-300 text-slate-400 font-bold text-center">-</td>
              <td class="py-2.5 px-3 text-slate-400 font-bold text-center">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  async deleteLoadingBatch(batchId) {
    const batch = (this.dispatches || []).find(d => d.id === batchId);
    const slipNo = batch ? batch.dispatch_no : `#${batchId}`;

    app.showConfirm({
      title: 'Delete Loading Record',
      message: `
        <div class="text-left space-y-2">
          <p class="text-xs text-slate-700">Are you sure you want to delete loading record <b>${slipNo}</b>?</p>
          <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <p class="font-bold">⚠️ This will reverse the stock movements:</p>
            <p class="mt-1">• Cartons loaded into vehicle will be deducted from vehicle stock.</p>
            <p>• Cartons will be returned back to factory warehouse freezer stock.</p>
          </div>
        </div>
      `,
      confirmText: 'Yes, Delete Record',
      confirmColor: 'red',
      onConfirm: async () => {
        app.showLoading?.();
        try {
          const res = await window.api.deleteCarLoadingBatch(batchId);
          if (res && res.success) {
            app.showToast(`Loading record ${slipNo} deleted and stock reversed!`, 'success');
            await this.loadData();
            this.renderUI();
          } else {
            app.showAlert({ title: 'Cannot Delete Loading Record', message: res.error || 'Failed to delete loading record.' });
          }
        } catch (err) {
          console.error('[CAR-LOADING] Delete error:', err);
          app.showAlert({ title: 'Error', message: 'Failed to delete loading record: ' + (err.message || err) });
        } finally {
          app.hideLoading?.();
        }
      }
    });
  },

  switchTab(tab) {
    this.activeTab = tab;
    if (tab === 'cars') {
      this.sortField = 'car_number';
      this.sortOrder = 'asc';
    } else if (tab === 'history') {
      this.sortField = 'date';
      this.sortOrder = 'desc';
    }
    this.renderUI();
    if (tab === 'cars') {
      this.loadSelectedCarInventory();
    } else if (tab === 'dispatch') {
      this.renderDispatchRows();
    }
  },

  startLoadingForCar(carId) {
    this.selectedCarId = carId;
    this.switchTab('dispatch');
  },

  openCarsListModal(searchQuery = '') {
    const modalEl = document.getElementById('car-modal-container');
    if (!modalEl) return;

    this.carsListSearchQuery = searchQuery !== undefined ? searchQuery : (this.carsListSearchQuery || '');
    const query = (this.carsListSearchQuery || '').trim().toLowerCase();
    const filtered = (this.cars || []).filter(c => {
      if (!query) return true;
      return (c.car_number && c.car_number.toLowerCase().includes(query)) ||
             (c.driver_name && c.driver_name.toLowerCase().includes(query)) ||
             (c.phone && c.phone.toLowerCase().includes(query)) ||
             (c.notes && c.notes.toLowerCase().includes(query));
    });

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) CarLoading.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] animate-in fade-in duration-150">
          
          <!-- Modal Header -->
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-black">
                <i data-lucide="truck" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-black tracking-tight">Delivery Cars List</h3>
                <p class="text-[11px] text-slate-400 font-medium">View, search, edit and manage registered delivery vehicles &amp; drivers</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="CarLoading.openCarModal(null, true)" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Vehicle
              </button>
              <button onclick="CarLoading.closeModal()" class="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
          </div>

          <!-- Search & Filter Strip -->
          <div class="p-3 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div class="relative flex-1 max-w-md">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
              <input type="text" id="cars-list-search-inp" placeholder="Search by vehicle #, driver name, phone..."
                     value="${this.carsListSearchQuery || ''}"
                     oninput="CarLoading.onCarsListSearch(this.value)"
                     class="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all">
              ${this.carsListSearchQuery ? `
                <button onclick="CarLoading.onCarsListSearch('')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
            </div>
            <div class="text-xs font-bold text-slate-500 shrink-0">
              Showing <span class="font-black text-slate-900">${filtered.length}</span> of ${this.cars.length} vehicles
            </div>
          </div>

          <!-- Cars Table Area -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-6 pt-3">
            ${filtered.length === 0 ? `
              <div class="text-center py-12 text-slate-400">
                <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                  <i data-lucide="truck" class="w-6 h-6"></i>
                </div>
                <p class="text-sm font-bold text-slate-700">No vehicles match your search</p>
                <p class="text-xs text-slate-400 mt-0.5">Try searching with a different keyword or add a new vehicle.</p>
                <button onclick="CarLoading.openCarModal(null, true)" class="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add New Vehicle
                </button>
              </div>
            ` : `
              <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-100 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th class="py-2.5 px-3 border-r border-slate-200">Vehicle / Van Number</th>
                      <th class="py-2.5 px-3 border-r border-slate-200">Driver / Salesman</th>
                      <th class="py-2.5 px-3 border-r border-slate-200">Phone</th>
                      <th class="py-2.5 px-3 text-center border-r border-slate-200">Completed Trips</th>
                      <th class="py-2.5 px-3 text-right w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                    ${filtered.map(c => `
                      <tr class="hover:bg-blue-50/30 transition-colors">
                        <td class="py-2.5 px-3 border-r border-slate-200">
                          <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-black shrink-0">
                              <i data-lucide="truck" class="w-3.5 h-3.5"></i>
                            </div>
                            <div>
                              <div class="font-black text-slate-900 text-xs">${c.car_number}</div>
                              ${c.notes ? `<div class="text-[10px] text-slate-400 font-medium">${c.notes}</div>` : ''}
                            </div>
                          </div>
                        </td>
                        <td class="py-2.5 px-3 border-r border-slate-200">
                          <div class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i> ${c.driver_name || '<span class="text-slate-300">-</span>'}
                          </div>
                        </td>
                        <td class="py-2.5 px-3 border-r border-slate-200 font-mono text-xs font-bold text-slate-600">
                          ${c.phone ? (window.app && app.formatPhone ? app.formatPhone(c.phone) : c.phone) : '<span class="text-slate-300">-</span>'}
                        </td>
                        <td class="py-2.5 px-3 text-center border-r border-slate-200">
                          <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-black border border-slate-200">
                            ${c.total_deliveries_count || 0} deliveries
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="CarLoading.openCarModal(${c.id}, true)" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs" title="Edit Vehicle Details">
                              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                              <span>Edit</span>
                            </button>
                            <button onclick="CarLoading.deleteCar(${c.id}, true)" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs" title="Delete Vehicle">
                              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- Modal Footer -->
          <div class="p-3 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span class="text-xs text-slate-500">Click <b class="text-slate-700">Edit</b> on any vehicle to modify car number, driver, or phone number.</span>
            <button type="button" onclick="CarLoading.closeModal()" class="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors">
              Close
            </button>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  onCarsListSearch(val) {
    this.openCarsListModal(val);
    const inp = document.getElementById('cars-list-search-inp');
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  },

  openCarModal(id = null, returnToCarsList = false) {
    this._returnToCarsList = returnToCarsList;
    if (id) {
      app.authorizeAction(() => this._renderCarModal(id, returnToCarsList), 'editing vehicle');
    } else {
      this._renderCarModal(null, returnToCarsList);
    }
  },

  _renderCarModal(id = null, returnToCarsList = false) {
    this._returnToCarsList = returnToCarsList;
    const car = id ? this.cars.find(x => x.id === id) : {
      id: null,
      car_number: '',
      driver_name: '',
      phone: '',
      area: '',
      is_active: 1,
      notes: ''
    };
    if (!car) return;

    const modalEl = document.getElementById('car-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) ${returnToCarsList ? 'CarLoading.openCarsListModal()' : 'CarLoading.closeModal()'}">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in duration-150">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <div class="flex items-center gap-2">
              <i data-lucide="${car.id ? 'edit-2' : 'plus-circle'}" class="w-4 h-4 text-blue-400"></i>
              <h3 class="text-base font-black tracking-tight">${car.id ? 'Edit Delivery Vehicle' : 'Add New Delivery Vehicle'}</h3>
            </div>
            <button onclick="${returnToCarsList ? 'CarLoading.openCarsListModal()' : 'CarLoading.closeModal()'}" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="CarLoading.handleCarSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="car-id" value="${car.id || ''}">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Car / Van Number *</label>
              <input type="text" id="car-number" required value="${car.car_number || ''}" placeholder="e.g. SUKUZI BOLAN ABC-123..."
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500">
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Driver / Salesman Name *</label>
              <input type="text" id="car-driver" required value="${car.driver_name || ''}" placeholder="e.g. Salik..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500">
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Phone Number</label>
              <input type="text" id="car-phone" value="${car.phone || ''}" placeholder="0300-1234567"
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 font-mono">
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Notes / Route</label>
              <input type="text" id="car-notes" value="${car.notes || ''}" placeholder="Optional route or vehicle notes..."
                     class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="${returnToCarsList ? 'CarLoading.openCarsListModal()' : 'CarLoading.closeModal()'}" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">
                ${returnToCarsList ? 'Back to List' : 'Cancel'}
              </button>
              <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer">Save Vehicle</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  closeModal() {
    this._returnToCarsList = false;
    const modalEl = document.getElementById('car-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async handleCarSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('car-id').value;
    const data = {
      id: id ? Number(id) : null,
      car_number: document.getElementById('car-number').value.trim(),
      driver_name: document.getElementById('car-driver').value.trim(),
      phone: document.getElementById('car-phone') ? document.getElementById('car-phone').value.trim() : '',
      area: '',
      notes: document.getElementById('car-notes') ? document.getElementById('car-notes').value.trim() : ''
    };

    const res = await window.api.saveCar(data);
    if (res && res.success) {
      app.showToast(id ? 'Vehicle updated successfully!' : 'Vehicle added successfully!', 'success');
      await this.loadData();
      this.render();
      if (this._returnToCarsList) {
        this.openCarsListModal();
      } else {
        this.closeModal();
      }
    } else {
      app.showAlert({ title: 'Error', message: res?.error || 'Failed to save vehicle.' });
    }
  },

  async openUnloadModal(cartonId) {
    const activeCar = this.cars.find(c => c.id === this.selectedCarId);
    if (!activeCar) return;

    const modalEl = document.getElementById('car-modal-container');
    if (!modalEl) return;

    const inv = await window.api.getCarInventory(activeCar.id) || [];
    const it = inv.find(x => x.carton_id === cartonId);
    if (!it || (it.cartons_loaded || 0) <= 0) {
      app.showAlert({ title: 'Not Loaded', message: 'This carton flavor is no longer loaded in this vehicle.' });
      return;
    }

    const carton = (this.cartons || []).find(c => c.id === cartonId);
    const cartonName = it.carton_name || (carton ? carton.carton_name : 'Carton');
    const loadedQty = it.cartons_loaded || 0;
    const warehouseStock = (carton ? carton.factory_carton_stock : it.factory_carton_stock) || 0;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) CarLoading.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <i data-lucide="package-minus" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-sm font-black tracking-tight text-white">Remove Cartons from Car</h3>
                <p class="text-[10px] text-slate-400 font-medium">Return cartons back to factory warehouse stock</p>
              </div>
            </div>
            <button onclick="CarLoading.closeModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          
          <form onsubmit="CarLoading.handleUnloadSubmit(event)" class="p-6 space-y-4">
            <input type="hidden" id="unload-car-id" value="${activeCar.id}">
            <input type="hidden" id="unload-carton-id" value="${cartonId}">
            
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500 font-bold">Delivery Vehicle:</span>
                <span class="font-black text-slate-900">${activeCar.car_number}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500 font-bold">Item / Flavor:</span>
                <span class="font-black text-blue-700">${cartonName}</span>
              </div>
              <div class="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200">
                <span class="text-slate-500 font-bold">Currently in Car:</span>
                <span class="font-black text-blue-800 tabular-nums">${loadedQty} ctns</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500 font-bold">Factory Warehouse Stock:</span>
                <span class="font-black text-purple-700 tabular-nums">${warehouseStock} ctns</span>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                Cartons to Move Back to Factory Stock *
              </label>
              <div class="flex items-center gap-2">
                <button type="button" onclick="CarLoading.stepUnloadQty(-1, ${loadedQty}, ${warehouseStock})"
                        class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all border border-slate-200 shadow-2xs">
                  <i data-lucide="minus" class="w-4 h-4"></i>
                </button>
                <input type="number" id="unload-qty" required min="1" max="${loadedQty}" value="${loadedQty}"
                       oninput="CarLoading.updateUnloadPreview(${loadedQty}, ${warehouseStock})"
                       class="flex-1 px-3.5 py-2.5 bg-white border-2 border-rose-300 rounded-xl text-base font-black text-slate-900 outline-none focus:border-rose-500 font-mono text-center">
                <button type="button" onclick="CarLoading.stepUnloadQty(1, ${loadedQty}, ${warehouseStock})"
                        class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all border border-slate-200 shadow-2xs">
                  <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
                <button type="button" onclick="document.getElementById('unload-qty').value = ${loadedQty}; CarLoading.updateUnloadPreview(${loadedQty}, ${warehouseStock})"
                        class="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black cursor-pointer transition-colors shadow-2xs"
                        title="Unload all cartons">
                  All (${loadedQty})
                </button>
              </div>
              <p class="text-[10px] text-slate-400 font-medium mt-1">Specify how many cartons to remove from this car and restore to factory inventory.</p>
            </div>

            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div class="flex justify-between text-slate-600 font-bold">
                <span>Car stock after remove:</span>
                <span class="font-black text-slate-800 tabular-nums" id="unload-car-after">0 ctns</span>
              </div>
              <div class="flex justify-between text-slate-600 font-bold">
                <span>Factory warehouse after:</span>
                <span class="font-black text-emerald-800 tabular-nums" id="unload-factory-after">${warehouseStock + loadedQty} ctns</span>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onclick="CarLoading.closeModal()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-2 transition-all">
                <i data-lucide="corner-up-left" class="w-4 h-4"></i> Move Back to Inventory Stock
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
    setTimeout(() => {
      const inp = document.getElementById('unload-qty');
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  },

  stepUnloadQty(delta, maxQty, warehouseStock) {
    const inp = document.getElementById('unload-qty');
    if (!inp) return;
    let val = (parseInt(inp.value, 10) || 0) + delta;
    if (val < 1) val = 1;
    if (val > maxQty) val = maxQty;
    inp.value = val;
    this.updateUnloadPreview(maxQty, warehouseStock);
  },

  updateUnloadPreview(loadedQty, warehouseStock) {
    const qty = Number(document.getElementById('unload-qty')?.value) || 0;
    const carAfter = Math.max(0, loadedQty - qty);
    const factoryAfter = warehouseStock + qty;
    const carAfterEl = document.getElementById('unload-car-after');
    const factoryAfterEl = document.getElementById('unload-factory-after');
    if (carAfterEl) carAfterEl.textContent = `${carAfter} ctns`;
    if (factoryAfterEl) factoryAfterEl.textContent = `${factoryAfter} ctns`;
  },

  async handleUnloadSubmit(e) {
    e.preventDefault();
    const carId = Number(document.getElementById('unload-car-id')?.value);
    const cartonId = Number(document.getElementById('unload-carton-id')?.value);
    const qty = Number(document.getElementById('unload-qty')?.value);

    if (!carId || !cartonId || isNaN(qty) || qty <= 0) {
      app.showAlert({ title: 'Invalid Quantity', message: 'Please enter a valid quantity of cartons to unload.' });
      return;
    }

    app.showLoading();
    try {
      const res = await window.api.unloadCarStock({
        car_id: carId,
        carton_id: cartonId,
        cartons_to_unload: qty
      });

      if (res && res.success) {
        this.closeModal();
        app.showToast(`Moved ${qty} carton(s) back to factory stock!`, 'success');
        await this.loadData();
      } else {
        app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to unload cartons.' });
      }
    } catch (err) {
      console.error('Unload stock error:', err);
      app.showAlert({ title: 'Error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      app.hideLoading();
    }
  },

  async deleteCar(id, returnToCarsList = false) {
    app.authorizeAction(async () => {
      const ok = await new Promise(resolve => {
        app.showConfirm({
          title: 'Delete Vehicle?',
          message: 'Are you sure you want to remove this delivery car?',
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (ok) {
        const res = await window.api.deleteCar(id);
        if (res && res.success) {
          app.showToast('Vehicle deleted', 'success');
          await this.loadData();
          this.render();
          if (returnToCarsList) {
            this.openCarsListModal();
          }
        } else {
          app.showAlert({ title: 'Cannot Delete', message: res.error || 'Failed to delete vehicle.' });
        }
      }
    }, 'deleting vehicle');
  },

  async printCarStockSheet(carId) {
    const car = this.cars.find(c => c.id === carId);
    if (!car) return;

    const inv = await window.api.getCarInventory(car.id) || [];
    const loadedItems = inv.filter(it => (it.cartons_loaded || 0) > 0);
    const totalCartons = loadedItems.reduce((sum, it) => sum + it.cartons_loaded, 0);
    const totalValue = loadedItems.reduce((sum, it) => sum + (it.loaded_value || 0), 0);

    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const date = new Date().toLocaleDateString('en-GB');

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 600;">Date: ${app.formatDateTime(new Date())} | Vehicle: ${car.car_number}</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          STAGE 4: CAR LOADED STOCK INVENTORY SHEET
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; border: 1px solid #000; padding: 5px 8px; background: #fff; color: #000;">
          <div style="line-height: 1.45;">
            <div><strong>Car / Van:</strong> ${car.car_number}</div>
            <div><strong>Driver / Salesman:</strong> ${car.driver_name}</div>
          </div>
          <div style="text-align: right; line-height: 1.45;">
            <div><strong>Contact:</strong> ${car.phone || 'N/A'}</div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Carton Product</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 60px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Spec</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 75px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Loaded Qty</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 75px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Carton Rate</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${loadedItems.length === 0 ? `
              <tr><td colspan="6" style="padding: 12px; text-align: center; color: #000;">No cartons currently loaded in this vehicle.</td></tr>
            ` : loadedItems.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; font-weight: 800; color: #000;">${it.carton_name}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9.5px; color: #000;">${it.pieces_per_carton} pcs</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${it.cartons_loaded} ctns</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${it.carton_sale_price}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round(it.loaded_value).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 5px 0; font-size: 10px; font-weight: 900; color: #000;">
          <span>TOTAL CARTONS IN VEHICLE: ${totalCartons}</span>
          <span style="font-family: -apple-system, monospace;">ESTIMATED VALUE: Rs. ${Math.round(totalValue).toLocaleString()}</span>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Driver / Salesman Signature
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Loading Supervisor Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Car Stock Sheet - ${car.car_number} (A5)`);
  },

  async printLoadingGatePass(batchId) {
    const batch = await window.api.getCarLoadingBatch(batchId);
    if (!batch) return;

    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const totalVal = (batch.items || []).reduce((sum, it) => sum + (it.cartons_loaded * (it.sale_price || 0)), 0);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 600;">Slip #: ${batch.dispatch_no} | Date &amp; Time: ${app.formatDateTime(batch.date, batch.created_at)}</p>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          VEHICLE LOADING SLIP
        </div>

        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; border: 1px solid #000; padding: 5px 8px; background: #fff; color: #000;">
          <div style="line-height: 1.45;">
            <div><strong>Vehicle:</strong> ${batch.car_number}</div>
            <div><strong>Driver:</strong> ${batch.driver_name}</div>
          </div>
          <div style="text-align: right; line-height: 1.45;">
            <div><strong>Driver Phone:</strong> ${batch.phone || 'N/A'}</div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Carton Description</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 60px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Packing</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Cartons Loaded</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 75px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Unit Rate</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 85px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${(batch.items || []).map((it, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; font-weight: 800; color: #000;">${it.carton_name}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 9.5px; color: #000;">${it.pieces_per_carton} pcs</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-size: 9.5px; color: #000;">${it.cartons_loaded} ctns</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${it.sale_price}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round(it.cartons_loaded * (it.sale_price || 0)).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 5px 0; font-size: 10px; font-weight: 900; color: #000;">
          <span>TOTAL CARTONS LOADED: ${batch.total_cartons}</span>
          <span style="font-family: -apple-system, monospace;">ESTIMATED VALUE: Rs. ${Math.round(totalVal).toLocaleString()}</span>
        </div>

        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Driver / Receiver Signature
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Security / Gate Officer
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Vehicle Loading Slip - ${batch.dispatch_no} (A5)`);
  }
};
