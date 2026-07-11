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
  intro: {
    fontSize: 12,
    color: '#3f3f46',
    lineHeight: 1.5,
    marginBottom: 18,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  card: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
    border: '1px solid #e4e4e7',
  },
  cardLabel: {
    fontSize: 9,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#18181b',
  },
  objectiveBox: {
    backgroundColor: '#ecfdf5',
    borderLeft: '4px solid #10b981',
    padding: 16,
    borderRadius: 8,
    marginTop: 6,
  },
  objectiveTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: 6,
  },
  objectiveText: {
    fontSize: 11,
    color: '#065f46',
    lineHeight: 1.45,
  },
  note: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 16,
    lineHeight: 1.4,
    fontStyle: 'italic',
  },
});

const formatMoney = (val: number | null | undefined) => {
  if (val === null || val === undefined) return 'N/A';
  return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatKwh = (val: number | null | undefined) => {
  if (val === null || val === undefined) return 'N/A';
  return `${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`;
};

const sourceLabel: Record<string, string> = {
  average: 'Consumo médio informado',
  historical: 'Histórico de consumo',
  load_survey: 'Levantamento de cargas',
};

export const EnergyDiagnosisSection = ({ proposal }: { proposal: Proposal }) => {
  const solar = proposal.solar;
  const generationTarget = solar?.generation_target_percent || 100;

  return (
    <View>
      <Text style={styles.sectionTitle}>Diagnóstico Energético</Text>
      <Text style={styles.intro}>
        Esta etapa resume a situação de consumo considerada no dimensionamento e os dados usados para estimar a economia do sistema.
      </Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Método de consumo</Text>
          <Text style={styles.cardValue}>{sourceLabel[proposal.consumption_source || 'average'] || 'Consumo informado'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Consumo mensal considerado</Text>
          <Text style={styles.cardValue}>{formatKwh(solar?.monthly_consumption_kwh || proposal.monthly_consumption_kwh)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Valor médio da conta</Text>
          <Text style={styles.cardValue}>{formatMoney(proposal.bill_amount || solar?.current_bill_value)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tarifa estimada</Text>
          <Text style={styles.cardValue}>{formatMoney(proposal.energy_tariff || solar?.energy_tariff)}/kWh</Text>
        </View>
      </View>

      <View style={styles.objectiveBox}>
        <Text style={styles.objectiveTitle}>Objetivo da solução</Text>
        <Text style={styles.objectiveText}>
          Dimensionar um sistema fotovoltaico capaz de atender aproximadamente {generationTarget.toFixed(0)}% do consumo considerado,
          respeitando os parâmetros técnicos de irradiação solar, rendimento, potência dos módulos e relação DC/AC do inversor.
        </Text>
      </View>

      <Text style={styles.note}>
        Observação: valores de consumo, tarifa e economia podem variar conforme hábitos de uso, reajustes tarifários, bandeiras, impostos,
        disponibilidade solar e regras de compensação vigentes.
      </Text>
    </View>
  );
};
