window.Companies = {
  currentTab: 'companies',
  currentView: 'transactions',
  currentTxnPeriod: 'day',
  currentCompPeriod: 'day',
  currentHistoryPeriod: 'all',
  historyTypeFilter: 'all',
  dataList: [],
  fullTxnHistory: [],
  txnsFilterType: 'all',
  txnsPage: 1,
  txnsPageSize: 50,
  historyPage: 1,
  historyPageSize: 25,
  allTxnsPage: 1,
  allTxnsPageSize: 50,
  editingTxn: null,
  editingCompanyId: null,

  async render(container) {
    container.innerHTML = `
      <div class="flex justify-between items-center mb-6 no-print flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <i data-lucide="book-open" class="w-5 h-5"></i>
          </div>
          <h2 id="purchases-page-title" class="text-3xl font-bold text-slate-800">Purchases</h2>
        </div>
        <div id="purchases-header-actions" class="flex items-center gap-2 shrink-0">
          <!-- Dynamically populated by switchView -->
        </div>
      </div>

      <!-- VIEW 1: Transactions View (Default) -->
      <div id="purchases-txns-view">
        <!-- Stats Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <i data-lucide="shopping-cart" class="w-4 h-4"></i>
            </div>
            <div>
              <p id="txns-stat-total-label" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Purchases</p>
              <h3 id="txns-stat-total" class="text-lg font-black text-slate-800 tabular-nums">Rs. 0</h3>
            </div>
          </div>

          <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <i data-lucide="receipt" class="w-4 h-4"></i>
            </div>
            <div>
              <p id="txns-stat-orders-label" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
              <h3 id="txns-stat-orders" class="text-lg font-black text-slate-800 tabular-nums">0</h3>
            </div>
          </div>

          <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <i data-lucide="wallet" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Balance</p>
              <h3 id="txns-stat-balance" class="text-lg font-black text-slate-800 tabular-nums">Rs. 0</h3>
            </div>
          </div>

          <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <i data-lucide="building-2" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Suppliers</p>
              <h3 id="txns-stat-companies" class="text-lg font-black text-slate-800 tabular-nums">0</h3>
            </div>
          </div>
        </div>

        <!-- Filters Row -->
        <div class="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 mb-3 flex gap-2.5 items-center flex-wrap">
          <div class="relative flex-1 min-w-[200px]">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="txns-main-search" oninput="Companies.filterTransactions()" placeholder="Search invoice #, supplier name, item..." class="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-xs font-medium">
            <button type="button" id="txns-search-clear-btn" onclick="Companies.clearTxnsSearch()" title="Clear search" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
          </div>

          <!-- Type filter dropdown -->
          <select id="txns-type-select" onchange="Companies.setTxnTypeFilter(this.value)" class="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1 font-bold outline-none focus:ring-2 focus:ring-accent transition-all shrink-0 cursor-pointer shadow-sm">
            <option value="all" selected>All Types</option>
            <option value="purchase">Purchases</option>
            <option value="payment">Payments</option>
          </select>

          <!-- Time Period controls -->
          <div class="flex items-center gap-1.5 flex-wrap shrink-0">
            <div class="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
               <button type="button" id="txns-period-day" onclick="Companies.setTxnPeriodType('day')" class="px-2 py-1 text-[11px] font-black rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer">Daily</button>
               <button type="button" id="txns-period-month" onclick="Companies.setTxnPeriodType('month')" class="px-2 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">Monthly</button>
               <button type="button" id="txns-period-year" onclick="Companies.setTxnPeriodType('year')" class="px-2 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">Annual</button>
               <button type="button" id="txns-period-all" onclick="Companies.setTxnPeriodType('all')" class="px-2 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">All</button>
            </div>

            <!-- Daily navigation controls -->
            <div id="txns-daily-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
               <button type="button" onclick="Companies.changeTxnDateStep(-1)" class="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Day">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <input type="date" id="txns-date-picker" onchange="Companies.filterTransactions()" oninput="Companies.filterTransactions()" class="bg-transparent border-0 px-1 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               <button type="button" onclick="Companies.changeTxnDateStep(1)" class="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Day">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button type="button" onclick="Companies.setTxnToday()" class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer">Today</button>
            </div>

            <!-- Monthly navigation controls -->
            <div id="txns-monthly-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <button type="button" onclick="Companies.changeTxnMonthStep(-1)" class="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Month">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <select id="txns-month-select" onchange="Companies.filterTransactions()" class="bg-transparent border-0 px-1.5 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                 <option value="1">Jan</option>
                 <option value="2">Feb</option>
                 <option value="3">Mar</option>
                 <option value="4">Apr</option>
                 <option value="5">May</option>
                 <option value="6">Jun</option>
                 <option value="7">Jul</option>
                 <option value="8">Aug</option>
                 <option value="9">Sep</option>
                 <option value="10">Oct</option>
                 <option value="11">Nov</option>
                 <option value="12">Dec</option>
               </select>
               <select id="txns-month-year-select" onchange="Companies.filterTransactions()" class="bg-transparent border-0 px-1.5 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
               <button type="button" onclick="Companies.changeTxnMonthStep(1)" class="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Month">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button type="button" onclick="Companies.setTxnThisMonth()" class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer">This Month</button>
            </div>

            <!-- Annual controls -->
            <div id="txns-annual-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <select id="txns-year-picker" onchange="Companies.filterTransactions()" class="bg-transparent border-0 px-2 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
            </div>
          </div>
        </div>

        <!-- Transactions Table -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div class="overflow-auto max-h-[calc(100vh-290px)] custom-scrollbar">
            <table class="w-full text-sm text-left border-collapse border-b border-slate-200">
              <thead class="sticky top-0 z-10 bg-slate-50 shadow-sm border-b border-slate-200 uppercase text-[11px] font-black tracking-wider">
                <tr class="border-b border-slate-200">
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Date & Time</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Invoice #</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Supplier Name</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Type</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200 text-right">Amount</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200 text-right">Balance</th>
                  <th class="px-4 py-2 font-black text-slate-700 uppercase tracking-wider text-right bg-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody id="main-txns-list" class="divide-y divide-slate-200 bg-white">
                <!-- Content injected here -->
              </tbody>
            </table>
          </div>
          <div id="txns-pagination-footer" class="shrink-0"></div>
        </div>
      </div>

      <!-- VIEW 2: Companies View -->
      <div id="purchases-companies-view" class="hidden">
        <!-- Stats Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <i data-lucide="users" class="w-4 h-4"></i>
            </div>
            <div>
              <p id="total-label" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Companies</p>
              <h3 id="comp-stat-count" class="text-lg font-black text-slate-800 tabular-nums">0</h3>
            </div>
          </div>
          <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <i data-lucide="wallet" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Balance</p>
              <h3 id="comp-stat-balance" class="text-lg font-black text-slate-800 tabular-nums">Rs. 0</h3>
            </div>
          </div>
          <div class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3" id="comp-stat-period-card">
            <div class="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <i data-lucide="shopping-cart" class="w-4 h-4"></i>
            </div>
            <div>
              <p id="comp-stat-period-label" class="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Total Purchases</p>
              <h3 id="comp-stat-period-total" class="text-lg font-black text-slate-800 tabular-nums">Rs. 0</h3>
            </div>
          </div>
        </div>

        <!-- Filters Row -->
        <div class="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 mb-3 flex gap-2.5 items-center flex-wrap">
          <div class="relative flex-1 min-w-[180px]">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="khata-search" oninput="Companies.applyFilters()" placeholder="Search by name or contact..." class="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-xs font-medium">
            <button type="button" id="khata-search-clear-btn" onclick="Companies.clearKhataSearch()" title="Clear search" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
          </div>

          <!-- Period controls for Companies -->
          <div class="flex items-center gap-1.5 flex-wrap shrink-0">
            <div class="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
               <button type="button" id="comp-period-day" onclick="Companies.setCompPeriodType('day')" class="px-2 py-1 text-[11px] font-black rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer">Daily</button>
               <button type="button" id="comp-period-month" onclick="Companies.setCompPeriodType('month')" class="px-2 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">Monthly</button>
               <button type="button" id="comp-period-year" onclick="Companies.setCompPeriodType('year')" class="px-2 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">Annual</button>
               <button type="button" id="comp-period-all" onclick="Companies.setCompPeriodType('all')" class="px-2 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">All</button>
            </div>

            <!-- Daily navigation controls -->
            <div id="comp-daily-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
               <button type="button" onclick="Companies.changeCompDateStep(-1)" class="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Day">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <input type="date" id="comp-date-picker" onchange="Companies.applyFilters()" oninput="Companies.applyFilters()" class="bg-transparent border-0 px-1 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               <button type="button" onclick="Companies.changeCompDateStep(1)" class="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Day">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button type="button" onclick="Companies.setCompToday()" class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer">Today</button>
            </div>

            <!-- Monthly navigation controls -->
            <div id="comp-monthly-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <button type="button" onclick="Companies.changeCompMonthStep(-1)" class="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Month">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <select id="comp-month-select" onchange="Companies.applyFilters()" class="bg-transparent border-0 px-1.5 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                 <option value="1">Jan</option>
                 <option value="2">Feb</option>
                 <option value="3">Mar</option>
                 <option value="4">Apr</option>
                 <option value="5">May</option>
                 <option value="6">Jun</option>
                 <option value="7">Jul</option>
                 <option value="8">Aug</option>
                 <option value="9">Sep</option>
                 <option value="10">Oct</option>
                 <option value="11">Nov</option>
                 <option value="12">Dec</option>
               </select>
               <select id="comp-month-year-select" onchange="Companies.applyFilters()" class="bg-transparent border-0 px-1.5 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
               <button type="button" onclick="Companies.changeCompMonthStep(1)" class="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Month">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button type="button" onclick="Companies.setCompThisMonth()" class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer">This Month</button>
            </div>

            <!-- Annual controls -->
            <div id="comp-annual-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <select id="comp-year-picker" onchange="Companies.applyFilters()" class="bg-transparent border-0 px-2 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
            </div>
          </div>
          
          <div class="flex gap-1.5 items-center shrink-0">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort By</label>
            <select id="khata-sort" onchange="Companies.applyFilters()" class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-accent transition-all">
              <option value="balance_desc" selected>Balance (High to Low)</option>
              <option value="balance_asc">Balance (Low to High)</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div class="overflow-auto max-h-[calc(100vh-250px)] custom-scrollbar">
            <table class="w-full text-sm text-left border-collapse border-b border-slate-200">
              <thead class="sticky top-0 z-10 bg-slate-50 shadow-sm border-b border-slate-200 uppercase text-[11px] font-black tracking-wider">
                <tr class="border-b border-slate-200">
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Name</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Balance Amount</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider text-center border-r border-slate-200">Transactions</th>
                  <th class="px-4 py-2 font-black text-slate-700 uppercase tracking-wider text-right bg-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody id="company-list" class="divide-y divide-slate-200 bg-white">
                <!-- Content injected here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div id="company-modal" onclick="if(event.target === this) Companies.hideModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden transform animate-in zoom-in-95 duration-200">
          <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 id="modal-title" class="text-xl font-bold text-slate-800">Add New Company</h3>
            <button onclick="Companies.hideModal()" class="text-slate-400 hover:text-slate-600 transition-colors"><i data-lucide="x" class="w-6 h-6"></i></button>
          </div>
          <form id="company-form" onsubmit="Companies.handleSave(event)" class="p-8 space-y-5">
            <input type="hidden" id="comp-id">
            
            <div class="grid grid-cols-1 gap-5">
              <div>
                <label id="comp-name-label" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Company Name *</label>
                <input type="text" id="comp-name" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Balance/Amount</label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rs.</span>
                    <input type="number" id="comp-amount" value="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all tabular-nums">
                  </div>
                </div>
                <div>
                  <label id="comp-phone-label" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Phone Number <span class="text-slate-400 font-normal text-[11px] uppercase tracking-normal">(Optional)</span></label>
                  <input type="tel" id="comp-phone" oninput="this.value = this.value.replace(/[^0-9+\-\s]/g, '')" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Address</label>
                    <input type="text" id="comp-address" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all">
                </div>
              </div>
            </div>

            <div class="pt-4 flex gap-3">
              <button type="button" onclick="Companies.hideModal()" class="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">Cancel</button>
              <button type="submit" id="comp-submit-btn" class="flex-1 px-4 py-3 bg-accent hover:bg-amber-500 text-slate-900 font-bold rounded-xl shadow-lg transition-all active:scale-95">Save Company</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Transaction Modal (Purchase/Pay) -->
      <div id="txn-modal" onclick="if(event.target === this) Companies.hideTxnModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[510] backdrop-blur-md animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform animate-in zoom-in-95 duration-200">
          <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div id="txn-icon-bg" class="w-10 h-10 rounded-xl flex items-center justify-center">
                    <i id="txn-icon" data-lucide="plus" class="w-5 h-5"></i>
                </div>
                <h3 id="txn-modal-title" class="text-xl font-bold text-slate-800">Record Transaction</h3>
            </div>
            <button onclick="Companies.hideTxnModal()" class="text-slate-400 hover:text-slate-600 transition-colors"><i data-lucide="x" class="w-6 h-6"></i></button>
          </div>
          <form id="txn-form" onsubmit="Companies.handleTxnSubmit(event)" class="p-8 space-y-5">
            <input type="hidden" id="txn-comp-id">
            <input type="hidden" id="txn-type">
            
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Amount *</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rs.</span>
                <input type="number" id="txn-amount" required min="1" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-4 text-lg font-black focus:bg-white focus:ring-4 outline-none transition-all tabular-nums">
              </div>
              <p id="txn-max-hint" class="text-[10px] font-bold text-slate-400 mt-1.5 hidden uppercase tracking-wider ml-1"></p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Description (Optional)</label>
              <textarea id="txn-desc" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 outline-none transition-all" placeholder="Enter transaction details..."></textarea>
            </div>

            <div class="pt-2">
              <button type="submit" id="txn-submit-btn" class="w-full px-4 py-4 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-lg uppercase tracking-widest">Confirm Transaction</button>
            </div>
          </form>
        </div>
      </div>

      <!-- History Modal -->
      <div id="history-modal" onclick="if(event.target === this) Companies.hideHistoryModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[520] backdrop-blur-md animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl lg:max-w-6xl mx-4 overflow-hidden transform animate-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col">
          <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 shrink-0">
            <div class="flex justify-between items-center">
              <div>
                <h3 id="history-title" class="text-xl font-bold text-slate-800">Transaction History</h3>
                <p id="history-subtitle" class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Company Details</p>
              </div>
              <button onclick="Companies.hideHistoryModal()" class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <!-- Filter Type & Time Period controls -->
              <div class="flex items-center gap-2 flex-wrap">
                <select id="history-type-select" onchange="Companies.setHistoryTypeFilter(this.value)" class="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-accent transition-all shrink-0 cursor-pointer shadow-2xs">
                  <option value="all" selected>All Types</option>
                  <option value="purchase">Purchases</option>
                  <option value="payment">Payments</option>
                </select>

                <div class="flex bg-slate-200/70 p-0.5 rounded-lg gap-0.5 shadow-2xs">
                   <button type="button" id="history-period-day" onclick="Companies.setHistoryPeriodType('day')" class="px-2.5 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">Daily</button>
                   <button type="button" id="history-period-month" onclick="Companies.setHistoryPeriodType('month')" class="px-2.5 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">Monthly</button>
                   <button type="button" id="history-period-year" onclick="Companies.setHistoryPeriodType('year')" class="px-2.5 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer">Annual</button>
                   <button type="button" id="history-period-all" onclick="Companies.setHistoryPeriodType('all')" class="px-2.5 py-1 text-[11px] font-black rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer">All</button>
                </div>

                <!-- Daily navigation controls -->
                <div id="history-daily-controls" class="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 hidden shadow-2xs">
                   <button type="button" onclick="Companies.changeHistoryDateStep(-1)" class="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Day">
                     <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                   </button>
                   <input type="date" id="history-date-picker" onchange="Companies.filterHistory()" oninput="Companies.filterHistory()" class="bg-transparent border-0 px-1 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                   <button type="button" onclick="Companies.changeHistoryDateStep(1)" class="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Day">
                     <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                   </button>
                   <button type="button" onclick="Companies.setHistoryToday()" class="px-2 py-0.5 text-[10px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-all cursor-pointer">Today</button>
                </div>

                <!-- Monthly navigation controls -->
                <div id="history-monthly-controls" class="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 hidden shadow-2xs">
                   <button type="button" onclick="Companies.changeHistoryMonthStep(-1)" class="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Month">
                     <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                   </button>
                   <select id="history-month-select" onchange="Companies.filterHistory()" class="bg-transparent border-0 px-1.5 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                     <option value="1">Jan</option>
                     <option value="2">Feb</option>
                     <option value="3">Mar</option>
                     <option value="4">Apr</option>
                     <option value="5">May</option>
                     <option value="6">Jun</option>
                     <option value="7">Jul</option>
                     <option value="8">Aug</option>
                     <option value="9">Sep</option>
                     <option value="10">Oct</option>
                     <option value="11">Nov</option>
                     <option value="12">Dec</option>
                   </select>
                   <select id="history-month-year-select" onchange="Companies.filterHistory()" class="bg-transparent border-0 px-1.5 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                   </select>
                   <button type="button" onclick="Companies.changeHistoryMonthStep(1)" class="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Month">
                     <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                   </button>
                   <button type="button" onclick="Companies.setHistoryThisMonth()" class="px-2 py-0.5 text-[10px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-all cursor-pointer">This Month</button>
                </div>

                <!-- Annual controls -->
                <div id="history-annual-controls" class="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 hidden shadow-2xs">
                   <select id="history-year-picker" onchange="Companies.filterHistory()" class="bg-transparent border-0 px-2 py-0.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                   </select>
                </div>
              </div>

              <!-- Search input -->
              <div class="relative w-64 shrink-0">
                  <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input type="text" id="history-search" oninput="Companies.filterHistory()" placeholder="Search invoice, amount..." class="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-xs font-bold shadow-2xs">
                  <button type="button" id="history-search-clear-btn" onclick="Companies.clearHistorySearch()" title="Clear search" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
              </div>
            </div>
          </div>
          
          <div class="overflow-y-auto flex-1 p-0">
            <table class="w-full text-left border-collapse border-b border-slate-200">
              <thead class="sticky top-0 bg-slate-50 shadow-sm z-10">
                <tr class="border-b border-slate-200">
                  <th class="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200">Date & Time</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200">Invoice</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200">Amount</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200">Running Balance</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="history-list" class="divide-y divide-slate-200">
                <!-- Content injected here -->
              </tbody>
            </table>
          </div>
          <div id="history-pagination-footer" class="shrink-0"></div>
          
          <div class="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
            <button onclick="Companies.hideHistoryModal()" class="px-6 py-1.5 bg-slate-800 text-white font-bold rounded-xl transition-all active:scale-95">Close</button>
          </div>
        </div>
      </div>

      <!-- New Purchase Modal (Dynamic Rows) -->
      <div id="new-purchase-modal" onclick="if(event.target === this) Companies.hideNewPurchaseModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[530] backdrop-blur-md animate-in fade-in duration-200 no-print">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 lg:mx-8 overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-900 text-accent flex items-center justify-center">
                        <i data-lucide="shopping-cart" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 id="np-modal-title" class="text-xl font-bold text-slate-800">New Purchase</h3>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supplier (Optional):</span>
                            <select id="np-company-select" onchange="Companies.onPurchaseCompanyChange(this.value)" class="bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer">
                            </select>
                            <span id="np-target-company" class="hidden text-xs font-bold text-slate-500 uppercase tracking-widest"></span>
                        </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400">
                      <span>Press <kbd class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono text-[10px]">Arrow Keys</kbd> to move</span>
                      <span>•</span>
                      <span><kbd class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono text-[10px]">F9</kbd> Complete</span>
                    </div>
                    <button onclick="Companies.hideNewPurchaseModal()" class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><i data-lucide="x" class="w-6 h-6"></i></button>
                  </div>
              </div>
              
              <form id="new-purchase-form" onsubmit="event.preventDefault(); return false;" class="p-6 flex flex-col overflow-hidden">
                  <!-- Hidden input for company ID -->
                  <input type="hidden" id="np-company-id">

                  <!-- Items Section -->
                  <div class="flex-1 overflow-y-auto min-h-[260px] mb-4 pr-1 custom-scrollbar pb-44">
                      <div class="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 px-1 border-b border-slate-100 pb-1.5">
                          <div class="col-span-6">Item Name / Stock</div>
                          <div class="col-span-2 text-center">Quantity</div>
                          <div class="col-span-2 text-right">Cost / Unit</div>
                          <div class="col-span-2 text-right">Line Total</div>
                      </div>
                      <div id="np-items-list" class="space-y-1.5">
                          <!-- Dynamic rows here -->
                      </div>
                  </div>

                  <!-- Total and Submit -->
                  <div class="pt-4 border-t border-slate-100 shrink-0">
                      <div class="flex justify-between items-center mb-3 gap-4 bg-slate-50/50 p-2 rounded-2xl border border-slate-100 flex-wrap">
                          <div class="flex items-center gap-2">
                              <span class="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Subtotal:</span>
                              <span id="np-subtotal" class="text-xs font-black text-slate-500 tabular-nums">Rs. 0</span>
                          </div>
                          
                          <div class="flex items-center gap-2">
                              <span class="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Discount:</span>
                              <div class="relative w-24">
                                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">Rs.</span>
                                  <input type="number" id="np-discount" placeholder="0" min="0" onkeydown="Companies.handlePurchaseFooterKeyDown(event, 'discount')" oninput="Companies.calculateNewTxnTotal()" onchange="Companies.calculateNewTxnTotal()" class="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-1.5 py-1 text-xs font-black focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none transition-all tabular-nums text-rose-500 shadow-sm">
                              </div>
                          </div>

                          <div class="flex items-center gap-2">
                              <span class="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Paid Amount:</span>
                              <div class="relative w-28">
                                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">Rs.</span>
                                  <input type="number" id="np-paid-amount" placeholder="0" min="0" onkeydown="Companies.handlePurchaseFooterKeyDown(event, 'paid')" oninput="Companies.onPaidAmountInput(this)" onchange="Companies.onPaidAmountInput(this)" class="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-1.5 py-1 text-xs font-black focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all tabular-nums text-emerald-600 shadow-sm">
                              </div>
                          </div>

                          <div class="flex items-center gap-2">
                              <span class="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Total:</span>
                              <span id="np-grand-total" class="text-xl font-black text-slate-900 tabular-nums">Rs. 0</span>
                          </div>
                      </div>
                      
                      <div class="flex gap-3">
                          <button type="button" onclick="Companies.hideNewPurchaseModal()" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors text-xs cursor-pointer">Cancel</button>
                          <button type="button" onclick="Companies.confirmAndCompletePurchase(event, false)" id="np-save-only-btn" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                              <i data-lucide="check" class="w-4 h-4"></i> <span id="np-save-only-text">Save</span>
                          </button>
                          <button type="button" onclick="Companies.confirmAndCompletePurchase(event, true)" id="np-submit-print-btn" class="flex-1 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer">
                              <i data-lucide="printer" class="w-4 h-4"></i> <span id="np-submit-print-text">Complete & Print (F9)</span>
                          </button>
                      </div>
                  </div>
              </form>
          </div>
      </div>

      <!-- All Transactions Modal -->
      <div id="all-txns-modal" onclick="if(event.target === this) Companies.hideAllTxnsModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[540] backdrop-blur-md animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden transform animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
            <div class="flex-1">
                <h3 id="all-txns-title" class="text-xl font-bold text-slate-800">All Transactions</h3>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Full Transaction Log</p>
            </div>
            
            <div class="flex-1 max-w-sm mx-4">
                <div class="relative">
                    <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input type="text" id="all-txns-search" oninput="Companies.filterAllTxns()" placeholder="Search by name, invoice, amount..." class="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-xs font-bold">
                    <button type="button" id="all-txns-search-clear-btn" onclick="Companies.clearAllTxnsSearch()" title="Clear search" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                </div>
            </div>

            <button onclick="Companies.hideAllTxnsModal()" class="text-slate-400 hover:text-slate-600 transition-colors"><i data-lucide="x" class="w-6 h-6"></i></button>
          </div>
          
          <div class="overflow-y-auto flex-1 p-0 custom-scrollbar">
            <table class="w-full text-sm text-left border-collapse border-b border-slate-200">
              <thead class="sticky top-0 bg-slate-50 shadow-sm z-10 border-b border-slate-200 uppercase text-[11px] font-black tracking-wider">
                <tr class="border-b border-slate-200">
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Date & Time</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Invoice</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Entity Name</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200">Type</th>
                  <th class="px-4 py-2 font-black text-slate-500 uppercase tracking-wider border-r border-slate-200 text-right">Amount</th>
                  <th class="px-4 py-2 font-black text-slate-700 uppercase tracking-wider text-right bg-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody id="all-txns-list" class="divide-y divide-slate-200 bg-white">
                <!-- Content injected here -->
              </tbody>
            </table>
          </div>
          <div id="all-txns-pagination-footer" class="shrink-0"></div>
          
          <div class="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
            <button onclick="Companies.hideAllTxnsModal()" class="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl transition-all active:scale-95 uppercase tracking-widest text-xs">Close Log</button>
          </div>
        </div>
      </div>
    `;

    if (!this._clickOutsideBound) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.np-item-name') && !e.target.closest('.np-search-results')) {
          document.querySelectorAll('.np-search-results').forEach(el => el.classList.add('hidden'));
        }
      });
      this._clickOutsideBound = true;
    }

    await this.switchView('transactions');
  },

  setTab(tab) {
    this.currentTab = tab;
    
    const compBtn = document.getElementById('tab-companies');
    const custBtn = document.getElementById('tab-customers');
    const addBtnText = document.getElementById('add-btn-text');
    const totalLabel = document.getElementById('total-label');
    const modalTitle = document.getElementById('modal-title');
    
    if (tab === 'companies') {
        compBtn.className = "px-4 py-2 rounded-lg font-bold text-sm bg-white shadow-sm text-slate-800 transition-all";
        custBtn.className = "px-4 py-2 rounded-lg font-bold text-sm text-slate-500 hover:text-slate-700 transition-all";
        addBtnText.textContent = 'Company';
        totalLabel.textContent = 'Total Companies';
    } else {
        custBtn.className = "px-4 py-2 rounded-lg font-bold text-sm bg-white shadow-sm text-slate-800 transition-all";
        compBtn.className = "px-4 py-2 rounded-lg font-bold text-sm text-slate-500 hover:text-slate-700 transition-all";
        addBtnText.textContent = 'Customer';
        totalLabel.textContent = 'Total Customers';
    }
    
    this.loadCompanies(tab);
  },

  async loadCompanies(targetTab) {
    if (targetTab) {
      this.currentTab = targetTab;
    } else if (!this.currentTab) {
      this.currentTab = 'companies';
    }
    if (this.currentTab === 'customers') {
      this.dataList = await window.api.getCustomers() || [];
    } else {
      this.dataList = await window.api.getCompanies() || [];
    }
    this.initPeriodPickers();
    this.applyFilters();
    if (window.lucide) lucide.createIcons();
  },

  clearKhataSearch() {
    const input = document.getElementById('khata-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applyFilters();
  },

  applyFilters() {
    const searchInput = document.getElementById('khata-search');
    const clearBtn = document.getElementById('khata-search-clear-btn');
    const term = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const sortBy = document.getElementById('khata-sort')?.value || 'balance_desc';
    const selDate = document.getElementById('comp-date-picker')?.value;

    let periodTotalPurchases = 0;

    // For each company, compute period transactions
    const enrichedList = (this.dataList || []).map(c => {
      const txns = window.storage.get(`${this.currentTab}-${c.id}-transactions`) || [];
      let periodPurchases = 0;
      let periodPayments = 0;
      let periodCount = 0;

      txns.forEach(t => {
        let inPeriod = true;
        if (t.date && this.currentCompPeriod !== 'all') {
          const parsed = this.parseTxnDate(t.date);
          if (parsed) {
            if (this.currentCompPeriod === 'day' && selDate) {
              inPeriod = (parsed.dateStr === selDate);
            } else if (this.currentCompPeriod === 'month') {
              const targetM = parseInt(document.getElementById('comp-month-select')?.value);
              const targetY = parseInt(document.getElementById('comp-month-year-select')?.value);
              if (targetM && targetY) {
                inPeriod = (parsed.year === targetY && parsed.month === targetM);
              }
            } else if (this.currentCompPeriod === 'year') {
              const targetY = parseInt(document.getElementById('comp-year-picker')?.value);
              if (targetY) {
                inPeriod = (parsed.year === targetY);
              }
            }
          }
        }
        if (inPeriod) {
          if (t.type === 'purchase') periodPurchases += (t.amount || 0);
          else if (t.type === 'payment') periodPayments += (t.amount || 0);
          periodCount++;
        }
      });

      periodTotalPurchases += periodPurchases;

      return {
        ...c,
        periodPurchases,
        periodPayments,
        periodCount,
        hasPeriodActivity: periodCount > 0
      };
    });

    let filtered = enrichedList.filter(c => {
      return (c.name || '').toLowerCase().includes(term) || (c.phone || '').toLowerCase().includes(term);
    });

    // Sort
    filtered.sort((a, b) => {
      if (term) {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        const phoneA = (a.phone || '').toLowerCase();
        const phoneB = (b.phone || '').toLowerCase();

        const getScore = (name, phone) => {
          if (name.startsWith(term)) return 1;
          const words = name.split(/[\s\-&/]+/);
          if (words.some(w => w.startsWith(term))) return 2;
          if (phone.startsWith(term)) return 3;
          if (phone.includes(term)) return 4;
          return 5;
        };

        const scoreA = getScore(nameA, phoneA);
        const scoreB = getScore(nameB, phoneB);

        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
      }

      if (sortBy === 'balance_desc') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'balance_asc') return (a.amount || 0) - (b.amount || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

    this.renderList(filtered);
    this.updateStats(periodTotalPurchases);
  },

  updateStats(periodTotalPurchases = 0) {
    const totalCount = (this.dataList || []).length;
    const totalBalance = (this.dataList || []).reduce((sum, c) => sum + (c.amount || 0), 0);

    const countEl = document.getElementById('comp-stat-count');
    const balanceEl = document.getElementById('comp-stat-balance');
    const periodTotalEl = document.getElementById('comp-stat-period-total');
    const periodLabelEl = document.getElementById('comp-stat-period-label');

    if (countEl) countEl.textContent = totalCount;
    if (balanceEl) balanceEl.textContent = app.formatCurrency(totalBalance);
    if (periodTotalEl) periodTotalEl.textContent = app.formatCurrency(periodTotalPurchases);
    if (periodLabelEl) {
      if (this.currentCompPeriod === 'day') periodLabelEl.textContent = 'Purchases Today';
      else if (this.currentCompPeriod === 'month') periodLabelEl.textContent = 'Purchases This Month';
      else if (this.currentCompPeriod === 'year') periodLabelEl.textContent = 'Purchases This Year';
      else periodLabelEl.textContent = 'Total Purchases';
    }
  },

  renderList(list) {
    const tbody = document.getElementById('company-list');
    if (!tbody || !list) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-10 text-center">
            <div class="flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
              <i data-lucide="${this.currentTab === 'companies' ? 'building-2' : 'users'}" class="w-16 h-16"></i>
              <p class="font-bold">No ${this.currentTab} added yet</p>
              <button onclick="Companies.showCompanyModal()" class="text-accent hover:underline text-sm font-bold">Add your first ${this.currentTab === 'companies' ? 'supplier' : 'customer'}</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(c => `
      <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-200">
        <td class="px-4 py-1 border-r border-slate-200">
          <div class="font-bold text-slate-800 uppercase tracking-tight text-xs">
            ${c.name} ${c.phone ? `<span class="text-slate-500 font-bold ml-1 text-[11px] tabular-nums">(${c.phone})</span>` : ''}
          </div>
        </td>
        <td class="px-4 py-1 tabular-nums border-r border-slate-200 text-xs">
          <div class="flex flex-col">
            <span class="text-xs font-bold ${c.amount > 0 ? 'text-emerald-700' : 'text-slate-400'}">
              ${app.formatCurrency(c.amount || 0)}
            </span>
            ${this.currentCompPeriod !== 'all' ? (
              c.periodPurchases > 0 ? 
              `<span class="text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.5 rounded w-fit mt-0.5 border border-rose-100">+${app.formatCurrency(c.periodPurchases)}</span>` : 
              (c.periodPayments > 0 ? `<span class="text-[9px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded w-fit mt-0.5 border border-blue-100">-${app.formatCurrency(c.periodPayments)}</span>` : `<span class="text-[9px] text-slate-300 font-medium mt-0.5">No activity</span>`)
            ) : ''}
          </div>
        </td>
        <td class="px-4 py-1 bg-slate-50/30 border-r border-slate-200">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="Companies.showPurchaseModal(${c.id})" class="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all shadow-sm">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> ${this.currentTab === 'companies' ? 'Purchase' : 'Add Balance'}
            </button>
            <button onclick="Companies.showPayModal(${c.id})" class="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all shadow-sm">
                <i data-lucide="wallet" class="w-3.5 h-3.5"></i> ${this.currentTab === 'companies' ? 'Pay' : 'Receive'}
            </button>
            <button onclick="Companies.showHistory(${c.id})" class="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all shadow-sm">
                <i data-lucide="eye" class="w-3.5 h-3.5"></i> History
            </button>
          </div>
        </td>
        <td class="px-4 py-1 text-right font-medium">
          <div class="flex items-center justify-end gap-1.5 transition-opacity">
            <button onclick="Companies.showCompanyModal(${c.id})" class="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all" title="Edit">
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button onclick="Companies.handleDelete(${c.id})" class="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    if (window.lucide) lucide.createIcons();
  },

  showCompanyModal(id = null) {
    const modal = document.getElementById('company-modal');
    const form = document.getElementById('company-form');
    const title = document.getElementById('modal-title');
    
    form.reset();
    document.getElementById('comp-id').value = '';
    
    if (id) {
      const c = this.dataList.find(x => x.id === id);
      if (c) {
        title.textContent = `Edit ${this.currentTab === 'companies' ? 'Company' : 'Customer'}`;
        document.getElementById('comp-id').value = c.id;
        document.getElementById('comp-name').value = c.name;
        document.getElementById('comp-amount').value = c.amount || 0;
        document.getElementById('comp-phone').value = c.phone || '';
        document.getElementById('comp-address').value = c.address || '';
      }
    } else {
      title.textContent = `Add New ${this.currentTab === 'companies' ? 'Company' : 'Customer'}`;
    }
    
    // Update Dynamic Labels
    const typeName = this.currentTab === 'companies' ? 'Company' : 'Customer';
    document.getElementById('comp-name-label').textContent = `${typeName} Name *`;
    document.getElementById('comp-phone-label').innerHTML = `Phone Number <span class="text-slate-400 font-normal text-[11px] uppercase tracking-normal">(Optional)</span>`;
    document.getElementById('comp-submit-btn').textContent = `Save ${typeName}`;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons();
  },

  hideModal() {
    const modal = document.getElementById('company-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  // --- Transactions ---

  showPurchaseModal(companyId) {
    if (this.currentTab === 'companies') {
        this.showNewPurchaseModal(companyId);
    } else {
        const c = this.dataList.find(x => x.id === companyId);
        this.openTxnModal('purchase', c);
    }
  },

  showPayModal(companyId) {
    const c = this.dataList.find(x => x.id === companyId);
    this.openTxnModal('payment', c);
  },

  openTxnModal(type, company) {
    const modal = document.getElementById('txn-modal');
    const form = document.getElementById('txn-form');
    const title = document.getElementById('txn-modal-title');
    const icon = document.getElementById('txn-icon');
    const iconBg = document.getElementById('txn-icon-bg');
    const btn = document.getElementById('txn-submit-btn');
    const amountInput = document.getElementById('txn-amount');
    const hint = document.getElementById('txn-max-hint');

    form.reset();
    document.getElementById('txn-comp-id').value = company.id;
    document.getElementById('txn-type').value = type;
    hint.classList.add('hidden');
    amountInput.removeAttribute('max');

    if (type === 'purchase') {
        title.textContent = `${this.currentTab === 'companies' ? 'Purchase from' : 'Add Balance for'} ${company.name}`;
        icon.setAttribute('data-lucide', 'shopping-cart');
        iconBg.className = 'w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600';
        btn.className = 'w-full px-4 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-lg uppercase tracking-widest';
        btn.textContent = this.currentTab === 'companies' ? 'Confirm Purchase' : 'Add Balance';
        amountInput.className = 'w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-4 text-lg font-black focus:bg-white focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all tabular-nums text-emerald-600';
    } else {
        title.textContent = `${this.currentTab === 'companies' ? 'Payment to' : 'Receive from'} ${company.name}`;
        icon.setAttribute('data-lucide', 'banknote');
        iconBg.className = 'w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600';
        btn.className = 'w-full px-4 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-lg uppercase tracking-widest';
        btn.textContent = this.currentTab === 'companies' ? 'Record Payment' : 'Record Receipt';
        amountInput.className = 'w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-4 text-lg font-black focus:bg-white focus:ring-4 focus:ring-blue-500/20 outline-none transition-all tabular-nums text-blue-600';
        
        // Max hint
        if (company.amount > 0) {
            hint.textContent = `Max payable: ${app.formatCurrency(company.amount)}`;
            hint.classList.remove('hidden');
            amountInput.setAttribute('max', company.amount);
        }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons();
    setTimeout(() => amountInput.focus(), 100);
  },

  hideTxnModal() {
    const modal = document.getElementById('txn-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  async handleTxnSubmit(e) {
    e.preventDefault();
    const companyId = parseInt(document.getElementById('txn-comp-id').value);
    const type = document.getElementById('txn-type').value;
    const amount = parseFloat(document.getElementById('txn-amount').value);
    const description = document.getElementById('txn-desc').value;

    if (!amount || amount <= 0) return;

    const company = this.dataList.find(x => x.id === companyId);
    if (!company) return;

    app.showLoading();
    try {
        const currentBalance = company.amount || 0;
        let newBalance = currentBalance;
        if (type === 'purchase') {
            newBalance += amount;
        } else {
            newBalance -= amount;
        }

        // 1. Update DB
        if (this.currentTab === 'companies') {
            await window.api.saveCompany({ ...company, amount: newBalance });
        } else {
            await window.api.saveCustomer({ ...company, amount: newBalance });
        }

        // 2. Save Transaction in window.storage
        const txnKey = `${this.currentTab}-${company.id}-transactions`;
        const transactions = window.storage.get(txnKey) || [];
        
        // Calculate global Invoice No
        const nextNoKey = `next-invoice-no-${this.currentTab}`;
        let nextNo = window.storage.get(nextNoKey);
        if (nextNo === null) {
            let totalTxns = 0;
            this.dataList.forEach(item => {
                const txns = window.storage.get(`${this.currentTab}-${item.id}-transactions`) || [];
                totalTxns += txns.length;
            });
            nextNo = totalTxns + 1;
        }
        
        const newTxn = {
            id: Date.now().toString(),
            invoice_no: nextNo,
            invoice_prefix: this.currentTab === 'companies' ? 'CMP' : 'INV',
            type: type,
            amount: amount,
            description: description,
            date: new Date().toISOString(),
            balanceAfter: newBalance
        };

        window.storage.set(nextNoKey, nextNo + 1);
        
        transactions.unshift(newTxn);
        window.storage.set(txnKey, transactions);

        this.hideTxnModal();
        if (this.currentView === 'transactions') {
          await this.loadTransactions();
        } else {
          await this.loadCompanies();
        }
    } catch (err) {
        console.error(err);
        app.showAlert('Error recording transaction');
    } finally {
        app.hideLoading();
    }
  },

  async showHistory(companyId) {
    const company = this.dataList.find(x => x.id === companyId);
    if (!company) return;

    const modal = document.getElementById('history-modal');
    const tbody = document.getElementById('history-list');
    const title = document.getElementById('history-title');
    const subtitle = document.getElementById('history-subtitle');

    title.textContent = `${company.name}`;
    subtitle.textContent = `Total Balance: ${app.formatCurrency(company.amount || 0)}`;

    const txnKey = `${this.currentTab}-${company.id}-transactions`;
    const transactions = window.storage.get(txnKey) || [];

    this.currentHistory = transactions;
    this.currentHistoryCompanyId = companyId;
    this.historyPage = 1;
    this.currentHistoryPeriod = 'all';
    this.historyTypeFilter = 'all';
    
    // Reset filters
    const searchInput = document.getElementById('history-search');
    if (searchInput) searchInput.value = '';
    const typeSelect = document.getElementById('history-type-select');
    if (typeSelect) typeSelect.value = 'all';

    this.initHistoryPeriodPickers();
    this.setHistoryPeriodType('all');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons();
  },

  setHistoryPeriodType(type) {
    this.currentHistoryPeriod = type;
    const periods = ['day', 'month', 'year', 'all'];
    periods.forEach(p => {
      const btn = document.getElementById(`history-period-${p}`);
      if (btn) {
        if (p === type) {
          btn.className = 'px-2.5 py-1 text-[11px] font-black rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer';
        } else {
          btn.className = 'px-2.5 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer';
        }
      }
    });

    const dailyEl = document.getElementById('history-daily-controls');
    const monthlyEl = document.getElementById('history-monthly-controls');
    const annualEl = document.getElementById('history-annual-controls');

    if (dailyEl) dailyEl.classList.toggle('hidden', type !== 'day');
    if (monthlyEl) monthlyEl.classList.toggle('hidden', type !== 'month');
    if (annualEl) annualEl.classList.toggle('hidden', type !== 'year');

    this.historyPage = 1;
    this.filterHistory();
  },

  setHistoryTypeFilter(type) {
    this.historyTypeFilter = type;
    this.historyPage = 1;
    this.filterHistory();
  },

  changeHistoryDateStep(delta) {
    const input = document.getElementById('history-date-picker');
    if (!input) return;
    const cur = input.value ? new Date(input.value) : new Date();
    cur.setDate(cur.getDate() + delta);
    input.value = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    this.historyPage = 1;
    this.filterHistory();
  },

  setHistoryToday() {
    const input = document.getElementById('history-date-picker');
    if (input) {
      const now = new Date();
      input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      this.historyPage = 1;
      this.filterHistory();
    }
  },

  changeHistoryMonthStep(delta) {
    const mSelect = document.getElementById('history-month-select');
    const ySelect = document.getElementById('history-month-year-select');
    if (!mSelect || !ySelect) return;
    let m = parseInt(mSelect.value) + delta;
    let y = parseInt(ySelect.value);
    if (m > 12) { m = 1; y += 1; }
    else if (m < 1) { m = 12; y -= 1; }
    let yOpt = Array.from(ySelect.options).find(o => parseInt(o.value) === y);
    if (!yOpt) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      ySelect.appendChild(opt);
    }
    mSelect.value = String(m);
    ySelect.value = String(y);
    this.historyPage = 1;
    this.filterHistory();
  },

  setHistoryThisMonth() {
    const now = new Date();
    const mSelect = document.getElementById('history-month-select');
    const ySelect = document.getElementById('history-month-year-select');
    if (mSelect) mSelect.value = String(now.getMonth() + 1);
    if (ySelect) ySelect.value = String(now.getFullYear());
    this.historyPage = 1;
    this.filterHistory();
  },

  initHistoryPeriodPickers() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yearSet = new Set([now.getFullYear()]);
    (this.currentHistory || []).forEach(t => {
      if (t.date) {
        const parsed = this.parseTxnDate(t.date);
        if (parsed && parsed.year) yearSet.add(parsed.year);
      }
    });
    const years = Array.from(yearSet).sort((a, b) => b - a);

    const datePicker = document.getElementById('history-date-picker');
    if (datePicker && !datePicker.value) datePicker.value = todayStr;

    const mSelect = document.getElementById('history-month-select');
    if (mSelect) mSelect.value = String(now.getMonth() + 1);

    const mySelect = document.getElementById('history-month-year-select');
    if (mySelect) {
      mySelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      mySelect.value = String(now.getFullYear());
    }

    const ySelect = document.getElementById('history-year-picker');
    if (ySelect) {
      ySelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      ySelect.value = String(now.getFullYear());
    }
  },

  clearHistorySearch() {
    const input = document.getElementById('history-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.historyPage = 1;
    this.filterHistory();
  },

  filterHistory() {
    const searchInput = document.getElementById('history-search');
    const clearBtn = document.getElementById('history-search-clear-btn');
    const query = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if (query.length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    if (!this.currentHistory) return;

    const typeFilter = document.getElementById('history-type-select')?.value || this.historyTypeFilter || 'all';
    this.historyTypeFilter = typeFilter;
    const selDate = document.getElementById('history-date-picker')?.value;

    let filtered = this.currentHistory.filter((t, idx) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Period filter
      if (t.date && this.currentHistoryPeriod !== 'all') {
        const parsed = this.parseTxnDate(t.date);
        if (parsed) {
          if (this.currentHistoryPeriod === 'day' && selDate) {
            if (parsed.dateStr !== selDate) return false;
          } else if (this.currentHistoryPeriod === 'month') {
            const targetM = parseInt(document.getElementById('history-month-select')?.value);
            const targetY = parseInt(document.getElementById('history-month-year-select')?.value);
            if (targetM && targetY) {
              if (parsed.year !== targetY || parsed.month !== targetM) return false;
            }
          } else if (this.currentHistoryPeriod === 'year') {
            const targetY = parseInt(document.getElementById('history-year-picker')?.value);
            if (targetY) {
              if (parsed.year !== targetY) return false;
            }
          }
        }
      }

      if (query) {
        let invoiceId = '';
        if (t.invoice_no) {
          invoiceId = `${t.invoice_prefix || (this.currentTab === 'companies' ? 'CMP' : 'INV')}-${t.invoice_no}`.toLowerCase();
        } else {
          const invNo = this.currentHistory.length - idx;
          const invPrefix = this.currentTab === 'companies' ? 'CMP' : 'INV';
          invoiceId = `${invPrefix}-${invNo}`.toLowerCase();
        }
        return invoiceId.includes(query) || 
               (t.amount && t.amount.toString().includes(query)) ||
               (t.description && t.description.toLowerCase().includes(query));
      }

      return true;
    });

    this.renderHistoryList(filtered);
  },

  renderHistoryList(transactions) {
    this._lastFilteredHistory = transactions || [];
    const tbody = document.getElementById('history-list');
    const footer = document.getElementById('history-pagination-footer');
    const companyId = this.currentHistoryCompanyId;
    if (!tbody) return;
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
              <td colspan="5" class="px-6 py-12 text-center text-slate-300 font-bold italic">No matching transactions found.</td>
            </tr>
        `;
        if (footer) footer.innerHTML = '';
        if (window.lucide) lucide.createIcons();
        return;
    }

    const total = transactions.length;
    const totalPages = Math.ceil(total / this.historyPageSize);
    if (this.historyPage > totalPages) this.historyPage = totalPages;
    if (this.historyPage < 1) this.historyPage = 1;

    const startIdx = (this.historyPage - 1) * this.historyPageSize;
    const endIdx = Math.min(startIdx + this.historyPageSize, total);
    const paginated = transactions.slice(startIdx, endIdx);

    tbody.innerHTML = paginated.map((t) => {
        let displayInvoice = '';
        if (t.invoice_no) {
            displayInvoice = `${t.invoice_prefix || (this.currentTab === 'companies' ? 'CMP' : 'INV')}-${t.invoice_no}`;
        } else {
            // Calculate original index for legacy transactions
            const originalIdx = this.currentHistory.findIndex(x => x.id === t.id);
            const invNo = this.currentHistory.length - originalIdx;
            const invPrefix = this.currentTab === 'companies' ? 'CMP' : 'INV';
            displayInvoice = `${invPrefix}-${invNo}`;
        }
        
        return `
        <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-200">
            <td class="px-4 py-1 border-r border-slate-200">
                <div class="font-bold text-slate-800 uppercase tracking-tight text-xs whitespace-nowrap">${app.formatDateTime(t.date)}</div>
            </td>
            <td class="px-4 py-1 border-r border-slate-200">
                <div class="font-bold text-slate-800 uppercase tracking-tight text-xs">${displayInvoice}</div>
            </td>
            
            <td class="px-4 py-1 border-r border-slate-200 text-xs">
                <div class="font-bold ${t.type === 'purchase' ? 'text-rose-600' : 'text-emerald-600'} tracking-tight text-xs">
                    ${t.type === 'purchase' ? '+' : '-'} ${app.formatCurrency(t.amount)}
                </div>
            </td>
            <td class="px-4 py-1 border-r border-slate-200 text-xs">
                <div class="font-bold text-slate-800 tracking-tight text-xs">${app.formatCurrency(t.balanceAfter)}</div>
            </td>
            <td class="px-4 py-1 text-right font-medium">
                <div class="flex items-center justify-end gap-1.5 transition-opacity">
                    <button onclick="Companies.viewTxnDetails('${t.id}', ${companyId})" class="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="View Details">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <button onclick="Companies.printVoucher('${t.id}', ${companyId})" class="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer" title="Print Voucher">
                        <i data-lucide="printer" class="w-4 h-4"></i>
                    </button>
                    ${t.type === 'purchase' ? `
                    <button onclick="Companies.editPurchase('${t.id}', ${companyId})" class="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all cursor-pointer" title="Edit Purchase">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    ` : ''}
                    ${t.id === this.currentHistory[0]?.id ? `
                    <button onclick="Companies.handleDeleteTransaction('${t.id}', ${companyId})" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Delete Transaction">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `}).join('');

    if (footer) {
      if (total <= this.historyPageSize) {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-6 py-2 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-500">
            <span>Showing all <span class="font-black text-slate-800">${total}</span> transaction${total === 1 ? '' : 's'}</span>
          </div>
        `;
      } else {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-6 py-2 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-600 flex-wrap gap-2 select-none">
            <div>
              Showing <span class="font-black text-slate-900">${startIdx + 1}</span> - <span class="font-black text-slate-900">${endIdx}</span> of <span class="font-black text-slate-900">${total}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" ${this.historyPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Companies.changeHistoryPage(' + (this.historyPage - 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                <span>Prev</span>
              </button>
              <span class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-black">
                Page ${this.historyPage} of ${totalPages}
              </span>
              <button type="button" ${this.historyPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Companies.changeHistoryPage(' + (this.historyPage + 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <span>Next</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  changeHistoryPage(page) {
    this.historyPage = page;
    this.renderHistoryList(this._lastFilteredHistory || []);
  },

  hideHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  async showAllTransactions() {
    const modal = document.getElementById('all-txns-modal');
    const title = document.getElementById('all-txns-title');
    title.textContent = this.currentTab === 'companies' ? 'All Company Transactions' : 'All Customer Transactions';

    app.showLoading();
    try {
        // Fetch all transactions
        let allTxns = [];
        const entities = await (this.currentTab === 'companies' ? window.api.getCompanies() : window.api.getCustomers());
        
        for (const entity of entities) {
            const txns = window.storage.get(`${this.currentTab}-${entity.id}-transactions`) || [];
            txns.forEach(t => {
                allTxns.push({ ...t, entityName: entity.name, entityId: entity.id });
            });
        }

        // Sort by date desc
        allTxns.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.fullTxnHistory = allTxns;

        this.renderAllTxnsList(allTxns);
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Reset search
        const searchInput = document.getElementById('all-txns-search');
        if (searchInput) searchInput.value = '';
        
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error(err);
        app.showAlert("Error loading transactions log.");
    } finally {
        app.hideLoading();
    }
  },

  renderAllTxnsList(txns) {
    this._lastFilteredAllTxns = txns || [];
    const tbody = document.getElementById('all-txns-list');
    const footer = document.getElementById('all-txns-pagination-footer');
    if (!tbody) return;

    if (!txns || txns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-300 font-bold italic">No transactions found.</td></tr>`;
        if (footer) footer.innerHTML = '';
        if (window.lucide) lucide.createIcons();
        return;
    }

    const total = txns.length;
    const totalPages = Math.ceil(total / this.allTxnsPageSize);
    if (this.allTxnsPage > totalPages) this.allTxnsPage = totalPages;
    if (this.allTxnsPage < 1) this.allTxnsPage = 1;

    const startIdx = (this.allTxnsPage - 1) * this.allTxnsPageSize;
    const endIdx = Math.min(startIdx + this.allTxnsPageSize, total);
    const paginated = txns.slice(startIdx, endIdx);

    tbody.innerHTML = paginated.map(t => {
        const invPrefix = t.invoice_prefix || (this.currentTab === 'companies' ? 'CMP' : 'INV');
        const displayInvoice = t.invoice_no ? `${invPrefix}-${t.invoice_no}` : 'Legacy';
        
        return `
            <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-200">
                <td class="px-4 py-1 text-xs font-bold text-slate-800 tabular-nums border-r border-slate-200">${app.formatDateTime(t.date)}</td>
                <td class="px-4 py-1 text-xs font-bold text-slate-800 border-r border-slate-200">${displayInvoice}</td>
                <td class="px-4 py-1 text-xs font-bold text-slate-800 border-r border-slate-200 uppercase tracking-tight">${t.entityName}</td>
                <td class="px-4 py-1 border-r border-slate-200">
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${t.type === 'purchase' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}">
                        ${t.type.toUpperCase()}
                    </span>
                </td>
                <td class="px-4 py-1 text-right font-bold tabular-nums border-r border-slate-200 text-xs ${t.type === 'purchase' ? 'text-rose-600' : 'text-emerald-600'}">
                    ${t.type === 'purchase' ? '+' : '-'} ${app.formatCurrency(t.amount)}
                </td>
                <td class="px-4 py-1 text-right font-medium">
                    <div class="flex items-center justify-end gap-1.5 transition-opacity">
                        <button onclick="Companies.viewTxnDetails('${t.id}', ${t.entityId})" class="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="View Details">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button onclick="Companies.printVoucher('${t.id}', ${t.entityId})" class="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Print Voucher">
                            <i data-lucide="printer" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (footer) {
      if (total <= this.allTxnsPageSize) {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-6 py-2 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-500">
            <span>Showing all <span class="font-black text-slate-800">${total}</span> transaction${total === 1 ? '' : 's'}</span>
          </div>
        `;
      } else {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-6 py-2 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-600 flex-wrap gap-2 select-none">
            <div>
              Showing <span class="font-black text-slate-900">${startIdx + 1}</span> - <span class="font-black text-slate-900">${endIdx}</span> of <span class="font-black text-slate-900">${total}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" ${this.allTxnsPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Companies.changeAllTxnsPage(' + (this.allTxnsPage - 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                <span>Prev</span>
              </button>
              <span class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-black">
                Page ${this.allTxnsPage} of ${totalPages}
              </span>
              <button type="button" ${this.allTxnsPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Companies.changeAllTxnsPage(' + (this.allTxnsPage + 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <span>Next</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  changeAllTxnsPage(page) {
    this.allTxnsPage = page;
    this.renderAllTxnsList(this._lastFilteredAllTxns || []);
  },

  clearAllTxnsSearch() {
    const input = document.getElementById('all-txns-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.allTxnsPage = 1;
    this.filterAllTxns();
  },

  filterAllTxns() {
    const searchInput = document.getElementById('all-txns-search');
    const clearBtn = document.getElementById('all-txns-search-clear-btn');
    const query = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    if (!this.fullTxnHistory) return;
    
    this.allTxnsPage = 1;
    const filtered = this.fullTxnHistory.filter(t => {
        const invPrefix = t.invoice_prefix || (this.currentTab === 'companies' ? 'CMP' : 'INV');
        const displayInvoice = t.invoice_no ? `${invPrefix}-${t.invoice_no}` : 'Legacy';
        
        return displayInvoice.toLowerCase().includes(query) ||
               t.entityName.toLowerCase().includes(query) ||
               t.amount.toString().includes(query) ||
               t.type.toLowerCase().includes(query);
    });
    
    this.renderAllTxnsList(filtered);
  },

  hideAllTxnsModal() {
    const modal = document.getElementById('all-txns-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  async handleSave(e) {
    e.preventDefault();
    const data = {
      id: document.getElementById('comp-id').value ? parseInt(document.getElementById('comp-id').value) : null,
      name: document.getElementById('comp-name').value,
      amount: parseFloat(document.getElementById('comp-amount').value) || 0,
      phone: document.getElementById('comp-phone').value,
      address: document.getElementById('comp-address').value
    };

    app.showLoading();
    try {
      if (this.currentTab === 'companies') {
          await window.api.saveCompany(data);
      } else {
          await window.api.saveCustomer(data);
      }
      this.hideModal();
      await this.loadCompanies();
    } catch (err) {
      console.error(err);
      app.showAlert(`Error saving ${this.currentTab === 'companies' ? 'company' : 'customer'}`);
    } finally {
      app.hideLoading();
    }
  },

  async handleDelete(id) {
    const type = this.currentTab === 'companies' ? 'Company' : 'Customer';
    app.verifyPassword({
      title: `Delete ${type} Verification`,
      message: `Please enter password to delete this ${type.toLowerCase()}:`,
      onVerified: () => {
        app.showConfirm({
          title: `Delete ${type}`,
          message: `Are you sure you want to remove this ${type.toLowerCase()}? This action cannot be undone.`,
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            try {
              if (this.currentTab === 'companies') {
                  await window.api.deleteCompany(id);
              } else {
                  await window.api.deleteCustomer(id);
              }
              // Also clear transactions
              localStorage.removeItem(`${this.currentTab}-${id}-transactions`);
              await this.loadCompanies();
            } catch (err) {
              app.showAlert(`Error deleting ${this.currentTab === 'companies' ? 'company' : 'customer'}`);
            } finally {
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  async switchView(viewName) {
    this.currentView = viewName;
    const txnsView = document.getElementById('purchases-txns-view');
    const companiesView = document.getElementById('purchases-companies-view');
    const headerActions = document.getElementById('purchases-header-actions');
    const pageTitle = document.getElementById('purchases-page-title');
    const pageSubtitle = document.getElementById('purchases-page-subtitle');

    if (viewName === 'companies') {
      if (txnsView) txnsView.classList.add('hidden');
      if (companiesView) companiesView.classList.remove('hidden');
      if (pageTitle) pageTitle.textContent = 'Companies & Suppliers';
      if (pageSubtitle) pageSubtitle.textContent = 'Supplier Directory & Ledger';

      if (headerActions) {
        headerActions.innerHTML = `
          <button onclick="Companies.switchView('transactions')" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
            <i data-lucide="list" class="w-4 h-4 text-slate-400"></i> <span>Transactions</span>
          </button>
          <button onclick="Companies.showCompanyModal()" class="h-10 px-4 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4 stroke-[2.5]"></i> <span>Add New Company</span>
          </button>
        `;
      }
      await this.loadCompanies();
    } else {
      if (companiesView) companiesView.classList.add('hidden');
      if (txnsView) txnsView.classList.remove('hidden');
      if (pageTitle) pageTitle.textContent = 'Purchases';
      if (pageSubtitle) pageSubtitle.textContent = 'Transactions Log';

      if (headerActions) {
        headerActions.innerHTML = `
          <button onclick="Companies.switchView('companies')" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
            <i data-lucide="building-2" class="w-4 h-4 text-slate-400"></i> <span>Companies</span>
          </button>
          <button onclick="Companies.showNewPurchaseModal()" class="h-10 px-4 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4 stroke-[2.5]"></i> <span>New Purchase</span>
          </button>
        `;
      }
      await this.loadTransactions();
    }
    if (window.lucide) lucide.createIcons();
  },

  async loadTransactions() {
    try {
      this.dataList = await (this.currentTab === 'companies' ? window.api.getCompanies() : window.api.getCustomers()) || [];
      
      let allTxns = [];
      for (const entity of this.dataList) {
        const txns = window.storage.get(`${this.currentTab}-${entity.id}-transactions`) || [];
        txns.forEach(t => {
          allTxns.push({ ...t, entityName: entity.name, entityId: entity.id });
        });
      }

      const directTxns = window.storage.get(`${this.currentTab}-direct-transactions`) || [];
      directTxns.forEach(t => {
        allTxns.push({ ...t, entityName: t.entityName || 'Direct Purchase', entityId: 0 });
      });

      allTxns.sort((a, b) => new Date(b.date) - new Date(a.date));
      this.fullTxnHistory = allTxns;

      this.initPeriodPickers();

      this.filterTransactions();
    } catch (err) {
      console.error(err);
      app.showAlert("Error loading purchase transactions.");
    }
  },

  initPeriodPickers() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Collect all unique years from transactions
    const yearSet = new Set([now.getFullYear()]);
    let sourceTxns = this.fullTxnHistory || [];
    if (sourceTxns.length === 0 && this.dataList && this.dataList.length > 0) {
      this.dataList.forEach(item => {
        const txns = window.storage.get(`${this.currentTab}-${item.id}-transactions`) || [];
        sourceTxns = sourceTxns.concat(txns);
      });
    }
    sourceTxns.forEach(t => {
      if (t.date) {
        const parsed = this.parseTxnDate(t.date);
        if (parsed && parsed.year) yearSet.add(parsed.year);
      }
    });
    const years = Array.from(yearSet).sort((a, b) => b - a);

    // Initialize Transactions view pickers
    const txnDate = document.getElementById('txns-date-picker');
    if (txnDate && !txnDate.value) txnDate.value = todayStr;

    const txnMonth = document.getElementById('txns-month-select');
    if (txnMonth) txnMonth.value = String(now.getMonth() + 1);

    const txnMonthYear = document.getElementById('txns-month-year-select');
    if (txnMonthYear) {
      if (txnMonthYear.options.length === 0) {
        txnMonthYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      }
      txnMonthYear.value = String(now.getFullYear());
    }

    const txnYear = document.getElementById('txns-year-picker');
    if (txnYear) {
      if (txnYear.options.length === 0) {
        txnYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      }
      txnYear.value = String(now.getFullYear());
    }

    // Initialize Companies view pickers
    const compDate = document.getElementById('comp-date-picker');
    if (compDate && !compDate.value) compDate.value = todayStr;

    const compMonth = document.getElementById('comp-month-select');
    if (compMonth) compMonth.value = String(now.getMonth() + 1);

    const compMonthYear = document.getElementById('comp-month-year-select');
    if (compMonthYear) {
      if (compMonthYear.options.length === 0) {
        compMonthYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      }
      compMonthYear.value = String(now.getFullYear());
    }

    const compYear = document.getElementById('comp-year-picker');
    if (compYear) {
      if (compYear.options.length === 0) {
        compYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      }
      compYear.value = String(now.getFullYear());
    }
  },

  parseTxnDate(dateStr) {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
          dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        };
      }
    } catch (e) {}

    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return {
        year: parseInt(m[1]),
        month: parseInt(m[2]),
        day: parseInt(m[3]),
        dateStr: `${m[1]}-${m[2]}-${m[3]}`
      };
    }
    return null;
  },

  updateTransactionsStats(filteredTxns) {
    if (!this.fullTxnHistory) return;
    const txns = filteredTxns || this.fullTxnHistory;

    let totalPurchaseAmount = 0;
    let totalOrders = 0;
    txns.forEach(t => {
      if (t.type === 'purchase') {
        totalPurchaseAmount += (t.amount || 0);
        totalOrders += 1;
      }
    });

    const totalSupplierBalance = (this.dataList || []).reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalCompanies = (this.dataList || []).length;

    const statTotal = document.getElementById('txns-stat-total');
    if (statTotal) statTotal.textContent = app.formatCurrency(totalPurchaseAmount);

    const statOrders = document.getElementById('txns-stat-orders');
    if (statOrders) statOrders.textContent = totalOrders;

    const statBalance = document.getElementById('txns-stat-balance');
    if (statBalance) statBalance.textContent = app.formatCurrency(totalSupplierBalance);

    const statCompanies = document.getElementById('txns-stat-companies');
    if (statCompanies) statCompanies.textContent = totalCompanies;

    const totalLabel = document.getElementById('txns-stat-total-label');
    const ordersLabel = document.getElementById('txns-stat-orders-label');
    if (totalLabel) {
      if (this.currentTxnPeriod === 'day') totalLabel.textContent = 'Purchases Today';
      else if (this.currentTxnPeriod === 'month') totalLabel.textContent = 'Purchases This Month';
      else if (this.currentTxnPeriod === 'year') totalLabel.textContent = 'Purchases This Year';
      else totalLabel.textContent = 'Total Purchases';
    }
    if (ordersLabel) {
      if (this.currentTxnPeriod === 'day') ordersLabel.textContent = 'Orders Today';
      else if (this.currentTxnPeriod === 'month') ordersLabel.textContent = 'Orders This Month';
      else if (this.currentTxnPeriod === 'year') ordersLabel.textContent = 'Orders This Year';
      else ordersLabel.textContent = 'Total Orders';
    }
  },

  setTxnTypeFilter(type) {
    this.txnsFilterType = type;
    const select = document.getElementById('txns-type-select');
    if (select && select.value !== type) {
      select.value = type;
    }
    this.filterTransactions();
  },

  setTxnPeriodType(type) {
    this.currentTxnPeriod = type;
    document.getElementById('txns-daily-controls')?.classList.toggle('hidden', type !== 'day');
    document.getElementById('txns-monthly-controls')?.classList.toggle('hidden', type !== 'month');
    document.getElementById('txns-annual-controls')?.classList.toggle('hidden', type !== 'year');

    ['day', 'month', 'year', 'all'].forEach(t => {
      const btn = document.getElementById(`txns-period-${t}`);
      if (btn) {
        if (t === type) {
          btn.className = 'px-2 py-1 text-[11px] font-black rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer';
        } else {
          btn.className = 'px-2 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer';
        }
      }
    });

    this.filterTransactions();
    if (window.lucide) lucide.createIcons();
  },

  changeTxnDateStep(delta) {
    const input = document.getElementById('txns-date-picker');
    if (!input) return;
    let parts = input.value ? input.value.split('-').map(Number) : null;
    let d;
    if (parts && parts.length === 3 && !isNaN(parts[0])) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date();
    }
    d.setDate(d.getDate() + delta);
    input.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.filterTransactions();
  },

  setTxnToday() {
    const now = new Date();
    const input = document.getElementById('txns-date-picker');
    if (input) {
      input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      this.filterTransactions();
    }
  },

  changeTxnMonthStep(delta) {
    const mSelect = document.getElementById('txns-month-select');
    const ySelect = document.getElementById('txns-month-year-select');
    if (!mSelect || !ySelect) return;
    let m = parseInt(mSelect.value) || (new Date().getMonth() + 1);
    let y = parseInt(ySelect.value) || new Date().getFullYear();
    m += delta;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    let yOpt = Array.from(ySelect.options).find(o => parseInt(o.value) === y);
    if (!yOpt) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      ySelect.appendChild(opt);
    }
    ySelect.value = y;
    mSelect.value = m;
    this.filterTransactions();
  },

  setTxnThisMonth() {
    const now = new Date();
    const mSelect = document.getElementById('txns-month-select');
    const ySelect = document.getElementById('txns-month-year-select');
    if (mSelect) mSelect.value = now.getMonth() + 1;
    if (ySelect) ySelect.value = now.getFullYear();
    this.filterTransactions();
  },

  setCompPeriodType(type) {
    this.currentCompPeriod = type;
    document.getElementById('comp-daily-controls')?.classList.toggle('hidden', type !== 'day');
    document.getElementById('comp-monthly-controls')?.classList.toggle('hidden', type !== 'month');
    document.getElementById('comp-annual-controls')?.classList.toggle('hidden', type !== 'year');

    ['all', 'day', 'month', 'year'].forEach(t => {
      const btn = document.getElementById(`comp-period-${t}`);
      if (btn) {
        if (t === type) {
          btn.className = 'px-2 py-1 text-[11px] font-black rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer';
        } else {
          btn.className = 'px-2 py-1 text-[11px] font-black rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer';
        }
      }
    });

    this.applyFilters();
    if (window.lucide) lucide.createIcons();
  },

  changeCompDateStep(delta) {
    const input = document.getElementById('comp-date-picker');
    if (!input) return;
    let parts = input.value ? input.value.split('-').map(Number) : null;
    let d;
    if (parts && parts.length === 3 && !isNaN(parts[0])) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date();
    }
    d.setDate(d.getDate() + delta);
    input.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.applyFilters();
  },

  setCompToday() {
    const now = new Date();
    const input = document.getElementById('comp-date-picker');
    if (input) {
      input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      this.applyFilters();
    }
  },

  changeCompMonthStep(delta) {
    const mSelect = document.getElementById('comp-month-select');
    const ySelect = document.getElementById('comp-month-year-select');
    if (!mSelect || !ySelect) return;
    let m = parseInt(mSelect.value) || (new Date().getMonth() + 1);
    let y = parseInt(ySelect.value) || new Date().getFullYear();
    m += delta;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    let yOpt = Array.from(ySelect.options).find(o => parseInt(o.value) === y);
    if (!yOpt) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      ySelect.appendChild(opt);
    }
    ySelect.value = y;
    mSelect.value = m;
    this.applyFilters();
  },

  setCompThisMonth() {
    const now = new Date();
    const mSelect = document.getElementById('comp-month-select');
    const ySelect = document.getElementById('comp-month-year-select');
    if (mSelect) mSelect.value = now.getMonth() + 1;
    if (ySelect) ySelect.value = now.getFullYear();
    this.applyFilters();
  },

  clearTxnsSearch() {
    const input = document.getElementById('txns-main-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.filterTransactions();
  },

  filterTransactions() {
    if (!this.fullTxnHistory) return;
    const searchInput = document.getElementById('txns-main-search');
    const clearBtn = document.getElementById('txns-search-clear-btn');
    const query = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const typeFilter = document.getElementById('txns-type-select')?.value || this.txnsFilterType || 'all';
    this.txnsFilterType = typeFilter;
    const selDate = document.getElementById('txns-date-picker')?.value;

    let filtered = this.fullTxnHistory.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Period filter
      if (t.date && this.currentTxnPeriod !== 'all') {
        const parsed = this.parseTxnDate(t.date);
        if (parsed) {
          if (this.currentTxnPeriod === 'day' && selDate) {
            if (parsed.dateStr !== selDate) return false;
          } else if (this.currentTxnPeriod === 'month') {
            const targetM = parseInt(document.getElementById('txns-month-select')?.value);
            const targetY = parseInt(document.getElementById('txns-month-year-select')?.value);
            if (targetM && targetY) {
              if (parsed.year !== targetY || parsed.month !== targetM) return false;
            }
          } else if (this.currentTxnPeriod === 'year') {
            const targetY = parseInt(document.getElementById('txns-year-picker')?.value);
            if (targetY) {
              if (parsed.year !== targetY) return false;
            }
          }
        }
      }

      if (query) {
        const invPrefix = t.invoice_prefix || (this.currentTab === 'companies' ? 'CMP' : 'INV');
        const displayInvoice = t.invoice_no ? `${invPrefix}-${t.invoice_no}` : 'Legacy';
        const matchesInvoice = displayInvoice.toLowerCase().includes(query) || (t.invoice_no && String(t.invoice_no).includes(query));
        const matchesEntity = (t.entityName || '').toLowerCase().includes(query);
        const matchesAmount = (t.amount || '').toString().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        return matchesInvoice || matchesEntity || matchesAmount || matchesDesc;
      }

      return true;
    });

    if (query) {
      filtered.sort((a, b) => {
        const nameA = (a.entityName || '').toLowerCase();
        const nameB = (b.entityName || '').toLowerCase();
        const invA = (a.invoice_no ? `${a.invoice_prefix || ''}-${a.invoice_no}` : '').toLowerCase();
        const invB = (b.invoice_no ? `${b.invoice_prefix || ''}-${b.invoice_no}` : '').toLowerCase();

        const getScore = (name, inv) => {
          if (name.startsWith(query) || inv.startsWith(query)) return 1;
          const words = name.split(/[\s\-&/]+/);
          if (words.some(w => w.startsWith(query))) return 2;
          if (inv.includes(query)) return 3;
          return 4;
        };

        const scoreA = getScore(nameA, invA);
        const scoreB = getScore(nameB, invB);

        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }

        return new Date(b.date || 0) - new Date(a.date || 0);
      });
    }

    this.txnsPage = 1;
    this.renderTransactionsList(filtered);
    this.updateTransactionsStats(filtered);
  },

  renderTransactionsList(txns) {
    this._lastFilteredTxns = txns || [];
    const tbody = document.getElementById('main-txns-list');
    const footer = document.getElementById('txns-pagination-footer');
    if (!tbody) return;

    if (!txns || txns.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-12 text-center text-slate-400 font-bold italic">
            <div class="flex flex-col items-center justify-center gap-2">
              <i data-lucide="receipt" class="w-10 h-10 text-slate-300"></i>
              <p>No transactions found.</p>
            </div>
          </td>
        </tr>
      `;
      if (footer) footer.innerHTML = '';
      if (window.lucide) lucide.createIcons();
      return;
    }

    const total = txns.length;
    const totalPages = Math.ceil(total / this.txnsPageSize);
    if (this.txnsPage > totalPages) this.txnsPage = totalPages;
    if (this.txnsPage < 1) this.txnsPage = 1;

    const startIdx = (this.txnsPage - 1) * this.txnsPageSize;
    const endIdx = Math.min(startIdx + this.txnsPageSize, total);
    const paginated = txns.slice(startIdx, endIdx);

    tbody.innerHTML = paginated.map(t => {
      const invPrefix = t.invoice_prefix || (this.currentTab === 'companies' ? 'CMP' : 'INV');
      const displayInvoice = t.invoice_no ? `${invPrefix}-${t.invoice_no}` : 'Legacy';

      return `
        <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-200">
          <td class="px-4 py-1 text-xs font-bold text-slate-800 tabular-nums border-r border-slate-200">
            ${app.formatDateTime(t.date)}
          </td>
          <td class="px-4 py-1 text-xs font-bold text-slate-800 border-r border-slate-200">
            ${displayInvoice}
          </td>
          <td class="px-4 py-1 text-xs font-bold text-slate-800 border-r border-slate-200 uppercase tracking-tight">
            ${t.entityName}
          </td>
          <td class="px-4 py-1 border-r border-slate-200">
            <span class="px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${t.type === 'purchase' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}">
              ${t.type.toUpperCase()}
            </span>
          </td>
          <td class="px-4 py-1 text-right font-bold tabular-nums border-r border-slate-200 text-xs ${t.type === 'purchase' ? 'text-rose-600' : 'text-emerald-600'}">
            ${t.type === 'purchase' ? '+' : '-'} ${app.formatCurrency(t.amount)}
          </td>
          <td class="px-4 py-1 text-right font-bold text-slate-800 tabular-nums border-r border-slate-200 text-xs">
            ${t.balanceAfter !== undefined ? app.formatCurrency(t.balanceAfter) : '-'}
          </td>
          <td class="px-4 py-1 text-right font-medium">
            <div class="flex items-center justify-end gap-1.5 transition-opacity">
              <button onclick="Companies.viewTxnDetails('${t.id}', ${t.entityId})" class="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="View Details">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
              <button onclick="Companies.printVoucher('${t.id}', ${t.entityId})" class="p-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer" title="Print Voucher">
                <i data-lucide="printer" class="w-4 h-4"></i>
              </button>
              ${t.type === 'purchase' ? `
              <button onclick="Companies.editPurchase('${t.id}', ${t.entityId})" class="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer" title="Edit Purchase">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              ` : ''}
              <button onclick="Companies.handleDeleteTransaction('${t.id}', ${t.entityId})" class="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Delete Transaction">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (footer) {
      if (total <= this.txnsPageSize) {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500">
            <span>Showing all <span class="font-black text-slate-800">${total}</span> transaction${total === 1 ? '' : 's'}</span>
          </div>
        `;
      } else {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-600 flex-wrap gap-2 select-none">
            <div>
              Showing <span class="font-black text-slate-900">${startIdx + 1}</span> - <span class="font-black text-slate-900">${endIdx}</span> of <span class="font-black text-slate-900">${total}</span> transactions
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" ${this.txnsPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Companies.changeTxnsPage(' + (this.txnsPage - 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                <span>Prev</span>
              </button>
              <span class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-black">
                Page ${this.txnsPage} of ${totalPages}
              </span>
              <button type="button" ${this.txnsPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Companies.changeTxnsPage(' + (this.txnsPage + 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <span>Next</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  changeTxnsPage(page) {
    this.txnsPage = page;
    this.renderTransactionsList(this._lastFilteredTxns || []);
  },

  showNewPurchaseModal(companyId = null) {
    const modal = document.getElementById('new-purchase-modal');
    const list = document.getElementById('np-items-list');
    const totalEl = document.getElementById('np-grand-total');
    const targetLabel = document.getElementById('np-target-company');
    const idInput = document.getElementById('np-company-id');
    const selectEl = document.getElementById('np-company-select');
    const modalTitle = document.getElementById('np-modal-title');
    const submitPrintText = document.getElementById('np-submit-print-text');
    
    this.editingTxn = null;
    this.editingCompanyId = null;
    this._paidAmountUserModified = false;

    // Reset form
    document.getElementById('new-purchase-form').reset();
    list.innerHTML = '';
    totalEl.textContent = 'Rs. 0';
    const subtotalEl = document.getElementById('np-subtotal');
    if (subtotalEl) subtotalEl.textContent = 'Rs. 0';
    const discountInput = document.getElementById('np-discount');
    if (discountInput) discountInput.value = '';
    const paidInput = document.getElementById('np-paid-amount');
    if (paidInput) paidInput.value = '';
    if (modalTitle) modalTitle.textContent = 'New Purchase';
    if (submitPrintText) submitPrintText.textContent = 'Complete & Print (F9)';

    // Populate company selector dropdown
    if (selectEl) {
      selectEl.disabled = false;
      selectEl.innerHTML = `
        <option value="">-- Choose Supplier (Optional) --</option>
        ${(this.dataList || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      `;
    }

    if (companyId) {
      const company = (this.dataList || []).find(x => x.id === companyId);
      if (company) {
        if (idInput) idInput.value = company.id;
        if (selectEl) selectEl.value = company.id;
        if (targetLabel) targetLabel.textContent = `Supplier: ${company.name}`;
      }
    } else {
      if (idInput) idInput.value = '';
      if (selectEl) selectEl.value = '';
      if (targetLabel) targetLabel.textContent = 'No Supplier (Optional)';
    }
    
    // Add first row
    this.addPurchaseRow();
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons();

    // Reset scanner state & pre-load purchase products cache
    this._scanBuffer = '';
    this._lastScanTime = 0;
    this._isScanning = false;
    this.getPurchaseProducts().catch(() => {});

    // Attach global keyboard listener for F9 / Esc / Barcode scanner (capture phase)
    if (this._modalKeyHandler) {
      window.removeEventListener('keydown', this._modalKeyHandler, true);
    }
    this._modalKeyHandler = (e) => this.handleModalGlobalKeyDown(e);
    window.addEventListener('keydown', this._modalKeyHandler, true);

    // Auto-focus first input
    setTimeout(() => {
      const firstInput = document.querySelector('#np-items-list .np-item-name');
      if (firstInput) firstInput.focus();
    }, 60);
  },

  handleModalGlobalKeyDown(e) {
    const modal = document.getElementById('new-purchase-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
      e.preventDefault();
      this.confirmAndCompletePurchase(e);
      return;
    } else if (e.key === 'Escape') {
      const openDropdown = modal.querySelector('.np-search-results:not(.hidden)');
      if (openDropdown) {
        openDropdown.classList.add('hidden');
      } else {
        this.hideNewPurchaseModal();
      }
      return;
    }

    // Hardware Scanner Burst Stream Detection (< 55ms between keystrokes)
    const now = performance.now();
    const diff = now - (this._lastScanTime || 0);
    this._lastScanTime = now;

    if (diff > 55) {
      this._scanBuffer = '';
      this._isScanning = false;
      this._scanActiveEl = document.activeElement;
      this._scanActivePrevVal = this._scanActiveEl && (this._scanActiveEl.tagName === 'INPUT' || this._scanActiveEl.tagName === 'TEXTAREA')
        ? this._scanActiveEl.value
        : '';
    } else {
      if (this._scanBuffer.length >= 1) {
        this._isScanning = true;
        // Revert any character typed into qty or cost inputs before burst was confirmed
        if (this._scanActiveEl && (this._scanActiveEl.tagName === 'INPUT' || this._scanActiveEl.tagName === 'TEXTAREA')) {
          if (this._scanActiveEl.classList.contains('np-item-qty') || this._scanActiveEl.classList.contains('np-item-cost')) {
            this._scanActiveEl.value = this._scanActivePrevVal || '';
          }
        }
      }
    }

    if (e.key === 'Enter') {
      if (this._scanBuffer.length >= 3) {
        const scannedCode = this._scanBuffer.trim();
        this._scanBuffer = '';
        this._isScanning = false;
        e.preventDefault();
        e.stopPropagation();
        this.handlePurchaseBarcodeScan(scannedCode);
        return;
      }
      this._scanBuffer = '';
      this._isScanning = false;
    } else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (this._isScanning) {
        // Prevent scanner characters from leaking into active focused inputs
        e.preventDefault();
        e.stopPropagation();
      }
      this._scanBuffer += e.key;
    }
  },

  async handlePurchaseBarcodeScan(barcode) {
    if (!barcode) return;
    const cleanBc = String(barcode).trim();
    if (!cleanBc) return;

    const all = await this.getPurchaseProducts();
    let item = all.find(i => String(i.barcode || '').trim().toLowerCase() === cleanBc.toLowerCase());
    if (!item) {
      try {
        item = await window.api.findProductByBarcode(cleanBc);
      } catch (err) {}
    }

    if (!item) {
      if (window.app && typeof window.app.playBeep === 'function') {
        window.app.playBeep('error');
      }
      if (window.app && typeof window.app.showToast === 'function') {
        window.app.showToast(`Barcode "${cleanBc}" not found in stock`, 'error');
      }
      return;
    }

    if (window.app && typeof window.app.playBeep === 'function') {
      window.app.playBeep('success');
    }

    const list = document.getElementById('np-items-list');
    const rows = Array.from(list.querySelectorAll('.np-purchase-row'));

    // If item is already present in a row, increment qty and highlight it
    const itemKey = `${item.slug}_${item.id}`;
    const existingRow = rows.find(r => {
      const rId = r.querySelector('.np-item-id')?.value;
      const rSlug = r.querySelector('.np-item-slug')?.value;
      return rId && rSlug && `${rSlug}_${rId}` === itemKey;
    });

    if (existingRow) {
      const qtyInput = existingRow.querySelector('.np-item-qty');
      if (qtyInput) {
        const curQty = parseFloat(qtyInput.value) || 0;
        qtyInput.value = curQty + 1;
        this.calculateNewTxnTotal();
        setTimeout(() => {
          qtyInput.focus();
          qtyInput.select();
        }, 40);
        return;
      }
    }

    // Otherwise target the first available empty row
    let targetRow = null;
    const activeRow = document.activeElement ? document.activeElement.closest('.np-purchase-row') : null;
    if (activeRow) {
      const activeId = activeRow.querySelector('.np-item-id')?.value;
      if (!activeId) {
        targetRow = activeRow;
      }
    }

    if (!targetRow) {
      targetRow = rows.find(r => !r.querySelector('.np-item-id')?.value);
    }

    if (!targetRow) {
      this.addPurchaseRow();
      const updatedRows = Array.from(list.querySelectorAll('.np-purchase-row'));
      targetRow = updatedRows[updatedRows.length - 1];
    }

    this.selectItem(targetRow.id, item);
  },

  async getPurchaseProducts() {
    if (!this._purchaseAllProducts || this._purchaseAllProducts.length === 0) {
      try {
        this._purchaseAllProducts = await window.api.searchAllProducts('');
      } catch (e) {
        this._purchaseAllProducts = [];
      }
    }
    return this._purchaseAllProducts || [];
  },

  onPurchaseCompanyChange(companyId) {
    const idInput = document.getElementById('np-company-id');
    const targetLabel = document.getElementById('np-target-company');
    const cId = parseInt(companyId);
    const company = cId ? (this.dataList || []).find(c => c.id === cId) : null;
    if (company) {
      if (idInput) idInput.value = company.id;
      if (targetLabel) targetLabel.textContent = `Supplier: ${company.name}`;
    } else {
      if (idInput) idInput.value = '';
      if (targetLabel) targetLabel.textContent = 'No Supplier (Optional)';
    }
    this.calculateNewTxnTotal();
  },

  hideNewPurchaseModal() {
    this.editingTxn = null;
    this.editingCompanyId = null;
    this._paidAmountUserModified = false;
    this._scanBuffer = '';
    this._isScanning = false;
    this._purchaseAllProducts = null;
    const modal = document.getElementById('new-purchase-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    const modalTitle = document.getElementById('np-modal-title');
    if (modalTitle) modalTitle.textContent = 'New Purchase';
    const submitPrintText = document.getElementById('np-submit-print-text');
    if (submitPrintText) submitPrintText.textContent = 'Complete & Print (F9)';
    const saveOnlyText = document.getElementById('np-save-only-text');
    if (saveOnlyText) saveOnlyText.textContent = 'Save';
    const selectEl = document.getElementById('np-company-select');
    if (selectEl) selectEl.disabled = false;

    if (this._modalKeyHandler) {
      window.removeEventListener('keydown', this._modalKeyHandler, true);
      this._modalKeyHandler = null;
    }
  },

  async editPurchase(txnId, companyId) {
    const isDirect = !companyId || companyId === 0 || companyId === '0';
    const txnKey = isDirect ? `${this.currentTab}-direct-transactions` : `companies-${companyId}-transactions`;
    let transactions = window.storage.get(txnKey) || [];
    let txn = transactions.find(t => t.id === txnId);

    if (!txn && this.fullTxnHistory) {
      txn = this.fullTxnHistory.find(t => t.id === txnId);
    }
    if (!txn && this.dataList) {
      for (const comp of this.dataList) {
        const list = window.storage.get(`companies-${comp.id}-transactions`) || [];
        txn = list.find(t => t.id === txnId);
        if (txn) {
          companyId = comp.id;
          break;
        }
      }
    }
    if (!txn) {
      const directTxns = window.storage.get(`${this.currentTab}-direct-transactions`) || [];
      txn = directTxns.find(t => t.id === txnId);
      if (txn) companyId = 0;
    }

    if (!txn) {
      return app.showAlert("Transaction not found.");
    }
    if (txn.type !== 'purchase') {
      return app.showAlert("Only purchase transactions can be edited.");
    }

    this.editingTxn = JSON.parse(JSON.stringify(txn));
    this.editingCompanyId = (companyId !== undefined && companyId !== null) ? companyId : (txn.entityId || 0);
    this._paidAmountUserModified = true;

    const modal = document.getElementById('new-purchase-modal');
    const list = document.getElementById('np-items-list');
    const totalEl = document.getElementById('np-grand-total');
    const targetLabel = document.getElementById('np-target-company');
    const idInput = document.getElementById('np-company-id');
    const selectEl = document.getElementById('np-company-select');
    const modalTitle = document.getElementById('np-modal-title');
    const submitPrintText = document.getElementById('np-submit-print-text');
    const saveOnlyText = document.getElementById('np-save-only-text');

    document.getElementById('new-purchase-form').reset();
    list.innerHTML = '';
    totalEl.textContent = 'Rs. 0';

    const invPrefix = txn.invoice_prefix || 'CMP';
    const displayInvoice = txn.invoice_no ? `${invPrefix}-${txn.invoice_no}` : txn.id;
    if (modalTitle) modalTitle.textContent = `Edit Purchase (${displayInvoice})`;
    if (submitPrintText) submitPrintText.textContent = 'Update & Print';
    if (saveOnlyText) saveOnlyText.textContent = 'Update Purchase';

    // Populate company selector dropdown
    if (selectEl) {
      selectEl.disabled = false;
      selectEl.innerHTML = `
        <option value="">-- Choose Supplier (Optional) --</option>
        ${(this.dataList || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      `;
      const targetCid = (companyId && companyId !== '0' && companyId !== 0) ? String(companyId) : (txn.entityId ? String(txn.entityId) : '');
      selectEl.value = targetCid;
    }

    const cId = parseInt(selectEl?.value);
    const company = cId ? (this.dataList || []).find(c => c.id === cId) : null;
    if (company) {
      if (idInput) idInput.value = company.id;
      if (targetLabel) targetLabel.textContent = `Supplier: ${company.name}`;
    } else {
      if (idInput) idInput.value = '';
      if (targetLabel) targetLabel.textContent = 'No Supplier (Optional)';
    }

    // Populate rows with existing items
    if (txn.items && txn.items.length > 0) {
      txn.items.forEach(item => {
        this.addPurchaseRow(item);
      });
    } else {
      this.addPurchaseRow();
    }

    // Populate discount & paid amount
    const discountInput = document.getElementById('np-discount');
    if (discountInput) discountInput.value = (txn.discount && txn.discount > 0) ? txn.discount : '';

    const paidInput = document.getElementById('np-paid-amount');
    if (paidInput) paidInput.value = (txn.paid !== undefined && txn.paid !== null && txn.paid > 0) ? txn.paid : '';

    this.calculateNewTxnTotal();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons();

    // Reset scanner state & pre-load purchase products cache
    this._scanBuffer = '';
    this._lastScanTime = 0;
    this._isScanning = false;
    this.getPurchaseProducts().catch(() => {});

    if (this._modalKeyHandler) {
      window.removeEventListener('keydown', this._modalKeyHandler, true);
    }
    this._modalKeyHandler = (e) => this.handleModalGlobalKeyDown(e);
    window.addEventListener('keydown', this._modalKeyHandler, true);
  },

  addPurchaseRow(itemData = null) {
    const list = document.getElementById('np-items-list');
    const rowId = Date.now() + Math.random().toString(36).substr(2, 4);
    const div = document.createElement('div');
    div.id = `row-${rowId}`;
    div.className = 'np-purchase-row grid grid-cols-12 gap-2 items-center group animate-in slide-in-from-left-2 duration-150 py-1 border-b border-slate-100 last:border-none';

    const nameVal = itemData ? (itemData.name || '') : '';
    const qtyVal = itemData ? (itemData.qty !== undefined ? itemData.qty : '') : '';
    const costVal = itemData ? (itemData.box_cost !== undefined ? itemData.box_cost : (itemData.price !== undefined ? itemData.price : '')) : '';
    const itemIdVal = itemData ? (itemData.item_id || itemData.id || '') : '';
    const slugVal = itemData ? (itemData.slug || '') : '';
    const unitVal = itemData ? (itemData.unit || 'pcs') : 'pcs';
    const hasValue = !!nameVal;
    const isSelected = hasValue && (!!itemIdVal || !!slugVal);

    div.innerHTML = `
        <div class="col-span-6 relative">
            <input type="text" placeholder="Scan barcode or type name..." 
                   value="${nameVal ? nameVal.replace(/"/g, '&quot;') : ''}"
                   ${isSelected ? 'disabled' : ''}
                   onclick="Companies.handleItemSearch(this)" 
                   onfocus="Companies.handleItemSearch(this)" 
                   oninput="Companies.handleItemSearch(this); Companies.calculateNewTxnTotal();" 
                   onkeydown="Companies.handlePurchaseRowKeyDown(event, this, 'name')"
                   class="np-item-name w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs focus:bg-white focus:border-accent outline-none transition-all font-bold ${isSelected ? 'bg-slate-100 text-slate-700 font-black' : ''}">
            <div class="np-search-results hidden absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl z-[550] max-h-52 overflow-y-auto"></div>
            <button type="button" onclick="Companies.clearItemSearch(this)" class="np-clear-btn ${hasValue ? '' : 'hidden'} absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
            <input type="hidden" class="np-item-id" value="${itemIdVal}">
            <input type="hidden" class="np-item-slug" value="${slugVal}">
            <input type="hidden" class="np-item-unit" value="${unitVal}">
            <input type="hidden" class="np-item-original-stock">
            <input type="hidden" class="np-item-old-boxes" value="0">
        </div>
        <div class="col-span-2">
            <input type="number" placeholder="Qty" min="0.01" step="any" 
                   value="${qtyVal}"
                   onfocus="this.select()"
                   oninput="Companies.calculateNewTxnTotal()" 
                   onkeydown="Companies.handlePurchaseRowKeyDown(event, this, 'qty')"
                   class="np-item-qty w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-black focus:bg-amber-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition-all tabular-nums text-center">
        </div>
        <div class="col-span-2">
            <input type="number" placeholder="Cost / Unit" min="0" step="any" 
                   value="${costVal}"
                   onfocus="this.select()"
                   oninput="Companies.calculateNewTxnTotal()" 
                   onkeydown="Companies.handlePurchaseRowKeyDown(event, this, 'cost')"
                   class="np-item-cost w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-black focus:bg-amber-100 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition-all tabular-nums text-right">
        </div>
        <div class="col-span-2 flex items-center justify-end gap-1.5">
            <span class="np-item-line-total text-xs font-black text-slate-800 tabular-nums">Rs. 0</span>
            <button type="button" onclick="this.closest('.np-purchase-row').remove(); Companies.calculateNewTxnTotal();" class="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-all shrink-0 cursor-pointer" title="Remove Row">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `;
    list.appendChild(div);
    if (window.lucide) lucide.createIcons();
  },

  async handleItemSearch(input) {
    const query = input.value.trim();
    const rowContainer = input.parentElement;
    const currentRow = input.closest('.np-purchase-row') || rowContainer.parentElement;
    const resultsContainer = rowContainer.querySelector('.np-search-results');
    const clearBtn = rowContainer.querySelector('.np-clear-btn');

    if (query.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }

    // Hide any other active search dropdowns
    document.querySelectorAll('.np-search-results').forEach(el => {
      if (el !== resultsContainer) el.classList.add('hidden');
    });

    const all = await this.getPurchaseProducts();
    const q = query.toLowerCase();

    let items = [];
    if (!q) {
      items = [...all];
    } else {
      items = all.filter(i => {
        const name = (i.item_name || '').toLowerCase();
        const desc = (i.description || '').toLowerCase();
        const comp = (i.company_name || '').toLowerCase();
        const cat = (i.category_label || i.slug || '').toLowerCase();
        const bc = (i.barcode || '').toLowerCase();
        return name.includes(q) || desc.includes(q) || comp.includes(q) || cat.includes(q) || bc.includes(q);
      });

      // Fallback query to database if not in cache
      if (items.length === 0) {
        try {
          items = await window.api.searchAllProducts(query);
        } catch (e) {
          items = [];
        }
      }
    }
    
    // Priority sort by relevance: EXACT barcode match ALWAYS takes priority #0!
    items.sort((a, b) => {
      const bcA = String(a.barcode || '').trim().toLowerCase();
      const bcB = String(b.barcode || '').trim().toLowerCase();
      if (bcA === q && bcB !== q) return -1;
      if (bcB === q && bcA !== q) return 1;

      const nameA = (a.item_name || '').toLowerCase();
      const nameB = (b.item_name || '').toLowerCase();
      if (nameA === q && nameB !== q) return -1;
      if (nameB === q && nameA !== q) return 1;

      if (bcA.startsWith(q) && !bcB.startsWith(q)) return -1;
      if (bcB.startsWith(q) && !bcA.startsWith(q)) return 1;

      if (nameA.startsWith(q) && !nameB.startsWith(q)) return -1;
      if (nameB.startsWith(q) && !nameA.startsWith(q)) return 1;

      return (a.item_name || '').localeCompare(b.item_name || '');
    });

    // Filter out items already selected in other rows
    const selectedKeys = new Set();
    document.querySelectorAll('#np-items-list > div').forEach(row => {
      if (row === currentRow) return;
      const id = row.querySelector('.np-item-id')?.value;
      const slug = row.querySelector('.np-item-slug')?.value;
      if (id && slug) {
        selectedKeys.add(`${slug}_${id}`);
      } else if (id) {
        selectedKeys.add(String(id));
      }
    });

    const filteredItems = items.filter(item => {
      const key = `${item.slug}_${item.id}`;
      return !selectedKeys.has(key);
    });

    if (filteredItems.length === 0) {
        resultsContainer.innerHTML = `
          <div class="p-3 text-center text-xs text-slate-400 font-medium italic">
            ${query ? 'No matching items found' : 'All available stock items have already been selected'}
          </div>
        `;
        resultsContainer.classList.remove('hidden');
        return;
    }

    this._searchCache = this._searchCache || {};
    this._searchCache[currentRow.id] = filteredItems;
    currentRow._searchHighlightIdx = 0;

    resultsContainer.innerHTML = filteredItems.slice(0, 15).map((item, idx) => {
        const stockQty = item.current_stock || 0;
        const itemUnit = (item.unit || 'pcs').toUpperCase();
        return `
        <div id="np-search-opt-${currentRow.id}-${idx}" data-idx="${idx}" onclick="Companies.selectItemByIndex('${currentRow.id}', ${idx})" class="np-search-option p-2.5 cursor-pointer border-b border-slate-100 last:border-none transition-colors ${idx === 0 ? 'bg-amber-100 font-bold' : 'hover:bg-slate-100'}">
            <div class="flex justify-between items-center gap-2 mb-0.5">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">${item.item_name} ${item.company_name ? `<span class="text-blue-600 font-bold ml-1">(${item.company_name})</span>` : ''}</span>
                  ${item.barcode ? `<span class="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">#${item.barcode}</span>` : ''}
                </div>
                <div class="flex gap-1.5 items-center shrink-0">
                  <span class="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded whitespace-nowrap">Rs. ${(item.cost_price || 0).toLocaleString()} / ${itemUnit}</span>
                  <span class="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">${app.formatQty(stockQty)} ${itemUnit}</span>
                </div>
            </div>
            ${item.description ? `<p class="text-[10px] text-slate-400 font-medium truncate">${item.description}</p>` : ''}
        </div>
    `;}).join('');
    resultsContainer.classList.remove('hidden');
  },

  selectItemByIndex(rowId, idx) {
    const list = this._searchCache && this._searchCache[rowId];
    if (list && list[idx]) {
      this.selectItem(rowId, list[idx]);
    }
  },

  selectItem(rowId, item) {
    const row = document.getElementById(rowId);
    if (!row || !item) return;
    const input = row.querySelector('.np-item-name');
    const idInput = row.querySelector('.np-item-id');
    const slugInput = row.querySelector('.np-item-slug');
    const unitInput = row.querySelector('.np-item-unit');
    const stockInput = row.querySelector('.np-item-original-stock');
    const oldBoxesInput = row.querySelector('.np-item-old-boxes');
    const qtyInput = row.querySelector('.np-item-qty') || row.querySelector('.np-item-cartons');
    const costInput = row.querySelector('.np-item-cost') || row.querySelector('.np-item-carton-cost') || row.querySelector('.np-item-price');
    const resultsContainer = row.querySelector('.np-search-results');

    const unitStr = (item.unit || 'pcs').toUpperCase();

    if (input) {
      input.value = item.item_name + (item.company_name ? ` (${item.company_name})` : '');
      input.disabled = true;
      input.classList.add('bg-slate-100', 'text-slate-700', 'font-black');
    }
    
    if (idInput) idInput.value = item.id;
    if (slugInput) slugInput.value = item.slug;
    if (unitInput) unitInput.value = item.unit || 'pcs';
    if (stockInput) stockInput.value = app.formatQty(item.current_stock || 0);
    if (oldBoxesInput) oldBoxesInput.value = '0';

    if (qtyInput) {
      qtyInput.placeholder = `Qty (${unitStr})`;
      if (!qtyInput.value || parseFloat(qtyInput.value) <= 0) {
        qtyInput.value = '1';
      }
    }

    if (costInput) {
      costInput.placeholder = `Cost / ${unitStr}`;
      costInput.value = item.cost_price || '';
    }
    
    if (resultsContainer) resultsContainer.classList.add('hidden');
    this.calculateNewTxnTotal();

    // Auto-focus and select quantity field for fast keyboard entry (highlighted like sale tab)
    if (qtyInput) {
      setTimeout(() => {
        qtyInput.focus();
        qtyInput.select();
      }, 50);
    }

    // Auto-add a new empty row if all rows are now filled
    const allRowInputs = Array.from(document.querySelectorAll('#np-items-list .np-item-id'));
    const allFilled = allRowInputs.length > 0 && allRowInputs.every(el => el.value !== '');
    if (allFilled) {
        this.addPurchaseRow();
    }
  },

  clearItemSearch(btn) {
    const row = btn.closest('.np-purchase-row') || btn.parentElement.parentElement;
    const input = row.querySelector('.np-item-name');
    const idInput = row.querySelector('.np-item-id');
    const slugInput = row.querySelector('.np-item-slug');
    const unitInput = row.querySelector('.np-item-unit');
    const stockInput = row.querySelector('.np-item-original-stock');
    const oldBoxesInput = row.querySelector('.np-item-old-boxes');
    const qtyInput = row.querySelector('.np-item-qty') || row.querySelector('.np-item-cartons');
    const costInput = row.querySelector('.np-item-cost') || row.querySelector('.np-item-carton-cost') || row.querySelector('.np-item-price');
    const clearBtn = row.querySelector('.np-clear-btn');

    input.value = '';
    input.disabled = false;
    input.classList.remove('bg-slate-100', 'text-slate-500', 'font-black');
    
    idInput.value = '';
    slugInput.value = '';
    if (unitInput) unitInput.value = 'pcs';
    stockInput.value = '';
    if (oldBoxesInput) oldBoxesInput.value = '0';
    if (qtyInput) {
      qtyInput.value = '';
      qtyInput.placeholder = 'Qty';
    }
    if (costInput) {
      costInput.value = '';
      costInput.placeholder = 'Cost / Unit';
    }
    
    clearBtn.classList.add('hidden');
    this.calculateNewTxnTotal();
    input.focus();
  },

  async handlePurchaseRowKeyDown(e, input, fieldName) {
    const row = input.closest('.np-purchase-row');
    if (!row) return;
    const list = document.getElementById('np-items-list');
    const rows = Array.from(list.querySelectorAll('.np-purchase-row'));
    const rowIndex = rows.indexOf(row);
    const searchDropdown = row.querySelector('.np-search-results');
    const isDropdownOpen = searchDropdown && !searchDropdown.classList.contains('hidden') && searchDropdown.children.length > 0;

    if (fieldName === 'name') {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();

        const qVal = input.value.trim().toLowerCase();
        // Priority 1: Check for exact barcode match on Enter
        if (qVal) {
          const allProds = await this.getPurchaseProducts();
          let barcodeMatch = allProds.find(i => String(i.barcode || '').trim().toLowerCase() === qVal);
          if (!barcodeMatch) {
            try {
              barcodeMatch = await window.api.findProductByBarcode(input.value.trim());
            } catch (err) {}
          }
          if (barcodeMatch) {
            this.selectItem(row.id, barcodeMatch);
            return;
          }
        }

        if (isDropdownOpen) {
          const options = Array.from(searchDropdown.querySelectorAll('.np-search-option'));
          let highlightIdx = row._searchHighlightIdx !== undefined ? row._searchHighlightIdx : 0;
          const targetOpt = options[highlightIdx] || options[0];
          if (targetOpt) {
            const idx = parseInt(targetOpt.getAttribute('data-idx'), 10);
            this.selectItemByIndex(row.id, isNaN(idx) ? 0 : idx);
            return;
          }
        }
        if (input.disabled || input.value.trim() !== '') {
          const qtyInput = row.querySelector('.np-item-qty');
          if (qtyInput) {
            qtyInput.focus();
            qtyInput.select();
          }
        }
        return;
      }

      if (isDropdownOpen) {
        const options = Array.from(searchDropdown.querySelectorAll('.np-search-option'));
        let highlightIdx = row._searchHighlightIdx !== undefined ? row._searchHighlightIdx : 0;
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          highlightIdx = Math.min(options.length - 1, highlightIdx + 1);
          row._searchHighlightIdx = highlightIdx;
          this.updateSearchHighlight(row);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          highlightIdx = Math.max(0, highlightIdx - 1);
          row._searchHighlightIdx = highlightIdx;
          this.updateSearchHighlight(row);
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          searchDropdown.classList.add('hidden');
          return;
        }
      } else {
        if (e.key === 'ArrowRight') {
          if (input.disabled || input.value.trim() !== '') {
            e.preventDefault();
            const qtyInput = row.querySelector('.np-item-qty');
            if (qtyInput) {
              qtyInput.focus();
              qtyInput.select();
            }
          }
        } else if (e.key === 'ArrowDown') {
          if (rowIndex < rows.length - 1) {
            e.preventDefault();
            const nextName = rows[rowIndex + 1].querySelector('.np-item-name');
            if (nextName) {
              nextName.focus();
              if (!nextName.disabled) nextName.select();
            }
          }
        } else if (e.key === 'ArrowUp') {
          if (rowIndex > 0) {
            e.preventDefault();
            const prevName = rows[rowIndex - 1].querySelector('.np-item-name');
            if (prevName) {
              prevName.focus();
              if (!prevName.disabled) prevName.select();
            }
          }
        }
      }
    } else if (fieldName === 'qty') {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        const costInput = row.querySelector('.np-item-cost');
        if (costInput) {
          costInput.focus();
          costInput.select();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // Go back to the cost of the previous item (if any)
        if (rowIndex > 0) {
          const prevCost = rows[rowIndex - 1].querySelector('.np-item-cost');
          if (prevCost) {
            prevCost.focus();
            prevCost.select();
          }
        } else {
          const nameInput = row.querySelector('.np-item-name');
          if (nameInput && !nameInput.disabled) {
            nameInput.focus();
            nameInput.select();
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          const nextQty = rows[rowIndex + 1].querySelector('.np-item-qty');
          if (nextQty) {
            nextQty.focus();
            nextQty.select();
          }
        } else {
          document.getElementById('np-discount')?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (rowIndex > 0) {
          const prevQty = rows[rowIndex - 1].querySelector('.np-item-qty');
          if (prevQty) {
            prevQty.focus();
            prevQty.select();
          }
        }
      }
    } else if (fieldName === 'cost') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const qtyInput = row.querySelector('.np-item-qty');
        if (qtyInput) {
          qtyInput.focus();
          qtyInput.select();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          const nextRow = rows[rowIndex + 1];
          const nextName = nextRow.querySelector('.np-item-name');
          const nextQty = nextRow.querySelector('.np-item-qty');
          if (nextName && !nextName.disabled) {
            nextName.focus();
            nextName.select();
          } else if (nextQty) {
            nextQty.focus();
            nextQty.select();
          }
        } else {
          const discInput = document.getElementById('np-discount');
          if (discInput) {
            discInput.focus();
            discInput.select();
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          const nextCost = rows[rowIndex + 1].querySelector('.np-item-cost');
          if (nextCost) {
            nextCost.focus();
            nextCost.select();
          }
        } else {
          const discInput = document.getElementById('np-discount');
          if (discInput) {
            discInput.focus();
            discInput.select();
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (rowIndex > 0) {
          const prevCost = rows[rowIndex - 1].querySelector('.np-item-cost');
          if (prevCost) {
            prevCost.focus();
            prevCost.select();
          }
        }
      }
    }
  },

  handlePurchaseFooterKeyDown(e, field) {
    if (field === 'discount') {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        const paidInput = document.getElementById('np-paid-amount');
        if (paidInput) {
          paidInput.focus();
          paidInput.select();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const rows = document.querySelectorAll('#np-items-list .np-purchase-row');
        if (rows.length > 0) {
          const lastCost = rows[rows.length - 1].querySelector('.np-item-cost');
          if (lastCost) {
            lastCost.focus();
            lastCost.select();
          }
        }
      }
    } else if (field === 'paid') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const discInput = document.getElementById('np-discount');
        if (discInput) {
          discInput.focus();
          discInput.select();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.confirmAndCompletePurchase(e);
      }
    }
  },

  updateSearchHighlight(row) {
    const searchDropdown = row.querySelector('.np-search-results');
    if (!searchDropdown) return;
    const options = Array.from(searchDropdown.querySelectorAll('.np-search-option'));
    const highlightIdx = row._searchHighlightIdx || 0;
    options.forEach((opt, idx) => {
      if (idx === highlightIdx) {
        opt.classList.add('bg-amber-100', 'font-bold');
        opt.classList.remove('hover:bg-slate-100');
        opt.scrollIntoView({ block: 'nearest' });
      } else {
        opt.classList.remove('bg-amber-100', 'font-bold');
        opt.classList.add('hover:bg-slate-100');
      }
    });
  },

  onPaidAmountInput(input) {
    this._paidAmountUserModified = true;
    this.calculateNewTxnTotal();
  },

  calculateNewTxnTotal() {
    const rows = document.querySelectorAll('#np-items-list > div');
    let subtotal = 0;
    let validItemCount = 0;

    rows.forEach(row => {
        const nameInput = row.querySelector('.np-item-name');
        const qtyInput = row.querySelector('.np-item-qty') || row.querySelector('.np-item-cartons');
        const costInput = row.querySelector('.np-item-cost') || row.querySelector('.np-item-carton-cost') || row.querySelector('.np-item-price');
        const lineTotalEl = row.querySelector('.np-item-line-total');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
        const boxCost = parseFloat(costInput ? costInput.value : 0) || 0;
        
        const lineTotal = (name && qty > 0 && boxCost > 0) ? (qty * boxCost) : 0;

        if (lineTotalEl) lineTotalEl.textContent = app.formatCurrency(lineTotal);

        if (name && qty > 0 && boxCost > 0) {
            validItemCount++;
            subtotal += lineTotal;
        }
    });

    const isReady = validItemCount > 0 && subtotal > 0;

    const discountEl = document.getElementById('np-discount');
    let discount = parseFloat(discountEl?.value) || 0;
    if (discount < 0) {
      discount = 0;
      if (discountEl) discountEl.value = '';
    }
    if (subtotal > 0 && discount > subtotal) {
      discount = subtotal;
      if (discountEl) discountEl.value = subtotal;
    }
    if (discountEl) discountEl.max = subtotal;

    const total = Math.max(0, subtotal - discount);

    const paidEl = document.getElementById('np-paid-amount');
    if (!this._paidAmountUserModified) {
      // By default, show Paid amount as total amount that user can modify if paid less
      if (paidEl) {
        paidEl.value = total > 0 ? total : '';
      }
    }

    let paid = parseFloat(paidEl?.value);
    if (isNaN(paid) || paid < 0) {
      paid = 0;
    }
    if (this._paidAmountUserModified && paid > total) {
      paid = total;
      if (paidEl) paidEl.value = total > 0 ? total : '';
    }
    if (paidEl) paidEl.max = total;
    
    const subtotalEl = document.getElementById('np-subtotal');
    if (subtotalEl) subtotalEl.textContent = app.formatCurrency(subtotal);

    const totalEl = document.getElementById('np-grand-total');
    if (totalEl) totalEl.textContent = app.formatCurrency(total);
    
    const submitPrintBtn = document.getElementById('np-submit-print-btn');
    if (submitPrintBtn) {
        submitPrintBtn.disabled = !isReady;
        submitPrintBtn.style.opacity = isReady ? '1' : '0.5';
        submitPrintBtn.style.cursor = isReady ? 'pointer' : 'not-allowed';
    }
    const saveOnlyBtn = document.getElementById('np-save-only-btn');
    if (saveOnlyBtn) {
        saveOnlyBtn.disabled = !isReady;
        saveOnlyBtn.style.opacity = isReady ? '1' : '0.5';
        saveOnlyBtn.style.cursor = isReady ? 'pointer' : 'not-allowed';
    }
  },

  async confirmAndCompletePurchase(e, andPrint = true) {
    if (e) e.preventDefault();
    if (this.editingTxn) {
      const selectEl = document.getElementById('np-company-select');
      const idInput = document.getElementById('np-company-id');
      const companyId = parseInt(idInput?.value || selectEl?.value);
      const company = (companyId && !isNaN(companyId)) ? (this.dataList || []).find(c => c.id === companyId) : null;
      const supplierDisplayName = company ? company.name : 'Direct Purchase';

      const invPrefix = this.editingTxn.invoice_prefix || 'CMP';
      const invDisplay = this.editingTxn.invoice_no ? `${invPrefix}-${this.editingTxn.invoice_no}` : '';

      app.showConfirm({
        title: 'Update Purchase',
        message: `
          <div class="text-slate-600 text-sm">
            Are you sure you want to save changes to Purchase <span class="font-black text-slate-900">${invDisplay}</span>?
          </div>
          <div class="mt-2 text-xs text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            Stock quantities and supplier balance will be recalculated and updated accordingly.
          </div>
        `,
        confirmText: andPrint ? 'Update & Print' : 'Update Purchase',
        confirmColor: 'amber',
        onConfirm: async () => {
          await this.submitEditedPurchase(null, andPrint);
        }
      });
      return;
    }

    const selectEl = document.getElementById('np-company-select');
    const idInput = document.getElementById('np-company-id');
    const companyId = parseInt(idInput?.value || selectEl?.value);
    const rows = document.querySelectorAll('#np-items-list > div');
    
    const company = (companyId && !isNaN(companyId)) ? (this.dataList || []).find(c => c.id === companyId) : null;
    const supplierDisplayName = company ? company.name : 'Direct Purchase (No Supplier)';

    let subtotal = 0;
    let totalQty = 0;
    const itemsData = [];

    rows.forEach(row => {
      const nameInput = row.querySelector('.np-item-name');
      const qtyInput = row.querySelector('.np-item-qty') || row.querySelector('.np-item-cartons');
      const costInput = row.querySelector('.np-item-cost') || row.querySelector('.np-item-carton-cost') || row.querySelector('.np-item-price');
      const unitInput = row.querySelector('.np-item-unit');
      
      const name = nameInput ? nameInput.value.trim() : '';
      const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
      const boxCost = parseFloat(costInput ? costInput.value : 0) || 0;
      const unit = unitInput ? (unitInput.value || 'pcs') : 'pcs';
      
      if (name && qty > 0 && boxCost > 0) {
        const lineTotal = qty * boxCost;
        itemsData.push({ name, qty, unit, boxCost, lineTotal });
        subtotal += lineTotal;
        totalQty += qty;
      }
    });

    if (itemsData.length === 0 || subtotal <= 0) {
      return app.showAlert("Please add at least one item with quantity and price.");
    }

    const discountEl = document.getElementById('np-discount');
    let discount = parseFloat(discountEl?.value) || 0;
    discount = Math.max(0, Math.min(discount, subtotal));

    const finalTotal = Math.max(0, subtotal - discount);

    const paidEl = document.getElementById('np-paid-amount');
    let paidAmount = parseFloat(paidEl?.value) || 0;
    paidAmount = Math.max(0, Math.min(paidAmount, finalTotal));

    // Calculate balance after if supplier selected
    const netImpact = finalTotal - paidAmount;
    const newBalance = company ? ((company.amount || 0) + netImpact) : null;

    app.showConfirm({
      title: 'Confirm Purchase',
      message: `
        <div class="text-slate-600 text-sm">
          Are you sure you want to complete and record this purchase${company ? ` for <span class="font-black text-slate-900">${company.name}</span>` : ''}?
        </div>
        <div class="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-left text-slate-700">
          <div class="flex justify-between items-center">
            <span class="text-slate-500 font-bold">Supplier:</span>
            <span class="font-black text-slate-900">${supplierDisplayName}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500 font-bold">Total Items:</span>
            <span class="font-black text-slate-900">${itemsData.length} item${itemsData.length > 1 ? 's' : ''} (${totalQty} total qty)</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500 font-bold">Subtotal:</span>
            <span class="font-black text-slate-900">${app.formatCurrency(subtotal)}</span>
          </div>
          ${discount > 0 ? `
          <div class="flex justify-between items-center text-rose-600">
            <span class="font-bold">Discount:</span>
            <span class="font-black">-${app.formatCurrency(discount)}</span>
          </div>` : ''}
          <div class="flex justify-between items-center border-t border-slate-200 pt-1.5 font-black text-slate-900 text-sm">
            <span>Total:</span>
            <span class="text-base">${app.formatCurrency(finalTotal)}</span>
          </div>
          ${paidAmount > 0 ? `
          <div class="flex justify-between items-center text-emerald-600">
            <span class="font-bold">Paid Amount:</span>
            <span class="font-black">${app.formatCurrency(paidAmount)}</span>
          </div>` : ''}
          ${company ? `
          <div class="flex justify-between items-center border-t border-dashed border-slate-200 pt-1.5">
            <span class="text-slate-500 font-bold">Supplier Balance After:</span>
            <span class="font-black text-slate-900 text-sm">${app.formatCurrency(newBalance)}</span>
          </div>` : ''}
        </div>
      `,
      confirmText: andPrint ? 'Complete & Print' : 'Complete Purchase',
      confirmColor: 'green',
      onConfirm: async () => {
        await this.submitNewPurchase(null, andPrint);
      }
    });
  },

  async submitNewPurchase(e, andPrint = false) {
    if (e) e.preventDefault();
    const selectEl = document.getElementById('np-company-select');
    const idInput = document.getElementById('np-company-id');
    const companyId = parseInt(idInput?.value || selectEl?.value);
    const rows = document.querySelectorAll('#np-items-list > div');
    
    const company = (companyId && !isNaN(companyId)) ? (this.dataList || []).find(c => c.id === companyId) : null;
    const isDirect = !company;
    const supplierDisplayName = company ? company.name : 'Direct Purchase';

    let subtotal = 0;
    const details = [];
    const itemsData = [];
    const stockUpdates = [];

    rows.forEach(row => {
        const nameInput = row.querySelector('.np-item-name');
        const qtyInput = row.querySelector('.np-item-qty') || row.querySelector('.np-item-cartons');
        const costInput = row.querySelector('.np-item-cost') || row.querySelector('.np-item-carton-cost') || row.querySelector('.np-item-price');
        const idInput = row.querySelector('.np-item-id');
        const slugInput = row.querySelector('.np-item-slug');
        const unitInput = row.querySelector('.np-item-unit');

        const name = nameInput ? nameInput.value.trim() : '';
        const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
        const boxCost = parseFloat(costInput ? costInput.value : 0) || 0;
        const unit = unitInput ? (unitInput.value || 'pcs') : 'pcs';
        
        if (name && qty > 0 && boxCost > 0) {
            const lineTotal = qty * boxCost;

            details.push(`${name} (${qty} ${unit.toUpperCase()} @ Rs. ${boxCost.toLocaleString()}/${unit})`);
            itemsData.push({ 
                name, 
                qty,
                unit,
                price: boxCost,
                box_cost: boxCost, 
                lineTotal,
                item_id: idInput ? idInput.value : '',
                slug: slugInput ? slugInput.value : ''
            });
            subtotal += lineTotal;

            if (idInput && idInput.value && slugInput && slugInput.value) {
                stockUpdates.push({
                    id: idInput.value,
                    slug: slugInput.value,
                    qty: qty,
                    box_cost: boxCost
                });
            }
        }
    });

    if (itemsData.length === 0 || subtotal <= 0) {
        return app.showAlert("Please add at least one item with quantity and price.");
    }

    const discountEl = document.getElementById('np-discount');
    let discount = parseFloat(discountEl?.value) || 0;
    discount = Math.max(0, Math.min(discount, subtotal));

    const finalTotal = Math.max(0, subtotal - discount);

    const paidEl = document.getElementById('np-paid-amount');
    let paidAmount = parseFloat(paidEl?.value) || 0;
    paidAmount = Math.max(0, Math.min(paidAmount, finalTotal));

    if (paidEl) {
      paidEl.value = paidAmount > 0 ? paidAmount : '';
    }

    app.showLoading();
    try {
        const txnKey = isDirect ? `${this.currentTab}-direct-transactions` : `companies-${company.id}-transactions`;
        const transactions = window.storage.get(txnKey) || [];

        const netImpact = finalTotal - paidAmount;
        const newBalance = company ? ((company.amount || 0) + netImpact) : 0;
        
        // 1. Update Company Balance (if supplier selected)
        if (company) {
            await window.api.saveCompany({ ...company, amount: newBalance });
        }

        // 2. Save Transaction History
        const nextNoKey = `next-invoice-no-companies`;
        let nextNo = window.storage.get(nextNoKey);
        if (nextNo === null) {
            let totalTxns = 0;
            this.dataList.forEach(item => {
                const txns = window.storage.get(`companies-${item.id}-transactions`) || [];
                totalTxns += txns.length;
            });
            const directTxns = window.storage.get(`${this.currentTab}-direct-transactions`) || [];
            totalTxns += directTxns.length;
            nextNo = totalTxns + 1;
        }

        const newTxn = {
            id: Date.now().toString(),
            invoice_no: nextNo,
            invoice_prefix: 'CMP',
            type: 'purchase',
            amount: finalTotal,
            subtotal: subtotal,
            discount: discount,
            paid: paidAmount,
            entityName: supplierDisplayName,
            entityId: company ? company.id : 0,
            description: details.join(', ') + 
                (discount > 0 ? ` (Discount: ${app.formatCurrency(discount)})` : '') + 
                (paidAmount > 0 ? ` (Paid: ${app.formatCurrency(paidAmount)})` : ''),
            items: itemsData,
            date: new Date().toISOString(),
            balanceAfter: company ? newBalance : undefined
        };

        window.storage.set(nextNoKey, nextNo + 1);
        transactions.unshift(newTxn);
        window.storage.set(txnKey, transactions);

        // 3. Update Stock & Cost Price using Weighted Average Cost
        for (const update of stockUpdates) {
            await window.api.addProductStock({
                category: update.slug,
                productId: update.id,
                addedQty: update.qty,
                purchasePrice: update.box_cost,
                source: 'Purchase Invoice',
                notes: `Purchase Invoice #${nextNo} (${supplierDisplayName})`
            });
        }

        // 4. UI Update
        this.hideNewPurchaseModal();
        if (this.currentView === 'transactions') {
            await this.loadTransactions();
        } else {
            await this.loadCompanies();
        }

        if (andPrint) {
            await this.viewTxnDetails(newTxn.id, company ? company.id : 0);
        } else {
            app.showAlert({
                title: 'Purchase Recorded',
                message: `Purchase of ${app.formatCurrency(finalTotal)} recorded and stock updated.`,
                type: 'success'
            });
        }
    } catch (err) {
        console.error(err);
        app.showAlert("Error submitting transaction.");
    } finally {
        app.hideLoading();
    }
  },

  async submitEditedPurchase(e, andPrint = false) {
    if (e) e.preventDefault();
    if (!this.editingTxn) return;

    const oldTxn = this.editingTxn;
    const oldCompanyId = (this.editingCompanyId !== undefined && this.editingCompanyId !== null) ? this.editingCompanyId : (oldTxn.entityId || 0);

    const selectEl = document.getElementById('np-company-select');
    const idInput = document.getElementById('np-company-id');
    const newCompanyId = parseInt(idInput?.value || selectEl?.value) || 0;
    const rows = document.querySelectorAll('#np-items-list > div');
    
    const newCompany = (newCompanyId && !isNaN(newCompanyId)) ? (this.dataList || []).find(c => c.id === newCompanyId) : null;
    const isDirect = !newCompany;
    const supplierDisplayName = newCompany ? newCompany.name : 'Direct Purchase';

    let subtotal = 0;
    const details = [];
    const itemsData = [];

    rows.forEach(row => {
        const nameInput = row.querySelector('.np-item-name');
        const qtyInput = row.querySelector('.np-item-qty') || row.querySelector('.np-item-cartons');
        const costInput = row.querySelector('.np-item-cost') || row.querySelector('.np-item-carton-cost') || row.querySelector('.np-item-price');
        const idInput = row.querySelector('.np-item-id');
        const slugInput = row.querySelector('.np-item-slug');
        const unitInput = row.querySelector('.np-item-unit');

        const name = nameInput ? nameInput.value.trim() : '';
        const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
        const boxCost = parseFloat(costInput ? costInput.value : 0) || 0;
        const unit = unitInput ? (unitInput.value || 'pcs') : 'pcs';
        
        if (name && qty > 0 && boxCost > 0) {
            const lineTotal = qty * boxCost;

            details.push(`${name} (${qty} ${unit.toUpperCase()} @ Rs. ${boxCost.toLocaleString()}/${unit})`);
            itemsData.push({ 
                name, 
                qty,
                unit,
                price: boxCost,
                box_cost: boxCost, 
                lineTotal,
                item_id: idInput ? idInput.value : '',
                slug: slugInput ? slugInput.value : ''
            });
            subtotal += lineTotal;
        }
    });

    if (itemsData.length === 0 || subtotal <= 0) {
        return app.showAlert("Please add at least one item with quantity and price.");
    }

    const discountEl = document.getElementById('np-discount');
    let discount = parseFloat(discountEl?.value) || 0;
    discount = Math.max(0, Math.min(discount, subtotal));

    const finalTotal = Math.max(0, subtotal - discount);

    const paidEl = document.getElementById('np-paid-amount');
    let paidAmount = parseFloat(paidEl?.value) || 0;
    paidAmount = Math.max(0, Math.min(paidAmount, finalTotal));

    app.showLoading();
    try {
        // 1. Stock Adjustments (Delta between old items and new items)
        const deltaMap = new Map();

        // Old items in purchase: subtract their qty from stock delta
        (oldTxn.items || []).forEach(item => {
            const pId = item.item_id || item.id;
            const slug = item.slug;
            if (pId && slug) {
                const key = `${slug}:::${pId}`;
                const entry = deltaMap.get(key) || { slug, id: pId, deltaQty: 0, cost: 0, name: item.name };
                entry.deltaQty -= (parseFloat(item.qty) || 0);
                deltaMap.set(key, entry);
            }
        });

        // New items in purchase: add their qty to stock delta & capture new cost
        itemsData.forEach(item => {
            const pId = item.item_id || item.id;
            const slug = item.slug;
            if (pId && slug) {
                const key = `${slug}:::${pId}`;
                const entry = deltaMap.get(key) || { slug, id: pId, deltaQty: 0, cost: item.box_cost, name: item.name };
                entry.deltaQty += (parseFloat(item.qty) || 0);
                entry.cost = item.box_cost;
                deltaMap.set(key, entry);
            }
        });

        // Apply changes to database products
        for (const [key, info] of deltaMap.entries()) {
            try {
                const products = await window.api.getProducts(info.slug);
                const prod = (products || []).find(p => String(p.id) === String(info.id));
                if (prod) {
                    const currentStock = Number(prod.current_stock) || 0;
                    const updatedStock = Math.round(Math.max(0, currentStock + info.deltaQty) * 100) / 100;
                    const updatePayload = { current_stock: updatedStock };
                    if (info.cost > 0) {
                        updatePayload.cost_price = info.cost;
                        updatePayload.wholesale_cost_price = info.cost;
                    }
                    await window.api.updateProduct(info.slug, info.id, updatePayload);
                }
            } catch (err) {
                console.warn(`Could not adjust stock for ${info.name}:`, err);
            }
        }

        // 2. Adjust Supplier Balance
        const oldNetImpact = (oldTxn.amount || 0) - (oldTxn.paid || 0);
        const newNetImpact = finalTotal - paidAmount;
        let newBalance = undefined;

        const oldIsDirect = !oldCompanyId || oldCompanyId === 0 || oldCompanyId === '0';
        if (String(oldCompanyId) === String(newCompanyId)) {
            if (newCompany) {
                const balanceDiff = newNetImpact - oldNetImpact;
                newBalance = (newCompany.amount || 0) + balanceDiff;
                await window.api.saveCompany({ ...newCompany, amount: newBalance });
            }
        } else {
            // Supplier changed!
            if (!oldIsDirect) {
                const oldComp = (this.dataList || []).find(c => String(c.id) === String(oldCompanyId));
                if (oldComp) {
                    const reverted = (oldComp.amount || 0) - oldNetImpact;
                    await window.api.saveCompany({ ...oldComp, amount: reverted });
                }
            }
            if (newCompany) {
                newBalance = (newCompany.amount || 0) + newNetImpact;
                await window.api.saveCompany({ ...newCompany, amount: newBalance });
            }
        }

        // 3. Update Transaction Record in storage
        const updatedTxn = {
            ...oldTxn,
            amount: finalTotal,
            subtotal: subtotal,
            discount: discount,
            paid: paidAmount,
            entityName: supplierDisplayName,
            entityId: newCompany ? newCompany.id : 0,
            description: details.join(', ') + 
                (discount > 0 ? ` (Discount: ${app.formatCurrency(discount)})` : '') + 
                (paidAmount > 0 ? ` (Paid: ${app.formatCurrency(paidAmount)})` : ''),
            items: itemsData,
            balanceAfter: newCompany ? newBalance : undefined
        };

        const oldTxnKey = oldIsDirect ? `${this.currentTab}-direct-transactions` : `companies-${oldCompanyId}-transactions`;
        const newTxnKey = isDirect ? `${this.currentTab}-direct-transactions` : `companies-${newCompany.id}-transactions`;

        if (oldTxnKey === newTxnKey) {
            const transactions = window.storage.get(oldTxnKey) || [];
            const idx = transactions.findIndex(t => t.id === oldTxn.id);
            if (idx !== -1) {
                transactions[idx] = updatedTxn;
            } else {
                transactions.unshift(updatedTxn);
            }
            window.storage.set(oldTxnKey, transactions);
        } else {
            let oldTxns = window.storage.get(oldTxnKey) || [];
            oldTxns = oldTxns.filter(t => t.id !== oldTxn.id);
            window.storage.set(oldTxnKey, oldTxns);

            const newTxns = window.storage.get(newTxnKey) || [];
            newTxns.unshift(updatedTxn);
            window.storage.set(newTxnKey, newTxns);
        }

        // 4. Reset editing state & close modal
        this.editingTxn = null;
        this.editingCompanyId = null;
        this.hideNewPurchaseModal();

        // 5. Refresh UI
        if (this.currentView === 'transactions') {
            await this.loadTransactions();
        } else {
            await this.loadCompanies();
        }

        const histModal = document.getElementById('history-modal');
        if (histModal && !histModal.classList.contains('hidden')) {
            const reloadId = newCompany ? newCompany.id : (oldIsDirect ? null : oldCompanyId);
            if (reloadId) await this.showHistory(reloadId);
        }

        if (andPrint) {
            await this.viewTxnDetails(updatedTxn.id, newCompany ? newCompany.id : 0);
        } else {
            app.showAlert({
                title: 'Purchase Updated',
                message: `Purchase invoice #${updatedTxn.invoice_no} has been updated successfully.`,
                type: 'success'
            });
        }
    } catch (err) {
        console.error("Error updating purchase:", err);
        app.showAlert("Error updating purchase: " + err.message);
    } finally {
        app.hideLoading();
    }
  },

  async printVoucher(txnId, companyId) {
    const isDirect = !companyId || companyId === 0 || companyId === '0';
    const company = isDirect ? { id: 0, name: 'Direct Purchase', phone: '' } : this.dataList.find(c => c.id === companyId);
    if (!company) return;

    const txnKey = isDirect ? `${this.currentTab}-direct-transactions` : `${this.currentTab}-${company.id}-transactions`;
    const transactions = window.storage.get(txnKey) || [];
    const txn = transactions.find(t => t.id == txnId);
    if (!txn) return;

    app.showLoading();
    try {
        const settings = await window.api.getSettings();
        const printContainer = document.getElementById('voucher-print');
        
        const items = txn.items && txn.items.length > 0 ? txn.items : [{ name: txn.description || 'Purchase', price: txn.amount }];

        const txnIndex = transactions.findIndex(t => t.id == txnId);
        let invoiceDisplay = '';
        if (txn.invoice_no) {
            invoiceDisplay = `${txn.invoice_prefix || (this.currentTab === 'companies' ? 'CMP' : 'INV')}-${txn.invoice_no}`;
        } else {
            const invNo = transactions.length - txnIndex;
            const invPrefix = this.currentTab === 'companies' ? 'CMP' : 'INV';
            invoiceDisplay = `${invPrefix}-${invNo}`;
        }

        const rowHtml = items.map((item, i) => {
            const isLast = i === items.length - 1;
            const qVal = item.qty || item.total_boxes || 1;
            let uStr = (item.unit || '').trim().toUpperCase();
            if (uStr === 'PCS' && Math.abs(Number(qVal)) === 1) uStr = 'PC';
            const unitSuffix = uStr ? ` ${uStr}` : '';
            return `
            <tr style="border-bottom: ${isLast ? 'none' : '1px solid #000'}; font-size: 10.5px;">
                <td style="padding: 3px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000;">${i + 1}</td>
                <td style="padding: 3px 4px; text-align: left; font-weight: 800; word-break: break-word; line-height: 1.25; border-right: 1px solid #000;">
                    ${item.name}
                </td>
                <td style="padding: 3px 2px; text-align: center; font-weight: 800; white-space: nowrap; border-right: 1px solid #000;">${app.formatQty(qVal)}${unitSuffix}</td>
                <td style="padding: 3px 3px; text-align: right; font-weight: 600; white-space: nowrap; border-right: 1px solid #000;">${app.formatAmount(item.box_cost || item.price || item.carton_cost)}</td>
                <td style="padding: 3px 4px; text-align: right; font-weight: 800; white-space: nowrap;">${app.formatAmount(item.lineTotal || item.price)}</td>
            </tr>
            `;
        }).join('');

        const html = `
            <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace, sans-serif; color: #000; box-sizing: border-box; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 4px;">
                    <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${settings.company_name || 'DELICIOUS SUPERSTAR FOODS'}</h1>
                    <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">${settings.address || 'Hasan Abdal'}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
                        <div>Phone: ${settings.phone || '0315-6795995'}</div>
                    </div>
                    <div style="margin-top: 5px;">
                        <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">PURCHASE RECEIPT / VOUCHER</span>
                    </div>
                </div>
                
                <!-- Metadata -->
                <div style="font-size: 11px; line-height: 1.35; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
                    <div style="display: flex; justify-content: space-between;">
                        <span><b>INV #:</b> ${invoiceDisplay}</span>
                        <span><b>DATE:</b> ${app.formatDateTime(txn.date)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 1px;">
                        <span><b>SUPPLIER:</b> ${company.name}</span>
                        <span><b>TYPE:</b> ${txn.type.toUpperCase()}</span>
                    </div>
                    ${company.phone ? `<div style="display: flex; justify-content: space-between; margin-top: 1px;"><span><b>TEL:</b> ${company.phone}</span></div>` : ''}
                </div>

                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 10.5px; border: 1.5px solid #000;">
                    <thead>
                        <tr style="border-bottom: 1.5px solid #000; font-size: 10px; font-weight: 900; text-transform: uppercase;">
                            <th style="padding: 4px 2px; text-align: center; width: 7%; border-right: 1px solid #000;">#</th>
                            <th style="padding: 4px 4px; text-align: left; width: 45%; border-right: 1px solid #000;">ITEM</th>
                            <th style="padding: 4px 2px; text-align: center; width: 16%; border-right: 1px solid #000;">QTY</th>
                            <th style="padding: 4px 3px; text-align: right; width: 16%; border-right: 1px solid #000;">RATE</th>
                            <th style="padding: 4px 4px; text-align: right; width: 16%;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowHtml}
                    </tbody>
                </table>

                <!-- Summary Box -->
                <div style="border-top: 1px dashed #000; padding-top: 4px; font-size: 11.5px; line-height: 1.45;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>Subtotal:</span>
                        <span style="font-weight: 800;">${app.formatCurrency(txn.subtotal || txn.amount)}</span>
                    </div>
                    ${txn.discount > 0 ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>Discount:</span>
                        <span style="font-weight: 800;">-${app.formatCurrency(txn.discount)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 3px 0; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; margin-top: 3px; font-size: 13.5px; font-weight: 900;">
                        <span>NET TOTAL:</span>
                        <span>${app.formatCurrency(txn.amount)}</span>
                    </div>
                    ${(txn.paid && txn.paid > 0) ? `
                    <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                        <span>Paid Amount:</span>
                        <span style="font-weight: 700;">${app.formatCurrency(txn.paid)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Remaining Due:</span>
                        <span style="font-weight: 700;">${app.formatCurrency(Math.max(0, txn.amount - txn.paid))}</span>
                    </div>
                    ` : ''}
                    ${txn.balanceAfter !== undefined ? `
                    <div style="display: flex; justify-content: space-between; padding-top: 3px; margin-top: 3px; border-top: 1px dashed #000; font-weight: 700;">
                        <span>Supplier Balance After:</span>
                        <span>${app.formatCurrency(txn.balanceAfter)}</span>
                    </div>` : ''}
                </div>

                <!-- Footer -->
                <div style="border-top: 1px dashed #000; margin-top: 6px; padding-top: 5px; text-align: center;">
                    <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">*** Thank You For Shopping With Us! ***</div>
                    <div style="font-size: 9.5px; font-weight: 700; color: #1e293b; margin-top: 2px;">Please Visit Again!</div>
                </div>
            </div>
        `;

        app.setPrintContent('voucher-print', html);
        app.hideLoading();
        await app.printReceipt();
    } catch (err) {
        console.error(err);
        app.hideLoading();
        app.showAlert("Error generating voucher.");
    }
  },

  async viewTxnDetails(txnId, companyId) {
    const isDirect = !companyId || companyId === 0 || companyId === '0';
    const company = isDirect ? { id: 0, name: 'Direct Purchase', phone: '' } : this.dataList.find(c => c.id === companyId);
    if (!company) return;

    const txnKey = isDirect ? `${this.currentTab}-direct-transactions` : `${this.currentTab}-${company.id}-transactions`;
    const transactions = window.storage.get(txnKey) || [];
    const txn = transactions.find(t => t.id == txnId);
    if (!txn) return;

    app.showLoading();
    try {
        const settings = await window.api.getSettings();
        const previewPaper = document.getElementById('preview-paper');
        const previewTitle = document.getElementById('preview-title');
        const previewSubtitle = document.getElementById('preview-subtitle');
        const modal = document.getElementById('preview-modal');

        const items = txn.items && txn.items.length > 0 ? txn.items : [{ name: txn.description || (txn.type === 'purchase' ? 'Purchase' : 'Payment'), price: txn.amount }];
        const txnIndex = transactions.findIndex(t => t.id == txnId);
        let invoiceDisplay = '';
        if (txn.invoice_no) {
            invoiceDisplay = `${txn.invoice_prefix || (this.currentTab === 'companies' ? 'CMP' : 'INV')}-${txn.invoice_no}`;
        } else {
            const invNo = transactions.length - txnIndex;
            const invPrefix = this.currentTab === 'companies' ? 'CMP' : 'INV';
            invoiceDisplay = `${invPrefix}-${invNo}`;
        }

        const rowHtml = items.map((item, i) => {
            const isLast = i === items.length - 1;
            const qVal = item.qty || item.total_boxes || 1;
            let uStr = (item.unit || '').trim().toUpperCase();
            if (uStr === 'PCS' && Math.abs(Number(qVal)) === 1) uStr = 'PC';
            const unitSuffix = uStr ? ` ${uStr}` : '';
            return `
            <tr style="border-bottom: ${isLast ? 'none' : '1px solid #000'}; font-size: 10.5px;">
                <td style="padding: 3px 2px; text-align: center; font-weight: 700; border-right: 1px solid #000;">${i + 1}</td>
                <td style="padding: 3px 4px; text-align: left; font-weight: 800; word-break: break-word; line-height: 1.25; border-right: 1px solid #000;">
                    ${item.name}
                </td>
                <td style="padding: 3px 2px; text-align: center; font-weight: 800; white-space: nowrap; border-right: 1px solid #000;">${app.formatQty(qVal)}${unitSuffix}</td>
                <td style="padding: 3px 3px; text-align: right; font-weight: 600; white-space: nowrap; border-right: 1px solid #000;">${app.formatAmount(item.box_cost || item.price || item.carton_cost)}</td>
                <td style="padding: 3px 4px; text-align: right; font-weight: 800; white-space: nowrap;">${app.formatAmount(item.lineTotal || item.price)}</td>
            </tr>
            `;
        }).join('');

        const html = `
            <div class="receipt-80mm" style="width: 100%; max-width: 80mm; margin: 0 auto; padding: 4px 6px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace, sans-serif; color: #000; box-sizing: border-box; font-size: 11px; line-height: 1.35; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 4px;">
                    <h1 style="font-size: 16px; font-weight: 900; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2;">${settings.company_name || 'DELICIOUS SUPERSTAR FOODS'}</h1>
                    <div style="font-size: 11px; font-weight: 600; color: #000; line-height: 1.25; margin-bottom: 2px;">${settings.address || 'Hasan Abdal'}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
                        <div>Phone: ${settings.phone || '0315-6795995'}</div>
                    </div>
                    <div style="margin-top: 5px;">
                        <span style="display: inline-block; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">PURCHASE RECEIPT / VOUCHER</span>
                    </div>
                </div>
                
                <!-- Metadata -->
                <div style="font-size: 11px; line-height: 1.35; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000;">
                    <div style="display: flex; justify-content: space-between;">
                        <span><b>INV #:</b> ${invoiceDisplay}</span>
                        <span><b>DATE:</b> ${app.formatDateTime(txn.date)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 1px;">
                        <span><b>SUPPLIER:</b> ${company.name}</span>
                        <span><b>TYPE:</b> ${txn.type.toUpperCase()}</span>
                    </div>
                    ${company.phone ? `<div style="display: flex; justify-content: space-between; margin-top: 1px;"><span><b>TEL:</b> ${company.phone}</span></div>` : ''}
                </div>

                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 10.5px; border: 1.5px solid #000;">
                    <thead>
                        <tr style="border-bottom: 1.5px solid #000; font-size: 10px; font-weight: 900; text-transform: uppercase;">
                            <th style="padding: 4px 2px; text-align: center; width: 7%; border-right: 1px solid #000;">#</th>
                            <th style="padding: 4px 4px; text-align: left; width: 45%; border-right: 1px solid #000;">ITEM</th>
                            <th style="padding: 4px 2px; text-align: center; width: 16%; border-right: 1px solid #000;">QTY</th>
                            <th style="padding: 4px 3px; text-align: right; width: 16%; border-right: 1px solid #000;">RATE</th>
                            <th style="padding: 4px 4px; text-align: right; width: 16%;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowHtml}
                    </tbody>
                </table>

                <!-- Summary Box -->
                <div style="border-top: 1px dashed #000; padding-top: 4px; font-size: 11.5px; line-height: 1.45;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>Subtotal:</span>
                        <span style="font-weight: 800;">${app.formatCurrency(txn.subtotal || txn.amount)}</span>
                    </div>
                    ${txn.discount > 0 ? `
                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>Discount:</span>
                        <span style="font-weight: 800;">-${app.formatCurrency(txn.discount)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 3px 0; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; margin-top: 3px; font-size: 13.5px; font-weight: 900;">
                        <span>NET TOTAL:</span>
                        <span>${app.formatCurrency(txn.amount)}</span>
                    </div>
                    ${(txn.paid && txn.paid > 0) ? `
                    <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                        <span>Paid Amount:</span>
                        <span style="font-weight: 700;">${app.formatCurrency(txn.paid)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Remaining Due:</span>
                        <span style="font-weight: 700;">${app.formatCurrency(Math.max(0, txn.amount - txn.paid))}</span>
                    </div>
                    ` : ''}
                    ${txn.balanceAfter !== undefined ? `
                    <div style="display: flex; justify-content: space-between; padding-top: 3px; margin-top: 3px; border-top: 1px dashed #000; font-weight: 700;">
                        <span>Supplier Balance After:</span>
                        <span>${app.formatCurrency(txn.balanceAfter)}</span>
                    </div>` : ''}
                </div>

                <!-- Footer -->
                <div style="border-top: 1px dashed #000; margin-top: 6px; padding-top: 5px; text-align: center;">
                    <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">*** Thank You For Shopping With Us! ***</div>
                    <div style="font-size: 9.5px; font-weight: 700; color: #1e293b; margin-top: 2px;">Please Visit Again!</div>
                </div>
            </div>
        `;

        previewPaper.innerHTML = html;
        previewTitle.textContent = `${txn.type.toUpperCase()} VOUCHER`;
        previewSubtitle.textContent = '80MM THERMAL RECEIPT • VOUCHER';
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Update Print Button Action
        const printBtn = document.getElementById('confirm-print-btn');
        if (printBtn) {
            printBtn.onclick = () => {
                app.closePreview();
                this.printVoucher(txnId, companyId);
            };
        }

        if (window.lucide) lucide.createIcons();

        app.hideLoading();
    } catch (err) {
        console.error(err);
        app.hideLoading();
        app.showAlert("Error viewing details.");
    }
  },

  async handleDeleteTransaction(txnId, companyId) {
    const isDirect = !companyId || companyId === 0 || companyId === '0';
    const company = isDirect ? { id: 0, name: 'Direct Purchase', phone: '', amount: 0 } : this.dataList.find(c => c.id === companyId);
    if (!company) return;

    const txnKey = isDirect ? `${this.currentTab}-direct-transactions` : `${this.currentTab}-${company.id}-transactions`;
    const transactions = window.storage.get(txnKey) || [];
    
    if (transactions.length === 0 || transactions[0].id !== txnId) {
        app.showAlert("Only the latest transaction can be deleted to maintain balance integrity.");
        return;
    }

    const txn = transactions[0];
    const netChange = (txn.type === 'purchase') ? ((txn.amount || 0) - (txn.paid || 0)) : -(txn.amount || 0);
    const revertedBalance = isDirect ? 0 : ((company.amount || 0) - netChange);

    app.verifyPassword({
      title: 'Delete Transaction Verification',
      message: 'Please enter password to delete this transaction:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Transaction',
          message: `Are you sure you want to delete the latest transaction (${txn.type}) of ${app.formatCurrency(txn.amount)}?${!isDirect ? `<br><br>This will revert the balance to <b>${app.formatCurrency(revertedBalance)}</b> and remove this record permanently.` : '<br><br>This will remove this record permanently.'}`,
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            try {
                // 1. Revert Balance (if supplier existed)
                if (!isDirect) {
                    let newBalance = (company.amount || 0) - netChange;
                    if (this.currentTab === 'companies') {
                        await window.api.saveCompany({ ...company, amount: newBalance });
                    } else {
                        await window.api.saveCustomer({ ...company, amount: newBalance });
                    }
                }

                // 2. Remove from storage
                transactions.shift();
                window.storage.set(txnKey, transactions);

                // 3. Revert Invoice No Counter (if applicable)
                const nextNoKey = `next-invoice-no-${this.currentTab}`;
                let nextNo = window.storage.get(nextNoKey);
                if (nextNo !== null && nextNo > 1) {
                    window.storage.set(nextNoKey, nextNo - 1);
                }

                // 4. Refresh UI
                if (this.currentView === 'transactions') {
                    await this.loadTransactions();
                } else {
                    await this.loadCompanies();
                }
                const histModal = document.getElementById('history-modal');
                if (histModal && !histModal.classList.contains('hidden')) {
                    await this.showHistory(companyId); 
                }
                
                app.showAlert({
                    title: 'Transaction Deleted',
                    message: 'Transaction has been successfully removed' + (!isDirect ? ' and balance reverted.' : '.'),
                    type: 'success'
                });
            } catch (err) {
                console.error(err);
                app.showAlert("Error deleting transaction: " + err.message);
            } finally {
                app.hideLoading();
            }
          }
        });
      }
    });
  }
};


