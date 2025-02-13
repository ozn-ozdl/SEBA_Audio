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

modelName = "gemini-1.5-flash"


def time_to_milliseconds(time_str):
  """
  Convert a time string in HH:MM:SS.sss format to milliseconds.

  Args:
      time_str (str): Time string in HH:MM:SS.sss format.

  Returns:
      int: Total time in milliseconds.
  """
  parts = re.split(r"[:.]", time_str)
  while len(parts) < 4:
    parts.append("0")
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


def get_video_duration(video_path):
  """
  Get the duration of a video in seconds using ffprobe.

  Args:
      video_path (str): Path to the video file.

  Returns:
      float: Duration of the video in seconds.

  Raises:
      RuntimeError: If ffprobe returns a non-zero exit code.
  """
  cmd = [
      "ffprobe",
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      video_path,
  ]
  result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  if result.returncode != 0:
    raise RuntimeError(f"FFprobe error: {result.stderr.decode()}")
  return float(result.stdout)


def describe_existing_segments(segments_directory, scene_data, audio_folder,
                               video_summary):
  """
  Generate descriptions for video segments using Gemini API and convert them to audio files.

  Args:
      segments_directory (str): Directory containing video segment files.
      scene_data (tuple): Tuple containing two lists: scene_numbers and scene_ids.
      audio_folder (str): Directory where the generated audio files will be saved.
      video_summary (str): Summary of the overall video context to guide the descriptions.

  Returns:
      list: Sorted list of tuples in the format 
            (scene_number, scene_id, description, segment_file, description_audio).
  """
  scene_numbers, scene_ids = scene_data
  segment_files = os.listdir(segments_directory)
  scene_descriptions = []

  def process_segment(segment_file):
    segment_path = os.path.join(segments_directory, segment_file)
    parts = segment_file.split("_")
    scene_id = parts[1].split(".")[0]

    if scene_id not in scene_ids:
      return None

    description = generate_video_description_with_gemini(segment_path,
                                                          video_summary)
    description_audio = convert_text_to_speech(
        description, audio_folder, f"audio_description_{scene_id}")
    scene_idx = scene_ids.index(scene_id)
    scene_number = scene_numbers[scene_idx]

    return (scene_number, scene_id, description, segment_file,
            description_audio)

  with concurrent.futures.ThreadPoolExecutor() as executor:
    future_to_segment = {
        executor.submit(process_segment, segment_file): segment_file
        for segment_file in segment_files
    }
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
          f"-c:v libx264 -c:a aac -strict experimental {output_file} -y")
      subprocess.run(ffmpeg_command, shell=True)

  return (scene_numbers, scene_ids)


def generate_video_description_with_gemini(video_file_path, video_summary,
                                           max_retries=5, initial_delay=1):
  """
  Generate a concise video description using the Gemini API based on a video context summary.

  Args:
      video_file_path (str): Path to the video file.
      video_summary (str): Summary of the overall video context.
      max_retries (int, optional): Maximum number of retries for the API call. Defaults to 5.
      initial_delay (float, optional): Initial delay in seconds between retries. Defaults to 1.

  Returns:
      str: Generated video description.

  Raises:
      Exception: Propagates exception if the API call fails after maximum retries.
  """
  for attempt in range(max_retries):
    try:
      # Get scene duration and calculate a word limit based on a 170 WPM rate.
      duration_seconds = get_video_duration(video_file_path)
      word_limit = int((duration_seconds * 170) / 60)  # 170 WPM conversion

      video_file = genai.upload_file(path=video_file_path)
      while video_file.state.name == "PROCESSING":
        time.sleep(1)
        video_file = genai.get_file(video_file.name)

        prompt = f"""
            You are an assistant that creates natural, clear, and concise audio descriptions for a given video scene for visually impaired individuals.
            Given the following **Video Context Summary**: {video_summary}, describe the visual content of the whole given video scene in exactly one single sentence with no more than {word_limit} words.
            Focus on key actions, objects, and emotions, building upon the context provided in the video summary.
            Ensure the sentence sounds natural when spoken aloud and provides essential information.
            Only return the sentence without any additional information or text.
            """
      
        prompt2 = f"""
            You are an assistant that creates natural, clear, and concise audio descriptions for a given video scene for visually impaired individuals.
            Describe the visual content of the whole given video scene in exactly one single sentence with aroun {word_limit} words. 
            Focus on key actions, objects, and emotions, building upon the context provided in the video summary.
            Ensure the sentence sounds natural when spoken aloud and provides essential information.
            Only return the sentence without any additional information or text.
            """
      
      print("Word limit:", word_limit)
      model = genai.GenerativeModel(model_name=modelName)
      response = model.generate_content([video_file, prompt2],
                                        request_options={"timeout": 600})
      return response.text.strip('"')
    except Exception as e:
      if attempt == max_retries - 1:
        raise
      delay = initial_delay * (2**attempt) + random.uniform(0, 1)
      time.sleep(delay)


