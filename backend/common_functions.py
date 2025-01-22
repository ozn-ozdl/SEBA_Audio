
from datetime import datetime
import subprocess
from gtts import gTTS
import os

def convert_text_to_speech(text, output_folder, output_file_name):
    """
    Converts the given text into speech and saves it as an MP3 file.

    Args:
        text (str): The text to convert to speech.

    Returns:
        str: The path to the saved MP3 file or an error message.
    """
    try:
        tts = gTTS(text=text, lang="en")
        audio_file_path = os.path.join(output_folder, f"{output_file_name}.mp3")
        tts.save(audio_file_path)
        return audio_file_path  # Return the file path of the generated audio
    except Exception as e:
        return str(e)  # Return the error message if something goes wrong


# Helper function to convert time string to seconds, now handling milliseconds
def time_to_seconds(time_str):
    time_obj = datetime.strptime(time_str, '%H:%M:%S.%f')
    return time_obj.hour * 3600 + time_obj.minute * 60 + time_obj.second + time_obj.microsecond / 1e6

# Function to extract audio from video
def extract_audio_from_video(video_path, audio_path='audio.wav'):
    command = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 44100 -ac 2 {audio_path}"
    subprocess.run(command, shell=True)

# Helper function to convert seconds back to HH:MM:SS.SS format
def seconds_to_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    milliseconds = int((seconds % 1) * 100)
    return f'{hours:02}:{minutes:02}:{int(seconds):02}.{milliseconds:02}'