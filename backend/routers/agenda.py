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
from models.bloqueio_global import BloqueioGlobal
from models.lista_espera import ListaEspera
from models.lista_espera_detalhe import ListaEsperaData, ListaEsperaHorario
from models.pagamento import Pagamento
from services.auth import get_current_user
from schemas.agenda import (
    AgendaClienteCreate, AgendaClienteUpdate, AgendaClienteResponse,
    ServicoCreate, ServicoUpdate, ServicoResponse,
    ProfissionalCreate, ProfissionalUpdate, ProfissionalResponse, ProfissionalServicoIds,
    AgendamentoCreate, AgendamentoUpdate, AgendamentoResponse, MarcarEnviadoRequest,
    BloqueioCreate, BloqueioResponse,
    BloqueioGlobalCreate, BloqueioGlobalUpdate, BloqueioGlobalResponse,
    ListaEsperaCreate, ListaEsperaUpdate, ListaEsperaResponse,
)

router = APIRouter(prefix="/api/agenda", tags=["agenda"])
BRAZIL_TZ = pytz.timezone("America/Sao_Paulo")

# ── Operating hours: 06:00 – 23:00 ──
HORA_INICIO_GLOBAL = time(6, 0)
HORA_FIM_GLOBAL = time(23, 0)


def now_br():
    return datetime.now(BRAZIL_TZ)


def _prof_id_for_user(user: User):
    """Return profissional_id if user is a professional, else None."""
    if getattr(user, "perfil", None) == "profissional" and getattr(user, "profissional_id", None):
        return user.profissional_id
    return None


def _auto_concluir_agendamentos(db: Session):
    agora = now_br()
    hoje = agora.date()
    hora_atual = agora.time()

    # Update past days
    db.query(Agendamento).filter(
        Agendamento.status.notin_(["cancelado", "nao_compareceu", "concluido"]),
        Agendamento.data < hoje
    ).update({"status": "concluido"}, synchronize_session=False)

    # Update today past time
    db.query(Agendamento).filter(
        Agendamento.status.notin_(["cancelado", "nao_compareceu", "concluido"]),
        Agendamento.data == hoje,
        Agendamento.hora_fim != None,
        Agendamento.hora_fim <= hora_atual
    ).update({"status": "concluido"}, synchronize_session=False)
    
    db.commit()

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
    _auto_concluir_agendamentos(db)
    q = db.query(Agendamento)

    # RBAC: professionals see only their own appointments
    forced_prof = _prof_id_for_user(current_user)
    if forced_prof:
        q = q.filter(Agendamento.profissional_id == forced_prof)
    elif profissional_id:
        q = q.filter(Agendamento.profissional_id == profissional_id)

    if data_inicio:
        q = q.filter(Agendamento.data >= data_inicio)
    if data_fim:
        q = q.filter(Agendamento.data <= data_fim)
    if status:
        q = q.filter(Agendamento.status == status)
    if cliente_id:
        q = q.filter(Agendamento.agenda_cliente_id == cliente_id)
    return q.order_by(Agendamento.data, Agendamento.hora_inicio).all()


@router.get("/agendamentos/amanha")
def get_agendamentos_amanha(
    db: Session = Depends(get_db)
):
    """Retorna agendamentos de amanhã que ainda não tiveram o WhatsApp de confirmação enviado."""
    amanha = now_br().date() + timedelta(days=1)
    
    agendamentos = db.query(Agendamento).filter(
        Agendamento.data == amanha,
        Agendamento.status.in_(["agendado", "confirmado"]),
        Agendamento.confirmacao_enviada == False
    ).all()
    
    return [
        {
            "id": ag.id,
            "nome_cliente": ag.cliente.nome if ag.cliente else "Cliente",
            "telefone": ag.cliente.telefone if ag.cliente else "",
            "data_agendamento": str(ag.data),
            "hora_agendamento": str(ag.hora_inicio)[:5],
            "profissional": ag.profissional.nome if ag.profissional else "Profissional",
            "procedimento": ag.servico.nome if ag.servico else "Procedimento",
            "confirmacao_enviada": ag.confirmacao_enviada
        }
        for ag in agendamentos
    ]

