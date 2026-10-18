import os
from PIL import Image
from typing import Optional, Callable



# GPU Optimization: Speed up CUDA kernels
# Deferred to get_model


# Deferred to get_model
RealESRGANer = None


# Global model instance
_model_instance = None
_last_device = None
_last_model_type = None

def check_ai_status():
    """Check for libraries by looking at the filesystem instead of importing to avoid hangs."""
    import sys
    from pathlib import Path
    
    # Check if weight files exist
    weights_paths = [
        'backend/realesr-general-x4v3.pth',
        'realesr-general-x4v3.pth',
        'backend/realesr-animevideov3.pth',
        'realesr-animevideov3.pth',
        'RealESRGAN_x4.pth',
        'backend/RealESRGAN_x4.pth'
    ]
    weights_exist = any(os.path.exists(p) for p in weights_paths)
    if not weights_exist:
        return "File Missing"
        
    try:
        sp_paths = [Path(p) for p in sys.path if 'site-packages' in p]
        required_libs = ['torch', 'realesrgan', 'basicsr', 'cv2']
        found_libs = []
        
        for lib in required_libs:
            for sp in sp_paths:
                if (sp / lib).is_dir():
                    found_libs.append(lib)
                    break
        
        missing = [l for l in required_libs if l not in found_libs]
        if not missing:
            return True
        return f"Missing: {', '.join(missing)}"
    except Exception:
        return False


def get_model(device_name: str, model_type: str = 'compact'):
    global _model_instance, _last_device, _last_model_type
    
    import torch
    
    if torch.cuda.is_available():
        torch.backends.cudnn.benchmark = True
        
    try:
        from realesrgan import RealESRGANer
    except ImportError:
        print("WARNING: 'realesrgan' library not found. AI upscaling will be disabled.")
        return None
        
    device = torch.device(device_name)
    
    if _model_instance is not None and _last_device == device_name and _last_model_type == model_type:
        return _model_instance
    
    is_cuda = (device_name == 'cuda')
    print(f"Initializing Real-ESRGAN ({model_type} video engine) on {device_name}...")
    try:
        if model_type == 'compact':
            # Ultra-fast 6-layer compact model designed for video
            from basicsr.archs.srvgg_arch import SRVGGNetCompact
            model_arch = SRVGGNetCompact(num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4, act_type='prelu')
            possible_paths = [
                'backend/realesr-general-x4v3.pth',
                'realesr-general-x4v3.pth',
                'backend/realesr-animevideov3.pth',
                'realesr-animevideov3.pth'
            ]
            tile_size = 512
        else:
            from basicsr.archs.rrdbnet_arch import RRDBNet
            model_arch = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
            possible_paths = ['backend/RealESRGAN_x4.pth', 'RealESRGAN_x4.pth']
            tile_size = 400

        final_path = None
        for p in possible_paths:
            if os.path.exists(p):
                final_path = p
                break
        
        if not final_path:
            raise FileNotFoundError(f"Could not find RealESRGAN weight files for {model_type}")

        print(f"Loading weights from {final_path} (tile size: {tile_size})...")
        upsampler = RealESRGANer(
            scale=4,
            model_path=final_path,
            model=model_arch,
            tile=tile_size,
            tile_pad=10,
            pre_pad=0,
            half=is_cuda,
            device=device
        )
        
        _model_instance = upsampler
        _last_device = device_name
        _last_model_type = model_type
        return upsampler
    except Exception as e:
        print(f"FAILED to initialize upscaler: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def imax_enhance(img):
    import numpy as np
    import cv2
    """Apply elite IMAX-style AI mastering with fast native C++ routines:
    - Bilateral Denoising for clean surfaces
    - CLAHE for local contrast
    - Unsharp mask for high-fidelity edge & texture recovery
    - Cinema saturation boost
    """
    # 1. Bilateral filter for noise reduction while keeping edges crisp
    img_denoised = cv2.bilateralFilter(img, 3, 20, 20)
    
    # 2. Local Contrast Enhancement (CLAHE on L channel)
    lab = cv2.cvtColor(img_denoised, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    img_contrast = cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)
    
    # 3. Fast high-fidelity detail sharpening
    gaussian = cv2.GaussianBlur(img_contrast, (0, 0), 2.0)
    img_sharpened = cv2.addWeighted(img_contrast, 1.35, gaussian, -0.35, 0)
    
    # 4. Cinema Color Boost
    hsv = cv2.cvtColor(img_sharpened, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    s = cv2.multiply(s, 1.12)
    img_vibrant = cv2.cvtColor(cv2.merge((h, s, v)), cv2.COLOR_HSV2BGR)
    
    return img_vibrant


def upscale_image(image_path: str, output_path: str, upsampler, outscale: int = 4, enable_imax: bool = True):
    if upsampler is None:
        print(f"DEBUG: Upsampler is NONE, using fallback resize for {image_path}")
        img = Image.open(image_path)
        img = img.resize((img.width * outscale, img.height * outscale), Image.LANCZOS)
        img.save(output_path)
        return

    try:
        import cv2
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)

        if img is None:
            raise ValueError(f"Failed to read image at {image_path}")
            
        output, _ = upsampler.enhance(img, outscale=outscale)
        
        if enable_imax:
            output = imax_enhance(output)
        
        cv2.imwrite(output_path, output)
    except Exception as e:
        print(f"Upscale error on frame: {str(e)}")
        Image.open(image_path).save(output_path)

def upscale_sequence(
    frame_dir: str, 
    output_dir: str, 
    outscale: int = 4, 
    enable_imax: bool = True, 
    progress_callback: Optional[Callable] = None
):
    import time
    os.makedirs(output_dir, exist_ok=True)
    frames = sorted([f for f in os.listdir(frame_dir) if f.endswith('.png')])
    total_frames = len(frames)
    
    if total_frames == 0:
        return
        
    import torch
    device_name = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = get_model(device_name, model_type='compact')

    start_time = time.time()
    for i, frame in enumerate(frames):
        input_p = os.path.join(frame_dir, frame)
        output_p = os.path.join(output_dir, frame)
        
        if not os.path.exists(output_p):
            max_retries = 2
            for attempt in range(max_retries + 1):
                try:
                    upscale_image(input_p, output_p, model, outscale=outscale, enable_imax=enable_imax)
                    break 
                except Exception as e:
                    if attempt == max_retries:
                        print(f"CRITICAL: Failed to upscale frame {frame} after {max_retries} retries. Using fallback.")
                        import shutil
                        shutil.copy(input_p, output_p)
                    else:
                        print(f"RETRY: Frame {frame} failed (attempt {attempt+1}). Retrying...")

        if progress_callback:
            elapsed = time.time() - start_time
            current = i + 1
            sec_per_frame = elapsed / current if current > 0 else 0
            eta_seconds = (total_frames - current) * sec_per_frame
            percent = (current / total_frames) * 100
            progress_callback(percent, current, total_frames, elapsed, eta_seconds, sec_per_frame)
    
    if progress_callback:
        elapsed = time.time() - start_time
        progress_callback(100.0, total_frames, total_frames, elapsed, 0.0, 0.0)
