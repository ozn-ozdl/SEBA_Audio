import json
import mimetypes
import os
import re
import uuid
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


# @app.route("/analyze-timestamps", methods=["POST"])
# def analyze_timestamps():
#     print("Analyzing timestamps")

#     # Get video name from form data
#     video_name = request.form.get("video_name")
#     if not video_name:
#         return jsonify({"error": "No video name provided"}), 400

#     # Get timestamps from form data
#     old_timestamps_str = request.form.get("old_timestamps", "")
#     new_timestamps_str = request.form.get("new_timestamps", "")

#     # Parse timestamps
#     try:
#         old_timestamps = [tuple(ts.split('-')) for ts in old_timestamps_str.split(',') if ts]
#         new_timestamps = [tuple(ts.split('-')) for ts in new_timestamps_str.split(',') if ts]
#     except Exception as e:
#         return jsonify({"error": f"Invalid timestamp format: {str(e)}"}), 400

#     # Construct video path from uploads folder
#     video_path = os.path.join(UPLOAD_FOLDER, video_name)
#     if not os.path.exists(video_path):
#         return jsonify({"error": "Video file not found on server"}), 404

#     try:
#         # Combine and sort timestamps
#         combined_timestamps = list(set(old_timestamps + new_timestamps))
#         combined_timestamps.sort(key=lambda x: float(x[0].replace(':', '').replace('.', '')))

#         # Format full response (convert tuples to dicts)
#         formatted_segments = [{
#             'start': start,
#             'end': end,
#             'type': 'NO_TALKING'
#         } for start, end in combined_timestamps]

#         # Find changed/new segments (raw tuples)
#         old_set = set(old_timestamps)
#         changed_tuples = [ts for ts in new_timestamps if ts not in old_set]

#         # Convert changed tuples to proper segment dictionaries
#         changed_segments = [{
#             'start': start,
#             'end': end,
#             'type': 'NO_TALKING'
#         } for start, end in changed_tuples]

#         # Process only changed segments
#         changed_results = []
#         if changed_segments:
#             # Process through your existing pipeline
#             # processed_segments = ng.process_timestamps(changed_segments)
#             # scenes_results = ng.process_timestamps(changed_segments)
#             scene_results = ng.cut_video_by_no_talking(video_path, changed_segments, "scenes_results")
            
#             # Generate descriptions
#             descriptions = ng.describe_existing_segments("scenes_results", scene_results, "audio")
#             print("DESCRIPTIONS", descriptions)
#             # Format response
#             changed_results = ng.format_response_data(changed_segments, descriptions)
#             print("CHANGED RESULTS", changed_results)

#         return jsonify({
#             "full_segments": formatted_segments,
#             "changed_segments": changed_results
#         }), 200

#     except Exception as e:
#         print("An error occurred:", traceback.format_exc())
#         return jsonify({"error": f"An error occurred during processing: {str(e)}"}), 500

# @app.route("/analyze-timestamps", methods=["POST"])
# def analyze_timestamps():
#     print("Analyzing timestamps")

#     try:
#         # Get form data with consistent naming
#         video_name = request.form.get("video_name")
#         old_data_str = request.form.get("old_data", "[]")
#         new_timestamp_str = request.form.get("new_timestamp", "")  # Singular form

#         if not video_name:
#             return jsonify({"error": "No video name provided"}), 400

#         # Parse old data with descriptions
#         old_data = json.loads(old_data_str)
#         old_timestamps = {(item["start"], item["end"]): item["description"] 
#                         for item in old_data if "start" in item and "end" in item}

#         # Parse new timestamps
#         new_timestamps = []
#         if new_timestamp_str:
#             new_timestamps = [tuple(ts.split('-')) for ts in new_timestamp_str.split(',') if ts]

#         # Construct video path
#         video_path = os.path.join(UPLOAD_FOLDER, video_name)
#         if not os.path.exists(video_path):
#             return jsonify({"error": "Video file not found on server"}), 404

