'use client';

import { useRef, useState } from 'react';
import styles from './ProductRatingModal.module.css';
import Modal from '../Modal/Modal';
import Button from '../../atoms/Button/Button';
import Textarea from '../../atoms/Textarea/Textarea';
import Icon from '../../atoms/Icon/Icon';
import { useToast } from '../../providers/ToastProvider';
import { uploadImage } from '@/lib/api';

const RATING_LABELS = {
  0: 'Clique nas estrelas para avaliar',
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Excelente',
};

const MAX_PHOTOS = 3;

/**
 * Modal global de avaliação de produto comprado.
 * Estrelas (obrigatório, com hover), comentário (opcional) e upload de até 3 fotos.
 *
 * Props:
 *   open      - boolean
 *   onClose   - () => void
 *   order     - { id, product: { image, title } }  (ou `product` direto)
 *   product   - { image, title }                    (alternativa a `order`)
 *   onSubmit  - ({ rating, comment, photos }) => void
 */
export default function ProductRatingModal({ open, onClose, order, product, onSubmit }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]); // [{ id, url, preview }]
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const prod = product || order?.product || {};
  const orderId = order?.id ? String(order.id).slice(-8) : null;
  const display = hover || rating;

  function reset() {
    setRating(0);
    setHover(0);
    setComment('');
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
        description: 'Você pode adicionar no máximo 3 fotos.',
        variant: 'destructive',
      });
      return;
    }
    setUploadingPhoto(true);
    for (const file of files) {
      try {
        const data = await uploadImage(file);
        if (data && data.url) {
          setPhotos((prev) => [...prev, { id: Math.random().toString(36).slice(2, 11), url: data.url, preview: data.url }]);
        }
      } catch (err) {
        toast({ title: 'Falha no upload da foto', description: err.message, variant: 'destructive' });
      }
    }
    setUploadingPhoto(false);
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSubmit() {
    if (rating === 0) {
      toast({
        title: 'Avaliação obrigatória',
        description: 'Por favor, selecione uma classificação de 1 a 5 estrelas.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    // Envio simulado.
    setTimeout(() => {
      onSubmit && onSubmit({ rating, comment, photos: photos.map((p) => p.url) });
      toast({
        title: 'Avaliação Enviada!',
        description: 'Obrigado por avaliar este produto. Sua opinião é muito importante!',
      });
      setSubmitting(false);
      reset();
      onClose && onClose();
    }, 1500);
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={handleClose} disabled={submitting} className={styles.action}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit} loading={submitting} className={styles.action}>
        {submitting ? 'Enviando...' : 'Enviar Avaliação'}
      </Button>
    </>
  );

  return (
    <Modal open={open} onClose={handleClose} title="Avaliar Produto" size="sm" footer={footer}>
      <div className={styles.content}>
        {/* Produto */}
        <div className={styles.product}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.productImg}
            src={prod.image || '/placeholder-product.jpg'}
            alt={prod.title || 'Produto'}
          />
          <div className={styles.productInfo}>
            <h4 className={styles.productTitle}>{prod.title}</h4>
            {orderId && <p className={styles.productOrder}>Pedido #{orderId}</p>}
          </div>
        </div>

        {/* Estrelas */}
        <div className={styles.ratingBlock}>
          <span className={styles.label}>Sua avaliação</span>
          <div className={styles.stars} onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={styles.starBtn}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
              >
                <Icon
                  name="star"
                  size={32}
                  className={star <= display ? styles.starOn : styles.starOff}
                />
              </button>
            ))}
          </div>
          <p className={styles.ratingHint}>{RATING_LABELS[display]}</p>
        </div>

        {/* Comentário */}
        <div className={styles.field}>
          <span className={styles.label}>Comentário (opcional)</span>
          <Textarea
            className={styles.textarea}
            placeholder="Conte sua experiência com este produto..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        {/* Upload de fotos */}
        <div className={styles.field}>
          <span className={styles.label}>Fotos (opcional - máx. 3)</span>
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
            disabled={photos.length >= MAX_PHOTOS}
          >
            <Icon name="camera" size={24} className={styles.dropIcon} />
            <span>Clique para adicionar fotos</span>
          </button>

          {photos.length > 0 && (
            <div className={styles.previews}>
              {photos.map((photo, index) => (
                <div key={photo.id} className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt={`Foto ${index + 1}`} />
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
      </div>
    </Modal>
  );
}
