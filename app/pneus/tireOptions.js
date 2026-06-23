'use client';

/**
 * Opções compartilhadas da vertical de PNEUS (landing + listagem).
 * Mantém um único ponto de verdade para medidas e marcas.
 */

export const CATEGORY_SLUG = 'pneus-automoveis';

// Larguras de banda comuns (mm): 165..315 de 10 em 10.
export const LARGURAS = Array.from({ length: 16 }, (_, i) => 165 + i * 10);

// Perfil / série (altura %): 30..80 de 5 em 5.
export const PERFIS = Array.from({ length: 11 }, (_, i) => 30 + i * 5);

// Aro (polegadas): 13..22.
export const AROS = Array.from({ length: 10 }, (_, i) => 13 + i);

// Marcas de pneu para grid e filtro.
export const MARCAS = [
  'Michelin', 'Pirelli', 'Goodyear', 'Bridgestone', 'Continental',
  'Firestone', 'Dunlop', 'BFGoodrich', 'Cooper', 'General Tire',
  'Hankook', 'Yokohama', 'Kumho', 'Maxxis', 'Linglong',
  'Xbri', 'RoadX', 'Barum', 'BKT',
];

// Marcas de veículo (UI da busca por veículo — base veículo→medida ainda não existe).
export const VEICULO_MARCAS = [
  'Volkswagen', 'Chevrolet', 'Fiat', 'Ford', 'Hyundai', 'Toyota',
  'Honda', 'Renault', 'Jeep', 'Nissan', 'Peugeot', 'Citroën',
];

export const VEICULO_MODELOS = {
  Volkswagen: ['Gol', 'Polo', 'Virtus', 'T-Cross', 'Nivus', 'Saveiro'],
  Chevrolet: ['Onix', 'Onix Plus', 'Tracker', 'Cruze', 'S10', 'Spin'],
  Fiat: ['Argo', 'Mobi', 'Cronos', 'Pulse', 'Toro', 'Strada'],
  Ford: ['Ka', 'EcoSport', 'Ranger', 'Territory'],
  Hyundai: ['HB20', 'HB20S', 'Creta', 'Tucson'],
  Toyota: ['Corolla', 'Corolla Cross', 'Yaris', 'Hilux', 'RAV4'],
  Honda: ['Civic', 'City', 'Fit', 'HR-V', 'WR-V'],
  Renault: ['Kwid', 'Sandero', 'Logan', 'Duster', 'Oroch'],
  Jeep: ['Renegade', 'Compass', 'Commander'],
  Nissan: ['Kicks', 'Versa', 'Frontier'],
  Peugeot: ['208', '2008', '3008'],
  Citroën: ['C3', 'C4 Cactus', 'Aircross'],
};

// Anos: do atual (2026) até 2000.
export const ANOS = Array.from({ length: 27 }, (_, i) => 2026 - i);

/** Converte itens em [{value,label}] para o atom Select. */
export const toOpts = (arr, suffix = '') =>
  arr.map((v) => ({ value: String(v), label: suffix ? `${v}${suffix}` : String(v) }));
