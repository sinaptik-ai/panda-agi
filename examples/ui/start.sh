#!/bin/bash
# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status messages
status() {
    echo -e "${GREEN}==>${NC} $1"
}

# Function to print warnings
warning() {
    echo -e "${YELLOW}==> WARNING: $1${NC}"
}

# Function to print errors
error() {
    echo -e "${RED}==> ERROR: $1${NC}" >&2
    exit 1
}

# Default configuration
MAX_ATTEMPTS=30
SLEEP_INTERVAL=2
BACKEND_URL="http://localhost:8001/health"
FRONTEND_URL="http://localhost:3000"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_OVERRIDE="docker-compose.override.yml"
ENV_FILE=".env"

# Required environment variables
REQUIRED_ENV_VARS=("PANDA_AGI_KEY" "TAVILY_API_KEY")

# Parse command line arguments
BUILD_IMAGES=false
USE_PROD=true
NO_CACHE=false
COMPOSE_FILE="docker-compose.prod.yml"

while [[ $# -gt 0 ]]; do
  case $1 in
    --build)
      BUILD_IMAGES=true
      shift
      ;;
    --dev)
      USE_PROD=false
      COMPOSE_FILE="docker-compose.yml"
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    *)
      echo "Usage: $0 [--build] [--dev] [--no-cache]"
      echo "  --build     Pull latest images from registry (production) or rebuild locally (dev)"
      echo "  --dev       Use local development setup (builds images locally)"
      echo "  --no-cache  Force rebuild without using Docker build cache"
      exit 1
      ;;
  esac
done

# Check for .env file and required variables
INITIAL_MISSING_KEYS=()
ENV_FILE_EXISTS=true
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE_EXISTS=false
  # If file doesn't exist, all required keys are initially missing for the prompt
  INITIAL_MISSING_KEYS=("${REQUIRED_ENV_VARS[@]}")
else
  # File exists, check for each required variable
  for key in "${REQUIRED_ENV_VARS[@]}"; do
    # Check if key is present and has a non-whitespace, non-comment value
    if ! grep -q -E "^\s*${key}\s*=\s*[^[:space:]#]+" "$ENV_FILE"; then
      INITIAL_MISSING_KEYS+=("$key")
    fi
  done
fi

