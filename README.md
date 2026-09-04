# NEXUS RetailIQ: AI-Powered Sales & Inventory Copilot

> **Hackathon Track**: PS03 — Retail Sales and Inventory Copilot  
> **Tagline**: Turn retail data into today's decisions.  
> **Core Principle**: *Every claim is backed by actual data, calculations and assumptions. When the available data is insufficient, the system does not guess.*

---

## 1. Project Overview & Problem Statement (PS03)

### The Problem
A store manager's data is rich, but their daily decisions are rushed. Critical operating signals are buried across disparate point-of-sale (POS) registers, daily spreadsheets, and inventory ledgers. Store managers frequently face:
* **Premature Stock-Outs**: Fast-moving consumer goods (FMCG) deplete without warning, causing immediate revenue loss and customer dissatisfaction.
* **Locked Working Capital**: Overstocked and slow-moving inventory occupies premium shelf space without turning over.
* **Unnoticed Demand Anomalies**: Unexpected sales spikes or sudden drop-offs pass by without immediate operational intervention.
* **Opaque AI Hallucinations**: Standard LLM dashboards fabricate numbers or guess figures when historical data is absent or ambiguous.

### The Solution: NEXUS RetailIQ
**NEXUS RetailIQ** is an AI-powered sales and inventory copilot built specifically for small-to-medium retail businesses. It continuously analyzes point-of-sale transactions and stock positions across multiple store locations, executes deterministic retail formulas, detects anomalies, forecasts stock-outs, and offers a natural-language copilot with **100% mathematical explainability ("Why?" drilldown)**.

```
USER NATURAL LANGUAGE QUESTION
              ↓
  Intent Detection & Entity Scoping
              ↓
  Firestore / POS Ledger Retrieval
              ↓
  Deterministic Backend Calculations (Formulas, Days Remaining, Anomalies)
              ↓
  Structured Verified Data Payload
              ↓
  Google Gemini AI Interpretation (Strict JSON Schema)
              ↓
  Numerical Consistency Validation
              ↓
  Explainable Answer + Numbers + Evidence + Assumptions + "Why?" Breakdown
```

---

## 2. Key Capabilities & Features

### 1. Executive Dashboard ("Needs Attention Today")
* **Real-time Business Health**: Today's revenue, units sold, low-stock count, stock-out risks, slow movers, and active system alerts with period-over-period percentage comparisons.
* **Priority Operational Queue**: Highlights pressing stockout risks, slumping products, and surging items with immediate suggested actions.
* **Interactive Mathematical Explainability ("Why?")**: Every alert and recommendation features a clickable "Why?" button revealing raw ledger inputs, exact formulas, decision boundaries, and business assumptions.

### 2. Deterministic Stock-Out Forecaster
* **Runway Formula**:
  $$\text{Days Remaining} = \frac{\text{Current Stock}}{\text{Average Daily Sales (7-Day Moving Average)}}$$
* **Threshold Alert**: Flags critical risk whenever projected depletion horizon $\le$ supplier lead time.
* Shows current stock, daily sales velocity, lead time buffer, safety stock, and dynamic target reorder levels.

### 3. Dynamic Reorder Point Engine
* **Formula**:
  $$\text{Reorder Point} = (\text{Average Daily Sales} \times \text{Supplier Lead Time}) + \text{Safety Stock}$$
* **Target Reorder Quantity**:
  $$\text{Reorder Quantity} = \max(\text{Minimum Batch}, \text{Target Stock} - \text{Current Stock})$$
  Where $\text{Target Stock} = \text{Average Daily Sales} \times (\text{Lead Time} + \text{Review Period}) + \text{Safety Stock}$.

### 4. Overstock & Slow-Moving Inventory Detection
* **Excess Stock Detection**: Flags items where stock runway exceeds 45 days of forward demand or exceeds double the optimal target stock, quantifying the exact working capital locked in inventory.
* **Slow-Mover Identification**: Detects products holding $\ge 25$ units in inventory with fewer than 6 units sold across the trailing 30 days.
* **Actionable Prescriptions**: Recommends promotional bundles, rebalancing to higher-turnover branches, or pausing future purchase orders.

