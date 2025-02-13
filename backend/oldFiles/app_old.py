import os
from zipfile import ZipFile
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

@app.route("/analyze-timestamps", methods=["POST"])
def analyze_timestamps():
    print("Analyzing timestamps")

    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    if "timestamps" not in request.form:
        return jsonify({"error": "No timestamps provided"}), 400

    video_file = request.files["video"]
    timestamps = request.form.get("timestamps")
    
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
        if action == "openAI_image":
            vtf.extract_frames_from_video(video_path, FRAMES_FOLDER, 2)
            scene_changes = dsc.detect_scene_changes(FRAMES_FOLDER, 0.3, 0.4)
            scene_descriptions, scene_frames = sftd.describe_scenes_with_openai(
                scene_changes, FRAMES_FOLDER)
            timestamps, scene_descriptions_final = grv.get_timestamps_and_descriptions(
                scene_frames, 60, 2, scene_descriptions)
            scene_files = grv.extract_scenes(
                video_path, timestamps, SCENES_FOLDER)

            return jsonify({
                "message": "Scene changes detected successfully",
                "descriptions": scene_descriptions_final,
                "timestamps": timestamps,
                "scene_files": scene_files,
            }), 200
        elif action == "gemini_whole_video":
            description = describe_with_gemini_whole_video(video_path)
            video_duration = get_video_duration(video_path)
            start_time = '00:00:00'
            end_time = video_duration
            scene_files = grv.extract_scenes(
                video_path, [(start_time, end_time)], SCENES_FOLDER)
            return jsonify({
                "message": "Scene changes detected successfully",
                "scene_files": scene_files,
                "descriptions": [description],
                "timestamps": [(start_time, end_time)],
            }), 200

        # main pipeline process (gemini_optimized)
        elif action == "gemini_optimized":
            print("action: gemini_optimized")
            detected_scenes = sg.detect_scenes(video_path)

            talking_timestamps = sg.get_talking_timestamps_with_gemini(
                video_path).strip().splitlines()
            if (talking_timestamps[0] != "NO_TALKING"):
                scenes_timestamps = sg.scene_list_to_string_list(
                    detected_scenes)
                talking_timestamps = sg.format_talking_timestamps(
                    talking_timestamps)
                detected_scenes = sg.combine_speaking_and_scenes(
                    scenes_timestamps, talking_timestamps)

            scene_descriptions, timestamps, scene_files = sg.describe_scenes_with_gemini_video(
                video_path, detected_scenes, SCENES_FOLDER)
            return jsonify({
                "message": "Scene changes detected successfully",
                "descriptions": scene_descriptions,
                "timestamps": timestamps,
                "scene_files": scene_files,
                "waveform_image": "backend\waveforms\waveform.png"
            }), 200

        elif action == "mock":
            print("action: gemini_optimized")

            # Mocking scene detection and talking timestamps functionality
            detected_scenes = [
                {"start": "00:00:00", "end": "00:00:04"},
                {"start": "00:00:04", "end": "00:00:16"},
                {"start": "00:00:16", "end": "00:00:20"},
                {"start": "00:00:20", "end": "00:00:27"},
                {"start": "00:00:27", "end": "00:00:30"}
            ]

            talking_timestamps = ["NO_TALKING"]  # Mock response

            if talking_timestamps[0] != "NO_TALKING":
                scenes_timestamps = [
                    f"{scene['start']} - {scene['end']}" for scene in detected_scenes
                ]

                talking_timestamps = [
                    "00:00:10 - 00:00:12",
                    "00:00:18 - 00:00:19"
                ]  # Mock formatted timestamps

                detected_scenes = [
                    {
                        "start": scene.split(' - ')[0],
                        "end": scene.split(' - ')[1]
                    } for scene in scenes_timestamps
                ]

            # Mocking Gemini's scene description and other outputs
            response_data = {
                "message": "Scene changes detected successfully",
                "descriptions": [
                    "A blue \"Big Buck Bunny\" logo with a white butterfly flies across.\n",
                    "A pink-hued sky overlooks a tranquil green meadow and forest.\n",
                    "A serene stream flows through a vibrant, lush meadow.\n",
                    "A fluffy cartoon bird wakes up, yawns, and flies away.\n",
                    "A whimsical forest scene shows a cozy burrow beneath a tree.\n"
                ],
                "timestamps": [
                    ["00:00:00", "00:00:04"],
                    ["00:00:04", "00:00:16"],
                    ["00:00:16", "00:00:20"],
                    ["00:00:20", "00:00:27"],
                    ["00:00:27", "00:00:30"]
                ],
                "scene_files": [
                    "scene_1.mp4",
                    "scene_2.mp4",
                    "scene_3.mp4",
                    "scene_4.mp4",
                    "scene_5.mp4"
                ],
                "waveform_image": "./waveforms/waveform.png"
            }

            return jsonify(response_data), 200
        
        elif action == "new_gemini":
            print("action: new_gemini")
            
            talking_timestamps = sg.get_talking_timestamps_with_gemini(
                video_path).strip().splitlines()
            timestamps = ng.get_video_scenes_with_gemini(video_path)
            combined_segments = ng.process_timestamps(timestamps)
            ng.cut_video_by_no_talking(video_path, combined_segments, "scenes_results")
            output = ng.describe_existing_segments("scenes_results")
            response_data = ng.format_response_data(combined_segments, output)
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
        # Generate the SRT content from descriptions and timestamps
        srt_content = generate_srt_file(descriptions, timestamps)
        temp_srt_path = os.path.join(tempfile.gettempdir(), "subtitles.srt")
        with open(temp_srt_path, "w") as srt_file:
            srt_file.write(srt_content)

        # Generate the list of pre-existing audio files corresponding to descriptions
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
    """
    Generate the SRT subtitle file content from descriptions and timestamps.

    Args:
        descriptions (list): A list of description texts.
        timestamps (list): A list of timestamps [start_time, end_time].

    Returns:
        str: The content of the SRT file.
    """
    srt_content = ""
    for i, (timestamp, description) in enumerate(zip(timestamps, descriptions)):
        start_time = timestamp[0]
        end_time = timestamp[1]

        # Format the times to match SRT format (hh:mm:ss,ms)
        start_time_str = format_time(start_time)
        end_time_str = format_time(end_time)

        # Add the subtitle entry
        srt_content += f"{i + 1}\n{start_time_str} --> {end_time_str}\n{description}\n\n"

    return srt_content

