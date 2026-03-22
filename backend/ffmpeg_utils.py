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
            f'-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -c:a copy "{output_path}"'
        )
    else:
        command = (
            f'"{ffmpeg_exe}" -hide_banner -y -framerate {framerate} -i "{frame_dir}/frame_%05d.png" '
            f'-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "{output_path}"'
        )
    subprocess.run(command, shell=True, check=True)

def get_frame_count(video_path):
    # Using cv2 for frame count, more robust than CLI ffprobe on varied systems
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return 0
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    return count
