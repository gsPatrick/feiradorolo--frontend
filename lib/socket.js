'use client';

import { io } from 'socket.io-client';
import { getToken } from './api';

// O socket conecta na RAIZ do servidor (sem /api/v1).
const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1').replace(/\/api\/v1\/?$/, '');

let socket = null;

/** Retorna (criando se preciso) o socket autenticado por JWT. Null sem token/SSR. */
export function getSocket() {
  if (typeof window === 'undefined') return null;
  const token = getToken();
  if (!token) return null;
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
