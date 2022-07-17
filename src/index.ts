import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';

const canvas = document.createElement('canvas');

const url =
  'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';

document.addEventListener('dragover', (event) => {
  // prevent default to allow drop
  event.preventDefault();
});
document.addEventListener('drop', (event) => {
  // prevent default action (open as link for some elements)
  event.preventDefault();
  if (event.dataTransfer && event.dataTransfer.items.length > 0) {
    const file = event.dataTransfer.items[0].getAsFile();
    if (!file || file.type !== 'application/pdf') return;
    file.arrayBuffer().then((data) => makePdfGridFrom(new Uint8Array(data)));
  }
  // move dragged element to the selected drop target
  console.log('dropped');
});

function render(
  ctx: CanvasRenderingContext2D,
  doc: PDFDocumentProxy,
  page: number,
  position: { x: number; y: number; scale: number }
) {
  return doc.getPage(page).then((page) => {
    const viewport = page.getViewport({
      scale: position.scale,
      offsetX: position.x,
      offsetY: position.y,
    });
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('cannot get canvas context');
    }
    const renderTask = page.render({
      canvasContext: ctx,
      viewport: viewport,
      background: 'rgba(0,0,0,0)',
    });
    return renderTask.promise.then(() => {
      console.log('done');
    });
  });
}

async function fetchPageDimensions(doc: PDFDocumentProxy) {
  const pageNumbers = doc.numPages;
  const sizes = await Promise.all(
    Array.from({ length: pageNumbers }, (_, i) =>
      doc.getPage(i + 1).then((p) => p.view)
    )
  );
  const size = sizes[0];
  const width = size[2];
  const height = size[3];
  const ratio = width / height;
  const grid = Math.sqrt(pageNumbers);
  console.log(grid);
  const gridWidth = grid / ratio;
  const gridHeight = grid * ratio;
  console.log(gridWidth, gridHeight);
  console.log(width, height, ratio);
  return {
    width,
    height,
    gridWidth,
    gridHeight,
  };
}

async function makePdfGridFrom(source: string | Uint8Array) {
  const doc = await pdfjsLib.getDocument(source).promise;
  const dimensions = await fetchPageDimensions(doc);
  const scale = 0.3;
  const w = Math.ceil(dimensions.gridWidth);
  const h = Math.ceil(dimensions.gridHeight);
  console.log(w, h);
  canvas.width = w * dimensions.width * scale;
  canvas.height = h * dimensions.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('cannot get canvas context');
  }
  ctx.fillStyle = 'rgb(255,255,255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const page = (i % w) + j * w + 1;
      if (page > doc.numPages) break;
      console.log('drawing', page);
      console.log(i, j);
      await render(ctx, doc, page, {
        x: i * (dimensions.width * scale),
        y: j * (dimensions.height * scale),
        scale,
      });
    }
  }
}

async function main() {
  document.body.append(canvas);
  await makePdfGridFrom(url);
}

window.onload = main;
