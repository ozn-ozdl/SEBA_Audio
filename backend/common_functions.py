from datetime import datetime
import subprocess
from gtts import gTTS
import os

def convert_text_to_speech(text, output_folder, output_file_name):
    """
    Convert the given text to speech and save it as an MP3 file.

    This function uses the gTTS library to convert text into speech. The generated speech is sped up 
    by setting the rate (note that gTTS rate modification may not be officially supported), and the 
    resulting audio is saved as an MP3 file in the specified output folder with the given file name.

    Args:
        text (str): The text to convert to speech.
        output_folder (str): The directory where the MP3 file will be saved.
        output_file_name (str): The base name for the output MP3 file (without extension).

    Returns:
        str: The path to the saved MP3 file if successful, or an error message if an exception occurs.
    """
    try:
        tts = gTTS(text=text, lang="en")
        # Speed up the speech by setting the rate (this parameter is not officially supported in gTTS)
        tts.rate = 100
        audio_file_path = os.path.join(output_folder, f"{output_file_name}.mp3")
        tts.save(audio_file_path)
        return audio_file_path  # Return the file path of the generated audio
    except Exception as e:
        return str(e)  # Return the error message if something goes wrong

def time_to_seconds(time_str):
    """
    Convert a time string in the format 'HH:MM:SS.%f' to total seconds.

    This function parses a time string containing hours, minutes, seconds, and fractional seconds 
    (milliseconds) and converts it into a float representing the total number of seconds.

    Args:
        time_str (str): A time string in the format 'HH:MM:SS.%f' (e.g., '01:23:45.678').

    Returns:
        float: The total number of seconds represented by the time string.
    """
    time_obj = datetime.strptime(time_str, '%H:%M:%S.%f')
    return time_obj.hour * 3600 + time_obj.minute * 60 + time_obj.second + time_obj.microsecond / 1e6

def extract_audio_from_video(video_path, audio_path='audio.wav'):
    """
    Extract audio from a video file and save it as a WAV file.

    This function uses ffmpeg to extract the audio stream from the specified video file and saves it 
    as a WAV file with PCM 16-bit encoding, a sample rate of 44100 Hz, and 2 channels.

    Args:
        video_path (str): The path to the input video file.
        audio_path (str, optional): The output path for the extracted audio file. Defaults to 'audio.wav'.

    Returns:
        None
    """
    command = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 44100 -ac 2 {audio_path}"
    subprocess.run(command, shell=True)

def seconds_to_time(seconds):
    """
    Convert a number of seconds to a time string in 'HH:MM:SS.SS' format.

    This function converts the given total number of seconds (which may include fractional seconds) 
    into a formatted time string that includes hours, minutes, seconds, and hundredths of a second.

    Args:
        seconds (float): The total number of seconds.

    Returns:
        str: A time string formatted as 'HH:MM:SS.SS'.
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    milliseconds = int((seconds % 1) * 100)
    return f'{hours:02}:{minutes:02}:{int(seconds):02}.{milliseconds:02}'