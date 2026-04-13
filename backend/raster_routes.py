"""
Raster & geospatial routes:
  GET /api/raster-bounds              → geographic bounds of TIFs
  GET /api/raster-image?var=n&depth=5 → PNG colormap overlay for Leaflet
  GET /api/voronoi?depth=5            → GeoJSON Voronoi polygons
  GET /api/location-properties?lat=&lon= → layer data from DB or TIF interpolation
"""

import io
import os
import numpy as np
import rasterio
import shapefile as pyshp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

from flask import Blueprint, jsonify, request, send_file

geo_bp = Blueprint('geo', __name__, url_prefix='/api')

DATA_DIR  = os.path.join(os.path.dirname(__file__), '..', 'data')
RASTER_DIR = os.path.join(DATA_DIR, 'rasters')
SHP_DIR    = os.path.join(DATA_DIR, 'shapefiles')

DEPTHS = [5, 10, 15, 20]

COLORMAPS = {
    'n': 'plasma',
    'c': 'YlOrRd',
    'u': 'Blues',
}

VARIABLE_LABELS = {
    'n': 'N-Value',
    'c': 'Cohesion (kPa)',
    'u': 'Unit Weight (kN/m³)',
}


def _tif_path(var: str, depth: int) -> str:
    return os.path.join(RASTER_DIR, f'{var}-{depth}.tif')


def _sample_tif(var: str, depth: int, lat: float, lon: float):
    """Return the raster value at (lat, lon) or None if outside / nodata."""
    path = _tif_path(var, depth)
    if not os.path.exists(path):
        return None
    try:
        with rasterio.open(path) as src:
            row, col = src.index(lon, lat)
            if row < 0 or col < 0 or row >= src.height or col >= src.width:
                return None
            val = src.read(1)[row, col]
            if src.nodata is not None and float(val) == float(src.nodata):
                return None
            return round(float(val), 3)
    except Exception:
        return None


# -----------------------------------------------------------------------
# Bounds
# -----------------------------------------------------------------------

@geo_bp.get('/raster-bounds')
def raster_bounds():
    path = _tif_path('n', 5)
    with rasterio.open(path) as src:
        b = src.bounds
    return jsonify({
        'success': True,
        'data': {
            'west': b.left, 'east': b.right,
            'south': b.bottom, 'north': b.top,
            'center_lat': (b.top + b.bottom) / 2,
            'center_lon': (b.left + b.right) / 2,
        }
    })


# -----------------------------------------------------------------------
# Raster image overlay (PNG)
# -----------------------------------------------------------------------

@geo_bp.get('/raster-image')
def raster_image():
    var   = request.args.get('var', 'n')
    depth = request.args.get('depth', 5, type=int)

    if var not in COLORMAPS or depth not in DEPTHS:
        return jsonify({'success': False, 'error': 'Invalid var or depth'}), 400

    path = _tif_path(var, depth)
    if not os.path.exists(path):
        return jsonify({'success': False, 'error': 'TIF file not found'}), 404

    with rasterio.open(path) as src:
        data = src.read(1).astype(float)
        nodata = src.nodata
        if nodata is not None:
            mask = data == nodata
        else:
            mask = np.zeros(data.shape, dtype=bool)

    # Replace nodata with nan for colormap
    data[mask] = np.nan
    valid = data[~np.isnan(data)]
    if valid.size == 0:
        return jsonify({'success': False, 'error': 'No valid data'}), 404

    vmin, vmax = float(np.nanpercentile(data, 2)), float(np.nanpercentile(data, 98))

    cmap = plt.get_cmap(COLORMAPS[var]).copy()
    cmap.set_bad(alpha=0)

    norm = mcolors.Normalize(vmin=vmin, vmax=vmax)
    rgba = cmap(norm(data))   # shape (H, W, 4)
    # Set mask pixels fully transparent
    rgba[mask, 3] = 0.0

    rgba_uint8 = (rgba * 255).astype(np.uint8)

    from PIL import Image
    img = Image.fromarray(rgba_uint8, mode='RGBA')

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)

    return send_file(buf, mimetype='image/png')


# -----------------------------------------------------------------------
# Voronoi GeoJSON
# -----------------------------------------------------------------------

