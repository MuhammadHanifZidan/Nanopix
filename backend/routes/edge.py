from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid

edge_bp = Blueprint('edge', __name__)

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


def to_gray(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def to_bgr(img):
    # edge result selalu grayscale, convert ke BGR biar konsisten saat disimpan
    return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)


# ── Thresholding ─────────────────────────────────────────────────────────────

@edge_bp.route('/api/process/threshold', methods=['POST'])
def threshold():
    data = request.get_json()
    filename = data.get('filename')
    thresh_value = data.get('thresh_value', 127)  # 0–255
    mode = data.get('mode', 'binary')  # binary | binary_inv | otsu

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400
    if mode not in ('binary', 'binary_inv', 'otsu'):
        return jsonify({'error': "mode harus 'binary', 'binary_inv', atau 'otsu'"}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = to_gray(img)

    if mode == 'otsu':
        # otsu hitung threshold otomatis, thresh_value diabaikan
        thresh_value, result = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
    elif mode == 'binary_inv':
        _, result = cv2.threshold(gray, int(thresh_value), 255, cv2.THRESH_BINARY_INV)
    else:
        _, result = cv2.threshold(gray, int(thresh_value), 255, cv2.THRESH_BINARY)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(to_bgr(result), ext)

    return jsonify({
        'message': 'Threshold berhasil',
        'filename': out_filename,
        'thresh_value_used': int(thresh_value)
    })


# ── Edge Detection ────────────────────────────────────────────────────────────

@edge_bp.route('/api/process/edge/canny', methods=['POST'])
def edge_canny():
    data = request.get_json()
    filename = data.get('filename')
    threshold1 = data.get('threshold1', 100)  # lower hysteresis
    threshold2 = data.get('threshold2', 200)  # upper hysteresis

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = to_gray(img)
    result = cv2.Canny(gray, int(threshold1), int(threshold2))

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(to_bgr(result), ext)

    return jsonify({'message': 'Canny berhasil', 'filename': out_filename})


@edge_bp.route('/api/process/edge/sobel', methods=['POST'])
def edge_sobel():
    data = request.get_json()
    filename = data.get('filename')
    # direction: 'x', 'y', atau 'both'
    direction = data.get('direction', 'both')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400
    if direction not in ('x', 'y', 'both'):
        return jsonify({'error': "direction harus 'x', 'y', atau 'both'"}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = to_gray(img)

    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

    if direction == 'x':
        result = cv2.convertScaleAbs(sobelx)
    elif direction == 'y':
        result = cv2.convertScaleAbs(sobely)
    else:
        result = cv2.addWeighted(
            cv2.convertScaleAbs(sobelx), 0.5,
            cv2.convertScaleAbs(sobely), 0.5, 0
        )

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(to_bgr(result), ext)

    return jsonify({'message': 'Sobel berhasil', 'filename': out_filename})


@edge_bp.route('/api/process/edge/prewitt', methods=['POST'])
def edge_prewitt():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = to_gray(img)

    # Prewitt tidak ada di OpenCV, pakai filter2D dengan kernel manual
    kernel_x = np.array([[-1, 0, 1],
                          [-1, 0, 1],
                          [-1, 0, 1]], dtype=np.float32)
    kernel_y = np.array([[-1, -1, -1],
                          [ 0,  0,  0],
                          [ 1,  1,  1]], dtype=np.float32)

    prewitt_x = cv2.filter2D(gray, cv2.CV_64F, kernel_x)
    prewitt_y = cv2.filter2D(gray, cv2.CV_64F, kernel_y)
    result = cv2.addWeighted(
        cv2.convertScaleAbs(prewitt_x), 0.5,
        cv2.convertScaleAbs(prewitt_y), 0.5, 0
    )

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(to_bgr(result), ext)

    return jsonify({'message': 'Prewitt berhasil', 'filename': out_filename})


@edge_bp.route('/api/process/edge/robert', methods=['POST'])
def edge_robert():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = to_gray(img)

    # Robert Cross — kernel 2x2
    kernel_x = np.array([[1,  0],
                          [0, -1]], dtype=np.float32)
    kernel_y = np.array([[ 0, 1],
                          [-1, 0]], dtype=np.float32)

    robert_x = cv2.filter2D(gray, cv2.CV_64F, kernel_x)
    robert_y = cv2.filter2D(gray, cv2.CV_64F, kernel_y)
    result = cv2.addWeighted(
        cv2.convertScaleAbs(robert_x), 0.5,
        cv2.convertScaleAbs(robert_y), 0.5, 0
    )

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(to_bgr(result), ext)

    return jsonify({'message': 'Robert berhasil', 'filename': out_filename})


@edge_bp.route('/api/process/edge/laplacian', methods=['POST'])
def edge_laplacian():
    data = request.get_json()
    filename = data.get('filename')
    kernel_size = data.get('kernel_size', 3)  # 1, 3, 5, 7

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = to_gray(img)

    kernel_size = int(kernel_size)
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel_size = max(1, min(kernel_size, 7))

    laplacian = cv2.Laplacian(gray, cv2.CV_64F, ksize=kernel_size)
    result = cv2.convertScaleAbs(laplacian)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(to_bgr(result), ext)

    return jsonify({'message': 'Laplacian berhasil', 'filename': out_filename})


@edge_bp.route('/api/process/edge/log', methods=['POST'])
def edge_log():
    # Laplacian of Gaussian (LoG)
    data = request.get_json()
    filename = data.get('filename')
    sigma = data.get('sigma', 1.0)  # kontrol seberapa besar area blur sebelum Laplacian

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = to_gray(img)

    # LoG = Laplacian(Gaussian(image))
    # ukuran kernel dari sigma: aturan umum 6*sigma+1, selalu ganjil
    k = int(6 * sigma + 1)
    if k % 2 == 0:
        k += 1
    k = max(3, k)

    blurred = cv2.GaussianBlur(gray, (k, k), sigmaX=sigma)
    log = cv2.Laplacian(blurred, cv2.CV_64F)
    result = cv2.convertScaleAbs(log)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(to_bgr(result), ext)

    return jsonify({'message': 'LoG berhasil', 'filename': out_filename})


# ── Morphology ────────────────────────────────────────────────────────────────

@edge_bp.route('/api/process/morphology', methods=['POST'])
def morphology():
    data = request.get_json()
    filename = data.get('filename')
    operation = data.get('operation')   # 'erosion' atau 'dilation'
    kernel_size = data.get('kernel_size', 3)  # ukuran structuring element
    iterations = data.get('iterations', 1)    # berapa kali operasi diulang

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400
    if operation not in ('erosion', 'dilation'):
        return jsonify({'error': "operation harus 'erosion' atau 'dilation'"}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    kernel_size = max(1, int(kernel_size))
    if kernel_size % 2 == 0:
        kernel_size += 1

    # structuring element berbentuk persegi (RECT)
    kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (kernel_size, kernel_size)
    )

    if operation == 'erosion':
        result = cv2.erode(img, kernel, iterations=int(iterations))
    else:
        result = cv2.dilate(img, kernel, iterations=int(iterations))

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': f'{operation.capitalize()} berhasil',
        'filename': out_filename
    })


@edge_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)