'use client';
import { useEffect, useState } from 'react';

export default function DownloadApkPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = '/velo.apk';
    link.download = 'velo.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#000', color: '#fff', fontFamily: 'sans-serif',
      textAlign: 'center', padding: '20px'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        V≡LO
      </h1>
      <p style={{ color: '#999', marginBottom: '2rem' }}>
        Download the VELO Android App
      </p>
      <button onClick={handleDownload} disabled={downloading} style={{
        padding: '16px 48px', fontSize: '1.2rem', fontWeight: 700,
        background: downloading ? '#333' : '#ff0050',
        color: '#fff', border: 'none', borderRadius: '50px',
        cursor: 'pointer', marginBottom: '1rem'
      }}>
        {downloading ? 'Downloading...' : 'Download APK'}
      </button>
      <p style={{ color: '#666', fontSize: '0.85rem', maxWidth: '400px' }}>
        Version 1.0.0 • 2.5 MB • Android 5.0+
      </p>
      <p style={{ color: '#666', fontSize: '0.85rem', maxWidth: '400px', marginTop: '1rem' }}>
        <strong>Installation:</strong><br />
        1. Download the APK<br />
        2. Open Settings → Security → Enable "Install from unknown sources"<br />
        3. Open the downloaded file and tap Install
      </p>
    </div>
  );
}
