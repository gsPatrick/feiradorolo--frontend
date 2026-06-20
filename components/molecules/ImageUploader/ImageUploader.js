'use client';

import { useRef, useState } from 'react';
import styles from './ImageUploader.module.css';
import Icon from '../../atoms/Icon/Icon';
import { uploadImage } from '@/lib/api';

const MAX_FILES = 8;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Grade de upload de imagens do produto. Faz upload real para a API e guarda a
 * URL retornada. Controlado: `images` ([{id,url,preview,isCover}]) + `onChange`.
 * A primeira imagem é sempre a capa. Reordenável por drag & drop.
 */
export default function ImageUploader({ images = [], onChange }) {
  const [showTips, setShowTips] = useState(false);
  const [uploading, setUploading] = useState(0);
  const dragId = useRef(null);

  function withCover(list) {
    return list.map((img, i) => ({ ...img, isCover: i === 0 }));
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    const accepted = [];
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > MAX_SIZE) return;
      if (images.length + accepted.length >= MAX_FILES) return;
      accepted.push(file);
    });
    e.target.value = '';
    if (!accepted.length) return;

    setUploading((n) => n + accepted.length);
    const uploaded = [];
    for (const file of accepted) {
      try {
        const data = await uploadImage(file);
        if (data && data.url) {
          uploaded.push({
            id: Math.random().toString(36).slice(2, 11),
            url: data.url,
            preview: data.url,
            isCover: false,
          });
        }
      } catch (err) {
        // silencioso por arquivo; segue os demais
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
    if (uploaded.length) onChange(withCover([...images, ...uploaded]));
  }

  function removeImage(id) {
    onChange(withCover(images.filter((img) => img.id !== id)));
  }

  function handleDrop(targetId) {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const list = [...images];
    const from = list.findIndex((i) => i.id === sourceId);
    const to = list.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    onChange(withCover(list));
  }

  return (
    <div>
      <div className={styles.header}>
        <h3 className={styles.title}>Fotos *</h3>
      </div>
      <p className={styles.subtitle}>Envie boas fotos para que o produto tenha destaque.</p>

      {/* Caixa de Recomendações */}
      <div className={styles.recBox}>
        <Icon name="bulb" size={20} className={styles.recIcon} />
        <div className={styles.recBody}>
          <h4>Consiga fotos de qualidade seguindo nossas recomendações</h4>
          <p>
            Ao enviar suas fotos, certifique-se de usar um fundo branco digitalizado, com o produto
            centralizado e boa definição para atrair mais compradores.
          </p>
          <button type="button" className={styles.recLink} onClick={() => setShowTips((v) => !v)}>
            Saber como as minhas fotos devem ser
          </button>
        </div>
        <div className={styles.ref}>
          <div className={styles.refImg}>
            <Icon name="camera" size={26} />
          </div>
          <span>Referência</span>
        </div>
      </div>

      {/* Dicas expansíveis */}
      {showTips && (
        <div className={styles.tips}>
          <h4>📸 Dicas para Fotos Perfeitas</h4>
          <p>• Use fundo branco ou neutro</p>
          <p>• Ilumine bem o produto (luz natural é ideal)</p>
          <p>• Tire fotos de diferentes ângulos</p>
          <p>• Mostre detalhes importantes</p>
          <p>• Mantenha o produto centralizado</p>
          <p>• Evite reflexos e sombras</p>
        </div>
      )}

      {/* Grade */}
      <div className={styles.grid}>
        {images.length < MAX_FILES && (
          <label className={styles.uploadBtn}>
            <input type="file" multiple accept="image/*" onChange={handleUpload} hidden disabled={uploading > 0} />
            <Icon name="plus" size={20} />
            <span>{uploading > 0 ? 'Enviando…' : 'Adicionar'}</span>
          </label>
        )}

        {images.map((image, index) => (
          <div
            key={image.id}
            className={styles.thumb}
            draggable
            onDragStart={() => (dragId.current = image.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(image.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt={`Produto ${index + 1}`} draggable={false} />
            {image.isCover && <div className={styles.coverBadge}>FOTO DE CAPA</div>}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeImage(image.id)}
              title="Remover imagem"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className={styles.info}>
        <p>• {images.length}/{MAX_FILES} fotos adicionadas</p>
        <p>• A primeira foto será usada como capa do produto</p>
        <p>• Arraste as fotos para reordenar — a primeira sempre será a capa</p>
        <p>• Formatos aceitos: JPG, PNG, WEBP (máx. 5MB cada)</p>
      </div>
    </div>
  );
}
