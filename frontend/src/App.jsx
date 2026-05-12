import { useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:5000/api";

function App() {
  const [currentFilename, setCurrentFilename] = useState("");
  const [progress, setProgress] = useState(0);

  // --- 1. FUNGSI UPLOAD ---
  const handleUpload = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setProgress(10);
    const formData = new FormData();
    formData.append("file", selectedFile);
    setProgress(30);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      setProgress(70);

      if (response.ok) {
        const data = await response.json();
        setCurrentFilename(data.filename);
        setProgress(100);
        setTimeout(() => setProgress(0), 1000);
      } else {
        console.error("Upload failed");
        setProgress(0);
        alert("Gagal mengupload gambar.");
      }
    } catch (error) {
      console.error("Error connecting to backend", error);
      setProgress(0);
      alert("Gagal menghubungkan ke server.");
    }
  };

  // --- 2. FUNGSI PROSES (GRAYSCALE, DLL) ---
  const handleProcessAction = async (endpointPath) => {
    if (!currentFilename) {
      alert("Silakan upload gambar terlebih dahulu!");
      return;
    }

    setProgress(20);

    try {
      const response = await fetch(`${API_BASE_URL}/process/${endpointPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: currentFilename }),
      });

      setProgress(60);

      if (response.ok) {
        const data = await response.json();
        setCurrentFilename(data.filename); 
        setProgress(100);
        setTimeout(() => setProgress(0), 1000);
      } else {
        const errorData = await response.json();
        console.error("Proses gagal:", errorData);
        alert(`Gagal memproses: ${errorData.error}`);
        setProgress(0);
      }
    } catch (error) {
      console.error("Error connecting to backend", error);
      alert("Gagal menghubungkan ke server.");
      setProgress(0);
    }
  };

  // --- 3. FUNGSI SAVE IMAGE ---
  const handleSaveImage = async () => {
    if (!currentFilename) {
      alert("Tidak ada gambar untuk disimpan!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/image/${currentFilename}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Nanopix_${currentFilename}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Gagal menyimpan gambar:", error);
      alert("Terjadi kesalahan saat mendownload gambar.");
    }
  };

  return (
    <div className="nanopix-app">
      <header className="app-header">
        <h1 className="brand-title">NANOPIX</h1>
      </header>

      <main className="app-main">
        <div className="image-preview-container">
          <div className="preview-box">
            {currentFilename ? (
              <img
                src={`${API_BASE_URL}/image/${currentFilename}`}
                alt="Preview Gambar"
                className="preview-image"
              />
            ) : (
              <p className="placeholder-text">Preview Gambar</p>
            )}
          </div>
        </div>

        <div className="process-bar-section">
          <div className="process-bar-wrapper">
            <span className="process-label">Process bar</span>
            <div className="process-bar-outer">
              <div
                className="process-bar-inner"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="menu-toolbar">
          <div className="action-buttons-group">
            <input
              type="file"
              id="fileUpload"
              style={{ display: "none" }}
              onChange={handleUpload}
              accept="image/*"
            />
            <button
              className="menu-btn upload-btn"
              onClick={() => document.getElementById("fileUpload").click()}
            >
              Upload Image
            </button>

            <button className="menu-btn" onClick={() => handleProcessAction('grayscale')}>
              Grayscale
            </button>
            <button className="menu-btn" onClick={() => handleProcessAction('Geometri')}>Geometri</button>
            <button className="menu-btn" onClick={() => handleProcessAction('Morfologi')}>Morfologi</button>
            <button className="menu-btn" onClick={() => handleProcessAction('Edge')}>Edge & Contour</button>
            <button className="menu-btn" onClick={() => handleProcessAction('Analisis')}>Analisis & Segmentasi</button>
          </div>

          <div className="utility-buttons-group">
            <button className="menu-btn info-btn">Tentang Kami</button>
            {/* PERBAIKAN: Langsung panggil handleSaveImage tanpa arrow function tambahan jika tidak ada parameter */}
            <button className="menu-btn save-btn" onClick={handleSaveImage}>Save Image</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;