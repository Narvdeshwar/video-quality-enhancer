from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import threading
from typing import Dict
from ffmpeg_utils import extract_frames, merge_video
from upscale import upscale_sequence

app = FastAPI()

# Configuration
STORAGE_ROOT = os.path.join("..", "storage")
UPLOAD_DIR = os.path.join(STORAGE_ROOT, "uploads")
FRAMES_DIR = os.path.join(STORAGE_ROOT, "frames")
OUTPUT_DIR = os.path.join(STORAGE_ROOT, "output")

# Ensure directories exist
for d in [UPLOAD_DIR, FRAMES_DIR, OUTPUT_DIR]:
    os.makedirs(d, exist_ok=True)

# Add CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Progress tracking
jobs: Dict[str, Dict] = {}

def process_video_task(job_id: str):
    try:
        job = jobs[job_id]
        video_path = job["path"]
        
        # 1. Extract Frames
        job["status"] = "Extracting Frames"
        job["progress"] = 10
        extract_dir = os.path.join(FRAMES_DIR, f"{job_id}_input")
        processed_dir = os.path.join(FRAMES_DIR, f"{job_id}_output")
        extract_frames(video_path, extract_dir)
        
        # 2. AI Upscale (Phase 5: Batching & Tiling)
        job["status"] = "AI Upscaling (Real-ESRGAN)"
        job["progress"] = 30
        
        # We need a progress callback for upscale_sequence
        def update_progress(p):
            job["progress"] = 30 + (p * 0.6) # Scale 30-90%
            
        upscale_sequence(extract_dir, processed_dir, progress_callback=update_progress)
        
        # 3. Merge Output
        job["status"] = "Finalizing Video"
        job["progress"] = 90
        output_file = os.path.join(OUTPUT_DIR, f"{job_id}_upscaled.mp4")
        merge_video(processed_dir, output_file, original_video_path=video_path)
        
        # 4. Success
        job["status"] = "completed"
        job["progress"] = 100
        
        # Cleanup input frames (optional optimization)
        # shutil.rmtree(extract_dir)
        # shutil.rmtree(processed_dir)
        
    except Exception as e:
        print(f"ERROR in job {job_id}: {str(e)}")
        jobs[job_id]["status"] = "failed"

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}{file_extension}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    jobs[job_id] = {"status": "uploaded", "progress": 0, "path": file_path}
    return {"job_id": job_id, "message": "Video uploaded successfully"}

@app.post("/process/{job_id}")
async def start_processing(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if jobs[job_id]["status"] == "processing":
        return {"status": "already_processing"}
        
    # Start thread
    thread = threading.Thread(target=process_video_task, args=(job_id,))
    thread.start()
    
    return {"status": "started", "job_id": job_id}

@app.get("/progress/{job_id}")
async def get_progress(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": jobs[job_id]["status"], "progress": round(jobs[job_id].get("progress", 0), 1)}

@app.get("/download/{job_id}")
async def download_output(job_id: str):
    if job_id not in jobs or jobs[job_id]["status"] != "completed":
        raise HTTPException(status_code=404, detail="Output not ready")
    
    output_path = os.path.join(OUTPUT_DIR, f"{job_id}_upscaled.mp4")
    return FileResponse(output_path, media_type="video/mp4", filename=f"upscaled_{job_id}.mp4")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
