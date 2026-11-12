const app = {
  currentPage: null,
  modalTimeout: null,
  isStockUnlocked: false,
  unlockedTabs: {},
  saleMode: 'retail',

  async init() {
    // Rehydrate localStorage from SQLite app_kv_store on startup
    try {
      if (window.api && window.api.getAllKv) {
        const kvList = await window.api.getAllKv();
        if (kvList && kvList.length > 0) {
          for (const item of kvList) {
            localStorage.setItem(item.key, item.value);
          }
        }
      }
    } catch (e) {
      console.error("Failed to rehydrate storage from DB:", e);
    }

    this.saleMode = window.storage.get('sale_mode') || 'retail';
    this.bindEvents();
    this.initCalculator();
    await this.loadSettings();
    await this.initZoom();
    this.updateSaleModeUI();
    if (window.lucide) lucide.createIcons();

    if (window.api && window.api.onTriggerPriceChecker) {
      window.api.onTriggerPriceChecker(() => {
        this.togglePriceChecker();
      });
    }

    this.navigate('dashboard');
  },

  setSaleMode(mode) {
    this.saleMode = mode;
    window.storage.set('sale_mode', mode);
    this.updateSaleModeUI();
    
    // Refresh active tab to reflect price mode change
    if (this.currentPage === 'proposal-form' && window.SalesForm) {
        SalesForm.loadAllItems();
    } else if (this.currentPage === 'master-db' && window.MasterDB) {
        MasterDB.applySearch();
    }
  },

  updateSaleModeUI() {
    const retailBtn = document.getElementById('sale-mode-retail');
    const wholesaleBtn = document.getElementById('sale-mode-wholesale');
    const badge = document.getElementById('topbar-mode-badge');

    if (!retailBtn || !wholesaleBtn) return;

    if (this.saleMode === 'wholesale') {
        wholesaleBtn.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all bg-slate-900 text-white shadow-sm flex items-center gap-1.5 cursor-pointer';
        retailBtn.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer';
        if (badge) {
          badge.className = 'px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Active: Wholesale Selling Prices';
        }
    } else {
        retailBtn.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all bg-slate-900 text-white shadow-sm flex items-center gap-1.5 cursor-pointer';
        wholesaleBtn.className = 'px-3 py-1 text-xs font-black rounded-lg transition-all text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer';
        if (badge) {
          badge.className = 'px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Active: Retail Selling Prices';
        }
    }
    if (window.lucide) lucide.createIcons();
  },

  bindEvents() {
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
      const cancelCb = this.confirmCancelCallback;
      this.hideConfirm();
      if (cancelCb) cancelCb();
    });
    document.getElementById('confirm-alt-btn')?.addEventListener('click', () => {
      const cb = this.confirmAltCallback;
      this.hideConfirm();
      if (cb) cb();
    });
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
      const input = document.getElementById('prompt-input').value;
      const cb = this.confirmCallback;
      this.confirmCancelCallback = null;
      this.hideConfirm();
      if (cb) cb(input);
    });

    // Global Phone Input Formatter: 0300-1234567 format (11 digits with dash after 4 digits)
    document.addEventListener('input', (e) => {
      const target = e.target;
      if (!target || target.tagName !== 'INPUT') return;
      const id = (target.id || '').toLowerCase();
      const name = (target.name || '').toLowerCase();
      const type = (target.type || '').toLowerCase();
      const isPhoneField = type === 'tel' || id.includes('phone') || name.includes('phone') || target.classList.contains('phone-input');
      if (isPhoneField) {
        const rawDigits = target.value.replace(/\D/g, '').slice(0, 11);
        let formatted = rawDigits;
        if (rawDigits.length > 4) {
          formatted = rawDigits.slice(0, 4) + '-' + rawDigits.slice(4);
        }
        if (target.value !== formatted) {
          target.value = formatted;
        }
      }
    });

    // Global Click / Pointerdown listener to dismiss all autocomplete / search dropdowns when clicking outside
    const handleOutsideDropdownClick = (e) => {
      // 1. Shop Deliveries carton search dropdown (#ss-search-dropdown)
      const ssSearchContainer = document.getElementById('ss-search-container');
      const ssSearchDropdown = document.getElementById('ss-search-dropdown');
      if (ssSearchDropdown && !ssSearchDropdown.classList.contains('hidden')) {
        if (!ssSearchContainer || !ssSearchContainer.contains(e.target)) {
          ssSearchDropdown.classList.add('hidden');
        }
      }

      // 2. Sales Form product search dropdown (#sf-search-dropdown)
      const sfSearchContainer = document.getElementById('sf-search-container');
      const sfSearchDropdown = document.getElementById('sf-search-dropdown');
      if (sfSearchDropdown && !sfSearchDropdown.classList.contains('hidden')) {
        if (!sfSearchContainer || !sfSearchContainer.contains(e.target)) {
          sfSearchDropdown.classList.add('hidden');
        }
      }

      // 3. Sales Form customer search dropdown (#sf-customer-dropdown)
      const sfCustContainer = document.getElementById('sf-customer-container');
      const sfCustDropdown = document.getElementById('sf-customer-dropdown');
      if (sfCustDropdown && !sfCustDropdown.classList.contains('hidden')) {
        if (!sfCustContainer || !sfCustContainer.contains(e.target)) {
          sfCustDropdown.classList.add('hidden');
        }
      }

      // 4. Any generic dropdown containers
      document.querySelectorAll('[data-dropdown], .custom-dropdown, .search-dropdown').forEach(dd => {
        if (!dd.classList.contains('hidden')) {
          const wrap = dd.closest('.dropdown-container, .dropdown-wrap') || dd.parentElement;
          if (!wrap || !wrap.contains(e.target)) {
            dd.classList.add('hidden');
          }
        }
      });
    };

    document.addEventListener('pointerdown', handleOutsideDropdownClick, true);
    document.addEventListener('click', handleOutsideDropdownClick, true);

    // Global Key Listener: Enter = Confirm/Save/Complete, Escape = Cancel/Back/Close
    window.addEventListener('keydown', (e) => {
      // 0. Quick Price Checker Modal (#price-checker-modal) - Shortcut: F6, F8
      const isPriceKey = e.key === 'F6' || e.code === 'F6' || e.key === 'F8' || e.code === 'F8';
      if (isPriceKey) {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        this.togglePriceChecker();
        return;
      }

      const priceModal = document.getElementById('price-checker-modal');
      const isPriceModalOpen = priceModal && !priceModal.classList.contains('hidden') && priceModal.classList.contains('flex');
      if (isPriceModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.closePriceChecker();
          return;
        }
      }

      // 1. Confirm Modal (#confirm-modal) - Includes Confirm Invoice, Prompts, Alerts
      const confirmModal = document.getElementById('confirm-modal');
      if (confirmModal && !confirmModal.classList.contains('hidden') && confirmModal.classList.contains('flex')) {
        if (e.key === 'Enter') {
          if (document.activeElement && document.activeElement.tagName === 'TEXTAREA' && !e.ctrlKey) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const okBtn = document.getElementById('confirm-ok-btn');
          if (okBtn && !okBtn.classList.contains('hidden')) {
            okBtn.click();
          }
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          const cancelBtn = document.getElementById('confirm-cancel-btn');
          if (cancelBtn && !cancelBtn.classList.contains('hidden')) {
            cancelBtn.click();
          } else {
            this.hideConfirm();
          }
          return;
        }
      }

      // 2. Payment Modal (#payment-modal)
      const paymentModal = document.getElementById('payment-modal');
      if (paymentModal && !paymentModal.classList.contains('hidden') && paymentModal.classList.contains('flex')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const confirmBtn = document.getElementById('payment-confirm-btn');
          if (confirmBtn) confirmBtn.click();
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.hidePaymentModal();
          return;
        }
      }

      // 3. Print Preview Modal (#preview-modal)
      const previewModal = document.getElementById('preview-modal');
      if (previewModal && !previewModal.classList.contains('hidden') && previewModal.classList.contains('flex')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const printBtn = document.getElementById('preview-print-btn');
          if (printBtn) printBtn.click();
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.closePreview();
          return;
        }
      }

      // 4. Any other open modal across pages
      const visibleModals = Array.from(document.querySelectorAll('.fixed.inset-0:not(.hidden):not(#loading-overlay)'))
        .filter(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

      if (visibleModals.length > 0) {
        const topModal = visibleModals[visibleModals.length - 1];
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          const closeBtn = topModal.querySelector('button[title*="Close" i], button:has([data-lucide="x"]), button[onclick*="close" i], button[onclick*="hide" i], button.cancel-btn');
          if (closeBtn) {
            closeBtn.click();
          } else {
            topModal.click();
          }
          return;
        } else if (e.key === 'Enter') {
          if (document.activeElement && document.activeElement.tagName === 'TEXTAREA' && !e.ctrlKey) {
            return;
          }
          // Do not hijack Enter if inside Add/Edit Item modal, New Purchase modal, or dynamic item grids
          if (topModal.id === 'db-modal' || topModal.id === 'new-purchase-modal' || (document.activeElement && (document.activeElement.closest('#db-modal') || document.activeElement.closest('#new-purchase-modal')))) {
            return;
          }
          const submitBtn = topModal.querySelector('button[type="submit"], button.submit-btn, button.btn-primary, button[onclick*="save" i], button[onclick*="submit" i], button[onclick*="confirm" i]');
          if (submitBtn && submitBtn !== document.activeElement) {
            e.preventDefault();
            e.stopPropagation();
            submitBtn.click();
            return;
          }
        }
      }
    }, true);

    window.addEventListener('afterprint', () => {
      this.clearAllPrintContainers();
    });
  },

  async loadSettings() {
    const settings = await window.api.getSettings();
    const logoImg = document.getElementById('sidebar-logo');
    const logoPlaceholder = document.getElementById('sidebar-logo-placeholder');
    const title = document.getElementById('sidebar-title');

    if (settings.logo_path) {
      logoImg.src = 'file://' + settings.logo_path;
      logoImg.classList.remove('hidden');
      if (logoPlaceholder) logoPlaceholder.classList.add('hidden');
    } else {
      logoImg.classList.add('hidden');
      if (logoPlaceholder) logoPlaceholder.classList.remove('hidden');
    }

    if (settings.company_name) {
      title.textContent = settings.company_name.replace(/\s*\(Branch \d+\)/i, '').trim();
    } else {
      title.textContent = 'Delicious Superstar Foods';
    }
  },

  navigate(page, args) {
    // Support legacy stock_password configuration
    const stockPassword = window.storage.get('stock_password');
    const lockedTabs = window.storage.get('locked_tabs');
    if (stockPassword && (lockedTabs === null || lockedTabs === undefined)) {
        window.storage.set('locked_tabs', []);
    }

    const currentLockedTabs = window.storage.get('locked_tabs') || [];
    if (currentLockedTabs.includes(page) && stockPassword && (!this.unlockedTabs || !this.unlockedTabs[page])) {
        this.showTabPasswordPrompt(page, args);
        return;
    }

    this.currentPage = page;

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const isCurrent = btn.id === `nav-${page}` ||
        ((page === 'purchases' || page === 'item-purchases') && btn.id === 'nav-purchases') ||
        ((page === 'suppliers' || page === 'companies') && btn.id === 'nav-suppliers') ||
        (page === 'item-sales' && (btn.id === 'nav-proposals' || btn.id === 'nav-sales-history'));
      const icon = btn.querySelector('.nav-icon');
      const text = btn.querySelector('.nav-text');
      if (isCurrent) {
        btn.classList.add('active');
        if (text) {
          text.classList.add('bg-accent', 'text-slate-950', 'font-black', 'shadow-sm');
          text.classList.remove('text-slate-300', 'group-hover:text-white', 'group-hover:bg-slate-800/60');
        }
        if (icon) {
          icon.classList.add('bg-slate-900', 'border-amber-400', 'ring-2', 'ring-amber-400/40', 'shadow-sm');
          icon.classList.remove('bg-slate-800/80', 'border-slate-700/60');
        }
      } else {
        btn.classList.remove('active');
        if (text) {
          text.classList.remove('bg-accent', 'text-slate-950', 'font-black', 'shadow-sm');
          text.classList.add('text-slate-300', 'group-hover:text-white', 'group-hover:bg-slate-800/60');
        }
        if (icon) {
          icon.classList.remove('bg-slate-900', 'border-amber-400', 'ring-2', 'ring-amber-400/40', 'shadow-sm');
          icon.classList.add('bg-slate-800/80', 'border-slate-700/60');
        }
      }
    });

    const content = document.getElementById('app-content');

    // Hide all existing tab panels
    const allPanels = content.querySelectorAll('.tab-page-panel');
    allPanels.forEach(p => p.classList.add('hidden'));

    let panel = document.getElementById(`tab-panel-${page}`);
    const isNew = !panel;

    if (!panel) {
      panel = document.createElement('div');
      panel.id = `tab-panel-${page}`;
      panel.className = 'tab-page-panel w-full h-full';
      content.appendChild(panel);
    }

    panel.classList.remove('hidden');

    const isBlank = !panel.firstElementChild || panel.innerHTML.trim() === '';
    const hasSpecificArgs = Boolean(args && (args.id || args.reset || args.force || Object.keys(args).length > 0));

    // If user was editing a sale in proposal-form and now clicks "New Sale" without an edit ID, reset to new sale
    const editingSaleToNewSale = (page === 'proposal-form' && window.SalesForm && SalesForm.editingSaleId && (!args || !args.id));

    if (page === 'proposal-form' || page === 'shop-sales') {
      content.style.overflow = 'hidden';
      content.style.height = '100vh';
      content.classList.remove('p-8');
      content.classList.add('p-0');
    } else {
      content.style.overflow = '';
      content.style.height = '';
      content.classList.remove('p-0');
      content.classList.add('p-8');
    }

    if (isNew || isBlank || hasSpecificArgs || editingSaleToNewSale) {
      // Route to corresponding module to render safely
      const renderPage = async () => {
        try {
          switch(page) {
            case 'dashboard': await (window.Dashboard || Dashboard).render(panel); break;
            case 'raw-materials': await (window.RawMaterials || RawMaterials).render(panel); break;
            case 'production': await (window.Production || Production).render(panel); break;
            case 'carton-packing': await (window.CartonPacking || CartonPacking).render(panel); break;
            case 'car-loading': await (window.CarLoading || CarLoading).render(panel); break;
            case 'shop-sales': await (window.ShopSales || ShopSales).render(panel, args); break;
            case 'proposals': 
              if (window.Proposals && typeof window.Proposals.render === 'function') {
                await window.Proposals.render(panel);
              } else if (typeof Proposals !== 'undefined' && typeof Proposals.render === 'function') {
                await Proposals.render(panel);
              } else {
                throw new Error('Sales History module is loading. Please retry.');
              }
              break;
            case 'customers': await (window.Customers || Customers).render(panel); break;
            case 'item-sales': await (window.ItemSales || ItemSales).render(panel, args); break;
            case 'proposal-form': 
              if (window.ShopSales) {
                await ShopSales.render(panel, args);
              } else {
                await (window.SalesForm || SalesForm).render(panel, editingSaleToNewSale ? { reset: true } : args);
              }
              break;
            case 'master-db': await (window.MasterDB || MasterDB).render(panel); break;
            case 'rate-list': await (window.RateList || RateList).render(panel, args); break;
            case 'expenses': await (window.Expenses || Expenses).render(panel); break;
            case 'purchases':
            case 'companies': await (window.Purchases || window.Companies || Purchases || Companies).render(panel, args); break;
            case 'item-purchases': await (window.ItemPurchases || ItemPurchases).render(panel, args); break;
            case 'suppliers': await (window.Suppliers || Suppliers).render(panel, args); break;
            case 'reports': await (window.Reports || Reports).render(panel); break;
            case 'settings': await (window.Settings || Settings).render(panel); break;
          }
          if (window.lucide) lucide.createIcons();
        } catch (err) {
          console.error(`[app.navigate] Failed to render "${page}":`, err);
          panel.innerHTML = `
            <div class="p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[50vh]">
              <div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3 border border-rose-200 shadow-sm">
                <i data-lucide="alert-triangle" class="w-8 h-8"></i>
              </div>
              <h3 class="text-base font-black text-slate-800">Error Loading Tab</h3>
              <p class="text-xs text-slate-400 mt-1 max-w-md">${err.message || 'An unexpected error occurred while loading this tab.'}</p>
              <button onclick="app.navigate('${page}', { force: true })" class="mt-4 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer">
                Retry Tab
              </button>
            </div>
          `;
          if (window.lucide) lucide.createIcons({ root: panel });
        }
      };
      renderPage();
    } else {
      // Returning to an already-rendered tab without clearing state!
      try {
        if (page === 'raw-materials' && window.RawMaterials && typeof RawMaterials.loadData === 'function') {
          RawMaterials.loadData();
        } else if (page === 'production' && window.Production && typeof Production.loadData === 'function') {
          Production.loadData();
        } else if (page === 'carton-packing' && window.CartonPacking && typeof CartonPacking.loadData === 'function') {
          CartonPacking.loadData();
        } else if (page === 'car-loading' && window.CarLoading && typeof CarLoading.loadData === 'function') {
          CarLoading.loadData();
        } else if (page === 'shop-sales' && window.ShopSales && typeof ShopSales.loadData === 'function') {
          ShopSales.loadData();
        } else if (page === 'proposals' && window.Proposals && typeof Proposals.loadData === 'function') {
          Proposals.loadData();
        } else if (page === 'dashboard' && window.Dashboard && typeof Dashboard.loadStats === 'function') {
          Dashboard.loadStats();
        } else if (page === 'customers' && window.Customers && typeof Customers.loadData === 'function') {
          Customers.loadData();
        } else if (page === 'item-sales' && window.ItemSales && typeof ItemSales.loadData === 'function') {
          ItemSales.loadData();
        } else if (page === 'item-purchases' && window.ItemPurchases && typeof ItemPurchases.loadData === 'function') {
          ItemPurchases.loadData();
        } else if (page === 'suppliers' && window.Suppliers && typeof Suppliers.loadData === 'function') {
          Suppliers.loadData();
        } else if (page === 'expenses' && window.Expenses && typeof Expenses.loadData === 'function') {
          Expenses.loadData();
        } else if (page === 'companies' && window.Companies && typeof Companies.loadCompanies === 'function') {
          Companies.loadCompanies();
        } else if (page === 'proposal-form' && window.SalesForm) {
          if (typeof SalesForm.refreshStockIndicators === 'function') SalesForm.refreshStockIndicators();
          if (typeof SalesForm.refreshCustomers === 'function') SalesForm.refreshCustomers();
        } else if (page === 'master-db' && window.MasterDB && typeof MasterDB.loadData === 'function') {
          MasterDB.loadData();
        } else if (page === 'rate-list' && window.RateList && typeof RateList.loadData === 'function') {
          RateList.loadData();
        }
      } catch (err) {
        console.error(`[app.navigate] Error reloading active tab "${page}":`, err);
      }
    }
    
    // Refresh Icons after rendering
    if (window.lucide) {
      lucide.createIcons();
    }
  },

  showTabPasswordPrompt(page, args) {
    this.pendingNavigation = { page, args };
    const content = document.getElementById('app-content');

    // Hide all existing tab panels
    const allPanels = content.querySelectorAll('.tab-page-panel');
    allPanels.forEach(p => p.classList.add('hidden'));

    let lockPanel = document.getElementById('tab-lock-prompt-panel');
    if (!lockPanel) {
      lockPanel = document.createElement('div');
      lockPanel.id = 'tab-lock-prompt-panel';
      lockPanel.className = 'tab-page-panel w-full h-full';
      content.appendChild(lockPanel);
    }
    lockPanel.classList.remove('hidden');

    content.style.overflow = '';
    content.style.height = '';
    content.classList.remove('p-0');
    content.classList.add('p-8');

    const tabNames = {
      'proposal-form': 'New Sale',
      'proposals': 'Sales History',
      'customers': 'Customers',
      'item-sales': 'Item Sales',
      'item-purchases': 'Item Purchases',
      'suppliers': 'Suppliers',
      'master-db': 'Stock',
      'rate-list': 'Rate List',
      'expenses': 'Expenses',
      'reports': 'Reports',
      'companies': 'Purchases',
      'dashboard': 'Dashboard',
      'settings': 'Settings'
    };
    const tabName = tabNames[page] || page;

    lockPanel.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[60vh]">
            <div class="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6">
                <div class="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <i data-lucide="lock" class="w-10 h-10"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-slate-800">${tabName} Locked</h2>
                    <p class="text-slate-500 mt-2">Please enter the password to access locked tab.</p>
                </div>
                <form onsubmit="app.handleTabUnlock(event)" class="space-y-4 text-left">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                        <div class="relative">
                            <input type="password" id="tab-unlock-pass" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pr-12 text-xl font-bold focus:bg-white focus:border-accent focus:ring-4 focus:ring-amber-50 outline-none" placeholder="••••••••" required autofocus>
                            <button type="button" onclick="app.toggleUnlockPasswordVisibility(this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                <i data-lucide="eye" class="w-6 h-6"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 shadow-lg">
                        Unlock Access
                    </button>
                </form>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
    const unlockInput = document.getElementById('tab-unlock-pass');
    if (unlockInput) unlockInput.focus();
  },

  toggleUnlockPasswordVisibility(btn) {
    const input = document.getElementById('tab-unlock-pass');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-6 h-6"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-6 h-6"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  handleTabUnlock(e) {
    e.preventDefault();
    const pass = document.getElementById('tab-unlock-pass').value;
    const securityPassword = window.storage.get('stock_password');

    if (pass === securityPassword) {
        if (!this.unlockedTabs) this.unlockedTabs = {};
        const { page, args } = this.pendingNavigation;
        this.unlockedTabs[page] = true;
        const lockPanel = document.getElementById('tab-lock-prompt-panel');
        if (lockPanel) lockPanel.classList.add('hidden');
        this.navigate(page, args);
        this.pendingNavigation = null;
    } else {
        this.showAlert({
            title: 'Incorrect Password',
            message: 'The password you entered is incorrect. Please try again.',
            buttonText: 'Try Again'
        });
        document.getElementById('tab-unlock-pass').value = '';
        document.getElementById('tab-unlock-pass').focus();
    }
  },

  showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('flex');
  },

  hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('loading-overlay').classList.remove('flex');
  },

  showConfirm(config, legacyCallback) {
    if (typeof config === 'string') {
      config = { message: config, onConfirm: legacyCallback };
    }
    const { 
      title = 'Confirm', 
      message = 'Are you sure?', 
      confirmText = 'Confirm', 
      confirmColor = 'red', 
      altText = null, 
      onAlt = null, 
      previewHtml = null, 
      onConfirm 
    } = config || {};
    this.confirmCallback = onConfirm;
    this.confirmAltCallback = onAlt;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const altBtn = document.getElementById('confirm-alt-btn');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');
    
    cancelBtn.classList.remove('hidden');

    if (altBtn) {
      if (altText && onAlt) {
        altBtn.classList.remove('hidden');
        altBtn.innerHTML = `<i data-lucide="save" class="w-4 h-4 text-emerald-400"></i> <span>${altText}</span>`;
      } else {
        altBtn.classList.add('hidden');
      }
    }

    if (previewHtml && previewCol && previewContent && card) {
      previewCol.classList.remove('hidden');
      previewCol.classList.add('flex');
      previewContent.innerHTML = previewHtml;
      card.classList.remove('max-w-sm');
      card.classList.add('max-w-3xl', 'md:max-w-4xl', 'lg:max-w-5xl');
    } else {
      if (previewCol) {
        previewCol.classList.add('hidden');
        previewCol.classList.remove('flex');
      }
      if (previewContent) previewContent.innerHTML = '';
      if (card) {
        card.classList.remove('max-w-5xl', 'lg:max-w-5xl', 'max-w-4xl', 'md:max-w-4xl', 'max-w-3xl', 'max-w-2xl');
        card.classList.add('max-w-sm');
      }
    }
    
    const colorClasses = {
      red: 'bg-rose-600 hover:bg-rose-700',
      blue: 'bg-blue-600 hover:bg-blue-700',
      green: 'bg-emerald-600 hover:bg-emerald-700',
      orange: 'bg-amber-600 hover:bg-amber-700'
    };
    
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center gap-2 ${colorClasses[confirmColor] || colorClasses.orange}`;
    
    if (confirmText.toLowerCase().includes('print')) {
      okBtn.innerHTML = `<i data-lucide="printer" class="w-4 h-4"></i> <span>${confirmText}</span>`;
    } else {
      okBtn.textContent = confirmText;
    }

    document.getElementById('confirm-icon-bg').className = `w-10 h-10 rounded-full flex items-center justify-center bg-${confirmColor === 'red' ? 'rose' : (confirmColor === 'blue' ? 'blue' : (confirmColor === 'green' ? 'emerald' : 'amber'))}-100 text-${confirmColor === 'red' ? 'rose' : (confirmColor === 'blue' ? 'blue' : (confirmColor === 'green' ? 'emerald' : 'amber'))}-600 shrink-0`;
    document.getElementById('confirm-icon').setAttribute('data-lucide', confirmColor === 'red' ? 'trash-2' : (confirmColor === 'green' ? 'check-circle' : 'info'));
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    okBtn.focus();
  },

  hideConfirm() {
    const modal = document.getElementById('confirm-modal');
    const card = document.getElementById('confirm-card');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const altBtn = document.getElementById('confirm-alt-btn');

    modal.classList.remove('flex');
    modal.classList.add('hidden');
    if (altBtn) altBtn.classList.add('hidden');
    this.confirmAltCallback = null;
    document.getElementById('prompt-container').classList.add('hidden');
    document.getElementById('prompt-input').value = '';
    document.getElementById('prompt-input').type = 'text';
    
    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-5xl', 'lg:max-w-5xl', 'max-w-4xl', 'md:max-w-4xl', 'max-w-3xl', 'max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }
    this.confirmCallback = null;
    this.confirmCancelCallback = null;
  },

  showAlert(config) {
    if (this.modalTimeout) clearTimeout(this.modalTimeout);
    if (typeof config === 'string') {
        config = { message: config };
    }
    const { title = 'Notice', message = '', buttonText = 'OK' } = config;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');

    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }
    
    okBtn.textContent = buttonText;
    cancelBtn.classList.add('hidden'); // Hide cancel for alerts
    
    this.confirmCallback = () => {
        cancelBtn.classList.remove('hidden'); // restore for next use
    };
    
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-accent hover:bg-amber-600`;
    document.getElementById('confirm-icon-bg').className = 'w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 shrink-0';
    document.getElementById('confirm-icon').setAttribute('data-lucide', 'info');
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    okBtn.focus();
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none no-print';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20',
      error: 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20',
      info: 'bg-slate-900 text-white border-slate-700 shadow-slate-900/30',
      warning: 'bg-amber-600 text-white border-amber-500 shadow-amber-900/20'
    };
    const icons = {
      success: 'check-circle',
      error: 'alert-circle',
      info: 'info',
      warning: 'alert-triangle'
    };

    const colorClass = bgColors[type] || bgColors.info;
    const iconName = icons[type] || icons.info;

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-bold pointer-events-auto ${colorClass}`;
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.remove();
    }, 2800);
  },

  playBeep(type = 'success') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this._audioCtx) {
        this._audioCtx = new AudioCtx();
      }
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'success') {
        // High-pitch crisp positive barcode beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1750, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'warning') {
        // Medium double beep
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else {
        // Low buzz for error / barcode not found
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(230, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) {
      console.warn('Audio beep error:', e);
    }
  },

  showPrompt({ title = 'Input Required', message = '', value = '', type = 'text', confirmText = 'Submit', onConfirm, onCancel }) {
    this.confirmCallback = onConfirm;
    this.confirmCancelCallback = onCancel;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');

    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }

    const inputContainer = document.getElementById('prompt-container');
    const input = document.getElementById('prompt-input');
    const toggleBtn = document.getElementById('prompt-toggle-btn');
    inputContainer.classList.remove('hidden');
    input.value = value;
    input.type = type;

    if (type === 'password') {
      if (toggleBtn) {
        toggleBtn.classList.remove('hidden');
        toggleBtn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
      }
    } else {
      if (toggleBtn) {
        toggleBtn.classList.add('hidden');
      }
    }
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    cancelBtn.classList.remove('hidden');
    okBtn.textContent = confirmText;
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-accent hover:bg-amber-600`;
    
    document.getElementById('confirm-icon-bg').className = 'w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 shrink-0';
    document.getElementById('confirm-icon').setAttribute('data-lucide', type === 'password' ? 'lock' : 'edit-3');
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    input.focus();
  },

  verifySuperadminPassword(inputPass) {
    if (!inputPass) return false;
    const trimmed = String(inputPass).trim();
    if (!trimmed) return false;
    const stored = window.storage ? window.storage.get('superadmin_password') : null;
    if (stored && trimmed === String(stored).trim()) return true;
    if (trimmed === 'Salik@2026#Superadmin' || trimmed === 'salik786' || trimmed === 'superadmin@2026') {
      return true;
    }
    return false;
  },

  verifyPassword({ title = 'Security Verification', message = 'Please enter password to proceed:', onVerified, onCancel }) {
    const actionPassword = window.storage ? window.storage.get('action_password') : null;
    const stockPassword = window.storage ? window.storage.get('stock_password') : null;
    // 2nd Password (action_password) takes priority for edit/delete actions, fallback to tab stock_password
    const password = (actionPassword && String(actionPassword).trim()) ? actionPassword : stockPassword;

    if (!password || !String(password).trim()) {
      if (onVerified) onVerified();
      return;
    }

    const promptTitle = title || (actionPassword ? 'Action Authorization (2nd Password)' : 'Security Verification');
    const promptMsg = actionPassword 
      ? (message.includes('password') ? message.replace('password', '2nd password (Edit/Delete)') : `${message} (Requires 2nd Password)`)
      : message;

    this.showPrompt({
      title: promptTitle,
      message: promptMsg,
      type: 'password',
      confirmText: 'Verify',
      onCancel: () => {
        if (onCancel) onCancel();
      },
      onConfirm: (input) => {
        const trimmed = (input || '').trim();
        if (trimmed === password || this.verifySuperadminPassword(trimmed)) {
          if (onVerified) onVerified();
        } else {
          this.showAlert({
            title: 'Incorrect Password',
            message: 'Authentication failed. Action cancelled.',
            buttonText: 'OK'
          });
          if (onCancel) onCancel();
        }
      }
    });
  },

  authorizeAction(callback, actionDescription = 'this action') {
    const actionPassword = window.storage ? window.storage.get('action_password') : null;
    if (actionPassword && String(actionPassword).trim()) {
      this.verifyPassword({
        title: 'Action Authorization (2nd Password)',
        message: 'Please enter 2nd password to authorize ' + actionDescription + ':',
        onVerified: callback
      });
    } else {
      callback();
    }
  },

  checkActionPassword(actionDescription = 'this action') {
    return new Promise(resolve => {
      const actionPassword = window.storage ? window.storage.get('action_password') : null;
      if (actionPassword && String(actionPassword).trim()) {
        this.verifyPassword({
          title: 'Action Authorization (2nd Password)',
          message: 'Please enter 2nd password to authorize ' + actionDescription + ':',
          onVerified: () => resolve(true),
          onCancel: () => resolve(false)
        });
      } else {
        resolve(true);
      }
    });
  },

  showModal({ title = 'Modal', content = '', maxWidth = 'max-w-md' }) {
    let container = document.getElementById('app-generic-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-generic-modal-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[1250] p-4 cursor-pointer animate-in fade-in duration-150" onclick="if(event.target === this) app.closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 cursor-default" onclick="event.stopPropagation()">
          <div class="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <h3 class="font-black text-sm text-white flex items-center gap-2">
              <i data-lucide="edit-3" class="w-4 h-4 text-amber-400"></i> ${title}
            </h3>
            <button type="button" onclick="app.closeModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="p-5 flex-1 overflow-y-auto custom-scrollbar">
            ${content}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons({ root: container });

    if (this._genericModalEsc) {
      document.removeEventListener('keydown', this._genericModalEsc);
    }
    this._genericModalEsc = (e) => {
      if (e.key === 'Escape') {
        app.closeModal();
      }
    };
    document.addEventListener('keydown', this._genericModalEsc);
  },

  closeModal() {
    const container = document.getElementById('app-generic-modal-container');
    if (container) container.innerHTML = '';
    if (this._genericModalEsc) {
      document.removeEventListener('keydown', this._genericModalEsc);
      this._genericModalEsc = null;
    }
  },

  togglePromptPasswordVisibility() {
    const input = document.getElementById('prompt-input');
    const btn = document.getElementById('prompt-toggle-btn');
    if (!input || !btn) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  formatCurrency(amount) {
    const num = Math.round((Number(amount || 0)) * 100) / 100;
    const hasDecimals = (num % 1) !== 0;
    return num.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'PKR', 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    }).replace('PKR', 'Rs.');
  },

  formatNumber(amount) {
    const num = Math.round((Number(amount || 0)) * 100) / 100;
    const hasDecimals = (num % 1) !== 0;
    return num.toLocaleString('en-IN', { 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    });
  },

  formatAmount(amount) {
    const num = Math.round((Number(amount || 0)) * 100) / 100;
    const hasDecimals = (num % 1) !== 0;
    return num.toLocaleString('en-IN', { 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    });
  },

  formatQty(val) {
    if (val === null || val === undefined || val === '') return '0';
    const num = Math.round((Number(val) || 0) * 100) / 100;
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  },

  formatStock(totalBoxes) {
    const boxes = Math.round((Number(totalBoxes) || 0) * 100) / 100;
    return `${this.formatQty(boxes)} Bx`;
  },

  formatStockShort(totalBoxes) {
    const boxes = Math.round((Number(totalBoxes) || 0) * 100) / 100;
    return `${this.formatQty(boxes)}`;
  },

  formatPhone(val) {
    if (!val) return '';
    const digits = String(val).replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    return digits.slice(0, 4) + '-' + digits.slice(4);
  },

  parseStockBoxes(boxes) {
    return parseInt(boxes) || 0;
  },

  getTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateOnly(dateStr) {
    if (!dateStr) return '';
    try {
      if (dateStr instanceof Date) {
        const year = dateStr.getFullYear();
        const month = String(dateStr.getMonth() + 1).padStart(2, '0');
        const day = String(dateStr.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
      }
      let raw = String(dateStr).trim().split('T')[0].split(' ')[0];
      if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(raw)) {
        const parts = raw.split(/[-/]/);
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(raw)) {
        return raw.replace(/-/g, '/');
      }
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
      }
      return raw;
    } catch {
      return dateStr;
    }
  },

  formatDate(dateStr, createdAtStr) {
    return this.formatDateTime(dateStr, createdAtStr);
  },

  formatDateTime(dateStr, createdAtStr) {
    if (!dateStr && !createdAtStr) return '';
    try {
      if (dateStr instanceof Date) {
        const d = dateStr;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${day}/${month}/${year} ${time}`;
      }

      let timePart = '';
      let datePart = dateStr ? String(dateStr).trim() : '';

      // Determine where time should come from
      const timeCandidate = createdAtStr || (datePart.includes(':') ? datePart : null);
      if (timeCandidate) {
        let clean = String(timeCandidate).trim();
        // If it's a sqlite timestamp 'YYYY-MM-DD HH:MM:SS' without timezone, it's stored in UTC
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(clean)) {
          clean = clean.replace(' ', 'T') + 'Z';
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(clean)) {
          clean = clean + 'Z';
        }
        const d = new Date(clean);
        if (!isNaN(d.getTime())) {
          timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          if (!datePart) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            datePart = `${day}/${month}/${year}`;
          }
        }
      }

      // If datePart has time embedded already, isolate the datePart
      if (datePart && datePart.includes(' ')) {
        const parts = datePart.split(' ');
        datePart = parts[0];
        if (!timePart && parts.length > 1) {
          timePart = parts.slice(1).join(' ');
        }
      } else if (datePart && datePart.includes('T')) {
        const parts = datePart.split('T');
        datePart = parts[0];
      }

      // Convert datePart to DD/MM/YYYY if YYYY-MM-DD or YYYY/MM/DD
      if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(datePart)) {
        const parts = datePart.split(/[-/]/);
        datePart = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(datePart)) {
        datePart = datePart.replace(/-/g, '/');
      }

      if (timePart) {
        return `${datePart} ${timePart}`;
      }
      return datePart;
    } catch {
      return dateStr || createdAtStr || '';
    }
  },

  showPaymentModal({ title, subtitle, total, alreadyReceived = 0, info = null, defaultMethod = 'Cash', buttonText = 'Complete Sale', onConfirm }) {
    this.paymentCallback = onConfirm;
    const modal = document.getElementById('payment-modal');
    const card = document.getElementById('payment-card');
    const input = document.getElementById('payment-input');
    const totalDisplay = document.getElementById('payment-total-display');
    const alreadyReceivedBox = document.getElementById('payment-already-received-box');
    const alreadyReceivedDisplay = document.getElementById('payment-already-received-display');
    const remainingDisplay = document.getElementById('payment-remaining-display');
    const infoBox = document.getElementById('payment-info-box');
    const btnText = document.getElementById('payment-btn-text');
    const okBtn = document.getElementById('payment-confirm-btn');

    document.getElementById('payment-title').textContent = title || 'Receive Payment';
    document.getElementById('payment-subtitle').textContent = subtitle || 'Transaction Settlement';
    totalDisplay.textContent = this.formatCurrency(total);
    btnText.textContent = buttonText;

    if (info) {
        infoBox.innerHTML = info;
        infoBox.classList.remove('hidden');
    } else {
        infoBox.classList.add('hidden');
    }

    if (alreadyReceived > 0) {
        alreadyReceivedBox.classList.remove('hidden');
        alreadyReceivedDisplay.textContent = this.formatCurrency(alreadyReceived);
    } else {
        alreadyReceivedBox.classList.add('hidden');
    }

    // Reset payment method
    this.setPaymentMethod(defaultMethod || 'Cash');

    // Reset input
    const maxVal = Math.round(total - alreadyReceived);
    input.value = maxVal;
    const updateRemaining = () => {
        let val = parseInt(input.value, 10) || 0;
        const maxAllowed = Math.round(total - alreadyReceived);
        
        if (val > maxAllowed) {
            val = maxAllowed;
            input.value = val;
        }

        const rem = maxAllowed - val;
        remainingDisplay.textContent = this.formatCurrency(rem);
        if (rem < 0) {
            remainingDisplay.classList.add('text-rose-600');
            remainingDisplay.classList.remove('text-emerald-600');
        } else if (rem === 0) {
            remainingDisplay.classList.add('text-emerald-600');
            remainingDisplay.classList.remove('text-rose-600');
        } else {
            remainingDisplay.classList.add('text-rose-600');
            remainingDisplay.classList.remove('text-emerald-600');
        }
    };

    input.oninput = () => {
        input.value = input.value.replace(/\D/g, '');
        updateRemaining();
    };
    updateRemaining();

    okBtn.onclick = () => {
        const val = parseInt(input.value, 10) || 0;
        const method = this.currentPaymentMethod || 'Cash';
        const cb = this.paymentCallback;
        this.hidePaymentModal();
        if (cb) cb(val, method);
    };

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    input.focus();
    input.select();
  },

  setPaymentMethod(method) {
    this.currentPaymentMethod = method || 'Cash';
    const pmCash = document.getElementById('pm-cash');
    const pmOnline = document.getElementById('pm-online');
    if (this.currentPaymentMethod.toLowerCase() === 'cash') {
      if (pmCash) {
        pmCash.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg bg-slate-900 text-white shadow-sm cursor-pointer';
      }
      if (pmOnline) {
        pmOnline.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer';
      }
    } else {
      if (pmOnline) {
        pmOnline.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg bg-indigo-600 text-white shadow-sm cursor-pointer';
      }
      if (pmCash) {
        pmCash.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer';
      }
    }
  },

  hidePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    this.paymentCallback = null;
  },

  showPreview(html, title = 'Receipt Preview', subtitle = '80MM THERMAL RECEIPT', targetContainerId = 'receipt-print') {
    this.setPrintContent(targetContainerId, html);
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;

    const titleEl = document.getElementById('preview-title');
    const subtitleEl = document.getElementById('preview-subtitle');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      printBtn.onclick = () => this.confirmPrint();
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closePreview() {
    const onDiscard = this.previewOnDiscard;
    this.previewOnConfirm = null;
    this.previewOnDiscard = null;

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.clearAllPrintContainers();
    
    if (onDiscard) {
      onDiscard();
    }

    if (this.currentPage === 'proposal-form' && SalesForm.onClosePreview) {
        SalesForm.onClosePreview();
    }
  },

  // --------------------------------------------------------------------------
  // QUICK PRICE INQUIRY (F8 PRICE CHECKER)
  // --------------------------------------------------------------------------
  openPriceChecker() {
    const modal = document.getElementById('price-checker-modal');
    if (!modal) return;
    this._priceCheckerPrevActiveEl = document.activeElement;
    this._activePriceItem = null;
    this._priceSearchResults = [];

    // 1. Immediately open modal synchronously
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const input = document.getElementById('price-checker-input');
    const dropdown = document.getElementById('price-checker-dropdown');
    if (input) input.value = '';
    if (dropdown) dropdown.classList.add('hidden');

    this.renderPriceCheckerReady();

    // 2. Focus input ready for scan
    setTimeout(() => {
      if (input) {
        input.focus();
        input.select();
      }
    }, 40);

    // 3. Cache products for zero-latency in-memory lookup
    if (this.currentPage === 'proposal-form' && window.SalesForm && window.SalesForm.availableItems && window.SalesForm.availableItems.length > 0) {
      this._priceAllItems = window.SalesForm.availableItems;
    } else if (window.api && typeof window.api.searchAllProducts === 'function') {
      window.api.searchAllProducts('').then(items => {
        this._priceAllItems = items || [];
      }).catch(() => {
        this._priceAllItems = [];
      });
    } else {
      this._priceAllItems = [];
    }
  },

  closePriceChecker() {
    const modal = document.getElementById('price-checker-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    const dropdown = document.getElementById('price-checker-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    if (this._priceInputTimeout) {
      clearTimeout(this._priceInputTimeout);
      this._priceInputTimeout = null;
    }

    this._activePriceItem = null;
    this._priceSearchResults = [];

    if (this._priceCheckerPrevActiveEl && typeof this._priceCheckerPrevActiveEl.focus === 'function') {
      try {
        this._priceCheckerPrevActiveEl.focus();
        if (typeof this._priceCheckerPrevActiveEl.select === 'function') {
          this._priceCheckerPrevActiveEl.select();
        }
      } catch (err) {}
    } else if (this.currentPage === 'proposal-form') {
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  },

  togglePriceChecker() {
    const modal = document.getElementById('price-checker-modal');
    if (!modal) return;
    if (!modal.classList.contains('hidden') && modal.classList.contains('flex')) {
      this.closePriceChecker();
    } else {
      this.openPriceChecker();
    }
  },

  getPriceCheckerItems() {
    if (this._priceAllItems && this._priceAllItems.length > 0) {
      return this._priceAllItems;
    }
    if (this.currentPage === 'proposal-form' && window.SalesForm && window.SalesForm.availableItems) {
      return window.SalesForm.availableItems;
    }
    return [];
  },

  renderPriceCheckerReady() {
    const resultBox = document.getElementById('price-checker-result');
    const actionBtns = document.getElementById('price-checker-action-btns');
    if (resultBox) {
      resultBox.innerHTML = `
        <div class="text-center py-4 text-slate-400 flex flex-col items-center">
          <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center mb-3 shadow-inner">
            <i data-lucide="scan-barcode" class="w-8 h-8"></i>
          </div>
          <h4 class="text-base font-black text-slate-800">Scan Barcode or Type Item Name</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">Point the scanner at any item to instantly check its price and live stock.</p>
          <div class="mt-4 flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/70 select-none">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Your current sale bill is completely safe & preserved
          </div>
        </div>
      `;
    }
    if (actionBtns) {
      actionBtns.innerHTML = `
        <button type="button" onclick="app.closePriceChecker()" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-colors cursor-pointer">
          Close (Esc)
        </button>
      `;
    }
    if (window.lucide) lucide.createIcons();
  },

  handlePriceCheckerInput(rawVal) {
    if (this._priceInputTimeout) {
      clearTimeout(this._priceInputTimeout);
      this._priceInputTimeout = null;
    }

    const val = (rawVal || '').trim();
    const dropdown = document.getElementById('price-checker-dropdown');
    if (!val) {
      if (dropdown) dropdown.classList.add('hidden');
      return;
    }

    const allItems = this.getPriceCheckerItems();

    // Fast check: if exact barcode match, show it immediately
    const exactMatch = allItems.find(i => String(i.barcode || '').trim().toLowerCase() === val.toLowerCase());
    if (exactMatch) {
      if (dropdown) dropdown.classList.add('hidden');
      this.showPriceCheckerItem(exactMatch);
      return;
    }

    // Debounce typing suggestions to prevent input stuttering
    this._priceInputTimeout = setTimeout(() => {
      const q = val.toLowerCase();
      const matches = allItems.filter(i => {
        const name = (i.item_name || '').toLowerCase();
        const comp = (i.company_name || '').toLowerCase();
        const bc = (i.barcode || '').toLowerCase();
        return name.includes(q) || comp.includes(q) || bc.includes(q);
      }).slice(0, 6);

      this._priceSearchResults = matches;

      if (matches.length > 0 && dropdown) {
        dropdown.innerHTML = matches.map((item, idx) => `
          <div onclick="app.selectPriceSearchItem(${idx})" class="px-4 py-2 hover:bg-amber-50 cursor-pointer border-b border-slate-100 flex items-center justify-between transition-colors">
            <div class="truncate pr-2">
              <span class="font-bold text-slate-800 text-xs">${item.item_name}</span>
              ${item.barcode ? `<span class="text-[10px] font-mono text-slate-400 ml-1">#${item.barcode}</span>` : ''}
            </div>
            <span class="font-black text-xs text-emerald-600 font-display shrink-0">Rs. ${app.formatAmount(item.retail_price || 0)}</span>
          </div>
        `).join('');
        dropdown.classList.remove('hidden');
      } else if (dropdown) {
        dropdown.classList.add('hidden');
      }
    }, 120);
  },

  selectPriceSearchItem(idx) {
    const item = this._priceSearchResults && this._priceSearchResults[idx];
    if (item) {
      const dropdown = document.getElementById('price-checker-dropdown');
      if (dropdown) dropdown.classList.add('hidden');
      this.showPriceCheckerItem(item);
    }
  },

  handlePriceCheckerKeyDown(e) {
    const isDismissKey = e.key === 'Escape' || e.key === 'F6' || e.code === 'F6' || e.key === 'F8' || e.code === 'F8';
    if (isDismissKey) {
      e.preventDefault();
      e.stopPropagation();
      this.closePriceChecker();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      const timeSinceShown = now - (this._priceItemShownAt || 0);

      // If an item is already displayed on screen and the cashier presses Enter (after viewing the price),
      // add it directly to the bill! (The >120ms check ensures the scanner's own trailing Enter report doesn't prematurely trigger this).
      if (this._activePriceItem && timeSinceShown > 120 && this.currentPage === 'proposal-form') {
        this.addPriceCheckedItemToBill();
        return;
      }

      const input = document.getElementById('price-checker-input');
      const val = (input?.value || '').trim();
      if (!val) return;

      const dropdown = document.getElementById('price-checker-dropdown');
      if (dropdown) dropdown.classList.add('hidden');

      const allItems = this.getPriceCheckerItems();

      // Look up by barcode first, then by name
      const match = allItems.find(i => String(i.barcode || '').trim().toLowerCase() === val.toLowerCase()) ||
                    allItems.find(i => (i.item_name || '').toLowerCase() === val.toLowerCase()) ||
                    allItems.find(i => (i.item_name || '').toLowerCase().includes(val.toLowerCase()));

      if (match) {
        this.showPriceCheckerItem(match);
      } else {
        this.playBeep('error');
        const resultBox = document.getElementById('price-checker-result');
        if (resultBox) {
          resultBox.innerHTML = `
            <div class="text-center py-4 text-rose-500 flex flex-col items-center">
              <div class="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center mb-2.5">
                <i data-lucide="alert-circle" class="w-7 h-7 text-rose-500"></i>
              </div>
              <h4 class="text-base font-black text-rose-600">Product Not Found</h4>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">No item found matching "${val}". Check barcode or spelling.</p>
            </div>
          `;
          if (window.lucide) lucide.createIcons();
        }
        if (input) input.select();
      }
    }
  },

  showPriceCheckerItem(item) {
    this._activePriceItem = item;
    this._priceItemShownAt = Date.now();
    this.playBeep('success');

    let availableStock = item.stock !== undefined ? Number(item.stock) : (Number(item.quantity) || 0);
    if (this.currentPage === 'proposal-form' && window.SalesForm && typeof window.SalesForm.getItemAvailableStock === 'function') {
      availableStock = window.SalesForm.getItemAvailableStock(item);
    }
    availableStock = Math.round(availableStock * 100) / 100;

    const unit = (item.unit || item.unit_name || 'PCS').toUpperCase();
    const isOutOfStock = availableStock <= 0;
    const priceStr = app.formatAmount(item.retail_price || 0);

    let categoryLabel = '';
    if (this.currentPage === 'proposal-form' && window.SalesForm && typeof window.SalesForm.getCategoryName === 'function') {
      categoryLabel = window.SalesForm.getCategoryName(item);
    } else {
      categoryLabel = item.category_name || item.slug || '';
    }

    const resultBox = document.getElementById('price-checker-result');
    if (resultBox) {
      resultBox.innerHTML = `
        <div class="w-full flex flex-col items-center">
          <!-- Item Tag Row -->
          <div class="flex items-center gap-2 flex-wrap justify-center mb-1.5">
            ${categoryLabel ? `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-200">${categoryLabel}</span>` : ''}
            ${item.barcode ? `<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-mono font-black border border-amber-200/70">#${item.barcode}</span>` : ''}
            ${item.company_name ? `<span class="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-200">${item.company_name}</span>` : ''}
          </div>

          <!-- Product Name -->
          <h3 class="text-xl font-black text-slate-900 text-center tracking-tight mb-3 px-2">${item.item_name}</h3>

          <!-- Price Display Banner -->
          <div class="w-full bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-4 text-white text-center shadow-lg shadow-emerald-500/20 mb-3 border border-emerald-400/40">
            <span class="text-[11px] uppercase tracking-widest font-black text-emerald-100 block mb-0.5">Sale Rate / Retail Price</span>
            <div class="text-3xl md:text-4xl font-black font-display tracking-tight text-white flex items-center justify-center gap-1.5">
              <span class="text-lg font-bold text-emerald-200">Rs.</span>
              <span>${priceStr}</span>
            </div>
            <span class="text-[11px] font-bold text-emerald-100/90 mt-0.5 block">per ${unit}</span>
          </div>

          <!-- Stock Pill -->
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${isOutOfStock ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}">
              <span class="w-2 h-2 rounded-full ${isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
              ${isOutOfStock ? 'OUT OF STOCK (0 ' + unit + ')' : app.formatQty(availableStock) + ' ' + unit + ' In Stock'}
            </span>
          </div>
        </div>
      `;
    }

    const actionBtns = document.getElementById('price-checker-action-btns');
    if (actionBtns) {
      if (this.currentPage === 'proposal-form') {
        actionBtns.innerHTML = `
          <button type="button" onclick="app.closePriceChecker()" class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer">
            Close (Esc)
          </button>
          <button type="button" onclick="app.addPriceCheckedItemToBill()" class="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <i data-lucide="plus-circle" class="w-4 h-4 text-slate-950"></i>
            <span>+ Add to Bill (Enter)</span>
          </button>
        `;
      } else {
        actionBtns.innerHTML = `
          <button type="button" onclick="app.closePriceChecker()" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-colors cursor-pointer">
            Close (Esc)
          </button>
        `;
      }
    }

    if (window.lucide) lucide.createIcons();

    const input = document.getElementById('price-checker-input');
    if (input) {
      input.select();
    }
  },

  addPriceCheckedItemToBill() {
    if (!this._activePriceItem || this.currentPage !== 'proposal-form' || !window.SalesForm) return;
    const item = this._activePriceItem;
    this.closePriceChecker();

    // Add directly to cart
    if (typeof window.SalesForm.handleBarcodeScan === 'function' && item.barcode) {
      window.SalesForm.handleBarcodeScan(item.barcode);
    } else if (typeof window.SalesForm.addToCart === 'function') {
      window.SalesForm.addToCart(item);
      window.SalesForm.renderCart();
      window.SalesForm.updateSummary();
      const cartIdx = window.SalesForm.cart.findIndex(c => c.id === item.id && c.slug === item.slug);
      if (cartIdx !== -1) {
        setTimeout(() => {
          window.SalesForm.focusCartField(cartIdx, 'qty');
        }, 40);
      }
    }
  },

  setPrintContent(targetId, html) {
    const printContainerIds = [
      'receipt-print',
      'db-print-container',
      'voucher-print',
      'report-print-container',
      'barcode-sticker-print'
    ];

    printContainerIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === targetId) {
          el.innerHTML = html;
          el.classList.add('active-print-target');
        } else {
          el.innerHTML = '';
          el.classList.remove('active-print-target');
        }
      }
    });
  },

  clearAllPrintContainers() {
    const printContainerIds = [
      'receipt-print',
      'db-print-container',
      'voucher-print',
      'report-print-container',
      'barcode-sticker-print'
    ];

    printContainerIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '';
        el.classList.remove('active-print-target');
      }
    });
  },

  async printReceipt(options = {}) {
    let result;
    if (window.api && window.api.printReceipt) {
      try {
        result = await window.api.printReceipt(options);
      } catch (err) {
        console.warn('API printReceipt failed, falling back to window.print', err);
        window.print();
        result = { success: true, fallback: true };
      }
    } else {
      window.print();
      result = { success: true, fallback: true };
    }
    this.clearAllPrintContainers();
    return result;
  },

  showA5Preview(htmlContent, title = 'Invoice Preview', options = {}) {
    const modal = document.getElementById('preview-modal');
    const paper = document.getElementById('preview-paper');
    const titleEl = document.getElementById('preview-title');
    const subtitleEl = document.getElementById('preview-subtitle');

    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = options.subtitle || 'A5 PAPER FORMAT (148 × 210 MM)';

    if (paper) {
      paper.className = 'bg-white shadow-2xl origin-top mb-12 w-full max-w-[580px] rounded-lg p-5 border border-slate-200';
      paper.innerHTML = htmlContent;
    }

    const printContainer = document.getElementById('receipt-print');
    if (printContainer) {
      this.clearAllPrintContainers();
      printContainer.innerHTML = htmlContent;
      printContainer.classList.add('active-print-target');
    }

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      const confirmLabel = options.confirmText || 'Confirm & Print';
      printBtn.innerHTML = `<i data-lucide="printer" class="w-5 h-5 group-hover:scale-110 transition-transform"></i> <span>${confirmLabel}</span>`;
      printBtn.onclick = () => this.confirmPrint();
    }

    this.previewOnConfirm = options.onConfirm || null;
    this.previewOnDiscard = options.onDiscard || null;

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (window.lucide) lucide.createIcons();
  },

  async printA5Document(htmlContent, title = 'Document') {
    const printContainer = document.getElementById('receipt-print');
    if (!printContainer) return;
    this.clearAllPrintContainers();
    printContainer.innerHTML = htmlContent;
    printContainer.classList.add('active-print-target');
    return await this.printReceipt({ pageSize: 'A5' });
  },

  async confirmPrint() {
    const onConfirm = this.previewOnConfirm;
    this.previewOnConfirm = null;
    this.previewOnDiscard = null;

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    
    if (onConfirm) {
      await onConfirm();
    } else {
      await this.printReceipt({ pageSize: 'A5' });
      
      if (this.currentPage === 'proposal-form' && SalesForm.onAfterPrint) {
          SalesForm.onAfterPrint();
      }
    }
  },


  // --------------------------------------------------------------------------
  // BARCODE STICKER & THERMAL LABEL PRINTER (Speed-X SP-650UL)
  // --------------------------------------------------------------------------
  barcodeStickerState: {
    activeItem: null,
    qty: 1,
    sizePreset: '38x28',
    widthMm: 38.1,
    heightMm: 27.94,
    storeName: 'DELICIOUS SUPERSTAR FOODS',
    showStore: true,
    showName: true,
    showPrice: true,
    showBarcode: true,
    selectedPrinter: '',
    silent: true,
    allProducts: []
  },

  async openBarcodeStickerModal(itemOrId = null, optionalCategory = null) {
    const modal = document.getElementById('barcode-sticker-modal');
    if (!modal) return;

    // Load saved settings if any
    const savedPrinter = window.storage ? window.storage.get('label_printer_name') || '' : '';
    const savedSize = window.storage ? window.storage.get('label_sticker_size') || '38x28' : '38x28';
    const savedStore = window.storage ? window.storage.get('label_store_name') : null;
    let storeTitle = savedStore;
    if (!storeTitle) {
      try {
        const settings = await window.api.getSettings();
        storeTitle = (settings?.company_name || 'Delicious Superstar Foods').replace(/\s*\(Branch \d+\)/i, '').trim();
      } catch (e) {
        storeTitle = 'Delicious Superstar Foods';
      }
    }

    this.barcodeStickerState.storeName = storeTitle;
    this.barcodeStickerState.sizePreset = savedSize;
    this.barcodeStickerState.selectedPrinter = savedPrinter;

    // Populate printers list
    await this.refreshPrintersList();

    // Load packed cartons as products for stickers
    try {
      const cartons = (await window.api.getPackedCartons()) || [];
      this.barcodeStickerState.allProducts = cartons.map(c => {
        const isShoper = c.package_type === 'shoper';
        return {
          id: c.id,
          item_name: c.carton_name,
          carton_name: c.carton_name,
          package_type: c.package_type || 'carton',
          barcode: c.barcode || '',
          retail_price: c.carton_sale_price || 0,
          sale_price: c.carton_sale_price || 0,
          cost_price: c.carton_cost_price || 0,
          current_stock: c.factory_carton_stock || 0,
          stickers_printed: Number(c.stickers_printed || 0),
          category_label: `${c.pieces_per_carton} pcs/${isShoper ? 'shoper' : 'ctn'}`,
          pieces_per_carton: c.pieces_per_carton,
          is_carton: true,
          base_item_name: c.base_item_name || c.item_name
        };
      });
    } catch (e) {
      console.warn('Failed to load packed cartons for sticker printing:', e);
      this.barcodeStickerState.allProducts = [];
    }

    // Determine target active item
    let targetItem = null;
    if (itemOrId && typeof itemOrId === 'object') {
      targetItem = this.barcodeStickerState.allProducts.find(p => p.id === itemOrId.id) || itemOrId;
    } else if (itemOrId) {
      const numId = Number(itemOrId);
      targetItem = this.barcodeStickerState.allProducts.find(p => p.id === numId);
    }

    if (!targetItem) {
      targetItem = this.barcodeStickerState.allProducts[0] || {
        id: 0,
        item_name: 'Ice Cream Carton',
        barcode: '582910482915',
        retail_price: 250,
        category_label: '20 pcs/ctn',
        current_stock: 10,
        is_carton: true
      };
    }

    // Populate Carton Selector dropdown
    const cartonSel = document.getElementById('bsm-carton-select');
    if (cartonSel) {
      cartonSel.innerHTML = this.barcodeStickerState.allProducts.map(p =>
        `<option value="${p.id}" ${p.id === targetItem.id ? 'selected' : ''}>${p.item_name} (Rate: Rs. ${p.retail_price}${p.barcode ? ' | #' + p.barcode : ' | No Barcode'})</option>`
      ).join('');
    }

    this.setActiveStickerItem(targetItem);

    // Set UI inputs
    const storeInput = document.getElementById('bsm-store-name');
    if (storeInput) storeInput.value = this.barcodeStickerState.storeName;

    this.selectStickerSize(this.barcodeStickerState.sizePreset);
    this.setStickerQty(1);

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons();
  },

  onStickerCartonChange(val) {
    const numId = Number(val);
    const found = this.barcodeStickerState.allProducts.find(p => p.id === numId);
    if (found) {
      this.setActiveStickerItem(found);
    }
  },

  closeBarcodeStickerModal() {
    const modal = document.getElementById('barcode-sticker-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  getStickersPrintedCount(itemId) {
    if (!itemId) return 0;
    let countFromMem = 0;
    if (this.barcodeStickerState && this.barcodeStickerState.allProducts) {
      const found = this.barcodeStickerState.allProducts.find(p => p.id === itemId);
      if (found && typeof found.stickers_printed === 'number') {
        countFromMem = Number(found.stickers_printed || 0);
      }
    }
    let countFromStorage = 0;
    if (window.storage) {
      const map = window.storage.get('stickers_printed_counts') || {};
      if (map[itemId] !== undefined) {
        countFromStorage = Number(map[itemId] || 0);
      }
    }
    return Math.max(countFromMem, countFromStorage);
  },

  async recordStickersPrinted(itemId, count = 1) {
    if (!itemId) return;
    const qty = Math.max(1, Number(count) || 1);
    const prev = this.getStickersPrintedCount(itemId);
    const newTotal = prev + qty;

    // 1. Update in-memory allProducts & activeItem
    if (this.barcodeStickerState) {
      if (this.barcodeStickerState.activeItem && this.barcodeStickerState.activeItem.id === itemId) {
        this.barcodeStickerState.activeItem.stickers_printed = newTotal;
      }
      if (Array.isArray(this.barcodeStickerState.allProducts)) {
        const p = this.barcodeStickerState.allProducts.find(x => x.id === itemId);
        if (p) p.stickers_printed = newTotal;
      }
    }

    // 2. Persist to storage
    if (window.storage) {
      const map = window.storage.get('stickers_printed_counts') || {};
      map[itemId] = newTotal;
      window.storage.set('stickers_printed_counts', map);
    }

    // 3. Update active card display if currently visible/rendered
    const printedDisplay = document.getElementById('bsm-item-printed-display');
    if (printedDisplay) {
      printedDisplay.innerHTML = 'Already printed: <span class="font-black text-indigo-700">' + newTotal + '</span>';
    }

    // 4. Persist to SQLite via IPC
    if (window.api && window.api.incrementStickersPrinted) {
      try {
        await window.api.incrementStickersPrinted({ id: itemId, qty });
      } catch (err) {
        console.warn('Could not increment stickers in database:', err);
      }
    }
  },

  getCategoryDisplayName(itemOrSlug) {
    if (!itemOrSlug) return 'Sellable Carton';
    if (typeof itemOrSlug === 'object') {
      if (itemOrSlug.category_label) return itemOrSlug.category_label;
      if (itemOrSlug.pieces_per_carton) return `${itemOrSlug.pieces_per_carton} pcs/ctn`;
    }
    return 'Sellable Carton';
  },

  setActiveStickerItem(item) {
    if (!item) return;
    this.barcodeStickerState.activeItem = item;

    const nameEl = document.getElementById('bsm-item-name');
    const catEl = document.getElementById('bsm-item-category');
    const bcDisplay = document.getElementById('bsm-item-barcode-display');
    const priceDisplay = document.getElementById('bsm-item-price-display');
    const stockDisplay = document.getElementById('bsm-item-stock-display');
    const printedDisplay = document.getElementById('bsm-item-printed-display');
    const genBtn = document.getElementById('bsm-gen-barcode-btn');
    const matchStockBtn = document.getElementById('bsm-match-stock-btn');
    const cartonSel = document.getElementById('bsm-carton-select');

    const isShoper = item.package_type === 'shoper';
    const catName = item.category_label || (item.pieces_per_carton ? `${item.pieces_per_carton} pcs/${isShoper ? 'shoper' : 'ctn'}` : (isShoper ? 'Shoper' : 'Carton'));
    const price = Number(item.retail_price || item.sale_price || 0);
    const stock = Number(item.current_stock || 0);
    const hasBarcode = Boolean(item.barcode && String(item.barcode).trim());
    const printedCount = this.getStickersPrintedCount(item.id);

    if (nameEl) nameEl.textContent = item.item_name || 'Product';
    if (catEl) catEl.textContent = catName;
    if (priceDisplay) priceDisplay.textContent = 'Price: Rs. ' + price.toLocaleString();
    if (stockDisplay) stockDisplay.textContent = 'Stock: ' + stock + (isShoper ? ' shopers' : ' ctns');
    if (printedDisplay) printedDisplay.innerHTML = 'Already printed: <span class="font-black text-indigo-700">' + printedCount + '</span>';

    if (bcDisplay) {
      if (hasBarcode) {
        bcDisplay.innerHTML = 'Barcode: <span class="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-mono font-black">' + item.barcode + '</span>';
      } else {
        bcDisplay.innerHTML = '<span class="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">No Barcode Assigned</span>';
      }
    }

    if (genBtn) {
      if (!hasBarcode) genBtn.classList.remove('hidden');
      else genBtn.classList.add('hidden');
    }

    if (matchStockBtn) {
      matchStockBtn.textContent = 'Match Stock (' + stock + ')';
    }

    if (cartonSel && String(cartonSel.value) !== String(item.id)) {
      cartonSel.value = item.id;
    }

    this.updateStickerPreview();
  },

  async generateBarcodeForActiveItem() {
    const item = this.barcodeStickerState.activeItem;
    if (!item || !item.id) return;

    // Generate random 12-digit barcode (Barcode General Store format)
    const randCode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    item.barcode = randCode;

    try {
      const fullCarton = await window.api.getPackedCarton(item.id);
      if (fullCarton) {
        fullCarton.barcode = randCode;
        await window.api.savePackedCarton(fullCarton);
      }
      this.showToast(`Generated barcode #${randCode} for "${item.item_name}"`, 'success');

      // Update cached item
      const cached = this.barcodeStickerState.allProducts.find(p => p.id === item.id);
      if (cached) cached.barcode = randCode;

      // Update dropdown options
      const cartonSel = document.getElementById('bsm-carton-select');
      if (cartonSel) {
        cartonSel.innerHTML = this.barcodeStickerState.allProducts.map(p =>
          `<option value="${p.id}" ${p.id === item.id ? 'selected' : ''}>${p.item_name} (Rate: Rs. ${p.retail_price}${p.barcode ? ' | #' + p.barcode : ' | No Barcode'})</option>`
        ).join('');
      }

      // If Carton Packing page is open, refresh it
      if (window.CartonPacking && typeof window.CartonPacking.loadData === 'function') {
        window.CartonPacking.loadData();
      }
    } catch (e) {
      console.warn('Failed to save generated barcode to DB:', e);
    }

    this.setActiveStickerItem(item);
  },

  selectStickerSize(preset = '38x28') {
    this.barcodeStickerState.sizePreset = '38x28';
    this.barcodeStickerState.widthMm = 38.1;
    this.barcodeStickerState.heightMm = 27.94;

    const dimBadge = document.getElementById('bsm-preview-dimension-badge');
    if (dimBadge) dimBadge.textContent = '38 × 28 mm (1.5" × 1.1")';

    if (window.storage) window.storage.set('label_sticker_size', '38x28');
    this.updateStickerPreview();
  },

  adjustStickerQty(delta) {
    const input = document.getElementById('bsm-qty');
    let val = parseInt(input?.value || '1', 10) + delta;
    if (val < 1) val = 1;
    if (val > 999) val = 999;
    this.setStickerQty(val);
  },

  setStickerQty(qty) {
    const q = Math.max(1, Math.min(999, parseInt(qty, 10) || 1));
    this.barcodeStickerState.qty = q;
    const input = document.getElementById('bsm-qty');
    if (input) input.value = q;

    const copiesBadge = document.getElementById('bsm-pv-copies-badge');
    if (copiesBadge) copiesBadge.textContent = q + (q === 1 ? ' copy' : ' copies');

    const printBtnText = document.getElementById('bsm-submit-print-text');
    if (printBtnText) {
      printBtnText.textContent = 'Print ' + q + ' Sticker' + (q === 1 ? '' : 's') + ' (Speed-X)';
    }
  },

  setStickerQtyToStock() {
    const stock = Number(this.barcodeStickerState.activeItem?.current_stock || 1);
    this.setStickerQty(stock > 0 ? stock : 1);
  },

  onStickerQtyChange(val) {
    this.setStickerQty(val);
  },

  async refreshPrintersList() {
    let printers = [];
    try {
      if (window.api && window.api.getPrinters) {
        printers = await window.api.getPrinters() || [];
      }
    } catch (e) {
      console.warn('Failed to load printers:', e);
    }

    const savedPrinter = window.storage ? window.storage.get('label_printer_name') || '' : '';

    if (savedPrinter && printers.some(p => p.name === savedPrinter)) {
      this.barcodeStickerState.selectedPrinter = savedPrinter;
    } else {
      const best = printers.find(p => /4barcode|3b-365/i.test(p.name)) ||
                   printers.find(p => /speed|sp-650|sticker|label/i.test(p.name)) ||
                   printers.find(p => /barcode/i.test(p.name)) ||
                   printers.find(p => /pos|thermal|xp-|80/i.test(p.name)) ||
                   printers.find(p => p.isDefault) || printers[0];
      if (best) this.barcodeStickerState.selectedPrinter = best.name;
    }

    const select = document.getElementById('bsm-printer-select');
    if (select && printers.length > 0) {
      select.innerHTML = printers.map(p => {
        const isSpeedOrPos = /4barcode|3b-365|pos|speed|label|sticker|barcode|thermal|xp-|80/i.test(p.name);
        const label = p.name + (isSpeedOrPos ? ' ★ (Thermal Ready)' : '') + (p.isDefault ? ' [Default]' : '');
        return '<option value="' + p.name + '">' + label + '</option>';
      }).join('');
      if (this.barcodeStickerState.selectedPrinter) {
        select.value = this.barcodeStickerState.selectedPrinter;
      }
      select.onchange = () => {
        this.barcodeStickerState.selectedPrinter = select.value;
        if (window.storage) window.storage.set('label_printer_name', select.value);
      };
    }
  },

  updateStickerPreview() {
    const item = this.barcodeStickerState.activeItem;
    if (!item) return;

    const showStore = document.getElementById('bsm-toggle-store')?.checked ?? true;
    const showName = document.getElementById('bsm-toggle-item-name')?.checked ?? true;
    const showPrice = document.getElementById('bsm-toggle-price')?.checked ?? true;
    const showBc = document.getElementById('bsm-toggle-barcode')?.checked ?? true;

    const storeName = (document.getElementById('bsm-store-name')?.value || '').trim() || 'DELICIOUS SUPERSTAR FOODS';
    if (window.storage) window.storage.set('label_store_name', storeName);

    const storeEl = document.getElementById('bsm-pv-store');
    const nameEl = document.getElementById('bsm-pv-name');
    const priceEl = document.getElementById('bsm-pv-price');
    const priceBar = document.getElementById('bsm-pv-price-bar');
    const bcSvg = document.getElementById('bsm-pv-barcode-svg');
    const bcTxt = document.getElementById('bsm-pv-barcode-txt');
    const stickerBox = document.getElementById('bsm-live-sticker');

    if (storeEl) {
      storeEl.textContent = storeName;
      storeEl.style.display = showStore ? 'block' : 'none';
    }

    if (nameEl) {
      nameEl.textContent = item.item_name || 'Item Name';
      nameEl.style.display = showName ? 'block' : 'none';
    }

    const price = Number(item.retail_price || item.sale_price || 0);
    if (priceEl) {
      priceEl.textContent = 'Rs. ' + price.toLocaleString();
    }

    if (priceBar) {
      priceBar.style.display = showPrice ? 'flex' : 'none';
    }

    if (stickerBox) {
      stickerBox.style.width = '190px';
      stickerBox.style.height = '140px';
    }

    const barcodeVal = String(item.barcode || '').trim() || '123456789012';
    if (bcTxt) {
      bcTxt.textContent = barcodeVal;
      bcTxt.style.display = showBc ? 'block' : 'none';
    }

    if (bcSvg) {
      if (showBc && window.JsBarcode) {
        bcSvg.style.display = 'block';
        try {
          bcSvg.innerHTML = '';
          window.JsBarcode(bcSvg, barcodeVal, {
            format: 'CODE128',
            width: 1.15,
            height: 22,
            displayValue: false,
            margin: 0,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } catch (e) {
          console.warn('JsBarcode preview render error:', e);
          bcSvg.innerHTML = '<rect width="100%" height="24" fill="#eee"/><text x="50%" y="15" text-anchor="middle" font-size="10" font-family="monospace">' + barcodeVal + '</text>';
        }
      } else {
        bcSvg.style.display = 'none';
      }
    }
  },

  handleStickerSearchInput(val) {
    const q = (val || '').trim().toLowerCase();
    const dropdown = document.getElementById('bsm-search-dropdown');
    const clearBtn = document.getElementById('bsm-search-clear');

    if (clearBtn) {
      if (q.length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    if (!dropdown) return;
    if (q.length === 0) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    const all = this.barcodeStickerState.allProducts || [];
    const matches = all.filter(p => {
      const name = String(p.item_name || '').toLowerCase();
      const bc = String(p.barcode || '').toLowerCase();
      const cat = String(p.category_label || p.category_name || p.slug || '').toLowerCase();
      return name.includes(q) || bc.includes(q) || cat.includes(q);
    }).slice(0, 15);

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="p-3 text-xs text-slate-400 text-center font-bold">No items found matching "' + val + '"</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = matches.map(m => {
      const price = Number(m.retail_price || m.sale_price || 0);
      return (
        '<div onclick="app.selectStickerSearchResult(' + m.id + ', \'' + (m.slug || m.category_slug || '') + '\')" ' +
             'class="p-2.5 px-3 border-b border-slate-100 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors">' +
          '<div class="min-w-0 pr-2">' +
            '<div class="font-black text-xs text-slate-800 truncate">' + m.item_name + '</div>' +
            '<div class="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">' +
              (m.barcode ? '<span class="font-mono text-amber-800 bg-amber-100 px-1 rounded">#' + m.barcode + '</span>' : '<span class="text-rose-500 font-normal">No barcode</span>') +
              '<span>' + (m.category_label || m.slug || '') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="text-right shrink-0">' +
            '<div class="font-black text-xs text-emerald-700">Rs. ' + price.toLocaleString() + '</div>' +
            '<div class="text-[10px] text-slate-400 font-bold">Stk: ' + (m.current_stock || 0) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    dropdown.classList.remove('hidden');
  },

  clearStickerSearch() {
    const input = document.getElementById('bsm-search-input');
    const dropdown = document.getElementById('bsm-search-dropdown');
    const clearBtn = document.getElementById('bsm-search-clear');
    if (input) input.value = '';
    if (dropdown) dropdown.classList.add('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
  },

  selectStickerSearchResult(id, slug) {
    const all = this.barcodeStickerState.allProducts || [];
    const found = all.find(p => p.id === Number(id) && (!slug || p.slug === slug || p.category_slug === slug)) ||
                  all.find(p => p.id === Number(id));
    if (found) {
      this.setActiveStickerItem(found);
      this.clearStickerSearch();
    }
  },

  testPrintBarcodeSticker() {
    this.executeStickerPrint(true);
  },

  async executeStickerPrint(isTest = false) {
    const item = this.barcodeStickerState.activeItem;
    if (!item) {
      this.showAlert({ title: 'No Item', message: 'Please select an item to print stickers.' });
      return;
    }

    const barcodeVal = String(item.barcode || '').trim();
    if (!barcodeVal) {
      this.showAlert({
        title: 'Missing Barcode',
        message: 'Item <b>"' + item.item_name + '"</b> has no barcode assigned.<br><br>Click <b>"+ Generate Barcode"</b> first to generate a unique barcode for this item.',
        buttonText: 'OK'
      });
      return;
    }

    const qty = isTest ? 1 : (this.barcodeStickerState.qty || 1);
    // Locked to physical roll stock: 38.1mm x 27.94mm (1.50" x 1.10" Die-Cut)
    const widthMm = 38.1;
    const heightMm = 27.94;
    const printerSelect = document.getElementById('bsm-printer-select');
    const targetPrinter = printerSelect?.value || this.barcodeStickerState.selectedPrinter || (window.storage ? window.storage.get('label_printer_name') || '' : '') || '4BARCODE 3B-365B';
    const isSilent = false; // 1-Click direct field disabled as requested

    const showStore = document.getElementById('bsm-toggle-store')?.checked ?? true;
    const showName = document.getElementById('bsm-toggle-item-name')?.checked ?? true;
    const showPrice = document.getElementById('bsm-toggle-price')?.checked ?? true;
    const showBc = document.getElementById('bsm-toggle-barcode')?.checked ?? true;
    const storeName = (document.getElementById('bsm-store-name')?.value || '').trim() || 'DELICIOUS SUPERSTAR FOODS';
    const price = Number(item.retail_price || item.sale_price || 0);

    // 1. Immediately hide the modal and remove any toasts so Chromium NEVER prints them
    const modal = document.getElementById('barcode-sticker-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    const toastEl = document.getElementById('app-toast-container');
    if (toastEl) toastEl.remove();

    // 2. Build clean sticker HTML templates (pure white background, pure black ink, dead-centered with 0 padding)
    let stickerHtml = '';
    for (let i = 0; i < qty; i++) {
      stickerHtml += (
        '<div class="barcode-sticker-item" style="width: 38.1mm; height: 27.94mm; max-width: 38.1mm; max-height: 27.94mm; box-sizing: border-box; padding: 0 !important; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #ffffff !important; background-color: #ffffff !important; color: #000000 !important; overflow: hidden; page-break-after: always; break-after: page;">' +
          (showStore ? '<div style="font-size: 6.0pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2px; line-height: 1.05; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.2mm; color: #000000 !important; background: transparent !important;">' + storeName + '</div>' : '') +
          (showName ? '<div style="font-size: 7.4pt; font-weight: 900; line-height: 1.1; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0; margin-bottom: 0.3mm; color: #000000 !important; background: transparent !important;">' + item.item_name + '</div>' : '') +
          (showBc ? (
            '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; max-height: 11.5mm; overflow: hidden; margin: 0.1mm 0; background: transparent !important;">' +
              '<svg class="barcode-print-svg" data-barcode="' + barcodeVal + '" style="width: 100%; max-height: 8.5mm; display: block; background: #ffffff !important;"></svg>' +
              '<div style="font-size: 5.5pt; font-family: Inter, monospace; font-weight: 800; letter-spacing: 1.0px; line-height: 1; margin-top: 0.2mm; color: #000000 !important; background: transparent !important;">' + barcodeVal + '</div>' +
            '</div>'
          ) : '') +
          (showPrice ? (
            '<div style="display: flex; justify-content: center; align-items: center; width: 100%; border-top: 0.5px solid #000000 !important; padding-top: 0.3mm; margin-top: 0.2mm; font-size: 6.0pt; font-weight: 800; color: #000000 !important; background: transparent !important;">' +
              '<span style="font-size: 8.4pt; font-weight: 900; color: #000000 !important;">Rs. ' + price.toLocaleString() + '</span>' +
            '</div>'
          ) : '') +
        '</div>'
      );
    }

    // 3. Inject strict print style overrides for exact sticker dimensions and 100% white background
    let dynStyle = document.getElementById('dynamic-sticker-print-style');
    if (!dynStyle) {
      dynStyle = document.createElement('style');
      dynStyle.id = 'dynamic-sticker-print-style';
      document.head.appendChild(dynStyle);
    }
    dynStyle.textContent =
      '@media print {' +
        '@page {' +
          'size: 38.1mm 27.94mm !important;' +
          'margin: 0mm !important;' +
        '}' +
        'html, body {' +
          'background: #ffffff !important;' +
          'background-color: #ffffff !important;' +
          'color: #000000 !important;' +
          'margin: 0 !important;' +
          'padding: 0 !important;' +
          'width: 38.1mm !important;' +
          'max-width: 38.1mm !important;' +
          'height: auto !important;' +
          'overflow: visible !important;' +
        '}' +
        '.no-print, #app-toast-container, #barcode-sticker-modal, #price-checker-modal, #confirm-modal, #payment-modal, #preview-modal, #loading-overlay, #quick-calculator-widget, body > aside, body > main, body > div:not(.active-print-target) {' +
          'display: none !important;' +
          'visibility: hidden !important;' +
          'opacity: 0 !important;' +
        '}' +
        '#barcode-sticker-print.active-print-target {' +
          'display: block !important;' +
          'visibility: visible !important;' +
          'width: 38.1mm !important;' +
          'max-width: 38.1mm !important;' +
          'background: #ffffff !important;' +
          'background-color: #ffffff !important;' +
          'margin: 0 auto !important;' +
          'padding: 0 !important;' +
        '}' +
        '.barcode-sticker-item {' +
          'page-break-after: always !important;' +
          'break-after: page !important;' +
          'box-sizing: border-box !important;' +
          'background: #ffffff !important;' +
          'background-color: #ffffff !important;' +
          'color: #000000 !important;' +
          'border: none !important;' +
          'margin: 0 auto !important;' +
          'padding: 0 !important;' +
          'display: flex !important;' +
          'flex-direction: column !important;' +
          'align-items: center !important;' +
          'justify-content: center !important;' +
        '}' +
        '.barcode-sticker-item:last-child {' +
          'page-break-after: avoid !important;' +
          'break-after: avoid !important;' +
        '}' +
      '}';

    // 4. Inject HTML into #barcode-sticker-print container
    this.setPrintContent('barcode-sticker-print', stickerHtml);

    // 5. Render barcodes on each generated SVG via JsBarcode
    const container = document.getElementById('barcode-sticker-print');
    if (container && window.JsBarcode) {
      const svgs = container.querySelectorAll('.barcode-print-svg');
      svgs.forEach(svg => {
        const code = svg.getAttribute('data-barcode') || barcodeVal;
        try {
          window.JsBarcode(svg, code, {
            format: 'CODE128',
            width: 1.15,
            height: 20,
            displayValue: false,
            margin: 0,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } catch (e) {
          console.warn('JsBarcode print SVG render error:', e);
        }
      });
    }

    // 6. Give Chromium 60ms to flush DOM changes before firing print
    await new Promise(r => setTimeout(r, 60));

    // 7. Send print command via IPC
    const printOptions = {
      deviceName: targetPrinter,
      silent: isSilent,
      pageSize: {
        width: 38100, // exact 1.50 in = 38.1 mm (matched to driver stock 38x28)
        height: 27940 // exact 1.10 in = 27.94 mm (matched to driver stock 38x28)
      }
    };

    try {
      let result;
      if (window.api && window.api.printBarcodeStickers) {
        result = await window.api.printBarcodeStickers(printOptions);
      } else if (window.api && window.api.printReceipt) {
        result = await window.api.printReceipt(printOptions);
      } else {
        window.print();
        result = { success: true };
      }

      if (result && result.success !== false) {
        this.showToast('Successfully printed ' + qty + ' sticker' + (qty > 1 ? 's' : '') + '!', 'success');
        this.recordStickersPrinted(item.id, qty);
      } else if (result && result.failureReason) {
        console.warn('Print response:', result.failureReason);
      }
    } catch (err) {
      console.error('Error during sticker print:', err);
      this.showToast('Print failed: ' + (err.message || 'Check printer connection'), 'error');
    }
  },

  // ==========================================
  // DC-1750 Handheld TIJ 1-Bit BMP Export
  // ==========================================
  openTijExportModal() {
    const modal = document.getElementById('tij-export-modal');
    if (!modal) return;

    const item = this.barcodeStickerState.activeItem;
    if (!item) {
      this.showToast('Please select a product first', 'error');
      return;
    }

    const isShoper = item.package_type === 'shoper';
    const spec = item.pieces_per_carton ? `${item.pieces_per_carton} pcs/${isShoper ? 'shoper' : 'ctn'}` : (item.category_label || '');
    const price = Number(item.retail_price || item.sale_price || 0);

    const nameEl = document.getElementById('tij-item-name');
    const bcEl = document.getElementById('tij-item-barcode');
    const priceEl = document.getElementById('tij-item-price');
    const specEl = document.getElementById('tij-item-spec');

    if (nameEl) nameEl.textContent = item.item_name || 'Product';
    if (bcEl) bcEl.textContent = item.barcode ? `Barcode: #${item.barcode}` : 'No Barcode Assigned';
    if (priceEl) priceEl.textContent = `Rs. ${price.toLocaleString()}`;
    if (specEl) specEl.textContent = spec;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons({ root: modal });

    this.updateTijPreview();
  },

  closeTijExportModal() {
    const modal = document.getElementById('tij-export-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  getTijExportOptions() {
    const layout = document.querySelector('input[name="tij-layout"]:checked')?.value || 'full';
    const incStore = document.getElementById('tij-inc-store')?.checked ?? true;
    const incName = document.getElementById('tij-inc-name')?.checked ?? true;
    const incPrice = document.getElementById('tij-inc-price')?.checked ?? true;
    const barWidth = Number(document.getElementById('tij-bar-width')?.value) || 2.0;
    const storeName = (document.getElementById('bsm-store-name')?.value || '').trim() || this.barcodeStickerState.storeName || 'DELICIOUS SUPERSTAR FOODS';

    return { layout, incStore, incName, incPrice, barWidth, invert: false, storeName };
  },

  updateTijPreview() {
    const item = this.barcodeStickerState.activeItem;
    if (!item) return;

    const options = this.getTijExportOptions();
    const renderedCanvas = this.renderTijCanvas(item, options);

    const previewCanvas = document.getElementById('tij-preview-canvas');
    const dimLabel = document.getElementById('tij-dimensions-label');

    if (previewCanvas) {
      previewCanvas.width = renderedCanvas.width;
      previewCanvas.height = renderedCanvas.height;
      const ctx = previewCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(renderedCanvas, 0, 0);

      // Apply CSS visual inversion if requested so preview matches 100%
      if (options.invert) {
        previewCanvas.style.filter = 'invert(1)';
      } else {
        previewCanvas.style.filter = 'none';
      }
    }

    if (dimLabel) {
      dimLabel.textContent = `${renderedCanvas.width} × ${renderedCanvas.height} px (12.7 mm TIJ)`;
    }
  },

  renderTijCanvas(item, options = {}) {
    const layout = options.layout || 'full';
    const isFull = layout === 'full';
    const width = isFull ? 480 : 360;
    const height = 152; // Standard 12.7 mm HP 2.5 TIJ height at 300 DPI

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Fill pristine white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    const barcodeVal = String(item.barcode || '').trim() || '123456789012';
    const isShoper = item.package_type === 'shoper';
    const spec = item.pieces_per_carton ? `${item.pieces_per_carton} pcs/${isShoper ? 'shoper' : 'ctn'}` : (item.category_label || '');
    const price = Number(item.retail_price || item.sale_price || 0);

    const incStore = options.incStore ?? true;
    const incName = options.incName ?? true;
    const incPrice = options.incPrice ?? true;
    const barWidth = options.barWidth || 2.0;
    const storeName = (options.storeName || this.barcodeStickerState.storeName || 'DELICIOUS SUPERSTAR FOODS').trim();

    ctx.fillStyle = '#000000';

    if (isFull) {
      // Dynamic height balancing for 152 px cartridge height
      let availableBarHeight = 58;
      if (!incStore) availableBarHeight += 12;
      if (!incPrice) availableBarHeight += 12;
      if (!incName) availableBarHeight += 14;
      availableBarHeight = Math.min(84, availableBarHeight);

      // Calculate total height to center content vertically
      const totalEstimatedHeight = 
        (incStore ? 15 : 0) + 
        (incName ? 18 : 0) + 
        availableBarHeight + 
        23 + // Barcode number height (18px font + 5px gap)
        (incPrice ? 20 : 0);

      let curY = Math.max(3, Math.floor((height - totalEstimatedHeight) / 2));

      // 1. Store Header
      if (incStore) {
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(storeName.toUpperCase(), width / 2, curY);
        curY += 15;
      }

      // 2. Product Name / Spec
      if (incName) {
        ctx.font = '900 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const displayTitle = (item.item_name || 'Product') + (spec ? ` (${spec})` : '');
        ctx.fillText(displayTitle, width / 2, curY);
        curY += 18;
      }

      // 3. Barcode Bars (Increased height + wide quiet zones for handheld scanner reading)
      const bcCanvas = document.createElement('canvas');
      try {
        window.JsBarcode(bcCanvas, barcodeVal, {
          format: 'CODE128',
          width: barWidth,
          height: availableBarHeight,
          displayValue: false,
          margin: 6,
          background: '#FFFFFF',
          lineColor: '#000000'
        });
        const bcX = Math.round((width - bcCanvas.width) / 2);
        ctx.drawImage(bcCanvas, bcX, curY);
        curY += availableBarHeight + 3;
      } catch (e) {
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`|||| ${barcodeVal} ||||`, width / 2, curY);
        curY += 28;
      }

      // 4. Barcode Number (Enlarged, bold, OCR-style spaced digits for effortless scanning & reading)
      ctx.font = '900 18px "Consolas", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const formattedBc = barcodeVal.length <= 14 ? barcodeVal.split('').join(' ') : barcodeVal;
      ctx.fillText(formattedBc, width / 2, curY);
      curY += 22;

      // 5. Price
      if (incPrice) {
        ctx.font = '900 17px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`Price: Rs. ${price.toLocaleString()}`, width / 2, curY);
      }
    } else {
      // Compact Barcode-Only layout
      const barHeight = incPrice ? 92 : 108;
      const totalEstimatedHeight = barHeight + 28 + (incPrice ? 20 : 0);
      let curY = Math.max(4, Math.floor((height - totalEstimatedHeight) / 2));

      const bcCanvas = document.createElement('canvas');
      try {
        window.JsBarcode(bcCanvas, barcodeVal, {
          format: 'CODE128',
          width: barWidth,
          height: barHeight,
          displayValue: false,
          margin: 6,
          background: '#FFFFFF',
          lineColor: '#000000'
        });
        const bcX = Math.round((width - bcCanvas.width) / 2);
        ctx.drawImage(bcCanvas, bcX, curY);
        curY += barHeight + 4;
      } catch (e) {
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(barcodeVal, width / 2, curY);
        curY += 40;
      }

      // Large bold barcode digits
      ctx.font = '900 24px "Consolas", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const formattedBc = barcodeVal.length <= 14 ? barcodeVal.split('').join(' ') : barcodeVal;
      ctx.fillText(formattedBc, width / 2, curY);
      curY += 28;

      if (incPrice) {
        ctx.font = '900 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`Price: Rs. ${price.toLocaleString()}`, width / 2, curY);
      }
    }

    return canvas;
  },

  canvasTo1BitBMP(canvas, invert = false) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const rowSize = Math.ceil(width / 32) * 4;
    const imageSize = rowSize * height;
    const fileSize = 62 + imageSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // BITMAPFILEHEADER (14 bytes)
    view.setUint16(0, 0x4D42, true); // 'BM'
    view.setUint32(2, fileSize, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint32(10, 62, true);

    // BITMAPINFOHEADER (40 bytes)
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, height, true); // bottom-up
    view.setUint16(26, 1, true); // planes
    view.setUint16(28, 1, true); // 1bpp
    view.setUint32(30, 0, true); // BI_RGB
    view.setUint32(34, imageSize, true);
    view.setInt32(38, 11811, true); // 300 DPI
    view.setInt32(42, 11811, true); // 300 DPI
    view.setUint32(46, 2, true); // 2 colors
    view.setUint32(50, 0, true);

    // PALETTE (8 bytes)
    // Color 0: Black (#000000)
    bytes[54] = 0; bytes[55] = 0; bytes[56] = 0; bytes[57] = 0;
    // Color 1: White (#FFFFFF)
    bytes[58] = 255; bytes[59] = 255; bytes[60] = 255; bytes[61] = 0;

    // PIXEL DATA (Bottom-up)
    const offset = 62;
    for (let y = height - 1; y >= 0; y--) {
      const rowOffset = offset + (height - 1 - y) * rowSize;
      let byteVal = 0;
      let bitIndex = 0;
      let byteInRow = 0;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        const isWhite = (a < 128) || (brightness > 128);

        // Map: in normal mode, white is bit 1, black is bit 0. Invert flips it.
        const bit = invert ? (isWhite ? 0 : 1) : (isWhite ? 1 : 0);

        if (bit) {
          byteVal |= (1 << (7 - bitIndex));
        }

        bitIndex++;
        if (bitIndex === 8) {
          bytes[rowOffset + byteInRow] = byteVal;
          byteInRow++;
          byteVal = 0;
          bitIndex = 0;
        }
      }

      if (bitIndex > 0) {
        bytes[rowOffset + byteInRow] = byteVal;
        byteInRow++;
      }
    }

    // Convert to Base64 in safe chunks
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  },

  async saveCurrentTijBmp() {
    const item = this.barcodeStickerState.activeItem;
    if (!item) return;

    const options = this.getTijExportOptions();
    const canvas = this.renderTijCanvas(item, options);
    const base64Data = this.canvasTo1BitBMP(canvas, options.invert);

    const safeName = (item.item_name || 'PRODUCT')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .toUpperCase();
    const bcSuffix = item.barcode ? `_${item.barcode}` : '';
    const defaultName = `${safeName}${bcSuffix}.bmp`;

    try {
      if (window.api && window.api.saveBmpFile) {
        const res = await window.api.saveBmpFile({ defaultName, base64Data });
        if (res && res.success) {
          this.showToast(`Saved 1-Bit BMP to ${res.filePath}! Ready to copy to USB and load on DC-1750.`, 'success');
        } else if (res && !res.canceled) {
          this.showToast('Save failed: ' + (res.error || 'Unknown error'), 'error');
        }
      } else {
        // Fallback: browser download
        const a = document.createElement('a');
        a.href = 'data:image/bmp;base64,' + base64Data;
        a.download = defaultName;
        a.click();
        this.showToast(`Downloaded ${defaultName} for USB drive`, 'success');
      }
    } catch (err) {
      console.error('Error saving BMP:', err);
      this.showToast('Failed to save BMP: ' + err.message, 'error');
    }
  },

  async exportAllCartonsToTIJ() {
    let cartons = this.barcodeStickerState.allProducts || [];
    if (cartons.length === 0) {
      try {
        const dbCartons = (await window.api.getPackedCartons()) || [];
        cartons = dbCartons.map(c => ({
          id: c.id,
          item_name: c.carton_name,
          package_type: c.package_type || 'carton',
          barcode: c.barcode || '',
          retail_price: c.carton_sale_price || 0,
          category_label: `${c.pieces_per_carton} pcs/${c.package_type === 'shoper' ? 'shoper' : 'ctn'}`,
          pieces_per_carton: c.pieces_per_carton
        }));
      } catch (e) {
        console.error('Failed to load cartons for batch export:', e);
      }
    }

    if (cartons.length === 0) {
      this.showToast('No packed cartons or shopers found to export.', 'error');
      return;
    }

    const options = this.getTijExportOptions();

    // Generate BMP for each carton
    const files = [];
    cartons.forEach(c => {
      const canvas = this.renderTijCanvas(c, options);
      const base64Data = this.canvasTo1BitBMP(canvas, options.invert);
      const safeName = (c.item_name || 'PRODUCT')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_')
        .toUpperCase();
      const bcSuffix = c.barcode ? `_${c.barcode}` : `_${c.id}`;
      files.push({
        fileName: `${safeName}${bcSuffix}.bmp`,
        base64Data
      });
    });

    try {
      this.showToast(`Preparing ${files.length} BMP barcode files for USB drive...`, 'info');
      if (window.api && window.api.saveBmpBatch) {
        const res = await window.api.saveBmpBatch({ files });
        if (res && res.success) {
          this.showToast(`Exported all ${res.count} BMP files to "${res.targetDir}"! Plug USB into DC-1750 to use.`, 'success');
        } else if (res && !res.canceled) {
          this.showToast('Batch export failed: ' + (res.error || 'Unknown error'), 'error');
        }
      } else {
        // Fallback: download one by one
        files.forEach(f => {
          const a = document.createElement('a');
          a.href = 'data:image/bmp;base64,' + f.base64Data;
          a.download = f.fileName;
          a.click();
        });
        this.showToast(`Downloaded ${files.length} BMP files`, 'success');
      }
    } catch (err) {
      console.error('Error batch exporting TIJ files:', err);
      this.showToast('Batch export failed: ' + err.message, 'error');
    }
  },

  // Calculator State & Logic
  calcState: {
    current: '0',
    previous: null,
    operator: null,
    isNewNumber: true,
    history: '',
    isOpen: false
  },

  initCalculator() {
    // Click outside listener to close calculator
    document.addEventListener('mousedown', (e) => {
      if (!this.calcState || !this.calcState.isOpen) return;
      const calcWidget = document.getElementById('quick-calculator-widget');
      const calcBtn = document.getElementById('sidebar-calc-btn');
      if (calcWidget && !calcWidget.contains(e.target) && (!calcBtn || !calcBtn.contains(e.target))) {
        this.closeCalculator();
      }
    });

    // Keyboard listener
    document.addEventListener('keydown', (e) => {
      if (!this.calcState || !this.calcState.isOpen) return;
      if (e.key === 'Escape') {
        this.closeCalculator();
        return;
      }
      // If user is actively typing in an input/textarea, allow normal typing
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        this.calcAction('num', e.key);
      } else if (e.key === '.') {
        this.calcAction('dot');
      } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        this.calcAction('op', e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        this.calcAction('equals');
      } else if (e.key === 'Backspace') {
        this.calcAction('backspace');
      } else if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
        this.calcAction('clear');
      } else if (e.key === '%') {
        this.calcAction('percent');
      }
    });

    // Draggable header support
    const header = document.getElementById('calc-header');
    const widget = document.getElementById('quick-calculator-widget');
    if (header && widget) {
      let isDragging = false;
      let startX, startY, origLeft, origTop;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        widget.style.bottom = 'auto';
        widget.style.left = `${origLeft}px`;
        widget.style.top = `${origTop}px`;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(10, Math.min(window.innerWidth - widget.offsetWidth - 10, origLeft + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - widget.offsetHeight - 10, origTop + dy));
        widget.style.left = `${newLeft}px`;
        widget.style.top = `${newTop}px`;
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }
  },

  toggleCalculator(e) {
    if (e) e.stopPropagation();
    if (this.calcState && this.calcState.isOpen) {
      this.closeCalculator();
    } else {
      this.openCalculator();
    }
  },

  openCalculator() {
    const widget = document.getElementById('quick-calculator-widget');
    if (!widget) return;
    if (!this.calcState) {
      this.calcState = { current: '0', previous: null, operator: null, isNewNumber: true, history: '', isOpen: false };
    }
    this.calcState.isOpen = true;
    widget.classList.remove('hidden');
    const btn = document.getElementById('sidebar-calc-btn');
    if (btn) {
      btn.classList.add('bg-slate-800', 'border-amber-500/50', 'text-amber-400');
    }
    this.updateCalcDisplay();
    if (window.lucide) lucide.createIcons();
  },

  closeCalculator() {
    const widget = document.getElementById('quick-calculator-widget');
    if (!widget) return;
    if (this.calcState) {
      this.calcState.isOpen = false;
    }
    widget.classList.add('hidden');
    const btn = document.getElementById('sidebar-calc-btn');
    if (btn) {
      btn.classList.remove('bg-slate-800', 'border-amber-500/50', 'text-amber-400');
    }
  },

  calcAction(action, value = null) {
    if (!this.calcState) return;
    let s = this.calcState;
    if (action === 'num') {
      if (s.isNewNumber || s.current === '0') {
        s.current = value;
        s.isNewNumber = false;
      } else {
        if (s.current.length < 14) {
          s.current += value;
        }
      }
    } else if (action === 'dot') {
      if (s.isNewNumber) {
        s.current = '0.';
        s.isNewNumber = false;
      } else if (!s.current.includes('.')) {
        s.current += '.';
      }
    } else if (action === 'op') {
      const curNum = parseFloat(s.current);
      if (s.previous !== null && !s.isNewNumber && s.operator) {
        const res = this._evalCalc(s.previous, curNum, s.operator);
        s.current = String(Number(res.toFixed(6)));
        s.previous = parseFloat(s.current);
      } else {
        s.previous = curNum;
      }
      s.operator = value;
      s.isNewNumber = true;
      const opSym = value === '*' ? '×' : (value === '/' ? '÷' : (value === '-' ? '−' : '+'));
      s.history = `${s.previous} ${opSym}`;
    } else if (action === 'equals') {
      if (s.operator && s.previous !== null) {
        const curNum = parseFloat(s.current);
        const opSym = s.operator === '*' ? '×' : (s.operator === '/' ? '÷' : (s.operator === '-' ? '−' : '+'));
        const res = this._evalCalc(s.previous, curNum, s.operator);
        const formattedRes = String(Number(res.toFixed(6)));
        s.history = `${s.previous} ${opSym} ${curNum} =`;
        s.current = formattedRes;
        s.previous = null;
        s.operator = null;
        s.isNewNumber = true;
      }
    } else if (action === 'clear') {
      s.current = '0';
      s.previous = null;
      s.operator = null;
      s.history = '';
      s.isNewNumber = true;
    } else if (action === 'backspace') {
      if (!s.isNewNumber && s.current.length > 0) {
        s.current = s.current.slice(0, -1);
        if (s.current === '' || s.current === '-') {
          s.current = '0';
          s.isNewNumber = true;
        }
      }
    } else if (action === 'percent') {
      const val = parseFloat(s.current) / 100;
      s.current = String(Number(val.toFixed(6)));
    } else if (action === 'plusminus') {
      if (s.current !== '0') {
        if (s.current.startsWith('-')) {
          s.current = s.current.slice(1);
        } else {
          s.current = '-' + s.current;
        }
      }
    }
    this.updateCalcDisplay();
  },

  _evalCalc(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? (a / b) : 0;
      default: return b;
    }
  },

  updateCalcDisplay() {
    const disp = document.getElementById('calc-display');
    const hist = document.getElementById('calc-history');
    if (!this.calcState) return;
    if (disp) {
      let num = this.calcState.current;
      if (!num.includes('e') && !num.includes('E')) {
        const parts = num.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        disp.textContent = parts.join('.');
      } else {
        disp.textContent = num;
      }
    }
    if (hist) {
      hist.textContent = this.calcState.history || '';
    }
  },

  copyCalculatorResult() {
    if (!this.calcState) return;
    const val = this.calcState.current;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val);
    }
    const hist = document.getElementById('calc-history');
    if (hist) {
      const prev = hist.textContent;
      hist.textContent = 'Copied to clipboard!';
      hist.classList.add('text-emerald-400');
      setTimeout(() => {
        hist.textContent = prev;
        hist.classList.remove('text-emerald-400');
      }, 1200);
    }
  },

  // App Zoom & Scale Management
  currentZoom: 0.82,
  async initZoom() {
    let savedZoom = null;

    // 1. Try window.storage
    try {
      if (window.storage && window.storage.get) {
        const stored = window.storage.get('app_zoom');
        if (stored) {
          const p = parseFloat(stored);
          if (!isNaN(p) && p >= 0.5 && p <= 1.5) savedZoom = p;
        }
      }
    } catch (e) {}

    // 2. Try raw localStorage (handling raw number, string, or JSON-stringified string)
    if (!savedZoom) {
      try {
        let raw = localStorage.getItem('app_zoom');
        if (raw) {
          try { raw = JSON.parse(raw); } catch (e) {}
          const p = parseFloat(raw);
          if (!isNaN(p) && p >= 0.5 && p <= 1.5) savedZoom = p;
        }
      } catch (e) {}
    }

    // 3. Try DB settings
    if (!savedZoom && window.api && window.api.getSettings) {
      try {
        const s = await window.api.getSettings();
        if (s && s.app_zoom) {
          let val = s.app_zoom;
          try { val = JSON.parse(val); } catch (e) {}
          const p = parseFloat(val);
          if (!isNaN(p) && p >= 0.5 && p <= 1.5) savedZoom = p;
        }
      } catch (e) {}
    }

    // 4. Try Main Process Zoom Factor
    if (!savedZoom && window.api && window.api.getZoomFactor) {
      try {
        const factor = await window.api.getZoomFactor();
        if (factor && !isNaN(factor) && factor >= 0.5 && factor <= 1.5) {
          savedZoom = factor;
        }
      } catch (e) {}
    }

    if (!savedZoom || isNaN(savedZoom)) savedZoom = 0.82;
    await this.setZoom(savedZoom, false);

    // Global keyboard shortcuts for zoom (Ctrl +, Ctrl -, Ctrl 0)
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd') {
          e.preventDefault();
          this.adjustZoom(0.05);
        } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          this.adjustZoom(-0.05);
        } else if (e.key === '0' || e.code === 'Numpad0') {
          e.preventDefault();
          this.setZoom(0.82, true);
        }
      }
    });
  },

  async setZoom(factor, save = true) {
    const z = Math.min(1.4, Math.max(0.6, Math.round(factor * 100) / 100));
    const zStr = z.toFixed(2);
    this.currentZoom = z;

    try {
      localStorage.setItem('app_zoom', zStr);
      if (window.storage && window.storage.set) {
        window.storage.set('app_zoom', zStr);
      }
    } catch (e) {}

    // Persist immediately to SQLite settings table
    if (window.api && window.api.saveSettings) {
      try {
        await window.api.saveSettings({ app_zoom: zStr });
      } catch (e) {}
    }

    if (window.api && window.api.setZoomFactor) {
      try {
        await window.api.setZoomFactor(z);
      } catch (e) {}
    }

    this.updateZoomUI(z);
    if (save) {
      this.showZoomNotification(z);
    }
  },

  async adjustZoom(delta) {
    await this.setZoom((this.currentZoom || 0.82) + delta, true);
  },

  updateZoomUI(z) {
    const percent = Math.round(z * 100);
    const label = document.getElementById('sidebar-zoom-label');
    if (label) {
      label.textContent = `${percent}%`;
    }
    const settingsZoomDisplay = document.getElementById('settings-zoom-display');
    if (settingsZoomDisplay) {
      settingsZoomDisplay.textContent = `${percent}%`;
    }
    document.querySelectorAll('.zoom-preset-btn').forEach(btn => {
      const bZ = parseFloat(btn.getAttribute('data-zoom'));
      if (Math.round(bZ * 100) === percent) {
        btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600', 'shadow-sm');
        btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600', 'shadow-sm');
        btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
      }
    });
  },

  showZoomNotification(z) {
    let notif = document.getElementById('zoom-toast-indicator');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'zoom-toast-indicator';
      notif.className = 'fixed bottom-6 right-6 z-[99999] bg-slate-900/95 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-2xl backdrop-blur-md pointer-events-none transition-opacity duration-300 flex items-center gap-2 border border-slate-700/60';
      document.body.appendChild(notif);
    }
    const percent = Math.round(z * 100);
    const tag = percent === 82 ? '(Laptop Ideal - 18% smaller)' : (percent === 85 ? '(15% smaller)' : (percent === 100 ? '(Standard Desktop)' : ''));
    notif.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> App Size: <b class="text-blue-400 font-mono">${percent}%</b> <span class="text-slate-400 font-normal">${tag}</span>`;
    notif.style.opacity = '1';
    clearTimeout(this._zoomTimer);
    this._zoomTimer = setTimeout(() => {
      if (notif) notif.style.opacity = '0';
    }, 1600);
  }
};

window.storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) { return null; }
  },
  set: (key, val) => {
    try {
      const jsonStr = JSON.stringify(val);
      localStorage.setItem(key, jsonStr);
      if (window.api && window.api.setKv) {
        window.api.setKv(key, jsonStr);
      }
    } catch (e) {
      console.error("Storage set error:", e);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
