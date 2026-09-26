import sys
from pathlib import Path

# Automatically ensure project root is in sys.path so 'backend.app...' always resolves
CURRENT_FILE = Path(__file__).resolve()
ROOT_DIR = CURRENT_FILE.parent.parent.parent
BACKEND_DIR = CURRENT_FILE.parent.parent

for p in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)
