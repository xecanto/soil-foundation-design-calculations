from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class GeotechnicalData(db.Model):
    __tablename__ = 'geotechnical_data'

    id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Numeric(15, 10), nullable=False)
    longitude = db.Column(db.Numeric(15, 10), nullable=False)
    borehole_no = db.Column(db.Integer, nullable=False)
    sample_no = db.Column(db.String(10), nullable=False)
    depth = db.Column(db.Numeric(8, 2), nullable=False)
    n_value = db.Column(db.Integer, nullable=False)
    uscs_classification = db.Column(db.String(60), nullable=False)
    cohesion = db.Column(db.Numeric(8, 2), nullable=False)
    unit_weight = db.Column(db.Numeric(8, 2), nullable=False)
    report_no = db.Column(db.Integer, nullable=False)
    friction_angle = db.Column(db.Numeric(8, 2), default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'latitude': float(self.latitude),
            'longitude': float(self.longitude),
            'borehole_no': self.borehole_no,
            'sample_no': self.sample_no,
            'depth': float(self.depth),
            'n_value': self.n_value,
            'uscs_classification': self.uscs_classification.strip(),
            'cohesion': float(self.cohesion),
            'unit_weight': float(self.unit_weight),
            'report_no': self.report_no,
            'friction_angle': float(self.friction_angle) if self.friction_angle else 0,
        }


class TerzaghiFactor(db.Model):
    __tablename__ = 'terzaghi_factors'

    id = db.Column(db.Integer, primary_key=True)
    friction_angle = db.Column(db.Integer, nullable=False, unique=True)
    nc = db.Column(db.Numeric(10, 4), nullable=False)
    nq = db.Column(db.Numeric(10, 4), nullable=False)
    n_gamma = db.Column(db.Numeric(10, 4), nullable=False)

    def to_dict(self):
        return {
            'friction_angle': self.friction_angle,
            'Nc': float(self.nc),
            'Nq': float(self.nq),
            'N_gamma': float(self.n_gamma),
        }
