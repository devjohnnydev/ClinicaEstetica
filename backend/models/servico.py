from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class Servico(Base):
    __tablename__ = "servicos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    categoria = Column(String, nullable=False, default="estetica")  # estetica | unha
    preco = Column(Float, nullable=False, default=0.0)
    duracao_minutos = Column(Integer, nullable=False, default=60)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    agendamentos = relationship("Agendamento", back_populates="servico")
    profissionais = relationship(
        "Profissional",
        secondary="profissional_servicos",
        back_populates="servicos",
        lazy="joined",
    )
    lista_espera = relationship("ListaEspera", back_populates="servico")
