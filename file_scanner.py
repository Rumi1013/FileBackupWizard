import os
import json
from pathlib import Path
import sys

def scan_directory(dir_path):
    try:
        dir_path = Path(dir_path).expanduser()
        if not dir_path.exists():
            return {"error": "Directory not found"}

        def create_entry(path):
            is_file = path.is_file()
            entry = {
                "name": path.name,
                "path": str(path),
                "type": "file" if is_file else "directory"
            }
            
            if is_file:
                try:
                    entry["size"] = path.stat().st_size
                except:
                    entry["size"] = 0
            else:
                try:
                    children = []
                    for child in path.iterdir():
                        if not child.name.startswith('.'):  # Skip hidden files
                            children.append(create_entry(child))
                    entry["children"] = children
                except PermissionError:
                    entry["children"] = []
                    
            return entry

        result = create_entry(dir_path)
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dir', type=str, required=True)
    args = parser.parse_args()
    scan_directory(args.dir)
