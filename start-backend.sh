#!/usr/bin/env bash
# AlgoVault Local Backend Runner

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  set -a
  source .env
  set +a
else
  echo "Error: .env file not found in $SCRIPT_DIR"
  exit 1
fi

export SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:postgresql://localhost:5432/algovault}"
export SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-algovault}"
export SPRING_REDIS_HOST="${SPRING_REDIS_HOST:-localhost}"

JAR_FILE="$SCRIPT_DIR/backend/target/algovault-backend-0.1.0.jar"

if [ ! -f "$JAR_FILE" ]; then
  echo "Jar file not found. Building backend with Maven..."
  (cd "$SCRIPT_DIR/backend" && mvn clean package -DskipTests)
fi

echo "Starting AlgoVault backend on http://localhost:8080..."
exec java -jar "$JAR_FILE"
