import json
import mimetypes
import os
import re
import uuid
from zipfile import ZipFile

from requests import Response
from common_functions import convert_text_to_speech
from flask import Flask, request, jsonify, send_from_directory, make_response, send_file, Response, stream_with_context
from flask_cors import CORS
import shutil
import openAI_images.video_to_frames as vtf
import openAI_images.detect_scene_changes as dsc
import openAI_images.scene_frames_to_descriptions as sftd
import openAI_images.get_return_values as grv
from openAI_images.vidToDesGemini import describe_with_gemini_whole_video, get_video_duration
import openAI_images.scenes_to_description_optimized_gemini as sg
import openAI_images.newGemini as ng
import subprocess
import tempfile
from gtts import gTTS
import os
import numpy as np
from datetime import datetime
import tempfile
import traceback
import openAI_images.revisedGemini as rg

from uuid import uuid4

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 30 * 1024 * 1024
CORS(app)

UPLOAD_FOLDER = "./uploads"
FRAMES_FOLDER = "./frames"
SCENES_FOLDER = "./scenes_results"
PROCESSED_FOLDER = "./processed"
AUDIO_FOLDER = "./audio"
WAVEFORM_FOLDER = "./waveforms"
TRIMMED_FOLDER = "./trimmed"
SRT_FOLDER = "srt"  # Folder to store SRT files

# Ensure directories exist
os.makedirs(PROCESSED_FOLDER, exist_ok=True)
os.makedirs(AUDIO_FOLDER, exist_ok=True)
os.makedirs(TRIMMED_FOLDER, exist_ok=True)
os.makedirs(SRT_FOLDER, exist_ok=True)

def setup():
    """
    Setup required directories for video processing.

    This function ensures that the upload folder exists and recreates the frames, scenes, 
    and waveform folders by deleting any existing ones and creating new directories.
    """
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    if os.path.exists(FRAMES_FOLDER):
        shutil.rmtree(FRAMES_FOLDER)
    os.makedirs(FRAMES_FOLDER, exist_ok=True)

    if os.path.exists(SCENES_FOLDER):
        shutil.rmtree(SCENES_FOLDER)
    os.makedirs(SCENES_FOLDER, exist_ok=True)
    os.makedirs(WAVEFORM_FOLDER, exist_ok=True)

@app.route("/")
def hello_geek():
    """
    Basic endpoint to verify server connectivity.

    Returns:
        str: A simple HTML greeting.
    """
    return "<h1>Hello from Flask & Docker</h1>"

@app.route("/scene_files/<path:filename>", methods=["GET"])
def get_scene_files(filename):
    """
    Serve a scene file from the scenes results folder.

    Args:
        filename (str): The name of the scene file.

    Returns:
        Response: The file served from the SCENES_FOLDER.
    """
    return send_from_directory(SCENES_FOLDER, filename)

@app.route("/audio/<path:filename>", methods=["GET"])
def get_audio_files(filename):
    """
    Serve an audio file from the audio folder.

    Args:
        filename (str): The name of the audio file.

    Returns:
        Response: The requested audio file or an error response if not found.
    """
    try:
        filepath = os.path.join(AUDIO_FOLDER, filename)
        print(filepath)
        mimetype, _ = mimetypes.guess_type(filepath)
        return send_file(
            filepath,
            mimetype=mimetype,
            as_attachment=False,
            download_name=filename
        )
    except Exception as e:
        return Response(str(e), status=404)

