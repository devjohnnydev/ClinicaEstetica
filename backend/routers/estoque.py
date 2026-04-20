from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, extract
from typing import Optional, List
from datetime import datetime

from database import get_db, get_brazil_time
from services.auth import get_current_user
from models.user import User
from models.estoque import Produto, MovimentacaoEstoque, Fornecedor
from schemas.estoque import (
    ProdutoCreate, ProdutoUpdate, ProdutoResponse,
    MovimentacaoCreate, MovimentacaoResponse,
    FornecedorCreate, FornecedorUpdate, FornecedorResponse,
)

router = APIRouter(prefix="/api/estoque", tags=["Estoque"])


# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════

def _calc_status_estoque(quantidade_atual: float, quantidade_minima: float) -> str:
    """Calcula o status visual do estoque."""
    if quantidade_minima <= 0:
        return "normal"
    if quantidade_atual <= quantidade_minima:
        return "critico"
    if quantidade_atual <= quantidade_minima * 2:
        return "atencao"
    return "normal"


def _produto_to_response(p: Produto) -> dict:
    """Converte um Produto ORM em dict para response."""
    data = {
        "id": p.id,
        "nome": p.nome,
        "descricao": p.descricao,
        "categoria": p.categoria,
        "unidade_medida": p.unidade_medida,
        "quantidade_atual": p.quantidade_atual,
        "quantidade_minima": p.quantidade_minima,
        "preco_custo": p.preco_custo,
        "preco_venda": p.preco_venda,
        "fornecedor_id": p.fornecedor_id,
        "ativo": p.ativo,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "fornecedor_rel": {"id": p.fornecedor_rel.id, "nome": p.fornecedor_rel.nome} if p.fornecedor_rel else None,
        "status_estoque": _calc_status_estoque(p.quantidade_atual, p.quantidade_minima),
    }
    return data


# ═══════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════

@router.get("/dashboard")
def estoque_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna KPIs gerais de estoque."""
    produtos = db.query(Produto).filter(Produto.ativo == True).all()
    total_produtos = len(produtos)
    valor_total_estoque = sum(p.quantidade_atual * p.preco_custo for p in produtos)

    criticos = [p for p in produtos if _calc_status_estoque(p.quantidade_atual, p.quantidade_minima) == "critico"]
    atencao = [p for p in produtos if _calc_status_estoque(p.quantidade_atual, p.quantidade_minima) == "atencao"]

    # Movimentações do mês atual
    agora = get_brazil_time()
    mes_atual = agora.month
    ano_atual = agora.year

    entradas_mes = db.query(func.coalesce(func.sum(MovimentacaoEstoque.quantidade), 0)).filter(
        MovimentacaoEstoque.tipo == "entrada",
        extract("month", MovimentacaoEstoque.created_at) == mes_atual,
        extract("year", MovimentacaoEstoque.created_at) == ano_atual,
    ).scalar() or 0

    saidas_mes = db.query(func.coalesce(func.sum(MovimentacaoEstoque.quantidade), 0)).filter(
        MovimentacaoEstoque.tipo == "saida",
        extract("month", MovimentacaoEstoque.created_at) == mes_atual,
        extract("year", MovimentacaoEstoque.created_at) == ano_atual,
    ).scalar() or 0

    valor_entradas_mes = db.query(
        func.coalesce(func.sum(MovimentacaoEstoque.quantidade * MovimentacaoEstoque.preco_unitario), 0)
    ).filter(
        MovimentacaoEstoque.tipo == "entrada",
        extract("month", MovimentacaoEstoque.created_at) == mes_atual,
        extract("year", MovimentacaoEstoque.created_at) == ano_atual,
    ).scalar() or 0

    valor_saidas_mes = db.query(
        func.coalesce(func.sum(MovimentacaoEstoque.quantidade * MovimentacaoEstoque.preco_unitario), 0)
    ).filter(
        MovimentacaoEstoque.tipo == "saida",
        extract("month", MovimentacaoEstoque.created_at) == mes_atual,
        extract("year", MovimentacaoEstoque.created_at) == ano_atual,
    ).scalar() or 0

    # Categorias breakdown
    categorias = {}
    for p in produtos:
        cat = p.categoria or "outros"
        if cat not in categorias:
            categorias[cat] = {"total": 0, "valor": 0.0}
        categorias[cat]["total"] += 1
        categorias[cat]["valor"] += p.quantidade_atual * p.preco_custo

    return {
        "total_produtos": total_produtos,
        "valor_total_estoque": round(valor_total_estoque, 2),
        "produtos_criticos": len(criticos),
        "produtos_atencao": len(atencao),
        "entradas_mes": float(entradas_mes),
        "saidas_mes": float(saidas_mes),
        "valor_entradas_mes": round(float(valor_entradas_mes), 2),
        "valor_saidas_mes": round(float(valor_saidas_mes), 2),
        "categorias": categorias,
    }


# ═══════════════════════════════════════════════════════════════════
# ALERTAS
# ═══════════════════════════════════════════════════════════════════

@router.get("/alertas")
def estoque_alertas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna produtos com estoque abaixo do mínimo."""
    produtos = db.query(Produto).options(
        joinedload(Produto.fornecedor_rel)
    ).filter(
        Produto.ativo == True,
        Produto.quantidade_minima > 0,
        Produto.quantidade_atual <= Produto.quantidade_minima,
    ).order_by(Produto.quantidade_atual.asc()).all()

    return [_produto_to_response(p) for p in produtos]


