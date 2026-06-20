'use client';

import { useEffect, useState } from 'react';
import styles from './AddressFormModal.module.css';
import Modal from '../Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import Button from '../../atoms/Button/Button';
import Select from '../../atoms/Select/Select';
import Checkbox from '../../atoms/Checkbox/Checkbox';
import FormField from '../../molecules/FormField/FormField';
import { useToast } from '@/components/providers/ToastProvider';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// lucide "settings" — Icon.js não possui esse nome; SVG inline conforme convenção.
function SettingsIcon({ size = 20, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function maskCep(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

const EMPTY = {
  label: '',
  recipient: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  phone: '',
  isDefault: false,
};

/**
 * AddressFormModal — modal global reutilizável para adicionar ou editar endereço.
 * Réplica fiel dos QuickAddAddressModal / QuickEditAddressModal do front antigo.
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   address: null (adicionar) | objeto (editar — pré-preenche o formulário)
 *   onSave: (data) => void
 */
export default function AddressFormModal({ open, onClose, address = null, onSave }) {
  const { toast } = useToast();
  const isEdit = !!address;
  const [formData, setFormData] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  // Pré-preenche no modo edit; reseta no modo add — sempre que abrir.
  useEffect(() => {
    if (!open) return;
    if (address) {
      setFormData({
        label: address.label || '',
        recipient: address.recipient || '',
        cep: maskCep(address.zipCode || address.cep || ''),
        street: address.street || '',
        number: address.number || '',
        complement: address.complement || '',
        neighborhood: address.neighborhood || '',
        city: address.city || '',
        state: address.state || '',
        phone: address.phone || '',
        isDefault: !!address.isDefault,
      });
    } else {
      setFormData(EMPTY);
    }
  }, [open, address]);

  const set = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  async function handleCepChange(raw) {
    const masked = maskCep(raw);
    set('cep', masked);
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch (error) {
        console.log('Erro ao buscar CEP:', error);
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    // Submit simulado.
    setTimeout(() => {
      onSave && onSave(formData);
      toast({
        title: isEdit ? 'Endereço Atualizado!' : 'Endereço Adicionado!',
        description: isEdit
          ? 'As alterações foram salvas com sucesso.'
          : 'Seu novo endereço foi cadastrado com sucesso.',
        variant: 'success',
      });
      setSubmitting(false);
      onClose && onClose();
    }, 1000);
  }

  const title = (
    <span className={styles.title}>
      {isEdit ? (
        <SettingsIcon size={20} className={styles.titleIcon} />
      ) : (
        <Icon name="map-pin" size={20} className={styles.titleIcon} />
      )}
      {isEdit ? 'Editar Endereço' : 'Adicionar Endereço'}
    </span>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField
          label="Nome do Endereço"
          required
          placeholder="Ex: Casa, Trabalho, Casa da Vó..."
          value={formData.label}
          onChange={(e) => set('label', e.target.value)}
        />

        <FormField
          label="Nome do Destinatário"
          required
          placeholder="Nome completo"
          value={formData.recipient}
          onChange={(e) => set('recipient', e.target.value)}
        />

        <div className={styles.grid2}>
          <FormField
            label="CEP"
            required
            placeholder="00000-000"
            value={formData.cep}
            maxLength={9}
            inputMode="numeric"
            onChange={(e) => handleCepChange(e.target.value)}
          />
          <FormField
            label="Número"
            required
            placeholder="123"
            value={formData.number}
            onChange={(e) => set('number', e.target.value)}
          />
        </div>

        <FormField
          label="Rua/Avenida"
          required
          placeholder="Nome da rua"
          value={formData.street}
          onChange={(e) => set('street', e.target.value)}
        />

        <FormField
          label="Complemento (opcional)"
          placeholder="Apto, bloco, casa..."
          value={formData.complement}
          onChange={(e) => set('complement', e.target.value)}
        />

        <FormField
          label="Bairro"
          required
          placeholder="Nome do bairro"
          value={formData.neighborhood}
          onChange={(e) => set('neighborhood', e.target.value)}
        />

        <div className={styles.grid2}>
          <FormField
            label="Cidade"
            required
            placeholder="Nome da cidade"
            value={formData.city}
            onChange={(e) => set('city', e.target.value)}
          />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="address-state">
              Estado<span className={styles.required}>*</span>
            </label>
            <Select
              id="address-state"
              placeholder="UF"
              value={formData.state}
              required
              options={UFS}
              onChange={(e) => set('state', e.target.value)}
            />
          </div>
        </div>

        <FormField
          label="Telefone (opcional)"
          placeholder="(11) 99999-9999"
          value={formData.phone}
          onChange={(e) => set('phone', e.target.value)}
        />

        <Checkbox
          className={styles.default}
          checked={formData.isDefault}
          onChange={(v) => set('isDefault', v)}
          label="Definir como endereço padrão"
        />

        <div className={styles.actions}>
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" fullWidth loading={submitting} className={styles.btnSave}>
            {isEdit ? 'Salvar Alterações' : 'Salvar Endereço'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
