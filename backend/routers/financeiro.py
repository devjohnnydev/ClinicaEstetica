from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional, List
import pytz

from database import get_db
from models.user import User
from models.pagamento import Pagamento
from models.despesa import Despesa, ParcelaDespesa, CategoriaDespesa
from models.agendamento import Agendamento
from models.agenda_cliente import AgendaCliente
from services.auth import get_current_user
from schemas.financeiro import (
    PagamentoUpdate, PagamentoResponse,
    DespesaCreate, DespesaUpdate, DespesaResponse,
    ParcelaDespesaUpdate, ParcelaDespesaResponse,
    CategoriaDespesaCreate, CategoriaDespesaUpdate, CategoriaDespesaResponse,
)

router = APIRouter(prefix="/api/financeiro", tags=["financeiro"])
BRAZIL_TZ = pytz.timezone("America/Sao_Paulo")


def _now_br():
    from datetime import datetime
    return datetime.now(BRAZIL_TZ)


def _update_overdue_payments(db: Session):
    """Mark payments as overdue if 7+ days past appointment and not fully paid."""
    cutoff = _now_br().date() - timedelta(days=7)
    db.query(Pagamento).filter(
        Pagamento.status.in_(["pendente", "parcial"]),
        Pagamento.data_atendimento <= cutoff,
    ).update({"status": "atrasado"}, synchronize_session=False)
    db.commit()


# ═══════════════════════════════════════════════════════════════════
# CATEGORIAS DE DESPESA
# ═══════════════════════════════════════════════════════════════════

