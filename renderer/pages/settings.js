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
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-400 uppercase">Factory / Company Name *</label>
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      <i data-lucide="lock" class="w-3 h-3 text-slate-400"></i> Locked
                    </span>
                  </div>
                  <input type="text" id="set-name" disabled readonly class="w-full bg-slate-100/90 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-600 cursor-not-allowed select-none outline-none">
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Contact Phone Numbers</label>
                    <input type="text" id="set-phone" class="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-accent outline-none" placeholder="0300-1234567">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Website / Tagline</label>
                    <input type="text" id="set-web" class="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-accent outline-none" placeholder="Delicious Superstar Foods">
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Factory Address</label>
                  <textarea id="set-address" rows="2" class="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-accent outline-none" placeholder="Hasan Abdal"></textarea>
                </div>
              </div>
            </form>
          </div>

          <!-- Tab Access Security -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
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

          <!-- 2nd Password: Action / Edit & Delete Security -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 class="font-bold text-lg text-slate-700">2nd Password (Edit &amp; Delete Security)</h3>
                <p class="text-xs text-slate-500">Protect edit and delete actions across all stages and modules.</p>
              </div>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Action Protection
              </span>
            </div>
            <div class="p-4 space-y-4">
              <div class="flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                    <i data-lucide="key" class="w-5 h-5"></i>
                 </div>
                 <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-sm">Action Security Password</h4>
                    <p class="text-xs text-slate-500 mb-3">Require a dedicated 2nd password before editing or deleting records (raw materials, production items/batches, carton packing, vehicles, shops, invoices, expenses). Leave blank to disable protection.</p>
                    
                     <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                       <div>
                         <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">New 2nd Password</label>
                         <div class="relative">
                           <input type="password" id="set-action-password" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-2 pr-9 text-sm focus:ring-1 focus:ring-accent outline-none">
                           <button type="button" onclick="Settings.togglePasswordVisibility('set-action-password', this)" class="password-visibility-toggle absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                             <i data-lucide="eye" class="w-4 h-4"></i>
                           </button>
                         </div>
                       </div>
                       <div>
                         <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirm 2nd Password</label>
                         <div class="relative">
                           <input type="password" id="set-action-password-confirm" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-2 pr-9 text-sm focus:ring-1 focus:ring-accent outline-none">
                           <button type="button" onclick="Settings.togglePasswordVisibility('set-action-password-confirm', this)" class="password-visibility-toggle absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                             <i data-lucide="eye" class="w-4 h-4"></i>
                           </button>
                         </div>
                       </div>
                     </div>
                     <button type="button" id="btn-remove-action-pass" onclick="Settings.removeActionPassword()" class="hidden text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors mb-1">
                        <i data-lucide="unlock" class="w-3 h-3"></i> Remove Current 2nd Password
                     </button>
                 </div>
              </div>
            </div>
          </div>

          <!-- Screen Scale & Display Size -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="laptop" class="w-5 h-5 text-blue-600"></i>
                <div>
                  <h3 class="font-bold text-base text-slate-800">Screen Scale & Display Size</h3>
                  <p class="text-[11px] text-slate-400">Scale the app UI to comfortably fit laptop or desktop screens</p>
                </div>
              </div>
              <span id="settings-zoom-display" class="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-black text-xs rounded-lg border border-blue-200">
                82%
              </span>
            </div>
            <div class="p-4 space-y-4">
              <p class="text-xs text-slate-600 leading-relaxed">
                Reduces the overall interface size by <b>15% to 20%</b> so that factory tables, production stages, and delivery loading fit without vertical scrolling on smaller laptop displays.
              </p>

              <!-- Quick Presets -->
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Display Scale Presets</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button type="button" onclick="app.setZoom(0.80)" data-zoom="0.80" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer">
                    80% <span class="block text-[9.5px] font-normal opacity-80">(Compact Laptop)</span>
                  </button>
                  <button type="button" onclick="app.setZoom(0.82)" data-zoom="0.82" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer">
                    82% <span class="block text-[9.5px] font-normal opacity-80">(Laptop Ideal)</span>
                  </button>
                  <button type="button" onclick="app.setZoom(0.85)" data-zoom="0.85" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer">
                    85% <span class="block text-[9.5px] font-normal opacity-80">(15% Smaller)</span>
                  </button>
                  <button type="button" onclick="app.setZoom(0.90)" data-zoom="0.90" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer">
                    90% <span class="block text-[9.5px] font-normal opacity-80">(Medium)</span>
                  </button>
                  <button type="button" onclick="app.setZoom(1.00)" data-zoom="1.00" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer sm:col-span-2">
                    100% <span class="block text-[9.5px] font-normal opacity-80">(Full Size Desktop Monitor)</span>
                  </button>
                </div>
              </div>

              <!-- Fine Tuning Stepper -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                <span class="text-xs text-slate-500 font-medium">Fine adjust (- / +):</span>
                <div class="flex items-center gap-1.5">
                  <button type="button" onclick="app.adjustZoom(-0.05)" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg text-sm cursor-pointer transition-colors">-</button>
                  <button type="button" onclick="app.adjustZoom(0.05)" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg text-sm cursor-pointer transition-colors">+</button>
                </div>
              </div>

              <!-- Safe Receipts Notice -->
              <div class="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs">
                <i data-lucide="printer" class="w-4 h-4 shrink-0 text-emerald-600"></i>
                <span><b>Receipts & Invoices Protected:</b> Thermal receipts and PDF exports always print at 100% normal physical size.</span>
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
                    <h4 class="font-bold text-slate-800 text-sm">Backup Factory Data Locally</h4>
                    <p class="text-xs text-slate-500 mb-3">Create a complete backup file of all raw materials, production batches, packed carton stocks, delivery vehicles, shop sales, customer khata, and expenses.</p>
                    <button onclick="Settings.backupData()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm cursor-pointer active:scale-95">
                      <i data-lucide="download" class="w-3.5 h-3.5"></i> Backup App Data
                    </button>
                 </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Restore from Backup</h4>
                    <p class="text-xs text-slate-500 mb-3">Restore your entire factory database from a previous backup file. <span class="text-rose-600 font-bold">This replaces all current data and restarts the application automatically.</span></p>
                    <button onclick="Settings.restoreData()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm cursor-pointer active:scale-95">
                      <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-amber-600"></i> Restore Data
                    </button>
                 </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Clear All App Data</h4>
                    <p class="text-xs text-slate-500 mb-3">Permanently wipe all data across all 5 stages (raw materials, production runs, carton stocks, cars, shop sales, customer khata) and reset the app to a completely clean slate. <span class="text-rose-600 font-bold underline">This action cannot be undone.</span></p>
                    <button onclick="Settings.clearAppData()" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm cursor-pointer active:scale-95">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Clear All Data
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
    if (document.getElementById('set-name')) document.getElementById('set-name').value = s.company_name || 'Delicious Superstar Foods';
    if (document.getElementById('set-web')) document.getElementById('set-web').value = s.website || '';
    if (document.getElementById('set-address')) document.getElementById('set-address').value = s.address || 'Hasan Abdal';
    if (document.getElementById('set-phone')) document.getElementById('set-phone').value = app.formatPhone ? app.formatPhone(s.phone || '0315-6795995') : (s.phone || '0315-6795995');
    this.originalLogo = s.logo_path || '';
    this.updateLogoPreview(this.originalLogo);

    // Populate Barcode Sticker Printer settings
    await this.refreshPrinters();
    if (window.app && app.updateZoomUI) app.updateZoomUI(app.currentZoom || 0.82);
    const savedSize = window.storage ? window.storage.get('label_sticker_size') || '38x28' : '38x28';
    const savedMode = window.storage ? window.storage.get('label_print_mode') || 'silent' : 'silent';
    const savedStore = window.storage ? window.storage.get('label_store_name') : null;
    const sizeSelect = document.getElementById('set-label-size');
    const modeSelect = document.getElementById('set-print-mode');
    const storeInput = document.getElementById('set-sticker-store-name');

    if (sizeSelect) sizeSelect.value = savedSize;
    if (modeSelect) modeSelect.value = savedMode;
    if (storeInput) storeInput.value = savedStore !== null ? savedStore : (s.company_name || 'DELICIOUS SUPERSTAR FOODS');


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

    const actionPassword = window.storage.get('action_password') || '';
    const actionPassInput = document.getElementById('set-action-password');
    const actionConfirmInput = document.getElementById('set-action-password-confirm');
    
    if (actionPassInput && actionConfirmInput) {
        actionPassInput.value = actionPassword;
        actionConfirmInput.value = actionPassword;
        
        const hasActionPassword = !!actionPassword;
        actionPassInput.disabled = hasActionPassword;
        actionConfirmInput.disabled = hasActionPassword;
        
        // Visual feedback
        [actionPassInput, actionConfirmInput].forEach(el => {
            el.classList.toggle('opacity-50', hasActionPassword);
            el.classList.toggle('bg-slate-50', hasActionPassword);
            el.classList.toggle('cursor-not-allowed', hasActionPassword);
            const toggleBtn = el.parentElement?.querySelector('.password-visibility-toggle');
            if (toggleBtn) {
              if (hasActionPassword) toggleBtn.classList.add('pointer-events-none', 'opacity-30');
              else toggleBtn.classList.remove('pointer-events-none', 'opacity-30');
            }
        });
    }

    const removeActionBtn = document.getElementById('btn-remove-action-pass');
    if (removeActionBtn) {
        if (actionPassword) removeActionBtn.classList.remove('hidden');
        else removeActionBtn.classList.add('hidden');
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

  async removeActionPassword() {
    const currentPass = window.storage.get('action_password');
    if (!currentPass) return;

    app.showPrompt({
      title: 'Remove 2nd Password',
      message: 'Please enter your current 2nd password to disable edit/delete protection:',
      type: 'password',
      onConfirm: (input) => {
        const trimmed = (input || '').trim();
        if (trimmed === currentPass || (app.verifySuperadminPassword && app.verifySuperadminPassword(trimmed))) {
          window.storage.set('action_password', '');
          app.showAlert({
            title: 'Password Removed',
            message: 'Edit and delete protection (2nd password) has been disabled.',
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
        company_name: document.getElementById('set-name')?.value || currentSettings.company_name || 'Delicious Superstar Foods',
        website: document.getElementById('set-web')?.value || '',
        address: document.getElementById('set-address')?.value || currentSettings.address || 'Hasan Abdal',
        phone: document.getElementById('set-phone')?.value || currentSettings.phone || '0315-6795995',
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

      // Save Action Password (2nd Password: Edit & Delete)
      const actionPassInput = document.getElementById('set-action-password');
      const actionConfirmInput = document.getElementById('set-action-password-confirm');
      const actionPass = actionPassInput ? actionPassInput.value : '';
      const actionPassConfirm = actionConfirmInput ? actionConfirmInput.value : '';

      if (actionPass !== actionPassConfirm) {
        app.hideLoading();
        return app.showAlert("2nd Password (Edit & Delete) does not match the confirmation!");
      }

      window.storage.set('stock_password', stockPass);
      window.storage.set('action_password', actionPass);
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
    app.authorizeAction(() => {
      app.showConfirm({
        title: 'Restore Factory Database',
        message: 'Restoring a database will replace all current factory data, stocks, delivery records, and accounts with the selected backup file.<br><br><b>The application will automatically restart once the restore completes.</b><br><br>Are you sure you want to proceed?',
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
    }, 'restoring database from backup');
  },

  async clearAppData() {
    app.authorizeAction(() => {
      app.showConfirm({
        title: 'Clear All Factory & App Data',
        message: 'Are you sure you want to delete EVERYTHING?<br><br>This will permanently wipe all:<br>• <b>Stage 1:</b> Raw materials stock & purchases<br>• <b>Stage 2:</b> Single pieces production & batches<br>• <b>Stage 3:</b> Packed cartons warehouse stock<br>• <b>Stage 4:</b> Delivery vehicles & loaded stock<br>• <b>Stage 5:</b> Shop sales, delivery invoices & returns<br>• <b>Ledgers:</b> Customer & supplier khata balances, expenses & logs<br><br><span class="text-rose-600 font-black">The application will be reset to a completely clean slate. This action CANNOT be undone!</span>',
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
                title: 'All Factory Data Cleared',
                message: 'All factory raw materials, production batches, carton stock, vehicles, shop deliveries, and khata ledger records have been completely cleared.<br><br>The system is now reset to a clean slate.',
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
    }, 'clearing all application data');
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
