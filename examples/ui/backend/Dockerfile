FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for WeasyPrint and Node.js
RUN apt-get update && apt-get install -y \
    lsof \
    curl \
    gnupg \
    # WeasyPrint system dependencies
    libglib2.0-0 \
    libglib2.0-dev \
    libcairo2 \
    libcairo2-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-dev \
    libgdk-pixbuf-xlib-2.0-dev \
    libffi-dev \
    libxml2-dev \
    libxslt-dev \
    zlib1g-dev \
    libjpeg-dev \
    shared-mime-info \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g yarn

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create workspace directory
RUN mkdir -p ./workspace

# Set environment variables for production
ENV SERVER_RELOAD=false

# Expose ports
EXPOSE 8000
EXPOSE 8001
EXPOSE 8080
EXPOSE 2664

# Run the FastAPI server
CMD ["python", "main.py"] 