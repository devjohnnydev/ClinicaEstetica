from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class Anamnese(Base):
    __tablename__ = "anamneses"

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"), nullable=False)
    modelo_id = Column(Integer, ForeignKey("modelos_anamnese.id"), nullable=False)
    status = Column(String, nullable=False, default="em_andamento")  # em_andamento, finalizada
    observacoes = Column(Text, nullable=True)
    rosto_editado_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)
    updated_at = Column(DateTime(timezone=True), onupdate=get_brazil_time)
    finalizada_at = Column(DateTime(timezone=True), nullable=True)

    paciente = relationship("Paciente", back_populates="anamneses")
    modelo = relationship("ModeloAnamnese")
    respostas = relationship("Resposta", back_populates="anamnese", cascade="all, delete-orphan")
    assinaturas = relationship("Assinatura", back_populates="anamnese", cascade="all, delete-orphan")
    anexos = relationship("Anexo", back_populates="anamnese", cascade="all, delete-orphan")


class Resposta(Base):
    __tablename__ = "respostas"

    id = Column(Integer, primary_key=True, index=True)
    anamnese_id = Column(Integer, ForeignKey("anamneses.id", ondelete="CASCADE"), nullable=False)
    campo_id = Column(Integer, ForeignKey("campos_modelo.id"), nullable=True)
    valor = Column(JSON, nullable=True)

    anamnese = relationship("Anamnese", back_populates="respostas")
    campo = relationship("CampoModelo")
