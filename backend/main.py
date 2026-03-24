from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
import os

from database import engine, Base, get_db
from config import settings
from models.user import User
from models.paciente import Paciente
from models.modelo_anamnese import ModeloAnamnese, CampoModelo
from models.anamnese import Anamnese, Resposta
from models.assinatura import Assinatura
from models.anexo import Anexo
# Agenda models (import so tables are created)
from models.agenda_cliente import AgendaCliente
from models.servico import Servico
from models.profissional import Profissional, ProfissionalServico
from models.agendamento import Agendamento
from models.bloqueio_horario import BloqueioHorario
from models.lista_espera import ListaEspera
from services.auth import get_password_hash, get_current_user
from services.pdf import generate_anamnese_pdf

from routers import auth, pacientes, modelos, anamneses
from routers import agenda as agenda_router

# Create all tables (including new agenda tables)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Clínica de Estética - API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(pacientes.router)
app.include_router(modelos.router)
app.include_router(anamneses.router)
app.include_router(agenda_router.router)


# PDF Download endpoint
@app.get("/api/anamneses/{anamnese_id}/pdf")
def download_pdf(
    anamnese_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    anamnese = db.query(Anamnese).options(
        joinedload(Anamnese.paciente),
        joinedload(Anamnese.modelo),
        joinedload(Anamnese.respostas).joinedload(Resposta.campo),
        joinedload(Anamnese.assinaturas),
        joinedload(Anamnese.anexos),
    ).filter(Anamnese.id == anamnese_id).first()

    if not anamnese:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Anamnese não encontrada")

    pdf_bytes = generate_anamnese_pdf(anamnese, db)

    paciente_nome = anamnese.paciente.nome.replace(" ", "_") if anamnese.paciente else "paciente"
    filename = f"anamnese_{paciente_nome}_{anamnese.id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Dashboard stats endpoint
@app.get("/api/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func
    total_pacientes = db.query(func.count(Paciente.id)).scalar() or 0
    total_anamneses = db.query(func.count(Anamnese.id)).scalar() or 0
    em_andamento = db.query(func.count(Anamnese.id)).filter(Anamnese.status == "em_andamento").scalar() or 0
    finalizadas = db.query(func.count(Anamnese.id)).filter(Anamnese.status == "finalizada").scalar() or 0
    total_modelos = db.query(func.count(ModeloAnamnese.id)).scalar() or 0

    # Recent anamneses
    recentes = db.query(Anamnese).options(
        joinedload(Anamnese.paciente),
        joinedload(Anamnese.modelo),
    ).order_by(Anamnese.created_at.desc()).limit(5).all()

    return {
        "total_pacientes": total_pacientes,
        "total_anamneses": total_anamneses,
        "em_andamento": em_andamento,
        "finalizadas": finalizadas,
        "total_modelos": total_modelos,
        "recentes": [
            {
                "id": a.id,
                "paciente_nome": a.paciente.nome if a.paciente else "—",
                "procedimento": a.modelo.nome_procedimento if a.modelo else "—",
                "status": a.status,
                "created_at": str(a.created_at) if a.created_at else None,
            }
            for a in recentes
        ],
    }


@app.on_event("startup")
def run_migrations_and_seed():
    """Add missing columns to existing tables + create default admin user."""
    from database import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    try:
        # ── Column migrations (safe: ignores if column already exists) ──
        migrations = [
            # profissionais table
            ("profissionais", "email", "VARCHAR"),
            ("profissionais", "user_id", "INTEGER REFERENCES users(id)"),
            # users table
            ("users", "perfil", "VARCHAR DEFAULT 'admin'"),
            ("users", "profissional_id", "INTEGER"),
        ]
        for table, col, col_type in migrations:
            try:
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                db.commit()
                print(f"  ✅ Coluna {table}.{col} adicionada")
            except Exception:
                db.rollback()  # column already exists, that's fine

        # ── Default admin user ───────────────────────────────────────
        existing = db.query(User).first()
        if not existing:
            user = User(
                email="admin@clinica.com",
                nome="Administradora",
                password_hash=get_password_hash("admin123"),
                perfil="admin",
            )
            db.add(user)
            db.commit()
            print("  ✅ Usuário padrão criado: admin@clinica.com / admin123")

        # Set perfil='admin' for existing users that have NULL perfil
        db.execute(text("UPDATE users SET perfil='admin' WHERE perfil IS NULL"))
        db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ─── Serve frontend (production) ───────────────────────────────────
# When deployed, the built frontend sits in ../frontend/dist
# The backend serves it as static files with SPA fallback
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")

if os.path.isdir(FRONTEND_DIR):
    from fastapi.responses import FileResponse

    # Serve static assets (js, css, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="frontend_assets")

    # SPA fallback — any non-API route returns index.html
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Check if the file exists in dist
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Return index.html for SPA routing
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
