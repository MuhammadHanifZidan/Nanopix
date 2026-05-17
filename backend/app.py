from flask import Flask
from flask_cors import CORS
import os


# Import routes
from routes.upload import upload_bp
from routes.color import color_bp
from routes.transform import transform_bp
from routes.enhancement import enhancement_bp
from routes.restoration import restoration_bp
from routes.edge import edge_bp
from routes.color_processing import color_processing_bp
from routes.segmentation import segmentation_bp
from routes.compression import compression_bp
from routes.histogram import histogram_bp

# Init app
app = Flask(__name__)

# Enable CORS
CORS(app)

# Config folder
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['PROCESSED_FOLDER'] = 'processed'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # max 16MB

# Register blueprint
app.register_blueprint(upload_bp)
app.register_blueprint(color_bp)
app.register_blueprint(transform_bp)
app.register_blueprint(enhancement_bp)
app.register_blueprint(restoration_bp)
app.register_blueprint(edge_bp)
app.register_blueprint(color_processing_bp)
app.register_blueprint(segmentation_bp)
app.register_blueprint(compression_bp)
app.register_blueprint(histogram_bp)

# Run server
if __name__ == '__main__':
    app.run(debug=True)