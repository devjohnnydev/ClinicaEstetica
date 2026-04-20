from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ModeloAnamnese(Base):
    __tablename__ = "modelos_anamnese"

    id = Column(Integer, primary_key=True, index=True)
    nome_procedimento = Column(String, nullable=False, index=True)
    descricao = Column(Text, nullable=True)
    riscos_procedimento = Column(Text, nullable=True)  # Custom risks text for consent form
    rosto_modelo_tipo = Column(String(30), nullable=True)  # muscular | positionsfem
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    campos = relationship("CampoModelo", back_populates="modelo",
                          order_by="CampoModelo.ordem",
                          cascade="all, delete-orphan")


class CampoModelo(Base):
    __tablename__ = "campos_modelo"

    id = Column(Integer, primary_key=True, index=True)
    modelo_id = Column(Integer, ForeignKey("modelos_anamnese.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String, nullable=False)  # texto, input, multipla_escolha, escolha_unica, select, checkbox, data, upload_imagem
    label = Column(String, nullable=False)
    placeholder = Column(String, nullable=True)
    opcoes = Column(JSON, nullable=True)  # For multipla_escolha, escolha_unica, select
    ordem = Column(Integer, nullable=False, default=0)
    obrigatorio = Column(Boolean, default=False)

    modelo = relationship("ModeloAnamnese", back_populates="campos")
