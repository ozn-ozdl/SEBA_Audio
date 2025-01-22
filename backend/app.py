import json
import mimetypes
import os
from zipfile import ZipFile

from requests import Response
from common_functions import convert_text_to_speech
from flask import Flask, request, jsonify, send_from_directory, send_file
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


@app.route("/analyze-timestamps", methods=["POST"])
def analyze_timestamps():
    print("Analyzing timestamps")

    # Check for video file and timestamps in the request
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    if "timestamps" not in request.form:
        return jsonify({"error": "No timestamps provided"}), 400

    # Get the video file and timestamps
    video_file = request.files["video"]
    old_timestamps = request.form.get("old_timestamps")  # Old timestamps
    new_timestamps = request.form.get("new_timestamps")  # New timestamps

    # Parse the timestamps from the form (assuming they're comma-separated)
    try:
        old_timestamps = [tuple(ts.split('-')) for ts in old_timestamps.split(',')]
        new_timestamps = [tuple(ts.split('-')) for ts in new_timestamps.split(',')]
    except Exception as e:
        return jsonify({"error": f"Invalid timestamp format: {str(e)}"}), 400

    video_path = os.path.join(UPLOAD_FOLDER, video_file.filename)
    video_file.save(video_path)

    print("video_path:", video_path)
    print("Old Timestamps:", old_timestamps)
    print("New Timestamps:", new_timestamps)

    try:
        # Step 1: Compare and combine timestamps
        # Assuming the timestamps are in the format (start_time, end_time)
        combined_timestamps = sorted(set(old_timestamps + new_timestamps), key=lambda x: x[0])

        # Step 2: Cut the video by the combined timestamps
        combined_segments = ng.process_timestamps(combined_timestamps)
        ng.cut_video_by_no_talking(video_path, combined_segments, "scenes_results")

        # Step 3: Describe the scenes based on the new combined segments
        output = ng.describe_existing_segments("scenes_results", combined_segments)

        # Step 4: Format the response data
        response_data = ng.format_response_data(combined_segments, output)

        return jsonify(response_data), 200

    except Exception as e:
        # Print the full exception traceback
        print("An error occurred:")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
  
@app.route("/process-video", methods=["POST"])
def process_video():
    print("Working")
    
    print("Request data:")
    print("Form data:", request.form)
    print("Files:", request.files)

    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    setup()
    video_file = request.files["video"]
    action = request.form.get("action")

    video_path = os.path.join(UPLOAD_FOLDER, video_file.filename)
    video_file.save(video_path)

    print("video_path:", video_path)
    print("action:", action)

    try:
        if action == "new_gemini":
            print("action: new_gemini")

            # Get the video scenes and combine them with timestamps
            timestamps = ng.get_video_scenes_with_gemini(video_path)
            combined_segments = ng.process_timestamps(timestamps)

            # Cut the video by the "NO_TALKING" segments and save them in a folder
            sceneOutput = ng.cut_video_by_no_talking(video_path, combined_segments, "scenes_results")

            # Describe existing segments
            output = ng.describe_existing_segments("scenes_results", sceneOutput, "audio")

            # Format the response data
            response_data = ng.format_response_data(combined_segments, output)

            print(response_data)
            return jsonify(response_data), 200

        else:
            return jsonify({"error": "Invalid action"}), 400

    except Exception as e:
        # Print the full exception traceback
        print("An error occurred:")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
    
