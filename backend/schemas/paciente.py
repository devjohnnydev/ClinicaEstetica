from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


class PacienteBase(BaseModel):
    nome: str
    cpf: str
    telefone: str
    data_nascimento: date
    historico_saude: Optional[str] = None
    endereco: Optional[str] = None
    email: Optional[str] = None


class PacienteCreate(PacienteBase):
    pass


class PacienteUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    historico_saude: Optional[str] = None
    endereco: Optional[str] = None
    email: Optional[str] = None


class PacienteResponse(PacienteBase):
    id: int
    created_at: Optional[datetime] = None
    total_anamneses: Optional[int] = 0

    class Config:
        from_attributes = True


class PacienteListResponse(BaseModel):
    id: int
    nome: str
    cpf: str
    telefone: str
    created_at: Optional[datetime] = None
    total_anamneses: Optional[int] = 0

    class Config:
        from_attributes = True
