import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { pdf } from '@react-pdf/renderer';

import { ProposalDocument } from '../src/components/pdf/ProposalDocument';
import {
  assertRepeatedPdfQuality,
  validatePdfBlob,
  type PdfQualityMetrics,
} from '../src/lib/pdf/pdfQuality';
import type { Proposal } from '../src/types/proposal';

function makeProposal(): Proposal {
  return {
    id: 'proposal-quality-1',
    user_id: 'user-quality-1',
    client_id: 'client-quality-1',
    code: 'PROP-QUAL-001',
    title: 'Proposta Comercial de Sistema Solar Fotovoltaico',
    status: 'pending',
    revision: 1,
    system_type: 'on_grid',
    consumption_source: 'historical',
    history: [612, 598, 630, 644, 620, 609, 655, 670, 648, 632, 625, 640],
    estimated_daily_consumption: 21.3,
    monthly_consumption_kwh: 640,
    bill_amount: 768,
    energy_tariff: 1.2,
    battery_capacity_kwh: null,
    usable_battery_capacity_kwh: null,
    backup_power_kw: null,
    autonomy_hours: null,
    essential_loads_description: null,
    roof_type: 'Telhado cerâmico',
    roof_area_m2: 72,
    roof_image_url: null,
    roof_photo_url: null,
    roof_plan_image_url: null,
    module_width_m: 1.134,
    module_height_m: 2.278,
    roof_layout_json: null,
    selected_solar_kit_id: null,
    solar_kit_snapshot: null,
    kit_cost: 14_000,
    labor_cost: 3_500,
    fixed_costs: 1_200,
    freight_cost: 850,
    taxes: 900,
    commission: 1_000,
    other_costs: 500,
    margin_percentage: 22,
    discount_percentage: 2,
    total_cost: 21_950,
    gross_price: 28_141.03,
    discount_value: 562.82,
    final_price: 27_578.21,
    estimated_profit: 5_628.21,
    real_margin_percentage: 20.41,
    markup_percentage: 25.64,
    pdf_url: null,
    pdf_storage_path: null,
    public_token: 'quality-token-1234567890abcdef1234567890',
    sent_whatsapp_at: null,
    accepted_at: null,
    rejected_at: null,
    created_at: '2026-07-19T12:00:00.000Z',
    updated_at: '2026-07-19T12:00:00.000Z',
    client: {
      name: 'Condomínio Residencial Horizonte Solar',
      document: '12.345.678/0001-90',
      email: 'administracao@horizontesolar.com.br',
      phone: '(11) 99999-9999',
      cep: '01001-000',
      city: 'São Paulo',
      state: 'SP',
      address: 'Praça da Sé',
      number: '100',
      neighborhood: 'Sé',
      complement: 'Bloco Administrativo',
    },
    solar: {
      id: 'solar-quality-1',
      proposal_id: 'proposal-quality-1',
      cep: '01001-000',
      hsp: 5.1,
      panel_power_w: 550,
      yield_factor: 0.8,
      generation_target_percent: 100,
      oversizing: 1.2,
      monthly_consumption_kwh: 640,
      projected_consumption_kwh: 640,
      required_power_kwp: 6.27,
      panel_count: 12,
      installed_power_kwp: 6.6,
      estimated_monthly_generation_kwh: 673.2,
      excess_kwh: 33.2,
      excess_percentage: 5.19,
      min_inverter_power_kw: 5.5,
      current_bill_value: 768,
      energy_tariff: 1.2,
      monthly_savings: 720,
      annual_savings: 8_640,
      payback_years: 3.19,
      payback_months: 38,
      payback_formatted: '3 anos e 2 meses',
      return_25_years: 216_000,
      net_savings_25_years: 188_421.79,
      created_at: '2026-07-19T12:00:00.000Z',
      updated_at: '2026-07-19T12:00:00.000Z',
    },
    loads: [],
    profile: {
      company_name: 'SolAmigo Energia Solar',
      logo_url: null,
      seller_name: 'Consultor SolAmigo',
      seller_phone: '(11) 98888-7777',
      seller_email: 'consultor@solamigo.com.br',
      seller_signature_url: null,
      website: 'solamigo.com.br',
      company_email: 'contato@solamigo.com.br',
      default_validity_days: 7,
      default_margin_percentage: 22,
    },
  };
}

function makeMetrics(overrides: Partial<PdfQualityMetrics> = {}): PdfQualityMetrics {
  return {
    byteLength: 100_000,
    pageCount: 12,
    objectCount: 90,
    streamCount: 36,
    fontCount: 4,
    imageCount: 0,
    hasPdfHeader: true,
    hasEofMarker: true,
    mimeType: 'application/pdf',
    ...overrides,
  };
}

async function renderCompleteProposal(proposal: Proposal) {
  const document = React.createElement(ProposalDocument, {
    proposal,
    coverImage: null,
    pdfTheme: {
      primary: '#0A2249',
      secondary: '#C49133',
      accent: '#FACB5C',
      neutral: '#1F2A2A',
    },
  });

  return pdf(document).toBlob();
}

test('rejeita arquivo sem estrutura PDF antes do armazenamento', async () => {
  const invalidBlob = new Blob(['arquivo corrompido'], { type: 'application/pdf' });

  await assert.rejects(
    () => validatePdfBlob(invalidBlob),
    /cabeçalho PDF válido/,
  );
});

test('aceita pequenas diferenças de tamanho sem considerar perda de qualidade', () => {
  const reference = makeMetrics();
  const regenerated = makeMetrics({ byteLength: 103_500 });

  assert.doesNotThrow(() => assertRepeatedPdfQuality(reference, regenerated, 0.05));
});

test('detecta perda de páginas ou streams entre gerações', () => {
  const reference = makeMetrics();

  assert.throws(
    () => assertRepeatedPdfQuality(reference, makeMetrics({ pageCount: 11 })),
    /pageCount/,
  );
  assert.throws(
    () => assertRepeatedPdfQuality(reference, makeMetrics({ streamCount: 30 })),
    /streamCount/,
  );
});

test('três gerações completas preservam estrutura, conteúdo técnico e tamanho', async () => {
  const proposal = makeProposal();
  const proposalBeforeRendering = JSON.stringify(proposal);
  const generations: PdfQualityMetrics[] = [];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const blob = await renderCompleteProposal(proposal);
    const metrics = await validatePdfBlob(blob, {
      minByteLength: 20_000,
      minPages: 10,
    });
    generations.push(metrics);
  }

  const [reference, ...repeated] = generations;
  assert.ok(reference.pageCount >= 10);
  assert.ok(reference.objectCount > reference.pageCount);
  assert.ok(reference.streamCount >= reference.pageCount);

  for (const metrics of repeated) {
    assertRepeatedPdfQuality(reference, metrics, 0.05);
  }

  assert.equal(JSON.stringify(proposal), proposalBeforeRendering);
});
