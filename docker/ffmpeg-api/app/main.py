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

FONT_PATH = "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"
HIGHLIGHT_COLOR = "FFD700"
DEFAULT_COLOR = "FFFFFF"
SHADOW_COLOR = "000000@0.7"
PANEL_BG_COLOR = "2B2D42"
SEPARATOR_COLOR = "FFD700"
SEPARATOR_WIDTH = 3


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
            f"d={frames}:x='(iw/zoom)*(1-on/({frames}-1))':y='(ih-ih/zoom)/2':"
            f"s={width}x{height}:fps={fps}"
        )
    elif effect == "pan_right":
        return (
            f"zoompan=z='{zf}':"
            f"d={frames}:x='(iw/zoom)*(on/({frames}-1))':y='(ih-ih/zoom)/2':"
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
# POST /mix-audio
# ============================================
@app.post("/mix-audio")
async def mix_audio(
    voice: UploadFile = File(...),
    music: UploadFile = File(...),
    voice_volume: float = Form(-3.0),
    music_volume: float = Form(-25.0),
    fade_in: float = Form(3.0),
    fade_out: float = Form(5.0),
    loop_music: bool = Form(True),
    normalize: bool = Form(True),
    output_format: str = Form("mp3"),
    x_api_key: str | None = Header(None),
):
    """Mix a voice-over track with background music for YouTube-ready audio.

    - voice: voice-over audio file (TTS output)
    - music: background music file
    - voice_volume: voice level in dB (default -3 dB, clear and dominant)
    - music_volume: music level in dB (default -25 dB, subtle background)
    - fade_in: music fade-in duration in seconds (default 3s)
    - fade_out: music fade-out duration in seconds (default 5s)
    - loop_music: loop music if shorter than voice (default true)
    - normalize: apply EBU R128 loudness normalization (default true)
    - output_format: output format (default "mp3")
    """
    verify_api_key(x_api_key)

    voice_path = save_upload(voice)
    music_path = save_upload(music)
    output_path = DATA_DIR / f"{uuid.uuid4().hex}_mixed.{output_format}"

    try:
        result = _mix_audio_tracks(
            voice_path, music_path, output_path,
            voice_volume, music_volume,
            fade_in, fade_out,
            loop_music, normalize,
            output_format,
        )

        if result.returncode != 0 or not output_path.exists():
            raise HTTPException(422, f"Audio mixing failed: {result.stderr}")

        return FileResponse(
            str(output_path),
            media_type=f"audio/{'mpeg' if output_format == 'mp3' else output_format}",
            filename=f"mixed.{output_format}",
            background=_cleanup_task(voice_path, music_path, output_path),
        )
    except HTTPException:
        raise
    except Exception as e:
        voice_path.unlink(missing_ok=True)
        music_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        raise HTTPException(500, str(e))


def _get_voice_duration(voice_path: Path) -> float:
    """Get duration of voice file in seconds using ffprobe."""
    result = run_ffprobe([
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        str(voice_path),
    ])
    if result.returncode != 0:
        return 0.0
    info = json.loads(result.stdout)
    return float(info.get("format", {}).get("duration", 0))


def _mix_audio_tracks(
    voice_path: Path,
    music_path: Path,
    output_path: Path,
    voice_volume: float,
    music_volume: float,
    fade_in: float,
    fade_out: float,
    loop_music: bool,
    normalize: bool,
    output_format: str,
) -> subprocess.CompletedProcess:
    """Mix voice-over with background music using FFmpeg."""
    voice_duration = _get_voice_duration(voice_path)
    if voice_duration <= 0:
        raise HTTPException(422, "Could not determine voice duration")

    fade_out_start = max(0, voice_duration - fade_out)

    # Build music filter: volume + fade in/out
    music_filter = (
        f"volume={music_volume}dB,"
        f"afade=t=in:d={fade_in},"
        f"afade=t=out:st={fade_out_start}:d={fade_out}"
    )

    # Build voice filter: volume
    voice_filter = f"volume={voice_volume}dB"

    # Input args
    args = ["-i", str(voice_path)]

    if loop_music:
        # -stream_loop -1 loops the music indefinitely; -t trims to voice duration
        args += ["-stream_loop", "-1", "-i", str(music_path)]
    else:
        args += ["-i", str(music_path)]

    # Build filtergraph: apply filters then mix
    if normalize:
        filtergraph = (
            f"[0:a]{voice_filter}[voice];"
            f"[1:a]{music_filter}[music];"
            f"[voice][music]amix=inputs=2:duration=first:dropout_transition=2[mixed];"
            f"[mixed]loudnorm=I=-14:LRA=11:TP=-1[out]"
        )
    else:
        filtergraph = (
            f"[0:a]{voice_filter}[voice];"
            f"[1:a]{music_filter}[music];"
            f"[voice][music]amix=inputs=2:duration=first:dropout_transition=2[out]"
        )

    args += [
        "-filter_complex", filtergraph,
        "-map", "[out]",
        "-t", str(voice_duration),
    ]

    # Output codec
    if output_format == "mp3":
        args += ["-c:a", "libmp3lame", "-b:a", "192k"]
    elif output_format == "m4a":
        args += ["-c:a", "aac", "-b:a", "192k"]
    else:
        args += ["-c:a", "aac", "-b:a", "192k"]

    args.append(str(output_path))

    timeout = max(120, int(voice_duration * 3))
    return run_ffmpeg(args, timeout=timeout)


# ============================================
# Thumbnail helpers
# ============================================


def _escape_drawtext(text: str) -> str:
    """Escape special characters for FFmpeg drawtext filter."""
    text = text.replace("'", "\u2019")  # typographic apostrophe
    text = text.replace(":", "\\:")
    text = text.replace("%", "%%")
    text = text.replace(";", "\\;")
    return text


def _auto_thumbnail_layout(
    title: str, panel_width: int, font_size: int
) -> tuple[int, list[str]]:
    """Compute font_size and split title into lines for the text panel.

    Args:
        panel_width: width of the text area (right panel).

    Returns (font_size, [line1, line2, ...]).
    """
    words = title.split()
    if not words:
        return (48, [title])

    usable_width = panel_width * 0.80  # 80% of panel — generous padding
    char_w_ratio = 0.70  # DejaVu Sans Bold — over-estimate to prevent overlap
    space_w_ratio = 0.40
    min_single_line_fs = 36  # Force multi-line split below this

    def _line_width(word_list: list[str], fs: int) -> float:
        return sum(len(w) * char_w_ratio * fs for w in word_list) + max(
            0, len(word_list) - 1
        ) * space_w_ratio * fs

    if font_size <= 0:
        # Auto-compute: find largest font where title fits in one line
        for fs in range(64, min_single_line_fs - 1, -1):
            if _line_width(words, fs) <= usable_width:
                return (fs, [title])

        # Single line too small — split into 2 lines
        mid = len(words) // 2
        line1 = " ".join(words[:mid])
        line2 = " ".join(words[mid:])

        for fs in range(64, 27, -1):
            w1 = _line_width(words[:mid], fs)
            w2 = _line_width(words[mid:], fs)
            if max(w1, w2) <= usable_width:
                return (fs, [line1, line2])

        return (28, [line1, line2])
    else:
        # Fixed font_size — check if it fits in one line
        if _line_width(words, font_size) <= usable_width:
            return (font_size, [title])

        mid = len(words) // 2
        return (font_size, [" ".join(words[:mid]), " ".join(words[mid:])])


def _build_thumbnail_filters(
    width: int,
    height: int,
    lines: list[str],
    font_size: int,
    highlight_words: list[str],
) -> str:
    """Build thumbnail -vf chain: full-bleed image + dark overlay on right + text.

    The source image covers 100% of the canvas. A semi-transparent dark
    gradient is drawn on the right ~55% so the text remains readable.
    Returns a comma-separated -vf filter string.
    """
    filters: list[str] = []

    # Full-bleed: scale + crop to cover entire canvas
    filters.append(
        f"scale={width}:{height}:force_original_aspect_ratio=increase"
    )
    filters.append(f"crop={width}:{height}")

    # Slight contrast boost on the full image
    filters.append("eq=brightness=-0.03:saturation=1.1")

    # Dark gradient overlay on the RIGHT ~55%
    # Progressive bands: transparent → opaque (left to right)
    grad_x_start = int(width * 0.40)
    grad_w = width - grad_x_start
    num_bands = 10
    band_w = grad_w // num_bands

    for i in range(num_bands):
        opacity = 0.05 + i * (0.75 / (num_bands - 1))  # 0.05 → 0.80
        x = grad_x_start + i * band_w
        w = band_w if i < num_bands - 1 else (width - x)
        filters.append(
            f"drawbox=x={x}:y=0:w={w}:h={height}"
            f":color=000000@{opacity:.2f}:t=fill"
        )

    # Gold vertical separator line at ~45%
    sep_x = int(width * 0.45)
    filters.append(
        f"drawbox=x={sep_x}:y=0:w={SEPARATOR_WIDTH}:h={height}"
        f":color={SEPARATOR_COLOR}:t=fill"
    )

    # Text area: right portion after the separator
    txt_x_start = sep_x + SEPARATOR_WIDTH + 10
    txt_area_w = width - txt_x_start

    hl_set = {w.lower() for w in highlight_words if w.strip()}

    char_w_ratio = 0.70
    space_w_ratio = 0.40
    num_lines = len(lines)
    line_height = font_size * 1.4
    total_text_h = num_lines * line_height

    # Center text block vertically
    base_y = int((height - total_text_h) / 2)

    for line_idx, line in enumerate(lines):
        words = line.split()
        if not words:
            continue

        y = int(base_y + line_idx * line_height)

        # Calculate total line width to center horizontally in right area
        total_line_w = (
            sum(len(w) * char_w_ratio * font_size for w in words)
            + max(0, len(words) - 1) * space_w_ratio * font_size
        )
        x_cursor = float(txt_x_start + (txt_area_w - total_line_w) / 2)

        for word in words:
            escaped = _escape_drawtext(word)
            word_w = len(word) * char_w_ratio * font_size
            x_pos = int(x_cursor)

            clean_word = word.strip(".,!?:;'\"").lower()
            color = HIGHLIGHT_COLOR if clean_word in hl_set else DEFAULT_COLOR

            # Shadow
            filters.append(
                f"drawtext=fontfile={FONT_PATH}"
                f":text='{escaped}'"
                f":fontcolor={SHADOW_COLOR}"
                f":fontsize={font_size}"
                f":x={x_pos + 3}:y={y + 3}"
            )
            # Text
            filters.append(
                f"drawtext=fontfile={FONT_PATH}"
                f":text='{escaped}'"
                f":fontcolor={color}"
                f":fontsize={font_size}"
                f":x={x_pos}:y={y}"
            )

            x_cursor += word_w + space_w_ratio * font_size

    return ",".join(filters)


# ============================================
# POST /thumbnail/create
# ============================================
@app.post("/thumbnail/create")
async def thumbnail_create(
    image: UploadFile = File(...),
    title: str = Form(...),
    highlight_words: str = Form(""),
    width: int = Form(1280),
    height: int = Form(720),
    font_size: int = Form(0),
    output_format: str = Form("jpg"),
    x_api_key: str | None = Header(None),
):
    """Generate a YouTube-style thumbnail with text overlay.

    - image: source image (JPG, PNG, WebP)
    - title: text to overlay on the image
    - highlight_words: comma-separated words to render in yellow (#FFD700)
    - width/height: output dimensions (default 1280x720)
    - font_size: font size in px (0 = auto-compute)
    - output_format: jpg or png (default jpg)
    """
    verify_api_key(x_api_key)
    input_path = save_upload(image)
    output_path = DATA_DIR / f"{uuid.uuid4().hex}.{output_format}"

    try:
        hl_words = [
            w.strip() for w in highlight_words.split(",") if w.strip()
        ]

        # Uppercase title and highlight words for YouTube-style look
        upper_title = title.upper()
        upper_hl = [w.upper() for w in hl_words]

        sep_x = int(width * 0.45)
        txt_panel_w = width - sep_x - SEPARATOR_WIDTH - 10
        fs, lines = _auto_thumbnail_layout(upper_title, txt_panel_w, font_size)
        vf = _build_thumbnail_filters(
            width, height, lines, fs, upper_hl
        )

        args = ["-i", str(input_path), "-vf", vf, "-frames:v", "1"]

        if output_format == "jpg":
            args += ["-q:v", "2"]

        args.append(str(output_path))
        result = run_ffmpeg(args, timeout=60)

        if result.returncode != 0 or not output_path.exists():
            raise HTTPException(
                422, f"Thumbnail creation failed: {result.stderr}"
            )

        media = "image/jpeg" if output_format == "jpg" else f"image/{output_format}"
        return FileResponse(
            str(output_path),
            media_type=media,
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
