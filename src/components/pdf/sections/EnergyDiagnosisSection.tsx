import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';
import { getSectionTitleStyle, usePdfTheme } from '../pdfTheme';

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#18181b',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: '#3b82f6',
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
    marginBottom: 14,
  },
  card: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e4e4e7',
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
  roofSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 8,
    marginTop: 4,
  },
  roofPlanningBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  roofImageBox: {
    width: '58%',
    height: 170,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  roofImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.4,
    textAlign: 'center',
  },
  modulePlanBox: {
    width: '38%',
    height: 170,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
  },
  planTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 8,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moduleRect: {
    width: 22,
    height: 34,
    borderRadius: 2,
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  planNote: {
    fontSize: 8,
    color: '#71717a',
    lineHeight: 1.35,
    marginTop: 8,
  },
  objectiveBox: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 4,
    borderLeftStyle: 'solid',
    borderLeftColor: '#10b981',
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
  const theme = usePdfTheme();
  const solar = proposal.solar;
  const generationTarget = solar?.generation_target_percent || 100;
  const roofImageUrl =
    (proposal as any).roof_image_url ||
    (proposal as any).roof_photo_url ||
    (proposal as any).roof_plan_image_url ||
    null;
  const moduleCount = Math.min(Math.max(solar?.panel_count || 8, 4), 24);

  return (
    <View>
      <Text style={[styles.sectionTitle, getSectionTitleStyle(theme)]}>Diagnóstico Energético</Text>
      <Text style={styles.intro}>
        Esta etapa resume a situação de consumo considerada no dimensionamento e os dados usados para estimar a economia do sistema.
      </Text>

      <View style={styles.grid}>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Método de consumo</Text>
          <Text style={[styles.cardValue, { color: theme.neutral }]}>{sourceLabel[proposal.consumption_source || 'average'] || 'Consumo informado'}</Text>
        </View>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Consumo mensal considerado</Text>
          <Text style={[styles.cardValue, { color: theme.neutral }]}>{formatKwh(solar?.monthly_consumption_kwh || proposal.monthly_consumption_kwh)}</Text>
        </View>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Valor médio da conta</Text>
          <Text style={[styles.cardValue, { color: theme.neutral }]}>{formatMoney(proposal.bill_amount || solar?.current_bill_value)}</Text>
        </View>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Tarifa estimada</Text>
          <Text style={[styles.cardValue, { color: theme.neutral }]}>{formatMoney(proposal.energy_tariff || solar?.energy_tariff)}/kWh</Text>
        </View>
      </View>

      <Text style={[styles.roofSectionTitle, { color: theme.neutral }]}>Foto do telhado e planimetria dos módulos</Text>
      <View style={styles.roofPlanningBox}>
        <View style={[styles.roofImageBox, { borderColor: theme.primary }]}> 
          {roofImageUrl ? (
            <Image src={roofImageUrl} style={styles.roofImage} />
          ) : (
            <View>
              <Text style={[styles.placeholderTitle, { color: theme.neutral }]}>Espaço para foto do telhado do cliente</Text>
              <Text style={styles.placeholderText}>
                Área reservada para inserir a imagem real do local de instalação, com visão do telhado ou área onde os módulos serão posicionados.
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.modulePlanBox, { borderColor: theme.border }]}> 
          <Text style={[styles.planTitle, { color: theme.neutral }]}>Planimetria preliminar</Text>
          <View style={styles.moduleGrid}>
            {Array.from({ length: moduleCount }).map((_, index) => (
              <View
                key={`module-${index}`}
                style={[
                  styles.moduleRect,
                  {
                    backgroundColor: theme.primarySoft,
                    borderColor: theme.primary,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.planNote}>
            Representação visual preliminar dos módulos. A posição final depende da visita técnica, orientação do telhado, sombreamento e estrutura.
          </Text>
        </View>
      </View>

      <View style={[styles.objectiveBox, { backgroundColor: theme.secondarySoft, borderLeftColor: theme.secondary }]}> 
        <Text style={[styles.objectiveTitle, { color: theme.secondary }]}>Objetivo da solução</Text>
        <Text style={[styles.objectiveText, { color: theme.neutral }]}> 
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