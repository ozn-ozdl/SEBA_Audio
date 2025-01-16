import { Button } from "src/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/ui/popover";

import { useState } from "react";
import { useLocalStorage } from "@uidotdev/usehooks";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");

  const handleCreateProject = () => {
    navigate(`/workspace?name=${projectName}`);
  };

  const [videoDescriptionsStorage, setVideoDescriptionsStorage] =
    useLocalStorage<{ name: string; data: VideoDescriptionItem[] }[]>(
      `video_descriptions`,
      []
    );

  const handleClick = (projectName: string) => {
    navigate(`/workspace?name=${projectName}`);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button>create</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex flex-col space-y-4 p-4">
            <input
              type="text"
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            />
            <Button onClick={handleCreateProject}>Create</Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex flex-col gap-4">
        {videoDescriptionsStorage.map((item) => (
          <>
            <div
              className="w-full py-2 hover:bg-slate-100"
              onClick={() => handleClick(item.name)}
            >
              name: {item.name}
            </div>
          </>
        ))}
      </div>
    </>
  );
}
