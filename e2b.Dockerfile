# Make sure to use this base image
FROM e2bdev/code-interpreter:latest

# Install Tmux
RUN apt-get update && apt-get install -y tmux
