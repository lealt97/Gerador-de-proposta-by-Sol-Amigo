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
  onFileUpload: (event: ChangeEvent<HTMLInputElement>, target: 'logo_url' | 'cover_image_url') => void;
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
  return (
    <div className="space-y-6">
      <section className="p-4 bg-white/5 rounded-xl border border-brand-border/60 space-y-4">
        <div>
          <Label className="text-slate-100 font-semibold">Logo da empresa</Label>
          <p className="text-xs text-slate-400 mt-1">Use um logo do perfil ou envie um logo específico para este modelo.</p>
        </div>

        {(profileLogo || availableLogos.length > 0) && (
          <div className="grid grid-cols-2 gap-2">
            {[...new Set([profileLogo, ...availableLogos].filter(Boolean) as string[])].map((logo) => (
              <button key={logo} type="button" onClick={() => onLogoSelect(logo)} className={`h-20 rounded-lg border p-2 bg-white flex items-center justify-center transition-all ${model.logo_url === logo ? 'border-brand-blue ring-2 ring-brand-blue/30' : 'border-brand-border hover:border-brand-blue/60'}`}>
                <img src={logo} alt="Logo disponível" className="max-h-full max-w-full object-contain" />
              </button>
            ))}
          </div>
        )}

        <label className="w-full flex items-center justify-center gap-2 rounded-md border border-brand-border bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15 hover:text-white cursor-pointer transition-colors">
          <Upload className="w-4 h-4" /> Enviar logo
          <input type="file" accept="image/*,.svg" className="hidden" onChange={(event) => onFileUpload(event, 'logo_url')} />
        </label>

        {model.logo_url && (
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
