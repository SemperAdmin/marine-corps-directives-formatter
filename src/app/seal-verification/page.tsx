'use client';

import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Header } from 'docx';
import { createDoDSeal, getDoDSealBuffer } from '@/lib/dod-seal';

export default function SealVerificationPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
  };

  const testSealImplementation = async () => {
    setIsTesting(true);
    setTestResults([]);
    setError(null);
    
    try {
      addResult('Starting seal verification tests...');
      
      // Test 1: Get seal buffer
      addResult('Test 1: Getting seal buffer...');
      const buffer = getDoDSealBuffer();
      addResult(`✓ Seal buffer created successfully. Size: ${buffer.byteLength} bytes`);
      
      // Test 2: Create ImageRun
      addResult('Test 2: Creating ImageRun...');
      const sealImageRun = createDoDSeal();
      addResult('✓ Seal ImageRun created successfully');
      
      // Test 3: Create a simple document with the seal
      addResult('Test 3: Creating document with seal...');
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
      addResult('✓ Document created successfully');
      
      // Test 4: Pack document
      addResult('Test 4: Packing document...');
      const blob = await Packer.toBlob(doc);
      addResult(`✓ Document packed successfully. Size: ${blob.size} bytes`);
      
      // Test 5: Create download link
      addResult('Test 5: Creating download URL...');
      const url = URL.createObjectURL(blob);
      addResult('✓ Download URL created successfully');
      
      // Clean up
      URL.revokeObjectURL(url);
      
      addResult('🎉 All tests passed! The seal implementation is working correctly.');
      
    } catch (err: any) {
      console.error('Error testing seal:', err);
      setError(`Seal test failed: ${err.message || err}`);
      addResult('❌ Test failed. Check console for details.');
    } finally {
      setIsTesting(false);
    }
  };

  // Run tests automatically when component mounts
  useEffect(() => {
    testSealImplementation();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>DoD Seal Verification</h1>
      <p>This page verifies that the DoD seal implementation is working correctly.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testSealImplementation}
          disabled={isTesting}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: isTesting ? '#ccc' : '#003366', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: isTesting ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isTesting ? 'Testing...' : 'Run Verification Tests'}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '14px'
      }}>
        <h3>Test Results:</h3>
        {testResults.length > 0 ? (
          <ul style={{ paddingLeft: '20px' }}>
            {testResults.map((result, index) => (
              <li key={index} style={{ marginBottom: '5px' }}>{result}</li>
            ))}
          </ul>
        ) : (
          <p>No tests run yet.</p>
        )}
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h3>How the seal should appear in documents:</h3>
        <p>The DoD seal should appear in the top-left corner of the first page header, positioned 0.5 inches from the left and top edges of the page.</p>
        <p>It should be a circular seal with the text "DoD" in the center and "DEPARTMENT OF DEFENSE" at the bottom.</p>
      </div>
    </div>
  );
}