import { Component, Suspense, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileWarning, LoaderCircle } from 'lucide-react';

// Must live in the same module that renders react-pdf components.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

function Loading() {
  return (
    <div className="grid aspect-[1/1.414] w-full place-items-center bg-[#fff] text-neutral-400">
      <LoaderCircle className="animate-spin" />
    </div>
  );
}

function Failed() {
  return (
    <div className="grid aspect-[1/1.414] w-full place-items-center bg-[#fff] text-sm text-neutral-500">
      <span className="flex flex-col items-center gap-2">
        <FileWarning />
        Could not load resume
      </span>
    </div>
  );
}

// react-pdf throws when a file cannot be fetched (e.g. a 404), which its error prop does not
// catch. Without this boundary one missing resume would blank the whole page.
class PdfBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Failed /> : this.props.children;
  }
}

// react-pdf suspends while a document loads. Without a boundary right here React
// would hide the whole page behind the route's loading spinner (e.g. on every swipe).
export function PdfFirstPage({ file, width }) {
  return (
    <PdfBoundary key={file}>
    <Suspense fallback={<Loading />}>
      <Document file={file} loading={<Loading />} error={<Failed />}>
        {width > 0 && (
          <Page pageNumber={1} width={width} renderTextLayer={false} renderAnnotationLayer={false} loading={<Loading />} />
        )}
      </Document>
    </Suspense>
    </PdfBoundary>
  );
}

export function PdfAllPages({ file, width }) {
  const [pages, setPages] = useState(0);
  return (
    <PdfBoundary key={file}>
    <Suspense fallback={<Loading />}>
      <Document file={file} loading={<Loading />} error={<Failed />} onLoadSuccess={({ numPages }) => setPages(numPages)}>
        {width > 0 &&
          Array.from({ length: pages }, (_, i) => (
            <div key={i} className="mx-auto mb-4 w-fit overflow-hidden rounded-xl shadow-2xl shadow-black/50">
              <Page
                pageNumber={i + 1}
                width={width}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={<Loading />}
              />
            </div>
          ))}
      </Document>
    </Suspense>
    </PdfBoundary>
  );
}