#         # Combine all segments
#         all_segments = list({(s, e) for s, e in [*old_timestamps.keys(), *new_timestamps]})
        
#         # Sort segments by start time
#         def time_to_seconds(t):
#             return sum(float(x) * 60**i for i, x in enumerate(reversed(t.split(":"))))
        
#         all_segments.sort(key=lambda x: time_to_seconds(x[0]))

#         # Process changed segments
#          # Process changed segments
#         processed_data = []
#         changed_segments = [ts for ts in new_timestamps if ts not in old_timestamps]

#         if changed_segments:
#             # Add type field to changed segments
#             changed_segments_dict = [{
#                 'start': s, 
#                 'end': e,
#                 'type': 'NO_TALKING'  # Add this line
#             } for s, e in changed_segments]
            
#             # Cut video and generate descriptions
#             scenes = ng.cut_video_by_no_talking(
#                 video_path, changed_segments_dict, SCENES_FOLDER
#             )
#             descriptions = ng.describe_existing_segments(SCENES_FOLDER, scenes, AUDIO_FOLDER)
#             print("Scenes:", scenes)
#             print("Descriptions:", descriptions)
#             # # Store processed data
#             # processed_data = [{
#             #     'start': seg['start'],
#             #     'end': seg['end'],
#             #     'description': desc,
#             #     'audio_file': f"audio/{scenes[i].scene_ids}.mp3"
#             # } for i, (seg, desc) in enumerate(zip(changed_segments_dict, descriptions))]
#             response = ng.format_response_data(changed_segments_dict, descriptions)

#         print("Response:", response)
#         # Merge with old descriptions
#         final_descriptions = []
#         for start, end in all_segments:
#             # Check for new processed data first
#             new_entry = next((p for p in processed_data 
#                             if p['start'] == start and p['end'] == end), None)
            
#             if new_entry:
#                 final_descriptions.append(new_entry)
#             else:
#                 # Fall back to old description
#                 final_descriptions.append({
#                     'start': start,
#                     'end': end,
#                     'description': old_timestamps.get((start, end), "NO_TALKING"),
#                     'audio_file': f"audio/{uuid.uuid4()}.mp3" if (start, end) in old_timestamps else None
#                 })

#         return jsonify({
#             'descriptions': final_descriptions,
#             'waveform_image': "./waveforms/waveform.png"
#         }), 200

#     except json.JSONDecodeError as e:
#         return jsonify({"error": f"Invalid old_data format: {str(e)}"}), 400
#     except Exception as e:
#         print("An error occurred:", traceback.format_exc())
#         return jsonify({"error": f"An error occurred during processing: {str(e)}"}), 500


# @app.route("/analyze-timestamps", methods=["POST"])
# def analyze_timestamps():
#     print("Analyzing timestamps (milliseconds)")

#     try:
#         # Get input data
#         video_name = request.form.get("video_name")
#         old_data_str = request.form.get("old_data", "[]")
#         new_timestamp_str = request.form.get("new_timestamp", "")

#         if not video_name:
#             return jsonify({"error": "No video name provided"}), 400

#         # Parse timestamps as integers (milliseconds)
#         old_data = json.loads(old_data_str)
#         old_segments = {
#             ((seg["start"]), (seg["end"])): seg.get("description", "")
#             for seg in old_data if "start" in seg and "end" in seg
#         }

#         print (new_timestamp_str)
#         new_segments = []
#         if new_timestamp_str:
#             new_segments = [
#                 tuple(map(int, ts.split("-"))) 
#                 for ts in new_timestamp_str.split(",") 
#                 if ts
#             ]

#         # Validate video exists
#         video_path = os.path.join(UPLOAD_FOLDER, video_name)
#         if not os.path.exists(video_path):
#             return jsonify({"error": "Video file not found"}), 404

#         # Combine and sort all segments
#         all_segments = list({*old_segments.keys(), *new_segments})
#         all_segments.sort(key=lambda x: x[0])  # Sort by start ms

