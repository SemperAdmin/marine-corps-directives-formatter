'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';

// This data should be co-located with the component that uses it.
const DISTRIBUTION_STATEMENTS = {
  A: {
    code: 'A',
    text: 'DISTRIBUTION STATEMENT A: Approved for public release; distribution is unlimited.',
    requiresFillIns: false,
    description: 'Unclassified, no restrictions',
  },
  B: {
    code: 'B',
    text: 'DISTRIBUTION STATEMENT B: Distribution authorized to U.S. Government agencies only; (fill in reason) (date of determination). Other requests for this document will be referred to (insert originating command).',
    requiresFillIns: true,
    fillInFields: ['reason', 'dateOfDetermination', 'originatingCommand'],
    description: 'Restricted to US Gov agencies',
  },
  C: {
    code: 'C',
    text: 'DISTRIBUTION STATEMENT C: Distribution authorized to U.S. Government agencies and their contractors; (fill in reason) (date of determination). Other requests for this document will be referred to (insert originating command).',
    requiresFillIns: true,
    fillInFields: ['reason', 'dateOfDetermination', 'originatingCommand'],
    description: 'Extends to gov contractors',
  },
  D: {
    code: 'D',
    text: 'DISTRIBUTION STATEMENT D: Distribution authorized to DOD and DOD contractors only; (fill in reason) (date of determination). Other U.S. requests shall be referred to (insert originating command).',
    requiresFillIns: true,
    fillInFields: ['reason', 'dateOfDetermination', 'originatingCommand'],
    description: 'Limited to DoD & contractors',
  },
  E: {
    code: 'E',
    text: 'DISTRIBUTION STATEMENT E: Distribution authorized to DOD components only; (fill in reason) (date of determination). Other requests must be referred to (insert originating command).',
    requiresFillIns: true,
    fillInFields: ['reason', 'dateOfDetermination', 'originatingCommand'],
    description: 'Most restrictive unclassified',
  },
  F: {
    code: 'F',
    text: 'DISTRIBUTION STATEMENT F: Further dissemination only as directed by (insert originating command) (date of determination) or higher DOD authority.',
    requiresFillIns: true,
    fillInFields: ['originatingCommand', 'dateOfDetermination'],
    description: 'Highly controlled',
  },
  X: {
    code: 'X',
    text: 'DISTRIBUTION STATEMENT X: Distribution authorized to U.S. Government agencies and private individuals or enterprises eligible to obtain export-controlled technical data in accordance with OPNAVINST 5510.161; (date of determination). Other requests shall be referred to (originating command).',
    requiresFillIns: true,
    fillInFields: ['dateOfDetermination', 'originatingCommand'],
    description: 'Export-controlled data',
  }
};

const COMMON_RESTRICTION_REASONS = [
  'administrative/operational use',
  'contractor performance evaluation',
  'premature dissemination',
  'proprietary information',
  'test and evaluation',
  'vulnerability analysis',
  'critical technology',
  'operational security'
];

interface FormData {
  line1: string;
  line2: string;
  line3: string;
  ssic_code: string;
  sponsor_code: string;
  from: string;
  subj: string;
  distributionStatement: {
    code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X';
    reason?: string;
    dateOfDetermination?: string;
    originatingCommand?: string;
  };
}

interface Step2HeaderInfoProps {
  formData: FormData;
  unitComboboxData: any[];
}

