'use client';

import React from 'react';

interface ParagraphData {
  id: number;
  level: number;
  content: string;
  isMandatory?: boolean;
  title?: string;
  acronymError?: string;
}

interface AdminSubsections {
  recordsManagement: { show: boolean; content: string; order: number };
  privacyAct: { show: boolean; content: string; order: number };
}

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

interface Step5BodyProps {
  formData: {
    documentType: 'mco' | 'mcbul';
  };
  paragraphs: ParagraphData[];
  adminSubsections: AdminSubsections;
  isListening: boolean;
  currentListeningParagraph: number | null;
  numberingErrors: string[];
}

export const Step5Body: React.FC<Step5BodyProps> = ({
  formData,
  paragraphs,
  adminSubsections,
  isListening,
  currentListeningParagraph,
  numberingErrors,
}) => {
  const dispatchParagraphAction = (action: 'add' | 'remove' | 'update' | 'move' | 'clear' | 'underline' | 'voice', payload: any) => {
    document.dispatchEvent(new CustomEvent('wizardParagraphAction', { detail: { action, payload } }));
  };

  return (
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
      {numberingErrors.length > 0 && (
        <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', color: '#856404' }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i> Paragraph Numbering Issues:
          </div>
          {numberingErrors.map((error, index) => <div key={index} style={{ color: '#856404' }}>• {error}</div>)}
        </div>
      )}
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
            {/* ... Admin subsections logic would go here if needed ... */}
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
  );
};