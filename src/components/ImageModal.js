import React from 'react';
import styles from './ImageModal.module.css';

const ImageModal = ({ imageUrl, onClose, altText = 'Imagen ampliada' }) => {
  if (!imageUrl) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
        <img src={imageUrl} alt={altText} className={styles.image} />
      </div>
    </div>
  );
};

export default ImageModal;
