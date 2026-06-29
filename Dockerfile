# Base image - Pyhton  3.11 slim
FROM python:3.11-slim

# Set wprking directory inside container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first - Docker layer caching
# If requirements don't change, this layer is cached
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY .env .

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "main.py"]