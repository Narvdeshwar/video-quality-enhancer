from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import threading
import queue
from typing import Dict, List
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

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Progress tracking
jobs: Dict[str, Dict] = {}
job_queue = queue.Queue()

def worker():
    """Background worker to process jobs sequentially (Phase 6: Batching)"""
    while True:
        job = job_queue.get()
        if job is None:
            break
        try:
            # Ensure job is a string before passing to process_video_task
            job_id = str(job)
            process_video_task(job_id)
        finally:
            job_queue.task_done()


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
        
        # 2. AI Upscale
        job["status"] = "AI Upscaling"
        job["progress"] = 30
        
        def update_progress(p, current, total):
            job["progress"] = 30 + (p * 0.6)
            job["current_frame"] = current
            job["total_frames"] = total
            
        upscale_sequence(extract_dir, processed_dir, progress_callback=update_progress)
        
        # 3. Merge Output
        job["status"] = "Finalizing"
        job["progress"] = 90
        output_file = os.path.join(OUTPUT_DIR, f"{job_id}_upscaled.mp4")
        merge_video(processed_dir, output_file, original_video_path=video_path)
        
        # 4. Success
        job["status"] = "completed"
        job["progress"] = 100
    except Exception as e:
        print(f"ERROR: {str(e)}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

# Start worker thread
worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    # Limit: 100MB (100 * 1024 * 1024 bytes)
    MAX_SIZE = 100 * 1024 * 1024
    
    # We can check the size before saving
    # FastAPI's UploadFile.size is the easiest way. 
    # If not present, we check during the read/write process.
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (Limit: 100MB)")
    
    job_id = str(uuid.uuid4())
    filename = file.filename
    file_extension = os.path.splitext(filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}{file_extension}")
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    jobs[job_id] = {
        "id": job_id,
        "filename": filename,
        "status": "uploaded",
        "progress": 0,
        "path": file_path
    }
    return {"job_id": job_id, "message": "Uploaded"}

@app.post("/process/{job_id}")
async def start_processing(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404)
    
    if jobs[job_id]["status"] in ["Extracting", "AI Upscaling", "Finalizing", "processing"]:
        return {"status": "already_queued"}
        
    jobs[job_id]["status"] = "queued"
    job_queue.put(job_id)
    return {"status": "queued", "job_id": job_id}

@app.get("/jobs")
async def list_jobs():
    return list(jobs.values())

@app.get("/progress/{job_id}")
async def get_progress(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404)
    return jobs[job_id]

@app.get("/download/{job_id}")
async def download_output(job_id: str):
    if job_id not in jobs or jobs[job_id]["status"] != "completed":
        raise HTTPException(status_code=404)
    path = os.path.join(OUTPUT_DIR, f"{job_id}_upscaled.mp4")
    return FileResponse(path, media_type="video/mp4", filename=f"upscaled_{jobs[job_id]['filename']}")

@app.delete("/cleanup/{job_id}")
async def cleanup_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    # 1. Delete uploaded file
    upload_path = job.get("path")
    if upload_path and os.path.exists(upload_path):
        os.remove(upload_path)
    
    # 2. Delete frames
    input_frames_dir = os.path.join(FRAMES_DIR, f"{job_id}_input")
    output_frames_dir = os.path.join(FRAMES_DIR, f"{job_id}_output")
    if os.path.exists(input_frames_dir):
        shutil.rmtree(input_frames_dir)
    if os.path.exists(output_frames_dir):
        shutil.rmtree(output_frames_dir)
    
    # 3. Delete output video
    output_video_path = os.path.join(OUTPUT_DIR, f"{job_id}_upscaled.mp4")
    if os.path.exists(output_video_path):
        os.remove(output_video_path)
    
    # 4. Remove from jobs dict
    del jobs[job_id]
    
    return {"status": "success", "message": f"Job {job_id} cleaned up"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

