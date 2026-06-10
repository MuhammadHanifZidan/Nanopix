from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid

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
# Metode: Kuantisasi (DCT + quantization table)
# OpenCV handle DCT & quantization table secara internal via quality parameter

@compression_bp.route('/api/process/compress/jpeg', methods=['POST'])
def compress_jpeg():
    data = request.get_json()
    filename = data.get('filename')
    quality = data.get('quality', 85)  # 1–100, makin kecil makin terkompresi

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    quality = max(1, min(int(quality), 100))

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    orig_path = os.path.join(UPLOAD_FOLDER, filename)
    orig_size = get_file_size(orig_path)

    out_filename, out_path = save_processed(
        img, 'jpg', [cv2.IMWRITE_JPEG_QUALITY, quality]
    )
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
# Metode: LZW (via DEFLATE yang dipakai PNG)

@compression_bp.route('/api/process/compress/png', methods=['POST'])
def compress_png():
    data = request.get_json()
    filename = data.get('filename')
    # compression level 0–9 (0 = no compression, 9 = max)
    level = data.get('level', 6)

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    level = max(0, min(int(level), 9))

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    orig_path = os.path.join(UPLOAD_FOLDER, filename)
    orig_size = get_file_size(orig_path)

    out_filename, out_path = save_processed(
        img, 'png', [cv2.IMWRITE_PNG_COMPRESSION, level]
    )
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


# ── RLE Compression (RGB) ───────────────────────────────────────────────────────────
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

    # Pisahkan channel B, G, R agar RLE lebih optimal menemukan deret kembar
    b, g, r = cv2.split(img)

    def encode_rle(channel):
        flat = channel.flatten()
        encoded = []
        count = 1
        for i in range(1, len(flat)):
            if flat[i] == flat[i - 1]:
                count += 1
            else:
                encoded.append((int(flat[i - 1]), count))
                count = 1
        encoded.append((int(flat[-1]), count))
        return encoded, flat.size

    # Encode tiap channel
    enc_b, size_b = encode_rle(b)
    enc_g, size_g = encode_rle(g)
    enc_r, size_r = encode_rle(r)

    # Decode balik ke array
    def decode_rle(encoded, shape):
        return np.array([val for val, cnt in encoded for _ in range(cnt)], dtype=np.uint8).reshape(shape)

    dec_b = decode_rle(enc_b, b.shape)
    dec_g = decode_rle(enc_g, g.shape)
    dec_r = decode_rle(enc_r, r.shape)

    # Gabungkan kembali menjadi gambar berwarna
    result = cv2.merge([dec_b, dec_g, dec_r])
    
    out_filename, out_path = save_processed(result, 'png')
    comp_size = get_file_size(out_path)

    total_pairs = len(enc_b) + len(enc_g) + len(enc_r)
    total_pixels = size_b + size_g + size_r
    rle_bytes = total_pairs * 2

    return jsonify({
        'message': 'RLE RGB compression berhasil',
        'filename': out_filename,
        'method': 'Run-Length Encoding (RGB)',
        'original_pixels': int(total_pixels),
        'rle_pairs': total_pairs,
        'rle_size_bytes': rle_bytes,
        'original_size_bytes': orig_size,
        'compressed_size_bytes': comp_size,
        'ratio': round(total_pixels / total_pairs, 2) if total_pairs > 0 else 0
    })


# ── Huffman Compression (RGB) ───────────────────────────────────────────────────────
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

    # Langsung flatten gambar 3 channel
    flat = img.flatten()

    # hitung frekuensi tiap nilai pixel
    freq = {}
    for val in flat:
        freq[int(val)] = freq.get(int(val), 0) + 1

    heap = [[f, s, None, None] for s, f in freq.items()]
    heap.sort(key=lambda x: x[0])

    while len(heap) > 1:
        lo = heap.pop(0)
        hi = heap.pop(0)
        merged = [lo[0] + hi[0], None, lo, hi]
        inserted = False
        for i, node in enumerate(heap):
            if merged[0] <= node[0]:
                heap.insert(i, merged)
                inserted = True
                break
        if not inserted:
            heap.append(merged)

    codes = {}
    def generate_codes(node, code=''):
        if node is None:
            return
        if node[1] is not None:
            codes[node[1]] = code if code else '0'
            return
        generate_codes(node[2], code + '0')
        generate_codes(node[3], code + '1')

    if heap:
        generate_codes(heap[0])

    original_bits = len(flat) * 8
    compressed_bits = sum(len(codes.get(int(p), '0')) for p in flat)
    compression_ratio = round(original_bits / compressed_bits, 2) if compressed_bits > 0 else 0

    # Simpan langsung gambar aslinya (RGB)
    out_filename, out_path = save_processed(img, 'png')
    comp_size = get_file_size(out_path)

    sample_codes = dict(sorted(codes.items(), key=lambda x: len(x[1]))[:10])

    return jsonify({
        'message': 'Huffman RGB compression berhasil',
        'filename': out_filename,
        'method': 'Huffman Coding (RGB)',
        'original_bits': original_bits,
        'compressed_bits': compressed_bits,
        'compression_ratio': compression_ratio,
        'unique_symbols': len(freq),
        'original_size_bytes': orig_size,
        'compressed_size_bytes': comp_size,
        'sample_codes': sample_codes
    })


# ── Arithmetic Compression (simulasi RGB) ────────────────────────────────────────
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

    # Langsung flatten gambar 3 channel
    flat = img.flatten().astype(np.float32)
    total = len(flat)

    vals, counts = np.unique(flat, return_counts=True)
    probs = counts / total

    entropy = -np.sum(probs * np.log2(probs + 1e-10))

    compressed_bits = int(entropy * total)
    original_bits = total * 8
    ratio = round(original_bits / compressed_bits, 2) if compressed_bits > 0 else 0

    # Simpan langsung gambar aslinya (RGB)
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