"use client";

type ToastMessage = { id: string; message: string; type?: "success" | "error" | "info" };

let toasts: ToastMessage[] = [];
let listeners: Array<(t: ToastMessage[]) => void> = [];

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function getToasts(): ToastMessage[] {
  return [...toasts];
}

export function subscribe(fn: (t: ToastMessage[]) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function toast(message: string, type: "success" | "error" | "info" = "info") {
  const id = Math.random().toString(36).slice(2);
  toasts.push({ id, message, type });
  if (toasts.length > 5) toasts = toasts.slice(-5);
  notify();
  return id;
}

export function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}
