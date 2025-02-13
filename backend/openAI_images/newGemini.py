import re
import subprocess
import uuid
from dotenv import load_dotenv
from datetime import datetime
import os
import time
import google.generativeai as genai
import json
import concurrent.futures
import random
from common_functions import convert_text_to_speech, extract_audio_from_video

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)


def time_to_milliseconds(time_str):
    """
    Convert a time string in HH:MM:SS.sss format to milliseconds.

    Args:
        time_str (str): Time string in HH:MM:SS.sss format. Missing parts are filled with zeros.

    Returns:
        int: Total time in milliseconds.
    """
    parts = re.split(r'[:.]', time_str)
    while len(parts) < 4:
        parts.append('0')
    h, m, s, ms = map(int, parts[:4])
    return h * 3600000 + m * 60000 + s * 1000 + ms

def milliseconds_to_time(ms):
    """
    Convert milliseconds to a time string in HH:MM:SS.sss format.

    Args:
        ms (int): Time in milliseconds.

    Returns:
        str: Formatted time string in HH:MM:SS.sss format.
    """
    ms = int(ms)
    hours, ms = divmod(ms, 3600000)
    minutes, ms = divmod(ms, 60000)
    seconds, ms = divmod(ms, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{ms:03d}"

def describe_existing_segments(segments_directory, scene_data, audio_folder):
    """
    Generate descriptions for existing video segments using the Gemini API and convert them to speech.

    Args:
        segments_directory (str): Path to the directory containing video segment files.
        scene_data (tuple): Tuple containing two lists: scene_numbers and scene_ids.
        audio_folder (str): Directory where the generated audio files will be saved.

    Returns:
        list: List of tuples in the format 
              (scene_number, scene_id, description, segment_file, description_audio) sorted by scene_number.
    """
    scene_numbers, scene_ids = scene_data
    segment_files = os.listdir(segments_directory)
    scene_descriptions = []

    def process_segment(segment_file):
        segment_path = os.path.join(segments_directory, segment_file)
        parts = segment_file.split('_')
        scene_id = parts[1].split('.')[0]
        
        if scene_id not in scene_ids:
            return None
            
        description = generate_video_description_with_gemini(segment_path)
        description_audio = convert_text_to_speech(description, audio_folder, f"audio_description_{scene_id}")
        scene_idx = scene_ids.index(scene_id)
        scene_number = scene_numbers[scene_idx]
        
        return (scene_number, scene_id, description, segment_file, description_audio)

    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_segment = {executor.submit(process_segment, segment_file): segment_file 
                           for segment_file in segment_files}
        for future in concurrent.futures.as_completed(future_to_segment):
            result = future.result()
            if result:
                scene_descriptions.append(result)

    scene_descriptions.sort(key=lambda x: x[0])
    return scene_descriptions

def cut_video_by_no_talking(input_video_path, segments, output_folder):
    """
    Cut the input video into segments corresponding to non-talking parts using FFmpeg.

    Args:
        input_video_path (str): Path to the input video file.
        segments (list): List of segment dictionaries with keys "start", "end", and "type".
        output_folder (str): Directory where the output segment video files will be saved.

    Returns:
        tuple: Two lists containing scene_numbers and scene_ids for the non-talking segments.
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    scene_ids = []
    scene_numbers = []

    for i, segment in enumerate(segments):
        if segment["type"] == "NO_TALKING":
            start_ms = segment["start"]
            end_ms = segment["end"]
            unique_id = str(uuid.uuid4())
            scene_ids.append(unique_id)
            scene_numbers.append(i + 1)

            output_file = os.path.join(output_folder, f"scene_{unique_id}.mp4")
            start_time = milliseconds_to_time(start_ms)
            end_time = milliseconds_to_time(end_ms)

            ffmpeg_command = (
                f"ffmpeg -i {input_video_path} -ss {start_time} -to {end_time} "
                f"-c:v libx264 -c:a aac -strict experimental {output_file} -y"
            )
            subprocess.run(ffmpeg_command, shell=True)

    return (scene_numbers, scene_ids)

import time
import random

def generate_video_description_with_gemini(video_file_path, max_retries=5, initial_delay=1):
    """
    Generate a natural language description for a video scene using the Gemini API.

    Args:
        video_file_path (str): Path to the video file.
        max_retries (int, optional): Maximum number of retries on failure. Defaults to 5.
        initial_delay (float, optional): Initial delay between retries in seconds. Defaults to 1.

    Returns:
        str: Generated description text.

    Raises:
        Exception: If the API call fails after the maximum number of retries.
    """
    for attempt in range(max_retries):
        try:
            video_file = genai.upload_file(path=video_file_path)
            while video_file.state.name == "PROCESSING":
                time.sleep(1)
                video_file = genai.get_file(video_file.name)

            if video_file.state.name == "FAILED":
                raise ValueError(video_file.state.name)

            prompt = '''
            You are an assistant that creates natural, clear, and concise audio descriptions for a given video scene for visually impaired individuals.
            Describe the visual content of the whole given video scene in exactly one single sentence with no more than 12 words.
            Focus on key actions, objects, and emotions.
            Ensure the sentence sounds natural when spoken aloud and provides essential information.
            Only return the sentence without any additional information or text.
            '''

            model = genai.GenerativeModel(model_name="gemini-1.5-flash")
            response = model.generate_content([video_file, prompt],
                                              request_options={"timeout": 600})
            return response.text
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            delay = initial_delay * (2 ** attempt) + random.uniform(0, 1)
            time.sleep(delay)

def format_response_data(combined_segments, descriptions):
    """
    Format segmentation and description data into a structured response dictionary.

    Args:
        combined_segments (list): List of segment dictionaries with keys "start", "end", and "type".
        descriptions (list): List of tuples generated by describe_existing_segments containing scene details.

    Returns:
        dict: Dictionary with keys "message", "descriptions", "timestamps", "scene_files", "audio_files", and "waveform_image".
    """
    descriptions_sorted = sorted(descriptions, key=lambda x: x[0])
    response_data = {
        "message": "Scene changes detected successfully",
        "descriptions": [],
        "timestamps": [],
        "scene_files": [],
        "audio_files": [],
        "waveform_image": "./waveforms/waveform.png"
    }

    for idx, segment in enumerate(combined_segments):
        description = "TALKING" if segment["type"] == "TALKING" else ""
        audio_file = "" if segment["type"] == "TALKING" else None

        if segment["type"] == "NO_TALKING":
            scene_data = next((desc for desc in descriptions_sorted if desc[0] == idx + 1), None)
            if scene_data:
                _, _, scene_description, segment_file, description_audio = scene_data
                description = scene_description
                response_data["scene_files"].append(segment_file)
                audio_file = description_audio

        response_data["descriptions"].append(description)
        response_data["audio_files"].append(audio_file)
        response_data["timestamps"].append([segment["start"], segment["end"]])

    return response_data


def process_timestamps(input_string, max_gap=3000):
    """
    Process a JSON string of timestamp segments, merging consecutive TALKING segments with small gaps.

    Args:
        input_string (str): A JSON string (with extra characters trimmed) representing timestamp segments.
        max_gap (int, optional): Maximum allowed gap in milliseconds to merge consecutive TALKING segments. Defaults to 3000.

    Returns:
        list: List of processed segment dictionaries, each with "start", "end", and "type" keys.

    Raises:
        ValueError: If the input string is invalid or JSON decoding fails.
    """
    input_string = str(input_string)
    input_string = input_string[7:-3]

    if not input_string:
        raise ValueError("Invalid input string")
    
    try:
        timestamps = json.loads(input_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON decode error: {str(e)}")

    combined_segments = []
    current_talking = None

    for segment in timestamps:
        start_time = time_to_milliseconds(segment["start"])
        end_time = time_to_milliseconds(segment["end"])

        if segment["type"] == "TALKING":
            if current_talking and start_time <= current_talking[1] + max_gap:
                current_talking = (current_talking[0], max(current_talking[1], end_time))
            else:
                if current_talking:
                    combined_segments.append({
                        "start": current_talking[0],
                        "end": current_talking[1],
                        "type": "TALKING"
                    })
                current_talking = (start_time, end_time)
        else:
            if current_talking:
                combined_segments.append({
                    "start": current_talking[0],
                    "end": current_talking[1],
                    "type": "TALKING"
                })
                current_talking = None
            combined_segments.append({
                "start": start_time,
                "end": end_time,
                "type": "NO_TALKING"
            })

    if current_talking:
        combined_segments.append({
            "start": current_talking[0],
            "end": current_talking[1],
            "type": "TALKING"
        })
    
    return combined_segments


def get_video_scenes_with_gemini(video_file_path):
    """
    Analyze a video file to obtain segmentation of talking and non-talking scenes using the Gemini API.

    Args:
        video_file_path (str): Path to the video file.

    Returns:
        str: JSON-formatted string representing the segmentation of the video.
    """
    video_file = genai.upload_file(path=video_file_path)
    while video_file.state.name == "PROCESSING":
        time.sleep(1)
        video_file = genai.get_file(video_file.name)

    prompt = '''
    Please analyze the video and provide a single, ordered JSON array of objects representing all segments, including both talking and non-talking parts. It is crucial to accurately, up to the millisecond, determine the presence of talking and non-talking moments:
    - For talking parts, ensure that speech is correctly detected, ignore anything that isn't human speech, only label strictly talking segments and return an object with 'type' as 'TALKING'.
    - For non-talking parts, ensure that no speech is happening, make sure the scenes are at least 3 seconds long, allowing for easy interpretation of the video content and return an object with 'type' as 'NO_TALKING'.

    Each object should contain:
    - 'start' for the start time in HH:MM:SS.SS format
    - 'end' for the end time in HH:MM:SS.SS format
    - 'type', which should be either 'TALKING' or 'NO_TALKING'

    Ensure that the timestamps are in the exact format HH:MM:SS.SS - HH:MM:SS.SS, with each timestamp having exactly two digits for hours, minutes, seconds, and two digits for milliseconds.
    The list should be ordered chronologically.
    '''
    
    prompt2 = '''
    Please analyze the video and provide a complete segmentation of the entire timeline into consecutive TALKING and NO_TALKING segments. Follow these rules:
    1. Detect ALL speech segments (TALKING) with exact millisecond precision.
    2. Fill ALL remaining time between TALKING segments with NO_TALKING segments.
    3. Ensure NO_TALKING segments are at least 3 seconds (3000 milliseconds) long. If shorter, combine them with adjacent NO_TALKING segments.
    4. Ensure the segmentation covers the entire video from 00:00:00.00 to end.
    5. Never leave any unclassified time gaps.
    6. Include very brief TALKING segments, even if they are short.

    Output format requirements:
    - Strict JSON array of objects covering every moment of the video.
    - Objects must alternate between TALKING and NO_TALKING.
    - Each object contains:
    - 'start': HH:MM:SS.ss format (millisecond precision).
    - 'end': HH:MM:SS.ss format (millisecond precision).
    - 'type': TALKING or NO_TALKING.
    - Time segments must be consecutive and continuous.
    - Millisecond precision required for all timestamps.
    '''

    model = genai.GenerativeModel(model_name="gemini-1.5-flash")
    response = model.generate_content([video_file, prompt],
                                      request_options={"timeout": 600})
    return response.text
