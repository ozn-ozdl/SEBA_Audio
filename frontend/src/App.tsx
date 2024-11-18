import "./App.css";
import VideoUploader from "./components/VideoUploader";
import { VideoDescription } from "./components/VideoDescription";

function App() {
  return (
    <div className="bg-bg-secondary h-screen flex flex-col overflow-hidden">
      <header className="bg-bg-primary  text-text-primary py-4 px-6 flex justify-center">
        <h1 className="text-lg font-semibold">Video Descriptions</h1>
      </header>

      <div className="flex flex-1">
        <div className="w-2/3 p-4 border-r border-gray-700">
          <div className="bg-bg-secondary text-text-primary py-2 rounded-t-md mb-4">
            <h2 className="text-md font-semibold">Textual Descriptions</h2>
          </div>

          <VideoDescription videoDescriptions={exampleDescriptions} />
        </div>

        <div className="w-1/3 p-4 flex flex-col items-center justify-center">
          <VideoUploader />
        </div>
      </div>
    </div>
  );
}

const exampleDescriptions = [
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Hallo.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Test.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Wie geht es dir.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
  {
    startTime: "0:00:02.700",
    endTime: "0:00:03.600",
    description: "Servus.",
    videoUrl: "",
  },
];

export default App;
