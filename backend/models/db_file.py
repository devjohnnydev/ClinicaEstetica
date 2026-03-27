from sqlalchemy import Column, String, LargeBinary, DateTime
from database import Base, get_brazil_time

class DbFile(Base):
    """
    Stores binary files directly in the database to prevent loss on ephemeral file systems.
    The file_path (e.g., 'assinaturas/sig_inicial_123.png') acts as the primary key.
    """
    __tablename__ = "db_files"
    
    file_path = Column(String, primary_key=True, index=True)
    file_data = Column(LargeBinary, nullable=False)
    content_type = Column(String, nullable=False, default="application/octet-stream")
    created_at = Column(DateTime, default=get_brazil_time)
