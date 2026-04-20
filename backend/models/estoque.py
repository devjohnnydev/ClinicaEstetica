from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base, get_brazil_time


class Fornecedor(Base):
    __tablename__ = "fornecedores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    contato = Column(String, nullable=True)       # pessoa de contato
    telefone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    cnpj = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    produtos = relationship("Produto", back_populates="fornecedor_rel", lazy="select")


class Produto(Base):
    __tablename__ = "produtos_estoque"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    descricao = Column(Text, nullable=True)
    categoria = Column(String, nullable=False, default="outros")  # injetaveis, cosmeticos, descartaveis, equipamentos, outros
    unidade_medida = Column(String, nullable=False, default="un")  # un, ml, g, cx, pct
    quantidade_atual = Column(Float, nullable=False, default=0.0)
    quantidade_minima = Column(Float, nullable=False, default=0.0)
    preco_custo = Column(Float, nullable=False, default=0.0)
    preco_venda = Column(Float, nullable=True, default=0.0)
    fornecedor_id = Column(Integer, ForeignKey("fornecedores.id"), nullable=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)
    updated_at = Column(DateTime(timezone=True), default=get_brazil_time, onupdate=get_brazil_time)

    fornecedor_rel = relationship("Fornecedor", back_populates="produtos", lazy="joined")
    movimentacoes = relationship("MovimentacaoEstoque", back_populates="produto_rel", lazy="select",
                                 cascade="all, delete-orphan", order_by="MovimentacaoEstoque.created_at.desc()")


class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"

    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos_estoque.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String, nullable=False)           # entrada | saida
    quantidade = Column(Float, nullable=False)
    preco_unitario = Column(Float, nullable=True, default=0.0)
    motivo = Column(String, nullable=True)           # compra, uso_procedimento, venda, ajuste, perda, devolucao
    observacoes = Column(Text, nullable=True)
    usuario_nome = Column(String, nullable=True)     # quem registrou
    created_at = Column(DateTime(timezone=True), default=get_brazil_time)

    produto_rel = relationship("Produto", back_populates="movimentacoes")
