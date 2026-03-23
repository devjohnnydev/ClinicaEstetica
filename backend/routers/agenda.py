from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, extract
from datetime import datetime, date, time, timedelta
from typing import Optional, List
import pytz

from database import get_db
from models.user import User
from models.paciente import Paciente
from models.agenda_cliente import AgendaCliente
from models.servico import Servico
from models.profissional import Profissional, ProfissionalServico
from models.agendamento import Agendamento
from models.bloqueio_horario import BloqueioHorario
from models.lista_espera import ListaEspera
from services.auth import get_current_user
from schemas.agenda import (
    AgendaClienteCreate, AgendaClienteUpdate, AgendaClienteResponse,
    ServicoCreate, ServicoUpdate, ServicoResponse,
    ProfissionalCreate, ProfissionalUpdate, ProfissionalResponse, ProfissionalServicoIds,
    AgendamentoCreate, AgendamentoUpdate, AgendamentoResponse,
    BloqueioCreate, BloqueioResponse,
    ListaEsperaCreate, ListaEsperaUpdate, ListaEsperaResponse,
)

router = APIRouter(prefix="/api/agenda", tags=["agenda"])
BRAZIL_TZ = pytz.timezone("America/Sao_Paulo")


def now_br():
    return datetime.now(BRAZIL_TZ)


# ═══════════════════════════════════════════════════════════════════
# AGENDAMENTOS
# ═══════════════════════════════════════════════════════════════════

@router.get("/agendamentos", response_model=List[AgendamentoResponse])
def listar_agendamentos(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    profissional_id: Optional[int] = None,
    status: Optional[str] = None,
    cliente_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Agendamento)
    if data_inicio:
        q = q.filter(Agendamento.data >= data_inicio)
    if data_fim:
        q = q.filter(Agendamento.data <= data_fim)
    if profissional_id:
        q = q.filter(Agendamento.profissional_id == profissional_id)
    if status:
        q = q.filter(Agendamento.status == status)
    if cliente_id:
        q = q.filter(Agendamento.agenda_cliente_id == cliente_id)
    return q.order_by(Agendamento.data, Agendamento.hora_inicio).all()


@router.get("/agendamentos/{agendamento_id}", response_model=AgendamentoResponse)
def obter_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ag = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")
    return ag


