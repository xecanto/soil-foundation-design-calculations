import csv
import math
import os
from functools import lru_cache
from flask import Blueprint, jsonify, request
from sqlalchemy import func, distinct
from models import db, GeotechnicalData, TerzaghiFactor

api = Blueprint('api', __name__, url_prefix='/api')

GENERAL_BEARING_CSV = os.path.join(
    os.path.dirname(__file__), '..', 'General Bearing Capacity.csv'
)
B_MIN_FT = 3.0
B_MAX_FT = 20.0
B_MIN_M = B_MIN_FT * 0.3048
B_MAX_M = B_MAX_FT * 0.3048
B_OVER_L = 1.0

# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------

def _ok(data):
    return jsonify({'success': True, 'data': data})


def _err(msg, code=400):
    return jsonify({'success': False, 'error': msg}), code


def _interpolate_triplet(phi: float, lower_phi: int, upper_phi: int, lower_values: tuple[float, float, float], upper_values: tuple[float, float, float]):
    if lower_phi == upper_phi:
        return lower_values

    ratio = (phi - lower_phi) / (upper_phi - lower_phi)
    return tuple(
        lower + (upper - lower) * ratio
        for lower, upper in zip(lower_values, upper_values)
    )


def _get_terzaghi(phi: float):
    """Return interpolated Nc, Nq, N_gamma for a friction angle."""
    phi = max(0.0, min(48.0, float(phi)))
    lower_phi = int(math.floor(phi))
    upper_phi = int(math.ceil(phi))

    lower = TerzaghiFactor.query.filter_by(friction_angle=lower_phi).first()
    upper = TerzaghiFactor.query.filter_by(friction_angle=upper_phi).first()

    lower_values = (
        float(lower.nc) if lower else 5.7,
        float(lower.nq) if lower else 1.0,
        float(lower.n_gamma) if lower else 0.0,
    )
    upper_values = (
        float(upper.nc) if upper else lower_values[0],
        float(upper.nq) if upper else lower_values[1],
        float(upper.n_gamma) if upper else lower_values[2],
    )

    return _interpolate_triplet(phi, lower_phi, upper_phi, lower_values, upper_values)


@lru_cache(maxsize=1)
def _load_general_factors():
    rows: dict[int, tuple[float, float, float]] = {}
    with open(GENERAL_BEARING_CSV, newline='', encoding='utf-8-sig') as csvfile:
      reader = csv.reader(csvfile)
      next(reader, None)
      for raw_row in reader:
          if len(raw_row) < 4:
              continue
          phi = int(float(raw_row[0]))
          rows[phi] = (
              float(raw_row[1]),
              float(raw_row[2]),
              float(raw_row[3]),
          )
    return rows


def _get_general_bearing(phi: float):
    """Return interpolated Nc, Nq, Ny for the General Bearing Capacity table."""
    table = _load_general_factors()
    min_phi = min(table.keys())
    max_phi = max(table.keys())
    phi = max(float(min_phi), min(float(max_phi), float(phi)))
    lower_phi = int(math.floor(phi))
    upper_phi = int(math.ceil(phi))
    lower_values = table.get(lower_phi, table[min_phi])
    upper_values = table.get(upper_phi, lower_values)
    return _interpolate_triplet(phi, lower_phi, upper_phi, lower_values, upper_values)


def _get_sorted_layers(lat: float, lon: float, layers_input):
    if layers_input:
        return sorted(layers_input, key=lambda layer: float(layer['depth']))

    tolerance = 0.001
    rows = GeotechnicalData.query.filter(
        GeotechnicalData.latitude.between(lat - tolerance, lat + tolerance),
        GeotechnicalData.longitude.between(lon - tolerance, lon + tolerance),
    ).order_by(GeotechnicalData.depth).all()

    if not rows:
        return None

    return [
        {
            'depth': float(r.depth),
            'cohesion': float(r.cohesion),
            'unit_weight': float(r.unit_weight),
            'uscs': r.uscs_classification.strip(),
            'friction_angle': float(r.friction_angle) if r.friction_angle else 0.0,
        }
        for r in rows
    ]


