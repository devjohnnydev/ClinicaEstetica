import { CLINICA_LOCAL, CLINICA_PROFISSIONAL } from '../constants/clinica';

function MetaLinha({ local, dataHora }) {
  return (
    <div className="mt-4 p-3 rounded-xl bg-soft/50 border border-secondary/30 text-xs text-dark/70 space-y-1">
      <p>
        <span className="font-semibold text-dark/80">Local: </span>
        {local || CLINICA_LOCAL}
      </p>
      <p>
        <span className="font-semibold text-dark/80">Data e hora: </span>
        {dataHora}
      </p>
      <p className="text-dark/50 italic">
        O registro oficial no prontuário será o horário do servidor no momento em que a ficha for salva.
      </p>
    </div>
  );
}

/** Termo 1 — consentimento (obrigatório) */
export function TermoConsentimentoBloco({ nome, cpf, procedimento, riscos, local, dataHoraPreview }) {
  const textoRiscos = riscos || 'edema, eritema, hematomas, dor local, assimetrias, reações alérgicas e resultados que podem diferir do esperado';

  return (
    <div className="rounded-2xl border border-secondary/40 bg-white p-4 sm:p-5 space-y-3 text-sm text-dark/90 leading-relaxed">
      <div className="border-b border-accent/20 pb-3">
        <h3 className="font-heading font-semibold text-dark text-base">
          Termo de consentimento para procedimento estético
        </h3>
        <p className="text-xs text-accent font-medium mt-1">Assinatura 1 — obrigatória</p>
      </div>
      <p className="font-semibold text-dark text-xs uppercase tracking-wide text-dark/60">
        Consentimento livre e esclarecido
      </p>
      <p>
        Eu, <strong>{nome || '—'}</strong>, portador(a) do CPF nº <strong>{cpf || '—'}</strong>, declaro que fui
        informado(a), de forma clara e compreensível, sobre o procedimento estético denominado{' '}
        <strong>{procedimento || '—'}</strong>.
      </p>
      <p>
        Recebi explicações sobre objetivos, benefícios esperados, riscos e efeitos adversos possíveis, incluindo, entre
        outros: <span className="font-medium text-dark">{textoRiscos}</span>.
      </p>
      <p>
        Estou ciente de que os resultados dependem de fatores individuais e do cumprimento das orientações pré e
        pós-procedimento. Informei meu histórico de saúde com veracidade e tive oportunidade de tirar dúvidas.
      </p>
      <p>
        <strong>Autorizo</strong> a realização do procedimento acima, de forma livre e consciente, nos termos da
        legislação vigente.
      </p>
      <MetaLinha local={local} dataHora={dataHoraPreview} />
    </div>
  );
}

/** Termo 2 — uso de imagem (opcional) */
export function TermoUsoImagemBloco({ nome, cpf, local, dataHoraPreview }) {
  return (
    <div className="rounded-2xl border border-secondary/40 bg-white p-4 sm:p-5 space-y-3 text-sm text-dark/90 leading-relaxed">
      <div className="border-b border-accent/20 pb-3">
        <h3 className="font-heading font-semibold text-dark text-base">
          Termo de autorização para uso de imagem
        </h3>
        <p className="text-xs text-dark/50 font-medium mt-1">Assinatura 2 — opcional</p>
      </div>
      <p>
        Eu, <strong>{nome || '—'}</strong>, portador(a) do CPF nº <strong>{cpf || '—'}</strong>, se optar por
        manifestar minha vontade abaixo, autorizo o uso da minha imagem (antes, durante ou após o procedimento) pela{' '}
        <strong>{CLINICA_PROFISSIONAL}</strong> e/ou pelo estabelecimento, conforme a opção assinalada.
      </p>
      <p>
        O uso pode ocorrer para fins educacionais, científicos, publicitários e redes sociais, respeitada a dignidade da
        imagem. Estou ciente de que não há identificação pelo nome completo sem autorização expressa adicional e que não
        há remuneração por essa autorização, salvo acordo formal distinto. A autorização, quando concedida, é por prazo
        indeterminado e pode ser revogada por solicitação escrita, sem prejuízo do tratamento já realizado quando
        permitido em lei.
      </p>
      <MetaLinha local={local} dataHora={dataHoraPreview} />
    </div>
  );
}

/** Termo 3 — satisfação / conclusão (finalização) */
export function TermoSatisfacaoBloco({ nome, cpf, procedimento, local, dataHoraPreview }) {
  return (
    <div className="rounded-2xl border border-secondary/40 bg-white p-4 sm:p-5 space-y-3 text-sm text-dark/90 leading-relaxed">
      <div className="border-b border-accent/20 pb-3">
        <h3 className="font-heading font-semibold text-dark text-base">
          Termo de ciência, conclusão e satisfação do procedimento
        </h3>
        <p className="text-xs text-accent font-medium mt-1">Assinatura 3 — final (na conclusão do atendimento)</p>
      </div>
      <p>
        Eu, <strong>{nome || '—'}</strong>, portador(a) do CPF nº <strong>{cpf || '—'}</strong>, declaro que o
        procedimento <strong>{procedimento || '—'}</strong> foi realizado conforme combinado.
      </p>
      <p>
        Recebi orientações pós-procedimento, fui atendido(a) de forma adequada e compreendo que os resultados podem
        evoluir no tempo e que podem ser necessárias manutenções ou novas sessões.
      </p>
      <p className="text-dark/70 text-xs">
        Marque uma opção abaixo e assine para confirmar sua manifestação no encerramento desta ficha.
      </p>
      <MetaLinha local={local} dataHora={dataHoraPreview} />
    </div>
  );
}
