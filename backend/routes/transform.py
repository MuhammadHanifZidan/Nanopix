from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid

transform_bp = Blueprint('transform', __name__)

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


@transform_bp.route('/api/process/rotate', methods=['POST'])
def rotate():
    data = request.get_json()
    filename = data.get('filename')
    angle = data.get('angle', 0)  # 0–360 derajat

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    h, w = img.shape[:2]
    center = (w / 2, h / 2)

    # hitung ukuran canvas baru supaya gambar tidak terpotong setelah rotasi
    angle_rad = np.deg2rad(angle)
    new_w = int(abs(w * np.cos(angle_rad)) + abs(h * np.sin(angle_rad)))
    new_h = int(abs(w * np.sin(angle_rad)) + abs(h * np.cos(angle_rad)))

    # rotation matrix, lalu sesuaikan translasi ke canvas baru
    M = cv2.getRotationMatrix2D(center, -angle, 1.0)
    M[0, 2] += (new_w - w) / 2
    M[1, 2] += (new_h - h) / 2

    rotated = cv2.warpAffine(img, M, (new_w, new_h), flags=cv2.INTER_LINEAR)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(rotated, ext)

    return jsonify({
        'message': 'Rotate berhasil',
        'filename': out_filename,
        'new_width': new_w,
        'new_height': new_h
    })


@transform_bp.route('/api/process/resize', methods=['POST'])
def resize():
    data = request.get_json()
    filename = data.get('filename')
    scale = data.get('scale', 100)  # persentase, misal 50 = 50%, 200 = 200%

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    if not (10 <= scale <= 400):
        return jsonify({'error': 'Scale harus antara 10% dan 400%'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    h, w = img.shape[:2]
    factor = scale / 100.0
    new_w = max(1, int(w * factor))
    new_h = max(1, int(h * factor))

    # pilih interpolasi: INTER_AREA bagus untuk memperkecil, INTER_CUBIC untuk memperbesar
    interpolation = cv2.INTER_AREA if factor < 1 else cv2.INTER_CUBIC
    resized = cv2.resize(img, (new_w, new_h), interpolation=interpolation)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(resized, ext)

    return jsonify({
        'message': 'Resize berhasil',
        'filename': out_filename,
        'new_width': new_w,
        'new_height': new_h
    })


@transform_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)