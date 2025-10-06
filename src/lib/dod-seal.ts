import { ImageRun, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, convertInchesToTwip } from 'docx';

// Simple DoD seal SVG (pre-encoded)
const DOD_SEAL_SIMPLE = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0IiBoZWlnaHQ9IjE0NCIgdmlld0JveD0iMCAwIDE0NCAxNDQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iNzAiIGZpbGw9IiMwMDMzNjYiIHN0cm9rZT0iI0ZGRDcwMCIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iNTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRDcwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI3MiIgcj0iMzAiIGZpbGw9IiNGRkQ3MDAiLz4KICA8Y2lyY2xlIGN4PSI3MiIgY3k9IjcyIiByPSIyNSIgZmlsbD0iIzAwMzM2NiIvPgogIDx0ZXh0IHg9IjcyIiB5PSI3OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRDcwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+RG9EPC90ZXh0PgogIDx0ZXh0IHg9IjcyIiB5PSIxMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNGRkQ3MDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmb250LXdlaWdodD0iYm9sZCI+REVQQVJUTUVOVCBPRIBERUZFTLNFPC90ZXh0Pgo8L3N2Zz4=`;

// More detailed DoD seal SVG (pre-encoded)
const DOD_SEAL_DETAILED = `data:image/svg+xml;base64,YOUR_DETAILED_BASE64_DATA_HERE`;

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
