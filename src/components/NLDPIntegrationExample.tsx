/**
 * Example Integration of NLDP File Sharing System
 * 
 * This file demonstrates how to integrate the NLDP file sharing system
 * into the main Marine Corps Directives Formatter application.
 */

import React, { useState } from 'react';
import { NLDPFileManager } from './NLDPFileManager';
import { useNLDP } from '../hooks/useNLDP';
import { NLDPData } from '../lib/nldp-format';

// Example of how to integrate with your existing state management
interface ExampleIntegrationProps {
  // Your existing state
  formData: any;
  vias: string[];
  references: string[];
  enclosures: string[];
  copyTos: string[];
  paragraphs: any[];
  
  // Your existing setters
  setFormData: (data: any) => void;
  setVias: (vias: string[]) => void;
  setReferences: (refs: string[]) => void;
  setEnclosures: (enclosures: string[]) => void;
  setCopyTos: (copyTos: string[]) => void;
  setParagraphs: (paragraphs: any[]) => void;
}

export const ExampleIntegration: React.FC<ExampleIntegrationProps> = ({
  formData,
  vias,
  references,
  enclosures,
  copyTos,
  paragraphs,
  setFormData,
  setVias,
  setReferences,
  setEnclosures,
  setCopyTos,
  setParagraphs
}) => {
  const [importMessage, setImportMessage] = useState<string>('');

  // Handle successful import - update all your application state
  const handleImportSuccess = (importedData: NLDPData) => {
    try {
      // Update form data
      if (importedData.formData) {
        setFormData((prev: any) => ({
          ...prev,
          ...importedData.formData
        }));
      }

      // Update paragraphs
      if (importedData.paragraphs) {
        setParagraphs(importedData.paragraphs);
      }

      // Update references
      if (importedData.references) {
        const referenceTexts = importedData.references
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(ref => ref.text);
        setReferences(referenceTexts);
      }

      // Update enclosures
      if (importedData.enclosures) {
        const enclosureTexts = importedData.enclosures
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(enc => enc.text);
        setEnclosures(enclosureTexts);
      }

      // Update vias
      if (importedData.vias) {
        const viaTexts = importedData.vias
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(via => via.text);
        setVias(viaTexts);
      }

      // Update copy tos
      if (importedData.copyTos) {
        const copyToTexts = importedData.copyTos
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(copyTo => copyTo.text);
        setCopyTos(copyToTexts);
      }

      setImportMessage('Data imported successfully! All fields have been updated.');
      
      // Clear message after 5 seconds
      setTimeout(() => setImportMessage(''), 5000);

    } catch (error) {
      console.error('Error applying imported data:', error);
      setImportMessage('Error applying imported data. Please check the file format.');
    }
  };

  const handleImportError = (error: string) => {
    setImportMessage(`Import failed: ${error}`);
    setTimeout(() => setImportMessage(''), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Status message */}
      {importMessage && (
        <div className={`p-3 rounded-md ${
          importMessage.includes('successfully') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {importMessage}
        </div>
      )}

      {/* File Manager Component */}
      <NLDPFileManager
        formData={formData}
        vias={vias}
        references={references}
        enclosures={enclosures}
        copyTos={copyTos}
        paragraphs={paragraphs}
        onImportSuccess={handleImportSuccess}
        onImportError={handleImportError}
      />
    </div>
  );
};

// Alternative: Direct hook usage without the component
export const DirectHookUsage: React.FC<ExampleIntegrationProps> = ({
  formData,
  vias,
  references,
  enclosures,
  copyTos,
  paragraphs,
  setFormData,
  // ... other setters
}) => {
  const { exportToNLDP, triggerImportDialog, isExporting, isImporting } = useNLDP();

  const handleQuickExport = async () => {
    const success = await exportToNLDP(
      formData,
      vias,
      references,
      enclosures,
      copyTos,
      paragraphs,
      {
        package: {
          title: formData.subj || 'Marine Corps Directive',
          description: `${formData.documentType?.toUpperCase()} document exported from Marine Corps Directives Formatter`
        }
      }
    );

    if (success) {
      alert('Data exported successfully!');
    }
  };

  const handleQuickImport = async () => {
    const result = await triggerImportDialog();
    
    if (result?.success && result.data) {
      // Update your state here similar to handleImportSuccess above
      setFormData((prev: any) => ({ ...prev, ...result.data!.formData }));
      alert('Data imported successfully!');
    } else if (result?.error) {
      alert(`Import failed: ${result.error}`);
    }
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={handleQuickExport}
        disabled={isExporting}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isExporting ? 'Exporting...' : 'Quick Export'}
      </button>
      
      <button 
        onClick={handleQuickImport}
        disabled={isImporting}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {isImporting ? 'Importing...' : 'Quick Import'}
      </button>
    </div>
  );
};

/**
 * Usage Examples:
 * 
 * 1. Full UI Component:
 * <NLDPFileManager
 *   formData={formData}
 *   vias={vias}
 *   references={references}
 *   enclosures={enclosures}
 *   copyTos={copyTos}
 *   paragraphs={paragraphs}
 *   onImportSuccess={handleImportSuccess}
 *   onImportError={handleImportError}
 * />
 * 
 * 2. Hook Only:
 * const { exportToNLDP, importFromNLDP } = useNLDP();
 * 
 * 3. Quick Actions:
 * <DirectHookUsage {...props} />
 */