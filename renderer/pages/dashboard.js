// Unified Ice Cream Factory Dashboard
window.Dashboard = {
  summary: null,
  recentDeliveries: [],
  recentExpenses: [],
  cars: [],

  async render(container) {
    this.container = container;
    // Immediate render so the dashboard layout is visible instantly without a blank screen
    this.renderUI();
    await this.loadStats();
  },

  async loadStats() {
    try {
      const today = (window.app && typeof app.getTodayDate === 'function') 
        ? app.getTodayDate() 
        : (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })();
      const [summary, cars, recentDeliveries, recentExpenses] = await Promise.all([
        window.api.getIcecreamFactorySummary(today),
        window.api.getCars(),
        window.api.getShopDeliveries({ fromDate: today, toDate: today }),
        window.api.getExpenses({ limit: 5 })
      ]);
      this.summary = summary || {};
      this.cars = cars || [];
      this.recentDeliveries = recentDeliveries || [];
      this.recentExpenses = (recentExpenses || []).slice(0, 5);
      this.renderUI();
    } catch (e) {
      console.error('Failed to load factory dashboard:', e);
      if (this.container && !this.container.firstElementChild) {
        this.container.innerHTML = `<div class="p-6 text-red-500 font-bold">Error loading dashboard: ${e.message}</div>`;
      }
    }
  },

  renderUI() {
    if (!this.container) return;

    const s = this.summary || {};
    const raw = s.rawMaterials || { total_materials: 0, total_raw_value: 0, low_stock_count: 0 };
    const single = s.singleItems || { total_items: 0, total_single_pieces: 0, total_single_cost: 0 };
    const cartons = s.packedCartons || { total_carton_variants: 0, total_warehouse_cartons: 0, total_warehouse_sale_value: 0 };
    const carStats = s.cars || { total_cars: 0, active_cars: 0, total_cartons_in_cars: 0 };
    const today = s.today || { date: '', sales: 0, received: 0, invoices: 0, cartons_sold: 0 };

    const settings = app.settings || {};
    const company = (settings.company_name || 'Delicious Superstar Foods').replace(/\s*\(Branch \d+\)/i, '').trim() || 'Delicious Superstar Foods';

    // Prioritize cars by total loaded items (cartons + shopers) descending, max 5
    const sortedCars = [...(this.cars || [])].sort((a, b) => {
      const aTotal = ((a.total_loaded_ctns !== undefined ? a.total_loaded_ctns : a.total_loaded_cartons) || 0) + (a.total_loaded_shopers || 0);
      const bTotal = ((b.total_loaded_ctns !== undefined ? b.total_loaded_ctns : b.total_loaded_cartons) || 0) + (b.total_loaded_shopers || 0);
      if (bTotal !== aTotal) return bTotal - aTotal;
      return (b.id || 0) - (a.id || 0);
    }).slice(0, 5);

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        
        <!-- Welcome & Factory Header -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 px-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border border-indigo-800/40">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider">FACTORY HUB</span>
              <span class="text-xs text-slate-300 font-mono font-bold">${app.formatDateTime(new Date())}</span>
            </div>
            <h2 class="text-xl md:text-2xl font-black tracking-tight text-white">${company}</h2>
            <p class="text-xs text-slate-300 font-medium mt-1">Complete 5-stage production, packing, vehicle dispatch, and new shop sales control center.</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="app.navigate('shop-sales')" class="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="shopping-cart" class="w-4 h-4"></i> New Sale
            </button>
            <button onclick="Dashboard.loadStats()" class="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer" title="Refresh Dashboard">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- 4-STAGE FACTORY WORKFLOW INTERACTIVE STEPPER -->
        <div>
          <div class="flex items-center justify-between mb-3 px-1">
            <h3 class="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <i data-lucide="git-commit" class="w-4 h-4 text-amber-500"></i> The 4 Factory Stages Workflow
            </h3>
            <span class="text-[11px] font-bold text-slate-500">Click any stage to open</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            <!-- Stage 1 Card: Raw Materials -->
            <div onclick="app.navigate('raw-materials')" class="bg-white p-4 rounded-2xl border-2 border-emerald-300/80 hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group shadow-xs">
              <div>
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] tracking-wider uppercase">Stage 1</span>
                  <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                    <i data-lucide="boxes" class="w-4 h-4"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <h4 class="font-black text-sm text-slate-800 group-hover:text-emerald-700 transition-colors">Raw Materials</h4>
                  <div class="text-2xl font-black text-slate-900 tabular-nums mt-1">Rs. ${Math.round(raw.total_raw_value).toLocaleString()}</div>
                </div>
              </div>
              <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                ${raw.low_stock_count > 0 ? `<span class="font-black text-rose-600">⚠️ ${raw.low_stock_count} low stock</span>` : `<span class="font-bold text-emerald-700">✓ Stock healthy</span>`}
                <span class="font-black text-emerald-600 group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </div>

            <!-- Stage 2 Card: Carton Packing -->
            <div onclick="app.navigate('carton-packing')" class="bg-white p-4 rounded-2xl border-2 border-purple-300/80 hover:border-purple-500 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group shadow-xs">
              <div>
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-black text-[10px] tracking-wider uppercase">Stage 2</span>
                  <div class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-2xs">
                    <i data-lucide="package" class="w-4 h-4"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <h4 class="font-black text-sm text-slate-800 group-hover:text-purple-700 transition-colors">Carton Packing</h4>
                  <div class="text-2xl font-black text-purple-700 tabular-nums mt-1 flex items-baseline gap-1.5 flex-wrap">
                    <span class="text-2xl">${(cartons.total_warehouse_cartons || 0).toLocaleString()}</span> <span class="text-xs font-black text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded-md">ctns</span> <span class="text-purple-300 font-bold text-sm">•</span> <span class="text-2xl text-purple-700">${(cartons.total_warehouse_shopers || 0).toLocaleString()}</span> <span class="text-xs font-black text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded-md">shopers</span>
                  </div>
                </div>
              </div>
              <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span class="font-bold text-slate-700">Val: <span class="font-black text-slate-900">Rs. ${Math.round(cartons.total_warehouse_sale_value || 0).toLocaleString()}</span></span>
                <span class="font-black text-purple-600 group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </div>

            <!-- Stage 3 Card: Cars & Delivery Loading -->
            <div onclick="app.navigate('car-loading')" class="bg-white p-4 rounded-2xl border-2 border-blue-300/80 hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group shadow-xs">
              <div>
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black text-[10px] tracking-wider uppercase">Stage 3</span>
                  <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                    <i data-lucide="truck" class="w-4 h-4"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <h4 class="font-black text-sm text-slate-800 group-hover:text-blue-700 transition-colors">Car Loading</h4>
                  <div class="text-2xl font-black text-blue-700 tabular-nums mt-1 flex items-baseline gap-1.5 flex-wrap">
                    <span class="text-2xl">${(carStats.total_ctns_in_cars !== undefined ? carStats.total_ctns_in_cars : (carStats.total_cartons_in_cars || 0)).toLocaleString()}</span> <span class="text-xs font-black text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded-md">ctns</span> <span class="text-blue-300 font-bold text-sm">•</span> <span class="text-2xl text-sky-700">${(carStats.total_shopers_in_cars || 0).toLocaleString()}</span> <span class="text-xs font-black text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded-md">shopers</span>
                  </div>
                </div>
              </div>
              <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span class="font-bold text-slate-700"><span class="font-black text-slate-900">${carStats.total_cars || 0}</span> delivery vehicles</span>
                <span class="font-black text-blue-600 group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </div>

            <!-- Stage 4 Card: New Sale -->
            <div onclick="app.navigate('shop-sales')" class="bg-white p-4 rounded-2xl border-2 border-amber-300/80 hover:border-amber-500 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group shadow-xs">
              <div>
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] tracking-wider uppercase">Stage 4</span>
                  <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-2xs">
                    <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <h4 class="font-black text-sm text-slate-800 group-hover:text-amber-700 transition-colors">New Sale</h4>
                  <div class="text-2xl font-black text-emerald-700 tabular-nums mt-1">Rs. ${Math.round(today.sales).toLocaleString()}</div>
                </div>
              </div>
              <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span class="font-bold text-slate-700">
                  ${(today.shopers_sold > 0 && today.ctns_sold > 0)
                    ? `<span class="font-black text-slate-900">${today.ctns_sold}</span> <span class="text-[10px] font-black uppercase text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded">ctns</span>, <span class="font-black text-slate-900">${today.shopers_sold}</span> <span class="text-[10px] font-black uppercase text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded">shopers</span> sold today`
                    : (today.shopers_sold > 0
                      ? `<span class="font-black text-slate-900">${today.shopers_sold}</span> <span class="text-[10px] font-black uppercase text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded">shopers</span> sold today`
                      : `<span class="font-black text-slate-900">${today.ctns_sold !== undefined ? today.ctns_sold : (today.cartons_sold || 0)}</span> <span class="text-[10px] font-black uppercase text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded">ctns</span> sold today`
                    )
                  }
                </span>
                <span class="font-black text-amber-600 group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </div>

          </div>
        </div>

        <!-- Middle: Today's Sales (Full Width directly under top 5 boxes) -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <i data-lucide="receipt" class="w-4 h-4 text-amber-500"></i>
              <h3 class="font-black text-sm text-slate-900">Today's Sales</h3>
            </div>
            <button onclick="app.navigate('proposals')" class="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer">
              <span>View All Sales</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-amber-600"></i>
            </button>
          </div>

          ${this.recentDeliveries.length === 0 ? `
            <div class="p-8 text-center text-slate-500 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <p class="font-bold text-xs text-slate-600">No sales recorded yet today.</p>
              <p class="text-[11px] text-slate-500 mt-0.5 font-medium">Click "+ New Sale" to record your first sale for today.</p>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse border border-slate-200">
                <thead>
                  <tr class="text-[10px] font-black uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                    <th class="py-2 px-3 border-r border-slate-200">Invoice #</th>
                    <th class="py-2 px-3 border-r border-slate-200">Salesman</th>
                    <th class="py-2 px-3 border-r border-slate-200">Vehicle</th>
                    <th class="py-2 px-3 text-right border-r border-slate-200">Cartons / Shopers</th>
                    <th class="py-2 px-3 text-right border-r border-slate-200">Total</th>
                    <th class="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
                  ${this.recentDeliveries.slice(0, 5).map(d => `
                    <tr class="hover:bg-slate-50">
                      <td class="py-1.5 px-3 border-r border-slate-200">
                        <div class="font-mono font-bold text-slate-900 text-xs">${d.invoice_no}</div>
                        <div class="text-[10px] text-slate-500 font-bold whitespace-nowrap leading-tight">${app.formatDateTime(d.date, d.created_at)}</div>
                      </td>
                      <td class="py-1.5 px-3 font-black text-slate-900 text-xs border-r border-slate-200">${d.shop_name}</td>
                      <td class="py-1.5 px-3 text-slate-700 font-bold text-[11px] border-r border-slate-200">${d.car_number || 'Direct'}</td>
                      <td class="py-1.5 px-3 text-right font-black text-xs tabular-nums border-r border-slate-200">
                        ${(() => {
                          const netCtns = Math.max(0, (Number(d.delivered_ctns) || 0) - (Number(d.returned_ctns) || 0));
                          const netShopers = Math.max(0, (Number(d.delivered_shopers) || 0) - (Number(d.returned_shopers) || 0));
                          if (netCtns > 0 && netShopers > 0) {
                            return `<span class="font-black text-blue-700 text-xs">${netCtns} <span class="text-[10px] font-black text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded-md">ctns</span></span> <span class="text-slate-300 font-bold mx-0.5">•</span> <span class="font-black text-sky-700 text-xs">${netShopers} <span class="text-[10px] font-black text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded-md">shopers</span></span>`;
                          } else if (netShopers > 0) {
                            return `<span class="font-black text-sky-700 text-xs">${netShopers} <span class="text-[10px] font-black text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded-md">shopers</span></span>`;
                          } else {
                            const fallback = Math.max(0, (Number(d.total_cartons_delivered) || 0) - (Number(d.total_cartons_returned) || 0));
                            return `<span class="font-black text-blue-700 text-xs">${netCtns || fallback || 0} <span class="text-[10px] font-black text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded-md">ctns</span></span>`;
                          }
                        })()}
                      </td>
                      <td class="py-1.5 px-3 text-right font-black text-slate-900 text-xs tabular-nums border-r border-slate-200">Rs. ${Math.round(d.total_amount).toLocaleString()}</td>
                      <td class="py-1.5 px-3 text-center">
                        <button type="button" onclick="ShopSales.printDeliveryInvoice(${d.id})"
                                class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs mx-auto"
                                title="Print Delivery Invoice (A5)">
                          <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Bottom 2 Columns: Delivery Cars & Van Balances vs Factory Expenses (50% / 50% Space) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          <!-- Left (50%): Active Delivery Cars on Route -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <i data-lucide="truck" class="w-4 h-4 text-blue-600"></i>
                <h3 class="font-black text-sm text-slate-900">Delivery Cars &amp; Van Balances</h3>
              </div>
              <button onclick="app.navigate('car-loading')" class="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300/80 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer">
                <span>Manage Cars</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-blue-600"></i>
              </button>
            </div>

            <div class="space-y-2.5">
              ${sortedCars.map(c => {
                const ctns = c.total_loaded_ctns !== undefined ? c.total_loaded_ctns : (c.total_loaded_cartons || 0);
                const shopers = c.total_loaded_shopers || 0;
                return `
                <div onclick="app.navigate('car-loading')" class="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-between">
                  <div>
                    <h4 class="font-black text-xs text-slate-900">${c.car_number}</h4>
                    <p class="text-[11px] text-slate-700 font-semibold">${c.driver_name} ${c.phone ? `• ${c.phone}` : ''}</p>
                  </div>
                  <div class="text-right">
                    ${(ctns > 0 && shopers > 0) ? `
                      <div class="flex items-center gap-1.5 justify-end">
                        <span class="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-black text-xs tabular-nums" title="Cartons loaded">
                          ${ctns} ctns
                        </span>
                        <span class="px-2 py-0.5 rounded-lg bg-sky-600 text-white font-black text-xs tabular-nums" title="Shopers loaded">
                          ${shopers} shopers
                        </span>
                      </div>
                    ` : (shopers > 0 ? `
                      <span class="px-2.5 py-1 rounded-xl bg-sky-600 text-white font-black text-xs tabular-nums block">
                        ${shopers} shopers
                      </span>
                    ` : (ctns > 0 ? `
                      <span class="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-xs tabular-nums block">
                        ${ctns} ctns
                      </span>
                    ` : `
                      <span class="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-600 font-black text-xs tabular-nums block">
                        0 loaded
                      </span>
                    `))}
                    <span class="text-[10px] font-black uppercase text-slate-600 tracking-wider mt-0.5 block">loaded now</span>
                  </div>
                </div>
              `}).join('')}
            </div>
          </div>

          <!-- Right (50%): Recent Factory Expenses -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <i data-lucide="receipt" class="w-4 h-4 text-rose-500"></i>
                <h3 class="font-black text-sm text-slate-900">Recent Factory Expenses</h3>
              </div>
              <button onclick="app.navigate('expenses')" class="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300/80 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer">
                <span>View All Expenses</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-rose-600"></i>
              </button>
            </div>

            ${this.recentExpenses.length === 0 ? `
              <div class="p-8 text-center text-slate-500 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <p class="font-bold text-xs text-slate-600">No factory expenses recorded yet.</p>
                <p class="text-[11px] text-slate-500 mt-0.5 font-medium">Click "View All Expenses" to record factory utility, fuel, or operational expenses.</p>
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse border border-slate-200">
                  <thead>
                    <tr class="text-[10px] font-black uppercase text-slate-600 bg-slate-50 border-b border-slate-200">
                      <th class="py-2 px-2.5 border-r border-slate-200 w-10 text-center">#</th>
                      <th class="py-2 px-2.5 border-r border-slate-200">Date</th>
                      <th class="py-2 px-2.5 border-r border-slate-200">Category</th>
                      <th class="py-2 px-2.5 border-r border-slate-200">Description</th>
                      <th class="py-2 px-2.5 text-right border-r border-slate-200">Amount</th>
                      <th class="py-2 px-2 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
                    ${this.recentExpenses.slice(0, 5).map((exp, idx) => `
                      <tr class="hover:bg-slate-50">
                        <td class="py-1.5 px-2.5 border-r border-slate-200 text-center font-bold text-slate-600 tabular-nums text-xs">${idx + 1}</td>
                        <td class="py-1.5 px-2.5 border-r border-slate-200 font-bold text-slate-800 text-xs whitespace-nowrap">
                          ${app.formatDateTime(exp.date, exp.created_at)}
                        </td>
                        <td class="py-1.5 px-2.5 border-r border-slate-200 whitespace-nowrap">
                          <span class="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-md text-[10px] font-black uppercase tracking-wider">
                            ${exp.category || 'General'}
                          </span>
                        </td>
                        <td class="py-1.5 px-2.5 border-r border-slate-200">
                          <div class="font-bold text-slate-900 text-xs truncate max-w-[130px] lg:max-w-[170px]" title="${exp.description || ''}">${exp.description || '—'}</div>
                          ${exp.paid_by ? `<span class="text-[10px] text-slate-600 font-bold block truncate max-w-[130px]">Paid by: ${exp.paid_by}</span>` : ''}
                        </td>
                        <td class="py-1.5 px-2.5 text-right font-black text-rose-600 text-xs tabular-nums border-r border-slate-200 whitespace-nowrap">
                          Rs. ${Math.round(exp.amount || 0).toLocaleString()}
                        </td>
                        <td class="py-1.5 px-2 text-center">
                          <button type="button" onclick="Expenses.printExpenseVoucher(${exp.id})"
                                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs mx-auto"
                                  title="Print Expense Voucher (A5)">
                            <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

        </div>

      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: this.container });
  }
};
