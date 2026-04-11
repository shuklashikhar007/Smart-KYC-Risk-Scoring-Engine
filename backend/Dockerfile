FROM python:3.12-slim

WORKDIR /app
COPY . /app

# Combine RUN commands and use --no-cache-dir to prevent cache bloat
RUN apt-get update && \
    pip install --upgrade pip --no-cache-dir && \
    pip install -r requirements.txt --no-cache-dir && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 8000

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]