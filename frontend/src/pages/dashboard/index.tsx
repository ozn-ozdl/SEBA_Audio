import { Button } from "src/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

interface VideoDescriptionItem {
  startTime: number;
  endTime: number;
  description: string;
  audioFile?: string;
  isEdited: boolean; // New flag
}

interface ProjectData {
  name: string;
  data: VideoDescriptionItem[];
  date: string;
  videoName: string;
  screenshot?: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");

  const [videoDescriptionsStorage, setVideoDescriptionsStorage] =
    useLocalStorage<ProjectData[]>("video_descriptions", []);

  const handleCreateProject = (): void => {
    if (!projectName.trim()) {
      alert("Please enter a valid project name.");
      return;
    }
    navigate(`/workspace?name=${projectName}`);
    console.log("Projec name", projectName);
  };

  const handleProjectClick = (project: ProjectData): void => {
    navigate(`/workspace?name=${encodeURIComponent(project.name)}`);
    console.log("Project name", project.name);
  };

  const handleDeleteProject = (projectName: string): void => {
    const updatedProjects = videoDescriptionsStorage.filter(
      (item) => item.name !== projectName
    );
    setVideoDescriptionsStorage(updatedProjects);
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700">Dashboard</h1>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="New project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <Button
            className="bg-blue-500 text-white hover:bg-blue-600"
            onClick={handleCreateProject}
          >
            Create Project
          </Button>
        </div>
      </header>

      <section>
        <Table className="w-full border border-gray-200">
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="p-2 text-gray-600">Project Name</TableHead>
              <TableHead className="p-2 text-gray-600">Last Updated</TableHead>
              <TableHead className="p-2 text-gray-600">Screenshot</TableHead>
              <TableHead className="p-2 text-gray-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videoDescriptionsStorage.length > 0 ? (
              videoDescriptionsStorage.map((item, index) => (
                <TableRow
                  key={item.name}
                  className={`${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-gray-100`}
                >
                  <TableCell className="p-2 text-gray-700">
                    {item.name}
                  </TableCell>
                  <TableCell className="p-2 text-gray-500">
                    {item.date}
                  </TableCell>
                  <TableCell className="p-2">
                    {item.screenshot && (
                      <img
                        src={item.screenshot}
                        alt="Project Screenshot"
                        className="w-20 h-12 object-cover rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex space-x-2">
                      <Button
                        variant="link"
                        className="text-blue-500 hover:underline"
                        onClick={() => handleProjectClick(item)}
                      >
                        <FontAwesomeIcon icon={faFolderOpen} /> Open
                      </Button>
                      <Button
                        variant="link"
                        className="text-red-500 hover:underline"
                        onClick={() => handleDeleteProject(item.name)}
                      >
                        <FontAwesomeIcon icon={faTrash} /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500">
                  No projects available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