#         # Process changed segments
#         changed_segments = [ts for ts in new_segments if ts not in old_segments]
#         processed_data = []

#         if changed_segments:
#             # Convert ms to seconds for video processing
#             segments_for_processing = [{
#                 "start": start/1000.0,
#                 "end": end/1000.0,
#                 "type": "NO_TALKING"
#             } for (start, end) in changed_segments]

#             # Process video segments
#             scene_data = ng.cut_video_by_no_talking(
#                 video_path, 
#                 segments_for_processing, 
#                 SCENES_FOLDER
#             )
            
#             # Generate descriptions
#             descriptions = ng.describe_existing_segments(
#                 SCENES_FOLDER, 
#                 scene_data, 
#                 AUDIO_FOLDER
#             )
            
#             # Format response with ms timestamps
#             processed_data = [{
#                 "start": start,
#                 "end": end,
#                 "description": desc,
#                 "audio_file": f"audio/{uuid.uuid4()}.mp3"
#             } for (start, end), desc in zip(changed_segments, descriptions)]

#         # Merge results
#         final_output = []
#         for start, end in all_segments:
#             # Find matching processed segment
#             new_entry = next(
#                 (p for p in processed_data if p["start"] == start and p["end"] == end),
#                 None
#             )
            
#             if new_entry:
#                 final_output.append(new_entry)
#             else:
#                 final_output.append({
#                     "start": start,
#                     "end": end,
#                     "description": old_segments.get((start, end), "NO_TALKING"),
#                     "audio_file": None
#                 })

#         return jsonify({
#             "descriptions": final_output,
#             "waveform_image": "/waveforms/waveform.png"
#         }), 200

#     except json.JSONDecodeError as e:
#         return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
#     except Exception as e:
#         print(f"Processing error: {traceback.format_exc()}")
#         return jsonify({"error": f"Processing failed: {str(e)}"}), 500


