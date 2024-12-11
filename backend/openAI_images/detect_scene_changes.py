import os
import sys
import cv2
from skimage.metrics import structural_similarity


def numeric_sort_key(filename):
    basename = os.path.basename(filename)
    frame_number = int(basename.split("_")[1].split(".")[0])
    return frame_number

def compare_histograms(frame_a, frame_b):
    hist_a = cv2.calcHist([frame_a], [0, 1, 2], None, [
                          8, 8, 8], [0, 256, 0, 256, 0, 256])
    hist_b = cv2.calcHist([frame_b], [0, 1, 2], None, [
                          8, 8, 8], [0, 256, 0, 256, 0, 256])

    hist_a = cv2.normalize(hist_a, hist_a).flatten()
    hist_b = cv2.normalize(hist_b, hist_b).flatten()

    similarity = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL)

    return similarity

# treshold values also to be set by user
def detect_scene_changes(frames_dir, ssim_threshold, hist_threshold):
    frames = sorted(
        [f for f in os.listdir(frames_dir) if f.endswith(".jpg")],
        key=numeric_sort_key
    )

    if not frames:
        raise ValueError("No frames found in the specified directory.")

    scene_changes = [frames[0]]

    for i in range(1, len(frames)):
        frame_a_gray = cv2.imread(os.path.join(
            frames_dir, frames[i - 1]), cv2.IMREAD_GRAYSCALE)
        frame_b_gray = cv2.imread(os.path.join(
            frames_dir, frames[i]), cv2.IMREAD_GRAYSCALE)

        frame_a_color = cv2.imread(os.path.join(frames_dir, frames[i - 1]))
        frame_b_color = cv2.imread(os.path.join(frames_dir, frames[i]))

        ssim, _ = structural_similarity(frame_a_gray, frame_b_gray, full=True)
        hist_diff = compare_histograms(frame_a_color, frame_b_color)

        if ssim < ssim_threshold or hist_diff < hist_threshold:
            scene_changes.append(frames[i])

    return scene_changes
