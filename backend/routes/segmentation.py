from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid

segmentation_bp = Blueprint('segmentation', __name__)

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


# ── Threshold-based Segmentation ─────────────────────────────────────────────

@segmentation_bp.route('/api/process/segment/threshold', methods=['POST'])
def segment_threshold():
    data = request.get_json()
    filename = data.get('filename')
    thresh_value = data.get('thresh_value', 127)  # 0–255
    mode = data.get('mode', 'otsu')               # 'manual' atau 'otsu'

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400
    if mode not in ('manual', 'otsu'):
        return jsonify({'error': "mode harus 'manual' atau 'otsu'"}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if mode == 'otsu':
        thresh_value, mask = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
    else:
        _, mask = cv2.threshold(gray, int(thresh_value), 255, cv2.THRESH_BINARY)

    # apply mask ke gambar asli: background jadi hitam, foreground tetap
    result = cv2.bitwise_and(img, img, mask=mask)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': 'Threshold segmentation berhasil',
        'filename': out_filename,
        'thresh_value_used': int(thresh_value)
    })


# ── Edge-based Segmentation ───────────────────────────────────────────────────

@segmentation_bp.route('/api/process/segment/edge', methods=['POST'])
def segment_edge():
    data = request.get_json()
    filename = data.get('filename')
    threshold1 = data.get('threshold1', 50)   # canny lower
    threshold2 = data.get('threshold2', 150)  # canny upper

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # deteksi edge pakai Canny
    edges = cv2.Canny(gray, int(threshold1), int(threshold2))

    # temukan kontur dari edge
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # gambar kontur di atas gambar asli dengan warna hijau
    result = img.copy()
    cv2.drawContours(result, contours, -1, (0, 255, 0), 2)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': 'Edge segmentation berhasil',
        'filename': out_filename,
        'contours_found': len(contours)
    })


# ── Region-based Segmentation ─────────────────────────────────────────────────

@segmentation_bp.route('/api/process/segment/region', methods=['POST'])
def segment_region():
    data = request.get_json()
    filename = data.get('filename')
    n_clusters = data.get('n_clusters', 3)   # jumlah region/warna (2–8)
    min_area = data.get('min_area', 500)      # filter region terlalu kecil

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    n_clusters = max(2, min(int(n_clusters), 8))

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # ── Step 1: K-Means clustering untuk kelompokkan warna ──
    # reshape jadi array 2D: (total_pixel, 3 channel)
    pixel_vals = img.reshape((-1, 3)).astype(np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 0.2)
    _, labels, centers = cv2.kmeans(
        pixel_vals, n_clusters, None, criteria,
        attempts=10, flags=cv2.KMEANS_RANDOM_CENTERS
    )

    # rekonstruksi gambar dari cluster centers
    centers = np.uint8(centers)
    clustered = centers[labels.flatten()].reshape(img.shape)

    # ── Step 2: tandai tiap region dengan bounding box ──
    result = clustered.copy()
    gray_clustered = cv2.cvtColor(clustered, cv2.COLOR_BGR2GRAY)

    regions_info = []
    for i in range(n_clusters):
        # buat mask untuk tiap cluster
        cluster_mask = np.uint8(labels.reshape(img.shape[:2]) == i) * 255
        contours, _ = cv2.findContours(cluster_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue

            x, y, w, h = cv2.boundingRect(cnt)
            color = centers[i].tolist()  # BGR
            # gambar bounding box putih di atas hasil cluster
            cv2.rectangle(result, (x, y), (x + w, y + h), (255, 255, 255), 2)
            regions_info.append({
                'cluster': i,
                'area': int(area),
                'bbox': {'x': x, 'y': y, 'width': w, 'height': h},
                'color_bgr': color
            })

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(result, ext)

    return jsonify({
        'message': 'Region segmentation berhasil',
        'filename': out_filename,
        'n_clusters': n_clusters,
        'regions': regions_info
    })


@segmentation_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)