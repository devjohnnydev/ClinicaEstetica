from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(Integer, primary_key=True, index=True)
    agendamento_id = Column(Integer, ForeignKey("agendamentos.id", ondelete="CASCADE"), nullable=True, unique=True)
    agenda_cliente_id = Column(Integer, ForeignKey("agenda_clientes.id"), nullable=False)
    descricao = Column(String, nullable=False)
    valor_total = Column(Float, nullable=False, default=0.0)
    valor_pago = Column(Float, nullable=False, default=0.0)
    forma_pagamento = Column(String, nullable=True)  # dinheiro, pix, cartao, outro
    status = Column(String, nullable=False, default="pendente")  # pendente, parcial, pago, atrasado
    data_atendimento = Column(Date, nullable=False)
    data_pagamento = Column(Date, nullable=True)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)
    updated_at = Column(DateTime(timezone=True), default=get_brazil_time, onupdate=get_brazil_time)

    agendamento = relationship("Agendamento", back_populates="pagamento", lazy="joined")
    cliente = relationship("AgendaCliente", backref="pagamentos", lazy="joined")
