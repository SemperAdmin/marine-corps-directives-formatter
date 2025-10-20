'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ParagraphData {
  id: number;
  level: number;
  content: string;
  isMandatory?: boolean;
  title?: string;
  acronymError?: string;
}

interface ReportData {
  id: string;
  title: string;
  controlSymbol: string;
  paragraphRef: string;
  exempt?: boolean;
}

interface AdminSubsections {
  recordsManagement: { show: boolean; content: string; order: number };
  privacyAct: { show: boolean; content: string; order: number };
}

// Helper to convert number to Roman numeral
const toRomanNumeral = (num: number): string => {
  const romanNumerals: { [key: number]: string } = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
  };
  return romanNumerals[num] || num.toString();
};

// Helper to format a single report line
const formatReportLine = (report: ReportData, index: number): string => {
  const romanNumeral = toRomanNumeral(index + 1);
  const controlText = report.exempt ? 'EXEMPT' : `Report Control Symbol ${report.controlSymbol}`;
  return `${romanNumeral}. ${report.title} (${controlText}), par. ${report.paragraphRef}`;
};

// Helper to determine if reports should be inline or separate page
const shouldReportsBeInline = (reports: ReportData[]): boolean => {
  return reports.length > 0 && reports.length <= 5;
};

// Helper to get specific placeholder text for paragraphs
const getParagraphPlaceholder = (paragraph: ParagraphData, documentType: string): string => {
  if (!paragraph.title) {
    return "Enter your paragraph content here... Use <u>text</u> for underlined text.";
  }

  const placeholders: { [key: string]: { [title: string]: string } } = {
    'mco': {
      'Situation': 'Enter the purpose and background for this directive. Describe what this order addresses and why it is needed.',
      'Cancellation': 'List directives being canceled. Show SSIC codes and include dates for bulletins. Only cancel directives you sponsor.',
      'Mission': 'Describe the task to be accomplished with clear, concise statements. When cancellation is included, this becomes paragraph 3.',
      'Execution': 'Provide clear statements of commander\'s intent to implement the directive. Include: (1) Commander\'s Intent and Concept of Operations, (2) Subordinate Element Missions, (3) Coordinating Instructions.',
      'Administration and Logistics': 'Describe logistics, specific responsibilities, and support requirements.',
      'Command and Signal': 'Include: a. Command - Applicability statement (e.g., "This Order is applicable to the Marine Corps Total Force"). b. Signal - "This Order is effective the date signed."'
    },
    'mcbul': {
      'Purpose': 'Enter the reason for this bulletin. This paragraph gives the purpose and must be first.',
      'Cancellation': 'List directives being canceled. Show SSIC codes and include dates for bulletins. Only cancel directives you sponsor.',
      'Background': 'Provide background information when needed to explain the context or history.',
      'Action': 'Advise organizations/commands of specific action required. Note: Actions required by bulletins are canceled when the bulletin cancels unless incorporated into another directive.',
      'Reserve Applicability': 'Enter applicability statement, e.g., "This Directive is applicable to the Marine Corps Total Force" or "This Directive is applicable to the Marine Corps Reserve."'
    }
  };

  const docPlaceholders = placeholders[documentType] || placeholders['mco'];
  return docPlaceholders[paragraph.title] || `Enter content for ${paragraph.title}...`;
};

