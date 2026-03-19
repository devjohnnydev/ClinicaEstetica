from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any


class CampoModeloBase(BaseModel):
    tipo: str  # texto, input, multipla_escolha, escolha_unica, select, checkbox, data, upload_imagem
    label: str
    placeholder: Optional[str] = None
    opcoes: Optional[List[str]] = None
    ordem: int = 0
    obrigatorio: bool = False


class CampoModeloCreate(CampoModeloBase):
    pass


class CampoModeloResponse(CampoModeloBase):
    id: int

    class Config:
        from_attributes = True


class ModeloBase(BaseModel):
    nome_procedimento: str
    descricao: Optional[str] = None


class ModeloCreate(ModeloBase):
    campos: List[CampoModeloCreate]


class ModeloUpdate(BaseModel):
    nome_procedimento: Optional[str] = None
    descricao: Optional[str] = None
    campos: Optional[List[CampoModeloCreate]] = None


class ModeloResponse(ModeloBase):
    id: int
    created_at: Optional[datetime] = None
    campos: List[CampoModeloResponse] = []
    total_campos: Optional[int] = 0

    class Config:
        from_attributes = True


class ModeloListResponse(BaseModel):
    id: int
    nome_procedimento: str
    descricao: Optional[str] = None
    created_at: Optional[datetime] = None
    total_campos: int = 0

    class Config:
        from_attributes = True
