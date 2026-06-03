import { Download, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileAttachmentProps {
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
}

export function FileAttachment({ fileName, fileUrl, fileType, fileSize }: FileAttachmentProps) {
  if (!fileUrl || !fileName) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const isImage = fileType?.startsWith('image/');

  return (
    <div className="mt-2">
      {isImage ? (
        <div className="relative group">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90"
            onClick={() => window.open(fileUrl, '_blank')}
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              const a = document.createElement('a');
              a.href = fileUrl;
              a.download = fileName;
              a.click();
            }}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border max-w-xs">
          <div className="text-blue-600">{getFileIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            {fileSize && <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const a = document.createElement('a');
              a.href = fileUrl;
              a.download = fileName;
              a.click();
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
