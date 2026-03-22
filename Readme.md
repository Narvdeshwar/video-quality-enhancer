# 🎥 Video Quality Enhancer (AI Video Upscaler)

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0%2B-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Transform low-resolution videos into stunning high-definition masterpieces using state-of-the-art **Real-ESRGAN** AI models. This full-stack application provides a seamless, local-first experience for video enhancement.

---

## ✨ Features

- **🚀 4x AI Super-Resolution**: Upscale footage from 480p to 4K with intelligent detail reconstruction.
- **🖼️ Frame-by-Frame Processing**: Precision extraction and AI-driven enhancement for every single frame.
- **⚡ Real-Time Progress**: Interactive dashboard showing current stage (Extraction, AI Processing, Merging).
- **🔒 Local & Private**: All video processing stays on your machine—no cloud uploads required.
- **🎨 Modern UI**: Sleek, responsive interface built with React and Tailwind CSS.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **React.js + Vite** | Dynamic & fast dashboard interface. |
| **Backend** | **FastAPI** | High-performance Python async API. |
| **AI Model** | **Real-ESRGAN** | Deep learning model for 4x upscaling. |
| **Deep Learning** | **PyTorch** | Backend for AI model execution (supports CUDA). |
| **Video Ops** | **FFmpeg & OpenCV** | Frame extraction and high-quality merging. |
| **Styling** | **Tailwind CSS** | Premium, modern design system. |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **Python**: 3.10 or higher
- **FFmpeg**: (Optional, handled by Python libraries)

### Quick Start (Windows)
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Narvdeshwar/video-quality-enhancer.git
   cd video-quality-enhancer
   ```

2. **Start Backend**:
   Double-click `start_backend.bat`. It will set up the virtual environment and install AI weight files.

3. **Start Frontend**:
   Double-click `start_frontend.bat`. It will install UI dependencies and launch the dev server.

4. **Enhance!**:
   Navigate to `http://localhost:5173` in your browser.

---

## 📂 Project Architecture

```
ai-upscaler/
├── backend/          # FastAPI server & AI logic
│   ├── app.py        # API endpoints
│   ├── upscale.py    # Real-ESRGAN integration
│   └── requirements.txt
├── frontend/         # React application (Vite)
├── storage/          # Temporary & output files
│   ├── uploads/      # User-uploaded videos
│   ├── frames/       # Temporary frames during processing
│   └── output/       # Final upscaled videos
└── scripts/          # Automation & utility scripts
```

---

## 🧠 How the AI Works

The enhancer follows a 4-step pipeline:
1. **Extraction**: `FFmpeg` deconstructs the video into high-quality PNG frame sequences.
2. **AI Inference**: Each frame is passed through the `Real-ESRGAN` model using **Tiling** (to prevent GPU memory overflow).
3. **Reconstruction**: `FFmpeg` merges the upscaled frames back into an `.mp4` container.
4. **Finalization**: Metadata and audio (if present) are mapped back to the output video.

---

## 🗺️ Roadmap & Progress

- [x] Phase 1: Core Backend & API Design
- [x] Phase 2: AI Engine Integration (Real-ESRGAN)
- [x] Phase 3: React Frontend Dashboard
- [x] Phase 4: Error Handling & Resilience
- [x] Phase 5: GPU/CUDA Optimization Flags (FP16 & Tiling)
- [x] Phase 6: Batch Processing Mode (Job Queue System)


---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---
*Created with ❤️ by Narvdeshwar*
