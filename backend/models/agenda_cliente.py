from sqlalchemy import Column, Integer, String, Date, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class AgendaCliente(Base):
    __tablename__ = "agenda_clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    telefone = Column(String(20), nullable=False)
    email = Column(String, nullable=True)
    data_nascimento = Column(Date, nullable=True)
    observacoes = Column(Text, nullable=True)
    # Vínculo opcional com paciente da anamnese
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    paciente = relationship("Paciente", backref="agenda_cliente", lazy="joined")
    agendamentos = relationship("Agendamento", back_populates="cliente", order_by="desc(Agendamento.data)")
    lista_espera = relationship("ListaEspera", back_populates="cliente")
