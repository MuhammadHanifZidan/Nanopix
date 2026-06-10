from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid
import heapq  # Tambahan untuk optimisasi Huffman Tree

compression_bp = Blueprint('compression', __name__)

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'


def load_image(filename):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(path):
        return None
    return cv2.imread(path)


def save_processed(img, ext='jpg', params=None):
    out_filename = f"{uuid.uuid4().hex}.{ext}"
    out_path = os.path.join(PROCESSED_FOLDER, out_filename)
    if params:
        cv2.imwrite(out_path, img, params)
    else:
        cv2.imwrite(out_path, img)
    return out_filename, out_path


def get_file_size(path):
    return os.path.getsize(path)


# ── JPEG Quality Compression ──────────────────────────────────────────────────
@compression_bp.route('/api/process/compress/jpeg', methods=['POST'])
def compress_jpeg():
    data = request.get_json()
    filename = data.get('filename')
    quality = data.get('quality', 85)

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    quality = max(1, min(int(quality), 100))
    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    orig_path = os.path.join(UPLOAD_FOLDER, filename)
    orig_size = get_file_size(orig_path)

    out_filename, out_path = save_processed(img, 'jpg', [cv2.IMWRITE_JPEG_QUALITY, quality])
    comp_size = get_file_size(out_path)

    return jsonify({
        'message': 'JPEG compression berhasil',
        'filename': out_filename,
        'method': 'Kuantisasi DCT',
        'quality': quality,
        'original_size_bytes': orig_size,
        'compressed_size_bytes': comp_size,
        'ratio': round(orig_size / comp_size, 2) if comp_size > 0 else 0
    })


# ── PNG Lossless Compression ──────────────────────────────────────────────────
@compression_bp.route('/api/process/compress/png', methods=['POST'])
def compress_png():
    data = request.get_json()
    filename = data.get('filename')
    level = data.get('level', 6)

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    level = max(0, min(int(level), 9))
    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    orig_path = os.path.join(UPLOAD_FOLDER, filename)
    orig_size = get_file_size(orig_path)

    out_filename, out_path = save_processed(img, 'png', [cv2.IMWRITE_PNG_COMPRESSION, level])
    comp_size = get_file_size(out_path)

    return jsonify({
        'message': 'PNG compression berhasil',
        'filename': out_filename,
        'method': 'LZW (DEFLATE)',
        'level': level,
        'original_size_bytes': orig_size,
        'compressed_size_bytes': comp_size,
        'ratio': round(orig_size / comp_size, 2) if comp_size > 0 else 0
    })


# ── RLE Compression (FAST OPTIMIZED) ─────────────────────────────────────────
@compression_bp.route('/api/process/compress/rle', methods=['POST'])
def compress_rle():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    orig_path = os.path.join(UPLOAD_FOLDER, filename)
    orig_size = get_file_size(orig_path)

    b, g, r = cv2.split(img)

    # OPTIMISASI: Menggunakan NumPy Vectorization (Bukan looping manual)
    def get_rle_pairs_count(channel):
        flat = channel.flatten()
        if flat.size == 0: return 0
        # np.diff() mencari letak nilai yang berubah secara instan di level C
        changes = np.where(flat[:-1] != flat[1:])[0]
        return len(changes) + 1

    pairs_b = get_rle_pairs_count(b)
    pairs_g = get_rle_pairs_count(g)
    pairs_r = get_rle_pairs_count(r)

    total_pairs = pairs_b + pairs_g + pairs_r
    total_pixels = img.size
    rle_bytes = total_pairs * 2

    # OPTIMISASI: RLE adalah Lossless. Gambar output = Gambar Input.
    # Tidak perlu repot-repot men-decode array kembali. Langsung simpan input aslinya!
    out_filename, out_path = save_processed(img, 'png')
    comp_size = get_file_size(out_path)

    return jsonify({
        'message': 'RLE RGB compression berhasil',
        'filename': out_filename,
        'method': 'Run-Length Encoding (RGB)',
        'original_pixels': int(total_pixels),
        'rle_pairs': int(total_pairs),
        'rle_size_bytes': int(rle_bytes),
        'original_size_bytes': orig_size,
        'compressed_size_bytes': comp_size,
        'ratio': round(total_pixels / total_pairs, 2) if total_pairs > 0 else 0
    })


