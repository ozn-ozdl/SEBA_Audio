import re
import subprocess
import uuid
from dotenv import load_dotenv
from datetime import datetime
import os
import time
import google.generativeai as genai
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
import json
from datetime import datetime
import subprocess
from common_functions import convert_text_to_speech, extract_audio_from_video, seconds_to_time, time_to_seconds

import subprocess
import os
import concurrent.futures

# def describe_existing_segments(segments_directory, scenes, audio_folder):
#     """
#     Describes the existing segments based on the list of scene IDs.

#     Args:
#         segments_directory (str): Directory containing the segment files.
#         scene_ids (list): List of scene IDs to process.
#         audio_folder (str): Folder where audio descriptions will be saved.

#     Returns:
#         list: List of tuples containing (scene_number, scene_id, description, segment_file, description_audio).
#     """
    
#     print(segments_directory)
#     segment_files = os.listdir(segments_directory)

#     scene_descriptions = []

#     def process_segment(segment_file):
#         segment_path = os.path.join(segments_directory, segment_file)
#         print(segment_path)
#         parts = segment_file.split('_')
#         scene_id = parts[1].split('.')[0]

#         if scene_id not in scene_ids:
#             return None

#         print(f"Processing {segment_file}, Scene ID {scene_id}")
#         description = generate_video_description_with_gemini(segment_path)
#         description_audio = convert_text_to_speech(description, audio_folder, f"audio_description_{scene_id}")
#         scene_number = scene_ids.index(scene_id) + 1  # Scene number is the position in the scene_ids list (1-based index)
#         return (scene_number, scene_id, description, segment_file, description_audio)

#     with concurrent.futures.ThreadPoolExecutor() as executor:
#         future_to_segment = {executor.submit(process_segment, segment_file): segment_file for segment_file in segment_files}
#         for future in concurrent.futures.as_completed(future_to_segment):
#             result = future.result()
#             if result:
#                 scene_descriptions.append(result)

#     return scene_descriptions


def describe_existing_segments(segments_directory, scene_data, audio_folder):
    """
    Describes the existing segments based on the scene numbers and IDs.
    Args:
        segments_directory (str): Directory containing the segment files.
        scene_data (tuple): Tuple containing (scene_numbers, scene_ids).
        audio_folder (str): Folder where audio descriptions will be saved.
    Returns:
        list: List of tuples containing (scene_number, scene_id, description, segment_file, description_audio).
    """
    scene_numbers, scene_ids = scene_data
    print(segments_directory)
    segment_files = os.listdir(segments_directory)
    scene_descriptions = []

    def process_segment(segment_file):
        segment_path = os.path.join(segments_directory, segment_file)
        print(segment_path)
        parts = segment_file.split('_')
        scene_id = parts[1].split('.')[0]
        
        # Check if scene_id is in the scene_ids list
        if scene_id not in scene_ids:
            return None
            
        print(f"Processing {segment_file}, Scene ID {scene_id}")
        description = generate_video_description_with_gemini(segment_path)
        description_audio = convert_text_to_speech(description, audio_folder, f"audio_description_{scene_id}")
        
        # Get the scene number from the scene_numbers list using the same index as scene_ids
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

    # Sort the descriptions by scene number
    scene_descriptions.sort(key=lambda x: x[0])
    return scene_descriptions

