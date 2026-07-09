import { Label } from '../../../components/ui/Label';
import { PdfTheme } from '../types/pdfDesignTypes';

interface ColorEditorProps {
  theme: PdfTheme;
  onChange: (key: keyof PdfTheme, value: string) => void;
}

const colorFields: Array<{ key: keyof PdfTheme; label: string; description: string }> = [
  { key: 'primary', label: 'Cor Primária', description: 'Títulos, cabeçalhos e elementos principais.' },
  { key: 'secondary', label: 'Cor Secundária', description: 'Cards, linhas e elementos auxiliares.' },
  { key: 'accent', label: 'Cor de Destaque', description: 'Economia, chamadas e indicadores.' },
  { key: 'neutral', label: 'Cor Neutra', description: 'Textos escuros, fundos e contraste.' },
];

export function ColorEditor({ theme, onChange }: ColorEditorProps) {
  return (
    <div className="space-y-4">
      {colorFields.map((field) => (
        <div key={field.key} className="p-4 bg-white/5 rounded-xl border border-brand-border/60 space-y-3">
          <div>
            <Label className="text-slate-100 font-semibold">{field.label}</Label>
            <p className="text-xs text-slate-400 mt-1">{field.description}</p>
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={theme[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="h-11 w-14 rounded border border-brand-border bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={theme[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="flex-1 h-11 rounded-lg bg-slate-950/40 border border-brand-border/60 px-3 text-sm font-mono text-slate-100 outline-none focus:border-brand-blue"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
