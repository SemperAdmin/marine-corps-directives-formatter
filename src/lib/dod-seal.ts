import { ImageRun, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, convertInchesToTwip } from 'docx';
// 💡 THE FIX: Import the data constants from the new, separate file
import { DOD_SEAL_DETAILED, DOD_SEAL_SIMPLE } from './dod-seal-data';


// Keep the helper function exactly as it was
async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

// Keep getDoDSealBuffer() exactly as it was
export async function getDoDSealBuffer(): Promise<ArrayBuffer> {
  // 💡 Note: This now uses the imported constant from dod-seal-data.ts
  return dataUrlToArrayBuffer(DOD_SEAL_DETAILED);
}

// Keep createDoDSeal() exactly as it was
export async function createDoDSeal(): Promise<ImageRun> {
  // 💡 Note: This now uses the imported constant from dod-seal-data.ts
  const sealBuffer = await dataUrlToArrayBuffer(DOD_SEAL_DETAILED);
  
  return new ImageRun({
    data: sealBuffer,
    transformation: {
      width: convertInchesToTwip(0.067),
      height: convertInchesToTwip(0.067),
    },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.PAGE,
        offset: 458700
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.PAGE,
        offset: 458700
      },
    },
  });
}
