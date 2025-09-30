FROM python:3.11-slim

# Set working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python data science packages
RUN pip install --no-cache-dir \
    pandas \
    numpy \
    scikit-learn \
    scipy \
    statsmodels \
    matplotlib \
    seaborn \
    jupyter \
    ipython

# Keep container running (useful for persistent containers)
CMD ["tail", "-f", "/dev/null"]