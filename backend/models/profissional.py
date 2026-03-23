from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


# Association table N:N between Profissional and Servico
ProfissionalServico = Table(
    "profissional_servicos",
    Base.metadata,
    Column("profissional_id", Integer, ForeignKey("profissionais.id"), primary_key=True),
    Column("servico_id", Integer, ForeignKey("servicos.id"), primary_key=True),
)


class Profissional(Base):
    __tablename__ = "profissionais"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    especialidade = Column(String, nullable=True)
    telefone = Column(String(20), nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    servicos = relationship(
        "Servico",
        secondary="profissional_servicos",
        back_populates="profissionais",
        lazy="joined",
    )
    agendamentos = relationship("Agendamento", back_populates="profissional")
    bloqueios = relationship("BloqueioHorario", back_populates="profissional")
