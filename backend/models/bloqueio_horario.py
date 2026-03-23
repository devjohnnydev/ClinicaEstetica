from sqlalchemy import Column, Integer, String, Date, Time, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class BloqueioHorario(Base):
    __tablename__ = "bloqueios_horario"

    id = Column(Integer, primary_key=True, index=True)
    profissional_id = Column(Integer, ForeignKey("profissionais.id"), nullable=False)
    data = Column(Date, nullable=False, index=True)
    hora_inicio = Column(Time, nullable=False)
    hora_fim = Column(Time, nullable=False)
    tipo = Column(String, nullable=False, default="ausencia")
    # tipo values: ausencia, atestado, intervalo
    motivo = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    profissional = relationship("Profissional", back_populates="bloqueios", lazy="joined")
