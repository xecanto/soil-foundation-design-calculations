import math
from flask import Blueprint, jsonify, request
from sqlalchemy import func, distinct
from models import db, GeotechnicalData, TerzaghiFactor

api = Blueprint('api', __name__, url_prefix='/api')

# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------

def _ok(data):
    return jsonify({'success': True, 'data': data})


def _err(msg, code=400):
    return jsonify({'success': False, 'error': msg}), code


def _get_terzaghi(phi: int):
    """Return Nc, Nq, N_gamma for given friction angle (clamped to table range)."""
    phi = max(0, min(48, int(phi)))
    factor = TerzaghiFactor.query.filter_by(friction_angle=phi).first()
    if factor:
        return float(factor.nc), float(factor.nq), float(factor.n_gamma)
    return 5.7, 1.0, 0.0


# -----------------------------------------------------------------------
# Dashboard / stats endpoints
# -----------------------------------------------------------------------

@api.get('/stats')
def get_stats():
    total_samples = GeotechnicalData.query.count()
    total_reports = db.session.query(
        func.count(distinct(GeotechnicalData.report_no))
    ).scalar()
    unique_locations = db.session.query(
        func.count(distinct(
            func.concat(
                func.cast(GeotechnicalData.latitude, db.String),
                ',',
                func.cast(GeotechnicalData.longitude, db.String)
            )
        ))
    ).scalar()
    avg_n = db.session.query(func.avg(GeotechnicalData.n_value)).scalar()
    avg_cohesion = db.session.query(func.avg(GeotechnicalData.cohesion)).scalar()
    max_depth = db.session.query(func.max(GeotechnicalData.depth)).scalar()
    min_n = db.session.query(func.min(GeotechnicalData.n_value)).scalar()
    max_n = db.session.query(func.max(GeotechnicalData.n_value)).scalar()
    unique_boreholes = db.session.query(
        func.count(distinct(GeotechnicalData.borehole_no))
    ).scalar()

    return _ok({
        'total_samples': total_samples,
        'total_reports': total_reports,
        'unique_locations': unique_locations,
        'unique_boreholes': unique_boreholes,
        'avg_n_value': round(float(avg_n), 2) if avg_n else 0,
        'avg_cohesion': round(float(avg_cohesion), 2) if avg_cohesion else 0,
        'max_depth': float(max_depth) if max_depth else 0,
        'min_n_value': int(min_n) if min_n else 0,
        'max_n_value': int(max_n) if max_n else 0,
    })


@api.get('/data')
def get_data():
    """Return all records with optional filters."""
    uscs = request.args.get('uscs')
    report = request.args.get('report_no', type=int)
    min_depth = request.args.get('min_depth', type=float)
    max_depth = request.args.get('max_depth', type=float)
    limit = request.args.get('limit', 1000, type=int)
    offset = request.args.get('offset', 0, type=int)
    total = GeotechnicalData.query.count()

    q = GeotechnicalData.query
    if uscs:
        q = q.filter(GeotechnicalData.uscs_classification.ilike(f'%{uscs}%'))
    if report:
        q = q.filter_by(report_no=report)
    if min_depth is not None:
        q = q.filter(GeotechnicalData.depth >= min_depth)
    if max_depth is not None:
        q = q.filter(GeotechnicalData.depth <= max_depth)
    rows = q.order_by(
        GeotechnicalData.latitude,
        GeotechnicalData.longitude,
        GeotechnicalData.borehole_no,
        GeotechnicalData.depth,
    ).offset(offset).limit(limit).all()
    # re-count with filters applied
    total = q.count()
    return _ok({'records': [r.to_dict() for r in rows], 'total': total})


