from sqlalchemy import Column, Integer, String, Date, Time, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class ListaEspera(Base):
    __tablename__ = "lista_espera"

    id = Column(Integer, primary_key=True, index=True)
    agenda_cliente_id = Column(Integer, ForeignKey("agenda_clientes.id"), nullable=False)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=True)
    data_desejada = Column(Date, nullable=True)
    horario_desejado = Column(Time, nullable=True)
    observacoes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="aguardando")
    # status values: aguardando, agendado, cancelado
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    cliente = relationship("AgendaCliente", back_populates="lista_espera", lazy="joined")
    servico = relationship("Servico", back_populates="lista_espera", lazy="joined")