# ═══════════════════════════════════════════════════════════════════
# GRÁFICOS
# ═══════════════════════════════════════════════════════════════════

@router.get("/graficos/entradas-saidas")
def grafico_entradas_saidas(
    meses: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dados para gráfico de barras: entradas vs saídas por mês."""
    agora = get_brazil_time()
    dados = []
    nomes_meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

    for i in range(meses - 1, -1, -1):
        m = agora.month - i
        a = agora.year
        while m <= 0:
            m += 12
            a -= 1

        entradas = db.query(func.coalesce(func.sum(MovimentacaoEstoque.quantidade), 0)).filter(
            MovimentacaoEstoque.tipo == "entrada",
            extract("month", MovimentacaoEstoque.created_at) == m,
            extract("year", MovimentacaoEstoque.created_at) == a,
        ).scalar() or 0

        saidas = db.query(func.coalesce(func.sum(MovimentacaoEstoque.quantidade), 0)).filter(
            MovimentacaoEstoque.tipo == "saida",
            extract("month", MovimentacaoEstoque.created_at) == m,
            extract("year", MovimentacaoEstoque.created_at) == a,
        ).scalar() or 0

        dados.append({
            "mes": f"{nomes_meses[m - 1]}/{a}",
            "entradas": float(entradas),
            "saidas": float(saidas),
        })

    return {"dados": dados}


# ═══════════════════════════════════════════════════════════════════
# PRODUTOS (CRUD)
# ═══════════════════════════════════════════════════════════════════

@router.get("/produtos", response_model=List[ProdutoResponse])
def listar_produtos(
    busca: Optional[str] = None,
    categoria: Optional[str] = None,
    alerta: Optional[bool] = None,
    ativo: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Produto).options(joinedload(Produto.fornecedor_rel))

    if ativo is not None:
        q = q.filter(Produto.ativo == ativo)
    if busca:
        q = q.filter(Produto.nome.ilike(f"%{busca}%"))
    if categoria and categoria != "todos":
        q = q.filter(Produto.categoria == categoria)
    if alerta:
        q = q.filter(
            Produto.quantidade_minima > 0,
            Produto.quantidade_atual <= Produto.quantidade_minima,
        )

    produtos = q.order_by(Produto.nome).all()
    return [_produto_to_response(p) for p in produtos]


@router.get("/produtos/{produto_id}")
def detalhe_produto(
    produto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    produto = db.query(Produto).options(
        joinedload(Produto.fornecedor_rel)
    ).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    # Últimas 20 movimentações
    movs = db.query(MovimentacaoEstoque).filter(
        MovimentacaoEstoque.produto_id == produto_id
    ).order_by(MovimentacaoEstoque.created_at.desc()).limit(20).all()

    resp = _produto_to_response(produto)
    resp["movimentacoes"] = [
        {
            "id": m.id,
            "tipo": m.tipo,
            "quantidade": m.quantidade,
            "preco_unitario": m.preco_unitario,
            "motivo": m.motivo,
            "observacoes": m.observacoes,
            "usuario_nome": m.usuario_nome,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in movs
    ]
    return resp


@router.post("/produtos", response_model=ProdutoResponse)
def criar_produto(
    data: ProdutoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    produto = Produto(**data.model_dump())
    db.add(produto)
    db.commit()
    db.refresh(produto)

    # Se quantidade inicial > 0, registrar movimentação de entrada
    if data.quantidade_atual > 0:
        mov = MovimentacaoEstoque(
            produto_id=produto.id,
            tipo="entrada",
            quantidade=data.quantidade_atual,
            preco_unitario=data.preco_custo,
            motivo="estoque_inicial",
            observacoes="Estoque inicial do produto",
            usuario_nome=current_user.nome,
        )
        db.add(mov)
        db.commit()

    # Reload with relationships
    db.refresh(produto)
    return _produto_to_response(produto)


@router.put("/produtos/{produto_id}", response_model=ProdutoResponse)
def atualizar_produto(
    produto_id: int,
    data: ProdutoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(produto, key, value)

    db.commit()
    db.refresh(produto)
    return _produto_to_response(produto)


@router.delete("/produtos/{produto_id}")
def deletar_produto(
    produto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    produto.ativo = False
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
# MOVIMENTAÇÕES
# ═══════════════════════════════════════════════════════════════════

@router.post("/movimentacoes", response_model=MovimentacaoResponse)
def criar_movimentacao(
    data: MovimentacaoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    produto = db.query(Produto).filter(Produto.id == data.produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if data.tipo == "saida" and produto.quantidade_atual < data.quantidade:
        raise HTTPException(
            status_code=400,
            detail=f"Estoque insuficiente. Disponível: {produto.quantidade_atual} {produto.unidade_medida}",
        )

    # Criar movimentação
    mov = MovimentacaoEstoque(
        produto_id=data.produto_id,
        tipo=data.tipo,
        quantidade=data.quantidade,
        preco_unitario=data.preco_unitario or 0,
        motivo=data.motivo,
        observacoes=data.observacoes,
        usuario_nome=data.usuario_nome or current_user.nome,
    )
    db.add(mov)

    # Atualizar saldo automático
    if data.tipo == "entrada":
        produto.quantidade_atual += data.quantidade
        # Atualizar preço de custo se informado na entrada
        if data.preco_unitario and data.preco_unitario > 0:
            produto.preco_custo = data.preco_unitario
    elif data.tipo == "saida":
        produto.quantidade_atual -= data.quantidade

    db.commit()
    db.refresh(mov)

    # Carregar relação para response
    resp = {
        "id": mov.id,
        "produto_id": mov.produto_id,
        "tipo": mov.tipo,
        "quantidade": mov.quantidade,
        "preco_unitario": mov.preco_unitario,
        "motivo": mov.motivo,
        "observacoes": mov.observacoes,
        "usuario_nome": mov.usuario_nome,
        "created_at": mov.created_at,
        "produto_rel": {"id": produto.id, "nome": produto.nome, "unidade_medida": produto.unidade_medida},
    }
    return resp


@router.get("/movimentacoes", response_model=List[MovimentacaoResponse])
def listar_movimentacoes(
    produto_id: Optional[int] = None,
    tipo: Optional[str] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(MovimentacaoEstoque).options(
        joinedload(MovimentacaoEstoque.produto_rel)
    )

    if produto_id:
        q = q.filter(MovimentacaoEstoque.produto_id == produto_id)
    if tipo and tipo != "todos":
        q = q.filter(MovimentacaoEstoque.tipo == tipo)
    if mes:
        q = q.filter(extract("month", MovimentacaoEstoque.created_at) == mes)
    if ano:
        q = q.filter(extract("year", MovimentacaoEstoque.created_at) == ano)

    movs = q.order_by(MovimentacaoEstoque.created_at.desc()).limit(limit).all()

    return [
        {
            "id": m.id,
            "produto_id": m.produto_id,
            "tipo": m.tipo,
            "quantidade": m.quantidade,
            "preco_unitario": m.preco_unitario,
            "motivo": m.motivo,
            "observacoes": m.observacoes,
            "usuario_nome": m.usuario_nome,
            "created_at": m.created_at,
            "produto_rel": {
                "id": m.produto_rel.id,
                "nome": m.produto_rel.nome,
                "unidade_medida": m.produto_rel.unidade_medida,
            } if m.produto_rel else None,
        }
        for m in movs
    ]


# ═══════════════════════════════════════════════════════════════════
# FORNECEDORES (CRUD)
# ═══════════════════════════════════════════════════════════════════

@router.get("/fornecedores", response_model=List[FornecedorResponse])
def listar_fornecedores(
    busca: Optional[str] = None,
    ativo: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Fornecedor)

    if ativo is not None:
        q = q.filter(Fornecedor.ativo == ativo)
    if busca:
        q = q.filter(Fornecedor.nome.ilike(f"%{busca}%"))

    fornecedores = q.order_by(Fornecedor.nome).all()

    result = []
    for f in fornecedores:
        total_produtos = db.query(func.count(Produto.id)).filter(
            Produto.fornecedor_id == f.id, Produto.ativo == True
        ).scalar() or 0
        result.append({
            "id": f.id,
            "nome": f.nome,
            "contato": f.contato,
            "telefone": f.telefone,
            "email": f.email,
            "endereco": f.endereco,
            "cnpj": f.cnpj,
            "observacoes": f.observacoes,
            "ativo": f.ativo,
            "created_at": f.created_at,
            "total_produtos": total_produtos,
        })
    return result


@router.post("/fornecedores", response_model=FornecedorResponse)
def criar_fornecedor(
    data: FornecedorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fornecedor = Fornecedor(**data.model_dump())
    db.add(fornecedor)
    db.commit()
    db.refresh(fornecedor)
    return {
        **{c.name: getattr(fornecedor, c.name) for c in fornecedor.__table__.columns},
        "total_produtos": 0,
    }


@router.put("/fornecedores/{fornecedor_id}", response_model=FornecedorResponse)
def atualizar_fornecedor(
    fornecedor_id: int,
    data: FornecedorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(fornecedor, key, value)

    db.commit()
    db.refresh(fornecedor)

    total_produtos = db.query(func.count(Produto.id)).filter(
        Produto.fornecedor_id == fornecedor.id, Produto.ativo == True
    ).scalar() or 0

    return {
        **{c.name: getattr(fornecedor, c.name) for c in fornecedor.__table__.columns},
        "total_produtos": total_produtos,
    }


@router.delete("/fornecedores/{fornecedor_id}")
def deletar_fornecedor(
    fornecedor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")

    fornecedor.ativo = False
    db.commit()
    return {"ok": True}
