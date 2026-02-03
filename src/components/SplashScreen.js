'use client';

import React, { useEffect, useState } from 'react';
import styles from './SplashScreen.module.css';

export default function SplashScreen({ onFinish }) {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Prevent scrolling while splash is visible
    document.body.style.overflow = 'hidden';

    // Wait for animation to finish (2.5s)
    const timer = setTimeout(() => {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
      
      // Remove from DOM after fade out transition (0.8s)
      setTimeout(() => {
        setShouldRender(false);
        if (onFinish) onFinish();
      }, 800);
      
    }, 2500);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'unset';
    };
  }, [onFinish]);

  if (!shouldRender) return null;

  return (
    <div className={`${styles.splashContainer} ${!isVisible ? styles.hidden : ''}`}>
      <div className={styles.logoContainer}>
        {/* Usamos una imagen de logo si existe, o un texto estilizado */}
        <img src="/logo.png" alt="Cuerámaro Prime" className={styles.logo} />
      </div>
      
      <div className={styles.title}>
        CUERÁMARO PRIME
      </div>

      <div className={styles.loadingBarContainer}>
        <div className={styles.loadingBar}></div>
      </div>
    </div>
  );
}
