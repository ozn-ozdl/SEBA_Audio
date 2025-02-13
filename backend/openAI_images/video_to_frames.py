import sys
import os
import cv2

def extract_frames_from_video(video_path, output_dir, frames_per_second):
    """
    Extract frames from a video and save them as JPEG images.

    This function reads an input video, extracts frames at a rate specified by
    frames_per_second, and saves the frames to the designated output directory.
    It calculates the interval between frames based on the video's FPS.

    Args:
        video_path (str): Path to the input video file.
        output_dir (str): Directory where the extracted frames will be saved.
        frames_per_second (int): Number of frames to extract per second of video.

    Returns:
        None
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    interval = int(fps / frames_per_second)
    frame_id = 0
    success = True

    while success:
        success, frame = cap.read()
        if success and frame_id % interval == 0:
            cv2.imwrite(f"{output_dir}/frame_{frame_id}.jpg", frame)
        frame_id += 1
    cap.release()