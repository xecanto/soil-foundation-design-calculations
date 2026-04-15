# Geotechnical Dashboard Documentation

This folder documents the dashboard, backend services, engineering workflows, and development setup for the Geotechnical Dashboard project.

## Documentation Map

- [architecture.md](./architecture.md): system architecture, module boundaries, data flow, and core design decisions.
- [dashboard-workflows.md](./dashboard-workflows.md): end-user dashboard flows, tab behavior, and the guided foundation design workflow.
- [backend-api.md](./backend-api.md): backend endpoints, request and response expectations, and calculation-specific notes.
- [development.md](./development.md): local development setup, commands, dataset assets, and repository conventions.

## Project Summary

The application is a site-specific geotechnical analysis and shallow foundation design dashboard focused on the Islamabad Zone 4 dataset. It combines:

- a Flask API for geotechnical records, spatial interpolation, and foundation sizing,
- a Next.js dashboard for analysis and design workflows,
- PostgreSQL-backed borehole data,
- raster and shapefile assets for map overlays and interpolated regional fallback,
- client-side PDF report generation for design outputs.

## What The System Covers

- Borehole and report-level geotechnical exploration.
- Soil classification and depth-based analytics.
- Spatial browsing of borehole coverage and interpolated regions.
- Guided shallow foundation design using Terzaghi and General Bearing Capacity methods.
- PDF export of design outputs with branded multi-page reporting.

## Recommended Reading Order

1. Start with [architecture.md](./architecture.md) for the high-level picture.
2. Read [dashboard-workflows.md](./dashboard-workflows.md) for the user journey.
3. Use [backend-api.md](./backend-api.md) when working on integrations or debugging payloads.
4. Use [development.md](./development.md) when setting up the repo or maintaining assets.