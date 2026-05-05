# 📸 Nanopix: Advanced Web-Based Image Processing

[cite_start]**Nanopix** adalah aplikasi pengolahan citra digital berbasis web yang dirancang untuk mengimplementasikan konsep-konsep utama dalam mata kuliah **Pengolahan Citra Digital**[cite: 2]. [cite_start]Dengan antarmuka yang modern dan interaktif, Nanopix memungkinkan pengguna untuk melakukan manipulasi citra mulai dari transformasi dasar hingga deteksi objek berbasis AI[cite: 5, 92].

---

## 🚀 Fitur Utama

### 🛠 1. Management & Enhancement
* [cite_start]**Image Management**: Load gambar (JPG, PNG, BMP), simpan hasil edit, dan fitur reset cepat[cite: 10, 11, 12].
* [cite_start]**Enhancement**: Pengaturan *Brightness* & *Contrast* via slider, *Histogram Equalization*, serta fitur *Sharpening* dan *Smoothing*[cite: 19, 20, 21, 22].

### 📐 2. Geometric Transformation & Restoration
* [cite_start]**Transformasi**: Rotasi (0°–360°), Flip, Crop, Resize, dan Translasi menggunakan matriks affine dan interpolasi[cite: 25, 26, 27, 28, 29, 31].
* [cite_start]**Restoration**: Pengurangan *noise* (Salt & Pepper) menggunakan *Gaussian Blur* dan *Median Filter*[cite: 35, 36, 37].

### 🔳 3. Binary & Edge Processing
* [cite_start]**Edge Detection**: Deteksi tepi menggunakan algoritma Canny, Sobel, Prewitt, Robert, dan Laplacian[cite: 45, 46, 47, 48, 49].
* [cite_start]**Morphology**: Operasi biner seperti Erosi dan Dilasi[cite: 52, 53].

### 🌈 4. Color & Segmentation
* [cite_start]**Color Processing**: Konversi RGB ke Grayscale, splitting channel R/G/B, dan penyesuaian Hue/Saturation[cite: 59, 60, 61].
* [cite_start]**Segmentation**: Segmentasi berbasis threshold, tepi, dan region extraction[cite: 67, 68, 69, 72].

### 📉 5. Compression & Analysis
* [cite_start]**Compression**: Simulasi kompresi JPEG dengan metode Huffman, LZW, atau RLE[cite: 76, 78].
* [cite_start]**Histogram Analysis**: Visualisasi distribusi intensitas piksel secara *real-time* (Grayscale & RGB)[cite: 81, 84].

### 🤖 6. AI Integration (Bonus Feature)
* [cite_start]**Object Recognition**: Deteksi objek secara otomatis menggunakan metode **Convolutional Neural Network (CNN)**[cite: 92].

---

## 🛠 Tech Stack

Aplikasi ini dibangun menggunakan arsitektur *Decoupled*:
* [cite_start]**Frontend**: React.js (Interaktif UI & State Management)[cite: 6].
* [cite_start]**Backend**: Flask (Python) sebagai API untuk pemrosesan citra berat[cite: 5].
* **Libraries**: OpenCV, NumPy, Matplotlib (Analysis), dan TensorFlow/Keras (untuk CNN).

---

## 🖼 Tampilan Aplikasi
[cite_start]Nanopix menggunakan panel **Before vs After** [cite: 16, 89] untuk memudahkan pengguna melihat perubahan secara langsung:

> 
---

## 👥 Tim Pengembang

Proyek ini dikembangkan oleh:
1.  **[Muhammad Hanif Zidan]** - [2407411050/Backend Developer]
2.  **[Muhammad Reza Arifin]** - [2407411050/Frontend Developer]

[cite_start]**Dosen Pengampu**: Rizki Elisa Nalawati, S.T., M.T. [cite: 3]

---

## 🔧 Cara Menjalankan

1. **Clone Repository**
   ```bash
   git clone [https://github.com/username/nanopix.git](https://github.com/username/nanopix.git)
