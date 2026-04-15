# Architecture

## System Overview

The repository is split into two runtime applications plus shared data assets:

- `backend/`: Flask API for records, statistics, geospatial lookups, and foundation calculations.
- `dashboard/`: Next.js frontend for visualization, interaction, and report generation.
- `data/`: PostgreSQL backup, raster layers, shapefiles, and CSV inputs used by the backend.

The system supports two major use cases:

- data exploration across reports, boreholes, depths, and mapped locations,
- map-driven shallow foundation sizing using geotechnical layer data.

## High-Level Flow

1. The dashboard loads summary and analysis datasets from the Flask API.
2. Users navigate tabs for overview, depth analysis, classification, geography, table browsing, and design.
3. In the foundation workflow, the selected map point is resolved against either database-backed samples or interpolated raster coverage.
4. The backend computes footing iterations for both Terzaghi and General Bearing Capacity methods.
5. The frontend renders results and can export a portrait PDF report from the returned payload.

## Frontend Architecture

### Framework and UI

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS 4
- Radix UI primitives through local `ui/` components
- Recharts for analytical charts
- Leaflet and react-leaflet for map interaction

### Frontend Structure

- `src/app/`: App shell, landing-first dashboard entry, global styling, layout metadata.
- `src/components/charts/`: visualization components used by the analytical tabs.
- `src/components/dashboard/`: tab panels, map picker, foundation workflow, and result sections.
- `src/components/ui/`: local reusable UI primitives.
- `src/lib/api.ts`: fetch helpers for backend communication.
- `src/lib/foundation-report/`: modular PDF generation utilities.
- `src/types/`: shared frontend data contracts.

### Frontend Design Direction

The first screen was redesigned to behave as a landing-first interface instead of dropping users directly into a dense analysis workspace. The current entry experience emphasizes:

- orientation to the platform,
- credibility through project summary metrics,
- direct action into foundation design,
- lighter editorial framing before analytical detail.

## Backend Architecture

### Framework and Libraries

- Flask 3
- Flask-CORS
- Flask-SQLAlchemy
- SQLAlchemy 2
- PostgreSQL
- rasterio, numpy, matplotlib, Pillow, pyshp, shapely for geospatial support

### Backend Structure

- `app.py`: app factory, extension wiring, blueprint registration, health endpoint.
- `config.py`: centralized configuration loading through environment variables.
- `models.py`: SQLAlchemy models for geotechnical records and Terzaghi bearing factors.
- `routes.py`: dashboard metrics and foundation design logic.
- `raster_routes.py`: raster bounds, raster overlays, Voronoi GeoJSON, and location property fallback.
- `seed_data.py`: import and initialization helper for loading the database.

### Data Sources Used By Backend

- PostgreSQL `geotechnical_data` table for sampled layer records.
- PostgreSQL `terzaghi_factors` table for Terzaghi factor lookup.
- `General Bearing Capacity.csv` for general bearing factor interpolation.
- `data/rasters/` for interpolated N-value, cohesion, and unit weight layers.
- `data/shapefiles/` for Voronoi boundary visualization.

## Core Engineering Modules

### Analytical Dashboard

The analytics side of the system consumes read-only data endpoints to populate:

- top-level project stats,
- histograms,
- scatter plots,
- depth-based profiles,
- soil distribution charts,
- geographic context panels,
- raw tabular inspection.

### Foundation Design Engine

The design engine combines frontend flow control with backend iteration logic.

Core capabilities include:

- database-backed or interpolated layer acquisition,
- manual entry fallback outside coverage,
- weighted average cohesion, unit weight, and friction angle by design depth,
- Terzaghi bearing capacity iterations,
- General Bearing Capacity iterations,
- footing width range enforcement from 3 ft to 20 ft,
- result comparison rendered in separate sections.

### Report Generation

The report system is implemented in `dashboard/src/lib/foundation-report/` and is intentionally split by concern:

- `index.ts`: public entry and lazy loading of PDF libraries.
- `types.ts`: internal report payload types.
- `theme.ts`: page constants and visual tokens.
- `assets.ts`: brand and decorative helpers.
- `cover-page.ts`: cover page composition.
- `method-page.ts`: method-specific pages for Terzaghi and General results.

This keeps the initial dashboard bundle smaller while preserving a richer PDF output.

## Data Flow Boundaries

### Read Flows

- Dashboard tabs fetch project summaries and chart datasets from `/api/*` endpoints.
- Map surfaces request raster bounds, overlay images, Voronoi polygons, and location property resolution.

### Calculation Flows

- The frontend sends location, structural load, and normalized layers to `/api/foundation-design`.
- The backend responds with two result arrays: `terzaghi_results` and `general_results`.
- The frontend renders both sets and uses them again for PDF generation.

## Key Design Decisions

- Environment variables are loaded centrally through `backend/config.py`.
- Raster fallback is used only when the database does not contain nearby sampled layers.
- Groundwater depth is a user-facing reporting field in the manual path and does not currently modify calculation output.
- Report generation is client-side and lazy-loaded to avoid shipping PDF libraries in the initial bundle.
- The foundation design surface is workflow-driven instead of being a plain form.