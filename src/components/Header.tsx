import React, { useState, useEffect } from 'react';
import { useOrders } from '../context/OrderContext';
import { Volume2, VolumeX, Bell, Plus, Maximize, Minimize, Clock, Settings } from 'lucide-react';

interface HeaderProps {
  activeTab: 'board' | 'delivered';
  setActiveTab: (tab: 'board' | 'delivered') => void;
  onOpenSupabase: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSupabase,
}) => {
  const { isMuted, toggleSound, playKitchenBell, deliveredOrders, activeOrders } = useOrders();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-neutral-900 border-b border-neutral-800 text-white shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
            KDS Chef
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap">
            Painel de Cozinha
          </span>
        </div>

        {/* Live digital kitchen clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300 tabular-nums">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span>{currentTime || '12:00:00'}</span>
        </div>
      </div>

      {/* Zone 2: 2 clean single-line text navigation links */}
      <nav className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('board')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'board'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Pedidos em Aberto ({activeOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivered')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'delivered'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Entregues ({deliveredOrders.length})
        </button>
      </nav>

      {/* Zone 3: Kitchen Tools & Primary CTA */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Kitchen Bell sound */}
        <button
          type="button"
          onClick={playKitchenBell}
          title="Tocar campainha de aviso de prato pronto"
          className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 transition-colors"
          aria-label="Tocar campainha de chamada"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Sound Mute/Unmute */}
        <button
          type="button"
          onClick={toggleSound}
          title={isMuted ? 'Ativar avisos sonoros' : 'Silenciar avisos sonoros'}
          className={`p-2 rounded-lg transition-colors ${
            isMuted
              ? 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
              : 'bg-neutral-800 text-emerald-400 hover:text-emerald-300'
          }`}
          aria-label="Alternar som do painel"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Fullscreen button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em modo tela cheia (TV/Monitor)'}
          className="hidden lg:flex p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
          aria-label="Alternar tela cheia"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Small discreet settings button at the end */}
        <button
          type="button"
          onClick={onOpenSupabase}
          title="Configurações & Banco Supabase"
          className="p-2 rounded-lg bg-neutral-800/40 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          aria-label="Configurações do sistema"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

