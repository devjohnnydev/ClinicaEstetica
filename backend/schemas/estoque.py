from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# ─── Fornecedor ────────────────────────────────────────────────────
class FornecedorCreate(BaseModel):
    nome: str
    contato: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cnpj: Optional[str] = None
    observacoes: Optional[str] = None


class FornecedorUpdate(BaseModel):
    nome: Optional[str] = None
    contato: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cnpj: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None


class FornecedorResponse(BaseModel):
    id: int
    nome: str
    contato: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cnpj: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool
    created_at: Optional[datetime] = None
    total_produtos: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── Produto ───────────────────────────────────────────────────────
class ProdutoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    categoria: str = "outros"
    unidade_medida: str = "un"
    quantidade_atual: float = 0.0
    quantidade_minima: float = 0.0
    preco_custo: float = 0.0
    preco_venda: Optional[float] = 0.0
    fornecedor_id: Optional[int] = None


class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    unidade_medida: Optional[str] = None
    quantidade_minima: Optional[float] = None
    preco_custo: Optional[float] = None
    preco_venda: Optional[float] = None
    fornecedor_id: Optional[int] = None
    ativo: Optional[bool] = None


class FornecedorNested(BaseModel):
    id: int
    nome: str

    class Config:
        from_attributes = True


class ProdutoResponse(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    categoria: str
    unidade_medida: str
    quantidade_atual: float
    quantidade_minima: float
    preco_custo: float
    preco_venda: Optional[float] = 0.0
    fornecedor_id: Optional[int] = None
    ativo: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    fornecedor_rel: Optional[FornecedorNested] = None
    status_estoque: Optional[str] = None  # normal, atencao, critico

    class Config:
        from_attributes = True


# ─── Movimentação ──────────────────────────────────────────────────
class MovimentacaoCreate(BaseModel):
    produto_id: int
    tipo: str               # entrada | saida
    quantidade: float
    preco_unitario: Optional[float] = 0.0
    motivo: Optional[str] = None   # compra, uso_procedimento, venda, ajuste, perda, devolucao
    observacoes: Optional[str] = None
    usuario_nome: Optional[str] = None


class ProdutoNested(BaseModel):
    id: int
    nome: str
    unidade_medida: str

    class Config:
        from_attributes = True


class MovimentacaoResponse(BaseModel):
    id: int
    produto_id: int
    tipo: str
    quantidade: float
    preco_unitario: Optional[float] = 0.0
    motivo: Optional[str] = None
    observacoes: Optional[str] = None
    usuario_nome: Optional[str] = None
    created_at: Optional[datetime] = None
    produto_rel: Optional[ProdutoNested] = None

    class Config:
        from_attributes = True
