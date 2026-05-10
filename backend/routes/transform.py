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

@transform_bp.route('/api/process/crop', methods=['POST'])
def crop():
    data = request.get_json()
    filename = data.get('filename')
    x = data.get('x')
    y = data.get('y')
    width = data.get('width')
    height = data.get('height')

    if any(v is None for v in [filename, x, y, width, height]):
        return jsonify({'error': 'filename, x, y, width, height diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    h, w = img.shape[:2]

    # clamp supaya area crop ga keluar batas gambar
    x1 = max(0, int(x))
    y1 = max(0, int(y))
    x2 = min(w, int(x + width))
    y2 = min(h, int(y + height))

    if x2 <= x1 or y2 <= y1:
        return jsonify({'error': 'Area crop tidak valid'}), 400

    cropped = img[y1:y2, x1:x2]

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(cropped, ext)

    return jsonify({
        'message': 'Crop berhasil',
        'filename': out_filename,
        'new_width': x2 - x1,
        'new_height': y2 - y1
    })

@transform_bp.route('/api/process/flip', methods=['POST'])
def flip():
    data = request.get_json()
    filename = data.get('filename')
    direction = data.get('direction')  # 'horizontal', 'vertical', atau 'both'

    if not filename or direction not in ('horizontal', 'vertical', 'both'):
        return jsonify({'error': "direction harus 'horizontal', 'vertical', atau 'both'"}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    flip_code = {'horizontal': 1, 'vertical': 0, 'both': -1}[direction]
    flipped = cv2.flip(img, flip_code)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(flipped, ext)

    return jsonify({'message': 'Flip berhasil', 'filename': out_filename})

@transform_bp.route('/api/process/translate', methods=['POST'])
def translate():
    data = request.get_json()
    filename = data.get('filename')
    tx = data.get('tx', 0)  # geser horizontal (px), negatif = kiri
    ty = data.get('ty', 0)  # geser vertikal (px), negatif = atas

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    h, w = img.shape[:2]
    M = np.float32([[1, 0, tx],
                    [0, 1, ty]])
    translated = cv2.warpAffine(img, M, (w, h))

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(translated, ext)

    return jsonify({'message': 'Translate berhasil', 'filename': out_filename})

@transform_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)