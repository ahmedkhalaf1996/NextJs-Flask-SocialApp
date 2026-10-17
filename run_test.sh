
#!/usr/bin/env bash

set -euo pipefail

# ------------------------------------------------------
# Paths
# ------------------------------------------------------
SCRIPT_DIR = "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" 
BACKEND_DIR = "$SCRIPT_DIR/backend"
FRONTEND_DIR = "$SCRIPT_DIR/frontend"
VENV_ACTIVATE = "$SCRIPT_DIR/env/bin/activate"


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
RUN_BACKEND=true
RUN_FRONTEND=true
SHOW_REPORT=false

for arg in "$@"; do
  case "$arg" in
    --backend)  RUN_FRONTEND=false ;;
    --frontend) RUN_BACKEND=false  ;;
    --report)   SHOW_REPORT=true   ;;
  esac
done

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

header()  { echo -e "\n${CYAN}============================================================${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}============================================================${NC}"; }
success() { echo -e "${GREEN}[PASS] $1${NC}"; }
failure() { echo -e "${RED}[FAIL] $1${NC}"; }
info()    { echo -e "${YELLOW}[INFO] $1${NC}"; }

BACKEND_PASSED=true
FRONTEND_PASSED=true

# ===========================================================================
# BACKEND — pytest
# ===========================================================================
if $RUN_BACKEND; then
  header "Running Backend Tests (pytest)"

  if [ ! -f "$VENV_ACTIVATE" ]; then
    failure "Virtual environment not found at: $VENV_ACTIVATE"
    info "Create it with:  python3 -m venv backend/env"
    info "Install deps:    backend/env/bin/pip install -r backend/requirements.txt pytest mongomock pytest-mock"
    BACKEND_PASSED=false
  else
    info "Activating virtual environment..."
    # shellcheck source=/dev/null
    source "$VENV_ACTIVATE"

    pushd "$BACKEND_DIR" > /dev/null
    if python -m pytest tests/ -v --tb=short; then
      success "All backend tests passed."
    else
      failure "One or more backend tests FAILED."
      BACKEND_PASSED=false
    fi
    popd > /dev/null
  fi
fi

# ===========================================================================
# FRONTEND — Playwright E2E
# ===========================================================================
if $RUN_FRONTEND; then
  header "Running Frontend E2E Tests (Playwright)"

  pushd "$FRONTEND_DIR" > /dev/null
  if npm run test:e2e; then
    success "All E2E tests passed."
  else
    failure "One or more E2E tests FAILED."
    FRONTEND_PASSED=false
  fi

  if $SHOW_REPORT; then
    info "Opening Playwright HTML report..."
    npm run test:e2e:report || true
  fi
  popd > /dev/null
fi

# ===========================================================================
# Summary
# ===========================================================================
header "Test Summary"

$RUN_BACKEND  && { $BACKEND_PASSED  && success "Backend  : PASSED" || failure "Backend  : FAILED"; }
$RUN_FRONTEND && { $FRONTEND_PASSED && success "Frontend : PASSED" || failure "Frontend : FAILED"; }

echo ""

if $BACKEND_PASSED && $FRONTEND_PASSED; then
  echo -e "${GREEN}All test suites passed!${NC}"
  exit 0
else
  echo -e "${RED}Some test suites failed. See output above for details.${NC}"
  exit 1
fi








