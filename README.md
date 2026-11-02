# Delicious Ice Cream Factory - Hasanabdal

A complete desktop management application built with **Electron** and **SQLite (better-sqlite3)** designed specifically for ice cream factory operations, inventory pipelines, delivery vehicle management, shop khata, and A5 paper billing/reporting.

---

## 🏭 5-Stage Ice Cream Factory Workflow

1. **Stage 1: Raw Materials Stock Management**
   - Track bulk ingredients (Milk, Sugar, Cocoa, Sticks, Wrappers, Flavors).
   - Records stock-in purchases, consumption logs, and left-behind stock alerts.

2. **Stage 2: Single Items Production (Loose Pieces Pool)**
   - Produce individual pieces (Chocbar, Ice Loly, Kulfi, Cones) with calculated making costs and retail prices.
   - Raw materials are automatically deducted from factory inventory based on production batches.

3. **Stage 3: Carton Packing (Sellable Inventory Stock)**
   - Pack loose pieces into sellable wholesale cartons (e.g., 20 pieces per carton).
   - Set carton cost and sale price; track warehouse inventory vs. loaded stock.

4. **Stage 4: Car Loading & Dispatch Gate Passes**
   - Load packed cartons into delivery vehicles (Suzuki Bolan, Shehzore, Loader Rickshaw).
   - Generates official A5 Gate Passes and maintains live stock balances loaded in each vehicle.

5. **Stage 5: Shop Deliveries, Completed Sales & Returns**
   - Dispatch drivers deliver cartons to shops/bakeries/superstores.
   - Handles partial deliveries & returns: return cartons can stay in the car for the next stop or move back into warehouse stock.
   - Records cash collected and updates shop khata/credit balances.

---

## 📄 A5 Paper Format Documents & Reports
- **Official Delivery Invoices & Bills**
- **Shop Khata Account Statements & Cash Receipt Vouchers**
- **Vehicle Dispatch Gate Passes & Loaded Stock Sheets**
- **Production Pool & Raw Materials Stock Reports**
- **Interactive Print Preview Modal** before printing with standard A5 formatting (148 x 210 mm).

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm

### Installation
```bash
# Clone repository
git clone https://github.com/SalikLeo/Delicious-Icecream-Factory---Hasanabdal.git

# Install dependencies
npm install

# Run the app in development
npm start
```

### Build Executable (Windows)
```bash
npm run dist
```

---

## 🛠 Tech Stack
- **Desktop Framework**: Electron
- **Database**: SQLite with `better-sqlite3`
- **UI & Styling**: HTML5, Tailwind CSS, Lucide Icons, JsBarcode
- **Print Engine**: Electron Printing with A5 Print Stylesheet
