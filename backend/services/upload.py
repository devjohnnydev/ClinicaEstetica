import base64
import uuid
import os
from config import settings


def save_base64_image(base64_data: str, subdir: str, prefix: str = "") -> str:
    """Save a base64 encoded image to disk and return the relative path."""
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]

    image_data = base64.b64decode(base64_data)
    filename = f"{prefix}{uuid.uuid4().hex}.png"
    filepath = os.path.join(settings.UPLOAD_DIR, subdir, filename)
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, "wb") as f:
        f.write(image_data)

    return f"{subdir}/{filename}"


def save_uploaded_file(file_content: bytes, subdir: str, original_filename: str) -> str:
    """Save an uploaded file to disk and return the relative path."""
    ext = os.path.splitext(original_filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, subdir, filename)
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, "wb") as f:
        f.write(file_content)

    return f"{subdir}/{filename}"
