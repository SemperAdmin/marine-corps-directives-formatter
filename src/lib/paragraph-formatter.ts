import { Paragraph, TextRun, TabStopType, AlignmentType } from 'docx';

interface ParagraphData {
    id: number;
    level: number;
    content: string;
    isMandatory?: boolean;
    title?: string;
}

// 1 inch = 1440 TWIPs. All values are in TWIPs.
// These specs define the tab stop positions for each level's citation
// and where the text following the citation should begin.
const NAVAL_TAB_STOPS = {
    // Level 1: "1." at 0", text at 0.25"
    1: { citation: 0, text: 360 },
    // Level 2: "a." at 0.25", text at 0.5"
    2: { citation: 360, text: 720 },
    // Level 3: "(1)" at 0.5", text at 0.75"
    3: { citation: 720, text: 1080 },
    // Level 4: "(a)" at 0.75", text at 1.0"
    4: { citation: 1080, text: 1440 },
    // Levels 5-8 continue the pattern
    5: { citation: 1440, text: 1800 },
    6: { citation: 1800, text: 2160 },
    7: { citation: 2160, text: 2520 },
    8: { citation: 2520, text: 2880 },
};

/**
 * Converts a number to Excel-style letters (1=a, 2=b... 26=z, 27=aa, 28=ab)
 */
