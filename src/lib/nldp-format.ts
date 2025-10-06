/**
 * NLDP (Naval Letter Data Package) Format Specification
 * 
 * A standardized format for sharing Marine Corps Directive data between applications
 * Uses .nldp extension with JSON structure for broad compatibility
 */

export interface NLDPMetadata {
  /** Package creation timestamp */
  createdAt: string;
  /** Format version for compatibility */
  formatVersion: string;
  /** Application that created the package */
  createdBy: string;
  /** Optional author information */
  author?: {
    name?: string;
    unit?: string;
    email?: string;
  };
  /** Package description */
  package?: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

export interface NLDPDataIntegrity {
  /** SHA-256 hash of the data section for integrity verification */
  dataHash: string;
  /** CRC32 checksum for additional verification */
  crc32: string;
  /** Number of records/items in the package */
  recordCount: number;
}

export interface NLDPFormData {
  documentType: string;
  ssic_code?: string;
  consecutive_point?: number;
  revision_suffix?: string;
  sponsor_code?: string;
  date_signed?: string;
  subj?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  from?: string;
  to?: string;
  sig?: string;
  delegationText?: string;
  cancellationDate?: string;
  basicDirectiveReference?: string;
  changeNumber?: string;
  pageReplacements?: Array<{
    newPages: string;
    replacesPages: string;
  }>;
  distributionStatement?: {
    code: string;
    reason?: string;
    dateOfDetermination?: string;
    originatingCommand?: string;
  };
  [key: string]: any; // Allow additional fields
}

export interface NLDPParagraph {
  id: number;
  level: number;
  content: string;
  isMandatory?: boolean;
  title?: string;
  acronymError?: string;
}

export interface NLDPReference {
  text: string;
  order?: number;
}

export interface NLDPEnclosure {
  text: string;
  order?: number;
}

export interface NLDPVia {
  text: string;
  order?: number;
}

export interface NLDPCopyTo {
  text: string;
  order?: number;
}

export interface NLDPData {
  formData: NLDPFormData;
  paragraphs: NLDPParagraph[];
  references: NLDPReference[];
  enclosures: NLDPEnclosure[];
  vias: NLDPVia[];
  copyTos: NLDPCopyTo[];
  /** Additional metadata about the directive */
  directiveMetadata?: {
    estimatedPageCount?: number;
    lastModified?: string;
    status?: 'draft' | 'review' | 'final';
  };
}

export interface NLDPFile {
  /** File format identifier */
  format: 'NLDP';
  /** Format version */
  version: '1.0';
  /** Package metadata */
  metadata: NLDPMetadata;
  /** Data integrity verification */
  integrity: NLDPDataIntegrity;
  /** The actual directive data */
  data: NLDPData;
}

// Export configuration interface
export interface NLDPExportConfig {
  /** Include personal information in export */
  includePersonalInfo?: boolean;
  /** Author information */
  author?: {
    name?: string;
    unit?: string;
    email?: string;
  };
  /** Package information */
  package?: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

// Import result interface  
export interface NLDPImportResult {
  success: boolean;
  data?: NLDPData;
  error?: string;
  warnings?: string[];
  metadata?: NLDPMetadata;
}

// Validation interfaces
export interface NLDPValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Constants
export const NLDP_CONSTANTS = {
  FORMAT_NAME: 'NLDP',
  CURRENT_VERSION: '1.0',
  FILE_EXTENSION: '.nldp',
  MIME_TYPE: 'application/json',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_VERSIONS: ['1.0'],
  CREATOR_APP: 'Marine Corps Directives Formatter'
} as const;