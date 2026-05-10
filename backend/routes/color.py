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


@color_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)