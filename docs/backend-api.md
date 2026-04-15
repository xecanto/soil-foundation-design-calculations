# Backend API

## Base Structure

The backend is a Flask application exposing:

- `/health` for runtime checks,
- `/api/*` for dashboard and design endpoints.

Two blueprints are used:

- `api` from `routes.py` for core statistics and foundation sizing,
- `geo` from `raster_routes.py` for raster and map-related endpoints.

## Health Endpoint

### `GET /health`

Returns a minimal status payload confirming the Flask service is running.

## Dashboard Data Endpoints

### `GET /api/stats`

Returns top-level project summary metrics such as:

- sample count,
- report count,
- unique location count,
- average and min/max indicators.

### `GET /api/data`

Returns tabular geotechnical records for browsing and filtering.

### `GET /api/locations`

Returns location-level aggregates used for map exploration and comparison charts.

### `GET /api/soil-types`

Returns distribution of USCS classifications.

### `GET /api/depth-profiles`

Returns depth-indexed aggregates used by depth-analysis charts.

### `GET /api/n-value-histogram`

Returns the bucketed distribution of N-values.

### `GET /api/cohesion-histogram`

Returns the bucketed distribution of cohesion values.

### `GET /api/borehole-comparison`

Returns a comparative view intended for cross-location or cross-borehole inspection.

### `GET /api/scatter`

Returns scatterplot data used for correlation views.

### `GET /api/reports`

Returns report-level metadata derived from the database.

### `GET /api/terzaghi-factors`

Returns the Terzaghi factor table stored in PostgreSQL.

## Geospatial Endpoints

### `GET /api/raster-bounds`

Returns the bounding box and center point for the raster coverage area.

### `GET /api/raster-image?var=n&depth=5`

Returns a generated PNG overlay for one interpolated raster layer.

Supported variables:

- `n`
- `c`
- `u`

Supported depths:

- `5`, `10`, `15`, `20`

### `GET /api/voronoi?depth=5`

Returns a GeoJSON feature collection built from the depth-specific shapefile.

### `GET /api/location-properties?lat=&lon=`

This endpoint is central to the guided foundation workflow.

Behavior:

- it first searches the database for nearby rows using a coordinate tolerance,
- if rows exist, it aggregates them by depth and returns `source: database`,
- if rows do not exist, it samples raster values at the point and returns `source: interpolation`,
- if neither source is available, it returns an error indicating manual entry is required.

Expected response fields include:

- `source`
- `layers`
- `uscs`
- `sample_count`

## Foundation Design Endpoint

### `POST /api/foundation-design`

This is the engineering calculation endpoint used by the design panel.

Request body contains:

- `latitude`
- `longitude`
- `structural_load`
- `layers`

Each layer can include:

- `depth`
- `n_value`
- `cohesion`
- `unit_weight`
- `uscs`
- `friction_angle`

## Calculation Behavior

The backend performs these major steps:

1. Normalize the layer sequence by depth.
2. Compute weighted averages by design depth for:
   - cohesion,
   - unit weight,
   - friction angle.
3. Interpolate Terzaghi factors from the `terzaghi_factors` table.
4. Interpolate General Bearing Capacity factors from `General Bearing Capacity.csv`.
5. Solve footing iterations for widths within the 3 ft to 20 ft range.
6. Return parallel result arrays for both methods.

## Result Payload Shape

The response includes:

- `terzaghi_results`
- `general_results`

Each result item contains engineering fields such as:

- depth iteration,
- averaged layer properties,
- factor values,
- footing dimensions,
- ultimate and allowable pressure values,
- method-specific factor details for the General method.

## Engineering Notes

- Weighted friction angle is used for manual-layer calculations.
- General Bearing Capacity factors are looked up from the CSV source and interpolated by friction angle.
- Groundwater depth is not part of the backend formula path at this stage; it is preserved for workflow guidance and report output on the frontend.
- The design engine currently targets shallow foundation sizing within a bounded footing-width search range.