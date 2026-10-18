from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import threading
import queue
from typing import Dict, List, Optional
from pydantic import BaseModel
from ffmpeg_utils import extract_frames, merge_video, get_video_info
from upscale import upscale_sequence

class ProcessOptions(BaseModel):
    quality: Optional[str] = "2k"
    enable_imax: Optional[bool] = True

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
            job_id = str(job)
            process_video_task(job_id)
        finally:
            job_queue.task_done()

def process_video_task(job_id: str):
    try:
        job = jobs[job_id]
        video_path = job["path"]
        quality = job.get("quality", "2k")
        enable_imax = job.get("enable_imax", True)
        outscale = 2 if str(quality).lower() == "2k" else 4

        # 1. Extract Frames
        job["status"] = "Extracting Frames"
        job["progress"] = 10
        extract_dir = os.path.join(FRAMES_DIR, f"{job_id}_input")
        processed_dir = os.path.join(FRAMES_DIR, f"{job_id}_output")
        extract_frames(video_path, extract_dir)

        # 2. AI Upscale
        job["status"] = "AI Upscaling"
        job["progress"] = 30

        def update_progress(p, current, total, elapsed=0, eta=0, sec_per_frame=0):
            job["progress"] = 30 + (p * 0.6)
            job["current_frame"] = current
            job["total_frames"] = total
            job["elapsed_seconds"] = round(elapsed)
            job["eta_seconds"] = round(eta)
            job["sec_per_frame"] = round(sec_per_frame, 1)

        upscale_sequence(
            extract_dir, 
            processed_dir, 
            outscale=outscale, 
            enable_imax=enable_imax, 
            progress_callback=update_progress
        )

        # 3. Merge Output
        job["status"] = "Finalizing"
        job["progress"] = 90
        output_file = os.path.join(OUTPUT_DIR, f"{job_id}_upscaled.mp4")
        fps = job.get("video_info", {}).get("fps", 30)
        merge_video(processed_dir, output_file, framerate=fps, original_video_path=video_path)

        # 4. Success
        job["status"] = "completed"
        job["progress"] = 100
        job["eta_seconds"] = 0
    except Exception as e:
        print(f"ERROR: {str(e)}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

# Start worker thread
worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    MAX_SIZE = 100 * 1024 * 1024

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (Limit: 100MB)")

    job_id = str(uuid.uuid4())
    filename = file.filename
    file_extension = os.path.splitext(filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}{file_extension}")

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    video_info = get_video_info(file_path)
    total_f = video_info.get("frames", 0)

    estimates = {
        "2k_fast": total_f * 7,
        "2k_imax": total_f * 8,
        "4k_fast": total_f * 15,
        "4k_imax": total_f * 18,
    }

    jobs[job_id] = {
        "id": job_id,
        "filename": filename,
        "status": "uploaded",
        "progress": 0,
        "path": file_path,
        "video_info": video_info,
        "estimates": estimates,
        "quality": "2k",
        "enable_imax": True,
        "elapsed_seconds": 0,
        "eta_seconds": estimates["2k_fast"],
        "sec_per_frame": 0
    }
    return {
        "job_id": job_id, 
        "filename": filename,
        "video_info": video_info, 
        "estimates": estimates, 
        "message": "Uploaded"
    }

@app.post("/process/{job_id}")
async def start_processing(job_id: str, options: Optional[ProcessOptions] = None):
    if job_id not in jobs:
        raise HTTPException(status_code=404)

    if jobs[job_id]["status"] in ["Extracting Frames", "AI Upscaling", "Finalizing", "processing"]:
        return {"status": "already_queued"}

    if options:
        jobs[job_id]["quality"] = options.quality or "2k"
        jobs[job_id]["enable_imax"] = options.enable_imax if options.enable_imax is not None else True

    jobs[job_id]["status"] = "queued"
    job_queue.put(job_id)
    return {
        "status": "queued", 
        "job_id": job_id, 
        "quality": jobs[job_id].get("quality", "2k"), 
        "enable_imax": jobs[job_id].get("enable_imax", True)
    }

@app.get("/jobs")
async def list_jobs():
    return list(jobs.values())

@app.get("/progress/{job_id}")
async def get_progress(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404)
    from upscale import _model_instance, check_ai_status
    status = check_ai_status()
    jobs[job_id]["ai_active"] = (status is True) or (_model_instance is not None)
    jobs[job_id]["ai_error"] = status if isinstance(status, str) else None
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
    upload_path = job.get("path")
    if upload_path and os.path.exists(upload_path):
        try:
            os.remove(upload_path)
        except Exception:
            pass

    input_frames_dir = os.path.join(FRAMES_DIR, f"{job_id}_input")
    output_frames_dir = os.path.join(FRAMES_DIR, f"{job_id}_output")
    if os.path.exists(input_frames_dir):
        try:
            shutil.rmtree(input_frames_dir)
        except Exception:
            pass
    if os.path.exists(output_frames_dir):
        try:
            shutil.rmtree(output_frames_dir)
        except Exception:
            pass

    output_video_path = os.path.join(OUTPUT_DIR, f"{job_id}_upscaled.mp4")
    if os.path.exists(output_video_path):
        try:
            os.remove(output_video_path)
        except Exception:
            pass

    del jobs[job_id]
    return {"status": "success", "message": f"Job {job_id} cleaned up"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
