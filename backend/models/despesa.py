from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class CategoriaDespesa(Base):
    __tablename__ = "categorias_despesa"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, unique=True)
    tipo = Column(String, nullable=False, default="clinica")  # clinica | pessoal
    icone = Column(String, nullable=True)  # emoji or icon name
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    despesas = relationship("Despesa", back_populates="categoria_rel", lazy="select")


class Despesa(Base):
    __tablename__ = "despesas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias_despesa.id"), nullable=True)
    categoria = Column(String, nullable=False, default="outros")  # legacy text field
    tipo = Column(String, nullable=False, default="clinica")  # clinica | pessoal
    valor_total = Column(Float, nullable=False, default=0.0)
    forma_pagamento = Column(String, nullable=True)  # dinheiro, pix, cartao, outro
    parcelas_total = Column(Integer, nullable=False, default=1)  # 1 = à vista
    data = Column(Date, nullable=False)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    categoria_rel = relationship("CategoriaDespesa", back_populates="despesas", lazy="joined")
    parcelas = relationship("ParcelaDespesa", back_populates="despesa", cascade="all, delete-orphan", lazy="joined")


class ParcelaDespesa(Base):
    __tablename__ = "parcelas_despesa"

    id = Column(Integer, primary_key=True, index=True)
    despesa_id = Column(Integer, ForeignKey("despesas.id", ondelete="CASCADE"), nullable=False)
    numero_parcela = Column(Integer, nullable=False)
    valor = Column(Float, nullable=False)
    data_vencimento = Column(Date, nullable=False)
    pago = Column(Boolean, default=False)
    data_pagamento = Column(Date, nullable=True)

    despesa = relationship("Despesa", back_populates="parcelas")
