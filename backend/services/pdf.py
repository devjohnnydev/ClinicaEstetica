import os
import io
import base64
import tempfile
import pytz
from datetime import datetime, timedelta, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from sqlalchemy.orm import Session
from models.db_file import DbFile
from config import settings
from services.termos_legais import (
    html_termo_consentimento,
    html_termo_uso_imagem,
    html_termo_satisfacao,
    nome_profissional_autorizacao,
    label_uso_imagem_escolha,
)

# ─── Clinic Brand Colors ───
BEIGE = colors.HexColor("#F5EDE6")
NUDE = colors.HexColor("#E8D5C4")
GOLD = colors.HexColor("#C6A77D")
GOLD_DARK = colors.HexColor("#A8895F")
TEXT_COLOR = colors.HexColor("#3A3A3A")
TEXT_LIGHT = colors.HexColor("#888888")
WHITE = colors.white
LIGHT_BG = colors.HexColor("#FAFAF8")
BORDER_LIGHT = colors.HexColor("#E8E0D8")

BRAZIL_TZ = pytz.timezone('America/Sao_Paulo')


def get_custom_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        'ClinicTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=GOLD,
        alignment=TA_CENTER,
        spaceAfter=2 * mm,
    ))
    styles.add(ParagraphStyle(
        'ClinicSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=TEXT_LIGHT,
        alignment=TA_CENTER,
        spaceAfter=6 * mm,
    ))
    styles.add(ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=GOLD_DARK,
        spaceBefore=8 * mm,
        spaceAfter=4 * mm,
    ))
    styles.add(ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=TEXT_LIGHT,
        spaceBefore=1 * mm,
    ))
    styles.add(ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=TEXT_COLOR,
        leftIndent=0,
        spaceAfter=1 * mm,
    ))
    styles.add(ParagraphStyle(
        'ObsText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=TEXT_COLOR,
        leading=14,
    ))
    styles.add(ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        textColor=TEXT_LIGHT,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        'SignatureLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=TEXT_COLOR,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        'TermoBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        textColor=TEXT_COLOR,
        leading=11,
        alignment=TA_LEFT,
        spaceAfter=3 * mm,
    ))
    styles.add(ParagraphStyle(
        'TermoMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=TEXT_LIGHT,
        spaceBefore=2 * mm,
        spaceAfter=2 * mm,
    ))
    return styles


def _gold_divider():
    """Elegant gold horizontal divider."""
    return HRFlowable(
        width="100%", thickness=1.5, color=GOLD,
        spaceBefore=2 * mm, spaceAfter=4 * mm,
    )


def _thin_divider():
    """Subtle thin divider."""
    return HRFlowable(
        width="100%", thickness=0.5, color=BORDER_LIGHT,
        spaceBefore=3 * mm, spaceAfter=3 * mm,
    )


def _make_styled_table(data, col_widths, header_row=True):
    """Create a consistently styled table with alternating row colors."""
    table = Table(data, colWidths=col_widths)
    style_commands = [
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 3 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3 * mm),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROUNDEDCORNERS', [3, 3, 3, 3]),
    ]
    if header_row:
        style_commands.extend([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('TEXTCOLOR', (0, 0), (-1, 0), GOLD_DARK),
            ('BACKGROUND', (0, 0), (-1, 0), BEIGE),
        ])
    # Alternating row bg
    for i in range(1 if header_row else 0, len(data)):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), LIGHT_BG))
        else:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), WHITE))
    # Bold first column (labels)
    style_commands.append(('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'))
    table.setStyle(TableStyle(style_commands))
    return table


def _is_base64_image(value):
    """Check if a string value is a base64 encoded image."""
    if not isinstance(value, str):
        return False
    return value.startswith('data:image/')


def _base64_to_temp_file(base64_str):
    """Convert base64 data URI to a temporary file and return the path."""
    try:
        # Remove data URI prefix
        if ',' in base64_str:
            header, data = base64_str.split(',', 1)
        else:
            data = base64_str

        # Determine extension
        ext = '.png'
        if 'jpeg' in base64_str or 'jpg' in base64_str:
            ext = '.jpg'

        img_data = base64.b64decode(data)
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        tmp.write(img_data)
        tmp.close()
        return tmp.name
    except Exception:
        return None


