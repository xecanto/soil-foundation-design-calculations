# Development Guide

## Repository Layout

Top-level directories:

- `backend/`: Flask service and engineering logic.
- `dashboard/`: Next.js dashboard application.
- `data/`: database backup plus spatial assets.
- `qgis/`: QGIS project assets.

## Tech Stack

### Frontend

- Next.js 14.2
- React 18.3
- TypeScript 6
- Tailwind CSS 4
- Recharts
- Leaflet and react-leaflet
- jsPDF and jspdf-autotable for report generation

### Backend

- Flask 3
- Flask-SQLAlchemy
- SQLAlchemy 2
- Flask-CORS
- psycopg2-binary
- rasterio
- numpy
- matplotlib
- Pillow
- pyshp
- shapely

### Database

- PostgreSQL 16

## Environment Configuration

Backend configuration is centralized in `backend/config.py` and primarily uses `backend/.env`.

Current backend variables:

- `DATABASE_URL`
- `FLASK_ENV`
- `FLASK_DEBUG`
- `PORT`

## Local Setup

### Database

Create and restore the project database:

```bash
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE geotechnical_db;"
psql -U postgres -h 127.0.0.1 -d geotechnical_db -f data/geotechnical_db_backup.sql
```

### Backend

Create a single virtual environment at the repo root or inside `backend/`, then install requirements.

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd dashboard
npm install
npm run dev
```

## Useful Commands

### Frontend

- `npm run dev`: start the dashboard locally.
- `npm run build`: verify production compilation.
- `npm run start`: run the built application.

### Backend

- `python app.py`: start the Flask API.

## Data Assets

### Database backup

- canonical backup: `data/geotechnical_db_backup.sql`
- additional timestamped backups may be stored alongside it.

### Raster assets

Files in `data/rasters/` are used for interpolated regional fallback by variable and depth.

Naming pattern:

- `n-{depth}.tif`
- `c-{depth}.tif`
- `u-{depth}.tif`

### Shapefiles

Files in `data/shapefiles/` support map visualization, especially Voronoi region output by depth.

### CSV assets

- `General Bearing Capacity.csv`: lookup source for General Bearing Capacity factors.
- `data/csv/`: raw report-oriented source material.

## Development Conventions

- Keep backend configuration centralized rather than calling environment lookup functions across the codebase.
- Preserve the split between dashboard visualization code and engineering calculation logic.
- Keep report-generation code modular under `dashboard/src/lib/foundation-report/`.
- Prefer adding new API behavior under existing blueprint boundaries rather than growing `app.py`.
- Treat raster fallback as a secondary source after nearby database samples.

## Operational Notes

- The frontend expects the backend at `http://localhost:5000` during local development.
- The dashboard is build-validated through `next build`.
- The repository remote is configured for GitHub over SSH.

## Suggested Future Documentation Updates

- Add example request and response JSON for the calculation endpoint.
- Add screenshots for each dashboard tab.
- Add a release checklist for data refreshes and backup rotation.