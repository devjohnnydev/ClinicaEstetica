from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, Literal


class PacienteBase(BaseModel):
    nome: str
    cpf: str
    telefone: str
    genero: Literal["masculino", "feminino"]
    data_nascimento: date
    historico_saude: Optional[str] = None
    endereco: Optional[str] = None
    email: Optional[str] = None


class PacienteCreate(PacienteBase):
    pass


class PacienteUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    genero: Optional[Literal["masculino", "feminino"]] = None
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
    genero: Literal["masculino", "feminino"]
    created_at: Optional[datetime] = None
    total_anamneses: Optional[int] = 0

    class Config:
        from_attributes = True
