import base64
import uuid
import os
from config import settings
from sqlalchemy.orm import Session
from models.db_file import DbFile


def save_base64_image(base64_data: str, subdir: str, prefix: str = "", db: Session = None) -> str:
    """Save a base64 encoded image to db (or disk) and return the relative path."""
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]

    image_data = base64.b64decode(base64_data)
    filename = f"{prefix}{uuid.uuid4().hex}.png"
    filepath = f"{subdir}/{filename}"
    
    if db:
        # Save to database
        db_file = DbFile(
            file_path=filepath,
            file_data=image_data,
            content_type="image/png"
        )
        db.add(db_file)
    else:
        # Fallback save to disk 
        disk_path = os.path.join(settings.UPLOAD_DIR, subdir, filename)
        os.makedirs(os.path.dirname(disk_path), exist_ok=True)
        with open(disk_path, "wb") as f:
            f.write(image_data)

    return filepath


def save_uploaded_file(file_content: bytes, subdir: str, original_filename: str, db: Session = None) -> str:
    """Save an uploaded file to db (or disk) and return the relative path."""
    ext = os.path.splitext(original_filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = f"{subdir}/{filename}"
    
    if db:
        import mimetypes
        content_type, _ = mimetypes.guess_type(original_filename)
        content_type = content_type or "application/octet-stream"
        
        db_file = DbFile(
            file_path=filepath,
            file_data=file_content,
            content_type=content_type
        )
        db.add(db_file)
    else:
        disk_path = os.path.join(settings.UPLOAD_DIR, subdir, filename)
        os.makedirs(os.path.dirname(disk_path), exist_ok=True)
        with open(disk_path, "wb") as f:
            f.write(file_content)

    return filepath
