import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Order, OrderStatus, OrderType, OrderItem } from '../types/order';
import { INITIAL_ORDERS } from '../data/initialOrders';
import { soundService } from '../services/sound';
import { supabaseService } from '../services/supabase';

const LOCAL_STORAGE_KEY = 'kds_active_orders_v1';
const COUNTER_STORAGE_KEY = 'kds_order_counter_v1';

export type SyncState = 'local' | 'connected' | 'syncing' | 'error';

interface OrderContextType {
  orders: Order[];
  activeOrders: Order[];
  deliveredOrders: Order[];
  syncState: SyncState;
  syncMessage: string;
  isMuted: boolean;
  toggleSound: () => void;
  playKitchenBell: () => void;
  addOrder: (orderInput: {
    customer_name?: string;
    order_type: OrderType;
    table_number?: string;
    items: Omit<OrderItem, 'id' | 'completed'>[];
    notes?: string;
    total_price?: number;
  }) => Order;
  updateStatus: (orderId: string, nextStatus: OrderStatus) => void;
  advanceStatus: (orderId: string) => void;
  revertStatus: (orderId: string) => void;
  toggleItemCompleted: (orderId: string, itemId: string) => void;
  deleteOrder: (orderId: string) => void;
  resetDemoOrders: () => void;
  clearDeliveredHistory: () => void;
  refreshFromSupabase: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | null>(null);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return INITIAL_ORDERS;
  });

  const [syncState, setSyncState] = useState<SyncState>('local');
  const [syncMessage, setSyncMessage] = useState<string>('Armazenamento local');
  const [isMuted, setIsMuted] = useState<boolean>(soundService.isMuted());
  const initialFetchDone = useRef(false);

  // Keep localStorage updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // Storage error
    }
  }, [orders]);

  // Check Supabase connection and optionally load remote orders on mount
  useEffect(() => {
    const checkSupabase = async () => {
      const isConfigured = supabaseService.isConnected();
      if (!isConfigured) {
        setSyncState('local');
        setSyncMessage('Modo local (sem Supabase configurado)');
        return;
      }

      setSyncState('syncing');
      setSyncMessage('Conectando ao Supabase...');

      try {
        const config = supabaseService.getConfig();
        const testResult = await supabaseService.testConnection(config.url, config.anonKey, config.tableName);
        if (testResult.success) {
          setSyncState('connected');
          setSyncMessage('Sincronizado com Supabase em tempo real');

          if (!initialFetchDone.current) {
            initialFetchDone.current = true;
            const remoteOrders = await supabaseService.fetchOrders();
            if (remoteOrders && remoteOrders.length > 0) {
              setOrders(remoteOrders);
            }
          }
        } else {
          setSyncState('error');
          setSyncMessage(testResult.message);
        }
      } catch (err) {
        setSyncState('error');
        setSyncMessage('Erro ao conectar com Supabase');
      }
    };

    checkSupabase();

    // Periodic polling every 6 seconds to automatically detect orders made by the totem/self-service system
    const pollInterval = setInterval(async () => {
      if (!supabaseService.isConnected()) return;

      try {
        const remoteOrders = await supabaseService.fetchOrders();
        if (remoteOrders) {
          setOrders((prevOrders) => {
            const prevIds = new Set(prevOrders.map((o) => o.id));
            const hasNewOrders = remoteOrders.some((ro) => !prevIds.has(ro.id));

            if (hasNewOrders) {
              soundService.playNewOrderChime();
            }
            return remoteOrders;
          });
          setSyncState('connected');
        }
      } catch {
        // Silently handle transient connection errors during polling
      }
    }, 6000);

    return () => clearInterval(pollInterval);
  }, []);

  const refreshFromSupabase = useCallback(async () => {
    if (!supabaseService.isConnected()) {
      setSyncState('local');
      setSyncMessage('Modo local (sem Supabase configurado)');
      return;
    }

    setSyncState('syncing');
    try {
      const remoteOrders = await supabaseService.fetchOrders();
      if (remoteOrders) {
        setOrders(remoteOrders);
        setSyncState('connected');
        setSyncMessage(`Sincronizado: ${remoteOrders.length} pedidos obtidos do Supabase`);
      } else {
        setSyncState('error');
        setSyncMessage('Falha ao obter pedidos do Supabase');
      }
    } catch (e) {
      setSyncState('error');
      setSyncMessage('Erro de rede ao sincronizar');
    }
  }, []);

  const toggleSound = useCallback(() => {
    const next = soundService.toggleMute();
    setIsMuted(next);
  }, []);

  const playKitchenBell = useCallback(() => {
    soundService.playServiceBell();
  }, []);

  // Generate sequential order number (#101, #102...)
  const getNextOrderNumber = useCallback((): number => {
    try {
      const current = localStorage.getItem(COUNTER_STORAGE_KEY);
      let num = current ? parseInt(current, 10) : 106;
      if (isNaN(num)) num = 106;
      localStorage.setItem(COUNTER_STORAGE_KEY, String(num + 1));
      return num;
    } catch {
      return Math.floor(Math.random() * 899) + 100;
    }
  }, []);

  // Add new order from Kiosk (Autoatendimento)
  const addOrder = useCallback((input: {
    customer_name?: string;
    order_type: OrderType;
    table_number?: string;
    items: Omit<OrderItem, 'id' | 'completed'>[];
    notes?: string;
    total_price?: number;
  }): Order => {
    const timestamp = new Date().toISOString();
    const orderNumber = getNextOrderNumber();
    const orderId = `ord-${orderNumber}-${Date.now().toString().slice(-4)}`;

    const formattedItems: OrderItem[] = input.items.map((item, idx) => ({
      ...item,
      id: `${orderId}-item-${idx + 1}`,
      completed: false,
    }));

    const calculatedTotal = input.total_price !== undefined
      ? input.total_price
      : formattedItems.reduce((acc, curr) => acc + (curr.unit_price || 0) * curr.quantity, 0);

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      customer_name: input.customer_name || `Totem ${Math.floor(Math.random() * 3) + 1}`,
      order_type: input.order_type,
      table_number: input.table_number,
      status: 'recebido',
      items: formattedItems,
      notes: input.notes,
      total_price: calculatedTotal,
      created_at: timestamp,
      updated_at: timestamp,
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Sound chime for new kitchen order
    soundService.playNewOrderChime();

    // Push to Supabase if connected
    if (supabaseService.isConnected()) {
      setSyncState('syncing');
      supabaseService.saveOrder(newOrder).then((success) => {
        if (success) {
          setSyncState('connected');
          setSyncMessage('Pedido gravado no Supabase');
        } else {
          setSyncState('error');
          setSyncMessage('Erro ao gravar pedido no Supabase');
        }
      });
    }

    return newOrder;
  }, [getNextOrderNumber]);

  // Update specific status
  const updateStatus = useCallback((orderId: string, nextStatus: OrderStatus) => {
    const nowIso = new Date().toISOString();

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;

        const updated: Order = {
          ...ord,
          status: nextStatus,
          updated_at: nowIso,
        };

        if (nextStatus === 'em_preparacao' && !ord.prepared_at) {
          updated.prepared_at = nowIso;
        } else if (nextStatus === 'pronto') {
          updated.ready_at = nowIso;
        } else if (nextStatus === 'entregue') {
          updated.delivered_at = nowIso;
        }

        return updated;
      })
    );

    // Audio cues
    if (nextStatus === 'pronto') {
      soundService.playOrderReady();
    } else {
      soundService.playStatusTransition();
    }

    // Update in Supabase
    if (supabaseService.isConnected()) {
      setSyncState('syncing');
      const timestamps: Partial<Order> = {
        updated_at: nowIso,
      };
      if (nextStatus === 'em_preparacao') timestamps.prepared_at = nowIso;
      if (nextStatus === 'pronto') timestamps.ready_at = nowIso;
      if (nextStatus === 'entregue') timestamps.delivered_at = nowIso;

      supabaseService.updateStatus(orderId, nextStatus, timestamps).then((success) => {
        if (success) {
          setSyncState('connected');
          setSyncMessage(`Status atualizado para "${nextStatus}" no Supabase`);
        } else {
          setSyncState('error');
          setSyncMessage('Falha ao atualizar no Supabase');
        }
      });
    }
  }, []);

  // Advance workflow: recebido -> em_preparacao -> pronto -> entregue
  const advanceStatus = useCallback((orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    if (target.status === 'recebido') {
      updateStatus(orderId, 'em_preparacao');
    } else if (target.status === 'em_preparacao') {
      updateStatus(orderId, 'pronto');
    } else if (target.status === 'pronto') {
      updateStatus(orderId, 'entregue');
    }
  }, [orders, updateStatus]);

  // Revert workflow: entregue -> pronto -> em_preparacao -> recebido
  const revertStatus = useCallback((orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    if (target.status === 'entregue') {
      updateStatus(orderId, 'pronto');
    } else if (target.status === 'pronto') {
      updateStatus(orderId, 'em_preparacao');
    } else if (target.status === 'em_preparacao') {
      updateStatus(orderId, 'recebido');
    }
  }, [orders, updateStatus]);

  // Toggle individual item checklist
  const toggleItemCompleted = useCallback((orderId: string, itemId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const newItems = ord.items.map((it) =>
          it.id === itemId ? { ...it, completed: !it.completed } : it
        );
        const updated = {
          ...ord,
          items: newItems,
          updated_at: new Date().toISOString(),
        };

        if (supabaseService.isConnected()) {
          supabaseService.saveOrder(updated);
        }
        return updated;
      })
    );
  }, []);

  // Delete order
  const deleteOrder = useCallback((orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  // Reset back to initial demo orders
  const resetDemoOrders = useCallback(() => {
    setOrders(INITIAL_ORDERS);
    localStorage.setItem(COUNTER_STORAGE_KEY, '106');
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
    } catch {
      // Ignored
    }
    soundService.playStatusTransition();
  }, []);

  // Clear delivered history
  const clearDeliveredHistory = useCallback(() => {
    setOrders((prev) => prev.filter((o) => o.status !== 'entregue'));
  }, []);

  // Computed subsets
  const activeOrders = orders.filter((o) => o.status !== 'entregue');
  const deliveredOrders = orders.filter((o) => o.status === 'entregue');

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeOrders,
        deliveredOrders,
        syncState,
        syncMessage,
        isMuted,
        toggleSound,
        playKitchenBell,
        addOrder,
        updateStatus,
        advanceStatus,
        revertStatus,
        toggleItemCompleted,
        deleteOrder,
        resetDemoOrders,
        clearDeliveredHistory,
        refreshFromSupabase,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
