import React, { useState, useRef } from "react";
import { AudioVisualizer } from "react-audio-visualize";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { Timer, Clock } from "lucide-react";

const AudioExtractionVisualizer: React.FC = () => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ffmpegRef = useRef(new FFmpeg());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const extractAudio = async (videoFile: File) => {
    const ffmpeg = ffmpegRef.current;
    
    try {
      setIsLoading(true);
      setProgress(0);
      startTimer();
      
      if (!ffmpeg.loaded) {
        await ffmpeg.load();
      }

      ffmpeg.on('progress', ({ progress, time }) => {
        setProgress(Math.round(progress * 100));
      });

      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });

      const videoData = await fetchFile(videoFile);
      await ffmpeg.writeFile('input.mp4', videoData);

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2',
        'output.wav'
      ]);

      const audioData = await ffmpeg.readFile('output.wav');
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      setAudioBlob(audioBlob);

      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.wav');
    } catch (error) {
      console.error("Error extracting audio:", error);
    } finally {
      stopTimer();
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      extractAudio(file);
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Audio Extraction and Visualization</h1>
      <input
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="mb-4 p-2 border border-gray-300 rounded"
        disabled={isLoading}
      />
      {isLoading && (
        <div className="w-full max-w-md mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-blue-600">
              Processing... {progress}%
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              {formatTime(elapsedTime)}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {videoFile && (
        <video
          ref={videoRef}
          className="w-full max-w-md mb-4 rounded-lg shadow-lg"
          src={URL.createObjectURL(videoFile)}
          controls
        />
      )}
      {audioBlob && !isLoading && (
        <div className="w-full max-w-md">
          <AudioVisualizer
            blob={audioBlob}
            width={500}
            height={75}
            barColor="#000000"
          />
          <div className="flex items-center justify-between mt-4">
            <a
              href={URL.createObjectURL(audioBlob)}
              download="extracted_audio.wav"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Download Audio
            </a>
            <div className="flex items-center text-gray-600">
              <Timer className="w-4 h-4 mr-2" />
              Processed in: {formatTime(elapsedTime)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioExtractionVisualizer;