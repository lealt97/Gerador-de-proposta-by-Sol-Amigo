import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#18181b',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: 5,
  },
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  column: {
    width: '48%',
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 10,
  },
  item: {
    fontSize: 10,
    color: '#52525b',
    lineHeight: 1.4,
    marginBottom: 8,
  },
  stepBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e4e4e7',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 10,
    color: '#3f3f46',
    lineHeight: 1.4,
  },
  note: {
    fontSize: 10,
    color: '#71717a',
    lineHeight: 1.4,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export const WarrantyAndNextStepsSection = ({ proposal }: { proposal: Proposal }) => {
  const companyName = proposal.profile?.company_name || 'empresa responsável';

  return (
    <View>
      <Text style={styles.sectionTitle}>Garantias e Próximos Passos</Text>

      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <Text style={styles.blockTitle}>Garantias consideradas</Text>
          <Text style={styles.item}>• Garantia dos módulos fotovoltaicos conforme termo do fabricante.</Text>
          <Text style={styles.item}>• Garantia do inversor conforme marca e modelo definidos no kit final.</Text>
          <Text style={styles.item}>• Garantia dos materiais elétricos conforme especificação técnica e fornecedor.</Text>
          <Text style={styles.item}>• Garantia de instalação conforme condições comerciais e contrato firmado.</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.blockTitle}>Responsabilidades do projeto</Text>
          <Text style={styles.item}>• Projeto executivo e documentação técnica para homologação.</Text>
          <Text style={styles.item}>• Instalação por equipe qualificada.</Text>
          <Text style={styles.item}>• Testes, comissionamento e orientação inicial de uso.</Text>
          <Text style={styles.item}>• Acompanhamento até a liberação do sistema pela concessionária.</Text>
        </View>
      </View>

      <Text style={styles.blockTitle}>Próximos passos para implantação</Text>

      <View style={styles.stepBox}>
        <Text style={styles.stepTitle}>1. Aprovação da proposta</Text>
        <Text style={styles.stepText}>Confirmação do investimento, condições comerciais e escopo da solução.</Text>
      </View>
      <View style={styles.stepBox}>
        <Text style={styles.stepTitle}>2. Visita técnica e projeto executivo</Text>
        <Text style={styles.stepText}>Validação do local de instalação, estrutura, acesso, padrão de entrada e ajustes técnicos necessários.</Text>
      </View>
      <View style={styles.stepBox}>
        <Text style={styles.stepTitle}>3. Homologação e instalação</Text>
        <Text style={styles.stepText}>Execução dos trâmites com a concessionária, instalação do sistema, testes e ativação do monitoramento.</Text>
      </View>

      <Text style={styles.note}>
        As condições finais serão confirmadas por {companyName} após validação técnica e aprovação comercial do cliente.
      </Text>
    </View>
  );
};
