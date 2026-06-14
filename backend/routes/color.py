from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid

color_bp = Blueprint('color', __name__)

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'


def load_image(filename):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(path):
        return None
    return cv2.imread(path)


def save_processed(img, ext='jpg'):
    out_filename = f"{uuid.uuid4().hex}.{ext}"
    out_path = os.path.join(PROCESSED_FOLDER, out_filename)
    cv2.imwrite(out_path, img)
    return out_filename


@color_bp.route('/api/process/grayscale', methods=['POST'])
def grayscale():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # simpan sebagai 3 channel biar konsisten waktu di-preview
    gray_3ch = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(gray_3ch, ext)

    return jsonify({
        'message': 'Grayscale berhasil',
        'filename': out_filename
    })


@color_bp.route('/api/process/brightness-contrast', methods=['POST'])
def brightness_contrast():
    data = request.get_json()
    filename = data.get('filename')
    brightness = data.get('brightness', 0)   # range: -100 to 100
    contrast = data.get('contrast', 0)        # range: -100 to 100

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # konversi brightness & contrast ke alpha/beta OpenCV
    # alpha = contrast factor (1.0 = normal)
    # beta  = brightness offset
    alpha = 1 + (contrast / 100.0)   # 0.0 – 2.0
    beta = brightness                  # -100 – 100

    result = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': 'Brightness & contrast berhasil',
        'filename': out_filename
    })


# --- TAMBAHAN FITUR HSV DI SINI ---
@color_bp.route('/api/process/hsv', methods=['POST'])
def hsv_adjustment():
    data = request.get_json()
    filename = data.get('filename')
    
    # Ambil nilai dari frontend (slider)
    hue_shift = float(data.get('hue', 0))
    sat_shift = float(data.get('saturation', 0))
    val_shift = float(data.get('value', 0))

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # 1. Konversi ke HSV (gunakan float32 agar tidak ada nilai yang terpotong saat dihitung)
    hsv_img = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)

    # 2. Modifikasi Hue (OpenCV membatasi Hue dari 0 hingga 179)
    hsv_img[:, :, 0] = (hsv_img[:, :, 0] + (hue_shift / 2.0)) % 180

    # 3. Modifikasi Saturation (Skala frontend -100 ke 100 diubah jadi -255 ke 255)
    hsv_img[:, :, 1] += (sat_shift / 100.0) * 255
    hsv_img[:, :, 1] = np.clip(hsv_img[:, :, 1], 0, 255)

    # 4. Modifikasi Value (Kecerahan)
    hsv_img[:, :, 2] += (val_shift / 100.0) * 255
    hsv_img[:, :, 2] = np.clip(hsv_img[:, :, 2], 0, 255)

    # 5. Kembalikan tipe data ke uint8 dan konversi kembali ke BGR
    hsv_img = hsv_img.astype(np.uint8)
    result = cv2.cvtColor(hsv_img, cv2.COLOR_HSV2BGR)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': 'HSV berhasil diterapkan',
        'filename': out_filename
    })
# -----------------------------------
@color_bp.route('/api/process/compress', methods=['POST'])
def compress_image():
    data = request.get_json()
    filename = data.get('filename')
    
    # Ambil nilai kualitas dari slider frontend (1 - 100)
    quality = int(data.get('quality', 50))

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # Fitur kompresi kualitas ini spesifik untuk format JPEG
    out_filename = f"{uuid.uuid4().hex}.jpg"
    out_path = os.path.join(PROCESSED_FOLDER, out_filename)

    # Simpan menggunakan parameter kualitas dari OpenCV
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    cv2.imwrite(out_path, img, encode_param)

    return jsonify({
        'message': 'Compress berhasil diterapkan',
        'filename': out_filename
    })

# ── Channel Splitting ──────────────────────────────────────────────────────────
@color_bp.route('/api/process/split-channel', methods=['POST'])
def split_channel():
    data = request.get_json()
    filename = data.get('filename')
    channel = data.get('channel', 'red').lower()

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # OpenCV menggunakan format BGR (Biru=0, Hijau=1, Merah=2)
    b, g, r = cv2.split(img)
    zeros = np.zeros_like(b)

    if channel == 'red':
        result = cv2.merge([zeros, zeros, r])
    elif channel == 'green':
        result = cv2.merge([zeros, g, zeros])
    elif channel == 'blue':
        result = cv2.merge([b, zeros, zeros])
    else:
        return jsonify({'error': 'Channel tidak didukung'}), 400

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': f'Channel {channel.upper()} berhasil diekstrak',
        'filename': out_filename
    })

@color_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)