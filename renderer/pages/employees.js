/**
 * Employees & Payroll Page
 * Staff Management, Salaries (Partial Payments) & Monthly Attendance Sheet (Excel Grid)
 */

const Employees = {
  activeSubTab: 'salaries', // 'salaries' | 'attendance' | 'history'
  selectedMonth: '', // 'YYYY-MM'
  searchQuery: '',
  statusFilter: 'all',
  paymentEmployeeFilter: 'all', // 'all' or employee_id
  paymentSearchQuery: '',
  paymentScope: 'month', // 'month' | 'all'
  allEmployees: [],
  employees: [],
  payments: [],
  attendanceData: null,
  _unlockedPastAttendance: false,
  container: null,

  async render(container, args = {}) {
    this.container = container;
    if (!this.selectedMonth) {
      this.selectedMonth = this.getCurrentMonth();
    }
    if (args && args.subTab) {
      this.activeSubTab = args.subTab;
    }
    if (args && args.employeeId) {
      this.paymentEmployeeFilter = String(args.employeeId);
    }

    // Preload records before rendering HTML so initial paint displays completed UI with zero flash
    try {
      this.employees = (await window.api.getEmployees({
        month: this.selectedMonth,
        status: this.statusFilter === 'all' ? null : this.statusFilter,
        search: this.searchQuery
      })) || [];
      this.allEmployees = (await window.api.getEmployees({
        month: this.selectedMonth
      })) || [];
      this.attendanceData = (await window.api.getMonthlyAttendance(this.selectedMonth)) || null;

      const paymentFilters = {};
      if (this.paymentScope !== 'all') paymentFilters.month = this.selectedMonth;
      if (this.paymentEmployeeFilter && this.paymentEmployeeFilter !== 'all') {
        paymentFilters.employee_id = Number(this.paymentEmployeeFilter);
      }
      this.payments = (await window.api.getSalaryPayments(paymentFilters)) || [];
    } catch (err) {
      console.error('Error preloading employee records:', err);
    }

    this.renderFullLayout();
  },

  renderFullLayout() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="space-y-4">
        <!-- Top Header & Navigation -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <i data-lucide="users" class="w-6 h-6 stroke-[2.2]"></i>
            </div>
            <div>
              <h1 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Employees &amp; Payroll
              </h1>
              <p class="text-xs font-semibold text-slate-500">
                Staff Management, Salaries &amp; Monthly Attendance Sheet
              </p>
            </div>
          </div>

          <!-- Top Action Controls -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Month Selector -->
            <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <span class="text-[10px] font-black uppercase text-slate-600 pl-1.5 select-none">Month</span>
              <select id="emp-month-select" onchange="Employees.onMonthChange(this.value)" class="bg-white border border-slate-200 shadow-2xs rounded-lg px-2.5 py-1 text-xs font-black text-slate-900 outline-none cursor-pointer">
                ${this.renderMonthOptions()}
              </select>
            </div>

            <!-- Red Cross Reset to Current Month -->
            <div id="emp-reset-filter-wrap" class="shrink-0 flex items-center">
              ${this.isFilteredFromCurrent() ? `
                <button type="button" onclick="Employees.resetToCurrent()" 
                        class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                        title="Go back to current month">
                  <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
                </button>
              ` : ''}
            </div>

            <!-- View Sub-Tabs -->
            <div class="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl border border-slate-300/70 shadow-inner">
              <button type="button" onclick="Employees.switchSubTab('salaries')" id="emp-tab-salaries"
                      class="px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${this.activeSubTab === 'salaries' ? 'bg-white shadow-xs border border-slate-200/80 text-slate-950' : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'}">
                <i data-lucide="wallet" class="w-3.5 h-3.5"></i>
                <span>Salaries</span>
              </button>
              <button type="button" onclick="Employees.switchSubTab('attendance')" id="emp-tab-attendance"
                      class="px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${this.activeSubTab === 'attendance' ? 'bg-white shadow-xs border border-slate-200/80 text-slate-950' : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'}">
                <i data-lucide="calendar-check" class="w-3.5 h-3.5"></i>
                <span>Attendance Sheet</span>
              </button>
              <button type="button" onclick="Employees.switchSubTab('history')" id="emp-tab-history"
                      class="px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${this.activeSubTab === 'history' ? 'bg-white shadow-xs border border-slate-200/80 text-slate-950' : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'}">
                <i data-lucide="history" class="w-3.5 h-3.5"></i>
                <span>Payments</span>
              </button>
            </div>

            <!-- Action Buttons -->
            <button type="button" onclick="Employees.printCurrentView()" class="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95" title="Print Current View">
              <i data-lucide="printer" class="w-3.5 h-3.5 text-slate-500"></i>
              <span class="hidden sm:inline">Print</span>
            </button>
            <button type="button" onclick="Employees.openPaySalaryModal()" class="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
              <i data-lucide="banknote" class="w-4 h-4"></i>
              <span>Pay Salary</span>
            </button>
            <button type="button" onclick="Employees.openAddEmployeeModal()" class="h-9 px-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
              <i data-lucide="user-plus" class="w-4 h-4 stroke-[2.5]"></i>
              <span>New Employee</span>
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div id="emp-kpi-container" class="grid grid-cols-2 md:grid-cols-4 gap-3">
          ${this.getKPIsHtml()}
        </div>

        <!-- Main Content Area -->
        <div id="emp-main-content">
          ${this.getActiveViewHtml()}
        </div>
      </div>

      <!-- Modals Container -->
      <div id="emp-modals-container"></div>
    `;

    if (window.lucide) lucide.createIcons({ root: this.container });
  },

  renderMonthOptions() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    let options = '';
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Generate past 12 months + next 2 months
    for (let y = curYear + 1; y >= curYear - 2; y--) {
      for (let m = 12; m >= 1; m--) {
        const val = `${y}-${String(m).padStart(2, '0')}`;
        const isSelected = val === this.selectedMonth;
        options += `<option value="${val}" ${isSelected ? 'selected' : ''}>${monthNames[m - 1]} ${y}</option>`;
      }
    }
    return options;
  },

  getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  isFilteredFromCurrent() {
    return Boolean(this.selectedMonth && this.selectedMonth !== this.getCurrentMonth());
  },

  async resetToCurrent() {
    this.selectedMonth = this.getCurrentMonth();
    const select = document.getElementById('emp-month-select');
    if (select) select.value = this.selectedMonth;
    this.updateResetButton();
    await this.loadData();
  },

  updateResetButton() {
    const wrap = document.getElementById('emp-reset-filter-wrap');
    if (wrap) {
      wrap.innerHTML = this.isFilteredFromCurrent() ? `
        <button type="button" onclick="Employees.resetToCurrent()" 
                class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95" 
                title="Go back to current month">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
        </button>
      ` : '';
      if (window.lucide) lucide.createIcons({ root: wrap });
    }
    const attWrap = document.getElementById('emp-att-reset-filter-wrap');
    if (attWrap) {
      attWrap.innerHTML = this.isFilteredFromCurrent() ? `
        <button type="button" onclick="Employees.resetToCurrent()" 
                class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95 ml-1" 
                title="Go back to current month">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
        </button>
      ` : '';
      if (window.lucide) lucide.createIcons({ root: attWrap });
    }
  },

  async onMonthChange(val) {
    this.selectedMonth = val;
    this.updateResetButton();
    await this.loadData();
  },

  async switchSubTab(tab) {
    this.activeSubTab = tab;
    // Update button states
    ['salaries', 'attendance', 'history'].forEach(t => {
      const btn = document.getElementById(`emp-tab-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 bg-white shadow-xs border border-slate-200/80 text-slate-950';
        } else {
          btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-slate-700 hover:text-slate-950 hover:bg-white/60';
        }
      }
    });

    await this.renderActiveView();
  },

  async loadData() {
    try {
      // 1. Load employees with salary info for this month
      this.employees = await window.api.getEmployees({
        month: this.selectedMonth,
        status: this.statusFilter === 'all' ? null : this.statusFilter,
        search: this.searchQuery
      });

      this.allEmployees = (await window.api.getEmployees({
        month: this.selectedMonth
      })) || [];

      // 2. Load attendance for this month
      this.attendanceData = await window.api.getMonthlyAttendance(this.selectedMonth);

      // 3. Load payments ledger
      const paymentFilters = {};
      if (this.paymentScope !== 'all') {
        paymentFilters.month = this.selectedMonth;
      }
      if (this.paymentEmployeeFilter && this.paymentEmployeeFilter !== 'all') {
        paymentFilters.employee_id = Number(this.paymentEmployeeFilter);
      }
      this.payments = (await window.api.getSalaryPayments(paymentFilters)) || [];

      this.renderKPIs();
      await this.renderActiveView();
    } catch (err) {
      console.error('Error loading employee data:', err);
      app.showAlert({ title: 'Error', message: 'Failed to load employee records: ' + (err.message || err) });
    }
  },

  renderKPIs() {
    const kpiBox = document.getElementById('emp-kpi-container');
    if (!kpiBox) return;
    kpiBox.innerHTML = this.getKPIsHtml();
    if (window.lucide) lucide.createIcons({ root: kpiBox });
  },

  getKPIsHtml() {
    const allEmps = this.employees || [];
    const activeEmps = allEmps.filter(e => e.status !== 'inactive');
    const totalStaff = allEmps.length;
    const activeCount = activeEmps.length;

    const totalPayroll = activeEmps.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    const totalPaid = allEmps.reduce((sum, e) => sum + (Number(e.paid_amount) || 0), 0);
    const totalRemaining = Math.max(0, totalPayroll - totalPaid);

    const [y, m] = (this.selectedMonth || '').split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthShort = monthNames[parseInt(m, 10) - 1] ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : (this.selectedMonth || '');

    return `
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase text-slate-500 tracking-wider">Total Employees</p>
          <h3 class="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">${activeCount} <span class="text-xs font-bold text-slate-600">Active</span></h3>
          <p class="text-[10.5px] font-bold text-slate-500 mt-0.5">${totalStaff} total staff registered</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
          <i data-lucide="users" class="w-5 h-5"></i>
        </div>
      </div>

      <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase text-slate-500 tracking-wider">Total Monthly Salary</p>
          <h3 class="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">Rs. ${Math.round(totalPayroll).toLocaleString()}</h3>
          <p class="text-[10.5px] font-bold text-slate-500 mt-0.5">Total salary of all staff</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
          <i data-lucide="wallet" class="w-5 h-5"></i>
        </div>
      </div>

      <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase text-slate-500 tracking-wider">Salary Paid (${monthShort})</p>
          <h3 class="text-2xl font-black text-emerald-600 mt-0.5 tabular-nums">Rs. ${Math.round(totalPaid).toLocaleString()}</h3>
          <p class="text-[10.5px] font-bold text-emerald-700/80 mt-0.5">Paid to staff this month</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
          <i data-lucide="badge-check" class="w-5 h-5"></i>
        </div>
      </div>

      <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase text-slate-500 tracking-wider">Remaining Salary (${monthShort})</p>
          <h3 class="text-2xl font-black ${totalRemaining > 0 ? 'text-amber-600' : 'text-slate-500'} mt-0.5 tabular-nums">Rs. ${Math.round(totalRemaining).toLocaleString()}</h3>
          <p class="text-[10.5px] font-bold ${totalRemaining > 0 ? 'text-amber-700/80' : 'text-slate-500'} mt-0.5">${totalRemaining > 0 ? 'Left to pay this month' : 'All salaries paid'}</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
          <i data-lucide="clock" class="w-5 h-5"></i>
        </div>
      </div>
    `;
  },

  getActiveViewHtml() {
    if (this.activeSubTab === 'salaries') {
      return this.getSalariesViewHtml();
    } else if (this.activeSubTab === 'attendance') {
      return this.getAttendanceViewHtml();
    } else if (this.activeSubTab === 'history') {
      return this.getHistoryViewHtml();
    }
    return '';
  },

  async renderActiveView() {
    const mainBox = document.getElementById('emp-main-content');
    if (!mainBox) return;
    mainBox.innerHTML = this.getActiveViewHtml();
    if (window.lucide) lucide.createIcons({ root: mainBox });
  },

  // -----------------------------------------------------------------------------------------
  // SUB-TAB 1: EMPLOYEES & SALARIES (PARTIAL PAYMENTS)
  // -----------------------------------------------------------------------------------------
  renderSalariesView(container) {
    if (container) container.innerHTML = this.getSalariesViewHtml();
  },

  getSalariesViewHtml() {
    const emps = this.employees || [];
    const [y, m] = (this.selectedMonth || '').split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthNames[parseInt(m, 10) - 1] ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : (this.selectedMonth || '');

    return `
      <div class="space-y-3">
        <!-- Filter & Search Bar -->
        <div class="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-2 w-full md:w-auto flex-1">
            <div class="relative flex-1 max-w-md">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="emp-search-input" value="${this.searchQuery}" oninput="Employees.onSearch(this.value)"
                     placeholder="Search staff by name, phone..."
                     class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition-all">
            </div>

            <select id="emp-status-filter" onchange="Employees.onStatusChange(this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer">
              <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Status</option>
              <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active Only</option>
              <option value="inactive" ${this.statusFilter === 'inactive' ? 'selected' : ''}>Inactive Only</option>
            </select>
          </div>

          <div class="text-[11px] font-bold text-slate-500 bg-amber-50/70 text-amber-900 border border-amber-200/70 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-600 shrink-0"></i>
            <span>Pay in advance or partial salary anytime. Excess amounts automatically carry over as Advance Salary for next months.</span>
          </div>
        </div>

        <!-- Table Container -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th class="py-3 px-3.5 text-center w-12 border-r border-slate-200">#</th>
                  <th class="py-3 px-3.5 border-r border-slate-200">Employee</th>
                  <th class="py-3 px-3.5 border-r border-slate-200">Contact</th>
                  <th class="py-3 px-3.5 text-center border-r border-slate-200">Attendance</th>
                  <th class="py-3 px-3.5 text-right border-r border-slate-200">Salary</th>
                  <th class="py-3 px-3.5 text-right border-r border-slate-200">Paid</th>
                  <th class="py-3 px-3.5 text-right border-r border-slate-200">Balance</th>
                  <th class="py-3 px-3.5 text-center w-24 border-r border-slate-200">Status</th>
                  <th class="py-3 px-3.5 text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                ${emps.length === 0 ? `
                  <tr>
                    <td colspan="9" class="py-12 text-center text-slate-400 font-bold">
                      <div class="flex flex-col items-center justify-center gap-2">
                        <i data-lucide="users" class="w-8 h-8 text-slate-300"></i>
                        <span>No employees found matching your criteria.</span>
                        <button type="button" onclick="Employees.openAddEmployeeModal()" class="mt-2 px-3 py-1.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xs">
                          + Add First Employee
                        </button>
                      </div>
                    </td>
                  </tr>
                ` : emps.map((e, idx) => {
                  const salary = Number(e.salary) || 0;
                  const paid = Number(e.paid_amount) || 0;
                  const remaining = Number(e.remaining_salary) || 0;
                  const isFullyPaid = e.is_fully_paid;
                  const paymentsCount = Number(e.payment_count) || 0;

                  // Find employee monthly attendance stats
                  const attRecord = this.attendanceData?.employees?.find(a => Number(a.id) === Number(e.id));
                  const attSum = attRecord?.summary || { present: 0, absent: 0, halfDay: 0, overtime: 0 };

                  return `
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      <td class="py-3 px-3.5 text-center text-slate-600 font-bold border-r border-slate-200">${idx + 1}</td>
                      <td class="py-3 px-3.5 border-r border-slate-200">
                        <div class="font-black text-slate-900">${e.full_name}</div>
                      </td>
                      <td class="py-3 px-3.5 border-r border-slate-200">
                        <div class="font-bold text-slate-700">${e.phone || '<span class="text-slate-300 italic">No phone</span>'}</div>
                        <div class="text-[10px] text-slate-500 font-semibold">Joined: ${e.date_joined ? app.formatDate(e.date_joined) : 'N/A'}</div>
                      </td>
                      <td class="py-3 px-3.5 text-center border-r border-slate-200">
                        <div class="inline-flex items-center justify-center gap-1 text-[11px] font-black tabular-nums select-none flex-wrap" title="Attendance stats for ${monthLabel}">
                          <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs" title="Present: ${attSum.present} days">
                            P: ${attSum.present}
                          </span>
                          <span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs" title="Absent: ${attSum.absent} days">
                            A: ${attSum.absent}
                          </span>
                          <span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs" title="Half Day: ${attSum.halfDay} days">
                            HD: ${attSum.halfDay}
                          </span>
                          <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs" title="Overtime: ${attSum.overtime} days${attSum.overtimeHours ? ` (${attSum.overtimeHours} hrs)` : ''}">
                            OT: ${attSum.overtime}${attSum.overtimeHours ? ` (${attSum.overtimeHours}h)` : ''}
                          </span>
                        </div>
                      </td>
                      <td class="py-3 px-3.5 text-right font-black text-slate-800 tabular-nums border-r border-slate-200">
                        Rs. ${Math.round(salary).toLocaleString()}
                        <div class="text-[10px] font-semibold text-slate-500">per month</div>
                      </td>
                      <td class="py-3 px-3.5 text-right tabular-nums border-r border-slate-200">
                        <div class="font-black ${paid > 0 ? 'text-emerald-600' : 'text-slate-500'}">
                          Rs. ${Math.round(paid).toLocaleString()}
                        </div>
                        ${paymentsCount > 0 ? `
                          <button type="button" onclick="Employees.viewEmployeePayments(${e.id})" class="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">
                            ${paymentsCount === 1 ? '1 Advance' : `${paymentsCount} Advances`}
                          </button>
                        ` : (Number(e.advance_applied) > 0 ? `
                          <div class="text-[10px] font-bold text-emerald-600">Covered by Advance</div>
                        ` : `
                          <div class="text-[10px] text-slate-300 italic">No payouts</div>
                        `)}
                      </td>
                      <td class="py-3 px-3.5 text-right tabular-nums border-r border-slate-200">
                        ${isFullyPaid ? `
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <i data-lucide="check-circle" class="w-3 h-3"></i> Fully Paid
                          </span>
                          ${Number(e.advance_remaining) > 0 ? `
                            <div class="text-[10.5px] font-black text-blue-600 mt-1">Advance: Rs. ${Math.round(e.advance_remaining).toLocaleString()}</div>
                          ` : ''}
                        ` : remaining > 0 && paid > 0 ? `
                          <div>
                            <span class="font-black text-amber-600 text-[13px]">Rs. ${Math.round(remaining).toLocaleString()}</span>
                            <div class="text-[10px] font-bold text-amber-700/80">Partial due</div>
                          </div>
                        ` : `
                          <div>
                            <span class="font-black text-rose-600 text-[13px]">Rs. ${Math.round(remaining).toLocaleString()}</span>
                            <div class="text-[10px] font-bold text-rose-700/80">Unpaid</div>
                          </div>
                        `}
                      </td>
                      <td class="py-3 px-3.5 text-center border-r border-slate-200">
                        <span class="px-2 py-0.5 text-[10.5px] font-black rounded-lg ${e.status === 'inactive' ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                          ${e.status === 'inactive' ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td class="py-3 px-3.5 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                          <button type="button" onclick="Employees.openPaySalaryModal(${e.id})" title="Pay Salary to ${e.full_name}"
                                  class="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs">
                            <i data-lucide="banknote" class="w-3.5 h-3.5"></i>
                            <span>Pay</span>
                          </button>
                          <button type="button" onclick="Employees.openEditEmployeeModal(${e.id})" title="Edit Employee"
                                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95">
                            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                          </button>
                          <button type="button" onclick="Employees.deleteEmployee(${e.id}, '${(e.full_name || '').replace(/'/g, "\\'")}')" title="Delete Employee"
                                  class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all cursor-pointer active:scale-95">
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
        </div>
      </div>
    `;
  },

  onSearch(val) {
    this.searchQuery = (val || '').trim();
    this.loadData();
  },

  onStatusChange(val) {
    this.statusFilter = val;
    this.loadData();
  },

  // -----------------------------------------------------------------------------------------
  // SUB-TAB 2: MONTHLY ATTENDANCE SHEET (EXCEL MATRIX VIEW)
  // -----------------------------------------------------------------------------------------
  renderAttendanceView(container) {
    if (container) container.innerHTML = this.getAttendanceViewHtml();
  },

  getAttendanceViewHtml() {
    const att = this.attendanceData || { daysInMonth: 30, employees: [] };
    const daysInMonth = att.daysInMonth || 30;
    const emps = (att.employees || []).filter(e => e.status !== 'inactive' || Object.keys(e.attendance || {}).length > 0);

    const [y, m] = (this.selectedMonth || '').split('-');
    const yearNum = parseInt(y, 10) || new Date().getFullYear();
    const monthNum = parseInt(m, 10) || (new Date().getMonth() + 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthNames[monthNum - 1] ? `${monthNames[monthNum - 1]} ${yearNum}` : (this.selectedMonth || '');

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hasPwd = this.hasActionPassword();

    return `
      <div class="space-y-3">
        <!-- Attendance Control & Legend Bar -->
        <div class="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button type="button" onclick="Employees.shiftMonth(-1)" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95" title="Previous Month">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            <div class="font-black text-slate-900 text-sm px-2">
              📅 ${monthLabel} Attendance Sheet
            </div>
            <button type="button" onclick="Employees.shiftMonth(1)" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95" title="Next Month">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
            <div id="emp-att-reset-filter-wrap" class="shrink-0 flex items-center">
              ${this.isFilteredFromCurrent() ? `
                <button type="button" onclick="Employees.resetToCurrent()" 
                        class="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs transition-all cursor-pointer active:scale-95 ml-1" 
                        title="Go back to current month">
                  <i data-lucide="x" class="w-4 h-4 stroke-[2.5]"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Status Legend -->
          <div class="flex flex-wrap items-center gap-1.5 text-xs font-bold select-none">
            <span class="text-[10.5px] font-black uppercase text-slate-600 mr-1">Legend:</span>
            <span class="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-black">P = Present</span>
            <span class="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-black">A = Absent</span>
            <span class="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-black">HD = Half Day</span>
            <span class="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-300 font-black">OT = Overtime</span>
            <span class="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 font-bold">· = Unmarked</span>
          </div>

          <!-- Quick Actions & Lock Status -->
          <div class="flex items-center gap-2">
            ${hasPwd ? `
              ${this._unlockedPastAttendance ? `
                <button type="button" onclick="Employees.relockPastAttendance()" class="h-8 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95" title="Past dates attendance is unlocked. Click to re-lock.">
                  <i data-lucide="unlock" class="w-3.5 h-3.5 text-emerald-600"></i>
                  <span>Past Unlocked</span>
                </button>
              ` : `
                <button type="button" onclick="Employees.unlockPastAttendance()" class="h-8 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95" title="Past dates attendance is locked. Click to enter 2nd password to unlock.">
                  <i data-lucide="lock" class="w-3.5 h-3.5 text-amber-600"></i>
                  <span>Past Locked</span>
                </button>
              `}
            ` : ''}

            <button type="button" onclick="Employees.markAllPresentToday()" class="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95" title="Mark all active staff Present for Today">
              <i data-lucide="check-check" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Mark All Present Today</span>
            </button>
          </div>
        </div>

        <!-- Excel-Like Matrix Table Container -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div class="overflow-x-auto max-h-[calc(100vh-320px)] custom-scrollbar">
            <table class="text-center border-separate border-spacing-0 text-xs select-none min-w-full">
              <thead>
                <tr class="bg-slate-100 text-[10.5px] font-black text-slate-700 tracking-wider uppercase">
                  <!-- Frozen Column: Index -->
                  <th class="py-2.5 px-1 text-center sticky left-0 z-20 bg-slate-100 border-b border-r border-slate-300 text-slate-500 font-black text-[10.5px] uppercase tracking-wider select-none"
                      style="width: 38px; min-width: 38px; max-width: 38px;">#</th>
                  <!-- Frozen Column: Employee -->
                  <th class="py-2.5 px-3 text-left sticky z-20 bg-slate-100 border-b border-r-2 border-slate-300 shadow-sm text-slate-800 font-black text-[10.5px] uppercase tracking-wider select-none"
                      style="left: 38px; width: 155px; min-width: 155px; max-width: 155px;">
                    Employee Name
                  </th>

                  <!-- Day Columns (1..daysInMonth) -->
                  ${Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${this.selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                    const dObj = new Date(yearNum, monthNum - 1, dayNum);
                    const dayOfWeek = dObj.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W...
                    const isToday = dateStr === todayStr;
                    const isSunday = dObj.getDay() === 0;
                    const isFriday = dObj.getDay() === 5;

                    return `
                      <th class="py-1 px-0.5 border-b border-r border-slate-200 select-none ${isToday ? 'bg-amber-100 text-amber-950 font-black border-l-2 border-r-2 border-amber-400 shadow-xs ring-1 ring-amber-400/50' : isSunday ? 'bg-slate-100/70 text-slate-500 font-bold' : isFriday ? 'bg-emerald-50/50 text-emerald-800 font-bold' : 'bg-slate-50 text-slate-600 font-bold'}"
                          style="width: 34px; min-width: 34px; max-width: 34px;" title="${dateStr}${isToday ? ' (Current Date - Today)' : ''}">
                        <div class="${isToday ? 'text-[12px] leading-tight font-black text-amber-950 bg-amber-200/70 rounded px-0.5 shadow-2xs' : 'text-[10.5px] leading-tight font-bold text-slate-700'}">${dayNum}</div>
                        <div class="${isToday ? 'text-[9px] font-black text-amber-800 uppercase leading-none mt-0.5' : 'text-[8.5px] font-semibold text-slate-400 uppercase leading-none mt-0.5'}">${dayOfWeek}</div>
                      </th>
                    `;
                  }).join('')}

                  <!-- Summary Columns -->
                  <th class="py-2.5 px-2 bg-emerald-100 text-emerald-950 border-b border-l-2 border-emerald-300 text-[11px] font-black select-none text-center"
                      style="width: 44px; min-width: 44px;" title="Total Present Days (P)">P</th>
                  <th class="py-2.5 px-2 bg-rose-100 text-rose-950 border-b border-l border-rose-300 text-[11px] font-black select-none text-center"
                      style="width: 44px; min-width: 44px;" title="Total Absent Days (A)">A</th>
                  <th class="py-2.5 px-2 bg-amber-100 text-amber-950 border-b border-l border-amber-300 text-[11px] font-black select-none text-center"
                      style="width: 44px; min-width: 44px;" title="Total Half Days (HD)">HD</th>
                  <th class="py-2.5 px-2 bg-blue-100 text-blue-950 border-b border-l border-blue-300 text-[11px] font-black select-none text-center"
                      style="width: 44px; min-width: 44px;" title="Total Overtime Days (OT)">OT</th>
                </tr>
              </thead>
              <tbody>
                ${emps.length === 0 ? `
                  <tr>
                    <td colspan="${daysInMonth + 6}" class="py-12 text-center text-slate-400 font-bold border-b border-slate-200">
                      No active employees found for attendance marking.
                    </td>
                  </tr>
                ` : emps.map((emp, idx) => {
                  const empAtt = emp.attendance || {};
                  const sum = emp.summary || { present: 0, absent: 0, halfDay: 0, overtime: 0 };

                  return `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <!-- Sticky index -->
                      <td class="py-1.5 px-1 text-center sticky left-0 z-10 bg-white border-b border-r border-slate-200 text-slate-600 font-bold text-xs select-none"
                          style="width: 38px; min-width: 38px; max-width: 38px;">
                        ${idx + 1}
                      </td>
                      <!-- Sticky Employee Name with In-Front Counters -->
                      <td class="py-1.5 px-3 text-left sticky z-10 bg-white border-b border-r-2 border-slate-300 shadow-sm font-black text-slate-900 text-xs select-none truncate"
                          style="left: 38px; width: 165px; min-width: 165px; max-width: 165px;">
                        <div class="font-black text-slate-900 truncate max-w-[145px]" title="${emp.full_name}">${emp.full_name}</div>
                        <div id="att-mini-${emp.id}" class="text-[9.5px] font-bold flex items-center gap-1 text-slate-400 mt-0.5 tracking-tight select-none">
                          <span class="text-emerald-700" title="Present Days">P:<b id="att-mini-p-${emp.id}">${sum.present || 0}</b></span>
                          <span>&bull;</span>
                          <span class="text-rose-700" title="Absent Days">A:<b id="att-mini-a-${emp.id}">${sum.absent || 0}</b></span>
                          <span>&bull;</span>
                          <span class="text-amber-700" title="Half Days">HD:<b id="att-mini-hd-${emp.id}">${sum.halfDay || sum.hd || 0}</b></span>
                          <span>&bull;</span>
                          <span class="text-blue-700" title="Overtime Days & Hours">OT:<b id="att-mini-ot-${emp.id}">${sum.overtime || sum.ot || 0}${sum.otHours ? ` (${sum.otHours}h)` : ''}</b></span>
                        </div>
                      </td>

                      <!-- Day Cells -->
                      ${Array.from({ length: daysInMonth }, (_, i) => {
                        const dayNum = i + 1;
                        const dateStr = `${this.selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                        const st = empAtt[dateStr] || '';
                        const isToday = dateStr === todayStr;
                        const isPast = dateStr < todayStr;
                        const isLockedCell = isPast && hasPwd && !this._unlockedPastAttendance;

                        return `
                          <td class="p-0.5 border-b border-r ${isToday ? 'bg-amber-50/80 border-l-2 border-r-2 border-amber-300 shadow-2xs' : 'border-slate-100/70 bg-slate-50/20'}"
                              style="width: 34px; min-width: 34px; max-width: 34px;">
                            <button type="button" onclick="Employees.openAttendanceModal(${emp.id}, '${dateStr}')"
                                    id="att-cell-${emp.id}-${dateStr}"
                                    title="${emp.full_name} on ${dateStr}: ${this.getAttendanceTooltip(st)}${isLockedCell ? ' (Locked - Click to authorize with 2nd password)' : ''}"
                                    class="w-7 h-7 mx-auto rounded flex items-center justify-center font-black text-[11px] leading-none transition-all cursor-pointer active:scale-90 ${isLockedCell ? 'opacity-85 ' : ''}${this.getAttendanceCellClasses(st, isToday, isPast)}">
                              ${this.getAttendanceCellContent(st)}
                            </button>
                          </td>
                        `;
                      }).join('')}

                      <!-- Summary Row Cells -->
                      <td id="att-sum-p-${emp.id}" class="py-1.5 px-2 bg-emerald-50/50 text-emerald-800 font-black border-b border-l-2 border-emerald-200 tabular-nums text-center text-xs" style="width: 44px; min-width: 44px;">${sum.present || 0}</td>
                      <td id="att-sum-a-${emp.id}" class="py-1.5 px-2 bg-rose-50/50 text-rose-800 font-black border-b border-l border-rose-200 tabular-nums text-center text-xs" style="width: 44px; min-width: 44px;">${sum.absent || 0}</td>
                      <td id="att-sum-hd-${emp.id}" class="py-1.5 px-2 bg-amber-50/50 text-amber-800 font-black border-b border-l border-amber-200 tabular-nums text-center text-xs" style="width: 44px; min-width: 44px;">${sum.halfDay || sum.hd || 0}</td>
                      <td id="att-sum-ot-${emp.id}" class="py-1.5 px-2 bg-blue-50/50 text-blue-800 font-black border-b border-l border-blue-200 tabular-nums text-center text-xs" style="width: 50px; min-width: 50px;">${sum.overtime || sum.ot || 0}${sum.otHours ? `<div class="text-[9.5px] text-blue-600 font-bold leading-tight mt-0.5">${sum.otHours}h</div>` : ''}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="p-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span>💡 <b>Attendance Marking</b>: Click any cell to select <span class="font-bold text-emerald-700">Present (P)</span>, <span class="font-bold text-rose-700">Absent (A)</span>, <span class="font-bold text-amber-700">Half Day (HD)</span>, or <span class="font-bold text-blue-700">Overtime (OT)</span> and confirm.</span>
              ${hasPwd ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${this._unlockedPastAttendance ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}"><i data-lucide="${this._unlockedPastAttendance ? 'unlock' : 'lock'}" class="w-3 h-3"></i> ${this._unlockedPastAttendance ? 'Past attendance unlocked' : 'Past attendance locked with 2nd password'}</span>` : ''}
            </div>
            <div class="text-slate-400 text-[11px]">
              Active Employees: ${emps.length}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  getAttendanceCellContent(status) {
    if (!status || status === '·') return '&middot;';
    const s = String(status);
    if (s.startsWith('OT')) {
      const m = s.match(/OT[-:]?(\d+)/i);
      if (m) {
        return `<div class="flex flex-col items-center justify-center leading-none">
          <span class="text-[9px] font-black">OT</span>
          <span class="text-[8px] font-extrabold opacity-95 leading-tight tracking-tighter">${m[1]}h</span>
        </div>`;
      }
      return 'OT';
    }
    return status;
  },

  getAttendanceTooltip(status) {
    if (!status || status === '·') return 'Unmarked';
    const s = String(status);
    if (s === 'P') return 'Present';
    if (s === 'A') return 'Absent';
    if (s === 'HD') return 'Half Day';
    if (s.startsWith('OT')) {
      const m = s.match(/OT[-:]?(\d+)/i);
      return m ? `Overtime (${m[1]} hours)` : 'Overtime';
    }
    return status;
  },

  getAttendanceCellClasses(status, isToday = false, isPast = false) {
    const s = String(status || '');
    const isOT = s === 'OT' || s.startsWith('OT');

    if (isToday) {
      if (s === 'P') return 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-300 border border-emerald-700 scale-105';
      if (s === 'A') return 'bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-300 border border-rose-700 scale-105';
      if (s === 'HD') return 'bg-amber-500 text-white font-black shadow-xs ring-2 ring-amber-300 border border-amber-600 scale-105';
      if (isOT) return 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-300 border border-blue-700 scale-105';
      return 'bg-amber-100 text-amber-900 border-2 border-dashed border-amber-400 font-black hover:bg-amber-200';
    }

    if (isPast) {
      if (s === 'P') return 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-black hover:bg-emerald-100 shadow-2xs';
      if (s === 'A') return 'bg-rose-50 text-rose-800 border border-rose-300 font-black hover:bg-rose-100 shadow-2xs';
      if (s === 'HD') return 'bg-amber-50 text-amber-800 border border-amber-300 font-black hover:bg-amber-100 shadow-2xs';
      if (isOT) return 'bg-blue-50 text-blue-800 border border-blue-300 font-black hover:bg-blue-100 shadow-2xs';
      return 'bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600 font-bold';
    }

    // Future / upcoming dates in month
    if (s === 'P') return 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold';
    if (s === 'A') return 'bg-rose-100 text-rose-800 border border-rose-300 font-bold';
    if (s === 'HD') return 'bg-amber-100 text-amber-800 border border-amber-300 font-bold';
    if (isOT) return 'bg-blue-100 text-blue-800 border border-blue-300 font-bold';
    return 'bg-transparent text-slate-300 hover:bg-slate-100 hover:text-slate-500 font-medium';
  },

  hasActionPassword() {
    const pwd = window.storage ? window.storage.get('action_password') : null;
    return Boolean(pwd && String(pwd).trim());
  },

  unlockPastAttendance() {
    app.authorizeAction(() => {
      this._unlockedPastAttendance = true;
      app.showToast('Past attendance editing unlocked for this session.', 'success');
      this.renderActiveView();
    }, 'editing past attendance records');
  },

  relockPastAttendance() {
    this._unlockedPastAttendance = false;
    app.showToast('Past attendance re-locked.', 'info');
    this.renderActiveView();
  },

  async cycleAttendance(employeeId, dateStr) {
    this.openAttendanceModal(employeeId, dateStr);
  },

  async openAttendanceModal(employeeId, dateStr) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isPast = dateStr < todayStr;

    if (isPast && this.hasActionPassword() && !this._unlockedPastAttendance) {
      app.authorizeAction(() => {
        this._unlockedPastAttendance = true;
        this.renderActiveView();
        this._renderAttendanceSelectModal(employeeId, dateStr);
      }, `editing locked past attendance for ${dateStr}`);
      return;
    }

    this._renderAttendanceSelectModal(employeeId, dateStr);
  },

  _renderAttendanceSelectModal(employeeId, dateStr) {
    const modalBox = document.getElementById('emp-modals-container');
    if (!modalBox) return;

    const emp = (this.attendanceData && this.attendanceData.employees)
      ? this.attendanceData.employees.find(e => e.id === employeeId)
      : null;
    const empName = emp ? emp.full_name : 'Employee';
    const empRole = emp?.role || 'Staff';

    const currentStatus = (emp?.attendance && emp.attendance[dateStr]) || '';
    let currentOtHours = '';
    let baseStatus = currentStatus;
    if (currentStatus.startsWith('OT')) {
      baseStatus = 'OT';
      const m = currentStatus.match(/OT[-:]?(\d+)/i);
      if (m) currentOtHours = m[1];
    }
    const initialSelection = baseStatus || 'P';
    this._attModalState = {
      employeeId,
      dateStr,
      empName,
      selectedStatus: initialSelection,
      currentStatus,
      otHours: currentOtHours
    };

    const [yr, mo, da] = dateStr.split('-').map(Number);
    const dObj = new Date(yr, mo - 1, da);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${dayNames[dObj.getDay()]}, ${da} ${mNames[mo - 1]} ${yr}`;

    modalBox.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) Employees.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <!-- Modal Header -->
          <div class="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i data-lucide="calendar-check-2" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900">Mark Attendance</h3>
                <p class="text-[11px] font-semibold text-slate-500">${empName} &bull; ${empRole} &bull; ${formattedDate}</p>
              </div>
            </div>
            <button type="button" onclick="Employees.closeModal()" class="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors" title="Close (Esc)">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Form Body -->
          <div class="p-6 space-y-4">
            <!-- Current Status Notice -->
            <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
              <span class="text-slate-500 font-bold uppercase text-[10.5px] tracking-wider">Current Status:</span>
              <div id="att-modal-current-badge">${this.getAttendanceStatusBadgeHtml(currentStatus)}</div>
            </div>

            <!-- Options Section -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider">Select Attendance Status *</label>
                <span class="text-[10px] text-slate-400 font-semibold">Double-click to save immediately</span>
              </div>

              <!-- 4 Primary Option Cards (2x2 Grid) -->
              <div class="grid grid-cols-2 gap-2.5">
                <!-- 1. Present (P) -->
                <button type="button" onclick="Employees.selectAttendanceStatus('P')" ondblclick="Employees.confirmAttendanceModal()" id="att-btn-opt-P"
                        class="p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group ${initialSelection === 'P' ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30 shadow-xs' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'}">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">P</span>
                    <span class="att-check-indicator ${initialSelection === 'P' ? '' : 'hidden'} text-emerald-600">
                      <i data-lucide="check-circle" class="w-4 h-4"></i>
                    </span>
                  </div>
                  <div class="font-black text-slate-900 text-xs">Present</div>
                  <div class="text-[10px] font-semibold text-slate-500">Full day present</div>
                </button>

                <!-- 2. Absent (A) -->
                <button type="button" onclick="Employees.selectAttendanceStatus('A')" ondblclick="Employees.confirmAttendanceModal()" id="att-btn-opt-A"
                        class="p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group ${initialSelection === 'A' ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/30 shadow-xs' : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50'}">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">A</span>
                    <span class="att-check-indicator ${initialSelection === 'A' ? '' : 'hidden'} text-rose-600">
                      <i data-lucide="check-circle" class="w-4 h-4"></i>
                    </span>
                  </div>
                  <div class="font-black text-slate-900 text-xs">Absent</div>
                  <div class="text-[10px] font-semibold text-slate-500">Full day absent</div>
                </button>

                <!-- 3. Half Day (HD) -->
                <button type="button" onclick="Employees.selectAttendanceStatus('HD')" ondblclick="Employees.confirmAttendanceModal()" id="att-btn-opt-HD"
                        class="p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group ${initialSelection === 'HD' ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/30 shadow-xs' : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'}">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-2xs">HD</span>
                    <span class="att-check-indicator ${initialSelection === 'HD' ? '' : 'hidden'} text-amber-600">
                      <i data-lucide="check-circle" class="w-4 h-4"></i>
                    </span>
                  </div>
                  <div class="font-black text-slate-900 text-xs">Half Day (HD)</div>
                  <div class="text-[10px] font-semibold text-slate-500">Half day shift</div>
                </button>

                <!-- 4. Overtime (OT) -->
                <button type="button" onclick="Employees.selectAttendanceStatus('OT')" ondblclick="Employees.confirmAttendanceModal()" id="att-btn-opt-OT"
                        class="p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group ${initialSelection === 'OT' ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-xs' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">OT</span>
                    <span class="att-check-indicator ${initialSelection === 'OT' ? '' : 'hidden'} text-blue-600">
                      <i data-lucide="check-circle" class="w-4 h-4"></i>
                    </span>
                  </div>
                  <div class="font-black text-slate-900 text-xs">Overtime (OT)</div>
                  <div class="text-[10px] font-semibold text-slate-500">Overtime shift</div>
                </button>
              </div>

              <!-- 4.1 Overtime Hours Input Section (Interactive) -->
              <div id="att-ot-hours-section" class="${initialSelection === 'OT' ? '' : 'hidden'} mt-2.5 p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                      <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                    </div>
                    <div>
                      <label for="att-ot-hours-input" class="text-xs font-black text-blue-950 block">Overtime Hours</label>
                      <span class="text-[10px] text-blue-700/80 font-medium">Enter hours worked (e.g. 2, 4)</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <input type="number" id="att-ot-hours-input" min="1" max="24" step="1"
                           value="${currentOtHours || ''}" placeholder="Hours"
                           oninput="Employees.onOtHoursChange(this.value)"
                           class="w-20 px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-black text-center text-blue-950 outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs">
                    <span class="text-xs font-black text-blue-800">hrs</span>
                  </div>
                </div>
              </div>

              <!-- 5. Clear Option -->
              <button type="button" onclick="Employees.selectAttendanceStatus('')" id="att-btn-opt-CLEAR"
                      class="w-full mt-2.5 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${initialSelection === '' ? 'border-slate-400 bg-slate-100 text-slate-900 ring-2 ring-slate-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center">&middot;</span>
                  <span>Clear Attendance / Unmarked</span>
                </div>
                <span class="att-check-indicator ${initialSelection === '' ? '' : 'hidden'} text-slate-700">
                  <i data-lucide="check-circle" class="w-4 h-4"></i>
                </span>
              </button>
            </div>

            <!-- Footer Action Buttons -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[10px] text-slate-400 font-medium">1=P, 2=A, 3=HD, 4=OT, 0=Clear</span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="Employees.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="button" id="att-modal-confirm-btn" onclick="Employees.confirmAttendanceModal()" class="px-5 py-2 ${this.getAttendanceConfirmButtonClass(initialSelection)} active:scale-95 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1.5">
                  <i data-lucide="check" class="w-4 h-4"></i>
                  <span id="att-modal-confirm-label">${this.getAttendanceConfirmLabel(initialSelection, currentOtHours)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    if (this._attKeydownHandler) {
      document.removeEventListener('keydown', this._attKeydownHandler);
    }
    this._attKeydownHandler = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.id === 'att-ot-hours-input') {
        if (e.key === 'Enter') {
          e.preventDefault();
          Employees.confirmAttendanceModal();
        } else if (e.key === 'Escape') {
          Employees.closeModal();
        }
        return;
      }

      if (e.key === 'Escape') {
        Employees.closeModal();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        Employees.confirmAttendanceModal();
      } else if (e.key === 'p' || e.key === 'P' || e.key === '1') {
        Employees.selectAttendanceStatus('P');
      } else if (e.key === 'a' || e.key === 'A' || e.key === '2') {
        Employees.selectAttendanceStatus('A');
      } else if (e.key === 'h' || e.key === 'H' || e.key === '3') {
        Employees.selectAttendanceStatus('HD');
      } else if (e.key === 'o' || e.key === 'O' || e.key === '4') {
        Employees.selectAttendanceStatus('OT');
      } else if (e.key === 'c' || e.key === 'C' || e.key === '0') {
        Employees.selectAttendanceStatus('');
      }
    };
    document.addEventListener('keydown', this._attKeydownHandler);
  },

  selectAttendanceStatus(status) {
    if (!this._attModalState) return;
    this._attModalState.selectedStatus = status;

    const otSection = document.getElementById('att-ot-hours-section');
    if (otSection) {
      const isOt = status === 'OT';
      otSection.classList.toggle('hidden', !isOt);
      if (isOt) {
        setTimeout(() => {
          const inp = document.getElementById('att-ot-hours-input');
          if (inp) {
            inp.focus();
            if (inp.value) inp.select();
          }
        }, 50);
      }
    }

    const optKeys = [
      { key: 'P', borderClass: 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30 shadow-xs', defaultClass: 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50' },
      { key: 'A', borderClass: 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/30 shadow-xs', defaultClass: 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50' },
      { key: 'HD', borderClass: 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/30 shadow-xs', defaultClass: 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50' },
      { key: 'OT', borderClass: 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-xs', defaultClass: 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50' },
    ];

    optKeys.forEach(opt => {
      const btn = document.getElementById(`att-btn-opt-${opt.key}`);
      if (btn) {
        const isSelected = this._attModalState.selectedStatus === opt.key;
        btn.className = `p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group ${isSelected ? opt.borderClass : opt.defaultClass}`;
        const check = btn.querySelector('.att-check-indicator');
        if (check) check.classList.toggle('hidden', !isSelected);
      }
    });

    const clearBtn = document.getElementById('att-btn-opt-CLEAR');
    if (clearBtn) {
      const isClear = this._attModalState.selectedStatus === '';
      clearBtn.className = `w-full mt-2.5 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${isClear ? 'border-slate-400 bg-slate-100 text-slate-900 ring-2 ring-slate-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;
      const check = clearBtn.querySelector('.att-check-indicator');
      if (check) check.classList.toggle('hidden', !isClear);
    }

    const otHours = document.getElementById('att-ot-hours-input')?.value || this._attModalState.otHours || '';
    const confirmBtn = document.getElementById('att-modal-confirm-btn');
    const confirmLabel = document.getElementById('att-modal-confirm-label');
    if (confirmBtn) {
      confirmBtn.className = `px-5 py-2 ${this.getAttendanceConfirmButtonClass(status)} active:scale-95 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1.5`;
    }
    if (confirmLabel) {
      confirmLabel.textContent = this.getAttendanceConfirmLabel(status, otHours);
    }
    if (window.lucide) lucide.createIcons();
  },

  onOtHoursChange(val) {
    if (!this._attModalState) return;
    this._attModalState.otHours = val;
    const confirmLabel = document.getElementById('att-modal-confirm-label');
    if (confirmLabel && this._attModalState.selectedStatus === 'OT') {
      confirmLabel.textContent = this.getAttendanceConfirmLabel('OT', val);
    }
  },

  getAttendanceStatusBadgeHtml(status) {
    if (!status || status === '·') {
      return '<span class="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold border border-slate-200 text-xs">&middot; Unmarked</span>';
    }
    const s = String(status);
    if (s === 'P') {
      return '<span class="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black border border-emerald-300 text-xs">P &bull; Present</span>';
    }
    if (s === 'A') {
      return '<span class="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black border border-rose-300 text-xs">A &bull; Absent</span>';
    }
    if (s === 'HD') {
      return '<span class="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black border border-amber-300 text-xs">HD &bull; Half Day</span>';
    }
    if (s === 'OT' || s.startsWith('OT')) {
      const m = s.match(/OT[-:]?(\d+)/i);
      const hText = m ? ` (${m[1]} hrs)` : '';
      return `<span class="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black border border-blue-300 text-xs">OT &bull; Overtime${hText}</span>`;
    }
    return `<span class="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200 text-xs">${status}</span>`;
  },

  getAttendanceConfirmLabel(status, otHours = '') {
    switch (status) {
      case 'P': return 'Confirm: Present (P)';
      case 'A': return 'Confirm: Absent (A)';
      case 'HD': return 'Confirm: Half Day (HD)';
      case 'OT': return otHours ? `Confirm: Overtime (${otHours} hrs)` : 'Confirm: Overtime (OT)';
      default: return 'Confirm: Clear Attendance';
    }
  },

  getAttendanceConfirmButtonClass(status) {
    switch (status) {
      case 'P': return 'bg-emerald-600 hover:bg-emerald-700';
      case 'A': return 'bg-rose-600 hover:bg-rose-700';
      case 'HD': return 'bg-amber-500 hover:bg-amber-600';
      case 'OT': return 'bg-blue-600 hover:bg-blue-700';
      default: return 'bg-slate-700 hover:bg-slate-800';
    }
  },

  async confirmAttendanceModal() {
    if (!this._attModalState) return;
    const { employeeId, dateStr, selectedStatus } = this._attModalState;
    let finalStatus = selectedStatus;
    if (selectedStatus === 'OT') {
      const hInput = document.getElementById('att-ot-hours-input');
      const hVal = hInput ? parseInt(hInput.value, 10) : parseInt(this._attModalState.otHours, 10);
      if (hVal && hVal > 0) {
        finalStatus = `OT-${hVal}`;
      } else {
        finalStatus = 'OT';
      }
    }
    this.closeModal();
    await this._doSaveAttendance(employeeId, dateStr, finalStatus);
  },

  async _doSaveAttendance(employeeId, dateStr, status) {
    const cell = document.getElementById(`att-cell-${employeeId}-${dateStr}`);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;

    // Optimistically update cell DOM immediately
    if (cell) {
      cell.innerHTML = this.getAttendanceCellContent(status);
      cell.className = `w-7 h-7 mx-auto rounded flex items-center justify-center font-black text-[11px] leading-none transition-all cursor-pointer active:scale-90 ${this.getAttendanceCellClasses(status, isToday, isPast)}`;
      cell.title = this.getAttendanceTooltip(status);
    }

    try {
      await window.api.setAttendance(employeeId, dateStr, status);
      // Update in memory cache and summary cells
      if (this.attendanceData && this.attendanceData.employees) {
        const emp = this.attendanceData.employees.find(e => e.id === employeeId);
        if (emp) {
          if (!emp.attendance) emp.attendance = {};
          if (status) emp.attendance[dateStr] = status;
          else delete emp.attendance[dateStr];

          // Recalculate employee summary (P, A, HD, OT, OT-Hours)
          let p = 0, a = 0, hd = 0, ot = 0, otHours = 0;
          Object.values(emp.attendance).forEach(val => {
            const v = String(val || '');
            if (v === 'P') p++;
            else if (v === 'A') a++;
            else if (v === 'HD') hd++;
            else if (v === 'OT' || v.startsWith('OT')) {
              ot++;
              const m = v.match(/OT[-:]?(\d+)/i);
              if (m) otHours += parseInt(m[1], 10);
            }
          });

          if (!emp.summary) emp.summary = {};
          emp.summary.present = p;
          emp.summary.absent = a;
          emp.summary.halfDay = hd;
          emp.summary.overtime = ot;
          emp.summary.overtimeHours = otHours;
          emp.summary.hd = hd;
          emp.summary.ot = ot;
          emp.summary.otHours = otHours;

          // Update summary column cells
          const sumP = document.getElementById(`att-sum-p-${employeeId}`);
          if (sumP) sumP.textContent = p;
          const sumA = document.getElementById(`att-sum-a-${employeeId}`);
          if (sumA) sumA.textContent = a;
          const sumHD = document.getElementById(`att-sum-hd-${employeeId}`);
          if (sumHD) sumHD.textContent = hd;
          const sumOT = document.getElementById(`att-sum-ot-${employeeId}`);
          if (sumOT) {
            sumOT.innerHTML = `${ot}${otHours > 0 ? `<div class="text-[9.5px] text-blue-600 font-bold leading-tight mt-0.5">${otHours}h</div>` : ''}`;
          }

          // Update mini summary in employee sticky cell
          const miniP = document.getElementById(`att-mini-p-${employeeId}`);
          if (miniP) miniP.textContent = p;
          const miniA = document.getElementById(`att-mini-a-${employeeId}`);
          if (miniA) miniA.textContent = a;
          const miniHD = document.getElementById(`att-mini-hd-${employeeId}`);
          if (miniHD) miniHD.textContent = hd;
          const miniOT = document.getElementById(`att-mini-ot-${employeeId}`);
          if (miniOT) {
            miniOT.textContent = `${ot}${otHours > 0 ? ` (${otHours}h)` : ''}`;
          }
        }
      }
      const stLabel = status === 'P' ? 'Present' : status === 'A' ? 'Absent' : status === 'HD' ? 'Half Day' : status.startsWith('OT') ? this.getAttendanceTooltip(status) : 'Cleared';
      app.showToast(`Updated attendance: ${stLabel} (${dateStr})`, 'success');
    } catch (err) {
      console.error('Error updating attendance:', err);
      app.showAlert({ title: 'Error', message: 'Failed to save attendance.' });
      await this.loadData();
    }
  },

  async markAllPresentToday() {
    const todayStr = new Date().toISOString().split('T')[0];
    const emps = ((this.attendanceData && this.attendanceData.employees) || []).filter(e => e.status !== 'inactive');
    if (emps.length === 0) return;

    app.showConfirm({
      title: 'Mark All Present Today?',
      message: `Are you sure you want to mark all <b>${emps.length}</b> active employees as <b>Present</b> for today (<b>${todayStr}</b>)?`,
      confirmText: 'Mark All Present',
      confirmColor: 'emerald',
      onConfirm: async () => {
        const records = emps.map(e => ({ employee_id: e.id, status: 'P' }));
        try {
          app.showLoading();
          await window.api.bulkSetAttendance(todayStr, records);
          app.showToast('All active employees marked Present for today!', 'success');
          await this.loadData();
        } catch (err) {
          console.error('Error marking all present:', err);
          app.showAlert({ title: 'Error', message: 'Failed to bulk mark attendance.' });
        } finally {
          app.hideLoading();
        }
      }
    });
  },

  shiftMonth(delta) {
    const [y, m] = this.selectedMonth.split('-').map(Number);
    let newM = m + delta;
    let newY = y;
    if (newM > 12) {
      newM = 1;
      newY++;
    } else if (newM < 1) {
      newM = 12;
      newY--;
    }
    this.selectedMonth = `${newY}-${String(newM).padStart(2, '0')}`;
    const sel = document.getElementById('emp-month-select');
    if (sel) sel.value = this.selectedMonth;
    this.updateResetButton();
    this.loadData();
  },

  // -----------------------------------------------------------------------------------------
  // SUB-TAB 3: SALARY PAYMENT HISTORY LEDGER
  // -----------------------------------------------------------------------------------------
  renderHistoryView(container) {
    if (container) container.innerHTML = this.getHistoryViewHtml();
  },

  getEmployeesForFilter() {
    const map = new Map();
    (this.allEmployees || []).forEach(e => {
      if (e && e.id) map.set(Number(e.id), e.full_name);
    });
    (this.employees || []).forEach(e => {
      if (e && e.id && !map.has(Number(e.id))) map.set(Number(e.id), e.full_name);
    });
    (this.payments || []).forEach(p => {
      if (p && p.employee_id && !map.has(Number(p.employee_id))) {
        map.set(Number(p.employee_id), p.employee_name || `Employee #${p.employee_id}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  },

  getFilteredPayments() {
    let list = this.payments || [];
    if (this.paymentEmployeeFilter && this.paymentEmployeeFilter !== 'all') {
      const empId = Number(this.paymentEmployeeFilter);
      list = list.filter(p => Number(p.employee_id) === empId);
    }
    if (this.paymentSearchQuery) {
      const q = this.paymentSearchQuery.toLowerCase().trim();
      list = list.filter(p =>
        (p.employee_name && p.employee_name.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.payment_method && p.payment_method.toLowerCase().includes(q)) ||
        (p.month && p.month.toLowerCase().includes(q)) ||
        String(p.amount || '').includes(q)
      );
    }
    return list;
  },

  renderPaymentRows() {
    const filteredPayments = this.getFilteredPayments();
    const empList = this.getEmployeesForFilter();
    const selectedEmpObj = empList.find(e => String(e.id) === String(this.paymentEmployeeFilter));
    const selectedEmpName = selectedEmpObj ? selectedEmpObj.name : null;
    const [y, m] = (this.selectedMonth || '').split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthNames[parseInt(m, 10) - 1] ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : (this.selectedMonth || '');
    const scopeLabel = this.paymentScope === 'all' ? 'All History' : monthLabel;

    if (filteredPayments.length === 0) {
      return `
        <tr>
          <td colspan="9" class="py-12 text-center text-slate-400 font-bold">
            ${selectedEmpName ? `No salary payment transactions recorded for ${selectedEmpName} (${scopeLabel}).` : `No salary payment transactions recorded for ${scopeLabel}.`}
          </td>
        </tr>
      `;
    }

    return filteredPayments.map((p, idx) => `
      <tr class="hover:bg-slate-50/70 transition-colors">
        <td class="py-3 px-3.5 text-center text-slate-600 font-bold border-r border-slate-200">${idx + 1}</td>
        <td class="py-3 px-3.5 font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">${p.payment_date ? app.formatDateTime(p.payment_date, p.created_at) : 'N/A'}</td>
        <td class="py-3 px-3.5 border-r border-slate-200">
          <div class="font-black text-slate-900">${p.employee_name || 'Staff'}</div>
        </td>
        <td class="py-3 px-3.5 font-bold text-slate-700 border-r border-slate-200">${p.month}</td>
        <td class="py-3 px-3.5 text-right font-black text-emerald-600 text-[13px] tabular-nums border-r border-slate-200">
          Rs. ${Math.round(p.amount || 0).toLocaleString()}
        </td>
        <td class="py-3 px-3.5 border-r border-slate-200">
          <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10.5px]">
            ${p.payment_method || 'Cash'}
          </span>
        </td>
        <td class="py-3 px-3.5 border-r border-slate-200">
          ${p.expense_id ? `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
              <i data-lucide="check" class="w-3 h-3"></i> Expenses #${p.expense_id}
            </span>
          ` : `
            <span class="text-slate-300 italic text-[10px]">Unlinked</span>
          `}
        </td>
        <td class="py-3 px-3.5 text-slate-500 font-medium border-r border-slate-200">${p.notes || '<span class="text-slate-300 italic">-</span>'}</td>
        <td class="py-3 px-3.5 text-center">
          <button type="button" onclick="Employees.deletePayment(${p.id}, '${(p.employee_name || '').replace(/'/g, "\\'")}', ${p.amount})"
                  title="Delete payment (reverts Expense)"
                  class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all cursor-pointer active:scale-95 mx-auto">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  async onPaymentEmployeeChange(val) {
    this.paymentEmployeeFilter = val;
    await this.reloadPayments();
  },

  async resetPaymentEmployeeFilter() {
    this.paymentEmployeeFilter = 'all';
    await this.reloadPayments();
  },

  async setPaymentScope(scope) {
    this.paymentScope = scope;
    await this.reloadPayments();
  },

  onPaymentSearch(val) {
    this.paymentSearchQuery = (val || '').trim();
    const tbody = document.getElementById('emp-payment-tbody');
    if (tbody) {
      tbody.innerHTML = this.renderPaymentRows();
      if (window.lucide) lucide.createIcons({ root: tbody });
    }
    const filteredPayments = this.getFilteredPayments();
    const total = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalEl = document.getElementById('emp-payment-total-disbursed');
    if (totalEl) totalEl.textContent = `Rs. ${Math.round(total).toLocaleString()}`;
    const countEl = document.getElementById('emp-payment-count-badge');
    if (countEl) countEl.textContent = `${filteredPayments.length} payment${filteredPayments.length === 1 ? '' : 's'} recorded`;
  },

  async reloadPayments() {
    try {
      const filters = {};
      if (this.paymentScope !== 'all') {
        filters.month = this.selectedMonth;
      }
      if (this.paymentEmployeeFilter && this.paymentEmployeeFilter !== 'all') {
        filters.employee_id = Number(this.paymentEmployeeFilter);
      }
      this.payments = (await window.api.getSalaryPayments(filters)) || [];
      const mainBox = document.getElementById('emp-main-content');
      if (mainBox && this.activeSubTab === 'history') {
        mainBox.innerHTML = this.getHistoryViewHtml();
        if (window.lucide) lucide.createIcons({ root: mainBox });
      }
    } catch (err) {
      console.error('Error reloading payments:', err);
    }
  },

  getHistoryViewHtml() {
    const filteredPayments = this.getFilteredPayments();
    const [y, m] = (this.selectedMonth || '').split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthNames[parseInt(m, 10) - 1] ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : (this.selectedMonth || '');

    const totalPaid = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const empList = this.getEmployeesForFilter();
    const selectedEmpObj = empList.find(e => String(e.id) === String(this.paymentEmployeeFilter));
    const selectedEmpName = selectedEmpObj ? selectedEmpObj.name : null;

    const employeeOptions = empList.map(e => `
      <option value="${e.id}" ${String(this.paymentEmployeeFilter) === String(e.id) ? 'selected' : ''}>${e.name}</option>
    `).join('');

    return `
      <div class="space-y-3">
        <!-- Header summary -->
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-black text-slate-900">
                Salary Payment Ledger ${selectedEmpName ? `— <span class="text-blue-600">${selectedEmpName}</span>` : ''}
              </h3>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${this.paymentScope === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">
                ${this.paymentScope === 'all' ? 'All History' : monthLabel}
              </span>
            </div>
            <p class="text-xs text-slate-500 font-medium mt-0.5">All salary payouts are synchronized with Expenses in real time.</p>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Disbursed:</span>
            <div id="emp-payment-total-disbursed" class="text-xl font-black text-emerald-600 tabular-nums">Rs. ${Math.round(totalPaid).toLocaleString()}</div>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-2 w-full md:w-auto flex-1 flex-wrap">
            <!-- Employee Filter Dropdown -->
            <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
              <i data-lucide="user" class="w-4 h-4 text-blue-600 shrink-0"></i>
              <span class="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Employee:</span>
              <select id="emp-payment-employee-filter" onchange="Employees.onPaymentEmployeeChange(this.value)"
                      class="bg-transparent font-black text-slate-800 outline-none cursor-pointer pr-1">
                <option value="all" ${this.paymentEmployeeFilter === 'all' ? 'selected' : ''}>All Employees</option>
                ${employeeOptions}
              </select>
              ${this.paymentEmployeeFilter !== 'all' ? `
                <button type="button" onclick="Employees.resetPaymentEmployeeFilter()"
                        class="w-6 h-6 rounded-lg flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer ml-1"
                        title="Clear employee filter (Show all employees)">
                  <i data-lucide="x" class="w-3.5 h-3.5 stroke-[2.5]"></i>
                </button>
              ` : ''}
            </div>

            <!-- Search input -->
            <div class="relative flex-1 min-w-[160px] max-w-xs">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="emp-payment-search" value="${this.paymentSearchQuery || ''}" oninput="Employees.onPaymentSearch(this.value)"
                     placeholder="Search notes, method, Rs..."
                     class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition-all">
            </div>

            <!-- Scope Toggle: Month vs All History -->
            <div class="flex items-center bg-slate-200/70 p-0.5 rounded-xl text-xs font-bold border border-slate-300/70 shadow-inner">
              <button type="button" onclick="Employees.setPaymentScope('month')"
                      class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.paymentScope !== 'all' ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80 font-black' : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'}">
                ${monthLabel}
              </button>
              <button type="button" onclick="Employees.setPaymentScope('all')"
                      class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${this.paymentScope === 'all' ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80 font-black' : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'}">
                All History
              </button>
            </div>
          </div>

          <!-- Counter info -->
          <div id="emp-payment-count-badge" class="text-[11px] font-bold text-slate-500 shrink-0">
            ${filteredPayments.length} payment${filteredPayments.length === 1 ? '' : 's'} recorded
          </div>
        </div>

        <!-- Ledger Table -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th class="py-3 px-3.5 text-center w-12 border-r border-slate-200">#</th>
                  <th class="py-3 px-3.5 border-r border-slate-200">Date &amp; Time</th>
                  <th class="py-3 px-3.5 border-r border-slate-200">Employee</th>
                  <th class="py-3 px-3.5 border-r border-slate-200">Month</th>
                  <th class="py-3 px-3.5 text-right border-r border-slate-200">Amount</th>
                  <th class="py-3 px-3.5 border-r border-slate-200">Method</th>
                  <th class="py-3 px-3.5 border-r border-slate-200">Synced</th>
                  <th class="py-3 px-3.5 border-r border-slate-200">Notes</th>
                  <th class="py-3 px-3.5 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody id="emp-payment-tbody" class="divide-y divide-slate-100 text-xs">
                ${this.renderPaymentRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async deletePayment(id, empName, amount) {
    app.authorizeAction(async () => {
      app.showConfirm({
        title: 'Delete Salary Payment?',
        message: `Are you sure you want to delete the salary payment of <b>Rs. ${amount.toLocaleString()}</b> for <b>${empName}</b>?<br><br><span class="text-rose-600 font-bold">Note: This will also automatically delete the corresponding expense entry from Salaries.</span>`,
        confirmText: 'Delete Payment',
        confirmColor: 'red',
        onConfirm: async () => {
          try {
            app.showLoading();
            const res = await window.api.deleteSalaryPayment(id);
            if (res && res.success) {
              app.showToast('Salary payment deleted & expense removed.', 'success');
              await this.loadData();
            } else {
              app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to delete payment.' });
            }
          } catch (err) {
            console.error('Error deleting salary payment:', err);
            app.showAlert({ title: 'Error', message: err.message || 'Error deleting salary payment.' });
          } finally {
            app.hideLoading();
          }
        }
      });
    }, 'delete salary payment');
  },

  async viewEmployeePayments(employeeId) {
    this.paymentEmployeeFilter = String(employeeId);
    this.activeSubTab = 'history';
    ['salaries', 'attendance', 'history'].forEach(t => {
      const btn = document.getElementById(`emp-tab-${t}`);
      if (btn) {
        if (t === 'history') {
          btn.className = 'px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 bg-white shadow-2xs text-slate-900';
        } else {
          btn.className = 'px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-800';
        }
      }
    });
    await this.reloadPayments();
  },

  // -----------------------------------------------------------------------------------------
  // MODALS: ADD / EDIT EMPLOYEE
  // -----------------------------------------------------------------------------------------
  openAddEmployeeModal() {
    this.renderEmployeeModal(null);
  },

  async openEditEmployeeModal(id) {
    const emp = (this.employees || []).find(e => e.id === id);
    if (!emp) return;
    this.renderEmployeeModal(emp);
  },

  renderEmployeeModal(emp = null) {
    const isEdit = !!emp;
    const modalBox = document.getElementById('emp-modals-container');
    if (!modalBox) return;

    modalBox.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) Employees.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <!-- Modal Header -->
          <div class="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i data-lucide="${isEdit ? 'user-pen' : 'user-plus'}" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900">${isEdit ? 'Edit Employee' : 'Add New Employee'}</h3>
                <p class="text-[11px] font-semibold text-slate-500">Staff profile &amp; monthly salary configuration</p>
              </div>
            </div>
            <button type="button" onclick="Employees.closeModal()" class="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Form Body -->
          <form id="emp-form" onsubmit="Employees.saveEmployee(event)" class="p-6 space-y-4 text-xs font-bold text-slate-700">
            <input type="hidden" id="emp-id" value="${isEdit ? emp.id : ''}">

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Full Name *</label>
                <input type="text" id="emp-name" value="${isEdit ? (emp.full_name || '') : ''}" required placeholder="e.g. Muhammad Ali"
                       class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              </div>

              <div>
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Monthly Salary (Rs.) *</label>
                <input type="number" step="any" min="0" id="emp-salary" value="${isEdit ? (emp.salary || '') : ''}" required placeholder="e.g. 25000"
                       class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              </div>

              <div>
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Phone Number</label>
                <input type="text" id="emp-phone" value="${isEdit ? (emp.phone || '') : ''}" placeholder="0300-1234567"
                       class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              </div>

              <div>
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Joining Date</label>
                <input type="date" id="emp-date-joined" value="${isEdit && emp.date_joined ? emp.date_joined : new Date().toISOString().split('T')[0]}"
                       class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              </div>

              <div>
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Status</label>
                <select id="emp-status" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer">
                  <option value="active" ${!isEdit || emp.status === 'active' ? 'selected' : ''}>Active</option>
                  <option value="inactive" ${isEdit && emp.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Notes / Address</label>
                <input type="text" id="emp-notes" value="${isEdit ? (emp.notes || '') : ''}" placeholder="e.g. Hasan Abdal resident..."
                       class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              </div>
            </div>

            <!-- Footer -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button type="button" onclick="Employees.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" class="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-2xs">
                ${isEdit ? 'Save Changes' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  },

  async saveEmployee(event) {
    event.preventDefault();
    const id = document.getElementById('emp-id')?.value;
    const fullName = document.getElementById('emp-name')?.value;
    const salary = document.getElementById('emp-salary')?.value;
    const phone = document.getElementById('emp-phone')?.value;
    const dateJoined = document.getElementById('emp-date-joined')?.value;
    const status = document.getElementById('emp-status')?.value;
    const notes = document.getElementById('emp-notes')?.value;

    const data = {
      id: id ? parseInt(id, 10) : undefined,
      full_name: fullName,
      role: '',
      salary: parseFloat(salary) || 0,
      phone: phone,
      date_joined: dateJoined,
      status: status,
      cnic: '',
      notes: notes
    };

    try {
      app.showLoading();
      const res = await window.api.saveEmployee(data);
      if (res && res.success) {
        app.showToast(id ? 'Employee updated successfully' : 'Employee created successfully', 'success');
        this.closeModal();
        await this.loadData();
      } else {
        app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to save employee.' });
      }
    } catch (err) {
      console.error('Error saving employee:', err);
      app.showAlert({ title: 'Error', message: err.message || 'Error saving employee.' });
    } finally {
      app.hideLoading();
    }
  },

  async deleteEmployee(id, name) {
    app.authorizeAction(async () => {
      app.showConfirm({
        title: 'Delete Employee?',
        message: `Are you sure you want to delete employee <b>"${name}"</b>?<br><br><span class="text-rose-600 font-bold">This will delete their employee profile, salary payouts, and attendance history.</span>`,
        confirmText: 'Delete Employee',
        confirmColor: 'red',
        onConfirm: async () => {
          try {
            app.showLoading();
            const res = await window.api.deleteEmployee(id);
            if (res && res.success) {
              app.showToast(`Employee "${name}" deleted`, 'success');
              await this.loadData();
            } else {
              app.showAlert({ title: 'Error', message: (res && res.error) || 'Failed to delete employee.' });
            }
          } catch (err) {
            console.error('Error deleting employee:', err);
            app.showAlert({ title: 'Error', message: err.message || 'Error deleting employee.' });
          } finally {
            app.hideLoading();
          }
        }
      });
    }, 'delete employee');
  },

  // -----------------------------------------------------------------------------------------
  // MODALS: PAY SALARY (PARTIAL OR FULL WITH DIRECT EXPENSE SYNC)
  // -----------------------------------------------------------------------------------------
  openPaySalaryModal(preselectedEmployeeId = null) {
    const modalBox = document.getElementById('emp-modals-container');
    if (!modalBox) return;

    const emps = (this.employees || []).filter(e => e.status !== 'inactive');
    if (emps.length === 0) {
      return app.showAlert({ title: 'No Active Employees', message: 'Please add an active employee first before registering salary payments.' });
    }

    const defaultEmpId = preselectedEmployeeId || (emps[0] ? emps[0].id : null);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const nowDateTimeStr = now.toISOString().slice(0, 16);

    modalBox.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1200] p-4" onclick="if(event.target===this) Employees.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <!-- Header -->
          <div class="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i data-lucide="banknote" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900">Pay Employee Salary</h3>
                <p class="text-[11px] font-semibold text-slate-500">Auto-adds expense to "Salaries" category</p>
              </div>
            </div>
            <button type="button" onclick="Employees.closeModal()" class="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Form Body -->
          <form id="pay-salary-form" onsubmit="Employees.submitSalaryPayment(event)" class="p-6 space-y-4 text-xs font-bold text-slate-700">
            <div>
              <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Select Employee *</label>
              <select id="pay-emp-select" onchange="Employees.updatePayModalLiveInfo()" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                ${emps.map(e => `
                  <option value="${e.id}" ${e.id === defaultEmpId ? 'selected' : ''}>
                    ${e.full_name} — Base: Rs. ${Math.round(e.salary || 0).toLocaleString()}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Live Salary Balance Box -->
            <div id="pay-live-summary-box" class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1.5">
              <!-- Rendered via updatePayModalLiveInfo -->
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">For Month *</label>
                <input type="month" id="pay-month" value="${this.selectedMonth}" onchange="Employees.updatePayModalLiveInfo()" required
                       class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              </div>

              <div>
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Payment Date &amp; Time *</label>
                <input type="datetime-local" id="pay-date" value="${nowDateTimeStr}" required
                       class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider">Amount to Pay (Rs.) *</label>
                <button type="button" id="pay-chip-full-remaining" class="text-[11px] font-black text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer transition-colors"></button>
              </div>
              <input type="number" step="any" min="1" id="pay-amount" required placeholder="e.g. 5000" oninput="Employees.onPayAmountInput()" onblur="Employees.onPayAmountInput()"
                     class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-black text-emerald-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Payment Method</label>
                <select id="pay-method" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Online">Online</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">Notes / Remarks</label>
                <input type="text" id="pay-notes" placeholder="e.g. 1st installment, advance..."
                       class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              </div>
            </div>

            <!-- Live After-Payment Balance Notice -->
            <div id="pay-after-balance-notice" class="text-[11px] font-bold text-slate-500 text-center py-1"></div>

            <!-- Footer -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button type="button" onclick="Employees.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" id="pay-submit-btn" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-2xs">
                Confirm &amp; Record Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.updatePayModalLiveInfo();
  },

  async updatePayModalLiveInfo() {
    const empSelect = document.getElementById('pay-emp-select');
    const monthInput = document.getElementById('pay-month');
    const amtInput = document.getElementById('pay-amount');
    const box = document.getElementById('pay-live-summary-box');
    const chipFull = document.getElementById('pay-chip-full-remaining');
    const submitBtn = document.getElementById('pay-submit-btn');
    if (!empSelect || !box) return;

    const empId = parseInt(empSelect.value, 10);
    const selectedMonth = monthInput?.value || this.selectedMonth;

    // Fetch refreshed employee status for the selected month to get accurate advance & remaining
    let emp = null;
    try {
      const emps = await window.api.getEmployees({ month: selectedMonth });
      emp = (emps || []).find(e => e.id === empId);
    } catch (e) {}

    if (!emp) {
      emp = (this.employees || []).find(e => e.id === empId);
    }
    if (!emp) return;

    const salary = Number(emp.salary) || 0;
    const paid = Number(emp.paid_amount) || 0;
    const remaining = Number(emp.remaining_salary) || 0;
    const advanceBroughtIn = Number(emp.advance_brought_in) || 0;
    const advanceRemaining = Number(emp.advance_remaining) || 0;
    this._currentPayModalRemaining = remaining;
    this._currentPayModalSalary = salary;
    this._currentPayModalAdvance = advanceRemaining;

    box.innerHTML = `
      <div class="flex items-center justify-between text-slate-700 font-medium">
        <span>Base Monthly Salary:</span>
        <span class="font-black text-slate-900 tabular-nums">Rs. ${Math.round(salary).toLocaleString()}</span>
      </div>
      <div class="flex items-center justify-between text-slate-700 font-medium">
        <span>Paid So Far This Month:</span>
        <span class="font-black text-emerald-700 tabular-nums">Rs. ${Math.round(paid).toLocaleString()}</span>
      </div>
      ${advanceBroughtIn > 0 ? `
        <div class="flex items-center justify-between text-blue-700 font-medium">
          <span>Advance From Past Months:</span>
          <span class="font-black text-blue-800 tabular-nums">Rs. ${Math.round(advanceBroughtIn).toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="flex items-center justify-between border-t border-emerald-200/80 pt-1.5 text-xs font-bold">
        <span class="text-slate-800">Remaining Salary Balance:</span>
        <span class="font-black ${remaining > 0 ? 'text-amber-800' : 'text-emerald-700'} tabular-nums">Rs. ${Math.round(remaining).toLocaleString()}</span>
      </div>
      ${advanceRemaining > 0 ? `
        <div class="flex items-center justify-between text-[11px] font-bold text-blue-700 pt-0.5">
          <span>Available Advance:</span>
          <span class="font-black tabular-nums">Rs. ${Math.round(advanceRemaining).toLocaleString()}</span>
        </div>
      ` : ''}
    `;

    if (amtInput) {
      amtInput.disabled = false;
      amtInput.placeholder = remaining > 0 ? `e.g. ${remaining} (or higher for Advance)` : 'Enter advance amount (e.g. 5000)...';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }

    if (chipFull) {
      if (remaining > 0) {
        chipFull.style.display = 'inline-block';
        chipFull.textContent = `Pay Full Remaining: Rs. ${Math.round(remaining).toLocaleString()}`;
        chipFull.onclick = () => this.quickSetAmount(remaining);
      } else {
        chipFull.style.display = 'none';
      }
    }

    this.onPayAmountInput();
  },

  quickSetAmount(amt) {
    const amtInput = document.getElementById('pay-amount');
    if (amtInput) {
      amtInput.value = amt;
      this.onPayAmountInput();
    }
  },

  onPayAmountInput() {
    const amtInput = document.getElementById('pay-amount');
    const notice = document.getElementById('pay-after-balance-notice');
    if (!amtInput || !notice) return;

    const remaining = Number(this._currentPayModalRemaining) || 0;
    const rawVal = amtInput.value.trim();

    if (!rawVal) {
      notice.innerHTML = remaining > 0
        ? `<span class="text-slate-400">Enter amount to pay (Excess will automatically be treated as Advance Salary)</span>`
        : `<span class="text-blue-600 font-bold">Already fully paid for this month. Any amount entered will be Advance Salary.</span>`;
      return;
    }

    let paying = parseFloat(rawVal);
    if (isNaN(paying) || paying <= 0) {
      notice.innerHTML = `<span class="text-rose-600 font-bold">Please enter a valid payment amount.</span>`;
      return;
    }

    if (paying > remaining) {
      const advanceExtra = paying - remaining;
      notice.innerHTML = `
        <div class="space-y-0.5 text-center">
          <div class="text-emerald-700 font-black">✓ Clears this month's salary completely (Rs. 0 pending)</div>
          <div class="text-blue-700 font-black text-xs">+ Rs. ${Math.round(advanceExtra).toLocaleString()} Advance Salary (Carries over to next months)</div>
        </div>
      `;
    } else if (paying === remaining) {
      notice.innerHTML = `<span class="text-emerald-600 font-black">✓ Full monthly salary will be cleared! (Remaining: Rs. 0)</span>`;
    } else {
      const newRemaining = Math.max(0, Math.round((remaining - paying) * 100) / 100);
      notice.innerHTML = `New Remaining Balance after this payment: <b class="text-amber-700 tabular-nums">Rs. ${Math.round(newRemaining).toLocaleString()}</b>`;
    }
  },

  async submitSalaryPayment(event) {
    event.preventDefault();
    const empId = document.getElementById('pay-emp-select')?.value;
    const month = document.getElementById('pay-month')?.value;
    const date = document.getElementById('pay-date')?.value;
    const amount = document.getElementById('pay-amount')?.value;
    const method = document.getElementById('pay-method')?.value;
    const notes = document.getElementById('pay-notes')?.value;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return app.showAlert({ title: 'Invalid Amount', message: 'Please enter a valid payment amount.' });
    }

    const currentRemaining = Number(this._currentPayModalRemaining) || 0;
    const emp = (this.employees || []).find(e => e.id === parseInt(empId, 10));
    const empName = emp ? emp.full_name : 'Employee';
    const [y, m] = (month || '').split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthNames[parseInt(m, 10) - 1] ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : month;

    const salaryCovered = Math.min(numAmount, currentRemaining);
    const advanceAmount = Math.max(0, numAmount - currentRemaining);
    const newRemaining = Math.max(0, currentRemaining - numAmount);

    // Confirmation modal before finalizing payment
    app.showConfirm({
      title: 'Confirm Salary Payment',
      message: `
        <div class="text-left space-y-2.5">
          <p class="text-slate-600 text-xs">Please review and confirm this employee payment:</p>
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-slate-500 font-medium">Employee:</span>
              <span class="font-black text-slate-900">${empName}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500 font-medium">Salary Month:</span>
              <span class="font-bold text-slate-800">${monthLabel}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500 font-medium">Payment Date &amp; Time:</span>
              <span class="font-bold text-slate-800">${app.formatDateTime(date)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500 font-medium">Payment Method:</span>
              <span class="font-bold text-slate-800">${method}</span>
            </div>
            <div class="flex justify-between items-center border-t border-slate-200/80 pt-2 text-sm">
              <span class="font-black text-emerald-800">Total Payment:</span>
              <span class="font-black text-emerald-700 tabular-nums">Rs. ${numAmount.toLocaleString()}</span>
            </div>
            ${advanceAmount > 0 ? `
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1 text-[11.5px] mt-1">
                <div class="flex justify-between items-center text-slate-700 font-medium">
                  <span>Salary Due Covered:</span>
                  <span class="font-bold text-slate-900">Rs. ${salaryCovered.toLocaleString()}</span>
                </div>
                <div class="flex justify-between items-center text-blue-800 font-black">
                  <span>Advance Salary:</span>
                  <span>Rs. ${advanceAmount.toLocaleString()}</span>
                </div>
                <div class="text-[10px] text-blue-600 italic">This advance will automatically cover future months' salary.</div>
              </div>
            ` : `
              <div class="flex justify-between items-center text-[11px] pt-1">
                <span class="text-slate-500 font-medium">Remaining After Payment:</span>
                <span class="font-black ${newRemaining === 0 ? 'text-emerald-700' : 'text-amber-800'} tabular-nums">Rs. ${Math.round(newRemaining).toLocaleString()}</span>
              </div>
            `}
          </div>
          <p class="text-[11px] text-slate-500 font-medium">This payment will be finalized and automatically synced to Expenses under <b>Salaries</b>.</p>
        </div>
      `,
      confirmText: 'Yes, Finalize Payment',
      confirmColor: 'emerald',
      onConfirm: async () => {
        try {
          app.showLoading();
          const res = await window.api.recordSalaryPayment({
            employee_id: parseInt(empId, 10),
            month: month,
            payment_date: date,
            amount: numAmount,
            payment_method: method,
            notes: notes
          });

          if (res && res.success) {
            const msg = advanceAmount > 0
              ? `Paid Rs. ${numAmount.toLocaleString()} (Includes Rs. ${advanceAmount.toLocaleString()} Advance) to ${empName}. Synced to Expenses!`
              : `Paid Rs. ${numAmount.toLocaleString()} to ${empName}. Added to Expenses under Salaries!`;
            app.showToast(msg, 'success');
            this.closeModal();
            await this.loadData();
          } else {
            app.showAlert({ title: 'Payment Error', message: (res && res.error) || 'Failed to record salary payment.' });
          }
        } catch (err) {
          console.error('Error submitting salary payment:', err);
          app.showAlert({ title: 'Error', message: err.message || 'Error recording salary payment.' });
        } finally {
          app.hideLoading();
        }
      }
    });
  },

  closeModal() {
    if (this._attKeydownHandler) {
      document.removeEventListener('keydown', this._attKeydownHandler);
      this._attKeydownHandler = null;
    }
    this._attModalState = null;
    const modalBox = document.getElementById('emp-modals-container');
    if (modalBox) modalBox.innerHTML = '';
  },

  // -----------------------------------------------------------------------------------------
  // PRINT FUNCTIONALITY
  // -----------------------------------------------------------------------------------------
  printCurrentView() {
    if (this.activeSubTab === 'attendance') {
      this.printAttendanceSheet();
    } else if (this.activeSubTab === 'history') {
      this.printPaymentsLedger();
    } else {
      this.printSalariesSheet();
    }
  },

  printPaymentsLedger() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const payments = this.getFilteredPayments();
    const [y, m] = (this.selectedMonth || '').split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthNames[parseInt(m, 10) - 1] ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : (this.selectedMonth || '');

    const empList = this.getEmployeesForFilter();
    const selectedEmpObj = empList.find(e => String(e.id) === String(this.paymentEmployeeFilter));
    const scopeLabel = this.paymentScope === 'all' ? 'All History' : monthLabel;
    const filterTitle = selectedEmpObj ? `Employee: ${selectedEmpObj.name} (${scopeLabel})` : `Period: ${scopeLabel}`;
    const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 12px;">
          <h1 style="font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase;">${company}</h1>
          <h2 style="font-size: 15px; font-weight: 700; margin: 4px 0 0; color: #475569;">Salary Payment Ledger</h2>
          <div style="font-size: 12px; font-weight: 600; color: #2563eb; margin-top: 4px;">${filterTitle}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-transform: uppercase;">
              <th style="padding: 8px; text-align: center; width: 35px; border: 1px solid #cbd5e1;">#</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Date &amp; Time</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Employee</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Month</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #cbd5e1;">Amount</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Method</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${payments.length === 0 ? `
              <tr>
                <td colspan="7" style="padding: 20px; text-align: center; color: #94a3b8; font-weight: bold;">
                  No payment records found.
                </td>
              </tr>
            ` : payments.map((p, i) => `
              <tr style="border-bottom: 1px solid #e2e8f0; ${i % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 6px 8px; text-align: center; border: 1px solid #e2e8f0;">${i + 1}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: bold; white-space: nowrap;">${p.payment_date ? app.formatDateTime(p.payment_date, p.created_at) : 'N/A'}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${p.employee_name || 'Staff'}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${p.month || '-'}</td>
                <td style="padding: 6px 8px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: #047857;">Rs. ${Math.round(p.amount || 0).toLocaleString()}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${p.payment_method || 'Cash'}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; color: #64748b;">${p.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: 900; border-top: 2px solid #0f172a;">
              <td colspan="4" style="padding: 8px; text-align: right; text-transform: uppercase;">Total Disbursed:</td>
              <td style="padding: 8px; text-align: right; color: #047857; font-size: 13px;">Rs. ${Math.round(total).toLocaleString()}</td>
              <td colspan="2" style="padding: 8px;"></td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <span>Printed on: ${new Date().toLocaleString()}</span>
          <span>Records: ${payments.length}</span>
        </div>
      </div>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Salary Payment Ledger - ${company}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10mm; }
              @page { size: portrait; margin: 8mm; }
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 600);
            };
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    }
  },

  printSalariesSheet() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const emps = this.employees || [];
    const [y, m] = this.selectedMonth.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthNames[parseInt(m, 10) - 1] ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : this.selectedMonth;

    const totalSalary = emps.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    const totalPaid = emps.reduce((sum, e) => sum + (Number(e.paid_amount) || 0), 0);
    const totalRemaining = Math.max(0, totalSalary - totalPaid);

    const html = `
      <div class="receipt-a5" style="width: 100%; max-width: 148mm; margin: 0 auto; padding: 4px; font-family: 'Poppins', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
          <h1 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; color: #000;">${company}</h1>
          <p style="font-size: 9px; color: #000; margin: 2px 0 0 0; font-weight: 600;">
            MONTHLY PAYROLL &amp; SALARY SHEET &bull; ${monthLabel.toUpperCase()}
          </p>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; border: 1.5px solid #000; padding: 4px 8px; margin-bottom: 6px;">
          <span>TOTAL STAFF: ${emps.length}</span>
          <span>TOTAL SALARIES: Rs. ${Math.round(totalSalary).toLocaleString()}</span>
          <span>PAID: Rs. ${Math.round(totalPaid).toLocaleString()}</span>
          <span>REMAINING: Rs. ${Math.round(totalRemaining).toLocaleString()}</span>
        </div>

        <table class="a5-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 8.5px; margin-top: 4px; margin-bottom: 6px; background: #fff;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 25px;">#</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">Employee Name</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 105px;">Attendance</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: right;">Base Salary</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: right;">Paid</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: right;">Remaining</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 75px;">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${emps.map((e, idx) => {
              const attRecord = this.attendanceData?.employees?.find(a => Number(a.id) === Number(e.id));
              const attSum = attRecord?.summary || { present: 0, absent: 0, halfDay: 0, overtime: 0 };
              return `
              <tr>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 3px; font-weight: 700;">${e.full_name}</td>
                <td style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 8px; font-weight: bold;">
                  P:${attSum.present} A:${attSum.absent} HD:${attSum.halfDay} OT:${attSum.overtime}${attSum.overtimeHours ? ` (${attSum.overtimeHours}h)` : ''}
                </td>
                <td style="border: 1px solid #000; padding: 3px; text-align: right; font-weight: 600;">Rs. ${Math.round(e.salary || 0).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 3px; text-align: right; color: #059669; font-weight: 700;">Rs. ${Math.round(e.paid_amount || 0).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 3px; text-align: right; font-weight: 700; color: ${e.remaining_salary > 0 ? '#b45309' : '#059669'};">Rs. ${Math.round(e.remaining_salary || 0).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 3px;"></td>
              </tr>
            `}).join('')}
          </tbody>
        </table>

        <div style="margin-top: 25px; display: flex; justify-content: space-between;">
          <div style="border-top: 1.5px solid #000; width: 40%; text-align: center; font-size: 9px; padding-top: 3px; font-weight: 700; text-transform: uppercase;">
            Accountant Signature
          </div>
          <div style="border-top: 1.5px solid #000; width: 40%; text-align: center; font-size: 9px; padding-top: 3px; font-weight: 700; text-transform: uppercase;">
            Factory Manager Signature
          </div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Monthly Salary Sheet - ${monthLabel}`);
  },

  printAttendanceSheet() {
    const settings = app.settings || {};
    const company = settings.company_name || 'Delicious Superstar Foods';
    const att = this.attendanceData || { daysInMonth: 30, employees: [] };
    const daysInMonth = att.daysInMonth || 30;
    const emps = att.employees || [];
    const [y, m] = this.selectedMonth.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthNames[parseInt(m, 10) - 1] ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : this.selectedMonth;

    const html = `
      <div style="width: 100%; margin: 0 auto; padding: 6px; font-family: 'Poppins', sans-serif; color: #000; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
          <h1 style="font-size: 15px; font-weight: 700; text-transform: uppercase; margin: 0;">${company}</h1>
          <p style="font-size: 9px; margin: 2px 0 0 0; font-weight: 700;">MONTHLY ATTENDANCE REGISTER &bull; ${monthLabel.toUpperCase()}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 7.5px; text-align: center;">
          <thead>
            <tr style="background: #e2e8f0; font-weight: 700;">
              <th style="border: 1px solid #000; padding: 2px; width: 18px;">#</th>
              <th style="border: 1px solid #000; padding: 2px 4px; text-align: left; width: 100px;">Employee</th>
              ${Array.from({ length: daysInMonth }, (_, i) => `
                <th style="border: 1px solid #000; padding: 2px; min-width: 14px;">${i + 1}</th>
              `).join('')}
              <th style="border: 1px solid #000; padding: 2px; width: 22px; background: #dcfce7;">P</th>
              <th style="border: 1px solid #000; padding: 2px; width: 22px; background: #fee2e2;">A</th>
              <th style="border: 1px solid #000; padding: 2px; width: 22px; background: #fef3c7;">HD</th>
              <th style="border: 1px solid #000; padding: 2px; width: 22px; background: #dbeafe;">OT</th>
            </tr>
          </thead>
          <tbody>
            ${emps.map((emp, idx) => {
              const empAtt = emp.attendance || {};
              const sum = emp.summary || { present: 0, absent: 0, halfDay: 0, overtime: 0 };
              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 2px;">${idx + 1}</td>
                  <td style="border: 1px solid #000; padding: 2px 4px; text-align: left; font-weight: 700; white-space: nowrap;">${emp.full_name}</td>
                  ${Array.from({ length: daysInMonth }, (_, i) => {
                    const dStr = `${this.selectedMonth}-${String(i + 1).padStart(2, '0')}`;
                    const st = empAtt[dStr] || '';
                    const isOT = st === 'OT' || (typeof st === 'string' && st.startsWith('OT'));
                    const col = st === 'P' ? '#059669' : st === 'A' ? '#dc2626' : st === 'HD' ? '#d97706' : isOT ? '#2563eb' : '#cbd5e1';
                    return `
                      <td style="border: 1px solid #000; padding: 1px; font-weight: 700; color: ${col};">
                        ${st || '&middot;'}
                      </td>
                    `;
                  }).join('')}
                  <td style="border: 1px solid #000; padding: 2px; font-weight: 700; background: #f0fdf4;">${sum.present || 0}</td>
                  <td style="border: 1px solid #000; padding: 2px; font-weight: 700; background: #fef2f2;">${sum.absent || 0}</td>
                  <td style="border: 1px solid #000; padding: 2px; font-weight: 700; background: #fffbeb;">${sum.halfDay || sum.hd || 0}</td>
                  <td style="border: 1px solid #000; padding: 2px; font-weight: 700; background: #eff6ff;">${sum.overtime || sum.ot || 0}${sum.otHours ? `<div style="font-size: 6.5px; color: #2563eb; line-height: 1;">${sum.otHours}h</div>` : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 8.5px; font-weight: 700;">
          <div style="border-top: 1px solid #000; width: 30%; text-align: center; padding-top: 2px;">Supervisor</div>
          <div style="border-top: 1px solid #000; width: 30%; text-align: center; padding-top: 2px;">HR / Admin</div>
          <div style="border-top: 1px solid #000; width: 30%; text-align: center; padding-top: 2px;">Factory Manager</div>
        </div>
      </div>
    `;

    app.showA5Preview(html, `Attendance Register - ${monthLabel}`);
  }
};

window.Employees = Employees;
