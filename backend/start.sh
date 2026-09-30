#!/bin/bash
cd "$(dirname "$0")"
if command -v /usr/libexec/java_home &>/dev/null; then
  export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home 2>/dev/null)
fi
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
exec mvn spring-boot:run