KEYS_UPDATED_BY_PROMPT=false
if [ "$ENV_FILE_EXISTS" = false ] || [ ${#INITIAL_MISSING_KEYS[@]} -gt 0 ]; then
  if [ "$ENV_FILE_EXISTS" = false ]; then
    echo -e "${YELLOW}The ${NC}${ENV_FILE}${YELLOW} file is missing. It's needed for API keys and other configurations.${NC}"
  elif [ ${#INITIAL_MISSING_KEYS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Some critical API keys are missing or not set in your ${NC}${ENV_FILE}${YELLOW} file.${NC}"
  fi
  echo -e "${YELLOW}Let's set up the required keys now.${NC}"

  # Ensure .env file exists for appending/reading by subsequent prompts
  touch "$ENV_FILE"

  for key_to_set in "${INITIAL_MISSING_KEYS[@]}"; do
    KEY_PROMPT_MESSAGE="-> Please enter your ${GREEN}${key_to_set}${NC}"
    OBTAIN_URL=""
    if [ "$key_to_set" = "PANDA_AGI_KEY" ]; then
      OBTAIN_URL=" (obtain from ${BLUE}https://agi.pandas-ai.com${NC})"
    elif [ "$key_to_set" = "TAVILY_API_KEY" ]; then
      OBTAIN_URL=" (obtain from ${BLUE}https://tavily.com${NC})"
    fi
    KEY_PROMPT_MESSAGE+="${OBTAIN_URL}: "

    echo -n -e "$KEY_PROMPT_MESSAGE"
    read -r user_input_value

    if [ -n "$user_input_value" ]; then
      # Remove existing line for this key (if any, or if it was empty/commented incorrectly before)
      # Using temp file for sed -i compatibility (macOS)
      sed -i.bak "/^\s*${key_to_set}\s*=/d" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
      # Append new key=value
      echo "${key_to_set}=${user_input_value}" >> "$ENV_FILE"
      echo -e "   ${GREEN}INFO: ${key_to_set} has been set in ${ENV_FILE}.${NC}"
      KEYS_UPDATED_BY_PROMPT=true
    else
      echo -e "   ${YELLOW}WARN: ${key_to_set} was not provided and remains unset. This key is required for full functionality.${NC}"
    fi
  done

  # Re-check after prompting to form the final list of missing keys
  FINAL_MISSING_KEYS=()
  for key_check_after_prompt in "${REQUIRED_ENV_VARS[@]}"; do
    if ! grep -q -E "^\s*${key_check_after_prompt}\s*=\s*[^[:space:]#]+" "$ENV_FILE"; then
      FINAL_MISSING_KEYS+=("$key_check_after_prompt")
    fi
  done

  if [ ${#FINAL_MISSING_KEYS[@]} -gt 0 ]; then
    ERROR_MESSAGE="${RED}Configuration error after attempting to set keys:${NC}\n"
    ERROR_MESSAGE+="  - The following required API key(s) are ${RED}still missing or empty${NC} in ${YELLOW}${ENV_FILE}${RED}:\n"
    for key_in_error in "${FINAL_MISSING_KEYS[@]}"; do
      ERROR_MESSAGE+="    - ${YELLOW}${key_in_error}${RED}\n"
    done
    ERROR_MESSAGE+="\nPlease create or update the ${YELLOW}${ENV_FILE}${RED} file manually with the following information:\n"
    ERROR_MESSAGE+="  - ${GREEN}PANDA_AGI_KEY${NC}: Obtain from ${BLUE}https://agi.pandas-ai.com${NC}\n"
    ERROR_MESSAGE+="  - ${GREEN}TAVILY_API_KEY${NC}: Obtain from ${BLUE}https://tavily.com${NC}\n"
    ERROR_MESSAGE+="\n${RED}These keys are essential for the application to function correctly. The script will now exit.${NC}"
    error "$ERROR_MESSAGE"
  elif [ "$KEYS_UPDATED_BY_PROMPT" = true ]; then
     echo -e "${GREEN}All required API keys are now configured in ${ENV_FILE}. Proceeding...${NC}"
  fi
  # If no keys were initially missing, and no keys were updated by prompt, this block is skipped, and we just proceed.
fi

# If .env file was initially missing and now potentially created by prompts (or still missing if prompts failed and script exited)
# This section ensures non-critical defaults without overwriting user settings or critical keys.
if [ ! -f "$ENV_FILE" ]; then # Should only happen if prompts failed and script somehow didn't exit, or for a fresh setup where prompts are skipped.
  warning "${ENV_FILE} still not found. Creating a basic one for non-critical defaults..."
  echo "# PandaAGI UI Environment Variables" > "$ENV_FILE"
  echo "# Critical API keys (PANDA_AGI_KEY, TAVILY_API_KEY) should be managed by the script's prompts or set manually." >> "$ENV_FILE"
  echo "" >> "$ENV_FILE"
fi

# Ensure non-critical default values are present if not set - append if file exists
touch "$ENV_FILE" # Ensure file exists before trying to grep/append
REQUIRED_DEFAULTS_KEYS=("WORKSPACE_PATH" "PYTHONPATH" "FASTAPI_RELOAD")
REQUIRED_DEFAULTS_VALUES=("./workspace" "/app" "false")

for i in "${!REQUIRED_DEFAULTS_KEYS[@]}"; do
  key="${REQUIRED_DEFAULTS_KEYS[$i]}"
  default_value="${REQUIRED_DEFAULTS_VALUES[$i]}"
  if ! grep -q -E "^\s*${key}\s*=" "$ENV_FILE"; then
    echo "${key}=${default_value}" >> "$ENV_FILE"
  fi
done

# Function to build images if needed
build_images() {
  if [ "$USE_PROD" = false ]; then
    # Development mode: build locally
    local build_args=""
    if [ "$NO_CACHE" = true ]; then
      build_args="--no-cache"
      status "🔨 Building Docker images for development (without cache)..."
    else
      status "🔨 Building Docker images for development..."
    fi
    
    if ! docker-compose -f docker-compose.yml build $build_args; then
      error "Failed to build Docker images. Check the logs for details."
    fi
  elif [ "$BUILD_IMAGES" = true ] && [ "$USE_PROD" = true ]; then
    # Production mode with --build flag: pull latest images from registry
    status "📥 Pulling latest Docker images from registry..."
    if ! docker-compose -f "$COMPOSE_FILE" pull; then
      error "Failed to pull Docker images. Check the logs for details."
    fi
  fi
}

# Function to start services
start_services() {
  local compose_cmd=("docker-compose" "-f" "$COMPOSE_FILE")
  
  if [ -f "$COMPOSE_OVERRIDE" ]; then
    compose_cmd+=("-f" "$COMPOSE_OVERRIDE")
  fi
  
  if [ "$USE_PROD" = true ]; then
    status "🚀 Starting production services..."
  else
    status "🚀 Starting development services..."
  fi
  
  if ! "${compose_cmd[@]}" up -d; then
    error "Failed to start services. Check the logs with 'docker-compose logs' for more details."
  fi
}

# Function to check if a URL is available
check_url() {
    local url="$1"
    local max_attempts=$2
    local description="$3"
    
    status "Checking $description availability at $url"
    
    for ((i=1; i<=max_attempts; i++)); do
        if curl -s -f -o /dev/null --connect-timeout 2 "$url"; then
            status "✅ $description is up and running!"
            return 0
        fi
        if [[ $i -lt $max_attempts ]]; then
            echo -n "."
            sleep $SLEEP_INTERVAL
        fi
    done
    
    warning "$description not ready after $max_attempts attempts"
    return 1
}

# Function to stop services
stop_services() {
    status "🛑 Stopping services..."
    local compose_cmd=("docker-compose" "-f" "$COMPOSE_FILE")
    if [ -f "$COMPOSE_OVERRIDE" ]; then
        compose_cmd+=("-f" "$COMPOSE_OVERRIDE")
    fi
    "${compose_cmd[@]}" down --remove-orphans
}

# Main execution
main() {
    status "🚀 Starting PandaAGI Enhanced Chat Interface..."
    
    # Check prerequisites
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi

    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker and try again."
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose is not installed. Please install docker-compose and try again."
    fi

    # Stop any running services first
    stop_services

    # Build images if needed
    build_images
    
    # Start services
    start_services

    # Check services in parallel
    status "⏳ Waiting for services to become ready..."
    
    # Start background processes for checking services
    check_url "$BACKEND_URL" $MAX_ATTEMPTS "Backend" &
    backend_pid=$!

    check_url "$FRONTEND_URL" $((MAX_ATTEMPTS + 5)) "Frontend" &
    frontend_pid=$!

    # Wait for both checks to complete
    wait $backend_pid
    backend_status=$?

    wait $frontend_pid
    frontend_status=$?

    # Display final status
    status "\n🚀 Services status:"
    echo -e "- Backend: ${BLUE}${BACKEND_URL}${NC}"
    echo -e "- Frontend: ${BLUE}${FRONTEND_URL}${NC}"

    if [ $backend_status -eq 0 ]; then
        echo -e "${GREEN}✅ Backend is up and running!${NC}"
    else
        warning "Backend is not responding. Check logs with: docker-compose -f $COMPOSE_FILE logs backend"
    fi

    if [ $frontend_status -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend is up and running!${NC}"
    else
        warning "Frontend is taking longer than expected to start. It may still become available..."
    fi

    # Display usage information
    echo -e "\n🔧 ${GREEN}Useful commands:${NC}"
    echo "  View logs:             docker-compose -f $COMPOSE_FILE logs -f"
    echo "  View backend logs:     docker-compose -f $COMPOSE_FILE logs -f backend"
    echo "  View frontend logs:    docker-compose -f $COMPOSE_FILE logs -f frontend"
    echo "  Stop services:         docker-compose -f $COMPOSE_FILE down"
    echo ""
    echo "  Development mode:      ./start.sh --dev"
    echo "  Rebuild (cached):      ./start.sh --dev --build"
    echo "  Rebuild (no cache):    ./start.sh --dev --no-cache"
    echo "  Production mode:       ./start.sh"
    echo "  Production rebuild:    ./start.sh --build"

    if [ $backend_status -eq 0 ] && [ $frontend_status -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All services are up and running!${NC}"
        echo -e "🌐 Open ${BLUE}${FRONTEND_URL}${NC} in your browser to get started!"
    else
        warning "Some services may not be fully operational. Check the logs for details."
        exit 1
    fi
}

# Run the main function
main "$@" 