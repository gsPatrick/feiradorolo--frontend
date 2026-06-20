'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { couponService, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Icon from '@/components/atoms/Icon/Icon';

const CORES = ['green', 'blue', 'purple', 'red'];

function formatDesconto(cupom) {
  if (cupom.type === 'percentage') return `${Number(cupom.value)}%`;
  return `R$ ${Number(cupom.value)}`;
}

function formatMinimo(valor) {
  const n = Number(valor || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatValidade(expires) {
  if (!expires) return 'sem prazo';
  const d = new Date(expires);
  if (Number.isNaN(d.getTime())) return 'sem prazo';
  return d.toLocaleDateString('pt-BR');
}

function Clock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function Copy({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export default function CuponsPage() {
  const { toast } = useToast();
  const [copiado, setCopiado] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [cupons, setCupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    let ativo = true;
    couponService
      .list()
      .then((data) => {
        if (ativo) setCupons(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (ativo) setCupons([]);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  function copiar(c, id) {
    try {
      navigator.clipboard.writeText(c);
    } catch {}
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  }

  async function aplicar() {
    const code = codigo.trim();
    if (!code || aplicando) return;
    setAplicando(true);
    try {
      await couponService.validate(code, 0);
      toast({ title: 'Cupom válido!', variant: 'success', duration: 2000 });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Não foi possível validar o cupom.';
      toast({ title: 'Cupom inválido', description: msg, variant: 'destructive' });
    } finally {
      setAplicando(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.head}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/" className={styles.back}>Voltar</Button>
          <div className={styles.headTitle}>
            <Icon name="tag" size={32} className={styles.tagIcon} />
            <div>
              <h1>Cupons de Desconto</h1>
              <p>Aproveite as melhores ofertas e economize em suas compras</p>
            </div>
          </div>
        </div>

        {/* Aplicar cupom */}
        <div className={styles.applyCard}>
          <h2>Aplicar Cupom</h2>
          <div className={styles.applyRow}>
            <Input placeholder="Digite o código do cupom" value={codigo} onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') aplicar(); }} />
            <Button className={styles.applyBtn} onClick={aplicar} disabled={aplicando}>Aplicar</Button>
          </div>
        </div>

        {/* Lista */}
        <h2 className={styles.listTitle}>Cupons Disponíveis</h2>
        <div className={styles.list}>
          {loading ? (
            <p className={styles.min}>Carregando…</p>
          ) : cupons.length === 0 ? (
            <p className={styles.min}>Nenhum cupom disponível no momento.</p>
          ) : (
            cupons.map((cupom, i) => (
              <div key={cupom.id} className={styles.coupon}>
                <div className={cx(styles.left, styles[`c_${CORES[i % CORES.length]}`])}>
                  <span className={styles.desc}>{formatDesconto(cupom)}</span>
                  <span className={styles.off}>OFF</span>
                </div>
                <div className={styles.body}>
                  <span className={styles.cat}>{cupom.code}</span>
                  <h3>{cupom.description}</h3>
                  <p className={styles.min}>Válido para compras acima de {formatMinimo(cupom.min_order_amount)}</p>
                  <div className={styles.codeRow}>
                    <span className={styles.code}>{cupom.code}</span>
                    <button className={styles.copyBtn} onClick={() => copiar(cupom.code, cupom.id)}>
                      {copiado === cupom.id ? (
                        <><Icon name="check" size={16} /> Copiado!</>
                      ) : (
                        <><Copy size={16} /> Copiar</>
                      )}
                    </button>
                  </div>
                  <div className={styles.validade}>
                    <Clock size={15} /> Válido até {formatValidade(cupom.expires_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Dicas */}
        <div className={styles.tips}>
          <h3>💡 Dicas para usar cupons</h3>
          <ul>
            <li>• Verifique sempre a validade do cupom antes de usar</li>
            <li>• Alguns cupons têm valor mínimo de compra</li>
            <li>• Cupons não podem ser combinados com outras promoções</li>
            <li>• Fique atento às categorias específicas de cada cupom</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
