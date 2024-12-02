import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import shutil
import openAI_images.video_to_frames as vtf
import openAI_images.detect_scene_changes as dsc
import openAI_images.scene_frames_to_descriptions as sftd
import openAI_images.get_return_values as grv

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 30 * 1024 * 1024
CORS(app)

UPLOAD_FOLDER = "./uploads"
FRAMES_FOLDER = "./frames"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
if os.path.exists(FRAMES_FOLDER):
    shutil.rmtree(FRAMES_FOLDER)
os.makedirs(FRAMES_FOLDER, exist_ok=True)

SCENES_FOLDER = "./scenes_results"
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
        elif action == "gemini_video":
            return "Not implemented", 501
        elif action == "gemini_optimized":
            return "Not implemented", 501
        else:
            return jsonify({"error": "Invalid action"}), 400

        # return jsonify({"message": f"Action '{action}' executed successfully", "result": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
