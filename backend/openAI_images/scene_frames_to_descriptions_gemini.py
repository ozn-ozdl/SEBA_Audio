import subprocess
import sys

from dotenv import load_dotenv
import os
import time
import PIL.Image
import google.generativeai as genai
from openai import OpenAI

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-1.5-flash")


def generate_image_description_with_gemini(image_path):
    with open(image_path, "rb") as image_file:
        import base64
        image_data = base64.b64encode(image_file.read()).decode("utf-8")

    response = model.generate_content([
        {
            'mime_type': 'image/jpeg', 
            'data': image_data
        },
        "You are a helpful assistant that describes images. Create a short, concise description for an audio description."
    ])

    return response.text


def summarize_descriptions_with_gemini(descriptions):
    prompt = (
        "Summarize the following image descriptions into one short, concise sentence that can be used as an audio description for visually impaired individuals: \n\n"
        + "\n".join([f"- {desc}" for desc in descriptions])
    )

    response = model.generate_content(prompt)
    return response.text


def numeric_sort_key(filename):
    basename = os.path.basename(filename)
    frame_number = int(basename.split("_")[1].split(".")[0])
    return frame_number


def describe_scenes_with_gemini(scene_changes, frames_dir):
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

    scene_descriptions = []

    for _, frames in enumerate(scene_frames):

        frame_descriptions = []
        for frame in frames:
            description = generate_image_description_with_gemini(
                os.path.join(frames_dir, frame))
            frame_descriptions.append(description)

        scene_description = summarize_descriptions_with_gemini(
            frame_descriptions)
        scene_descriptions.append(scene_description)

    return scene_descriptions, scene_frames
