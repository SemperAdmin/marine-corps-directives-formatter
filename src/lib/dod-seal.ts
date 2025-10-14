import { ImageRun, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, convertInchesToTwip } from 'docx';
import { DOD_SEAL_DETAILED, NAVY_SEAL_BLUE } from './dod-seal-data';

async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

export async function getDoDSealBuffer(letterheadType: 'marine-corps' | 'navy' = 'marine-corps'): Promise<ArrayBuffer> {
  // Fallback to DoD seal if Navy seal is not ready
  const sealData = (letterheadType === 'navy' && NAVY_SEAL_BLUE && !NAVY_SEAL_BLUE.includes('YOUR_NAVY_SEAL_BASE64_DATA_HERE')) 
    ? NAVY_SEAL_BLUE 
    : DOD_SEAL_DETAILED;
  return dataUrlToArrayBuffer(sealData);
}

export async function createDoDSeal(letterheadType: 'marine-corps' | 'navy' = 'marine-corps'): Promise<ImageRun> {
  // Fallback to DoD seal if Navy seal is not ready
  const sealData = (letterheadType === 'navy' && NAVY_SEAL_BLUE && !NAVY_SEAL_BLUE.includes('YOUR_NAVY_SEAL_BASE64_DATA_HERE')) 
    ? NAVY_SEAL_BLUE 
    : DOD_SEAL_DETAILED;
  const sealBuffer = await dataUrlToArrayBuffer(sealData);
  
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