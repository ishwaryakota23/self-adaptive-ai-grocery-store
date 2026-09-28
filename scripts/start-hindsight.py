import os
import subprocess
import sys

# Read GROQ_API_KEY from .env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
groq_key = None
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GROQ_API_KEY="):
                groq_key = line.strip().split("=", 1)[1].strip()
                break

env = os.environ.copy()
env["PYTHONUTF8"] = "1"
env["PYTHONIOENCODING"] = "utf-8"
env["HINDSIGHT_API_LLM_PROVIDER"] = "groq"
if groq_key:
    env["HINDSIGHT_API_LLM_API_KEY"] = groq_key
env["HINDSIGHT_API_LLM_MODEL"] = "openai/gpt-oss-20b"
env["HINDSIGHT_API_LLM_GROQ_SERVICE_TIER"] = "on_demand"

port = "8888"
cmd = ["uvx", "hindsight-api", "--port", port]
print(f"Starting Hindsight API on port {port}...")
sys.exit(subprocess.call(cmd, env=env))
