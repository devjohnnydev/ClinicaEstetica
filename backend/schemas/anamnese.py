from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any


class RespostaCreate(BaseModel):
    campo_id: int
    valor: Any = None


class RespostaResponse(BaseModel):
    id: int
    campo_id: int
    valor: Any = None
    campo_label: Optional[str] = None
    campo_tipo: Optional[str] = None

    class Config:
        from_attributes = True


class AssinaturaResponse(BaseModel):
    id: int
    tipo: str
    imagem_path: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnexoResponse(BaseModel):
    id: int
    tipo: str
    arquivo_path: str
    descricao: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnamneseCreate(BaseModel):
    paciente_id: int
    modelo_id: int
    respostas: List[RespostaCreate]
    assinatura_base64: str  # Base64 encoded signature


class AnamneseFinalizarRequest(BaseModel):
    observacoes: Optional[str] = None
    assinatura_final_base64: str  # Base64 encoded final signature


class AnameseSalvarProgressoRequest(BaseModel):
    observacoes: Optional[str] = None
    assinatura_final_base64: Optional[str] = None  # Optional — save signature without finalizing


class AnamneseListResponse(BaseModel):
    id: int
    paciente_id: int
    modelo_id: int
    status: str
    nome_procedimento: Optional[str] = None
    created_at: Optional[datetime] = None
    finalizada_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnamneseDetailResponse(BaseModel):
    id: int
    paciente_id: int
    modelo_id: int
    status: str
    observacoes: Optional[str] = None
    created_at: Optional[datetime] = None
    finalizada_at: Optional[datetime] = None
    paciente_nome: Optional[str] = None
    nome_procedimento: Optional[str] = None
    respostas: List[RespostaResponse] = []
    assinaturas: List[AssinaturaResponse] = []
    anexos: List[AnexoResponse] = []

    class Config:
        from_attributes = True