@app.route("/analyze-timestamps", methods=["POST"])
def analyze_timestamps():
    print("Analyzing timestamps (milliseconds)")
    try:
        # Get input data
        video_name = request.form.get("video_name")
        old_data_str = request.form.get("old_data", "[]")
        new_timestamp_str = request.form.get("new_timestamp", "")

        if not video_name:
            return jsonify({"error": "No video name provided"}), 400

        # Parse `old_data`
        try:
            old_data = json.loads(old_data_str)
            old_segments = {}
            for seg in old_data:
                try:
                    start = int(seg["start"])
                    end = int(seg["end"])
                    description = seg.get("description", "")
                    old_segments[(start, end)] = description
                except (ValueError, KeyError):
                    return jsonify({"error": "Invalid start or end value in old_data"}), 400
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON format for old_data"}), 400

        # Parse `new_timestamp`
        try:
            new_segments = [
                tuple(map(int, ts.split("-")))
                for ts in new_timestamp_str.split(",")
                if "-" in ts  # Ensure the format is `start-end`
            ]
        except ValueError:
            return jsonify({"error": "Invalid format for new_timestamp"}), 400

        # Validate video file exists
        video_path = os.path.join(UPLOAD_FOLDER, video_name)
        if not os.path.exists(video_path):
            return jsonify({"error": "Video file not found"}), 404

        # Combine and sort all segments
        all_segments = list({*old_segments.keys(), *new_segments})
        all_segments.sort(key=lambda x: x[0])  # Sort by start time

        # Process changed segments
        changed_segments = [ts for ts in new_segments if ts not in old_segments]
        processed_data = []

        if changed_segments:
            # Convert milliseconds to seconds for processing
            segments_for_processing = [
                {"start": start / 1000.0, "end": end / 1000.0, "type": "NO_TALKING"}
                for (start, end) in changed_segments
            ]

            # Process video segments
            scene_data = ng.cut_video_by_no_talking(
                video_path, segments_for_processing, SCENES_FOLDER
            )

            # Generate descriptions
            descriptions = ng.describe_existing_segments(
                SCENES_FOLDER, scene_data, AUDIO_FOLDER
            )

            # Format processed data
            processed_data = [
                {
                    "start": start,
                    "end": end,
                    "description": desc,
                    "audio_file": f"audio/{uuid.uuid4()}.mp3",
                }
                for (start, end), desc in zip(changed_segments, descriptions)
            ]

        # Merge results
        final_output = []
        for start, end in all_segments:
            new_entry = next(
                (p for p in processed_data if p["start"] == start and p["end"] == end),
                None,
            )

            if new_entry:
                final_output.append(new_entry)
            else:
                final_output.append(
                    {
                        "start": start,
                        "end": end,
                        "description": old_segments.get((start, end), "NO_TALKING"),
                        "audio_file": None,
                    }
                )

        # Return response
        return jsonify(
            {
                "descriptions": final_output,
                "waveform_image": "/waveforms/waveform.png",
            }
        ), 200

    except Exception as e:
        print(f"Processing error: {traceback.format_exc()}")
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

  
def ms_to_srt(ms: int) -> str:
    """Convert milliseconds to SRT time format (HH:MM:SS,mmm)"""
    hours, ms = divmod(ms, 3600000)
    minutes, ms = divmod(ms, 60000)
    seconds, ms = divmod(ms, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{ms:03d}"

def ms_to_seconds(ms: int) -> float:
    """Convert milliseconds to seconds with decimal precision"""
    return ms / 1000.0
  
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
            print("Timestamps:", timestamps)
            combined_segments = ng.process_timestamps(timestamps)
            print("Combined Segments:", combined_segments)
            # Cut the video by the "NO_TALKING" segments and save them in a folder
            sceneOutput = ng.cut_video_by_no_talking(video_path, combined_segments, "scenes_results")
            print("Scene Output:", sceneOutput)
            # Describe existing segments
            output = ng.describe_existing_segments("scenes_results", sceneOutput, "audio")
            print("Output:", output)
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
    
# @app.route("/encode-video-with-subtitles", methods=["POST"])
# def encode_video_with_subtitles():
#     UPLOAD_FOLDER = "uploads"
#     PROCESSED_FOLDER = "processed"
#     temp_files = []

#     try:
#         data = request.get_json()
#         if not data:
#             return jsonify({"error": "No JSON data received"}), 400

#         # Validate required fields
#         required_fields = ['descriptions', 'timestamps', 'audioFiles', 'videoFileName']
#         for field in required_fields:
#             if field not in data or not data[field]:
#                 return jsonify({"error": f"Missing required field: {field}"}), 400

#         descriptions = data['descriptions']
#         timestamps = data['timestamps']
#         audio_files = data['audioFiles']
#         video_file_name = data['videoFileName']

#         # Validate array lengths
#         if len(descriptions) != len(timestamps):
#             return jsonify({"error": "Descriptions and timestamps arrays must be the same length"}), 400

#         # Filter non-TALKING segments with audio files
#         filtered_segments = []
#         audio_index = 0
#         for i, desc in enumerate(descriptions):
#             if desc.strip().upper() != "TALKING":
#                 try:
#                     start, end = timestamps[i]
#                     audio_file = audio_files[audio_index]
#                     audio_index += 1
                    
#                     filtered_segments.append({
#                         "start_ts": start,
#                         "end_ts": end,
#                         "audio": audio_file,
#                         "description": desc
#                     })
#                 except IndexError:
#                     return jsonify({"error": "Mismatch between audio files and non-TALKING descriptions"}), 400

#         # Generate SRT file
#         srt_content = []
#         for i, seg in enumerate(filtered_segments, 1):
#             start = seg["start_ts"].replace(".", ",")
#             end = seg["end_ts"].replace(".", ",")
#             srt_content.append(
#                 f"{i}\n{start} --> {end}\n{seg['description'].strip()}\n"
#             )
        
#         srt_path = create_temp_file("\n".join(srt_content), ".srt")
#         temp_files.append(srt_path)

#         # Get video path
#         video_path = os.path.join(UPLOAD_FOLDER, video_file_name)
#         if not os.path.exists(video_path):
#             return jsonify({"error": "Video file not found"}), 404

#         # Create temporary output audio file
#         mixed_audio_path = os.path.join(tempfile.gettempdir(), "mixed_audio.mp3")
#         temp_files.append(mixed_audio_path)

#         # Prepare audio parameters
#         audio_clips = [seg["audio"] for seg in filtered_segments]
#         start_times = [timestamp_to_seconds(seg["start_ts"]) for seg in filtered_segments]

#         # Combine audio files with delays (original function)
#         combine_audio_with_delays(
#             audio_files=audio_clips,
#             seconds_list=start_times,
#             output_file=mixed_audio_path
#         )

#         # Encode final video with subtitles
#         output_filename = f"processed_{video_file_name}"
#         output_path = os.path.join(PROCESSED_FOLDER, output_filename)
        
#         subprocess.run([
#             "ffmpeg", "-y",
#             "-i", video_path,
#             "-i", mixed_audio_path,
#             "-vf", f"subtitles={srt_path}:force_style='FontName=Arial,FontSize=24'",
#             "-c:v", "libx264", "-preset", "fast", "-crf", "23",
#             "-c:a", "aac", "-b:a", "192k",
#             "-map", "0:v", "-map", "1:a",
#             output_path
#         ], check=True)

#         return send_file(
#             output_path,
#             as_attachment=True,
#             download_name=output_filename,
#             mimetype='video/mp4'
#         )

#     except subprocess.CalledProcessError as e:
#         return jsonify({
#             "error": "Video processing failed",
#             "details": e.stderr.decode() if e.stderr else str(e)
#         }), 500
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#     finally:
#         cleanup_temp_files(temp_files)

# # Original function unchanged
# def combine_audio_with_delays(audio_files, seconds_list, output_file):
#     """
#     Combines a list of audio files into a single audio track with specified delays.
#     """
#     if len(audio_files) != len(seconds_list):
#         raise ValueError("The number of audio files must match the number of delay values.")

#     # Create a complex filter for ffmpeg
#     filter_complex = ""
#     inputs = []
#     for i, (audio_file, delay) in enumerate(zip(audio_files, seconds_list)):
#         inputs.extend(["-i", audio_file])
#         filter_complex += f"[{i}:a]adelay={int(delay * 1000)}|{int(delay * 1000)}[a{i}];"

#     # Concatenate all delayed audio streams
#     filter_complex += "".join([f"[a{i}]" for i in range(len(audio_files))]) + f"amix=inputs={len(audio_files)}:duration=longest[aout]"

#     # Build the ffmpeg command
#     ffmpeg_command = [
#         "ffmpeg",
#         *inputs,
#         "-filter_complex", filter_complex,
#         "-map", "[aout]",
#         output_file
#     ]

#     # Execute the ffmpeg command
#     subprocess.run(ffmpeg_command, check=True)

# # Helper functions
# # def timestamp_to_seconds(ts):
# #     """Convert HH:MM:SS.ms timestamp to total seconds"""
# #     parts = re.split(r"[:.]", ts.replace(",", "."))
# #     if len(parts) < 3:
# #         raise ValueError(f"Invalid timestamp format: {ts}")
    
# #     hours = float(parts[0]) if len(parts) > 3 else 0
# #     minutes = float(parts[-3])
# #     seconds = float(parts[-2])
# #     milliseconds = float(parts[-1])/1000
    
# #     return hours*3600 + minutes*60 + seconds + milliseconds

# def create_temp_file(content, suffix):
#     """Create a temporary file with content"""
#     with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
#         f.write(content)
#         return f.name

# def cleanup_temp_files(paths):
#     """Clean up temporary files"""
#     for path in paths:
#         try:
#             if path and os.path.exists(path):
#                 os.remove(path)
#         except Exception:
#             pass

@app.route("/encode-video-with-subtitles", methods=["POST"])
def encode_video_with_subtitles():
    UPLOAD_FOLDER = "uploads"
    PROCESSED_FOLDER = "processed"
    temp_files = []

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        # Validate required fields
        required_fields = ['descriptions', 'timestamps', 'audioFiles', 'videoFileName']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        descriptions = data['descriptions']
        timestamps = data['timestamps']
        audio_files = data['audioFiles']
        video_file_name = data['videoFileName']

        # Validate array lengths
        if len(descriptions) != len(timestamps):
            return jsonify({"error": "Descriptions and timestamps arrays must be the same length"}), 400

        # Filter non-TALKING segments with audio files
        filtered_segments = []
        audio_index = 0
        for i, desc in enumerate(descriptions):
            if desc.strip().upper() != "TALKING":
                try:
                    start, end = timestamps[i]
                    audio_file = audio_files[audio_index]
                    audio_index += 1
                    
                    filtered_segments.append({
                        "start_ts": start,
                        "end_ts": end,
                        "audio": audio_file,
                        "description": desc
                    })
                except IndexError:
                    return jsonify({"error": "Mismatch between audio files and non-TALKING descriptions"}), 400

        # Process audio clips to fit in timestamps
        for seg in filtered_segments:
            try:
                start = int(seg["start_ts"])
                end = int(seg["end_ts"])
                desired_duration_ms = end - start
                
                if desired_duration_ms <= 0:
                    raise ValueError("End timestamp must be after start timestamp")
                
                original_audio = seg["audio"]
                original_duration_ms = get_audio_duration(original_audio) * 1000
                
                if original_duration_ms > desired_duration_ms:
                    speed_factor = original_duration_ms / desired_duration_ms
                    # Create temporary sped-up audio file
                    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                        temp_path = temp_file.name
                    temp_files.append(temp_path)
                    speed_up_audio(original_audio, speed_factor, temp_path)
                    seg["audio"] = temp_path

            except Exception as e:
                cleanup_temp_files(temp_files)
                return jsonify({"error": f"Audio processing failed: {str(e)}"}), 500

        # Generate SRT file
        srt_content = []
        for i, seg in enumerate(filtered_segments, 1):
            start_srt = milliseconds_to_srt_time(seg["start_ts"])
            end_srt = milliseconds_to_srt_time(seg["end_ts"])
            srt_content.append(
                f"{i}\n{start_srt} --> {end_srt}\n{seg['description'].strip()}\n"
            )
        
        srt_path = create_temp_file("\n".join(srt_content), ".srt")
        temp_files.append(srt_path)

        # Get video path
        video_path = os.path.join(UPLOAD_FOLDER, video_file_name)
        if not os.path.exists(video_path):
            return jsonify({"error": "Video file not found"}), 404

        # Create temporary output audio file
        mixed_audio_path = os.path.join(tempfile.gettempdir(), "mixed_audio.mp3")
        temp_files.append(mixed_audio_path)

        # Prepare audio parameters
        audio_clips = [seg["audio"] for seg in filtered_segments]
        start_times = [timestamp_to_seconds(seg["start_ts"]) for seg in filtered_segments]

        # Combine audio files with delays
        combine_audio_with_delays(
            audio_files=audio_clips,
            seconds_list=start_times,
            output_file=mixed_audio_path
        )

        # Encode final video with subtitles
        output_filename = f"processed_{video_file_name}"
        output_path = os.path.join(PROCESSED_FOLDER, output_filename)
        
        subprocess.run([
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", mixed_audio_path,
            "-vf", f"subtitles={srt_path}:force_style='FontName=Arial,FontSize=24'",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "192k",
            "-map", "0:v", "-map", "1:a",
            output_path
        ], check=True)

        return send_file(
            output_path,
            as_attachment=True,
            download_name=output_filename,
            mimetype='video/mp4'
        )

    except subprocess.CalledProcessError as e:
        return jsonify({
            "error": "Video processing failed",
            "details": e.stderr.decode() if e.stderr else str(e)
        }), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup_temp_files(temp_files)

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
