﻿
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, Header, Footer, ImageRun, convertInchesToTwip, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, PageNumber, NumberFormat } from 'docx';
// Removed saveAs import - using manual download method for better Next.js compatibility
// Import DoD seal functionality
import { createDoDSeal, getDoDSealBuffer } from '@/lib/dod-seal';

import { DOC_SETTINGS } from '@/lib/doc-settings';
import { createFormattedParagraph } from '@/lib/paragraph-formatter';
import { UNITS, Unit } from '@/lib/units';
import { SSICS } from '@/lib/ssic';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** 
 * Simple and accurate text width estimation for Times New Roman 12pt 
 * Based on actual measurements in Word documents 
 */ 
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

/** 
 * Simple and accurate text width estimation for Times New Roman 12pt 
 * Based on actual measurements in Word documents 
 */ 
const estimateTextWidth = (text: string): number => { 
  if (!text || !text.trim()) return 0; 
  
  // For Times New Roman 12pt in Word/docx: 
  // Average character width is approximately 7-8 points 
  // In twips: 7.5 points * 20 twips/point = 150 twips per character 
  // This is a conservative estimate that works well in practice 
  
  const avgCharWidthTwips = 150; // Conservative estimate 
  return text.trim().length * avgCharWidthTwips; 
}; 


/** 
 * Calculate the starting position with font support
 * Delegates to precise positioning function
 */ 
const calculateAlignmentPosition = ( 
  ssic: string, 
  originatorCode: string,
  date: string, 
  font: string = 'times',
  pageWidth: number = 12240, // 8.5 inches in twips  
  rightMargin: number = 1440   // 1 inch right margin 
): number => { 
  // Delegate to the simpler, font-aware positioning function
  return calculateSimplePosition(ssic, originatorCode, date, font);
};


  
const getPreciseAlignmentPosition = (maxCharLength: number, font: string = 'times'): number => {
  // Convert inches to twips (1 inch = 1440 twips)
  // Courier New is wider (monospaced), so needs more left shift
  
  const isCourier = font.toLowerCase().includes('courier');
  
  if (isCourier) {
    // Courier New positioning - shifted 0.5 inch right
    if (maxCharLength >= 23) {
      return 5184; // 3.6 inches (was 3.1)
    } else if (maxCharLength >= 21) {
      return 5472; // 3.8 inches (was 3.3)
    } else if (maxCharLength >= 19) {
      return 5760; // 4.0 inches (was 3.5)
    } else if (maxCharLength >= 17) {
      return 6048; // 4.2 inches (was 3.7)
    } else if (maxCharLength >= 15) {
      return 6336; // 4.4 inches (was 3.9)
    } else if (maxCharLength >= 13) {
      return 6624; // 4.6 inches (was 4.1)
    } else if (maxCharLength >= 11) {
      return 6912; // 4.8 inches (was 4.3)
    } else if (maxCharLength >= 9) {
      return 7200; // 5.0 inches (was 4.5)
    } else {
      return 7488; // 5.2 inches (was 4.7)
    }
  } else {
    // Times New Roman positioning (original)
    if (maxCharLength >= 23) {
      return 6480; // 4.5 inches - for longest content (23+ chars)
    } else if (maxCharLength >= 21) {
      return 6624; // 4.6 inches - for 21-22 chars
    } else if (maxCharLength >= 19) {
      return 6768; // 4.7 inches - for 19-20 chars 
    } else if (maxCharLength >= 17) {
      return 6912; // 4.8 inches - for 17-18 chars
    } else if (maxCharLength >= 15) {
      return 7056; // 4.9 inches - for 15-16 chars
    } else if (maxCharLength >= 13) {
      return 7200; // 5.0 inches - for 13-14 chars
    } else if (maxCharLength >= 11) {
      return 7344; // 5.1 inches - for 11-12 chars
    } else if (maxCharLength >= 9) {
      return 7488; // 5.2 inches - for 9-10 chars
    } else {
      return 7632; // 5.3 inches - for shorter content (< 9 chars)
    }
  }
};

// Use precise positioning that accounts for font type
const calculateSimplePosition = ( 
  ssic: string, 
  originatorCode: string, 
  date: string,
  font: string = 'times'
): number => { 
  // Get the character count of longest text 
  const texts = [ssic || "", originatorCode || "", date || ""] 
    .filter(text => text.trim()) 
    .map(text => text.trim()); 
  
  if (texts.length === 0) return 8280; 
  
  const maxLength = Math.max(...texts.map(text => text.length)); 
  
  // Delegate to the precise positioning function that handles fonts properly
  return getPreciseAlignmentPosition(maxLength, font);
};

// Add a helper function for header alignment (add this near the other alignment functions)
const getHeaderAlignmentPosition = (ssic: string, date: string, font: string = 'times'): number => {
  const maxLength = Math.max(ssic.length, date.length);
  return getPreciseAlignmentPosition(maxLength, font);
};

