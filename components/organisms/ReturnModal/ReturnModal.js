'use client';

import { useRef, useState } from 'react';
import styles from './ReturnModal.module.css';
import Modal from '../Modal/Modal';
import Button from '../../atoms/Button/Button';
import Select from '../../atoms/Select/Select';
import Textarea from '../../atoms/Textarea/Textarea';
import Icon from '../../atoms/Icon/Icon';
import { useToast } from '../../providers/ToastProvider';
import { disputeService, uploadImage, ApiError } from '@/lib/api';

/* Motivos (rótulo PT → enum do backend). */
const REASONS = [
  { value: 'not_received', label: 'Não recebi' },
  { value: 'not_as_described', label: 'Veio diferente do anunciado' },
  { value: 'damaged', label: 'Chegou danificado' },
  { value: 'fraud', label: 'Suspeita de fraude' },
  { value: 'other', label: 'Outro' },
];

const OPENED_OPTIONS = [
  { value: 'not_opened', label: 'Não abri / não usei' },
  { value: 'opened_not_used', label: 'Abri, mas não usei' },
  { value: 'used', label: 'Usei' },
];

const MAX_PHOTOS = 5;

/**
 * Modal — comprador solicita devolução do pedido.
 *
 * Props:
 *   open    - boolean
 *   onClose - () => void
 *   orderId - id do pedido
 *   onDone  - () => void  (recarrega o pedido após o sucesso)
 */
export default function ReturnModal({ open, onClose, orderId, onDone }) {
  const { toast } = useToast();

  const [reason, setReason] = useState('');
  const [opened, setOpened] = useState('');
  const [complete, setComplete] = useState('');
  const [hasDefect, setHasDefect] = useState('');
  const [defectText, setDefectText] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]); // [{ id, url }]
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  function reset() {
    setReason('');
    setOpened('');
    setComplete('');
    setHasDefect('');
    setDefectText('');
    setDescription('');
    setPhotos([]);
  }

  function handleClose() {
    if (submitting) return;
    onClose && onClose();
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length + photos.length > MAX_PHOTOS) {
      toast({
        title: 'Limite de fotos',
        description: `Você pode adicionar no máximo ${MAX_PHOTOS} fotos.`,
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    for (const file of files) {
      try {
        const data = await uploadImage(file);
        if (data && data.url) {
          setPhotos((prev) => [...prev, { id: Math.random().toString(36).slice(2, 11), url: data.url }]);
        }
      } catch (err) {
        toast({ title: 'Falha no upload da foto', description: err?.message, variant: 'destructive' });
      }
    }
    setUploading(false);
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSubmit() {
    if (!reason) {
      toast({
        title: 'Selecione o motivo',
        description: 'Escolha por que você quer devolver o produto.',
        variant: 'destructive',
      });
      return;
    }

    const product_state = {
      opened,
      complete,
      has_defect: hasDefect,
      defect_description: hasDefect === 'yes' ? defectText.trim() : '',
    };

    setSubmitting(true);
    try {
      await disputeService.requestReturn({
        order_id: orderId,
        reason,
        description: description.trim(),
        product_state,
        evidence: photos.map((p) => p.url),
      });
      toast({
        title: 'Devolução solicitada!',
        description: 'O vendedor foi notificado e vai analisar o seu pedido.',
        variant: 'success',
      });
      reset();
      onDone && onDone();
      onClose && onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 409
          ? 'Já existe uma solicitação de devolução para este pedido.'
          : err?.message || 'Não foi possível solicitar a devolução agora. Tente novamente.';
      toast({ title: 'Falha ao solicitar devolução', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={handleClose} disabled={submitting} className={styles.action}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit} loading={submitting} disabled={uploading} className={styles.action}>
        {submitting ? 'Enviando...' : 'Solicitar devolução'}
      </Button>
    </>
  );

  return (
    <Modal open={open} onClose={handleClose} title="Solicitar devolução" size="md" footer={footer}>
      <div className={styles.content}>
        {/* Motivo */}
        <div className={styles.field}>
          <span className={styles.label}>Motivo da devolução</span>
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Selecione o motivo"
            options={REASONS}
          />
        </div>

        {/* Questionário — estado do produto */}
        <fieldset className={styles.questionnaire}>
          <legend className={styles.legend}>Estado do produto</legend>

          <div className={styles.field}>
            <span className={styles.label}>Você abriu/usou o produto?</span>
            <Select
              value={opened}
              onChange={(e) => setOpened(e.target.value)}
              placeholder="Selecione"
              options={OPENED_OPTIONS}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>O produto está completo (com tudo)?</span>
            <Select
              value={complete}
              onChange={(e) => setComplete(e.target.value)}
              placeholder="Selecione"
              options={[
                { value: 'yes', label: 'Sim' },
                { value: 'no', label: 'Não' },
              ]}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Tem defeito?</span>
            <Select
              value={hasDefect}
              onChange={(e) => setHasDefect(e.target.value)}
              placeholder="Selecione"
              options={[
                { value: 'yes', label: 'Sim' },
                { value: 'no', label: 'Não' },
              ]}
            />
          </div>

          {hasDefect === 'yes' && (
            <div className={styles.field}>
              <span className={styles.label}>Qual o defeito?</span>
              <Textarea
                className={styles.textarea}
                placeholder="Descreva o defeito encontrado..."
                value={defectText}
                onChange={(e) => setDefectText(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </fieldset>

        {/* Descrição */}
        <div className={styles.field}>
          <span className={styles.label}>O que aconteceu?</span>
          <Textarea
            className={styles.textarea}
            placeholder="Conte com detalhes o que aconteceu com o seu pedido..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Fotos */}
        <div className={styles.field}>
          <span className={styles.label}>Fotos (opcional — máx. {MAX_PHOTOS})</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className={styles.hiddenInput}
          />
          <button
            type="button"
            className={styles.dropzone}
            onClick={() => inputRef.current && inputRef.current.click()}
            disabled={uploading || photos.length >= MAX_PHOTOS}
          >
            <Icon name="camera" size={24} className={styles.dropIcon} />
            <span>{uploading ? 'Enviando fotos...' : 'Clique para adicionar fotos'}</span>
          </button>

          {photos.length > 0 && (
            <div className={styles.previews}>
              {photos.map((photo, index) => (
                <div key={photo.id} className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Foto ${index + 1}`} />
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removePhoto(photo.id)}
                    aria-label={`Remover foto ${index + 1}`}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aviso de prazo */}
        <p className={styles.notice}>
          <Icon name="shield" size={16} />
          Você tem até 7 dias após o recebimento para devolver (direito de arrependimento).
        </p>
      </div>
    </Modal>
  );
}
