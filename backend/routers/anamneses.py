from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from database import get_db, get_brazil_time
from models.anamnese import Anamnese, Resposta
from models.assinatura import Assinatura
from models.anexo import Anexo
from models.paciente import Paciente
from models.modelo_anamnese import ModeloAnamnese
from schemas.anamnese import (
    AnamneseCreate, AnamneseFinalizarRequest, AnameseSalvarProgressoRequest,
    AnamneseListResponse, AnamneseDetailResponse, RespostaResponse,
    AssinaturaResponse, AnexoResponse,
)
from services.auth import get_current_user
from services.upload import save_base64_image, save_uploaded_file
from models.user import User

router = APIRouter(prefix="/api/anamneses", tags=["anamneses"])


@router.get("", response_model=List[AnamneseListResponse])
def listar_anamneses(
    paciente_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Anamnese).options(joinedload(Anamnese.modelo))
    if paciente_id:
        query = query.filter(Anamnese.paciente_id == paciente_id)
    if status:
        query = query.filter(Anamnese.status == status)
    anamneses = query.order_by(Anamnese.created_at.desc()).all()

    return [
        AnamneseListResponse(
            id=a.id,
            paciente_id=a.paciente_id,
            modelo_id=a.modelo_id,
            status=a.status,
            nome_procedimento=a.modelo.nome_procedimento if a.modelo else None,
            created_at=a.created_at,
            finalizada_at=a.finalizada_at,
        )
        for a in anamneses
    ]