@app.route("/encode-video-with-subtitles", methods=["POST"])
def encode_video_with_subtitles():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400

    descriptions = data.get("descriptions")
    timestamps = data.get("timestamps")
    video_file_name = data.get("videoFileName")

    if not all([descriptions, timestamps, video_file_name]):
        return jsonify({"error": "Missing required fields"}), 400

    video_path = os.path.join(UPLOAD_FOLDER, video_file_name)
    if not os.path.exists(video_path):
        return jsonify({"error": "Video file not found"}), 404

    try:
        # Generate the SRT content from descriptions and timestamps (filter out "TALKING" descriptions)
        srt_content = generate_srt_file(descriptions, timestamps)
        temp_srt_path = os.path.join(tempfile.gettempdir(), "subtitles.srt")
        with open(temp_srt_path, "w") as srt_file:
            srt_file.write(srt_content)

        # Generate the list of audio files corresponding to descriptions that are not "TALKING"
        audio_files = []
        for i, description in enumerate(descriptions):
            if description == "TALKING":
                continue  # Skip the scene if description is "TALKING"
            
            scene_id = i + 1  # Assuming scene ID is just the index (adjust if needed)
            audio_file_path = os.path.join(AUDIO_FOLDER, f"audio_description_{scene_id}.mp3")
            
            if not os.path.exists(audio_file_path):
                raise FileNotFoundError(f"Audio file for scene_id {scene_id} not found at {audio_file_path}")
            
            audio_files.append(audio_file_path)

        if not audio_files:
            return jsonify({"error": "No valid audio files found to encode with subtitles"}), 400

        # Concatenate the audio files into one audio track
        temp_audio_path = os.path.join(tempfile.gettempdir(), "combined_audio.mp3")
        with open(temp_audio_path, 'wb') as combined_audio:
            for audio_file in audio_files:
                with open(audio_file, 'rb') as file:
                    combined_audio.write(file.read())

        # Encode the video with the subtitles and the new audio track
        output_path = os.path.join(PROCESSED_FOLDER, f"processed_{video_file_name}")
        
        ffmpeg_command = [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-i", temp_audio_path,  # Input the new audio
            "-vf", f"subtitles={temp_srt_path}",
            "-c:v", "libx264",
            "-c:a", "aac",  # Encoding the audio
            "-preset", "fast",
            "-crf", "23",
            "-strict", "experimental",  # Required for AAC audio codec
            output_path
        ]
        subprocess.run(ffmpeg_command, check=True)

        # Return the processed video file
        return send_file(output_path, as_attachment=True, attachment_filename=os.path.basename(output_path), mimetype='video/mp4')

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_srt_file(descriptions, timestamps):
    srt_content = ""
    for i, (timestamp, description) in enumerate(zip(timestamps, descriptions)):
        if description == "TALKING":
            continue  # Skip adding this scene to subtitles if description is "TALKING"

        start_time = timestamp[0]
        end_time = timestamp[1]

        # Format the times to match SRT format (hh:mm:ss,ms)
        start_time_str = format_time(start_time)
        end_time_str = format_time(end_time)

        # Add the subtitle entry
        srt_content += f"{i + 1}\n{start_time_str} --> {end_time_str}\n{description}\n\n"

    return srt_content

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    milliseconds = int((seconds % 1) * 1000)

    return f"{hours:02}:{minutes:02}:{int(seconds):02},{milliseconds:03}"

@app.route("/processed/<path:filename>", methods=["GET"])
def get_processed_video(filename):
    try:
        return send_from_directory(PROCESSED_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

# @app.route("/text-to-speech", methods=["POST"])
# def text_to_speech():
#     # Get the JSON data directly from the request
#     data = request.get_json()
    
#     print(data)
#     print(type(data))

#     if not data or not isinstance(data, list):
#         return jsonify({"error": "Descriptions must be provided as a list."}), 400

@app.route("/text-to-speech", methods=["POST"])
def text_to_speech():
    # Get the JSON data directly from the request
    data = request.get_json()

    if not data or not isinstance(data, list):
        return jsonify({"error": "Descriptions must be provided as a list."}), 400

    try:
        audio_files = []
        for item in data:
            description = item.get("description")
            timestamps = item.get("timestamps")
            scene_id = item.get("scene_id")

            if not description or not timestamps or not scene_id:
                return jsonify({"error": "Each item must have description, timestamps, and scene_id."}), 400

            start_time, end_time = timestamps  # Unpack the timestamps

            # Use the provided function to convert text to speech for each description
            audio_file_path = convert_text_to_speech(description, AUDIO_FOLDER, f"audio_description_{scene_id}")

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
