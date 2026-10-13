import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../types/order';
import { useOrders } from '../context/OrderContext';
import { getElapsedTime, formatTime, getOrderTypeLabel } from '../utils/formatters';
import { Check, Clock, RotateCcw, AlertTriangle, ArrowRight, Utensils, CheckCircle2 } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  compact?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, compact = false }) => {
  const { advanceStatus, revertStatus, toggleItemCompleted, updateStatus } = useOrders();
  const [elapsed, setElapsed] = useState(() => getElapsedTime(order.created_at));

  // Live timer tick every second for kitchen timeliness
  useEffect(() => {
    // If order is already delivered, we don't need active ticking
    if (order.status === 'entregue') return;

    const interval = setInterval(() => {
      setElapsed(getElapsedTime(order.created_at));
    }, 1000);

    return () => clearInterval(interval);
  }, [order.created_at, order.status]);

  const allItemsChecked = order.items.every((it) => it.completed);

  // Status configuration
  const statusConfig: Record<OrderStatus, { headerBorder: string; badgeText: string; actionLabel: string; nextStatus: OrderStatus }> = {
    recebido: {
      headerBorder: 'border-sky-500/40',
      badgeText: 'text-sky-400',
      actionLabel: 'Iniciar Preparo',
      nextStatus: 'em_preparacao',
    },
    em_preparacao: {
      headerBorder: 'border-amber-500/40',
      badgeText: 'text-amber-400',
      actionLabel: 'Marcar Pronto',
      nextStatus: 'pronto',
    },
    pronto: {
      headerBorder: 'border-emerald-500/40',
      badgeText: 'text-emerald-400',
      actionLabel: 'Finalizar Entrega',
      nextStatus: 'entregue',
    },
    entregue: {
      headerBorder: 'border-neutral-700',
      badgeText: 'text-neutral-400',
      actionLabel: 'Concluído',
      nextStatus: 'entregue',
    },
  };

  const currentCfg = statusConfig[order.status];

  // Urgency color styles
  const urgencyTimerStyles = {
    normal: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    warning: 'text-amber-300 bg-amber-950/50 border-amber-800/50',
    urgent: 'text-rose-300 bg-rose-950/60 border-rose-800/60 animate-pulse',
  }[elapsed.urgency];

  return (
    <article
      className={`flex flex-col bg-neutral-900 border ${currentCfg.headerBorder} rounded-xl overflow-hidden shadow-lg transition-all duration-150 hover:border-neutral-600`}
    >
      {/* Header zone */}
      <div className="p-4 bg-neutral-900/90 border-b border-neutral-800/80 flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-2xl font-extrabold tracking-tight text-white tabular-nums">
              #{order.order_number}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300 px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
              {getOrderTypeLabel(order.order_type)}
            </span>
            {order.table_number && (
              <span className="text-xs font-medium text-neutral-400">
                {order.table_number}
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>{order.customer_name || 'Totem Autoatendimento'}</span>
            <span aria-hidden="true">·</span>
            <span>Entrada {formatTime(order.created_at)}</span>
          </div>
        </div>

        {/* Real-time elapsed kitchen timer */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold tabular-nums border ${urgencyTimerStyles}`}
          title="Tempo decorrido desde a realização do pedido"
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{elapsed.formatted}</span>
        </div>
      </div>

      {/* General order note alert if present */}
      {order.notes && (
        <div className="mx-4 mt-3 px-3 py-2 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-start gap-2 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="font-medium">Obs do Pedido: {order.notes}</span>
        </div>
      )}

      {/* Items list with checklist for kitchen line cooks */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
          <span>Itens do Pedido ({order.items.length})</span>
          <span className="text-neutral-500">
            {order.items.filter((i) => i.completed).length}/{order.items.length} prontos
          </span>
        </div>

        <ul className="divide-y divide-neutral-800/70 -mx-1">
          {order.items.map((item) => (
            <li
              key={item.id}
              onClick={() => toggleItemCompleted(order.id, item.id)}
              className={`py-2.5 px-2 rounded-lg cursor-pointer transition-colors group flex items-start gap-3 ${
                item.completed
                  ? 'bg-neutral-950/40 text-neutral-500'
                  : 'hover:bg-neutral-800/50 text-neutral-100'
              }`}
            >
              {/* Checkbox button */}
              <button
                type="button"
                aria-label={item.completed ? 'Marcar item como pendente' : 'Marcar item como concluído'}
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                  item.completed
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'border-neutral-600 bg-neutral-800 group-hover:border-neutral-400 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-semibold text-sm leading-snug">
                    <span className="font-mono text-emerald-400 font-bold mr-1.5 tabular-nums">
                      {item.quantity}x
                    </span>
                    <span className={item.completed ? 'line-through text-neutral-500' : 'text-neutral-100'}>
                      {item.name}
                    </span>
                  </div>
                </div>

                {/* High-visibility kitchen item observation */}
                {item.notes && (
                  <div
                    className={`mt-1 text-xs px-2 py-1 rounded inline-flex items-center gap-1 font-medium ${
                      item.completed
                        ? 'bg-neutral-800 text-neutral-500'
                        : 'bg-rose-950/40 text-rose-300 border border-rose-900/60'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>{item.notes}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Action footer */}
      <div className="p-3 bg-neutral-950/70 border-t border-neutral-800/80 flex items-center gap-2">
        {/* Revert button if not first status */}
        {order.status !== 'recebido' && (
          <button
            type="button"
            onClick={() => revertStatus(order.id)}
            title="Voltar etapa anterior"
            className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Quick status button */}
        {order.status !== 'entregue' ? (
          <button
            type="button"
            onClick={() => advanceStatus(order.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs tracking-wide uppercase transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm ${
              order.status === 'recebido'
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : order.status === 'em_preparacao'
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <span>{currentCfg.actionLabel}</span>
            {order.status === 'pronto' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <ArrowRight className="w-4 h-4 shrink-0" />
            )}
          </button>
        ) : (
          <div className="flex-1 py-2 text-center text-xs font-medium text-neutral-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Entregue ao Cliente</span>
          </div>
        )}
      </div>
    </article>
  );
};