@router.post("", response_model=AnamneseDetailResponse)
def criar_anamnese(
    data: AnamneseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify patient exists
    paciente = db.query(Paciente).filter(Paciente.id == data.paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

    # Verify template exists
    modelo = db.query(ModeloAnamnese).filter(ModeloAnamnese.id == data.modelo_id).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    # Create anamnese
    anamnese = Anamnese(
        paciente_id=data.paciente_id,
        modelo_id=data.modelo_id,
        status="em_andamento",
    )
    db.add(anamnese)
    db.flush()

    # Save responses
    for resp in data.respostas:
        db_resp = Resposta(
            anamnese_id=anamnese.id,
            campo_id=resp.campo_id,
            valor=resp.valor,
        )
        db.add(db_resp)

    # Save initial signature
    sig_path = save_base64_image(data.assinatura_base64, "assinaturas", "sig_inicial_", db=db)
    assinatura = Assinatura(
        anamnese_id=anamnese.id,
        tipo="inicial",
        imagem_path=sig_path,
    )
    db.add(assinatura)

    db.commit()
    db.refresh(anamnese)

    return _build_detail_response(anamnese, db)


@router.get("/{anamnese_id}", response_model=AnamneseDetailResponse)
def obter_anamnese(
    anamnese_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    anamnese = db.query(Anamnese).options(
        joinedload(Anamnese.paciente),
        joinedload(Anamnese.modelo),
        joinedload(Anamnese.respostas),
        joinedload(Anamnese.assinaturas),
        joinedload(Anamnese.anexos),
    ).filter(Anamnese.id == anamnese_id).first()

    if not anamnese:
        raise HTTPException(status_code=404, detail="Anamnese não encontrada")

    return _build_detail_response(anamnese, db)


@router.put("/{anamnese_id}/finalizar", response_model=AnamneseDetailResponse)
def finalizar_anamnese(
    anamnese_id: int,
    data: AnamneseFinalizarRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    anamnese = db.query(Anamnese).filter(Anamnese.id == anamnese_id).first()
    if not anamnese:
        raise HTTPException(status_code=404, detail="Anamnese não encontrada")
    if anamnese.status == "finalizada":
        raise HTTPException(status_code=400, detail="Anamnese já finalizada")
    # Update observations
    anamnese.observacoes = data.observacoes
    anamnese.status = "finalizada"
    anamnese.finalizada_at = get_brazil_time()

    # Update anexos descricoes if provided
    if data.anexos_descricoes:
        for ad in data.anexos_descricoes:
            anexo = next((a for a in anamnese.anexos if a.id == ad.anexo_id), None)
            if anexo:
                anexo.descricao = ad.descricao

    # Save final signature
    # Remove existing final signature if any to prevent duplicates
    existing_final = db.query(Assinatura).filter(
        Assinatura.anamnese_id == anamnese_id,
        Assinatura.tipo == "final",
    ).first()
    if existing_final:
        db.delete(existing_final)

    sig_path = save_base64_image(data.assinatura_final_base64, "assinaturas", "sig_final_", db=db)
    assinatura = Assinatura(
        anamnese_id=anamnese.id,
        tipo="final",
        imagem_path=sig_path,
    )
    db.add(assinatura)

    db.commit()
    db.refresh(anamnese)

    return _build_detail_response(anamnese, db)


@router.put("/{anamnese_id}/salvar-progresso", response_model=AnamneseDetailResponse)
def salvar_progresso(
    anamnese_id: int,
    data: AnameseSalvarProgressoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    anamnese = db.query(Anamnese).filter(Anamnese.id == anamnese_id).first()
    if not anamnese:
        raise HTTPException(status_code=404, detail="Anamnese não encontrada")
    if anamnese.status == "finalizada":
        raise HTTPException(status_code=400, detail="Anamnese já finalizada")

    # Update observations
    if data.observacoes is not None:
        anamnese.observacoes = data.observacoes

    # Update anexos descricoes if provided
    if data.anexos_descricoes:
        for ad in data.anexos_descricoes:
            anexo = next((a for a in anamnese.anexos if a.id == ad.anexo_id), None)
            if anexo:
                anexo.descricao = ad.descricao

    # Save signature if provided (without finalizing)
    if data.assinatura_final_base64:
        # Remove existing final signature if any (update)
        existing_final = db.query(Assinatura).filter(
            Assinatura.anamnese_id == anamnese_id,
            Assinatura.tipo == "final",
        ).first()
        if existing_final:
            db.delete(existing_final)

        sig_path = save_base64_image(data.assinatura_final_base64, "assinaturas", "sig_rascunho_", db=db)
        assinatura = Assinatura(
            anamnese_id=anamnese.id,
            tipo="final",
            imagem_path=sig_path,
        )
        db.add(assinatura)

    db.commit()
    db.refresh(anamnese)

    return _build_detail_response(anamnese, db)


@router.post("/{anamnese_id}/anexos")
async def upload_anexo(
    anamnese_id: int,
    tipo: str = Form(...),
    descricao: Optional[str] = Form(None),
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    anamnese = db.query(Anamnese).filter(Anamnese.id == anamnese_id).first()
    if not anamnese:
        raise HTTPException(status_code=404, detail="Anamnese não encontrada")

    content = await arquivo.read()
    file_path = save_uploaded_file(content, "anexos", arquivo.filename, db=db)

    anexo = Anexo(
        anamnese_id=anamnese_id,
        tipo=tipo,
        arquivo_path=file_path,
        descricao=descricao,
    )
    db.add(anexo)
    db.commit()
    db.refresh(anexo)

    return AnexoResponse(
        id=anexo.id,
        tipo=anexo.tipo,
        arquivo_path=anexo.arquivo_path,
        descricao=anexo.descricao,
        created_at=anexo.created_at,
    )


@router.delete("/{anamnese_id}/anexos/{anexo_id}")
def deletar_anexo(
    anamnese_id: int,
    anexo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    anexo = db.query(Anexo).filter(Anexo.id == anexo_id, Anexo.anamnese_id == anamnese_id).first()
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    db.delete(anexo)
    db.commit()
    return {"detail": "Anexo removido com sucesso"}


def _build_detail_response(anamnese, db):
    """Build a complete detail response for an anamnese."""
    respostas = []
    for r in anamnese.respostas:
        campo = r.campo
        respostas.append(RespostaResponse(
            id=r.id,
            campo_id=r.campo_id,
            valor=r.valor,
            campo_label=campo.label if campo else None,
            campo_tipo=campo.tipo if campo else None,
        ))

    assinaturas = [
        AssinaturaResponse(
            id=a.id, tipo=a.tipo, imagem_path=a.imagem_path, created_at=a.created_at
        )
        for a in anamnese.assinaturas
    ]

    anexos = [
        AnexoResponse(
            id=a.id, tipo=a.tipo, arquivo_path=a.arquivo_path,
            descricao=a.descricao, created_at=a.created_at
        )
        for a in anamnese.anexos
    ]

    return AnamneseDetailResponse(
        id=anamnese.id,
        paciente_id=anamnese.paciente_id,
        modelo_id=anamnese.modelo_id,
        status=anamnese.status,
        observacoes=anamnese.observacoes,
        created_at=anamnese.created_at,
        finalizada_at=anamnese.finalizada_at,
        paciente_nome=anamnese.paciente.nome if anamnese.paciente else None,
        nome_procedimento=anamnese.modelo.nome_procedimento if anamnese.modelo else None,
        respostas=respostas,
        assinaturas=assinaturas,
        anexos=anexos,
    )
