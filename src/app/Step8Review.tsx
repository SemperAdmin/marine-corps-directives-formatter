'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ReportData {
  id: string;
  title: string;
  controlSymbol: string;
  paragraphRef: string;
  exempt?: boolean;
}

interface PreviewContent {
  letterheadType: 'marine-corps' | 'navy';
  line1: string;
  line2: string;
  line3: string;
  header: {
    ssic: string;
    originatorCode: string;
    date: string;
  };
  subject: string;
  from: string;
  paragraphs: any[];
  documentType: 'mco' | 'mcbul';
  cancellationDate?: string;
  cancellationType?: 'contingent' | 'fixed';
  bodyFont: 'times' | 'courier';
  references: string[];
  enclosures: string[];
  reports: ReportData[];
  startingReferenceLevel: string;
  startingEnclosureNumber: string;
  signature: { name: string; delegation: string[] };
  distribution: { pcn: string; copyTo: { code: string; qty: number }[]; type: string };
}

const splitTextForPreview = (str: string, chunkSize: number): string[] => {
  const chunks: string[] = [];
  if (!str) return chunks;
  let i = 0;
  while (i < str.length) {
    let chunk = str.substring(i, i + chunkSize);
    if (i + chunkSize < str.length && str[i + chunkSize] !== ' ' && chunk.includes(' ')) {
      const lastSpaceIndex = chunk.lastIndexOf(' ');
      if (lastSpaceIndex > -1) {
        chunk = chunk.substring(0, lastSpaceIndex);
        i += chunk.length + 1;
      } else {
        i += chunkSize;
      }
    } else {
      i += chunkSize;
    }
    chunks.push(chunk.trim());
  }
  return chunks;
};

