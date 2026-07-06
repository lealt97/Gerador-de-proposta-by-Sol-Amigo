import React from "react";
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { Profile } from '../types/profile';
import { DatabaseSetupAlert } from '../components/ui/DatabaseSetupAlert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Building2, Image as ImageIcon, User, Settings as SettingsIcon, Shield, Upload, Save, Loader2 } from 'lucide-react';

export function Configuracoes() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'empresa' | 'logo' | 'vendedor' | 'preferencias' | 'seguranca'>('empresa');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const data = await profileService.getProfile(user.id);
        setProfile(data);
      } catch (err) {
        console.error('Error loading profile:', err);
        setLoadError(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;
    setIsSaving(true);
    try {
      const { id, created_at, updated_at, ...updateData } = profile;
      const data = await profileService.updateProfile(user.id, updateData);
      setProfile(data);
      toast.success('Configurações salvas com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingLogo(true);
    try {
      const url = await profileService.uploadLogo(file, user.id);
      setProfile({ ...profile, logo_url: url });
      await profileService.updateProfile(user.id, { logo_url: url });
      toast.success('Logo enviada com sucesso!');
    } catch (err: any) {
      toast.error(err?.message?.includes('row-level security') ? 'Erro de permissão. Execute o supabase-schema.sql no SQL Editor.' : (err.message || 'Erro ao fazer upload da logo'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value ? Number(value) : null });
  };

  if (isLoading) {
    return <div className="text-brand-blue animate-pulse">Carregando configurações...</div>;
  }

  if (loadError) {
    return <DatabaseSetupAlert error={loadError} resourceName="suas configurações" />;
  }
  
  if (!profile) {
    return <div className="text-red-600">Carregando dados...</div>;
  }

  const tabs = [
    { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
    { id: 'logo', label: 'Logo', icon: ImageIcon },
    { id: 'vendedor', label: 'Dados do Vendedor', icon: User },
    { id: 'preferencias', label: 'Preferências Comerciais', icon: SettingsIcon },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
  ] as const;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark mb-2">Configurações da Conta</h1>
        <p className="text-sm text-slate-500">Personalize as informações que aparecerão nas suas propostas.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-64 flex flex-col gap-1 shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' 
                    : 'text-slate-500 hover:bg-gray-100 hover:text-brand-dark border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 w-full min-w-0">
          {activeTab === 'empresa' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Empresa</CardTitle>
                <CardDescription>Informações principais da sua empresa de energia solar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Razão Social / Nome da Empresa</label>
                    <input 
                      name="company_name"
                      value={profile.company_name || ''} 
                      onChange={handleChange}
                      className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">CNPJ</label>
                    <input 
                      name="document"
                      value={profile.document || ''} 
                      onChange={handleChange}
                      className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Telefone da Empresa</label>
                    <input 
                      name="phone"
                      value={profile.phone || ''} 
                      onChange={handleChange}
                      className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">E-mail da Empresa</label>
                    <input 
                      name="company_email"
                      type="email"
                      value={profile.company_email || ''} 
                      onChange={handleChange}
                      className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-brand-dark">Website</label>
                    <input 
                      name="website"
                      placeholder="https://"
                      value={profile.website || ''} 
                      onChange={handleChange}
                      className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-brand-border">
                  <h4 className="text-sm font-medium text-brand-dark mb-4">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-brand-dark">CEP</label>
                      <input 
                        name="cep"
                        value={profile.cep || ''} 
                        onChange={handleChange}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-brand-dark">Endereço (Rua, Número, Bairro)</label>
                      <input 
                        name="address"
                        value={profile.address || ''} 
                        onChange={handleChange}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-brand-dark">Cidade</label>
                      <input 
                        name="city"
                        value={profile.city || ''} 
                        onChange={handleChange}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-brand-dark">Estado (UF)</label>
                      <input 
                        name="state"
                        maxLength={2}
                        value={profile.state || ''} 
                        onChange={handleChange}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none uppercase" 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'logo' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logo da Empresa</CardTitle>
                <CardDescription>Esta imagem aparecerá no cabeçalho das propostas em PDF e nos links públicos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-brand-border rounded-lg bg-brand-surface">
                  {profile.logo_url ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-32 w-64 bg-brand-surface rounded-lg flex items-center justify-center p-2 border border-brand-border">
                        <img src={profile.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                      <p className="text-sm text-slate-500">Logo atual</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <ImageIcon className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-sm font-medium text-brand-dark">Nenhuma logo enviada</p>
                      <p className="text-xs text-slate-500">PNG, JPG até 5MB</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    id="logo-upload"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                  <label htmlFor="logo-upload">
                    <Button as="span" variant="outline" className="cursor-pointer gap-2" disabled={uploadingLogo}>
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingLogo ? 'Enviando...' : (profile.logo_url ? 'Trocar Logo' : 'Enviar Logo')}
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'vendedor' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados do Vendedor</CardTitle>
                <CardDescription>Suas informações de contato que serão enviadas para o cliente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Seu Nome (como Vendedor)</label>
                  <input 
                    name="seller_name"
                    value={profile.seller_name || profile.name || ''} 
                    onChange={handleChange}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Seu Telefone / WhatsApp</label>
                  <input 
                    name="seller_phone"
                    value={profile.seller_phone || ''} 
                    onChange={handleChange}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Seu E-mail</label>
                  <input 
                    name="seller_email"
                    type="email"
                    value={profile.seller_email || ''} 
                    onChange={handleChange}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'preferencias' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preferências Comerciais</CardTitle>
                <CardDescription>Defina os padrões para a geração de novas propostas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Margem de Lucro Padrão (%)</label>
                  <input 
                    type="number"
                    name="default_margin_percentage"
                    value={profile.default_margin_percentage || ''} 
                    onChange={handleNumberChange}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                  />
                  <p className="text-xs text-slate-500">Esta margem será aplicada automaticamente ao criar uma nova proposta.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Validade Padrão da Proposta (Dias)</label>
                  <input 
                    type="number"
                    name="default_validity_days"
                    value={profile.default_validity_days || 7} 
                    onChange={handleNumberChange}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" 
                  />
                  <p className="text-xs text-slate-500">Determina a data de expiração calculada a partir da data de criação.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'seguranca' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Segurança</CardTitle>
                <CardDescription>Gerencie as configurações de segurança da sua conta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-brand-border rounded-lg bg-brand-surface">
                  <div>
                    <h4 className="text-sm font-medium text-brand-dark">Autenticação em Duas Etapas (MFA)</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Adicione uma camada extra de segurança na sua conta exigindo um código no login.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{profile.mfa_enabled ? 'Ativado' : 'Desativado'}</span>
                    <button 
                      onClick={() => setProfile({...profile, mfa_enabled: !profile.mfa_enabled})}
                      className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${profile.mfa_enabled ? 'bg-brand-blue' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-brand-surface transition-transform ${profile.mfa_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                {profile.mfa_enabled && (
                  <div className="p-4 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
                    <p className="text-sm text-brand-blue font-medium">Nota sobre o MFA</p>
                    <p className="text-xs text-brand-blue/80 mt-1">A interface de configuração do MFA por Authenticator será implementada em uma atualização futura. O campo já foi salvo na sua conta.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Footer for all tabs */}
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
