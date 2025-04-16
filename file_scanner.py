import os
import json
from pathlib import Path
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stderr
)
logger = logging.getLogger("file_scanner")

# List of directories to exclude from scanning
EXCLUDED_DIRS = [
    '/proc', '/sys', '/dev', '/run', '/tmp', '/var/cache',
    'node_modules', '.git', '__pycache__'
]

# Set a reasonable recursion depth to avoid scanning too deep
MAX_DEPTH = 3

def is_excluded_path(path):
    """Check if path should be excluded from scanning"""
    path_str = str(path)
    return any(excluded in path_str for excluded in EXCLUDED_DIRS)

def scan_directory(dir_path):
    try:
        # Normalize the path
        try:
            dir_path = Path(dir_path).expanduser().resolve()
        except Exception as e:
            logger.error(f"Error resolving path {dir_path}: {e}")
            json.dump({"error": f"Invalid path: {dir_path}"}, sys.stdout)
            return
            
        # Check if directory exists
        if not dir_path.exists():
            logger.error(f"Directory not found: {dir_path}")
            json.dump({"error": f"Directory not found: {dir_path}"}, sys.stdout)
            return
            
        # Skip excluded directories
        if is_excluded_path(dir_path):
            logger.warning(f"Skipping excluded directory: {dir_path}")
            json.dump({
                "name": dir_path.name,
                "path": str(dir_path),
                "type": "directory",
                "children": [],
                "excluded": True
            }, sys.stdout)
            return

        # Keep track of visited directories to avoid symlink loops
        visited_paths = set()
        
        def create_entry(path, depth=0):
            """Recursively create entries for the directory tree"""
            # Limit recursion depth
            if depth > MAX_DEPTH:
                logger.warning(f"Max depth reached at {path}")
                return {
                    "name": path.name,
                    "path": str(path),
                    "type": "directory",
                    "children": [],
                    "max_depth_reached": True
                }
                
            # Skip excluded paths
            if is_excluded_path(path):
                return None
                
            try:
                # Safely resolve path without following symlinks to check for cycles
                try:
                    real_path = str(path.resolve())
                    if real_path in visited_paths:
                        return {
                            "name": path.name,
                            "path": str(path),
                            "type": "symlink",
                            "target": real_path,
                            "cycle_detected": True
                        }
                    visited_paths.add(real_path)
                except Exception as e:
                    logger.warning(f"Error resolving path {path}: {e}")
                    return None
                
                # Basic checks to determine type
                try:
                    is_file = path.is_file()
                    is_dir = path.is_dir()
                    is_symlink = path.is_symlink()
                except (OSError, PermissionError) as e:
                    logger.warning(f"Permission error on {path}: {e}")
                    return {
                        "name": path.name,
                        "path": str(path),
                        "type": "unknown",
                        "error": str(e)
                    }
                
                # Create the entry with basic info
                entry = {
                    "name": path.name,
                    "path": str(path),
                    "type": "file" if is_file else "directory" if is_dir else "symlink" if is_symlink else "unknown"
                }

                # Add file specific info
                if is_file:
                    try:
                        stats = path.stat()
                        entry["size"] = stats.st_size
                    except Exception as e:
                        entry["size"] = 0
                        entry["stat_error"] = str(e)
                
                # Add directory specific info - children
                elif is_dir:
                    try:
                        children = []
                        # Only scan directory contents if we're not too deep
                        if depth < MAX_DEPTH:
                            for child in path.iterdir():
                                # Skip hidden files unless explicitly requested
                                if not child.name.startswith('.'):
                                    child_entry = create_entry(child, depth + 1)
                                    if child_entry:
                                        children.append(child_entry)
                        entry["children"] = children
                    except PermissionError as e:
                        logger.warning(f"Permission error reading directory {path}: {e}")
                        entry["children"] = []
                        entry["permission_error"] = True
                    except OSError as e:
                        logger.warning(f"OS error reading directory {path}: {e}")
                        entry["children"] = []
                        entry["error"] = str(e)

                return entry
            except Exception as e:
                logger.error(f"Error processing {path}: {e}")
                return {
                    "name": path.name if hasattr(path, 'name') else "unknown",
                    "path": str(path),
                    "type": "error",
                    "error": str(e)
                }

        # Start the directory scan
        logger.info(f"Starting scan of directory: {dir_path}")
        result = create_entry(dir_path)
        
        if result:
            logger.info(f"Scan completed for: {dir_path}")
            json.dump(result, sys.stdout)
        else:
            logger.error(f"Failed to scan directory: {dir_path}")
            json.dump({"error": "Failed to scan directory"}, sys.stdout)

    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        json.dump({"error": f"Scanner error: {str(e)}"}, sys.stdout)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dir', type=str, required=True)
    args = parser.parse_args()

    # Ensure stdout is using UTF-8 encoding
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

    scan_directory(args.dir)
    sys.stdout.flush()