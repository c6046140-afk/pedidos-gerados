import React, { useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { Clock, ChefHat, CheckCircle2, Inbox, TrendingUp } from 'lucide-react';

export const KitchenMetricsBar: React.FC = () => {
  const { orders, activeOrders, deliveredOrders } = useOrders();

  const metrics = useMemo(() => {
    const recebidos = orders.filter((o) => o.status === 'recebido').length;
    const emPreparo = orders.filter((o) => o.status === 'em_preparacao').length;
    const prontos = orders.filter((o) => o.status === 'pronto').length;
    const entregues = deliveredOrders.length;

    // Calculate average wait time in minutes for active orders
    let avgMinutes = 0;
    if (activeOrders.length > 0) {
      const now = Date.now();
      const totalMinutes = activeOrders.reduce((acc, curr) => {
        const created = new Date(curr.created_at).getTime();
        return acc + Math.max(0, (now - created) / 60000);
      }, 0);
      avgMinutes = Math.round(totalMinutes / activeOrders.length);
    }

    return {
      recebidos,
      emPreparo,
      prontos,
      entregues,
      avgMinutes,
    };
  }, [orders, activeOrders, deliveredOrders]);

  return (
    <div className="px-6 py-2 bg-neutral-900/90 border-b border-neutral-800 text-xs text-neutral-300 flex items-center justify-between gap-4 flex-wrap shrink-0">
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Inbox className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-white">{metrics.recebidos}</span>
          <span className="text-neutral-400">Aguardando preparo</span>
        </div>

        <div className="flex items-center gap-1.5">
          <ChefHat className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-white">{metrics.emPreparo}</span>
          <span className="text-neutral-400">Em produção</span>
        </div>

        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-white">{metrics.prontos}</span>
          <span className="text-neutral-400">Prontos p/ entrega</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-600"></span>
          <span className="font-semibold text-white">{metrics.entregues}</span>
          <span className="text-neutral-400">Entregues</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-neutral-400">
        <Clock className="w-3.5 h-3.5 text-neutral-500" />
        <span>Tempo médio de espera na fila:</span>
        <span className="font-mono font-bold text-white tabular-nums">
          {metrics.avgMinutes} min
        </span>
      </div>
    </div>
  );
};
