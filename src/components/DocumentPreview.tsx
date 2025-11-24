import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocumentType } from "./DocumentUpload";

interface DocumentPreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  documentType: DocumentType;
  title: string;
}

export const DocumentPreview = ({ files, onRemove, documentType, title }: DocumentPreviewProps) => {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">{title} ({files.length})</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {files.map((file, index) => (
          <Card key={index} className="relative overflow-hidden p-3">
            <div className="flex items-start gap-2">
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
