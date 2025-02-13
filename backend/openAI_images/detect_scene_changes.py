import os
import sys
import cv2
from skimage.metrics import structural_similarity

def numeric_sort_key(filename):
    """
    Extracts the frame number from a filename and returns it as an integer.
    
    Args:
        filename (str): The filename containing a frame number in the format 'frame_<number>.jpg'.
    
    Returns:
        int: The extracted frame number.
    """
    basename = os.path.basename(filename)
    frame_number = int(basename.split("_")[1].split(".")[0])
    return frame_number

def compare_histograms(frame_a, frame_b):
    """
    Computes the histogram similarity between two images using the correlation method.
    
    Args:
        frame_a (numpy.ndarray): The first image (in BGR format).
        frame_b (numpy.ndarray): The second image (in BGR format).
    
    Returns:
        float: A similarity score between 0 and 1, where 1 indicates identical histograms.
    """
    hist_a = cv2.calcHist([frame_a], [0, 1, 2], None, [
                          8, 8, 8], [0, 256, 0, 256, 0, 256])
    hist_b = cv2.calcHist([frame_b], [0, 1, 2], None, [
                          8, 8, 8], [0, 256, 0, 256, 0, 256])

    hist_a = cv2.normalize(hist_a, hist_a).flatten()
    hist_b = cv2.normalize(hist_b, hist_b).flatten()

    similarity = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL)

    return similarity

def detect_scene_changes(frames_dir, ssim_threshold, hist_threshold):
    """
    Detects scene changes in a sequence of frames based on SSIM and histogram similarity.
    
    Args:
        frames_dir (str): Directory containing sequentially named frame images.
        ssim_threshold (float): Structural Similarity Index (SSIM) threshold for scene change detection.
        hist_threshold (float): Histogram similarity threshold for scene change detection.
    
    Returns:
        list: A list of filenames where scene changes are detected.
    
    Raises:
        ValueError: If no frames are found in the specified directory.
    """
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
