'use client';

import React, { useState, useEffect } from 'react';
import { CardContent } from '@/components/ui/card';

interface FormData {
  sig: string;
  delegationText: string[];
}

interface Step6ClosingProps {
  formData: FormData;
}

export const Step6Closing: React.FC<Step6ClosingProps> = ({ formData }) => {
  const [showDelegation, setShowDelegation] = useState(false);

  useEffect(() => {
    setShowDelegation(formData.delegationText.some(line => line.trim() !== ''));
  }, [formData.delegationText]);

  const dispatchFormChange = (patch: Partial<FormData>) => {
    document.dispatchEvent(new CustomEvent('wizardFormChange', { detail: patch }));
  };

  return (
    <div className="form-section">
      <div className="section-legend">
        <i className="fas fa-signature" style={{ marginRight: '8px' }}></i>
        Closing Block
      </div>
      <CardContent>
        <div className="input-group">
          <span className="input-group-text">Signature Name:</span>
          <input
            className="form-control"
            type="text"
            placeholder="F. M. LASTNAME"
            value={formData.sig}
            onChange={(e) => dispatchFormChange({ sig: e.target.value.toUpperCase() })}
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Delegation of Signature Authority?</label>
          <div className="radio-group">
            <label>
              <input type="radio" name="ifDelegation" checked={showDelegation} onChange={() => setShowDelegation(true)} /> Yes
            </label>
            <label>
              <input type="radio" name="ifDelegation" checked={!showDelegation} onChange={() => { setShowDelegation(false); dispatchFormChange({ delegationText: [''] }); }} /> No
            </label>
          </div>
        </div>

        {showDelegation && (
          <div className="dynamic-section" style={{ marginTop: '1rem' }}>
            {formData.delegationText.map((line, index) => (
              <div key={index} className="input-group">
                <input
                  className="form-control"
                  type="text"
                  placeholder={`Delegation line ${index + 1} (e.g., By direction)`}
                  value={line}
                  onChange={(e) => {
                    const newLines = [...formData.delegationText];
                    newLines[index] = e.target.value;
                    dispatchFormChange({ delegationText: newLines });
                  }}
                />
                {formData.delegationText.length > 1 && (
                  <button className="btn btn-danger" onClick={() => {
                    const newLines = formData.delegationText.filter((_, i) => i !== index);
                    dispatchFormChange({ delegationText: newLines });
                  }}>Remove</button>
                )}
              </div>
            ))}
            <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => dispatchFormChange({ delegationText: [...formData.delegationText, ''] })}>Add Delegation Line</button>
          </div>
        )}
      </CardContent>
    </div>
  );
};