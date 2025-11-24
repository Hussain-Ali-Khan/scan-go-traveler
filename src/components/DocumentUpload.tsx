import { useCallback } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

export const DocumentUpload = ({ onFilesSelected, isProcessing }: DocumentUploadProps) => {
  const { toast } = useToast();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter((file) => 
        file.type.startsWith("image/") || file.type === "application/pdf"
      );

      if (validFiles.length === 0) {
        toast({
          title: "Invalid file type",
          description: "Please upload images (JPG, PNG, WEBP) or PDF files",
          variant: "destructive",
        });
        return;
      }

      onFilesSelected(validFiles);
    },
    [onFilesSelected, toast]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer bg-card"
    >
      <input
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
        disabled={isProcessing}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-primary/10 p-6">
            <Upload className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {isProcessing ? "Processing..." : "Upload Documents"}
            </h3>
            <p className="text-muted-foreground">
              Drag and drop or click to select passports, visas, and flight tickets
            </p>
            <p className="text-sm text-muted mt-2">
              Supports: JPG, PNG, WEBP, PDF
            </p>
          </div>
        </div>
      </label>
    </div>
  );
};
