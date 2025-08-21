'use client';

import { ImageRun, convertInchesToTwip, HorizontalPositionAlign, VerticalPositionAlign, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom } from 'docx';

// Pre-encoded DoD seal SVG (simple version)
const DOD_SEAL_SIMPLE = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0IiBoZWlnaHQ9IjE0NCIgdmlld0JveD0iMCAwIDE0NCAxNDQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iNzAiIGZpbGw9IiMwMDMzNjYiIHN0cm9rZT0iI0ZGRDcwMCIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iNTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRDcwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iMzAiIGZpbGw9IiNGRkQ3MDAiLz4KICA8Y2lyY2xlIGN4PSI3MiIgY3k9IjcyIiByPSIyNSIgZmlsbD0iIzAwMzM2NiIvPgogIDx0ZXh0IHg9IjcyIiB5PSI3OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRDcwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+RG9EPC90ZXh0PgogIDx0ZXh0IHg9IjcyIiB5PSIxMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNGRkQ3MDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmb250LXdlaWdodD0iYm9sZCI+REVQQVJUTUVOVCBPRIBERUZFTLNFPC90ZXh0Pgo8L3N2Zz4=`;

// More detailed DoD seal SVG (pre-encoded)
const DOD_SEAL_DETAILED = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0IiBoZWlnaHQ9IjE0NCIgdmlld0JveD0iMCAwIDE0NCAxNDQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPCEtLSBPdXRlciBjaXJjbGUgd2l0aCBuYXZ5IGJsdWUgYmFja2dyb3VuZCAtLT4KICA8Y2lyY2xlIGN4PSI3MiIgY3k9IjcyIiByPSI3MCIgZmlsbD0iIzAwMzM2NiIgc3Ryb2tlPSIjRkZENzAwIiBzdHJva2Utd2lkdGg9IjQiLz4KICA8IS0tIElubmVyIGRlY29yYXRpdmUgY2lyY2xlIC0tPgogIDxjaXJjbGUgY3g9IjcyIiBjeT0iNzIiIHI9IjU1IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkQ3MDAiIHN0cm9rZS13aWR0aD0iMiIvPgogIDwhLS0gRWFnbGUgc2lsaG91ZXR0ZSAtLT4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3Miw0NSkiPgogICAgPHBhdGggZD0iTS0xNSwtMTAgUS0yMCwtMTUgLTEwLC0yMCBRMCwtMjUgMTAsLTIwIFEyMCwtMTUgMTUsLTEwIFExMCwtNSAwLC04IFEtMTAsLTUgLTE1LC0xMCBaIiBmaWxsPSIjRkZENzAwIi8+CiAgICA8cGF0aCBkPSJNLTgsLTggUS01LC0xMiAwLC0xMCBRNSwtMTIgOCwtOCBRNSwtNSAwLC02IFEtNSwtNSAtOCwtOCBaIiBmaWxsPSIjMDAzMzY2Ii8+CiAgPC9nPgogIDwhLS0gU2hpZWxkIGluIGNlbnRlciAtLT4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3Miw3MikiPgogICAgPHBhdGggZD0iTS0xMiwtMTUgTDEyLC0xNSBMMTIsMTAgUTEyLDE4IDAsMjAgUS0xMiwxOCAtMTIsMTAgWiIgZmlsbD0iI0ZGRDcwMCIgc3Ryb2tlPSIjMDAzMzY2IiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDxyZWN0IHg9Ii0xMCIgeT0iLTEzIiB3aWR0aD0iMjAiIGhlaWdodD0iOCIgZmlsbD0iI0RDMTQzQyIvPgogICAgPHJlY3QgeD0iLTEwIiB5PSItNSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjMiIGZpbGw9IndoaXRlIi8+CiAgICA8cmVjdCB4PSItMTAiIHk9Ii0yIiB3aWR0aD0iMjAiIGhlaWdodD0iMyIgZmlsbD0iI0RDMTQzQyIvPgogICAgPHJlY3QgeD0iLTEwIiB5PSIxIiB3aWR0aD0iMjAiIGhlaWdodD0iMyIgZmlsbD0id2hpdGUiLz4KICAgIDxyZWN0IHg9Ii0xMCIgeT0iNCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjMiIGZpbGw9IiNEQzE0M0MiLz4KICAgIDxyZWN0IHg9Ii0xMCIgeT0iNyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjMiIGZpbGw9IndoaXRlIi8+CiAgPC9nPgogIDwhLS0gU3RhcnMgYXJvdW5kIHRoZSBzZWFsIC0tPgogIDxnIGZpbGw9IiNGRkQ3MDAiPgogICAgPHBvbHlnb24gcG9pbnRzPSI3MiwxNSA3NCwyMSA4MCwyMSA3NSwyNSA3NywzMSA3MiwyNyA2NywzMSA2OSwyNSA2NCwyMSA3MCwyMSIgdHJhbnNmb3JtPSJyb3RhdGUoMCA3MiA3MikiLz4KICAgIDxwb2x5Z29uIHBvaW50cz0iNzIsMTUgNzQsMjEgODAsMjEgNzUsMjUgNzcsMzEgNzIsMjcgNjcsMzEgNjksMjUgNjQsMjEgNzAsMjEiIHRyYW5zZm9ybT0icm90YXRlKDQ1IDcyIDcyKSIvPgogICAgPHBvbHlnb24gcG9pbnRzPSI3MiwxNSA3NCwyMSA4MCwyMSA3NSwyNSA3NywzMSA3MiwyNyA2NywzMSA2OSwyNSA2NCwyMSA3MCwyMSIgdHJhbnNmb3JtPSJyb3RhdGUoOTAgNzIgNzIpIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjcyLDE1IDc0LDIxIDgwLDIxIDc1LDI1IDc3LDMxIDcyLDI3IDY3LDMxIDY5LDI1IDY0LDIxIDcwLDIxIiB0cmFuc2Zvcm09InJvdGF0ZSgxMzUgNzIgNzIpIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjcyLDE1IDc0LDIxIDgwLDIxIDc1LDI1IDc3LDMxIDcyLDI3IDY3LDMxIDY5LDI1IDY0LDIxIDcwLDIxIiB0cmFuc2Zvcm09InJvdGF0ZSgxODAgNzIgNzIpIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjcyLDE1IDc0LDIxIDgwLDIxIDc1LDI1IDc3LDMxIDcyLDI3IDY3LDMxIDY5LDI1IDY0LDIxIDcwLDIxIiB0cmFuc2Zvcm09InJvdGF0ZSgyMjUgNzIgNzIpIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjcyLDE1IDc0LDIxIDgwLDIxIDc1LDI1IDc3LDMxIDcyLDI3IDY3LDMxIDY5LDI1IDY0LDIxIDcwLDIxIiB0cmFuc2Zvcm09InJvdGF0ZSgyNzAgNzIgNzIpIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjcyLDE1IDc0LDIxIDgwLDIxIDc1LDI1IDc3LDMxIDcyLDI3IDY3LDMxIDY5LDI1IDY0LDIxIDcwLDIxIiB0cmFuc2Zvcm09InJvdGF0ZSgzMTUgNzIgNzIpIi8+CiAgPC9nPgogIDx0ZXh0IHg9IjcyIiB5PSIxMDUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNGRkQ3MDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiPlVOSVRFRCBTVEFURVM8L3RleHQ+Cjwvc3ZnPg==`;