### 5. Sales Spike & Drop Anomaly Detection
* Evaluates today's POS checkouts against the trailing 7-day moving average baseline:
  $$\text{Deviation \%} = \left(\frac{\text{Today's Sales} - \text{7-Day Baseline}}{\text{7-Day Baseline}}\right) \times 100$$
* **Surge (+30% or higher)**: Triggers floor replenishment alerts to avert midday stock exhaustion.
* **Drop (-30% or lower)**: Recommends inspecting shelf display visibility, checking for missing price tags, or verifying competitor discounting.

### 6. Multi-Store Intelligence & Benchmarking
* Compares branch performance across Dharapuram Main, Coimbatore Central, and Erode Market.
* Compares revenue, units sold, gross margin, inventory valuation, and stockout counts.
* Supports scoping the entire dashboard and Copilot to an individual branch or consolidated chain view.

### 7. AI Copilot (Strictly Data-Grounded)
* **Natural-Language Understanding**: Interprets manager queries ("What should I reorder today?", "Which products are not moving?", "Compare all stores").
* **Zero Hallucination Guarantee**: The AI model is strictly prohibited from inventing figures. All answers are grounded in calculated metrics.
* **Insufficient Data Transparency**: When a query asks for information outside the dataset (e.g., "What were sales during Diwali last year?"), the system explicitly declines to guess: *"I cannot answer this reliably because the available POS dataset covers only the trailing 90-day operating history."*

---

## 3. Technology Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React Icons, React Router DOM.
* **Charts & Visualizations**: Recharts (Responsive Area Charts, Bar Charts, Donut Category Split).
* **Data Layer**: Dual-mode persistence architecture:
  * **Google Cloud Firestore**: Real-time cloud sync, batched writes, and live data collections.
  * **Reactive Local Storage Engine**: Instant, zero-latency in-memory and local repository allowing full testing out-of-the-box without requiring API keys.
* **AI Engine**: Google Gemini API via server-side secure proxy with deterministic fallback templates.
* **Utilities**: `date-fns`, native CSV schema validation engine.

---

## 4. Firestore Data Model

### Collections Structure

```
stores/
  └── {storeId}
        ├── id: string
        ├── name: string
        ├── location: string
        ├── managerId: string
        ├── status: 'active' | 'inactive'
        └── createdAt: timestamp

products/
  └── {productId}
        ├── id: string
        ├── name: string
        ├── category: 'Dairy' | 'Beverages' | 'Snacks' | 'Grocery' | 'Personal Care' | 'Household' | 'Stationery'
        ├── sku: string
        ├── sellingPrice: number
        ├── costPrice: number
        ├── supplier: string
        ├── leadTimeDays: number
        ├── safetyStock: number
        ├── reorderQuantity: number
        ├── status: 'active'
        └── createdAt: timestamp

sales/
  └── {saleId}
        ├── id: string
        ├── date: string (YYYY-MM-DD)
        ├── storeId: string
        ├── productId: string
        ├── quantity: number
        ├── revenue: number
        ├── unitPrice: number
        └── createdAt: timestamp

inventory/
  └── {inventoryId}
        ├── id: string
        ├── date: string (YYYY-MM-DD)
        ├── storeId: string
        ├── productId: string
        ├── quantity: number
        └── updatedAt: timestamp

alerts/
  └── {alertId}
        ├── id: string
        ├── type: 'STOCK_OUT' | 'LOW_STOCK' | 'OVERSTOCK' | 'SLOW_MOVING' | 'SALES_SPIKE' | 'SALES_DROP'
        ├── severity: 'CRITICAL' | 'WARNING' | 'INFO'
        ├── storeId: string
        ├── productId: string
        ├── title: string
        ├── description: string
        ├── metrics: object
        ├── recommendation: string
        ├── assumptions: string[]
        └── status: 'active' | 'reviewed' | 'dismissed'
```

---

## 5. Built-in Hackathon Demo Scenarios

The included demo generator seeds **3 stores, 24 realistic Indian FMCG products, and 90 days of synthetic transactions** crafted for testing:

1. **Scenario 1: Imminent Stock-Out**
   * *Aavin Milk 1L* at Dharapuram Main has 18 units in stock with an 8.6 unit/day velocity (runway = 2.1 days, below 2-day lead time).
2. **Scenario 2: Excessive Overstock**
   * *Fortune Sunflower Oil 1L* holds 185 units with 2.3 units/day velocity (~80 days of forward runway, locking up over ₹22,000).
3. **Scenario 3: Slow-Moving SKU**
   * *Heritage Cow Ghee 500ml* holds 42 units with only 3 sales across 30 days.
4. **Scenario 4: Sales Spike Surge**
   * *Parle-G Glucose Biscuits 800g* surges by +120% above the 7-day moving average baseline.
5. **Scenario 5: Sales Slump Drop**
   * *Thums Up 750ml* experiences a sudden -55% drop against baseline demand.
6. **Scenario 6: Cross-Store Divergence**
   * Coimbatore Central outperforms Erode Market by 2.3x revenue, revealing inventory rebalancing opportunities.
7. **Scenario 7: Insufficient Data Handling**
   * Queries regarding prior-year Diwali sales explicitly trigger the boundary notice without hallucinated figures.

---

## 6. Installation & Local Development

### Prerequisites
* Node.js (v18 or v20+)
* npm (v9+)

### Setup Steps
```bash
# 1. Clone repository
git clone https://github.com/sabeeshvar/NEXUS-RetailIQ.git
cd NEXUS-RetailIQ

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Configure environment variables (Optional)
cp .env.example .env

# 4. Start local development server
npm run dev
```

The application will launch at `http://localhost:5173/`.

### Production Build
```bash
npm run build
npm run preview
```

---

## 7. Environment Variables (`.env.example`)

```env
# Firebase Web Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Google Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Security Note**: No secret keys are hardcoded in the client bundle. If `.env` is omitted, the application runs in local reactive mode and provides a runtime key field in the Settings view for evaluation.

---

## 8. 3-Minute Hackathon Demo Flow for Judges

1. **Launch Dashboard**:
   * Review top KPI summary cards (Today's Revenue, Units Sold, Stock-out Risks, Low Stock, Slow Movers, Alerts).
2. **Inspect "Needs Attention Today"**:
   * Identify *Aavin Milk 1L* flagged under **STOCK-OUT RISK** (2.1 days remaining).
3. **Click "Why?" Button**:
   * Review the explainability modal: ground truth ledger inputs, $18 \div 8.6 = 2.09$ days formula, decision threshold, and safety stock assumptions.
4. **Open RetailIQ Copilot**:
   * Click the prompt pill: *"What should I reorder today?"*
   * Observe the verified numerical breakdown, suggested quantities, and confidence tag.
5. **Test Anomaly & Slow-Mover Questions**:
   * Ask: *"Which products are not moving?"* $\rightarrow$ Returns *Heritage Ghee* with 42 units holding and 30-day velocity.
   * Ask: *"Show me today's sales spikes."* $\rightarrow$ Returns *Parle-G* surge (+120%).
6. **Test the Insufficient Data Boundary**:
   * Click prompt pill: *"What were sales during Diwali last year?"*
   * Observe the refusal: *"I cannot answer this reliably because the available dataset covers only the trailing 90-day operating history. I can evaluate recent 7-day velocity instead."*
7. **Multi-Store Comparison**:
   * Navigate to **Stores** to inspect branch benchmarking between Dharapuram Main, Coimbatore Central, and Erode Market.
8. **Data Ingestion**:
   * Navigate to **Data Import** to test CSV upload validation or reset the demo scenario.

---

## 9. License & Team

Built for the **PS03 Retail Sales and Inventory Copilot Hackathon**.
Developed by **Sabeeshvar** and team.
