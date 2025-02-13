import subprocess
import sys
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector
from dotenv import load_dotenv
import re
import os
import time
import PIL.Image
import google.generativeai as genai
from openai import OpenAI
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)


def generate_video_description_with_gemini(video_file_path):
    """
    Generate a concise audio description for a video scene using the Gemini API.

    Args:
        video_file_path (str): The path to the video file.

    Returns:
        str: A one-sentence description of the visual content in the video scene.

    Raises:
        ValueError: If the video upload fails.
    """
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
    You are an assistant that creates natural, clear, and concise audio descriptions for a given video scene for visually impaired individuals.
    Describe the visual content of the whole given video scene in exactly one single sentence with no more than 12 words.
    Focus on key actions, objects, and emotions.
    Ensure the sentence sounds natural when spoken aloud and provides essential information.
    Only return the sentence without any additional information or text.
    '''

    # Choose a Gemini model.
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")

    # Make the LLM request.
    response = model.generate_content([video_file, prompt],
                                      request_options={"timeout": 600})
    return response.text


def describe_scenes_with_gemini_video(video_file, timestamps, output_dir):
    """
    Extract scenes from a video based on provided timestamps and generate audio descriptions for each scene.

    Args:
        video_file (str): Path to the input video file.
        timestamps (list): List of tuples (start, end) representing scene timestamps.
        output_dir (str): Directory where the extracted scene video files will be saved.

    Returns:
        tuple: A tuple containing:
            - list: Scene descriptions for each extracted scene.
            - list: List of timestamp tuples (start, end) for each scene.
            - list: List of scene video file names.
    """
    output_files = []
    tuple_timestamps = []
    for idx, (start, end) in enumerate(timestamps):
        output_video_file = os.path.join(output_dir, f"scene_{idx + 1}.mp4")
        command = (
            f"ffmpeg -i {video_file}"
            f" -ss {start} -to {end}"
            f" -c:v libx264 -c:a aac -strict experimental {output_video_file}"
        )
        os.system(command)
        output_files.append(output_video_file)
        tuple_timestamps.append(
            (start, end))

    scene_descriptions = []
    for file in output_files:
        description = generate_video_description_with_gemini(file)
        scene_descriptions.append(description)

    scene_files = [os.path.basename(file_path) for file_path in output_files]
    return scene_descriptions, tuple_timestamps, scene_files


def detect_scenes(video_path):
    """
    Detect scene changes in a video using the SceneDetect library.

    Args:
        video_path (str): Path to the input video file.

    Returns:
        list: A list of tuples, each containing the start and end timecodes (as strings) for a detected scene.
    """
    video_manager = VideoManager([video_path])
    scene_manager = SceneManager()

    # Add the ContentDetector algorithm (detects cuts based on content changes).
    scene_manager.add_detector(ContentDetector(threshold=10.0))

    # Start video manager to load the video.
    video_manager.start()
    scene_manager.detect_scenes(video_manager)

    # Obtain list of detected scenes.
    scene_list = scene_manager.get_scene_list()

    return [(scene[0].get_timecode(0), scene[1].get_timecode(0)) for scene in scene_list]


def scene_list_to_string_list(scene_list):
    """
    Convert a list of scene timecode tuples into a list of formatted string representations.

    Args:
        scene_list (list): List of tuples, where each tuple contains (start, end) timecodes.

    Returns:
        list: List of strings in the format "start - end" for each scene.
    """
    return [f"{start} - {end}" for (start, end) in scene_list]


def get_talking_timestamps_with_gemini(video_file_path):
    """
    Retrieve timestamps for when persons are talking in a video using the Gemini API.

    Args:
        video_file_path (str): Path to the video file.

    Returns:
        str: A plain text list of talking timestamps in the format "HH:MM:SS - HH:MM:SS", 
             or "NO_TALKING" if no talking is detected.

    Raises:
        ValueError: If the video upload fails.
    """
    video_file = genai.upload_file(path=video_file_path)
    while video_file.state.name == "PROCESSING":
        print('.', end='')
        time.sleep(1)
        video_file = genai.get_file(video_file.name)

    if video_file.state.name == "FAILED":
        raise ValueError(video_file.state.name)

    print(f"Completed upload: {video_file.uri}")

    prompt = '''
    Please give me the timestamps when persons are talking in this video strictly in the format HH:MM:SS - HH:MM:SS where HH means hours, MM means minutes, and SS means seconds.
    Each timestamp must include exactly two digits for hours, minutes, and seconds.
    Do NOT include any text or additional information.
    The output must be a plain list of timestamps, one per line, in the exact format HH:MM:SS - HH:MM:SS.
    Only if there is no talking in the video, return only the text without additional informations: NO_TALKING
    '''

    model = genai.GenerativeModel(model_name="gemini-1.5-flash")

    response = model.generate_content([video_file, prompt],
                                      request_options={"timeout": 600})

    return response.text


def format_talking_timestamps(talking_timestamps):
    """
    Format a list of talking timestamps by ensuring each timestamp is prefixed with "00:".

    Args:
        talking_timestamps (list): List of timestamp strings in the format "HH:MM:SS - HH:MM:SS".

    Returns:
        list: List of formatted timestamp strings in the format "00:HH:MM:SS - 00:HH:MM:SS".
    """
    return [f"00:{start} - 00:{end}" for ts in talking_timestamps for (start, end) in [ts.split(" - ")]]


def combine_speaking_and_scenes(scenes, talkings):
    """
    Combine scene and talking timestamps by merging them and filtering out short scenes.

    Args:
        scenes (list): List of scene time intervals as strings in the format "HH:MM:SS - HH:MM:SS".
        talkings (list): List of talking timestamp strings in the same format.

    Returns:
        list: List of merged and filtered time intervals formatted as tuples of strings ("HH:MM:SS", "HH:MM:SS").
    """
    scenes_int = time_interval_to_seconds(scenes)
    talkings_int = time_interval_to_seconds(talkings)

    valid_scenes_int = get_valid_scenes(
        talkings_int, scenes_int[len(scenes_int)-1][1])

    merged = merge_scenes_and_talkings(scenes_int, valid_scenes_int)
    filtered = filter_short_scenes(merged)

    return seconds_to_time_interval(filtered)


def time_interval_to_seconds(intervals):
    """
    Convert a list of time intervals from string format to seconds.

    Args:
        intervals (list): List of time interval strings in the format "HH:MM:SS - HH:MM:SS".

    Returns:
        list: List of tuples where each tuple contains the start and end times in seconds.
    """
    intervals_int = []

    def time_to_seconds(time_str):
        h, m, s = map(int, time_str.split(':'))
        return h * 3600 + m * 60 + s

    for interval in intervals:
        start_time, end_time = interval.split('-')

        start_seconds = time_to_seconds(start_time)
        end_seconds = time_to_seconds(end_time)
        intervals_int.append((start_seconds, end_seconds))

    return intervals_int


def get_valid_scenes(talkings, end_time):
    """
    Determine valid non-talking scene intervals based on talking timestamps.

    Args:
        talkings (list): List of tuples (start, end) in seconds representing talking intervals.
        end_time (int): The end time of the video in seconds.

    Returns:
        list: List of tuples representing valid non-talking scene intervals.
    """
    result = []
    last_end = 0

    for start, end in talkings:
        if last_end < start:
            result.append((last_end, start))
        last_end = end

    if last_end < end_time:
        result.append((last_end, end_time))

    return result


def merge_scenes_and_talkings(scenes, valid_scenes):
    """
    Merge scene intervals with valid non-talking intervals based on talking timestamps.

    Args:
        scenes (list): List of tuples (start, end) in seconds representing scene intervals.
        valid_scenes (list): List of tuples (start, end) in seconds representing valid non-talking intervals.

    Returns:
        list: List of merged scene intervals as tuples (start, end) in seconds.
    """
    merged_result = []
    valid_index = 0

    for scene_start, scene_end in scenes:
        while valid_index < len(valid_scenes) and valid_scenes[valid_index][1] <= scene_start:
            valid_index += 1

        if valid_index >= len(valid_scenes):
            break

        valid_start, valid_end = valid_scenes[valid_index]

        # Case 1: Scene is completely within a valid period
        if scene_start >= valid_start and scene_end <= valid_end:
            merged_result.append((scene_start, scene_end))

        # Case 2: Scene ends in an invalid period
        elif scene_start >= valid_start and scene_end > valid_end:
            merged_result.append((scene_start, valid_end))

        # Case 3: Scene starts in an invalid period but ends in a valid period
        elif scene_start < valid_start and scene_end > valid_start:
            merged_result.append((valid_start, scene_end))

    return merged_result


def filter_short_scenes(scenes, min_duration=3):
    return [(start, end) for start, end in scenes if (end - start) >= min_duration]


def seconds_to_time_interval(intervals):

    def seconds_to_time_str(seconds):
        h = seconds // 3600
        m = (seconds % 3600) // 60
        s = seconds % 60
        return f"{h:02}:{m:02}:{s:02}"

    return [(seconds_to_time_str(start), seconds_to_time_str(end)) for (start, end) in intervals]
