# syntax=docker/dockerfile:1

FROM python:3.11-slim

WORKDIR /api

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && apt-get clean

COPY requirements.txt requirements.txt

RUN pip3 install --upgrade pip && pip3 install -r requirements.txt

RUN pip install gtts

COPY . .

ENV PYTHONUNBUFFERED=1

CMD ["python3", "-m", "flask", "run", "--host=0.0.0.0"]