def _get_image_flowable(filepath: str, db: Session, width, height, kind='proportional'):
    """Fetch image from DB (or fallback to disk) and return an RLImage flowable, or None if not found."""
    if not filepath:
        return None
        
    db_file = db.query(DbFile).filter(DbFile.file_path == filepath).first()
    if db_file:
        img_stream = io.BytesIO(db_file.file_data)
        return RLImage(img_stream, width=width, height=height, kind=kind)
        
    disk_path = os.path.join(settings.UPLOAD_DIR, filepath)
    if os.path.exists(disk_path):
        return RLImage(disk_path, width=width, height=height, kind=kind)
        
    return None


def _format_local_datetime(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt).astimezone(BRAZIL_TZ)
    else:
        dt = dt.astimezone(BRAZIL_TZ)
    return dt.strftime("%d/%m/%Y às %H:%M")


def _assinaturas_por_tipo(assinaturas):
    m = {}
    for a in assinaturas or []:
        m[a.tipo] = a
    return m


def _append_assinatura_box(elements, styles, caption, filepath, db):
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(caption, styles['FieldLabel']))
    sig_img = _get_image_flowable(filepath, db, width=8 * cm, height=2.5 * cm)
    if sig_img:
        try:
            sig_table = Table([[sig_img], [Paragraph("Assinatura do(a) paciente", styles['SignatureLabel'])]], colWidths=[10 * cm])
            sig_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 3 * mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3 * mm),
                ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
                ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
                ('ROUNDEDCORNERS', [4, 4, 4, 4]),
            ]))
            elements.append(sig_table)
        except Exception:
            elements.append(Paragraph("[Assinatura indisponível]", styles['FieldValue']))
    else:
        elements.append(Paragraph("[Assinatura não disponível]", styles['FieldValue']))
    elements.append(Spacer(1, 4 * mm))


