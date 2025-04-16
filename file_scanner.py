import os
import json
from pathlib import Path
import sys

def scan_directory(dir_path):
    try:
        dir_path = Path(dir_path).expanduser()
        if not dir_path.exists():
            json.dump({"error": f"Directory not found: {dir_path}"}, sys.stdout)
            return

        # Use a set to keep track of visited paths to avoid symlink cycles
        visited_paths = set()
        
        # Limit recursion depth to avoid infinite loops
        MAX_DEPTH = 5
        
        def create_entry(path, depth=0):
            if depth > MAX_DEPTH:
                return {
                    "name": path.name,
                    "path": str(path),
                    "type": "directory",
                    "children": [],
                    "max_depth_reached": True
                }
            
            try:
                # Resolve symbolic links to their real path
                # Use stat() instead of is_file() for more reliable file type detection
                path_str = str(path.resolve())
                
                # Check if we've already visited this path (symlink loop detection)
                if path_str in visited_paths:
                    return {
                        "name": path.name,
                        "path": str(path),
                        "type": "symlink",
                        "target": path_str,
                        "cycle_detected": True
                    }
                
                visited_paths.add(path_str)
                
                # Determine if it's a file or directory
                try:
                    stats = path.stat()
                    is_file = path.is_file()
                    is_dir = path.is_dir()
                except (OSError, PermissionError):
                    # If we can't stat the file, skip it
                    return None
                
                # Skip system directories that often cause issues
                if any(segment in str(path) for segment in ['/proc', '/sys', '/dev', '/run']):
                    return {
                        "name": path.name,
                        "path": str(path),
                        "type": "system_directory",
                        "skipped": True
                    }
                
                entry = {
                    "name": path.name,
                    "path": str(path),
                    "type": "file" if is_file else "directory"
                }

                if is_file:
                    try:
                        entry["size"] = stats.st_size
                    except:
                        entry["size"] = 0
                elif is_dir:
                    try:
                        children = []
                        for child in path.iterdir():
                            # Skip hidden files and special system files
                            if (not child.name.startswith('.') and 
                                child.name not in ['.git', 'node_modules', '__pycache__']):
                                child_entry = create_entry(child, depth + 1)
                                if child_entry:  # Only add if entry was created successfully
                                    children.append(child_entry)
                        entry["children"] = children
                    except PermissionError:
                        entry["children"] = []
                        entry["permission_error"] = True
                    except OSError as e:
                        entry["children"] = []
                        entry["error"] = str(e)

                return entry
            except Exception as e:
                print(json.dumps({"error": f"Error processing {path}: {str(e)}"}), file=sys.stderr)
                return None

        result = create_entry(dir_path)
        if result:
            json.dump(result, sys.stdout)
        else:
            json.dump({"error": "Failed to scan directory"}, sys.stdout)

    except Exception as e:
        json.dump({"error": str(e)}, sys.stdout)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dir', type=str, required=True)
    args = parser.parse_args()

    # Ensure stdout is using UTF-8 encoding
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

    scan_directory(args.dir)
    # Flush stdout to ensure all data is written
    sys.stdout.flush()