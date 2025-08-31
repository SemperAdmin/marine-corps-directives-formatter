'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
// Removed saveAs import - using manual download method for better Next.js compatibility
import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType } from 'docx';
import { UNITS } from '@/lib/units';
import { SSICS } from '@/lib/ssic';

// ===============================
// INTERFACES & TYPES
// ===============================

interface ParagraphData {
  id: number;
  level: number;
  content: string;
  acronymError?: string;
  isMandatory?: boolean;
  title?: string;
}

interface DistributionEntry {
  type: 'pcn' | 'iac' | 'manual';
  code: string;
  description: string;
  copyCount: number;
}

interface DirectiveAuthority {
  level: 'commandant' | 'assistant-commandant' | 'deputy-commandant' | 'commanding-general' | 'commanding-officer';
  title: string;
  delegated?: boolean;
  delegatedTo?: string;
}

interface FormData {
  documentType: 'mco' | 'mcbul' | 'supplement';
  
  // Essential Directive Elements
  ssic_code: string;
  consecutive_point?: number;
  revision_suffix?: string;
  sponsor_code: string;
  date_signed: string;
  designationLine?: string;
  
  supersedes?: string[];
  directiveSubType: 'policy' | 'procedural' | 'administrative' | 'operational';
  policyScope?: 'marine-corps-wide' | 'hqmc-only' | 'field-commands';
  cancellationDate?: string; // MCBul only
  parentDirective?: string; // Supplement only
  affectedSections?: string[]; // Supplement only
  issuingAuthority: string;
  securityClassification: 'unclassified' | 'fouo' | 'confidential' | 'secret';
  distributionScope: 'total-force' | 'active-duty' | 'reserves';
  reviewCycle?: 'annual' | 'biennial' | 'triennial';
  
  distributionStatement: {
    code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X';
    reason?: string;
    dateOfDetermination?: string;
    originatingCommand?: string;
  };

  // Standard fields
  startingReferenceLevel: string;
  startingEnclosureNumber: string;
  line1: string;
  line2: string;
  line3: string;
  ssic: string; // Keep for backward compatibility
  originatorCode: string; // Keep for backward compatibility
  date: string; // Keep for backward compatibility
  from: string;
  to: string;
  subj: string;
  sig: string;
  delegationText: string;
  startingPageNumber: number;
  previousPackagePageCount: number;
  savedAt: string;
  references: string[];
  enclosures: string[];
  distribution: DistributionEntry[];
  paragraphs: ParagraphData[];
}

interface SavedLetter {
  id: string;
  documentType: 'mco' | 'mcbul' | 'supplement';
  ssic_code?: string;
  consecutive_point?: number;
  revision_suffix?: string;
  sponsor_code?: string;
  date_signed?: string;
  designationLine?: string;
  directiveAuthority?: DirectiveAuthority;
  effectiveDate?: string;
  signatureDate?: string;
  reviewDate?: string;
  supersedes?: string[];
  directiveSubType?: string;
  policyScope?: string;
  cancellationDate?: string;
  parentDirective?: string;
  affectedSections?: string[];
  issuingAuthority?: string;
  securityClassification?: string;
  distributionScope?: string;
  reviewCycle?: string;
  distributionStatement?: {
    code: string;
    reason?: string;
    dateOfDetermination?: string;
    originatingCommand?: string;
  };
  startingReferenceLevel: string;
  startingEnclosureNumber: string;
  line1: string;
  line2: string;
  line3: string;
  ssic: string;
  originatorCode: string;
  date: string;
  from: string;
  to: string;
  subj: string;
  sig: string;
  delegationText: string;
  startingPageNumber: number;
  previousPackagePageCount: number;
  savedAt: string;
  references: string[];
  enclosures: string[];
  distribution: DistributionEntry[];
  paragraphs: ParagraphData[];
}

interface ValidationState {
  subj: { isValid: boolean; message: string; };
  from: { isValid: boolean; message: string; };
}

// ===============================
// CONSTANTS & DATA
// ===============================

const DISTRIBUTION_STATEMENTS = {
  A: { text: "Approved for public release; distribution is unlimited.", requiresFillIns: false },
  B: { text: "Distribution authorized to U.S. Government agencies only (fill in reason) (date of determination). Other requests for this document shall be referred to (insert originating command).", requiresFillIns: true },
  C: { text: "Distribution authorized to U.S. Government agencies and their contractors (fill in reason) (date of determination). Other requests for this document shall be referred to (insert originating command).", requiresFillIns: true },
  D: { text: "Distribution authorized to DoD and U.S. DoD contractors only (fill in reason) (date of determination). Other requests shall be referred to (insert originating command).", requiresFillIns: true },
  E: { text: "Distribution authorized to DoD only (fill in reason) (date of determination). Other requests shall be referred to (insert originating command).", requiresFillIns: true },
  F: { text: "Further dissemination only as directed by (insert originating command) (date of determination) or higher DoD authority.", requiresFillIns: true },
  X: { text: "Distribution authorized to U.S. Government agencies and private individuals or enterprises eligible to obtain export-controlled technical data in accordance with DoD Directive 5230.25 (date of determination). Controlling DoD office is (insert originating command).", requiresFillIns: true }
};

const COMMON_SPONSOR_CODES = [
  { code: 'ARDB', description: 'Manpower and Reserve Affairs' },
  { code: 'MM', description: 'Manpower Management' },
  { code: 'G-1', description: 'Personnel' },
  { code: 'MMPR', description: 'Manpower Plans and Policy' },
  { code: 'G-2', description: 'Intelligence' },
  { code: 'G-3', description: 'Operations and Training' },
  { code: 'G-4', description: 'Logistics' },
  { code: 'G-6', description: 'Communications' },
  { code: 'G-8', description: 'Programs and Resources' },
  { code: 'SJA', description: 'Staff Judge Advocate' },
  { code: 'PA', description: 'Public Affairs' },
  { code: 'IG', description: 'Inspector General' }
];

