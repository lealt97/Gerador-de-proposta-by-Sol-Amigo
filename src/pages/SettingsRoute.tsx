import { MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AccountClosure } from './AccountClosure';
import { AccountData } from './AccountData';
import { Configuracoes } from './Configuracoes';

const SETTINGS_TAB_BY_LABEL: Record<string, string> = {
  'Dados da Empresa': 'empresa',
  Logo: 'logo',
  'Dados do Usuário': 'vendedor',
  'Customização da Conta': 'customizacao',
  'Preferências Comerciais': 'preferencias',
  Segurança: 'seguranca',
  'Encerramento da Conta': 'encerramento',
};

export function SettingsRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'empresa';

  if (activeTab === 'encerramento') {
    return <AccountClosure />;
  }

  const handleCapture = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest('button');
    if (!button) return;

    const label = button.textContent?.replace(/\s+/g, ' ').trim() || '';
    const nextTab = SETTINGS_TAB_BY_LABEL[label];
    if (!nextTab) return;

    event.preventDefault();
    event.stopPropagation();
    navigate(`/configuracoes?tab=${nextTab}`);
  };

  return (
    <>
      <div onClickCapture={handleCapture}>
        <Configuracoes />
      </div>
      {activeTab === 'seguranca' && <AccountData embedded />}
    </>
  );
}
