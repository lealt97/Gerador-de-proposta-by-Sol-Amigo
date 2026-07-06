import React, { useEffect, useState } from 'react';
import { PdfImageTransform } from '../../types/pdfDesign';

interface SvgPreviewProps {
  svgUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  neutralColor?: string;
  logoUrl: string;
  coverPhotoUrl: string;
  logoTransform?: PdfImageTransform;
  coverImageTransform?: PdfImageTransform;
}

const DEFAULT_TRANSFORM: PdfImageTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
};

function transformToSvgValue(transform?: PdfImageTransform) {
  const current = transform || DEFAULT_TRANSFORM;
  return `translate(${current.x} ${current.y}) scale(${current.scale}) rotate(${current.rotate})`;
}

function setHref(element: Element | null, url: string) {
  if (!element || !url) return;
  element.setAttribute('href', url);
  element.setAttribute('xlink:href', url);
}

function setTransform(element: Element | null, transform?: PdfImageTransform) {
  if (!element) return;
  element.setAttribute('transform', transformToSvgValue(transform));
  element.setAttribute('style', `${element.getAttribute('style') || ''}; transform-box: fill-box; transform-origin: center;`);
}

function findCoverImage(documentSvg: Document) {
  // Contrato novo dos SVGs normalizados.
  const normalizedImage = documentSvg.getElementById('cover-photo-image');
  if (normalizedImage) return normalizedImage;

  // Compatibilidade com as capas A4 exportadas do Figma.
  // Nelas a área da foto usa um pattern com <image id="image0_...">.
  const figmaPatternImage = documentSvg.querySelector('pattern image, pattern > image');
  if (figmaPatternImage) return figmaPatternImage;

  // Último fallback: primeiro <image> do SVG.
  return documentSvg.querySelector('image');
}

function findCompanyLogo(documentSvg: Document) {
  return documentSvg.getElementById('company-logo');
}

export function SvgPreview({
  svgUrl,
  primaryColor,
  secondaryColor,
  accentColor,
  backgroundColor,
  neutralColor = '#183956',
  logoUrl,
  coverPhotoUrl,
  logoTransform,
  coverImageTransform
}: SvgPreviewProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSvg() {
      if (!svgUrl) {
        setSvgContent(null);
        return;
      }
      try {
        const response = await fetch(svgUrl);
        let text = await response.text();
        
        // Compatibilidade com SVGs que já usam variáveis CSS para imagens.
        if (logoUrl) {
           text = text.replace(/var\(--logo-url, '[^']*'\)/g, logoUrl);
           text = text.replace(/var\(--logo-url, ''\)/g, logoUrl);
        }
        
        if (coverPhotoUrl) {
           text = text.replace(/var\(--cover-photo-url, '[^']*'\)/g, coverPhotoUrl);
           text = text.replace(/var\(--cover-photo-url, ''\)/g, coverPhotoUrl);
        }

        // Preparação para os SVGs normalizados e para as capas A4 enviadas pelo usuário.
        try {
          const parser = new DOMParser();
          const documentSvg = parser.parseFromString(text, 'image/svg+xml');
          const svg = documentSvg.querySelector('svg');

          if (svg) {
            const coverImage = findCoverImage(documentSvg);
            const companyLogo = findCompanyLogo(documentSvg);

            setHref(coverImage, coverPhotoUrl);
            setHref(companyLogo, logoUrl);
            setTransform(coverImage, coverImageTransform);
            setTransform(companyLogo, logoTransform);

            text = new XMLSerializer().serializeToString(svg);
          }
        } catch (parserError) {
          console.warn('Não foi possível normalizar o SVG do preview:', parserError);
        }
        
        setSvgContent(text);
      } catch (error) {
        console.error('Error fetching SVG:', error);
        setSvgContent('<div class="p-4 text-red-400">Erro ao carregar template SVG</div>');
      }
    }
    
    fetchSvg();
  }, [svgUrl, logoUrl, coverPhotoUrl, logoTransform, coverImageTransform]);

  if (!svgContent) {
    return <div className="text-slate-500">Nenhum template selecionado</div>;
  }

  return (
    <div 
      className="w-full h-full flex items-center justify-center overflow-auto p-4"
      style={{
        // Variáveis antigas + novas para manter compatibilidade enquanto os 10 SVGs são normalizados.
        '--primary-color': primaryColor,
        '--secondary-color': secondaryColor,
        '--accent-color': accentColor,
        '--background-color': backgroundColor,
        '--neutral-color': neutralColor,
        '--pdf-primary': primaryColor,
        '--pdf-secondary': secondaryColor,
        '--pdf-accent': accentColor,
        '--pdf-neutral': neutralColor,
        '--pdf-white': '#FFFFFF',
      } as React.CSSProperties}
    >
      <div 
        className="shadow-2xl border border-brand-border bg-white max-w-full max-h-full aspect-[1/1.414]"
        style={{ width: 'auto', height: '100%', minHeight: '600px' }}
        dangerouslySetInnerHTML={{ __html: svgContent }} 
      />
    </div>
  );
}