@api.get('/locations')
def get_locations():
    """Unique lat/lon with aggregate stats per location."""
    rows = db.session.query(
        GeotechnicalData.latitude,
        GeotechnicalData.longitude,
        func.count(GeotechnicalData.id).label('sample_count'),
        func.avg(GeotechnicalData.n_value).label('avg_n'),
        func.min(GeotechnicalData.n_value).label('min_n'),
        func.max(GeotechnicalData.n_value).label('max_n'),
        func.avg(GeotechnicalData.cohesion).label('avg_cohesion'),
        func.avg(GeotechnicalData.unit_weight).label('avg_unit_weight'),
        func.max(GeotechnicalData.depth).label('max_depth'),
    ).group_by(
        GeotechnicalData.latitude,
        GeotechnicalData.longitude,
    ).all()

    # soil types per location (separate query)
    from sqlalchemy import distinct as sa_distinct
    soil_rows = db.session.query(
        GeotechnicalData.latitude,
        GeotechnicalData.longitude,
        func.trim(GeotechnicalData.uscs_classification).label('uscs'),
    ).distinct().all()
    soil_map: dict = {}
    for sr in soil_rows:
        key = (float(sr.latitude), float(sr.longitude))
        soil_map.setdefault(key, []).append(sr.uscs)

    return _ok([
        {
            'latitude': float(r.latitude),
            'longitude': float(r.longitude),
            'sample_count': r.sample_count,
            'avg_n': round(float(r.avg_n), 2),
            'min_n': int(r.min_n),
            'max_n': int(r.max_n),
            'avg_cohesion': round(float(r.avg_cohesion), 2),
            'avg_unit_weight': round(float(r.avg_unit_weight), 2),
            'max_depth': float(r.max_depth),
            'soil_types': soil_map.get((float(r.latitude), float(r.longitude)), []),
        }
        for r in rows
    ])


@api.get('/soil-types')
def get_soil_types():
    """Distribution of USCS classifications (normalized)."""
    rows = db.session.query(
        func.trim(GeotechnicalData.uscs_classification).label('uscs_classification'),
        func.count(GeotechnicalData.id).label('count'),
        func.avg(GeotechnicalData.n_value).label('avg_n'),
        func.avg(GeotechnicalData.cohesion).label('avg_cohesion'),
        func.avg(GeotechnicalData.unit_weight).label('avg_unit_weight'),
    ).group_by(func.trim(GeotechnicalData.uscs_classification)).all()

    return _ok([
        {
            'uscs_classification': r.uscs_classification,
            'count': r.count,
            'avg_n': round(float(r.avg_n), 2),
            'avg_cohesion': round(float(r.avg_cohesion), 2),
            'avg_unit_weight': round(float(r.avg_unit_weight), 2),
        }
        for r in rows
    ])


@api.get('/depth-profiles')
def get_depth_profiles():
    """Aggregate N value and cohesion by depth across all locations."""
    rows = db.session.query(
        GeotechnicalData.depth,
        func.avg(GeotechnicalData.n_value).label('avg_n'),
        func.min(GeotechnicalData.n_value).label('min_n'),
        func.max(GeotechnicalData.n_value).label('max_n'),
        func.avg(GeotechnicalData.cohesion).label('avg_cohesion'),
        func.avg(GeotechnicalData.unit_weight).label('avg_unit_weight'),
        func.count(GeotechnicalData.id).label('count'),
    ).group_by(GeotechnicalData.depth).order_by(GeotechnicalData.depth).all()

    return _ok([
        {
            'depth': float(r.depth),
            'avg_n': round(float(r.avg_n), 2),
            'min_n': int(r.min_n),
            'max_n': int(r.max_n),
            'avg_cohesion': round(float(r.avg_cohesion), 2),
            'avg_unit_weight': round(float(r.avg_unit_weight), 2),
            'count': r.count,
        }
        for r in rows
    ])


@api.get('/n-value-histogram')
def get_n_histogram():
    """N value distribution in buckets."""
    ranges = [(0, 5), (5, 10), (10, 15), (15, 20), (20, 30), (30, 40), (40, 50), (50, 60)]
    result = []
    for lo, hi in ranges:
        count = GeotechnicalData.query.filter(
            GeotechnicalData.n_value >= lo,
            GeotechnicalData.n_value < hi,
        ).count()
        result.append({'range': f'{lo}-{hi}', 'count': count, 'lo': lo, 'hi': hi})
    return _ok(result)


@api.get('/cohesion-histogram')
def get_cohesion_histogram():
    """Cohesion distribution in buckets."""
    ranges = [(0, 10), (10, 20), (20, 30), (30, 40), (40, 50), (50, 60), (60, 80), (80, 200)]
    result = []
    for lo, hi in ranges:
        count = GeotechnicalData.query.filter(
            GeotechnicalData.cohesion >= lo,
            GeotechnicalData.cohesion < hi,
        ).count()
        result.append({'range': f'{lo}-{hi}', 'count': count})
    return _ok(result)