function numberToLetter(num: number): string {
  let result = '';
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(97 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

/**
 * Generates the correct citation string (e.g., "1.", "a.", "(1)") for a given paragraph.
 * This function calculates the count based on preceding sibling paragraphs at the same level.
 */
function generateCitation(
  level: number,
  count: number,
  isCourier: boolean = false
): string {
  let citation = '';
  let indent = '';
  let spacing = '';

  // Set indentation and spacing based on level for Courier New
  if (isCourier) {
    switch (level) {
      case 1: 
        indent = '';              // 0 spaces before
        citation = `${count}.`;
        spacing = '  ';           // 2 spaces after period
        break;
      case 2: 
        indent = '    ';          // 4 spaces before
        citation = `${numberToLetter(count)}.`;
        spacing = '  ';           // 2 spaces after period
        break;
      case 3: 
        indent = '        ';      // 8 spaces before
        citation = `(${count})`;
        spacing = ' ';            // 1 space after parenthesis
        break;
      case 4: 
        indent = '            ';  // 12 spaces before
        citation = `(${numberToLetter(count)})`;
        spacing = ' ';            // 1 space after parenthesis
        break;
      case 5: 
        indent = '                ';     // 16 spaces before
        citation = `${count}.`;
        spacing = '  ';           // 2 spaces after period
        break;
      case 6: 
        indent = '                    '; // 20 spaces before
        citation = `${numberToLetter(count)}.`;
        spacing = '  ';           // 2 spaces after period
        break;
      case 7: 
        indent = '                        ';     // 24 spaces before
        citation = `(${count})`;
        spacing = ' ';            // 1 space after parenthesis
        break;
      case 8: 
        indent = '                            '; // 28 spaces before
        citation = `(${numberToLetter(count)})`;
        spacing = ' ';            // 1 space after parenthesis
        break;
      default: 
        citation = '';
        spacing = '';
    }
    return indent + citation + spacing;
  }

  // Original tab-based formatting for Times New Roman
  // Original tab-based formatting for Times New Roman
  switch (level) {
    case 1: citation = `${count}.`; break;
    case 2: citation = `${numberToLetter(count)}.`; break;
    case 3: citation = `(${count})`; break;
    case 4: citation = `(${numberToLetter(count)})`; break;
    case 5: citation = `${count}.`; break;
    case 6: citation = `${numberToLetter(count)}.`; break;
    case 7: citation = `(${count})`; break;
    case 8: citation = `(${numberToLetter(count)})`; break;
    default: citation = '';
  }

  return citation;
}


export function createFormattedParagraph(
  paragraph: ParagraphData,
  index: number,
  allParagraphs: ParagraphData[],
  bodyFont: string = 'Times New Roman'
): Paragraph {
  const { level, content, title } = paragraph;
  const isCourier = bodyFont === 'Courier New';
  
  // Calculate the count for this level
  let count = 0;
  let parentIndex = 0;
  
  if (level > 1) {
    // Find the parent and count from there
    for (let i = index - 1; i >= 0; i--) {
      if (allParagraphs[i].level < level) {
        parentIndex = i + 1;
        break;
      }
    }
  }
  
  for (let i = parentIndex; i <= index; i++) {
    if (allParagraphs[i].level === level) {
      count++;
    }
  }
  
  // Generate citation
  const citationText = generateCitation(level, count, isCourier);

  const spec = NAVAL_TAB_STOPS[level as keyof typeof NAVAL_TAB_STOPS] || NAVAL_TAB_STOPS[1];
  const isUnderlined = level >= 5;

  // Build the runs
  const runs: TextRun[] = [];

  if (!isCourier) {
    // Determine spacing after citation based on what it ends with
    const endsWithPeriod = citationText.endsWith('.');
    const spacingAfterCitation = endsWithPeriod ? '  ' : ' '; // 2 spaces for period, 1 for parenthesis
    
    // For level 2+, add tab BEFORE citation (separate from underline)
    if (level > 1) {
      runs.push(new TextRun({ text: '\t', font: bodyFont, size: 24 }));
    }
    
    // Times New Roman formatting
    if (isUnderlined) {
      if (level === 5 || level === 6) {
        // e.g., "1." or "a." - underline only the number/letter, NOT the period
        const match = citationText.match(/^(\d+|[a-z]+)(\.)$/);
        if (match) {
          runs.push(
            new TextRun({ text: match[1], font: bodyFont, size: 24, underline: {} }),
            new TextRun({ text: match[2] + spacingAfterCitation, font: bodyFont, size: 24 })
          );
        } else {
          runs.push(new TextRun({ text: citationText + spacingAfterCitation, font: bodyFont, size: 24, underline: {} }));
        }
      } else {
        // level 7 or 8: e.g., "(1)" or "(a)" - underline only the content inside parentheses
        const match = citationText.match(/^\((\d+|[a-z]+)\)$/);
        if (match) {
          runs.push(
            new TextRun({ text: '(', font: bodyFont, size: 24 }),
            new TextRun({ text: match[1], font: bodyFont, size: 24, underline: {} }),
            new TextRun({ text: ')' + spacingAfterCitation, font: bodyFont, size: 24 })
          );
        } else {
          runs.push(new TextRun({ text: citationText + spacingAfterCitation, font: bodyFont, size: 24, underline: {} }));
        }
      }
    } else {
      // No underlining for levels 1-4
      runs.push(new TextRun({ text: citationText + spacingAfterCitation, font: bodyFont, size: 24 }));
    }
  } else {
    // Courier New - spacing already in citationText
    runs.push(new TextRun({ text: citationText, font: bodyFont, size: 24 }));
  }

  // Add title if present (underlined, without period in underline)
  if (title) {
    runs.push(
      new TextRun({ 
        text: title, 
        font: bodyFont, 
        size: 24, 
        underline: {} 
      }),
      new TextRun({ 
        text: '.  ', // Period + 2 spaces
        font: bodyFont, 
        size: 24 
      })
    );
  } else if (!content.trim()) {
    // If no title and no content, just add period + 2 spaces
    runs.push(
      new TextRun({ 
        text: '.  ', 
        font: bodyFont, 
        size: 24 
      })
    );
  }

  // Process content for underline tags
  if (content.trim()) {
    const parts = content.split(/(<u>|<\/u>)/);
    let inUnderline = false;

    for (const part of parts) {
      if (part === '<u>') {
        inUnderline = true;
      } else if (part === '</u>') {
        inUnderline = false;
      } else if (part) {
        runs.push(
          new TextRun({
            text: part,
            font: bodyFont,
            size: 24,
            underline: inUnderline ? {} : undefined
          })
        );
      }
    }
  }

  // For Courier New, don't use tab stops - spacing is in the citation text
  if (isCourier) {
    return new Paragraph({
      children: runs,
      spacing: { before: 0, after: 0 }
    });
  }

  // For Times New Roman, use tab stops (only for level 2+)
  if (level > 1) {
    return new Paragraph({
      children: runs,
      tabStops: [{ type: TabStopType.LEFT, position: spec.citation }],
      spacing: { before: 0, after: 0 }
    });
  }

  // Level 1 - no tab stops needed
  return new Paragraph({
    children: runs,
    spacing: { before: 0, after: 0 }
  });
}