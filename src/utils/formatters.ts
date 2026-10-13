/**
 * Formatting helpers for KDS display
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--:--';
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--/-- --:--';
  }
}

export interface ElapsedInfo {
  minutes: number;
  seconds: number;
  formatted: string;
  urgency: 'normal' | 'warning' | 'urgent';
}

export function getElapsedTime(isoString: string): ElapsedInfo {
  try {
    const created = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - created);
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    let urgency: 'normal' | 'warning' | 'urgent' = 'normal';
    if (minutes >= 10) {
      urgency = 'urgent';
    } else if (minutes >= 5) {
      urgency = 'warning';
    }

    return {
      minutes,
      seconds,
      formatted,
      urgency,
    };
  } catch {
    return {
      minutes: 0,
      seconds: 0,
      formatted: '00:00',
      urgency: 'normal',
    };
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'recebido':
      return 'Recebido';
    case 'em_preparacao':
      return 'Em preparação';
    case 'pronto':
      return 'Pronto';
    case 'entregue':
      return 'Entregue';
    default:
      return status;
  }
}

export function getOrderTypeLabel(type: string): string {
  switch (type) {
    case 'local':
      return 'Consumo Local';
    case 'viagem':
      return 'Para Viagem';
    case 'delivery':
      return 'Delivery';
    default:
      return type;
  }
}