@app.route("/regenerate-audio", methods=["POST"])
def regenerate_audio():
    """
    Regenerate audio files for video scenes using text-to-speech.

    This endpoint accepts a JSON payload with 'scenes' and 'video_name', generates audio files 
    for each scene description, and streams progress updates in NDJSON format.

    Returns:
        Response: A streaming response with progress updates and audio file details.
    """
    def generate():
        try:
            data = request.get_json()
            scenes = data.get("scenes", [])
            video_name = data.get("video_name")

            if not scenes or not video_name:
                yield json.dumps({"error": "Missing required data (scenes or video_name)"}) + "\n"
                return

            video_path = os.path.join(UPLOAD_FOLDER, video_name)
            if not os.path.exists(video_path):
                yield json.dumps({"error": "Video file not found"}) + "\n"
                return

            audio_files = []
            total_scenes = len(scenes)

            for index, scene in enumerate(scenes):
                start = scene["start"]
                end = scene["end"]
                description = scene.get("description", "")

                # Generate audio for the description
                unique_id = str(uuid.uuid4())
                audio_file_path = convert_text_to_speech(description, AUDIO_FOLDER, f"audio_description_{unique_id}")

                audio_file_path = audio_file_path.strip()[2:]  # Clean up the path

                audio_files.append({
                    "start": start,
                    "end": end,
                    "audio_file": audio_file_path
                })

                # Yield progress update
                progress = int(((index + 1) / total_scenes) * 100)
                yield json.dumps({
                    "progress": progress,
                    "message": f"Generated audio for scene {index + 1}/{total_scenes}",
                    "audio_files": audio_files
                }) + "\n"

            # Final completion message
            yield json.dumps({
                "progress": 100,
                "message": "Audio regeneration complete",
                "audio_files": audio_files
            }) + "\n"

        except Exception as e:
            error_msg = f"Failed to regenerate audio: {str(e)}"
            print(f"Error: {error_msg}")
            yield json.dumps({"error": error_msg}) + "\n"

    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")

@app.route("/regenerate-descriptions", methods=["POST"])
def regenerate_descriptions():
    """
    Regenerate scene descriptions for a video.

    This endpoint validates input, generates a video summary, extracts video segments, 
    generates new scene descriptions using Gemini, and streams progress updates.

    Returns:
        Response: A streaming response in NDJSON format with progress updates and final description data.
    """
    def generate():
        try:
            # Initial setup and validation
            data = request.get_json()
            scenes = data.get("scenes", [])
            video_name = data.get("video_name")
            
            yield json.dumps({
                "progress": 10,
                "message": "Validating input..."
            }) + "\n"

            if not scenes or not video_name:
                yield json.dumps({
                    "error": "Missing required data (scenes or video_name)",
                    "progress": -1
                }) + "\n"
                return

            video_path = os.path.join(UPLOAD_FOLDER, video_name)
            if not os.path.exists(video_path):
                yield json.dumps({
                    "error": "Video file not found",
                    "progress": -1
                }) + "\n"
                return

            # Generate video summary using existing function
            yield json.dumps({
                "progress": 20,
                "message": "Analyzing video content..."
            }) + "\n"
            video_summary = rg.get_video_summary_with_gemini(video_path)

            # Cut scenes from video using existing function
            yield json.dumps({
                "progress": 30,
                "message": "Extracting video segments..."
            }) + "\n"

            # Create segments in required format for cut_video_by_no_talking
            segments = [{
                "start": scene["start"],
                "end": scene["end"],
                "type": "NO_TALKING"
            } for scene in scenes]

            # Use existing function to cut video
            scene_numbers, scene_ids = rg.cut_video_by_no_talking(
                video_path, segments, SCENES_FOLDER
            )

            # Generate descriptions using existing function
            yield json.dumps({
                "progress": 40,
                "message": "Generating new descriptions..."
            }) + "\n"

            descriptions = rg.describe_existing_segments(
                SCENES_FOLDER, (scene_numbers, scene_ids), AUDIO_FOLDER, video_summary
            )

            # Format response using existing function
            yield json.dumps({
                "progress": 90,
                "message": "Finalizing results..."
            }) + "\n"

            response_data = rg.format_response_data(segments, descriptions)

            # Clean up temporary scene files
            for scene_id in scene_ids:
                scene_file = os.path.join(SCENES_FOLDER, f"scene_{scene_id}.mp4")
                if os.path.exists(scene_file):
                    os.remove(scene_file)

            yield json.dumps({
                "progress": 100,
                "data": response_data,
                "message": "Regeneration complete"
            }) + "\n"

        except Exception as e:
            error_msg = f"Regeneration failed: {str(e)}"
            print(f"Error: {error_msg}\n{traceback.format_exc()}")
            yield json.dumps({
                "error": error_msg,
                "progress": -1
            }) + "\n"

    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")

