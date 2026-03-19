from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class Anexo(Base):
    __tablename__ = "anexos"

    id = Column(Integer, primary_key=True, index=True)
    anamnese_id = Column(Integer, ForeignKey("anamneses.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String, nullable=False)  # bancada, antes_depois
    arquivo_path = Column(String, nullable=False)
    descricao = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    anamnese = relationship("Anamnese", back_populates="anexos")
