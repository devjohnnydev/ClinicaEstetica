from pydantic import BaseModel
from datetime import date, time, datetime
from typing import Optional, List


# ─── AgendaCliente ──────────────────────────────────────────────────
class AgendaClienteCreate(BaseModel):
    nome: str
    telefone: str
    email: Optional[str] = None
    data_nascimento: Optional[date] = None
    observacoes: Optional[str] = None
    paciente_id: Optional[int] = None


class AgendaClienteUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    data_nascimento: Optional[date] = None
    observacoes: Optional[str] = None


class AgendaClienteResponse(BaseModel):
    id: int
    nome: str
    telefone: str
    email: Optional[str] = None
    data_nascimento: Optional[date] = None
    observacoes: Optional[str] = None
    paciente_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Servico ────────────────────────────────────────────────────────
class ServicoCreate(BaseModel):
    nome: str
    categoria: str = "estetica"  # estetica | unha
    preco: float = 0.0
    duracao_minutos: int = 60


class ServicoUpdate(BaseModel):
    nome: Optional[str] = None
    categoria: Optional[str] = None
    preco: Optional[float] = None
    duracao_minutos: Optional[int] = None
    ativo: Optional[bool] = None


class ServicoResponse(BaseModel):
    id: int
    nome: str
    categoria: str
    preco: float
    duracao_minutos: int
    ativo: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Profissional ──────────────────────────────────────────────────
class ProfissionalCreate(BaseModel):
    nome: str
    especialidade: Optional[str] = None
    telefone: Optional[str] = None


class ProfissionalUpdate(BaseModel):
    nome: Optional[str] = None
    especialidade: Optional[str] = None
    telefone: Optional[str] = None
    ativo: Optional[bool] = None


class ProfissionalServicoIds(BaseModel):
    servico_ids: List[int]


class ProfissionalResponse(BaseModel):
    id: int
    nome: str
    especialidade: Optional[str] = None
    telefone: Optional[str] = None
    ativo: bool
    servicos: List[ServicoResponse] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Agendamento ───────────────────────────────────────────────────
class AgendamentoCreate(BaseModel):
    agenda_cliente_id: int
    servico_id: int
    profissional_id: int
    data: date
    hora_inicio: time
    hora_fim: Optional[time] = None  # auto-calculated from service duration
    status: str = "agendado"
    observacoes: Optional[str] = None


class AgendamentoUpdate(BaseModel):
    agenda_cliente_id: Optional[int] = None
    servico_id: Optional[int] = None
    profissional_id: Optional[int] = None
    data: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None


class AgendamentoClienteNested(BaseModel):
    id: int
    nome: str
    telefone: str
    data_nascimento: Optional[date] = None

    class Config:
        from_attributes = True


class AgendamentoServicoNested(BaseModel):
    id: int
    nome: str
    categoria: str
    preco: float
    duracao_minutos: int

    class Config:
        from_attributes = True


class AgendamentoProfissionalNested(BaseModel):
    id: int
    nome: str

    class Config:
        from_attributes = True


class AgendamentoResponse(BaseModel):
    id: int
    agenda_cliente_id: int
    servico_id: int
    profissional_id: int
    data: date
    hora_inicio: time
    hora_fim: time
    status: str
    observacoes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    cliente: Optional[AgendamentoClienteNested] = None
    servico: Optional[AgendamentoServicoNested] = None
    profissional: Optional[AgendamentoProfissionalNested] = None

    class Config:
        from_attributes = True


# ─── BloqueioHorario ───────────────────────────────────────────────
class BloqueioCreate(BaseModel):
    profissional_id: int
    data: date
    hora_inicio: time
    hora_fim: time
    tipo: str = "ausencia"  # ausencia | atestado | intervalo
    motivo: Optional[str] = None


class BloqueioResponse(BaseModel):
    id: int
    profissional_id: int
    data: date
    hora_inicio: time
    hora_fim: time
    tipo: str
    motivo: Optional[str] = None
    created_at: Optional[datetime] = None
    profissional: Optional[AgendamentoProfissionalNested] = None

    class Config:
        from_attributes = True


# ─── ListaEspera ───────────────────────────────────────────────────
class ListaEsperaCreate(BaseModel):
    agenda_cliente_id: int
    servico_id: Optional[int] = None
    data_desejada: Optional[date] = None
    horario_desejado: Optional[time] = None
    observacoes: Optional[str] = None


class ListaEsperaUpdate(BaseModel):
    servico_id: Optional[int] = None
    data_desejada: Optional[date] = None
    horario_desejado: Optional[time] = None
    observacoes: Optional[str] = None
    status: Optional[str] = None


class ListaEsperaResponse(BaseModel):
    id: int
    agenda_cliente_id: int
    servico_id: Optional[int] = None
    data_desejada: Optional[date] = None
    horario_desejado: Optional[time] = None
    observacoes: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    cliente: Optional[AgendamentoClienteNested] = None
    servico: Optional[AgendamentoServicoNested] = None

    class Config:
        from_attributes = True
