import { ImageRun, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, convertInchesToTwip } from 'docx';
import { DOD_SEAL_DETAILED } from './dod-seal-data';

async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

export async function getDoDSealBuffer(): Promise<ArrayBuffer> {
  return dataUrlToArrayBuffer(DOD_SEAL_DETAILED);
}

export async function createDoDSeal(): Promise<ImageRun> {
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
