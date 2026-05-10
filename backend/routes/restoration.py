from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid

restoration_bp = Blueprint('restoration', __name__)

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


@restoration_bp.route('/api/process/gaussian-blur', methods=['POST'])
def gaussian_blur():
    data = request.get_json()
    filename = data.get('filename')
    kernel_size = data.get('kernel_size', 5)  # harus ganjil, 1–51

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    # pastikan kernel ganjil dan dalam range valid
    kernel_size = max(1, int(kernel_size))
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel_size = min(kernel_size, 51)

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # sigma=0 berarti OpenCV hitung otomatis dari kernel size
    result = cv2.GaussianBlur(img, (kernel_size, kernel_size), sigmaX=0)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': 'Gaussian blur berhasil',
        'filename': out_filename,
        'kernel_size': kernel_size
    })


@restoration_bp.route('/api/process/median-filter', methods=['POST'])
def median_filter():
    data = request.get_json()
    filename = data.get('filename')
    kernel_size = data.get('kernel_size', 5)  # harus ganjil, 3–51

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    kernel_size = max(3, int(kernel_size))
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel_size = min(kernel_size, 51)

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # median filter sangat efektif untuk salt & pepper,
    # tapi di sini dipisah karena spek minta keduanya explicit
    result = cv2.medianBlur(img, kernel_size)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': 'Median filter berhasil',
        'filename': out_filename,
        'kernel_size': kernel_size
    })


@restoration_bp.route('/api/process/denoise-saltpepper', methods=['POST'])
def denoise_salt_pepper():
    data = request.get_json()
    filename = data.get('filename')
    # strength: 'low' | 'medium' | 'high'
    # nentuin seberapa agresif filter-nya
    strength = data.get('strength', 'medium')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400
    if strength not in ('low', 'medium', 'high'):
        return jsonify({'error': "strength harus 'low', 'medium', atau 'high'"}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # salt & pepper paling efektif dihilangkan dengan median filter
    # kernel makin besar = makin agresif tapi makin blur
    kernel_map = {'low': 3, 'medium': 5, 'high': 7}
    kernel_size = kernel_map[strength]

    # pass pertama: median filter untuk buang noise ekstrem
    result = cv2.medianBlur(img, kernel_size)

    # pass kedua: bilateral filter untuk perhalus sisa noise
    # sambil tetap jaga tepi (edge-preserving)
    # d=9: diameter pixel neighborhood
    # sigmaColor=75: seberapa jauh perbedaan warna masih dianggap "sama"
    # sigmaSpace=75: seberapa jauh pixel tetangga ikut dihitung
    result = cv2.bilateralFilter(result, d=9, sigmaColor=75, sigmaSpace=75)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': 'Noise removal berhasil',
        'filename': out_filename,
        'strength': strength
    })


@restoration_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)