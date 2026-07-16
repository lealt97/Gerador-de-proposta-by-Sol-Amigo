import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';
import { extractActiveLogo } from '../../../utils/logoHelper';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  },
  whitePatch: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  textSmall: {
    position: 'absolute',
    fontSize: 9,
    color: '#27272a',
    fontWeight: 'bold',
  },
  textMedium: {
    position: 'absolute',
    fontSize: 12,
    color: '#18181b',
    fontWeight: 'bold',
  },
  textPower: {
    position: 'absolute',
    fontSize: 20,
    color: '#000000',
    fontWeight: 'bold',
  },
  validity: {
    position: 'absolute',
    fontSize: 8,
    color: '#52525b',
  },
  logoPatch: {
    position: 'absolute',
    left: 278,
    top: 70,
    width: 260,
    height: 90,
    backgroundColor: '#ffffff',
  },
  logo: {
    position: 'absolute',
    left: 288,
    top: 75,
    width: 220,
    height: 70,
    objectFit: 'contain',
  },
  companyName: {
    position: 'absolute',
    left: 292,
    top: 82,
    width: 230,
    fontSize: 17,
    lineHeight: 1.25,
    color: '#18181b',
    fontWeight: 'bold',
    textAlign: 'left',
  },
});

const formatDate = (date?: string | null) => {
  const parsed = date ? new Date(date) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date().toLocaleDateString('pt-BR');
  return parsed.toLocaleDateString('pt-BR');
};

const formatPower = (proposal: Proposal) => {
  const installedPower = proposal.solar?.installed_power_kwp;
  const kitPower = proposal.solar_kit_snapshot?.kit_power_kwp;
  const power = installedPower && installedPower > 0 ? installedPower : kitPower;
  return power && power > 0 ? `${Number(power).toFixed(2)} kWp` : '0.00 kWp';
};

const getCityState = (proposal: Proposal) => {
  const city = proposal.client?.city?.trim();
  const state = proposal.client?.state?.trim();
  if (city && state) return `${city} - ${state}`;
  if (city) return city;
  if (state) return state;
  return 'Cidade - Estado';
};

const getValidityText = (proposal: Proposal) => {
  const days = proposal.profile?.default_validity_days || 7;
  return `validade: ${days} dias`;
};

export function DynamicCoverOverlay({ proposal }: { proposal: Proposal }) {
  const logoUrl = extractActiveLogo(proposal.profile?.logo_url || null);
  const companyName = proposal.profile?.company_name || 'Empresa de Energia Solar';

  return (
    <View fixed style={styles.layer}>
      {/* Area superior reservada para logo/nome quando o template possuir esse espaço. */}
      {(logoUrl || companyName) && (
        <>
          <View style={styles.logoPatch} />
          {logoUrl ? (
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.companyName}>{companyName}</Text>
          )}
        </>
      )}

      {/* Cliente */}
      <View style={[styles.whitePatch, { left: 325, top: 463, width: 175, height: 20 }]} />
      <Text style={[styles.textMedium, { left: 325, top: 466, width: 175 }]}>{proposal.client?.name || 'Cliente'}</Text>

      {/* Localização */}
      <View style={[styles.whitePatch, { left: 325, top: 528, width: 175, height: 20 }]} />
      <Text style={[styles.textMedium, { left: 325, top: 531, width: 175 }]}>{getCityState(proposal)}</Text>

      {/* Data e validade */}
      <View style={[styles.whitePatch, { left: 325, top: 595, width: 120, height: 28 }]} />
      <Text style={[styles.textSmall, { left: 325, top: 598, width: 120 }]}>{formatDate(proposal.created_at)}</Text>
      <Text style={[styles.validity, { left: 325, top: 613, width: 120 }]}>{getValidityText(proposal)}</Text>

      {/* Potência nominal */}
      <View style={[styles.whitePatch, { left: 444, top: 512, width: 120, height: 36 }]} />
      <Text style={[styles.textPower, { left: 444, top: 515, width: 120 }]}>{formatPower(proposal)}</Text>
    </View>
  );
}
