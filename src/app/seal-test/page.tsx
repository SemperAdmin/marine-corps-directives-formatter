'use client';

import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Header } from 'docx';
import { createDoDSeal, getDoDSealBuffer } from '@/lib/dod-seal';

export default function SealTestPage() {
  const [testStatus, setTestStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const testSealFunctions = async () => {
    try {
      setTestStatus('Testing seal functions...');
      
      // Test 1: Get seal buffer
      const buffer = getDoDSealBuffer();
      console.log('Seal buffer size:', buffer.byteLength);
      setTestStatus(`Seal buffer created successfully. Size: ${buffer.byteLength} bytes`);
      
      // Test 2: Create ImageRun
      const sealImageRun = createDoDSeal();
      console.log('Seal ImageRun created successfully');
      setTestStatus(prev => prev + '\nImageRun created successfully');
      
      // Test 3: Create a simple document with the seal
      const doc = new Document({
        sections: [{
          headers: {
            first: new Header({
              children: [
                new Paragraph({
                  children: [createDoDSeal()],
                }),
              ],
            }),
          },
          children: [
            new Paragraph({
              children: [
                new TextRun("Test Document with DoD Seal"),
              ],
            }),
          ],
        }],
      });
      
      console.log('Document created successfully');
      setTestStatus(prev => prev + '\nDocument created successfully');
      
      // Test 4: Pack document
      const blob = await Packer.toBlob(doc);
      console.log('Document packed successfully. Size:', blob.size);
      setTestStatus(prev => prev + `\nDocument packed successfully. Size: ${blob.size} bytes`);
      
      // Test 5: Create download link
      const url = URL.createObjectURL(blob);
      console.log('Download URL created successfully');
      setTestStatus(prev => prev + '\nDownload URL created successfully');
      
      // Clean up
      URL.revokeObjectURL(url);
      
      setTestStatus(prev => prev + '\nAll tests passed!');
      
    } catch (err: any) {
      console.error('Error testing seal:', err);
      setError(`Seal test failed: ${err.message || err}`);
      setTestStatus('Test failed. Check console for details.');
    }
  };

  useEffect(() => {
    testSealFunctions();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>DoD Seal Test</h1>
      <div>
        <h2>Status: {testStatus}</h2>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        <p>Check the browser console for detailed logs.</p>
        <button 
          onClick={testSealFunctions}
          style={{ 
            marginTop: '20px', 
            padding: '10px 20px', 
            backgroundColor: '#003366', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          Run Test Again
        </button>
      </div>
    </div>
  );
}