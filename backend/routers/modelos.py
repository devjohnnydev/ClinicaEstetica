from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.modelo_anamnese import ModeloAnamnese, CampoModelo
from schemas.modelo import ModeloCreate, ModeloUpdate, ModeloResponse, ModeloListResponse, CampoModeloResponse
from services.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/api/modelos", tags=["modelos"])


@router.get("", response_model=List[ModeloListResponse])
def listar_modelos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    modelos = db.query(ModeloAnamnese).order_by(ModeloAnamnese.created_at.desc()).all()
    result = []
    for m in modelos:
        result.append(ModeloListResponse(
            id=m.id,
            nome_procedimento=m.nome_procedimento,
            descricao=m.descricao,
            rosto_modelo_tipo=m.rosto_modelo_tipo,
            created_at=m.created_at,
            total_campos=len(m.campos),
        ))
    return result


@router.post("", response_model=ModeloResponse)
def criar_modelo(
    modelo: ModeloCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_modelo = ModeloAnamnese(
        nome_procedimento=modelo.nome_procedimento,
        descricao=modelo.descricao,
        riscos_procedimento=modelo.riscos_procedimento,
        rosto_modelo_tipo=modelo.rosto_modelo_tipo,
    )
    db.add(db_modelo)
    db.flush()

    for i, campo in enumerate(modelo.campos):
        db_campo = CampoModelo(
            modelo_id=db_modelo.id,
            tipo=campo.tipo,
            label=campo.label,
            placeholder=campo.placeholder,
            opcoes=campo.opcoes,
            ordem=i,
            obrigatorio=campo.obrigatorio,
        )
        db.add(db_campo)

    db.commit()
    db.refresh(db_modelo)
    return ModeloResponse(
        id=db_modelo.id,
        nome_procedimento=db_modelo.nome_procedimento,
        descricao=db_modelo.descricao,
        riscos_procedimento=db_modelo.riscos_procedimento,
        rosto_modelo_tipo=db_modelo.rosto_modelo_tipo,
        created_at=db_modelo.created_at,
        campos=[CampoModeloResponse.model_validate(c) for c in db_modelo.campos],
        total_campos=len(db_modelo.campos),
    )


@router.get("/{modelo_id}", response_model=ModeloResponse)
def obter_modelo(
    modelo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    modelo = db.query(ModeloAnamnese).filter(ModeloAnamnese.id == modelo_id).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    return ModeloResponse(
        id=modelo.id,
        nome_procedimento=modelo.nome_procedimento,
        descricao=modelo.descricao,
        riscos_procedimento=modelo.riscos_procedimento,
        rosto_modelo_tipo=modelo.rosto_modelo_tipo,
        created_at=modelo.created_at,
        campos=[CampoModeloResponse.model_validate(c) for c in modelo.campos],
        total_campos=len(modelo.campos),
    )


@router.put("/{modelo_id}", response_model=ModeloResponse)
def atualizar_modelo(
    modelo_id: int,
    data: ModeloUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    modelo = db.query(ModeloAnamnese).filter(ModeloAnamnese.id == modelo_id).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    if data.nome_procedimento is not None:
        modelo.nome_procedimento = data.nome_procedimento
    if data.descricao is not None:
        modelo.descricao = data.descricao
    if "riscos_procedimento" in data.model_dump(exclude_unset=True):
        modelo.riscos_procedimento = data.riscos_procedimento
    if "rosto_modelo_tipo" in data.model_dump(exclude_unset=True):
        modelo.rosto_modelo_tipo = data.rosto_modelo_tipo

    if data.campos is not None:
        from models.anamnese import Resposta

        # Sort existing campos by ordem
        existing_campos = sorted(modelo.campos, key=lambda c: c.ordem)
        new_campos = data.campos
        num_existing = len(existing_campos)
        num_new = len(new_campos)

        # Update existing campos in-place (preserves their IDs and FK references)
        for i in range(min(num_existing, num_new)):
            existing_campos[i].tipo = new_campos[i].tipo
            existing_campos[i].label = new_campos[i].label
            existing_campos[i].placeholder = new_campos[i].placeholder
            existing_campos[i].opcoes = new_campos[i].opcoes
            existing_campos[i].ordem = i
            existing_campos[i].obrigatorio = new_campos[i].obrigatorio

        # Add new campos if the new list is longer
        for i in range(num_existing, num_new):
            db_campo = CampoModelo(
                modelo_id=modelo_id,
                tipo=new_campos[i].tipo,
                label=new_campos[i].label,
                placeholder=new_campos[i].placeholder,
                opcoes=new_campos[i].opcoes,
                ordem=i,
                obrigatorio=new_campos[i].obrigatorio,
            )
            db.add(db_campo)

        # Remove excess campos only if they have NO respostas referencing them
        for i in range(num_new, num_existing):
            campo = existing_campos[i]
            has_respostas = db.query(Resposta).filter(
                Resposta.campo_id == campo.id
            ).first()
            if not has_respostas:
                db.delete(campo)
            # If it has respostas, keep it — historical data is preserved

    db.commit()
    db.refresh(modelo)
    return ModeloResponse(
        id=modelo.id,
        nome_procedimento=modelo.nome_procedimento,
        descricao=modelo.descricao,
        rosto_modelo_tipo=modelo.rosto_modelo_tipo,
        created_at=modelo.created_at,
        campos=[CampoModeloResponse.model_validate(c) for c in modelo.campos],
        total_campos=len(modelo.campos),
    )


@router.delete("/{modelo_id}")
def deletar_modelo(
    modelo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    modelo = db.query(ModeloAnamnese).filter(ModeloAnamnese.id == modelo_id).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    db.delete(modelo)
    db.commit()
    return {"detail": "Modelo deletado com sucesso"}
