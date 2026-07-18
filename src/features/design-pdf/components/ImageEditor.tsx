import { ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Label } from '../../../components/ui/Label';
import { PdfUserModel, TransformConfig } from '../types/pdfDesignTypes';
import { CoverPhotoFramingSelector } from './CoverPhotoFramingSelector';
import { TransformControls } from './TransformControls';

interface ImageEditorProps {
  model: PdfUserModel;
  profileLogo: string | null;
  availableLogos: string[];
  onFileUpload: (event: ChangeEvent<HTMLInputElement>, target: 'cover_image_url') => void;
  onLogoSelect: (logoUrl: string) => void;
  onTransformChange: (target: 'logo_transform' | 'cover_image_transform', key: keyof TransformConfig, value: number) => void;
  onTransformSet: (target: 'logo_transform' | 'cover_image_transform', transform: TransformConfig) => void;
  onTransformReset: (target: 'logo_transform' | 'cover_image_transform') => void;
}

export function ImageEditor({
  model,
  profileLogo,
  availableLogos,
  onFileUpload,
  onLogoSelect,
  onTransformChange,
  onTransformSet,
  onTransformReset,
}: ImageEditorProps) {
  const accountLogos = [...new Set([profileLogo, ...availableLogos].filter(Boolean) as string[])];
  const hasSelectedAccountLogo = Boolean(model.logo_url && accountLogos.includes(model.logo_url));

  return (
    <div className="space-y-6">
      <section className="p-4 bg-white/5 rounded-xl border border-brand-border/60 space-y-4">
        <div>
          <Label className="text-slate-100 font-semibold">Logo da empresa</Label>
          <p className="text-xs text-slate-400 mt-1">
            Escolha um dos logos cadastrados em Configurações da Conta &gt; Logo. O envio de logos é feito somente nessa área.
          </p>
        </div>

        {accountLogos.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {accountLogos.map((logo) => {
              const isSelected = model.logo_url === logo;
              const isAccountDefault = profileLogo === logo;

              return (
                <button
                  key={logo}
                  type="button"
                  onClick={() => onLogoSelect(logo)}
                  aria-pressed={isSelected}
                  className={`relative h-20 rounded-lg border p-2 bg-white flex items-center justify-center transition-all ${isSelected ? 'border-brand-blue ring-2 ring-brand-blue/30' : 'border-brand-border hover:border-brand-blue/60'}`}
                >
                  {isAccountDefault && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-blue px-1.5 py-0.5 text-[9px] font-bold text-white">
                      Padrão
                    </span>
                  )}
                  <img src={logo} alt="Logo cadastrado na conta" className="max-h-full max-w-full object-contain" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-brand-border bg-slate-950/30 p-4 text-center">
            <p className="text-sm font-medium text-slate-200">Nenhum logo cadastrado na conta.</p>
            <p className="mt-1 text-xs text-slate-400">Cadastre até 3 logos para poder selecioná-los neste modelo.</p>
            <a href="/configuracoes?tab=logo" className="mt-3 inline-flex text-xs font-semibold text-brand-blue hover:underline">
              Abrir Configurações da Conta &gt; Logo
            </a>
          </div>
        )}

        {hasSelectedAccountLogo && (
          <TransformControls label="Logo" target="logo" value={model.logo_transform} onChange={(key, value) => onTransformChange('logo_transform', key, value)} onReset={() => onTransformReset('logo_transform')} />
        )}
      </section>

      <section className="p-4 bg-white/5 rounded-xl border border-brand-border/60 space-y-4">
        <div>
          <Label className="text-slate-100 font-semibold">Foto da capa</Label>
          <p className="text-xs text-slate-400 mt-1">A imagem é aplicada na área de foto do SVG selecionado.</p>
        </div>

        {model.cover_image_url && (
          <div className="aspect-video rounded-lg overflow-hidden border border-brand-border bg-slate-950/40 flex items-center justify-center">
            <img src={model.cover_image_url} alt="Foto de capa" className="w-full h-full object-contain" />
          </div>
        )}

        <label className="w-full flex items-center justify-center gap-2 rounded-md border border-brand-border bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15 hover:text-white cursor-pointer transition-colors">
          <Upload className="w-4 h-4" /> Enviar foto da capa
          <input type="file" accept="image/*" className="hidden" onChange={(event) => onFileUpload(event, 'cover_image_url')} />
        </label>

        {model.cover_image_url && (
          <>
            <CoverPhotoFramingSelector imageUrl={model.cover_image_url} transform={model.cover_image_transform} onChange={(transform) => onTransformSet('cover_image_transform', transform)} onReset={() => onTransformReset('cover_image_transform')} />
            <TransformControls label="Foto da capa" target="cover" value={model.cover_image_transform} onChange={(key, value) => onTransformChange('cover_image_transform', key, value)} onReset={() => onTransformReset('cover_image_transform')} />
          </>
        )}
      </section>
    </div>
  );
}