const COMMON_PCN_CODES = [
  { code: 'PCN-1', description: 'Headquarters Marine Corps' },
  { code: 'PCN-2', description: 'Marine Corps Base' },
  { code: 'PCN-3', description: 'Marine Expeditionary Force' },
  { code: 'PCN-4', description: 'Marine Division' },
  { code: 'PCN-5', description: 'Marine Aircraft Wing' },
  { code: 'PCN-6', description: 'Marine Logistics Group' },
  { code: 'PCN-7', description: 'Marine Expeditionary Unit' },
  { code: 'PCN-8', description: 'Marine Corps Recruit Depot' },
  { code: 'PCN-9', description: 'Marine Corps Air Station' },
  { code: 'PCN-10', description: 'Marine Corps Combat Development Command' }
];

const COMMON_IAC_CODES = [
  { code: 'IAC-A', description: 'All Marine Corps Activities' },
  { code: 'IAC-B', description: 'Marine Corps Bases and Stations' },
  { code: 'IAC-C', description: 'Commanding Officers' },
  { code: 'IAC-D', description: 'Division Level Commands' },
  { code: 'IAC-E', description: 'Expeditionary Units' },
  { code: 'IAC-F', description: 'Fleet Marine Force' },
  { code: 'IAC-G', description: 'Ground Combat Element' },
  { code: 'IAC-H', description: 'Headquarters Elements' }
];

// ===============================
// VALIDATION & UTILITY FUNCTIONS
// ===============================

const validateDirectiveElements = (formData: FormData): string[] => {
  const errors: string[] = [];

  if (!formData.ssic_code?.trim()) {
    errors.push('SSIC Code is required for directives');
  }

  if (!formData.sponsor_code?.trim()) {
    errors.push('Sponsor Code is required for directives');
  }

  if (!formData.date_signed) {
    errors.push('Date Signed is required for directives');
  }

  if (formData.documentType === 'mco' && !formData.consecutive_point) {
    errors.push('Consecutive Point number is required for MCOs');
  }

  if (formData.revision_suffix && !/^[A-Z]$/.test(formData.revision_suffix)) {
    errors.push('Revision suffix must be a single letter (A-Z)');
  }

  if (formData.revision_suffix && ['I', 'O', 'Q'].includes(formData.revision_suffix)) {
    errors.push('Revision suffix cannot be I, O, or Q (easily confused letters)');
  }

  return errors;
};

const generateDirectiveNumber = (formData: FormData): string => {
  const { ssic_code, consecutive_point, revision_suffix, documentType } = formData;
  
  const formatNavalDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
  };
  
  switch (documentType) {
    case 'mco': {
      let number = `MCO ${ssic_code}`;
      if (consecutive_point) {
        number += `.${consecutive_point}`;
      }
      if (revision_suffix) {
        number += revision_suffix;
      }
      return number;
    }
    case 'mcbul': {
      const dateStr = formData.date_signed ? 
        formatNavalDate(new Date(formData.date_signed)) : 
        formatNavalDate(new Date());
      return `MCBul ${ssic_code} dtd ${dateStr}`;
    }
    case 'supplement': {
      let number = `Supplement to ${formData.parentDirective || 'MCO [Parent]'}`;
      if (revision_suffix) {
        number += ` ${revision_suffix}`;
      }
      return number;
    }
    default:
      return '';
  }
};

const formatDistributionStatement = (distributionStatement: FormData['distributionStatement']): string => {
  const statement = DISTRIBUTION_STATEMENTS[distributionStatement.code];
  if (!statement) return '';
  
  let text = statement.text;
  
  if (statement.requiresFillIns) {
    if (distributionStatement.reason) {
      text = text.replace('(fill in reason)', distributionStatement.reason);
    }
    if (distributionStatement.dateOfDetermination) {
      text = text.replace('(date of determination)', distributionStatement.dateOfDetermination);
    }
    if (distributionStatement.originatingCommand) {
      text = text.replace('(insert originating command)', distributionStatement.originatingCommand);
    }
  }
  
  return text;
};

// ===============================
// MAIN COMPONENT
// ===============================

