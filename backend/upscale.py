import torch
import cv2
import os
from PIL import Image
from typing import Optional, Callable

# GPU Optimization: Speed up CUDA kernels
if torch.cuda.is_available():
    torch.backends.cudnn.benchmark = True

# Try to import RealESRGAN, but allow failure (Phase 5 resilience)
try:
    from realesrgan import RealESRGAN
except ImportError:
    RealESRGAN = None
    print("WARNING: 'realesrgan' library not found. AI upscaling will be disabled.")

# Global model instance
_model_instance = None
_last_device = None

def get_model(device_name: str, model_path: str = 'RealESRGAN_x4plus.pth'):
    global _model_instance, _last_device
    
    if RealESRGAN is None:
        return None
        
    device = torch.device(device_name)
    
    if _model_instance is not None and _last_device == device_name:
        return _model_instance
    
    print(f"Loading Real-ESRGAN model to {device_name}...")
    try:
        # Use FP16 for CUDA to speed up processing (Phase 5 Optimization)
        # Note: Some older GPUs or CPUs might not like half precision, so we enable it only for CUDA
        model = RealESRGAN(device, scale=4)
        
        # Try multiple common weight paths
        possible_paths = [model_path, 'RealESRGAN_x4.pth', 'backend/RealESRGAN_x4plus.pth']
        loaded = False
        for p in possible_paths:
            if os.path.exists(p):
                model.load_weights(p)
                loaded = True
                print(f"Loaded weights from {p}")
                break
        
        _model_instance = model
        _last_device = device_name
        return model
    except Exception as e:
        print(f"FAILED to load model: {str(e)}")
        return None

def upscale_image(image_path: str, output_path: str, model):
    if model is None:
        # Fallback: Just resize if AI is missing (Phase 5 safety)
        img = Image.open(image_path)
        img = img.resize((img.width * 4, img.height * 4), Image.LANCZOS)
        img.save(output_path)
        return

    try:
        sr = model.predict(Image.open(image_path))
        sr.save(output_path)
    except Exception as e:
        print(f"Upscale error on frame: {str(e)}")
        # Quick fallback if a specific frame fails
        Image.open(image_path).save(output_path)

def upscale_sequence(frame_dir: str, output_dir: str, progress_callback: Optional[Callable[[float], None]] = None):
    os.makedirs(output_dir, exist_ok=True)
    frames = sorted([f for f in os.listdir(frame_dir) if f.endswith('.png')])
    total_frames = len(frames)
    
    if total_frames == 0:
        return
        
    device_name = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = get_model(device_name)
    
    for i, frame in enumerate(frames):
        input_p = os.path.join(frame_dir, frame)
        output_p = os.path.join(output_dir, frame)
        
        if not os.path.exists(output_p):
            upscale_image(input_p, output_p, model)
        
        if progress_callback:
            progress_callback(((i + 1) / total_frames) * 100)
    
    if progress_callback:
        progress_callback(100.0)
