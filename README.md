# 📸 Nanopix: Advanced Web-Based Image Processing

**Nanopix** adalah aplikasi pengolahan citra digital berbasis web yang dirancang untuk mengimplementasikan konsep-konsep utama dalam mata kuliah **Pengolahan Citra Digital**. Dengan antarmuka yang modern dan interaktif, Nanopix memungkinkan pengguna untuk melakukan manipulasi citra mulai dari transformasi dasar hingga deteksi objek berbasis AI.

---

## 🚀 Fitur Utama

### 🛠 1. Management & Enhancement
* **Image Management**: Load gambar (JPG, PNG, BMP), simpan hasil edit, dan fitur reset cepat.
* **Enhancement**: Pengaturan *Brightness* & *Contrast* via slider, *Histogram Equalization*, serta fitur *Sharpening* dan *Smoothing*.

### 📐 2. Geometric Transformation & Restoration
* **Transformasi**: Rotasi (0°–360°), Flip, Crop, Resize, dan Translasi menggunakan matriks affine dan interpolasi.
* **Restoration**: Pengurangan *noise* (Salt & Pepper) menggunakan *Gaussian Blur* dan *Median Filter*.

### 🔳 3. Binary & Edge Processing
* **Edge Detection**: Deteksi tepi menggunakan algoritma Canny, Sobel, Prewitt, Robert, dan Laplacian.
* **Morphology**: Operasi biner seperti Erosi dan Dilasi.

### 🌈 4. Color & Segmentation
* **Color Processing**: Konversi RGB ke Grayscale, splitting channel R/G/B, dan penyesuaian Hue/Saturation.
* **Segmentation**: Segmentasi berbasis threshold, tepi, dan region extraction.

### 📉 5. Compression & Analysis
* **Compression**: Simulasi kompresi JPEG dengan metode Huffman, LZW, atau RLE.
* **Histogram Analysis**: Visualisasi distribusi intensitas piksel secara *real-time* (Grayscale & RGB).

### 🤖 6. AI Integration (Bonus Feature)
* **Object Recognition**: Deteksi objek secara otomatis menggunakan metode **Convolutional Neural Network (CNN)**.

---

## 🛠 Tech Stack

Aplikasi ini dibangun menggunakan arsitektur *Decoupled*:
* **Frontend**: React.js (Interaktif UI & State Management)
* **Backend**: Flask (Python) sebagai API untuk pemrosesan citra berat
* **Libraries**: OpenCV, NumPy, Matplotlib (Analysis), dan TensorFlow/Keras (untuk CNN)

---

## 👥 Tim Pengembang

Proyek ini dikembangkan oleh:
1. **[Muhammad Hanif Zidan]** - [2407411050/Backend Developer]
2. **[Muhammad Reza Arifin]** - [2407411056/Frontend Developer]

**Dosen Pengampu**: Rizki Elisa Nalawati, S.T., M.T.

---

## 🔧 Cara Menjalankan

1. **Clone Repository**
   ```bash
   git clone [https://github.com/username/nanopix.git](https://github.com/username/nanopix.git)
