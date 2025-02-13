# SEBA Audio Project NarrifAI

## Overview
The SEBA Audio project is designed to provide high-quality audio processing capabilities. This project leverages Docker to ensure a consistent and reproducible development environment.

## Running the Project

To run the project, use the following command:

```sh
docker-compose up --build
```

This command will build the Docker images and start the containers as defined in the `docker-compose.yml` file.

## Prerequisites

- Docker
- Docker Compose

Make sure you have both Docker and Docker Compose installed on your machine before running the project.

## Getting Started

1. Clone the repository:
    ```sh
    git clone https://github.com/ozn-ozdl/SEBA_Audio.git
    cd seba_audio
    ```

2. Create a `.env` file with the following fields:
    ```env
    OPENAI_KEY=your_openai_key
    GEMINI_KEY=your_gemini_key
    ```

3. Build and run the project:
    ```sh
    docker-compose up --build
    ```

4. Access the application:
    - The application should now be running and accessible via `http://localhost:3000`.