@router.post("/agendamentos/marcar-enviado")
def marcar_enviado(
    payload: MarcarEnviadoRequest,
    db: Session = Depends(get_db)
):
    ag = db.query(Agendamento).filter(Agendamento.id == payload.id).first()
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")
    ag.confirmacao_enviada = True
    db.commit()
    return {"message": "Marcado como enviado"}


@router.get("/agendamentos/{agendamento_id}", response_model=AgendamentoResponse)
def obter_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _auto_concluir_agendamentos(db)
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

    # Check global blocks
    bloqueio_global = db.query(BloqueioGlobal).filter(
        BloqueioGlobal.ativo == True,
        BloqueioGlobal.hora_inicio < hora_fim,
        BloqueioGlobal.hora_fim > payload.hora_inicio,
    ).first()
    if bloqueio_global:
        raise HTTPException(409, f"Horário bloqueado globalmente ({bloqueio_global.motivo or 'Bloqueio global'})")

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
    db.flush()

    # Auto-create pending payment
    pagamento = Pagamento(
        agendamento_id=ag.id,
        agenda_cliente_id=payload.agenda_cliente_id,
        descricao=f"{servico.nome} - {cliente.nome}",
        valor_total=servico.preco,
        valor_pago=0.0,
        status="pendente",
        data_atendimento=payload.data,
    )
    db.add(pagamento)
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

    # Time restrictions for rescheduling have been removed.

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
    if ag.status == "cancelado":
        raise HTTPException(400, "Agendamento já está cancelado")
    ag.status = "cancelado"

    # Delete associated payment
    pag = db.query(Pagamento).filter(Pagamento.agendamento_id == ag.id).first()
    if pag:
        db.delete(pag)

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


