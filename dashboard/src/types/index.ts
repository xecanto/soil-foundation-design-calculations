export interface GeotechnicalRecord {
  id: number
  latitude: number
  longitude: number
  borehole_no: number
  sample_no: string
  depth: number
  n_value: number
  uscs_classification: string
  cohesion: number
  unit_weight: number
  report_no: number
  friction_angle: number
}

export interface Stats {
  total_samples: number
  total_reports: number
  unique_locations: number
  unique_boreholes: number
  avg_n_value: number
  avg_cohesion: number
  max_depth: number
  min_n_value: number
  max_n_value: number
}

export interface LocationStat {
  latitude: number
  longitude: number
  report_no: number
  sample_count: number
  avg_n: number
  min_n: number
  max_n: number
  avg_cohesion: number
  avg_unit_weight: number
  max_depth: number
  soil_types: string[]
}

export interface SoilType {
  uscs_classification: string
  type?: string  // legacy alias
  count: number
  avg_n: number
  avg_cohesion: number
  avg_unit_weight: number
}

export interface DepthProfile {
  depth: number
  avg_n: number
  min_n: number
  max_n: number
  avg_cohesion: number
  avg_unit_weight: number
  count: number
}

export interface HistogramBucket {
  range: string
  count: number
}

export interface ScatterPoint {
  n_value: number
  cohesion: number
  uscs: string
  depth: number
}

export interface FoundationResult {
  iteration: number
  H_ft: number
  H_m: number
  B_ft: number
  B_m: number
  H_over_B: number
  gamma_avg: number
  c_avg: number
  Q_surcharge: number
  qu_kPa: number
  qa_kPa: number
  Nc: number
  Nq: number
  N_gamma: number
  phi: number
  layer_no: number
  shape_c?: number
  shape_q?: number
  shape_gamma?: number
  depth_c?: number
  depth_q?: number
  depth_gamma?: number
  inclination_c?: number
  inclination_q?: number
  inclination_gamma?: number
}

export interface FoundationDesignResponse {
  results: FoundationResult[]
  terzaghi_results: FoundationResult[]
  general_results: FoundationResult[]
  structural_load: number
}

export interface SoilLayer {
  depth: number
  n_value: number
  cohesion: number
  unit_weight: number
  uscs: string
  friction_angle?: number
}

export interface LocationProperties {
  source: 'database' | 'interpolation'
  layers: SoilLayer[]
  uscs: string
  sample_count: number
}

export interface RasterBounds {
  west: number
  east: number
  south: number
  north: number
  center_lat: number
  center_lon: number
}
