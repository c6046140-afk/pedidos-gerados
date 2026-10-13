import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { formatTime, formatDateTime, formatCurrency, getOrderTypeLabel } from '../utils/formatters';
import { CheckCircle2, RotateCcw, Trash2, ArrowLeft, Search, Calendar, PackageCheck } from 'lucide-react';

interface DeliveredViewProps {
  onBackToBoard: () => void;
}

export const DeliveredView: React.FC<DeliveredViewProps> = ({ onBackToBoard }) => {
  const { deliveredOrders, revertStatus, clearDeliveredHistory } = useOrders();
  const [search, setSearch] = useState('');

  const filtered = deliveredOrders.filter((order) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      order.order_number.toString().includes(q) ||
      order.customer_name?.toLowerCase().includes(q) ||
      order.items.some((i) => i.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-950">
      {/* Top action toolbar */}
      <div className="px-6 py-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToBoard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Quadro</span>
          </button>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
              <span>Histórico de Pedidos Entregues</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                {deliveredOrders.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Pedidos finalizados na cozinha e retirados pelos clientes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar no histórico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
            />
          </div>

          {deliveredOrders.length > 0 && (
            <button
              type="button"
              onClick={clearDeliveredHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Histórico</span>
            </button>
          )}
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="max-w-md mx-auto my-12 p-8 border border-dashed border-neutral-800 rounded-2xl text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-neutral-600 mb-3" />
            <h3 className="text-sm font-semibold text-white">Nenhum pedido entregue</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Quando os pedidos no status "Pronto" forem marcados como entregues, eles aparecerão aqui com data e horário de conclusão.
            </p>
            <button
              type="button"
              onClick={onBackToBoard}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Ir para o Quadro da Cozinha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((order) => {
              return (
                <div
                  key={order.id}
                  className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-neutral-200 tabular-nums">
                          #{order.order_number}
                        </span>
                        <span className="text-[11px] font-medium uppercase text-neutral-400 px-2 py-0.5 rounded bg-neutral-950">
                          {getOrderTypeLabel(order.order_type)}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Entregue
                      </span>
                    </div>

                    <div className="text-xs text-neutral-400 mt-2 flex items-center gap-1.5 flex-wrap">
                      <span>{order.customer_name || 'Totem'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Criado: {formatTime(order.created_at)}</span>
                      {order.delivered_at && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Entregue: {formatTime(order.delivered_at)}</span>
                        </>
                      )}
                    </div>

                    {/* Items */}
                    <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-1.5">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-xs text-neutral-300 flex items-start gap-1.5">
                          <span className="font-mono text-neutral-500 font-semibold">{item.quantity}x</span>
                          <span className="flex-1">{item.name}</span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="mt-2 text-xs text-neutral-400 italic">
                        Obs: {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-400">
                      Total: {formatCurrency(order.total_price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => revertStatus(order.id)}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reabrir para Pronto</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
