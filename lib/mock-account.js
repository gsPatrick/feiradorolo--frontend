import { PRODUCTS } from './mock-products';

export const USER = {
  firstName: 'Maria',
  lastName: 'Souza',
  name: 'Maria Souza',
  email: 'maria@email.com',
  phone: '(11) 98888-7777',
  cpf: '390.533.447-05',
  cnpj: '',
  birthDate: '1992-04-15',
  gender: 'feminino',
  avatar: 'M',
  memberSince: '2023',
  verifications: { email: 'verified', phone: 'pending', cpf: 'verified', cnpj: 'none' },
};

export const ADDRESSES = [
  {
    id: '1',
    label: 'Casa',
    recipient: 'Maria Souza',
    cep: '01001-000',
    street: 'Praça da Sé',
    number: '100',
    complement: 'Apto 42',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    isDefault: true,
  },
  {
    id: '2',
    label: 'Trabalho',
    recipient: 'Maria Souza',
    cep: '04567-000',
    street: 'Av. Engenheiro Luís Carlos Berrini',
    number: '1500',
    complement: '8º andar',
    neighborhood: 'Cidade Monções',
    city: 'São Paulo',
    state: 'SP',
    isDefault: false,
  },
];

export const ORDERS = [
  { id: 'FR2024A1', title: 'Headphone over-ear bluetooth premium', total: 329.0, qty: 1, date: '12/06/2026', status: 'delivered', image: PRODUCTS[1].image },
  { id: 'FR2024B7', title: 'Mochila antifurto resistente à água', total: 189.9, qty: 1, date: '02/06/2026', status: 'shipped', image: PRODUCTS[4].image },
  { id: 'FR2024C3', title: 'Teclado mecânico RGB switch blue', total: 289.0, qty: 1, date: '21/05/2026', status: 'paid', image: PRODUCTS[5].image },
];

export const SALES = [
  { id: 'V-9012', title: 'Tênis de corrida edição limitada', buyer: 'João P.', total: 459.9, qty: 1, date: '14/06/2026', status: 'shipped', commission: 45.99, image: PRODUCTS[0].image },
  { id: 'V-9008', title: 'Câmera mirrorless 24MP compacta', buyer: 'Ana L.', total: 2899.0, qty: 1, date: '10/06/2026', status: 'delivered', commission: 289.9, image: PRODUCTS[3].image },
  { id: 'V-8997', title: 'Smartphone 128GB tela AMOLED', buyer: 'Carlos M.', total: 1799.0, qty: 1, date: '05/06/2026', status: 'paid', commission: 179.9, image: PRODUCTS[7].image },
];

export const REVIEWS = [
  { id: 'r1', product: 'Headphone over-ear bluetooth premium', price: 329.0, rating: 5, title: 'Som excelente', comment: 'Qualidade de som incrível e bateria que dura o dia todo. Recomendo!', date: '13/06/2026', image: PRODUCTS[1].image },
  { id: 'r2', product: 'Mochila antifurto resistente à água', price: 189.9, rating: 4, title: 'Boa e resistente', comment: 'Material muito bom, compartimentos práticos. Só achei um pouco pesada.', date: '04/06/2026', image: PRODUCTS[4].image },
];

export const FAVORITES = PRODUCTS.slice(0, 5);

export const SELLER_STATS = { today: 247.5, sold: 12, pending: 3 };

export const RECENT_SALES = [
  { id: '12345', title: 'Escova de Dentes Elétrica', time: 'há 2 horas', price: 89.9, status: 'paid' },
  { id: '12344', title: 'Kit Ferramentas', time: 'há 4 horas', price: 157.6, status: 'shipped' },
];

export const SELLER_PRODUCTS = [
  { id: 'p1', title: 'convite show', price: 100.0, stock: 10, image: null },
];

export const STATUS_LABELS = {
  paid: { label: 'Pago', variant: 'info' },
  shipped: { label: 'Enviado', variant: 'brand' },
  delivered: { label: 'Entregue', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
};
