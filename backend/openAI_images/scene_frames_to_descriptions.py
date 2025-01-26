from openai import OpenAI
from dotenv import load_dotenv
import os
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)


def generate_image_description_with_openai(image_path):
    with open(image_path, "rb") as image_file:
        import base64
        image_data = base64.b64encode(image_file.read()).decode("utf-8")

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that describes images. Create a short, concise description for an audio description."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image in one sentence."},
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data}"}},
                ],
            }
        ],
    )

    return response.choices[0].message.content


def summarize_descriptions_with_openai(descriptions):
    prompt = (
        "Summarize the following image descriptions into one short, concise sentence that can be used as an audio description for visually impaired individuals: \n\n"
        + "\n".join([f"- {desc}" for desc in descriptions])
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an assistant that creates short, clear, and concise audio descriptions."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content.strip()


def numeric_sort_key(filename):
    basename = os.path.basename(filename)
    frame_number = int(basename.split("_")[1].split(".")[0])
    return frame_number


def describe_scenes_with_openai(scene_changes, frames_dir):
    scene_frames = []
    frames = sorted(
        [f for f in os.listdir(frames_dir) if f.endswith(".jpg")], key=numeric_sort_key
    )

    current_scene = []
    scene_index = 0

    for frame in frames:
        if frames[0] == frame:
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
        with ThreadPoolExecutor() as executor:
            frame_descriptions = list(
                executor.map(
                    generate_image_description_with_openai,
                    [os.path.join(frames_dir, frame) for frame in frames]
                )
            )

        scene_description = summarize_descriptions_with_openai(
            frame_descriptions)
        scene_descriptions.append(scene_description)

    return scene_descriptions, scene_frames