def get_video_summary_with_gemini(video_file_path):
  """
  Generate a concise summary of the entire video content using the Gemini API.

  Args:
      video_file_path (str): Path to the video file.

  Returns:
      str: Summary text of the video.
  """
  video_file = genai.upload_file(path=video_file_path)
  while video_file.state.name == "PROCESSING":
    time.sleep(1)
    video_file = genai.get_file(video_file.name)

  prompt = """
    Provide a concise summary of the entire video content in approximately 50 words. Focus on:
    - The central theme or narrative
    - Key visual elements and their significance
    - The overall emotional tone or atmosphere
    - Any important context that would help someone understand individual scenes
    """

  model = genai.GenerativeModel(model_name=modelName)
  response = model.generate_content([video_file, prompt],
                                    request_options={"timeout": 600})
  return response.text


def format_response_data(combined_segments, descriptions):
  """
  Format segmentation and description data into a structured response dictionary.

  Args:
      combined_segments (list): List of segment dictionaries with keys "start", "end", and "type".
      descriptions (list): List of tuples in the format 
                            (scene_number, scene_id, description, segment_file, description_audio).

  Returns:
      dict: Dictionary containing keys "message", "descriptions", "timestamps", "scene_files", and "audio_files".
  """
  descriptions_sorted = sorted(descriptions, key=lambda x: x[0])
  response_data = {
      "message": "Scene changes detected successfully",
      "descriptions": [],
      "timestamps": [],
      "scene_files": [],
      "audio_files": [],
  }

  for idx, segment in enumerate(combined_segments):
    description = "TALKING" if segment["type"] == "TALKING" else ""
    audio_file = "" if segment["type"] == "TALKING" else None

    if segment["type"] == "NO_TALKING":
      scene_data = next(
          (desc for desc in descriptions_sorted if desc[0] == idx + 1), None)
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
  Process a JSON string of timestamp segments and merge consecutive TALKING segments if separated by a small gap.

  Args:
      input_string (str): A JSON string representing timestamp segments, with extra characters trimmed.
      max_gap (int, optional): Maximum allowed gap in milliseconds to merge consecutive TALKING segments. Defaults to 3000.

  Returns:
      list: List of processed segment dictionaries with keys "start", "end", and "type".

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
      if (
          current_talking
          and start_time <= current_talking[1] + max_gap
      ):
        current_talking = (current_talking[0],
                           max(current_talking[1], end_time))
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
  Analyze the video to produce a segmentation of talking and non-talking scenes using the Gemini API.

  Args:
      video_file_path (str): Path to the video file.

  Returns:
      str: JSON-formatted string representing the segmentation of the video.
  """
  video_file = genai.upload_file(path=video_file_path)
  while video_file.state.name == "PROCESSING":
    time.sleep(1)
    video_file = genai.get_file(video_file.name)

  prompt = """
    Please analyze the video and provide a single, ordered JSON array of objects representing all segments, including both talking and non-talking parts. It is crucial to accurately, up to the millisecond, determine the presence of talking and non-talking moments:
    - For talking parts, ensure that speech is correctly detected, ignore anything that isn't human speech, only label strictly talking segments and return an object with 'type' as 'TALKING'.
    - For non-talking parts, ensure that no speech is happening, make sure the scenes are at least 3 seconds long, allowing for easy interpretation of the video content and return an object with 'type' as 'NO_TALKING'.

    Each object should contain:
    - 'start' for the start time in HH:MM:SS.SS format
    - 'end' for the end time in HH:MM:SS.SS format
    - 'type', which should be either 'TALKING' or 'NO_TALKING'

    Ensure that the timestamps are in the exact format HH:MM:SS.SS - HH:MM:SS.SS, with each timestamp having exactly two digits for hours, minutes, seconds, and two digits for milliseconds.
    The list should be ordered chronologically.
    """

  prompt2 = """
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
    """

  model = genai.GenerativeModel(model_name=modelName)
  response = model.generate_content([video_file, prompt],
                                    request_options={"timeout": 600})
  return response.text
