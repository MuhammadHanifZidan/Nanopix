export const API_BASE_URL = "http://localhost:5000/api";

export const TOOL_CATEGORIES = {
  COLOR: [
    { id: 'grayscale', label: 'Grayscale', endpoint: 'grayscale', params: [] },
    { id: 'brightness-contrast', label: 'Bright/Contrast', endpoint: 'brightness-contrast', params: [
      { id: 'brightness', label: 'Brightness', type: 'range', min: -100, max: 100, default: 0 },
      { id: 'contrast', label: 'Contrast', type: 'range', min: -100, max: 100, default: 0 }
    ]},
    { id: 'hsv', label: 'Hue/Sat/Val', endpoint: 'hsv', params: [
      { id: 'hue', label: 'Hue', type: 'range', min: -180, max: 180, default: 0 },
      { id: 'saturation', label: 'Saturation', type: 'range', min: -100, max: 100, default: 0 },
      { id: 'value', label: 'Value', type: 'range', min: -100, max: 100, default: 0 }
    ]}
  ],
  TRANSFORM: [
    { id: 'crop', label: 'Crop (Area)', endpoint: 'crop', params: [] },
    { id: 'rotate', label: 'Rotate', endpoint: 'rotate', params: [ { id: 'angle', label: 'Angle', type: 'range', min: 0, max: 360, default: 0 } ]},
    { id: 'resize', label: 'Resize', endpoint: 'resize', params: [ { id: 'scale', label: 'Scale (%)', type: 'range', min: 10, max: 400, default: 100 } ]},
    { id: 'flip', label: 'Flip', endpoint: 'flip', params: [ { id: 'direction', label: 'Direction', type: 'select', options: ['horizontal', 'vertical', 'both'], default: 'horizontal' } ]}
  ],
  ENHANCEMENT: [
    { id: 'sharpen', label: 'Sharpen', endpoint: 'sharpen', params: [ { id: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 100, default: 50 } ]},
    { id: 'smooth', label: 'Smooth', endpoint: 'smooth', params: [ { id: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 100, default: 50 } ]},
    { id: 'histeq', label: 'Hist. Equalize', endpoint: 'histeq', params: []}
  ],
  // --- KATEGORI BARU SESUAI BACKEND compress.py ---
  COMPRESSION: [
    { id: 'comp_jpeg', label: 'JPEG Compress', endpoint: 'compress/jpeg', params: [ { id: 'quality', label: 'Quality', type: 'range', min: 1, max: 100, default: 85 } ]},
    { id: 'comp_png', label: 'PNG Lossless', endpoint: 'compress/png', params: [ { id: 'level', label: 'Level', type: 'range', min: 0, max: 9, default: 6 } ]},
    { id: 'comp_rle', label: 'RLE Encode', endpoint: 'compress/rle', params: []},
    { id: 'comp_huffman', label: 'Huffman Code', endpoint: 'compress/huffman', params: []},
    { id: 'comp_arithmetic', label: 'Arithmetic', endpoint: 'compress/arithmetic', params: []}
  ],
  // ------------------------------------------------
  EDGE: [
    { id: 'threshold', label: 'Threshold', endpoint: 'threshold', params: [ { id: 'thresh_value', label: 'Value', type: 'range', min: 0, max: 255, default: 127 }, { id: 'mode', label: 'Mode', type: 'select', options: ['binary', 'binary_inv', 'otsu'], default: 'binary' } ]},
    { id: 'canny', label: 'Canny Edge', endpoint: 'edge/canny', params: [ { id: 'threshold1', label: 'Thresh 1', type: 'range', min: 0, max: 255, default: 100 }, { id: 'threshold2', label: 'Thresh 2', type: 'range', min: 0, max: 255, default: 200 } ]},
    { id: 'sobel', label: 'Sobel', endpoint: 'edge/sobel', params: [ { id: 'direction', label: 'Direction', type: 'select', options: ['x', 'y', 'both'], default: 'both' } ]},
    { id: 'prewitt', label: 'Prewitt', endpoint: 'edge/prewitt', params: []},
    { id: 'robert', label: 'Robert', endpoint: 'edge/robert', params: []},
    { id: 'laplacian', label: 'Laplacian', endpoint: 'edge/laplacian', params: [ { id: 'kernel_size', label: 'Kernel Size', type: 'select', options: [1, 3, 5, 7], default: 3 } ]},
    { id: 'log', label: 'Laplacian of Gaussian', endpoint: 'edge/log', params: [ { id: 'sigma', label: 'Sigma', type: 'range', min: 0.1, max: 5.0, step: 0.1, default: 1.0 } ]},
    { id: 'morphology', label: 'Morphology', endpoint: 'morphology', params: [ { id: 'operation', label: 'Operation', type: 'select', options: ['erosion', 'dilation'], default: 'erosion' }, { id: 'kernel_size', label: 'Kernel Size', type: 'range', min: 3, max: 15, step: 2, default: 3 }, { id: 'iterations', label: 'Iterations', type: 'range', min: 1, max: 5, default: 1 } ]}
  ],
  SEGMENTATION: [
    { id: 'seg_threshold', label: 'Threshold Seg.', endpoint: 'segment/threshold', params: [ { id: 'thresh_value', label: 'Value', type: 'range', min: 0, max: 255, default: 127 }, { id: 'mode', label: 'Mode', type: 'select', options: ['manual', 'otsu'], default: 'otsu' } ]},
    { id: 'seg_edge', label: 'Edge Seg.', endpoint: 'segment/edge', params: [ { id: 'threshold1', label: 'Thresh 1', type: 'range', min: 0, max: 255, default: 50 }, { id: 'threshold2', label: 'Thresh 2', type: 'range', min: 0, max: 255, default: 150 } ]},
    { id: 'seg_region', label: 'Region/K-Means', endpoint: 'segment/region', params: [ { id: 'n_clusters', label: 'Clusters', type: 'range', min: 2, max: 8, default: 3 }, { id: 'min_area', label: 'Min Area', type: 'range', min: 100, max: 5000, step: 100, default: 500 } ]}
  ]
};

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const getImageDimensions = (filename) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1000, h: 1000 }); 
    img.src = `${API_BASE_URL}/image/${filename}`;
  });
};

export const formatSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return "0.00 KB";
  const kb = bytes / 1024;
  if (kb > 1024) return (kb / 1024).toFixed(2) + " MB";
  return kb.toFixed(2) + " KB";
};