from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid

enhancement_bp = Blueprint('enhancement', __name__)

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


@enhancement_bp.route('/api/process/sharpen', methods=['POST'])
def sharpen():
    data = request.get_json()
    filename = data.get('filename')
    intensity = data.get('intensity', 50)  # 0–100

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400
    if not (0 <= intensity <= 100):
        return jsonify({'error': 'intensity harus antara 0 dan 100'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # Unsharp masking:
    # result = original + strength * (original - blurred)
    # strength dikontrol dari intensity (0 = tidak ada efek, 100 = kuat)
    strength = intensity / 50.0  # 0.0 – 2.0

    blurred = cv2.GaussianBlur(img, (0, 0), sigmaX=3)
    sharpened = cv2.addWeighted(img, 1 + strength, blurred, -strength, 0)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(sharpened, ext)

    return jsonify({'message': 'Sharpen berhasil', 'filename': out_filename})


@enhancement_bp.route('/api/process/smooth', methods=['POST'])
def smooth():
    data = request.get_json()
    filename = data.get('filename')
    intensity = data.get('intensity', 50)  # 0–100

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400
    if not (0 <= intensity <= 100):
        return jsonify({'error': 'intensity harus antara 0 dan 100'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # map intensity ke ukuran kernel gaussian (harus ganjil, min 1, max 51)
    k = int(intensity / 100 * 50)
    k = max(1, k)
    if k % 2 == 0:
        k += 1  # pastikan ganjil

    smoothed = cv2.GaussianBlur(img, (k, k), 0)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(smoothed, ext)

    return jsonify({'message': 'Smooth berhasil', 'filename': out_filename})


@enhancement_bp.route('/api/process/histeq', methods=['POST'])
def histogram_equalization():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # Konversi ke YCrCb, equalize hanya channel Y (luminance),
    # biar warna tidak berubah tapi kontras terangkat
    img_ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    img_ycrcb[:, :, 0] = cv2.equalizeHist(img_ycrcb[:, :, 0])
    result = cv2.cvtColor(img_ycrcb, cv2.COLOR_YCrCb2BGR)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({'message': 'Histogram equalization berhasil', 'filename': out_filename})


@enhancement_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)