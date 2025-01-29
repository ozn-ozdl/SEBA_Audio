import json
import mimetypes
import os
import re
import uuid
from zipfile import ZipFile

from requests import Response
from common_functions import convert_text_to_speech
from flask import Flask, request, jsonify, send_from_directory, send_file, Response, stream_with_context
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

# Ensure directories exist
os.makedirs(PROCESSED_FOLDER, exist_ok=True)
os.makedirs(AUDIO_FOLDER, exist_ok=True)

def setup():
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
    return "<h1>Hello from Flask & Docker</h1>"

@app.route("/scene_files/<path:filename>", methods=["GET"])
def get_scene_files(filename):
    return send_from_directory(SCENES_FOLDER, filename)

@app.route("/audio/<path:filename>", methods=["GET"])
def get_audio_files(filename):
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



# Update timestamp processing in analyze-timestamps route
@app.route("/analyze-timestamps", methods=["POST"])
def analyze_timestamps():
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

# Update encode-video-with-subtitles route
@app.route("/encode-video-with-subtitles", methods=["POST"])
def encode_video_with_subtitles():
    try:
        data = request.get_json()
        # Validate required fields
        required_fields = ['descriptions', 'timestamps', 'audioFiles', 'videoFileName']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing {field}"}), 400

        # Process segments with millisecond timestamps
        filtered_segments = []
        audio_index = 0
        for i, (desc, (start, end)) in enumerate(zip(data['descriptions'], data['timestamps'])):
            if desc.strip().upper() != "TALKING":
                audio_file = data['audioFiles'][audio_index]
                audio_index += 1
                
                filtered_segments.append({
                    "start": start,
                    "end": end,
                    "audio": audio_file,
                    "description": desc
                })

        # Generate SRT from milliseconds
        srt_content = []
        for i, seg in enumerate(filtered_segments, 1):
            start_srt = milliseconds_to_srt_time(seg["start"])
            end_srt = milliseconds_to_srt_time(seg["end"])
            srt_content.append(f"{i}\n{start_srt} --> {end_srt}\n{seg['description']}\n")
        
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

        # Generate output video
        output_filename = f"processed_{data['videoFileName']}"
        output_path = os.path.join(PROCESSED_FOLDER, output_filename)
        
        # FFmpeg command using millisecond timestamps
        subprocess.run([
            "ffmpeg", "-y",
            "-i", os.path.join(UPLOAD_FOLDER, data['videoFileName']),
            "-i", _create_mixed_audio(audio_clips, start_times),
            "-vf", f"subtitles={self._create_temp_file(srt_content)}",
            "-c:v", "libx264", "-c:a", "aac",
            output_path
        ], check=True)

        return send_file(output_path, mimetype='video/mp4')

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper functions with millisecond handling
def _create_mixed_audio(self, audio_files, start_times):
    """Mix audio clips at specific millisecond start times"""
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

def milliseconds_to_srt_time(ms):
    """Convert milliseconds to SRT format (HH:MM:SS,mmm)"""
    hours, ms = divmod(ms, 3600000)
    minutes, ms = divmod(ms, 60000)
    seconds, ms = divmod(ms, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{ms:03d}"

  
# @app.route("/process-video", methods=["POST"])
# def process_video():
#     print("Working")
    
#     print("Request data:")
#     print("Form data:", request.form)
#     print("Files:", request.files)

#     if "video" not in request.files:
#         return jsonify({"error": "No video file provided"}), 400

#     setup()
#     video_file = request.files["video"]
#     action = request.form.get("action")

#     video_path = os.path.join(UPLOAD_FOLDER, video_file.filename)
#     video_file.save(video_path)

#     print("video_path:", video_path)
#     print("action:", action)

#     try:
#         if action == "new_gemini":
#             print("action: new_gemini")

#             # Generate video summary first
#             video_summary = rg.get_video_summary_with_gemini(video_path)
#             print("Video Summary:", video_summary)

#             # Get the video scenes and combine them with timestamps
#             timestamps = rg.get_video_scenes_with_gemini(video_path)
#             print("Timestamps:", timestamps)
#             combined_segments = rg.process_timestamps(timestamps)
#             print("Combined Segments:", combined_segments)
            
#             # Cut the video by the "NO_TALKING" segments
#             sceneOutput = rg.cut_video_by_no_talking(video_path, combined_segments, "scenes_results")
#             print("Scene Output:", sceneOutput)
            
#             # Describe existing segments with video summary
#             output = rg.describe_existing_segments("scenes_results", sceneOutput, "audio", video_summary)
#             print("Output:", output)
            
#             # Format the response data
#             response_data = rg.format_response_data(combined_segments, output)

#             print(response_data)
#             return jsonify(response_data), 200

#         else:
#             return jsonify({"error": "Invalid action"}), 400

#     except Exception as e:
#         print("An error occurred:")
#         print(traceback.format_exc())
#         return jsonify({"error": str(e)}), 500
    
    
@app.route("/process-video", methods=["POST"])
def process_video():
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
        """Generator function to yield progress updates"""
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
    """Speed up audio using ffmpeg's atempo filter with chaining for factors > 2.0"""
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
    """Get audio duration in seconds using ffprobe"""
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

def milliseconds_to_srt_time(ms):
    """Convert milliseconds to SRT timestamp format (HH:MM:SS,mmm)"""
    ms = int(ms)
    hours = ms // 3600000
    ms %= 3600000
    minutes = ms // 60000
    ms %= 60000
    seconds = ms // 1000
    milliseconds = ms % 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def timestamp_to_seconds(ms):
    """Convert milliseconds timestamp to total seconds"""
    return ms / 1000.0

# Helper functions remain unchanged
def create_temp_file(content, suffix):
    with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
        f.write(content)
        return f.name

def cleanup_temp_files(paths):
    for path in paths:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception:
            pass

def combine_audio_with_delays(audio_files, seconds_list, output_file):
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


@app.route("/text-to-speech", methods=["POST"])
def text_to_speech():
    # Get the JSON data directly from the request
    data = request.get_json()

    if not data or not isinstance(data, list):
        return jsonify({"error": "Descriptions must be provided as a list."}), 400
    print("Data:", data)
    try:
        audio_files = []
        for item in data:
            print("Item:", item)
            description = item.get("description")
            timestamps = item.get("timestamps")
            scene_id = item.get("scene_id")
            unique_id = str(uuid.uuid4())
            print("Description:", description)
            print("Timestamps:", timestamps)
            print("Scene ID:", scene_id)
            # if not description or not timestamps or not scene_id:
            #     return jsonify({"error": "Each item must have description, timestamps, and scene_id."}), 400

            start_time, end_time = timestamps  # Unpack the timestamps

            # Use the provided function to convert text to speech for each description
            audio_file_path = convert_text_to_speech(description, AUDIO_FOLDER, f"audio_description_{unique_id}")

            # Append the description, timestamps, and audio file path to the audio_files list
            # from the audio file path, strip the leading and trailing whitespaces and the leading dot and slash
            audio_file_path = audio_file_path.strip()
            audio_file_path = audio_file_path[2:]
            print(audio_file_path)
            audio_files.append({
                "timestamps": timestamps,
                "description": description,
                "audio_file": audio_file_path
            })

        # Return the generated audio files information in the response
        return jsonify({"audio_files": audio_files}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to process descriptions: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)