export default function MarineCorpsDirectivesPage() {
  const [formData, setFormData] = useState<FormData>({
    documentType: 'mco',
    ssic_code: '',
    consecutive_point: undefined,
    revision_suffix: '',
    sponsor_code: '',
    date_signed: '',
    designationLine: '',
    supersedes: [],
    directiveSubType: 'policy',
    policyScope: 'marine-corps-wide',
    cancellationDate: '',
    parentDirective: '',
    affectedSections: [],
    issuingAuthority: 'Commandant of the Marine Corps',
    securityClassification: 'unclassified',
    distributionScope: 'total-force',
    reviewCycle: 'annual',
    distributionStatement: {
      code: 'A',
      reason: '',
      dateOfDetermination: '',
      originatingCommand: ''
    },
    startingReferenceLevel: 'a',
    startingEnclosureNumber: '1',
    line1: '',
    line2: '',
    line3: '',
    ssic: '',
    originatorCode: '',
    date: '',
    from: 'Commandant of the Marine Corps',
    to: 'Distribution List',
    subj: '',
    sig: '',
    delegationText: '',
    startingPageNumber: 1,
    previousPackagePageCount: 0,
    savedAt: '',
    references: [],
    enclosures: [],
    distribution: [],
    paragraphs: [{ id: 1, level: 1, content: '' }]
  });

  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([
    { id: 1, level: 1, content: '' }
  ]);
  const [paragraphCounter, setParagraphCounter] = useState(1);
  const [references, setReferences] = useState<string[]>([]);
  const [enclosures, setEnclosures] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<DistributionEntry[]>([]);
  const [savedLetters, setSavedLetters] = useState<SavedLetter[]>([]);
  const [structureErrors, setStructureErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    subj: { isValid: true, message: '' },
    from: { isValid: true, message: '' }
  });

  // ===============================
  // UTILITY FUNCTIONS
  // ===============================

  const autoUppercase = (value: string) => value.toUpperCase();
  
  const numbersOnly = (value: string) => value.replace(/\D/g, '');

  const parseAndFormatDate = (dateString: string): string => {
    if (!dateString.trim()) return '';
    
    if (dateString.toLowerCase() === 'today') {
      const today = new Date();
      const day = today.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[today.getMonth()];
      const year = today.getFullYear().toString().slice(-2);
      return `${day} ${month} ${year}`;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let date: Date | null = null;

    if (/^\d{8}$/.test(dateString)) {
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1;
      const day = parseInt(dateString.substring(6, 8));
      date = new Date(year, month, day);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/');
      date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) {
      date = new Date(dateString);
    } else if (/^\d{1,2}\s+\w{3}\s+\d{2,4}$/.test(dateString)) {
      const parts = dateString.trim().split(/\s+/);
      const monthIndex = months.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
      if (monthIndex !== -1) {
        const year = parseInt(parts[2]) < 100 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
        date = new Date(year, monthIndex, parseInt(parts[0]));
      }
    } else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateString)) {
      const parts = dateString.split('/');
      date = new Date(2000 + parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }

    if (!date || isNaN(date.getTime())) {
      return dateString;
    }

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day} ${month} ${year}`;
  };

  const handleDateChange = (value: string) => {
    const formatted = parseAndFormatDate(value);
    setFormData(prev => ({ ...prev, date: formatted }));
  };

  // ===============================
  // PARAGRAPH MANAGEMENT
  // ===============================

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
        case 2: return `${String.fromCharCode(96 + count)}`;
        case 3: return `(${count})`;
        case 4: return `(${String.fromCharCode(96 + count)})`;
        case 5: return `${count}.`;
        case 6: return `${String.fromCharCode(96 + count)}.`;
        case 7: return `(${count})`;
        case 8: return `(${String.fromCharCode(96 + count)})`;
        default: return '';
      }
    };

    if (level === 1) {
      return getCitationPart(1, index);
    }
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

  const validateParagraphStructure = () => {
    const errors: string[] = [];
    const structure: { [key: number]: ParagraphData[] } = {};
    
    paragraphs.forEach((paragraph) => {
      if (paragraph.content.trim()) {
        if (!structure[paragraph.level]) {
          structure[paragraph.level] = [];
        }
        structure[paragraph.level].push(paragraph);
      }
    });

    Object.keys(structure).forEach(level => {
      const levelNum = parseInt(level);
      const levelParagraphs = structure[levelNum];
      
      if (levelParagraphs.length === 1 && levelNum > 1) {
        errors.push(`Level ${levelNum} has only one paragraph - naval format requires at least two subparagraphs`);
      }
    });

    setStructureErrors(errors);
    return errors.length === 0;
  };

  const addParagraph = (type: 'main' | 'sub' | 'same' | 'up', afterId: number) => {
    const currentParagraph = paragraphs.find(p => p.id === afterId);
    if (!currentParagraph) return;
    
    let newLevel = 1;
    switch(type) {
      case 'main': newLevel = 1; break;
      case 'same': newLevel = currentParagraph.level; break;
      case 'sub': newLevel = Math.min(currentParagraph.level + 1, 8); break;
      case 'up': newLevel = Math.max(currentParagraph.level - 1, 1); break;
    }
    
    const newCounter = paragraphCounter + 1;
    setParagraphCounter(newCounter);
    const currentIndex = paragraphs.findIndex(p => p.id === afterId);
    const newParagraphs = [...paragraphs];
    newParagraphs.splice(currentIndex + 1, 0, { id: newCounter, level: newLevel, content: '' });
    setParagraphs(newParagraphs);
    
    setTimeout(() => validateParagraphStructure(), 100);
  };

  const removeParagraph = (id: number) => {
    if (id === 1) return;
    setParagraphs(prev => prev.filter(p => p.id !== id));
    setTimeout(() => validateParagraphStructure(), 100);
  };

  const updateParagraphContent = (id: number, content: string) => {
    const cleanedContent = content
      .replace(/\u00A0/g, ' ')
      .replace(/\u2007/g, ' ')
      .replace(/\u202F/g, ' ')
      .replace(/[\r\n]/g, ' ');
      
    setParagraphs(prev => prev.map(p => p.id === id ? { ...p, content: cleanedContent } : p));
    setTimeout(() => validateParagraphStructure(), 100);
  };

  // ===============================
  // UNIT SELECTION
  // ===============================

  const unitComboboxData = UNITS.map(unit => ({
    value: `${unit.uic}-${unit.ruc}-${unit.mcc}`,
    label: `${unit.unitName} (RUC: ${unit.ruc}, MCC: ${unit.mcc})`,
    ...unit,
  }));

  const handleUnitSelect = (value: string) => {
    const selectedUnit = unitComboboxData.find(unit => unit.value === value);
    if (selectedUnit) {
      setFormData(prev => ({
        ...prev,
        line1: selectedUnit.unitName.toUpperCase(),
        line2: selectedUnit.streetAddress.toUpperCase(),
        line3: `${selectedUnit.cityState} ${selectedUnit.zip}`.toUpperCase(),
      }));
    }
  };

  const clearUnitInfo = () => {
    setFormData(prev => ({ ...prev, line1: '', line2: '', line3: '' }));
  };

  // ===============================
  // DOCUMENT GENERATION
  // ===============================

  const generateDocument = async () => {
    setIsGenerating(true);
    
    try {
      // Create filename using SSIC and Subject format (e.g., "1615.2 EXAMPLE SUBJECT.docx")
      const ssic = formData.ssic_code || formData.ssic || '';
      const subject = formData.subj || 'Document';
      
      let filename;
      if (ssic && subject) {
        // Clean the subject for filename (remove special characters but keep spaces)
        const cleanSubject = subject
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        filename = `${ssic} ${cleanSubject}.docx`;
      } else {
        // Fallback to directive number if missing SSIC or subject
        const directiveNumber = generateDirectiveNumber(formData);
        filename = `${directiveNumber.replace(/\s+/g, '_')}.docx`;
      }

      const content: Paragraph[] = [];

      // Address lines
      if (formData.line1) {
        content.push(new Paragraph({
          children: [new TextRun({ text: formData.line1, font: "Times New Roman", size: 24 })],
          alignment: AlignmentType.LEFT
        }));
      }

      if (formData.line2) {
        content.push(new Paragraph({
          children: [new TextRun({ text: formData.line2, font: "Times New Roman", size: 24 })],
          alignment: AlignmentType.LEFT
        }));
      }

      if (formData.line3) {
        content.push(new Paragraph({
          children: [new TextRun({ text: formData.line3, font: "Times New Roman", size: 24 })],
          alignment: AlignmentType.LEFT
        }));
      }

      content.push(new Paragraph({ text: "" }));

      // SSIC and directive information
      const alignmentPosition = 8280; // 5.75 inches

      content.push(new Paragraph({
        children: [new TextRun({ text: formData.ssic || "", font: "Times New Roman", size: 24 })],
        alignment: AlignmentType.LEFT,
        indent: { left: alignmentPosition }
      }));

      content.push(new Paragraph({
        children: [new TextRun({ text: formData.originatorCode || "", font: "Times New Roman", size: 24 })],
        alignment: AlignmentType.LEFT,
        indent: { left: alignmentPosition }
      }));

      content.push(new Paragraph({
        children: [new TextRun({ text: formData.date || "", font: "Times New Roman", size: 24 })],
        alignment: AlignmentType.LEFT,
        indent: { left: alignmentPosition }
      }));

      content.push(new Paragraph({ text: "" }));

      // Designation Line
      const designationText = formData.designationLine || (
        formData.documentType === 'mco' 
          ? 'MARINE CORPS ORDER'
          : formData.documentType === 'mcbul'
          ? 'MARINE CORPS BULLETIN'
          : `SUPPLEMENT TO ${formData.parentDirective || 'MCO [Parent]'}`
      );

      content.push(new Paragraph({
        children: [new TextRun({
          text: designationText.toUpperCase(),
          font: "Times New Roman",
          size: 24,
          underline: {}
        })],
        alignment: AlignmentType.LEFT
      }));

      content.push(new Paragraph({ text: "" }));

      // From/To section
      content.push(new Paragraph({
        children: [new TextRun({
          text: "From:\t" + (formData.from || "Commandant of the Marine Corps"),
          font: "Times New Roman",
          size: 24
        })],
        tabStops: [{ type: TabStopType.LEFT, position: 720 }],
      }));

      content.push(new Paragraph({
        children: [new TextRun({
          text: "To:\t" + (formData.to || "Distribution List"),
          font: "Times New Roman",
          size: 24
        })],
        tabStops: [{ type: TabStopType.LEFT, position: 720 }],
      }));

      content.push(new Paragraph({ text: "" }));

      // Subject line
      content.push(new Paragraph({
        children: [new TextRun({
          text: "Subj:\t" + (formData.subj || "").toUpperCase(),
          font: "Times New Roman",
          size: 24
        })],
        tabStops: [{ type: TabStopType.LEFT, position: 720 }],
      }));

      content.push(new Paragraph({ text: "" }));

      // References section
      if (references.some(ref => ref.trim())) {
        const nonEmptyRefs = references.filter(ref => ref.trim());
        let refLetter = formData.startingReferenceLevel;
        
        content.push(new Paragraph({
          children: [new TextRun({
            text: "Ref:\t" + `(${refLetter})\t${nonEmptyRefs[0]}`,
            font: "Times New Roman",
            size: 24
          })],
          tabStops: [
            { type: TabStopType.LEFT, position: 720 },
            { type: TabStopType.LEFT, position: 1046 }
          ]
        }));

        for (let i = 1; i < nonEmptyRefs.length; i++) {
          refLetter = String.fromCharCode(refLetter.charCodeAt(0) + 1);
          content.push(new Paragraph({
            children: [new TextRun({
              text: `\t(${refLetter})\t${nonEmptyRefs[i]}`,
              font: "Times New Roman",
              size: 24
            })],
            tabStops: [
              { type: TabStopType.LEFT, position: 720 },
              { type: TabStopType.LEFT, position: 1046 }
            ]
          }));
        }
        content.push(new Paragraph({ text: "" }));
      }

      // Enclosures section
      if (enclosures.some(encl => encl.trim())) {
        const nonEmptyEncls = enclosures.filter(encl => encl.trim());
        let enclNumber = parseInt(formData.startingEnclosureNumber);
        
        content.push(new Paragraph({
          children: [new TextRun({
            text: "Encl:\t" + `(${enclNumber})\t${nonEmptyEncls[0]}`,
            font: "Times New Roman",
            size: 24
          })],
          tabStops: [
            { type: TabStopType.LEFT, position: 720 },
            { type: TabStopType.LEFT, position: 1046 }
          ]
        }));

        for (let i = 1; i < nonEmptyEncls.length; i++) {
          enclNumber++;
          content.push(new Paragraph({
            children: [new TextRun({
              text: `\t(${enclNumber})\t${nonEmptyEncls[i]}`,
              font: "Times New Roman",
              size: 24
            })],
            tabStops: [
              { type: TabStopType.LEFT, position: 720 },
              { type: TabStopType.LEFT, position: 1046 }
            ]
          }));
        }
        content.push(new Paragraph({ text: "" }));
      }

      // Paragraphs section
      const filledParagraphs = paragraphs.filter(p => p.content.trim());
      
      filledParagraphs.forEach((paragraph, index) => {
        const citation = getUiCitation(paragraph, paragraphs.indexOf(paragraph), paragraphs);
        const indentLevel = Math.max(0, paragraph.level - 1) * 360; // 0.25 inch per level
        
        content.push(new Paragraph({
          children: [new TextRun({
            text: `${citation}\t${paragraph.content}`,
            font: "Times New Roman",
            size: 24
          })],
          indent: { left: indentLevel },
          tabStops: [{ type: TabStopType.LEFT, position: indentLevel + 720 }]
        }));
      });

      content.push(new Paragraph({ text: "" }));

      // Signature block
      const sigLines = (formData.sig || '').split('\n').filter(line => line.trim());
      if (sigLines.length > 0) {
        sigLines.forEach(line => {
          content.push(new Paragraph({
            children: [new TextRun({
              text: line.toUpperCase(),
              font: "Times New Roman",
              size: 24
            })],
            alignment: AlignmentType.CENTER
          }));
        });
      }

      content.push(new Paragraph({ text: "" }));

      // Distribution statement
      const distStatement = formatDistributionStatement(formData.distributionStatement);
      if (distStatement) {
        content.push(new Paragraph({
          children: [new TextRun({
            text: `DISTRIBUTION STATEMENT ${formData.distributionStatement.code}: ${distStatement}`,
            font: "Times New Roman",
            size: 24
          })],
          alignment: AlignmentType.LEFT
        }));
      }

      // Create and save document
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch
                bottom: 1440, // 1 inch
                left: 1440,   // 1 inch
                right: 1440   // 1 inch
              }
            }
          },
          children: content
        }]
      });

      // Enhanced download function for reliable file downloads
      const downloadFile = (blob: Blob, filename: string) => {
        console.log('Downloading file:', filename, 'Size:', blob.size, 'bytes');
        
        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.style.display = 'none';
          a.style.position = 'absolute';
          a.style.left = '-9999px';
          document.body.appendChild(a);
          a.click();
          
          // Clean up after delay
          setTimeout(() => {
            try {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (cleanupError) {
              console.warn('Cleanup error (non-critical):', cleanupError);
            }
          }, 100);
          
          console.log('Download completed successfully');
        } catch (error) {
          console.error('Download failed:', error);
          throw new Error('Unable to download file. Please check browser settings.');
        }
      };

      const blob = await Packer.toBlob(doc);
      console.log('Document blob created, size:', blob.size, 'bytes');
      console.log('Filename:', filename);
      
      // Use our reliable download function
      downloadFile(blob, filename);

    } catch (error) {
      console.error("Error generating document:", error);
      alert("Error generating document: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ===============================
  // COMPONENT SECTIONS
  // ===============================

  const ReferencesSection = ({ references, setReferences }: { references: string[], setReferences: (refs: string[]) => void }) => {
    const [showRef, setShowRef] = useState(false);

    useEffect(() => {
      setShowRef(references.some(r => r.trim() !== ''));
    }, [references]);

    const addItem = () => setReferences([...references, '']);
    const removeItem = (index: number) => setReferences(references.filter((_, i) => i !== index));
    const updateItem = (index: number, value: string) => setReferences(references.map((item, i) => i === index ? value : item));

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">References</h3>
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={() => setShowRef(!showRef)}
            >
              {showRef ? 'Hide References' : 'Add References'}
            </button>
          </div>
          
          {showRef && (
            <div className="space-y-2">
              {references.map((ref, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="form-control flex-1"
                    value={ref}
                    onChange={(e) => updateItem(index, e.target.value)}
                    placeholder="Enter reference..."
                  />
                  {index === references.length - 1 ? (
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={addItem}
                    >
                      Add
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const EnclosuresSection = ({ enclosures, setEnclosures }: { enclosures: string[], setEnclosures: (encls: string[]) => void }) => {
    const [showEncl, setShowEncl] = useState(false);

    useEffect(() => {
      setShowEncl(enclosures.some(e => e.trim() !== ''));
    }, [enclosures]);

    const addItem = () => setEnclosures([...enclosures, '']);
    const removeItem = (index: number) => setEnclosures(enclosures.filter((_, i) => i !== index));
    const updateItem = (index: number, value: string) => setEnclosures(enclosures.map((item, i) => i === index ? value : item));

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Enclosures</h3>
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={() => setShowEncl(!showEncl)}
            >
              {showEncl ? 'Hide Enclosures' : 'Add Enclosures'}
            </button>
          </div>
          
          {showEncl && (
            <div className="space-y-2">
              {enclosures.map((encl, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="form-control flex-1"
                    value={encl}
                    onChange={(e) => updateItem(index, e.target.value)}
                    placeholder="Enter enclosure..."
                  />
                  {index === enclosures.length - 1 ? (
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={addItem}
                    >
                      Add
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ===============================
  // RENDER
  // ===============================

  return (
    <div>
      {/* Font Awesome CSS */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      {/* Custom CSS */}
      <style jsx>{`
        .marine-gradient-bg {
          background: linear-gradient(135deg, #000000 0%, #1C1C1C 100%);
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .main-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
          margin: 0px auto;
          padding: 30px;
          max-width: 1200px;
        }
        
        .form-section {
          background: rgba(248, 249, 250, 0.8);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 25px;
          border: 2px solid rgba(200, 16, 46, 0.1);
          backdrop-filter: blur(5px);
        }
        
        .section-legend {
          background: linear-gradient(45deg, #C8102E, #FFD700);
          color: white;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: bold;
          font-size: 1.1rem;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(200, 16, 46, 0.3);
          border: 2px solid rgba(255, 215, 0, 0.3);
        }
        
        .input-group {
          display: flex;
          align-items: stretch;
          margin-bottom: 15px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .input-group-text {
          background: linear-gradient(45deg, #C8102E, #B8001A);
          color: white;
          padding: 12px 16px;
          font-weight: 500;
          border: none;
          min-width: 200px;
          display: flex;
          align-items: center;
          border-radius: 8px 0 0 8px;
        }
        
        .form-control {
          flex: 1;
          border: 2px solid #e9ecef;
          border-radius: 0 8px 8px 0;
          padding: 12px;
          min-height: 48px;
          transition: all 0.3s ease;
          font-size: 16px;
          font-weight: 400;
        }
        
        .form-control:focus {
          border-color: #C8102E;
          box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.1);
          outline: none;
        }
        
        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #C8102E, #B8001A);
          color: white;
        }
        
        .btn-primary:hover {
          background: linear-gradient(135deg, #B8001A, #A80018);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(200, 16, 46, 0.4);
        }
        
        .btn-success {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
        }
        
        .btn-danger {
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
        }
        
        .btn-outline-secondary {
          background: white;
          border: 2px solid #dee2e6;
          color: #495057;
        }
        
        .btn-outline-secondary:hover {
          background: #f8f9fa;
          border-color: #C8102E;
          color: #C8102E;
        }
        
        .paragraph-item {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          transition: all 0.3s ease;
        }
        
        .paragraph-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .paragraph-controls {
          display: flex;
          gap: 5px;
          margin-top: 10px;
        }
        
        .paragraph-controls button {
          padding: 4px 8px;
          font-size: 12px;
          border-radius: 4px;
        }
        
        @media (max-width: 768px) {
          .main-container {
            margin: 10px;
            padding: 20px;
          }
          .input-group {
            flex-direction: column;
          }
          .input-group-text {
            border-radius: 8px 8px 0 0;
            min-width: auto;
          }
          .form-control {
            border-radius: 0 0 8px 8px;
          }
        }
      `}</style>

      <div className="marine-gradient-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="main-container">
            
            {/* Header Section */}
            <div className="form-section" style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h1 className="text-4xl font-bold text-center mb-2 text-black font-display tracking-wide">
                {
                  {
                    'mco': 'Marine Corps Order Formatter',
                    'mcbul': 'Marine Corps Bulletin Formatter',
                    'supplement': 'Marine Corps Supplement Formatter'
                  }[formData.documentType]
                }
              </h1>
              <p className="text-center text-gray-600 text-sm mb-1">by Semper Admin</p>
              <p className="text-center text-gray-600 text-sm mb-0">Last Updated: 20250121</p>
            </div>

            {/* Document Type Selector */}
            <div className="form-section">
              <div className="section-legend">
                <i className="fas fa-file-alt" style={{ marginRight: '8px' }}></i>
                Choose Directive Type
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '1rem' }}>
                
                {/* MCO Card */}
                <button
                  type="button"
                  className={`btn ${formData.documentType === 'mco' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFormData(prev => ({ ...prev, documentType: 'mco' }))}
                  style={{
                    padding: '20px',
                    height: 'auto',
                    textAlign: 'left',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
                      <i className="fas fa-file-contract" style={{ marginRight: '8px' }}></i>
                      Marine Corps Order
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      Policy directives with Marine Corps-wide applicability
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                      → Comprehensive Policy Documents
                    </div>
                  </div>
                </button>

                {/* MCBul Card */}
                <button
                  type="button"
                  className={`btn ${formData.documentType === 'mcbul' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFormData(prev => ({ ...prev, documentType: 'mcbul' }))}
                  style={{
                    padding: '20px',
                    height: 'auto',
                    textAlign: 'left',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
                      <i className="fas fa-bullhorn" style={{ marginRight: '8px' }}></i>
                      Marine Corps Bulletin
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      Temporary announcements and notifications
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                      → Short-term Communications
                    </div>
                  </div>
                </button>

                {/* Supplement Card */}
                <button
                  type="button"
                  className={`btn ${formData.documentType === 'supplement' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFormData(prev => ({ ...prev, documentType: 'supplement' }))}
                  style={{
                    padding: '20px',
                    height: 'auto',
                    textAlign: 'left',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
                      <i className="fas fa-file-plus" style={{ marginRight: '8px' }}></i>
                      Supplement
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      Modifications to existing directives
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                      → Directive Amendment
                    </div>
                  </div>
                </button>

              </div>
            </div>

            {/* Unit Information Section */}
            <div className="form-section">
              <div className="section-legend">
                <i className="fas fa-building" style={{ marginRight: '8px' }}></i>
                Unit Information
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <Combobox
                      items={unitComboboxData}
                      onSelect={handleUnitSelect}
                      placeholder="Select a Marine Corps unit..."
                      searchMessage="Search units..."
                      inputPlaceholder="Type to search units..."
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={clearUnitInfo}
                    style={{ height: '48px' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-building" style={{ marginRight: '8px' }}></i>
                  Unit Name:
                </span>
                <input 
                  className="form-control" 
                  type="text" 
                  placeholder="e.g., HEADQUARTERS UNITED STATES MARINE CORPS"
                  value={formData.line1}
                  onChange={(e) => setFormData(prev => ({ ...prev, line1: autoUppercase(e.target.value) }))}
                />
              </div>
              
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-road" style={{ marginRight: '8px' }}></i>
                  Address Line 1:
                </span>
                <input 
                  className="form-control" 
                  type="text" 
                  placeholder="e.g., 3000 MARINE CORPS PENTAGON"
                  value={formData.line2}
                  onChange={(e) => setFormData(prev => ({ ...prev, line2: autoUppercase(e.target.value) }))}
                />
              </div>
              
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-map" style={{ marginRight: '8px' }}></i>
                  Address Line 2:
                </span>
                <input 
                  className="form-control" 
                  type="text" 
                  placeholder="e.g., WASHINGTON, DC 20350-3000"
                  value={formData.line3}
                  onChange={(e) => setFormData(prev => ({ ...prev, line3: autoUppercase(e.target.value) }))}
                />
              </div>
            </div>

            {/* Directive Information Section */}
            <div className="form-section">
              <div className="section-legend">
                <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                Directive Information
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-hashtag" style={{ marginRight: '8px' }}></i>
                  SSIC Code:
                </span>
                <input 
                  className="form-control"
                  type="text" 
                  placeholder="e.g., 5215"
                  value={formData.ssic_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, ssic_code: e.target.value, ssic: e.target.value }))}
                />
              </div>

              {formData.documentType === 'mco' && (
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-sort-numeric-up" style={{ marginRight: '8px' }}></i>
                    Consecutive Point:
                  </span>
                  <input 
                    className="form-control"
                    type="number" 
                    placeholder="e.g., 1"
                    value={formData.consecutive_point || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, consecutive_point: parseInt(e.target.value) || undefined }))}
                  />
                </div>
              )}

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-code-branch" style={{ marginRight: '8px' }}></i>
                  Revision Suffix:
                </span>
                <input 
                  className="form-control"
                  type="text" 
                  maxLength={1}
                  placeholder="e.g., A, B, C..."
                  value={formData.revision_suffix || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, revision_suffix: autoUppercase(e.target.value) }))}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-user-tie" style={{ marginRight: '8px' }}></i>
                  Sponsor Code:
                </span>
                <input 
                  className="form-control"
                  type="text" 
                  placeholder="e.g., ARDB, MM, G-1..."
                  value={formData.sponsor_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, sponsor_code: autoUppercase(e.target.value), originatorCode: autoUppercase(e.target.value) }))}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-calendar" style={{ marginRight: '8px' }}></i>
                  Date Signed:
                </span>
                <input 
                  className="form-control"
                  type="text" 
                  placeholder="e.g., 8 Jul 25"
                  value={formData.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              {formData.documentType === 'supplement' && (
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-file-import" style={{ marginRight: '8px' }}></i>
                    Parent Directive:
                  </span>
                  <input 
                    className="form-control"
                    type="text" 
                    placeholder="e.g., MCO 5215.1K"
                    value={formData.parentDirective || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentDirective: autoUppercase(e.target.value) }))}
                  />
                </div>
              )}

              {formData.documentType === 'mcbul' && (
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                    Cancellation Date:
                  </span>
                  <input 
                    className="form-control"
                    type="text" 
                    placeholder="e.g., 8 Jul 26"
                    value={formData.cancellationDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cancellationDate: parseAndFormatDate(e.target.value) }))}
                  />
                </div>
              )}
            </div>

            {/* Basic Information Section */}
            <div className="form-section">
              <div className="section-legend">
                <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
                Basic Information
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-user" style={{ marginRight: '8px' }}></i>
                  From:
                </span>
                <input 
                  className="form-control" 
                  type="text" 
                  value={formData.from}
                  onChange={(e) => setFormData(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-users" style={{ marginRight: '8px' }}></i>
                  To:
                </span>
                <input 
                  className="form-control" 
                  type="text" 
                  value={formData.to}
                  onChange={(e) => setFormData(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-tag" style={{ marginRight: '8px' }}></i>
                  Subject:
                </span>
                <input 
                  className="form-control" 
                  type="text" 
                  value={formData.subj}
                  onChange={(e) => setFormData(prev => ({ ...prev, subj: e.target.value }))}
                  placeholder="Enter the subject of the directive"
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-signature" style={{ marginRight: '8px' }}></i>
                  Signature Block:
                </span>
                <textarea 
                  className="form-control" 
                  rows={3}
                  value={formData.sig}
                  onChange={(e) => setFormData(prev => ({ ...prev, sig: e.target.value }))}
                  placeholder="Enter signature block (one name per line)"
                />
              </div>
            </div>

            {/* References Section */}
            <ReferencesSection references={references} setReferences={setReferences} />

            {/* Enclosures Section */}
            <EnclosuresSection enclosures={enclosures} setEnclosures={setEnclosures} />

            {/* Paragraphs Section */}
            <div className="form-section">
              <div className="section-legend">
                <i className="fas fa-list-ol" style={{ marginRight: '8px' }}></i>
                Directive Content
              </div>

              {structureErrors.length > 0 && (
                <div style={{ background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                  <h4 style={{ color: '#856404', marginBottom: '10px' }}>⚠️ Paragraph Structure Issues:</h4>
                  <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                    {structureErrors.map((error, index) => (
                      <li key={index} style={{ color: '#856404' }}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                {paragraphs.map((paragraph, index) => (
                  <div key={paragraph.id} className="paragraph-item">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ minWidth: '60px', fontWeight: 'bold', color: '#C8102E', marginTop: '12px' }}>
                        {getUiCitation(paragraph, index, paragraphs)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={paragraph.content}
                          onChange={(e) => updateParagraphContent(paragraph.id, e.target.value)}
                          placeholder="Enter paragraph content..."
                          style={{ resize: 'vertical', minHeight: '80px' }}
                        />
                        <div className="paragraph-controls">
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => addParagraph('main', paragraph.id)}
                            title="Add Main Paragraph"
                          >
                            Main
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => addParagraph('sub', paragraph.id)}
                            title="Add Sub-paragraph"
                          >
                            Sub
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => addParagraph('same', paragraph.id)}
                            title="Add Same Level"
                          >
                            Same
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => addParagraph('up', paragraph.id)}
                            title="Add Higher Level"
                          >
                            Up
                          </button>
                          {paragraph.id !== 1 && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeParagraph(paragraph.id)}
                              title="Remove Paragraph"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribution Statement Section */}
            <div className="form-section">
              <div className="section-legend">
                <i className="fas fa-share-alt" style={{ marginRight: '8px' }}></i>
                Distribution Statement
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-code" style={{ marginRight: '8px' }}></i>
                  Statement Code:
                </span>
                <select 
                  className="form-control"
                  value={formData.distributionStatement.code}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    distributionStatement: {
                      ...prev.distributionStatement,
                      code: e.target.value as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X'
                    }
                  }))}
                >
                  <option value="A">A - Approved for public release</option>
                  <option value="B">B - U.S. Government agencies only</option>
                  <option value="C">C - U.S. Government agencies and contractors</option>
                  <option value="D">D - DoD and DoD contractors only</option>
                  <option value="E">E - DoD only</option>
                  <option value="F">F - Further dissemination as directed</option>
                  <option value="X">X - Export-controlled technical data</option>
                </select>
              </div>

              {DISTRIBUTION_STATEMENTS[formData.distributionStatement.code]?.requiresFillIns && (
                <>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-question-circle" style={{ marginRight: '8px' }}></i>
                      Reason:
                    </span>
                    <input 
                      className="form-control"
                      type="text" 
                      placeholder="Enter reason for restriction"
                      value={formData.distributionStatement.reason || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        distributionStatement: {
                          ...prev.distributionStatement,
                          reason: e.target.value
                        }
                      }))}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-calendar-check" style={{ marginRight: '8px' }}></i>
                      Date of Determination:
                    </span>
                    <input 
                      className="form-control"
                      type="text" 
                      placeholder="e.g., 8 Jul 25"
                      value={formData.distributionStatement.dateOfDetermination || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        distributionStatement: {
                          ...prev.distributionStatement,
                          dateOfDetermination: parseAndFormatDate(e.target.value)
                        }
                      }))}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-building-columns" style={{ marginRight: '8px' }}></i>
                      Originating Command:
                    </span>
                    <input 
                      className="form-control"
                      type="text" 
                      placeholder="e.g., Headquarters Marine Corps"
                      value={formData.distributionStatement.originatingCommand || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        distributionStatement: {
                          ...prev.distributionStatement,
                          originatingCommand: e.target.value
                        }
                      }))}
                    />
                  </div>
                </>
              )}

              <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <h5 style={{ marginBottom: '10px', color: '#495057' }}>Preview:</h5>
                <p style={{ marginBottom: 0, fontSize: '14px', lineHeight: '1.4' }}>
                  <strong>DISTRIBUTION STATEMENT {formData.distributionStatement.code}:</strong> {formatDistributionStatement(formData.distributionStatement)}
                </p>
              </div>
            </div>

            {/* Reference and Enclosure Settings */}
            <div className="form-section">
              <div className="section-legend">
                <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>
                Reference & Enclosure Settings
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-sort-alpha-down" style={{ marginRight: '8px' }}></i>
                  Starting Reference Level:
                </span>
                <select 
                  className="form-control"
                  value={formData.startingReferenceLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, startingReferenceLevel: e.target.value }))}
                >
                  <option value="a">a</option>
                  <option value="b">b</option>
                  <option value="c">c</option>
                  <option value="d">d</option>
                  <option value="e">e</option>
                  <option value="f">f</option>
                </select>
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-sort-numeric-down" style={{ marginRight: '8px' }}></i>
                  Starting Enclosure Number:
                </span>
                <select 
                  className="form-control"
                  value={formData.startingEnclosureNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, startingEnclosureNumber: e.target.value }))}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-file-text" style={{ marginRight: '8px' }}></i>
                  Starting Page Number:
                </span>
                <input 
                  className="form-control"
                  type="number" 
                  min="1"
                  value={formData.startingPageNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, startingPageNumber: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {/* Generate Document Button */}
            <div className="form-section" style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={generateDocument}
                disabled={isGenerating}
                style={{
                  fontSize: '18px',
                  padding: '15px 40px',
                  background: isGenerating 
                    ? 'linear-gradient(135deg, #6c757d, #5a6268)' 
                    : 'linear-gradient(135deg, #C8102E, #B8001A)',
                  cursor: isGenerating ? 'not-allowed' : 'pointer'
                }}
              >
                {isGenerating ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                    Generating Document...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-word" style={{ marginRight: '10px' }}></i>
                    Generate {formData.documentType.toUpperCase()} Document
                  </>
                )}
              </button>
              
              {validateDirectiveElements(formData).length > 0 && (
                <div style={{ marginTop: '15px', color: '#dc3545' }}>
                  <h5>Please correct the following issues:</h5>
                  <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                    {validateDirectiveElements(formData).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '15px', fontSize: '14px', color: '#6c757d' }}>
                Document will be generated as: <strong>{generateDirectiveNumber(formData) || 'Please complete required fields'}</strong>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}