@router.post("/agendamentos", response_model=AgendamentoResponse)
def criar_agendamento(
    payload: AgendamentoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate client exists
    cliente = db.query(AgendaCliente).filter(AgendaCliente.id == payload.agenda_cliente_id).first()
    if not cliente:
        raise HTTPException(404, "Cliente não encontrado")

    # Validate service exists
    servico = db.query(Servico).filter(Servico.id == payload.servico_id).first()
    if not servico:
        raise HTTPException(404, "Serviço não encontrado")

    # Validate professional exists
    prof = db.query(Profissional).filter(Profissional.id == payload.profissional_id).first()
    if not prof:
        raise HTTPException(404, "Profissional não encontrado")

    # Auto-calculate hora_fim if not provided
    hora_fim = payload.hora_fim
    if not hora_fim:
        inicio_dt = datetime.combine(payload.data, payload.hora_inicio)
        fim_dt = inicio_dt + timedelta(minutes=servico.duracao_minutos)
        hora_fim = fim_dt.time()

    # Check schedule conflict with professional
    conflito = db.query(Agendamento).filter(
        Agendamento.profissional_id == payload.profissional_id,
        Agendamento.data == payload.data,
        Agendamento.status.notin_(["cancelado"]),
        Agendamento.hora_inicio < hora_fim,
        Agendamento.hora_fim > payload.hora_inicio,
    ).first()
    if conflito:
        raise HTTPException(409, "Conflito de horário com outro agendamento deste profissional")

    # Check blocked times
    bloqueio = db.query(BloqueioHorario).filter(
        BloqueioHorario.profissional_id == payload.profissional_id,
        BloqueioHorario.data == payload.data,
        BloqueioHorario.hora_inicio < hora_fim,
        BloqueioHorario.hora_fim > payload.hora_inicio,
    ).first()
    if bloqueio:
        raise HTTPException(409, f"Profissional com horário bloqueado ({bloqueio.tipo})")

    ag = Agendamento(
        agenda_cliente_id=payload.agenda_cliente_id,
        servico_id=payload.servico_id,
        profissional_id=payload.profissional_id,
        data=payload.data,
        hora_inicio=payload.hora_inicio,
        hora_fim=hora_fim,
        status=payload.status,
        observacoes=payload.observacoes,
    )
    db.add(ag)
    db.commit()
    db.refresh(ag)
    return ag


@router.put("/agendamentos/{agendamento_id}", response_model=AgendamentoResponse)
def atualizar_agendamento(
    agendamento_id: int,
    payload: AgendamentoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ag = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")

    agora = now_br()
    ag_inicio = BRAZIL_TZ.localize(datetime.combine(ag.data, ag.hora_inicio))

    # If trying to reschedule (change date/time), must be at least 10 min before
    if payload.data is not None or payload.hora_inicio is not None:
        if agora >= ag_inicio - timedelta(minutes=10):
            raise HTTPException(400, "Reagendamento permitido apenas até 10 minutos antes do horário")

    update_data = payload.dict(exclude_unset=True)

    # Recalculate hora_fim if hora_inicio changes and hora_fim not provided
    if "hora_inicio" in update_data and "hora_fim" not in update_data:
        servico = db.query(Servico).filter(Servico.id == (update_data.get("servico_id") or ag.servico_id)).first()
        if servico:
            new_data = update_data.get("data") or ag.data
            inicio_dt = datetime.combine(new_data, update_data["hora_inicio"])
            fim_dt = inicio_dt + timedelta(minutes=servico.duracao_minutos)
            update_data["hora_fim"] = fim_dt.time()

    # Check conflict if date/time/professional changed
    if any(k in update_data for k in ("data", "hora_inicio", "hora_fim", "profissional_id")):
        check_data = update_data.get("data") or ag.data
        check_inicio = update_data.get("hora_inicio") or ag.hora_inicio
        check_fim = update_data.get("hora_fim") or ag.hora_fim
        check_prof = update_data.get("profissional_id") or ag.profissional_id

        conflito = db.query(Agendamento).filter(
            Agendamento.id != ag.id,
            Agendamento.profissional_id == check_prof,
            Agendamento.data == check_data,
            Agendamento.status.notin_(["cancelado"]),
            Agendamento.hora_inicio < check_fim,
            Agendamento.hora_fim > check_inicio,
        ).first()
        if conflito:
            raise HTTPException(409, "Conflito de horário com outro agendamento")

    for key, value in update_data.items():
        setattr(ag, key, value)
    db.commit()
    db.refresh(ag)
    return ag


@router.post("/agendamentos/{agendamento_id}/cancelar", response_model=AgendamentoResponse)
def cancelar_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ag = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")

    agora = now_br()
    ag_inicio = BRAZIL_TZ.localize(datetime.combine(ag.data, ag.hora_inicio))

    if agora >= ag_inicio:
        raise HTTPException(400, "Não é possível cancelar após o horário de início. Use 'Não compareceu'.")

    ag.status = "cancelado"
    db.commit()
    db.refresh(ag)
    return ag


@router.post("/agendamentos/{agendamento_id}/nao-compareceu", response_model=AgendamentoResponse)
def nao_compareceu(
    agendamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ag = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")

    ag.status = "nao_compareceu"
    db.commit()
    db.refresh(ag)
    return ag


@router.post("/agendamentos/{agendamento_id}/concluir", response_model=AgendamentoResponse)
def concluir_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ag = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")

    ag.status = "concluido"
    db.commit()
    db.refresh(ag)
    return ag


@router.post("/agendamentos/auto-concluir")
def auto_concluir(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Batch auto-complete past appointments that have no terminal status."""
    agora = now_br()
    hoje = agora.date()
    hora_atual = agora.time()

    # Appointments from past days
    passados = db.query(Agendamento).filter(
        Agendamento.status.in_(["agendado", "confirmado"]),
        Agendamento.data < hoje,
    ).all()

    # Appointments from today that already ended
    hoje_passados = db.query(Agendamento).filter(
        Agendamento.status.in_(["agendado", "confirmado"]),
        Agendamento.data == hoje,
        Agendamento.hora_fim <= hora_atual,
    ).all()

    total = 0
    for ag in passados + hoje_passados:
        ag.status = "concluido"
        total += 1

    db.commit()
    return {"message": f"{total} agendamentos auto-concluídos"}


# ═══════════════════════════════════════════════════════════════════
# CLIENTES DA AGENDA
# ═══════════════════════════════════════════════════════════════════

@router.get("/clientes", response_model=List[AgendaClienteResponse])
def listar_clientes(
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AgendaCliente)
    if busca:
        q = q.filter(
            or_(
                AgendaCliente.nome.ilike(f"%{busca}%"),
                AgendaCliente.telefone.ilike(f"%{busca}%"),
                AgendaCliente.email.ilike(f"%{busca}%"),
            )
        )
    return q.order_by(AgendaCliente.nome).all()


@router.post("/clientes", response_model=AgendaClienteResponse)
def criar_cliente(
    payload: AgendaClienteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cliente = AgendaCliente(**payload.dict())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.get("/clientes/{cliente_id}", response_model=AgendaClienteResponse)
def obter_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(AgendaCliente).filter(AgendaCliente.id == cliente_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    return c


@router.put("/clientes/{cliente_id}", response_model=AgendaClienteResponse)
def atualizar_cliente(
    cliente_id: int,
    payload: AgendaClienteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(AgendaCliente).filter(AgendaCliente.id == cliente_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(c, key, value)
    db.commit()
    db.refresh(c)
    return c


@router.get("/clientes/{cliente_id}/agendamentos", response_model=List[AgendamentoResponse])
def agendamentos_do_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Agendamento)
        .filter(Agendamento.agenda_cliente_id == cliente_id)
        .order_by(Agendamento.data.desc(), Agendamento.hora_inicio.desc())
        .all()
    )


@router.get("/pacientes-disponiveis")
def pacientes_disponiveis(
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return pacientes (from anamnese) that can be linked to agenda clients."""
    q = db.query(Paciente)
    if busca:
        q = q.filter(Paciente.nome.ilike(f"%{busca}%"))
    pacientes = q.order_by(Paciente.nome).limit(50).all()
    return [
        {
            "id": p.id,
            "nome": p.nome,
            "cpf": p.cpf,
            "telefone": p.telefone,
            "data_nascimento": str(p.data_nascimento) if p.data_nascimento else None,
            "email": p.email,
        }
        for p in pacientes
    ]


# ═══════════════════════════════════════════════════════════════════
# SERVIÇOS
# ═══════════════════════════════════════════════════════════════════

@router.get("/servicos", response_model=List[ServicoResponse])
def listar_servicos(
    apenas_ativos: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Servico)
    if apenas_ativos:
        q = q.filter(Servico.ativo == True)
    return q.order_by(Servico.categoria, Servico.nome).all()


@router.post("/servicos", response_model=ServicoResponse)
def criar_servico(
    payload: ServicoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    servico = Servico(**payload.dict())
    db.add(servico)
    db.commit()
    db.refresh(servico)
    return servico


@router.put("/servicos/{servico_id}", response_model=ServicoResponse)
def atualizar_servico(
    servico_id: int,
    payload: ServicoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Servico).filter(Servico.id == servico_id).first()
    if not s:
        raise HTTPException(404, "Serviço não encontrado")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(s, key, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/servicos/{servico_id}")
def deletar_servico(
    servico_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Servico).filter(Servico.id == servico_id).first()
    if not s:
        raise HTTPException(404, "Serviço não encontrado")
    # Soft delete — just deactivate
    s.ativo = False
    db.commit()
    return {"message": "Serviço desativado"}


# ═══════════════════════════════════════════════════════════════════
# PROFISSIONAIS
# ═══════════════════════════════════════════════════════════════════

@router.get("/profissionais", response_model=List[ProfissionalResponse])
def listar_profissionais(
    apenas_ativos: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Profissional)
    if apenas_ativos:
        q = q.filter(Profissional.ativo == True)
    return q.order_by(Profissional.nome).all()


@router.post("/profissionais", response_model=ProfissionalResponse)
def criar_profissional(
    payload: ProfissionalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prof = Profissional(**payload.dict())
    db.add(prof)
    db.commit()
    db.refresh(prof)
    return prof


@router.put("/profissionais/{prof_id}", response_model=ProfissionalResponse)
def atualizar_profissional(
    prof_id: int,
    payload: ProfissionalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Profissional).filter(Profissional.id == prof_id).first()
    if not p:
        raise HTTPException(404, "Profissional não encontrado")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p


@router.post("/profissionais/{prof_id}/servicos", response_model=ProfissionalResponse)
def vincular_servicos(
    prof_id: int,
    payload: ProfissionalServicoIds,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Profissional).filter(Profissional.id == prof_id).first()
    if not p:
        raise HTTPException(404, "Profissional não encontrado")

    servicos = db.query(Servico).filter(Servico.id.in_(payload.servico_ids)).all()
    p.servicos = servicos
    db.commit()
    db.refresh(p)
    return p


# ═══════════════════════════════════════════════════════════════════
# BLOQUEIOS DE HORÁRIO
# ═══════════════════════════════════════════════════════════════════

@router.get("/bloqueios", response_model=List[BloqueioResponse])
def listar_bloqueios(
    profissional_id: Optional[int] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(BloqueioHorario)
    if profissional_id:
        q = q.filter(BloqueioHorario.profissional_id == profissional_id)
    if data_inicio:
        q = q.filter(BloqueioHorario.data >= data_inicio)
    if data_fim:
        q = q.filter(BloqueioHorario.data <= data_fim)
    return q.order_by(BloqueioHorario.data, BloqueioHorario.hora_inicio).all()


@router.post("/bloqueios", response_model=BloqueioResponse)
def criar_bloqueio(
    payload: BloqueioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bloqueio = BloqueioHorario(**payload.dict())
    db.add(bloqueio)
    db.commit()
    db.refresh(bloqueio)
    return bloqueio


@router.delete("/bloqueios/{bloqueio_id}")
def deletar_bloqueio(
    bloqueio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(BloqueioHorario).filter(BloqueioHorario.id == bloqueio_id).first()
    if not b:
        raise HTTPException(404, "Bloqueio não encontrado")
    db.delete(b)
    db.commit()
    return {"message": "Bloqueio removido"}


# ═══════════════════════════════════════════════════════════════════
# LISTA DE ESPERA
# ═══════════════════════════════════════════════════════════════════

@router.get("/lista-espera", response_model=List[ListaEsperaResponse])
def listar_lista_espera(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ListaEspera)
    if status_filter:
        q = q.filter(ListaEspera.status == status_filter)
    else:
        q = q.filter(ListaEspera.status == "aguardando")
    return q.order_by(ListaEspera.created_at.desc()).all()


@router.post("/lista-espera", response_model=ListaEsperaResponse)
def criar_lista_espera(
    payload: ListaEsperaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    le = ListaEspera(**payload.dict())
    db.add(le)
    db.commit()
    db.refresh(le)
    return le


@router.put("/lista-espera/{le_id}", response_model=ListaEsperaResponse)
def atualizar_lista_espera(
    le_id: int,
    payload: ListaEsperaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    le = db.query(ListaEspera).filter(ListaEspera.id == le_id).first()
    if not le:
        raise HTTPException(404, "Item não encontrado na lista de espera")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(le, key, value)
    db.commit()
    db.refresh(le)
    return le


@router.delete("/lista-espera/{le_id}")
def deletar_lista_espera(
    le_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    le = db.query(ListaEspera).filter(ListaEspera.id == le_id).first()
    if not le:
        raise HTTPException(404, "Item não encontrado na lista de espera")
    db.delete(le)
    db.commit()
    return {"message": "Item removido da lista de espera"}


@router.post("/lista-espera/{le_id}/agendar", response_model=AgendamentoResponse)
def agendar_da_lista_espera(
    le_id: int,
    payload: AgendamentoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Promote a waiting-list entry to a real appointment."""
    le = db.query(ListaEspera).filter(ListaEspera.id == le_id).first()
    if not le:
        raise HTTPException(404, "Item não encontrado na lista de espera")

    # Use the create logic for the appointment
    servico = db.query(Servico).filter(Servico.id == payload.servico_id).first()
    hora_fim = payload.hora_fim
    if not hora_fim and servico:
        inicio_dt = datetime.combine(payload.data, payload.hora_inicio)
        fim_dt = inicio_dt + timedelta(minutes=servico.duracao_minutos)
        hora_fim = fim_dt.time()

    # Check conflict
    conflito = db.query(Agendamento).filter(
        Agendamento.profissional_id == payload.profissional_id,
        Agendamento.data == payload.data,
        Agendamento.status.notin_(["cancelado"]),
        Agendamento.hora_inicio < hora_fim,
        Agendamento.hora_fim > payload.hora_inicio,
    ).first()
    if conflito:
        raise HTTPException(409, "Conflito de horário")

    ag = Agendamento(
        agenda_cliente_id=payload.agenda_cliente_id,
        servico_id=payload.servico_id,
        profissional_id=payload.profissional_id,
        data=payload.data,
        hora_inicio=payload.hora_inicio,
        hora_fim=hora_fim,
        status=payload.status,
        observacoes=payload.observacoes,
    )
    db.add(ag)

    le.status = "agendado"
    db.commit()
    db.refresh(ag)
    return ag


# ═══════════════════════════════════════════════════════════════════
# DASHBOARD & ANIVERSARIANTES
# ═══════════════════════════════════════════════════════════════════

@router.get("/dashboard")
def dashboard_agenda(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hoje = now_br().date()

    total_hoje = db.query(Agendamento).filter(
        Agendamento.data == hoje,
        Agendamento.status.notin_(["cancelado"]),
    ).count()

    confirmados = db.query(Agendamento).filter(
        Agendamento.data == hoje,
        Agendamento.status == "confirmado",
    ).count()

    concluidos = db.query(Agendamento).filter(
        Agendamento.data == hoje,
        Agendamento.status == "concluido",
    ).count()

    aguardando_espera = db.query(ListaEspera).filter(
        ListaEspera.status == "aguardando",
    ).count()

    # Birthday people this month
    aniversariantes = _get_aniversariantes(db, hoje.month)

    return {
        "total_hoje": total_hoje,
        "confirmados": confirmados,
        "concluidos": concluidos,
        "aguardando_espera": aguardando_espera,
        "aniversariantes": aniversariantes,
    }


@router.get("/aniversariantes")
def aniversariantes_do_mes(
    mes: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if mes is None:
        mes = now_br().month
    return _get_aniversariantes(db, mes)


def _get_aniversariantes(db: Session, mes: int):
    clientes = db.query(AgendaCliente).filter(
        AgendaCliente.data_nascimento.isnot(None),
        extract("month", AgendaCliente.data_nascimento) == mes,
    ).all()
    return [
        {
            "id": c.id,
            "nome": c.nome,
            "telefone": c.telefone,
            "data_nascimento": str(c.data_nascimento) if c.data_nascimento else None,
            "dia": c.data_nascimento.day if c.data_nascimento else None,
        }
        for c in clientes
    ]


# ═══════════════════════════════════════════════════════════════════
# CONFIRMAÇÃO AUTOMÁTICA (PLACEHOLDER)
# ═══════════════════════════════════════════════════════════════════

@router.get("/pendentes-confirmacao")
def pendentes_confirmacao(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return appointments that need 24h WhatsApp confirmation message."""
    agora = now_br()
    amanha = (agora + timedelta(days=1)).date()

    pendentes = db.query(Agendamento).filter(
        Agendamento.data == amanha,
        Agendamento.status == "agendado",
    ).all()

    return [
        {
            "id": ag.id,
            "cliente_nome": ag.cliente.nome if ag.cliente else "—",
            "cliente_telefone": ag.cliente.telefone if ag.cliente else "—",
            "servico_nome": ag.servico.nome if ag.servico else "—",
            "data": str(ag.data),
            "hora_inicio": str(ag.hora_inicio),
            "mensagem": (
                f"Olá {ag.cliente.nome if ag.cliente else ''}! 💆‍♀️\n"
                f"Lembrete do seu horário amanhã:\n"
                f"📅 {ag.data.strftime('%d/%m/%Y')}\n"
                f"🕐 {ag.hora_inicio.strftime('%H:%M')}\n"
                f"💅 {ag.servico.nome if ag.servico else ''}\n\n"
                f"Por favor, confirme sua presença respondendo esta mensagem. ✨"
            ),
        }
        for ag in pendentes
    ]


@router.post("/agendamentos/{agendamento_id}/confirmar", response_model=AgendamentoResponse)
def confirmar_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ag = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")
    ag.status = "confirmado"
    db.commit()
    db.refresh(ag)
    return ag
