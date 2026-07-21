export type LegalDocumentType = 'terms' | 'privacy' | 'refund';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocumentDefinition {
  type: LegalDocumentType;
  version: string;
  title: string;
  shortTitle: string;
  route: string;
  effectiveLabel: string;
  reviewStatus: 'draft' | 'legal_review' | 'approved';
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_VERSIONS = {
  terms: '2026-07-draft',
  privacy: '2026-07-draft',
  refund: '2026-07-draft',
} as const;

export const LEGAL_DOCUMENTS: Record<LegalDocumentType, LegalDocumentDefinition> = {
  terms: {
    type: 'terms',
    version: LEGAL_VERSIONS.terms,
    title: 'Termos de Uso',
    shortTitle: 'Termos',
    route: '/termos',
    effectiveLabel: 'Minuta do beta — julho de 2026',
    reviewStatus: 'draft',
    intro: 'Estes Termos regulam o uso do SolAmigo Propostas FV durante o beta controlado. A versão ainda depende de revisão jurídica antes do lançamento comercial aberto.',
    sections: [
      {
        title: '1. Finalidade do serviço',
        paragraphs: [
          'O SolAmigo é uma ferramenta de apoio para cadastro de clientes, dimensionamento preliminar, cálculo comercial, organização de propostas e geração de documentos para sistemas fotovoltaicos.',
          'O serviço não substitui projeto executivo, responsabilidade técnica, vistoria, homologação junto à distribuidora, análise estrutural, enquadramento tributário ou validação profissional obrigatória.',
        ],
      },
      {
        title: '2. Responsabilidades da conta',
        paragraphs: ['A conta deve manter informações verdadeiras, proteger credenciais e revisar os dados antes de enviar qualquer proposta ao cliente final.'],
        bullets: [
          'não compartilhar senha, TOTP, códigos de recuperação ou links privados;',
          'não inserir conteúdo ilícito, malicioso ou pertencente a terceiros sem autorização;',
          'validar equipamentos, preços, tributos, geração, economia e condições comerciais;',
          'respeitar limites do plano, políticas de uso e direitos dos titulares de dados.',
        ],
      },
      {
        title: '3. Planos, disponibilidade e alterações',
        paragraphs: [
          'Planos podem possuir limites de propostas, armazenamento, usuários e funcionalidades. Bloqueios de cota afetam somente novas operações incrementais e não autorizam exclusão automática de dados existentes.',
          'Manutenções, incidentes e alterações relevantes serão comunicados pelos canais disponíveis. Funcionalidades do beta podem mudar antes da abertura comercial.',
        ],
      },
      {
        title: '4. Suspensão e encerramento',
        paragraphs: [
          'O acesso pode ser temporariamente suspenso por risco de segurança, fraude, chargeback, abuso, ordem legal ou violação grave destes Termos. A conta pode solicitar exportação e exclusão pelos recursos disponibilizados, observadas retenções obrigatórias.',
        ],
      },
    ],
  },
  privacy: {
    type: 'privacy',
    version: LEGAL_VERSIONS.privacy,
    title: 'Política de Privacidade',
    shortTitle: 'Privacidade',
    route: '/privacidade',
    effectiveLabel: 'Minuta do beta — julho de 2026',
    reviewStatus: 'draft',
    intro: 'Esta Política descreve, em linguagem operacional, como o SolAmigo trata dados durante o beta controlado. A versão depende de revisão jurídica e definição formal do canal do encarregado antes do lançamento aberto.',
    sections: [
      {
        title: '1. Dados tratados',
        paragraphs: ['O serviço pode tratar dados fornecidos pela conta, gerados pelo uso e recebidos de provedores estritamente necessários.'],
        bullets: [
          'dados de cadastro, empresa, vendedor e autenticação;',
          'dados de clientes, endereços, consumo, propostas e aceite comercial;',
          'logos, fotos, modelos, PDFs e demais arquivos enviados;',
          'assinatura, pagamento, cotas e eventos do provedor;',
          'logs de segurança, falhas técnicas, auditoria e uso do produto.',
        ],
      },
      {
        title: '2. Finalidades',
        paragraphs: ['Os dados são usados para fornecer, proteger, cobrar, auditar e melhorar o serviço, atender solicitações da conta e cumprir obrigações legais ou regulatórias aplicáveis.'],
      },
      {
        title: '3. Compartilhamento e proteção',
        paragraphs: [
          'Dados não são vendidos. Fornecedores de infraestrutura, autenticação, armazenamento, e-mail e pagamento recebem somente o necessário para executar suas funções, sob controles contratuais e técnicos.',
          'O sistema usa isolamento por conta, RLS, arquivos privados, URLs assinadas, autenticação reforçada e trilhas de auditoria para reduzir acesso indevido.',
        ],
      },
      {
        title: '4. Direitos do titular',
        paragraphs: ['A conta pode corrigir dados, exportar uma cópia estruturada e solicitar exclusão pelos recursos disponíveis. Pedidos relativos a dados de clientes finais devem ser tratados pela empresa que os cadastrou, com apoio técnico do SolAmigo quando necessário.'],
      },
      {
        title: '5. Retenção',
        paragraphs: ['Dados ativos permanecem enquanto a conta utiliza o serviço. Após exclusão, registros podem ser preservados apenas pelo prazo necessário para segurança, prevenção de fraude, auditoria, defesa de direitos e cumprimento de obrigação legal. A política definitiva de retenção será aprovada antes do lançamento aberto.'],
      },
    ],
  },
  refund: {
    type: 'refund',
    version: LEGAL_VERSIONS.refund,
    title: 'Política de Cancelamento e Reembolso',
    shortTitle: 'Cancelamento e reembolso',
    route: '/cancelamento-reembolso',
    effectiveLabel: 'Minuta do beta — julho de 2026',
    reviewStatus: 'draft',
    intro: 'Esta minuta organiza o fluxo do beta e não substitui os direitos obrigatórios previstos na legislação aplicável nem a política comercial final.',
    sections: [
      {
        title: '1. Plano Gratuito',
        paragraphs: ['O plano Gratuito não possui cobrança recorrente e pode ser encerrado pela própria conta, após exportação opcional dos dados.'],
      },
      {
        title: '2. Cancelamento do plano pago',
        paragraphs: ['O cancelamento impede nova renovação. Salvo fraude, chargeback ou violação grave, o acesso pago permanece até o fim do período já quitado. Cancelar a assinatura não exclui automaticamente a conta ou os arquivos.'],
      },
      {
        title: '3. Reembolso e arrependimento',
        paragraphs: ['Pedidos de arrependimento, cobrança duplicada, indisponibilidade relevante ou erro de processamento serão avaliados conforme a legislação aplicável, a data da compra, o uso do serviço e as regras do meio de pagamento.'],
      },
      {
        title: '4. Falha de pagamento',
        paragraphs: ['Uma cobrança recusada pode iniciar período de tolerância. Encerrada a tolerância sem regularização, a conta retorna aos limites gratuitos, preservando os dados existentes e bloqueando somente novas operações acima da cota.'],
      },
      {
        title: '5. Confirmação do provedor',
        paragraphs: ['A abertura de uma página de checkout não comprova pagamento. Ativação, renovação, recusa, reembolso e cancelamento dependem de evento autenticado e processado no servidor.'],
      },
    ],
  },
};

export const REQUIRED_LEGAL_ACCEPTANCES = [
  { document_type: 'terms' as const, version: LEGAL_VERSIONS.terms },
  { document_type: 'privacy' as const, version: LEGAL_VERSIONS.privacy },
  { document_type: 'refund' as const, version: LEGAL_VERSIONS.refund },
];