// Helper function to format MCBul cancellation date
const formatCancellationDate = (date: string): string => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${month} ${year}`;
  } catch {
    return date; // Return original if parsing fails
  }
};

// Helper function to get cancellation line position (positioned in upper right, same as SSIC)
const getCancellationLinePosition = (cancText: string, font: string = 'times'): number => {
  // Position cancellation line consistently with header block
  // Cancellation text examples: "Canc frp: Oct 2004" (~17 chars) or "Canc: Oct 2004" (~14 chars)
  const textLength = cancText.length;
  
  // Delegate to precise positioning that handles fonts properly
  return getPreciseAlignmentPosition(textLength, font);
};

// Helper function to get MCBul-specific paragraphs
const getMCBulParagraphs = (isContingent: boolean = false): ParagraphData[] => {
  const baseParagraphs = [
    {
      id: 1,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Purpose'
    },
    {
      id: 2,
      level: 1,
      content: '',
      isMandatory: true, // Display as mandatory but deletable
      title: 'Cancellation'
    },
    {
      id: 3,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Background'
    },
    {
      id: 4,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Action'
    },
    {
      id: 5,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Reserve Applicability'
    }
  ];
  
  // Add Cancellation Contingency paragraph if contingent type
  if (isContingent) {
    baseParagraphs.push({
      id: 6,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Cancellation Contingency'
    });
  }
  
  return baseParagraphs;
};

const getMCOParagraphs = (): ParagraphData[] => {
  return [
    {
      id: 1,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Situation'
    },
    {
      id: 2,
      level: 1,
      content: '',
      isMandatory: true, // Display as mandatory but deletable
      title: 'Cancellation'
    },
    {
      id: 3,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Mission'
    },
    {
      id: 4,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Execution'
    },
    {
      id: 5,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Administration and Logistics'
    },
    {
      id: 6,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Command and Signal'
    }
  ];
};



const getDefaultParagraphs = (): ParagraphData[] => {
  return [
    {
      id: 1,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Situation'
    },
    {
      id: 2,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Mission'
    },
    {
      id: 3,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Execution'
    },
    {
      id: 4,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Administration and Logistics'
    },
    {
      id: 5,
      level: 1,
      content: '',
      isMandatory: true,
      title: 'Command and Signal'
    }
  ];
};

// Helper function to get specific placeholder text for paragraphs
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

interface DocumentHeader {
  ssic_code: string;
  sponsor_code: string;
  date_signed: string;
  consecutive_point?: number;
  revision_suffix?: string;
  designationLine?: string;
}

interface ParagraphData {
  id: number;
  level: number;
  content: string;
  acronymError?: string;
  isMandatory?: boolean;
  title?: string;
}



interface FormData {
  documentType: 'mco' | 'mcbul';
  letterheadType: 'marine-corps' | 'navy';
  bodyFont: 'times' | 'courier';

  // ✅… NEW: Essential Directive Elements
  ssic_code: string; // Standard Subject Identification Code
  consecutive_point?: number; // Sequential number within SSIC group (Orders only)
  revision_suffix?: string; // Letter indicating revision (A, B, C...)
  sponsor_code: string; // Originating office identifier
  date_signed: string; // Date directive was officially signed (DD MMM YYYY)
  designationLine?: string; // ✅… ADD: New designation line field
  
  // ✅… REMOVED: Directive Authority and Dating fields
  // directiveAuthority: DirectiveAuthority;
  // effectiveDate?: string;
  // signatureDate: string;
  // reviewDate?: string;
  supersedes?: string[];
  directiveSubType: 'policy' | 'procedural' | 'administrative' | 'operational';
  policyScope?: 'marine-corps-wide' | 'hqmc-only' | 'field-commands';
  cancellationDate?: string; // MCBul only
  cancellationType?: 'contingent' | 'fixed'; // MCBul: frp (contingent) or fixed date
  cancellationContingency?: string; // MCBul: description of contingency condition
  parentDirective?: string; // Legacy field - no longer used
  affectedSections?: string[]; // Legacy field - no longer used
  issuingAuthority: string;
  securityClassification: 'unclassified' | 'fouo' | 'confidential' | 'secret';
  distributionScope: 'total-force' | 'active-duty' | 'reserves';
  reviewCycle?: 'annual' | 'biennial' | 'triennial';
  
  // ✅… NEW: Distribution Statement
  distributionStatement: {
    code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X';
    reason?: string;
    dateOfDetermination?: string;
    originatingCommand?: string;
  };

  // ✅… EXISTING: Standard fields
  startingReferenceLevel: string;
  startingEnclosureNumber: string;
  line1: string;
  line2: string;
  line3: string;
  ssic: string; // Keep for backward compatibility, will map to ssic_code
  originatorCode: string; // Keep for backward compatibility, will map to sponsor_code
  date: string; // Keep for backward compatibility, will map to date_signed
  from: string;
  to: string;
  subj: string;
  sig: string;
  delegationText: string[];
  startingPageNumber: number;
  previousPackagePageCount: number;
  savedAt: string;
  references: string[];
  enclosures: string[];
  distribution: DistributionEntry[];
  paragraphs: ParagraphData[];
  
  // ✅… ADD: Missing reference-related properties
  referenceWho: string;
  referenceType: string;
  referenceDate: string;
  basicLetterReference: string;
  
  // endorsementLevel removed — endorsements not supported in this build
}

interface SavedLetter {
  id: string;
  documentType: string;
  
  // ✅… NEW: Essential Directive Elements
  ssic_code?: string;
  consecutive_point?: number;
  revision_suffix?: string;
  sponsor_code?: string;
  date_signed?: string;
  designationLine?: string; // ✅… ADD: Missing designationLine property
  directiveAuthority?: DirectiveAuthority;
  effectiveDate?: string;
  signatureDate?: string;
  reviewDate?: string;
  supersedes?: string[];
  directiveSubType?: string;
  policyScope?: string;
  cancellationDate?: string;
  cancellationType?: string;
  cancellationContingency?: string;
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
  delegationText: string[];
  startingPageNumber: number;
  previousPackagePageCount: number;
  savedAt: string;
  references: string[];
  enclosures: string[];
  distribution: DistributionEntry[];
  paragraphs: ParagraphData[];
  basicLetterReference?: string;
}


interface ValidationState {
  subj: { isValid: boolean; message: string; };
  from: { isValid: boolean; message: string; };
}

interface DistributionEntry {
  type: 'pcn' | 'iac' | 'manual';
  code: string;
  description: string;
  copyCount: number;
}

// Add this DirectiveAuthority type definition after the existing interfaces
interface DirectiveAuthority {
  level: 'commandant' | 'assistant-commandant' | 'deputy-commandant' | 'commanding-general' | 'commanding-officer';
  title: string;
  delegated?: boolean;
  delegatedTo?: string;
}

// ✅… NEW: Directive Number Interface
interface DirectiveNumber {
  ssic: string; // 4-5 digit code
  consecutivePoint: string; // Sequential ID
  revision?: string; // A, B, C (excluding I, O, Q)
}

// ✅… NEW: Authority Matrix
const DIRECTIVE_AUTHORITY_MATRIX = {
  mco: {
    'marine-corps-wide': ['Commandant of the Marine Corps'],
    'field-commands': ['Commanding Generals', 'Commanding Officers']
  },
  mcbul: {
    'announcement': ['All authorized signers'],
    'notification': ['Appropriate command level']
  }
};

// ✅… NEW: Validation Function
// ✅… UPDATED: Enhanced validation for directive elements
const validateDirectiveElements = (formData: FormData): string[] => {
  const errors: string[] = [];

  // Required fields for all directives
  if (!formData.ssic_code?.trim()) {
    errors.push('SSIC Code is required for directives');
  }

  if (!formData.sponsor_code?.trim()) {
    errors.push('Sponsor Code is required for directives');
  }

  if (!formData.date_signed) {
    errors.push('Date Signed is required for directives');
  }

  // MCO-specific validation
  if (formData.documentType === 'mco' && !formData.consecutive_point) {
    errors.push('Consecutive Point number is required for MCOs');
  }

  // MCBul-specific validation
  if (formData.documentType === 'mcbul') {
    if (!formData.cancellationDate) {
      errors.push('Cancellation Date is required for MCBuls');
    }
    if (!formData.cancellationType) {
      errors.push('Cancellation Type (contingent or fixed) is required for MCBuls');
    }
    if (formData.cancellationType === 'contingent' && !formData.cancellationContingency?.trim()) {
      errors.push('Cancellation Contingency description is required for contingent MCBuls');
    }
  }

  // Revision suffix validation
  if (formData.revision_suffix && !/^[A-Z]$/.test(formData.revision_suffix)) {
    errors.push('Revision suffix must be a single letter (A-Z)');
  }

  // Exclude problematic letters
  if (formData.revision_suffix && ['I', 'O', 'Q'].includes(formData.revision_suffix)) {
    errors.push('Revision suffix cannot be I, O, or Q (easily confused letters)');
  }

  return errors;
};

// ✅… UPDATED: Enhanced SSIC-Based Numbering System
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
    default:
      return '';
  }
};

// ✅… NEW: Template Generation
const generateDirectiveTemplate = (type: 'mco' | 'mcbul') => {
  const templates = {
    mco: {
      requiredSections: ['situation', 'mission', 'execution', 'administration', 'command'],
      formatRequirements: { tableOfContents: true, distributionStatement: true }
    },
    mcbul: {
      requiredSections: ['purpose', 'background', 'action', 'cancellation'],
      formatRequirements: { cancellationDate: true }
    }
  };
  return templates[type];
};

// Common PCN codes for Marine Corps units
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

// Common IAC codes
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

// ✅… NEW: Common Sponsor Codes
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
  { code: 'HQMC', description: 'Headquarters Marine Corps' },
  { code: 'MCCDC', description: 'Marine Corps Combat Development Command' },
  { code: 'MCRC', description: 'Marine Corps Recruiting Command' }
];

// ✅… NEW: Validation Function for Distribution Statement
const validateDistributionStatement = (distributionStatement: FormData['distributionStatement']): string[] => {
  const errors: string[] = [];
  const statement = DISTRIBUTION_STATEMENTS[distributionStatement.code];
  
  if (statement.requiresFillIns && 'fillInFields' in statement) {
    const typedStatement = statement as typeof statement & { fillInFields: string[] };
    if (typedStatement.fillInFields?.includes('reason') && !distributionStatement.reason) {
      errors.push('Reason for restriction is required for this distribution statement');
    }
    if (typedStatement.fillInFields?.includes('dateOfDetermination') && !distributionStatement.dateOfDetermination) {
      errors.push('Date of determination is required for this distribution statement');
    }
    if (typedStatement.fillInFields?.includes('originatingCommand') && !distributionStatement.originatingCommand) {
      errors.push('Originating command is required for this distribution statement');
    }
  }
  
  return errors;
};

// Add after existing constants
const DISTRIBUTION_STATEMENTS = {
  A: {
    code: 'A',
    text: 'DISTRIBUTION STATEMENT A: Approved for public release; distribution is unlimited.',
    requiresFillIns: false,
    description: 'Unclassified information with no distribution restrictions'
  },
  B: {
    code: 'B',
    text: 'DISTRIBUTION STATEMENT B: Distribution authorized to U.S. Government agencies only; (fill in reason) (date of determination). Other requests for this document will be referred to (insert originating command).',
    requiresFillIns: true,
    fillInFields: ['reason', 'dateOfDetermination', 'originatingCommand'],
    description: 'Information restricted to US Government agencies'
  },
  C: {
    code: 'C',
    text: 'DISTRIBUTION STATEMENT C: Distribution authorized to U.S. Government agencies and their contractors; (fill in reason) (date of determination). Other requests for this document will be referred to (insert originating command).',
    requiresFillIns: true,
    fillInFields: ['reason', 'dateOfDetermination', 'originatingCommand'],
    description: 'Extends distribution to government contractors'
  },
  D: {
    code: 'D',
    text: 'DISTRIBUTION STATEMENT D: Distribution authorized to DOD and DOD contractors only; (fill in reason) (date of determination). Other U.S. requests shall be referred to (insert originating command).',
    requiresFillIns: true,
    fillInFields: ['reason', 'dateOfDetermination', 'originatingCommand'],
    description: 'Limited to Department of Defense personnel and contractors'
  },
  E: {
    code: 'E',
    text: 'DISTRIBUTION STATEMENT E: Distribution authorized to DOD components only; (fill in reason) (date of determination). Other requests must be referred to (insert originating command).',
    requiresFillIns: true,
    fillInFields: ['reason', 'dateOfDetermination', 'originatingCommand'],
    description: 'Most restrictive unclassified distribution'
  },
  F: {
    code: 'F',
    text: 'DISTRIBUTION STATEMENT F: Further dissemination only as directed by (insert originating command) (date of determination) or higher DOD authority.',
    requiresFillIns: true,
    fillInFields: ['originatingCommand', 'dateOfDetermination'],
    description: 'Highly controlled distribution'
  },
  X: {
    code: 'X',
    text: 'DISTRIBUTION STATEMENT X: Distribution authorized to U.S. Government agencies and private individuals or enterprises eligible to obtain export-controlled technical data in accordance with OPNAVINST 5510.161; (date of determination). Other requests shall be referred to (originating command).',
    requiresFillIns: true,
    fillInFields: ['dateOfDetermination', 'originatingCommand'],
    description: 'Technical data subject to export control laws'
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

// ✅… NEW: Field Command Signature Authority Rules
const FIELD_COMMAND_SIGNATURE_AUTHORITY = {
  principal_authority: {
    title: "Commanding Officer, Commanding General, or Officer in Charge",
    description: "Commanding Officer, Commanding General, or Officer in Charge",
    scope: "All directives within command authority"
  },
  delegation_requirements: {
    format: "Must be in writing",
    to_whom: "Titles, not individual names",
    redelegation: "Permitted with 'by direction' designation"
  },
  common_delegations: {
    chief_of_staff: {
      title: "Chief of Staff",
      authority: "By direction"
    },
    deputy: {
      title: "Deputy",
      authority: "By direction"
    },
    executive_officer: {
      title: "Executive Officer",
      authority: "By direction"
    },
    assistant_chief_of_staff: {
      title: "Assistant Chief of Staff",
      authority: "By direction",
      scope: "Functional area only"
    }
  }
};

// ✅… NEW: Acting Authority Designations
const ACTING_AUTHORITY_DESIGNATIONS = {
  formal_appointment: {
    requirement: "Must be formally appointed or delegated",
    signature_format: "Name followed by 'Acting'"
  },
  temporary_replacement: {
    principal_official: {
      format: "I. M. ACTING\nCommandant of the Marine Corps\nActing"
    },
    assistant_principal: {
      format: "I. M. ACTING\nAssistant Commandant\nof the Marine Corps\nActing"
    },
    deputy_commandant: {
      format: "I. M. ACTING\nDeputy Commandant for\nManpower and Reserve Affairs\nActing"
    }
  },
  field_command_acting: {
    chief_of_staff: {
      format: "I. M. ACTING\nChief of Staff\nActing"
    },
    deputy: {
      format: "I. M. ACTING\nDeputy\nActing"
    },
    executive_officer: {
      format: "I. M. ACTING\nExecutive Officer\nActing"
    }
  }
};

// ✅… NEW: Field Command Signature Block Formats
const FIELD_COMMAND_SIGNATURE_FORMATS = {
  commanding_officer: {
    name_line: "Full name in all caps or preferred format",
    title_line: "Not shown (principal official)"
  },
  by_direction: {
    chief_of_staff: {
      name_line: "I. M. CHIEF",
      title_line: "Chief of Staff\nBy direction"
    },
    deputy: {
      name_line: "I. M. DEPUTY",
      title_line: "Deputy\nBy direction"
    },
    executive_officer: {
      name_line: "I. M. EXECUTIVE",
      title_line: "Executive Officer\nBy direction"
    }
  }
};

// ✅… NEW: Helper function to generate signature block based on authority type
const generateSignatureBlock = (authorityType: string, name: string, isActing: boolean = false): { nameLine: string; titleLine: string } => {
  const formats = FIELD_COMMAND_SIGNATURE_FORMATS;
  
  if (authorityType === 'commanding_officer') {
    return {
      nameLine: name.toUpperCase(),
      titleLine: isActing ? "Acting" : ""
    };
  }
  
  if (formats.by_direction[authorityType as keyof typeof formats.by_direction]) {
    const format = formats.by_direction[authorityType as keyof typeof formats.by_direction];
    return {
      nameLine: name.toUpperCase(),
      titleLine: isActing ? format.title_line.replace('\n', '\n') + '\nActing' : format.title_line
    };
  }
  
  return {
    nameLine: name.toUpperCase(),
    titleLine: isActing ? "Acting" : ""
  };
};

// ✅… NEW: Validation function for signature authority
const validateSignatureAuthority = (signerName: string, authorityType: string, isDelegated: boolean): string[] => {
  const errors: string[] = [];
  
  if (!signerName.trim()) {
    errors.push('Signer name is required');
  }
  
  if (!authorityType) {
    errors.push('Authority type must be specified');
  }
  
  if (isDelegated && !FIELD_COMMAND_SIGNATURE_AUTHORITY.common_delegations[authorityType as keyof typeof FIELD_COMMAND_SIGNATURE_AUTHORITY.common_delegations]) {
    errors.push('Invalid delegation authority type');
  }
  
  return errors;
};

// Helper to split string into chunks without breaking words
const splitSubject = (str: string, chunkSize: number): string[] => {
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

/**
 * Creates properly formatted subject line paragraphs for Word documents
 * Handles multi-line subjects with correct indentation
 */
const createFormattedSubjectLine = (subject: string, bodyFont: string): Paragraph[] => {
  const lines = splitSubject(subject, 57);
  const paragraphs: Paragraph[] = [];
  const isCourier = bodyFont === 'Courier New';

  lines.forEach((line, index) => {
    if (index === 0) {
      // First line with "Subj:" label
      if (isCourier) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: `Subj:  ${line}`,
            font: bodyFont,
            size: 24
          })]
        }));
      } else {
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: `Subj:\t${line}`,
            font: bodyFont,
            size: 24
          })],
          tabStops: [{ type: TabStopType.LEFT, position: 720 }]
        }));
      }
    } else {
      // Continuation lines with proper indentation
      if (isCourier) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: `       ${line}`,  // 7 spaces to align with "Subj:  "
            font: bodyFont,
            size: 24
          })]
        }));
      } else {
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: `\t${line}`,
            font: bodyFont,
            size: 24
          })],
          tabStops: [{ type: TabStopType.LEFT, position: 720 }]
        }));
      }
    }
  });

  return paragraphs;
};

const createFormattedReferenceLine = (reference: string, refLetter: string, isFirst: boolean, bodyFont: string): Paragraph[] => {
  const isCourier = bodyFont === 'Courier New';
  const maxLength = isCourier ? 54 : 67;
  const lines = splitSubject(reference, maxLength);
  const paragraphs: Paragraph[] = [];

  lines.forEach((line, index) => {
    if (index === 0) {
      // First line - only show "Ref:" for the very first reference (reference "a")
      if (isCourier) {
        const text = isFirst ? `Ref:   (${refLetter}) ${line}` : `       (${refLetter}) ${line}`;
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: text,
            font: bodyFont,
            size: 24
          })]
        }));
      } else {
        const text = isFirst ? `Ref:\t(${refLetter})\t${line}` : `\t(${refLetter})\t${line}`;
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: text,
            font: bodyFont,
            size: 24
          })],
          tabStops: [
            { type: TabStopType.LEFT, position: 720 },
            { type: TabStopType.LEFT, position: 1200 }
          ]
        }));
      }
    } else {
      // Continuation lines - align with where the text started on first line
      if (isCourier) {
        // 11 spaces total: "Ref:   (a) " or "       (b) " both = 11 chars before text
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: `           ${line}`, // 11 spaces to align with text
            font: bodyFont,
            size: 24
          })]
        }));
      } else {
        // For Times New Roman: double tab reaches the text position at 1200 twips
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: `\t\t${line}`,
            font: bodyFont,
            size: 24
          })],
          tabStops: [
            { type: TabStopType.LEFT, position: 720 },
            { type: TabStopType.LEFT, position: 1200 }
          ]
        }));
      }
    }
  });

  return paragraphs;
};

// ===============================
// REFERENCE TYPE OPTIONS
// ===============================

const REFERENCE_TYPES = [
  { value: 'ltr', label: 'Letter (ltr)' },
  { value: 'msg', label: 'Message (msg)' },
  { value: 'memo', label: 'Memorandum (memo)' },
  { value: 'AA Form', label: 'Administrative Action Form (AA Form)' },
  { value: 'request', label: 'Request' },
  { value: 'report', label: 'Report' },
  { value: 'instruction', label: 'Instruction' },
  { value: 'notice', label: 'Notice' },
  { value: 'order', label: 'Order' },
  { value: 'directive', label: 'Directive' },
  // Endorsement reference type removed — endorsements not supported in this build
];

// Common "who" examples for autocomplete/suggestions
const COMMON_ORIGINATORS = [
  'Commandant of the Marine Corps',
  'Secretary of the Navy',
  'Chief of Naval Operations',
  'Commanding Officer',
  'Commanding General',
  'Director, Marine Corps Systems Command',
  'Director, Plans, Policies and Operations'
];


// ===============================
// STRUCTURED REFERENCE INPUT COMPONENT
// ===============================

interface StructuredReferenceInputProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

function StructuredReferenceInput({ formData, setFormData }: StructuredReferenceInputProps) {
  // Lightweight, well-formed StructuredReferenceInput to avoid large JSX blocks
  const updateReference = (field: 'who' | 'type' | 'date', value: string) => {
    setFormData(prev => ({ ...prev, [field === 'who' ? 'referenceWho' : field === 'type' ? 'referenceType' : 'referenceDate']: value } as any));
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Who (e.g., CO)"
          value={formData.referenceWho}
          onChange={(e) => updateReference('who', e.target.value)}
          style={{ flex: 1 }}
        />
        <input
          type="text"
          placeholder="Type (e.g., ltr)"
          value={formData.referenceType}
          onChange={(e) => updateReference('type', e.target.value)}
          style={{ width: 140 }}
        />
        <input
          type="text"
          placeholder="Date (e.g., 8 Jul 25)"
          value={formData.referenceDate}
          onChange={(e) => updateReference('date', e.target.value)}
          style={{ width: 130 }}
        />
      </div>
    </div>
  );
}


// --- New Components for References and Enclosures ---

interface ReferencesProps {
  references: string[];
  setReferences: (refs: string[]) => void;
  formData: FormData;
  setFormData: (data: FormData) => void;
}

const ReferencesSection = ({ references, setReferences, formData, setFormData }: ReferencesProps) => {
    const [showRef, setShowRef] = useState(references.some(r => r.trim() !== ''));

    useEffect(() => {
        setShowRef(references.some(r => r.trim() !== ''));
    }, [references]);

    const MAX_REFERENCES_WARNING = 11;
    const MAX_REFERENCES_ERROR = 13;

    const addItem = () => setReferences([...references, '']);
    const removeItem = (index: number) => setReferences(references.filter((_, i) => i !== index));
    const updateItem = (index: number, value: string) => setReferences(references.map((item, i) => i === index ? value : item));
    
    const getReferenceLetter = (index: number, startingLevel: string): string => {
        const startCharCode = startingLevel.charCodeAt(0);
        return String.fromCharCode(startCharCode + index);
    };

    const generateReferenceOptions = () => {
        return Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)).map(letter => ({
            value: letter,
            label: `Start with reference (${letter})`
        }));
    };

    return (
        <div className="form-section">
            <div className="section-legend">
                <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
                References
            </div>
            
            {/* Yes/No Toggle */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="ifRef"
                        value="yes"
                        checked={showRef}
                        onChange={() => setShowRef(true)}
                        style={{ marginRight: '8px', transform: 'scale(1.2)' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>Yes</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="ifRef"
                        value="no"
                        checked={!showRef}
                        onChange={() => { setShowRef(false); setReferences(['']); }}
                        style={{ marginRight: '8px', transform: 'scale(1.2)' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>No</span>
                </label>
            </div>

            {showRef && (
                <div>
                    {/* ⭐⭐⭐ ADD THIS ENTIRE SECTION HERE ⭐⭐⭐ */}
                    {(() => {
                        const nonEmptyCount = references.filter(ref => ref.trim().length > 0).length;
                        
                        if (nonEmptyCount === 0) return null;
                        
                        return (
                            <div style={{
                                padding: '16px',
                                backgroundColor: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#fee2e2' : 
                                               nonEmptyCount >= MAX_REFERENCES_WARNING ? '#fef3c7' : '#d1fae5',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                border: `3px solid ${nonEmptyCount >= MAX_REFERENCES_ERROR ? '#dc2626' : 
                                                    nonEmptyCount >= MAX_REFERENCES_WARNING ? '#fbbf24' : '#10b981'}`,
                                boxShadow: nonEmptyCount >= MAX_REFERENCES_ERROR ? '0 4px 12px rgba(220, 38, 38, 0.3)' :
                                          nonEmptyCount >= MAX_REFERENCES_WARNING ? '0 4px 12px rgba(251, 191, 36, 0.3)' :
                                          '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}>
                                {/* Header with Count */}
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: '12px' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className={`fas ${
                                            nonEmptyCount >= MAX_REFERENCES_ERROR ? 'fa-exclamation-circle' :
                                            nonEmptyCount >= MAX_REFERENCES_WARNING ? 'fa-exclamation-triangle' :
                                            'fa-check-circle'
                                        }`} style={{ 
                                            fontSize: '20px',
                                            color: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#dc2626' :
                                                   nonEmptyCount >= MAX_REFERENCES_WARNING ? '#f59e0b' :
                                                   '#10b981'
                                        }}></i>
                                        <span style={{ 
                                            fontWeight: '700', 
                                            fontSize: '18px',
                                            color: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#991b1b' :
                                                   nonEmptyCount >= MAX_REFERENCES_WARNING ? '#92400e' :
                                                   '#065f46'
                                        }}>
                                            References Used: {nonEmptyCount}/{MAX_REFERENCES_ERROR}
                                        </span>
                                    </div>
                                    
                                    <span style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        color: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#991b1b' :
                                               nonEmptyCount >= MAX_REFERENCES_WARNING ? '#92400e' :
                                               '#065f46'
                                    }}>
                                        {nonEmptyCount >= MAX_REFERENCES_ERROR ? '🚫 Maximum Reached' : 
                                         nonEmptyCount >= MAX_REFERENCES_WARNING ? '⚠️ Approaching Limit' : 
                                         '✅ Good Status'}
                                    </span>
                                </div>
                                
                                {/* Progress Bar */}
                                <div style={{ 
                                    width: '100%', 
                                    height: '12px', 
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    marginBottom: '8px',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{
                                        width: `${(nonEmptyCount / MAX_REFERENCES_ERROR) * 100}%`,
                                        height: '100%',
                                        backgroundColor: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#dc2626' : 
                                                       nonEmptyCount >= MAX_REFERENCES_WARNING ? '#fbbf24' : 
                                                       '#10b981',
                                        transition: 'all 0.3s ease',
                                        boxShadow: nonEmptyCount >= MAX_REFERENCES_ERROR ? '0 0 10px rgba(220, 38, 38, 0.5)' :
                                                  nonEmptyCount >= MAX_REFERENCES_WARNING ? '0 0 10px rgba(251, 191, 36, 0.5)' :
                                                  '0 0 10px rgba(16, 185, 129, 0.3)'
                                    }}></div>
                                </div>
                                
                                {/* Status Message */}
                                <div style={{ 
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#991b1b' :
                                           nonEmptyCount >= MAX_REFERENCES_WARNING ? '#92400e' :
                                           '#065f46',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {nonEmptyCount >= MAX_REFERENCES_ERROR ? (
                                        <>
                                            <i className="fas fa-ban"></i>
                                            <span>References at maximum capacity - may exceed ½ page limit</span>
                                        </>
                                    ) : nonEmptyCount >= MAX_REFERENCES_WARNING ? (
                                        <>
                                            <i className="fas fa-exclamation-triangle"></i>
                                            <span>Approaching ½ page limit - consider consolidating references</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check"></i>
                                            <span>References will comfortably fit on ½ page</span>
                                        </>
                  )}
                </div>
                            </div>
                        );
                    })()}
                    {/* ⭐⭐⭐ END OF PROGRESS BAR ⭐⭐⭐ */}
                    
                {showRef && (
                    <div className="space-y-4">
                        <label className="block font-semibold mb-2">
                            <i className="fas fa-bookmark mr-2"></i>
                            Enter Reference(s):
                        </label>
                        {references.map((ref, index) => (
                            <div key={index} className="input-group" style={{ width: '100%', display: 'flex' }}>
                                <span className="input-group-text" style={{ 
                                    minWidth: '60px', 
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    display: 'flex',
                                    background: 'linear-gradient(135deg, #b8860b, #ffd700)',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRadius: '8px 0 0 8px',
                                    border: '2px solid #b8860b',
                                    flexShrink: 0,
                                    textAlign: 'center'
                                }}>
                                    ({getReferenceLetter(index, formData.startingReferenceLevel)})
                                </span>
                                <input 
                                    className="form-control" 
                                    type="text" 
                                    placeholder="📚 Enter reference information (e.g., NAVADMIN 123/24, OPNAVINST 5000.1)"
                                    value={ref}
                                    onChange={(e) => updateItem(index, e.target.value)}
                                    style={{
                                        fontSize: '1rem',
                                        padding: '12px 16px',
                                        border: '2px solid #e0e0e0',
                                        borderLeft: 'none',
                                        borderRadius: '0',
                                        transition: 'all 0.3s ease',
                                        backgroundColor: '#fafafa',
                                        flex: '1',
                                        minWidth: '0'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#b8860b';
                                        e.target.style.backgroundColor = '#fff';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e0e0e0';
                                        e.target.style.backgroundColor = '#fafafa';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                {index === references.length - 1 ? (
                                    <button 
                                        className="btn btn-primary" 
                                        type="button" 
                                        onClick={addItem}
                                        style={{
                                            borderRadius: '0 8px 8px 0',
                                            flexShrink: 0,
                                            background: 'linear-gradient(135deg, #b8860b, #ffd700)',
                                            border: '2px solid #b8860b',
                                            color: 'white',
                                            fontWeight: '600',
                                            padding: '8px 16px',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #ffd700, #b8860b)';
                                            (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #b8860b, #ffd700)';
                                            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                                        Add
                                    </button>
                                ) : (
                                    <button 
                                        className="btn btn-danger" 
                                        type="button" 
                                        onClick={() => removeItem(index)}
                                        style={{
                                            borderRadius: '0 8px 8px 0',
                                            flexShrink: 0
                                        }}
                                    >
                                        <i className="fas fa-trash" style={{ marginRight: '4px' }}></i>
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}
        </div>
    );
};          
interface EnclosuresProps {
  enclosures: string[];
  setEnclosures: (encls: string[]) => void;
  formData: FormData;
  setFormData: (data: FormData) => void;
  getEnclosureNumber: (index: number, startingNumber: string) => number;
  generateEnclosureOptions: () => Array<{value: string, label: string}>;
}

const EnclosuresSection = ({ enclosures, setEnclosures, formData, setFormData, getEnclosureNumber, generateEnclosureOptions }: EnclosuresProps) => {
    // Auto-show if enclosures exist
    const [showEncl, setShowEncl] = useState(enclosures.some(e => e.trim() !== ''));

    useEffect(() => {
        setShowEncl(enclosures.some(e => e.trim() !== ''));
    }, [enclosures]);

    const addItem = () => setEnclosures([...enclosures, '']);
    const removeItem = (index: number) => setEnclosures(enclosures.filter((_, i) => i !== index));
    const updateItem = (index: number, value: string) => setEnclosures(enclosures.map((item, i) => i === index ? value : item));

    return (
        <Card className="mb-6">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg font-semibold">
                    <i className="fas fa-paperclip mr-2"></i>
                    Enclosures
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-6">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="ifEncl"
                            value="yes"
                            checked={showEncl}
                            onChange={() => setShowEncl(true)}
                            className="mr-2 scale-125"
                        />
                        <span className="text-base">Yes</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="ifEncl"
                            value="no"
                            checked={!showEncl}
                            onChange={() => { setShowEncl(false); setEnclosures(['']); }}
                            className="mr-2 scale-125"
                        />
                        <span className="text-base">No</span>
                    </label>
                </div>

                {showEncl && (
                    <div className="space-y-4">
            {/* Endorsement-specific guidance removed */}
                        
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-700 flex items-center">
                                <i className="fas fa-paperclip mr-2"></i>
                                Enter Enclosure(s):
                            </h4>
                            {enclosures.map((encl, index) => (
                                <div key={index} className="flex items-stretch rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md">
                                    <div className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white font-bold text-center min-w-[60px] border-r-2 border-yellow-700">
                                        ({getEnclosureNumber(index, formData.startingEnclosureNumber)})
                                    </div>
                                    <input 
                                        className="flex-1 px-4 py-3 border-0 focus:outline-none focus:ring-0 bg-gray-50 hover:bg-white focus:bg-white transition-colors text-gray-700 placeholder-gray-400" 
                                        type="text" 
                                        placeholder="🔗 Enter enclosure details (e.g., Training Certificate, Medical Records)"
                                        value={encl}
                                        onChange={(e) => updateItem(index, e.target.value)}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#b8860b';
                                            e.target.style.backgroundColor = '#fff';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e9ecef';
                                            e.target.style.backgroundColor = '#f8f9fa';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                    {index === enclosures.length - 1 ? (
                                        <button 
                                            className="px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white font-semibold transition-all duration-200 border-l-2 border-yellow-700 flex items-center" 
                                            type="button" 
                                            onClick={addItem}
                                            onMouseEnter={(e) => {
                                                (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #ffd700, #b8860b)';
                                                (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #b8860b, #ffd700)';
                                                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <i className="fas fa-plus mr-2"></i>
                                            Add
                                        </button>
                                    ) : (
                                        <button 
                                            className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold transition-all duration-200 border-l-2 border-red-700 flex items-center" 
                                            type="button" 
                                            onClick={() => removeItem(index)}
                                        >
                                            <i className="fas fa-trash mr-2"></i>
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function MarineCorpsDirectivesFormatter() {
  // Add this helper function near the top of your component
  const getDistributionStatementFillInFields = (code: string): string[] => {
    const statement = DISTRIBUTION_STATEMENTS[code as keyof typeof DISTRIBUTION_STATEMENTS];
    return statement.requiresFillIns && 'fillInFields' in statement 
      ? (statement as any).fillInFields || []
      : [];
  };

  const [formData, setFormData] = useState<FormData>({
    documentType: 'mco',
    letterheadType: 'navy',
    bodyFont: 'times',
    distributionStatement: {
      code: 'A' as const
    },
    ssic_code: '',
    consecutive_point: undefined,
    revision_suffix: undefined,
    sponsor_code: '',
    date_signed: '',
    designationLine: '', // ✅… ADD: Initialize designation line
    cancellationDate: '', // MCBul only
    cancellationType: 'contingent', // Default to contingent
    cancellationContingency: '', // MCBul contingency description
    directiveSubType: 'policy',
    issuingAuthority: '',
    securityClassification: 'unclassified',
    distributionScope: 'total-force',
    startingReferenceLevel: 'a',
    startingEnclosureNumber: '1',
    line1: '',
    line2: '',
    line3: '',
    ssic: '',
    originatorCode: '',
    date: '',
    from: '',
    to: 'Distribution List', // ✅… SET: Default value
    subj: '',
    sig: '',
    delegationText: [''],
    startingPageNumber: 1,
    previousPackagePageCount: 0,
    savedAt: '',
    references: [],
    enclosures: [],
    distribution: [],
    paragraphs: [],
    referenceWho: '',
    referenceType: '',
    referenceDate: '',
    basicLetterReference: ''
  });

  const [validation, setValidation] = useState<ValidationState>({
    subj: { isValid: false, message: '' },
    from: { isValid: false, message: '' }
  });

  const [showRef, setShowRef] = useState(false);
  const [showEncl, setShowEncl] = useState(false);
  const [showDelegation, setShowDelegation] = useState(false);

  const [distribution, setDistribution] = useState<DistributionEntry[]>([]);
  const [showDistribution, setShowDistribution] = useState(false);

  // ADD THESE NEW DISTRIBUTION STATES:
  const [distributionType, setDistributionType] = useState<'pcn-only' | 'pcn-with-copy' | 'statement' | 'none'>('statement');
  const [pcn, setPcn] = useState('');
  const [copyToList, setCopyToList] = useState<Array<{ code: string; qty: number }>>([]);

  const [references, setReferences] = useState<string[]>(['']);
  const [enclosures, setEnclosures] = useState<string[]>(['']);

  // ✅ CORRECT - Now references and enclosures exist!
  useEffect(() => {
  // Check if references have content
  if (references && references.some(r => r.trim() !== '')) {
    setShowRef(true);
  } else {
    setShowRef(false);
  }
  
  // Check if enclosures have content
  if (enclosures && enclosures.some(e => e.trim() !== '')) {
    setShowEncl(true);
  } else {
    setShowEncl(false);
  }
}, [references, enclosures]); // ✅ Re-run when references or enclosures change

// Admin & Logistics optional subsections (MCO only)
const [adminSubsections, setAdminSubsections] = useState<{
  recordsManagement: { show: boolean; content: string; order: number };
  privacyAct: { show: boolean; content: string; order: number };
}>({
  recordsManagement: { 
    show: false, 
    content: "Records created as a result of this Order shall be managed in accordance with SECNAV M-5210.1, Department of the Navy Records Management Program, and disposed of IAW SSIC 5210.",
    order: 0
  },
  privacyAct: { 
    show: false, 
    content: "Any misuse or unauthorized disclosure of Personally Identifiable Information (PII) may result in criminal and/or civil penalties (5 U.S.C. § 552a).",
    order: 0
  }
});

  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([
  {
    id: 1,
    level: 1,
    content: '',
    isMandatory: true,
    title: 'Situation'
  },
  {
    id: 2,
    level: 1,
    content: '',
    isMandatory: true,
    title: 'Mission'
  },
  {
    id: 3,
    level: 1,
    content: '',
    isMandatory: true,
    title: 'Execution'
  },
  {
    id: 4,
    level: 1,
    content: '',
    isMandatory: true,
    title: 'Administration and Logistics'
  },
    {
    id: 5,
    level: 2,
    content: '',
    isMandatory: true,
    title: 'Records Management'
  },
      {
    id: 6,
    level: 2,
    content: '',
    isMandatory: true,
    title: 'Privacy Act'
  },
  {
    id: 7,
    level: 1,
    content: '',
    isMandatory: true,
    title: 'Command and Signal'
  }
]);

const [paragraphCounter, setParagraphCounter] = useState(6);
const [isGenerating, setIsGenerating] = useState(false);
const [structureErrors, setStructureErrors] = useState<string[]>([]);
const [savedLetters, setSavedLetters] = useState<SavedLetter[]>([]);

// Voice-to-text state
const [isListening, setIsListening] = useState(false);
const [currentListeningParagraph, setCurrentListeningParagraph] = useState<number | null>(null);
const [speechRecognition, setSpeechRecognition] = useState<any>(null);

// Initialize speech recognition
const initializeSpeechRecognition = useCallback(() => {
  if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    setSpeechRecognition(recognition);
    return recognition;
  }
  return null;
}, []);

useEffect(() => {
  initializeSpeechRecognition();
}, [initializeSpeechRecognition]);

  // Helper functions for references and enclosures
  const getReferenceLetter = (index: number, startingLevel: string): string => {
    const startCharCode = startingLevel.charCodeAt(0);
    return String.fromCharCode(startCharCode + index);
  };

  const getEnclosureNumber = (index: number, startingNumber: string): number => {
    return parseInt(startingNumber, 10) + index;
  };

  const generateReferenceOptions = () => {
    return Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)).map(letter => ({
      value: letter,
      label: `Start with reference (${letter})`
    }));
  };

  const generateEnclosureOptions = () => {
    return Array.from({ length: 20 }, (_, i) => i + 1).map(num => ({
      value: num.toString(),
      label: `Start with enclosure (${num})`
    }));
  };

  // Add these helper functions after existing helper functions:
  const addDistributionEntry = () => {
    setDistribution(prev => [...prev, { type: 'pcn', code: '', description: '', copyCount: 1 }]);
  };

  const updateDistributionEntry = (index: number, field: keyof DistributionEntry, value: string | number) => {
    setDistribution(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const removeDistributionEntry = (index: number) => {
    setDistribution(prev => prev.filter((_, i) => i !== index));
  };

  const getDistributionDescription = (type: 'pcn' | 'iac', code: string): string => {
    const codes = type === 'pcn' ? COMMON_PCN_CODES : COMMON_IAC_CODES;
    const found = codes.find(c => c.code === code);
    return found ? found.description : '';
  };

  // Load saved letters from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('marineCorpsDirectives');
      if (saved) {
        setSavedLetters(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load saved letters from localStorage", error);
    }
  }, []);


  // Set today's date on component mount
  useEffect(() => {
    setTodaysDate();
  }, []);

  // Update paragraphs when document type changes
  useEffect(() => {
    if (formData.documentType === 'mcbul') {
      // Only update if current paragraphs are not already MCBul paragraphs
      const currentTitles = paragraphs.map(p => p.title).join(',');
      const mcbulTitles = getMCBulParagraphs().map(p => p.title).join(',');
      
      if (currentTitles !== mcbulTitles) {
        const mcbulParagraphs = getMCBulParagraphs();
        setParagraphs(mcbulParagraphs);
        setParagraphCounter(6); // Start counter after the 5 mandatory paragraphs
        // Update form data to keep it in sync
        setFormData(prev => ({ ...prev, paragraphs: mcbulParagraphs }));
      }
    } else if (formData.documentType === 'mco') {
      // Only update if current paragraphs are not already MCO paragraphs
      const currentTitles = paragraphs.map(p => p.title).join(',');
      const mcoParagraphs = getMCOParagraphs();
      const mcoTitles = mcoParagraphs.map(p => p.title).join(',');
      
      if (currentTitles !== mcoTitles) {
        setParagraphs(mcoParagraphs);
        setParagraphCounter(7); // Start counter after the 6 mandatory paragraphs
        // Update form data to keep it in sync
        setFormData(prev => ({ ...prev, paragraphs: mcoParagraphs }));
      }
    } else {
      // Only update if current paragraphs are not already default paragraphs
      const currentTitles = paragraphs.map(p => p.title).join(',');
      const defaultTitles = getDefaultParagraphs().map(p => p.title).join(',');
      
      if (currentTitles !== defaultTitles) {
        const defaultParagraphs = getDefaultParagraphs();
        setParagraphs(defaultParagraphs);
        setParagraphCounter(6); // Start counter after the 5 mandatory paragraphs
        // Update form data to keep it in sync
        setFormData(prev => ({ ...prev, paragraphs: defaultParagraphs }));
      }
    }
  }, [formData.documentType]); // Only depend on documentType

  // Handle Cancellation Contingency paragraph for MCBul
  useEffect(() => {
    if (formData.documentType === 'mcbul') {
      const needsContingencyPara = formData.cancellationType === 'contingent';
      const hasContingencyPara = paragraphs.some(p => p.title === 'Cancellation Contingency');
      
      if (needsContingencyPara && !hasContingencyPara) {
        // Add Cancellation Contingency as the last paragraph
        const newParagraph: ParagraphData = {
          id: paragraphs.length > 0 ? Math.max(...paragraphs.map(p => p.id)) + 1 : 1,
          level: 1,
          content: formData.cancellationContingency || '',
          isMandatory: true,
          title: 'Cancellation Contingency'
        };
        
        const newParagraphs = [...paragraphs, newParagraph];
        setParagraphs(newParagraphs);
        setParagraphCounter(prev => prev + 1);
        setFormData(prev => ({ ...prev, paragraphs: newParagraphs }));
      } else if (!needsContingencyPara && hasContingencyPara) {
        // Remove Cancellation Contingency paragraph
        const filteredParagraphs = paragraphs.filter(p => p.title !== 'Cancellation Contingency');
        setParagraphs(filteredParagraphs);
        setFormData(prev => ({ ...prev, paragraphs: filteredParagraphs }));
      } else if (needsContingencyPara && hasContingencyPara && formData.cancellationContingency) {
        // Update existing Cancellation Contingency paragraph content
        const updatedParagraphs = paragraphs.map(p => 
          p.title === 'Cancellation Contingency' 
            ? { ...p, content: formData.cancellationContingency || '' }
            : p
        );
        setParagraphs(updatedParagraphs);
        setFormData(prev => ({ ...prev, paragraphs: updatedParagraphs }));
      }
    }
  }, [formData.documentType, formData.cancellationType, formData.cancellationContingency]);

  const saveLetter = () => {
    const newLetter: SavedLetter = {
      ...formData,
      id: new Date().toISOString(), // Unique ID
      savedAt: new Date().toLocaleString(),
      references,
      enclosures,
      distribution,
      paragraphs,
    };

    const updatedLetters = [newLetter, ...savedLetters].slice(0, 10); // Keep max 10 saves
    setSavedLetters(updatedLetters);
    localStorage.setItem('marineCorpsDirectives', JSON.stringify(updatedLetters));
  };
  
  const loadLetter = (letterToLoad: SavedLetter) => {
    setFormData(prev => ({
      ...prev,
      documentType: letterToLoad.documentType as 'mco' | 'mcbul',

      // ✅… NEW: Essential Directive Elements
      distributionStatement: {
        code: (letterToLoad.distributionStatement?.code as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X') || 'A',
        reason: letterToLoad.distributionStatement?.reason,
        dateOfDetermination: letterToLoad.distributionStatement?.dateOfDetermination,
        originatingCommand: letterToLoad.distributionStatement?.originatingCommand
      },
      // ✅… ADD: Missing properties
      ssic_code: letterToLoad.ssic_code || '',
      consecutive_point: letterToLoad.consecutive_point,
      revision_suffix: letterToLoad.revision_suffix,
      sponsor_code: letterToLoad.sponsor_code || '',
      date_signed: letterToLoad.date_signed || '',
      supersedes: letterToLoad.supersedes || [],
      directiveSubType: (letterToLoad.directiveSubType as any) || 'policy',
      policyScope: letterToLoad.policyScope as any,
      cancellationDate: letterToLoad.cancellationDate,
      parentDirective: letterToLoad.parentDirective,
      affectedSections: letterToLoad.affectedSections || [],
      issuingAuthority: letterToLoad.issuingAuthority || '',
      securityClassification: (letterToLoad.securityClassification as any) || 'unclassified',
      distributionScope: (letterToLoad.distributionScope as any) || 'total-force',
      reviewCycle: letterToLoad.reviewCycle as any,
      startingReferenceLevel: letterToLoad.startingReferenceLevel || 'a',
      startingEnclosureNumber: letterToLoad.startingEnclosureNumber || '1',
      line1: letterToLoad.line1 || '',
      line2: letterToLoad.line2 || '',
      line3: letterToLoad.line3 || '',
      ssic: letterToLoad.ssic || '',
      originatorCode: letterToLoad.originatorCode || '',
      date: letterToLoad.date || '',
      from: letterToLoad.from || '',
      to: 'Distribution List', // ✅… ALWAYS: Set to default value
      subj: letterToLoad.subj || '',
      sig: letterToLoad.sig || '',
      delegationText: letterToLoad.delegationText || [],
      startingPageNumber: letterToLoad.startingPageNumber || 1,
      previousPackagePageCount: letterToLoad.previousPackagePageCount || 0,
      savedAt: letterToLoad.savedAt || '',
      references: letterToLoad.references || [],
      enclosures: letterToLoad.enclosures || [],
      distribution: letterToLoad.distribution || [],
      paragraphs: letterToLoad.paragraphs || [],
      designationLine: letterToLoad.designationLine || '',
      referenceWho: '',
      referenceType: '',
      referenceDate: '',
      basicLetterReference: ''
    }));
    setReferences(letterToLoad.references || []);
    setEnclosures(letterToLoad.enclosures || []);
    setDistribution(letterToLoad.distribution || []);
    setParagraphs(letterToLoad.paragraphs || []);
  };


  // Validation Functions


  const validateSubject = (value: string) => {
    if (!value) {
      setValidation(prev => ({ ...prev, subj: { isValid: false, message: '' } }));
      return;
    }
    
    if (value === value.toUpperCase()) {
      setValidation(prev => ({ ...prev, subj: { isValid: true, message: 'Perfect! Subject is in ALL CAPS' } }));
    } else {
      setValidation(prev => ({ ...prev, subj: { isValid: false, message: 'Subject must be in ALL CAPS' } }));
    }
  };

const validateDirectiveReference = (formData: FormData): string[] => {
  const errors: string[] = [];
  
  if (!formData.ssic) {
    errors.push('SSIC code is required for directives');
  }
    
  return errors;
};

  const setTodaysDate = () => {
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const navyDate = today.getDate() + ' ' + months[today.getMonth()] + ' ' + today.getFullYear().toString().slice(-2);
    setFormData(prev => ({ ...prev, date: navyDate }));
  };

  const parseAndFormatDate = (dateString: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // If already in Naval format, return as-is
    const navalPattern = /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2}$/i;
    if (navalPattern.test(dateString)) {
      return dateString;
    }

    let date: Date | null = null;

    // Handle various date formats
    if (dateString.toLowerCase() === 'today' || dateString.toLowerCase() === 'now') {
      date = new Date();
    } else if (/^\d{8}$/.test(dateString)) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) {
      date = new Date(dateString);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/');
      date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else {
      try {
        const parsedDate = new Date(dateString);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate;
        }
      } catch (e) {
        // ignore invalid date strings
      }
    }

    if (!date || isNaN(date.getTime())) {
      return dateString; // Return original if can't parse
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
  
  // Document type change handler: accept 'mco' or 'mcbul' and reset reference/enclosure defaults
  const handleDocumentTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newType = e.target.value as 'mco' | 'mcbul';
    setFormData(prev => ({
      ...prev,
      documentType: newType,
      basicLetterReference: '',
      referenceWho: '',
      referenceType: '',
      referenceDate: '',
      startingReferenceLevel: 'a',
      startingEnclosureNumber: '1',
      startingPageNumber: 1,
      previousPackagePageCount: 0,
    }));
  };



  const numbersOnly = (value: string) => {
    return value.replace(/\D/g, '');
  };

  const autoUppercase = (value: string) => {
    return value.toUpperCase();
  };

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev: string[]) => [...prev, '']);
  };

  const removeItem = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev: string[]) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev: string[]) => prev.map((item: string, i: number) => i === index ? value : item));
  };

// Helper to get next order number for subsections
  const getNextSubsectionOrder = () => {
    const orders = [
      adminSubsections.recordsManagement.show ? adminSubsections.recordsManagement.order : 0,
      adminSubsections.privacyAct.show ? adminSubsections.privacyAct.order : 0
    ].filter(o => o > 0);
    
    return orders.length > 0 ? Math.max(...orders) + 1 : 1;
  };

  // Add Records Management subsection
  const addRecordsManagement = () => {
    setAdminSubsections(prev => ({
      ...prev,
      recordsManagement: {
        ...prev.recordsManagement,
        show: true,
        order: getNextSubsectionOrder()
      }
    }));
  };

  // Add Privacy Act subsection
  const addPrivacyAct = () => {
    setAdminSubsections(prev => ({
      ...prev,
      privacyAct: {
        ...prev.privacyAct,
        show: true,
        order: getNextSubsectionOrder()
      }
    }));
  };

  // Remove Records Management subsection
  const removeRecordsManagement = () => {
    setAdminSubsections(prev => ({
      ...prev,
      recordsManagement: {
        ...prev.recordsManagement,
        show: false,
        order: 0
      }
    }));
  };

  // Remove Privacy Act subsection
  const removePrivacyAct = () => {
    setAdminSubsections(prev => ({
      ...prev,
      privacyAct: {
        ...prev.privacyAct,
        show: false,
        order: 0
      }
    }));
  };

  // Get subsection letter (a, b) based on order
  const getSubsectionLetter = (type: 'recordsManagement' | 'privacyAct'): string => {
    const subsection = adminSubsections[type];
    if (!subsection.show) return '';
    
    const activeSubsections = [
      adminSubsections.recordsManagement.show ? { type: 'recordsManagement', order: adminSubsections.recordsManagement.order } : null,
      adminSubsections.privacyAct.show ? { type: 'privacyAct', order: adminSubsections.privacyAct.order } : null
    ].filter(s => s !== null).sort((a, b) => a!.order - b!.order);
    
    const index = activeSubsections.findIndex(s => s!.type === type);
    return String.fromCharCode(97 + index); // a, b, c...
  };

  // Copy To list helpers
  const addCopyToEntry = () => {
    setCopyToList([...copyToList, { code: '', qty: 1 }]);
  };

  const removeCopyToEntry = (index: number) => {
    setCopyToList(copyToList.filter((_, i) => i !== index));
  };

  const updateCopyToCode = (index: number, code: string) => {
    // Only allow 7-digit numeric codes
    if (code === '' || (/^\d{0,7}$/.test(code))) {
      setCopyToList(copyToList.map((item, i) => i === index ? { ...item, code } : item));
    }
  };

  const updateCopyToQty = (index: number, qty: number) => {
    // Only allow quantities 1-99
    if (qty >= 1 && qty <= 99) {
      setCopyToList(copyToList.map((item, i) => i === index ? { ...item, qty } : item));
    }
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
    
    const newId = (paragraphs.length > 0 ? Math.max(...paragraphs.map(p => p.id)) : 0) + 1;
    const currentIndex = paragraphs.findIndex(p => p.id === afterId);
    const newParagraphs = [...paragraphs];
    newParagraphs.splice(currentIndex + 1, 0, { id: newId, level: newLevel, content: '' });
    
    // Validate numbering after adding
    const numberingErrors = validateParagraphNumbering(newParagraphs);
    if (numberingErrors.length > 0) {
      // Show validation warnings but still allow the addition
      console.warn('Paragraph numbering warnings:', numberingErrors);
    }
    
    setParagraphs(newParagraphs);
  };


  const removeParagraph = (id: number) => {
    const paragraphToRemove = paragraphs.find(p => p.id === id);
    
    // Prevent deletion of mandatory paragraphs except for Cancellation
    if (paragraphToRemove?.isMandatory && paragraphToRemove?.title !== 'Cancellation') {
      alert('Cannot delete mandatory paragraphs. Mandatory paragraphs like "Situation", "Mission", etc. are required for the document format.');
      return;
    }
    
    // Prevent deletion of the first paragraph (id === 1)
    if (id === 1) {
      alert('Cannot delete the first paragraph.');
      return;
    }
    
    setParagraphs(prev => prev.filter(p => p.id !== id));
  };


const handleUnderlineText = (paragraphId: number, textarea: HTMLTextAreaElement) => {
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  
  if (selectedText.length === 0) {
    alert('Please select text to underline.');
    return;
  }
  
  // Check if text is already underlined
  const isAlreadyUnderlined = selectedText.startsWith('<u>') && selectedText.endsWith('</u>');
  
  let newText;
  if (isAlreadyUnderlined) {
    // Remove underline tags
    newText = selectedText.slice(3, -4); // Remove <u> and </u>
  } else {
    // Add underline tags
    newText = `<u>${selectedText}</u>`;
  }
  
  const beforeText = textarea.value.substring(0, start);
  const afterText = textarea.value.substring(end);
  const updatedContent = beforeText + newText + afterText;
  
  updateParagraphContent(paragraphId, updatedContent);
  
  // Restore cursor position
  setTimeout(() => {
    if (textarea) {
      const newCursorPos = start + newText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }
  }, 0);
};


const validateAcronyms = useCallback((allParagraphs: ParagraphData[]) => {
    const fullText = allParagraphs.map(p => p.content).join('\n');
    const definedAcronyms = new Set<string>();
    
    // Regex to find explicit definitions: e.g., "Full Name (ACRONYM)"
    const acronymDefinitionRegex = /\b[A-Za-z\s]+?\s+\(([A-Z]{2,})\)/g;
    
    let match;
    while ((match = acronymDefinitionRegex.exec(fullText)) !== null) {
        definedAcronyms.add(match[1]);
    }

    const globallyDefined = new Set<string>();
    const finalParagraphs = allParagraphs.map(p => {
        let error = '';
        // Find all potential acronyms (2+ capital letters in a row)
        const potentialAcronyms = p.content.match(/\b[A-Z]{2,}\b/g) || [];

        for (const acronym of potentialAcronyms) {
            const isDefined = globallyDefined.has(acronym);
            // Check if the acronym is being defined *in this paragraph*
            const definitionPattern = new RegExp(`\\b([A-Za-z][a-z]+(?:\\s[A-Za-z][a-z]+)*)\\s*\\(\\s*${acronym}\\s*\\)`);
            const isDefiningNow = definitionPattern.test(p.content);

            if (!isDefined && !isDefiningNow) {
                 error = `Acronym "${acronym}" used without being defined first. Please define it as "Full Name (${acronym})".`;
                 break; // Stop after the first error in the paragraph
            }
            if (isDefiningNow) {
                globallyDefined.add(acronym);
            }
        }
        return { ...p, acronymError: error };
    });

    setParagraphs(finalParagraphs);
}, []);


  const updateParagraphContent = (id: number, content: string) => {
    // Debug: Log the input to see what we're receiving
    console.log('Input content:', JSON.stringify(content));
    console.log('Character codes:', [...content].map(char => char.charCodeAt(0)));
    
    // Only replace non-breaking spaces and line breaks, preserve regular spaces (ASCII 32)
    const cleanedContent = content
      .replace(/\u00A0/g, ' ')  // Replace non-breaking spaces with regular spaces
      .replace(/\u2007/g, ' ')  // Replace figure spaces with regular spaces
      .replace(/\u202F/g, ' ')  // Replace narrow non-breaking spaces with regular spaces
      .replace(/[\r\n]/g, ' '); // Replace line breaks with spaces
      
    console.log('Cleaned content:', JSON.stringify(cleanedContent));
    
    const newParagraphs = paragraphs.map(p => p.id === id ? { ...p, content: cleanedContent } : p)
    setParagraphs(newParagraphs);
    validateAcronyms(newParagraphs);
  };

  const moveParagraphUp = (id: number) => {
    const currentIndex = paragraphs.findIndex(p => p.id === id);
    if (currentIndex > 0) {
      const currentPara = paragraphs[currentIndex];
      const paraAbove = paragraphs[currentIndex - 1];

      // Prevent a sub-paragraph from moving above its parent
      if (currentPara.level > paraAbove.level) {
        return; 
      }

      const newParagraphs = [...paragraphs];
      [newParagraphs[currentIndex - 1], newParagraphs[currentIndex]] = [newParagraphs[currentIndex], newParagraphs[currentIndex - 1]];
      setParagraphs(newParagraphs);
    }
  };

  const moveParagraphDown = (id: number) => {
    const currentIndex = paragraphs.findIndex(p => p.id === id);
    if (currentIndex < paragraphs.length - 1) {
      const newParagraphs = [...paragraphs];
      [newParagraphs[currentIndex], newParagraphs[currentIndex + 1]] = [newParagraphs[currentIndex + 1], newParagraphs[currentIndex]];
      setParagraphs(newParagraphs);
    }
  };

  const updateDelegationType = (value: string) => {
    let delegationText = '';
    switch(value) {
      case 'by_direction': delegationText = 'By direction'; break;
      case 'acting_commander': delegationText = 'Acting'; break;
      case 'acting_title': delegationText = 'Acting'; break;
      case 'signing_for': delegationText = 'For'; break;
    }
    setFormData(prev => ({ ...prev, delegationText: [delegationText] })); // Update to array
  };

  // Add new functions for managing delegation text lines
  const addDelegationLine = () => {
    setFormData(prev => ({
      ...prev,
      delegationText: [...prev.delegationText, '']
    }));
  };

  const removeDelegationLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      delegationText: prev.delegationText.filter((_, i) => i !== index)
    }));
  };

  const updateDelegationLine = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      delegationText: prev.delegationText.map((line, i) => i === index ? value : line)
    }));
  };


  /**
   * Converts a number to Excel-style letters (1=a, 2=b... 26=z, 27=aa, 28=ab)
   */
  const numberToLetter = (num: number): string => {
    let result = '';
    while (num > 0) {
      const remainder = (num - 1) % 26;
      result = String.fromCharCode(97 + remainder) + result;
      num = Math.floor((num - 1) / 26);
    }
    return result;
  };
  /**
   * Generates the correct citation string (e.g., "1.", "a.", "(1)") for a given paragraph for UI display.
   */
  const getUiCitation = (paragraph: ParagraphData, index: number, allParagraphs: ParagraphData[]): string => {
    const { level } = paragraph;

    // Helper to get the citation for a single level
    // Helper to get the citation for a single level
    // Helper to get the citation for a single level
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
          case 2: return `${numberToLetter(count)}`; // ← CHANGED: Now supports aa, ab, etc.
          case 3: return `(${count})`;
          case 4: return `(${numberToLetter(count)})`; // ← CHANGED: Now supports (aa), (ab), etc.
          case 5: return `${count}.`;
          case 6: return `${numberToLetter(count)}.`; // ← CHANGED: Now supports aa., ab., etc.
          case 7: return `(${count})`;
          case 8: return `(${numberToLetter(count)})`; // ← CHANGED: Now supports (aa), (ab), etc.
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
    
    // Build the hierarchical citation for deeper levels
    let citationPath = [];
    let parentLevel = level - 1;

    // Look backwards to find all ancestors
    for (let i = index - 1; i >= 0; i--) {
      const p = allParagraphs[i];
      if (p.level === parentLevel) {
          citationPath.unshift(getCitationPart(p.level, i).replace(/[.()]/g, ''));
          parentLevel--;
          if (parentLevel === 0) break;
      }
    }
    
    // Add the current level's citation
    citationPath.push(getCitationPart(level, index));
    
    return citationPath.join('');
  }

  /**
   * Validates paragraph numbering rules:
   * - If there's a paragraph 1a, there must be a paragraph 1b
   * - If there's a paragraph 1a(1), there must be a paragraph 1a(2), etc.
   */
  const validateParagraphNumbering = useCallback((allParagraphs: ParagraphData[]): string[] => {
    const errors: string[] = [];
    const levelGroups: { [key: string]: number[] } = {};
    
    // Group paragraphs by their parent hierarchy
    allParagraphs.forEach((paragraph, index) => {
      const { level } = paragraph;
      
      // Build the parent path for this paragraph
      let parentPath = '';
      let currentLevel = level - 1;
      
      // Find all parent levels
      for (let i = index - 1; i >= 0 && currentLevel > 0; i--) {
        if (allParagraphs[i].level === currentLevel) {
          const citation = getUiCitation(allParagraphs[i], i, allParagraphs);
          parentPath = citation.replace(/[.()]/g, '') + parentPath;
          currentLevel--;
        }
      }
      
      // Create a key for this level group
      const groupKey = `${parentPath}_level${level}`;
      
      if (!levelGroups[groupKey]) {
        levelGroups[groupKey] = [];
      }
      levelGroups[groupKey].push(index);
    });
    
    // Check each group for proper numbering
    Object.entries(levelGroups).forEach(([groupKey, indices]) => {
      if (indices.length === 1) {
        const index = indices[0];
        const paragraph = allParagraphs[index];
        const citation = getUiCitation(paragraph, index, allParagraphs);
        
        // Skip level 1 paragraphs as they can be standalone
        if (paragraph.level > 1) {
          errors.push(`Paragraph ${citation} requires at least one sibling paragraph at the same level.`);
        }
      }
    });
    
    return errors;
  }, []);


const formatDistributionStatement = (distributionStatement: FormData['distributionStatement']): string => {
  const statement = DISTRIBUTION_STATEMENTS[distributionStatement.code];
  if (!statement) return '';
  
  let text = statement.text;
  
  if (statement.requiresFillIns) {
    // Replace fill-in placeholders with actual values
    if (distributionStatement.reason) {
      text = text.replace('(fill in reason)', distributionStatement.reason);
    }
    if (distributionStatement.dateOfDetermination) {
      text = text.replace('(date of determination)', distributionStatement.dateOfDetermination);
    }
    if (distributionStatement.originatingCommand) {
      text = text.replace('(insert originating command)', distributionStatement.originatingCommand)
                 .replace('(originating command)', distributionStatement.originatingCommand);
    }
  }
  
  return text;
};


const generateBasicLetter = async () => {
  try {
    // Use local base64 DoD seal
    const sealImageRun = await createDoDSeal();

    const content = [];
    
// Letterhead - conditional format based on letterheadType
      const letterheadColor = formData.letterheadType === 'navy' ? '000080' : '000000';
      const bodyFont = formData.bodyFont === 'courier' ? 'Courier New' : 'Times New Roman';

      if (formData.letterheadType === 'navy') {
        // Navy 4-line format (blue text)
        content.push(new Paragraph({
          children: [new TextRun({
            text: "DEPARTMENT OF THE NAVY",
            bold: true,
            font: "Arial",
            size: 20,
            color: letterheadColor
          })],
          alignment: AlignmentType.CENTER
        }));
        
        content.push(new Paragraph({
          children: [new TextRun({
            text: "HEADQUARTERS UNITED STATES MARINE CORPS",
            font: "Arial",
            size: 16,
            color: letterheadColor
          })],
          alignment: AlignmentType.CENTER
        }));
        
        content.push(new Paragraph({
          children: [new TextRun({
            text: "3000 MARINE CORPS PENTAGON",
            font: "Arial",
            size: 16,
            color: letterheadColor
          })],
          alignment: AlignmentType.CENTER
        }));
        
        content.push(new Paragraph({
          children: [new TextRun({
            text: "WASHINGTON, DC 20350-3000",
            font: "Arial",
            size: 16,
            color: letterheadColor
          })],
          alignment: AlignmentType.CENTER
        }));
      } else {
        // Marine Corps 3-line format (black text)
        content.push(new Paragraph({
          children: [new TextRun({
            text: "UNITED STATES MARINE CORPS",
            bold: true,
            font: "Arial",
            size: 20,
            color: letterheadColor
          })],
          alignment: AlignmentType.CENTER
        }));
        
        // Unit lines for Marine Corps format
        if (formData.line1) {
          content.push(new Paragraph({
            children: [new TextRun({
              text: formData.line1,
              font: "Arial",
              size: 16,
              color: letterheadColor
            })],
            alignment: AlignmentType.CENTER
          }));
        }
        
        if (formData.line2) {
          content.push(new Paragraph({
            children: [new TextRun({
              text: formData.line2,
              font: "Arial",
              size: 16,
              color: letterheadColor
            })],
            alignment: AlignmentType.CENTER
          }));
        }
        
        if (formData.line3) {
          content.push(new Paragraph({
            children: [new TextRun({
              text: formData.line3,
              font: "Arial",
              size: 16,
              color: letterheadColor
            })],
            alignment: AlignmentType.CENTER
          }));
        }
      }
    
    // Single empty line after address lines, before cancellation/SSIC
    content.push(new Paragraph({ text: "" }));

    // MCBul Cancellation Date (positioned two spaces above SSIC)
    if (formData.documentType === 'mcbul' && formData.cancellationDate && formData.cancellationType) {
      const cancText = formData.cancellationType === 'contingent' 
        ? `Canc frp: ${formatCancellationDate(formData.cancellationDate)}`
        : `Canc: ${formatCancellationDate(formData.cancellationDate)}`;
        
      content.push(new Paragraph({
        children: [new TextRun({
          text: cancText,
          font: bodyFont,
          size: 24
        })],
        alignment: AlignmentType.LEFT,
        indent: {
          left: getCancellationLinePosition(cancText, bodyFont)
        }
      }));
      
      // Empty paragraph for spacing between cancellation and SSIC
      content.push(new Paragraph({ text: "" }));
    }

    // Calculate the alignment position
    const texts = [
      formData.ssic || "",
      formData.originatorCode || "",
      formData.date || ""
    ].filter(text => text.trim());

    const maxCharLength = texts.length > 0 
      ? Math.max(...texts.map(text => text.length))
      : 0;

    const alignmentPosition = getPreciseAlignmentPosition(maxCharLength);

    // SSIC placement - left-aligned with calculated position
    content.push(new Paragraph({
      children: [new TextRun({
        text: formData.ssic || "",
        font: bodyFont,
        size: 24 // 12pt in docx
      })],
      alignment: AlignmentType.LEFT,
      indent: { left: alignmentPosition }
    }));

    // Originator Code placement - left-aligned with same position
    const originatorText = (formData.originatorCode || "").replace(/ /g, '\u00A0');
    content.push(new Paragraph({
      children: [new TextRun({
        text: originatorText,
        font: bodyFont,
        size: 24
      })],
      alignment: AlignmentType.LEFT,
      indent: { left: alignmentPosition }
    }));

    // Date placement - left-aligned with same position
    content.push(new Paragraph({
      children: [new TextRun({
        text: formData.date || "",
        font: bodyFont,
        size: 24
      })],
      alignment: AlignmentType.LEFT,
      indent: { left: alignmentPosition }
    }));

    // Single empty line after date
    content.push(new Paragraph({ text: "" }));

    // Designation Line - Simple left alignment without keepNext/keepLines
    const designationText = (() => {
      const designationBase = formData.designationLine || (
        formData.documentType === 'mco' 
          ? 'MARINE CORPS ORDER'
          : formData.documentType === 'mcbul'
          ? 'MARINE CORPS BULLETIN'
          : 'MARINE CORPS ORDER'
      );
      
      // Remove SSIC code combination - just return the designation base
      return designationBase;
    })();

    content.push(new Paragraph({
      children: [new TextRun({
        text: designationText.toUpperCase(),
        font: bodyFont,
        size: 24,
        underline: {}
      })],
      alignment: AlignmentType.LEFT
    }));

    content.push(new Paragraph({ text: "" }));

    // a. "From:" Line - Use the title of the principal official
    if (formData.bodyFont === 'courier') {
      content.push(new Paragraph({
        children: [new TextRun({
          text: "From:  " + (formData.from || "Commandant of the Marine Corps"),
          font: bodyFont,
          size: 24
        })]
      }));
    } else {
      content.push(new Paragraph({
        children: [new TextRun({
          text: "From:\t" + (formData.from || "Commandant of the Marine Corps"),
          font: bodyFont,
          size: 24
        })],
        tabStops: [{ type: TabStopType.LEFT, position: 720 }]
      }));
    }

    // b. "To:" Line - Insert "Distribution List"
    if (formData.bodyFont === 'courier') {
      content.push(new Paragraph({
        children: [new TextRun({
          text: "To:    " + (formData.to || "Distribution List"),
          font: bodyFont,
          size: 24
        })]
      }));
    } else {
      content.push(new Paragraph({
        children: [new TextRun({
          text: "To:\t" + (formData.to || "Distribution List"),
          font: bodyFont,
          size: 24
        })],
        tabStops: [{ type: TabStopType.LEFT, position: 720 }]
      }));
    }

    content.push(new Paragraph({ text: "" }));

    // c. "Subj:" Line - All capital letters, topical statement, acronyms spelled out
    const subjectText = formData.subj || "MARINE CORPS DIRECTIVES MANAGEMENT PROGRAM (MCDMP)";
    const subjectParagraphs = createFormattedSubjectLine(subjectText, bodyFont);
    content.push(...subjectParagraphs);

    content.push(new Paragraph({ text: "" }));

    // References section with multi-line formatting
    if (references && references.length > 0) {
      const refsWithContent = references.filter(ref => ref.trim());
      
      for (let i = 0; i < refsWithContent.length; i++) {
        const refLetter = String.fromCharCode(97 + i); // a, b, c...
        const isFirstReference = i === 0;
        
        // Use the new multi-line formatting function
        const referenceParagraphs = createFormattedReferenceLine(
          refsWithContent[i], 
          refLetter, 
          isFirstReference,
          bodyFont
        );
        
        content.push(...referenceParagraphs);
      }
      
      // Only add empty paragraph if enclosures exist, otherwise let enclosures handle spacing
      const hasEnclosures = enclosures && enclosures.length > 0 && enclosures.some(encl => encl.trim());
      if (hasEnclosures) {
        content.push(new Paragraph({ text: "" }));
      }
    }

    // Enclosures section
    // Enclosures section
if (enclosures && enclosures.length > 0) {
  const enclsWithContent = enclosures.filter(encl => encl.trim());
  if (enclsWithContent.length > 0) {
    const isCourier = bodyFont === 'Courier New';
    const maxLength = isCourier ? 54 : 67;
    
    for (let i = 0; i < enclsWithContent.length; i++) {
      // Use splitSubject for consistent line breaking
      const enclLines = splitSubject(enclsWithContent[i], maxLength);
      
      enclLines.forEach((line, lineIndex) => {
        if (lineIndex === 0) {
          // First line of enclosure
          if (isCourier) {
            const enclText = i === 0 
              ? `Encl:  (${i+1}) ${line}` 
              : `       (${i+1}) ${line}`;
            content.push(new Paragraph({
              children: [new TextRun({
                text: enclText,
                font: bodyFont,
                size: 24
              })]
            }));
          } else {
            const enclText = i === 0 
              ? `Encl:\t(${i+1})\t${line}` 
              : `\t(${i+1})\t${line}`;
            content.push(new Paragraph({
              children: [new TextRun({
                text: enclText,
                font: bodyFont,
                size: 24
              })],
              tabStops: [
                { type: TabStopType.LEFT, position: 720 },
                { type: TabStopType.LEFT, position: 1200 }
              ]
            }));
          }
        } else {
          // Continuation lines - align with start of text
          if (isCourier) {
            // 11 spaces total: "Encl:  (1) " or "       (2) " both = 11 chars before text
            content.push(new Paragraph({
              children: [new TextRun({
                text: `           ${line}`, // 11 spaces to align with text
                font: bodyFont,
                size: 24
              })]
            }));
          } else {
            // For Times New Roman: double tab reaches the text position at 1200 twips
            content.push(new Paragraph({
              children: [new TextRun({
                text: `\t\t${line}`,
                font: bodyFont,
                size: 24
              })],
              tabStops: [
                { type: TabStopType.LEFT, position: 720 },
                { type: TabStopType.LEFT, position: 1200 }
              ]
            }));
          }
        }
      });
    }
    content.push(new Paragraph({ text: "" }));
  }
}
    
    // Add spacing before paragraphs if we have references but no enclosures
    const hasReferences = references && references.length > 0 && references.some(ref => ref.trim());
    const hasEnclosures = enclosures && enclosures.length > 0 && enclosures.some(encl => encl.trim());
    if (hasReferences && !hasEnclosures) {
      content.push(new Paragraph({ text: "" }));
    }

    // Add paragraphs
    if (paragraphs && paragraphs.length > 0) {
      // Filter to only include paragraphs that have content OR are mandatory (but present)
      const activeParagraphs = paragraphs.filter(para => para.content.trim() || para.isMandatory);
      
      activeParagraphs.forEach((para, index) => {
        // Use the proper formatted paragraph function with the filtered array
        const formattedParagraph = createFormattedParagraph(para, index, activeParagraphs, bodyFont);
        content.push(formattedParagraph);
        
        // Add hard space after each paragraph (except the last one)
        if (index < activeParagraphs.length - 1) {
          content.push(new Paragraph({ text: "" }));
        }
      });
    } else {
      // Add default paragraph if none exist
      content.push(new Paragraph({
        children: [new TextRun({
          text: "1.  [Document content goes here]",
          font: bodyFont,
          size: 24
        })],
      }));
    }

    // Signature block
    if (formData.sig) {
      // Three empty lines before signature
      content.push(new Paragraph({ text: "" }));
      content.push(new Paragraph({ text: "" }));
      content.push(new Paragraph({ text: "" }));
      
      // Signature name - positioned at 3.25 inches from left
      content.push(new Paragraph({
        children: [new TextRun({
          text: formData.sig,
          font: bodyFont,
          size: 24
        })],
        alignment: AlignmentType.LEFT,
        indent: { left: 4680 } // 3.25 inches in twips
      }));
      
      // Delegation text (if present) - same positioning
      if (formData.delegationText && formData.delegationText.length > 0) {
        formData.delegationText.forEach((line, index) => {
          if (line.trim()) { // Only add non-empty lines
            content.push(new Paragraph({
              children: [new TextRun({
                text: line,
                font: bodyFont,
                size: 24
              })],
              alignment: AlignmentType.LEFT,
              indent: { left: 4680 }
            }));
          }
        });
      }
    }

    // Distribution section
    if (formData.distribution && formData.distribution.length > 0) {
      content.push(new Paragraph({ text: "" }));
      content.push(new Paragraph({
        children: [new TextRun({
          text: "Distribution:",
          font: bodyFont,
          size: 24
        })],
      }));
      
      formData.distribution.forEach(dist => {
        if (dist.code.trim()) {
          content.push(new Paragraph({
            children: [new TextRun({
              text: `${dist.code} (${dist.copyCount})`,
              font: bodyFont,
              size: 24
            })],
            indent: { left: 720 }
          }));
        }
      });
    }

    const doc = new Document({
  creator: "Marine Corps Directives Formatter",
  title: "Marine Corps Directive", 
  description: "Generated Marine Corps Directive Format",
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(0.5),
          bottom: convertInchesToTwip(1.0),
          right: convertInchesToTwip(1.0),
          left: convertInchesToTwip(1.0),
        },
        size: {
          width: convertInchesToTwip(8.5),
          height: convertInchesToTwip(11),
        },
        pageNumbers: {
          start: formData.startingPageNumber,
          formatType: NumberFormat.DECIMAL
        }
      },
      titlePage: true,
    },
    headers: {
      first: new Header({
        children: [
          // DOD Seal (if buffer available)
        new Paragraph({
          children: [sealImageRun]
        })
        ]
      }),
      
      default: new Header({
        children: [
          // SSIC
          new Paragraph({
            children: [
              new TextRun({
                text: formData.ssic,
                font: bodyFont,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT,
            indent: {
              left: getHeaderAlignmentPosition(formData.ssic, formData.date, bodyFont)
            }
          }),
          // Date
          new Paragraph({
            children: [
              new TextRun({
                text: formData.date,
                font: bodyFont,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT,
            indent: {
              left: getHeaderAlignmentPosition(formData.ssic, formData.date, bodyFont)
            }
          }),
          // Empty paragraph for spacing
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: bodyFont,
                size: 24
              })
            ]
          })
        ]
      })
    },
    footers: {
      first: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: formatDistributionStatement(formData.distributionStatement),
                font: bodyFont,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT
          })
        ]
      }),
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                children: [PageNumber.CURRENT],
                font: bodyFont,
                size: 24
              })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      })
    },
    children: content,
  }]
});

    return doc;
  } catch (error) {
    console.error("Error in generateBasicLetter:", error);
    throw error;
  }
};

const generateDocument = useCallback(async () => { 
  setIsGenerating(true);
  try {
    saveLetter(); // Save the current state before generating
    
    let doc;
    let filename;
    
    // Use generateBasicLetter for all document types for now
    doc = await generateBasicLetter();
    
    // Create filename using SSIC and Subject format (e.g., "1615.2 EXAMPLE SUBJECT.docx")
    const ssic = formData.ssic || '';
    const subject = formData.subj || 'Document';
    
    if (ssic && subject) {
      // Clean the subject for filename (remove special characters but keep spaces)
      const cleanSubject = subject
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      filename = `${ssic} ${cleanSubject}.docx`;
    } else {
      // Fallback if missing SSIC or subject
      const baseFilename = subject || formData.documentType?.toUpperCase() || 'MarineCorpsDirective';
      filename = `${baseFilename.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    }
    
    if(doc) {
      console.log('Generating Word document blob...');
      const blob = await Packer.toBlob(doc);
      console.log('Word document blob created, size:', blob.size, 'bytes');
      console.log('Filename:', filename);
      
      // Use our reliable download function
      downloadFile(blob, filename);
      console.log('Word document download initiated successfully');
    }

  } catch (error) {
    console.error("Error generating document:", error);
    alert("Error generating document: " + (error as Error).message);
} finally {
    setIsGenerating(false);
  }
}, [formData, saveLetter, generateBasicLetter]);

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



