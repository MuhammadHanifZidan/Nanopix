from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid

color_processing_bp = Blueprint('color_processing', __name__)

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

# ── Channel Splitting ─────────────────────────────────────────────────────────

@color_processing_bp.route('/api/process/channel-split', methods=['POST'])
def channel_split():
    data = request.get_json()
    filename = data.get('filename')
    channel = data.get('channel')  # 'r', 'g', atau 'b'

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400
    if channel not in ('r', 'g', 'b'):
        return jsonify({'error': "channel harus 'r', 'g', atau 'b'"}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # OpenCV urutan channel-nya BGR
    b, g, r = cv2.split(img)
    zeros = np.zeros_like(b)

    # isolasi channel yang diminta, channel lain di-nol-kan
    channel_map = {
        'r': cv2.merge([zeros, zeros, r]),
        'g': cv2.merge([zeros, g, zeros]),
        'b': cv2.merge([b, zeros, zeros]),
    }
    result = channel_map[channel]

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': f'Channel {channel.upper()} berhasil diisolasi',
        'filename': out_filename
    })


# ── Color Adjustment (Hue & Saturation) ──────────────────────────────────────

@color_processing_bp.route('/api/process/color-adjust', methods=['POST'])
def color_adjust():
    data = request.get_json()
    filename = data.get('filename')
    hue_shift = data.get('hue_shift', 0)        # -180 hingga 180 derajat
    saturation = data.get('saturation', 100)     # 0–300 (100 = normal)
    value = data.get('value', 100)               # 0–300, brightness di HSV (100 = normal)

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # konversi ke HSV untuk manipulasi hue & saturation lebih mudah
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)

    # H di OpenCV range 0–180 (bukan 0–360), jadi shift dibagi 2
    hsv[:, :, 0] = (hsv[:, :, 0] + hue_shift / 2) % 180

    # S dan V dikali faktor skala
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * (saturation / 100.0), 0, 255)
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * (value / 100.0), 0, 255)

    hsv = hsv.astype(np.uint8)
    result = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({'message': 'Color adjustment berhasil', 'filename': out_filename})

@color_processing_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)