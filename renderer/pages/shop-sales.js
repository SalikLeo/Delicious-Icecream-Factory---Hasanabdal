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

  async render(container, args = {}) {
    this.container = container;
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

      // Reset items or populate initial item row
      if (this.items.length === 0) {
        this.addItemRow();
      }

      this.renderUI();
    } catch (e) {
      console.error('Failed to load shop sales:', e);
      if (this.container) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading shop deliveries: ${e.message}</div>`;
      }
    }
  },

  addItemRow(defaultCartonId = null) {
    const cId = defaultCartonId || (this.cartons[0]?.id || null);
    const carton = this.cartons.find(c => c.id === cId);
    this.items.push({
      carton_id: cId,
      carton_name: carton ? carton.carton_name : '',
      pieces_per_carton: carton ? carton.pieces_per_carton : 20,
      ordered_cartons: 10,
      delivered_cartons: 8,
      returned_cartons: 2,
      return_destination: 'car', // 'car' | 'stock'
      carton_price: carton ? carton.carton_sale_price : 250,
      line_total: 8 * (carton ? carton.carton_sale_price : 250)
    });
  },

  renderUI() {
    if (!this.container) return;

    const activeCar = this.cars.find(c => c.id === this.selectedCarId);
    const activeShop = this.shops.find(s => s.id === this.selectedShopId);

    // Calculate totals
    let subtotal = 0;
    let totalDeliveredCartons = 0;
    let totalReturnedCartons = 0;

    this.items.forEach(it => {
      const delivered = Number(it.delivered_cartons) || 0;
      const price = Number(it.carton_price) || 0;
      it.line_total = delivered * price;
      subtotal += it.line_total;
      totalDeliveredCartons += delivered;
      totalReturnedCartons += Number(it.returned_cartons) || 0;
    });

    const totalAmount = Math.max(0, subtotal - (Number(this.discount) || 0));
    const previousBalance = activeShop ? Number(activeShop.amount || 0) : 0;
    const remainingBill = Math.max(0, totalAmount - (Number(this.receivedAmount) || 0));
    const netShopBalance = previousBalance + remainingBill;

    // Filter available stock inside selected car
    const loadedCarItems = this.carInventory.filter(it => (it.cartons_loaded || 0) > 0);

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-4 max-w-7xl mx-auto p-4 md:p-6 overflow-y-auto custom-scrollbar">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-amber-800/40 shrink-0">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[11px] font-black">STAGE 5</span>
              <h2 class="text-xl md:text-2xl font-black tracking-tight text-white">Shop Delivery &amp; Sales Invoicing</h2>
            </div>
            <p class="text-xs text-slate-300 font-medium">Deliver cartons to shops, manage returns (keep in car vs return to stock), and print A5 bills.</p>
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
          <div class="md:col-span-6 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
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
          <div class="md:col-span-6 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <label class="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                <i data-lucide="store" class="w-4 h-4 text-amber-600"></i> Shop / Customer *
              </label>
              <button type="button" onclick="ShopSales.openQuickAddShopModal()" class="text-[11px] font-black text-amber-600 hover:text-amber-700 cursor-pointer flex items-center gap-1">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> + Add Shop
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select id="ss-shop-id" onchange="ShopSales.onShopChange(this.value)"
                      class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
                <option value="">-- Choose Registered Shop --</option>
                ${this.shops.map(s => `
                  <option value="${s.id}" ${activeShop && s.id === activeShop.id ? 'selected' : ''}>
                    ${s.name} (${s.owner_name || s.city || ''})
                  </option>
                `).join('')}
              </select>

              <input type="text" id="ss-shop-name" value="${activeShop ? activeShop.name : ''}" placeholder="Or type counter shop name..."
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-400">
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

        <!-- Middle: Delivery Items & Returns Table -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div class="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 class="font-black text-sm text-slate-900">Delivery Cartons &amp; Returns Breakdown</h3>
              <p class="text-[11px] text-slate-500 font-medium">Specify ordered cartons, actual cartons delivered, and choose what happens to returned cartons.</p>
            </div>
            <button type="button" onclick="ShopSales.addNewRow()" class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> + Add Another Item
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse border border-slate-200">
              <thead class="bg-slate-100/90 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th class="py-3 px-3 border-r border-slate-200">Item / Carton Product</th>
                  <th class="py-3 px-2 text-center w-24 border-r border-slate-200">Ordered</th>
                  <th class="py-3 px-2 text-center w-24 text-emerald-800 bg-emerald-50/70 border-r border-slate-200">Delivered</th>
                  <th class="py-3 px-2 text-center w-24 text-rose-800 bg-rose-50/70 border-r border-slate-200">Returned</th>
                  <th class="py-3 px-3 text-center border-r border-slate-200">Returned Cartons Destination</th>
                  <th class="py-3 px-2 text-right w-28 border-r border-slate-200">Rate / Ctn</th>
                  <th class="py-3 px-3 text-right w-32 border-r border-slate-200">Total (Rs.)</th>
                  <th class="py-3 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-700" id="ss-items-tbody">
                ${this.items.map((it, idx) => `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-2.5 px-3 border-r border-slate-200">
                      <select onchange="ShopSales.onItemProductChange(${idx}, this.value)"
                              class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-amber-400">
                        ${this.cartons.map(c => `
                          <option value="${c.id}" ${c.id === it.carton_id ? 'selected' : ''}>
                            ${c.carton_name} (Rate: Rs. ${c.carton_sale_price})
                          </option>
                        `).join('')}
                      </select>
                    </td>

                    <!-- Ordered Cartons -->
                    <td class="py-2.5 px-2 text-center border-r border-slate-200">
                      <input type="number" min="0" value="${it.ordered_cartons}" oninput="ShopSales.onRowQtyChange(${idx}, 'ordered', this.value)"
                             class="w-20 px-2 py-1.5 text-center font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none tabular-nums focus:bg-white focus:border-amber-400">
                    </td>

                    <!-- Delivered Cartons -->
                    <td class="py-2.5 px-2 text-center bg-emerald-50/30 border-r border-slate-200">
                      <input type="number" min="0" value="${it.delivered_cartons}" oninput="ShopSales.onRowQtyChange(${idx}, 'delivered', this.value)"
                             class="w-20 px-2 py-1.5 text-center font-black text-xs text-emerald-800 bg-emerald-50 border-2 border-emerald-400 rounded-lg outline-none tabular-nums focus:bg-white">
                    </td>

                    <!-- Returned Cartons -->
                    <td class="py-2.5 px-2 text-center bg-rose-50/30 border-r border-slate-200">
                      <input type="number" min="0" value="${it.returned_cartons}" oninput="ShopSales.onRowQtyChange(${idx}, 'returned', this.value)"
                             class="w-20 px-2 py-1.5 text-center font-black text-xs text-rose-700 bg-rose-50 border border-rose-300 rounded-lg outline-none tabular-nums focus:bg-white">
                    </td>

                    <!-- Return Destination Option (Keep in Car vs Factory Stock) -->
                    <td class="py-2.5 px-3 text-center border-r border-slate-200">
                      <div class="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-black">
                        <button type="button" onclick="ShopSales.setReturnDestination(${idx}, 'car')"
                                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${it.return_destination === 'car' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
                          🔘 Keep in Car
                        </button>
                        <button type="button" onclick="ShopSales.setReturnDestination(${idx}, 'stock')"
                                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${it.return_destination === 'stock' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
                          ⚪ Return to Stock
                        </button>
                      </div>
                    </td>

                    <!-- Carton Price -->
                    <td class="py-2.5 px-2 text-right border-r border-slate-200">
                      <input type="number" step="any" min="0" value="${it.carton_price}" oninput="ShopSales.onRowPriceChange(${idx}, this.value)"
                             class="w-24 px-2 py-1.5 text-right font-black text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none tabular-nums focus:bg-white focus:border-amber-400">
                    </td>

                    <!-- Line Total -->
                    <td class="py-2.5 px-3 text-right font-black text-slate-900 text-sm tabular-nums border-r border-slate-200">
                      Rs. ${Math.round(it.line_total || 0).toLocaleString()}
                    </td>

                    <!-- Remove Row -->
                    <td class="py-2.5 px-2 text-center">
                      <button type="button" onclick="ShopSales.removeRow(${idx})" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer" title="Remove Item">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bottom: Financial Settlement & Big Print Action -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 pb-6">
          
          <!-- Notes & Payment Method (7 cols) -->
          <div class="md:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h4 class="text-xs font-black uppercase text-slate-500 tracking-wider">Payment Method &amp; Delivery Notes</h4>
            
            <div class="flex items-center gap-2">
              <button type="button" onclick="ShopSales.setPaymentMethod('Cash')"
                      class="flex-1 py-2.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${this.paymentMethod === 'Cash' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">
                💵 Cash Payment
              </button>
              <button type="button" onclick="ShopSales.setPaymentMethod('Online')"
                      class="flex-1 py-2.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${this.paymentMethod === 'Online' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">
                💳 Online / Bank / JazzCash
              </button>
              <button type="button" onclick="ShopSales.setPaymentMethod('Credit')"
                      class="flex-1 py-2.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${this.paymentMethod === 'Credit' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">
                📒 Pure Khata / Credit
              </button>
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Invoice Remarks / Special Instructions</label>
              <textarea id="ss-notes" rows="2" placeholder="e.g. Returned 2 cartons kept in car for next shop. Cash collected by driver Ali..."
                        class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-400"></textarea>
            </div>

            <!-- Delivery Summary Pills -->
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div class="p-2.5 bg-slate-50 rounded-xl">
                <span class="text-slate-400 block text-[10px] font-black uppercase">Delivered Cartons:</span>
                <span class="font-black text-emerald-700 text-sm tabular-nums">${totalDeliveredCartons} cartons</span>
              </div>
              <div class="p-2.5 bg-slate-50 rounded-xl">
                <span class="text-slate-400 block text-[10px] font-black uppercase">Returned Cartons:</span>
                <span class="font-black text-rose-600 text-sm tabular-nums">${totalReturnedCartons} cartons</span>
              </div>
            </div>
          </div>

          <!-- Total Due & Settlement Card (5 cols) -->
          <div class="md:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div class="space-y-3">
              <div class="flex justify-between items-center text-xs text-slate-300">
                <span>Subtotal (${totalDeliveredCartons} Cartons):</span>
                <span class="font-black text-white tabular-nums">Rs. ${Math.round(subtotal).toLocaleString()}</span>
              </div>

              <div class="flex justify-between items-center text-xs text-slate-300">
                <span>Special Discount (Rs.):</span>
                <input type="number" min="0" step="any" value="${this.discount}" oninput="ShopSales.onDiscountChange(this.value)"
                       class="w-24 px-2 py-1 text-right bg-slate-800 border border-slate-700 rounded-lg text-white font-bold outline-none tabular-nums text-xs">
              </div>

              <div class="flex justify-between items-center pt-2 border-t border-slate-800 text-sm font-black">
                <span class="text-amber-400 uppercase tracking-wider">Net Bill Total:</span>
                <span class="text-xl text-amber-400 tabular-nums">Rs. ${Math.round(totalAmount).toLocaleString()}</span>
              </div>

              <div class="pt-2 border-t border-slate-800/80">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Received Amount (Rs.)</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">Rs.</span>
                  <input type="number" min="0" step="any" value="${this.receivedAmount}" oninput="ShopSales.onReceivedChange(this.value)" placeholder="0"
                         class="w-full pl-9 pr-3 py-2 bg-slate-800 border-2 border-emerald-500 rounded-xl text-xl font-black text-emerald-400 outline-none tabular-nums focus:bg-slate-750">
                </div>
              </div>

              <div class="p-3 bg-slate-800/80 rounded-xl space-y-1 text-xs">
                <div class="flex justify-between text-slate-300">
                  <span>Current Bill Balance:</span>
                  <span class="font-black text-rose-400 tabular-nums">Rs. ${Math.round(remainingBill).toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-slate-400 text-[11px]">
                  <span>Previous Khata:</span>
                  <span class="font-bold tabular-nums">Rs. ${Math.round(previousBalance).toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-white font-black pt-1 border-t border-slate-700 text-sm">
                  <span>Total Shop Balance:</span>
                  <span class="text-rose-400 tabular-nums">Rs. ${Math.round(netShopBalance).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <!-- Big Action Button -->
            <button type="button" onclick="ShopSales.submitSaleAndPrint()"
                    class="mt-4 w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-[0.99] text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer">
              <i data-lucide="printer" class="w-5 h-5"></i>
              <span>Complete Sale &amp; Print Bill</span>
            </button>
          </div>

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
    const shop = this.shops.find(s => s.id === this.selectedShopId);
    const shopNameInput = document.getElementById('ss-shop-name');
    if (shopNameInput && shop) {
      shopNameInput.value = shop.name;
    }
    this.renderUI();
  },

  onItemProductChange(index, cartonId) {
    const c = this.cartons.find(x => x.id === Number(cartonId));
    if (c && this.items[index]) {
      this.items[index].carton_id = c.id;
      this.items[index].carton_name = c.carton_name;
      this.items[index].pieces_per_carton = c.pieces_per_carton;
      this.items[index].carton_price = c.carton_sale_price;
      this.items[index].line_total = this.items[index].delivered_cartons * c.carton_sale_price;
      this.renderUI();
    }
  },

  onRowQtyChange(index, field, value) {
    const item = this.items[index];
    if (!item) return;

    const val = Number(value) || 0;
    if (field === 'ordered') {
      item.ordered_cartons = val;
      // Auto-compute returned if delivered is set
      item.returned_cartons = Math.max(0, val - item.delivered_cartons);
    } else if (field === 'delivered') {
      item.delivered_cartons = val;
      item.returned_cartons = Math.max(0, item.ordered_cartons - val);
    } else if (field === 'returned') {
      item.returned_cartons = val;
      item.delivered_cartons = Math.max(0, item.ordered_cartons - val);
    }

    item.line_total = item.delivered_cartons * item.carton_price;
    this.renderUI();
  },

  setReturnDestination(index, destination) {
    if (this.items[index]) {
      this.items[index].return_destination = destination;
      this.renderUI();
    }
  },

  onRowPriceChange(index, value) {
    if (this.items[index]) {
      this.items[index].carton_price = Number(value) || 0;
      this.items[index].line_total = this.items[index].delivered_cartons * this.items[index].carton_price;
      this.renderUI();
    }
  },

  addNewRow() {
    this.addItemRow();
    this.renderUI();
  },

  removeRow(index) {
    if (this.items.length <= 1) {
      app.showAlert({ title: 'Cannot Remove', message: 'At least one item must remain in the delivery order.' });
      return;
    }
    this.items.splice(index, 1);
    this.renderUI();
  },

  onDiscountChange(val) {
    this.discount = Number(val) || 0;
    this.renderUI();
  },

  onReceivedChange(val) {
    this.receivedAmount = Number(val) || 0;
    this.renderUI();
  },

  setPaymentMethod(pm) {
    this.paymentMethod = pm;
    if (pm === 'Credit') {
      this.receivedAmount = 0;
    }
    this.renderUI();
  },

  resetForm() {
    this.items = [];
    this.discount = 0;
    this.receivedAmount = 0;
    this.paymentMethod = 'Cash';
    this.addItemRow();
    this.renderUI();
  },

  openQuickAddShopModal() {
    const modalEl = document.getElementById('shop-quick-modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) ShopSales.closeShopModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
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
              <input type="text" id="qs-address" placeholder="e.g. Main GT Road, Wah Cantt..."
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
    const activeCar = this.cars.find(c => c.id === this.selectedCarId);
    const shopName = document.getElementById('ss-shop-name')?.value || 'Counter Walk-in';
    const notes = document.getElementById('ss-notes')?.value || '';

    if (this.items.length === 0) {
      app.showAlert({ title: 'No Items', message: 'Please add at least one carton product to the delivery.' });
      return;
    }

    const validItems = this.items.filter(it => (it.delivered_cartons || 0) > 0 || (it.returned_cartons || 0) > 0);
    if (validItems.length === 0) {
      app.showAlert({ title: 'Zero Quantities', message: 'Delivered cartons must be greater than zero.' });
      return;
    }

    const payload = {
      shop_id: this.selectedShopId,
      shop_name: shopName,
      shop_phone: this.shops.find(s => s.id === this.selectedShopId)?.phone || '',
      shop_address: this.shops.find(s => s.id === this.selectedShopId)?.address || '',
      car_id: this.selectedCarId,
      discount: this.discount,
      received_amount: this.receivedAmount,
      payment_method: this.paymentMethod,
      notes,
      items: validItems
    };

    const res = await window.api.saveShopDelivery(payload);
    if (res && res.success) {
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
    const company = settings.company_name || 'Ice Cream Factory';
    const phone = settings.phone || '0301-2630481';
    const address = settings.address || 'Near CB Plaza, Barrier 3, GT Road, Wah Cantt';
    const tagline = settings.tagline || 'Fresh & Pure Ice Cream Production & Wholesale Distribution';

    const items = delivery.items || [];
    const totalDelivered = items.reduce((sum, it) => sum + it.delivered_cartons, 0);
    const totalReturned = items.reduce((sum, it) => sum + it.returned_cartons, 0);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box; line-height: 1.35;">
        
        <!-- Factory Header -->
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
          <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">${company}</h1>
          <p style="font-size: 9px; color: #475569; margin: 2px 0 0 0; font-weight: 600;">${tagline}</p>
          <p style="font-size: 8.5px; color: #64748b; margin: 1px 0 0 0;">${address} • Phone: ${phone}</p>
        </div>

        <!-- Document Title Banner -->
        <div style="background: #0f172a; color: #fff; text-align: center; padding: 3px 0; border-radius: 4px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
          DELIVERY INVOICE &amp; BILL / چالان و بل
        </div>

        <!-- Invoice Details Meta Grid -->
        <div class="a5-meta-box" style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 8px; border: 1px solid #cbd5e1; padding: 6px 8px; border-radius: 6px; background: #f8fafc;">
          <div style="line-height: 1.4;">
            <div><strong>Invoice #:</strong> <span style="font-family: monospace; font-weight: 800;">${delivery.invoice_no}</span></div>
            <div><strong>Date:</strong> ${delivery.date}</div>
            <div><strong>Vehicle:</strong> ${delivery.car_number || 'Direct Warehouse'}</div>
            <div><strong>Driver / Salesman:</strong> ${delivery.driver_name || 'N/A'}</div>
          </div>
          <div style="text-align: right; line-height: 1.4;">
            <div><strong>Shop / Customer:</strong> <span style="font-weight: 900; font-size: 10.5px;">${delivery.shop_name}</span></div>
            <div><strong>Contact:</strong> ${delivery.shop_phone || 'Walk-in'}</div>
            <div><strong>Area / Address:</strong> ${delivery.shop_address || 'Wah / Taxila'}</div>
            <div><strong>Payment Mode:</strong> ${delivery.payment_method || 'Cash'}</div>
          </div>
        </div>

        <!-- Itemized Table -->
        <table class="a5-table" style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left; width: 22px;">S#</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Item Description / Flavor</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; width: 45px;">Pack</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; width: 40px;">Order</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; width: 45px; background: #e2e8f0; font-weight: 900;">Deliv.</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; width: 40px;">Ret.</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right; width: 55px;">Rate/Ctn</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: right; width: 65px;">Total (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; font-weight: 800;">
                  ${it.carton_name}
                  ${it.returned_cartons > 0 ? `<span style="font-size: 8px; color: #475569; display: block;">(Ret: ${it.returned_cartons} ctns ${it.return_destination === 'car' ? 'kept in car' : 'sent to stock'})</span>` : ''}
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: center;">${it.pieces_per_carton} pcs</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: center;">${it.ordered_cartons}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: center; font-weight: 900; background: #f8fafc;">${it.delivered_cartons}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: center; color: ${it.returned_cartons > 0 ? '#b91c1c' : '#64748b'};">${it.returned_cartons || 0}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right;">Rs. ${it.carton_price}</td>
                <td style="border: 1px solid #e2e8f0; padding: 4px; text-align: right; font-weight: 900;">Rs. ${Math.round(it.line_total).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Summary & Settlement Box -->
        <div style="margin-top: 8px; display: flex; justify-content: space-between; gap: 8px;">
          <!-- Left: Return Note -->
          <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; font-size: 9px; color: #475569; background: #fafafa;">
            <div><strong>Cartons Summary:</strong> Total Delivered: <strong>${totalDelivered} Cartons</strong></div>
            ${totalReturned > 0 ? `<div>Returned: <strong>${totalReturned} Cartons</strong></div>` : ''}
            ${delivery.notes ? `<div style="margin-top: 3px;"><strong>Notes:</strong> ${delivery.notes}</div>` : ''}
            <div style="margin-top: 5px; font-style: italic; color: #64748b;">مال موقع پر چیک کر کے وصول کریں۔ ٹھنڈی حالت میں وصولی لازمی ہے۔</div>
          </div>

          <!-- Right: Bill Financials -->
          <div style="width: 200px; border: 1.5px solid #0f172a; border-radius: 6px; padding: 6px 8px; font-size: 9.5px; background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Subtotal:</span>
              <span style="font-weight: 800;">Rs. ${Math.round(delivery.subtotal || delivery.total_amount).toLocaleString()}</span>
            </div>
            ${delivery.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #b91c1c; margin-bottom: 2px;">
                <span>Discount:</span>
                <span>- Rs. ${Math.round(delivery.discount).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px; border-top: 1px solid #cbd5e1; padding-top: 2px; margin-bottom: 2px;">
              <span>Net Bill Total:</span>
              <span>Rs. ${Math.round(delivery.total_amount).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #047857; font-weight: 800; margin-bottom: 2px;">
              <span>Received (${delivery.payment_method || 'Cash'}):</span>
              <span>Rs. ${Math.round(delivery.received_amount || 0).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #b91c1c; font-weight: 800; margin-bottom: 2px;">
              <span>Current Bill Due:</span>
              <span>Rs. ${Math.round(delivery.remaining_balance || 0).toLocaleString()}</span>
            </div>
            ${delivery.previous_balance > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #475569; font-size: 9px; margin-bottom: 2px;">
                <span>Previous Balance:</span>
                <span>Rs. ${Math.round(delivery.previous_balance).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: 900; border-top: 1.5px solid #0f172a; padding-top: 2px; color: #0f172a; font-size: 10.5px;">
              <span>Net Total Due:</span>
              <span>Rs. ${Math.round((delivery.previous_balance || 0) + (delivery.remaining_balance || 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Authorized Signatures -->
        <div class="a5-signatures" style="margin-top: 28px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1px dashed #475569; width: 42%; text-align: center; font-size: 9px; padding-top: 4px; font-weight: 700;">
            Shopkeeper / Receiver Signature &amp; Stamp
          </div>
          <div class="a5-sig-line" style="border-top: 1px dashed #475569; width: 42%; text-align: center; font-size: 9px; padding-top: 4px; font-weight: 700;">
            Driver / Salesman Signature
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 14px; font-size: 8px; color: #64748b; border-top: 1px dotted #cbd5e1; padding-top: 4px;">
          Computer Generated A5 Invoice • Software by PrimeSoft (0309-5369472)
        </div>
      </div>
    `;

    app.showA5Preview(html, `Delivery Invoice - ${delivery.invoice_no} (A5)`);
  }
};