// Voice-to-text functions
const startVoiceInput = (paragraphId: number) => {
  if (!speechRecognition) {
    alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
    return;
  }

  // Stop any existing recognition
  if (isListening) {
    stopVoiceInput();
    return;
  }

  setCurrentListeningParagraph(paragraphId);
  setIsListening(true);

  let finalTranscript = '';
  let interimTranscript = '';

  speechRecognition.onresult = (event: any) => {
    finalTranscript = '';
    interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    // Update paragraph content with final transcript
    if (finalTranscript) {
      const currentParagraph = paragraphs.find(p => p.id === paragraphId);
      if (currentParagraph) {
        const newContent = currentParagraph.content + (currentParagraph.content ? ' ' : '') + finalTranscript;
        updateParagraphContent(paragraphId, newContent);
      }
    }
  };

  speechRecognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
    setIsListening(false);
    setCurrentListeningParagraph(null);
    
    let errorMessage = 'Speech recognition error occurred.';
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not available. Please check your microphone settings.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        break;
      case 'network':
        errorMessage = 'Network error occurred. Please check your internet connection.';
        break;
    }
    alert(errorMessage);
  };

  speechRecognition.onend = () => {
    setIsListening(false);
    setCurrentListeningParagraph(null);
  };

  speechRecognition.start();
};

