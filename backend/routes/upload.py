from flask import Blueprint, request, jsonify
import os
import uuid
from flask import send_from_directory
upload_bp = Blueprint('upload', __name__)

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'bmp'}

def allowed_file(filename):
    # cek apakah ekstensi file ada di whitelist
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@upload_bp.route('/api/upload', methods=['POST'])
def upload_image():
    # 1. cek apakah ada file di request
    if 'file' not in request.files:
        return jsonify({'error': 'Tidak ada file yang dikirim'}), 400

    file = request.files['file']

    # 2. cek apakah user beneran milih file
    if file.filename == '':
        return jsonify({'error': 'Tidak ada file yang dipilih'}), 400

    # 3. validasi ekstensi
    if not allowed_file(file.filename):
        return jsonify({'error': 'Format file tidak didukung. Gunakan JPG, PNG, atau BMP'}), 400

    # 4. simpan file
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"  # nama unik biar ga tabrakan
    save_path = os.path.join('uploads', unique_filename)
    file.save(save_path)

    return jsonify({
        'message': 'Upload berhasil',
        'filename': unique_filename
    }), 200

@upload_bp.route('/api/image/<filename>', methods=['GET'])
def get_image(filename):
    # Cek dulu di folder processed, kalau tidak ada baru cari di uploads
    if os.path.exists(os.path.join('processed', filename)):
        return send_from_directory('processed', filename)
    return send_from_directory('uploads', filename)