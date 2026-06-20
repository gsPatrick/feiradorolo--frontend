'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Spinner from '@/components/atoms/Spinner/Spinner';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import { productService, mapProduct } from '@/lib/api';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function Target({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
    </svg>
  );
}
function Navigation({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  );
}

// distância simulada determinística por índice
const withDistance = (list, radius) =>
  list.map((p, i) => ({ ...p, distance_km: Math.max(1, Math.round(((i * 7) % (radius || 10)) * 10) / 10 + 0.5) }));

export default function ProximosPage() {
  const [cep, setCep] = useState('');
  const [cepCity, setCepCity] = useState('');
  const [gps, setGps] = useState({ active: false, loading: false, error: '', city: '' });
  const [filters, setFilters] = useState({ city: '', state: '', radius: '10' });
  const [searchType, setSearchType] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const c = window.localStorage.getItem('fdr.cep');
      const city = window.localStorage.getItem('fdr.city');
      if (c) setCep(c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);
      if (city) setCepCity(city);
    } catch {}
  }, []);

  function runSearch(type, title) {
    setSearchType({ type, title });
    setLoading(true);
    productService
      .list('?limit=48')
      .then((d) => {
        const mapped = (Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean);
        setResults(withDistance(mapped, Number(filters.radius) || 10));
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }

  function requestGPS() {
    if (!navigator.geolocation) {
      setGps((g) => ({ ...g, error: 'Geolocalização não suportada.' }));
      return;
    }
    setGps((g) => ({ ...g, loading: true, error: '' }));
    navigator.geolocation.getCurrentPosition(
      () => setGps({ active: true, loading: false, error: '', city: 'Sua localização' }),
      () => setGps({ active: false, loading: false, error: 'Não foi possível obter sua localização.', city: '' })
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.head}>
          <h1><Icon name="map-pin" size={30} className={styles.headIcon} /> Produtos Perto de Você</h1>
          <p>Encontre produtos na sua região ou busque por proximidade usando sua localização atual</p>
        </div>

        {/* CEP + GPS */}
        <div className={styles.locRow}>
          {cep && cepCity && (
            <div className={cx(styles.locCard, styles.locCep)}>
              <Icon name="map-pin" size={18} />
              <div>
                <div className={styles.locTitle}>CEP Configurado</div>
                <div className={styles.locSub}>{cep} - {cepCity}</div>
              </div>
            </div>
          )}
          <div className={cx(styles.locCard, gps.active ? styles.locGpsOn : styles.locGpsOff)}>
            <Target size={18} />
            <div className={styles.locGrow}>
              <div className={styles.locTitle}>{gps.active ? 'GPS Ativo' : 'GPS Desligado'}</div>
              <div className={styles.locSub}>{gps.active ? gps.city : 'Clique para ativar'}</div>
              {gps.error && <div className={styles.locErr}>{gps.error}</div>}
            </div>
            {!gps.active && (
              <Button variant="outline" size="sm" onClick={requestGPS} loading={gps.loading}>Ativar</Button>
            )}
          </div>
        </div>

        <div className={styles.layout}>
          {/* Sidebar — filtros */}
          <aside className={styles.sidebar}>
            <div className={styles.filterCard}>
              <h3>Filtrar por localização</h3>
              <label className={styles.fLabel}>Cidade</label>
              <Input value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} placeholder="Ex: São Paulo" />
              <label className={styles.fLabel}>Estado</label>
              <Select value={filters.state} placeholder="UF" options={UFS} onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))} />
              <label className={styles.fLabel}>Raio</label>
              <Select value={filters.radius} options={[{ value: '5', label: '5 km' }, { value: '10', label: '10 km' }, { value: '25', label: '25 km' }, { value: '50', label: '50 km' }]} onChange={(e) => setFilters((f) => ({ ...f, radius: e.target.value }))} />
              <Button fullWidth className={styles.filterBtn} onClick={() => runSearch('location', filters.city || filters.state ? `Produtos em ${[filters.city, filters.state].filter(Boolean).join(', ')}` : 'Produtos por Localização')}>
                Buscar
              </Button>
            </div>

            <div className={styles.statsCard}>
              <h3>Estatísticas</h3>
              <div className={styles.statRow}><span>Cidades</span><span className={styles.statVal}>1.240</span></div>
              <div className={styles.statRow}><span>Estados</span><span className={styles.statVal}>27</span></div>
              <div className={styles.statRow}><span>Produtos</span><span className={styles.statVal}>18.730</span></div>
            </div>
          </aside>

          {/* Main */}
          <div className={styles.main}>
            {searchType && (
              <div className={styles.resultHead}>
                <Icon name="package" size={20} className={styles.pkgIcon} />
                <div>
                  <h2>{searchType.title}</h2>
                  <p>{loading ? 'Buscando produtos...' : `${results.length} produtos encontrados`}</p>
                </div>
              </div>
            )}

            {loading && (
              <div className={styles.loading}>
                <Spinner size={28} /> Buscando produtos próximos...
              </div>
            )}

            {!loading && searchType && results.length > 0 && (
              <div className={styles.grid}>
                {results.map((p) => (
                  <div key={p.id} className={styles.cardWrap}>
                    <span className={styles.distBadge}><Navigation size={12} /> {p.distance_km}km</span>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}

            {!loading && searchType && results.length === 0 && (
              <div className={styles.state}>
                <Icon name="package" size={56} className={styles.stateIcon} />
                <h3>Nenhum produto encontrado</h3>
                <p>Não encontramos produtos nesta região. Tente expandir a área de busca ou escolher outra localização.</p>
              </div>
            )}

            {!searchType && (
              <div className={styles.state}>
                <Icon name="map-pin" size={56} className={styles.stateIconY} />
                <h3>Encontre produtos na sua região</h3>
                <p>Configure sua localização usando CEP ou GPS para encontrar produtos próximos.</p>
                <div className={styles.quick}>
                  {cep && (
                    <Button className={styles.qCep} leftIcon="map-pin" onClick={() => runSearch('location', `Produtos perto de ${cepCity}`)}>
                      Buscar por CEP ({cep})
                    </Button>
                  )}
                  {gps.active ? (
                    <Button className={styles.qGps} onClick={() => runSearch('nearby', 'Produtos em um raio de 10km')}>
                      <Target size={16} /> Buscar por GPS (10km)
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={requestGPS} loading={gps.loading}>
                      <Target size={16} /> Ativar GPS
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
