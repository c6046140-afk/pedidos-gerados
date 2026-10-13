import React, { useState } from 'react';
import { OrderProvider } from './context/OrderContext';
import { Header } from './components/Header';
import { KitchenMetricsBar } from './components/KitchenMetricsBar';
import { KanbanBoard } from './components/KanbanBoard';
import { DeliveredView } from './components/DeliveredView';
import { SupabaseModal } from './components/SupabaseModal';

function KDSApp() {
  const [activeTab, setActiveTab] = useState<'board' | 'delivered'>('board');
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 select-none">
      {/* Top bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSupabase={() => setIsSupabaseOpen(true)}
      />

      {/* Metrics bar */}
      <KitchenMetricsBar />

      {/* Main content viewport */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'board' ? (
          <KanbanBoard />
        ) : (
          <DeliveredView onBackToBoard={() => setActiveTab('board')} />
        )}
      </main>

      {/* Settings Modal */}
      <SupabaseModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <OrderProvider>
      <KDSApp />
    </OrderProvider>
  );
}
