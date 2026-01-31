"""
FFmpeg REST API for ImmoGuinee
Internal service accessible from n8n via backend-network.
"""

import json
import os
import subprocess
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="FFmpeg API", docs_url=None, redoc_url=None)

DATA_DIR = Path("/data")
API_KEY = os.environ.get("FFMPEG_API_KEY", "")


def verify_api_key(x_api_key: str | None = Header(None)):
    """Validate API key. Skipped if no key is configured (internal-only service)."""
    if not API_KEY:
        return
    if x_api_key and x_api_key == API_KEY:
        return
    raise HTTPException(401, "Invalid API key")


def save_upload(file: UploadFile) -> Path:
    """Save uploaded file to data directory with unique name."""
    ext = Path(file.filename or "input").suffix or ".bin"
    path = DATA_DIR / f"{uuid.uuid4().hex}{ext}"
    with open(path, "wb") as f:
        for chunk in file.file:
            f.write(chunk)
    return path


def run_ffmpeg(args: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    """Run ffmpeg with given arguments."""
    cmd = ["ffmpeg", "-y", "-hide_banner"] + args
    return subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout
    )


def run_ffprobe(args: list[str], timeout: int = 30) -> subprocess.CompletedProcess:
    """Run ffprobe with given arguments."""
    cmd = ["ffprobe"] + args
    return subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout
    )


