import os
import subprocess

def frame_to_time(frame, fps):
    """
    Converts a frame number to a timestamp in HH:MM:SS format.
    
    Args:
        frame (int): The frame number.
        fps (float): Frames per second of the video.
    
    Returns:
        str: The timestamp in HH:MM:SS format.
    """
    seconds = frame / fps
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02}:{minutes:02}:{seconds:02}"


def extract_scenes(video_path, timestamps, output_folder):
    """
    Extracts scenes from a video based on given timestamps and saves them as separate video files.
    
    Args:
        video_path (str): Path to the input video file.
        timestamps (list of tuple): List of (start_time, end_time) tuples representing scene durations.
        output_folder (str): Path to the directory where extracted scenes will be saved.
    
    Returns:
        list: A list of filenames of the extracted scene video files.
    
    Raises:
        subprocess.CalledProcessError: If FFmpeg execution fails.
    """
    file_paths = []
    for i, (start, end) in enumerate(timestamps):
        output_file = os.path.join(output_folder, f"scene_{i + 1}.mp4")
        ffmpeg_command = [
            "ffmpeg",
            "-i", video_path,
            "-ss", start,
            "-to", end,
            "-c", "copy",
            "-c:v", "libx264",
            "-c:a", "aac",
            output_file

        ]

        subprocess.run(ffmpeg_command, check=True)
        file_paths.append(output_file)

    scene_files = [os.path.basename(file_path) for file_path in file_paths]

    return scene_files


def get_timestamps_and_descriptions(scenes, fps, frames_per_second, descriptions):
    """
    Computes timestamps and retrieves descriptions for scenes.
    
    Args:
        scenes (list of list): List of lists, where each sublist contains filenames of frames in a scene.
        fps (float): Frames per second of the video.
        frames_per_second (float): Threshold for detecting scene transitions.
        descriptions (list of str): Descriptions corresponding to different scenes.
    
    Returns:
        tuple: A tuple containing a list of (start_time, end_time) timestamps and a list of scene descriptions.
    """
    timestamps = []
    descriptions_final = []

    description_index = 0
    for scene in scenes:
        start_frame = int(scene[0].split('_')[1].split('.')[0])
        end_frame = int(scene[-1].split('_')[1].split('.')[0])

        if end_frame - start_frame <= fps / frames_per_second:
            description_index += 1
            continue

        start_time = frame_to_time(start_frame, fps)
        end_time = frame_to_time(end_frame, fps)
        timestamps.append((start_time, end_time))
        descriptions_final.append(descriptions[description_index])
        description_index += 1
    return timestamps, descriptions_final
