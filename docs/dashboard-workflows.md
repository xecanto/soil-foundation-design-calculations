# Dashboard Workflows

## Dashboard Entry Experience

The dashboard opens with a landing-first surface instead of dropping immediately into heavy charts. The first screen is designed to do three things quickly:

- explain what the platform is for,
- expose project-level metrics,
- send the user into a targeted workflow.

Primary calls to action:

- `Start Foundation Design`
- `Explore Ground Data`
- quick-action cards for design, overview, geographic inspection, and raw data browsing.

## Top-Level Tabs

The main workspace is organized into six tabs.

### Overview

Purpose:

- give a fast operational summary of the dataset,
- surface aggregate trends without requiring filtering first.

Typical content:

- project stats cards,
- N-value histogram,
- cohesion distribution,
- scatter-based relationship views.

### Depth Analysis

Purpose:

- compare how key soil properties behave by depth.

Typical content:

- depth profiles for N-value,
- cohesion and unit-weight trends,
- profile-oriented comparisons across sampled depths.

### Soil Classification

Purpose:

- summarize the material composition of the dataset.

Typical content:

- USCS distribution,
- radar and bar chart summaries,
- classification-oriented breakdowns.

### Geographic

Purpose:

- connect the analytics to spatial context.

Typical content:

- borehole map view,
- location comparisons,
- regional context for sampled points.

### Data Table

Purpose:

- inspect the raw records behind all visual summaries.

Typical content:

- paginated and filterable tabular records,
- direct browsing of borehole depth entries.

### Foundation Design

Purpose:

- move from location selection to shallow foundation sizing.

This is the most guided workflow in the application.

## Foundation Design Workflow

## Step 1: Select project location

The workflow starts with a modal that requires the user to select a point on the map.

System behavior:

- if the point is inside the sampled database region, nearby layers are auto-filled,
- if the point falls only inside the interpolated region, interpolated layers are used,
- if the point is outside both, the workflow switches to manual mode.

Coverage states shown in the UI:

- `Database data`
- `Interpolated region`
- `Manual entry required`

## Step 2: Branch by coverage mode

### Database or interpolated path

Behavior:

- the user is prompted for structural load first,
- after load is entered, the editable input table becomes visible,
- soil values are prefilled and can still be reviewed or refined,
- groundwater display is shown as `No water table encountered` for in-coverage flows.

### Manual path

Behavior:

- the table remains empty,
- the user must enter all layer values manually,
- friction angle is required for every manual layer,
- the UI reminds the user to use submerged unit weight below the water table and dry unit weight above it,
- after all rows are complete, the workflow prompts for structural load and groundwater table depth.

## Step 3: Build the layer table

The layer table supports:

- adding rows,
- removing rows,
- editing depth, N-value, cohesion, unit weight, USCS, and when required friction angle.

Manual mode requires a valid friction angle for each row because the backend now uses weighted friction angle in the bearing-factor lookup flow.

## Step 4: Run calculations

When required values are present, the user runs the calculation action.

The frontend posts:

- latitude,
- longitude,
- structural load,
- normalized layer array.

The backend returns:

- `terzaghi_results`
- `general_results`

## Step 5: Review results

The result surface is split into two engineering sections instead of a single combined table.

### Terzaghi section

Shows:

- iterative footing results,
- weighted friction-angle effect by depth,
- method-specific chart and tabular output.

### General Bearing Capacity section

Shows:

- iterative footing results based on the General Bearing Capacity table,
- shape, depth, and inclination factor-driven output,
- parallel chart and table presentation.

## Step 6: Generate report

After results are present, the user can generate a geotechnical report PDF.

Current report characteristics:

- portrait format,
- branded first page,
- separate page for Terzaghi results,
- separate page for General Bearing Capacity results,
- generated client-side.

## Workflow Intent

The foundation designer is built to reduce input mistakes by controlling the order of operations:

- location first,
- coverage detection second,
- load and layer completion next,
- engineering results after validation,
- report export only after a completed run.