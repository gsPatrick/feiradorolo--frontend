'use client';

import { useState } from 'react';
import styles from './ReviewForm.module.css';
import { cx } from '@/lib/cx';
import Modal from '@/components/organisms/Modal/Modal';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import { useToast } from '@/components/providers/ToastProvider';

const STAR_PATH =
  'm12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.2l1-5.8-4.3-4.1 5.9-.9Z';

function StarIcon({ filled }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

export default function ReviewForm({ open, onClose, productName, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const trimmedComment = comment.trim();
  const isValid = rating > 0 && trimmedComment.length >= 10;

  function reset() {
    setRating(0);
    setHoveredRating(0);
    setTitle('');
    setComment('');
  }

  function handleClose() {
    if (isSubmitting) return;
    reset();
    onClose && onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma classificação',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedComment.length < 10) {
      toast({
        title: 'Erro',
        description: 'O comentário deve ter pelo menos 10 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        rating,
        title: title.trim(),
        comment: trimmedComment,
      };

      // Submit simulado
      await new Promise((resolve) => setTimeout(resolve, 700));

      if (onSubmit) onSubmit(payload);

      toast({
        title: 'Sucesso!',
        description: 'Avaliação enviada com sucesso',
      });

      reset();
      onClose && onClose();
    } catch (error) {
      console.error('Erro ao enviar review:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar avaliação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title={
        <span className={styles.titleHead}>
          <StarIconSmall />
          Avaliar este produto
        </span>
      }
    >
      {productName && <p className={styles.productName}>{productName}</p>}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Rating Stars */}
        <div className={styles.field}>
          <label className={styles.label}>Sua classificação *</label>
          <div className={styles.stars}>
            {[...Array(5)].map((_, index) => {
              const starValue = index + 1;
              const isFilled = starValue <= (hoveredRating || rating);
              return (
                <button
                  key={index}
                  type="button"
                  className={cx(styles.star, isFilled && styles.starFilled)}
                  onMouseEnter={() => setHoveredRating(starValue)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(starValue)}
                  aria-label={`${starValue} ${starValue === 1 ? 'estrela' : 'estrelas'}`}
                >
                  <StarIcon filled={isFilled} />
                </button>
              );
            })}
          </div>
          {rating > 0 && (
            <p className={styles.ratingHint}>{rating} de 5 estrelas</p>
          )}
        </div>

        {/* Title */}
        <div className={styles.field}>
          <label htmlFor="review-title" className={styles.label}>
            Título (opcional)
          </label>
          <Input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resumo da sua experiência..."
            maxLength={100}
          />
          <p className={styles.counter}>{title.length}/100 caracteres</p>
        </div>

        {/* Comment */}
        <div className={styles.field}>
          <label htmlFor="review-comment" className={styles.label}>
            Comentário *
          </label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte sua experiência com este produto..."
            minLength={10}
            maxLength={1000}
            rows={4}
            className={styles.textarea}
          />
          <p className={styles.counter}>
            {comment.length}/1000 caracteres (mínimo 10)
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={!isValid}
          className={styles.submit}
        >
          <span className={styles.submitInner}>
            {!isSubmitting && <SendIcon />}
            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
          </span>
        </Button>
      </form>
    </Modal>
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function StarIconSmall() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.headStar}
    >
      <path d={STAR_PATH} />
    </svg>
  );
}
