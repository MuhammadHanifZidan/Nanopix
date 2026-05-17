from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')  # non-interactive backend, wajib karena tidak ada display
import matplotlib.pyplot as plt
import os
import uuid

histogram_bp = Blueprint('histogram', __name__)

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'


def load_image(filename):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(path):
        return None
    return cv2.imread(path)


def save_plot(fig, ext='png'):
    out_filename = f"{uuid.uuid4().hex}.{ext}"
    out_path = os.path.join(PROCESSED_FOLDER, out_filename)
    fig.savefig(out_path, bbox_inches='tight', dpi=120)
    plt.close(fig)
    return out_filename


# ── Grayscale Histogram ───────────────────────────────────────────────────────

@histogram_bp.route('/api/histogram/grayscale', methods=['POST'])
def histogram_grayscale():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()

    fig, ax = plt.subplots(figsize=(7, 3))
    fig.patch.set_facecolor('#1a1a1a')
    ax.set_facecolor('#1a1a1a')

    ax.fill_between(range(256), hist, color='#aaaaaa', alpha=0.8)
    ax.plot(range(256), hist, color='white', linewidth=0.8)

    ax.set_xlim([0, 255])
    ax.set_title('Grayscale Histogram', color='white', fontsize=11)
    ax.set_xlabel('Intensity (0–255)', color='#aaaaaa', fontsize=9)
    ax.set_ylabel('Pixel Count', color='#aaaaaa', fontsize=9)
    ax.tick_params(colors='#aaaaaa', labelsize=8)
    for spine in ax.spines.values():
        spine.set_edgecolor('#444444')

    out_filename = save_plot(fig)

    return jsonify({
        'message': 'Grayscale histogram berhasil',
        'filename': out_filename,
        'mean': round(float(np.mean(gray)), 2),
        'std': round(float(np.std(gray)), 2),
        'min': int(np.min(gray)),
        'max': int(np.max(gray)),
    })


# ── RGB Histogram ─────────────────────────────────────────────────────────────

@histogram_bp.route('/api/histogram/rgb', methods=['POST'])
def histogram_rgb():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    # OpenCV BGR → tampilkan sebagai RGB
    colors = [
        ('R', 2, '#ef4444'),
        ('G', 1, '#22c55e'),
        ('B', 0, '#3b82f6'),
    ]

    fig, axes = plt.subplots(1, 3, figsize=(10, 3))
    fig.patch.set_facecolor('#1a1a1a')

    channel_stats = {}
    for ax, (name, ch_idx, color) in zip(axes, colors):
        channel = img[:, :, ch_idx]
        hist = cv2.calcHist([img], [ch_idx], None, [256], [0, 256]).flatten()

        ax.set_facecolor('#1a1a1a')
        ax.fill_between(range(256), hist, color=color, alpha=0.5)
        ax.plot(range(256), hist, color=color, linewidth=1)
        ax.set_title(f'Channel {name}', color='white', fontsize=10)
        ax.set_xlim([0, 255])
        ax.tick_params(colors='#aaaaaa', labelsize=7)
        for spine in ax.spines.values():
            spine.set_edgecolor('#444444')

        channel_stats[name] = {
            'mean': round(float(np.mean(channel)), 2),
            'std': round(float(np.std(channel)), 2),
            'min': int(np.min(channel)),
            'max': int(np.max(channel)),
        }

    fig.tight_layout(pad=1.5)
    out_filename = save_plot(fig)

    return jsonify({
        'message': 'RGB histogram berhasil',
        'filename': out_filename,
        'channel_stats': channel_stats
    })


# ── Before–After Histogram Comparison ────────────────────────────────────────

@histogram_bp.route('/api/histogram/compare', methods=['POST'])
def histogram_compare():
    data = request.get_json()
    filename_before = data.get('filename_before')
    filename_after = data.get('filename_after')
    mode = data.get('mode', 'grayscale')  # 'grayscale' atau 'rgb'

    if not filename_before or not filename_after:
        return jsonify({'error': 'filename_before dan filename_after diperlukan'}), 400
    if mode not in ('grayscale', 'rgb'):
        return jsonify({'error': "mode harus 'grayscale' atau 'rgb'"}), 400

    # coba load dari uploads dulu, fallback ke processed
    def load_any(fname):
        img = cv2.imread(os.path.join(UPLOAD_FOLDER, fname))
        if img is None:
            img = cv2.imread(os.path.join(PROCESSED_FOLDER, fname))
        return img

    img_before = load_any(filename_before)
    img_after = load_any(filename_after)

    if img_before is None:
        return jsonify({'error': f'{filename_before} tidak ditemukan'}), 404
    if img_after is None:
        return jsonify({'error': f'{filename_after} tidak ditemukan'}), 404

    if mode == 'grayscale':
        fig, axes = plt.subplots(1, 2, figsize=(10, 3))
        fig.patch.set_facecolor('#1a1a1a')

        for ax, (img, label) in zip(axes, [
            (img_before, 'Before'), (img_after, 'After')
        ]):
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
            color = '#aaaaaa' if label == 'Before' else '#facc15'

            ax.set_facecolor('#1a1a1a')
            ax.fill_between(range(256), hist, color=color, alpha=0.5)
            ax.plot(range(256), hist, color=color, linewidth=1)
            ax.set_title(label, color='white', fontsize=11)
            ax.set_xlim([0, 255])
            ax.tick_params(colors='#aaaaaa', labelsize=8)
            for spine in ax.spines.values():
                spine.set_edgecolor('#444444')

        fig.suptitle('Grayscale Histogram Comparison', color='white', fontsize=11)
        fig.tight_layout(pad=1.5)

    else:  # rgb
        fig, axes = plt.subplots(2, 3, figsize=(10, 6))
        fig.patch.set_facecolor('#1a1a1a')

        channels = [('R', 2, '#ef4444'), ('G', 1, '#22c55e'), ('B', 0, '#3b82f6')]
        labels = ['Before', 'After']
        imgs = [img_before, img_after]

        for row, (img, label) in enumerate(zip(imgs, labels)):
            for col, (name, ch_idx, color) in enumerate(channels):
                ax = axes[row][col]
                hist = cv2.calcHist([img], [ch_idx], None, [256], [0, 256]).flatten()

                ax.set_facecolor('#1a1a1a')
                ax.fill_between(range(256), hist, color=color, alpha=0.4)
                ax.plot(range(256), hist, color=color, linewidth=1)
                ax.set_title(f'{label} — {name}', color='white', fontsize=9)
                ax.set_xlim([0, 255])
                ax.tick_params(colors='#aaaaaa', labelsize=7)
                for spine in ax.spines.values():
                    spine.set_edgecolor('#444444')

        fig.suptitle('RGB Histogram Comparison', color='white', fontsize=11)
        fig.tight_layout(pad=1.5)

    out_filename = save_plot(fig)

    return jsonify({
        'message': 'Histogram comparison berhasil',
        'filename': out_filename,
        'mode': mode
    })


@histogram_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)