const stopVoiceInput = () => {
  if (speechRecognition && isListening) {
    speechRecognition.stop();
    setIsListening(false);
    setCurrentListeningParagraph(null);
  }
};

const clearParagraphContent = (paragraphId: number) => {
  updateParagraphContent(paragraphId, '');
};




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
        
        .main-title {
          background: linear-gradient(45deg, #C8102E, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: bold;
          font-size: 2.5rem;
          text-align: center;
          margin-bottom: 40px;
        }
        
        .form-section {
          background: rgba(248, 249, 250, 0.8);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 25px;
          border: 2px solid rgba(200, 16, 46, 0.2);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .section-legend {
          background: linear-gradient(45deg, #C8102E, #FFD700);
          color: white;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: bold;
          margin-bottom: 20px;
          display: block;
          font-size: 1.1rem;
          text-align: center;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }
        
        .input-group {
          display: flex;
          margin-bottom: 1rem;
        }
        
        .input-group-text {
          background: linear-gradient(45deg, #C8102E, #FFD700);
          color: white;
          border: none;
          font-weight: 600;
          white-space: nowrap;
          border-radius: 8px 0 0 8px;
          padding: 0 12px;
          display: flex;
          align-items: center;
        }
        
        .form-control {
          flex: 1;
          border-width: 2px;
          border-style: solid;
          border-color: #A9A9A9;
          border-radius: 0 8px 8px 0;
          padding: 12px;
          transition: all 0.3s ease;
        }
        
        .form-control:focus {
          border-color: #C8102E;
          box-shadow: 0 0 0 0.2rem rgba(200, 16, 46, 0.25);
        }

        .form-control[contentEditable="true"]:empty::before {
          content: attr(data-placeholder);
          color: #6c757d;
          pointer-events: none;
          display: block;
        }
        
        .input-group .input-group-text + .form-control { 
          border-radius: 0; 
        } 
        
        .input-group .form-control:last-of-type { 
          border-radius: 0 8px 8px 0; 
        }
        
        .is-valid {
          border-left: 4px solid #2E8B57 !important;
          background-color: rgba(46, 139, 87, 0.05);
        }

        .is-invalid {
          border-left: 4px solid #DC143C !important;
          background-color: rgba(220, 20, 60, 0.05);
        }

        .feedback-message {
          font-size: 0.875rem;
          margin-top: 5px;
          padding: 5px 10px;
          border-radius: 4px;
        }

        .text-success {
          color: #2E8B57 !important;
        }

        .text-danger {
          color: #DC143C !important;
        }

        .text-warning {
          color: #FFD700 !important;
        }

        .text-info {
          color: #4682B4 !important;
        }
        
        .btn {
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          transition: all 0.3s ease;
          border: none;
        }
        
        .btn-primary {
          background: linear-gradient(45deg, #C8102E, #FFD700);
          color: white;
        }
        
        .btn-primary:hover {
          background: linear-gradient(45deg, #A00D26, #E6C200);
          transform: translateY(-2px);
        }
        
        .btn-success {
          background: linear-gradient(45deg, #2E8B57, #20c997);
          color: white;
        }
        
        .btn-success:hover {
          background: linear-gradient(45deg, #26734A, #1da88a);
          transform: translateY(-2px);
        }
        
        .btn-danger {
          background: linear-gradient(45deg, #DC143C, #c82333);
          color: white;
        }
        
        .btn-danger:hover {
          background: linear-gradient(45deg, #B8112F, #a71e2a);
          transform: translateY(-2px);
        }
        
        .generate-btn {
          background: linear-gradient(45deg, #2E8B57, #20c997);
          color: white;
          border: none;
          padding: 15px 30px;
          font-size: 1.2rem;
          font-weight: bold;
          border-radius: 12px;
          display: block;
          margin: 30px auto;
          min-width: 250px;
          transition: all 0.3s ease;
        }
        
        .generate-btn:hover {
          background: linear-gradient(45deg, #26734A, #1da88a);
          transform: translateY(-3px);
        }
        
        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .radio-group {
          display: flex;
          gap: 20px;
          margin-top: 10px;
        }
        
        .dynamic-section {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 15px;
          border-left: 4px solid #C8102E;
        }
        
        .paragraph-container {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          position: relative;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        
        .paragraph-container[data-level="1"] {
          margin-left: 0px;
          border-left: 4px solid #007bff;
          background: rgba(0, 123, 255, 0.05);
        }
        
        .paragraph-container[data-level="2"] {
          margin-left: 30px;
          border-left: 4px solid #ffc107;
          background: rgba(255, 193, 7, 0.05);
        }
        
        .paragraph-container[data-level="3"] {
          margin-left: 60px;
          border-left: 4px solid #28a745;
          background: rgba(40, 167, 69, 0.05);
        }
        
        .paragraph-container[data-level="4"] {
          margin-left: 90px;
          border-left: 4px solid #17a2b8;
          background: rgba(23, 162, 184, 0.05);
        }
        
        .paragraph-container[data-level="5"] {
          margin-left: 120px;
          border-left: 4px solid #6f42c1;
          background: rgba(111, 66, 193, 0.05);
        }
        
        .paragraph-container[data-level="6"] {
          margin-left: 150px;
          border-left: 4px solid #e83e8c;
          background: rgba(232, 62, 140, 0.05);
        }
        
        .paragraph-container[data-level="7"] {
          margin-left: 180px;
          border-left: 4px solid #fd7e14;
          background: rgba(253, 126, 20, 0.05);
        }
        
        .paragraph-container[data-level="8"] {
          margin-left: 210px;
          border-left: 4px solid #dc3545;
          background: rgba(220, 53, 69, 0.05);
        }
        
        .paragraph-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .paragraph-level-badge {
          background: linear-gradient(45deg, #C8102E, #FFD700);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
          margin-right: 10px;
        }
        
        .paragraph-number-preview {
          font-family: monospace;
          color: #666;
          font-size: 1.1rem;
          font-weight: bold;
        }
        
        .btn-smart-main { 
          background: #007bff; 
          color: white; 
          margin-right: 8px;
          margin-bottom: 4px;
        }
        .btn-smart-sub { 
          background: #ffc107; 
          color: #212529; 
          margin-right: 8px;
          margin-bottom: 4px;
        }
        .btn-smart-same { 
          background: #28a745; 
          color: white; 
          margin-right: 8px;
          margin-bottom: 4px;
        }
        .btn-smart-up { 
          background: #17a2b8; 
          color: white; 
          margin-right: 8px;
          margin-bottom: 4px;
        }
        
        .invalid-structure {
          border-left: 4px solid #dc3545 !important;
          background-color: rgba(220, 53, 69, 0.1) !important;
        }

        .structure-error {
          margin-top: 10px;
          padding: 8px 12px;
          background-color: rgba(220, 53, 69, 0.1);
          border: 1px solid #dc3545;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #dc3545;
        }
        
        .acronym-error {
          margin-top: 10px;
          padding: 8px 12px;
          background-color: rgba(255, 193, 7, 0.1);
          border: 1px solid #ffc107;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #856404;
        }

        .validation-summary {
          border-left: 4px solid #ffc107;
          background-color: rgba(255, 193, 7, 0.1);
          padding: 15px;
          margin-top: 20px;
          border-radius: 8px;
        }

        .validation-summary h6 {
          color: #856404;
          margin-bottom: 10px;
        }

        .validation-summary ul {
          padding-left: 20px;
        }

        .saved-letter-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 10px;
            transition: background-color 0.2s ease;
        }

        .saved-letter-item:hover {
            background-color: #e9ecef;
        }
        
        .saved-letter-info {
            flex-grow: 1;
        }

        .saved-letter-info strong {
            display: block;
            font-size: 1rem;
            color: #495057;
        }

        .saved-letter-info small {
            font-size: 0.8rem;
            color: #6c757d;
        }

        .saved-letter-actions button {
            margin-left: 10px;
        }
        
@media (max-width: 768px) {
  /* Container adjustments */
  .main-container {
    margin: 10px !important;
    padding: 15px !important;
  }

  /* Title adjustments */
  .main-title {
    font-size: 1.75rem !important;
  }

  /* Section spacing */
  .form-section {
    padding: 15px !important;
    margin-bottom: 20px !important;
  }

  .section-legend {
    font-size: 0.95rem !important;
    padding: 10px 15px !important;
  }

  /* Input group - Stack vertically */
  .input-group {
    flex-direction: column !important;
    align-items: stretch !important;
    box-shadow: none !important;
  }

  .input-group-text {
    min-width: 100% !important;
    width: 100% !important;
    border-radius: 8px 8px 0 0 !important;
    padding: 10px 12px !important;
    font-size: 0.9rem !important;
    text-align: left !important;
  }

  .form-control {
    border-radius: 0 0 8px 8px !important;
    min-height: 44px !important;
    font-size: 16px !important;
  }

  /* Radio group - Stack vertically */
  .radio-group {
    flex-direction: column !important;
    gap: 10px !important;
  }

  /* Button adjustments */
  .btn {
    font-size: 0.85rem !important;
    padding: 10px 16px !important;
    white-space: normal !important;
    min-height: 44px !important;
  }

  .generate-btn {
    font-size: 1rem !important;
    padding: 12px 20px !important;
    min-width: 100% !important;
  }

  /* Paragraph controls - Stack/wrap better */
  .paragraph-controls {
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .paragraph-controls button {
    flex: 1 1 calc(50% - 4px) !important;
    min-width: 120px !important;
    font-size: 0.85rem !important;
  }

  /* Paragraph containers - Reduce indentation */
  .paragraph-container {
    padding: 12px !important;
    margin-bottom: 15px !important;
  }

  .paragraph-container[data-level="1"] {
    margin-left: 0px !important;
  }

  .paragraph-container[data-level="2"] {
    margin-left: 15px !important;
  }

  .paragraph-container[data-level="3"] {
    margin-left: 30px !important;
  }

  .paragraph-container[data-level="4"] {
    margin-left: 45px !important;
  }

  .paragraph-container[data-level="5"],
  .paragraph-container[data-level="6"],
  .paragraph-container[data-level="7"],
  .paragraph-container[data-level="8"] {
    margin-left: 60px !important;
  }

  /* Paragraph item adjustments */
  .paragraph-item {
    padding: 12px !important;
  }

  /* Smart paragraph buttons */
  .btn-smart-main,
  .btn-smart-sub,
  .btn-smart-same,
  .btn-smart-up {
    font-size: 0.75rem !important;
    padding: 6px 10px !important;
    margin-right: 4px !important;
    margin-bottom: 6px !important;
    min-width: 80px !important;
  }

  /* Document type selector grid */
  div[style*="gridTemplateColumns"] {
    grid-template-columns: 1fr !important;
    gap: 15px !important;
  }

  /* Saved letters section */
  .saved-letter-item {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }

  .saved-letter-actions {
    width: 100% !important;
    display: flex !important;
    gap: 8px !important;
  }

  .saved-letter-actions button {
    flex: 1 !important;
    margin-left: 0 !important;
  }

  /* Textarea adjustments */
  textarea.form-control {
    min-height: 100px !important;
    font-size: 16px !important;
  }

  /* Validation messages */
  .validation-summary {
    padding: 12px !important;
    font-size: 0.85rem !important;
  }

  .structure-error,
  .acronym-error {
    font-size: 0.8rem !important;
    padding: 8px 10px !important;
  }

  /* Distribution entries */
  .distribution-entry {
    flex-direction: column !important;
    gap: 10px !important;
  }

  /* Reference and enclosure inputs */
  .reference-input,
  .enclosure-input {
    width: 100% !important;
  }

  /* Voice input controls */
  .voice-controls {
    flex-direction: column !important;
    gap: 10px !important;
  }

  .voice-controls button {
    width: 100% !important;
  }

  /* Tab stops and indentation helpers */
  .paragraph-level-badge {
    font-size: 0.7rem !important;
    padding: 3px 6px !important;
  }

  .paragraph-number-preview {
    font-size: 0.95rem !important;
  }

  /* Header text on cards */
  h1, h2, h3, h4 {
    font-size: calc(100% - 0.2rem) !important;
  }

  /* Combobox dropdowns */
  .combobox-trigger {
    font-size: 0.9rem !important;
  }

  /* Icon spacing */
  i[class*="fa-"] {
    margin-right: 6px !important;
  }

  /* Modal/dialog adjustments if present */
  .modal-content,
  .dialog-content {
    width: 95vw !important;
    max-width: 95vw !important;
    margin: 10px !important;
  }

  /* Prevent horizontal scroll */
  body {
    overflow-x: hidden !important;
  }

  .main-container,
  .form-section,
  .input-group {
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  /* Touch target sizes (minimum 44x44px) */
  button,
  input,
  select,
  textarea,
  a {
    min-height: 44px !important;
  }

  /* Reduce margins for better space usage */
  .mb-4 {
    margin-bottom: 1rem !important;
  }

  .mt-4 {
    margin-top: 1rem !important;
  }
}

/* Extra small devices (phones in portrait, less than 576px) */
@media (max-width: 576px) {
  .main-container {
    margin: 5px !important;
    padding: 10px !important;
    border-radius: 15px !important;
  }

  .main-title {
    font-size: 1.5rem !important;
  }

  .section-legend {
    font-size: 0.85rem !important;
    padding: 8px 12px !important;
  }

  .btn {
    font-size: 0.8rem !important;
    padding: 8px 12px !important;
  }

  .paragraph-controls button {
    flex: 1 1 100% !important;
    min-width: 100% !important;
  }

  /* Stack all paragraph control buttons vertically on very small screens */
  .btn-smart-main,
  .btn-smart-sub,
  .btn-smart-same,
  .btn-smart-up {
    width: 100% !important;
    margin-right: 0 !important;
  }
}

/* Tablet/Medium devices (576px to 768px) */
@media (min-width: 576px) and (max-width: 768px) {
  .paragraph-controls button {
    flex: 1 1 calc(33.333% - 6px) !important;
  }
}
      `}</style>

      <div className="marine-gradient-bg">
        <div className="container mx-auto px-4 py-8">
    {/* Header Title */}
    <div className="form-section" style={{ textAlign: 'center', marginBottom: '30px' }}>
      <h1 className="text-4xl font-bold text-center mb-2 text-black font-display tracking-wide">
        Marine Corps Directives Formatter
      </h1>
      <p className="text-center text-gray-600 text-sm mb-1">by Semper Admin</p>
      <p className="text-center text-gray-600 text-sm mb-0">Last Updated: 20251013</p>
    </div>

    {/* Document Type Selection - Side by Side */}
    <div className="form-section">
      <div className="section-legend">
        <i className="fas fa-file-alt" style={{ marginRight: '8px' }}></i>
        Choose Document Type
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {/* Orders Button - LEFT */}
        <button
          type="button"
          className={`btn ${
            formData.documentType === 'mco'
              ? 'btn-danger'
              : 'btn-outline-secondary'
          }`}
          onClick={() => setFormData(prev => ({ ...prev, documentType: 'mco' }))}
          style={{
            padding: '20px',
            height: 'auto',
            textAlign: 'left',
            border: formData.documentType === 'mco' ? '3px solid #dc3545' : '2px solid #dee2e6',
            borderRadius: '12px',
            transition: 'all 0.3s ease',
            background: formData.documentType === 'mco' 
              ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' 
              : 'white',
            color: formData.documentType === 'mco' ? 'white' : '#495057',
            boxShadow: formData.documentType === 'mco' 
              ? '0 8px 25px rgba(220, 53, 69, 0.3)' 
              : '0 2px 10px rgba(0, 0, 0, 0.1)',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.9, minWidth: '60px' }}>📋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Orders
                {formData.documentType === 'mco' && (
                  <i className="fas fa-check-circle" style={{ color: 'white', marginLeft: 'auto' }}></i>
                )}
              </div>
              <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '10px', lineHeight: '1.4' }}>
                Marine Corps Order - Permanent policy directives with long-term applicability.
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                → Permanent Policy
              </div>
            </div>
          </div>
        </button>

        {/* Bulletins Button - RIGHT */}
        <button
          type="button"
          className={`btn ${
            formData.documentType === 'mcbul' 
              ? 'btn-warning' 
              : 'btn-outline-secondary'
          }`}
          onClick={() => setFormData(prev => ({ ...prev, documentType: 'mcbul' }))}
          style={{
            padding: '20px',
            height: 'auto',
            textAlign: 'left',
            border: formData.documentType === 'mcbul' ? '3px solid #ffc107' : '2px solid #dee2e6',
            borderRadius: '12px',
            transition: 'all 0.3s ease',
            background: formData.documentType === 'mcbul' 
              ? 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' 
              : 'white',
            color: formData.documentType === 'mcbul' ? 'white' : '#495057',
            boxShadow: formData.documentType === 'mcbul' 
              ? '0 8px 25px rgba(255, 193, 7, 0.3)' 
              : '0 2px 10px rgba(0, 0, 0, 0.1)',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.9, minWidth: '60px' }}>📢</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Bulletins
                {formData.documentType === 'mcbul' && (
                  <i className="fas fa-check-circle" style={{ color: 'white', marginLeft: 'auto' }}></i>
                )}
              </div>
              <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '10px', lineHeight: '1.4' }}>
                Marine Corps Bulletin - Temporary guidance with automatic cancellation dates.
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic' }}>
                → Temporary Guidance
              </div>
            </div>
          </div>
        </button>
      </div>
{/* Letterhead Format & Body Font - 2x2 Grid */}
    <div className="form-section">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* LEFT COLUMN - Letterhead Format */}
        <div>
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            marginBottom: '12px',
            color: '#374151',
            display: 'flex',
            alignItems: 'center'
          }}>
            <i className="fas fa-building" style={{ marginRight: '8px' }}></i>
            Letterhead Format
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* United States Marine Corps */}
            <button
              type="button"
              className={`btn ${formData.letterheadType === 'marine-corps' ? 'btn-danger' : 'btn-outline-secondary'}`}
              onClick={() => setFormData(prev => ({ ...prev, letterheadType: 'marine-corps' }))}
              style={{
                padding: '15px',
                textAlign: 'left',
                border: formData.letterheadType === 'marine-corps' ? '3px solid #C41E3A' : '2px solid #dee2e6',
                borderRadius: '10px',
                background: formData.letterheadType === 'marine-corps' ? 'linear-gradient(135deg, #C41E3A 0%, #8B0000 100%)' : 'white',
                color: formData.letterheadType === 'marine-corps' ? 'white' : '#495057',
                width: '100%'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                United States Marine Corps
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                3-line unit format • Black text
              </div>
            </button>
                    
            {/* Department of the Navy */}
            <button
              type="button"
              className={`btn ${formData.letterheadType === 'navy' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFormData(prev => ({ ...prev, letterheadType: 'navy' }))}
              style={{
                padding: '15px',
                textAlign: 'left',
                border: formData.letterheadType === 'navy' ? '3px solid #002D72' : '2px solid #dee2e6',
                borderRadius: '10px',
                background: formData.letterheadType === 'navy' ? 'linear-gradient(135deg, #002D72 0%, #0047AB 100%)' : 'white',
                color: formData.letterheadType === 'navy' ? 'white' : '#495057',
                width: '100%'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                Department of the Navy
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                4-line HQMC format • Blue text
              </div>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN - Body Font */}
        <div>
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            marginBottom: '12px',
            color: '#374151',
            display: 'flex',
            alignItems: 'center'
          }}>
            <i className="fas fa-font" style={{ marginRight: '8px' }}></i>
            Body Font
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Times New Roman */}
            <button
              type="button"
              className={`btn ${formData.bodyFont === 'times' ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setFormData(prev => ({ ...prev, bodyFont: 'times' }))}
              style={{
                padding: '15px',
                textAlign: 'left',
                border: formData.bodyFont === 'times' ? '3px solid #28a745' : '2px solid #dee2e6',
                borderRadius: '10px',
                background: formData.bodyFont === 'times' ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 'white',
                color: formData.bodyFont === 'times' ? 'white' : '#495057',
                width: '100%'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontFamily: 'Times New Roman, serif' }}>
                Times New Roman
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                Standard serif font • Traditional
              </div>
            </button>

            {/* Courier New */}
            <button
              type="button"
              className={`btn ${formData.bodyFont === 'courier' ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setFormData(prev => ({ ...prev, bodyFont: 'courier' }))}
              style={{
                padding: '15px',
                textAlign: 'left',
                border: formData.bodyFont === 'courier' ? '3px solid #28a745' : '2px solid #dee2e6',
                borderRadius: '10px',
                background: formData.bodyFont === 'courier' ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 'white',
                color: formData.bodyFont === 'courier' ? 'white' : '#495057',
                width: '100%'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontFamily: 'Courier New, monospace' }}>
                Courier New
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                Monospaced font • Typewriter style
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
    


    {/* Letterhead and Font Card */}

          {/* MCBul-Specific Fields */}
          {(formData.documentType === 'mcbul') && (
             <div className="form-section">
                <div className="section-legend" style={{ background: 'linear-gradient(45deg, #dc2626, #ef4444)', border: '2px solid rgba(239, 68, 68, 0.3)' }}>
                    <i className="fas fa-calendar-times" style={{ marginRight: '8px' }}></i>
                    Bulletin Cancellation Details
                </div>

                {/* Cancellation Type Selector */}
                <div className="input-group">
                    <span className="input-group-text" style={{ background: 'linear-gradient(45deg, #dc2626, #ef4444)' }}>
                        <i className="fas fa-list-ul" style={{ marginRight: '8px' }}></i>
                        Cancellation Type:
                    </span>
                    <select
                        className="form-control"
                        value={formData.cancellationType || 'contingent'}
                        onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            cancellationType: e.target.value as 'contingent' | 'fixed',
                            // Clear contingency description if switching to fixed
                            cancellationContingency: e.target.value === 'fixed' ? '' : prev.cancellationContingency
                        }))}
                        required
                    >
                        <option value="contingent">Contingent (FRP - For Record Purposes)</option>
                        <option value="fixed">Fixed Date</option>
                    </select>
                </div>

                {/* Cancellation Date Input */}
                <div className="input-group">
                    <span className="input-group-text" style={{ background: 'linear-gradient(45deg, #dc2626, #ef4444)' }}>
                        <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                        Cancellation Date:
                    </span>
                    <input 
                        className="form-control"
                        type="text" 
                        placeholder={formData.cancellationType === 'contingent' ? "e.g., Oct 2025" : "e.g., Oct 2025"}
                        value={formData.cancellationDate || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, cancellationDate: parseAndFormatDate(e.target.value) }))}
                        required
                    />
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#fef3c7',
                  borderLeft: '4px solid #f59e0b',
                  color: '#92400e',
                  fontSize: '0.875rem',
                  borderRadius: '0 0.5rem 0.5rem 0'
                }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                  Bulletin cancels on the <strong>last day</strong> of the specified month.
                  Format: <strong>MMM YYYY</strong> (e.g., Oct 2025)
                </div>

                {/* Conditional Contingency Description - Only show for contingent type */}
                {formData.cancellationType === 'contingent' && (
                <>
                <div className="input-group">
                    <span className="input-group-text" style={{ background: 'linear-gradient(45deg, #dc2626, #ef4444)' }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                        Contingency Condition:
                    </span>
                    <textarea 
                        className="form-control"
                        rows={3}
                        placeholder="Describe the contingency that will trigger early cancellation (e.g., This Bulletin is canceled when incorporated in MCO 5200.1)"
                            value={formData.cancellationContingency || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, cancellationContingency: e.target.value }))}
                            style={{ minHeight: '80px' }}
                        />
                    </div>
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#dbeafe',
                      borderLeft: '4px solid #3b82f6',
                      color: '#1e40af',
                      fontSize: '0.875rem',
                      borderRadius: '0 0.5rem 0.5rem 0'
                    }}>
                      <i className="fas fa-lightbulb" style={{ marginRight: '0.5rem' }}></i>
                      <strong>Contingency Note:</strong> This condition allows the bulletin to be canceled early
                      once the event occurs, without waiting for the cancellation date. This text will appear
                      as the <strong>final paragraph</strong> of your bulletin.
                    </div>
                    </>
                    
                )}
                  
                {/* Information Box for MCBul Cancellation */}
                <div style={{
                   marginTop: '1rem',
                   padding: '0.75rem',
                   backgroundColor: '#fef2f2',
                   borderLeft: '4px solid #dc2626',
                   color: '#dc2626',
                   borderRadius: '0 0.5rem 0.5rem 0'
                 }}>
                    <div style={{ display: 'flex' }}>
                        <div style={{ paddingTop: '0.25rem' }}>
                            <i className="fas fa-info-circle" style={{ fontSize: '1.125rem', marginRight: '0.5rem' }}></i>
                        </div>
                        <div>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>Bulletin Cancellation Requirements</p>
                            <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                                {formData.cancellationType === 'contingent' 
                                    ? "Contingent cancellations use 'FRP' (For Ready Personnel) and require a detailed description of the contingency condition."
                                    : "Fixed date cancellations specify an exact date when the bulletin will be cancelled."
                                }
                            </p>
                            <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                                The cancellation date will appear in the upper right margin of the generated document.
                            </p>
                        </div>
                    </div>
                </div>
             </div>
          )}


         {/* Unit Information Section */}
         <div className="form-section">
           <div className="section-legend">
             <i className="fas fa-building" style={{ marginRight: '8px' }}></i>
             Unit Information
           </div>

            <div className="input-group">
                <span className="input-group-text" style={{ minWidth: '150px' }}>
                  <i className="fas fa-search" style={{ marginRight: '8px' }}></i>
                  Find Unit:
                </span>
                <Combobox
                  items={unitComboboxData}
                  onSelect={handleUnitSelect}
                  placeholder="Search for a unit..."
                  searchMessage="No unit found."
                  inputPlaceholder="Search units by name, RUC, MCC..."
                />
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={clearUnitInfo}
                  title="Clear Unit Information"
                  style={{ borderRadius: '0 8px 8px 0' }}
                >
                  <i className="fas fa-times"></i>
                </button>
            </div>
            
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-building" style={{ marginRight: '8px' }}></i>
                Unit Name:
              </span>
              <input 
                className="form-control" 
                type="text" 
                placeholder="e.g., HEADQUARTERS, 1ST MARINE DIVISION"
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
                placeholder="e.g., BOX 5555"
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
                placeholder="e.g., CAMP PENDLETON, CA 92055-5000"
                value={formData.line3}
                onChange={(e) => setFormData(prev => ({ ...prev, line3: autoUppercase(e.target.value) }))}
              />
            </div>
          </div>

          {/* Required Information */}
          <div className="form-section">
            <div className="section-legend">
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
              Required Information
            </div>

            {/* ✅… NEW: Designation Line Input - Added at the top */}
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-file-alt" style={{ marginRight: '8px' }}></i>
                Designation Line:
              </span>
              <input 
                className="form-control"
                type="text" 
                placeholder="e.g., MARINE CORPS ORDER 5215.1K"
                value={formData.designationLine || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, designationLine: autoUppercase(e.target.value) }))}
              />
            </div>


            
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-hashtag" style={{ marginRight: '8px' }}></i>
                SSIC:
              </span>
              <input 
                className="form-control"
                type="text" 
                placeholder="e.g., 5215.1K, 1000.5, 5200R.15"
                value={formData.ssic}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, ssic: value }));
                }}
              />
            </div>
            
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-code" style={{ marginRight: '8px' }}></i>
                Originator's Code:
              </span>
              <input 
                className="form-control" 
                type="text" 
                placeholder="e.g., G-1"
                value={formData.originatorCode}
                onChange={(e) => setFormData(prev => ({ ...prev, originatorCode: autoUppercase(e.target.value) }))}
              />
            </div>
            

            
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-user" style={{ marginRight: '8px' }}></i>
                From:
              </span>
              <input 
                className={`form-control ${validation.from.isValid ? 'is-valid' : formData.from && !validation.from.isValid ? 'is-invalid' : ''}`}
                type="text" 
                placeholder="Commanding Officer, Marine Corps Base or Secretary of the Navy"
                value={formData.from}
                onChange={(e) => setFormData(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            {validation.from.message && (
              <div className={`feedback-message ${validation.from.isValid ? 'text-success' : 'text-warning'}`}>
                <i className={`fas ${validation.from.isValid ? 'fa-check' : 'fa-exclamation-triangle'}`} style={{ marginRight: '4px' }}></i>
                {validation.from.message}
              </div>
            )}

            {/* ✅… REMOVED: To input field and its validation */}
            
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
                Subject:
              </span>
              <input 
                className={`form-control ${validation.subj.isValid ? 'is-valid' : formData.subj && !validation.subj.isValid ? 'is-invalid' : ''}`}
                type="text" 
                placeholder="SUBJECT LINE IN ALL CAPS"
                value={formData.subj}
                onChange={(e) => {
                  const value = autoUppercase(e.target.value);
                  setFormData(prev => ({ ...prev, subj: value }));
                  validateSubject(value);
                }}
              />
            </div>
            {validation.subj.message && (
              <div className={`feedback-message ${validation.subj.isValid ? 'text-success' : 'text-warning'}`}>
                <i className={`fas ${validation.subj.isValid ? 'fa-check' : 'fa-exclamation-triangle'}`} style={{ marginRight: '4px' }}></i>
                {validation.subj.message}
              </div>
            )}
            
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-share-alt" style={{ marginRight: '8px' }}></i>
                Distribution Statement:
              </span>
              <select
                className="form-control"
                value={formData.distributionStatement.code}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  distributionStatement: {
                    code: e.target.value as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X',
                    reason: '',
                    dateOfDetermination: '',
                    originatingCommand: ''
                  }
                }))}
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
              marginBottom: '1rem',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '6px'
            }}>
              <strong>Full Statement:</strong><br/>
              {DISTRIBUTION_STATEMENTS[formData.distributionStatement.code].text}
            </div>
            
            {DISTRIBUTION_STATEMENTS[formData.distributionStatement.code].requiresFillIns && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  color: '#dc3545'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                  Required Fill-in Information:
                </div>
                
                {DISTRIBUTION_STATEMENTS[formData.distributionStatement.code].requiresFillIns && 
                 'fillInFields' in DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] &&
                 (DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] as any).fillInFields?.includes('reason') && (
                  <div className="input-group" style={{ marginBottom: '8px' }}>
                    <span className="input-group-text">
                      <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                      Reason for Restriction:
                    </span>
                    <select
                      className="form-control"
                      value={formData.distributionStatement.reason || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        distributionStatement: {
                          ...prev.distributionStatement,
                          reason: e.target.value
                        }
                      }))}
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
                    <span className="input-group-text">
                      <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
                      Custom Reason:
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter custom reason for restriction"
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
                )}
                
                {DISTRIBUTION_STATEMENTS[formData.distributionStatement.code].requiresFillIns && 
                 'fillInFields' in DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] &&
                 (DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] as any).fillInFields?.includes('dateOfDetermination') && (
                  <div className="input-group" style={{ marginBottom: '8px' }}>
                    <span className="input-group-text">
                      <i className="fas fa-calendar" style={{ marginRight: '8px' }}></i>
                      Date of Determination:
                    </span>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.distributionStatement.dateOfDetermination || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        distributionStatement: {
                          ...prev.distributionStatement,
                          dateOfDetermination: e.target.value
                        }
                      }))}
                    />
                  </div>
                )}
                
                {DISTRIBUTION_STATEMENTS[formData.distributionStatement.code].requiresFillIns && 
                 'fillInFields' in DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] &&
                 (DISTRIBUTION_STATEMENTS[formData.distributionStatement.code] as any).fillInFields?.includes('originatingCommand') && (
                  <div className="input-group" style={{ marginBottom: '8px' }}>
                    <span className="input-group-text">
                      <i className="fas fa-building" style={{ marginRight: '8px' }}></i>
                      Originating Command:
                    </span>
                    <input
                      type="text"
                      className="form-control"
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
                )}
              </div>
            )}
          </div>

          {/* Optional Items Section */}
          <div className="form-section">
            <div className="section-legend">
              <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i>
              Optional Items
            </div>
        
            
            
            <Card style={{ marginBottom: '1.5rem' }}>
              <CardHeader>
                <CardTitle style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
                  References
                </CardTitle>
              </CardHeader>
              <CardContent className="radio-group">
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="ifRef"
                      value="yes"
                      checked={showRef}
                      onChange={() => setShowRef(true)}
                      style={{ marginRight: '8px', transform: 'scale(1.25)' }}
                    />
                    <span style={{ fontSize: '1.1rem' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="ifRef"
                      value="no"
                      checked={!showRef}
                      onChange={() => { setShowRef(false); setReferences(['']); }}
                      style={{ marginRight: '8px', transform: 'scale(1.25)' }}
                    />
                    <span style={{ fontSize: '1.1rem' }}>No</span>
                  </label>
              </CardContent>

                {showRef && (
                  <>
                    {/* ⭐ PROGRESS BAR - ADD THIS ENTIRE SECTION ⭐ */}
                    {(() => {
                      const nonEmptyCount = references.filter(ref => ref.trim().length > 0).length;
                      const MAX_REFERENCES_WARNING = 11;
                      const MAX_REFERENCES_ERROR = 13;
                      
                      if (nonEmptyCount === 0) return null;
                      
                      return (
                        <div style={{
                          padding: '16px',
                          backgroundColor: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#fee2e2' : 
                                         nonEmptyCount >= MAX_REFERENCES_WARNING ? '#fef3c7' : '#d1fae5',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          border: `3px solid ${nonEmptyCount >= MAX_REFERENCES_ERROR ? '#dc2626' : 
                                              nonEmptyCount >= MAX_REFERENCES_WARNING ? '#fbbf24' : '#10b981'}`,
                          boxShadow: nonEmptyCount >= MAX_REFERENCES_ERROR ? '0 4px 12px rgba(220, 38, 38, 0.3)' :
                                    nonEmptyCount >= MAX_REFERENCES_WARNING ? '0 4px 12px rgba(251, 191, 36, 0.3)' :
                                    '0 4px 12px rgba(16, 185, 129, 0.2)'
                        }}>
                          {/* Header with Count */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '12px' 
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className={`fas ${
                                nonEmptyCount >= MAX_REFERENCES_ERROR ? 'fa-exclamation-circle' :
                                nonEmptyCount >= MAX_REFERENCES_WARNING ? 'fa-exclamation-triangle' :
                                'fa-check-circle'
                              }`} style={{ 
                                fontSize: '20px',
                                color: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#dc2626' :
                                       nonEmptyCount >= MAX_REFERENCES_WARNING ? '#f59e0b' :
                                       '#10b981'
                              }}></i>
                              <span style={{ 
                                fontWeight: '700', 
                                fontSize: '18px',
                                color: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#991b1b' :
                                       nonEmptyCount >= MAX_REFERENCES_WARNING ? '#92400e' :
                                       '#065f46'
                              }}>
                                References Used: {nonEmptyCount}/13
                              </span>
                            </div>
                            
                            <span style={{ 
                              fontSize: '14px', 
                              fontWeight: '600',
                              color: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#991b1b' :
                                     nonEmptyCount >= MAX_REFERENCES_WARNING ? '#92400e' :
                                     '#065f46'
                            }}>
                              {nonEmptyCount >= MAX_REFERENCES_ERROR ? '🚫 Maximum Reached' : 
                               nonEmptyCount >= MAX_REFERENCES_WARNING ? '⚠️ Approaching Limit' : 
                               '✅ Good Status'}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div style={{ 
                            width: '100%', 
                            height: '12px', 
                            backgroundColor: '#e5e7eb',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            marginBottom: '8px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            <div style={{
                              width: `${(nonEmptyCount / MAX_REFERENCES_ERROR) * 100}%`,
                              height: '100%',
                              backgroundColor: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#dc2626' : 
                                             nonEmptyCount >= MAX_REFERENCES_WARNING ? '#fbbf24' : 
                                             '#10b981',
                              transition: 'all 0.3s ease',
                              boxShadow: nonEmptyCount >= MAX_REFERENCES_ERROR ? '0 0 10px rgba(220, 38, 38, 0.5)' :
                                        nonEmptyCount >= MAX_REFERENCES_WARNING ? '0 0 10px rgba(251, 191, 36, 0.5)' :
                                        '0 0 10px rgba(16, 185, 129, 0.3)'
                            }}></div>
                          </div>
                          
                          {/* Status Message */}
                          <div style={{ 
                            fontSize: '13px',
                            fontWeight: '500',
                            color: nonEmptyCount >= MAX_REFERENCES_ERROR ? '#991b1b' :
                                   nonEmptyCount >= MAX_REFERENCES_WARNING ? '#92400e' :
                                   '#065f46',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {nonEmptyCount >= MAX_REFERENCES_ERROR ? (
                              <>
                                <i className="fas fa-ban"></i>
                                <span>References at maximum capacity - may exceed ½ page limit</span>
                              </>
                            ) : nonEmptyCount >= MAX_REFERENCES_WARNING ? (
                              <>
                                <i className="fas fa-exclamation-triangle"></i>
                                <span>Approaching ½ page limit - consider consolidating references</span>
                              </>
                            ) : (
                              <>
                                <i className="fas fa-check"></i>
                                <span>References will comfortably fit on ½ page</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {/* ⭐ END OF PROGRESS BAR ⭐ */}
                    
                    <div className="dynamic-section">
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                        <i className="fas fa-bookmark" style={{ marginRight: '8px' }}></i>
                        Enter Reference(s):
                      </label>
                    {references.map((ref, index) => (
                      <div key={index} className="input-group" style={{ width: '100%', display: 'flex' }}>
                        <span className="input-group-text" style={{
                          minWidth: '60px',
                          justifyContent: 'center',
                          alignItems: 'center',
                          display: 'flex',
                          background: 'linear-gradient(135deg, #b8860b, #ffd700)',
                          color: 'white',
                          fontWeight: '600',
                          borderRadius: '8px 0 0 8px',
                          border: '2px solid #b8860b',
                          flexShrink: 0,
                          textAlign: 'center'
                        }}>
                          ({getReferenceLetter(index, formData.startingReferenceLevel)})
                        </span>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="📚 Enter reference information (e.g., NAVADMIN 123/24, OPNAVINST 5000.1)"
                          value={ref}
                          onChange={(e) => updateItem(index, e.target.value, setReferences)}
                          style={{
                            fontSize: '1rem',
                            padding: '12px 16px',
                            border: '2px solid #e0e0e0',
                            borderLeft: 'none',
                            borderRadius: '0',
                            transition: 'all 0.3s ease',
                            backgroundColor: '#fafafa',
                            flex: '1',
                            minWidth: '0'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#b8860b';
                            e.target.style.backgroundColor = '#fff';
                            e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e0e0e0';
                            e.target.style.backgroundColor = '#fafafa';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        {index === references.length - 1 ? (
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => {
                              const nonEmptyCount = references.filter(ref => ref.trim().length > 0).length;
                              if (nonEmptyCount >= 13) {
                                alert('Maximum of 13 references reached to ensure they fit on ½ page.');
                                return;
                              }
                              addItem(setReferences);
                            }}
                            disabled={references.filter(ref => ref.trim().length > 0).length >= 13}
                            style={{
                              borderRadius: '0 8px 8px 0',
                              flexShrink: 0,
                              background: references.filter(ref => ref.trim().length > 0).length >= 13 
                                ? 'linear-gradient(135deg, #6c757d, #495057)' 
                                : 'linear-gradient(135deg, #b8860b, #ffd700)',
                              border: references.filter(ref => ref.trim().length > 0).length >= 13 
                                ? '2px solid #6c757d' 
                                : '2px solid #b8860b',
                              color: 'white',
                              fontWeight: '600',
                              padding: '8px 16px',
                              transition: 'all 0.3s ease',
                              opacity: references.filter(ref => ref.trim().length > 0).length >= 13 ? 0.6 : 1,
                              cursor: references.filter(ref => ref.trim().length > 0).length >= 13 ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #ffd700, #b8860b)';
                              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #b8860b, #ffd700)';
                              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                            }}
                          >
                            <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                            {references.filter(ref => ref.trim().length > 0).length >= 13 ? 'Max Reached' : 'Add'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger"
                            type="button"
                            onClick={() => removeItem(index, setReferences)}
                            style={{
                              borderRadius: '0 8px 8px 0',
                              flexShrink: 0
                            }}
                          >
                            <i className="fas fa-trash" style={{ marginRight: '4px' }}></i>
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
              </>
            )}
            </Card>

            <Card style={{ marginBottom: '1.5rem' }}>
              <CardHeader>
                <CardTitle style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <i className="fas fa-paperclip" style={{ marginRight: '8px' }}></i>
                  Enclosures
                </CardTitle>
              </CardHeader>
              <CardContent className="radio-group">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="ifEncl"
                      value="yes"
                      checked={showEncl}
                      onChange={() => setShowEncl(true)}
                      style={{ marginRight: '8px', transform: 'scale(1.25)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '1.1rem', cursor: 'pointer' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="ifEncl"
                      value="no"
                      checked={!showEncl}
                      onChange={() => { setShowEncl(false); setEnclosures(['']); }}
                      style={{ marginRight: '8px', transform: 'scale(1.25)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '1.1rem', cursor: 'pointer' }}>No</span>
                  </label>
              </CardContent>  

                {showEncl && (
                  <div className="dynamic-section">
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                      <i className="fas fa-paperclip" style={{ marginRight: '8px' }}></i>
                      Enter Enclosure(s):
                    </label>
                    {enclosures.map((encl, index) => (
                      <div key={index} className="input-group" style={{ width: '100%', display: 'flex' }}>
                        <span className="input-group-text" style={{ 
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          fontWeight: 'bold',
                          borderColor: '#f59e0b',
                          minWidth: '60px',
                          justifyContent: 'center',
                          borderRadius: '8px 0 0 8px'
                        }}>
                          ({getEnclosureNumber(index, formData.startingEnclosureNumber)})
                        </span>
                        <input 
                          className="form-control" 
                          type="text" 
                          placeholder="🔗 Enter enclosure details (e.g., Training Certificate, Medical Records)"
                          value={encl}
                          onChange={(e) => {
                            const newEnclosures = [...enclosures];
                            newEnclosures[index] = e.target.value;
                            setEnclosures(newEnclosures);
                          }}
                          style={{
                            borderRadius: '0',
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}
                        />
                        {index === enclosures.length - 1 ? (
                          <button 
                            className="btn btn-primary"
                            type="button" 
                            onClick={() => setEnclosures([...enclosures, ''])}
                            style={{
                              borderRadius: '0 8px 8px 0',
                              flexShrink: 0
                            }}
                          >
                            <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                            Add
                          </button>
                        ) : (
                          <button 
                            className="btn btn-danger"
                            type="button" 
                            onClick={() => {
                              const newEnclosures = enclosures.filter((_, i) => i !== index);
                              setEnclosures(newEnclosures.length > 0 ? newEnclosures : ['']);
                            }}
                            style={{
                              borderRadius: '0 8px 8px 0',
                              flexShrink: 0
                            }}
                          >
                            <i className="fas fa-trash" style={{ marginRight: '4px' }}></i>
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </Card>
          </div>

          {/* Body Paragraphs Section */}
          <div className="form-section">
            <div className="section-legend">
              <i className="fas fa-paragraph" style={{ marginRight: '8px' }}></i>
              Body Paragraphs
            </div>
            
            {/* Voice Input Information */}
            <div style={{
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#1565c0', marginBottom: '8px' }}>
                <i className="fas fa-microphone" style={{ marginRight: '8px' }}></i>
                Voice Input Available
              </div>
              <div style={{ color: '#1565c0', fontSize: '0.9rem', lineHeight: '1.4' }}>
                • Click <strong>Voice Input</strong> on any paragraph to start dictating<br/>
                • Speak clearly and pause between sentences for best results<br/>
                • Click <strong>Stop Recording</strong> or the button again to finish<br/>
                • Works best in Chrome, Edge, and Safari browsers<br/>
                • Requires microphone permission - allow when prompted
              </div>
            </div>
            
            <div>
              {(() => {
                const numberingErrors = validateParagraphNumbering(paragraphs);
                if (numberingErrors.length > 0) {
                  return (
                    <div style={{
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffeaa7',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '8px' }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                        Paragraph Numbering Issues:
                      </div>
                      {numberingErrors.map((error, index) => (
                        <div key={index} style={{ color: '#856404', fontSize: '0.9rem' }}>
                          • {error}
                        </div>
                      ))}
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#6c757d' }}>
                        <strong>Rule:</strong> If there's a paragraph 1a, there must be a paragraph 1b; if there's a paragraph 1a(1), there must be a paragraph 1a(2), etc.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {paragraphs.map((paragraph, index) => {
                const citation = getUiCitation(paragraph, index, paragraphs);
                return (
                  <div 
                    key={paragraph.id} 
                    className='paragraph-container'
                    data-level={paragraph.level}
                  >
                    <div className="paragraph-header">
                      <div>
                        <span className="paragraph-level-badge">Level {paragraph.level} {citation}</span>
                        {paragraph.title && (
                          <span className="mandatory-title" style={{ 
                            marginLeft: '12px', 
                            fontWeight: 'bold', 
                            color: paragraph.isMandatory ? '#0066cc' : '#28a745',
                            fontSize: '0.9rem'
                          }}>
                            {paragraph.title}
                          </span>
                        )}
                      </div>
                      <div>
                        {index > 0 && (
                          <button 
                            className="btn btn-sm" 
                            style={{ background: '#f8f9fa', border: '1px solid #dee2e6', marginRight: '4px' }}
                            onClick={() => moveParagraphUp(paragraph.id)}
                            title="Move Up"
                          >
                            ↑
                          </button>
                        )}
                        <button 
                          className="btn btn-sm" 
                          style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}
                          onClick={() => moveParagraphDown(paragraph.id)} 
                          disabled={index === paragraphs.length - 1}
                          title="Move Down"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    
                    <textarea 
                      className="form-control" 
                      rows={4}
                      placeholder={getParagraphPlaceholder(paragraph, formData.documentType)}
                      value={paragraph.content}
                      onChange={(e) => updateParagraphContent(paragraph.id, e.target.value)}
                      style={{ marginBottom: '8px', flex: 1 }}
                      ref={(el) => {
                        if (el) {
                          el.dataset.paragraphId = paragraph.id.toString();
                        }
                      }}
                    />
                    
                    {/* Optional Admin & Logistics Subsections (MCO only) */}
                    {paragraph.title === 'Administration and Logistics' && formData.documentType === 'mco' && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '16px', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          marginBottom: '12px' 
                        }}>
                          <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i>
                          Optional Sub-sections (MCO only):
                        </div>
                        
                        {/* Add Buttons */}
                        {(!adminSubsections.recordsManagement.show || !adminSubsections.privacyAct.show) && (
                          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            {!adminSubsections.recordsManagement.show && (
                              <button
                                type="button"
                                onClick={addRecordsManagement}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <i className="fas fa-plus"></i>
                                Add Records Management
                              </button>
                            )}
                            
                            {!adminSubsections.privacyAct.show && (
                              <button
                                type="button"
                                onClick={addPrivacyAct}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <i className="fas fa-plus"></i>
                                Add Privacy Act Statement
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Records Management Subsection */}
                        {adminSubsections.recordsManagement.show && (
                          <div style={{ 
                            marginBottom: '16px', 
                            padding: '12px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '2px solid #10b981'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: '#10b981',
                                fontSize: '14px'
                              }}>
                                4{getSubsectionLetter('recordsManagement')}. <u>Records Management</u>
                              </div>
                              <button
                                type="button"
                                onClick={removeRecordsManagement}
                                style={{
                                  padding: '4px 12px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                <i className="fas fa-times"></i> Remove
                              </button>
                            </div>
                            <textarea
                              value={adminSubsections.recordsManagement.content}
                              onChange={(e) => setAdminSubsections(prev => ({
                                ...prev,
                                recordsManagement: { ...prev.recordsManagement, content: e.target.value }
                              }))}
                              style={{
                                width: '100%',
                                minHeight: '80px',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Privacy Act Subsection */}
                        {adminSubsections.privacyAct.show && (
                          <div style={{ 
                            marginBottom: '16px', 
                            padding: '12px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '2px solid #3b82f6'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                color: '#3b82f6',
                                fontSize: '14px'
                              }}>
                                4{getSubsectionLetter('privacyAct')}. <u>Privacy Act Statement</u>
                              </div>
                              <button
                                type="button"
                                onClick={removePrivacyAct}
                                style={{
                                  padding: '4px 12px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                <i className="fas fa-times"></i> Remove
                              </button>
                            </div>
                            <textarea
                              value={adminSubsections.privacyAct.content}
                              onChange={(e) => setAdminSubsections(prev => ({
                                ...prev,
                                privacyAct: { ...prev.privacyAct, content: e.target.value }
                              }))}
                              style={{
                                width: '100%',
                                minHeight: '80px',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {/* END OF ADDED CODE */}
                    
                    {/* Voice Input and Underline buttons */}
                    <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      {/* Voice Input Button */}
                      <button 
                        className="btn btn-sm" 
                        style={{ 
                          background: isListening && currentListeningParagraph === paragraph.id ? '#dc3545' : '#28a745', 
                          border: `1px solid ${isListening && currentListeningParagraph === paragraph.id ? '#dc3545' : '#28a745'}`, 
                          color: 'white',
                          fontSize: '0.85rem',
                          minWidth: '120px',
                          animation: isListening && currentListeningParagraph === paragraph.id ? 'pulse 1.5s infinite' : 'none'
                        }}
                        onClick={() => startVoiceInput(paragraph.id)}
                        title={isListening && currentListeningParagraph === paragraph.id ? 'Click to stop recording' : 'Click to start voice input'}
                      >
                        <i className={`fas ${isListening && currentListeningParagraph === paragraph.id ? 'fa-stop' : 'fa-microphone'}`} style={{ marginRight: '6px' }}></i>
                        {isListening && currentListeningParagraph === paragraph.id ? 'Stop Recording' : 'Voice Input'}
                      </button>
                      
                      {/* Clear Content Button */}
                      <button 
                        className="btn btn-sm" 
                        style={{ 
                          background: '#ffc107', 
                          border: '1px solid #ffc107', 
                          color: '#000',
                          fontSize: '0.85rem'
                        }}
                        onClick={() => clearParagraphContent(paragraph.id)}
                        title="Clear paragraph content"
                        disabled={!paragraph.content.trim()}
                      >
                        <i className="fas fa-eraser" style={{ marginRight: '6px' }}></i>
                        Clear
                      </button>
                      
                      {/* Underline Button */}
                      <button 
                        className="btn btn-sm" 
                        style={{ 
                          background: '#fff3cd', 
                          border: '1px solid #ffeaa7', 
                          color: '#856404',
                          fontSize: '0.85rem'
                        }}
                        onClick={() => {
                          const textarea = document.querySelector(`textarea[data-paragraph-id="${paragraph.id}"]`) as HTMLTextAreaElement;
                          if (textarea) {
                            handleUnderlineText(paragraph.id, textarea);
                          }
                        }}
                        title="Underline selected text"
                      >
                        <u>U</u> Underline
                      </button>
                      
                      <div style={{ fontSize: '0.75rem', color: '#6c757d', flex: '1', minWidth: '200px' }}>
                        {isListening && currentListeningParagraph === paragraph.id ? (
                          <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                            <i className="fas fa-circle" style={{ marginRight: '4px', fontSize: '0.6rem' }}></i>
                            Listening... Speak now
                          </span>
                        ) : (
                          'Click Voice Input to dictate, select text and click Underline for formatting'
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <button 
                        className="btn btn-smart-main btn-sm" 
                        onClick={() => addParagraph('main', paragraph.id)}
                      >
                        Main Paragraph
                      </button>
                      {paragraph.level < 8 && (
                        <button 
                          className="btn btn-smart-sub btn-sm" 
                          onClick={() => addParagraph('sub', paragraph.id)}
                        >
                          Sub-paragraph
                        </button>
                      )}
                      
                      {paragraph.level > 1 && (
                        <button 
                          className="btn btn-smart-same btn-sm" 
                          onClick={() => addParagraph('same', paragraph.id)}
                        >
                          Same
                        </button>
                      )}
                      
                      {paragraph.level > 2 && (
                        <button 
                          className="btn btn-smart-up btn-sm" 
                          onClick={() => addParagraph('up', paragraph.id)}
                        >
                          One Up
                        </button>
                      )}
                      
                      {(!paragraph.isMandatory || paragraph.title === 'Cancellation') && paragraph.id !== 1 && (
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => removeParagraph(paragraph.id)}
                          style={{ marginLeft: '8px' }}
                          title="Delete paragraph"
                        >
                          Delete
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
            
          </div>

          {/* Closing Block Section */}
          <div className="form-section">
            <div className="section-legend">
              <i className="fas fa-signature" style={{ marginRight: '8px' }}></i>
              Closing Block
            </div>
            
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-pen-fancy" style={{ marginRight: '8px' }}></i>
                Signature Name:
              </span>
              <input 
                className="form-control" 
                type="text" 
                placeholder="F. M. LASTNAME"
                value={formData.sig}
                onChange={(e) => setFormData(prev => ({ ...prev, sig: autoUppercase(e.target.value) }))}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                <i className="fas fa-user-tie" style={{ marginRight: '8px' }}></i>
                Delegation of Signature Authority?
              </label>
              <div className="radio-group">
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="radio" 
                    name="ifDelegation" 
                    value="yes" 
                    checked={showDelegation}
                    onChange={() => setShowDelegation(true)}
                    style={{ marginRight: '8px', transform: 'scale(1.25)' }}
                  />
                  <span style={{ fontSize: '1.1rem' }}>Yes</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="radio" 
                    name="ifDelegation" 
                    value="no" 
                    checked={!showDelegation}
                    onChange={() => setShowDelegation(false)}
                    style={{ marginRight: '8px', transform: 'scale(1.25)' }}
                  />
                  <span style={{ fontSize: '1.1rem' }}>No</span>
                </label>
              </div>

              {showDelegation && (
                <div className="dynamic-section">
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                    <i className="fas fa-user-tie" style={{ marginRight: '8px' }}></i>
                    Delegation Authority Type:
                  </label>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <select 
                      className="form-control" 
                      style={{ marginBottom: '8px' }}
                      onChange={(e) => updateDelegationType(e.target.value)}
                    >
                      <option value="">Select delegation type...</option>
                      <option value="by_direction">By direction</option>
                      <option value="acting_commander">Acting for Commander/CO/OIC</option>
                      <option value="acting_title">Acting for Official by Title</option>
                      <option value="signing_for">Signing "For" an Absent Official</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                      <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
                      Delegation Text Lines:
                    </label>
                    
                    {formData.delegationText.map((line, index) => (
                      <div key={index} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                        <input 
                          className="form-control" 
                          type="text" 
                          placeholder={`Enter delegation text line ${index + 1} (e.g., By direction, Acting, etc.)`}
                          value={line}
                          onChange={(e) => updateDelegationLine(index, e.target.value)}
                          style={{ marginRight: '8px' }}
                        />
                        {formData.delegationText.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeDelegationLine(index)}
                            style={{ minWidth: '40px' }}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={addDelegationLine}
                      style={{ marginTop: '8px' }}
                    >
                      <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                      Add Delegation Line
                    </button>
                  </div>
                  
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    backgroundColor: 'rgba(23, 162, 184, 0.1)', 
                    borderRadius: '8px', 
                    border: '1px solid #17a2b8',
                    fontSize: '0.85rem'
                  }}>
                    <strong style={{ color: '#17a2b8' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '4px' }}></i>
                      Examples:
                    </strong>
                    <br />
                    <div style={{ marginTop: '4px', color: '#17a2b8' }}>
                      • <strong>By direction:</strong> For routine correspondence when specifically authorized<br />
                      • <strong>Acting:</strong> When temporarily succeeding to command or appointed to replace an official<br />
                      • <strong>Deputy Acting:</strong> For deputy positions acting in absence<br />
                    </div>
                  </div>
                </div>
              )}
            </div>
{/* ADD THIS ENTIRE PCN/COPY TO SECTION HERE */}
            <Card style={{ marginBottom: '1.5rem' }}>
              <CardHeader>
                <CardTitle style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <i className="fas fa-share-nodes" style={{ marginRight: '8px' }}></i>
                  Distribution Format (PCN / Copy To)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Yes/No Toggle */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="showPCNDistribution"
                      checked={showDistribution}
                      onChange={() => setShowDistribution(true)}
                      style={{ marginRight: '8px', transform: 'scale(1.2)' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>Yes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="showPCNDistribution"
                      checked={!showDistribution}
                      onChange={() => { 
                        setShowDistribution(false); 
                        setDistributionType('none');
                        setPcn('');
                        setCopyToList([]);
                      }}
                      style={{ marginRight: '8px', transform: 'scale(1.2)' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>No</span>
                  </label>
                </div>

                {showDistribution && (
                  <div>
                    {/* Distribution Type Selector */}
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      marginBottom: '16px'
                    }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#374151', 
                        marginBottom: '12px' 
                      }}>
                        Select Distribution Format:
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* PCN Only */}
                        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="distributionType"
                            value="pcn-only"
                            checked={distributionType === 'pcn-only'}
                            onChange={(e) => setDistributionType(e.target.value as any)}
                            style={{ marginRight: '8px', marginTop: '2px' }}
                          />
                          <div>
                            <div style={{ fontWeight: '500' }}>PCN Only</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '0px' }}>
                              Shows: DISTRIBUTION: PCN 10207570000
                            </div>
                          </div>
                        </label>
                        
                        {/* PCN with Copy To */}
                        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="distributionType"
                            value="pcn-with-copy"
                            checked={distributionType === 'pcn-with-copy'}
                            onChange={(e) => setDistributionType(e.target.value as any)}
                            style={{ marginRight: '8px', marginTop: '2px' }}
                          />
                          <div>
                            <div style={{ fontWeight: '500' }}>PCN with Copy To List</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '0px' }}>
                              Shows: DISTRIBUTION: PCN<br/>
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Copy to: 8145001 (2)
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* PCN Input Field */}
                    {(distributionType === 'pcn-only' || distributionType === 'pcn-with-copy') && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '8px', 
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Publication Control Number (PCN):
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={pcn}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (/^\d{0,11}$/.test(value))) {
                              setPcn(value);
                            }
                          }}
                          placeholder="Enter 11-digit PCN (e.g., 10207570000)"
                          maxLength={11}
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '16px',
                            letterSpacing: '1px'
                          }}
                        />
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          {pcn.length}/11 digits {pcn.length === 11 ? '✓' : ''}
                        </div>
                      </div>
                    )}

                    {/* Copy To List */}
                    {distributionType === 'pcn-with-copy' && (
                      <div style={{ 
                        padding: '16px', 
                        backgroundColor: '#f0fdf4', 
                        borderRadius: '8px',
                        border: '2px solid #86efac',
                        marginBottom: '16px'
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#166534', 
                          marginBottom: '12px' 
                        }}>
                          Copy to Distribution Codes:
                        </div>
                        
                        {copyToList.map((item, index) => (
                          <div key={index} style={{ 
                            display: 'flex', 
                            gap: '12px', 
                            marginBottom: '12px',
                            alignItems: 'center'
                          }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                className="form-control"
                                value={item.code}
                                onChange={(e) => updateCopyToCode(index, e.target.value)}
                                placeholder="7-digit code (e.g., 8145001)"
                                maxLength={7}
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                            <div style={{ width: '100px' }}>
                              <input
                                type="number"
                                className="form-control"
                                value={item.qty}
                                onChange={(e) => updateCopyToQty(index, parseInt(e.target.value) || 1)}
                                min={1}
                                max={99}
                                placeholder="Qty"
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCopyToEntry(index)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={addCopyToEntry}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <i className="fas fa-plus"></i>
                          Add Distribution Code
                        </button>
                        
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
                          Format: 7-digit code with quantity (1-99)
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* END OF NEW PCN/COPY TO SECTION */}

          </div>
          
          {/* Saved Letters Section */}
          {savedLetters.length > 0 && (
            <div className="form-section">
                <div className="section-legend">
                    <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                    Saved Versions
                </div>
                {savedLetters.map(letter => (
                    <div key={letter.id} className="saved-letter-item">
                        <div className="saved-letter-info">
                            <strong>{letter.subj || "Untitled"}</strong>
                            <small>Saved: {letter.savedAt}</small>
                        </div>
                        <div className="saved-letter-actions">
                            <button className="btn btn-sm btn-success" onClick={() => loadLetter(letter)}>
                              <i className="fas fa-upload" style={{ marginRight: '4px' }}></i>
                              Load
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          )}



          {/* Generate Button */}
          <div style={{ textAlign: 'center' }}>
            <button 
              className="generate-btn" 
              onClick={generateDocument} 
              disabled={isGenerating}
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
          </div>

          {/* Footer */}
          <div style={{ 
            marginTop: '32px', 
            textAlign: 'center', 
            fontSize: '0.875rem', 
            color: '#6c757d' 
          }}>
            <p>
              <i className="fas fa-shield-alt" style={{ marginRight: '4px' }}></i>
              DoD Seal automatically included • Format compliant with SECNAV M-5216.5
            </p>
            <p style={{ marginTop: '8px' }}>
              <a href="https://linktr.ee/semperadmin" target="_blank" rel="noopener noreferrer" style={{ color: '#b8860b', textDecoration: 'none' }}>
                Connect with Semper Admin
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}