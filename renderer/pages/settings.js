const LOCKABLE_TABS = [
  { key: 'dashboard', name: 'Dashboard' },
  { key: 'raw-materials', name: '1. Raw Materials' },
  { key: 'production', name: '2. Production (Pcs)' },
  { key: 'carton-packing', name: '3. Carton Packing' },
  { key: 'car-loading', name: '4. Cars & Loading' },
  { key: 'shop-sales', name: '5. Shop Deliveries' },
  { key: 'proposals', name: 'Delivery History' },
  { key: 'customers', name: 'Shops / Khata' },
  { key: 'reports', name: 'Factory Reports' },
  { key: 'expenses', name: 'Expenses' },
  { key: 'settings', name: 'Settings' }
];

const Settings = {
  originalLogo: '',

  async render(container) {
    container.innerHTML = `
      <div class="flex justify-between items-center mb-6 flex-wrap gap-4 no-print">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <i data-lucide="settings" class="w-5 h-5"></i>
          </div>
          <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Factory Settings</h2>
        </div>
        <div>
          <button type="submit" form="settings-form" id="btn-save-profile" class="h-10 px-5 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer">
            <i data-lucide="save" class="w-4 h-4 stroke-[2.5]"></i> Save Profile
          </button>
        </div>
      </div>

      <!-- General Settings -->
      <div id="settings-view-general" class="overflow-y-auto pr-2 custom-scrollbar" style="max-height: calc(100vh - 180px);">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-8">
          <!-- Company Profile -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50">
              <h3 class="font-bold text-lg text-slate-700">Company Profile</h3>
            </div>
            
            <form id="settings-form" class="p-4 space-y-3" onsubmit="Settings.saveSettings(event)">
              
              <!-- Logo Section -->
              <div class="flex items-start gap-4 pb-2 border-b border-slate-100">
                <div class="shrink-0">
                  <div class="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                    <img id="settings-logo-preview" src="" class="w-full h-full object-cover object-center hidden rounded-xl">
                    <div id="settings-logo-placeholder" class="text-slate-400 flex flex-col items-center">
                      <i data-lucide="image" class="w-8 h-8 mb-2"></i>
                      <span class="text-[10px] font-medium">No Logo</span>
                    </div>
                    <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer" onclick="Settings.selectLogo()">
                      <span class="text-white text-[10px] font-bold"><i data-lucide="upload" class="w-4 h-4 mb-1 mx-auto"></i> Change</span>
                    </div>
                  </div>
                  <input type="hidden" id="set-logo-path">
                </div>
                <div class="flex-1 pt-2">
                  <h4 class="font-medium text-slate-700 mb-2">Company UI Logo</h4>
                  <div class="flex gap-2">
                    <button type="button" onclick="Settings.selectLogo()" class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">Choose</button>
                    <button type="button" onclick="Settings.removeLogo()" class="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg">Remove</button>
                  </div>
                </div>
              </div>

              <!-- Fields -->
              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Factory / Company Name *</label>
                  <input type="text" id="set-name" class="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-accent outline-none">
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Contact Phone Numbers</label>
                    <input type="text" id="set-phone" class="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-accent outline-none" placeholder="0309-5369472">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Website / Tagline</label>
                    <input type="text" id="set-web" class="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-accent outline-none" placeholder="Quality Ice Cream">
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Factory Address</label>
                  <textarea id="set-address" rows="2" class="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-accent outline-none" placeholder="Industrial Area, Near Barrier 3, Main GT Road, Wah Cantt"></textarea>
                </div>
              </div>
            </form>
          </div>

          <!-- Security Settings -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100">
            <div class="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <h3 class="font-bold text-lg text-slate-700">Tab Access Security</h3>
            </div>
            <div class="p-4 space-y-4">
              <div class="flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <i data-lucide="lock" class="w-5 h-5"></i>
                 </div>
                 <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-sm">Security Password</h4>
                    <p class="text-xs text-slate-500 mb-3">Set a password to restrict access to selected tabs. Leave blank to disable protection.</p>
                    
                     <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                       <div>
                         <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Password</label>
                         <div class="relative">
                           <input type="password" id="set-stock-password" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-2 pr-9 text-sm focus:ring-1 focus:ring-accent outline-none">
                           <button type="button" onclick="Settings.togglePasswordVisibility('set-stock-password', this)" class="password-visibility-toggle absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                             <i data-lucide="eye" class="w-4 h-4"></i>
                           </button>
                         </div>
                       </div>
                       <div>
                         <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirm Password</label>
                         <div class="relative">
                           <input type="password" id="set-stock-password-confirm" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-2 pr-9 text-sm focus:ring-1 focus:ring-accent outline-none">
                           <button type="button" onclick="Settings.togglePasswordVisibility('set-stock-password-confirm', this)" class="password-visibility-toggle absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                             <i data-lucide="eye" class="w-4 h-4"></i>
                           </button>
                         </div>
                       </div>
                     </div>
                     <button type="button" id="btn-remove-stock-pass" onclick="Settings.removeStockPassword()" class="hidden text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors mb-3">
                        <i data-lucide="unlock" class="w-3 h-3"></i> Remove Current Password
                     </button>

                     <!-- Dropdown of Lockable Tabs with Checkmarks -->
                     <div class="pt-3 border-t border-slate-100">
                       <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Locked Tabs Selection</label>
                       <div class="relative">
                         <button type="button" onclick="Settings.toggleTabDropdown(event)" id="locked-tabs-btn" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold hover:bg-white border-slate-200 transition-all flex items-center justify-between">
                            <span id="locked-tabs-text">No Tabs Locked</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                         </button>
                         <div id="locked-tabs-menu" class="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 hidden max-h-60 overflow-y-auto">
                            <!-- Injected dynamically -->
                         </div>
                       </div>
                     </div>
                  </div>
              </div>
            </div>
          </div>

          <!-- Backup & Restore -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 class="font-bold text-lg text-slate-700">Backup & Data</h3>
              <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Auto Backup Active
              </span>
            </div>
            <div class="p-4 space-y-4">
              <!-- Automatic Backup on Exit (Directory Selection) -->
              <div class="flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <i data-lucide="shield-check" class="w-5 h-5"></i>
                 </div>
                 <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 text-sm">Automatic Backup on Exit</h4>
                    <p class="text-xs text-slate-500 mb-2.5">Your latest data is automatically backed up to this folder every time you close the app.</p>
                    
                    <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div class="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 truncate shadow-2xs">
                        <i data-lucide="folder" class="w-4 h-4 text-slate-400 shrink-0"></i>
                        <span id="auto-backup-dir-display" class="truncate" title="Backup folder">Loading...</span>
                      </div>
                      <button type="button" onclick="Settings.selectBackupDirectory()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5"></i>
                        Select Directory
                      </button>
                      <button type="button" onclick="Settings.openBackupDirectory()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer" title="Open folder in File Explorer">
                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                        Open Folder
                      </button>
                    </div>
                 </div>
              </div>

              <!-- Manual Backup -->
              <div class="pt-3 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <i data-lucide="download" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Backup Data Locally</h4>
                    <p class="text-xs text-slate-500 mb-3">Backup all proposals, expenses, products, and logs into a single file at any time.</p>
                    <button onclick="Settings.backupData()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Backup App Data
                    </button>
                 </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Restore from Backup</h4>
                    <p class="text-xs text-slate-500 mb-3">Restore your entire system from a previous backup file. <span class="text-red-500 font-bold">This will replace current data.</span></p>
                    <button onclick="Settings.restoreData()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Restore Data
                    </button>
                 </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Clear All App Data</h4>
                    <p class="text-xs text-slate-500 mb-3">Permanently delete all data and reset the application to its original state. <span class="text-red-600 font-bold underline">This action cannot be undone.</span></p>
                    <button onclick="Settings.clearAppData()" class="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Clear All Data
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      await this.reloadSettings();
      if (window.lucide) lucide.createIcons();
    } catch(e) {
      console.error(e);
    }
  },


  async refreshPrinters() {
    const select = document.getElementById('set-label-printer');
    if (!select) return;

    select.innerHTML = '<option value="">Detecting printers...</option>';
    let printers = [];
    try {
      if (window.api && window.api.getPrinters) {
        printers = await window.api.getPrinters() || [];
      }
    } catch (e) {
      console.warn('Failed to get printers:', e);
    }

    if (!printers || printers.length === 0) {
      select.innerHTML = '<option value="">Default Windows Printer (Auto)</option>';
      return;
    }

    const savedPrinter = window.storage ? window.storage.get('label_printer_name') || '' : '';

    printers.sort((a, b) => {
      const isPosA = /pos|speed|label|sticker|barcode|thermal|xp-|80/i.test(a.name);
      const isPosB = /pos|speed|label|sticker|barcode|thermal|xp-|80/i.test(b.name);
      if (isPosA && !isPosB) return -1;
      if (!isPosA && isPosB) return 1;
      return a.name.localeCompare(b.name);
    });

    select.innerHTML = printers.map(p => {
      const isSpeedOrPos = /pos|speed|label|sticker|barcode|thermal|xp-|80/i.test(p.name);
      const label = p.name + (isSpeedOrPos ? ' ★ (Speed-X / Thermal Ready)' : '') + (p.isDefault ? ' [Default]' : '');
      return '<option value="' + p.name + '">' + label + '</option>';
    }).join('');

    if (savedPrinter && printers.some(p => p.name === savedPrinter)) {
      select.value = savedPrinter;
    } else {
      const best = printers.find(p => /speed|sp-|650|label|sticker|barcode/i.test(p.name)) ||
                   printers.find(p => /pos|thermal|xp-|80/i.test(p.name)) ||
                   printers.find(p => p.isDefault) || printers[0];
      if (best) select.value = best.name;
    }
  },

  savePrinterSettings() {
    if (!window.storage) return;
    const printer = document.getElementById('set-label-printer')?.value || '';
    const size = document.getElementById('set-label-size')?.value || '38x28';
    const mode = document.getElementById('set-print-mode')?.value || 'silent';
    const store = (document.getElementById('set-sticker-store-name')?.value || '').trim();

    window.storage.set('label_printer_name', printer);
    window.storage.set('label_sticker_size', size);
    window.storage.set('label_print_mode', mode);
    if (store) window.storage.set('label_store_name', store);

    if (window.app && app.barcodeStickerState) {
      app.barcodeStickerState.selectedPrinter = printer;
      app.barcodeStickerState.sizePreset = size;
      if (store) app.barcodeStickerState.storeName = store;
    }
  },

  testStickerPrint() {
    this.savePrinterSettings();
    if (window.app && typeof app.openBarcodeStickerModal === 'function') {
      app.openBarcodeStickerModal();
      setTimeout(() => {
        if (typeof app.testPrintBarcodeSticker === 'function') {
          app.testPrintBarcodeSticker();
        }
      }, 300);
    }
  },

  async reloadSettings() {
    const s = await window.api.getSettings();
    if (document.getElementById('set-name')) document.getElementById('set-name').value = s.company_name || 'Ice Cream Factory';
    if (document.getElementById('set-web')) document.getElementById('set-web').value = s.website || '';
    if (document.getElementById('set-address')) document.getElementById('set-address').value = s.address || 'Industrial Area, Wah Cantt';
    if (document.getElementById('set-phone')) document.getElementById('set-phone').value = s.phone || '0309-5369472';
    this.originalLogo = s.logo_path || '';
    this.updateLogoPreview(this.originalLogo);

    // Populate Barcode Sticker Printer settings
    await this.refreshPrinters();
    const savedSize = window.storage ? window.storage.get('label_sticker_size') || '38x28' : '38x28';
    const savedMode = window.storage ? window.storage.get('label_print_mode') || 'silent' : 'silent';
    const savedStore = window.storage ? window.storage.get('label_store_name') : null;
    const sizeSelect = document.getElementById('set-label-size');
    const modeSelect = document.getElementById('set-print-mode');
    const storeInput = document.getElementById('set-sticker-store-name');

    if (sizeSelect) sizeSelect.value = savedSize;
    if (modeSelect) modeSelect.value = savedMode;
    if (storeInput) storeInput.value = savedStore !== null ? savedStore : (s.company_name || 'ISHAQ JADOON TRADERS');


    const stockPassword = window.storage.get('stock_password') || '';
    const passInput = document.getElementById('set-stock-password');
    const confirmInput = document.getElementById('set-stock-password-confirm');
    
    if (passInput && confirmInput) {
        passInput.value = stockPassword;
        confirmInput.value = stockPassword;
        
        const hasPassword = !!stockPassword;
        passInput.disabled = hasPassword;
        confirmInput.disabled = hasPassword;
        
        // Visual feedback
        [passInput, confirmInput].forEach(el => {
            el.classList.toggle('opacity-50', hasPassword);
            el.classList.toggle('bg-slate-50', hasPassword);
            el.classList.toggle('cursor-not-allowed', hasPassword);
        });

        // Toggle buttons state
        const toggleBtns = document.querySelectorAll('.password-visibility-toggle');
        toggleBtns.forEach(btn => {
            if (hasPassword) {
                btn.classList.add('pointer-events-none', 'opacity-30');
            } else {
                btn.classList.remove('pointer-events-none', 'opacity-30');
            }
        });
    }
    
    const removeBtn = document.getElementById('btn-remove-stock-pass');
    if (removeBtn) {
        if (stockPassword) removeBtn.classList.remove('hidden');
        else removeBtn.classList.add('hidden');
    }

    this.renderTabDropdown();

    if (window.api && window.api.getBackupDirectory) {
      try {
        const backupDir = await window.api.getBackupDirectory();
        const dirDisplay = document.getElementById('auto-backup-dir-display');
        if (dirDisplay) {
          dirDisplay.textContent = backupDir || 'Not configured';
          dirDisplay.title = backupDir || '';
        }
      } catch (e) {
        console.error('Error loading backup directory:', e);
      }
    }
  },

  async removeStockPassword() {
    const currentPass = window.storage.get('stock_password');
    if (!currentPass) return;

    app.showPrompt({
      title: 'Remove Password',
      message: 'Please enter your current password to disable tab access protection:',
      type: 'password',
      onConfirm: (input) => {
        if (input === currentPass) {
          window.storage.set('stock_password', '');
          window.storage.set('locked_tabs', []);
          app.isStockUnlocked = false;
          app.unlockedTabs = {};
          app.showAlert({
            title: 'Password Removed',
            message: 'Tab access protection has been disabled.',
            buttonText: 'OK'
          });
          this.reloadSettings();
        } else {
          app.showAlert({
            title: 'Error',
            message: 'Incorrect password. Removal failed.',
            buttonText: 'Try Again'
          });
        }
      }
    });
  },

  updateLogoPreview(path) {
    document.getElementById('set-logo-path').value = path;
    const preview = document.getElementById('settings-logo-preview');
    const ph = document.getElementById('settings-logo-placeholder');
    
    if (path) {
      preview.src = 'file://' + path;
      preview.classList.remove('hidden');
      ph.classList.add('hidden');
    } else {
      preview.src = '';
      preview.classList.add('hidden');
      ph.classList.remove('hidden');
    }
  },

  async selectLogo() {
    const path = await window.api.selectLogoFile();
    if (path) {
      this.updateLogoPreview(path);
    }
  },

  removeLogo() {
    this.updateLogoPreview('');
  },



  async saveSettings(e) {
    if (e) e.preventDefault();
    app.showLoading();
    try {
      const currentSettings = (await window.api.getSettings()) || {};
      const data = {
        company_name: document.getElementById('set-name')?.value || currentSettings.company_name || 'Ishaq Jadoon Traders',
        website: document.getElementById('set-web')?.value || '',
        address: document.getElementById('set-address')?.value || currentSettings.address || 'Near CB Plaza, Barrier 3, Main GT Road, Wah Cantt',
        phone: document.getElementById('set-phone')?.value || currentSettings.phone || '03095369472, 03299934620',
        logo_path: document.getElementById('set-logo-path')?.value || '',
        qr_path: '',
        qr_text: ''
      };
      await window.api.saveSettings(data);
      
      // Save Stock Password
      const passInput = document.getElementById('set-stock-password');
      const confirmInput = document.getElementById('set-stock-password-confirm');
      const stockPass = passInput ? passInput.value : '';
      const stockPassConfirm = confirmInput ? confirmInput.value : '';

      if (stockPass !== stockPassConfirm) {
        app.hideLoading();
        return app.showAlert("Passwords do not match!");
      }

      window.storage.set('stock_password', stockPass);
      app.isStockUnlocked = false; // Require re-entry with new password
      // Ensure locked_tabs is initialized if not already set
      const currentLocked = window.storage.get('locked_tabs');
      if (stockPass && (currentLocked === null || currentLocked === undefined)) {
        window.storage.set('locked_tabs', []);
      }

      // Update app state
      await app.loadSettings();
      await this.reloadSettings();

      app.showAlert({
        title: 'Settings Saved',
        message: 'Your settings and security password have been saved successfully.',
        buttonText: 'OK'
      });

    } catch (err) {
      console.error(err);
      app.showAlert('Error saving settings: ' + err.message);
    } finally {
      app.hideLoading();
    }
  },

  async selectBackupDirectory() {
    if (!window.api || !window.api.selectBackupDirectory) return;
    try {
      const res = await window.api.selectBackupDirectory();
      if (res && res.success && res.path) {
        const dirDisplay = document.getElementById('auto-backup-dir-display');
        if (dirDisplay) {
          dirDisplay.textContent = res.path;
          dirDisplay.title = res.path;
        }
        app.showToast('Auto-backup directory updated successfully', 'success');
      }
    } catch (err) {
      console.error(err);
      app.showAlert('Failed to select directory: ' + err.message);
    }
  },

  async openBackupDirectory() {
    if (!window.api || !window.api.openBackupDirectory) return;
    try {
      await window.api.openBackupDirectory();
    } catch (err) {
      console.error(err);
      app.showAlert('Failed to open directory: ' + err.message);
    }
  },

  async backupData() {
    return this.handleBackup();
  },

  async restoreData() {
    return this.handleRestore();
  },

  async handleBackup() {
    app.showLoading();
    try {
      // 1. Sync all current localStorage items into SQLite
      const allKv = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allKv[key] = localStorage.getItem(key);
        }
      }
      if (window.api && window.api.saveAllKv) {
        await window.api.saveAllKv(allKv);
      }

      // 2. Perform backup
      const res = await window.api.backupData();
      if (res && res.success) {
        app.showAlert({
          title: 'Backup Successful',
          message: `Database backup created successfully at:<br><b class="text-slate-800 break-all text-xs">${res.path}</b>`,
          buttonText: 'Done'
        });
      } else if (res && res.error && res.error !== 'Cancelled') {
        app.showAlert('Backup failed: ' + res.error);
      }
    } catch (err) {
      console.error(err);
      app.showAlert('Failed to create backup: ' + err.message);
    } finally {
      app.hideLoading();
    }
  },

  async handleRestore() {
    app.verifyPassword({
      title: 'Security Verification',
      message: 'Enter security password to authorize restoring database:',
      onVerified: () => {
        app.showConfirm({
          title: 'Restore Database',
          message: 'Restoring a database will replace all current data with the selected backup file. The app will restart automatically upon completion. Are you sure you want to proceed?',
          confirmText: 'Select Backup File',
          confirmColor: 'orange',
          onConfirm: async () => {
            app.showLoading();
            try {
              // Clear local and session storage so restored DB rehydrates cleanly
              localStorage.clear();
              sessionStorage.clear();
              const res = await window.api.restoreData();
              if (res && !res.success && res.error !== 'Cancelled') {
                app.showAlert('Restore failed: ' + res.error);
              }
            } catch (err) {
              console.error(err);
              app.showAlert('Failed to restore database: ' + err.message);
            } finally {
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  async clearAppData() {
    app.verifyPassword({
      title: 'Security Verification',
      message: 'Enter password to authorize clearing all app data:',
      onVerified: () => {
        app.showConfirm({
          title: 'Clear All App Data',
          message: 'Are you sure you want to delete EVERYTHING? This will permanently delete all stock items, rate lists, sales invoices, companies, customers, expenses, and transaction logs. The app will be reset to a clean slate. This action CANNOT be undone!',
          confirmText: 'Yes, Delete Everything',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            try {
              localStorage.clear();
              sessionStorage.clear();
              const res = await window.api.clearAppData();
              if (res && res.success) {
                app.hideLoading();
                app.showAlert({
                  title: 'All Data Cleared',
                  message: 'All stock items, sales, rate history, companies, customers, expenses, and transactions have been permanently cleared.',
                  buttonText: 'Reset Application',
                  onConfirm: () => {
                    window.location.reload();
                  }
                });
              } else {
                app.showAlert('Clear data failed: ' + (res ? res.error : 'Unknown error'));
              }
            } catch (err) {
              console.error(err);
              app.showAlert('Failed to clear data: ' + err.message);
            } finally {
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  toggleTabDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('locked-tabs-menu');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    
    if (isHidden) {
      menu.classList.remove('hidden');
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.add('hidden');
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    } else {
      menu.classList.add('hidden');
    }
  },

  renderTabDropdown() {
    const lockedTabs = window.storage.get('locked_tabs') || [];
    const menu = document.getElementById('locked-tabs-menu');
    const btnText = document.getElementById('locked-tabs-text');
    if (!menu || !btnText) return;

    if (lockedTabs.length === 0) {
      btnText.textContent = "No Tabs Locked";
    } else {
      const names = LOCKABLE_TABS.filter(t => lockedTabs.includes(t.key)).map(t => t.name);
      btnText.textContent = names.join(', ');
    }

    menu.innerHTML = LOCKABLE_TABS.map(tab => {
      const isLocked = lockedTabs.includes(tab.key);
      return `
        <div onclick="Settings.toggleTabLock('${tab.key}', event)" class="px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer select-none">
          <span class="text-xs font-bold text-slate-700">${tab.name}</span>
          <div class="w-4 h-4 border border-slate-300 rounded flex items-center justify-center transition-colors ${isLocked ? 'bg-accent border-accent text-slate-900' : 'bg-white'}">
            ${isLocked ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  async toggleTabLock(key, event) {
    if (event) event.stopPropagation();

    const password = window.storage.get('stock_password') || '';
    if (!password) {
      return app.showAlert({
        title: 'Security Required',
        message: 'Please set and save a Security Password first to lock/unlock tabs.',
        buttonText: 'OK'
      });
    }

    app.showPrompt({
      title: 'Password Required',
      message: `Enter password to lock/unlock this tab:`,
      type: 'password',
      onConfirm: (input) => {
        if (input === password) {
          let lockedTabs = window.storage.get('locked_tabs') || [];
          if (lockedTabs.includes(key)) {
            lockedTabs = lockedTabs.filter(t => t !== key);
          } else {
            lockedTabs.push(key);
          }
          window.storage.set('locked_tabs', lockedTabs);
          
          if (app.unlockedTabs) {
            delete app.unlockedTabs[key];
          }

          app.showAlert({
            title: 'Success',
            message: 'Tab security updated successfully.',
            buttonText: 'OK'
          });
          this.renderTabDropdown();
        } else {
          app.showAlert({
            title: 'Error',
            message: 'Incorrect password. Tab security unchanged.',
            buttonText: 'Try Again'
          });
        }
      }
    });
  }
};
