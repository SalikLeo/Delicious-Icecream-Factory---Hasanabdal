// Unified Ice Cream Factory Dashboard
window.Dashboard = {
  summary: null,
  recentDeliveries: [],
  cars: [],

  async render(container) {
    this.container = container;
    await this.loadStats();
  },

  async loadStats() {
    try {
      this.summary = await window.api.getIcecreamFactorySummary() || {};
      this.cars = await window.api.getCars() || [];
      this.recentDeliveries = await window.api.getShopDeliveries({ fromDate: new Date().toISOString().split('T')[0] }) || [];
      this.renderUI();
    } catch (e) {
      console.error('Failed to load factory dashboard:', e);
      if (this.container) {
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
    const company = settings.company_name || 'Ice Cream Factory';

    this.container.innerHTML = `
      <div class="h-full flex flex-col gap-3.5 w-full overflow-y-auto custom-scrollbar">
        
        <!-- Welcome & Factory Header -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 px-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border border-indigo-800/40">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider">FACTORY HUB</span>
              <span class="text-xs text-slate-300 font-mono font-bold">${app.formatDateTime(new Date())}</span>
            </div>
            <h2 class="text-xl md:text-2xl font-black tracking-tight text-white">${company} Management</h2>
            <p class="text-xs text-slate-300 font-medium mt-1">Complete 5-stage production, packing, vehicle dispatch, and shop deliveries control center.</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button onclick="app.navigate('shop-sales')" class="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <i data-lucide="shopping-cart" class="w-4 h-4"></i> New Shop Delivery
            </button>
            <button onclick="Dashboard.loadStats()" class="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer" title="Refresh Dashboard">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- 5-STAGE FACTORY WORKFLOW INTERACTIVE STEPPER -->
        <div>
          <div class="flex items-center justify-between mb-3 px-1">
            <h3 class="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <i data-lucide="git-commit" class="w-4 h-4 text-amber-500"></i> The 5 Factory Stages Workflow
            </h3>
            <span class="text-[11px] font-bold text-slate-400">Click any stage to open</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            <!-- Stage 1 Card: Raw Materials -->
            <div onclick="app.navigate('raw-materials')" class="bg-white p-4 rounded-xl border-2 border-emerald-300/80 hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[9px]">STAGE 1</span>
                  <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <i data-lucide="boxes" class="w-3.5 h-3.5"></i>
                  </div>
                </div>
                <h4 class="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">Raw Materials</h4>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">Milk, Sugar, Sticks, Cocoa</p>
                
                <div class="mt-3 pt-2.5 border-t border-slate-100">
                  <div class="text-[10px] font-bold text-slate-400 uppercase">Stock Value:</div>
                  <div class="text-base font-black text-slate-900 tabular-nums">Rs. ${Math.round(raw.total_raw_value).toLocaleString()}</div>
                  ${raw.low_stock_count > 0 ? `<div class="text-[10px] font-black text-rose-600 mt-0.5">⚠️ ${raw.low_stock_count} low stock</div>` : `<div class="text-[10px] font-bold text-emerald-700 mt-0.5">✓ Stock healthy</div>`}
                </div>
              </div>
              <span class="mt-3 text-[10px] font-black text-emerald-600 flex items-center gap-1">Open Raw Stock ➔</span>
            </div>

            <!-- Stage 2 Card: Single Items Production -->
            <div onclick="app.navigate('production')" class="bg-white p-4 rounded-xl border-2 border-cyan-300/80 hover:border-cyan-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-black text-[9px]">STAGE 2</span>
                  <div class="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all">
                    <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                  </div>
                </div>
                <h4 class="font-black text-sm text-slate-900 group-hover:text-cyan-700 transition-colors">Item Production</h4>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">Loose pieces (Chocbar, Ice Loly)</p>
                
                <div class="mt-3 pt-2.5 border-t border-slate-100">
                  <div class="text-[10px] font-bold text-slate-400 uppercase">Pieces in Pool:</div>
                  <div class="text-base font-black text-cyan-700 tabular-nums">${single.total_single_pieces.toLocaleString()} <span class="text-xs font-normal text-slate-500">pcs</span></div>
                  <div class="text-[10px] text-slate-500 mt-0.5">Ready to pack into cartons</div>
                </div>
              </div>
              <span class="mt-3 text-[10px] font-black text-cyan-600 flex items-center gap-1">Make Pieces ➔</span>
            </div>

            <!-- Stage 3 Card: Carton Packing -->
            <div onclick="app.navigate('carton-packing')" class="bg-white p-4 rounded-xl border-2 border-purple-300/80 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black text-[9px]">STAGE 3</span>
                  <div class="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
                    <i data-lucide="package" class="w-3.5 h-3.5"></i>
                  </div>
                </div>
                <h4 class="font-black text-sm text-slate-900 group-hover:text-purple-700 transition-colors">Carton Packing</h4>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">Ready-to-Sell cartons inventory</p>
                
                <div class="mt-3 pt-2.5 border-t border-slate-100">
                  <div class="text-[10px] font-bold text-slate-400 uppercase">Warehouse Stock:</div>
                  <div class="text-base font-black text-purple-700 tabular-nums">${cartons.total_warehouse_cartons.toLocaleString()} <span class="text-xs font-normal text-slate-500">ctns</span></div>
                  <div class="text-[10px] text-slate-500 mt-0.5">Val: Rs. ${Math.round(cartons.total_warehouse_sale_value).toLocaleString()}</div>
                </div>
              </div>
              <span class="mt-3 text-[10px] font-black text-purple-600 flex items-center gap-1">Pack Cartons ➔</span>
            </div>

            <!-- Stage 4 Card: Cars & Delivery Loading -->
            <div onclick="app.navigate('car-loading')" class="bg-white p-4 rounded-xl border-2 border-blue-300/80 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-[9px]">STAGE 4</span>
                  <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <i data-lucide="truck" class="w-3.5 h-3.5"></i>
                  </div>
                </div>
                <h4 class="font-black text-sm text-slate-900 group-hover:text-blue-700 transition-colors">Cars &amp; Loading</h4>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">Vehicles list &amp; loaded stock</p>
                
                <div class="mt-3 pt-2.5 border-t border-slate-100">
                  <div class="text-[10px] font-bold text-slate-400 uppercase">Loaded in Cars:</div>
                  <div class="text-base font-black text-blue-700 tabular-nums">${carStats.total_cartons_in_cars.toLocaleString()} <span class="text-xs font-normal text-slate-500">ctns</span></div>
                  <div class="text-[10px] text-slate-500 mt-0.5">${carStats.total_cars} delivery vehicles</div>
                </div>
              </div>
              <span class="mt-3 text-[10px] font-black text-blue-600 flex items-center gap-1">Load Cars ➔</span>
            </div>

            <!-- Stage 5 Card: Shop Deliveries -->
            <div onclick="app.navigate('shop-sales')" class="bg-white p-4 rounded-xl border-2 border-amber-300/80 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[9px]">STAGE 5</span>
                  <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                    <i data-lucide="store" class="w-3.5 h-3.5"></i>
                  </div>
                </div>
                <h4 class="font-black text-sm text-slate-900 group-hover:text-amber-700 transition-colors">Shop Deliveries</h4>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">Sales, returns &amp; A5 billing</p>
                
                <div class="mt-3 pt-2.5 border-t border-slate-100">
                  <div class="text-[10px] font-bold text-slate-400 uppercase">Today's Sales:</div>
                  <div class="text-base font-black text-emerald-700 tabular-nums">Rs. ${Math.round(today.sales).toLocaleString()}</div>
                  <div class="text-[10px] text-slate-500 mt-0.5">${today.cartons_sold} ctns sold today</div>
                </div>
              </div>
              <span class="mt-3 text-[10px] font-black text-amber-600 flex items-center gap-1">Sell &amp; Bill ➔</span>
            </div>

          </div>
        </div>

        <!-- Middle 2 Columns: Active Delivery Cars vs Today's Invoices -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          <!-- Left: Active Delivery Cars on Route (5 cols) -->
          <div class="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <i data-lucide="truck" class="w-4 h-4 text-blue-600"></i>
                <h3 class="font-black text-sm text-slate-900">Delivery Cars &amp; Van Balances</h3>
              </div>
              <button onclick="app.navigate('car-loading')" class="text-[11px] font-black text-blue-600 hover:text-blue-700 cursor-pointer">
                Manage Cars ➔
              </button>
            </div>

            <div class="space-y-2.5">
              ${this.cars.map(c => `
                <div onclick="app.navigate('car-loading')" class="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-between">
                  <div>
                    <h4 class="font-black text-xs text-slate-900">${c.car_number}</h4>
                    <p class="text-[11px] text-slate-500 font-medium">${c.driver_name} ${c.phone ? `• ${c.phone}` : ''}</p>
                    ${c.area ? `<span class="text-[10px] text-blue-700 font-bold block mt-0.5">📍 ${c.area}</span>` : ''}
                  </div>
                  <div class="text-right">
                    <span class="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-xs tabular-nums block">
                      ${c.total_loaded_cartons || 0} ctns
                    </span>
                    <span class="text-[10px] font-bold text-slate-400 mt-0.5 block">loaded now</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right: Today's Shop Invoices & Deliveries (7 cols) -->
          <div class="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <i data-lucide="receipt" class="w-4 h-4 text-amber-500"></i>
                <h3 class="font-black text-sm text-slate-900">Today's Deliveries &amp; Invoices</h3>
              </div>
              <button onclick="app.navigate('proposals')" class="text-[11px] font-black text-amber-600 hover:text-amber-700 cursor-pointer">
                View All Invoices ➔
              </button>
            </div>

            ${this.recentDeliveries.length === 0 ? `
              <div class="p-8 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <p class="font-bold text-xs text-slate-500">No deliveries completed yet today.</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Click "+ New Shop Delivery" to record your first delivery for today.</p>
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse border border-slate-200">
                  <thead>
                    <tr class="text-[10px] font-black uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                      <th class="py-2 px-3 border-r border-slate-200">Invoice #</th>
                      <th class="py-2 px-3 border-r border-slate-200">Shop</th>
                      <th class="py-2 px-3 border-r border-slate-200">Vehicle</th>
                      <th class="py-2 px-3 text-right border-r border-slate-200">Cartons</th>
                      <th class="py-2 px-3 text-right border-r border-slate-200">Total</th>
                      <th class="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
                    ${this.recentDeliveries.slice(0, 6).map(d => `
                      <tr class="hover:bg-slate-50">
                        <td class="py-1.5 px-3 border-r border-slate-200">
                          <div class="font-mono font-bold text-slate-900 text-xs">${d.invoice_no}</div>
                          <div class="text-[10px] text-slate-400 font-bold whitespace-nowrap leading-tight">${app.formatDateTime(d.date, d.created_at)}</div>
                        </td>
                        <td class="py-1.5 px-3 font-black text-slate-900 text-xs border-r border-slate-200">${d.shop_name}</td>
                        <td class="py-1.5 px-3 text-slate-500 text-[11px] border-r border-slate-200">${d.car_number || 'Direct'}</td>
                        <td class="py-1.5 px-3 text-right font-black text-blue-700 text-xs tabular-nums border-r border-slate-200">${d.total_cartons_delivered || 0} ctns</td>
                        <td class="py-1.5 px-3 text-right font-black text-slate-900 text-xs tabular-nums border-r border-slate-200">Rs. ${Math.round(d.total_amount).toLocaleString()}</td>
                        <td class="py-1.5 px-3 text-center">
                          <button onclick="ShopSales.printDeliveryInvoice(${d.id})" class="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[10px] font-black cursor-pointer flex items-center gap-1 mx-auto">
                            <i data-lucide="printer" class="w-3 h-3 text-amber-400"></i> Print
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
