'use client';

import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, Header, ImageRun, convertInchesToTwip, VerticalPositionAlign, HorizontalPositionAlign } from 'docx';
// Removed saveAs import - using manual download method for better Next.js compatibility

interface ParagraphData {
  id: number;
  level: number;
  content: string;
}

interface FormData {
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
}

interface ValidationState {
  ssic: { isValid: boolean; message: string; };
  subj: { isValid: boolean; message: string; };
  from: { isValid: boolean; message: string; };
  to: { isValid: boolean; message: string; };
}

export default function NavalLetterGenerator() {
  const [formData, setFormData] = useState<FormData>({
    line1: '', line2: '', line3: '', ssic: '', originatorCode: '', date: '', from: '', to: '', subj: '', sig: '', delegationText: ''
  });

  const [validation, setValidation] = useState<ValidationState>({
    ssic: { isValid: false, message: '' },
    subj: { isValid: false, message: '' },
    from: { isValid: false, message: '' },
    to: { isValid: false, message: '' }
  });

  const [showVia, setShowVia] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [showEncl, setShowEncl] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [showDelegation, setShowDelegation] = useState(false);
  
  const [vias, setVias] = useState<string[]>(['']);
  const [references, setReferences] = useState<string[]>(['']);
  const [enclosures, setEnclosures] = useState<string[]>(['']);
  const [copyTos, setCopyTos] = useState<string[]>(['']);
  
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([{ id: 1, level: 1, content: '' }]);
  const [paragraphCounter, setParagraphCounter] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [structureErrors, setStructureErrors] = useState<string[]>([]);

  // Set today's date on component mount
  useEffect(() => {
    setTodaysDate();
  }, []);

  // Validation Functions
  const validateSSIC = (value: string) => {
    const ssicPattern = /^\d{4,5}$/;
    if (!value) {
      setValidation(prev => ({ ...prev, ssic: { isValid: false, message: '' } }));
      return