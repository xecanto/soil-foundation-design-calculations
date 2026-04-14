# Geotechnical Dashboard — FYDP

**Site-Specific Digitized Foundation Design Recommendations based upon AI-driven Geotechnical Sub-soil Characterization of Islamabad Region**

Hassan Iliyas · Islamabad Zone 4 · 459 borehole samples · 82 reports · 81 sites

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui, Recharts, Leaflet |
| Backend | Flask 3, SQLAlchemy, rasterio, pyshp |
| Database | PostgreSQL 16 |

---

## Prerequisites

### All platforms
- **Python 3.10+** — https://www.python.org/downloads/
- **Node.js 18+** — https://nodejs.org/
- **PostgreSQL 16** — https://www.postgresql.org/download/

### Windows extra step
After installing PostgreSQL, make sure `psql` and `pg_dump` are on your PATH:
```
C:\Program Files\PostgreSQL\16\bin
```
Add that to System Environment Variables → Path.

---

## 1. Clone the repository

```bash
git clone https://github.com/xecanto/soil-foundation-design-calculations.git
cd soil-foundation-design-calculations
```

---

## 2. Restore the database

Open **pgAdmin** or a terminal and run:

```bash
# Create the database
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE geotechnical_db;"

# Restore the backup
psql -U postgres -h 127.0.0.1 -d geotechnical_db -f data/geotechnical_db_backup.sql
```

> **Windows tip:** If it asks for a password, enter `postgres` (default). If you used a different password during PostgreSQL install, update `backend/.env` accordingly.

---

## 3. Configure the backend

Edit `backend/.env` (already included):

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost/geotechnical_db
FLASK_ENV=development
FLASK_DEBUG=1
PORT=5000
```

Change `postgres:postgres` to `your_user:your_password` if needed.

---

## 4. Run the Flask backend

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate it:
# Linux / macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```

Flask will start at **http://localhost:5000**

Verify it's working:
```
http://localhost:5000/health        → {"status": "ok"}
http://localhost:5000/api/stats     → sample counts
```

---

## 5. Run the Next.js dashboard

Open a **new terminal**:

```bash
cd dashboard

npm install
npm run dev
```

Dashboard will open at **http://localhost:3000**

---

## 6. Project structure

```
soil-foundation-design-calculations/
├── backend/
│   ├── app.py               # Flask app factory
│   ├── routes.py            # REST API endpoints
│   ├── raster_routes.py     # TIF raster + Voronoi endpoints
│   ├── models.py            # SQLAlchemy models
│   ├── seed_data.py         # DB seeder (already done via backup)
│   ├── requirements.txt
│   └── .env                 # DB connection config
│
├── dashboard/
│   └── src/
│       ├── app/             # Next.js App Router
│       ├── components/
│       │   ├── charts/      # Recharts components
│       │   ├── dashboard/   # Tab panels (Overview, Depth, Map, etc.)
│       │   └── ui/          # shadcn/ui primitives
│       ├── lib/api.ts       # fetch wrapper
│       └── types/index.ts   # TypeScript interfaces
│
├── data/
│   ├── rasters/             # n/c/u-{5,10,15,20}.tif
│   ├── shapefiles/          # Voronoi polygons per depth
│   ├── csv/                 # Raw borehole reports
│   └── geotechnical_db_backup.sql
│
├── qgis/                    # QGIS project file
└── foundation_engine_v2.3.txt
```

---

## 7. Dashboard tabs

| Tab | Content |
|---|---|
| Overview | Stats cards, N-value histogram, cohesion distribution, scatter plot |
| Depth Analysis | SPT N-value profile, cohesion vs depth, unit weight profiles |
| Soil Classification | Pie chart, radar chart, bar charts, USCS summary table |
| Geographic | Interactive map of borehole locations with hover stats |
| Data Table | Paginated & filterable table of all 459 records |
| Foundation Design | Click map → auto-fill soil layers → Terzaghi calculation with full breakdown |

---

## 8. API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/stats` | Dashboard summary stats |
| GET | `/api/data` | All records (filterable, paginated) |
| GET | `/api/soil-types` | USCS classification distribution |
| GET | `/api/depth-profiles` | Avg N/cohesion/unit weight by depth |
| GET | `/api/locations` | Unique borehole locations with stats |
| GET | `/api/raster-bounds` | TIF spatial extent |
| GET | `/api/raster-image?var=n&depth=5` | Rendered PNG raster overlay |
| GET | `/api/voronoi?depth=5` | Voronoi GeoJSON for depth |
| GET | `/api/location-properties?lat=&lon=` | DB or TIF interpolated soil values |
| POST | `/api/foundation-design` | Terzaghi bearing capacity calculation |