def _weighted_layer_properties(sorted_layers, H_ft: float):
    layer_idx = None
    for i, layer in enumerate(sorted_layers):
        if H_ft <= float(layer['depth']):
            layer_idx = i
            break
    if layer_idx is None:
        layer_idx = len(sorted_layers) - 1

    gamma_num = 0.0
    c_num = 0.0
    phi_num = 0.0
    denom = 0.0

    for i, layer in enumerate(sorted_layers[:layer_idx + 1]):
        prev_depth = float(sorted_layers[i - 1]['depth']) if i > 0 else 0.0
        current_depth = float(layer['depth'])
        thickness = current_depth - prev_depth if i < layer_idx else H_ft - prev_depth
        gamma_num += float(layer['unit_weight']) * thickness
        c_num += float(layer['cohesion']) * thickness
        phi_num += float(layer.get('friction_angle') or 0.0) * thickness
        denom += thickness

    gamma_avg = gamma_num / denom if denom else float(sorted_layers[0]['unit_weight'])
    c_avg = c_num / denom if denom else float(sorted_layers[0]['cohesion'])
    phi_avg = phi_num / denom if denom else float(sorted_layers[0].get('friction_angle') or 0.0)

    return gamma_avg, c_avg, phi_avg, layer_idx + 1


def _general_depth_factors(phi_rad: float, Nc: float, H_over_B: float):
    modifier = H_over_B if H_over_B <= 1 else math.atan(H_over_B)
    if abs(phi_rad) < 1e-9:
        dc = 1 + 0.4 * modifier
        dq = 1.0
    else:
        dq = 1 + 2 * math.tan(phi_rad) * ((1 - math.sin(phi_rad)) ** 2) * modifier
        denominator = Nc * math.tan(phi_rad)
        dc = dq - ((1 - dq) / denominator) if abs(denominator) > 1e-9 else dq
    dgamma = 1.0
    return dc, dq, dgamma


def _general_shape_factors(phi_rad: float, Nc: float, Nq: float):
    sc = 1 + B_OVER_L * (Nq / Nc) if abs(Nc) > 1e-9 else 1.0
    sq = 1 + B_OVER_L * math.tan(phi_rad)
    sgamma = 1 - 0.4 * B_OVER_L
    return sc, sq, sgamma


def _general_qu(B_m: float, H_m: float, gamma_avg: float, c_avg: float, phi_deg: float, Nc: float, Nq: float, N_gamma: float):
    phi_rad = math.radians(phi_deg)
    H_over_B = H_m / B_m if B_m > 0 else 0.0
    sc, sq, sgamma = _general_shape_factors(phi_rad, Nc, Nq)
    dc, dq, dgamma = _general_depth_factors(phi_rad, Nc, H_over_B)
    ic = iq = igamma = 1.0
    surcharge = gamma_avg * H_m
    qu = (
        c_avg * Nc * sc * dc * ic
        + surcharge * Nq * sq * dq * iq
        + 0.5 * gamma_avg * B_m * N_gamma * sgamma * dgamma * igamma
    )
    return qu, surcharge, {
        'sc': sc,
        'sq': sq,
        's_gamma': sgamma,
        'dc': dc,
        'dq': dq,
        'd_gamma': dgamma,
        'ic': ic,
        'iq': iq,
        'i_gamma': igamma,
    }


