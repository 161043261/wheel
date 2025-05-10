class OhMyMitt {
  eventName2callbacks: Map<string, Set<Function>>;
  constructor() {
    this.eventName2callbacks = new Map<string, Set<Function>>();
  }

  on(eventName: string, callback: Function) {
    if (this.eventName2callbacks.has(eventName)) {
      this.eventName2callbacks.get(eventName)?.add(callback);
      return;
    }

    this.eventName2callbacks.set(eventName, new Set<Function>([callback]));
  }

  once(eventName: string, callback: Function) {
    const wrappedCallback = (...args: unknown[]) => {
      callback.call(undefined, ...args);
      this.off(eventName, wrappedCallback);
    };

    this.on(eventName, wrappedCallback);
  }

  emit(eventName: string, ...args: unknown[]) {
    if (!this.eventName2callbacks.has(eventName)) {
      return;
    }

    this.eventName2callbacks
      .get(eventName)
      ?.forEach((callback) => callback.apply(undefined, args));
  }

  off(eventName: string, callback: Function) {
    if (!this.eventName2callbacks.has(eventName)) {
      return;
    }

    this.eventName2callbacks.get(eventName)?.delete(callback);
    if (this.eventName2callbacks.get(eventName)?.size === 0) {
      this.eventName2callbacks.delete(eventName);
    }
  }

  clear() {
    this.eventName2callbacks.clear();
  }
}

export const ohMyMitt = new OhMyMitt();