# ── Huffman Compression (FAST OPTIMIZED) ─────────────────────────────────────
@compression_bp.route('/api/process/compress/huffman', methods=['POST'])
def compress_huffman():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    orig_path = os.path.join(UPLOAD_FOLDER, filename)
    orig_size = get_file_size(orig_path)

    flat = img.flatten()

    # OPTIMISASI 1: Hitung frekuensi pakai NumPy (Sangat cepat)
    vals, counts = np.unique(flat, return_counts=True)
    freq = dict(zip(vals, counts))

    # OPTIMISASI 2: Build Huffman Tree menggunakan library heapq
    heap = [[weight, [symbol, ""]] for symbol, weight in freq.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        lo = heapq.heappop(heap)
        hi = heapq.heappop(heap)
        for pair in lo[1:]:
            pair[1] = '0' + pair[1]
        for pair in hi[1:]:
            pair[1] = '1' + pair[1]
        heapq.heappush(heap, [lo[0] + hi[0]] + lo[1:] + hi[1:])

    codes = {pair[0]: pair[1] for pair in heap[0][1:]} if heap else {}

    # OPTIMISASI 3: Hitung total bits matematis, JANGAN dilooping per pixel!
    original_bits = len(flat) * 8
    compressed_bits = sum(freq[sym] * len(code) for sym, code in codes.items())
    compression_ratio = round(original_bits / compressed_bits, 2) if compressed_bits > 0 else 0

    # Simpan langsung gambar aslinya (Lossless visual)
    out_filename, out_path = save_processed(img, 'png')
    comp_size = get_file_size(out_path)

    # Konversi key numpy ke integer biasa agar aman di JSON
    sample_codes = dict(sorted(codes.items(), key=lambda x: len(x[1]))[:10])
    sample_codes = {int(k): str(v) for k, v in sample_codes.items()}

    return jsonify({
        'message': 'Huffman RGB compression berhasil',
        'filename': out_filename,
        'method': 'Huffman Coding (RGB)',
        'original_bits': int(original_bits),
        'compressed_bits': int(compressed_bits),
        'compression_ratio': compression_ratio,
        'unique_symbols': len(freq),
        'original_size_bytes': orig_size,
        'compressed_size_bytes': comp_size,
        'sample_codes': sample_codes
    })


# ── Arithmetic Compression ────────────────────────────────────────
@compression_bp.route('/api/process/compress/arithmetic', methods=['POST'])
def compress_arithmetic():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    orig_path = os.path.join(UPLOAD_FOLDER, filename)
    orig_size = get_file_size(orig_path)

    flat = img.flatten().astype(np.float32)
    total = len(flat)

    vals, counts = np.unique(flat, return_counts=True)
    probs = counts / total

    entropy = -np.sum(probs * np.log2(probs + 1e-10))

    compressed_bits = int(entropy * total)
    original_bits = total * 8
    ratio = round(original_bits / compressed_bits, 2) if compressed_bits > 0 else 0

    out_filename, out_path = save_processed(img, 'png')
    comp_size = get_file_size(out_path)

    return jsonify({
        'message': 'Arithmetic RGB compression berhasil',
        'filename': out_filename,
        'method': 'Arithmetic Coding (RGB)',
        'entropy_bits_per_pixel': round(float(entropy), 4),
        'original_bits': int(original_bits),
        'theoretical_compressed_bits': compressed_bits,
        'compression_ratio': ratio,
        'original_size_bytes': orig_size,
        'compressed_size_bytes': comp_size,
    })


@compression_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)