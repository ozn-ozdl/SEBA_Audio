import subprocess
import sys
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector
from dotenv import load_dotenv
import os
import time
import PIL.Image
import google.generativeai as genai
from openai import OpenAI
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

def generate_video_description_with_gemini(video_file_path):
    # Upload the video and print a confirmation.

    video_file = genai.upload_file(path=video_file_path)
    while video_file.state.name == "PROCESSING":
        print('.', end='')
        time.sleep(1)
        video_file = genai.get_file(video_file.name)

    if video_file.state.name == "FAILED":
        raise ValueError(video_file.state.name)

    print(f"Completed upload: {video_file.uri}")
    # Create the prompt.
    prompt = '''
    DDescribe the video scenes, objects, actions, and transitions briefly in English without timestamps or introductory phrases. Directly provide the description of the content.
    '''

    # Choose a Gemini model.
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")

    # Make the LLM request.
    response = model.generate_content([video_file, prompt],
                                      request_options={"timeout": 600})
    return response.text

def describe_scenes_with_gemini_video(video_file, timestamps, output_dir):

    output_files = []
    tuple_timestamps=[]
    for idx,scene in enumerate(timestamps):
        output_video_file = os.path.join(output_dir, f"scene_{idx + 1}.mp4")
        command = f"ffmpeg -i {video_file} -ss {scene[0].get_timecode()} -to {scene[1].get_timecode()} -c:v libx264 -c:a aac -strict experimental {output_video_file}"
        os.system(command)
        output_files.append(output_video_file)
        tuple_timestamps.append((scene[0].get_timecode(),scene[1].get_timecode()))

    scene_descriptions = []
    for file in output_files:
        description = generate_video_description_with_gemini(file)
        scene_descriptions.append(description)

    scene_files = [os.path.basename(file_path) for file_path in output_files]
    return scene_descriptions,tuple_timestamps,scene_files

def detect_scenes(video_path):
    video_manager = VideoManager([video_path])
    scene_manager = SceneManager()

    # Add the ContentDetector algorithm (detects cuts based on content changes).
    scene_manager.add_detector(ContentDetector(threshold=10.0))

    # Start video manager to load the video.
    video_manager.start()
    scene_manager.detect_scenes(video_manager)

    # Obtain list of detected scenes.
    scene_list = scene_manager.get_scene_list()
    return scene_list
