import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
for p in [str(PROJECT_ROOT), str(BASE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.api.ai import verify_gemini_connection

if __name__ == "__main__":
    print("\n🔍 Checking Google Gemini API Key configured in backend/.env...\n")
    result = asyncio.run(verify_gemini_connection(print_banner=True))
    if result.get("connected"):
        print("✅ Status: Connection Successful! Your AI feature is ready and live.")
        sys.exit(0)
    else:
        print("⚠️  Status: Connection Unsuccessful or Unconfigured.")
        print("👉 Make sure your key is saved in backend/.env under GEMINI_API_KEY=...")
        print("👉 You can obtain a free API key instantly at: https://aistudio.google.com/\n")
        sys.exit(1)
