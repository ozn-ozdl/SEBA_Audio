import { Button } from "src/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import {
  faTrash,
  faFolderOpen,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { Download } from "lucide-react";

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
  videoUrl?: string;
  srtUrl?: string;
  audioUrl?: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
  const [userName, setUserName] = useState(loggedInUser.name || "User");

  const [videoDescriptionsStorage, setVideoDescriptionsStorage] =
    useLocalStorage<ProjectData[]>("video_descriptions", []);

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/");
  };

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

  const downloadFile = (url: string, filename: string) => {
    console.log("Downloading from:", url);
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Clean up the URL object
      })
      .catch((error) => {
        console.error("Download error:", error);
      });
  };

  const extractFilename = (url: string): string => {
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  const downloadAll = (item: ProjectData) => {
    console.log(item);
    if (item.videoUrl && item.srtUrl && item.audioUrl) {
      downloadFile(item.videoUrl, extractFilename(item.videoUrl));
      downloadFile(item.srtUrl, extractFilename(item.srtUrl));
      downloadFile(item.audioUrl, extractFilename(item.audioUrl));
    }
  };

  const isDownloadEnabled = (item: ProjectData): boolean => {
    return !!(item.videoUrl && item.srtUrl && item.audioUrl);
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700">
          Dashboard of {userName}{" "}
        </h1>
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

          <Button
            className="bg-red-500 text-white hover:bg-red-600 flex items-center space-x-2"
            onClick={handleLogout}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span>Logout</span>
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
              <TableHead className="p-2 text-gray-600">Download Data</TableHead>
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
                  <TableCell className="p-2 text-gray-600">
                    <Button
                      variant="link"
                      className={`text-indigo-500 hover:underline ${
                        !isDownloadEnabled(item)
                          ? "opacity-50 cursor-default"
                          : ""
                      }`}
                      onClick={() => downloadAll(item)}
                      disabled={!isDownloadEnabled(item)}
                    >
                      <Download />
                    </Button>
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