def _solve_general_for_B(structural_load: float, H_m: float, gamma_avg: float, c_avg: float, phi_deg: float, Nc: float, Nq: float, N_gamma: float):
    def diff(B_m: float):
        qu, _, _ = _general_qu(B_m, H_m, gamma_avg, c_avg, phi_deg, Nc, Nq, N_gamma)
        return qu - (3.0 * structural_load) / (B_m ** 2)

    steps = 300
    previous_B = B_MIN_M
    previous_value = diff(previous_B)
    if abs(previous_value) < 1e-9:
        return previous_B

    for step in range(1, steps + 1):
        current_B = B_MIN_M + (B_MAX_M - B_MIN_M) * (step / steps)
        current_value = diff(current_B)

        if abs(current_value) < 1e-9:
            return current_B

        if previous_value * current_value < 0:
            low, high = previous_B, current_B
            for _ in range(80):
                mid = (low + high) / 2
                mid_value = diff(mid)
                if abs(mid_value) < 1e-8:
                    return mid
                if previous_value * mid_value <= 0:
                    high = mid
                    current_value = mid_value
                else:
                    low = mid
                    previous_value = mid_value
            return (low + high) / 2

        previous_B = current_B
        previous_value = current_value

    return None


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
    if lat is None or lon is None or structural_load is None:
        return _err('latitude, longitude and structural_load are required')

    sorted_layers = _get_sorted_layers(float(lat), float(lon), layers_input)
    if not sorted_layers:
        return _err('Location not found in database. Please provide layer data.', 404)

    q_kN = float(structural_load)

    H_values = [3, 5, 7, 9, 11, 13, 15, 17, 19]  # ft

    terzaghi_results = []
    general_results = []

    for H in H_values:
        gamma_avg, c_avg, phi_avg, layer_no = _weighted_layer_properties(sorted_layers, H)

        H_m = H * FT_TO_M
        Q_surcharge = gamma_avg * H_m
        terzaghi_Nc, terzaghi_Nq, terzaghi_N_gamma = _get_terzaghi(phi_avg)
        general_Nc, general_Nq, general_N_gamma = _get_general_bearing(phi_avg)

        A_coeff = 0.4 * gamma_avg * terzaghi_N_gamma
        B_coeff = 1.3 * c_avg * terzaghi_Nc + Q_surcharge * terzaghi_Nq
        C_val = -3.0 * q_kN
        B_sol = _solve_cubic_for_B(A_coeff, B_coeff, C_val)
        if B_sol is not None and B_sol > 0:
            B_ft = B_sol / FT_TO_M
            if B_MIN_FT <= B_ft <= B_MAX_FT and H / B_ft <= 4:
                qu = B_coeff + A_coeff * B_sol
                qa = qu / 3.0
                terzaghi_results.append({
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
                    'Nc': round(terzaghi_Nc, 3),
                    'Nq': round(terzaghi_Nq, 3),
                    'N_gamma': round(terzaghi_N_gamma, 3),
                    'phi': round(phi_avg, 3),
                    'layer_no': layer_no,
                })

        general_B = _solve_general_for_B(q_kN, H_m, gamma_avg, c_avg, phi_avg, general_Nc, general_Nq, general_N_gamma)
        if general_B is None or general_B <= 0:
            continue

        general_B_ft = general_B / FT_TO_M
        if not (B_MIN_FT <= general_B_ft <= B_MAX_FT) or H / general_B_ft > 4:
            continue

        general_qu, _, factors = _general_qu(general_B, H_m, gamma_avg, c_avg, phi_avg, general_Nc, general_Nq, general_N_gamma)
        general_results.append({
            'iteration': H_values.index(H) + 1,
            'H_ft': H,
            'H_m': round(H_m, 3),
            'B_ft': round(general_B_ft, 3),
            'B_m': round(general_B, 3),
            'H_over_B': round(H / general_B_ft, 3),
            'gamma_avg': round(gamma_avg, 3),
            'c_avg': round(c_avg, 3),
            'Q_surcharge': round(Q_surcharge, 3),
            'qu_kPa': round(general_qu, 2),
            'qa_kPa': round(general_qu / 3.0, 2),
            'Nc': round(general_Nc, 3),
            'Nq': round(general_Nq, 3),
            'N_gamma': round(general_N_gamma, 3),
            'phi': round(phi_avg, 3),
            'layer_no': layer_no,
            'shape_c': round(factors['sc'], 3),
            'shape_q': round(factors['sq'], 3),
            'shape_gamma': round(factors['s_gamma'], 3),
            'depth_c': round(factors['dc'], 3),
            'depth_q': round(factors['dq'], 3),
            'depth_gamma': round(factors['d_gamma'], 3),
            'inclination_c': round(factors['ic'], 3),
            'inclination_q': round(factors['iq'], 3),
            'inclination_gamma': round(factors['i_gamma'], 3),
        })

    if not terzaghi_results and not general_results:
        return _err('No valid foundation design found for the given parameters.', 422)

    return _ok({
        'results': terzaghi_results,
        'terzaghi_results': terzaghi_results,
        'general_results': general_results,
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
