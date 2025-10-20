'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportData {
  id: string;
  title: string;
  controlSymbol: string;
  paragraphRef: string;
  exempt?: boolean;
}

interface Step4OptionalProps {
  formData: {
    startingReferenceLevel: string;
    startingEnclosureNumber: string;
  };
  references: string[];
  enclosures: string[];
  reports: ReportData[];
}

const toRomanNumeral = (num: number): string => {
    const romanNumerals: { [key: number]: string } = {
      1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
      6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
    };
    return romanNumerals[num] || num.toString();
  };
  
  const formatReportLine = (report: ReportData, index: number): string => {
    const romanNumeral = toRomanNumeral(index + 1);
    const controlText = report.exempt ? 'EXEMPT' : `Report Control Symbol ${report.controlSymbol}`;
    return `${romanNumeral}. ${report.title} (${controlText}), par. ${report.paragraphRef}`;
  };
  
  const shouldReportsBeInline = (reports: ReportData[]): boolean => {
    return reports.length > 0 && reports.length <= 5;
  };

export const Step4Optional: React.FC<Step4OptionalProps> = ({
  formData,
  references,
  enclosures,
  reports,
}) => {
  const [showRef, setShowRef] = useState(false);
  const [showEncl, setShowEncl] = useState(false);
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    setShowRef(references.some(r => r.trim() !== ''));
  }, [references]);

  useEffect(() => {
    setShowEncl(enclosures.some(e => e.trim() !== ''));
  }, [enclosures]);

  useEffect(() => {
    setShowReports(reports.length > 0);
  }, [reports]);

  const dispatchListAction = (list: 'references' | 'enclosures' | 'reports', action: 'add' | 'remove' | 'update', payload: any) => {
    document.dispatchEvent(new CustomEvent('wizardListAction', { detail: { list, action, payload } }));
  };

  const getReferenceLetter = (index: number, startingLevel: string): string => {
    const startCharCode = startingLevel.charCodeAt(0);
    return String.fromCharCode(startCharCode + index);
  };

  const getEnclosureNumber = (index: number, startingNumber: string): number => {
    return parseInt(startingNumber, 10) + index;
  };

  return (
    <div className="form-section">
      <div className="section-legend">
        <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i>
        Optional Items
      </div>

      {/* References */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
            References
          </CardTitle>
        </CardHeader>
        <CardContent className="radio-group">
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="radio" name="ifRef" value="yes" checked={showRef} onChange={() => setShowRef(true)} style={{ marginRight: '8px', transform: 'scale(1.25)' }} />
            <span style={{ fontSize: '1.1rem' }}>Yes</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="radio" name="ifRef" value="no" checked={!showRef} onChange={() => { setShowRef(false); dispatchListAction('references', 'update', { index: -1, value: [''] }); }} style={{ marginRight: '8px', transform: 'scale(1.25)' }} />
            <span style={{ fontSize: '1.1rem' }}>No</span>
          </label>
        </CardContent>
        {showRef && (
          <CardContent>
            {references.map((ref, index) => (
              <div key={index} className="input-group" style={{ width: '100%', display: 'flex' }}>
                <span className="input-group-text" style={{ minWidth: '60px', justifyContent: 'center', background: 'linear-gradient(135deg, #b8860b, #ffd700)', color: 'white', fontWeight: '600' }}>
                  ({getReferenceLetter(index, formData.startingReferenceLevel)})
                </span>
                <input
                  className="form-control"
                  type="text"
                  placeholder="📚 Enter reference information"
                  value={ref}
                  onChange={(e) => dispatchListAction('references', 'update', { index, value: e.target.value })}
                />
                {index === references.length - 1 ? (
                  <button className="btn btn-primary" type="button" onClick={() => dispatchListAction('references', 'add', {})}>
                    <i className="fas fa-plus" style={{ marginRight: '4px' }}></i> Add
                  </button>
                ) : (
                  <button className="btn btn-danger" type="button" onClick={() => dispatchListAction('references', 'remove', { index })}>
                    <i className="fas fa-trash" style={{ marginRight: '4px' }}></i> Remove
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Enclosures */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <i className="fas fa-paperclip" style={{ marginRight: '8px' }}></i>
            Enclosures
          </CardTitle>
        </CardHeader>
        <CardContent className="radio-group">
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="radio" name="ifEncl" value="yes" checked={showEncl} onChange={() => setShowEncl(true)} style={{ marginRight: '8px', transform: 'scale(1.25)' }} />
            <span style={{ fontSize: '1.1rem' }}>Yes</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="radio" name="ifEncl" value="no" checked={!showEncl} onChange={() => { setShowEncl(false); dispatchListAction('enclosures', 'update', { index: -1, value: [''] }); }} style={{ marginRight: '8px', transform: 'scale(1.25)' }} />
            <span style={{ fontSize: '1.1rem' }}>No</span>
          </label>
        </CardContent>
        {showEncl && (
          <CardContent>
            {enclosures.map((encl, index) => (
              <div key={index} className="input-group" style={{ width: '100%', display: 'flex' }}>
                <span className="input-group-text" style={{ backgroundColor: '#f59e0b', color: 'white', fontWeight: 'bold', minWidth: '60px', justifyContent: 'center' }}>
                  ({getEnclosureNumber(index, formData.startingEnclosureNumber)})
                </span>
                <input
                  className="form-control"
                  type="text"
                  placeholder="🔗 Enter enclosure details"
                  value={encl}
                  onChange={(e) => dispatchListAction('enclosures', 'update', { index, value: e.target.value })}
                />
                {index === enclosures.length - 1 ? (
                  <button className="btn btn-primary" type="button" onClick={() => dispatchListAction('enclosures', 'add', {})}>
                    <i className="fas fa-plus" style={{ marginRight: '4px' }}></i> Add
                  </button>
                ) : (
                  <button className="btn btn-danger" type="button" onClick={() => dispatchListAction('enclosures', 'remove', { index })}>
                    <i className="fas fa-trash" style={{ marginRight: '4px' }}></i> Remove
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Reports Required */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <i className="fas fa-file-alt" style={{ marginRight: '8px' }}></i>
            Reports Required
          </CardTitle>
        </CardHeader>
        <CardContent className="radio-group">
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="radio" name="ifReports" value="yes" checked={showReports} onChange={() => setShowReports(true)} style={{ marginRight: '8px', transform: 'scale(1.25)' }} />
            <span style={{ fontSize: '1.1rem' }}>Yes</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="radio" name="ifReports" value="no" checked={!showReports} onChange={() => { setShowReports(false); dispatchListAction('reports', 'update', { index: -1, value: [] }); }} style={{ marginRight: '8px', transform: 'scale(1.25)' }} />
            <span style={{ fontSize: '1.1rem' }}>No</span>
          </label>
        </CardContent>
        {showReports && (
          <CardContent>
            {reports.map((report, index) => (
              <div key={report.id} style={{ padding: '1rem', border: '2px solid #e5e7eb', marginBottom: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong style={{ fontSize: '1.1rem' }}>Report {toRomanNumeral(index + 1)}</strong>
                  <button onClick={() => dispatchListAction('reports', 'remove', { id: report.id })} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                <div className="input-group">
                  <span className="input-group-text">Title:</span>
                  <input className="form-control" type="text" value={report.title} onChange={(e) => dispatchListAction('reports', 'update', { id: report.id, field: 'title', value: e.target.value })} />
                </div>
                <div className="input-group">
                  <span className="input-group-text">Control Symbol:</span>
                  <input className="form-control" type="text" value={report.controlSymbol} onChange={(e) => dispatchListAction('reports', 'update', { id: report.id, field: 'controlSymbol', value: e.target.value.toUpperCase() })} disabled={report.exempt} />
                </div>
                <div className="input-group">
                  <span className="input-group-text">Paragraph Ref:</span>
                  <input className="form-control" type="text" value={report.paragraphRef} onChange={(e) => dispatchListAction('reports', 'update', { id: report.id, field: 'paragraphRef', value: e.target.value })} />
                </div>
                <label>
                  <input type="checkbox" checked={report.exempt} onChange={(e) => dispatchListAction('reports', 'update', { id: report.id, field: 'exempt', value: e.target.checked })} />
                  Mark as EXEMPT
                </label>
              </div>
            ))}
            <button className="btn btn-primary" onClick={() => dispatchListAction('reports', 'add', {})}>
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i> Add Report
            </button>
            {reports.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #3b82f6' }}>
                <strong>Preview:</strong>
                {shouldReportsBeInline(reports) ? (
                  <div style={{ fontFamily: 'monospace' }}>
                    <div style={{ fontWeight: 'bold' }}>Reports Required:</div>
                    {reports.map((report, index) => (
                      <div key={report.id} style={{ marginLeft: '2rem' }}>{formatReportLine(report, index)}</div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#dc2626', fontWeight: 'bold' }}>Reports Required: See Enclosure (2)</div>
                    <div style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>(6+ reports will generate a separate "Reports Required" page)</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};