/**
 * Convert data URL to ArrayBuffer
 */
function dataURLToArrayBuffer(dataURL: string): ArrayBuffer {
  const base64 = dataURL.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Create DoD seal ImageRun for document header
 * @param useSimple - Use simple seal design instead of detailed version
 * @returns ImageRun configured for proper positioning
 */
export function createDoDSeal(useSimple: boolean = false): ImageRun {
  const sealData = useSimple ? DOD_SEAL_SIMPLE : DOD_SEAL_DETAILED;
  const sealBuffer = dataURLToArrayBuffer(sealData);

  return new ImageRun({
    data: sealBuffer,
    transformation: {
      width: convertInchesToTwip(1.0), // 1.0 inch = 1440 TWIPs
      height: convertInchesToTwip(1.0), // 1.0 inch = 1440 TWIPs
    },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.PAGE,
        align: HorizontalPositionAlign.LEFT,
        offset: convertInchesToTwip(0.5), // 0.5 inches from left edge
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.PAGE,
        align: VerticalPositionAlign.TOP,
        offset: convertInchesToTwip(0.5), // 0.5 inches from top edge
      },
    },
  });
}

/**
 * Get DoD seal as ArrayBuffer (for backward compatibility)
 * @param useSimple - Use simple seal design instead of detailed version
 * @returns ArrayBuffer containing seal image data
 */
export function getDoDSealBuffer(useSimple: boolean = false): ArrayBuffer {
  const sealData = useSimple ? DOD_SEAL_SIMPLE : DOD_SEAL_DETAILED;
  return dataURLToArrayBuffer(sealData);
}

/**
 * Check if seal is available (always true for embedded seal)
 * @returns Promise<boolean> - Always resolves to true
 */
export async function isSealAvailable(): Promise<boolean> {
  return Promise.resolve(true);
}

export default {
  createDoDSeal,
  getDoDSealBuffer,
  isSealAvailable,
};