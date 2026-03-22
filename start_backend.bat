@echo off
echo Starting Backend...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate

echo Updating pip and setuptools...
python -m pip install --upgrade pip setuptools wheel

echo Installing basic requirements...
pip install fastapi uvicorn[standard] python-multipart opencv-python Pillow aiofiles torch torchvision torchaudio imageio-ffmpeg

echo Installing AI components (handling basicsr bug)...
:: We install basicsr without dependencies first to avoid the __version__ bug
pip install basicsr --no-deps
pip install realesrgan

python app.py
pause
