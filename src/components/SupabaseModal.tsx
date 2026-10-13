import React, { useState, useEffect } from 'react';
import { supabaseService, DEFAULT_SUPABASE_SQL } from '../services/supabase';
import { useOrders } from '../context/OrderContext';
import { Database, Check, Copy, ExternalLink, X, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { refreshFromSupabase, syncState, syncMessage } = useOrders();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [tableName, setTableName] = useState('pedidos');
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = supabaseService.getConfig();
      setUrl(config.url || '');
      setAnonKey(config.anonKey || '');
      setTableName(config.tableName || 'pedidos');
      setEnabled(config.enabled || false);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await supabaseService.testConnection(url.trim(), anonKey.trim(), tableName.trim());
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    supabaseService.saveConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
      tableName: tableName.trim() || 'pedidos',
      enabled,
    });

    if (enabled && url && anonKey) {
      await refreshFromSupabase();
    }
    onClose();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(DEFAULT_SUPABASE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white">
                  Configurações do Banco de Dados (Supabase)
                </h2>
                {syncState === 'connected' ? (
                  <span className="text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Conectado
                  </span>
                ) : syncState === 'syncing' ? (
                  <span className="text-[11px] font-semibold text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Sincronizando
                  </span>
                ) : syncState === 'error' ? (
                  <span className="text-[11px] font-semibold text-rose-400 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Erro de Conexão
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-neutral-400 px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                    Modo Local
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {syncMessage}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form and instructions */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status info box */}
          <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl flex items-start gap-3 text-xs text-neutral-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Persistência em Segundo Banco de Dados</span>
              O painel de cozinha grava os pedidos e cada mudança de status no banco Supabase. Caso fique sem conexão ou não esteja configurado, o sistema opera de forma autônoma com persistência local.
            </div>
          </div>

          {/* Connection inputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Credenciais do Projeto Supabase
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-0"
                />
                <span className="font-semibold">Ativar Sincronização Remota</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Project URL (Supabase)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo-app.supabase.co"
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Anon Public Key (Chave Anônima)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Nome da Tabela
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="pedidos"
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !url || !anonKey}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                <span>Testar Conexão com Supabase</span>
              </button>

              {testResult && (
                <span
                  className={`text-xs font-medium flex items-center gap-1.5 ${
                    testResult.success ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{testResult.message}</span>
                </span>
              )}
            </div>
          </div>

          {/* SQL Setup Helper */}
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Script SQL para Criar a Tabela no Supabase
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Execute este código no SQL Editor do seu painel Supabase para criar a tabela com os campos necessários:
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-medium flex items-center gap-1 transition-colors shrink-0"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <pre className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-36">
              {DEFAULT_SUPABASE_SQL}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Salvar e Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
