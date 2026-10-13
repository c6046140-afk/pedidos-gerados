import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { OrderCard } from './OrderCard';
import { Order, OrderStatus } from '../types/order';
import { Search, Filter, ChefHat, Clock, CheckCircle2, Inbox, Sparkles, AlertCircle } from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const { activeOrders } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'local' | 'viagem'>('all');

  // Filter orders according to search and dining type
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((order) => {
      // Type filter
      if (typeFilter !== 'all' && order.order_type !== typeFilter) {
        return false;
      }
      // Search filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesNumber = order.order_number.toString().includes(query);
        const matchesCustomer = order.customer_name?.toLowerCase().includes(query);
        const matchesTable = order.table_number?.toLowerCase().includes(query);
        const matchesItem = order.items.some(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.notes?.toLowerCase().includes(query)
        );
        const matchesNotes = order.notes?.toLowerCase().includes(query);
        return Boolean(matchesNumber || matchesCustomer || matchesTable || matchesItem || matchesNotes);
      }
      return true;
    });
  }, [activeOrders, typeFilter, searchTerm]);

  // Group by status
  const ordersByStatus = useMemo(() => {
    const map: Record<OrderStatus, Order[]> = {
      recebido: [],
      em_preparacao: [],
      pronto: [],
      entregue: [],
    };
    filteredOrders.forEach((order) => {
      if (map[order.status]) {
        map[order.status].push(order);
      }
    });

    // Sort by created_at (oldest first so older orders get prepared first!)
    map.recebido.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    map.em_preparacao.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    map.pronto.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return map;
  }, [filteredOrders]);

  const columns: Array<{
    status: OrderStatus;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accentColor: string;
    emptyText: string;
  }> = [
    {
      status: 'recebido',
      title: 'Recebido',
      subtitle: 'Aguardando preparo',
      icon: <Inbox className="w-4 h-4 text-sky-400" />,
      accentColor: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
      emptyText: 'Nenhum pedido novo aguardando. Novos pedidos do autoatendimento aparecerão aqui.',
    },
    {
      status: 'em_preparacao',
      title: 'Em preparação',
      subtitle: 'Em produção na cozinha',
      icon: <ChefHat className="w-4 h-4 text-amber-400" />,
      accentColor: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
      emptyText: 'Nenhum pedido em produção no momento.',
    },
    {
      status: 'pronto',
      title: 'Pronto',
      subtitle: 'Aguardando retirada',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      accentColor: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
      emptyText: 'Nenhum pedido finalizado aguardando entrega.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-950">
      {/* Filter and search toolbar */}
      <div className="px-6 py-3 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por #pedido, item, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dining mode filter segmented buttons */}
          <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                typeFilter === 'all'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('local')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                typeFilter === 'local'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              No Local
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('viagem')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                typeFilter === 'viagem'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Para Viagem
            </button>
          </div>
        </div>

        {/* Right side helper info */}
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/50"></span>
            <span>&lt; 5 min</span>
            <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/50 ml-1"></span>
            <span>5–10 min</span>
            <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/50 ml-1"></span>
            <span>&gt; 10 min (Urgente)</span>
          </div>
        </div>
      </div>

      {/* Kanban columns area */}
      <div className="flex-1 p-6 overflow-x-auto min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-w-[900px]">
          {columns.map((col) => {
            const list = ordersByStatus[col.status];
            return (
              <section
                key={col.status}
                className="flex flex-col bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden h-full"
              >
                {/* Column header */}
                <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    {col.icon}
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                        {col.title}
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700 tabular-nums">
                          {list.length}
                        </span>
                      </h2>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{col.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Column body / cards scroll area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {list.length > 0 ? (
                    list.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))
                  ) : (
                    <div className="h-48 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-neutral-500">
                      <p className="text-xs max-w-xs">{col.emptyText}</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
