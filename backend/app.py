import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import shutil
import openAI_images.video_to_frames as vtf
import openAI_images.detect_scene_changes as dsc
import openAI_images.scene_frames_to_descriptions as sftd
import openAI_images.get_return_values as grv
from openAI_images.vidToDesGemini import describe_with_gemini_whole_video, get_video_duration
import openAI_images.scenes_to_description_optimized_gemini as sg
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import shutil
import openAI_images.video_to_frames as vtf
import openAI_images.detect_scene_changes as dsc
import openAI_images.scene_frames_to_descriptions as sftd
import openAI_images.get_return_values as grv
from openAI_images.vidToDesGemini import describe_with_gemini_whole_video, get_video_duration
import openAI_images.scenes_to_description_optimized_gemini as sg
import subprocess  # For FFmpeg
import tempfile  # For temporary subtitle file handling

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 30 * 1024 * 1024
CORS(app)

UPLOAD_FOLDER = "./uploads"
FRAMES_FOLDER = "./frames"
SCENES_FOLDER = "./scenes_results"
PROCESSED_FOLDER = "./processed"

# Ensure directories exist
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

def setup():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    if os.path.exists(FRAMES_FOLDER):
        shutil.rmtree(FRAMES_FOLDER)
    os.makedirs(FRAMES_FOLDER, exist_ok=True)

    if os.path.exists(SCENES_FOLDER):
        shutil.rmtree(SCENES_FOLDER)
    os.makedirs(SCENES_FOLDER, exist_ok=True)


@app.route("/")
def hello_geek():
    return "<h1>Hello from Flask & Docker</h1>"

# TODO: set useful variables as possible in the frontend by the user and do not hardcode them in the backend (e.g. ssim_threshold, hist_threshold, etc.)


@app.route("/scene_files/<path:filename>", methods=["GET"])
def get_scene_files(filename):
    return send_from_directory(SCENES_FOLDER, filename)


@app.route("/process-video", methods=["POST"])
def process_video():
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    setup()

    video_file = request.files["video"]
    action = request.form.get("action")

    video_path = os.path.join(UPLOAD_FOLDER, video_file.filename)
    video_file.save(video_path)

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
        elif action == "gemini_optimized":
            scene_descriptions, timestamps, scene_files = sg.describe_scenes_with_gemini_video(
                video_path, sg.detect_scenes(video_path), SCENES_FOLDER)
            return jsonify({
                "message": "Scene changes detected successfully",
                "descriptions": scene_descriptions,
                "timestamps": timestamps,
                "scene_files": scene_files,
            }), 200
        else:
            return jsonify({"error": "Invalid action"}), 400

        # return jsonify({"message": f"Action '{action}' executed successfully", "result": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# @app.route("/encode-video-with-subtitles", methods=["POST"])
# def encode_video_with_subtitles():
#     data = request.get_json()
#     if not data:
#         return jsonify({"error": "Invalid JSON data"}), 400

#     descriptions = data.get("descriptions")
#     timestamps = data.get("timestamps")
#     video_file_name = data.get("videoFileName")

#     if not all([descriptions, timestamps, video_file_name]):
#         return jsonify({"error": "Missing required fields"}), 400

#     video_path = os.path.join(UPLOAD_FOLDER, video_file_name)
#     if not os.path.exists(video_path):
#         return jsonify({"error": "Video file not found"}), 404

#     try:
#         # Generate SRT file
#         srt_content = generate_srt_file(descriptions, timestamps)
#         temp_srt_path = os.path.join(tempfile.gettempdir(), "subtitles.srt")
#         with open(temp_srt_path, "w") as srt_file:
#             srt_file.write(srt_content)

#         # Output file path
#         output_path = os.path.join(PROCESSED_FOLDER, f"processed_{video_file_name}")

#         # Use FFmpeg to embed subtitles
#         ffmpeg_command = [
#             "ffmpeg",
#             "-i", video_path,
#             "-vf", f"subtitles={}",
#             "-c:v", "libx264",
#             "-preset", "fast",
#             "-crf", "23",
#             output_path
#         ]
#         subprocess.run(ffmpeg_command, check=True)

#         return jsonify({
#             "message": "Video encoded with subtitles successfully",
#             "output_video_url": f"/processed/{os.path.basename(output_path)}"
#         }), 200

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

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
        # Generate SRT file
        srt_content = generate_srt_file(descriptions, timestamps)
        temp_srt_path = os.path.join(tempfile.gettempdir(), "subtitles.srt")
        with open(temp_srt_path, "w") as srt_file:
            srt_file.write(srt_content)

        # Output file path
        output_path = os.path.join(PROCESSED_FOLDER, f"processed_{video_file_name}")

        # Use FFmpeg to embed subtitles
        ffmpeg_command = [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-vf", f"subtitles={temp_srt_path}",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            output_path
        ]
        subprocess.run(ffmpeg_command, check=True)

        return jsonify({
            "message": "Video encoded with subtitles successfully",
            "output_video_url": f"/processed/{os.path.basename(output_path)}"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# @app.route("/processed/<path:filename>", methods=["GET"])
# def get_processed_video(filename):
#     return send_from_directory(PROCESSED_FOLDER, filename)

@app.route("/processed/<path:filename>", methods=["GET"])
def get_processed_video(filename):
    # Ensure the filename is safely retrieved and accessible
    try:
        return send_from_directory(PROCESSED_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404


def generate_srt_file(descriptions, timestamps):
    """Generate SRT file content from descriptions and timestamps."""
    srt_content = []
    for i, (description, (start, end)) in enumerate(zip(descriptions, timestamps), start=1):
        srt_content.append(f"{i}")
        srt_content.append(f"{start} --> {end}")
        srt_content.append(description)
        srt_content.append("")  # Blank line between entries
    return "\n".join(srt_content)

if __name__ == "__main__":
    app.run(debug=True)
