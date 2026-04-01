from sqlalchemy import Column, Integer, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class ListaEsperaData(Base):
    """Stores multiple preferred dates for a waiting list entry."""
    __tablename__ = "lista_espera_datas"

    id = Column(Integer, primary_key=True, index=True)
    lista_espera_id = Column(Integer, ForeignKey("lista_espera.id", ondelete="CASCADE"), nullable=False, index=True)
    data = Column(Date, nullable=False)


class ListaEsperaHorario(Base):
    """Stores multiple preferred times for a waiting list entry."""
    __tablename__ = "lista_espera_horarios"

    id = Column(Integer, primary_key=True, index=True)
    lista_espera_id = Column(Integer, ForeignKey("lista_espera.id", ondelete="CASCADE"), nullable=False, index=True)
    horario = Column(Time, nullable=False)