@app.route("/text-to-speech", methods=["POST"])
def text_to_speech():
    """
    Convert a list of scene descriptions to speech.

    This endpoint expects a JSON array where each item contains a description, timestamps, 
    and a scene ID. It generates audio files for each description and returns the audio file paths.

    Returns:
        Response: JSON response containing a list of audio file information.
    """
    try:
        data = request.get_json()
        if not data or not isinstance(data, list):
            return jsonify({"error": "Descriptions must be provided as a list."}), 400

        audio_files = []
        for item in data:
            description = item.get("description")
            timestamps = item.get("timestamps")
            scene_id = item.get("scene_id")

            if not description or not timestamps or not scene_id:
                return jsonify({"error": "Each item must have description, timestamps, and scene_id."}), 400

            # Generate audio for the description
            unique_id = str(uuid.uuid4())
            audio_file_path = convert_text_to_speech(description, AUDIO_FOLDER, f"audio_description_{unique_id}")

            audio_file_path = audio_file_path.strip()[2:]  # Clean up the path

            audio_files.append({
                "timestamps": timestamps,
                "description": description,
                "audio_file": audio_file_path
            })

        return jsonify({"audio_files": audio_files}), 200

    except Exception as e:
        print("Error generating audio:", traceback.format_exc())
        return jsonify({"error": f"Failed to generate audio: {str(e)}"}), 500

@app.route("/analyze-timestamps", methods=["POST"])
def analyze_timestamps():
    """
    Analyze and process video timestamps.

    This endpoint compares the old timestamps with new timestamps, processes the changed segments, 
    generates descriptions for them, and merges the results with the existing descriptions.

    Returns:
        Response: JSON response with the final merged descriptions and a waveform image path.
    """
    print("Analyzing timestamps")
    try:
        # Get data as JSON
        data = request.get_json()
        video_name = data.get("video_name")
        old_data = data.get("old_data", [])
        new_timestamps = data.get("new_timestamps", [])

        if not video_name:
            return jsonify({"error": "No video name provided"}), 400

        # Parse old data with milliseconds
        old_timestamps = {
            (item["start"], item["end"]): item.get("description", "") 
            for item in old_data
        }

        # Construct video path
        video_path = os.path.join(UPLOAD_FOLDER, video_name)
        if not os.path.exists(video_path):
            return jsonify({"error": "Video file not found on server"}), 404

        # Process changed segments
        processed_data = []
        changed_segments = [
            {"start": s, "end": e, "type": "NO_TALKING"}
            for (s, e) in new_timestamps
            if (s, e) not in old_timestamps
        ]

        if changed_segments:
            # Generate video summary
            video_summary = rg.get_video_summary_with_gemini(video_path)
            
            # Cut video and generate descriptions
            scenes = rg.cut_video_by_no_talking(
                video_path, changed_segments, SCENES_FOLDER
            )
            descriptions = rg.describe_existing_segments(
                SCENES_FOLDER, scenes, AUDIO_FOLDER, video_summary
            )
            response = rg.format_response_data(changed_segments, descriptions)

        # Merge with old descriptions
        final_descriptions = []
        all_segments = list({(s, e) for (s, e) in [*old_timestamps.keys(), *new_timestamps]})
        
        # Sort segments by start time
        all_segments.sort(key=lambda x: x[0])

        for start, end in all_segments:
            # Find matching description
            desc_data = next(
                (d for d in response["descriptions"] 
                if d["start"] == start and d["end"] == end),
                None
            )
            
            if desc_data:
                final_descriptions.append(desc_data)
            else:
                final_descriptions.append({
                    "start": start,
                    "end": end,
                    "description": old_timestamps.get((start, end), "NO_TALKING"),
                    "audio_file": f"audio/{uuid.uuid4()}.mp3" 
                    if (start, end) in old_timestamps else None
                })

        return jsonify({
            'descriptions': final_descriptions,
            'waveform_image': "./waveforms/waveform.png"
        }), 200

    except Exception as e:
        print("An error occurred:", traceback.format_exc())
        return jsonify({"error": f"Processing error: {str(e)}"}), 500


