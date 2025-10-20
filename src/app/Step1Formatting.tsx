'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FormData {
  documentType: 'mco' | 'mcbul';
  letterheadType: 'marine-corps' | 'navy';
  bodyFont: 'times' | 'courier';
  cancellationType?: 'contingent' | 'fixed';
  cancellationDate?: string;
  cancellationContingency?: string;
}

interface Step1FormattingProps {
  formData: FormData;
}

export const Step1Formatting: React.FC<Step1FormattingProps> = ({ formData }) => {
  const dispatchFormChange = (patch: Partial<FormData>) => {
    const ev = new CustomEvent('wizardFormChange', { detail: patch });
    document.dispatchEvent(ev);
  };

  const parseAndFormatDateLocal = (input: string) => {
    if (!input) return '';
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }
    return input;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Card style={{ marginBottom: '24px' }}>
        <div className="section-legend" style={{ marginBottom: '20px' }}>
          <i className="fas fa-paint-brush" style={{ marginRight: '8px' }}></i>
          Formatting
        </div>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 24px 20px'
        }}>
          Choose Document Type
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 'normal',
            color: '#dc3545',
            marginLeft: '8px'
          }}>* Required</span>
        </div>
        <CardContent>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px'
          }}>
            <button
              type="button"
              onClick={() => dispatchFormChange({
                documentType: 'mco',
                cancellationType: undefined,
                cancellationDate: '',
                cancellationContingency: ''
              })}
              style={{
                padding: '24px',
                textAlign: 'left',
                border: formData.documentType === 'mco'
                  ? '3px solid #dc3545'
                  : '2px solid #dee2e6',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#495057',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ fontSize: '2.5rem', minWidth: '60px' }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    Orders (MCO)
                    {formData.documentType === 'mco' && (
                      <i className="fas fa-check-circle"></i>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    opacity: 0.9,
                    marginBottom: '10px',
                    lineHeight: '1.4'
                  }}>
                    Marine Corps Order - Permanent policy directives with long-term applicability.
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                    → Permanent Policy
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => dispatchFormChange({
                documentType: 'mcbul',
                cancellationType: 'contingent'
              })}
              style={{
                padding: '24px',
                textAlign: 'left',
                border: formData.documentType === 'mcbul'
                  ? '3px solid #ffc107'
                  : '2px solid #dee2e6',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#495057',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ fontSize: '2.5rem', minWidth: '60px' }}>📢</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    Bulletins (MCBul)
                    {formData.documentType === 'mcbul' && (
                      <i className="fas fa-check-circle"></i>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    opacity: 0.9,
                    marginBottom: '10px',
                    lineHeight: '1.4'
                  }}>
                    Marine Corps Bulletin - Temporary guidance with automatic cancellation dates.
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                    → Temporary Guidance
                  </div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <CardTitle style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            alignItems: 'center',
            gap: '8px'
          }}>
            Select Letterhead Format
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 'normal',
              color: '#dc3545',
              marginLeft: '8px'
            }}>* Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <button
              type="button"
              onClick={() => dispatchFormChange({ letterheadType: 'marine-corps' })}
              style={{
                padding: '24px',
                textAlign: 'left',
                border: formData.letterheadType === 'marine-corps'
                  ? '3px solid #C41E3A'
                  : '2px solid #dee2e6',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#495057',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ fontSize: '2.5rem', minWidth: '60px' }}>🦅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    USMC Letterhead
                    {formData.letterheadType === 'marine-corps' && (
                      <i className="fas fa-check-circle"></i>
                    )}
                  </div>
                  <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '10px', lineHeight: '1.4' }}>
                    Standard 3-line format for most Marine Corps units.
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                    → Black Text
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => dispatchFormChange({ letterheadType: 'navy' })}
              style={{
                padding: '24px',
                textAlign: 'left',
                border: formData.letterheadType === 'navy'
                  ? '3px solid #002D72'
                  : '2px solid #dee2e6',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#495057',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ fontSize: '2.5rem', minWidth: '60px' }}>⚓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    DON Letterhead
                    {formData.letterheadType === 'navy' && (
                      <i className="fas fa-check-circle"></i>
                    )}
                  </div>
                  <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '10px', lineHeight: '1.4' }}>
                    4-line format for Department of the Navy and HQMC.
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                    → Blue Text
                  </div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <CardTitle style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            alignItems: 'center',
            gap: '8px'
          }}>
            Select Body Font
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 'normal',
              color: '#dc3545',
              marginLeft: '8px'
            }}>* Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <button
              type="button"
              onClick={() => dispatchFormChange({ bodyFont: 'times' })}
              style={{
                padding: '24px',
                textAlign: 'left',
                border: formData.bodyFont === 'times'
                  ? '3px solid #28a745'
                  : '2px solid #dee2e6',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#495057',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ fontSize: '2.5rem', minWidth: '60px' }}>✒️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Times New Roman
                    {formData.bodyFont === 'times' && (
                      <i className="fas fa-check-circle"></i>
                    )}
                  </div>
                  <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '10px', lineHeight: '1.4' }}>
                    Standard serif font for traditional and formal documents.
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                    → Traditional Format
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => dispatchFormChange({ bodyFont: 'courier' })}
              style={{
                padding: '24px',
                textAlign: 'left',
                border: formData.bodyFont === 'courier'
                  ? '3px solid #6f42c1'
                  : '2px solid #dee2e6',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#495057',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ fontSize: '2.5rem', minWidth: '60px' }}>⌨️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Courier New
                    {formData.bodyFont === 'courier' && (
                      <i className="fas fa-check-circle"></i>
                    )}
                  </div>
                  <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '10px', lineHeight: '1.4' }}>
                    Monospaced font for a classic, typewriter-style appearance.
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                    → Typewriter Style
                  </div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {formData.documentType === 'mcbul' && (
        <Card style={{ marginBottom: '24px' }}>
          <div className="section-legend" style={{ marginBottom: '20px' }}>
            <i className="fas fa-calendar-times" style={{ marginRight: '8px' }}></i>
            Bulletin Cancellation Information
          </div>
          <CardContent>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '12px',
                fontSize: '1rem',
                alignItems: 'center'
              }}>
                <i className="fas fa-list-ul" style={{ marginRight: '8px' }}></i>
                Cancellation Type
                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#dc3545', marginLeft: '8px' }}>* Required</span>
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: formData.cancellationType === 'contingent'
                    ? '2px solid #dc2626'
                    : '2px solid #dee2e6',
                  borderRadius: '8px',
                  backgroundColor: formData.cancellationType === 'contingent'
                    ? '#fef2f2'
                    : 'white',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="cancellationType"
                    value="contingent"
                    checked={formData.cancellationType === 'contingent'}
                    onChange={() => dispatchFormChange({ cancellationType: 'contingent' })}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Contingent (FRP)</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      For Record Purposes
                    </div>
                  </div>
                </label>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: formData.cancellationType === 'fixed'
                    ? '2px solid #dc2626'
                    : '2px solid #dee2e6',
                  borderRadius: '8px',
                  backgroundColor: formData.cancellationType === 'fixed'
                    ? '#fef2f2'
                    : 'white',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="cancellationType"
                    value="fixed"
                    checked={formData.cancellationType === 'fixed'}
                    onChange={() => dispatchFormChange({ cancellationType: 'fixed', cancellationContingency: '' })}
                    style={{ marginRight: '8px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Fixed Date</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Specific date
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                fontSize: '1rem',
                alignItems: 'center'
              }}>
                <i className="fas fa-calendar" style={{ marginRight: '8px' }}></i>
                Cancellation Date
                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#dc3545', marginLeft: '8px' }}>* Required</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., Oct 2025"
                value={formData.cancellationDate || ''}
                onChange={(e) => dispatchFormChange({ cancellationDate: parseAndFormatDateLocal(e.target.value) })}
                style={{
                  padding: '12px',
                  fontSize: '1rem',
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  width: '100%'
                }}
              />
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: '#fef3c7',
                borderLeft: '4px solid #f59e0b',
                color: '#92400e',
                fontSize: '0.875rem',
                borderRadius: '0 8px 8px 0'
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                Bulletin cancels on the <strong>last day</strong> of the specified month.
                Format: <strong>MMM YYYY</strong> (e.g., Oct 2025)
              </div>
            </div>

            {formData.cancellationType === 'contingent' && (
              <div>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  fontSize: '1rem',
                  alignItems: 'center'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                  Contingency Condition
                  <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#dc3545', marginLeft: '8px' }}>* Required</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Describe the contingency that will trigger early cancellation (e.g., This Bulletin is canceled when incorporated in MCO 5200.1)"
                  value={formData.cancellationContingency || ''}
                  onChange={(e) => dispatchFormChange({ cancellationContingency: e.target.value })}
                  style={{
                    padding: '12px',
                    fontSize: '1rem',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    width: '100%',
                    minHeight: '100px',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#dbeafe',
                  borderLeft: '4px solid #3b82f6',
                  color: '#1e40af',
                  fontSize: '0.875rem',
                  borderRadius: '0 8px 8px 0'
                }}>
                  <i className="fas fa-lightbulb" style={{ marginRight: '6px' }}></i>
                  <strong>Contingency Note:</strong> This condition allows the bulletin to be canceled early
                  once the event occurs, without waiting for the cancellation date. This text will appear
                  as the <strong>final paragraph</strong> of your bulletin.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};