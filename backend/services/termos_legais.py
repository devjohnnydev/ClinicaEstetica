"""Textos legais exibidos na anamnese (tela e PDF). Variáveis sensíveis escapadas para XML/HTML do ReportLab."""
from xml.sax.saxutils import escape

from config import settings


def esc(s) -> str:
    if s is None:
        return "—"
    return escape(str(s), entities={"'": "&apos;", '"': "&quot;"})


def nome_profissional_autorizacao() -> str:
    return getattr(settings, "CLINICA_PROFISSIONAL_RESPONSAVEL", None) or "Profissional responsável pela clínica"


def local_atendimento_padrao() -> str:
    return getattr(settings, "CLINICA_LOCAL_ATENDIMENTO", None) or "Estabelecimento de saúde / registro eletrônico da clínica"


def html_termo_consentimento(*, nome: str, cpf: str, procedimento: str) -> str:
    n, c, p = esc(nome), esc(cpf), esc(procedimento)
    return f"""
    <b>TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO PARA PROCEDIMENTOS ESTÉTICOS</b>
    <br/><br/>
    <b>Assinatura 1 — obrigatória</b> (consentimento para realização do procedimento e ciência de riscos)
    <br/><br/>
    Eu, <b>{n}</b>, portador(a) do CPF nº <b>{c}</b>, declaro que fui devidamente informado(a), de forma clara,
    objetiva e compreensível, sobre o procedimento estético a ser realizado, denominado <b>{p}</b>.
    <br/><br/>
    Declaro que recebi orientações acerca da natureza do procedimento, seus objetivos, benefícios esperados,
    bem como possíveis riscos, intercorrências e efeitos adversos, que podem incluir, entre outros:
    edema (inchaço), eritema (vermelhidão), hematomas, dor ou desconforto local, assimetrias transitórias ou persistentes,
    reações alérgicas e resultados que podem diferir das expectativas inicialmente discutidas.
    <br/><br/>
    Fui informado(a) de que os resultados variam conforme características individuais (metabolismo, estilo de vida,
    cumprimento das orientações pré e pós-procedimento e condições clínicas pré-existentes).
    <br/><br/>
    Declaro ainda que: informei corretamente meu histórico de saúde; estou ciente da necessidade de seguir as orientações
    pré e pós-procedimento; compreendo que o descumprimento pode comprometer os resultados; tive oportunidade de esclarecer
    dúvidas e estou satisfeito(a) com as explicações recebidas.
    <br/><br/>
    Por fim, autorizo a realização do procedimento acima identificado, de forma livre e consciente, assumindo os riscos
    inerentes ao mesmo, na forma da legislação vigente.
    """.strip()


def html_termo_uso_imagem(*, nome: str, cpf: str, profissional: str) -> str:
    n, c, pr = esc(nome), esc(cpf), esc(profissional)
    return f"""
    <b>TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM</b>
    <br/><br/>
    <b>Assinatura 2 — opcional</b> (autorização de imagem para divulgação)
    <br/><br/>
    Eu, <b>{n}</b>, portador(a) do CPF nº <b>{c}</b>, declaro que, caso abaixo manifeste minha vontade,
    autorizo de forma livre, expressa e gratuita a utilização da minha imagem, capturada antes, durante ou após a
    realização do procedimento estético, pela profissional <b>{pr}</b> e/ou pelo estabelecimento, observada a legislação aplicável.
    <br/><br/>
    O uso autorizado poderá ocorrer para fins educacionais, científicos, publicitários e divulgação em redes sociais
    (Instagram, Facebook, site institucional e similares), desde que preservada a dignidade e a integridade da imagem.
    <br/><br/>
    Estou ciente de que as imagens poderão ser editadas com fins estéticos de divulgação; que não haverá identificação
    do meu nome completo salvo autorização expressa em documento apartado; e que esta autorização, quando concedida,
    não gera compensação financeira, salvo acordo formal distinto.
    <br/><br/>
    Declaro que a autorização, quando conferida, tem prazo indeterminado e poderá ser revogada mediante solicitação formal
    por escrito ao estabelecimento, sem prejuízo do tratamento de dados já realizado até então quando permitido em lei.
    """.strip()


def html_termo_satisfacao(*, nome: str, cpf: str, procedimento: str, opcao: str) -> str:
    n, c, p = esc(nome), esc(cpf), esc(procedimento)
    if opcao == "satisfeito":
        marc_s, marc_n = "[X]", "[ ]"
        texto_sat = "Estou satisfeito(a) com o procedimento realizado."
    elif opcao == "nao_satisfeito":
        marc_s, marc_n = "[ ]", "[X]"
        texto_sat = "Não estou satisfeito(a); fui orientado(a) quanto a possíveis ajustes ou condutas subsequentes."
    else:
        marc_s, marc_n = "[ ]", "[ ]"
        texto_sat = "—"
    return f"""
    <b>TERMO DE CIÊNCIA, CONCLUSÃO E SATISFAÇÃO DO PROCEDIMENTO</b>
    <br/><br/>
    <b>Assinatura 3 — final</b> (ciência de conclusão do atendimento e satisfação declarada)
    <br/><br/>
    Eu, <b>{n}</b>, portador(a) do CPF nº <b>{c}</b>, declaro que o procedimento estético <b>{p}</b> foi realizado
    conforme previamente acordado com o estabelecimento.
    <br/><br/>
    Declaro que: recebi orientações pós-procedimento; fui atendido(a) de forma adequada, ética e profissional;
    compreendo que resultados finais podem evoluir no tempo conforme o tipo de intervenção; e que pode haver necessidade
    de manutenção ou novas sessões para resultados ideais.
    <br/><br/>
    No momento, declaro que:<br/>
    {marc_s} Estou satisfeito(a) com o procedimento realizado.<br/>
    {marc_n} Não estou satisfeito(a), tendo sido orientado(a) sobre possíveis ajustes.<br/>
    <br/>
    <b>Manifestação registrada:</b> {esc(texto_sat)}
    <br/><br/>
    Confirmo que não houve intercorrências relevantes durante o procedimento ou, havendo-as, fui devidamente informado(a)
    e assistido(a). Declaro que as informações prestadas são verdadeiras e que estou de acordo com a finalização deste atendimento.
    """.strip()


def label_uso_imagem_escolha(escolha: str | None) -> str:
    if escolha == "autorizo":
        return "AUTORIZO o uso da minha imagem nos termos acima descritos."
    if escolha == "nao_autorizo":
        return "NÃO AUTORIZO o uso da minha imagem para divulgação."
    return "Declaração de uso de imagem não registrada nesta ficha."
