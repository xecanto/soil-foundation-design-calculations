import os
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000'])

    db.init_app(app)

    with app.app_context():
        db.create_all()

    from routes import api
    app.register_blueprint(api)

    from raster_routes import geo_bp
    app.register_blueprint(geo_bp)

    @app.get('/health')
    def health():
        return {'status': 'ok', 'service': 'geotechnical-api'}

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
