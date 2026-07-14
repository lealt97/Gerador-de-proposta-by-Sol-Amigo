import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 30,
    backgroundColor: '#fafafa',
    border: '1px solid #e4e4e7',
    borderRadius: 8,
    alignItems: 'center',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    color: '#52525b',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  linkBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    padding: 15,
    borderRadius: 6,
    width: '100%',
  },
  linkTitle: {
    fontSize: 10,
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  link: {
    fontSize: 12,
    color: '#1d4ed8',
  },
  signatureBox: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  signatureLineContainer: {
    width: '45%',
    alignItems: 'center',
    minHeight: 104,
  },
  sellerSignatureImage: {
    width: 165,
    height: 58,
    objectFit: 'contain',
    marginBottom: 6,
  },
  signatureLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#18181b',
    marginTop: 58,
    marginBottom: 10,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#18181b',
  },
  signatureRole: {
    fontSize: 10,
    color: '#71717a',
  }
});

export const AcceptanceSection = ({ proposal }: { proposal: Proposal }) => {
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/proposta/${proposal.public_token}`
    : `https://[SISTEMA]/proposta/${proposal.public_token}`;

  const sellerName = proposal.profile?.seller_name || proposal.profile?.company_name || 'Empresa de Energia Solar';
  const signatureUrl = proposal.profile?.seller_signature_url || null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Próximos Passos</Text>
      <Text style={styles.text}>
        Agradecemos a oportunidade de apresentar esta proposta comercial.
        Para aprovar e dar início ao projeto do seu sistema de energia solar,
        acesse o link abaixo ou assine este documento.
      </Text>
      
      {proposal.public_token && (
        <View style={styles.linkBox}>
          <Text style={styles.linkTitle}>Link para Aprovação Digital:</Text>
          <Text style={styles.link}>{publicUrl}</Text>
        </View>
      )}

      <View style={styles.signatureBox} wrap={false}>
        <View style={styles.signatureLineContainer}>
          {signatureUrl ? (
            <Image src={signatureUrl} style={styles.sellerSignatureImage} />
          ) : (
            <View style={styles.signatureLine}></View>
          )}
          <Text style={styles.signatureName}>{sellerName}</Text>
          <Text style={styles.signatureRole}>Representante Comercial</Text>
        </View>
        <View style={styles.signatureLineContainer}>
          <View style={styles.signatureLine}></View>
          <Text style={styles.signatureName}>{proposal.client?.name || 'Cliente'}</Text>
          <Text style={styles.signatureRole}>De acordo</Text>
        </View>
      </View>
    </View>
  );
};