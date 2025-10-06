'use client';

import { useState, useEffect } from 'react';

// Simple version of the DoD seal SVG
const DOD_SEAL_SIMPLE = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0IiBoZWlnaHQ9IjE0NCIgdmlld0JveD0iMCAwIDE0NCAxNDQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iNzAiIGZpbGw9IiMwMDMzNjYiIHN0cm9rZT0iI0ZGRDcwMCIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iNTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRDcwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iMzAiIGZpbGw9IiNGRkQ3MDAiLz4KICA8Y2lyY2xlIGN4PSI3MiIgY3k9IjcyIiByPSIyNSIgZmlsbD0iIzAwMzM2NiIvPgogIDx0ZXh0IHg9IjcyIiB5PSI3OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRDcwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+RG9EPC90ZXh0PgogIDx0ZXh0IHg9IjcyIiB5PSIxMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNGRkQ3MDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmb250LXdlaWdodD0iYm9sZCI+REVQQVJUTUVOVCBPRIBERUZFTLNFPC90ZXh0Pgo8L3N2Zz4=`;

export default function DisplaySealPage() {
  const [sealData, setSealData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      console.log('Displaying seal data:', DOD_SEAL_SIMPLE);
      setSealData(DOD_SEAL_SIMPLE);
    } catch (err: any) {
      console.error('Error displaying seal:', err);
      setError(`Failed to display seal: ${err.message || err}`);
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>DoD Seal Display Test</h1>
      <div>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {sealData ? (
          <div>
            <h2>Seal Image:</h2>
            <img 
              src={sealData} 
              alt="DoD Seal" 
              style={{ width: '144px', height: '144px', border: '1px solid #ccc' }}
            />
            <h3>Base64 Data:</h3>
            <textarea 
              readOnly 
              value={sealData} 
              style={{ width: '100%', height: '100px', fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>
        ) : (
          <p>Loading seal...</p>
        )}
      </div>
    </div>
  );
}