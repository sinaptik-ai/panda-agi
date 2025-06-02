FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
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

# Create a startup script to handle the package installation
RUN echo '#!/bin/bash\n\
if [ -d "/sdk" ]; then\n\
    echo "Installing local panda_agi package..."\n\
    cd /sdk\n\
    pip install -e .\n\
fi\n\
echo "Starting FastAPI server..."\n\
cd /app\n\
python main.py' > /app/start.sh && chmod +x /app/start.sh

# Run the startup script
CMD ["/app/start.sh"] 