def generate_anamnese_pdf(anamnese, db) -> bytes:
    """Generate a premium styled PDF for a completed anamnesis."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
    )

    styles = get_custom_styles()
    elements = []
    temp_files = []  # track temp files for cleanup

    # ─── HEADER ───
    elements.append(Paragraph("Clínica de Estética", styles['ClinicTitle']))
    elements.append(Paragraph("Ficha de Anamnese — Prontuário Digital", styles['ClinicSubtitle']))
    elements.append(_gold_divider())

    # ─── PATIENT DATA ───
    elements.append(Paragraph("Dados do Paciente", styles['SectionTitle']))
    paciente = anamnese.paciente
    if paciente:
        patient_data = [
            ["Campo", "Informação"],
            ["Nome", paciente.nome or "—"],
            ["CPF", paciente.cpf or "—"],
            ["Telefone", paciente.telefone or "—"],
            ["Gênero", paciente.genero.capitalize() if paciente.genero else "—"],
            ["Data de Nascimento", str(paciente.data_nascimento) if paciente.data_nascimento else "—"],
        ]
        if paciente.historico_saude:
            patient_data.append(["Histórico de Saúde", paciente.historico_saude])
        table = _make_styled_table(patient_data, [5 * cm, 11.6 * cm])
        elements.append(table)

    # ─── PROCEDURE ───
    elements.append(Paragraph("Procedimento", styles['SectionTitle']))
    if anamnese.modelo:
        proc_data = [
            ["Campo", "Informação"],
            ["Tipo", anamnese.modelo.nome_procedimento],
        ]
        if anamnese.modelo.descricao:
            proc_data.append(["Descrição", anamnese.modelo.descricao])
        table = _make_styled_table(proc_data, [5 * cm, 11.6 * cm])
        elements.append(table)

    # ─── RESPONSES ───
    elements.append(Paragraph("Respostas da Anamnese", styles['SectionTitle']))

    # Face paint image saved for this anamnese
    if getattr(anamnese, "rosto_editado_path", None):
        elements.append(Paragraph("Mapa Facial Editado", styles['FieldLabel']))
        elements.append(Spacer(1, 2 * mm))
        rosto_img = _get_image_flowable(anamnese.rosto_editado_path, db, width=12 * cm, height=12 * cm)
        if rosto_img:
            try:
                elements.append(rosto_img)
            except Exception:
                elements.append(Paragraph("[Imagem do mapa facial indisponível]", styles['FieldValue']))
        else:
            elements.append(Paragraph("[Imagem do mapa facial indisponível]", styles['FieldValue']))
        elements.append(Spacer(1, 4 * mm))

    for resp in anamnese.respostas:
        campo = resp.campo
        if not campo:
            continue

        label = campo.label
        valor = resp.valor

        # Handle different value types
        if isinstance(valor, list):
            valor_str = ", ".join(str(v) for v in valor)
        elif valor is None:
            valor_str = "—"
        elif isinstance(valor, bool) or valor == "true" or valor == "True":
            valor_str = "Sim" if (valor is True or valor == "true" or valor == "True") else "Não"
        elif valor == "false" or valor == "False":
            valor_str = "Não"
        else:
            valor_str = str(valor)

        # Check if this is an image response
        if _is_base64_image(valor_str):
            elements.append(Paragraph(f"{label}:", styles['FieldLabel']))
            elements.append(Spacer(1, 2 * mm))
            tmp_path = _base64_to_temp_file(valor_str)
            if tmp_path:
                temp_files.append(tmp_path)
                try:
                    img = RLImage(tmp_path, width=8 * cm, height=6 * cm, kind='proportional')
                    elements.append(img)
                except Exception:
                    elements.append(Paragraph("[Imagem enviada]", styles['FieldValue']))
            else:
                elements.append(Paragraph("[Imagem enviada]", styles['FieldValue']))
            elements.append(Spacer(1, 3 * mm))
        else:
            # Regular text response — use a mini table for clean layout
            resp_block = [
                Paragraph(f"{label}", styles['FieldLabel']),
                Spacer(1, 1 * mm),
                Paragraph(valor_str, styles['FieldValue']),
                Spacer(1, 2 * mm),
                _thin_divider(),
            ]
            elements.append(KeepTogether(resp_block))

    # ─── OBSERVATIONS ───
    if anamnese.observacoes:
        elements.append(Paragraph("Observações do Procedimento", styles['SectionTitle']))
        # Box around observations
        obs_data = [[Paragraph(anamnese.observacoes, styles['ObsText'])]]
        obs_table = Table(obs_data, colWidths=[16.6 * cm])
        obs_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BEIGE),
            ('LEFTPADDING', (0, 0), (-1, -1), 4 * mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4 * mm),
            ('TOPPADDING', (0, 0), (-1, -1), 4 * mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4 * mm),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))
        elements.append(obs_table)

    # ─── DOCUMENTOS LEGAIS (assinaturas na criação da ficha) ───
    elements.append(Paragraph("Documentos legais — fase de anamnese", styles['SectionTitle']))
    sig_map = _assinaturas_por_tipo(anamnese.assinaturas)
    pac = anamnese.paciente
    proc_nome = anamnese.modelo.nome_procedimento if anamnese.modelo else "—"
    local_txt = settings.CLINICA_LOCAL_ATENDIMENTO

    consent_sig = sig_map.get("consentimento") or sig_map.get("inicial")
    if pac and consent_sig:
        elements.append(Paragraph(html_termo_consentimento(
            nome=pac.nome or "—",
            cpf=pac.cpf or "—",
            procedimento=proc_nome,
            riscos=anamnese.modelo.riscos_procedimento if anamnese.modelo else None,
        ), styles['TermoBody']))
        dt_consent = _format_local_datetime(consent_sig.created_at)
        elements.append(Paragraph(
            f"<b>Local:</b> {local_txt}<br/><b>Data e hora da assinatura:</b> {dt_consent or '—'}",
            styles['TermoMeta'],
        ))
        _append_assinatura_box(
            elements, styles,
            "Assinatura do(a) paciente — Termo de consentimento (obrigatório)",
            consent_sig.imagem_path, db,
        )
        elements.append(_thin_divider())

    uso_sig = sig_map.get("uso_imagem")
    uso_escolha = getattr(anamnese, "uso_imagem_escolha", None)
    if pac and (uso_escolha or uso_sig):
        elements.append(Paragraph(html_termo_uso_imagem(
            nome=pac.nome or "—",
            cpf=pac.cpf or "—",
            profissional=nome_profissional_autorizacao(),
        ), styles['TermoBody']))
        elements.append(Paragraph(
            f"<b>Manifestação registrada:</b> {label_uso_imagem_escolha(uso_escolha)}",
            styles['TermoMeta'],
        ))
        dt_uso = _format_local_datetime(uso_sig.created_at) if uso_sig else _format_local_datetime(anamnese.created_at)
        elements.append(Paragraph(
            f"<b>Local:</b> {local_txt}<br/><b>Data e hora do registro:</b> {dt_uso or '—'}",
            styles['TermoMeta'],
        ))
        if uso_sig:
            _append_assinatura_box(
                elements, styles,
                "Assinatura do(a) paciente — Termo de uso de imagem (opcional)",
                uso_sig.imagem_path, db,
            )
        else:
            elements.append(Paragraph(
                "<i>Assinatura manuscrita não anexada neste termo; manifestação registrada apenas pela opção acima.</i>",
                styles['TermoMeta'],
            ))
            elements.append(Spacer(1, 3 * mm))
        elements.append(_thin_divider())

    # ─── ATTACHMENTS ───
    if anamnese.anexos:
        elements.append(Paragraph("Fotos do Procedimento", styles['SectionTitle']))

        bancada_anexos = [a for a in anamnese.anexos if a.tipo == 'bancada']
        antes_depois_anexos = [a for a in anamnese.anexos if a.tipo == 'antes_depois']
        adicionais_anexos = [a for a in anamnese.anexos if a.tipo not in ('bancada', 'antes_depois')]

        grupos = [
            (bancada_anexos, "Foto da Bancada"),
            (antes_depois_anexos, "Antes / Depois"),
            (adicionais_anexos, "Fotos Adicionais")
        ]

        for grupo, titulo in grupos:
            if not grupo:
                continue
            elements.append(Paragraph(titulo, styles['FieldLabel']))
            elements.append(Spacer(1, 2 * mm))
            for anexo in grupo:
                img = _get_image_flowable(anexo.arquivo_path, db, width=10 * cm, height=7 * cm)
                if img:
                    try:
                        # Wrap in a styled box
                        img_table = Table([[img]], colWidths=[12 * cm])
                        img_table.setStyle(TableStyle([
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('TOPPADDING', (0, 0), (-1, -1), 2 * mm),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 2 * mm),
                            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
                            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
                        ]))
                        elements.append(img_table)
                    except Exception:
                        elements.append(Paragraph("[Erro ao carregar imagem]", styles['FieldValue']))
                else:
                    elements.append(Paragraph("[Imagem não disponível no banco]", styles['FieldValue']))
                
                if anexo.descricao and anexo.descricao.strip().lower() not in ["", "foto da bancada", "antes/depois", "antes / depois"]:
                    elements.append(Paragraph(anexo.descricao, styles['FieldValue']))
                elements.append(Spacer(1, 3 * mm))

    # ─── TERMO FINAL (conclusão / satisfação) — após registros do procedimento ───
    final_sig = sig_map.get("final")
    satisfacao = getattr(anamnese, "satisfacao_procedimento", None) or ""
    if pac and final_sig:
        elements.append(Paragraph("Documento legal — conclusão do procedimento", styles['SectionTitle']))
        elements.append(Paragraph(html_termo_satisfacao(
            nome=pac.nome or "—",
            cpf=pac.cpf or "—",
            procedimento=proc_nome,
            opcao=satisfacao,
        ), styles['TermoBody']))
        dt_fin = _format_local_datetime(anamnese.finalizada_at or final_sig.created_at)
        elements.append(Paragraph(
            f"<b>Local:</b> {local_txt}<br/><b>Data e hora da assinatura:</b> {dt_fin or '—'}",
            styles['TermoMeta'],
        ))
        _append_assinatura_box(
            elements, styles,
            "Assinatura do(a) paciente — Termo de ciência, conclusão e satisfação (final)",
            final_sig.imagem_path, db,
        )

    # ─── FOOTER ───
    elements.append(Spacer(1, 10 * mm))
    elements.append(_gold_divider())
    
    # Timezone conversion for footer
    created_dt = anamnese.created_at
    if created_dt and created_dt.tzinfo is None:
        created_dt = pytz.utc.localize(created_dt).astimezone(BRAZIL_TZ)
    elif created_dt:
        created_dt = created_dt.astimezone(BRAZIL_TZ)
        
    finalizada_dt = anamnese.finalizada_at
    if finalizada_dt and finalizada_dt.tzinfo is None:
        finalizada_dt = pytz.utc.localize(finalizada_dt).astimezone(BRAZIL_TZ)
    elif finalizada_dt:
        finalizada_dt = finalizada_dt.astimezone(BRAZIL_TZ)

    created = created_dt.strftime("%d/%m/%Y às %H:%M") if created_dt else "—"
    finalizada = finalizada_dt.strftime("%d/%m/%Y às %H:%M") if finalizada_dt else "—"
    elements.append(Paragraph(
        f"Criada em: {created}  •  Finalizada em: {finalizada}",
        styles['FooterStyle'],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(
        "Documento gerado automaticamente — Clínica de Estética — Prontuário Digital",
        styles['FooterStyle'],
    ))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    pdf_bytes = buffer.read()

    # Cleanup temp files
    for tmp in temp_files:
        try:
            os.unlink(tmp)
        except Exception:
            pass

    return pdf_bytes
