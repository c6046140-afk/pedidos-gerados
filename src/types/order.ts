export type OrderStatus = 'recebido' | 'em_preparacao' | 'pronto' | 'entregue';

export type OrderType = 'local' | 'viagem' | 'delivery';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  completed?: boolean;
  category?: 'lanche' | 'acompanhamento' | 'bebida' | 'sobremesa' | 'pizza' | 'outro';
  unit_price?: number;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name?: string;
  order_type: OrderType;
  table_number?: string;
  status: OrderStatus;
  items: OrderItem[];
  notes?: string;
  total_price: number;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  prepared_at?: string;
  ready_at?: string;
  delivered_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
  enabled: boolean;
}

export interface FilterState {
  search: string;
  orderType: 'all' | OrderType;
  sortBy: 'oldest' | 'newest' | 'urgency';
}
