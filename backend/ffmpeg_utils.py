import subprocess
import os
import imageio_ffmpeg
import cv2

def extract_frames(video_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Phase 5: Fast extraction settings
    # -hide_banner to reduce noise
    command = f'"{ffmpeg_exe}" -hide_banner -i "{video_path}" -q:v 2 "{output_dir}/frame_%05d.png"'
    subprocess.run(command, shell=True, check=True)

def merge_video(frame_dir, output_path, framerate=30, original_video_path=None):
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Phase 5: Audio Preservation & Performance Preset
    # We use mapping to take video from frames and audio from original source.
    # The '?' in -map 1:a:0? ensures it doesn't fail if the video has no audio.
    if original_video_path and os.path.exists(original_video_path):
        command = (
            f'"{ffmpeg_exe}" -hide_banner -y -framerate {framerate} -i "{frame_dir}/frame_%05d.png" '
            f'-i "{original_video_path}" -map 0:v:0 -map 1:a:0? '
            f'-c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -c:a copy "{output_path}"'
        )
    else:
        command = (
            f'"{ffmpeg_exe}" -hide_banner -y -framerate {framerate} -i "{frame_dir}/frame_%05d.png" '
            f'-c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p "{output_path}"'
        )
    subprocess.run(command, shell=True, check=True)

def get_frame_count(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return 0
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    return count

def get_video_info(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "width": 0,
            "height": 0,
            "fps": 30,
            "frames": 0,
            "duration": 0,
            "resolution": "Unknown",
            "aspect_ratio": "Unknown",
            "is_vertical": False
        }
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = round(frames / fps, 1) if fps > 0 else 0
    cap.release()

    is_vertical = height > width
    aspect = "9:16 (Shorts/Reels)" if is_vertical else "16:9 (Landscape)"
    
    # Categorize base resolution
    if min(width, height) >= 2160:
        base_res = "4K"
    elif min(width, height) >= 1440:
        base_res = "2K"
    elif min(width, height) >= 1080:
        base_res = "1080p (FHD)"
    elif min(width, height) >= 720:
        base_res = "720p (HD)"
    else:
        base_res = f"{min(width, height)}p (SD)"

    return {
        "width": width,
        "height": height,
        "fps": round(fps, 1),
        "frames": frames,
        "duration": duration,
        "resolution_name": base_res,
        "resolution": f"{width}x{height}",
        "aspect_ratio": aspect,
        "is_vertical": is_vertical
    }
