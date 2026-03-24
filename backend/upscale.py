import torch
import cv2
import os
from PIL import Image
from typing import Optional, Callable

# GPU Optimization: Speed up CUDA kernels
if torch.cuda.is_available():
    torch.backends.cudnn.benchmark = True

try:
    from realesrgan import RealESRGANer
except ImportError:
    RealESRGANer = None
    print("WARNING: 'realesrgan' library (xinntao version) not found. AI upscaling will be disabled.")

# Global model instance
_model_instance = None
_last_device = None

def get_model(device_name: str, model_path: str = 'RealESRGAN_x4.pth'):
    global _model_instance, _last_device
    
    if RealESRGANer is None:
        return None
        
    device = torch.device(device_name)
    
    if _model_instance is not None and _last_device == device_name:
        return _model_instance
    
    print(f"Initializing Real-ESRGAN (version 0.3.0) on {device_name}...")
    try:
        # Phase 5: FP16 Optimization & Tiling
        # We use tile=400 to prevent OOM on typical GPUs while maintaining speed.
        # half=True is used for CUDA to leverage FP16 performance.
        is_cuda = (device_name == 'cuda')
        
        # Determine weight path
        # RealESRGANer expects the model architecture to be set up.
        # We need a model structure. For x4plus, we use RRDBNet.
        from basicsr.archs.rrdbnet_arch import RRDBNet
        model_arch = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        
        # Try multiple paths for weights
        possible_paths = [model_path, 'RealESRGAN_x4.pth', 'backend/RealESRGAN_x4plus.pth']
        final_path = None
        for p in possible_paths:
            if os.path.exists(p):
                final_path = p
                break
        
        if not final_path:
            raise FileNotFoundError("Could not find RealESRGAN weight files (.pth)")

        upsampler = RealESRGANer(
            scale=4,
            model_path=final_path,
            model=model_arch,
            tile=400,     # Phase 5: Tiling (400x400)
            tile_pad=10,
            pre_pad=0,
            half=is_cuda, # Phase 5: FP16 (Half precision)
            device=device
        )
        
        _model_instance = upsampler
        _last_device = device_name
        return upsampler
    except Exception as e:
        print(f"FAILED to initialize upscaler: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def upscale_image(image_path: str, output_path: str, upsampler):
    if upsampler is None:
        # Fallback: Just resize if AI is missing (Phase 5 safety)
        img = Image.open(image_path)
        img = img.resize((img.width * 4, img.height * 4), Image.LANCZOS)
        img.save(output_path)
        return

    try:
        # Load image with OpenCV (as expected by RealESRGANer)
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError(f"Failed to read image at {image_path}")
            
        # Enhance with RealESRGANer
        output, _ = upsampler.enhance(img, outscale=4)
        
        # Save output
        cv2.imwrite(output_path, output)
    except Exception as e:
        print(f"Upscale error on frame: {str(e)}")
        # Quick fallback if a specific frame fails
        Image.open(image_path).save(output_path)

def upscale_sequence(frame_dir: str, output_dir: str, progress_callback: Optional[Callable[[float, int, int], None]] = None):
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
            # Phase 4: Automatic retry logic for specific frames
            max_retries = 2
            for attempt in range(max_retries + 1):
                try:
                    upscale_image(input_p, output_p, model)
                    break 
                except Exception as e:
                    if attempt == max_retries:
                        print(f"CRITICAL: Failed to upscale frame {frame} after {max_retries} retries. Using fallback.")
                        import shutil
                        shutil.copy(input_p, output_p)
                    else:
                        print(f"RETRY: Frame {frame} failed (attempt {attempt+1}). Retrying...")

        if progress_callback:
            progress_callback(((i + 1) / total_frames) * 100, i + 1, total_frames)
    
    if progress_callback:
        progress_callback(100.0, total_frames, total_frames)
