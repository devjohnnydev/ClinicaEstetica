from sqlalchemy import Column, Integer, String, Date, Text, DateTime
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class Paciente(Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    cpf = Column(String(14), unique=True, nullable=False)
    telefone = Column(String(20), nullable=False)
    data_nascimento = Column(Date, nullable=False)
    historico_saude = Column(Text, nullable=True)
    endereco = Column(String, nullable=True)
    email = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    anamneses = relationship("Anamnese", back_populates="paciente", order_by="desc(Anamnese.created_at)")
