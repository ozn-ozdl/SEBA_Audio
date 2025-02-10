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

// Interface for individual video description items (if needed)
interface VideoDescriptionItem {
  startTime: number;
  endTime: number;
  description: string;
  audioFile?: string;
  isEdited: boolean;
}

// Interface for project data. Note the added "owner" field.
interface ProjectData {
  name: string;
  data: VideoDescriptionItem[];
  date: string;
  videoName: string;
  screenshot?: string;
  owner: string; // The user who created this project
}

export function Dashboard() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");

  // Use localStorage to persist projects under the key "video_descriptions"
  const [videoDescriptionsStorage, setVideoDescriptionsStorage] =
    useLocalStorage<ProjectData[]>("video_descriptions", []);

  // Retrieve the current logged-in user from localStorage
  const currentUser = localStorage.getItem("currentUser");

  // Filter the projects so that only projects created by the current user are shown
  const userProjects = videoDescriptionsStorage.filter(
    (project) => project.owner === currentUser
  );

  // Function to create a new project for the current user
  const handleCreateProject = (): void => {
    if (!projectName.trim()) {
      alert("Please enter a valid project name.");
      return;
    }
    if (!currentUser) {
      alert("No current user. Please log in.");
      navigate("/login");
      return;
    }

    // Check if a project with the same name for this user already exists
    const exists = videoDescriptionsStorage.find(
      (project) => project.name === projectName && project.owner === currentUser
    );
    if (!exists) {
      const newProject: ProjectData = {
        name: projectName,
        data: [],
        date: new Date().toLocaleString(),
        videoName: "",
        screenshot: "",
        owner: currentUser,
      };
      setVideoDescriptionsStorage([...videoDescriptionsStorage, newProject]);
    }
    // Navigate to the workspace page for the created project
    navigate(`/workspace?name=${encodeURIComponent(projectName)}`);
    console.log("Project name", projectName);
  };

  // Function to handle clicking on a project (opens the project workspace)
  const handleProjectClick = (project: ProjectData): void => {
    navigate(`/workspace?name=${encodeURIComponent(project.name)}`);
    console.log("Project name", project.name);
  };

  // Function to delete a project belonging to the current user
  const handleDeleteProject = (projectName: string): void => {
    const updatedProjects = videoDescriptionsStorage.filter(
      (item) => !(item.name === projectName && item.owner === currentUser)
    );
    setVideoDescriptionsStorage(updatedProjects);
  };

  // Logout function: clears the current user and navigates to the login page
  const handleLogout = (): void => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Button
            className="bg-red-500 text-white hover:bg-red-600"
            onClick={handleLogout}
          >
            Logout
          </Button>
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
            {userProjects.length > 0 ? (
              userProjects.map((item, index) => (
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
