from sqlalchemy import Column, Integer, String, DateTime
from database import Base, get_brazil_time


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)
