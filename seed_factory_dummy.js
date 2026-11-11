const path = require('path');
const fs = require('fs');

const appData = process.env.APPDATA || (process.platform === 'darwin' 
  ? path.join(process.env.HOME, 'Library/Application Support') 
  : path.join(process.env.HOME, '.config'));

const dbPath = path.join(appData, 'delicious-superstar-foods', 'delicious_superstar_foods.db');
console.log('Connecting to SQLite Database at:', dbPath);

const Database = require('better-sqlite3');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // Temporarily off during clean batch repopulation

// 1. Settings & Store Info
db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
const setStmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
setStmt.run('company_name', 'Delicious Superstar Foods');
setStmt.run('tagline', 'Delicious Superstar Foods & Ice Cream Products');
setStmt.run('address', 'GT Road, Near Cadet College, Hasan Abdal');
setStmt.run('phone', '0315-6795995');
setStmt.run('invoice_counter', '7');
setStmt.run('purchase_invoice_counter', '6');

// Clear existing factory tables for fresh realistic dummy dataset
const tablesToClear = [
  'raw_material_purchase_items',
  'raw_material_purchases',
  'raw_material_logs',
  'raw_materials',
  'production_batch_materials',
  'production_batches',
  'packing_batches',
  'car_loading_items',
  'car_loading_batches',
  'car_inventory',
  'shop_return_items',
  'shop_returns',
  'shop_delivery_items',
  'shop_deliveries',
  'shop_payments',
  'supplier_payments',
  'suppliers',
  'shops',
  'cars',
  'packed_cartons',
  'icecream_items',
  'expenses',
  'expense_categories'
];

tablesToClear.forEach(t => {
  try { db.exec(`DELETE FROM ${t};`); } catch (e) {}
});

console.log('Cleared existing tables. Seeding fresh realistic Ice Cream Factory data...');

// 2. Suppliers (Raw Material Vendors)
const suppliersData = [
  { name: 'Dairy Fresh Farms', contact: 'Haji Aslam Dairywala', phone: '0300-1122334', address: 'Balu Road, Hasan Abdal', city: 'Hasan Abdal', amount: 33500 },
  { name: 'Kohinoor Sugar Mills Ltd', contact: 'Sheikh Rizwan', phone: '0321-5544332', address: 'Industrial Triangle, Rawalpindi', city: 'Rawalpindi', amount: 0 },
  { name: 'Choco Rich Ingredients', contact: 'Farhan Zaidi', phone: '0312-3344556', address: 'Korangi Industrial Area, Karachi', city: 'Karachi', amount: 25000 },
  { name: 'Master Packaging & Wrappers', contact: 'Imran Qureshi', phone: '0345-6677889', address: 'Plot 24, I-9 Industrial Area, Islamabad', city: 'Islamabad', amount: 30000 },
  { name: 'Alpha Food Flavors & Chemicals', contact: 'Dr. Tariq Chemicals', phone: '0333-8899001', address: 'Sundar Industrial Estate, Lahore', city: 'Lahore', amount: 0 }
];

