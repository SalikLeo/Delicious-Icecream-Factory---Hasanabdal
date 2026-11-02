const Expenses = {
  expenses: [],
  categories: [],
  currentPeriodType: 'day',
  currentPage: 1,
  pageSize: 50,
  currentFilteredExpenses: [],
  settings: {},

  getLocalDateStr(d = new Date()) {
    if (!d) return '';
    if (typeof d === 'string') {
      return d.split('T')[0];
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  async render(container, args) {
    const savedShowStats = window.storage.get('expenses_show_stats');
    const isStatsVisible = savedShowStats !== null ? Boolean(savedShowStats) : true;

    container.innerHTML = `
      <div class="flex justify-between items-center mb-6 no-print flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <i data-lucide="receipt" class="w-5 h-5"></i>
          </div>
          <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Factory Expenses</h2>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="Expenses.toggleStats()" id="exp-stats-toggle-btn" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
            <i data-lucide="${isStatsVisible ? 'eye-off' : 'eye'}" class="w-4 h-4 text-slate-400" id="exp-stats-toggle-icon"></i>
            <span id="exp-stats-toggle-text">${isStatsVisible ? 'Hide Stats' : 'Show Stats'}</span>
          </button>
          <div class="h-6 w-[1px] bg-slate-200 mx-1"></div>
          <button onclick="Expenses.printExpenses()" class="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-slate-900 cursor-pointer">
            <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i>
            <span>Print</span>
          </button>
          <button onclick="Expenses.openCategoryModal()" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
            <i data-lucide="tag" class="w-4 h-4 text-slate-400"></i>
            <span>Categories</span>
          </button>
          <button onclick="Expenses.openForm()" class="h-10 px-4 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4 stroke-[2.5]"></i>
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      <!-- Summary Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 ${isStatsVisible ? '' : 'hidden'}" id="exp-summary">
        <!-- Dynamically rendered -->
      </div>

      <!-- Unified Filter Controls Bar (Exact Sales History Design) -->
      <div class="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center flex-wrap no-print">
        <div class="relative flex-1 min-w-[200px]">
          <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="exp-search" oninput="Expenses.applyFilters()" placeholder="Search expenses by description, category, or person..." class="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-xs font-medium">
          <button type="button" id="exp-search-clear-btn" onclick="Expenses.clearSearch()" title="Clear search" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer hidden"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </div>
        
        <div class="flex gap-4 items-center pl-4 border-l border-slate-200 flex-wrap">
          <!-- Category Filter -->
          <div class="flex gap-2 items-center">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</label>
            <select id="exp-filter-cat" onchange="Expenses.applyFilters()" class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-white transition-all text-slate-700 outline-none cursor-pointer">
              <option value="All">All Categories</option>
            </select>
          </div>

          <!-- Sort Filter -->
          <div class="flex gap-2 items-center">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Sort</label>
            <select id="exp-sort" onchange="Expenses.applyFilters()" class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-white transition-all text-slate-700 outline-none cursor-pointer">
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount (High-Low)</option>
              <option value="amount_asc">Amount (Low-High)</option>
            </select>
          </div>

          <!-- Period controls -->
          <div class="flex gap-2 items-center flex-wrap">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Period</label>
            <div class="flex bg-slate-100 p-1 rounded-lg">
               <button id="exp-period-day-tab" onclick="Expenses.setPeriodType('day')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer">Daily</button>
               <button id="exp-period-month-tab" onclick="Expenses.setPeriodType('month')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Monthly</button>
               <button id="exp-period-year-tab" onclick="Expenses.setPeriodType('year')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">Annual</button>
               <button id="exp-period-all-tab" onclick="Expenses.setPeriodType('all')" class="px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer">All</button>
            </div>

            <!-- Daily navigation controls (Prev Day, Calendar Picker, Next Day, Today) -->
            <div id="exp-daily-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
               <button onclick="Expenses.changeDateStep(-1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Day">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <input type="date" id="exp-stats-date-picker" onchange="Expenses.applyFilters()" oninput="Expenses.applyFilters()" class="bg-transparent border-0 px-1 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               <button onclick="Expenses.changeDateStep(1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Day">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button onclick="Expenses.setToday()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer ml-0.5">Today</button>
            </div>

            <!-- Monthly navigation controls (Prev Month, Month Dropdown, Year Dropdown, Next Month, This Month) -->
            <div id="exp-monthly-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <button onclick="Expenses.changeMonthStep(-1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Previous Month">
                 <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
               </button>
               <select id="exp-stats-month-select" onchange="Expenses.applyFilters()" oninput="Expenses.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                 <option value="1">January</option>
                 <option value="2">February</option>
                 <option value="3">March</option>
                 <option value="4">April</option>
                 <option value="5">May</option>
                 <option value="6">June</option>
                 <option value="7">July</option>
                 <option value="8">August</option>
                 <option value="9">September</option>
                 <option value="10">October</option>
                 <option value="11">November</option>
                 <option value="12">December</option>
               </select>
               <select id="exp-stats-month-year-select" onchange="Expenses.applyFilters()" oninput="Expenses.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
               <button onclick="Expenses.changeMonthStep(1)" class="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer" title="Next Month">
                 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
               </button>
               <button onclick="Expenses.setThisMonth()" class="px-2 py-1 text-[10px] font-black uppercase bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer ml-0.5">This Month</button>
            </div>

            <!-- Annual controls -->
            <div id="exp-annual-controls" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
               <select id="exp-stats-year-picker" onchange="Expenses.applyFilters()" oninput="Expenses.applyFilters()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
               </select>
            </div>

            <button id="exp-clear-period-btn" onclick="Expenses.resetPeriodToDefault()" class="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-md transition-all hidden cursor-pointer" title="Reset to Daily (Today)">
               <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Expenses Table Container -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 flex flex-col">
        <div class="overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
          <table class="w-full text-sm text-left border-collapse border-b border-slate-200">
            <thead class="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[11px] font-black tracking-wider sticky top-0 z-10 shadow-sm">
              <tr class="border-b border-slate-200">
                <th class="px-2 py-2 border-r border-slate-200 text-center w-10 bg-slate-50 text-slate-400 font-black text-[13px]">#</th>
                <th class="px-4 py-2 border-r border-slate-200 bg-amber-50 text-amber-700 font-black text-[11px] uppercase tracking-wider">Date</th>
                <th class="px-4 py-2 border-r border-slate-200 bg-indigo-50 text-indigo-700 font-black text-[11px] uppercase tracking-wider">Category</th>
                <th class="px-4 py-2 border-r border-slate-200 bg-purple-50 text-purple-700 font-black text-[11px] uppercase tracking-wider">Description</th>
                <th class="px-4 py-2 text-right border-r border-slate-200 bg-red-50 text-red-700 font-black text-[11px] uppercase tracking-wider">Amount</th>
                <th class="px-4 py-2 text-right bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider no-print">Actions</th>
              </tr>
            </thead>
            <tbody id="expenses-list" class="divide-y divide-slate-200 bg-white">
            </tbody>
          </table>
        </div>
        <div id="expenses-pagination-footer" class="shrink-0"></div>
      </div>

      <!-- Expense Modal -->
      <div id="expense-modal" onclick="if(event.target === this) Expenses.closeForm()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all scale-95" id="expense-card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-slate-800" id="exp-modal-title">Add Expense</h3>
            <button onclick="Expenses.closeForm()" class="text-slate-400 hover:text-slate-600 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form id="exp-form" onsubmit="Expenses.saveForm(event)" class="space-y-4">
            <input type="hidden" id="exp-id">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="datetime-local" id="exp-date" required class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select id="exp-cat" required class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent">
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <input type="number" id="exp-amount" min="0" step="0.01" required class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <input type="text" id="exp-desc" required class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent">
            </div>
            <div class="pt-4 flex justify-end gap-3">
              <button type="button" onclick="Expenses.closeForm()" class="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors cursor-pointer">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-accent hover:bg-amber-500 text-slate-900 rounded-lg font-bold shadow transition-colors flex items-center gap-2 cursor-pointer"><i data-lucide="save" class="w-4 h-4"></i> Save Expense</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Category Management Modal -->
      <div id="cat-modal" onclick="if(event.target === this) Expenses.closeCategoryModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all scale-95" id="cat-card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-slate-800">Manage Categories</h3>
            <button onclick="Expenses.closeCategoryModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <div class="mb-4">
            <form id="cat-add-form" onsubmit="Expenses.addCategory(event)" class="flex gap-2">
              <input type="text" id="new-cat-name" placeholder="New Category Name" required class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent">
              <button type="submit" class="bg-accent hover:bg-amber-500 text-slate-900 font-bold px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer">Add</button>
            </form>
          </div>
          <div class="max-h-60 overflow-y-auto border border-slate-100 rounded-lg">
            <table class="w-full text-sm text-left">
              <tbody id="cats-list" class="divide-y divide-slate-100">
              </tbody>
            </table>
          </div>
          <div class="pt-4 flex justify-end">
            <button onclick="Expenses.closeCategoryModal()" class="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors cursor-pointer">Close</button>
          </div>
        </div>
      </div>
    `;

    try {
      await this.loadData();
      
      if (args && args.openForm) {
        setTimeout(() => this.openForm(), 100);
      }
    } catch(e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  },

  parseExpenseDate(dateStr) {
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

  async loadData() {
    this.expenses = await window.api.getExpenses() || [];
    this.categories = await window.api.getExpenseCategories() || [];
    this.settings = await window.api.getSettings() || {};
    
    const now = new Date();
    const datePicker = document.getElementById('exp-stats-date-picker');
    const monthSelect = document.getElementById('exp-stats-month-select');
    const monthYearSelect = document.getElementById('exp-stats-month-year-select');
    const yearPicker = document.getElementById('exp-stats-year-picker');
    
    if (datePicker) {
      datePicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    if (monthSelect) {
      monthSelect.value = now.getMonth() + 1;
    }
    
    const yearSet = new Set([now.getFullYear()]);
    this.expenses.forEach(e => {
      if (e.date) {
        const parsed = this.parseExpenseDate(e.date);
        if (parsed && parsed.year) yearSet.add(parsed.year);
      }
    });
    const years = Array.from(yearSet).sort((a, b) => b - a);

    if (monthYearSelect) {
      monthYearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      monthYearSelect.value = now.getFullYear();
    }

    if (yearPicker) {
      yearPicker.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      yearPicker.value = now.getFullYear();
    }

    this.updateDropdowns();
    this.setPeriodType('day');
  },

  toggleStats() {
    const container = document.getElementById('exp-summary');
    if (!container) return;
    container.classList.toggle('hidden');
    const isHidden = container.classList.contains('hidden');
    window.storage.set('expenses_show_stats', !isHidden);
    const textEl = document.getElementById('exp-stats-toggle-text');
    const iconEl = document.getElementById('exp-stats-toggle-icon');
    if (textEl) textEl.textContent = isHidden ? 'Show Stats' : 'Hide Stats';
    if (iconEl) iconEl.setAttribute('data-lucide', isHidden ? 'eye' : 'eye-off');
    if (window.lucide) lucide.createIcons();
  },

  updateSummary(list) {
    const summaryContainer = document.getElementById('exp-summary');
    if (!summaryContainer) return;

    let total = 0, salaries = 0;
    list.forEach(e => {
      total += (e.amount || 0);
      if (e.category?.toLowerCase().includes('salary')) {
        salaries += (e.amount || 0);
      }
    });
    const other = total - salaries;

    summaryContainer.innerHTML = `
      <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
        <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
        <p class="text-2xl font-black text-red-600 font-outfit tabular-nums">${app.formatCurrency(total)}</p>
      </div>
      <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
        <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">General / Other</p>
        <p class="text-2xl font-black text-blue-600 font-outfit tabular-nums">${app.formatCurrency(other)}</p>
      </div>
      <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
        <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Salaries (Paid)</p>
        <p class="text-2xl font-black text-emerald-600 font-outfit tabular-nums">${app.formatCurrency(salaries)}</p>
      </div>
    `;
  },

  updateDropdowns() {
    const filterSelect = document.getElementById('exp-filter-cat');
    const formSelect = document.getElementById('exp-cat');
    if (!filterSelect || !formSelect) return;
    
    const currentFilter = filterSelect.value;
    
    filterSelect.innerHTML = '<option value="All">All Categories</option>' + 
      this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    formSelect.innerHTML = this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    // Restore filter value if it still exists
    if (this.categories.find(c => c.name === currentFilter)) {
      filterSelect.value = currentFilter;
    }
  },

  clearSearch() {
    const input = document.getElementById('exp-search');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.applyFilters();
  },

  applyFilters() {
    const searchInput = document.getElementById('exp-search');
    const clearBtn = document.getElementById('exp-search-clear-btn');
    const term = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
      if ((searchInput?.value || '').length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const cat = document.getElementById('exp-filter-cat')?.value || 'All';
    const sortBy = document.getElementById('exp-sort')?.value || 'date_desc';
    const selDate = document.getElementById('exp-stats-date-picker')?.value;

    let filtered = this.expenses.filter(e => {
      const matchesSearch = !term || 
        (e.description || '').toLowerCase().includes(term) || 
        (e.category || '').toLowerCase().includes(term) ||
        (e.paid_by || '').toLowerCase().includes(term);

      const matchesCat = (cat === 'All' || e.category === cat);

      let matchesPeriod = true;
      if (e.date && this.currentPeriodType !== 'all') {
        const parsed = this.parseExpenseDate(e.date);
        if (parsed) {
          if (this.currentPeriodType === 'day' && selDate) {
            matchesPeriod = (parsed.dateStr === selDate);
          } else if (this.currentPeriodType === 'month') {
            const targetM = parseInt(document.getElementById('exp-stats-month-select')?.value);
            const targetY = parseInt(document.getElementById('exp-stats-month-year-select')?.value);
            if (targetM && targetY) {
              matchesPeriod = (parsed.year === targetY && parsed.month === targetM);
            }
          } else if (this.currentPeriodType === 'year') {
            const targetY = parseInt(document.getElementById('exp-stats-year-picker')?.value);
            if (targetY) {
              matchesPeriod = (parsed.year === targetY);
            }
          }
        }
      }
      return matchesSearch && matchesCat && matchesPeriod;
    });

    filtered.sort((a, b) => {
      if (term) {
        const descA = (a.description || '').toLowerCase();
        const descB = (b.description || '').toLowerCase();
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        const paidA = (a.paid_by || '').toLowerCase();
        const paidB = (b.paid_by || '').toLowerCase();

        const getScore = (desc, cat, paid) => {
          if (desc.startsWith(term)) return 1;
          if (desc.split(/[\s\-&/]+/).some(w => w.startsWith(term))) return 2;
          if (cat.startsWith(term) || paid.startsWith(term)) return 3;
          if (cat.split(/[\s\-&/]+/).some(w => w.startsWith(term)) || paid.split(/[\s\-&/]+/).some(w => w.startsWith(term))) return 4;
          return 5;
        };

        const scoreA = getScore(descA, catA, paidA);
        const scoreB = getScore(descB, catB, paidB);

        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
      }

      if (sortBy === 'date_desc') return (new Date(b.date || b.created_at) - new Date(a.date || a.created_at)) || (b.id - a.id);
      if (sortBy === 'date_asc') return (new Date(a.date || a.created_at) - new Date(b.date || b.created_at)) || (a.id - b.id);
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return 0;
    });

    this.currentPage = 1;
    this.currentFilteredExpenses = filtered;
    this.renderList(filtered);
    this.updateSummary(filtered);
    this.updateClearPeriodButton();
  },

  changePage(page) {
    this.currentPage = page;
    this.renderList(this.currentFilteredExpenses || []);
  },

  updateClearPeriodButton() {
    const btn = document.getElementById('exp-clear-period-btn');
    if (!btn) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selDate = document.getElementById('exp-stats-date-picker')?.value;

    const isDefaultDaily = (this.currentPeriodType === 'day' && selDate === todayStr);
    btn.classList.toggle('hidden', isDefaultDaily);
  },

  resetPeriodToDefault() {
    this.setToday();
    this.setPeriodType('day');
  },

  changeDateStep(delta) {
    const input = document.getElementById('exp-stats-date-picker');
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

  setToday() {
    const now = new Date();
    const input = document.getElementById('exp-stats-date-picker');
    if (input) {
      input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      this.applyFilters();
    }
  },

  changeMonthStep(delta) {
    const mSelect = document.getElementById('exp-stats-month-select');
    const ySelect = document.getElementById('exp-stats-month-year-select');
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

  setThisMonth() {
    const now = new Date();
    const mSelect = document.getElementById('exp-stats-month-select');
    const ySelect = document.getElementById('exp-stats-month-year-select');
    if (mSelect) mSelect.value = now.getMonth() + 1;
    if (ySelect) ySelect.value = now.getFullYear();
    this.applyFilters();
  },

  setPeriodType(type) {
    this.currentPeriodType = type;
    document.getElementById('exp-daily-controls')?.classList.toggle('hidden', type !== 'day');
    document.getElementById('exp-monthly-controls')?.classList.toggle('hidden', type !== 'month');
    document.getElementById('exp-annual-controls')?.classList.toggle('hidden', type !== 'year');
    
    ['day', 'month', 'year', 'all'].forEach(t => {
      const btn = document.getElementById(`exp-period-${t}-tab`);
      if (btn) {
        if (t === type) {
          btn.className = 'px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-white shadow-sm text-slate-800 cursor-pointer';
        } else {
          btn.className = 'px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-slate-700 cursor-pointer';
        }
      }
    });

    this.applyFilters();
    if (window.lucide) lucide.createIcons();
  },

  async printExpenses() {
    if (!this.settings || !this.settings.company_name) {
      try {
        this.settings = await window.api.getSettings();
      } catch (e) {
        console.error("Error fetching settings for expense receipt:", e);
      }
    }
    const settings = this.settings || {};

    const term = (document.getElementById('exp-search')?.value || '').toLowerCase().trim();
    const cat = document.getElementById('exp-filter-cat')?.value || 'All';
    const sortBy = document.getElementById('exp-sort')?.value || 'date_desc';
    const selDate = document.getElementById('exp-stats-date-picker')?.value;

    let list = this.expenses.filter(e => {
      const matchesSearch = !term || 
        (e.description || '').toLowerCase().includes(term) || 
        (e.category || '').toLowerCase().includes(term) ||
        (e.paid_by || '').toLowerCase().includes(term);

      const matchesCat = (cat === 'All' || e.category === cat);

      let matchesPeriod = true;
      if (e.date && this.currentPeriodType !== 'all') {
        const parsed = this.parseExpenseDate(e.date);
        if (parsed) {
          if (this.currentPeriodType === 'day' && selDate) {
            matchesPeriod = (parsed.dateStr === selDate);
          } else if (this.currentPeriodType === 'month') {
            const targetM = parseInt(document.getElementById('exp-stats-month-select')?.value);
            const targetY = parseInt(document.getElementById('exp-stats-month-year-select')?.value);
            if (targetM && targetY) {
              matchesPeriod = (parsed.year === targetY && parsed.month === targetM);
            }
          } else if (this.currentPeriodType === 'year') {
            const targetY = parseInt(document.getElementById('exp-stats-year-picker')?.value);
            if (targetY) {
              matchesPeriod = (parsed.year === targetY);
            }
          }
        }
      }
      return matchesSearch && matchesCat && matchesPeriod;
    });

    list.sort((a, b) => {
      if (sortBy === 'date_desc') return (new Date(b.date || b.created_at) - new Date(a.date || a.created_at)) || (b.id - a.id);
      if (sortBy === 'date_asc') return (new Date(a.date || a.created_at) - new Date(b.date || b.created_at)) || (a.id - b.id);
      if (sortBy === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'amount_asc') return (a.amount || 0) - (b.amount || 0);
      return 0;
    });

    const total = list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    let period = 'All Expenses';
    if (this.currentPeriodType === 'day') {
      period = `Daily (${selDate ? app.formatDateOnly(selDate) : 'Today'})`;
    } else if (this.currentPeriodType === 'month') {
      const m = parseInt(document.getElementById('exp-stats-month-select')?.value) || 1;
      const y = parseInt(document.getElementById('exp-stats-month-year-select')?.value) || new Date().getFullYear();
      period = `${monthNames[m - 1]} ${y}`;
    } else if (this.currentPeriodType === 'year') {
      const y = parseInt(document.getElementById('exp-stats-year-picker')?.value) || new Date().getFullYear();
      period = `Annual (${y})`;
    }

    const catTotals = {};
    list.forEach(e => {
      const c = e.category || 'General';
      catTotals[c] = (catTotals[c] || 0) + (Number(e.amount) || 0);
    });
    const catKeys = Object.keys(catTotals);

    const a5Html = `
      <div class="a5-container">
        <div class="a5-header" style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <div class="a5-title" style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000;">${settings.company_name || 'ICE CREAM FACTORY'}</div>
          <div class="a5-subtitle" style="font-size: 9px; font-weight: 500; color: #000; margin-top: 1px;">${settings.address || 'Wah Cantt / Taxila'} • Phones: ${settings.phone || '0309-5369472'}</div>
        </div>

        <div style="border: 1.5px solid #000; color: #000; background: #fff; text-align: center; padding: 3px 10px; font-size: 11px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase; margin: 4px 0 6px 0;">
          FACTORY EXPENSES REPORT
        </div>

        <div class="a5-meta-box" style="border: 1.5px solid #000; padding: 5px 8px; margin: 6px 0; display: flex; justify-content: space-between; font-size: 9px; line-height: 1.45; background: #fff; color: #000;">
          <div>
            <div><strong>Period:</strong> <span style="font-weight: 800;">${period}</span></div>
            <div><strong>Category:</strong> ${cat}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Generated:</strong> ${app.formatDateTime(new Date().toISOString())}</div>
            <div><strong>Total Entries:</strong> ${list.length} Items</div>
          </div>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px 5px; width: 6%; text-align: center; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">#</th>
              <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Expense / Description</th>
              <th style="border: 1px solid #000; padding: 4px 6px; width: 22%; text-align: left; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Category</th>
              <th style="border: 1px solid #000; padding: 4px 6px; width: 22%; text-align: right; font-weight: 900; font-size: 8.5px; text-transform: uppercase; color: #000; background: #fff;">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((e, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 3.5px 5px; text-align: center; font-size: 8.5px; font-weight: 700; color: #000;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 3.5px 6px; font-size: 9px; color: #000;">
                  <div style="font-weight: 800; line-height: 1.25;">${e.description || e.category || 'Expense'}</div>
                  <div style="font-size: 8px; color: #334155; margin-top: 1px;">
                    ${app.formatDateTime(e.date, e.created_at)}${e.paid_by ? ` • By: ${e.paid_by}` : ''}
                  </div>
                </td>
                <td style="border: 1px solid #000; padding: 3.5px 6px; font-size: 8.5px; font-weight: 600; color: #000;">${e.category || 'General'}</td>
                <td style="border: 1px solid #000; padding: 3.5px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; font-size: 9.5px; color: #000; white-space: nowrap;">
                  Rs. ${Math.round(e.amount).toLocaleString()}
                </td>
              </tr>
            `).join('')}
            ${list.length === 0 ? '<tr><td colspan="4" style="border: 1px solid #000; padding: 10px; text-align: center; color: #000;">No expenses recorded.</td></tr>' : ''}
          </tbody>
        </table>

        <div class="a5-summary-box" style="border: 1.5px solid #000; padding: 5px 8px; margin-top: 6px; font-size: 9.5px; background: #fff; color: #000;">
          <div class="a5-summary-row a5-total" style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px;">
            <span>TOTAL EXPENSES:</span>
            <span style="font-family: -apple-system, monospace;">Rs. ${Math.round(total).toLocaleString()}</span>
          </div>
        </div>

        ${(catKeys.length > 1 && list.length > 1) ? `
          <div style="margin-top: 10px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 3px; color: #000;">Category Breakdown</div>
            <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9px; background: #fff;">
              <tbody>
                ${catKeys.map(catName => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px 6px; font-weight: 700; color: #000;">${catName}</td>
                    <td style="border: 1px solid #000; padding: 3px 6px; text-align: right; font-weight: 800; font-family: -apple-system, monospace; color: #000; white-space: nowrap;">Rs. ${Math.round(catTotals[catName]).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="a5-signatures" style="margin-top: 28px; display: flex; justify-content: space-between;">
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Prepared By</div>
          <div class="a5-sig-line" style="border-top: 1.5px solid #000; width: 42%; text-align: center; font-size: 9.5px; padding-top: 4px; font-weight: 800; text-transform: uppercase;">Approved By</div>
        </div>
      </div>
    `;

    app.showA5Preview(a5Html, 'Expense Report (A5)');

    if (window.lucide) lucide.createIcons();
  },

  renderList(list) {
    this.currentFilteredExpenses = list || [];
    const tbody = document.getElementById('expenses-list');
    const footer = document.getElementById('expenses-pagination-footer');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 font-medium italic">No expenses found for this period.</td></tr>`;
      if (footer) footer.innerHTML = '';
      if (window.lucide) lucide.createIcons();
      return;
    }

    const total = list.length;
    const totalPages = Math.ceil(total / this.pageSize);
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, total);
    const paginated = list.slice(startIdx, endIdx);

    tbody.innerHTML = paginated.map((e, index) => `
      <tr class="hover:bg-slate-50 border-b border-slate-200 group transition-colors">
        <td class="px-2 py-1 border-r border-slate-200 text-center font-bold text-slate-400 tabular-nums text-xs">${startIdx + index + 1}</td>
        <td class="px-4 py-1 border-r border-slate-200 font-bold text-slate-800 text-xs whitespace-nowrap">${app.formatDateTime(e.date, e.created_at)}</td>
        <td class="px-4 py-1 border-r border-slate-200">
          <span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider">${e.category}</span>
        </td>
        <td class="px-4 py-1 border-r border-slate-200">
          <div class="text-slate-800 font-bold text-xs truncate max-w-[200px]">${e.description || '-'}</div>
          ${e.paid_by ? `<div class="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Paid by: ${e.paid_by}</div>` : ''}
        </td>
        <td class="px-4 py-1 text-right font-bold tabular-nums text-slate-800 border-r border-slate-200 text-xs">${app.formatCurrency(e.amount)}</td>
        <td class="px-4 py-1 text-right font-medium no-print">
          <div class="flex items-center justify-end gap-1.5 transition-opacity">
            <button onclick="Expenses.openFormById(${e.id})" class="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all cursor-pointer" title="Edit Expense"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
            <button onclick="Expenses.deleteExpense(${e.id})" class="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Delete Expense"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    if (footer) {
      if (total <= this.pageSize) {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500">
            <span>Showing all <span class="font-black text-slate-800">${total}</span> expense${total === 1 ? '' : 's'}</span>
          </div>
        `;
      } else {
        footer.innerHTML = `
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-600 flex-wrap gap-2 select-none">
            <div>
              Showing <span class="font-black text-slate-900">${startIdx + 1}</span> - <span class="font-black text-slate-900">${endIdx}</span> of <span class="font-black text-slate-900">${total}</span> expenses
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Expenses.changePage(' + (this.currentPage - 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                <span>Prev</span>
              </button>
              <span class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-black">
                Page ${this.currentPage} of ${totalPages}
              </span>
              <button type="button" ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'onclick="Expenses.changePage(' + (this.currentPage + 1) + ')" class="cursor-pointer hover:bg-slate-200 active:scale-95"'} class="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-bold transition-all flex items-center gap-1">
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

  openFormById(id) {
    const data = (this.expenses || []).find(x => x.id === id);
    this.openForm(data);
  },

  openForm(data = null) {
    const form = document.getElementById('exp-form');
    form.reset();
    
    if (data) {
      document.getElementById('exp-modal-title').textContent = 'Edit Expense';
      document.getElementById('exp-id').value = data.id;
      
      let dateVal = data.date;
      if (dateVal && !dateVal.includes('T')) {
        dateVal = dateVal + 'T00:00';
      } else if (dateVal) {
        dateVal = dateVal.substring(0, 16);
      }
      document.getElementById('exp-date').value = dateVal;
      
      document.getElementById('exp-cat').value = data.category;
      document.getElementById('exp-amount').value = data.amount;
      document.getElementById('exp-desc').value = data.description;
    } else {
      document.getElementById('exp-modal-title').textContent = 'Add Expense';
      document.getElementById('exp-id').value = '';
      
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      document.getElementById('exp-date').value = now.toISOString().slice(0, 16);
    }

    const modal = document.getElementById('expense-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      document.getElementById('expense-card').classList.remove('scale-95');
    }, 10);
  },

  closeForm() {
    const modal = document.getElementById('expense-modal');
    modal.classList.add('opacity-0');
    document.getElementById('expense-card').classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 200);
  },

  async saveForm(e) {
    e.preventDefault();
    const id = document.getElementById('exp-id').value;
    const data = {
      date: document.getElementById('exp-date').value,
      category: document.getElementById('exp-cat').value,
      amount: parseFloat(document.getElementById('exp-amount').value),
      description: document.getElementById('exp-desc').value
    };
    if (id) data.id = parseInt(id);

    app.showLoading();
    try {
      await window.api.saveExpense(data);
      this.closeForm();
      await this.loadData();
    } catch(err) {
      console.error(err);
    } finally {
      app.hideLoading();
    }
  },

  deleteExpense(id) {
    app.verifyPassword({
      title: 'Delete Expense Verification',
      message: 'Please enter password to delete this expense:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Expense',
          message: 'Are you sure you want to delete this expense?',
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            await window.api.deleteExpense(id);
            await this.loadData();
            app.hideLoading();
          }
        });
      }
    });
  },

  openCategoryModal() {
    this.renderCategories();
    const modal = document.getElementById('cat-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      document.getElementById('cat-card').classList.remove('scale-95');
    }, 10);
  },

  closeCategoryModal() {
    const modal = document.getElementById('cat-modal');
    modal.classList.add('opacity-0');
    document.getElementById('cat-card').classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 200);
  },

  renderCategories() {
    const tbody = document.getElementById('cats-list');
    tbody.innerHTML = this.categories.map(c => `
      <tr class="hover:bg-slate-50">
        <td class="px-4 py-2 font-medium text-slate-700">${c.name}</td>
        <td class="px-4 py-2 text-right">
          <button onclick="Expenses.deleteCategory(${c.id}, '${c.name}')" class="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors cursor-pointer">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `).join('');
    if (window.lucide) lucide.createIcons();
  },

  async addCategory(e) {
    e.preventDefault();
    const name = document.getElementById('new-cat-name').value;
    if (!name) return;

    app.showLoading();
    const result = await window.api.addExpenseCategory(name);
    if (result.error) {
      app.showAlert({
        title: 'Error',
        message: result.error
      });
    } else {
      document.getElementById('new-cat-name').value = '';
      this.categories = await window.api.getExpenseCategories();
      this.renderCategories();
      this.updateDropdowns();
    }
    app.hideLoading();
  },

  async deleteCategory(id, name) {
    app.verifyPassword({
      title: 'Delete Category Verification',
      message: `Please enter password to delete category "${name}":`,
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Category',
          message: `Are you sure you want to delete the "${name}" category? This will not delete expenses associated with it, but they will no longer match the filter.`,
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            await window.api.deleteExpenseCategory(id);
            this.categories = await window.api.getExpenseCategories();
            this.renderCategories();
            this.updateDropdowns();
            app.hideLoading();
          }
        });
      }
    });
  }
};
