from flask import Flask
from flask_cors import CORS
import os


# Import routes
from routes.upload import upload_bp
from routes.color import color_bp
from routes.transform import transform_bp
from routes.enhancement import enhancement_bp
from routes.restoration import restoration_bp
#from routes.enhancement import enhancement_bp

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


# Run server
if __name__ == '__main__':
    app.run(debug=True)