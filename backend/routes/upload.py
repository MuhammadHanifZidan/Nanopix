from flask import Blueprint, request, jsonify, send_from_directory
import os
import uuid

upload_bp = Blueprint('upload', __name__)

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'bmp'}

def allowed_file(filename):
    # cek apakah ekstensi file ada di whitelist
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_old_files():
    """Fungsi untuk menghapus semua file lama di folder uploads dan processed"""
    folders_to_clean = ['uploads', 'processed']
    
    for folder in folders_to_clean:
        if not os.path.exists(folder):
            continue
            
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            try:
                # Pastikan yang dihapus hanya file, bukan folder
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"[ERR] Gagal menghapus {file_path}: {e}")

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

    # 4. --- PRUNE: Bersihkan file-file lama sebelum menyimpan file baru ---
    cleanup_old_files()

    # 5. Pastikan folder tujuan tersedia
    os.makedirs('uploads', exist_ok=True)
    os.makedirs('processed', exist_ok=True)

    # 6. simpan file
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"  # nama unik biar ga tabrakan
    save_path = os.path.join('uploads', unique_filename)
    file.save(save_path)

    return jsonify({
        'message': 'Upload berhasil dan file lama telah dibersihkan',
        'filename': unique_filename
    }), 200

@upload_bp.route('/api/image/<filename>', methods=['GET'])
def get_image(filename):
    # Cek dulu di folder processed, kalau tidak ada baru cari di uploads
    if os.path.exists(os.path.join('processed', filename)):
        return send_from_directory('processed', filename)
    return send_from_directory('uploads', filename)