import subprocess
import sys

from dotenv import load_dotenv
import os
import time
import PIL.Image
import google.generativeai as genai
from openai import OpenAI


def get_video_duration(video_path):
    result = subprocess.run(['ffmpeg', '-i', video_path],
                            stderr=subprocess.PIPE, stdout=subprocess.PIPE)
    output = result.stderr.decode('utf-8')

    for line in output.splitlines():
        if 'Duration' in line:
            duration_str = line.split(',')[0].split()[1]
            return duration_str
    return None


load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-1.5-flash")


def calculate_timestamp(frame, frame_rate):
    frame_number = int(frame.split('_')[1].split('.')[0])
    total_seconds = frame_number / frame_rate

    # total seconds to hours minutes and seconds
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)

    # return format as timestamps
    return f"{hours:02}:{minutes:02}:{seconds:02}"


def generate_video_description_with_gemini(video_file_path):
    # Upload the video and print a confirmation.

    video_file = genai.upload_file(path=video_file_path)
    while video_file.state.name == "PROCESSING":
        print('.', end='')
        time.sleep(10)
        video_file = genai.get_file(video_file.name)

    if video_file.state.name == "FAILED":
        raise ValueError(video_file.state.name)

    print(f"Completed upload: {video_file.uri}")
    # Create the prompt.
    prompt = "Transcribe the audio from this video. Provide visual descriptions without timestamps for any salient events in the video"

    # Choose a Gemini model.
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")

    # Make the LLM request.
    response = model.generate_content([video_file, prompt],
                                      request_options={"timeout": 600})
    return response.text


def split_video_by_scene_changes(scene_changes, frames_dir, frame_rate, video_file, output_dir):
    """Split video by changing scenes and save to output_dir"""
    scene_frames = []
    frames = sorted(
        [f for f in os.listdir(frames_dir) if f.endswith(".jpg")], key=numeric_sort_key
    )

    current_scene = []
    scene_index = 0

    for frame in frames:
        if (frames[0] == frame):
            current_scene.append(frame)
            scene_index += 1
            continue
        elif scene_index < len(scene_changes) and frame == scene_changes[scene_index]:
            scene_frames.append(current_scene)
            scene_index += 1
            current_scene = [frame]
        else:
            current_scene.append(frame)

    scene_frames.append(current_scene)

    timestamps = []
    for scene in scene_frames:
        start_frame = scene[0]
        end_frame = scene[-1]

        start_timestamp = calculate_timestamp(start_frame, frame_rate)
        end_timestamp = calculate_timestamp(end_frame, frame_rate)
        timestamps.append((start_timestamp, end_timestamp))

    # split and save
    output_files = []
    for idx, (start_time, end_time) in enumerate(timestamps):
        output_video_file = os.path.join(output_dir, f"scene_{idx + 1}.mp4")
        command = (
            f"ffmpeg -i {video_file} -ss {start_time} -to {end_time}"
            f" -c:v libx264 -c:a aac -strict experimental {output_video_file}"
        )
        os.system(command)
        output_files.append(output_video_file)

    return output_files, timestamps


def describe_scenes_with_gemini_video(video_file, scene_changes, frames_dir, frame_rate, output_dir):
    """Encapsulates the entire video segmentation and transcription description process"""
    # 1. Split the vid

    split_video_files, timestamps = split_video_by_scene_changes(
        scene_changes, frames_dir, frame_rate, video_file, output_dir)
    # 2. Audio transcription and visual description generation for each segmented clip
    scene_descriptions = []
    for video_file in split_video_files:
        description = generate_video_description_with_gemini(video_file)
        scene_descriptions.append(description)

    return scene_descriptions, timestamps


def describe_with_gemini_whole_video(video_path):
    video_file = genai.upload_file(path=video_path)
    print(video_path)
    while video_file.state.name == "PROCESSING":
        print('.', end='', flush=True)
        time.sleep(0.5)
        video_file = genai.get_file(video_file.name)

    if video_file.state.name == "FAILED":
        raise ValueError(f"Failed: {video_file.state.name}")

    transcription_prompt = '''
Transcribe the audio and describe the video scenes starting from the given timestamp. Provide timestamps for each key event, and describe the scenes, objects, actions, and transitions briefly in English. 
Do not include introductory phrases like "Okay, here's the transcript and video description."
    '''
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")
    response = model.generate_content(
        [video_file, transcription_prompt], request_options={"timeout": 600})
    return response.text
