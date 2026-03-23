from sqlalchemy import Column, Integer, String, Date, Time, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class Agendamento(Base):
    __tablename__ = "agendamentos"

    id = Column(Integer, primary_key=True, index=True)
    agenda_cliente_id = Column(Integer, ForeignKey("agenda_clientes.id"), nullable=False)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=False)
    profissional_id = Column(Integer, ForeignKey("profissionais.id"), nullable=False)
    data = Column(Date, nullable=False, index=True)
    hora_inicio = Column(Time, nullable=False)
    hora_fim = Column(Time, nullable=False)
    status = Column(String, nullable=False, default="agendado")
    # Status values: agendado, confirmado, cancelado, nao_compareceu, concluido
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)
    updated_at = Column(DateTime(timezone=True), default=get_brazil_time, onupdate=get_brazil_time)

    cliente = relationship("AgendaCliente", back_populates="agendamentos", lazy="joined")
    servico = relationship("Servico", back_populates="agendamentos", lazy="joined")
    profissional = relationship("Profissional", back_populates="agendamentos", lazy="joined")