def milliseconds_to_srt_time(ms):
    """
    Convert milliseconds to SRT timestamp format.

    Args:
        ms (int): Time in milliseconds.

    Returns:
        str: A timestamp string formatted as "HH:MM:SS,mmm".
    """
    seconds, milliseconds = divmod(ms, 1000)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"

def _create_temp_file(content_list):
    """
    Create a temporary SRT file with the provided content.

    Args:
        content_list (list): A list of strings representing the lines of the SRT file.

    Returns:
        str: The path to the created temporary SRT file.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".srt", mode="w") as temp_file:
        temp_file.write("\n".join(content_list))
        return temp_file.name

@app.route("/encode-video-with-subtitles", methods=["POST"])
def encode_video_with_subtitles():
    """
    Encode a video by merging audio tracks and embedding subtitles.

    This endpoint processes the provided video, audio files, and subtitle data to generate a final
    processed video file with embedded subtitles. It returns URLs for the processed video and SRT files.

    Returns:
        Response: A JSON response containing download URLs for the processed video, SRT file, and talking SRT file.
    """
    try:
        data = request.get_json()
        required_fields = ["descriptions", "timestamps", "audioFiles", "videoFileName"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing {field}"}), 400

        filtered_segments = []
        combined_segments = []
        audio_index = 0
        for i, (desc, (start, end)) in enumerate(
            zip(data["descriptions"], data["timestamps"])
        ):
            segment = {"start": start, "end": end, "description": desc}
            if desc.strip().upper() == "TALKING":
                combined_segments.append(segment)
            else:
                audio_file = data["audioFiles"][audio_index]
                audio_index += 1
                segment["audio"] = audio_file
                filtered_segments.append(segment)
                combined_segments.append(segment)

        srt_content = []
        for i, seg in enumerate(filtered_segments, 1):
            start_srt = milliseconds_to_srt_time(seg["start"])
            end_srt = milliseconds_to_srt_time(seg["end"])
            srt_content.append(f"{i}\n{start_srt} --> {end_srt}\n{seg['description']}\n")

        talking_srt_content = []
        for i, seg in enumerate(combined_segments, 1):
            start_srt = milliseconds_to_srt_time(seg["start"])
            end_srt = milliseconds_to_srt_time(seg["end"])
            talking_srt_content.append(
                f"{i}\n{start_srt} --> {end_srt}\n{seg['description']}\n"
            )

        # Audio processing with millisecond precision
        audio_clips = []
        start_times = []
        for seg in filtered_segments:
            # Handle audio duration matching
            duration_ms = seg["end"] - seg["start"]
            original_duration = get_audio_duration(seg["audio"]) * 1000

            if original_duration > duration_ms:
                speed_factor = original_duration / duration_ms
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                    temp_path = f.name
                speed_up_audio(seg["audio"], speed_factor, temp_path)
                audio_clips.append(temp_path)
            else:
                audio_clips.append(seg["audio"])

            start_times.append(seg["start"] / 1000)  # Convert ms to seconds

        output_filename = f"processed_{data['videoFileName']}"
        output_path = os.path.join(PROCESSED_FOLDER, output_filename)

        # Create mixed audio and subtitle files
        mixed_audio_path = _create_mixed_audio(audio_clips, start_times)
        srt_file_path = _create_temp_file(srt_content)
        talking_srt_file_path = _create_temp_file(talking_srt_content)

        # FFmpeg command to include original audio and mixed audio as separate tracks
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                os.path.join(UPLOAD_FOLDER, data["videoFileName"]),  # Original video
                "-i",
                mixed_audio_path,  # Mixed audio
                "-i",
                srt_file_path,  # Subtitles
                "-map",
                "0:v:0",  # Video from the first input
                "-map",
                "0:a:0",  # Original audio from the first input
                "-map",
                "1:a:0",  # Mixed audio from the second input
                "-map",
                "2:s:0",  # Subtitles from the third input
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-c:s",
                "mov_text",  # Use mov_text for subtitles in MP4
                output_path,
            ],
            check=True,
        )

        unique_id = str(uuid.uuid4())[:8]
        video_name = os.path.splitext(data["videoFileName"])[0]
        srt_filename = f"srt_{video_name}_{unique_id}.srt"
        talking_srt_filename = f"talking_srt_{video_name}_{unique_id}.srt"
        srt_filepath = os.path.join(SRT_FOLDER, srt_filename)
        talking_srt_filepath = os.path.join(SRT_FOLDER, talking_srt_filename)

        with open(srt_file_path, "r") as temp_srt_file:
            srt_content = temp_srt_file.read()
        with open(srt_filepath, "w") as f:
            f.write(srt_content)

        with open(talking_srt_file_path, "r") as temp_talking_srt_file:
            talking_srt_content = temp_talking_srt_file.read()
        with open(talking_srt_filepath, "w") as f:
            f.write(talking_srt_content)

        video_url = f"/download_video/{os.path.basename(output_path)}"
        srt_url = f"/download_srt/{os.path.basename(srt_filepath)}"
        talking_srt_url = f"/download_srt/{os.path.basename(talking_srt_filepath)}"

        return jsonify(
            {
                "video_url": video_url,
                "srt_url": srt_url,
                "talking_srt_url": talking_srt_url,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/download_video/<filename>")
def download_video(filename):
    """
    Download the processed video file.

    Args:
        filename (str): The name of the processed video file.

    Returns:
        Response: A Flask response for downloading the video file.
    """
    filepath = os.path.join(PROCESSED_FOLDER, filename)
    if not os.path.exists(filepath):
        return "Video file not found", 404
    response = make_response(send_from_directory(PROCESSED_FOLDER, filename, as_attachment=True, mimetype='video/mp4'))
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

@app.route("/download_srt/<filename>")
def download_srt(filename):
    """
    Download the SRT subtitle file.

    Args:
        filename (str): The name of the SRT file.

    Returns:
        Response: A Flask response for downloading the SRT file.
    """
    response = make_response(send_from_directory(SRT_FOLDER, filename, as_attachment=True))
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

def _create_mixed_audio(audio_files, start_times):
    """
    Mix multiple audio clips with specified start delays using FFmpeg.

    Args:
        audio_files (list): List of audio file paths.
        start_times (list): List of start times (in seconds) for each audio clip.

    Returns:
        str: The path to the mixed audio file.
    """
    inputs = []
    filter_chains = []
    
    for i, (file, start) in enumerate(zip(audio_files, start_times)):
        inputs.extend(["-i", file])
        filter_chains.append(
            f"[{i}:a]adelay={int(start*1000)}|{int(start*1000)}[a{i}];"
        )
    
    filter_complex = "".join(filter_chains)
    filter_complex += f"{''.join([f'[a{i}]' for i in range(len(audio_files))])}amix=inputs={len(audio_files)}[aout]"
    
    output = os.path.join(tempfile.gettempdir(), "mixed_audio.mp3")
    subprocess.run([
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[aout]",
        output
    ], check=True)
    return output

@app.route("/get-video", methods=["GET"])
def get_video():
    """
    Retrieve a video file for download.

    This endpoint returns the specified video file from the uploads folder.

    Returns:
        Response: A Flask response for downloading the video file.
    """
    video_name = request.args.get("videoName")
    if not video_name:
        return jsonify({"error": "Video name is required"}), 400

    video_path = os.path.join(UPLOAD_FOLDER, video_name)
    if not os.path.exists(video_path):
        return jsonify({"error": "Video not found"}), 404

    try:
        mimetype, _ = mimetypes.guess_type(video_path)
        response = make_response(send_file(
            video_path,
            mimetype=mimetype,
            as_attachment=True,
            download_name=video_name
        ))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/check-video", methods=["GET"])
def check_video():
    """
    Check if a video file exists on the server.

    Returns:
        JSON: A JSON response indicating whether the video exists.
    """
    video_name = request.args.get("videoName")
    if not video_name:
        return jsonify({"error": "Video name is required"}), 400

    video_path = os.path.join(UPLOAD_FOLDER, video_name)
    if os.path.exists(video_path):
        return jsonify({"exists": True}), 200
    else:
        return jsonify({"exists": False}), 404
    
@app.route("/process-video", methods=["POST"])
def process_video():
    """
    Process an uploaded video to extract scenes, generate descriptions, and produce a processed video with subtitles and mixed audio.

    This endpoint handles video upload, processing, and returns progress updates via a streaming response.
    
    Returns:
        Response: A streaming JSON response with progress updates.
    """
    print("Processing video request received")

    # Check if video file is present
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    # Setup directories
    setup()
    video_file = request.files["video"]
    action = request.form.get("action")

    # Save uploaded video
    video_path = os.path.join(UPLOAD_FOLDER, video_file.filename)
    video_file.save(video_path)

    print(f"Processing video: {video_path} with action: {action}")

    def generate():
        """
        Generator function to yield progress updates during video processing.

        Yields:
            str: JSON-formatted progress updates.
        """
        try:
            if action != "new_gemini":
                yield json.dumps({"error": "Invalid action specified"}) + "\n"
                return

            # 1. Generate video summary (10%)
            yield json.dumps({
                "progress": 10,
                "message": "Analyzing video content..."
            }) + "\n"
            video_summary = rg.get_video_summary_with_gemini(video_path)

            # 2. Detect scene changes (20%)
            yield json.dumps({
                "progress": 20,
                "message": "Detecting scene changes..."
            }) + "\n"
            timestamps = rg.get_video_scenes_with_gemini(video_path)

            # 3. Process timestamps (30%)
            yield json.dumps({
                "progress": 30,
                "message": "Processing scene timestamps..."
            }) + "\n"
            combined_segments = rg.process_timestamps(timestamps)

            # 4. Cut video into scenes (50%)
            yield json.dumps({
                "progress": 50,
                "message": "Extracting video scenes..."
            }) + "\n"
            scene_output = rg.cut_video_by_no_talking(
                video_path, combined_segments, SCENES_FOLDER
            )

            # 5. Generate descriptions (70%)
            yield json.dumps({
                "progress": 70,
                "message": "Generating scene descriptions..."
            }) + "\n"
            descriptions = rg.describe_existing_segments(
                SCENES_FOLDER, scene_output, AUDIO_FOLDER, video_summary
            )

            # 6. Format final response (90%)
            yield json.dumps({
                "progress": 90,
                "message": "Finalizing results..."
            }) + "\n"
            response_data = rg.format_response_data(combined_segments, descriptions)

            # Completion (100%)
            yield json.dumps({
                "progress": 100,
                "data": response_data,
                "waveform_image": "./waveforms/waveform.png"
            }) + "\n"

        except Exception as e:
            error_message = f"Processing error: {str(e)}"
            print(f"Error: {error_message}\n{traceback.format_exc()}")
            yield json.dumps({
                "error": error_message,
                "progress": -1
            }) + "\n"

    # Return streaming response with correct mimetype
    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")

def speed_up_audio(input_path, speed_factor, output_path):
    """
    Speed up an audio file using FFmpeg's atempo filter with chaining for factors > 2.0.

    Args:
        input_path (str): Path to the input audio file.
        speed_factor (float): The factor by which to speed up the audio.
        output_path (str): The path where the output audio file will be saved.

    Returns:
        None
    """
    if speed_factor < 1.0:
        raise ValueError("Speed factor must be >= 1.0")
    
    atempo_filters = []
    while speed_factor > 2.0:
        atempo_filters.append("atempo=2.0")
        speed_factor /= 2.0
    if speed_factor != 1.0:
        atempo_filters.append(f"atempo={speed_factor}")
    
    if not atempo_filters:
        # No speed change needed, copy the file
        subprocess.run(["ffmpeg", "-y", "-i", input_path, "-c", "copy", output_path], check=True)
        return

    filter_str = ",".join(atempo_filters)
    subprocess.run([
        "ffmpeg", "-y",
        "-i", input_path,
        "-filter:a", filter_str,
        "-c:a", "libmp3lame",
        "-q:a", "2",
        output_path
    ], check=True)

def get_audio_duration(file_path):
    """
    Get the duration of an audio file in seconds using ffprobe.

    Args:
        file_path (str): Path to the audio file.

    Returns:
        float: Duration of the audio in seconds.
    """
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to get audio duration: {result.stderr}")
    return float(result.stdout.strip())


def timestamp_to_seconds(ms):
    """
    Convert milliseconds to seconds.

    Args:
        ms (int): Time in milliseconds.

    Returns:
        float: Time in seconds.
    """
    return ms / 1000.0

# Helper functions remain unchanged
def create_temp_file(content, suffix):
    """
    Create a temporary file with the given content.

    Args:
        content (str): Content to write to the file.
        suffix (str): Suffix for the temporary file (e.g., ".srt").

    Returns:
        str: Path to the created temporary file.
    """
    with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
        f.write(content)
        return f.name

def cleanup_temp_files(paths):
    """
    Delete temporary files specified by their paths.

    Args:
        paths (list): List of file paths to delete.

    Returns:
        None
    """
    for path in paths:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception:
            pass

def combine_audio_with_delays(audio_files, seconds_list, output_file):
    """
    Combine multiple audio files with specified delay offsets using FFmpeg.

    Args:
        audio_files (list): List of audio file paths.
        seconds_list (list): List of delay values (in seconds) for each audio file.
        output_file (str): Path where the combined audio file will be saved.

    Returns:
        None
    """
    if len(audio_files) != len(seconds_list):
        raise ValueError("The number of audio files must match the number of delay values.")

    filter_complex = ""
    inputs = []
    for i, (audio_file, delay) in enumerate(zip(audio_files, seconds_list)):
        inputs.extend(["-i", audio_file])
        filter_complex += f"[{i}:a]adelay={int(delay * 1000)}|{int(delay * 1000)}[a{i}];"

    filter_complex += "".join([f"[a{i}]" for i in range(len(audio_files))]) + f"amix=inputs={len(audio_files)}:duration=longest[aout]"

    subprocess.run([
        "ffmpeg",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[aout]",
        output_file
    ], check=True)

def generate_srt_file(descriptions, timestamps):
    """
    Generate SRT file content from descriptions and timestamps.

    Args:
        descriptions (list): List of subtitle texts.
        timestamps (list): List of tuples with start and end timestamps.

    Returns:
        str: SRT file content as a string.
    """
    srt_content = []
    for i, (description, (start, end)) in enumerate(zip(descriptions, timestamps), start=1):
        srt_content.append(f"{i}")
        srt_content.append(f"{start} --> {end}")
        srt_content.append(description)
        srt_content.append("")
    return "\n".join(srt_content)


if __name__ == "__main__":
    app.run(debug=True)
