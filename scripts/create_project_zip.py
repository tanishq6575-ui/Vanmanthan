import os
import zipfile
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ZIP_OUT_PATH = BASE_DIR / "wildlife-intelligence-platform-pench.zip"
PUBLIC_ZIP_PATH = BASE_DIR / "frontend/public/wildlife-intelligence-platform-pench.zip"

EXCLUDE_DIRS = {
    ".venv", "venv", "node_modules", ".git", "__pycache__", 
    ".pytest_cache", "dist", ".cache", "site-packages"
}

EXCLUDE_EXTS = {
    ".pyc", ".pyo", ".pyd"
}

def create_zip():
    print(f"Creating clean project zip from: {BASE_DIR}")
    count = 0
    total_bytes = 0

    # Ensure frontend/public exists
    PUBLIC_ZIP_PATH.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(ZIP_OUT_PATH, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(BASE_DIR):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]

            for file in files:
                file_path = Path(root) / file
                ext = file_path.suffix.lower()

                if ext in EXCLUDE_EXTS:
                    continue
                if file.endswith(".zip"):
                    continue

                rel_path = file_path.relative_to(BASE_DIR)
                zipf.write(file_path, arcname=str(rel_path))
                count += 1
                total_bytes += file_path.stat().st_size

    # Copy to public folder for direct browser download
    shutil.copyfile(ZIP_OUT_PATH, PUBLIC_ZIP_PATH)

    zip_size_mb = ZIP_OUT_PATH.stat().st_size / (1024 * 1024)
    print(f"Successfully created ZIP archive: {ZIP_OUT_PATH}")
    print(f"Total files archived: {count}")
    print(f"Archive Size: {zip_size_mb:.2f} MB")
    print(f"Browser Download Link: http://localhost:3000/wildlife-intelligence-platform-pench.zip")

if __name__ == "__main__":
    create_zip()
