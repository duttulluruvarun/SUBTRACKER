# Autonomous Subscription Analysis & Cost Optimization Engine (SubTracker)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Framework-Streamlit](https://img.shields.io/badge/Framework-Streamlit-FF4B4B.svg)](https://streamlit.io/)
[![Machine Learning-Scikit--Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg)](https://scikit-learn.org/)
[![License-MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Privacy First](https://img.shields.io/badge/Architecture-Privacy--Preserving%20Client--Side-purple.svg)]()

> An autonomous, client-side Machine Learning system that mines raw multi-channel bank and UPI statement streams to detect recurring charges, eliminates "subscription bleed", computes the Subscription Value Index (SVI), and provides predictive cashflow forecasts without third-party cloud credential exposure.

---

## 📌 Executive Summary

Consumers face increasing **"subscription bleed"**—unnoticed financial losses driven by auto-debit recurring payments, unannounced price hikes, forgotten free trials, and low-utility recurring services. Existing commercial platforms depend on hardcoded brand dictionaries, require sharing sensitive banking credentials with cloud aggregators, and provide zero context on whether users actually utilize the subscriptions they pay for.

This project introduces a **privacy-first, unsupervised Machine Learning engine** that:
1. Automatically strips gateway noise from unstructured transaction streams via **Character 3-Gram TF-IDF Vectorization** and **Cosine Similarity grouping**.
2. Identifies recurring billing cycles without labeled training data via **DBSCAN (Density-Based Spatial Clustering of Applications with Noise)** on temporal intervals ($\Delta t$) and price volatility ($\sigma_{\text{amount}}$).
3. Evaluates real utility with the **Subscription Value Index (SVI)** framework to detect "zombie subscriptions" (services paid for but rarely used).
4. Provides real-time hyperparameter sensitivity tuning ($\epsilon$, `min_samples`) and a one-click automated **Kill Switch** action panel.

---

## 🏗️ System Architecture & Methodology

```
   Raw Bank / UPI CSV / Statements
                 │
                 ▼
┌──────────────────────────────────────────────┐
│  Phase 1: NLP Entity Normalization Layer     │
│  • Gateway & Location Noise Stripping        │
│  • Character 3-Gram TF-IDF Vectorization     │
│  • Pairwise Cosine Similarity Clustering     │
└──────────────────────┬───────────────────────┘
                       │ Canonical Merchants
                       ▼
┌──────────────────────────────────────────────┐
│  Phase 2: Unsupervised Spatial Density (ML)  │
│  • Feature Extraction:                       │
│    - Billing Interval Mean (Δt)              │
│    - Amount Volatility (σ_amount)            │
│  • StandardScaler Feature Normalization      │
│  • DBSCAN Clustering (Noise Label = -1)      │
│  • Multi-Cycle Billing Classifier            │
└──────────────────────┬───────────────────────┘
                       │ Valid Recurring Clusters
                       ▼
┌──────────────────────────────────────────────┐
│  Phase 3: Utility & Predictive Risk Engine   │
│  • SVI Calculation: Usage Hours / Cost       │
│  • Zombie Subscription Filter (SVI < 0.05)   │
│  • 30-Day Forward Predictive Cashflow        │
└──────────────────────┬───────────────────────┘
                       │ Actionable Metrics
                       ▼
┌──────────────────────────────────────────────┐
│  Phase 4: Client-Side Dashboard & Control    │
│  • Real-Time Hyperparameter Tuning (ε, MinPts)│
│  • One-Click "Kill Switch" Action Panel      │
│  • Local PBKDF2 Encrypted Vault (Zero Cloud) │
│  • Optional Hybrid GenAI Narrative (Gemini)  │
└──────────────────────────────────────────────┘
```

### 1. NLP Entity Normalization Layer (`NLP_parser.py`)
* Strips noise tokens (e.g., `UPI/`, `POS-`, `RAZORPAY-`, reference IDs, transaction timestamps, and city suffixes).
* Uses **Character 3-gram TF-IDF vectorization** to account for token order permutations and typographical variations.
* Computes pairwise **Cosine Similarity** ($\text{threshold} \ge 0.75$) to map disjoint descriptors (`"POS-NETFLIX-MUMBAI"` vs `"UPI/NETFLIX RECURRING"`) into canonical entities (`"NETFLIX"`).

### 2. Unsupervised Density Clustering Layer (`ml_clustering_engine.py`)
* Extracts two primary spatial dimensions for each canonical merchant:
  * **Average Billing Interval ($\Delta t$):** Mean elapsed days between consecutive payments.
  * **Price Volatility ($\sigma_{\text{amount}}$):** Standard deviation of charge amounts.
* Normalizes features using `StandardScaler` and applies **DBSCAN**:
  $$\text{DBSCAN}(\epsilon, \text{min\_samples})$$
* Classifies non-noise clusters into billing cycles:
  * **Monthly:** $20 \le \Delta t \le 35$ days
  * **Quarterly:** $85 \le \Delta t \le 95$ days
  * **Annual:** $350 \le \Delta t \le 380$ days
* One-time, irregular payments (food orders, ride-hailing) are flagged as noise (`Cluster = -1`) and discarded.

### 3. Subscription Value Index (SVI)
Quantifies whether a subscription provides proportional utility relative to its financial cost:
$$\text{SVI} = \frac{\text{Monthly Active Usage Hours}}{\text{Monthly Recurring Cost}}$$
* **$\text{SVI} < 0.05$:** Flagged as a **Zombie Subscription** (high financial leakage, prime candidate for cancellation).
* **$\text{SVI} \ge 0.05$:** Flagged as **Good Value / High Utility**.

### 4. Privacy-First Local Cryptographic Vault (`vault.py`)
* **PBKDF2-HMAC-SHA256** with 390,000 iterations and per-user 16-byte cryptographic salts.
* Timing-attack mitigation via `secrets.compare_digest`.
* **k-Anonymity Credential Checking:** Queries the *Have I Been Pwned* API using only the first 5 hex characters of the SHA-1 hash, ensuring raw credentials never leave the machine.

---

## 📁 Repository Structure

```text
├── NLP_parser.py              # NLP sanitization, TF-IDF vectorizer & Cosine Similarity
├── app.py                     # Streamlit frontend, DBSCAN mining & interactive controls
├── dataset_generator.py       # Synthetic transaction stream generator with anomaly injection
├── gemini_client.py           # Optional LLM agent for zero-shot categorization & narratives
├── vault.py                   # Local cryptographic auth vault & k-anonymity breach check
├── auth_engine.py             # Magic link & profile session management
├── transactions.csv           # Sample multi-channel bank & UPI statement dataset
├── requirements.txt           # Python dependencies
└── README.md                  # System architecture & documentation
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10 or higher
* `pip` package manager

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

### 2. Create and Activate a Virtual Environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. (Optional) Configure Gemini API Key
For automated narrative generation and zero-shot categorization, create `.streamlit/secrets.toml`:
```toml
GEMINI_API_KEY = "your_google_gemini_api_key_here"
```
*(If omitted, the engine runs completely offline with the local ML pipeline).*

### 5. Launch the Application
```bash
streamlit run app.py
```
Open your browser and navigate to `http://localhost:8501`.

---

## 📊 Dataset & Simulation Engine

If testing without personal bank statements, run the synthetic transaction generator:
```bash
python dataset_generator.py
```
This produces `transactions.csv` simulating:
* **Recurring Subscriptions:** Monthly, annual, and quarterly services with stochastic date noise ($\pm 1$ day) and gateway descriptor variants.
* **Background Spending Noise:** 120+ non-recurring spends (Swiggy, Uber, Amazon, groceries) to evaluate DBSCAN noise rejection.
* **Drift & Price Hike Anomaly:** A deliberate price jump on the latest cycle (e.g., AWS +₹400) to validate anomaly detection.

---

## 🔬 Core Technologies & Libraries

* **Natural Language Processing:** `scikit-learn` (`TfidfVectorizer`, `cosine_similarity`), `re`
* **Unsupervised Machine Learning:** `scikit-learn` (`DBSCAN`, `StandardScaler`)
* **Numerical Computing & Data:** `numpy`, `pandas`
* **Interactive Visualization:** `streamlit`, `plotly`
* **Security & Cryptography:** `hashlib`, `secrets`, `sqlite3`
* **Generative AI (Optional):** `google-genai`

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
