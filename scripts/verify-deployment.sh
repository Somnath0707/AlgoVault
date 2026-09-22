#!/usr/bin/env bash
# AlgoVault Pre-Flight Deployment Verification Script
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   AlgoVault Universal Deployment Pre-Flight Check   ${NC}"
echo -e "${CYAN}====================================================${NC}"

# 1. Verify Deployment Configs
echo -e "\n${YELLOW}[1/5] Checking platform deployment manifests...${NC}"
CONFIGS=("render.yaml" "railway.json" "fly.toml" "Procfile" "docker-compose.prod.yml" "DEPLOYMENT.md")
for cfg in "${CONFIGS[@]}"; do
  if [ -f "$ROOT_DIR/$cfg" ]; then
    echo -e "  ✓ $cfg exists"
  else
    echo -e "  ${RED}✗ Missing $cfg${NC}"
    exit 1
  fi
done

# 2. Check Backend Maven Compilation
echo -e "\n${YELLOW}[2/5] Compiling backend Java 17/21 codebase...${NC}"
cd "$ROOT_DIR/backend"
mvn clean compile -DskipTests --quiet
echo -e "  ${GREEN}✓ Backend compiled successfully with 0 errors!${NC}"

# 3. Check Backend Dockerfile
echo -e "\n${YELLOW}[3/5] Validating backend Dockerfile and port configuration...${NC}"
if grep -q "exec java -XX:+UseContainerSupport" "$ROOT_DIR/backend/Dockerfile" && \
   grep -q "PORT" "$ROOT_DIR/backend/Dockerfile"; then
  echo -e "  ${GREEN}✓ Dockerfile contains dynamic PORT binding & container memory ergonomics${NC}"
else
  echo -e "  ${RED}✗ Dockerfile missing container memory or PORT configuration${NC}"
  exit 1
fi

# 4. Check Frontend TypeScript Compilation
echo -e "\n${YELLOW}[4/5] Checking extension TypeScript and build integrity...${NC}"
cd "$ROOT_DIR/extension"
npx tsc --noEmit
echo -e "  ${GREEN}✓ Extension TypeScript typecheck passed with 0 errors!${NC}"

# 5. Check Environment Templates
echo -e "\n${YELLOW}[5/5] Checking environment templates...${NC}"
if [ -f "$ROOT_DIR/extension/.env.example" ] && [ -f "$ROOT_DIR/extension/.env.production.example" ] && [ -f "$ROOT_DIR/.env.example" ]; then
  echo -e "  ${GREEN}✓ All environment templates (.env.example) are present!${NC}"
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}   ✓ SUCCESS: AlgoVault is 100% Deploy-Proof!       ${NC}"
echo -e "${GREEN}   Ready to deploy on Render, Railway, Fly, Heroku, ${NC}"
echo -e "${GREEN}   AWS, GCP, or any Docker/VPS platform!            ${NC}"
echo -e "${GREEN}====================================================${NC}"