const numberToLetter = (num: number): string => {
  let result = '';
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(97 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
};

const getUiCitation = (paragraph: ParagraphData, index: number, allParagraphs: ParagraphData[]): string => {
  const { level } = paragraph;
  const getCitationPart = (targetLevel: number, parentIndex: number) => {
    let listStartIndex = 0;
    if (targetLevel > 1) {
      for (let i = parentIndex - 1; i >= 0; i--) {
        if (allParagraphs[i].level < targetLevel) {
          listStartIndex = i + 1;
          break;
        }
      }
    }
    let count = 0;
    for (let i = listStartIndex; i <= parentIndex; i++) {
      if (allParagraphs[i].level === targetLevel) {
        count++;
      }
    }
    switch (targetLevel) {
      case 1: return `${count}.`;
      case 2: return `${numberToLetter(count)}`;
      case 3: return `(${count})`;
      case 4: return `(${numberToLetter(count)})`;
      case 5: return `${count}.`;
      case 6: return `${numberToLetter(count)}.`;
      case 7: return `(${count})`;
      case 8: return `(${numberToLetter(count)})`;
      default: return '';
    }
  };
  if (level === 1) return getCitationPart(1, index);
  if (level === 2) {
    let parentCitation = '';
    for (let i = index - 1; i >= 0; i--) {
      if (allParagraphs[i].level === 1) {
        parentCitation = getCitationPart(1, i).replace('.', '');
        break;
      }
    }
    return `${parentCitation}${getCitationPart(2, index)}`;
  }
  let citationPath = [];
  let parentLevel = level - 1;
  for (let i = index - 1; i >= 0; i--) {
    const p = allParagraphs[i];
    if (p.level === parentLevel) {
      citationPath.unshift(getCitationPart(p.level, i).replace(/[.()]/g, ''));
      parentLevel--;
      if (parentLevel === 0) break;
    }
  }
  citationPath.push(getCitationPart(level, index));
  return citationPath.join('');
};

interface Step3ContentProps {
  formData: {
    documentType: 'mco' | 'mcbul';
    startingReferenceLevel: string;
    startingEnclosureNumber: string;
  };
  references: string[];
  enclosures: string[];
  reports: ReportData[];
  paragraphs: ParagraphData[];
  adminSubsections: AdminSubsections;
  isListening: boolean;
  currentListeningParagraph: number | null;
  numberingErrors: string[];
}

export const Step3Content: React.FC<Step3ContentProps> = ({
  formData,
  references,
  enclosures,
  reports,
  paragraphs,
  adminSubsections,
  isListening,
  currentListeningParagraph,
  numberingErrors,
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

  const dispatchParagraphAction = (action: 'add' | 'remove' | 'update' | 'move' | 'clear' | 'underline' | 'voice', payload: any) => {
    document.dispatchEvent(new CustomEvent('wizardParagraphAction', { detail: { action, payload } }));
  };

  const dispatchAdminSubsectionAction = (action: 'add' | 'remove' | 'update', payload: any) => {
    document.dispatchEvent(new CustomEvent('wizardAdminSubsectionAction', { detail: { action, payload } }));
  };

  const getReferenceLetter = (index: number, startingLevel: string): string => {
    const startCharCode = startingLevel.charCodeAt(0);
    return String.fromCharCode(startCharCode + index);
  };

  const getEnclosureNumber = (index: number, startingNumber: string): number => {
    return parseInt(startingNumber, 10) + index;
  };

  const MAX_REFERENCES_WARNING = 11;
  const MAX_REFERENCES_ERROR = 13;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Optional Items Section */}
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

      {/* Body Paragraphs Section */}
      <div className="form-section">
        <div className="section-legend">
          <i className="fas fa-paragraph" style={{ marginRight: '8px' }}></i>
          Body Paragraphs
        </div>
        <div style={{ backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', color: '#1565c0' }}>
            <i className="fas fa-microphone" style={{ marginRight: '8px' }}></i> Voice Input Available
          </div>
        </div>
        {(() => {
          if (numberingErrors.length > 0) {
            return (
              <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', color: '#856404' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i> Paragraph Numbering Issues:
                </div>
                {numberingErrors.map((error, index) => <div key={index} style={{ color: '#856404' }}>• {error}</div>)}
              </div>
            );
          }
          return null;
        })()}
        {paragraphs.map((paragraph, index) => {
          const citation = getUiCitation(paragraph, index, paragraphs);
          return (
            <div key={paragraph.id} className='paragraph-container' data-level={paragraph.level}>
              <div className="paragraph-header">
                <div>
                  <span className="paragraph-level-badge">Level {paragraph.level} {citation}</span>
                  {paragraph.title && <span className="mandatory-title" style={{ marginLeft: '12px', fontWeight: 'bold' }}>{paragraph.title}</span>}
                </div>
                <div>
                  {index > 0 && <button className="btn btn-sm" onClick={() => dispatchParagraphAction('move', { direction: 'up', id: paragraph.id })}>↑</button>}
                  <button className="btn btn-sm" onClick={() => dispatchParagraphAction('move', { direction: 'down', id: paragraph.id })} disabled={index === paragraphs.length - 1}>↓</button>
                </div>
              </div>
              <textarea
                className="form-control"
                rows={4}
                placeholder={getParagraphPlaceholder(paragraph, formData.documentType)}
                value={paragraph.content}
                onChange={(e) => dispatchParagraphAction('update', { id: paragraph.id, content: e.target.value })}
                ref={(el) => { if (el) el.dataset.paragraphId = paragraph.id.toString(); }}
              />
              {paragraph.acronymError && <div className="acronym-error">{paragraph.acronymError}</div>}
              {paragraph.title === 'Administration and Logistics' && formData.documentType === 'mco' && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '12px' }}>Optional Sub-sections (MCO only):</div>
                  {!adminSubsections.recordsManagement.show && (
                    <button className="btn btn-sm btn-info" type="button" onClick={() => dispatchAdminSubsectionAction('add', { type: 'recordsManagement' })}>
                      Add Records Management
                    </button>
                  )}
                  {!adminSubsections.privacyAct.show && (
                    <button className="btn btn-sm btn-info" style={{ marginLeft: '8px' }} type="button" onClick={() => dispatchAdminSubsectionAction('add', { type: 'privacyAct' })}>
                      Add Privacy Act Statement
                    </button>
                  )}
                  {adminSubsections.recordsManagement.show && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>4a. <u>Records Management</u></div>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => dispatchAdminSubsectionAction('remove', { type: 'recordsManagement' })}>Remove</button>
                      </div>
                      <textarea
                        value={adminSubsections.recordsManagement.content}
                        onChange={(e) => dispatchAdminSubsectionAction('update', { type: 'recordsManagement', content: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                  {adminSubsections.privacyAct.show && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>4b. <u>Privacy Act Statement</u></div>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => dispatchAdminSubsectionAction('remove', { type: 'privacyAct' })}>Remove</button>
                      </div>
                      <textarea
                        value={adminSubsections.privacyAct.content}
                        onChange={(e) => dispatchAdminSubsectionAction('update', { type: 'privacyAct', content: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>
              )}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm" style={{ background: isListening && currentListeningParagraph === paragraph.id ? '#dc3545' : '#28a745', color: 'white' }} onClick={() => dispatchParagraphAction('voice', { id: paragraph.id })}>
                  <i className={`fas ${isListening && currentListeningParagraph === paragraph.id ? 'fa-stop' : 'fa-microphone'}`}></i> {isListening && currentListeningParagraph === paragraph.id ? 'Stop' : 'Voice'}
                </button>
                <button className="btn btn-sm" style={{ background: '#ffc107' }} onClick={() => dispatchParagraphAction('clear', { id: paragraph.id })} disabled={!paragraph.content.trim()}>
                  <i className="fas fa-eraser"></i> Clear
                </button>
                <button className="btn btn-sm" onClick={() => {
                  const textarea = document.querySelector(`textarea[data-paragraph-id="${paragraph.id}"]`) as HTMLTextAreaElement;
                  if (textarea) dispatchParagraphAction('underline', { id: paragraph.id, textarea });
                }}>
                  <u>U</u> Underline
                </button>
              </div>
              <div style={{ marginTop: '8px' }}>
                <button className="btn btn-smart-main btn-sm" onClick={() => dispatchParagraphAction('add', { type: 'main', afterId: paragraph.id })}>Main</button>
                {paragraph.level < 8 && <button className="btn btn-smart-sub btn-sm" onClick={() => dispatchParagraphAction('add', { type: 'sub', afterId: paragraph.id })}>Sub</button>}
                {paragraph.level > 1 && <button className="btn btn-smart-same btn-sm" onClick={() => dispatchParagraphAction('add', { type: 'same', afterId: paragraph.id })}>Same</button>}
                {paragraph.level > 2 && <button className="btn btn-smart-up btn-sm" onClick={() => dispatchParagraphAction('add', { type: 'up', afterId: paragraph.id })}>One Up</button>}
                {(!paragraph.isMandatory || paragraph.title === 'Cancellation') && paragraph.id !== 1 && (
                  <button className="btn btn-danger btn-sm" onClick={() => dispatchParagraphAction('remove', { id: paragraph.id })}>Delete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};