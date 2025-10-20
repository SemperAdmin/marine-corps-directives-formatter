'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FormData {
  sig: string;
  delegationText: string[];
}

interface CopyToItem {
  code: string;
  qty: number;
}

interface SavedLetter {
  id: string;
  subj: string;
  savedAt: string;
}

interface Step4FinalProps {
  formData: FormData;
  pcn: string;
  distributionType: 'pcn-only' | 'pcn-with-copy' | 'statement' | 'none';
  copyToList: CopyToItem[];
  savedLetters: SavedLetter[];
  isGenerating: boolean;
}

export const Step4Final: React.FC<Step4FinalProps> = ({
  formData,
  pcn,
  distributionType,
  copyToList,
  savedLetters,
  isGenerating,
}) => {
  const [showDelegation, setShowDelegation] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);

  useEffect(() => {
    setShowDelegation(formData.delegationText.some(line => line.trim() !== ''));
  }, [formData.delegationText]);

  useEffect(() => {
    setShowDistribution(distributionType !== 'none');
  }, [distributionType]);

  const dispatchFormChange = (patch: Partial<FormData>) => {
    document.dispatchEvent(new CustomEvent('wizardFormChange', { detail: patch }));
  };

  const dispatchDistributionAction = (action: 'update' | 'add' | 'remove', payload: any) => {
    document.dispatchEvent(new CustomEvent('wizardDistributionAction', { detail: { action, payload } }));
  };

  const dispatchAction = (action: 'generate' | 'loadLetter', payload?: any) => {
    document.dispatchEvent(new CustomEvent('wizardFinalAction', { detail: { action, payload } }));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                    }}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => dispatchFormChange({ delegationText: [...formData.delegationText, ''] })}>
                Add Delegation Line
              </button>
            </div>
          )}
        </CardContent>
      </div>

      <div className="form-section">
        <div className="section-legend">
          <i className="fas fa-share-alt" style={{ marginRight: '8px' }}></i>
          Distribution Format (PCN / Copy To)
        </div>
        <CardContent>
          <div className="radio-group">
            <label>
              <input type="radio" name="showPCNDistribution" checked={showDistribution} onChange={() => { setShowDistribution(true); dispatchDistributionAction('update', { field: 'distributionType', value: 'pcn-only' }); }} /> Yes
            </label>
            <label>
              <input type="radio" name="showPCNDistribution" checked={!showDistribution} onChange={() => { setShowDistribution(false); dispatchDistributionAction('update', { field: 'distributionType', value: 'none' }); }} /> No
            </label>
          </div>

          {showDistribution && (
            <div style={{ marginTop: '1rem' }}>
              <div className="radio-group" style={{ marginBottom: '1rem' }}>
                <label>
                  <input type="radio" name="distributionType" value="pcn-only" checked={distributionType === 'pcn-only'} onChange={(e) => dispatchDistributionAction('update', { field: 'distributionType', value: e.target.value })} /> PCN Only
                </label>
                <label>
                  <input type="radio" name="distributionType" value="pcn-with-copy" checked={distributionType === 'pcn-with-copy'} onChange={(e) => dispatchDistributionAction('update', { field: 'distributionType', value: e.target.value })} /> PCN with Copy To
                </label>
              </div>

              {(distributionType === 'pcn-only' || distributionType === 'pcn-with-copy') && (
                <div className="input-group">
                  <span className="input-group-text">PCN:</span>
                  <input
                    type="text"
                    className="form-control"
                    value={pcn}
                    onChange={(e) => dispatchDistributionAction('update', { field: 'pcn', value: e.target.value })}
                    placeholder="Enter 11-digit PCN"
                    maxLength={11}
                  />
                </div>
              )}

              {distributionType === 'pcn-with-copy' && (
                <div style={{ marginTop: '1rem' }}>
                  {copyToList.map((item, index) => (
                    <div key={index} className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        value={item.code}
                        onChange={(e) => dispatchDistributionAction('update', { list: 'copyToList', index, field: 'code', value: e.target.value })}
                        placeholder="7-digit code"
                        maxLength={7}
                      />
                      <input
                        type="number"
                        className="form-control"
                        value={item.qty}
                        onChange={(e) => dispatchDistributionAction('update', { list: 'copyToList', index, field: 'qty', value: parseInt(e.target.value) || 1 })}
                        min={1}
                        max={99}
                        placeholder="Qty"
                      />
                      <button className="btn btn-danger" onClick={() => dispatchDistributionAction('remove', { list: 'copyToList', index })}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => dispatchDistributionAction('add', { list: 'copyToList' })}>
                    Add Distribution Code
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </div>

      {/* Generate Button */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          type="button"
          onClick={() => dispatchAction('generate')}
          disabled={isGenerating}
          className="generate-btn"
        >
          {isGenerating ? (
            <>
              <span style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
              }}></span>
              Generating Document...
            </>
          ) : (
            <>
              <i className="fas fa-file-download" style={{ marginRight: '8px' }}></i>
              Generate Document
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Step4Final;