const insSupplier = db.prepare(`
  INSERT INTO suppliers (name, contact_person, phone, address, city, amount, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const supplierMap = {};
suppliersData.forEach((s, idx) => {
  const res = insSupplier.run(s.name, s.contact, s.phone, s.address, s.city, s.amount, 'Reliable factory vendor', `2026-11-0${idx + 1} 09:00:00`);
  supplierMap[s.name] = res.lastInsertRowid;
});

// 3. Raw Materials
const rawMaterialsData = [
  { name: 'Fresh Buffalo Milk', category: 'Dairy', unit: 'Liters', stock: 450, cost: 180, min: 100 },
  { name: 'Heavy Dairy Cream 45%', category: 'Dairy', unit: 'KG', stock: 120, cost: 650, min: 30 },
  { name: 'Refined White Sugar', category: 'Sweetener', unit: 'KG', stock: 520, cost: 145, min: 150 },
  { name: 'Dark Chocolate Slab Coating', category: 'Chocolate', unit: 'KG', stock: 85, cost: 950, min: 25 },
  { name: 'Pure Cocoa Powder', category: 'Chocolate', unit: 'KG', stock: 40, cost: 800, min: 15 },
  { name: 'Madagascar Vanilla Flavor', category: 'Flavoring', unit: 'Liters', stock: 18, cost: 2200, min: 5 },
  { name: 'Chaunsa Mango Pulp', category: 'Fruits', unit: 'KG', stock: 95, cost: 380, min: 20 },
  { name: 'Strawberry Fruit Pulp', category: 'Fruits', unit: 'KG', stock: 65, cost: 420, min: 15 },
  { name: 'Wooden Ice Cream Sticks', category: 'Packaging', unit: 'PCS', stock: 25000, cost: 1.20, min: 5000 },
  { name: 'Printed Chocbar Wrappers', category: 'Packaging', unit: 'PCS', stock: 18000, cost: 2.50, min: 4000 },
  { name: 'Printed Paddle Pop Wrappers', category: 'Packaging', unit: 'PCS', stock: 16000, cost: 2.20, min: 4000 },
  { name: 'Ice Cream Stabilizer & Emulsifier', category: 'Additives', unit: 'KG', stock: 35, cost: 1400, min: 10 },
  { name: 'Crispy Sugar Waffle Cones', category: 'Cones', unit: 'PCS', stock: 5500, cost: 8.00, min: 1000 }
];

const insRaw = db.prepare(`
  INSERT INTO raw_materials (name, category, unit, current_stock, cost_price, min_stock_alert, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const rawMap = {};
rawMaterialsData.forEach((m, idx) => {
  const res = insRaw.run(m.name, m.category, m.unit, m.stock, m.cost, m.min, 'Standard production material', `2026-11-0${(idx % 9) + 1} 08:30:00`);
  rawMap[m.name] = { id: res.lastInsertRowid, ...m };
});

// 4. Raw Material Purchases (Inward stock history)
const purchasesData = [
  {
    invoice_no: 'PUR-1',
    date: '2026-11-05',
    time: '2026-11-05 10:15:00',
    supplier: 'Dairy Fresh Farms',
    items: [
      { name: 'Fresh Buffalo Milk', qty: 500, unit: 'Liters', cost: 180 },
      { name: 'Heavy Dairy Cream 45%', qty: 150, unit: 'KG', cost: 650 }
    ],
    paid: 150000,
    method: 'Online',
    notes: 'Morning fresh dairy milk & cream batch'
  },
  {
    invoice_no: 'PUR-2',
    date: '2026-11-06',
    time: '2026-11-06 11:30:00',
    supplier: 'Kohinoor Sugar Mills Ltd',
    items: [
      { name: 'Refined White Sugar', qty: 600, unit: 'KG', cost: 145 }
    ],
    paid: 87000,
    method: 'Cash',
    notes: 'Premium grade white refined sugar bags'
  },
  {
    invoice_no: 'PUR-3',
    date: '2026-11-07',
    time: '2026-11-07 14:00:00',
    supplier: 'Choco Rich Ingredients',
    items: [
      { name: 'Dark Chocolate Slab Coating', qty: 100, unit: 'KG', cost: 950 },
      { name: 'Pure Cocoa Powder', qty: 50, unit: 'KG', cost: 800 }
    ],
    paid: 80000,
    method: 'Cash',
    notes: 'Imported Belgian style dark chocolate coating'
  },
  {
    invoice_no: 'PUR-4',
    date: '2026-11-08',
    time: '2026-11-08 15:45:00',
    supplier: 'Master Packaging & Wrappers',
    items: [
      { name: 'Wooden Ice Cream Sticks', qty: 30000, unit: 'PCS', cost: 1.20 },
      { name: 'Printed Chocbar Wrappers', qty: 20000, unit: 'PCS', cost: 2.50 },
      { name: 'Printed Paddle Pop Wrappers', qty: 20000, unit: 'PCS', cost: 2.20 }
    ],
    paid: 100000,
    method: 'Online',
    notes: 'Custom branded factory wrappers & sterile birch sticks'
  },
  {
    invoice_no: 'PUR-5',
    date: '2026-11-09',
    time: '2026-11-09 12:10:00',
    supplier: 'Alpha Food Flavors & Chemicals',
    items: [
      { name: 'Madagascar Vanilla Flavor', qty: 20, unit: 'Liters', cost: 2200 },
      { name: 'Ice Cream Stabilizer & Emulsifier', qty: 40, unit: 'KG', cost: 1400 }
    ],
    paid: 100000,
    method: 'Online',
    notes: 'Food grade certified pure aroma vanilla'
  },
  {
    invoice_no: 'PUR-6',
    date: '2026-11-10',
    time: '2026-11-10 09:40:00',
    supplier: 'Dairy Fresh Farms',
    items: [
      { name: 'Fresh Buffalo Milk', qty: 200, unit: 'Liters', cost: 180 }
    ],
    paid: 20000,
    method: 'Cash',
    notes: 'Top-up milk for mid-week production batch'
  }
];

const insPurchase = db.prepare(`
  INSERT INTO raw_material_purchases (
    material_id, material_name, qty, unit, unit_cost, total_cost,
    supplier_id, supplier_name, invoice_no, date, notes,
    paid_amount, remaining_balance, payment_method, items_count, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insPurchaseItem = db.prepare(`
  INSERT INTO raw_material_purchase_items (
    purchase_id, material_id, material_name, unit, qty, unit_cost, total_cost, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

purchasesData.forEach(p => {
  const supId = supplierMap[p.supplier];
  let totalCost = 0;
  p.items.forEach(it => totalCost += (it.qty * it.cost));
  const rem = Math.max(0, totalCost - p.paid);
  const primary = p.items[0];
  const summaryName = p.items.length === 1 ? primary.name : `${primary.name} (+${p.items.length - 1} more items)`;

  const res = insPurchase.run(
    rawMap[primary.name].id,
    summaryName,
    primary.qty,
    primary.unit,
    primary.cost,
    totalCost,
    supId,
    p.supplier,
    p.invoice_no,
    p.date,
    p.notes,
    p.paid,
    rem,
    p.method,
    p.items.length,
    p.time
  );
  const purId = res.lastInsertRowid;

  p.items.forEach(it => {
    insPurchaseItem.run(
      purId,
      rawMap[it.name].id,
      it.name,
      it.unit,
      it.qty,
      it.cost,
      it.qty * it.cost,
      ''
    );
  });
});

// 5. Supplier Payments (settling supplier debt)
const supPayments = [
  { supplier: 'Dairy Fresh Farms', amount: 25000, method: 'Cash', receipt_no: 'PAY-SUP-1', date: '2026-11-08', time: '2026-11-08 16:30:00', notes: 'Weekly part payment on milk bills' },
  { supplier: 'Choco Rich Ingredients', amount: 30000, method: 'Online', receipt_no: 'PAY-SUP-2', date: '2026-11-10', time: '2026-11-10 17:00:00', notes: 'Bank transfer for chocolate shipment' }
];

const insSupPay = db.prepare(`
  INSERT INTO supplier_payments (supplier_id, amount, payment_method, receipt_no, date, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
supPayments.forEach(sp => {
  insSupPay.run(supplierMap[sp.supplier], sp.amount, sp.method, sp.receipt_no, sp.date, sp.notes, sp.time);
});

// 6. Ice Cream Single Piece Items
const icecreamItemsData = [
  { name: 'Chocbar', flavor: 'Rich Milk Chocolate & Vanilla', cost: 65, retail: 100, stock: 350, default_ctn: 20, barcode: '448951607001' },
  { name: 'Paddle Pop', flavor: 'Rainbow Fruity Blast', cost: 25, retail: 40, stock: 450, default_ctn: 15, barcode: '448951607046' },
  { name: 'Malai Kulfi', flavor: 'Traditional Khoya Malai', cost: 48, retail: 80, stock: 280, default_ctn: 25, barcode: '448951607003' },
  { name: 'Mango Stick', flavor: 'Pure Chaunsa Pulp', cost: 38, retail: 60, stock: 320, default_ctn: 20, barcode: '448951607004' },
  { name: 'Cone Vanilla King', flavor: 'Crisp Wafer & Chocolate Crown', cost: 75, retail: 120, stock: 180, default_ctn: 12, barcode: '448951607005' },
  { name: 'Pista Zafran Kulfi', flavor: 'Royal Pistachio Saffron', cost: 55, retail: 90, stock: 240, default_ctn: 20, barcode: '448951607006' }
];

const insIce = db.prepare(`
  INSERT INTO icecream_items (name, flavor, unit_cost, retail_piece_price, current_single_stock, default_pcs_per_carton, barcode, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const iceMap = {};
icecreamItemsData.forEach(it => {
  const res = insIce.run(it.name, it.flavor, it.cost, it.retail, it.stock, it.default_ctn, it.barcode, 'Standard production item', '2026-11-01 10:00:00');
  iceMap[it.name] = { id: res.lastInsertRowid, ...it };
});

// 7. Production Batches (Pieces produced on floor)
const productionBatches = [
  {
    batch_no: 'PROD-20261107-001',
    date: '2026-11-07',
    time: '2026-11-07 14:30:00',
    item: 'Chocbar',
    pieces: 1200,
    unit_cost: 65,
    summary: 'Fresh Buffalo Milk (120 Liters), Heavy Dairy Cream 45% (30 KG), Refined White Sugar (25 KG), Dark Chocolate Slab Coating (20 KG), Wooden Ice Cream Sticks (1200 PCS), Printed Chocbar Wrappers (1200 PCS)',
    materials: [
      { name: 'Fresh Buffalo Milk', qty: 120, unit: 'Liters', cost: 180 },
      { name: 'Heavy Dairy Cream 45%', qty: 30, unit: 'KG', cost: 650 },
      { name: 'Refined White Sugar', qty: 25, unit: 'KG', cost: 145 },
      { name: 'Dark Chocolate Slab Coating', qty: 20, unit: 'KG', cost: 950 },
      { name: 'Wooden Ice Cream Sticks', qty: 1200, unit: 'PCS', cost: 1.20 },
      { name: 'Printed Chocbar Wrappers', qty: 1200, unit: 'PCS', cost: 2.50 }
    ]
  },
  {
    batch_no: 'PROD-20261108-001',
    date: '2026-11-08',
    time: '2026-11-08 11:20:00',
    item: 'Paddle Pop',
    pieces: 1500,
    unit_cost: 25,
    summary: 'Fresh Buffalo Milk (80 Liters), Refined White Sugar (20 KG), Strawberry Fruit Pulp (25 KG), Wooden Ice Cream Sticks (1500 PCS), Printed Paddle Pop Wrappers (1500 PCS)',
    materials: [
      { name: 'Fresh Buffalo Milk', qty: 80, unit: 'Liters', cost: 180 },
      { name: 'Refined White Sugar', qty: 20, unit: 'KG', cost: 145 },
      { name: 'Strawberry Fruit Pulp', qty: 25, unit: 'KG', cost: 420 },
      { name: 'Wooden Ice Cream Sticks', qty: 1500, unit: 'PCS', cost: 1.20 },
      { name: 'Printed Paddle Pop Wrappers', qty: 1500, unit: 'PCS', cost: 2.20 }
    ]
  },
  {
    batch_no: 'PROD-20261109-001',
    date: '2026-11-09',
    time: '2026-11-09 13:10:00',
    item: 'Malai Kulfi',
    pieces: 1000,
    unit_cost: 48,
    summary: 'Fresh Buffalo Milk (150 Liters), Heavy Dairy Cream 45% (20 KG), Refined White Sugar (20 KG), Wooden Ice Cream Sticks (1000 PCS)',
    materials: [
      { name: 'Fresh Buffalo Milk', qty: 150, unit: 'Liters', cost: 180 },
      { name: 'Heavy Dairy Cream 45%', qty: 20, unit: 'KG', cost: 650 },
      { name: 'Refined White Sugar', qty: 20, unit: 'KG', cost: 145 },
      { name: 'Wooden Ice Cream Sticks', qty: 1000, unit: 'PCS', cost: 1.20 }
    ]
  },
  {
    batch_no: 'PROD-20261110-001',
    date: '2026-11-10',
    time: '2026-11-10 15:40:00',
    item: 'Mango Stick',
    pieces: 800,
    unit_cost: 38,
    summary: 'Chaunsa Mango Pulp (40 KG), Fresh Buffalo Milk (60 Liters), Refined White Sugar (15 KG), Wooden Ice Cream Sticks (800 PCS)',
    materials: [
      { name: 'Chaunsa Mango Pulp', qty: 40, unit: 'KG', cost: 380 },
      { name: 'Fresh Buffalo Milk', qty: 60, unit: 'Liters', cost: 180 },
      { name: 'Refined White Sugar', qty: 15, unit: 'KG', cost: 145 },
      { name: 'Wooden Ice Cream Sticks', qty: 800, unit: 'PCS', cost: 1.20 }
    ]
  },
  {
    batch_no: 'PROD-20261111-001',
    date: '2026-11-11',
    time: '2026-11-11 10:00:00',
    item: 'Cone Vanilla King',
    pieces: 600,
    unit_cost: 75,
    summary: 'Crispy Sugar Waffle Cones (600 PCS), Heavy Dairy Cream 45% (25 KG), Fresh Buffalo Milk (50 Liters), Dark Chocolate Slab Coating (10 KG)',
    materials: [
      { name: 'Crispy Sugar Waffle Cones', qty: 600, unit: 'PCS', cost: 8.00 },
      { name: 'Heavy Dairy Cream 45%', qty: 25, unit: 'KG', cost: 650 },
      { name: 'Fresh Buffalo Milk', qty: 50, unit: 'Liters', cost: 180 },
      { name: 'Dark Chocolate Slab Coating', qty: 10, unit: 'KG', cost: 950 }
    ]
  }
];

const insProdBatch = db.prepare(`
  INSERT INTO production_batches (batch_number, date, item_id, item_name, produced_pieces, unit_cost, total_cost, raw_materials_summary, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insProdMat = db.prepare(`
  INSERT INTO production_batch_materials (batch_id, material_id, material_name, qty_used, unit, unit_cost, line_cost)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

productionBatches.forEach(b => {
  const it = iceMap[b.item];
  const totalCost = b.pieces * b.unit_cost;
  const res = insProdBatch.run(b.batch_no, b.date, it.id, it.name, b.pieces, b.unit_cost, totalCost, b.summary, 'Floor batch QC passed', b.time);
  const bId = res.lastInsertRowid;

  b.materials.forEach(m => {
    insProdMat.run(bId, rawMap[m.name].id, m.name, m.qty, m.unit, m.cost, m.qty * m.cost);
  });
});

// 8. Packed Cartons & Shopers
const packedCartonsData = [
  { item: 'Chocbar', name: 'Chocbar Carton', type: 'carton', pcs: 20, cost: 1300, sale: 1600, ws: 1500, wh_stock: 35, barcode: '448951607001' },
  { item: 'Paddle Pop', name: 'Paddle Pop Carton', type: 'carton', pcs: 15, cost: 375, sale: 500, ws: 450, wh_stock: 45, barcode: '448951607046' },
  { item: 'Malai Kulfi', name: 'Malai Kulfi Shoper', type: 'shoper', pcs: 25, cost: 1200, sale: 1600, ws: 1500, wh_stock: 22, barcode: '448951607003' },
  { item: 'Mango Stick', name: 'Mango Stick Carton', type: 'carton', pcs: 20, cost: 760, sale: 1000, ws: 920, wh_stock: 26, barcode: '448951607004' },
  { item: 'Cone Vanilla King', name: 'Cone Vanilla King Carton', type: 'carton', pcs: 12, cost: 900, sale: 1200, ws: 1100, wh_stock: 24, barcode: '448951607005' },
  { item: 'Pista Zafran Kulfi', name: 'Pista Zafran Kulfi Shoper', type: 'shoper', pcs: 20, cost: 1100, sale: 1500, ws: 1400, wh_stock: 18, barcode: '448951607006' }
];

const insCarton = db.prepare(`
  INSERT INTO packed_cartons (
    item_id, item_name, carton_name, package_type, pieces_per_carton,
    carton_cost_price, carton_sale_price, carton_wholesale_price, factory_carton_stock,
    stickers_printed, barcode, notes, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const cartonMap = {};
packedCartonsData.forEach(c => {
  const it = iceMap[c.item];
  const res = insCarton.run(
    it.id, it.name, c.name, c.type, c.pcs,
    c.cost, c.sale, c.ws, c.wh_stock,
    c.wh_stock, c.barcode, 'Packaged for delivery & cold storage', '2026-11-01 12:00:00'
  );
  cartonMap[c.name] = { id: res.lastInsertRowid, ...c };
});

// 9. Packing Batches (History of packaging pieces into cartons/shopers)
const packingBatches = [
  { no: 'PACK-20261107-001', date: '2026-11-07', time: '2026-11-07 16:00:00', carton: 'Chocbar Carton', ctns: 45, pcs: 20, cost: 1300, sale: 1600 },
  { no: 'PACK-20261108-001', date: '2026-11-08', time: '2026-11-08 14:00:00', carton: 'Paddle Pop Carton', ctns: 60, pcs: 15, cost: 375, sale: 500 },
  { no: 'PACK-20261109-001', date: '2026-11-09', time: '2026-11-09 15:30:00', carton: 'Malai Kulfi Shoper', ctns: 30, pcs: 25, cost: 1200, sale: 1600 },
  { no: 'PACK-20261110-001', date: '2026-11-10', time: '2026-11-10 16:45:00', carton: 'Mango Stick Carton', ctns: 30, pcs: 20, cost: 760, sale: 1000 },
  { no: 'PACK-20261111-001', date: '2026-11-11', time: '2026-11-11 11:30:00', carton: 'Cone Vanilla King Carton', ctns: 30, pcs: 12, cost: 900, sale: 1200 }
];

const insPackBatch = db.prepare(`
  INSERT INTO packing_batches (
    packing_number, date, carton_id, item_id, item_name, package_type,
    cartons_packed, pieces_per_carton, total_pieces_consumed,
    carton_cost, total_cost, carton_sale_price, notes, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
packingBatches.forEach(pb => {
  const c = cartonMap[pb.carton];
  const it = iceMap[c.item];
  insPackBatch.run(
    pb.no, pb.date, c.id, it.id, it.name, c.type,
    pb.ctns, pb.pcs, pb.ctns * pb.pcs,
    pb.cost, pb.ctns * pb.cost, pb.sale, 'Warehouse packing stock', pb.time
  );
});

// 10. Cars / Delivery Vehicles & Drivers
const carsData = [
  { number: 'SUKUZI BOLAN ABC-123', driver: 'Salik', phone: '0315-6795995', area: 'Hasan Abdal & Wah Cantt', active: 1 },
  { number: 'SUZUKI RAVI RI-789', driver: 'Tariq Mehmood', phone: '0300-5566778', area: 'Taxila & Rawalpindi', active: 1 },
  { number: 'HYUNDAI SHEHZORE ICT-456', driver: 'Usman Ali', phone: '0333-9876543', area: 'Islamabad Highway & Attock', active: 1 }
];

const insCar = db.prepare(`
  INSERT INTO cars (car_number, driver_name, phone, area, is_active, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const carMap = {};
carsData.forEach((c, idx) => {
  const res = insCar.run(c.number, c.driver, c.phone, c.area, c.active, 'Factory refrigerated mobile van', `2026-11-0${idx + 1} 07:00:00`);
  carMap[c.number] = { id: res.lastInsertRowid, ...c };
});

// 11. Car Loading Batches (Vehicle dispatches) & Car Inventory
const carLoadings = [
  {
    dispatch_no: 'DISP-20261109-01',
    car: 'SUKUZI BOLAN ABC-123',
    date: '2026-11-09',
    time: '2026-11-09 08:30:00',
    items: [
      { carton: 'Chocbar Carton', loaded: 15, sale: 1600 },
      { carton: 'Paddle Pop Carton', loaded: 20, sale: 500 },
      { carton: 'Malai Kulfi Shoper', loaded: 10, sale: 1600 }
    ]
  },
  {
    dispatch_no: 'DISP-20261110-01',
    car: 'SUZUKI RAVI RI-789',
    date: '2026-11-10',
    time: '2026-11-10 08:15:00',
    items: [
      { carton: 'Chocbar Carton', loaded: 12, sale: 1600 },
      { carton: 'Mango Stick Carton', loaded: 15, sale: 1000 },
      { carton: 'Cone Vanilla King Carton', loaded: 10, sale: 1200 }
    ]
  },
  {
    dispatch_no: 'DISP-20261111-01',
    car: 'SUKUZI BOLAN ABC-123',
    date: '2026-11-11',
    time: '2026-11-11 08:00:00',
    items: [
      { carton: 'Chocbar Carton', loaded: 10, sale: 1600 },
      { carton: 'Paddle Pop Carton', loaded: 15, sale: 500 },
      { carton: 'Malai Kulfi Shoper', loaded: 8, sale: 1600 }
    ]
  }
];

const insLoadingBatch = db.prepare(`
  INSERT INTO car_loading_batches (dispatch_no, car_id, date, total_cartons, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insLoadingItem = db.prepare(`
  INSERT INTO car_loading_items (dispatch_id, carton_id, carton_name, pieces_per_carton, cartons_loaded, sale_price)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insCarInv = db.prepare(`
  INSERT OR REPLACE INTO car_inventory (car_id, carton_id, cartons_loaded, updated_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
`);

// Accumulate live inventory for cars
const liveCarStock = {}; // key: `${carId}_${cartonId}`

carLoadings.forEach(cl => {
  const car = carMap[cl.car];
  const totCtns = cl.items.reduce((s, x) => s + x.loaded, 0);
  const res = insLoadingBatch.run(cl.dispatch_no, car.id, cl.date, totCtns, 'Morning route vehicle loading gatepass', cl.time);
  const dispId = res.lastInsertRowid;

  cl.items.forEach(it => {
    const c = cartonMap[it.carton];
    insLoadingItem.run(dispId, c.id, c.name, c.pcs, it.loaded, it.sale);
    const key = `${car.id}_${c.id}`;
    liveCarStock[key] = (liveCarStock[key] || 0) + it.loaded;
  });
});

// 12. Shops / Customers (Retail Stores)
const shopsData = [
  { name: 'Al-Madina General Store', owner: 'Haji Qasim', phone: '0301-4455667', address: 'Cantt Bazaar, Hasan Abdal', city: 'Hasan Abdal', amount: 3200 },
  { name: 'Bismillah Super Store', owner: 'Sheikh Noman', phone: '0322-8877665', address: 'Main GT Road, Lala Rukh, Wah Cantt', city: 'Wah Cantt', amount: 4500 },
  { name: 'Gourmet Sweets & Bakers', owner: 'Chaudhry Tariq', phone: '0300-5566778', address: 'Model Town, Taxila', city: 'Taxila', amount: 0 },
  { name: 'Quetta Chaman Ice Cream', owner: 'Agha Jan', phone: '0345-6677889', address: 'Kashmir Road, Saddar, Rawalpindi', city: 'Rawalpindi', amount: 6800 },
  { name: 'Madina Cold Corner', owner: 'Malik Bilal', phone: '0321-7788990', address: 'Commercial Market, New City Phase 2', city: 'Wah Cantt', amount: 2000 },
  { name: 'Al-Falah Cash & Carry', owner: 'Mian Asif', phone: '0333-1122448', address: 'Attock Road, Hasan Abdal', city: 'Hasan Abdal', amount: 0 },
  { name: 'Counter Walk-in Customer', owner: 'Cash Walk-in', phone: '0315-6795995', address: 'Factory Direct Sale Counter', city: 'Hasan Abdal', amount: 0 }
];

const insShop = db.prepare(`
  INSERT INTO shops (name, owner_name, phone, address, city, amount, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const shopMap = {};
shopsData.forEach((s, idx) => {
  const res = insShop.run(s.name, s.owner, s.phone, s.address, s.city, s.amount, 'Active retail customer', `2026-11-0${(idx % 8) + 1} 10:00:00`);
  shopMap[s.name] = { id: res.lastInsertRowid, ...s };
});

// 13. Shop Deliveries / Sales (Invoices 1, 2, 3, 4, 5, 6, 7)
const salesData = [
  {
    invoice_no: '1',
    date: '2026-11-09',
    time: '2026-11-09 10:30:00',
    car: 'SUKUZI BOLAN ABC-123',
    shop: 'Al-Madina General Store',
    items: [
      { carton: 'Chocbar Carton', qty: 2, price: 1600 },
      { carton: 'Paddle Pop Carton', qty: 2, price: 500 }
    ],
    received: 4200, // Full Paid
    method: 'Cash',
    notes: 'Morning routine delivery'
  },
  {
    invoice_no: '2',
    date: '2026-11-09',
    time: '2026-11-09 11:45:00',
    car: 'SUKUZI BOLAN ABC-123',
    shop: 'Bismillah Super Store',
    items: [
      { carton: 'Chocbar Carton', qty: 3, price: 1600 },
      { carton: 'Malai Kulfi Shoper', qty: 2, price: 1600 }
    ],
    received: 5000, // Total 8000, 3000 pending to khata
    method: 'Cash',
    notes: 'Partial payment on delivery, 3000 to khata'
  },
  {
    invoice_no: '3',
    date: '2026-11-09',
    time: '2026-11-09 13:20:00',
    car: 'SUKUZI BOLAN ABC-123',
    shop: 'Gourmet Sweets & Bakers',
    items: [
      { carton: 'Chocbar Carton', qty: 2, price: 1600 },
      { carton: 'Paddle Pop Carton', qty: 4, price: 500 }
    ],
    received: 5200, // Full Paid
    method: 'Online',
    notes: 'Bank transfer received by driver'
  },
  {
    invoice_no: '4',
    date: '2026-11-10',
    time: '2026-11-10 10:15:00',
    car: 'SUZUKI RAVI RI-789',
    shop: 'Quetta Chaman Ice Cream',
    items: [
      { carton: 'Chocbar Carton', qty: 3, price: 1600 },
      { carton: 'Mango Stick Carton', qty: 4, price: 1000 },
      { carton: 'Cone Vanilla King Carton', qty: 2, price: 1200 }
    ],
    received: 4400, // Total 11200, 6800 pending to khata
    method: 'Cash',
    notes: 'Bulk order delivered to Saddar branch'
  },
  {
    invoice_no: '5',
    date: '2026-11-10',
    time: '2026-11-10 12:40:00',
    car: 'SUZUKI RAVI RI-789',
    shop: 'Madina Cold Corner',
    items: [
      { carton: 'Mango Stick Carton', qty: 3, price: 1000 },
      { carton: 'Cone Vanilla King Carton', qty: 1, price: 1200 }
    ],
    received: 2200, // Total 4200, 2000 pending
    method: 'Cash',
    notes: '2000 added to shop running khata'
  },
  {
    invoice_no: '6',
    date: '2026-11-10',
    time: '2026-11-10 15:30:00',
    car: 'SUZUKI RAVI RI-789',
    shop: 'Al-Falah Cash & Carry',
    items: [
      { carton: 'Chocbar Carton', qty: 2, price: 1600 },
      { carton: 'Mango Stick Carton', qty: 2, price: 1000 }
    ],
    received: 5200, // Full Paid
    method: 'Online',
    notes: 'Paid via Easypaisa transfer'
  },
  {
    invoice_no: '7',
    date: '2026-11-11',
    time: '2026-11-11 11:20:00',
    car: 'SUKUZI BOLAN ABC-123',
    shop: 'Al-Madina General Store',
    items: [
      { carton: 'Chocbar Carton', qty: 2, price: 1600 },
      { carton: 'Paddle Pop Carton', qty: 1, price: 500 }
    ],
    received: 500, // Total 3700, 3200 pending
    method: 'Cash',
    notes: 'Driver delivered 3 ctns'
  }
];

const insDelivery = db.prepare(`
  INSERT INTO shop_deliveries (
    invoice_no, date, shop_id, shop_name, shop_phone, shop_address,
    car_id, car_number, driver_name, subtotal, discount, total_amount,
    received_amount, previous_balance, remaining_balance, payment_method,
    notes, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insDeliveryItem = db.prepare(`
  INSERT INTO shop_delivery_items (
    delivery_id, carton_id, carton_name, package_type, pieces_per_carton,
    ordered_cartons, delivered_cartons, returned_cartons, return_destination,
    carton_price, line_total
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

salesData.forEach(s => {
  const car = carMap[s.car];
  const shop = shopMap[s.shop];
  let subtotal = 0;
  s.items.forEach(it => subtotal += (it.qty * it.price));
  const rem = Math.max(0, subtotal - s.received);

  const res = insDelivery.run(
    s.invoice_no, s.date, shop.id, shop.name, shop.phone, shop.address,
    car.id, car.number, car.driver,
    subtotal, 0, subtotal, s.received, 0, rem, s.method,
    s.notes, 'Completed', s.time
  );
  const delId = res.lastInsertRowid;

  s.items.forEach(it => {
    const c = cartonMap[it.carton];
    insDeliveryItem.run(
      delId, c.id, c.name, c.type, c.pcs,
      it.qty, it.qty, 0, 'car',
      it.price, it.qty * it.price
    );
    // Deduct delivered cartons from car inventory
    const key = `${car.id}_${c.id}`;
    liveCarStock[key] = Math.max(0, (liveCarStock[key] || 0) - it.qty);
  });
});

// Update final car_inventory in DB
Object.entries(liveCarStock).forEach(([key, qty]) => {
  const [carId, cartonId] = key.split('_').map(Number);
  insCarInv.run(carId, cartonId, qty);
});

// 14. Shop Return (Customer damaged box return)
const insReturn = db.prepare(`
  INSERT INTO shop_returns (
    return_no, delivery_id, invoice_no, shop_id, shop_name, car_id, car_number,
    date, total_cartons_returned, total_refund_amount, return_destination,
    adjustment_type, reason, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insReturnItem = db.prepare(`
  INSERT INTO shop_return_items (
    return_id, delivery_item_id, carton_id, carton_name, pieces_per_carton,
    returned_cartons, carton_price, refund_amount, return_destination
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const retRes = insReturn.run(
  'RET-1', 1, '1', shopMap['Al-Madina General Store'].id, 'Al-Madina General Store',
  carMap['SUKUZI BOLAN ABC-123'].id, 'SUKUZI BOLAN ABC-123',
  '2026-11-10', 1, 500, 'car', 'khata', 'Box outer packaging pressed during transit', '2026-11-10 14:00:00'
);
insReturnItem.run(
  retRes.lastInsertRowid, 2, cartonMap['Paddle Pop Carton'].id, 'Paddle Pop Carton',
  15, 1, 500, 500, 'car'
);

// 15. Shop Payments (Khata cash recovery)
const insShopPay = db.prepare(`
  INSERT INTO shop_payments (shop_id, amount, payment_method, receipt_no, date, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
insShopPay.run(
  shopMap['Bismillah Super Store'].id,
  1500,
  'Cash',
  'REC-001',
  '2026-11-10',
  'Part payment collected by driver Salik',
  '2026-11-10 16:00:00'
);

// 16. Expense Categories & Factory Expenses
const expCats = [
  'Factory Utilities',
  'Fuel / Transport',
  'Packaging Supplies',
  'Staff Wages',
  'Machine Maintenance',
  'Office & Refreshments'
];

db.exec(`CREATE TABLE IF NOT EXISTS expense_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
const insExpCat = db.prepare(`INSERT OR IGNORE INTO expense_categories (name) VALUES (?)`);
expCats.forEach(cat => insExpCat.run(cat));

const expensesData = [
  { date: '2026-11-06', time: '2026-11-06 14:00:00', cat: 'Factory Utilities', amount: 65000, desc: 'Factory Electricity & Cold Storage Power Bill (WAPDA)', paid_by: 'Owner (Cheque / Online)' },
  { date: '2026-11-07', time: '2026-11-07 09:30:00', cat: 'Fuel / Transport', amount: 18500, desc: 'Delivery Vans Diesel (Bolan & Ravi weekly tank refill)', paid_by: 'Salik (Cash)' },
  { date: '2026-11-08', time: '2026-11-08 11:00:00', cat: 'Packaging Supplies', amount: 8200, desc: 'Corrugated master boxes, sealing tapes & marker inks', paid_by: 'Factory Cashier' },
  { date: '2026-11-09', time: '2026-11-09 17:00:00', cat: 'Staff Wages', amount: 34000, desc: 'Weekly production floor operators & helpers wages', paid_by: 'Manager' },
  { date: '2026-11-10', time: '2026-11-10 15:30:00', cat: 'Machine Maintenance', amount: 7500, desc: 'Ammonia refrigeration chiller compressor oil & service', paid_by: 'Technician' },
  { date: '2026-11-11', time: '2026-11-11 10:30:00', cat: 'Office & Refreshments', amount: 3600, desc: 'Drinking mineral water cans & daily tea refreshment', paid_by: 'Counter Cash' }
];

const insExpense = db.prepare(`
  INSERT INTO expenses (date, category, amount, description, paid_by, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
expensesData.forEach(e => {
  insExpense.run(e.date, e.cat, e.amount, e.desc, e.paid_by, 'Authorized factory operating expense', e.time);
});

// Re-enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Successfully seeded complete Ice Cream Factory dummy data!');
