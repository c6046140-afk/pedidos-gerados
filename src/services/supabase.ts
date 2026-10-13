import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderStatus, SupabaseConfig } from '../types/order';

const CONFIG_STORAGE_KEY = 'kds_supabase_config';

export const DEFAULT_SUPABASE_SQL = `-- ==============================================================================
-- 1. CRIAR TABELA DE PEDIDOS (KDS / AUTOATENDIMENTO)
-- ==============================================================================
create table if not exists public.pedidos (
  id text primary key,
  order_number integer not null,
  customer_name text default 'Totem Autoatendimento',
  order_type text not null default 'local', -- 'local', 'viagem', 'delivery'
  table_number text,
  status text not null default 'recebido', -- 'recebido', 'em_preparacao', 'pronto', 'entregue'
  items jsonb not null default '[]'::jsonb,
  notes text,
  total_price numeric(10, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  prepared_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz
);

-- Índices de performance para busca rápida no painel de cozinha
create index if not exists idx_pedidos_status on public.pedidos (status);
create index if not exists idx_pedidos_created_at on public.pedidos (created_at desc);

-- ==============================================================================
-- 2. ATIVAR ROW LEVEL SECURITY (RLS) NA TABELA DE PEDIDOS
-- ==============================================================================
alter table public.pedidos enable row level security;

-- Política 1: Leitura de pedidos (Painel de cozinha e totem)
drop policy if exists "Permitir leitura de pedidos" on public.pedidos;
create policy "Permitir leitura de pedidos"
  on public.pedidos
  for select
  using (true);

-- Política 2: Inserção de novos pedidos (Totem de autoatendimento)
drop policy if exists "Permitir insercao de novos pedidos" on public.pedidos;
create policy "Permitir insercao de novos pedidos"
  on public.pedidos
  for insert
  with check (true);

-- Política 3: Atualização de status e preparo (Painel de cozinha)
drop policy if exists "Permitir atualizacao de pedidos pelo painel" on public.pedidos;
create policy "Permitir atualizacao de pedidos pelo painel"
  on public.pedidos
  for update
  using (true)
  with check (true);

-- Política 4: Exclusão / Limpeza de pedidos
drop policy if exists "Permitir remocao de pedidos" on public.pedidos;
create policy "Permitir remocao de pedidos"
  on public.pedidos
  for delete
  using (true);

-- ==============================================================================
-- 3. TRIGGER AUTOMÁTICO PARA ATUALIZAR 'updated_at'
-- ==============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_updated_at on public.pedidos;
create trigger trigger_set_updated_at
  before update on public.pedidos
  for each row
  execute function public.handle_updated_at();

-- ==============================================================================
-- 4. ATIVAR SUPABASE REALTIME (ATUALIZAÇÃO INSTANTÂNEA NO PAINEL)
-- ==============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'pedidos'
  ) then
    alter publication supabase_realtime add table public.pedidos;
  end if;
end $$;

-- ==============================================================================
-- 5. POLÍTICAS DE STORAGE (ARMAZENAMENTO DE ARQUIVOS/ANEXOS/COMPROVANTES)
-- ==============================================================================
-- Criar bucket 'comprovantes_pedidos' se não existir
insert into storage.buckets (id, name, public)
values ('comprovantes_pedidos', 'comprovantes_pedidos', true)
on conflict (id) do nothing;

-- Política de leitura pública para o bucket de armazenamento
drop policy if exists "Permitir visualizacao publica de arquivos do pedido" on storage.objects;
create policy "Permitir visualizacao publica de arquivos do pedido"
  on storage.objects
  for select
  using (bucket_id = 'comprovantes_pedidos');

-- Política de upload de arquivos no bucket de armazenamento
drop policy if exists "Permitir upload de arquivos do pedido" on storage.objects;
create policy "Permitir upload de arquivos do pedido"
  on storage.objects
  for insert
  with check (bucket_id = 'comprovantes_pedidos');

-- Política de exclusão de arquivos no bucket de armazenamento
drop policy if exists "Permitir exclusao de arquivos do pedido" on storage.objects;
create policy "Permitir exclusao de arquivos do pedido"
  on storage.objects
  for delete
  using (bucket_id = 'comprovantes_pedidos');
`;

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig = {
    url: '',
    anonKey: '',
    tableName: 'pedidos',
    enabled: false,
  };

  constructor() {
    this.loadConfig();
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public loadConfig(): SupabaseConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.config = {
          url: parsed.url || '',
          anonKey: parsed.anonKey || '',
          tableName: parsed.tableName || 'pedidos',
          enabled: Boolean(parsed.enabled),
        };
      } else {
        // Fallback to Vite env variables if set
        const envUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
        const envKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';
        if (envUrl && envKey && !envUrl.includes('seu-projeto')) {
          this.config = {
            url: envUrl,
            anonKey: envKey,
            tableName: 'pedidos',
            enabled: true,
          };
        }
      }

      if (this.config.enabled && this.config.url && this.config.anonKey) {
        this.client = createClient(this.config.url, this.config.anonKey);
      } else {
        this.client = null;
      }
    } catch {
      this.client = null;
    }
    return this.config;
  }

  public saveConfig(config: SupabaseConfig): void {
    this.config = { ...config };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    if (this.config.enabled && this.config.url && this.config.anonKey) {
      try {
        this.client = createClient(this.config.url, this.config.anonKey);
      } catch {
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public isConnected(): boolean {
    return Boolean(this.client && this.config.enabled && this.config.url && this.config.anonKey);
  }

  /**
   * Test connection to Supabase table
   */
  public async testConnection(url: string, anonKey: string, tableName = 'pedidos'): Promise<{ success: boolean; message: string }> {
    try {
      if (!url || !anonKey) {
        return { success: false, message: 'URL e Chave Anônima são obrigatórias.' };
      }
      const testClient = createClient(url, anonKey);
      const { error } = await testClient.from(tableName).select('id').limit(1);

      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            message: `Conectou ao Supabase, mas a tabela "${tableName}" ainda não existe. Execute o script SQL no painel do Supabase.`,
          };
        }
        return { success: false, message: `Erro ao conectar: ${error.message}` };
      }

      return { success: true, message: `Conexão estabelecida com sucesso na tabela "${tableName}"!` };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Falha na requisição: ${errorMsg}` };
    }
  }

  /**
   * Fetch all orders from Supabase
   */
  public async fetchOrders(): Promise<Order[] | null> {
    if (!this.client || !this.config.enabled) return null;

    try {
      const { data, error } = await this.client
        .from(this.config.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar pedidos do Supabase:', error.message);
        return null;
      }

      return (data as Order[]) || [];
    } catch (err) {
      console.warn('Falha ao buscar pedidos no Supabase:', err);
      return null;
    }
  }

  /**
   * Upsert order in Supabase
   */
  public async saveOrder(order: Order): Promise<boolean> {
    if (!this.client || !this.config.enabled) return false;

    try {
      const { error } = await this.client
        .from(this.config.tableName)
        .upsert(
          {
            id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name || 'Totem Autoatendimento',
            order_type: order.order_type,
            table_number: order.table_number || null,
            status: order.status,
            items: order.items,
            notes: order.notes || null,
            total_price: order.total_price,
            created_at: order.created_at,
            updated_at: order.updated_at,
            prepared_at: order.prepared_at || null,
            ready_at: order.ready_at || null,
            delivered_at: order.delivered_at || null,
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.warn('Falha ao salvar pedido no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Erro de rede ao salvar pedido no Supabase:', err);
      return false;
    }
  }

  /**
   * Update order status in Supabase
   */
  public async updateStatus(orderId: string, status: OrderStatus, timestamps: Partial<Order> = {}): Promise<boolean> {
    if (!this.client || !this.config.enabled) return false;

    try {
      const updatePayload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        ...timestamps,
      };

      const { error } = await this.client
        .from(this.config.tableName)
        .update(updatePayload)
        .eq('id', orderId);

      if (error) {
        console.warn('Falha ao atualizar status no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Erro ao atualizar status no Supabase:', err);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
