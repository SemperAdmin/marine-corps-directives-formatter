'use client';

import React, { useState, useEffect } from 'react';
import { CardContent } from '@/components/ui/card';

interface CopyToItem {
  code: string;
  qty: number;
}

interface Step7DistributionProps {
  pcn: string;
  distributionType: 'pcn-only' | 'pcn-with-copy' | 'statement' | 'none';
  copyToList: CopyToItem[];
}

export const Step7Distribution: React.FC<Step7DistributionProps> = ({
  pcn,
  distributionType,
  copyToList,
}) => {
  const [showDistribution, setShowDistribution] = useState(false);

  useEffect(() => {
    setShowDistribution(distributionType !== 'none');
  }, [distributionType]);

  const dispatchDistributionAction = (action: 'update' | 'add' | 'remove', payload: any) => {
    document.dispatchEvent(new CustomEvent('wizardDistributionAction', { detail: { action, payload } }));
  };

  return (
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
  );
};