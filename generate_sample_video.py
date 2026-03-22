import cv2
import numpy as np
import os

def generate_low_quality_video(output_path, duration=3, fps=24, resolution=(128, 128)):
    """Generates a low-quality, pixelated sample video with a moving circle."""
    print(f"Generating low-quality sample video at {output_path}...")
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v') # Using mp4v codec
    out = cv2.VideoWriter(output_path, fourcc, fps, resolution)
    
    num_frames = duration * fps
    
    for i in range(num_frames):
        # Create a black frame
        frame = np.zeros((resolution[1], resolution[0], 3), dtype=np.uint8)
        
        # Draw a moving circle (low-res appearance)
        center_x = int((resolution[0] / 2) + (resolution[0] / 3) * np.sin(2 * np.pi * i / num_frames))
        center_y = int((resolution[1] / 2) + (resolution[1] / 3) * np.cos(2 * np.pi * i / num_frames))
        
        cv2.circle(frame, (center_x, center_y), 15, (0, 255, 0), -1) # Green circle
        
        # Add some "noise" to simulate low quality
        noise = np.random.randint(0, 50, (resolution[1], resolution[0], 3), dtype=np.uint8)
        frame = cv2.add(frame, noise)
        
        # Upscale and downscale to simulate pixelation
        frame = cv2.resize(frame, (resolution[0]//4, resolution[1]//4), interpolation=cv2.INTER_NEAREST)
        frame = cv2.resize(frame, (resolution[0], resolution[1]), interpolation=cv2.INTER_NEAREST)
        
        out.write(frame)
    
    out.release()
    print("Done! Sample video generated.")

if __name__ == "__main__":
    upload_dir = os.path.join("storage", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    out_path = os.path.join(upload_dir, "sample_low_quality.mp4")
    generate_low_quality_video(out_path)