@router.post("/agendamentos/{agendamento_id}/em-atendimento", response_model=AgendamentoResponse)
def em_atendimento(
    agendamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ag = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")
    ag.status = "em_atendimento"
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
        Agendamento.status.in_(["agendado", "confirmado", "em_atendimento"]),
        Agendamento.data < hoje,
    ).all()

    # Appointments from today that already ended
    hoje_passados = db.query(Agendamento).filter(
        Agendamento.status.in_(["agendado", "confirmado", "em_atendimento"]),
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
    from services.auth import get_password_hash

    # Exclude non-model fields from dict
    prof_data = payload.dict(exclude={"senha"})
    user_id = None

    # Auto-create a User login if email is provided
    if payload.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            user_id = existing.id
        else:
            # Use provided password or fallback to first_name + 123
            password = payload.senha
            if not password:
                first_name = payload.nome.strip().split()[0].lower()
                password = f"{first_name}123"
            new_user = User(
                email=payload.email,
                password_hash=get_password_hash(password),
                nome=payload.nome,
                perfil="profissional",
            )
            db.add(new_user)
            db.flush()
            user_id = new_user.id

    prof = Profissional(**prof_data, user_id=user_id)
    db.add(prof)
    db.flush()

    # Link the user back to the professional
    if user_id:
        user_obj = db.query(User).filter(User.id == user_id).first()
        if user_obj:
            user_obj.profissional_id = prof.id
            user_obj.perfil = "profissional"

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

    # RBAC: professionals see only their own blocks
    forced_prof = _prof_id_for_user(current_user)
    if forced_prof:
        q = q.filter(BloqueioHorario.profissional_id == forced_prof)
    elif profissional_id:
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


# ─── Bloqueios Globais ─────────────────────────────────────────────

@router.get("/bloqueios-globais", response_model=List[BloqueioGlobalResponse])
def listar_bloqueios_globais(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(BloqueioGlobal).order_by(BloqueioGlobal.hora_inicio).all()


@router.post("/bloqueios-globais", response_model=BloqueioGlobalResponse)
def criar_bloqueio_global(
    payload: BloqueioGlobalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bg = BloqueioGlobal(**payload.dict())
    db.add(bg)
    db.commit()
    db.refresh(bg)
    return bg


@router.put("/bloqueios-globais/{bg_id}", response_model=BloqueioGlobalResponse)
def atualizar_bloqueio_global(
    bg_id: int,
    payload: BloqueioGlobalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bg = db.query(BloqueioGlobal).filter(BloqueioGlobal.id == bg_id).first()
    if not bg:
        raise HTTPException(404, "Bloqueio global não encontrado")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(bg, key, value)
    db.commit()
    db.refresh(bg)
    return bg


@router.delete("/bloqueios-globais/{bg_id}")
def deletar_bloqueio_global(
    bg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bg = db.query(BloqueioGlobal).filter(BloqueioGlobal.id == bg_id).first()
    if not bg:
        raise HTTPException(404, "Bloqueio global não encontrado")
    db.delete(bg)
    db.commit()
    return {"message": "Bloqueio global removido"}


# ═══════════════════════════════════════════════════════════════════
# LISTA DE ESPERA
# ═══════════════════════════════════════════════════════════════════

@router.get("/lista-espera", response_model=List[ListaEsperaResponse])
def listar_lista_espera(
    status_filter: Optional[str] = None,
    cliente_id: Optional[int] = None,
    servico_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ListaEspera)
    if status_filter:
        q = q.filter(ListaEspera.status == status_filter)
    else:
        q = q.filter(ListaEspera.status.in_(["aguardando"]))
    if cliente_id:
        q = q.filter(ListaEspera.agenda_cliente_id == cliente_id)
    if servico_id:
        q = q.filter(ListaEspera.servico_id == servico_id)
    return q.order_by(ListaEspera.created_at.desc()).all()


@router.post("/lista-espera", response_model=ListaEsperaResponse)
def criar_lista_espera(
    payload: ListaEsperaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    le = ListaEspera(
        agenda_cliente_id=payload.agenda_cliente_id,
        servico_id=payload.servico_id,
        data_desejada=payload.data_desejada,
        horario_desejado=payload.horario_desejado,
        observacoes=payload.observacoes,
    )
    db.add(le)
    db.flush()

    # Save multiple preferred dates
    for d in payload.datas_preferidas:
        db.add(ListaEsperaData(lista_espera_id=le.id, data=d))

    # Save multiple preferred times
    for h in payload.horarios_preferidos:
        try:
            parts = h.replace(":", " ").split()
            t = time(int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
            db.add(ListaEsperaHorario(lista_espera_id=le.id, horario=t))
        except (ValueError, IndexError):
            pass

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

    update_data = payload.dict(exclude_unset=True)

    # Handle multi-dates update
    if "datas_preferidas" in update_data:
        datas_novas = update_data.pop("datas_preferidas")
        if datas_novas is not None:
            db.query(ListaEsperaData).filter(ListaEsperaData.lista_espera_id == le.id).delete()
            for d in datas_novas:
                db.add(ListaEsperaData(lista_espera_id=le.id, data=d))

    # Handle multi-times update
    if "horarios_preferidos" in update_data:
        horarios_novos = update_data.pop("horarios_preferidos")
        if horarios_novos is not None:
            db.query(ListaEsperaHorario).filter(ListaEsperaHorario.lista_espera_id == le.id).delete()
            for h in horarios_novos:
                try:
                    parts = h.replace(":", " ").split()
                    t = time(int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
                    db.add(ListaEsperaHorario(lista_espera_id=le.id, horario=t))
                except (ValueError, IndexError):
                    pass

    for key, value in update_data.items():
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


@router.post("/lista-espera/{le_id}/resolver")
def resolver_lista_espera(
    le_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    le = db.query(ListaEspera).filter(ListaEspera.id == le_id).first()
    if not le:
        raise HTTPException(404, "Item não encontrado na lista de espera")
    le.status = "resolvido"
    db.commit()
    return {"message": "Item marcado como resolvido"}


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
# MOTOR DE ANÁLISE — Matching engine for waiting list
# ═══════════════════════════════════════════════════════════════════

def _time_to_minutes(t):
    """Converts time object to total minutes."""
    if isinstance(t, str):
        parts = t.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    return t.hour * 60 + t.minute


@router.get("/lista-espera/analise")
def analise_lista_espera(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Intelligent analysis engine: cross-references ALL waiting list items
    with the ENTIRE schedule to find available slots.
    Does NOT auto-schedule. Only reports opportunities."""

    items = db.query(ListaEspera).filter(
        ListaEspera.status == "aguardando"
    ).all()

    if not items:
        return {"items": [], "total": 0, "com_vaga": 0, "sem_vaga": 0}

    # Get all active professionals
    profissionais = db.query(Profissional).filter(Profissional.ativo == True).all()
    # Get all active global blocks
    bloqueios_globais = db.query(BloqueioGlobal).filter(BloqueioGlobal.ativo == True).all()

    # Define operating range in minutes
    op_start = _time_to_minutes(HORA_INICIO_GLOBAL)
    op_end = _time_to_minutes(HORA_FIM_GLOBAL)

    results = []
    com_vaga_count = 0

    for le in items:
        # Determine which dates to check
        check_dates = set()

        # From multi-date relations
        for d_obj in le.datas:
            check_dates.add(d_obj.data)

        # From legacy single date
        if le.data_desejada:
            check_dates.add(le.data_desejada)

        # If no dates specified, check next 30 days
        if not check_dates:
            hoje = now_br().date()
            for i in range(30):
                check_dates.add(hoje + timedelta(days=i))

        # Get service duration (default 60 min if unknown)
        duracao = 60
        if le.servico_id:
            srv = le.servico
            if srv:
                duracao = srv.duracao_minutos

        # Find available slots across all checked dates
        disponibilidades = []

        for check_date in sorted(check_dates):
            # Get all appointments for this date (non-cancelled)
            day_ags = db.query(Agendamento).filter(
                Agendamento.data == check_date,
                Agendamento.status.notin_(["cancelado"]),
            ).all()

            # Get all blocks for this date
            day_blocks = db.query(BloqueioHorario).filter(
                BloqueioHorario.data == check_date,
            ).all()

            # For each professional, find free slots
            for prof in profissionais:
                # Build occupied intervals for this professional on this date
                occupied = []

                # Regular appointments
                for ag in day_ags:
                    if ag.profissional_id == prof.id:
                        occupied.append((
                            _time_to_minutes(ag.hora_inicio),
                            _time_to_minutes(ag.hora_fim),
                        ))

                # Individual blocks
                for bl in day_blocks:
                    if bl.profissional_id == prof.id:
                        occupied.append((
                            _time_to_minutes(bl.hora_inicio),
                            _time_to_minutes(bl.hora_fim),
                        ))

                # Global blocks
                for gb in bloqueios_globais:
                    occupied.append((
                        _time_to_minutes(gb.hora_inicio),
                        _time_to_minutes(gb.hora_fim),
                    ))

                # Sort occupied intervals
                occupied.sort()

                # Find free slots that can fit the procedure duration
                free_slots = []
                cursor = op_start

                for occ_start, occ_end in occupied:
                    if occ_start > cursor:
                        gap = occ_start - cursor
                        if gap >= duracao:
                            free_slots.append({
                                "inicio": f"{cursor // 60:02d}:{cursor % 60:02d}",
                                "fim": f"{occ_start // 60:02d}:{occ_start % 60:02d}",
                            })
                    cursor = max(cursor, occ_end)

                # Check gap after last occupied slot
                if cursor < op_end:
                    gap = op_end - cursor
                    if gap >= duracao:
                        free_slots.append({
                            "inicio": f"{cursor // 60:02d}:{cursor % 60:02d}",
                            "fim": f"{op_end // 60:02d}:{op_end % 60:02d}",
                        })

                if free_slots:
                    disponibilidades.append({
                        "data": str(check_date),
                        "profissional_id": prof.id,
                        "profissional_nome": prof.nome,
                        "horarios_livres": free_slots,
                    })

        tem_vaga = len(disponibilidades) > 0
        if tem_vaga:
            com_vaga_count += 1

        # Serialize the item
        item_data = {
            "id": le.id,
            "agenda_cliente_id": le.agenda_cliente_id,
            "cliente_nome": le.cliente.nome if le.cliente else "—",
            "cliente_telefone": le.cliente.telefone if le.cliente else "",
            "servico_id": le.servico_id,
            "servico_nome": le.servico.nome if le.servico else "Qualquer serviço",
            "servico_duracao": duracao,
            "data_desejada": str(le.data_desejada) if le.data_desejada else None,
            "horario_desejado": str(le.horario_desejado)[:5] if le.horario_desejado else None,
            "datas_preferidas": [str(d.data) for d in le.datas],
            "horarios_preferidos": [str(h.horario)[:5] for h in le.horarios],
            "observacoes": le.observacoes,
            "status": le.status,
            "created_at": str(le.created_at) if le.created_at else None,
            "tem_vaga": tem_vaga,
            "disponibilidades": disponibilidades[:10],  # Limit to avoid huge payloads
        }
        results.append(item_data)

    return {
        "items": results,
        "total": len(results),
        "com_vaga": com_vaga_count,
        "sem_vaga": len(results) - com_vaga_count,
    }


# ═══════════════════════════════════════════════════════════════════
# DASHBOARD & ANIVERSARIANTES
# ═══════════════════════════════════════════════════════════════════

@router.get("/dashboard")
def dashboard_agenda(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _auto_concluir_agendamentos(db)
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

    # Quick check: how many waiting list items have available slots
    espera_com_vaga = 0
    if aguardando_espera > 0:
        espera_items = db.query(ListaEspera).filter(
            ListaEspera.status == "aguardando",
        ).all()
        profissionais = db.query(Profissional).filter(Profissional.ativo == True).all()
        bloqueios_globais = db.query(BloqueioGlobal).filter(BloqueioGlobal.ativo == True).all()
        op_start = _time_to_minutes(HORA_INICIO_GLOBAL)
        op_end = _time_to_minutes(HORA_FIM_GLOBAL)

        for le in espera_items:
            check_dates = set()
            for d_obj in le.datas:
                check_dates.add(d_obj.data)
            if le.data_desejada:
                check_dates.add(le.data_desejada)
            if not check_dates:
                check_dates.add(hoje)

            duracao = 60
            if le.servico and le.servico.duracao_minutos:
                duracao = le.servico.duracao_minutos

            found = False
            for check_date in check_dates:
                if found:
                    break
                day_ags = db.query(Agendamento).filter(
                    Agendamento.data == check_date,
                    Agendamento.status.notin_(["cancelado"]),
                ).all()
                day_blocks = db.query(BloqueioHorario).filter(
                    BloqueioHorario.data == check_date,
                ).all()

                for prof in profissionais:
                    if found:
                        break
                    occupied = []
                    for ag in day_ags:
                        if ag.profissional_id == prof.id:
                            occupied.append((_time_to_minutes(ag.hora_inicio), _time_to_minutes(ag.hora_fim)))
                    for bl in day_blocks:
                        if bl.profissional_id == prof.id:
                            occupied.append((_time_to_minutes(bl.hora_inicio), _time_to_minutes(bl.hora_fim)))
                    for gb in bloqueios_globais:
                        occupied.append((_time_to_minutes(gb.hora_inicio), _time_to_minutes(gb.hora_fim)))
                    occupied.sort()

                    cursor = op_start
                    for occ_start, occ_end in occupied:
                        if occ_start > cursor and (occ_start - cursor) >= duracao:
                            found = True
                            break
                        cursor = max(cursor, occ_end)
                    if not found and cursor < op_end and (op_end - cursor) >= duracao:
                        found = True

            if found:
                espera_com_vaga += 1

    # Birthday people this month
    aniversariantes = _get_aniversariantes(db, hoje.month)

    return {
        "total_hoje": total_hoje,
        "confirmados": confirmados,
        "concluidos": concluidos,
        "aguardando_espera": aguardando_espera,
        "espera_com_vaga": espera_com_vaga,
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
