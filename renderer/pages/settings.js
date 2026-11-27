const LOCKABLE_TABS = [
  { key: 'dashboard', name: 'Dashboard' },
  { key: 'raw-materials', name: '1. Raw Materials' },
  { key: 'production', name: '2. Production (Pcs)' },
  { key: 'carton-packing', name: '3. Carton Packing' },
  { key: 'car-loading', name: '4. Cars & Loading' },
  { key: 'shop-sales', name: '5. New Sale' },
  { key: 'proposals', name: 'Sales History' },
  { key: 'purchases', name: 'Purchases' },
  { key: 'suppliers', name: 'Suppliers / Khata' },
  { key: 'customers', name: 'Salesmen / Khata' },
  { key: 'reports', name: 'Factory Reports' },
  { key: 'expenses', name: 'Expenses' },
  { key: 'employees', name: 'Employees' },
  { key: 'settings', name: 'Settings' }
];

const Settings = {
  originalLogo: '',

  async render(container) {
    const curZoom = (window.app && typeof app.currentZoom === 'number') ? app.currentZoom : 1.0;
    const curPct = Math.round(curZoom * 100);
    const getBtnClass = (presetPct) => (curPct === presetPct)
      ? 'zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer bg-blue-600 text-white border-blue-600 shadow-sm'
      : 'zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-slate-50';

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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start pb-6">
          <!-- Left Column: Company Profile, Display Scale & LAN Multi-Terminal -->
          <div class="space-y-4">
            <!-- Company Profile -->
            <div class="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 class="font-bold text-base text-slate-700">Company Profile</h3>
              </div>
              
              <form id="settings-form" class="p-4 space-y-3" onsubmit="Settings.saveSettings(event)">
                <!-- Logo Section -->
                <div class="flex items-start gap-4 pb-2 border-b border-slate-100">
                  <div class="shrink-0">
                    <div class="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                      <img id="settings-logo-preview" src="" class="w-full h-full object-cover object-center hidden rounded-lg">
                      <div id="settings-logo-placeholder" class="text-slate-400 flex flex-col items-center">
                        <i data-lucide="image" class="w-6 h-6 mb-1"></i>
                        <span class="text-[9px] font-medium">No Logo</span>
                      </div>
                      <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer" onclick="Settings.selectLogo()">
                        <span class="text-white text-[9px] font-bold"><i data-lucide="upload" class="w-3.5 h-3.5 mb-0.5 mx-auto"></i> Change</span>
                      </div>
                    </div>
                    <input type="hidden" id="set-logo-path">
                  </div>
                  <div class="flex-1 pt-1">
                    <h4 class="font-bold text-xs text-slate-700 mb-1.5">Company Logo</h4>
                    <div class="flex gap-2">
                      <button type="button" onclick="Settings.selectLogo()" class="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Choose</button>
                      <button type="button" onclick="Settings.removeLogo()" class="px-2.5 py-1 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg cursor-pointer">Remove</button>
                    </div>
                  </div>
                </div>

                <!-- Fields -->
                <div class="grid grid-cols-1 gap-3">
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label class="block text-[10px] font-black text-slate-600 uppercase">Factory / Company Name *</label>
                      <span class="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        <i data-lucide="lock" class="w-2.5 h-2.5 text-slate-500"></i> Locked
                      </span>
                    </div>
                    <input type="text" id="set-name" disabled readonly class="w-full bg-slate-100/90 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-600 cursor-not-allowed select-none outline-none">
                  </div>
                </div>
              </form>
            </div>

            <!-- Screen Scale & Display Size -->
            <div class="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i data-lucide="laptop" class="w-4 h-4 text-blue-600"></i>
                  <div>
                    <h3 class="font-bold text-sm text-slate-800">Screen Scale &amp; Display Size</h3>
                  </div>
                </div>
                <span id="settings-zoom-display" class="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-black text-xs rounded border border-blue-200">
                  ${curPct}%
                </span>
              </div>
              <div class="p-3.5 space-y-3">
                <p class="text-xs text-slate-500">
                  Adjust UI scale to fit laptop or desktop screens without vertical scrolling.
                </p>

                <!-- Quick Presets -->
                <div>
                  <div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    <button type="button" onclick="app.setZoom(0.80)" data-zoom="0.80" class="${getBtnClass(80)}">
                      80%
                    </button>
                    <button type="button" onclick="app.setZoom(0.82)" data-zoom="0.82" class="${getBtnClass(82)}">
                      82%
                    </button>
                    <button type="button" onclick="app.setZoom(0.85)" data-zoom="0.85" class="${getBtnClass(85)}">
                      85%
                    </button>
                    <button type="button" onclick="app.setZoom(0.90)" data-zoom="0.90" class="${getBtnClass(90)}">
                      90%
                    </button>
                    <button type="button" onclick="app.setZoom(1.00)" data-zoom="1.00" class="${getBtnClass(100)}">
                      100%
                    </button>
                  </div>
                </div>

                <!-- Fine Tuning Stepper -->
                <div class="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span class="text-xs text-slate-500 font-medium">Fine adjust (- / +):</span>
                  <div class="flex items-center gap-1.5">
                    <button type="button" onclick="app.adjustZoom(-0.05)" class="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded text-xs cursor-pointer">-</button>
                    <button type="button" onclick="app.adjustZoom(0.05)" class="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded text-xs cursor-pointer">+</button>
                  </div>
                </div>

                <!-- Safe Receipts Notice -->
                <div class="p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-[11px]">
                  <i data-lucide="printer" class="w-3.5 h-3.5 shrink-0 text-emerald-600"></i>
                  <span><b>Protected:</b> Receipts and invoices always print at 100% normal physical size.</span>
                </div>
              </div>
            </div>

            <!-- Local LAN Multi-Terminal Configuration Card (3 PCs Sync) -->
            <div class="bg-white rounded-xl shadow-xs border border-emerald-200/80 overflow-hidden">
              <div class="px-4 py-2.5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                    <i data-lucide="network" class="w-3.5 h-3.5"></i>
                  </div>
                  <div>
                    <h3 class="font-bold text-sm text-slate-800">Local LAN Sync (3 PCs)</h3>
                  </div>
                </div>
                <span id="set-lan-role-badge" class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PC 1: Main Server
                </span>
              </div>

              <div class="p-3.5 space-y-3">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <i data-lucide="wifi" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between flex-wrap gap-1 mb-1">
                      <h4 class="font-bold text-slate-800 text-xs" id="set-lan-title">Main PC Address</h4>
                      <span id="set-lan-ip-display" class="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">Loading...</span>
                    </div>
                    <p class="text-xs text-slate-500 mb-2.5" id="set-lan-desc">
                      Packing (PC 2) and Sales (PC 3) connect to this address over factory Wi-Fi for live sync.
                    </p>

                    <div class="flex items-center gap-2 flex-wrap">
                      <button type="button" onclick="Settings.copyLanIp()" id="btn-copy-lan-ip" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95">
                        <i data-lucide="copy" class="w-3 h-3"></i>
                        <span id="btn-copy-lan-text">Copy Address</span>
                      </button>
                      <button type="button" onclick="app.promptRoleLogout()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95">
                        <i data-lucide="log-out" class="w-3 h-3 text-slate-600"></i>
                        <span>Switch Role / Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cloud Hosting & Server Status Card -->
            <div class="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <i data-lucide="cloud" class="w-3.5 h-3.5"></i>
                  </div>
                  <div>
                    <h3 class="font-bold text-sm text-slate-800">Cloud Hosting &amp; Server Status</h3>
                  </div>
                </div>
                <span class="text-[10px] font-bold text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Production Server
                </span>
              </div>

              <div class="p-4 space-y-3">
                <!-- Status Row -->
                <div class="text-xs font-bold text-slate-700 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-slate-600 font-bold">Hosting Status:</span>
                    <span id="license-status-badge" class="font-extrabold text-emerald-600 flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                    </span>
                    <span id="license-remaining-countdown" class="text-slate-500 font-mono text-[11px] font-bold ml-1">
                      Calculating remaining hosting time...
                    </span>
                  </div>

                  <button type="button" onclick="Settings.promptUpdateHosting()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0">
                    <i data-lucide="cloud-cog" class="w-4 h-4"></i>
                    <span>Update Hosting</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Passwords, Online Cloud Backup & Local Backup -->
          <div class="space-y-4">
            <!-- Tab Access Security -->
            <div class="bg-white rounded-xl shadow-xs border border-slate-200/80 relative z-30 overflow-hidden">
              <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <h3 class="font-bold text-sm text-slate-700">Tab Access Security</h3>
              </div>
              <div class="p-3.5 space-y-3">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <i data-lucide="lock" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-xs">Security Password</h4>
                    <p class="text-xs text-slate-500 mb-2">Set password to restrict access to selected tabs.</p>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <div>
                        <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">New Password</label>
                        <div class="relative">
                          <input type="password" id="set-stock-password" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-1.5 pr-8 text-xs focus:ring-1 focus:ring-accent outline-none">
                          <button type="button" onclick="Settings.togglePasswordVisibility('set-stock-password', this)" class="password-visibility-toggle absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-0.5">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">Confirm Password</label>
                        <div class="relative">
                          <input type="password" id="set-stock-password-confirm" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-1.5 pr-8 text-xs focus:ring-1 focus:ring-accent outline-none">
                          <button type="button" onclick="Settings.togglePasswordVisibility('set-stock-password-confirm', this)" class="password-visibility-toggle absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-0.5">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <button type="button" id="btn-remove-stock-pass" onclick="Settings.removeStockPassword()" class="hidden text-[9px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1 mb-2">
                      <i data-lucide="unlock" class="w-2.5 h-2.5"></i> Remove Password
                    </button>

                    <!-- Dropdown of Lockable Tabs with Checkmarks -->
                    <div class="pt-2 border-t border-slate-100">
                      <label class="block text-[9px] font-black text-slate-600 uppercase mb-1">Locked Tabs</label>
                      <div class="relative">
                        <button type="button" onclick="Settings.toggleTabDropdown(event)" id="locked-tabs-btn" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-white transition-all flex items-center justify-between cursor-pointer">
                          <span id="locked-tabs-text">No Tabs Locked</span>
                          <i data-lucide="chevron-down" id="locked-tabs-chevron" class="w-3.5 h-3.5 text-slate-500"></i>
                        </button>
                        <div id="locked-tabs-menu" class="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 hidden max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-50"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2nd Password: Action / Edit & Delete Security -->
            <div class="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-sm text-slate-700">2nd Password (Edit &amp; Delete)</h3>
                </div>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <i data-lucide="shield-check" class="w-3 h-3"></i> Action Security
                </span>
              </div>
              <div class="p-3.5 space-y-3">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                    <i data-lucide="key" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-xs">Action Security Password</h4>
                    <p class="text-xs text-slate-500 mb-2">Requires password before editing or deleting records. Leave blank to disable.</p>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <div>
                        <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">New 2nd Password</label>
                        <div class="relative">
                          <input type="password" id="set-action-password" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-1.5 pr-8 text-xs focus:ring-1 focus:ring-accent outline-none">
                          <button type="button" onclick="Settings.togglePasswordVisibility('set-action-password', this)" class="password-visibility-toggle absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-0.5">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">Confirm 2nd Password</label>
                        <div class="relative">
                          <input type="password" id="set-action-password-confirm" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-1.5 pr-8 text-xs focus:ring-1 focus:ring-accent outline-none">
                          <button type="button" onclick="Settings.togglePasswordVisibility('set-action-password-confirm', this)" class="password-visibility-toggle absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-0.5">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <button type="button" id="btn-remove-action-pass" onclick="Settings.removeActionPassword()" class="hidden text-[9px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1 mb-1">
                      <i data-lucide="unlock" class="w-2.5 h-2.5"></i> Remove 2nd Password
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Online Cloud Backup & Multi-Device Restore Card (Supabase) -->
            <div class="bg-white rounded-xl shadow-xs border border-indigo-100 overflow-hidden">
              <div class="px-4 py-2.5 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/80 to-white flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                    <i data-lucide="cloud" class="w-3.5 h-3.5"></i>
                  </div>
                  <div>
                    <h3 class="font-bold text-sm text-slate-800">Online Cloud Backup (Supabase)</h3>
                  </div>
                </div>
                <span id="cloud-sync-status-badge" class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Checking...
                </span>
              </div>

              <div class="p-3.5 space-y-3">
                <!-- Sync / Restore Action Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <!-- Backup / Upload to Cloud -->
                  <div class="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-2">
                    <div>
                      <div class="flex items-center gap-1.5 mb-1">
                        <i data-lucide="cloud-upload" class="w-3.5 h-3.5 text-indigo-600"></i>
                        <h4 class="font-bold text-slate-800 text-xs">Upload to Cloud</h4>
                      </div>
                      <p class="text-[10.5px] text-slate-500">
                        Upload factory database to Supabase cloud.
                      </p>
                    </div>
                    <div class="pt-1">
                      <button type="button" id="btn-cloud-upload" onclick="Settings.executeCloudUpload()" class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                        <i data-lucide="cloud-upload" class="w-3.5 h-3.5"></i>
                        <span>Sync to Cloud Now</span>
                      </button>
                      <span id="cloud-last-upload-label" class="text-[9.5px] text-slate-400 text-center block mt-1">Never synced</span>
                    </div>
                  </div>

                  <!-- Restore from Cloud -->
                  <div class="p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex flex-col justify-between space-y-2">
                    <div>
                      <div class="flex items-center gap-1.5 mb-1">
                        <i data-lucide="cloud-download" class="w-3.5 h-3.5 text-emerald-600"></i>
                        <h4 class="font-bold text-slate-800 text-xs">Restore from Cloud</h4>
                      </div>
                      <p class="text-[10.5px] text-slate-500">
                        Download latest backup onto this device.
                      </p>
                    </div>
                    <div class="pt-1">
                      <button type="button" id="btn-cloud-restore" onclick="Settings.executeCloudRestore()" class="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                        <i data-lucide="cloud-download" class="w-3.5 h-3.5"></i>
                        <span>Restore from Cloud</span>
                      </button>
                      <span id="cloud-last-backup-found" class="text-[9.5px] text-slate-500 text-center block mt-1">Checking...</span>
                    </div>
                  </div>
                </div>

                <!-- Options -->
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                    <input type="checkbox" id="chk-auto-cloud-sync" onchange="Settings.toggleAutoCloudSync(this.checked)" class="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
                    <span>Auto-sync to cloud when closing app</span>
                  </label>
                  <button type="button" onclick="Settings.refreshCloudStatus()" class="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 cursor-pointer">
                    <i data-lucide="refresh-cw" class="w-3 h-3"></i> Refresh
                  </button>
                </div>
              </div>
            </div>

            <!-- Backup & Data -->
            <div class="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 class="font-bold text-sm text-slate-700">Backup &amp; Data</h3>
                <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Auto Backup Active
                </span>
              </div>
              <div class="p-3.5 space-y-3">
                <!-- Automatic Backup on Exit (Directory Selection) -->
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <i data-lucide="shield-check" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 text-xs">Automatic Backup on Exit</h4>
                    <p class="text-xs text-slate-500 mb-2">Saved here automatically whenever closing the app.</p>
                    
                    <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div class="flex-1 min-w-[160px] flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-700 truncate">
                        <i data-lucide="folder" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                        <span id="auto-backup-dir-display" class="truncate" title="Backup folder">Loading...</span>
                      </div>
                      <button type="button" onclick="Settings.selectBackupDirectory()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer">
                        <i data-lucide="folder-open" class="w-3 h-3"></i> Select
                      </button>
                      <button type="button" onclick="Settings.openBackupDirectory()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer" title="Open folder">
                        <i data-lucide="external-link" class="w-3 h-3"></i> Open
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Manual Backup -->
                <div class="pt-2.5 border-t border-slate-100 flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <i data-lucide="download" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-xs">Local Database Backup</h4>
                    <p class="text-xs text-slate-500 mb-2">Save a complete local backup file of all factory data.</p>
                    <button onclick="Settings.backupData()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95">
                      <i data-lucide="download" class="w-3 h-3"></i> Backup App Data
                    </button>
                  </div>
                </div>

                <!-- Restore from Backup -->
                <div class="pt-2 border-t border-slate-100 flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-xs">Restore from Backup</h4>
                    <p class="text-xs text-slate-500 mb-2">Restore factory database from a previous backup file.</p>
                    <button onclick="Settings.restoreData()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95">
                      <i data-lucide="rotate-ccw" class="w-3 h-3 text-amber-600"></i> Restore Data
                    </button>
                  </div>
                </div>

                <!-- Clear Data -->
                <div class="pt-2 border-t border-slate-100 flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-xs">Clear All App Data</h4>
                    <p class="text-xs text-slate-500 mb-2">Permanently wipe operational data and reset app. <span class="text-rose-600 font-bold">Cannot be undone.</span></p>
                    <button onclick="Settings.clearAppData()" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Clear All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Immediately synchronize zoom UI so buttons and badge match active zoom without waiting
    if (window.app && typeof app.updateZoomUI === 'function') {
      try { app.updateZoomUI(app.currentZoom || 1.0); } catch (e) {}
    }

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
    if (window.app && app.updateZoomUI) {
      try { app.updateZoomUI(app.currentZoom || 1.0); } catch (e) {}
    }

    const s = await window.api.getSettings();
    if (document.getElementById('set-name')) document.getElementById('set-name').value = s.company_name || 'Delicious Superstar Foods';
    if (document.getElementById('set-web')) document.getElementById('set-web').value = s.website || '';
    if (document.getElementById('set-address')) document.getElementById('set-address').value = s.address || 'Hasan Abdal';
    if (document.getElementById('set-phone')) document.getElementById('set-phone').value = app.formatPhone ? app.formatPhone(s.phone || '0315-6795995') : (s.phone || '0315-6795995');
    this.originalLogo = s.logo_path || '';
    this.updateLogoPreview(this.originalLogo);

    // Populate Barcode Sticker Printer settings
    try {
      await this.refreshPrinters();
    } catch (e) {
      console.warn('Printer refresh error in reloadSettings:', e);
    }
    if (window.app && app.updateZoomUI) {
      try { app.updateZoomUI(app.currentZoom || 1.0); } catch (e) {}
    }
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

    try {
      await this.refreshCloudStatus();
    } catch (e) {
      console.warn('Error refreshing cloud status in reloadSettings:', e);
    }

    try {
      await this.reloadLanStatus();
    } catch (e) {
      console.warn('Error reloading LAN status in reloadSettings:', e);
    }

    try {
      await this.updateLicenseDisplay();
    } catch (e) {
      console.warn('Error updating license display in reloadSettings:', e);
    }
  },

  async reloadLanStatus() {
    try {
      const cfg = (window.api && window.api.lanGetConfig) ? await window.api.lanGetConfig() : { role: 'main' };
      const role = cfg.role || 'main';
      const localIp = cfg.localIp || '127.0.0.1';
      const host = cfg.serverHost || '';

      const badge = document.getElementById('set-lan-role-badge');
      const ipDisplay = document.getElementById('set-lan-ip-display');
      const title = document.getElementById('set-lan-title');
      const desc = document.getElementById('set-lan-desc');

      if (role === 'packing') {
        if (badge) {
          badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1.5 shadow-2xs';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span> PC 2: Packing Station';
        }
        if (title) title.textContent = 'Connected Main Server Address';
        if (ipDisplay) ipDisplay.textContent = host || 'Not Configured';
        if (desc) desc.textContent = 'This terminal is restricted to Carton Packing and the Daily Barcode Scan Counter. Scans are saved directly to PC 1.';
      } else if (role === 'sales') {
        if (badge) {
          badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5 shadow-2xs';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> PC 3: Sales Counter';
        }
        if (title) title.textContent = 'Connected Main Server Address';
        if (ipDisplay) ipDisplay.textContent = host || 'Not Configured';
        if (desc) desc.textContent = 'This terminal is restricted to POS New Sale billing. Products, prices, and stock are synced live from PC 1.';
      } else {
        if (badge) {
          badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-2xs';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PC 1: Main Server';
        }
        if (title) title.textContent = 'Main PC Connection Address';
        if (ipDisplay) ipDisplay.textContent = `${localIp}:4321`;
        if (desc) desc.textContent = 'Packing Station (PC 2) and Sales Counter (PC 3) connect to this address over factory Wi-Fi. Real-time updates sync instantly.';
      }
    } catch (e) {
      console.warn('Error loading LAN status in settings:', e);
    }
  },

  copyLanIp() {
    const ipDisplay = document.getElementById('set-lan-ip-display');
    const text = ipDisplay ? ipDisplay.textContent.trim() : '';
    if (!text || text.includes('Loading')) return;

    navigator.clipboard.writeText(text).then(() => {
      const btnText = document.getElementById('btn-copy-lan-text');
      if (btnText) {
        btnText.textContent = 'Copied to Clipboard!';
        setTimeout(() => {
          if (btnText) btnText.textContent = 'Copy Connection Address';
        }, 2000);
      }
    }).catch(err => {
      console.warn('Clipboard write failed:', err);
    });
  },

  licenseTicker: null,
  cachedExpiresAt: null,

  startLiveCountdown() {
    if (this.licenseTicker) {
      clearInterval(this.licenseTicker);
      this.licenseTicker = null;
    }

    const tick = () => {
      const countdownEl = document.getElementById('license-remaining-countdown');
      const statusBadge = document.getElementById('license-status-badge');
      if (!countdownEl || !statusBadge) {
        if (this.licenseTicker) {
          clearInterval(this.licenseTicker);
          this.licenseTicker = null;
        }
        return;
      }

      if (!this.cachedExpiresAt) return;

      const now = Date.now();
      const remainingMs = this.cachedExpiresAt - now;

      if (remainingMs <= 0) {
        statusBadge.className = 'font-extrabold text-red-600 flex items-center gap-1.5';
        statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Expired';
        countdownEl.className = 'text-red-500 font-mono text-[11px] font-bold ml-1';
        countdownEl.textContent = '(Hosting Expired)';
        if (window.app && typeof app.checkLicenseStatus === 'function') {
          app.checkLicenseStatus();
        }
        return;
      }

      const totalSec = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSec / (24 * 3600));
      const hours = Math.floor((totalSec % (24 * 3600)) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      let formatted = '';
      if (days > 0) {
        formatted = `${days}d ${hours}h ${mins}m ${secs}s`;
      } else if (hours > 0) {
        formatted = `${hours}h ${mins}m ${secs}s`;
      } else {
        formatted = `${mins}m ${secs}s`;
      }

      statusBadge.className = 'font-extrabold text-emerald-600 flex items-center gap-1.5';
      statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active';
      countdownEl.className = 'text-slate-600 font-mono text-[11.5px] font-bold ml-1 tabular-nums';
      countdownEl.textContent = `(${formatted} remaining)`;
    };

    tick();
    this.licenseTicker = setInterval(tick, 1000);
  },

  async updateLicenseDisplay() {
    try {
      const info = await app.getLicenseInfo();
      if (!info) return;

      this.cachedExpiresAt = info.expiresAt;
      this.startLiveCountdown();
    } catch (e) {
      console.warn('License info error:', e);
    }
  },

  promptUpdateHosting() {
    app.showPrompt({
      title: 'Cloud Administrator Verification',
      message: 'Enter cloud administrator master password to update hosting service:',
      type: 'password',
      confirmText: 'Verify Password',
      onConfirm: (pass) => {
        if (!pass) return;
        if (pass.trim() !== app.MASTER_LICENSE_PASS) {
          app.showAlert({
            title: 'Access Denied',
            message: 'Incorrect master password. Cloud hosting could not be modified.',
            buttonText: 'Try Again'
          });
          return;
        }

        // Master password verified! Open duration modal to configure timer
        app.openHostingDurationModal();
      }
    });
  },

  promptApplyLicense() {
    return this.promptUpdateHosting();
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
    try {
      const lanCfg = window.api && window.api.lanGetConfig ? await window.api.lanGetConfig() : { role: 'main' };
      if (lanCfg && lanCfg.role && lanCfg.role !== 'main') {
        app.showAlert('Database backups must be created directly on PC 1 (Main Server).');
        return;
      }
    } catch (e) {}

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
    try {
      const lanCfg = window.api && window.api.lanGetConfig ? await window.api.lanGetConfig() : { role: 'main' };
      if (lanCfg && lanCfg.role && lanCfg.role !== 'main') {
        app.showAlert('Database restore can only be performed directly on PC 1 (Main Server).');
        return;
      }
    } catch (e) {}

    app.authorizeAction(() => {
      app.showConfirm({
        title: 'Restore Factory Database',
        message: 'Restoring a database will replace all current factory data, stocks, delivery records, chocolate production, employees & payroll, and accounts with the selected backup file.<br><br><b>The application will automatically restart once the restore completes.</b><br><br>Are you sure you want to proceed?',
        confirmText: 'Select Backup File',
        confirmColor: 'orange',
        onConfirm: async () => {
          app.showLoading();
          try {
            const res = await window.api.restoreData();
            if (res && res.success) {
              // Preserve vital system configuration keys
              const preservedKeys = [
                'license_expires_at',
                'license_last_seen',
                'app_zoom',
                'lan_node_role',
                'lan_host_ip',
                'auto_cloud_sync',
                'supabase_url',
                'supabase_key'
              ];
              const savedValues = {};
              preservedKeys.forEach(k => {
                const v = localStorage.getItem(k);
                if (v !== null) savedValues[k] = v;
              });

              // Clear local and session storage so restored DB rehydrates cleanly
              localStorage.clear();
              sessionStorage.clear();

              Object.entries(savedValues).forEach(([k, v]) => {
                localStorage.setItem(k, v);
              });
            } else if (res && !res.success && res.error !== 'Cancelled') {
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
    try {
      const lanCfg = window.api && window.api.lanGetConfig ? await window.api.lanGetConfig() : { role: 'main' };
      if (lanCfg && lanCfg.role && lanCfg.role !== 'main') {
        app.showAlert('Clearing factory data is only permitted directly on PC 1 (Main Server).');
        return;
      }
    } catch (e) {}

    app.authorizeAction(() => {
      app.showConfirm({
        title: 'Clear All Factory & App Data',
        message: 'Are you sure you want to delete EVERYTHING?<br><br>This will permanently wipe all:<br>• <b>Stage 1:</b> Raw materials stock & purchases<br>• <b>Chocolate:</b> Prepared chocolate batches, liters stock & logs<br>• <b>Stage 2:</b> Single pieces production & recipes<br>• <b>Stage 3:</b> Packed cartons warehouse stock & batches<br>• <b>Stage 4:</b> Delivery vehicles & loaded car stock<br>• <b>Stage 5:</b> Shop sales, delivery invoices, returns & payments<br>• <b>Staff:</b> Employees list, attendance logs & salary payments<br>• <b>Ledgers:</b> Customer & supplier khata balances, expenses & logs<br><br><span class="text-rose-600 font-black">The application will be reset to a completely clean slate. This action CANNOT be undone!</span>',
        confirmText: 'Yes, Delete Everything',
        confirmColor: 'red',
        onConfirm: async () => {
          app.showLoading();
          try {
            const res = await window.api.clearAppData();
            if (res && res.success) {
              // Preserve vital system configuration keys (hosting countdown timer, zoom, lan config, cloud sync)
              const preservedKeys = [
                'license_expires_at',
                'license_last_seen',
                'app_zoom',
                'lan_node_role',
                'lan_host_ip',
                'auto_cloud_sync',
                'supabase_url',
                'supabase_key'
              ];
              const savedValues = {};
              preservedKeys.forEach(k => {
                const v = localStorage.getItem(k);
                if (v !== null) savedValues[k] = v;
              });

              localStorage.clear();
              sessionStorage.clear();

              Object.entries(savedValues).forEach(([k, v]) => {
                localStorage.setItem(k, v);
              });

              app.hideLoading();
              app.showAlert({
                title: 'All Factory Data Cleared',
                message: 'All factory raw materials, chocolate batches, production records, carton inventory, vehicles, shop deliveries & returns, employee records & payroll, and khata ledger records have been completely cleared.<br><br>The application will now restart fresh to a clean slate.',
                buttonText: 'Restart Application',
                onConfirm: async () => {
                  if (window.api && typeof window.api.relaunchApp === 'function') {
                    await window.api.relaunchApp();
                  } else {
                    window.location.reload();
                  }
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
    const btn = document.getElementById('locked-tabs-btn');
    const chevron = document.getElementById('locked-tabs-chevron');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    
    if (isHidden) {
      menu.classList.remove('hidden');
      if (btn) btn.classList.add('ring-2', 'ring-accent', 'border-accent');
      if (chevron) chevron.classList.add('rotate-180');
      const closeMenu = (e) => {
        if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
          menu.classList.add('hidden');
          if (btn) btn.classList.remove('ring-2', 'ring-accent', 'border-accent');
          if (chevron) chevron.classList.remove('rotate-180');
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    } else {
      menu.classList.add('hidden');
      if (btn) btn.classList.remove('ring-2', 'ring-accent', 'border-accent');
      if (chevron) chevron.classList.remove('rotate-180');
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
        <div onclick="Settings.toggleTabLock('${tab.key}', event)" class="px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer select-none transition-colors">
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
  },

  // =========================================================================
  // SUPABASE CLOUD BACKUP & RESTORE
  // =========================================================================

  async refreshCloudStatus() {
    const badge = document.getElementById('cloud-sync-status-badge');
    const uploadLabel = document.getElementById('cloud-last-upload-label');
    const backupFoundLabel = document.getElementById('cloud-last-backup-found');
    const chkAuto = document.getElementById('chk-auto-cloud-sync');

    if (chkAuto) {
      const autoSync = window.localStorage.getItem('auto_cloud_sync') === 'true';
      chkAuto.checked = autoSync;
    }

    if (!window.api || !window.api.cloudSyncGetStatus) return;

    try {
      const status = await window.api.cloudSyncGetStatus();
      if (badge) {
        if (status.connected) {
          badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-2xs';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected to Cloud';
        } else {
          badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5 shadow-2xs';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Offline (No Internet)';
        }
      }

      if (uploadLabel) {
        const syncTime = status.localSyncTime || window.localStorage.getItem('last_cloud_sync_time');
        if (syncTime) {
          const d = new Date(syncTime);
          uploadLabel.textContent = 'Last upload: ' + d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (status.cloudMeta && status.cloudMeta.timestamp) {
          const d = new Date(status.cloudMeta.timestamp);
          uploadLabel.textContent = 'Last upload: ' + d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          uploadLabel.textContent = 'Last upload: Never from this PC';
        }
      }

      if (backupFoundLabel) {
        if (status.cloudMeta && status.cloudMeta.timestamp) {
          const d = new Date(status.cloudMeta.timestamp);
          const dev = status.cloudMeta.device ? ' (' + status.cloudMeta.device + ')' : '';
          const c = status.cloudMeta.counts || {};
          const ctnCount = c.packed_cartons || 0;
          const matCount = c.raw_materials || 0;
          const shopCount = c.shops || 0;
          const delCount = c.shop_deliveries || 0;
          backupFoundLabel.innerHTML = '<span class="text-emerald-700 font-semibold">Latest Cloud Backup:</span> ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + dev + '<br><span class="text-[10px] text-slate-600 font-mono">' + ctnCount + ' cartons • ' + matCount + ' materials • ' + shopCount + ' shops • ' + delCount + ' deliveries</span>';
        } else {
          backupFoundLabel.textContent = 'No cloud backup found on Supabase yet. Click "Sync to Cloud Now" to create one.';
        }
      }
    } catch (err) {
      console.warn('Error checking cloud status:', err);
      if (badge) {
        badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1.5';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Check failed';
      }
    }
  },

  async toggleAutoCloudSync(enabled) {
    window.localStorage.setItem('auto_cloud_sync', enabled ? 'true' : 'false');
    if (window.api && window.api.setKv) {
      await window.api.setKv('auto_cloud_sync', enabled ? 'true' : 'false');
    }
    app.showToast?.(
      enabled ? 'Auto Cloud Sync Enabled: database will backup on exit.' : 'Auto Cloud Sync Disabled.',
      'info'
    );
  },

  async executeCloudUpload() {
    if (!window.api || !window.api.cloudSyncUpload) {
      return app.showAlert({
        title: 'Feature Unavailable',
        message: 'Cloud Sync is only available in Desktop Electron mode.'
      });
    }

    const btn = document.getElementById('btn-cloud-upload');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-70', 'cursor-wait');
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Uploading to Cloud...';
      if (window.lucide) lucide.createIcons();
    }

    try {
      // 1. Sync any localStorage into SQLite store
      const allKv = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKv[key] = localStorage.getItem(key);
      }
      if (window.api && window.api.saveAllKv) {
        await window.api.saveAllKv(allKv);
      }

      const res = await window.api.cloudSyncUpload();
      if (!res.success) throw new Error(res.error || 'Failed to upload snapshot');

      if (res.timestamp) {
        window.localStorage.setItem('last_cloud_sync_time', res.timestamp);
      }

      await this.refreshCloudStatus();

      const c = res.counts || {};
      const msg = [
        'Your complete factory database has been securely backed up to Supabase cloud!\n',
        '• Packed Cartons: ' + (c.packed_cartons || 0),
        '• Raw Materials: ' + (c.raw_materials || 0),
        '• Registered Shops: ' + (c.shops || 0),
        '• Delivery Records: ' + (c.shop_deliveries || 0),
        '• Cars / Vehicles: ' + (c.cars || 0),
        '• Staff Members: ' + (c.employees || 0),
        '• Raw Material Suppliers: ' + (c.suppliers || 0),
        '\nYou can now open any other laptop and click "Restore from Cloud" to sync this exact data!'
      ].join('\n');

      app.showAlert({
        title: 'Cloud Sync Complete!',
        message: msg,
        buttonText: 'Awesome'
      });
    } catch (err) {
      console.error('Cloud upload failed:', err);
      app.showAlert({
        title: 'Cloud Sync Failed',
        message: 'Could not upload backup to Supabase:\n' + err.message + '\n\nPlease check your internet connection.',
        buttonText: 'OK'
      });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-70', 'cursor-wait');
        btn.innerHTML = origHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  async executeCloudRestore() {
    if (!window.api || !window.api.cloudSyncRestore) {
      return app.showAlert({
        title: 'Feature Unavailable',
        message: 'Cloud Restore is only available in Desktop Electron mode.'
      });
    }

    app.showConfirm({
      title: 'Restore Database from Cloud?',
      message: 'This will replace the current local factory database with the latest snapshot from Supabase cloud.<br><br>(A local safety backup of this device will be automatically created on disk before restoring).<br><br>Do you want to proceed?',
      confirmText: 'Yes, Restore Now',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        const btn = document.getElementById('btn-cloud-restore');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.classList.add('opacity-70', 'cursor-wait');
          btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Restoring Data...';
          if (window.lucide) lucide.createIcons();
        }

        try {
          const res = await window.api.cloudSyncRestore();
          if (!res.success) throw new Error(res.error || 'Failed to restore snapshot');

          await this.refreshCloudStatus();

          const c = res.counts || {};
          const msg = [
            'All factory data was successfully downloaded from Supabase and applied!\n',
            '• Restored Cartons: ' + (c.packed_cartons || 0),
            '• Restored Raw Materials: ' + (c.raw_materials || 0),
            '• Restored Shops: ' + (c.shops || 0),
            '• Restored Deliveries: ' + (c.shop_deliveries || 0),
            '\nThe application will now refresh to display the restored data.'
          ].join('\n');

          app.showAlert({
            title: 'Cloud Restore Successful!',
            message: msg,
            buttonText: 'Refresh App',
            onConfirm: () => {
              window.location.reload();
            }
          });
        } catch (err) {
          console.error('Cloud restore failed:', err);
          app.showAlert({
            title: 'Cloud Restore Failed',
            message: 'Could not download cloud backup from Supabase:\n' + err.message,
            buttonText: 'OK'
          });
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-70', 'cursor-wait');
            btn.innerHTML = origHtml;
            if (window.lucide) lucide.createIcons();
          }
        }
      }
    });
  }
};