@geo_bp.get('/voronoi')
def voronoi_geojson():
    depth = request.args.get('depth', 5, type=int)
    if depth not in DEPTHS:
        depth = 5

    shp_path = os.path.join(SHP_DIR, f'Voronoi polygons {depth}.shp')
    if not os.path.exists(shp_path):
        return jsonify({'success': False, 'error': 'Shapefile not found'}), 404

    sf = pyshp.Reader(shp_path)
    fields = [f[0] for f in sf.fields[1:]]  # skip deletion flag

    features = []
    for sr in sf.shapeRecords():
        props = dict(zip(fields, sr.record))
        # Normalise key names
        props_clean = {
            'northing':      props.get('Northing ('),
            'easting':       props.get('Easting (L'),
            'borehole_no':   props.get('Borehole N'),
            'sample_no':     props.get('Sample No'),
            'depth':         props.get('Depth'),
            'n_value':       props.get('N Value'),
            'uscs':          str(props.get('USCS Class', '')).strip(),
            'cohesion':      props.get('Cohesion ('),
            'unit_weight':   props.get('Unit Weigh'),
            'report_no':     props.get('Report No'),
        }
        geom = sr.shape.__geo_interface__
        features.append({
            'type': 'Feature',
            'geometry': geom,
            'properties': props_clean,
        })

    return jsonify({
        'success': True,
        'data': {
            'type': 'FeatureCollection',
            'features': features,
        }
    })


# -----------------------------------------------------------------------
# Location properties (DB or TIF fallback)
# -----------------------------------------------------------------------

@geo_bp.get('/location-properties')
def location_properties():
    """
    Returns soil layer properties at (lat, lon).
    Priority: database → TIF interpolation
    """
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    if lat is None or lon is None:
        return jsonify({'success': False, 'error': 'lat and lon required'}), 400

    # --- 1. Try database (0.001° ≈ 110 m tolerance) ---
    from models import db, GeotechnicalData
    tolerance = 0.001
    rows = GeotechnicalData.query.filter(
        GeotechnicalData.latitude.between(lat - tolerance, lat + tolerance),
        GeotechnicalData.longitude.between(lon - tolerance, lon + tolerance),
    ).order_by(GeotechnicalData.depth).all()

    if rows:
        from collections import defaultdict, Counter
        # Aggregate multiple rows at the same depth by averaging numeric values
        depth_groups: dict = defaultdict(list)
        for r in rows:
            depth_groups[round(float(r.depth), 1)].append(r)

        layers = []
        for depth_key in sorted(depth_groups.keys()):
            grp = depth_groups[depth_key]
            layers.append({
                'depth': depth_key,
                'n_value': round(sum(r.n_value for r in grp) / len(grp), 1),
                'cohesion': round(sum(float(r.cohesion) for r in grp) / len(grp), 2),
                'unit_weight': round(sum(float(r.unit_weight) for r in grp) / len(grp), 2),
                'uscs': Counter(r.uscs_classification.strip() for r in grp).most_common(1)[0][0],
            })

        uscs_counter = Counter(l['uscs'] for l in layers)
        dominant_uscs = uscs_counter.most_common(1)[0][0]
        return jsonify({
            'success': True,
            'data': {
                'source': 'database',
                'layers': layers,
                'uscs': dominant_uscs,
                'sample_count': len(rows),
            }
        })

    # --- 2. TIF interpolation ---
    tif_layers = []
    for d in DEPTHS:
        n  = _sample_tif('n', d, lat, lon)
        c  = _sample_tif('c', d, lat, lon)
        uw = _sample_tif('u', d, lat, lon)
        if n is not None and c is not None and uw is not None:
            tif_layers.append({
                'depth':       d,
                'n_value':     round(n, 2),
                'cohesion':    round(c, 2),
                'unit_weight': round(uw, 2),
                'uscs':        '',   # TIF doesn't carry USCS; user can set manually
            })

    if not tif_layers:
        return jsonify({
            'success': False,
            'error': 'Location outside coverage area. Please enter values manually.'
        }), 404

    # Try to get USCS from Voronoi at depth 5
    dominant_uscs = _voronoi_uscs(lat, lon)

    return jsonify({
        'success': True,
        'data': {
            'source': 'interpolation',
            'layers': tif_layers,
            'uscs': dominant_uscs or '',
            'sample_count': 0,
        }
    })


def _voronoi_uscs(lat: float, lon: float) -> str | None:
    """Find which Voronoi polygon (depth=5) the point falls in, return its USCS."""
    shp_path = os.path.join(SHP_DIR, 'Voronoi polygons 5.shp')
    if not os.path.exists(shp_path):
        return None
    try:
        sf = pyshp.Reader(shp_path)
        fields = [f[0] for f in sf.fields[1:]]
        uscs_field_idx = None
        for i, f in enumerate(fields):
            if 'USCS' in str(f).upper():
                uscs_field_idx = i
                break
        if uscs_field_idx is None:
            return None

        from shapely.geometry import Point, shape as shapely_shape
        pt = Point(lon, lat)  # Note: shapely expects (x=lon, y=lat)
        for sr in sf.shapeRecords():
            try:
                poly = shapely_shape(sr.shape.__geo_interface__)
                if poly.contains(pt):
                    return str(sr.record[uscs_field_idx]).strip()
            except Exception:
                continue
    except Exception:
        return None
    return None
