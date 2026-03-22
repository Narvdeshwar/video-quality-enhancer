# Setup & Run Guide 🚀

Follow these steps to get the **Video Quality Enhancer** project running on your Windows machine.

## Prerequisites 🛠️
Ensure the following are installed:
- [**Node.js (LTS)**](https://nodejs.org/) (e.g. v20.x+)
- [**Python 3.10+**](https://www.python.org/downloads/)

## Quick Start (Automated) ⚡

We've provided batch files to automate the setup and running of the project:

### 1. Start Backend
Double-click `start_backend.bat` in the project root.
- It will create a Python virtual environment (`venv`).
- It will install all AI and server dependencies.
- The server will start on `http://localhost:8000`.

### 2. Start Frontend
Double-click `start_frontend.bat` in the project root.
- It will run `npm install` for dependencies.
- The Vite development server will start (usually on `http://localhost:5173`).

---

## Manual Steps (If needed) 🛠️

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting 💡
- **Model Weights**: The project uses `RealESRGAN_x4.pth`. If not automatically downloaded, ensure it's placed in the `backend/` directory.
- **Port Conflict**: If port `8000` or `5173` is in use, modify `app.py` or `vite.config.js` respectively.
- **CORS Issues**: The backend is configured to allow `*` origins by default, but check `backend/app.py` if frontend can't connect.