export const Step2HeaderInfo: React.FC<Step2HeaderInfoProps> = ({
  formData,
  unitComboboxData,
}) => {
  const dispatchFormChange = (patch: Partial<FormData>) => {
    const ev = new CustomEvent('wizardFormChange', { detail: patch });
    document.dispatchEvent(ev);
  };

  const handleUnitSelect = (value: string) => {
    const selectedUnit = unitComboboxData.find(unit => unit.value === value);
    if (selectedUnit) {
      dispatchFormChange({
        line1: selectedUnit.unitName.toUpperCase(),
        line2: selectedUnit.streetAddress.toUpperCase(),
        line3: `${selectedUnit.cityState} ${selectedUnit.zip}`.toUpperCase(),
      });
    }
  };

  const clearUnitInfo = () => {
    dispatchFormChange({ line1: '', line2: '', line3: '' });
  };

  const autoUppercase = (value: string) => value.toUpperCase();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="form-section">
        <div className="section-legend">
          <i className="fas fa-sitemap" style={{ marginRight: '8px' }}></i>
          Unit Information
        </div>
        <CardContent>
          <div className="input-group">
            <span className="input-group-text">Find Unit:</span>
            <Combobox
              items={unitComboboxData}
              onSelect={handleUnitSelect}
              placeholder="Search for a unit..."
              searchMessage="No unit found."
              inputPlaceholder="Search units by name, RUC, MCC..."
            />
            <button className="btn btn-danger" type="button" onClick={clearUnitInfo}>
              Clear
            </button>
          </div>
          <div className="input-group">
            <span className="input-group-text">Unit Name:</span>
            <input
              className="form-control"
              type="text"
              value={formData.line1}
              placeholder="e.g., HEADQUARTERS, 1ST MARINE DIVISION"
              onChange={(e) => dispatchFormChange({ line1: autoUppercase(e.target.value) })}
            />
          </div>
          <div className="input-group">
            <span className="input-group-text">Address Line 1:</span>
            <input
              className="form-control"
              type="text"
              value={formData.line2}
              placeholder="e.g., BOX 5555"
              onChange={(e) => dispatchFormChange({ line2: autoUppercase(e.target.value) })}
            />
          </div>
          <div className="input-group">
            <span className="input-group-text">Address Line 2:</span>
            <input
              className="form-control"
              type="text"
              value={formData.line3}
              placeholder="e.g., CAMP PENDLETON, CA 92055-5000"
              onChange={(e) => dispatchFormChange({ line3: autoUppercase(e.target.value) })}
            />
          </div>
        </CardContent>
      </div>

      <div className="form-section">
        <div className="section-legend">
          <i className="fas fa-file-alt" style={{ marginRight: '8px' }}></i>
          Required Header Information
        </div>
        <CardContent>
          <div className="input-group">
            <span className="input-group-text">SSIC:</span>
            <input
              className="form-control"
              type="text"
              value={formData.ssic_code}
              placeholder="e.g., 5215.1K, 1000.5, 5200R.15"
              onChange={(e) => dispatchFormChange({ ssic_code: e.target.value })}
            />
          </div>
          <div className="input-group">
            <span className="input-group-text">Originator's Code:</span>
            <input
              className="form-control"
              type="text"
              value={formData.sponsor_code}
              placeholder="e.g., G-1"
              onChange={(e) => dispatchFormChange({ sponsor_code: autoUppercase(e.target.value) })}
            />
          </div>
          <div className="input-group">
            <span className="input-group-text">From:</span>
            <input
              className="form-control"
              type="text"
              value={formData.from}
              placeholder="Commanding Officer, Marine Corps Base or Secretary of the Navy"
              onChange={(e) => dispatchFormChange({ from: e.target.value })}
            />
          </div>
          <div className="input-group">
            <span className="input-group-text">Subject:</span>
            <input
              className="form-control"
              type="text"
              value={formData.subj}
              placeholder="SUBJECT LINE IN ALL CAPS"
              onChange={(e) => dispatchFormChange({ subj: autoUppercase(e.target.value) })}
            />
          </div>
          <div className="input-group">
            <span className="input-group-text">Distribution Statement:</span>
            <select
              className="form-control"
              value={formData.distributionStatement.code}
              onChange={(e) =>
                dispatchFormChange({
                  distributionStatement: {
                    code: e.target.value as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X',
                    reason: '',
                    dateOfDetermination: '',
                    originatingCommand: ''
                  },
                })
              }
            >
              {Object.entries(DISTRIBUTION_STATEMENTS).map(([key, statement]) => (
                <option key={key} value={key}>
                  Statement {key} - {statement.description}
                </option>
              ))}
            </select>
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#495057',
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '6px'
          }}>
            <strong>Full Statement:</strong><br />
            {DISTRIBUTION_STATEMENTS[formData.distributionStatement.code].text}
          </div>

          {/* Conditionally render fill-in fields */}
          {DISTRIBUTION_STATEMENTS[formData.distributionStatement.code].requiresFillIns && (
            <div style={{ marginTop: '1rem', padding: '1rem', border: '2px solid #dc3545', borderRadius: '8px', backgroundColor: '#fef2f2' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', color: '#dc3545' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                Required Fill-in Information:
              </div>

              {(DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] as any).fillInFields?.includes('reason') && (
                <div className="input-group" style={{ marginBottom: '8px' }}>
                  <span className="input-group-text">Reason for Restriction:</span>
                  <select
                    className="form-control"
                    value={formData.distributionStatement.reason || ''}
                    onChange={(e) => dispatchFormChange({
                      distributionStatement: { ...formData.distributionStatement, reason: e.target.value }
                    })}
                  >
                    <option value="">Select reason...</option>
                    {COMMON_RESTRICTION_REASONS.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                    <option value="custom">Custom reason (type below)</option>
                  </select>
                </div>
              )}

              {formData.distributionStatement.reason === 'custom' && (
                <div className="input-group" style={{ marginBottom: '8px' }}>
                  <span className="input-group-text">Custom Reason:</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter custom reason for restriction"
                    value={formData.distributionStatement.reason || ''}
                    onChange={(e) => dispatchFormChange({
                      distributionStatement: { ...formData.distributionStatement, reason: e.target.value }
                    })}
                  />
                </div>
              )}

              {(DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] as any).fillInFields?.includes('dateOfDetermination') && (
                <div className="input-group" style={{ marginBottom: '8px' }}>
                  <span className="input-group-text">Date of Determination:</span>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.distributionStatement.dateOfDetermination || ''}
                    onChange={(e) => dispatchFormChange({
                      distributionStatement: { ...formData.distributionStatement, dateOfDetermination: e.target.value }
                    })}
                  />
                </div>
              )}

              {(DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] as any).fillInFields?.includes('originatingCommand') && (
                <div className="input-group" style={{ marginBottom: '8px' }}>
                  <span className="input-group-text">Originating Command:</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Headquarters Marine Corps"
                    value={formData.distributionStatement.originatingCommand || ''}
                    onChange={(e) => dispatchFormChange({
                      distributionStatement: { ...formData.distributionStatement, originatingCommand: e.target.value }
                    })}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
};