type Listener = (error: any) => void;

class ErrorEmitter {
  private listeners: Record<string, Listener[]> = {};

  // Suscribirse a un tipo de error
  on(eventName: string, listener: Listener) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);
  }

  // Quitar la suscripción (para no gastar memoria)
  off(eventName: string, listener: Listener) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName] = this.listeners[eventName].filter(l => l !== listener);
  }

  // Emitir (gritar) el error a toda la app
  emit(eventName: string, payload: any) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach(listener => listener(payload));
  }
}

// Exportamos una única instancia para que toda la app comparta el mismo "megáfono"
export const errorEmitter = new ErrorEmitter();