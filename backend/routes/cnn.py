from flask import Blueprint, request, jsonify, send_from_directory
import cv2
import numpy as np
import os
import uuid
import urllib.request

cnn_bp = Blueprint('cnn', __name__)

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
MODEL_DIR = 'models'

os.makedirs(MODEL_DIR, exist_ok=True)

# Menggunakan URL dari repository mirror yang sudah tervalidasi menyimpan file caffemodel
PROTOTXT_URL = "https://raw.githubusercontent.com/PINTO0309/MobileNet-SSD-RealSense/master/caffemodel/MobileNetSSD/MobileNetSSD_deploy.prototxt"
MODEL_URL = "https://github.com/PINTO0309/MobileNet-SSD-RealSense/raw/master/caffemodel/MobileNetSSD/MobileNetSSD_deploy.caffemodel"

prototxt_path = os.path.join(MODEL_DIR, "MobileNetSSD_deploy.prototxt")
model_path = os.path.join(MODEL_DIR, "MobileNetSSD_deploy.caffemodel")

CLASSES = ["background", "aeroplane", "bicycle", "bird", "boat",
           "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
           "dog", "horse", "motorbike", "person", "pottedplant", "sheep",
           "sofa", "train", "tvmonitor"]

COLORS = np.random.uniform(0, 255, size=(len(CLASSES), 3))

def download_file(url, dest):
    """Fungsi download khusus dengan User-Agent agar tidak diblokir oleh GitHub"""
    if not os.path.exists(dest):
        print(f"[SYS] Mengunduh {os.path.basename(dest)}... mohon tunggu!")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(dest, 'wb') as out_file:
            out_file.write(response.read())

print("[SYS] Menginisialisasi modul AI Vision (MobileNet-SSD)...")
try:
    # Proses unduhan ini hanya terjadi 1x. Setelah file ada di folder models/, Python akan melewatinya.
    download_file(PROTOTXT_URL, prototxt_path)
    download_file(MODEL_URL, model_path)
    
    net = cv2.dnn.readNetFromCaffe(prototxt_path, model_path)
    HAS_CNN = True
    print("[SYS] Model CNN (MobileNet-SSD) berhasil dimuat dan siap digunakan!")
except Exception as e:
    HAS_CNN = False
    print(f"[ERR] Gagal memuat model OpenCV DNN: {e}")

# ... (Biarkan sisa fungsi load_image, save_processed, dan route api tetap sama seperti sebelumnya) ...

def load_image(filename):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(path): return None
    return cv2.imread(path)

def save_processed(img, ext='jpg'):
    out_filename = f"{uuid.uuid4().hex}.{ext}"
    out_path = os.path.join(PROCESSED_FOLDER, out_filename)
    cv2.imwrite(out_path, img)
    return out_filename

@cnn_bp.route('/api/process/cnn/recognize', methods=['POST'])
def recognize_object():
    if not HAS_CNN:
        return jsonify({'error': 'Modul CNN tidak aktif di backend.'}), 500

    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'filename diperlukan'}), 400

    img = load_image(filename)
    if img is None:
        return jsonify({'error': 'File tidak ditemukan'}), 404

    (h, w) = img.shape[:2]
    # Preprocessing standar untuk MobileNet-SSD
    blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 0.007843, (300, 300), 127.5)

    net.setInput(blob)
    detections = net.forward()

    output_img = img.copy()
    objects_found = []

    # Loop ke semua objek yang berhasil dideteksi
    for i in np.arange(0, detections.shape[2]):
        confidence = detections[0, 0, i, 2]

        # Hanya tampilkan jika AI yakin di atas 50%
        if confidence > 0.5:
            idx = int(detections[0, 0, i, 1])
            label = CLASSES[idx]
            
            # Hitung koordinat kotak (Bounding Box)
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            (startX, startY, endX, endY) = box.astype("int")

            # Gambar kotak
            color = COLORS[idx]
            cv2.rectangle(output_img, (startX, startY), (endX, endY), color, 2)

            # Siapkan teks label
            text = f"{label.upper()}: {round(confidence * 100, 1)}%"
            objects_found.append(text)
            
            # Gambar background untuk teks agar mudah dibaca
            y = startY - 15 if startY - 15 > 15 else startY + 15
            (text_w, text_h), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(output_img, (startX, y - text_h - 5), (startX + text_w, y + 5), color, -1)
            
            # Gambar teks putih
            cv2.putText(output_img, text, (startX, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

    ext = filename.rsplit('.', 1)[-1]
    out_filename = save_processed(output_img, ext)

    # Ambil nama objek paling meyakinkan untuk log frontend
    top_prediction = objects_found[0] if objects_found else "Tidak terdeteksi"

    return jsonify({
        'message': 'CNN Recognition berhasil',
        'filename': out_filename,
        'prediction': top_prediction
    })

@cnn_bp.route('/api/processed/<filename>', methods=['GET'])
def get_processed(filename):
    return send_from_directory(PROCESSED_FOLDER, filename)