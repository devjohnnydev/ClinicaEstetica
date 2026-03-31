from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


# ─── Categoria Despesa ─────────────────────────────────────────────
class CategoriaDespesaCreate(BaseModel):
    nome: str
    tipo: str = "clinica"  # clinica | pessoal
    icone: Optional[str] = None


class CategoriaDespesaUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    icone: Optional[str] = None
    ativo: Optional[bool] = None


class CategoriaDespesaResponse(BaseModel):
    id: int
    nome: str
    tipo: str
    icone: Optional[str] = None
    ativo: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Pagamento ─────────────────────────────────────────────────────
class PagamentoUpdate(BaseModel):
    valor_pago: Optional[float] = None
    forma_pagamento: Optional[str] = None
    data_pagamento: Optional[date] = None
    observacoes: Optional[str] = None


class PagamentoClienteNested(BaseModel):
    id: int
    nome: str
    telefone: str

    class Config:
        from_attributes = True


class PagamentoAgendamentoNested(BaseModel):
    id: int
    data: date
    status: str
    servico_nome: Optional[str] = None
    profissional_nome: Optional[str] = None

    class Config:
        from_attributes = True


class PagamentoResponse(BaseModel):
    id: int
    agendamento_id: Optional[int] = None
    agenda_cliente_id: int
    descricao: str
    valor_total: float
    valor_pago: float
    forma_pagamento: Optional[str] = None
    status: str
    data_atendimento: date
    data_pagamento: Optional[date] = None
    observacoes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    cliente: Optional[PagamentoClienteNested] = None

    class Config:
        from_attributes = True


# ─── Despesa ───────────────────────────────────────────────────────
class ParcelaDespesaResponse(BaseModel):
    id: int
    despesa_id: int
    numero_parcela: int
    valor: float
    data_vencimento: date
    pago: bool
    data_pagamento: Optional[date] = None

    class Config:
        from_attributes = True


class ParcelaDespesaUpdate(BaseModel):
    pago: Optional[bool] = None
    data_pagamento: Optional[date] = None


class DespesaCreate(BaseModel):
    nome: str
    categoria_id: Optional[int] = None
    categoria: str = "outros"
    tipo: str = "clinica"  # clinica | pessoal
    valor_total: float
    forma_pagamento: Optional[str] = None
    parcelas_total: int = 1
    data: date
    observacoes: Optional[str] = None


class DespesaUpdate(BaseModel):
    nome: Optional[str] = None
    categoria_id: Optional[int] = None
    categoria: Optional[str] = None
    tipo: Optional[str] = None
    valor_total: Optional[float] = None
    forma_pagamento: Optional[str] = None
    observacoes: Optional[str] = None


class DespesaResponse(BaseModel):
    id: int
    nome: str
    categoria_id: Optional[int] = None
    categoria: str
    tipo: str
    valor_total: float
    forma_pagamento: Optional[str] = None
    parcelas_total: int
    data: date
    observacoes: Optional[str] = None
    created_at: Optional[datetime] = None
    categoria_rel: Optional[CategoriaDespesaResponse] = None
    parcelas: List[ParcelaDespesaResponse] = []

    class Config:
        from_attributes = True
