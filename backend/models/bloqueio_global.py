from sqlalchemy import Column, Integer, Time, Text, Boolean, DateTime
from database import Base, get_brazil_time


class BloqueioGlobal(Base):
    """Permanent time block that applies to ALL professionals on ALL days.
    Stays active until manually disabled/removed."""
    __tablename__ = "bloqueios_globais"

    id = Column(Integer, primary_key=True, index=True)
    hora_inicio = Column(Time, nullable=False)
    hora_fim = Column(Time, nullable=False)
    motivo = Column(Text, nullable=True)
    ativo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)