# ============================================
# GET /health
# ============================================
@app.get("/health")
def health():
    """Health check: verify ffmpeg is available."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True, text=True, timeout=5
        )
        version = result.stdout.split("\n")[0] if result.returncode == 0 else "unknown"
    except Exception:
        version = "unavailable"

    return {
        "status": "ok",
        "ffmpeg": version,
        "data_dir": str(DATA_DIR),
        "data_writable": os.access(DATA_DIR, os.W_OK),
    }


# ============================================
# POST /probe
# ============================================
@app.post("/probe")
async def probe(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(None),
):
    """Get media file information using ffprobe."""
    verify_api_key(x_api_key)
    input_path = save_upload(file)

    try:
        result = run_ffprobe([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(input_path),
        ])
        if result.returncode != 0:
            raise HTTPException(422, f"ffprobe error: {result.stderr}")

        return JSONResponse(content=json.loads(result.stdout))
    finally:
        input_path.unlink(missing_ok=True)


# ============================================
# POST /convert
# ============================================
@app.post("/convert")
async def convert(
    file: UploadFile = File(...),
    output_format: str = Form("mp4"),
    video_codec: str = Form(""),
    audio_codec: str = Form(""),
    resolution: str = Form(""),
    x_api_key: str | None = Header(None),
):
    """Convert media file to specified format/codec/resolution."""
    verify_api_key(x_api_key)
    input_path = save_upload(file)
    output_path = DATA_DIR / f"{uuid.uuid4().hex}.{output_format}"

    try:
        args = ["-i", str(input_path)]

        if video_codec:
            args += ["-c:v", video_codec]
        if audio_codec:
            args += ["-c:a", audio_codec]
        if resolution:
            args += ["-vf", f"scale={resolution}"]

        args.append(str(output_path))
        result = run_ffmpeg(args)

        if result.returncode != 0 or not output_path.exists():
            raise HTTPException(422, f"Conversion failed: {result.stderr}")

        return FileResponse(
            str(output_path),
            media_type="application/octet-stream",
            filename=f"converted.{output_format}",
            background=_cleanup_task(input_path, output_path),
        )
    except HTTPException:
        raise
    except Exception as e:
        input_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        raise HTTPException(500, str(e))


# ============================================
# POST /thumbnail
# ============================================
@app.post("/thumbnail")
async def thumbnail(
    file: UploadFile = File(...),
    time_offset: str = Form("00:00:01"),
    width: int = Form(320),
    height: int = Form(-1),
    output_format: str = Form("jpg"),
    x_api_key: str | None = Header(None),
):
    """Generate a thumbnail from a video at the given time offset."""
    verify_api_key(x_api_key)
    input_path = save_upload(file)
    output_path = DATA_DIR / f"{uuid.uuid4().hex}.{output_format}"

    try:
        result = run_ffmpeg([
            "-i", str(input_path),
            "-ss", time_offset,
            "-vframes", "1",
            "-vf", f"scale={width}:{height}",
            str(output_path),
        ])

        if result.returncode != 0 or not output_path.exists():
            raise HTTPException(422, f"Thumbnail generation failed: {result.stderr}")

        return FileResponse(
            str(output_path),
            media_type=f"image/{output_format}",
            filename=f"thumbnail.{output_format}",
            background=_cleanup_task(input_path, output_path),
        )
    except HTTPException:
        raise
    except Exception as e:
        input_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        raise HTTPException(500, str(e))


# ============================================
# POST /extract-audio
# ============================================
@app.post("/extract-audio")
async def extract_audio(
    file: UploadFile = File(...),
    audio_codec: str = Form("aac"),
    output_format: str = Form("m4a"),
    x_api_key: str | None = Header(None),
):
    """Extract audio track from a video file."""
    verify_api_key(x_api_key)
    input_path = save_upload(file)
    output_path = DATA_DIR / f"{uuid.uuid4().hex}.{output_format}"

    try:
        result = run_ffmpeg([
            "-i", str(input_path),
            "-vn",
            "-c:a", audio_codec,
            str(output_path),
        ])

        if result.returncode != 0 or not output_path.exists():
            raise HTTPException(422, f"Audio extraction failed: {result.stderr}")

        return FileResponse(
            str(output_path),
            media_type="audio/mp4",
            filename=f"audio.{output_format}",
            background=_cleanup_task(input_path, output_path),
        )
    except HTTPException:
        raise
    except Exception as e:
        input_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        raise HTTPException(500, str(e))


# ============================================
# POST /compress
# ============================================
@app.post("/compress")
async def compress(
    file: UploadFile = File(...),
    crf: int = Form(23),
    max_width: int = Form(1920),
    audio_bitrate: str = Form("128k"),
    x_api_key: str | None = Header(None),
):
    """Compress video with H.264 + AAC for web delivery."""
    verify_api_key(x_api_key)
    input_path = save_upload(file)
    output_path = DATA_DIR / f"{uuid.uuid4().hex}.mp4"

    try:
        result = run_ffmpeg([
            "-i", str(input_path),
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", str(crf),
            "-vf", f"scale='min({max_width},iw)':-2",
            "-c:a", "aac",
            "-b:a", audio_bitrate,
            "-movflags", "+faststart",
            str(output_path),
        ])

        if result.returncode != 0 or not output_path.exists():
            raise HTTPException(422, f"Compression failed: {result.stderr}")

        input_size = input_path.stat().st_size
        output_size = output_path.stat().st_size

        return FileResponse(
            str(output_path),
            media_type="video/mp4",
            filename="compressed.mp4",
            headers={
                "X-Original-Size": str(input_size),
                "X-Compressed-Size": str(output_size),
                "X-Compression-Ratio": f"{output_size / input_size:.2%}" if input_size > 0 else "N/A",
            },
            background=_cleanup_task(input_path, output_path),
        )
    except HTTPException:
        raise
    except Exception as e:
        input_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        raise HTTPException(500, str(e))


# ============================================
# POST /compose
# ============================================
@app.post("/compose")
async def compose(
    images: list[UploadFile] = File(...),
    audio: Optional[UploadFile] = File(None),
    duration_per_image: float = Form(3.0),
    transition: str = Form("fade"),
    transition_duration: float = Form(0.5),
    width: int = Form(1280),
    height: int = Form(720),
    fps: int = Form(25),
    zoom_effect: str = Form("random"),
    zoom_factor: float = Form(1.3),
    output_format: str = Form("mp4"),
    x_api_key: str | None = Header(None),
):
    """Create a slideshow video from multiple images with optional audio track.

    - images: 2+ image files (jpg, png, webp)
    - audio: optional audio file (mp3, m4a, wav) used as background track
    - duration_per_image: seconds each image is displayed (default 3s)
    - transition: transition type — "fade" or "none" (default "fade")
    - transition_duration: fade duration in seconds (default 0.5s)
    - width/height: output resolution (default 1280x720)
    - fps: frames per second (default 25)
    - zoom_effect: Ken Burns effect — "zoom_in", "zoom_out", "pan_left", "pan_right", "random", "none"
    - zoom_factor: zoom intensity (1.0=none, 1.3=default, 1.5=50%)
    - output_format: output format (default "mp4")
    """
    verify_api_key(x_api_key)

    if len(images) < 2:
        raise HTTPException(422, "At least 2 images are required")

    batch_id = uuid.uuid4().hex
    image_paths: list[Path] = []
    audio_path: Path | None = None
    output_path = DATA_DIR / f"{batch_id}_slideshow.mp4"
    concat_file = DATA_DIR / f"{batch_id}_concat.txt"

    try:
        # Save all uploaded images
        for i, img in enumerate(images):
            ext = Path(img.filename or "img.jpg").suffix or ".jpg"
            p = DATA_DIR / f"{batch_id}_img{i:03d}{ext}"
            with open(p, "wb") as f:
                for chunk in img.file:
                    f.write(chunk)
            image_paths.append(p)

        # Save audio if provided
        if audio is not None:
            ext = Path(audio.filename or "audio.mp3").suffix or ".mp3"
            audio_path = DATA_DIR / f"{batch_id}_audio{ext}"
            with open(audio_path, "wb") as f:
                for chunk in audio.file:
                    f.write(chunk)

        if transition == "fade" and transition_duration > 0:
            # Build with xfade transitions between images
            result = _compose_with_xfade(
                image_paths, audio_path, output_path,
                duration_per_image, transition_duration,
                width, height, fps,
                zoom_effect, zoom_factor,
            )
        else:
            # Simple concat — no transitions
            result = _compose_simple_concat(
                image_paths, audio_path, output_path, concat_file,
                duration_per_image, width, height, fps,
            )

        if result.returncode != 0 or not output_path.exists():
            raise HTTPException(422, f"Slideshow creation failed: {result.stderr}")

        cleanup_paths = image_paths + [output_path, concat_file]
        if audio_path:
            cleanup_paths.append(audio_path)

        return FileResponse(
            str(output_path),
            media_type="video/mp4",
            filename="slideshow.mp4",
            background=_cleanup_task(*cleanup_paths),
        )
    except HTTPException:
        raise
    except Exception as e:
        # Cleanup on error
        for p in image_paths:
            p.unlink(missing_ok=True)
        if audio_path:
            audio_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        concat_file.unlink(missing_ok=True)
        raise HTTPException(500, str(e))


ZOOM_EFFECTS = ("zoom_in", "zoom_out", "pan_left", "pan_right")
ZOOM_CYCLE = ("zoom_in", "pan_right", "zoom_out", "pan_left")


def _get_zoompan_filter(
    effect: str,
    zoom_factor: float,
    frames: int,
    width: int,
    height: int,
    fps: int,
) -> str:
    """Return the zoompan filter string for the given Ken Burns effect."""
    zf = zoom_factor
    zoom_step = round((zf - 1.0) / frames, 6) if frames > 0 else 0.0005

    if effect == "zoom_in":
        return (
            f"zoompan=z='min(zoom+{zoom_step},{zf})':"
            f"d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"s={width}x{height}:fps={fps}"
        )
    elif effect == "zoom_out":
        return (
            f"zoompan=z='if(lte(zoom,1.0),{zf},max(1.001,zoom-{zoom_step}))':"
            f"d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"s={width}x{height}:fps={fps}"
        )
    elif effect == "pan_left":
        return (
            f"zoompan=z='{zf}':"
            f"d={frames}:x='(iw/zoom)*(1-on/(d-1))':y='(ih-ih/zoom)/2':"
            f"s={width}x{height}:fps={fps}"
        )
    elif effect == "pan_right":
        return (
            f"zoompan=z='{zf}':"
            f"d={frames}:x='(iw/zoom)*(on/(d-1))':y='(ih-ih/zoom)/2':"
            f"s={width}x{height}:fps={fps}"
        )
    else:
        # Fallback to zoom_in
        return (
            f"zoompan=z='min(zoom+{zoom_step},{zf})':"
            f"d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"s={width}x{height}:fps={fps}"
        )


def _compose_simple_concat(
    image_paths: list[Path],
    audio_path: Path | None,
    output_path: Path,
    concat_file: Path,
    duration: float,
    width: int,
    height: int,
    fps: int,
) -> subprocess.CompletedProcess:
    """Create slideshow using concat demuxer (no transitions)."""
    with open(concat_file, "w") as f:
        for img in image_paths:
            f.write(f"file '{img}'\n")
            f.write(f"duration {duration}\n")
        # Repeat last image to avoid cut
        f.write(f"file '{image_paths[-1]}'\n")

    args = [
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
               f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
               f"fps={fps},format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
    ]

    if audio_path:
        args += ["-i", str(audio_path), "-c:a", "aac", "-b:a", "128k", "-shortest"]
    else:
        args += ["-an"]

    args.append(str(output_path))

    total_duration = duration * len(image_paths)
    timeout = max(300, int(total_duration * 10))
    return run_ffmpeg(args, timeout=timeout)


def _compose_with_xfade(
    image_paths: list[Path],
    audio_path: Path | None,
    output_path: Path,
    duration: float,
    fade_duration: float,
    width: int,
    height: int,
    fps: int,
    zoom_effect: str = "random",
    zoom_factor: float = 1.3,
) -> subprocess.CompletedProcess:
    """Create slideshow with Ken Burns effects + vignette using a 2-pass approach.

    Pass 1: Generate one video clip per image (zoompan + vignette + fade).
    Pass 2: Concatenate all clips + audio.
    """
    n = len(image_paths)
    batch_id = output_path.stem
    clip_paths: list[Path] = []
    concat_file = DATA_DIR / f"{batch_id}_xfade_concat.txt"

    # Clamp zoom_factor
    zoom_factor = max(1.0, min(zoom_factor, 2.0))
    use_zoompan = zoom_effect != "none" and zoom_factor > 1.0

    try:
        # Pass 1 — create individual clips with zoompan + vignette + fade
        for i, img in enumerate(image_paths):
            clip_path = DATA_DIR / f"{batch_id}_clip{i:03d}.mp4"
            clip_paths.append(clip_path)

            frames = int(duration * fps)
            fade_frames = fade_duration
            fade_out_start = round(duration - fade_duration, 3)

            if use_zoompan:
                # Determine which effect to use for this clip
                if zoom_effect == "random":
                    effect = ZOOM_CYCLE[i % len(ZOOM_CYCLE)]
                else:
                    effect = zoom_effect

                zoompan = _get_zoompan_filter(
                    effect, zoom_factor, frames, width, height, fps,
                )
                vf = (
                    f"{zoompan},"
                    f"vignette=PI/4,"
                    f"fade=t=in:d={fade_frames},"
                    f"fade=t=out:st={fade_out_start}:d={fade_frames},"
                    f"format=yuv420p"
                )

                result = run_ffmpeg([
                    "-i", str(img),
                    "-vf", vf,
                    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-an",
                    str(clip_path),
                ], timeout=180)
            else:
                # No zoompan — use loop-based approach with vignette
                vf = (
                    f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                    f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
                    f"setsar=1,vignette=PI/4,format=yuv420p,"
                    f"fade=t=in:st=0:d={fade_frames},"
                    f"fade=t=out:st={fade_out_start}:d={fade_frames}"
                )

                result = run_ffmpeg([
                    "-loop", "1", "-t", str(duration),
                    "-framerate", str(fps), "-i", str(img),
                    "-vf", vf,
                    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-an",
                    str(clip_path),
                ], timeout=180)

            if result.returncode != 0 or not clip_path.exists():
                raise HTTPException(422, f"Clip {i} failed: {result.stderr}")

        # Pass 2 — concatenate clips + audio
        with open(concat_file, "w") as f:
            for clip in clip_paths:
                f.write(f"file '{clip}'\n")

        args = [
            "-f", "concat", "-safe", "0", "-i", str(concat_file),
        ]

        if audio_path:
            args += ["-i", str(audio_path)]

        args += [
            "-c:v", "copy",
        ]

        if audio_path:
            args += ["-c:a", "aac", "-b:a", "128k", "-shortest"]
        else:
            args += ["-an"]

        args += ["-movflags", "+faststart", str(output_path)]

        total_duration = n * duration
        timeout = max(300, int(total_duration * 5))
        result = run_ffmpeg(args, timeout=timeout)

        # Cleanup intermediate clips
        for clip in clip_paths:
            clip.unlink(missing_ok=True)
        concat_file.unlink(missing_ok=True)

        return result

    except HTTPException:
        # Cleanup on error
        for clip in clip_paths:
            clip.unlink(missing_ok=True)
        concat_file.unlink(missing_ok=True)
        raise


# ============================================
# POST /cleanup
# ============================================
@app.post("/cleanup")
async def cleanup(
    max_age_hours: int = Form(24),
    x_api_key: str | None = Header(None),
):
    """Remove files older than max_age_hours from the data directory."""
    verify_api_key(x_api_key)
    cutoff = time.time() - (max_age_hours * 3600)
    removed = 0
    freed_bytes = 0

    for f in DATA_DIR.iterdir():
        if f.is_file() and f.stat().st_mtime < cutoff:
            size = f.stat().st_size
            f.unlink()
            removed += 1
            freed_bytes += size

    return {
        "removed_files": removed,
        "freed_bytes": freed_bytes,
        "freed_mb": round(freed_bytes / (1024 * 1024), 2),
    }


# ============================================
# Background cleanup helper
# ============================================
class _CleanupTask:
    """Background task to delete temporary files after response is sent."""

    def __init__(self, *paths: Path):
        self.paths = paths

    async def __call__(self):
        for p in self.paths:
            p.unlink(missing_ok=True)


def _cleanup_task(*paths: Path) -> _CleanupTask:
    return _CleanupTask(*paths)
