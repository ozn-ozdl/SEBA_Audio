import sys
import os
import cv2


# maybe frames_per_second is a parameter, that the user can set (hyperprameter depending on the complexity of the video)
def extract_frames_from_video(video_path, output_dir, frames_per_second):
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