@api.get('/borehole-comparison')
def get_borehole_comparison():
    """Per-borehole stats for a specific location."""
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    report_no = request.args.get('report_no', type=int)

    if lat is None or lon is None:
        return _err('lat and lon required')

    q = GeotechnicalData.query.filter(
        func.abs(GeotechnicalData.latitude - lat) < 0.0001,
        func.abs(GeotechnicalData.longitude - lon) < 0.0001,
    )
    if report_no:
        q = q.filter_by(report_no=report_no)

    rows = q.order_by(GeotechnicalData.borehole_no, GeotechnicalData.depth).all()
    return _ok([r.to_dict() for r in rows])


@api.get('/scatter')
def get_scatter():
    """N Value vs Cohesion scatter data."""
    rows = GeotechnicalData.query.with_entities(
        GeotechnicalData.n_value,
        GeotechnicalData.cohesion,
        func.trim(GeotechnicalData.uscs_classification).label('uscs'),
        GeotechnicalData.depth,
    ).all()
    return _ok([
        {'n_value': r.n_value, 'cohesion': float(r.cohesion),
         'uscs': r.uscs, 'depth': float(r.depth)}
        for r in rows
    ])


@api.get('/reports')
def get_reports():
    rows = db.session.query(
        distinct(GeotechnicalData.report_no)
    ).order_by(GeotechnicalData.report_no).all()
    return _ok([r[0] for r in rows])


@api.get('/terzaghi-factors')
def get_terzaghi_factors():
    rows = TerzaghiFactor.query.order_by(TerzaghiFactor.friction_angle).all()
    return _ok([r.to_dict() for r in rows])


# -----------------------------------------------------------------------
# Foundation Design Calculation
# -----------------------------------------------------------------------

FT_TO_M = 0.3048  # 1 ft in metres (depth conversions for Q = γ*H)