const getParagraphPlaceholder = (paragraph: any, documentType: string): string => {
  if (!paragraph.title) {
    return "[Content for this paragraph has not been entered]";
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
  return docPlaceholders[paragraph.title] || `[Content for ${paragraph.title} has not been entered]`;
};

interface Step8ReviewProps {
  isGenerating: boolean;
  previewContent: PreviewContent;
}

const getReferenceLetter = (index: number, startingLevel: string): string => {
  const startCharCode = startingLevel.charCodeAt(0);
  return String.fromCharCode(startCharCode + index);
};

const getEnclosureNumber = (index: number, startingNumber: string): number => {
  return parseInt(startingNumber, 10) + index;
};

const formatCancellationDate = (date?: string): string => {
  if (!date) return '';
  try {
    const dateObj = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${month} ${year}`;
  } catch {
    return date;
  }
};

const paginateContent = (previewContent: PreviewContent) => {
  const pages: React.ReactNode[][] = [];
  let currentPageContent: React.ReactNode[] = [];
  let currentPageHeight = 0;

  const PAGE_HEIGHT_IN_PX = 864; // 9 inches of content area (11in - 1in top - 1in bottom) * 96px/in
  const LINE_HEIGHT_PX = 20; // Approx height for 12pt font with 1.2 line-height
  const MARGIN_BOTTOM_PX = 16; // Approx 1rem

  const estimateAndAddComponent = (component: React.ReactNode, estimatedHeight: number) => {
    if (currentPageHeight + estimatedHeight > PAGE_HEIGHT_IN_PX && currentPageContent.length > 0) {
      pages.push(currentPageContent);
      currentPageContent = [];
      currentPageHeight = 0;
    }
    currentPageContent.push(component);
    currentPageHeight += estimatedHeight;
  };

  // Letterhead
  estimateAndAddComponent(
    <div style={{ textAlign: 'center', marginBottom: '1rem', color: previewContent.letterheadType === 'navy' ? '#000080' : 'black' }}>
      <div style={{ fontWeight: 'bold', fontSize: '16pt' }}>{previewContent.letterheadType === 'navy' ? 'DEPARTMENT OF THE NAVY' : 'UNITED STATES MARINE CORPS'}</div>
      {previewContent.line1 && <div style={{ fontSize: '10pt' }}>{previewContent.line1}</div>}
      {previewContent.line2 && <div style={{ fontSize: '10pt' }}>{previewContent.line2}</div>}
      {previewContent.line3 && <div style={{ fontSize: '10pt' }}>{previewContent.line3}</div>}
    </div>,
    96 // Approx 1 inch
  );

  // Header Block
  estimateAndAddComponent(
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ textAlign: 'left', fontSize: '16pt', marginBottom: '1rem' }}>
        {previewContent.documentType === 'mcbul' && previewContent.cancellationDate && <div style={{ marginBottom: '1rem' }}>{previewContent.cancellationType === 'contingent' ? 'Canc frp: ' : 'Canc: '}{formatCancellationDate(previewContent.cancellationDate)}</div>}
        <div>{previewContent.header.ssic}</div>
        <div>{previewContent.header.originatorCode}</div>
        <div>{previewContent.header.date}</div>
      </div>
    </div>,
    LINE_HEIGHT_PX * 4 + MARGIN_BOTTOM_PX
  );

  // From/To/Subj Block
  const subjectLines = splitTextForPreview(previewContent.subject, 57);
  const fromToSubjHeight = (3 + subjectLines.length) * LINE_HEIGHT_PX + MARGIN_BOTTOM_PX;
  estimateAndAddComponent(
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex' }}><div style={{ fontWeight: 'bold', whiteSpace: 'pre', width: '4em' }}>From:  </div><div>{previewContent.from}</div></div>
      <div style={{ display: 'flex' }}><div style={{ fontWeight: 'bold', whiteSpace: 'pre', width: '4em' }}>To:    </div><div>Distribution List</div></div>
      <div style={{ display: 'flex' }}><div style={{ fontWeight: 'bold', whiteSpace: 'pre', width: '4em' }}>Subj:  </div><div style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{subjectLines.map((line, index) => (<div key={index}>{line}</div>))}</div></div>
    </div>,
    fromToSubjHeight
  );

  // References
  if (previewContent.references.length > 0) {
    const refComponent = (
      <div style={{ marginBottom: '1rem' }}>
        {previewContent.references.map((ref, index) => {
          const lines = splitTextForPreview(ref, 45);
          return (
            <div key={index} style={{ display: 'flex' }}>
              <div style={{ fontWeight: 'bold', whiteSpace: 'pre', width: '4em' }}>{index === 0 ? 'Ref:' : ''}</div>
              <div style={{ display: 'flex', flex: 1 }}>
                <div style={{ whiteSpace: 'pre' }}>({getReferenceLetter(index, previewContent.startingReferenceLevel)}) </div>
                <div>{lines.join('\n')}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
    const refHeight = previewContent.references.reduce((acc, ref) => acc + splitTextForPreview(ref, 45).length * LINE_HEIGHT_PX, 0) + MARGIN_BOTTOM_PX;
    estimateAndAddComponent(refComponent, refHeight);
  }

  // Enclosures
  if (previewContent.enclosures.length > 0) {
    const enclComponent = (
      <div style={{ marginBottom: '1rem' }}>
        {previewContent.enclosures.map((encl, index) => {
          const lines = splitTextForPreview(encl, 45);
          return (
            <div key={index} style={{ display: 'flex' }}>
              <div style={{ fontWeight: 'bold', whiteSpace: 'pre', width: '4em' }}>{index === 0 ? 'Encl:' : ''}</div>
              <div style={{ display: 'flex', flex: 1 }}>
                <div style={{ whiteSpace: 'pre' }}>({getEnclosureNumber(index, previewContent.startingEnclosureNumber)}) </div>
                <div>{lines.join('\n')}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
    const enclHeight = previewContent.enclosures.reduce((acc, encl) => acc + splitTextForPreview(encl, 45).length * LINE_HEIGHT_PX, 0) + MARGIN_BOTTOM_PX;
    estimateAndAddComponent(enclComponent, enclHeight);
  }

  // Body Paragraphs
  previewContent.paragraphs.forEach((para: any) => {
    const paraLines = splitTextForPreview(para.content, 50);
    const paraHeight = (paraLines.length || 1) * LINE_HEIGHT_PX + MARGIN_BOTTOM_PX;
    const paraComponent = (
      <div key={para.id} style={{ marginBottom: '1rem', paddingLeft: `${(para.level - 1) * 0.5}in` }}>
        <div style={{ whiteSpace: 'pre-wrap' }}>
          <strong style={{ marginRight: '1em' }}>{para.citation}</strong>
          {para.title && <span style={{ textDecoration: 'underline' }}>{para.title}</span>}
          {para.title && para.content.trim() && <span>. </span>}
          <span dangerouslySetInnerHTML={{ __html: para.content }} />
        </div>
      </div>
    );
    estimateAndAddComponent(paraComponent, paraHeight);
  });

  // Signature Block
  if (previewContent.signature.name) {
    const sigHeight = 96 + 48 + (1 + previewContent.signature.delegation.length) * LINE_HEIGHT_PX;
    const sigComponent = (
      <div style={{ marginTop: '3rem', textAlign: 'left', marginLeft: '3.25in' }}>
        <div style={{ height: '.2in' }}></div>
        <div>{previewContent.signature.name}</div>
        {previewContent.signature.delegation.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    );
    estimateAndAddComponent(sigComponent, sigHeight);
  }

  // Distribution
  if (previewContent.distribution.type !== 'none') {
    const distHeight = (2 + (previewContent.distribution.pcn ? 1 : 0) + (previewContent.distribution.copyTo?.length || 0)) * LINE_HEIGHT_PX;
    const distComponent = (
      <div style={{ marginTop: '2rem' }}>
        <div style={{ fontWeight: 'bold' }}>Distribution:</div>
        {previewContent.distribution.pcn && <div>PCN {previewContent.distribution.pcn}</div>}
        {previewContent.distribution.type === 'pcn-with-copy' && (
          <div>
            <div>Copy to:</div>
            {previewContent.distribution.copyTo.map((item, index) => (
              <div key={index} style={{ marginLeft: '1em' }}>
                {item.code} ({item.qty})
              </div>
            ))}
          </div>
        )}
      </div>
    );
    estimateAndAddComponent(distComponent, distHeight);
  }

  // Push the last page
  if (currentPageContent.length > 0) {
    pages.push(currentPageContent);
  }

  return pages;
};

export const Step8Review: React.FC<Step8ReviewProps> = ({ isGenerating, previewContent }) => {
  const dispatchAction = (action: 'generate') => {
    document.dispatchEvent(new CustomEvent('wizardFinalAction', { detail: { action } }));
  };

  const paginatedContent = paginateContent(previewContent);

  return (
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

      <Card style={{ marginTop: '2rem', textAlign: 'left' }}>
        <div className="section-legend">
          <i className="fas fa-eye" style={{ marginRight: '8px' }}></i>
          Document Preview
        </div>
        <CardContent style={{ display: 'flex', justifyContent: 'center', maxHeight: '80vh', overflowY: 'auto', padding: '20px', backgroundColor: '#f0f2f5' }}>
          <div>
            {paginatedContent.map((page, pageIndex) => (
              <div key={pageIndex} style={{
                backgroundColor: 'white',
                width: '8.5in',
                height: '11in',
                padding: '1in',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontFamily: previewContent.bodyFont === 'courier' ? 'Courier New, monospace' : 'Times New Roman, serif',
                fontSize: '16pt',
                lineHeight: '1.2',
                border: '1px solid #dee2e6',
                marginBottom: '20px',
                position: 'relative'
              }}>
                {page}
                <div style={{ position: 'absolute', bottom: '0.5in', left: 0, right: 0, textAlign: 'center', fontSize: '16pt' }}>
                  {pageIndex + 1}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};