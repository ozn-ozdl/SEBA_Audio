cd /backend/
docker build -t test-docker-image .
docker run -d -p 5000:5000 --name test_container test-docker-image