@api.post('/foundation-design')
def foundation_design():
    body = request.get_json(force=True)

    lat = body.get('latitude')
    lon = body.get('longitude')
    structural_load = body.get('structural_load')  # kN
    layers_input = body.get('layers')  # optional, for User#2
    friction_angle_input = body.get('friction_angle', 0)

    if lat is None or lon is None or structural_load is None:
        return _err('latitude, longitude and structural_load are required')

    # Decide User#1 or User#2
    if layers_input:
        # User#2 – use supplied layers directly
        layers = layers_input  # list of {depth, cohesion, unit_weight, friction_angle, uscs}
        phi = float(layers[0].get('friction_angle', friction_angle_input))
    else:
        # User#1 – pull from DB (nearest location using Voronoi-like lookup)
        tolerance = 0.001
        rows = GeotechnicalData.query.filter(
            GeotechnicalData.latitude.between(lat - tolerance, lat + tolerance),
            GeotechnicalData.longitude.between(lon - tolerance, lon + tolerance),
        ).order_by(GeotechnicalData.depth).all()

        if not rows:
            return _err('Location not found in database. Please provide layer data.', 404)

        layers = [
            {
                'depth': float(r.depth),
                'cohesion': float(r.cohesion),
                'unit_weight': float(r.unit_weight),
                'uscs': r.uscs_classification.strip(),
            }
            for r in rows
        ]
        phi = 0  # User#1 always φ=0

    # Get Terzaghi bearing factors
    Nc, Nq, N_gamma = _get_terzaghi(int(phi))
    q_kN = float(structural_load)

    H_values = [3, 5, 7, 9, 11, 13, 15, 17, 19]  # ft

    results = []

    for H in H_values:
        # Convert depth increments to ft (data depth is in ft already per spec)
        # Identify which layer H falls in
        depths = [l['depth'] for l in layers]  # cumulative depth markers in ft

        # Build layer segments: each layer has a thickness
        # The depths in data are cumulative (e.g. 5, 10, 15 → thicknesses 5, 5, 5)
        # We treat depth values as cumulative
        sorted_layers = sorted(layers, key=lambda x: x['depth'])

        layer_idx = None
        for i, layer in enumerate(sorted_layers):
            if H <= layer['depth']:
                layer_idx = i
                break
        if layer_idx is None:
            layer_idx = len(sorted_layers) - 1

        # Compute weighted averages up to H
        gamma_num = 0.0
        c_num = 0.0
        denom = 0.0

        for i, layer in enumerate(sorted_layers[:layer_idx + 1]):
            prev_depth = sorted_layers[i - 1]['depth'] if i > 0 else 0
            if i < layer_idx:
                thickness = layer['depth'] - prev_depth
            else:
                thickness = H - prev_depth
            gamma_num += layer['unit_weight'] * thickness
            c_num += layer['cohesion'] * thickness
            denom += thickness

        gamma_avg = gamma_num / denom if denom else sorted_layers[0]['unit_weight']
        c_avg = c_num / denom if denom else sorted_layers[0]['cohesion']

        # Q surcharge (kN/m²) = γavg × H (ft → m for kN/m²)
        H_m = H * FT_TO_M
        Q_surcharge = gamma_avg * H_m

        # Terzaghi eq: qu = 1.3*c*Nc + Q*Nq + 0.4*γ*B*N_gamma  [kN/m²]
        # Structural: qu = (q_kN * 3) / B²  → two equations equal → solve for B
        # q_kN*3 / B² = 1.3*c*Nc + Q*Nq + 0.4*γ*B*Nγ
        # 0.4*γ*Nγ * B³ + (1.3*c*Nc + Q*Nq) * B² - 3*q_kN = 0
        A_coeff = 0.4 * gamma_avg * N_gamma
        B_coeff = 1.3 * c_avg * Nc + Q_surcharge * Nq
        C_val = -3.0 * q_kN

        # Solve cubic: A*B³ + B_coeff*B² + C_val = 0
        B_sol = _solve_cubic_for_B(A_coeff, B_coeff, C_val)

        if B_sol is None or B_sol <= 0:
            continue

        # Convert B from metres to feet
        B_ft = B_sol / FT_TO_M

        # Apply design checks — only reject impractical / unstable cases
        if H / B_ft > 4:
            continue

        qu = B_coeff + A_coeff * B_sol  # kN/m²
        qa = qu / 3.0  # Factor of safety 3

        results.append({
            'iteration': H_values.index(H) + 1,
            'H_ft': H,
            'H_m': round(H_m, 3),
            'B_ft': round(B_ft, 3),
            'B_m': round(B_sol, 3),
            'H_over_B': round(H / B_ft, 3),
            'gamma_avg': round(gamma_avg, 3),
            'c_avg': round(c_avg, 3),
            'Q_surcharge': round(Q_surcharge, 3),
            'qu_kPa': round(qu, 2),
            'qa_kPa': round(qa, 2),
            'Nc': Nc,
            'Nq': Nq,
            'N_gamma': N_gamma,
            'phi': phi,
            'layer_no': layer_idx + 1,
        })

    if not results:
        return _err('No valid foundation design found for the given parameters.', 422)

    return _ok({
        'results': results,
        'phi': phi,
        'Nc': Nc,
        'Nq': Nq,
        'N_gamma': N_gamma,
        'structural_load': q_kN,
    })


def _solve_cubic_for_B(a: float, b: float, c_val: float) -> float | None:
    """
    Solve: a*B³ + b*B² + c_val = 0  for positive real root.
    If a ≈ 0 (N_gamma ≈ 0), reduces to quadratic: b*B² + c_val = 0.
    Uses numerical Newton-Raphson method.
    """
    if abs(a) < 1e-9:
        # Quadratic: b*B² = -c_val
        if b <= 0 or -c_val <= 0:
            return None
        return math.sqrt(-c_val / b)

    # Newton-Raphson starting from B=2m
    B = 2.0
    for _ in range(200):
        f = a * B**3 + b * B**2 + c_val
        fp = 3 * a * B**2 + 2 * b * B
        if abs(fp) < 1e-12:
            break
        B_new = B - f / fp
        if abs(B_new - B) < 1e-8:
            return B_new if B_new > 0 else None
        B = B_new
    return B if B > 0 else None