@router.get("/categorias", response_model=List[CategoriaDespesaResponse])
def listar_categorias(
    apenas_ativas: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(CategoriaDespesa)
    if apenas_ativas:
        q = q.filter(CategoriaDespesa.ativo == True)
    return q.order_by(CategoriaDespesa.tipo, CategoriaDespesa.nome).all()


@router.post("/categorias", response_model=CategoriaDespesaResponse)
def criar_categoria(
    payload: CategoriaDespesaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(CategoriaDespesa).filter(
        func.lower(CategoriaDespesa.nome) == payload.nome.lower()
    ).first()
    if existing:
        raise HTTPException(409, "Categoria já existe")
    cat = CategoriaDespesa(**payload.dict())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categorias/{cat_id}", response_model=CategoriaDespesaResponse)
def atualizar_categoria(
    cat_id: int,
    payload: CategoriaDespesaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = db.query(CategoriaDespesa).filter(CategoriaDespesa.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(cat, key, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categorias/{cat_id}")
def deletar_categoria(
    cat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = db.query(CategoriaDespesa).filter(CategoriaDespesa.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")
    cat.ativo = False
    db.commit()
    return {"message": "Categoria desativada"}


# ═══════════════════════════════════════════════════════════════════
# DASHBOARD FINANCEIRO
# ═══════════════════════════════════════════════════════════════════

@router.get("/dashboard")
def dashboard_financeiro(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _update_overdue_payments(db)
    hoje = _now_br().date()
    mes = mes or hoje.month
    ano = ano or hoje.year

    # Current month revenue (paid)
    receita_mes = db.query(func.coalesce(func.sum(Pagamento.valor_pago), 0)).filter(
        extract("month", Pagamento.data_atendimento) == mes,
        extract("year", Pagamento.data_atendimento) == ano,
    ).scalar()

    # Current month expenses (parcelas that fall in this month)
    gastos_parcelas = db.query(func.coalesce(func.sum(ParcelaDespesa.valor), 0)).filter(
        extract("month", ParcelaDespesa.data_vencimento) == mes,
        extract("year", ParcelaDespesa.data_vencimento) == ano,
    ).scalar()

    # Expenses without parcels (parcelas_total == 1)
    gastos_avista = db.query(func.coalesce(func.sum(Despesa.valor_total), 0)).filter(
        extract("month", Despesa.data) == mes,
        extract("year", Despesa.data) == ano,
        Despesa.parcelas_total == 1,
    ).scalar()

    gastos_mes = float(gastos_parcelas) + float(gastos_avista)
    lucro_mes = float(receita_mes) - gastos_mes

    # Previous month comparison
    if mes == 1:
        prev_mes, prev_ano = 12, ano - 1
    else:
        prev_mes, prev_ano = mes - 1, ano

    receita_anterior = db.query(func.coalesce(func.sum(Pagamento.valor_pago), 0)).filter(
        extract("month", Pagamento.data_atendimento) == prev_mes,
        extract("year", Pagamento.data_atendimento) == prev_ano,
    ).scalar()

    gastos_parcelas_ant = db.query(func.coalesce(func.sum(ParcelaDespesa.valor), 0)).filter(
        extract("month", ParcelaDespesa.data_vencimento) == prev_mes,
        extract("year", ParcelaDespesa.data_vencimento) == prev_ano,
    ).scalar()
    gastos_avista_ant = db.query(func.coalesce(func.sum(Despesa.valor_total), 0)).filter(
        extract("month", Despesa.data) == prev_mes,
        extract("year", Despesa.data) == prev_ano,
        Despesa.parcelas_total == 1,
    ).scalar()
    gastos_anterior = float(gastos_parcelas_ant) + float(gastos_avista_ant)
    lucro_anterior = float(receita_anterior) - gastos_anterior

    def calc_variacao(atual, anterior):
        if anterior == 0:
            return 100.0 if atual > 0 else 0.0
        return round(((atual - anterior) / abs(anterior)) * 100, 1)

    # Alerts
    pendentes = db.query(func.count(Pagamento.id)).filter(
        Pagamento.status == "pendente"
    ).scalar()
    atrasados = db.query(func.count(Pagamento.id)).filter(
        Pagamento.status == "atrasado"
    ).scalar()

    # Total pending value
    valor_pendente = db.query(func.coalesce(func.sum(Pagamento.valor_total - Pagamento.valor_pago), 0)).filter(
        Pagamento.status.in_(["pendente", "parcial", "atrasado"])
    ).scalar()

    # Revenue total (all time for this month - including pending)
    receita_total = db.query(func.coalesce(func.sum(Pagamento.valor_total), 0)).filter(
        extract("month", Pagamento.data_atendimento) == mes,
        extract("year", Pagamento.data_atendimento) == ano,
    ).scalar()

    return {
        "mes": mes,
        "ano": ano,
        "receita_total": float(receita_total),
        "receita_mes": float(receita_mes),
        "gastos_mes": gastos_mes,
        "lucro_mes": lucro_mes,
        "receita_anterior": float(receita_anterior),
        "gastos_anterior": gastos_anterior,
        "lucro_anterior": lucro_anterior,
        "variacao_receita": calc_variacao(float(receita_mes), float(receita_anterior)),
        "variacao_gastos": calc_variacao(gastos_mes, gastos_anterior),
        "variacao_lucro": calc_variacao(lucro_mes, lucro_anterior),
        "alertas": {
            "pendentes": pendentes,
            "atrasados": atrasados,
            "valor_pendente": float(valor_pendente),
        },
    }


# ═══════════════════════════════════════════════════════════════════
# PAGAMENTOS (ENTRADAS)
# ═══════════════════════════════════════════════════════════════════

@router.get("/pagamentos", response_model=List[PagamentoResponse])
def listar_pagamentos(
    status: Optional[str] = None,
    cliente_id: Optional[int] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _update_overdue_payments(db)
    q = db.query(Pagamento)

    if status:
        q = q.filter(Pagamento.status == status)
    if cliente_id:
        q = q.filter(Pagamento.agenda_cliente_id == cliente_id)
    if data_inicio:
        q = q.filter(Pagamento.data_atendimento >= data_inicio)
    if data_fim:
        q = q.filter(Pagamento.data_atendimento <= data_fim)
    if mes:
        q = q.filter(extract("month", Pagamento.data_atendimento) == mes)
    if ano:
        q = q.filter(extract("year", Pagamento.data_atendimento) == ano)

    return q.order_by(Pagamento.data_atendimento.desc()).all()


@router.get("/pagamentos/{pag_id}", response_model=PagamentoResponse)
def detalhe_pagamento(
    pag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pag = db.query(Pagamento).filter(Pagamento.id == pag_id).first()
    if not pag:
        raise HTTPException(404, "Pagamento não encontrado")
    return pag


@router.put("/pagamentos/{pag_id}", response_model=PagamentoResponse)
def atualizar_pagamento(
    pag_id: int,
    payload: PagamentoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pag = db.query(Pagamento).filter(Pagamento.id == pag_id).first()
    if not pag:
        raise HTTPException(404, "Pagamento não encontrado")

    update_data = payload.dict(exclude_unset=True)

    if "valor_pago" in update_data:
        novo_valor = update_data["valor_pago"]
        if novo_valor < 0:
            raise HTTPException(400, "Valor pago não pode ser negativo")
        if novo_valor > pag.valor_total:
            raise HTTPException(400, "Valor pago excede o valor total")

        pag.valor_pago = novo_valor
        if novo_valor >= pag.valor_total:
            pag.status = "pago"
            if not pag.data_pagamento:
                pag.data_pagamento = _now_br().date()
        elif novo_valor > 0:
            pag.status = "parcial"
        else:
            # Check if overdue
            cutoff = _now_br().date() - timedelta(days=7)
            pag.status = "atrasado" if pag.data_atendimento <= cutoff else "pendente"

    for key, value in update_data.items():
        if key != "valor_pago":  # already handled above
            setattr(pag, key, value)

    db.commit()
    db.refresh(pag)
    return pag


# ─── Client financial history ──────────────────────────────────────
@router.get("/clientes/{cliente_id}/historico")
def historico_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _update_overdue_payments(db)
    cliente = db.query(AgendaCliente).filter(AgendaCliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(404, "Cliente não encontrado")

    pagamentos = db.query(Pagamento).filter(
        Pagamento.agenda_cliente_id == cliente_id
    ).order_by(Pagamento.data_atendimento.desc()).all()

    total_gasto = sum(p.valor_pago for p in pagamentos)
    total_pendente = sum(p.valor_total - p.valor_pago for p in pagamentos if p.status in ("pendente", "parcial", "atrasado"))
    total_atendimentos = len(pagamentos)
    atrasados = sum(1 for p in pagamentos if p.status == "atrasado")

    return {
        "cliente": {
            "id": cliente.id,
            "nome": cliente.nome,
            "telefone": cliente.telefone,
        },
        "resumo": {
            "total_gasto": total_gasto,
            "total_pendente": total_pendente,
            "total_atendimentos": total_atendimentos,
            "atrasados": atrasados,
        },
        "pagamentos": [
            {
                "id": p.id,
                "descricao": p.descricao,
                "valor_total": p.valor_total,
                "valor_pago": p.valor_pago,
                "forma_pagamento": p.forma_pagamento,
                "status": p.status,
                "data_atendimento": str(p.data_atendimento),
                "data_pagamento": str(p.data_pagamento) if p.data_pagamento else None,
            }
            for p in pagamentos
        ],
    }


@router.get("/clientes-financeiro")
def clientes_financeiro(
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all clients that have any payment records with summary."""
    _update_overdue_payments(db)
    
    # Get clients with payments
    q = db.query(AgendaCliente).filter(
        AgendaCliente.id.in_(
            db.query(Pagamento.agenda_cliente_id).distinct()
        )
    )
    if busca:
        q = q.filter(AgendaCliente.nome.ilike(f"%{busca}%"))
    
    clientes = q.order_by(AgendaCliente.nome).all()
    result = []
    for c in clientes:
        pags = db.query(Pagamento).filter(Pagamento.agenda_cliente_id == c.id).all()
        total_gasto = sum(p.valor_pago for p in pags)
        pendente = sum(p.valor_total - p.valor_pago for p in pags if p.status in ("pendente", "parcial", "atrasado"))
        atrasados = sum(1 for p in pags if p.status == "atrasado")
        result.append({
            "id": c.id,
            "nome": c.nome,
            "telefone": c.telefone,
            "total_gasto": total_gasto,
            "pendente": pendente,
            "atrasados": atrasados,
            "total_atendimentos": len(pags),
        })
    return result


# ═══════════════════════════════════════════════════════════════════
# DESPESAS (GASTOS)
# ═══════════════════════════════════════════════════════════════════

@router.get("/despesas", response_model=List[DespesaResponse])
def listar_despesas(
    tipo: Optional[str] = None,
    categoria: Optional[str] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Despesa)
    if tipo:
        q = q.filter(Despesa.tipo == tipo)
    if categoria:
        q = q.filter(Despesa.categoria == categoria)
    if mes:
        q = q.filter(extract("month", Despesa.data) == mes)
    if ano:
        q = q.filter(extract("year", Despesa.data) == ano)
    return q.order_by(Despesa.data.desc()).all()


@router.post("/despesas", response_model=DespesaResponse)
def criar_despesa(
    payload: DespesaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    despesa = Despesa(
        nome=payload.nome,
        categoria_id=payload.categoria_id,
        categoria=payload.categoria,
        tipo=payload.tipo,
        valor_total=payload.valor_total,
        forma_pagamento=payload.forma_pagamento,
        parcelas_total=payload.parcelas_total,
        data=payload.data,
        observacoes=payload.observacoes,
    )
    db.add(despesa)
    db.flush()

    # Create installments
    if payload.parcelas_total > 1:
        valor_parcela = round(payload.valor_total / payload.parcelas_total, 2)
        for i in range(payload.parcelas_total):
            vencimento = payload.data + relativedelta(months=i)
            parcela = ParcelaDespesa(
                despesa_id=despesa.id,
                numero_parcela=i + 1,
                valor=valor_parcela,
                data_vencimento=vencimento,
            )
            db.add(parcela)
    else:
        # Single payment — still create one parcela for consistency
        parcela = ParcelaDespesa(
            despesa_id=despesa.id,
            numero_parcela=1,
            valor=payload.valor_total,
            data_vencimento=payload.data,
            pago=True,
            data_pagamento=payload.data,
        )
        db.add(parcela)

    db.commit()
    db.refresh(despesa)
    return despesa


@router.put("/despesas/{desp_id}", response_model=DespesaResponse)
def atualizar_despesa(
    desp_id: int,
    payload: DespesaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    desp = db.query(Despesa).filter(Despesa.id == desp_id).first()
    if not desp:
        raise HTTPException(404, "Despesa não encontrada")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(desp, key, value)
    db.commit()
    db.refresh(desp)
    return desp


@router.delete("/despesas/{desp_id}")
def deletar_despesa(
    desp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    desp = db.query(Despesa).filter(Despesa.id == desp_id).first()
    if not desp:
        raise HTTPException(404, "Despesa não encontrada")
    db.delete(desp)
    db.commit()
    return {"message": "Despesa removida"}


@router.put("/despesas/{desp_id}/parcelas/{parcela_id}", response_model=ParcelaDespesaResponse)
def atualizar_parcela(
    desp_id: int,
    parcela_id: int,
    payload: ParcelaDespesaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parcela = db.query(ParcelaDespesa).filter(
        ParcelaDespesa.id == parcela_id,
        ParcelaDespesa.despesa_id == desp_id,
    ).first()
    if not parcela:
        raise HTTPException(404, "Parcela não encontrada")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(parcela, key, value)
    if payload.pago and not parcela.data_pagamento:
        parcela.data_pagamento = _now_br().date()
    db.commit()
    db.refresh(parcela)
    return parcela


# ═══════════════════════════════════════════════════════════════════
# CAIXA
# ═══════════════════════════════════════════════════════════════════

@router.get("/caixa")
def controle_caixa(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hoje = _now_br().date()
    mes = mes or hoje.month
    ano = ano or hoje.year

    # Daily breakdown for the month
    from calendar import monthrange
    _, last_day = monthrange(ano, mes)

    dias = []
    for dia in range(1, last_day + 1):
        d = date(ano, mes, dia)

        # Entradas do dia (valor_pago on payments where data_pagamento == d)
        entradas = db.query(func.coalesce(func.sum(Pagamento.valor_pago), 0)).filter(
            Pagamento.data_pagamento == d,
            Pagamento.status == "pago",
        ).scalar()

        # Also add partial payments — we need to track the actual paid date
        # For simplicity, use data_atendimento for pending/partial, data_pagamento for paid
        entradas_pendente = db.query(func.coalesce(func.sum(Pagamento.valor_pago), 0)).filter(
            Pagamento.data_atendimento == d,
            Pagamento.status.in_(["parcial"]),
        ).scalar()

        # Saídas do dia (parcelas vencendo neste dia)
        saidas = db.query(func.coalesce(func.sum(ParcelaDespesa.valor), 0)).filter(
            ParcelaDespesa.data_vencimento == d,
        ).scalar()

        # Also add à vista expenses
        saidas_avista = db.query(func.coalesce(func.sum(Despesa.valor_total), 0)).filter(
            Despesa.data == d,
            Despesa.parcelas_total == 1,
        ).scalar()

        total_entradas = float(entradas) + float(entradas_pendente)
        total_saidas = float(saidas) + float(saidas_avista)

        if total_entradas > 0 or total_saidas > 0 or d == hoje:
            dias.append({
                "data": str(d),
                "entradas": total_entradas,
                "saidas": total_saidas,
                "saldo": total_entradas - total_saidas,
            })

    # Monthly totals
    total_entradas_mes = sum(d["entradas"] for d in dias)
    total_saidas_mes = sum(d["saidas"] for d in dias)

    return {
        "mes": mes,
        "ano": ano,
        "total_entradas": total_entradas_mes,
        "total_saidas": total_saidas_mes,
        "saldo": total_entradas_mes - total_saidas_mes,
        "dias": dias,
    }


# ═══════════════════════════════════════════════════════════════════
# GRÁFICOS
# ═══════════════════════════════════════════════════════════════════

@router.get("/graficos/receita-gastos")
def grafico_receita_gastos(
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Monthly revenue vs expenses for the year."""
    ano = ano or _now_br().year
    meses = []
    for m in range(1, 13):
        receita = db.query(func.coalesce(func.sum(Pagamento.valor_pago), 0)).filter(
            extract("month", Pagamento.data_atendimento) == m,
            extract("year", Pagamento.data_atendimento) == ano,
        ).scalar()

        gastos_p = db.query(func.coalesce(func.sum(ParcelaDespesa.valor), 0)).filter(
            extract("month", ParcelaDespesa.data_vencimento) == m,
            extract("year", ParcelaDespesa.data_vencimento) == ano,
        ).scalar()
        gastos_a = db.query(func.coalesce(func.sum(Despesa.valor_total), 0)).filter(
            extract("month", Despesa.data) == m,
            extract("year", Despesa.data) == ano,
            Despesa.parcelas_total == 1,
        ).scalar()

        meses.append({
            "mes": m,
            "receita": float(receita),
            "gastos": float(gastos_p) + float(gastos_a),
        })
    return {"ano": ano, "dados": meses}


@router.get("/graficos/evolucao")
def grafico_evolucao(
    meses: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Financial evolution over last N months."""
    hoje = _now_br().date()
    dados = []
    for i in range(meses - 1, -1, -1):
        d = hoje - relativedelta(months=i)
        m, a = d.month, d.year

        receita = db.query(func.coalesce(func.sum(Pagamento.valor_pago), 0)).filter(
            extract("month", Pagamento.data_atendimento) == m,
            extract("year", Pagamento.data_atendimento) == a,
        ).scalar()

        gastos_p = db.query(func.coalesce(func.sum(ParcelaDespesa.valor), 0)).filter(
            extract("month", ParcelaDespesa.data_vencimento) == m,
            extract("year", ParcelaDespesa.data_vencimento) == a,
        ).scalar()
        gastos_a = db.query(func.coalesce(func.sum(Despesa.valor_total), 0)).filter(
            extract("month", Despesa.data) == m,
            extract("year", Despesa.data) == a,
            Despesa.parcelas_total == 1,
        ).scalar()

        gastos = float(gastos_p) + float(gastos_a)
        dados.append({
            "mes": m,
            "ano": a,
            "receita": float(receita),
            "gastos": gastos,
            "lucro": float(receita) - gastos,
        })
    return {"dados": dados}


@router.get("/graficos/distribuicao-gastos")
def grafico_distribuicao(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Expense distribution by category for the month."""
    hoje = _now_br().date()
    mes = mes or hoje.month
    ano = ano or hoje.year

    despesas = db.query(Despesa).filter(
        extract("month", Despesa.data) == mes,
        extract("year", Despesa.data) == ano,
    ).all()

    categorias = {}
    for d in despesas:
        cat_name = d.categoria_rel.nome if d.categoria_rel else d.categoria
        if cat_name not in categorias:
            categorias[cat_name] = {"valor": 0, "tipo": d.tipo}
        categorias[cat_name]["valor"] += d.valor_total

    return {
        "mes": mes,
        "ano": ano,
        "dados": [
            {"categoria": k, "valor": v["valor"], "tipo": v["tipo"]}
            for k, v in sorted(categorias.items(), key=lambda x: -x[1]["valor"])
        ],
    }