def cut_video_by_no_talking(input_video_path, segments, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    scene_ids = []
    scene_numbers = []  # To store the consecutive IDs of scenes

    for i, segment in enumerate(segments):
        if segment["type"] == "NO_TALKING":
            start = segment["start"]
            end = segment["end"]

            # Generate a unique ID for the scene
            unique_id = str(uuid.uuid4())
            scene_ids.append(unique_id)
            scene_numbers.append(i + 1)  # Store the consecutive ID for each scene

            # Generate output file name using the unique ID
            output_file = os.path.join(output_folder, f"scene_{unique_id}.mp4")

            print(f"Cutting segment {i + 1} from {input_video_path} to {output_file}")
            
            # FFmpeg command to trim the video with re-encoding
            ffmpeg_command = (
                f"ffmpeg -i {input_video_path} -ss {start} -to {end} "
                f"-c:v libx264 -c:a aac -strict experimental {output_file} -y"
            )
            print(f"Executing: {ffmpeg_command}")
            subprocess.run(ffmpeg_command, shell=True)

    print("Video segments cut successfully!")
    
    # Return the tuple (scene_numbers, scene_ids)
    return (scene_numbers, scene_ids)

def generate_video_description_with_gemini(video_file_path):
    # Upload the video and print a confirmation.

    video_file = genai.upload_file(path=video_file_path)
    print("Video file ", video_file)
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
    
    print("LLM response: ", response)
    return response.text

# def format_response_data(combined_segments, descriptions):
#     # Sort descriptions by the scene number to ensure the correct order
#     descriptions_sorted = sorted(descriptions, key=lambda x: x[0])

#     # Create the response structure
#     response_data = {
#         "message": "Scene changes detected successfully",
#         "descriptions": [],
#         "timestamps": [],
#         "scene_files": [],
#         "audio_files": [],  # Add audio_files field
#         "waveform_image": "./waveforms/waveform.png"
#     }

#     # Loop through the combined segments to generate the descriptions and timestamps
#     for idx, segment in enumerate(combined_segments):
#         # Initialize description as "TALKING" by default
#         description = "TALKING" if segment["type"] == "TALKING" else ""
#         audio_file = None  # Initialize audio file as None

#         # Add the description based on segment type
#         if segment["type"] == "NO_TALKING":
#             # Find the description and scene file based on the scene number
#             scene_data = next((desc for desc in descriptions_sorted if desc[0] == idx + 1), None)
#             if scene_data:
#                 scene_number, scene_id, scene_description, segment_file, description_audio = scene_data
#                 description = scene_description

#                 # Add the scene file for NO TALKING segments
#                 response_data["scene_files"].append(segment_file)

#                 # Add the audio file for the corresponding description
#                 response_data["audio_files"].append(description_audio)  # Add the audio file path to the response

#         # Append the description to the list
#         response_data["descriptions"].append(description)
        
#         # Add the start and end times to the timestamps list
#         response_data["timestamps"].append([segment["start"], segment["end"]])

#     return response_data


def format_response_data(combined_segments, descriptions):
    # Sort descriptions by the scene number to ensure the correct order
    descriptions_sorted = sorted(descriptions, key=lambda x: x[0])

    # Create the response structure
    response_data = {
        "message": "Scene changes detected successfully",
        "descriptions": [],
        "timestamps": [],
        "scene_files": [],
        "audio_files": [],  # Add audio_files field
        "waveform_image": "./waveforms/waveform.png"
    }

    # Loop through the combined segments to generate the descriptions and timestamps
    for idx, segment in enumerate(combined_segments):
        # Initialize description and audio file
        description = "TALKING" if segment["type"] == "TALKING" else ""
        audio_file = "" if segment["type"] == "TALKING" else None  # Append empty string for "TALKING"

        if segment["type"] == "NO_TALKING":
            # Find the description and scene file based on the scene number
            scene_data = next((desc for desc in descriptions_sorted if desc[0] == idx + 1), None)
            if scene_data:
                scene_number, scene_id, scene_description, segment_file, description_audio = scene_data
                description = scene_description

                # Add the scene file for NO TALKING segments
                response_data["scene_files"].append(segment_file)

                # Add the audio file for the corresponding description
                audio_file = description_audio  # Use the audio file path

        # Append the description to the list
        response_data["descriptions"].append(description)

        # Append the audio file (empty for TALKING, path for NO TALKING)
        response_data["audio_files"].append(audio_file)

        # Add the start and end times to the timestamps list
        response_data["timestamps"].append([segment["start"], segment["end"]])

    return response_data



# The function that combines the talking segments and processes the input
def process_timestamps(input_string, max_gap=3):
    input_string = str(input_string)
    input_string = input_string[7:-3]  # Stripping unwanted characters
    

    # Ensure that the string is not empty and contains valid JSON
    if not input_string:
        raise ValueError("Input string is empty or invalid after removing 'json' prefix.")
    
    try:
        timestamps = json.loads(input_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to decode JSON: {str(e)}")

    combined_segments = []
    current_talking = None

    for segment in timestamps:
        start_time = time_to_seconds(segment["start"])
        end_time = time_to_seconds(segment["end"])

        if segment["type"] == "TALKING":
            # If there's already a talking segment, check if the gap is small enough to combine
            if current_talking and start_time <= current_talking[1] + max_gap:
                current_talking = (current_talking[0], max(current_talking[1], end_time))
            else:
                if current_talking:
                    combined_segments.append({
                        "start": seconds_to_time(current_talking[0]),
                        "end": seconds_to_time(current_talking[1]),
                        "type": "TALKING"
                    })
                current_talking = (start_time, end_time)
        else:
            if current_talking:
                combined_segments.append({
                    "start": seconds_to_time(current_talking[0]),
                    "end": seconds_to_time(current_talking[1]),
                    "type": "TALKING"
                })
                current_talking = None
            combined_segments.append({
                "start": seconds_to_time(start_time),
                "end": seconds_to_time(end_time),
                "type": "NO_TALKING"
            })

    if current_talking:
        combined_segments.append({
            "start": seconds_to_time(current_talking[0]),
            "end": seconds_to_time(current_talking[1]),
            "type": "TALKING"
        })
    
    return combined_segments

def get_video_scenes_with_gemini(video_file_path):
    video_file = genai.upload_file(path=video_file_path)
    while video_file.state.name == "PROCESSING":
        print('.', end='')
        time.sleep(1)
        video_file = genai.get_file(video_file.name)

    if video_file.state.name == "FAILED":
        raise ValueError(video_file.state.name)

    print(f"Completed upload: {video_file.uri}")

    # prompt = '''
    # Please analyze the video and provide a single, ordered JSON array of objects representing all segments, including both talking and non-talking parts.
    # For talking parts, combine consecutive segments of talking if there is less than 4 seconds of non-talking between them.
    # For non-talking parts, detect scenes that are at least 3 seconds long and include their timestamps as well.
    # Each object should contain the following fields: 'start' for the start time in HH:MM:SS format, 'end' for the end time in HH:MM:SS.SS format, and 'type', which should be either 'TALKING' if speech is detected or 'NO_TALKING' if no speech is detected.
    # The timestamps should be in the exact format HH:MM:SS.SS - HH:MM:SS.SS, with each timestamp having exactly two digits for hours, minutes, and seconds and two digits for milliseconds
    # Ensure that the scenes are cohesive and can be described in a natural, clear, and concise manner.
    # The list should be ordered chronologically, including all segments of the video, with scenes for both talking and non-talking parts.
    # '''
    
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

    model = genai.GenerativeModel(model_name="gemini-1.5-flash")

    response = model.generate_content([video_file, prompt],
                                      request_options={"timeout": 600})

    return response.text