def format_time(seconds):
    """
    Convert a time in seconds to the SRT time format (hh:mm:ss,ms).

    Args:
        seconds (float): Time in seconds.

    Returns:
        str: Time in SRT format (hh:mm:ss,ms).
    """
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

@app.route("reprocess-descriptions", methods=["POST"])
def reprocess_descriptions():
    data = request.get_json()
    if not data or ("timestamps" and "descriptions") not in data:
        return jsonify({"error": "Invalid input. 'descriptions' is required."}), 400
    
@app.route("/text-to-speech", methods=["POST"])
def text_to_speech():
    data = request.form.get("descriptions")

    if not data:
        return jsonify({"error": "Descriptions are required."}), 400

    try:
        descriptions = json.loads(data)  # Parse the descriptions

        audio_files = []
        for description, timestamps, scene_id in descriptions:
            # Use your function to convert text to speech for each description
            audio_file_path = convert_text_to_speech(description, AUDIO_FOLDER, f"audio_description_{scene_id}")
            
            # Append the audio file and scene ID to the audio_files list
            audio_files.append({"id": scene_id, "audio_file": audio_file_path})

        # If only one audio file, send it directly
        if len(audio_files) == 1:
            return send_file(audio_files[0]["audio_file"], mimetype="audio/mpeg", as_attachment=True)

        # Create a ZIP file containing all the audio files and return it
        zip_filename = os.path.join(AUDIO_FOLDER, "audio_files.zip")
        with ZipFile(zip_filename, 'w') as zipf:
            for audio in audio_files:
                zipf.write(audio["audio_file"], os.path.basename(audio["audio_file"]))

        return send_file(zip_filename, mimetype="application/zip", as_attachment=True, attachment_filename="audio_files.zip")

    except Exception as e:
        return jsonify({"error": f"Failed to process descriptions: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
