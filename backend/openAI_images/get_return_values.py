import os
import subprocess


def frame_to_time(frame, fps):
    seconds = frame / fps
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02}:{minutes:02}:{seconds:02}"


def extract_scenes(video_path, timestamps, output_folder):
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
