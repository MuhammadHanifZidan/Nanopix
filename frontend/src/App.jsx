import { useState } from "react";

function App() {

  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");

  const handleUpload = async () => {

    if (!file) {
      alert("Pilih file dulu");
      return;
    }

    const formData = new FormData();

    formData.append("file", file);

    try {

      const response = await fetch(
        "http://localhost:5000/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      console.log(data);

      setFilename(data.filename);

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>

      <h1>Test Upload Image</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={handleUpload}>
        Upload
      </button>

      {
        filename && (
          <div>
            <h3>Hasil Upload:</h3>

            <img
              src={`http://localhost:5000/api/image/${filename}`}
              alt="uploaded"
              width="300"
            />
          </div>
        )
      }

    </div>
  );
}

export default App;