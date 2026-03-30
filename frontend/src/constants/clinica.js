/** Configuração exibida nos termos legais (opcional: .env → VITE_*) */
export const CLINICA_LOCAL =
  import.meta.env.VITE_CLINICA_LOCAL_ATENDIMENTO ||
  'Estabelecimento de saúde / registro eletrônico da clínica';

export const CLINICA_PROFISSIONAL =
  import.meta.env.VITE_CLINICA_PROFISSIONAL_RESPONSAVEL ||
  'Profissional responsável pela clínica';
