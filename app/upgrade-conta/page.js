'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import DashboardLayout from '@/components/templates/DashboardLayout/DashboardLayout';
import FormField from '@/components/molecules/FormField/FormField';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { contentService } from '@/lib/api';

/* ----------------------------------------------------------------
   FALLBACK — fiel e completo ao front antigo.
---------------------------------------------------------------- */
const FALLBACK = {
  content: {
    pageTitle: 'Virar Empresa (PJ)',
    benefits: {
      heading: 'Benefícios da conta empresarial',
      items: [
        'Venda sem limite de faturamento',
        'Emissão automática de nota fiscal',
        'Acesso a relatórios fiscais',
        'Painel empresarial avançado',
        'Suporte prioritário',
      ],
      note:
        'Seu histórico de compras, favoritos e dados são mantidos. Apenas adicionamos os recursos empresariais.',
    },
    form: {
      cnpjLabel: 'CNPJ',
      cnpjPlaceholder: '00.000.000/0000-00',
      razaoLabel: 'Razão Social',
      razaoPlaceholder: 'Minha Empresa LTDA',
      fantasiaLabel: 'Nome Fantasia',
      fantasiaPlaceholder: 'Minha Loja',
      ieLabel: 'Inscrição Estadual',
      iePlaceholder: 'Opcional',
      imLabel: 'Inscrição Municipal',
      imPlaceholder: 'Opcional',
      tipoLabel: 'Tipo de empresa',
      tipoOptions: [
        { value: 'mei', label: 'MEI' },
        { value: 'micro', label: 'Microempresa' },
        { value: 'pequena', label: 'Pequena Empresa' },
        { value: 'media', label: 'Média Empresa' },
      ],
      regimeLabel: 'Regime tributário',
      regimeOptions: [
        { value: 'simples', label: 'Simples Nacional' },
        { value: 'presumido', label: 'Lucro Presumido' },
        { value: 'real', label: 'Lucro Real' },
      ],
      submitLabel: 'Fazer upgrade',
      successMessage: 'Solicitação enviada! Verificação em até 2 dias úteis.',
    },
  },
};

export default function UpgradeContaPage() {
  const { toast } = useToast();
  const [content, setContent] = useState(FALLBACK.content);
  const [f, setF] = useState({ cnpj: '', razao: '', fantasia: '', ie: '', im: '', tipo: 'mei', regime: 'simples' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    contentService
      .get('upgrade-conta')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const c = content;

  function submit(e) {
    e.preventDefault();
    toast({ title: c.form.successMessage, variant: 'success', duration: 2500 });
  }

  return (
    <DashboardLayout active="upgrade" title={c.pageTitle}>
      <div className={styles.layout}>
        <aside className={styles.benefits}>
          <div className={styles.bHead}>
            <Icon name="store" size={22} />
            <strong>{c.benefits.heading}</strong>
          </div>
          <ul>
            {c.benefits.items.map((b) => (
              <li key={b}><Icon name="check" size={15} /> {b}</li>
            ))}
          </ul>
          <div className={styles.note}>{c.benefits.note}</div>
        </aside>

        <form className={styles.form} onSubmit={submit}>
          <FormField label={c.form.cnpjLabel} required placeholder={c.form.cnpjPlaceholder} value={f.cnpj} onChange={set('cnpj')} />
          <FormField label={c.form.razaoLabel} required placeholder={c.form.razaoPlaceholder} value={f.razao} onChange={set('razao')} />
          <FormField label={c.form.fantasiaLabel} placeholder={c.form.fantasiaPlaceholder} value={f.fantasia} onChange={set('fantasia')} />
          <div className={styles.row2}>
            <FormField label={c.form.ieLabel} placeholder={c.form.iePlaceholder} value={f.ie} onChange={set('ie')} />
            <FormField label={c.form.imLabel} placeholder={c.form.imPlaceholder} value={f.im} onChange={set('im')} />
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <span className={styles.label}>{c.form.tipoLabel}</span>
              <select className={styles.select} value={f.tipo} onChange={set('tipo')}>
                {c.form.tipoOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>{c.form.regimeLabel}</span>
              <select className={styles.select} value={f.regime} onChange={set('regime')}>
                {c.form.regimeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth>{c.form.submitLabel}</Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
