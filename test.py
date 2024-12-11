from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector

def detect_scenes(video_path):
    video_manager = VideoManager([video_path])
    scene_manager = SceneManager()

    # Add the ContentDetector algorithm (detects cuts based on content changes).
    scene_manager.add_detector(ContentDetector(threshold=30.0))

    # Start video manager to load the video.
    video_manager.start()
    scene_manager.detect_scenes(video_manager)

    # Obtain list of detected scenes.
    scene_list = scene_manager.get_scene_list()
    # print(f"Gefundene Szenen: {len(scene_list)}")
    # for i, scene in enumerate(scene_list):
    #     scene[0].get_timecode()
    #     print(f"Szene {i + 1}: Startzeit - {scene[0].get_timecode()}, Endzeit - {scene[1].get_timecode()}")

    return scene_list

if __name__ == "__main__":
    video_path = r"D:\PythonProgram\ForMoney\SEBA_Audio-main-gemini_openai\SEBA_Audio-main\backend\uploads\uploaded_video.mp4"
    scenes = detect_scenes(video_path)
