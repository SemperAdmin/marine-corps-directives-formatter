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

interface DocumentTypeSelectorProps {
  formData: FormData;
  // NOTE: function props removed to keep props serializable for "use client" entry.
  // Parent/client code should listen for 'wizardFormChange' CustomEvents and
  // apply the partial updates to the shared form state.
}

export const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  formData
}) => {
  // Dispatch partial form updates as a serializable CustomEvent. Parent
  // client code should listen to this event and merge the patch into the
  // real form state (e.g., in a useEffect on mount).
  const dispatchFormChange = (patch: Partial<FormData>) => {
    try {
      const ev = new CustomEvent('wizardFormChange', { detail: patch });
      document.dispatchEvent(ev);
    } catch (err) {
      // noop
    }
  };

  // Lightweight local date parser/formatter to replace the removed prop.
  const parseAndFormatDateLocal = (input: string) => {
    if (!input) return '';
    // Try Date parse first
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${month} ${year}`;
    }
    // Fallback: extract MMM and YYYY
    const m = input.match(/([A-Za-z]{3,})\s*(\d{4})/);
    if (m) {
      const mon = m[1].slice(0,3);
      const yr = m[2];
      return `${mon} ${yr}`;
    }
    return input;
  };
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Section 1A: Document Type */}
      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <CardTitle style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#C8102E',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>1A</span>
            Choose Document Type
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 'normal',
              color: '#dc3545',
              marginLeft: '8px'
            }}>* Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px'
          }}>
            {/* MCO Button */}
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
                backgroundColor: formData.documentType === 'mco'
                  ? '#dc3545'
                  : 'white',
                color: formData.documentType === 'mco' ? 'white' : '#495057',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: formData.documentType === 'mco'
                  ? '0 8px 25px rgba(220, 53, 69, 0.3)'
                  : '0 2px 10px rgba(0, 0, 0, 0.1)'
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

            {/* MCBul Button */}
            <button
              type="button"
              onClick={() => dispatchFormChange({ documentType: 'mcbul', cancellationType: 'contingent' })}
              style={{
                padding: '24px',
                textAlign: 'left',
                border: formData.documentType === 'mcbul'
                  ? '3px solid #ffc107'
                  : '2px solid #dee2e6',
                borderRadius: '12px',
                backgroundColor: formData.documentType === 'mcbul'
                  ? '#ffc107'
                  : 'white',
                color: formData.documentType === 'mcbul' ? 'white' : '#495057',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: formData.documentType === 'mcbul'
                  ? '0 8px 25px rgba(255, 193, 7, 0.3)'
                  : '0 2px 10px rgba(0, 0, 0, 0.1)'
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

      {/* Section 1B: Letterhead Format */}
      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <CardTitle style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#C8102E',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>1B</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* USMC Letterhead */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              border: formData.letterheadType === 'marine-corps'
                ? '3px solid #C41E3A'
                : '2px solid #dee2e6',
              borderRadius: '10px',
              backgroundColor: formData.letterheadType === 'marine-corps'
                ? '#C41E3A'
                : 'white',
              color: formData.letterheadType === 'marine-corps' ? 'white' : '#495057',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                name="letterheadType"
                value="marine-corps"
                checked={formData.letterheadType === 'marine-corps'}
                onChange={(e) => dispatchFormChange({ letterheadType: e.target.value as 'marine-corps' | 'navy' })}
                style={{ marginRight: '12px', transform: 'scale(1.3)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  United States Marine Corps
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  3-line unit format • Black text
                </div>
              </div>
              {formData.letterheadType === 'marine-corps' && (
                <i className="fas fa-check-circle" style={{ fontSize: '1.5rem' }}></i>
              )}
            </label>

            {/* DON Letterhead */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              border: formData.letterheadType === 'navy'
                ? '3px solid #002D72'
                : '2px solid #dee2e6',
              borderRadius: '10px',
              backgroundColor: formData.letterheadType === 'navy'
                ? '#002D72'
                : 'white',
              color: formData.letterheadType === 'navy' ? 'white' : '#495057',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                name="letterheadType"
                value="navy"
                checked={formData.letterheadType === 'navy'}
                onChange={(e) => dispatchFormChange({ letterheadType: e.target.value as 'marine-corps' | 'navy' })}
                style={{ marginRight: '12px', transform: 'scale(1.3)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  Department of the Navy
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  4-line HQMC format • Blue text
                </div>
              </div>
              {formData.letterheadType === 'navy' && (
                <i className="fas fa-check-circle" style={{ fontSize: '1.5rem' }}></i>
              )}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Section 1C: Body Font */}
      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <CardTitle style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#C8102E',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>1C</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Times New Roman */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              border: formData.bodyFont === 'times'
                ? '3px solid #28a745'
                : '2px solid #dee2e6',
              borderRadius: '10px',
              backgroundColor: formData.bodyFont === 'times'
                ? '#28a745'
                : 'white',
              color: formData.bodyFont === 'times' ? 'white' : '#495057',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                name="bodyFont"
                value="times"
                checked={formData.bodyFont === 'times'}
                onChange={(e) => dispatchFormChange({ bodyFont: e.target.value as 'times' | 'courier' })}
                style={{ marginRight: '12px', transform: 'scale(1.3)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '4px',
                  fontFamily: 'Times New Roman, serif'
                }}>
                  Times New Roman
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Standard serif font • Traditional format
                </div>
              </div>
              {formData.bodyFont === 'times' && (
                <i className="fas fa-check-circle" style={{ fontSize: '1.5rem' }}></i>
              )}
            </label>

            {/* Courier New */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              border: formData.bodyFont === 'courier'
                ? '3px solid #28a745'
                : '2px solid #dee2e6',
              borderRadius: '10px',
              backgroundColor: formData.bodyFont === 'courier'
                ? '#28a745'
                : 'white',
              color: formData.bodyFont === 'courier' ? 'white' : '#495057',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                name="bodyFont"
                value="courier"
                checked={formData.bodyFont === 'courier'}
                onChange={(e) => dispatchFormChange({ bodyFont: e.target.value as 'times' | 'courier' })}
                style={{ marginRight: '12px', transform: 'scale(1.3)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '4px',
                  fontFamily: 'Courier New, monospace'
                }}>
                  Courier New
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Monospaced font • Typewriter style
                </div>
              </div>
              {formData.bodyFont === 'courier' && (
                <i className="fas fa-check-circle" style={{ fontSize: '1.5rem' }}></i>
              )}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Section 1D: MCBul Cancellation (Conditional) */}
      {formData.documentType === 'mcbul' && (
        <Card style={{ marginBottom: '24px', border: '2px solid #dc2626' }}>
          <CardHeader style={{ backgroundColor: '#fef2f2' }}>
            <CardTitle style={{ 
              fontSize: '1.25rem', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#dc2626'
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}>1D</span>
              Bulletin Cancellation Information
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 'normal',
                marginLeft: '8px'
              }}>* Required for MCBul</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cancellation Type */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                marginBottom: '12px',
                fontSize: '1rem'
              }}>
                <i className="fas fa-list-ul" style={{ marginRight: '8px' }}></i>
                Cancellation Type *
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
                    onChange={(e) => dispatchFormChange({ cancellationType: e.target.value as 'contingent' | 'fixed' })}
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
                    onChange={(e) => dispatchFormChange({ cancellationType: e.target.value as 'contingent' | 'fixed', cancellationContingency: '' })}
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

            {/* Cancellation Date */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                marginBottom: '8px',
                fontSize: '1rem'
              }}>
                <i className="fas fa-calendar" style={{ marginRight: '8px' }}></i>
                Cancellation Date *
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

            {/* Contingency Condition (Conditional) */}
            {formData.cancellationType === 'contingent' && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  fontSize: '1rem'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                  Contingency Condition *
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