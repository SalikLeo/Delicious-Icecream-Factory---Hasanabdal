// Stage 5: Shop Deliveries, Sales & Returns (With A5 Paper Invoicing)
window.ShopSales = {
  cars: [],
  cartons: [],
  shops: [],
  selectedCarId: null,
  selectedShopId: null,
  carInventory: [],
  items: [], // [{ carton_id, carton_name, ordered_cartons, delivered_cartons, returned_cartons, return_destination, carton_price, line_total }]
  discount: 0,
  receivedAmount: 0,
  paymentMethod: 'Cash',
  currentReturnDelivery: null,
  returnDestination: 'car', // 'car' | 'stock'
  returnAdjustmentType: 'khata', // 'khata' | 'cash'
  returnItemQuantities: {}, // deliveryItemId -> qty

  async render(container, args = {}) {
    this.container = container;
    this.initScannerListener();
    await this.loadData(args);
  },

  async loadData(args = {}) {
    try {
      this.cars = await window.api.getCars() || [];
      this.cartons = await window.api.getPackedCartons() || [];
      this.shops = await window.api.getShops() || [];

      if (!this.selectedCarId && this.cars.length > 0) {
        this.selectedCarId = this.cars[0].id;
      }

      if (this.selectedCarId) {
        this.carInventory = await window.api.getCarInventory(this.selectedCarId) || [];
      }

      this.renderUI();
    } catch (e) {
      console.error('Failed to load shop sales:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading shop deliveries: ${e.message}</div>`;
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
      // Only process when currently on shop-sales page
      if (app.currentPage !== 'shop-sales') return;

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

    // Look up carton by barcode or partial name
    let carton = this.cartons.find(c => String(c.barcode || '').trim().toLowerCase() === barcode);
    if (!carton) {
      carton = this.cartons.find(c => (c.carton_name || '').toLowerCase().includes(barcode));
    }

    if (!carton) {
      app.playBeep('warning');
      app.showToast(`No carton found matching barcode: "${rawBarcode}"`, 'warning');
      return false;
    }

    // Add or increment in this.items
    const existing = this.items.find(x => x.carton_id === carton.id);
    if (existing) {
      const q = (Number(existing.quantity || existing.delivered_cartons) || 1) + 1;
      existing.quantity = q;
      existing.delivered_cartons = q;
      existing.ordered_cartons = q;
      existing.line_total = q * existing.carton_price;
      this.renderUI();
      app.playBeep('success');
      app.showToast(`Scanned: ${carton.carton_name} (+1 ctn, Total: ${q})`, 'success');
    } else {
      const price = carton.carton_sale_price || 0;
      this.items.push({
        carton_id: carton.id,
        carton_name: carton.carton_name,
        pieces_per_carton: carton.pieces_per_carton || 20,
        quantity: 1,
        ordered_cartons: 1,
        delivered_cartons: 1,
        returned_cartons: 0,
        return_destination: 'car',
        carton_price: price,
        line_total: 1 * price
      });
      this.renderUI();
      app.playBeep('success');
      app.showToast(`Scanned: ${carton.carton_name} (1 ctn added)`, 'success');
    }

    setTimeout(() => {
      const scanInput = document.getElementById('ss-barcode-scan-input');
      if (scanInput) {
        scanInput.value = '';
        scanInput.focus();
      }
    }, 60);

    return true;
  },

  addItemRow(defaultCartonId = null) {
    const selectedCartonIds = new Set(this.items.map(it => it.carton_id));
    const cId = defaultCartonId || (this.cartons.find(c => !selectedCartonIds.has(c.id))?.id || this.cartons[0]?.id || null);
    const carton = this.cartons.find(c => c.id === cId);
    const price = carton ? (carton.carton_sale_price || 0) : 250;
    this.items.push({
      carton_id: cId,
      carton_name: carton ? carton.carton_name : '',
      pieces_per_carton: carton ? carton.pieces_per_carton : 20,
      quantity: 1,
      ordered_cartons: 1,
      delivered_cartons: 1,
      returned_cartons: 0,
      return_destination: 'car', // 'car' | 'stock'
      carton_price: price,
      line_total: 1 * price
    });
  },

  renderUI() {
    if (!this.container) return;

    const activeCar = this.cars.find(c => c.id === this.selectedCarId);
    const activeShop = this.shops.find(s => s.id === this.selectedShopId);

    // Calculate totals
    let subtotal = 0;
    let totalCartons = 0;

    this.items.forEach(it => {
      const qty = Number(it.quantity || it.delivered_cartons) || 1;
      const price = Number(it.carton_price) || 0;
      it.quantity = qty;
      it.delivered_cartons = qty;
      it.ordered_cartons = qty;
      it.line_total = qty * price;
      subtotal += it.line_total;
      totalCartons += qty;
    });

    const totalAmount = Math.max(0, subtotal - (Number(this.discount) || 0));
    const previousBalance = activeShop ? Number(activeShop.amount || 0) : 0;
    const remainingBill = Math.max(0, totalAmount - (Number(this.receivedAmount) || 0));
    const netShopBalance = previousBalance + remainingBill;

    // Filter available stock inside selected car
    const loadedCarItems = this.carInventory.filter(it => (it.cartons_loaded || 0) > 0);

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white p-4 px-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border border-amber-800/40 shrink-0">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[11px] font-black">STAGE 5</span>
              <h2 class="text-xl md:text-2xl font-black tracking-tight text-white">Shop Delivery &amp; Sales Invoicing</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Fast carton sales, barcode scanning, Khata debt tracking, and A5 thermal/laser bill printing.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="app.navigate('proposals')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="history" class="w-4 h-4 text-amber-400"></i> Sales History
            </button>
            <button onclick="ShopSales.resetForm()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Reset Form
            </button>
          </div>
        </div>

        <!-- Top Controls: Vehicle & Shop Selection -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          <!-- Car Selection (5 cols) -->
          <div class="md:col-span-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <label class="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                <i data-lucide="truck" class="w-4 h-4 text-blue-600"></i> Delivering Vehicle / Car *
              </label>
              <span class="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                ${activeCar ? `${activeCar.total_loaded_cartons || 0} ctns in car` : ''}
              </span>
            </div>

            <select id="ss-car-id" onchange="ShopSales.onCarChange(this.value)"
                    class="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-blue-400 rounded-xl text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-100">
              ${this.cars.map(c => `
                <option value="${c.id}" ${activeCar && c.id === activeCar.id ? 'selected' : ''}>
                  ${c.car_number} (${c.driver_name} - ${c.total_loaded_cartons || 0} cartons inside)
                </option>
              `).join('')}
            </select>

            <!-- Quick In-Car Stock Pill List -->
            <div class="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
              <span class="text-[10px] font-black uppercase text-blue-900 block mb-1">Loaded In This Car:</span>
              ${loadedCarItems.length === 0 ? `
                <span class="text-[11px] text-slate-400 font-bold italic">No cartons loaded in this car yet.</span>
              ` : `
                <div class="flex flex-wrap gap-1.5">
                  ${loadedCarItems.map(it => `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-blue-200 font-bold text-[11px] text-blue-900 shadow-2xs">
                      <span>${it.carton_name}:</span>
                      <span class="font-black text-blue-700">${it.cartons_loaded} ctns</span>
                    </span>
                  `).join('')}
                </div>
              `}
            </div>
          </div>

          <!-- Shop Selection (6 cols) -->
          <div class="md:col-span-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <label class="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                <i data-lucide="store" class="w-4 h-4 text-amber-600"></i> Shop / Customer *
              </label>
              <button type="button" onclick="ShopSales.openQuickAddShopModal()" class="text-[11px] font-black text-amber-600 hover:text-amber-700 cursor-pointer flex items-center gap-1">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Shop
              </button>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <select id="ss-shop-id" onchange="ShopSales.onShopChange(this.value)"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border-2 ${activeShop ? 'border-amber-400 bg-amber-50/20' : 'border-slate-300'} rounded-xl text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-amber-500 transition-all cursor-pointer">
                  <option value="">-- Choose Registered Shop --</option>
                  ${this.shops.map(s => `
                    <option value="${s.id}" ${activeShop && s.id === activeShop.id ? 'selected' : ''}>
                      ${s.name} ${s.owner_name ? `(${s.owner_name})` : ''} ${s.city ? `• ${s.city}` : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
              ${activeShop ? `
                <button type="button" onclick="ShopSales.clearShopSelection()" title="Clear Shop Selection"
                        class="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95" aria-label="Clear Shop">
                  <i data-lucide="x" class="w-4 h-4 text-rose-600"></i>
                </button>
              ` : ''}
            </div>

            <!-- Shop Info & Previous Khata -->
            <div class="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
              <div>
                <span class="text-[10px] font-black uppercase text-amber-900 block">Shop Contact &amp; Area:</span>
                <span class="font-bold text-slate-700">${activeShop ? `${activeShop.phone || 'No Phone'} • ${activeShop.address || activeShop.city || ''}` : 'Counter Walk-in Customer'}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-black uppercase text-amber-900 block">Previous Balance</span>
                <span class="font-black text-sm ${previousBalance > 0 ? 'text-rose-600' : 'text-slate-800'} tabular-nums">
                  Rs. ${Math.round(previousBalance).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

        </div>

        <!-- Middle: Sales Cartons List Table -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div class="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h3 class="font-black text-sm text-slate-900">Sale Cartons List</h3>
              <p class="text-[11px] text-slate-500 font-medium">Specify carton products, quantities sold to shop, and carton rates.</p>
            </div>
            <div class="flex items-center gap-2.5 flex-1 max-w-lg justify-end w-full">
              <!-- Barcode Scanner Input -->
              <div class="relative flex-1 min-w-[240px]">
                <i data-lucide="scan-barcode" class="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                <input type="text" id="ss-barcode-scan-input"
                       onkeydown="if(event.key==='Enter'){event.preventDefault(); ShopSales.handleManualBarcodeScan(this.value); this.value='';}"
                       placeholder="Scan carton barcode or enter code..."
                       class="w-full pl-10 pr-28 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-400 shadow-2xs">
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  <span class="inline-flex items-center gap-1 text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-2xs select-none">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Scanner Ready
                  </span>
                </div>
              </div>

              <button type="button" onclick="ShopSales.addNewRow()" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> ${this.items.length === 0 ? '+ Add First Item' : '+ Add Item'}
              </button>
            </div>
          </div>

          <div class="overflow-x-auto min-h-[160px]">
            ${this.items.length === 0 ? `
              <div class="p-10 text-center text-slate-400 flex flex-col items-center justify-center min-h-[160px]">
                <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mb-2 shadow-2xs">
                  <i data-lucide="package-plus" class="w-6 h-6"></i>
                </div>
                <h4 class="font-black text-sm text-slate-800">No Cartons Added Yet</h4>
                <p class="text-xs text-slate-400 max-w-sm mt-0.5 mb-3.5 font-medium">Click "+ Add First Item" above to add carton products and record delivery quantities.</p>
                <button type="button" onclick="ShopSales.addNewRow()" class="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
                  <i data-lucide="plus" class="w-4 h-4"></i> Add Item
                </button>
              </div>
            ` : `
              <table class="w-full text-left text-xs border-collapse border border-slate-200">
                <thead class="bg-slate-100/90 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3.5 border-r border-slate-200">Item / Carton Product</th>
                    <th class="py-2.5 px-3 text-center w-36 border-r border-slate-200">Quantity (Cartons)</th>
                    <th class="py-2.5 px-3 text-right w-32 border-r border-slate-200">Rate / Ctn (Rs.)</th>
                    <th class="py-2.5 px-3 text-right w-36 border-r border-slate-200">Total (Rs.)</th>
                    <th class="py-2.5 px-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-semibold text-slate-700" id="ss-items-tbody">
                  ${this.items.map((it, idx) => `
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      <td class="py-2.5 px-3.5 border-r border-slate-200">
                        <select onchange="ShopSales.onItemProductChange(${idx}, this.value)"
                                class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 shadow-2xs">
                          ${(() => {
                            const otherSelectedCartons = new Set(this.items.filter((_, i) => i !== idx).map(x => x.carton_id));
                            return this.cartons.map(c => {
                              const isCurrent = c.id === it.carton_id;
                              const isAlreadyAdded = otherSelectedCartons.has(c.id);
                              return `
                                <option value="${c.id}" ${isCurrent ? 'selected' : ''} ${isAlreadyAdded ? 'disabled' : ''}>
                                  ${c.carton_name} ${isAlreadyAdded ? '(Already Added)' : `(Rate: Rs. ${c.carton_sale_price}${c.barcode ? ' | #' + c.barcode : ''})`}
                                </option>
                              `;
                            }).join('');
                          })()}
                        </select>
                      </td>

                      <!-- Quantity (Cartons) with [-] [input] [+] -->
                      <td class="py-2.5 px-3 text-center border-r border-slate-200">
                        <div class="inline-flex items-center justify-center gap-1.5">
                          <button type="button" onclick="ShopSales.stepRowQty(${idx}, -1)" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all">
                            <i data-lucide="minus" class="w-3.5 h-3.5"></i>
                          </button>
                          <input type="number" min="1" id="ss-qty-${idx}" value="${it.quantity || it.delivered_cartons || 1}" oninput="ShopSales.onRowQtyChange(${idx}, this.value)"
                                 class="w-16 px-2 py-1 text-center font-black text-sm text-emerald-800 bg-emerald-50/60 border-2 border-emerald-400 rounded-xl outline-none tabular-nums focus:bg-white focus:border-emerald-600 shadow-2xs">
                          <button type="button" onclick="ShopSales.stepRowQty(${idx}, 1)" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </td>

                      <!-- Carton Price -->
                      <td class="py-2.5 px-3 text-right border-r border-slate-200">
                        <input type="number" step="any" min="0" id="ss-price-${idx}" value="${it.carton_price}" oninput="ShopSales.onRowPriceChange(${idx}, this.value)"
                               class="w-28 px-2.5 py-1 text-right font-black text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none tabular-nums focus:bg-white focus:border-amber-400 shadow-2xs">
                      </td>

                      <!-- Line Total -->
                      <td class="py-2.5 px-3 text-right font-black text-slate-900 text-sm tabular-nums border-r border-slate-200" id="ss-row-total-${idx}">
                        Rs. ${Math.round(it.line_total || 0).toLocaleString()}
                      </td>

                      <!-- Remove Row -->
                      <td class="py-2.5 px-2 text-center">
                        <button type="button" onclick="ShopSales.removeRow(${idx})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer" title="Remove Item">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- Bottom: Streamlined Horizontal Settlement Bar -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 mb-6">
          
          <!-- Method Toggle -->
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Method:</span>
            <div class="inline-flex p-1 bg-slate-800 rounded-xl border border-slate-700">
              <button type="button" id="ss-pm-cash" onclick="ShopSales.setPaymentMethod('Cash')"
                      class="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${this.paymentMethod !== 'Online' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'}">
                💵 Cash
              </button>
              <button type="button" id="ss-pm-online" onclick="ShopSales.setPaymentMethod('Online')"
                      class="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${this.paymentMethod === 'Online' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'}">
                💳 Online
              </button>
            </div>
          </div>

          <!-- Horizontal Figures -->
          <div class="flex flex-wrap items-center gap-5 sm:gap-6">
            
            <!-- Subtotal -->
            <div class="text-left shrink-0">
              <span class="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                Subtotal <span id="ss-subtotal-ctns" class="text-slate-500 font-bold">(${totalCartons} ctns)</span>
              </span>
              <span id="ss-subtotal-val" class="text-sm font-black text-slate-200 tabular-nums">Rs. ${Math.round(subtotal).toLocaleString()}</span>
            </div>

            <!-- Discount -->
            <div class="text-left shrink-0">
              <span class="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Discount</span>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-xs font-bold text-slate-400">Rs.</span>
                <input type="number" min="0" step="any" id="ss-discount-input" value="${this.discount}" oninput="ShopSales.onDiscountChange(this.value)"
                       class="w-20 px-2 py-1 text-right bg-slate-800 border border-slate-700 rounded-lg text-white font-bold outline-none tabular-nums text-xs focus:border-amber-400">
              </div>
            </div>

            <!-- Net Total -->
            <div class="text-left shrink-0 px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-700/80">
              <span class="text-[10px] font-black uppercase text-amber-400 block tracking-wider">Net Total</span>
              <span id="ss-net-total-val" class="text-lg font-black text-amber-400 tabular-nums">Rs. ${Math.round(totalAmount).toLocaleString()}</span>
            </div>

            <!-- Received Input -->
            <div class="text-left shrink-0">
              <span class="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Received</span>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-xs font-bold text-slate-400">Rs.</span>
                <input type="number" min="0" max="${totalAmount}" step="any" id="ss-received-input" value="${this.receivedAmount}" oninput="ShopSales.onReceivedChange(this.value)" placeholder="0"
                       class="w-24 px-2.5 py-1 text-right font-black text-sm bg-slate-800 border-2 ${this.receivedAmount > totalAmount ? 'border-rose-500 text-rose-300' : 'border-emerald-500 text-emerald-400'} rounded-lg outline-none tabular-nums focus:bg-slate-750">
              </div>
            </div>

            <!-- Remaining Bill Balance -->
            <div class="text-left shrink-0">
              <span class="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Bill Balance</span>
              <div class="flex items-baseline gap-1 mt-0.5">
                <span id="ss-rem-balance-val" class="text-sm font-black tabular-nums ${remainingBill > 0 ? 'text-rose-400' : 'text-emerald-400'}">
                  Rs. ${Math.round(remainingBill).toLocaleString()}
                </span>
                <span id="ss-total-shop-balance-val" class="text-[10px] font-bold text-slate-400">${previousBalance > 0 ? `(Total: Rs. ${Math.round(netShopBalance).toLocaleString()})` : ''}</span>
              </div>
            </div>

          </div>

          <!-- Complete Sale Button -->
          <button type="button" id="ss-submit-btn" onclick="ShopSales.submitSaleAndPrint()"
                  ${(this.items.length === 0 || this.receivedAmount > totalAmount) ? 'disabled' : ''}
                  class="px-6 py-2.5 ${(this.items.length === 0 || this.receivedAmount > totalAmount) ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60' : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95'} font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 whitespace-nowrap">
            <i data-lucide="printer" class="w-4 h-4"></i>
            <span>Complete Sale &amp; Print Bill</span>
          </button>

        </div>

      </div>

      <!-- Quick Add Shop Modal Container -->
      <div id="shop-quick-modal-container"></div>
    `;

    if (window.lucide) lucide.createIcons({ root: this.container });
  },

  onCarChange(carId) {
    this.selectedCarId = Number(carId);
    this.loadData();
  },

  onShopChange(shopId) {
    this.selectedShopId = shopId ? Number(shopId) : null;
    this.renderUI();
  },

  clearShopSelection() {
    this.selectedShopId = null;
    this.renderUI();
  },

  onItemProductChange(index, cartonId) {
    const c = this.cartons.find(x => x.id === Number(cartonId));
    if (c && this.items[index]) {
      this.items[index].carton_id = c.id;
      this.items[index].carton_name = c.carton_name;
      this.items[index].pieces_per_carton = c.pieces_per_carton;
      this.items[index].carton_price = c.carton_sale_price;
      const q = Number(this.items[index].quantity || this.items[index].delivered_cartons) || 1;
      this.items[index].quantity = q;
      this.items[index].delivered_cartons = q;
      this.items[index].ordered_cartons = q;
      this.items[index].line_total = q * c.carton_sale_price;
      this.renderUI();
    }
  },

  onRowQtyChange(index, value) {
    const item = this.items[index];
    if (!item) return;

    const val = Math.max(1, parseInt(value) || 1);
    item.quantity = val;
    item.delivered_cartons = val;
    item.ordered_cartons = val;
    item.returned_cartons = 0;
    item.line_total = val * item.carton_price;

    const totEl = document.getElementById(`ss-row-total-${index}`);
    if (totEl) totEl.textContent = `Rs. ${Math.round(item.line_total).toLocaleString()}`;
    this.updateFinancialSummary();
  },

  stepRowQty(index, delta) {
    const item = this.items[index];
    if (!item) return;

    const cur = Number(item.quantity || item.delivered_cartons) || 1;
    const next = Math.max(1, cur + delta);
    item.quantity = next;
    item.delivered_cartons = next;
    item.ordered_cartons = next;
    item.returned_cartons = 0;
    item.line_total = next * item.carton_price;

    const inp = document.getElementById(`ss-qty-${index}`);
    if (inp) inp.value = next;
    const totEl = document.getElementById(`ss-row-total-${index}`);
    if (totEl) totEl.textContent = `Rs. ${Math.round(item.line_total).toLocaleString()}`;
    this.updateFinancialSummary();
  },

  onRowPriceChange(index, value) {
    if (this.items[index]) {
      this.items[index].carton_price = Number(value) || 0;
      const q = Number(this.items[index].quantity || this.items[index].delivered_cartons) || 1;
      this.items[index].line_total = q * this.items[index].carton_price;
      const totEl = document.getElementById(`ss-row-total-${index}`);
      if (totEl) totEl.textContent = `Rs. ${Math.round(this.items[index].line_total).toLocaleString()}`;
      this.updateFinancialSummary();
    }
  },

  addNewRow() {
    const selectedCartonIds = new Set(this.items.map(it => it.carton_id));
    const availableCarton = this.cartons.find(c => !selectedCartonIds.has(c.id));
    if (!availableCarton) {
      app.showToast('All available carton products have already been added.', 'info');
      return;
    }
    this.addItemRow(availableCarton.id);
    this.renderUI();
  },

  removeRow(index) {
    this.items.splice(index, 1);
    this.renderUI();
  },

  onDiscountChange(val) {
    this.discount = Number(val) || 0;
    this.updateFinancialSummary();
  },

  onReceivedChange(val) {
    this.receivedAmount = Number(val) || 0;
    this.updateFinancialSummary();
  },

  setPaymentMethod(pm) {
    this.paymentMethod = pm;
    const btnCash = document.getElementById('ss-pm-cash');
    const btnOnline = document.getElementById('ss-pm-online');
    if (btnCash && btnOnline) {
      if (pm === 'Cash') {
        btnCash.className = 'px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer bg-white text-slate-950 shadow-xs';
        btnOnline.className = 'px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-slate-400 hover:text-white';
      } else {
        btnCash.className = 'px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-slate-400 hover:text-white';
        btnOnline.className = 'px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer bg-white text-slate-950 shadow-xs';
      }
    }
  },

  updateFinancialSummary() {
    let subtotal = 0;
    let totalCartons = 0;
    this.items.forEach(it => {
      const q = Number(it.quantity || it.delivered_cartons) || 1;
      subtotal += (Number(it.line_total) || 0);
      totalCartons += q;
    });

    const netTotal = Math.max(0, subtotal - (Number(this.discount) || 0));
    const remainingBill = Math.max(0, netTotal - (Number(this.receivedAmount) || 0));
    const activeShop = this.shops.find(s => s.id === this.selectedShopId);
    const previousBalance = Number(activeShop?.amount) || 0;
    const netShopBalance = previousBalance + remainingBill;

    const subtotalEl = document.getElementById('ss-subtotal-val');
    if (subtotalEl) subtotalEl.textContent = `Rs. ${Math.round(subtotal).toLocaleString()}`;
    const ctnCountEl = document.getElementById('ss-subtotal-ctns');
    if (ctnCountEl) ctnCountEl.textContent = `(${totalCartons} ctns)`;

    const netEl = document.getElementById('ss-net-total-val');
    if (netEl) netEl.textContent = `Rs. ${Math.round(netTotal).toLocaleString()}`;

    const remEl = document.getElementById('ss-rem-balance-val');
    if (remEl) {
      remEl.textContent = `Rs. ${Math.round(remainingBill).toLocaleString()}`;
      remEl.className = `text-sm font-black tabular-nums ${remainingBill > 0 ? 'text-rose-400' : 'text-emerald-400'}`;
    }

    const shopBalEl = document.getElementById('ss-total-shop-balance-val');
    if (shopBalEl) {
      shopBalEl.textContent = previousBalance > 0 ? `(Total: Rs. ${Math.round(netShopBalance).toLocaleString()})` : '';
    }

    const recvInput = document.getElementById('ss-received-input');
    const isOver = this.receivedAmount > netTotal;
    if (recvInput) {
      recvInput.max = netTotal;
      if (isOver) {
        recvInput.classList.add('border-rose-500', 'text-rose-300');
        recvInput.classList.remove('border-emerald-500', 'text-emerald-400');
      } else {
        recvInput.classList.remove('border-rose-500', 'text-rose-300');
        recvInput.classList.add('border-emerald-500', 'text-emerald-400');
      }
    }

    const submitBtn = document.getElementById('ss-submit-btn');
    const hasItems = this.items.length > 0;
    if (submitBtn) {
      if (!hasItems || isOver) {
        submitBtn.disabled = true;
        submitBtn.className = 'px-6 py-2.5 bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 whitespace-nowrap';
      } else {
        submitBtn.disabled = false;
        submitBtn.className = 'px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 whitespace-nowrap';
      }
    }
  },

  resetForm() {
    this.items = [];
    this.discount = 0;
    this.receivedAmount = 0;
    this.paymentMethod = 'Cash';
    this.selectedShopId = null;
    this.renderUI();
  },

  openQuickAddShopModal() {
    const modalEl = document.getElementById('shop-quick-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) ShopSales.closeShopModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div class="bg-slate-900 py-3.5 px-6 text-white flex justify-between items-center">
            <h3 class="text-base font-black tracking-tight">Quick Add New Shop</h3>
            <button onclick="ShopSales.closeShopModal()" class="text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="ShopSales.handleQuickShopSubmit(event)" class="p-6 space-y-3.5">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Shop / Store Name *</label>
              <input type="text" id="qs-name" required placeholder="e.g. Madina Cold Corner..."
                     class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Owner / Contact Person</label>
              <input type="text" id="qs-owner" placeholder="e.g. Haji Aslam..."
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Phone Number</label>
                <input type="text" id="qs-phone" placeholder="0300-1234567"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400 font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Opening Khata Balance</label>
                <input type="number" step="any" min="0" id="qs-balance" value="0"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400 tabular-nums">
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Address / Area</label>
              <input type="text" id="qs-address" placeholder="e.g. Main GT Road, Hasan Abdal..."
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="ShopSales.closeShopModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer">Save Shop</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  closeShopModal() {
    const modalEl = document.getElementById('shop-quick-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async handleQuickShopSubmit(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('qs-name').value,
      owner_name: document.getElementById('qs-owner').value,
      phone: document.getElementById('qs-phone').value,
      amount: Number(document.getElementById('qs-balance').value) || 0,
      address: document.getElementById('qs-address').value
    };

    const res = await window.api.saveShop(data);
    if (res && res.success) {
      this.closeShopModal();
      app.showToast('Shop added successfully!', 'success');
      this.shops = await window.api.getShops() || [];
      this.selectedShopId = res.id;
      this.renderUI();
    } else {
      app.showAlert({ title: 'Error', message: res.error || 'Failed to save shop.' });
    }
  },

  async submitSaleAndPrint() {
    if (this.items.length === 0) {
      app.showAlert({ title: 'No Items', message: 'Please add at least one carton product to the delivery.' });
      return;
    }

    const activeCar = this.cars.find(c => c.id === this.selectedCarId);
    const activeShop = this.shops.find(s => s.id === this.selectedShopId);
    const shopName = activeShop ? activeShop.name : 'Counter Walk-in Customer';
    const notes = '';

    const validItems = this.items.map(it => {
      const q = Math.max(1, Number(it.quantity || it.delivered_cartons) || 1);
      return {
        ...it,
        quantity: q,
        delivered_cartons: q,
        ordered_cartons: q,
        returned_cartons: 0,
        return_destination: 'car'
      };
    });

    if (validItems.length === 0) {
      app.showAlert({ title: 'Zero Quantities', message: 'Sold cartons must be greater than zero.' });
      return;
    }

    const seenCartonIds = new Set();
    let subtotal = 0;
    for (const it of validItems) {
      if (seenCartonIds.has(it.carton_id)) {
        app.showAlert({ title: 'Duplicate Item', message: 'The same carton product cannot be selected multiple times in one sale.' });
        return;
      }
      seenCartonIds.add(it.carton_id);
      subtotal += (Number(it.delivered_cartons) || 0) * (Number(it.carton_price) || 0);
    }

    const netBillTotal = Math.max(0, subtotal - (Number(this.discount) || 0));
    if (this.receivedAmount > netBillTotal) {
      app.showAlert({
        title: 'Amount Exceeds Bill',
        message: `Received amount (Rs. ${this.receivedAmount.toLocaleString()}) cannot be more than the net bill total (Rs. ${Math.round(netBillTotal).toLocaleString()}).`
      });
      return;
    }

    const payload = {
      shop_id: this.selectedShopId || null,
      shop_name: shopName,
      shop_phone: activeShop?.phone || '',
      shop_address: activeShop?.address || '',
      car_id: this.selectedCarId,
      discount: this.discount,
      received_amount: this.receivedAmount,
      payment_method: this.paymentMethod,
      notes,
      items: validItems
    };

    const res = await window.api.saveShopDelivery(payload);
    if (res && res.success) {
      app.playBeep('success');
      app.showToast(`Delivery Invoice ${res.invoice_no} completed!`, 'success');
      // Generate & preview A5 invoice immediately
      await this.printA5Invoice(res.id);
      this.resetForm();
      await this.loadData();
    } else {
      app.showAlert({ title: 'Error Saving Sale', message: res.error || 'Failed to record delivery.' });
    }
  },

  async printDeliveryInvoice(deliveryId) {
    return this.printA5Invoice(deliveryId);
  },

  async printA5Invoice(deliveryId) {
    const delivery = await window.api.getShopDelivery(deliveryId);
    if (!delivery) return;

    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const phone = settings.phone || '0315-6795995';
    const address = settings.address || 'Hasan Abdal';
    const tagline = settings.tagline || 'Delicious Superstar Foods & Ice Cream Products';

    const items = delivery.items || [];
    const totalDelivered = items.reduce((sum, it) => sum + it.delivered_cartons, 0);
    const totalReturned = items.reduce((sum, it) => sum + it.returned_cartons, 0);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 2px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; background: #fff; box-sizing: border-box; line-height: 1.35; font-size: 10px;">
        
        <!-- Factory Header -->
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          <p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${tagline}</p>
          <p style="font-size: 9px; color: #000; margin: 1px 0 0 0; font-weight: 500;">${address} • Phone: ${phone}</p>
        </div>

        <!-- Document Title -->
        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          DELIVERY INVOICE &amp; BILL
        </div>

        <!-- Invoice Details Meta Grid -->
        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; border: 1px solid #000; padding: 5px 8px; background: #fff; color: #000;">
          <div style="line-height: 1.45;">
            <div><strong>Invoice #:</strong> <span style="font-family: -apple-system, monospace; font-weight: 700;">${delivery.invoice_no}</span></div>
            <div><strong>Date &amp; Time:</strong> ${app.formatDateTime(delivery.date, delivery.created_at)}</div>
            <div><strong>Vehicle:</strong> ${delivery.car_number || 'Direct Warehouse'}</div>
            <div><strong>Driver / Salesman:</strong> ${delivery.driver_name || 'N/A'}</div>
          </div>
          <div style="text-align: right; line-height: 1.45;">
            <div><strong>Shop / Customer:</strong> <span style="font-weight: 800;">${delivery.shop_name}</span></div>
            <div><strong>Contact:</strong> ${delivery.shop_phone || 'Walk-in'}</div>
            <div><strong>Area / Address:</strong> ${delivery.shop_address || 'Hasan Abdal'}</div>
            <div><strong>Payment Mode:</strong> ${delivery.payment_method || 'Cash'}</div>
          </div>
        </div>

        <!-- Itemized Table -->
        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: left; width: 22px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Item Description / Flavor</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 45px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Pack</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 38px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Order</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 42px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Deliv.</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 38px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Ret.</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 55px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Rate/Ctn</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 68px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Total (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000;">
                  <span style="font-weight: 800;">${it.carton_name}</span>
                  ${it.returned_cartons > 0 ? `<span style="font-size: 8.5px; font-weight: 500; display: block;">(Ret: ${it.returned_cartons} ctns ${it.return_destination === 'car' ? 'kept in car' : 'sent to stock'})</span>` : ''}
                </td>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 9.5px; color: #000;">${it.pieces_per_carton} pcs</td>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 9.5px; color: #000;">${it.ordered_cartons}</td>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-weight: 800; font-size: 9.5px; color: #000;">${it.delivered_cartons}</td>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-weight: ${it.returned_cartons > 0 ? '800' : '400'}; font-size: 9.5px; color: #000;">${it.returned_cartons || 0}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${it.carton_price}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round(it.line_total).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Summary & Settlement Box -->
        <div style="margin-top: 6px; display: flex; justify-content: space-between; gap: 8px;">
          <!-- Left: Return Note -->
          <div style="flex: 1; border: 1px solid #000; padding: 5px 8px; font-size: 9.5px; color: #000; background: #fff; line-height: 1.4;">
            <div><strong>Cartons Summary:</strong> Total Delivered: <strong>${totalDelivered} Cartons</strong></div>
            ${totalReturned > 0 ? `<div>Returned: <strong>${totalReturned} Cartons</strong></div>` : ''}
            ${delivery.notes ? `<div style="margin-top: 2px;"><strong>Notes:</strong> ${delivery.notes}</div>` : ''}
            <div style="margin-top: 4px; font-size: 8.5px; font-weight: 600;">* Please inspect all cartons upon delivery. Cold chain maintenance is required.</div>
          </div>

          <!-- Right: Bill Financials -->
          <div style="width: 210px; border: 1.5px solid #000; padding: 5px 8px; font-size: 9.5px; background: #fff; color: #000;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Subtotal:</span>
              <span style="font-weight: 700; font-family: -apple-system, monospace;">Rs. ${Math.round(delivery.subtotal || delivery.total_amount).toLocaleString()}</span>
            </div>
            ${delivery.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Discount:</span>
                <span style="font-family: -apple-system, monospace;">- Rs. ${Math.round(delivery.discount).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: 800; border-top: 1px solid #000; padding-top: 2px; margin-bottom: 2px;">
              <span>Net Bill Total:</span>
              <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(delivery.total_amount).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span>Received (${delivery.payment_method || 'Cash'}):</span>
              <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(delivery.received_amount || 0).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span>Current Bill Due:</span>
              <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(delivery.remaining_balance || 0).toLocaleString()}</span>
            </div>
            ${delivery.previous_balance > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
                <span>Previous Balance:</span>
                <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(delivery.previous_balance).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: 900; border-top: 1.5px solid #000; padding-top: 3px; font-size: 11px; margin-top: 2px;">
              <span>Net Total Due:</span>
              <span style="font-family: -apple-system, monospace;">Rs. ${Math.round((delivery.previous_balance || 0) + (delivery.remaining_balance || 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Authorized Signatures -->
        <div class="a5-signatures" style="margin-top: 28px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Shopkeeper / Receiver Signature &amp; Stamp
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Driver / Salesman Signature
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 10px; font-size: 8.5px; color: #000; border-top: 1px dotted #000; padding-top: 3px; font-weight: 500;">
          Computer Generated A5 Invoice • Software by PrimeSoft (0309-5369472)
        </div>
      </div>
    `;

    app.showA5Preview(html, `Delivery Invoice - ${delivery.invoice_no} (A5)`);
  },

  // ---------------- Return Modal & Stock Adjustment ----------------
  async openReturnModal(deliveryId) {
    const delivery = await window.api.getShopDelivery(deliveryId);
    if (!delivery) {
      app.showAlert({ title: 'Invoice Not Found', message: 'Could not find delivery sale record.' });
      return;
    }

    this.currentReturnDelivery = delivery;
    this.returnDestination = 'car';
    this.returnAdjustmentType = delivery.shop_id ? 'khata' : 'cash';
    this.returnItemQuantities = {};

    (delivery.items || []).forEach(it => {
      this.returnItemQuantities[it.id] = 0;
    });

    this.renderReturnModal();
  },

  renderReturnModal() {
    const modalEl = document.getElementById('sale-return-modal-container');
    if (!modalEl) return;

    const delivery = this.currentReturnDelivery;
    if (!delivery) return;

    const items = delivery.items || [];
    let totalRetCartons = 0;
    let totalRefundAmount = 0;

    items.forEach(it => {
      const retQty = Number(this.returnItemQuantities[it.id]) || 0;
      totalRetCartons += retQty;
      totalRefundAmount += retQty * (Number(it.carton_price) || 0);
    });

    const isCarSelected = this.returnDestination === 'car';
    const isKhataSelected = this.returnAdjustmentType === 'khata';

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[1300] p-4" onclick="if(event.target===this) ShopSales.closeReturnModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Header -->
          <div class="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white p-5 px-6 flex justify-between items-center border-b border-amber-900/40 shrink-0">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider">Sale Return</span>
                <span class="font-mono text-sm font-black text-amber-300">#${delivery.invoice_no}</span>
              </div>
              <h3 class="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <i data-lucide="rotate-ccw" class="w-5 h-5 text-amber-400"></i> Return Cartons for ${delivery.shop_name}
              </h3>
              <p class="text-[11px] text-slate-300 font-medium">Delivered via ${delivery.car_number || 'Vehicle'} (${delivery.driver_name || 'Driver'}) on ${delivery.date}</p>
            </div>
            <button onclick="ShopSales.closeReturnModal()" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <div class="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
            
            <!-- Step 1: Return Destination Cards (Stay in Car vs Return to Stock) -->
            <div>
              <label class="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                1. Where should returned cartons go? *
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Stay in Car Option -->
                <div onclick="ShopSales.setModalReturnDestination('car')"
                     class="p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${isCarSelected ? 'border-blue-500 bg-blue-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'} flex items-start gap-3">
                  <div class="w-9 h-9 rounded-xl ${isCarSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'} flex items-center justify-center shrink-0">
                    <i data-lucide="truck" class="w-5 h-5"></i>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-xs text-slate-900">Stay in That Car</span>
                      <input type="radio" name="modal_ret_dest" value="car" ${isCarSelected ? 'checked' : ''} class="w-4 h-4 text-blue-600">
                    </div>
                    <p class="text-[11px] font-bold text-blue-900 mt-0.5">${delivery.car_number || 'Delivering Vehicle'}</p>
                    <p class="text-[10px] text-slate-500 font-medium mt-0.5">Kept in driver's vehicle inventory for selling to next shops.</p>
                  </div>
                </div>

                <!-- Return to Factory Stock Option -->
                <div onclick="ShopSales.setModalReturnDestination('stock')"
                     class="p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${!isCarSelected ? 'border-purple-500 bg-purple-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'} flex items-start gap-3">
                  <div class="w-9 h-9 rounded-xl ${!isCarSelected ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'} flex items-center justify-center shrink-0">
                    <i data-lucide="warehouse" class="w-5 h-5"></i>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-xs text-slate-900">Return to Factory Stock</span>
                      <input type="radio" name="modal_ret_dest" value="stock" ${!isCarSelected ? 'checked' : ''} class="w-4 h-4 text-purple-600">
                    </div>
                    <p class="text-[11px] font-bold text-purple-900 mt-0.5">Main Warehouse Stock</p>
                    <p class="text-[10px] text-slate-500 font-medium mt-0.5">Adds cartons back to factory warehouse packed carton stock.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Items Table with Quantity to Return -->
            <div>
              <label class="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                2. Specify Items &amp; Return Quantities *
              </label>
              <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-100/90 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th class="py-2 px-3 border-r border-slate-200">Carton Product</th>
                      <th class="py-2 px-2 text-center w-20 border-r border-slate-200">Delivered</th>
                      <th class="py-2 px-2 text-center w-20 border-r border-slate-200">Already Ret.</th>
                      <th class="py-2 px-2 text-center w-28 text-rose-800 bg-rose-50/60 border-r border-slate-200">Return Now</th>
                      <th class="py-2 px-2 text-right w-24 border-r border-slate-200">Rate/Ctn</th>
                      <th class="py-2 px-3 text-right w-28">Refund (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
                    ${items.map(it => {
                      const delivered = Number(it.delivered_cartons) || 0;
                      const alreadyRet = Number(it.returned_cartons) || 0;
                      const maxAvailable = Math.max(0, delivered - alreadyRet);
                      const curVal = Number(this.returnItemQuantities[it.id]) || 0;
                      const lineRefund = curVal * (Number(it.carton_price) || 0);

                      return `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-2 px-3 border-r border-slate-200">
                            <span class="font-black text-slate-900 block">${it.carton_name}</span>
                            <span class="text-[10px] text-slate-400 font-medium">${it.pieces_per_carton} pcs/ctn</span>
                          </td>
                          <td class="py-2 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                            ${delivered}
                          </td>
                          <td class="py-2 px-2 text-center font-bold text-slate-400 border-r border-slate-200">
                            ${alreadyRet}
                          </td>
                          <td class="py-2 px-2 text-center bg-rose-50/20 border-r border-slate-200">
                            ${maxAvailable <= 0 ? `
                              <span class="text-[10px] font-bold text-slate-400 italic">Fully Returned</span>
                            ` : `
                              <div class="inline-flex items-center justify-center gap-1">
                                <button type="button" onclick="ShopSales.stepModalItemReturnQty(${it.id}, ${maxAvailable}, -1)"
                                        class="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all">
                                  <i data-lucide="minus" class="w-3 h-3"></i>
                                </button>
                                <input type="number" min="0" max="${maxAvailable}" value="${curVal}"
                                       oninput="ShopSales.onModalItemReturnQtyChange(${it.id}, ${maxAvailable}, this.value)"
                                       class="w-12 px-1 py-1 text-center font-black text-xs text-rose-700 bg-white border border-rose-300 rounded-lg outline-none tabular-nums focus:border-rose-500 shadow-2xs">
                                <button type="button" onclick="ShopSales.stepModalItemReturnQty(${it.id}, ${maxAvailable}, 1)"
                                        class="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all">
                                  <i data-lucide="plus" class="w-3 h-3"></i>
                                </button>
                              </div>
                            `}
                          </td>
                          <td class="py-2 px-2 text-right font-bold text-slate-600 border-r border-slate-200 tabular-nums">
                            Rs. ${it.carton_price}
                          </td>
                          <td class="py-2 px-3 text-right font-black text-rose-700 tabular-nums">
                            Rs. ${Math.round(lineRefund).toLocaleString()}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Step 3: Adjustment Mode & Reason -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Adjustment Mode -->
              <div>
                <label class="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  3. Financial Adjustment
                </label>
                <div class="space-y-1.5">
                  <label class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input type="radio" name="modal_ret_adj" value="khata" ${isKhataSelected ? 'checked' : ''} onchange="ShopSales.setModalAdjustmentType('khata')" class="text-amber-500">
                    <div>
                      <span class="text-xs font-black text-slate-900 block">Credit Shop Khata Balance</span>
                      <span class="text-[10px] text-slate-500 font-medium">Reduces shop outstanding debt by refund amount</span>
                    </div>
                  </label>
                  <label class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input type="radio" name="modal_ret_adj" value="cash" ${!isKhataSelected ? 'checked' : ''} onchange="ShopSales.setModalAdjustmentType('cash')" class="text-emerald-500">
                    <div>
                      <span class="text-xs font-black text-slate-900 block">Cash Refund Given</span>
                      <span class="text-[10px] text-slate-500 font-medium">Cash was returned / refunded directly to customer</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Reason / Remarks -->
              <div>
                <label class="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Return Remarks / Reason (Optional)
                </label>
                <textarea id="modal-ret-reason" rows="3" placeholder="e.g. Broken packaging, melted during transit, shopkeeper reduced order..."
                          class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-400"></textarea>
              </div>
            </div>

          </div>

          <!-- Footer Summary & Actions -->
          <div class="p-4 px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-4 text-xs">
              <div>
                <span class="text-[10px] font-black uppercase text-slate-400 block">Total Returning:</span>
                <span class="font-black text-sm text-slate-900">${totalRetCartons} Cartons</span>
              </div>
              <div class="h-8 w-px bg-slate-200"></div>
              <div>
                <span class="text-[10px] font-black uppercase text-slate-400 block">Total Refund:</span>
                <span class="font-black text-base text-rose-600">Rs. ${Math.round(totalRefundAmount).toLocaleString()}</span>
              </div>
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button type="button" onclick="ShopSales.closeReturnModal()"
                      class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all">
                Cancel
              </button>
              <button type="button" onclick="ShopSales.submitReturnModal()"
                      ${totalRetCartons === 0 ? 'disabled' : ''}
                      class="px-5 py-2.5 ${totalRetCartons === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95'} font-black text-xs rounded-xl transition-all flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4"></i> Confirm Return &amp; Print Note
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: modalEl });
  },

  setModalReturnDestination(dest) {
    this.returnDestination = dest;
    this.renderReturnModal();
  },

  setModalAdjustmentType(adj) {
    this.returnAdjustmentType = adj;
    this.renderReturnModal();
  },

  onModalItemReturnQtyChange(itemId, maxAvailable, val) {
    const parsed = Math.max(0, Math.min(maxAvailable, parseInt(val) || 0));
    this.returnItemQuantities[itemId] = parsed;
    this.renderReturnModal();
  },

  stepModalItemReturnQty(itemId, maxAvailable, delta) {
    const cur = Number(this.returnItemQuantities[itemId]) || 0;
    const next = Math.max(0, Math.min(maxAvailable, cur + delta));
    this.returnItemQuantities[itemId] = next;
    this.renderReturnModal();
  },

  closeReturnModal() {
    this.currentReturnDelivery = null;
    this.returnItemQuantities = {};
    const modalEl = document.getElementById('sale-return-modal-container');
    if (modalEl) modalEl.innerHTML = '';
  },

  async submitReturnModal() {
    const delivery = this.currentReturnDelivery;
    if (!delivery) return;

    const items = (delivery.items || []).filter(it => (Number(this.returnItemQuantities[it.id]) || 0) > 0);
    if (items.length === 0) {
      app.showAlert({ title: 'Zero Quantities', message: 'Please specify a return quantity greater than 0 for at least one item.' });
      return;
    }

    const reasonEl = document.getElementById('modal-ret-reason');
    const reason = reasonEl ? reasonEl.value.trim() : '';

    const payload = {
      delivery_id: delivery.id,
      return_destination: this.returnDestination, // 'car' or 'stock'
      adjustment_type: this.returnAdjustmentType, // 'khata' or 'cash'
      reason,
      date: new Date().toISOString().split('T')[0],
      items: items.map(it => ({
        delivery_item_id: it.id,
        carton_id: it.carton_id,
        carton_name: it.carton_name,
        pieces_per_carton: it.pieces_per_carton,
        carton_price: it.carton_price,
        return_quantity: Number(this.returnItemQuantities[it.id]) || 0
      }))
    };

    const res = await window.api.processShopReturn(payload);
    if (res && res.success) {
      app.playBeep('success');
      app.showToast(`Return ${res.returnNo} recorded successfully! (${res.totalCartonsReturned} cartons returned to ${res.returnDest === 'car' ? 'Car' : 'Factory Stock'})`, 'success');
      this.closeReturnModal();

      // Refresh whichever page is active
      if (window.Proposals && typeof window.Proposals.loadData === 'function' && app.currentPage === 'proposals') {
        window.Proposals.loadData();
      }
      if (app.currentPage === 'shop-sales') {
        this.loadData();
      }

      // Automatically preview A5 Return Note
      await this.printReturnNote(res.returnId);
    } else {
      app.showAlert({ title: 'Return Failed', message: res?.error || 'Could not record return.' });
    }
  },

  async printReturnNote(returnId) {
    const ret = await window.api.getShopReturn(returnId);
    if (!ret) return;

    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const phone = settings.phone || '0315-6795995';
    const address = settings.address || 'Hasan Abdal';
    const tagline = settings.tagline || 'Delicious Superstar Foods & Ice Cream Products';

    const items = ret.items || [];
    const destLabel = ret.return_destination === 'car' ? `Stayed in Vehicle (${ret.car_number || 'Car'})` : 'Returned to Factory Warehouse Stock';
    const adjLabel = ret.adjustment_type === 'khata' ? 'Khata Balance Credited' : 'Cash Refund Paid';

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 2px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; background: #fff; box-sizing: border-box; line-height: 1.35; font-size: 10px;">
        
        <!-- Factory Header -->
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000;">${company}</h1>
          <p style="font-size: 9.5px; color: #000; margin: 2px 0 0 0; font-weight: 600;">${tagline}</p>
          <p style="font-size: 9px; color: #000; margin: 1px 0 0 0; font-weight: 500;">${address} • Phone: ${phone}</p>
        </div>

        <!-- Document Title -->
        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 6px 0;">
          CARTON RETURN NOTE / CREDIT VOUCHER
        </div>

        <!-- Meta Details Box -->
        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 6px; border: 1px solid #000; padding: 5px 8px; background: #fff; color: #000;">
          <div style="line-height: 1.45;">
            <div><strong>Return Voucher #:</strong> <span style="font-family: -apple-system, monospace; font-weight: 800;">${ret.return_no}</span></div>
            <div><strong>Original Invoice #:</strong> <span style="font-family: -apple-system, monospace; font-weight: 700;">${ret.invoice_no}</span></div>
            <div><strong>Return Date:</strong> ${app.formatDateTime(ret.date, ret.created_at)}</div>
            <div><strong>Vehicle:</strong> ${ret.car_number || 'Direct'}</div>
          </div>
          <div style="text-align: right; line-height: 1.45;">
            <div><strong>Shop / Customer:</strong> <span style="font-weight: 800;">${ret.shop_name}</span></div>
            <div><strong>Destination:</strong> ${destLabel}</div>
            <div><strong>Settlement:</strong> ${adjLabel}</div>
            ${ret.reason ? `<div><strong>Reason:</strong> ${ret.reason}</div>` : ''}
          </div>
        </div>

        <!-- Itemized Table -->
        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 25px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">S#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Item / Flavor Returned</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 50px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Pack Spec</th>
              <th style="border: 1px solid #000; padding: 4px 5px; text-align: center; width: 60px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Cartons Ret.</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 65px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Rate / Ctn</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 75px; font-weight: 900; font-size: 9.5px; text-transform: uppercase; color: #000; background: #fff;">Refund (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 9.5px; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; color: #000; font-weight: 800;">${it.carton_name}</td>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 9.5px; color: #000;">${it.pieces_per_carton} pcs</td>
                <td style="border: 1px solid #000; padding: 4px 5px; text-align: center; font-weight: 800; font-size: 9.5px; color: #000;">${it.returned_cartons}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${it.carton_price}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000;">Rs. ${Math.round(it.refund_amount).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Summary & Totals Box -->
        <div style="margin-top: 6px; display: flex; justify-content: space-between; gap: 8px;">
          <div style="flex: 1; border: 1px solid #000; padding: 5px 8px; font-size: 9.5px; color: #000; background: #fff; line-height: 1.4;">
            <div><strong>Total Cartons Returned:</strong> <strong>${ret.total_cartons_returned} Cartons</strong></div>
            <div><strong>Returned Stock Location:</strong> ${destLabel}</div>
            <div><strong>Khata Adjustment:</strong> ${adjLabel}</div>
            <div style="margin-top: 4px; font-size: 8.5px; font-weight: 600;">* Stock inventory has been adjusted accordingly in the system database.</div>
          </div>

          <div style="width: 210px; border: 1.5px solid #000; padding: 5px 8px; font-size: 9.5px; background: #fff; color: #000;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>Total Ret. Cartons:</span>
              <span style="font-weight: 700;">${ret.total_cartons_returned} ctns</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 900; border-top: 1.5px solid #000; padding-top: 4px; font-size: 11px;">
              <span>Total Refund Amount:</span>
              <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(ret.total_refund_amount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Signatures -->
        <div class="a5-signatures" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Shopkeeper / Returnee Signature
          </div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">
            Driver / Factory Stock Receiver
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 10px; font-size: 8.5px; color: #000; border-top: 1px dotted #000; padding-top: 3px; font-weight: 500;">
          Computer Generated A5 Return Note • Software by PrimeSoft (0309-5369472)
        </div>
      </div>
    `;

    app.showA5Preview(html, `Return Note - ${ret.return_no} (A5)`);
  }
};
