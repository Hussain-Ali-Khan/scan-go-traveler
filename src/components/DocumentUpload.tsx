import { useCallback } from "react";
import { Upload, Plane, FileText, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type DocumentType = "passport" | "visa" | "flight";

interface DocumentUploadProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
  documentType: DocumentType;
}

const documentConfig = {
  passport: {
    icon: FileText,
    title: "Passports",
    description: "Upload passport document images",
    color: "text-primary",
  },
  visa: {
    icon: CreditCard,
    title: "Visas",
    description: "Upload visa document images",
    color: "text-chart-2",
  },
  flight: {
    icon: Plane,
    title: "Flight Tickets",
    description: "Upload flight ticket images",
    color: "text-chart-3",
  },
};

export const DocumentUpload = ({ onFilesSelected, isProcessing, documentType }: DocumentUploadProps) => {
  const { toast } = useToast();
  const config = documentConfig[documentType];

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

  const IconComponent = config.icon;
  const inputId = `file-upload-${documentType}`;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-card"
    >
      <input
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleFileInput}
        className="hidden"
        id={inputId}
        disabled={isProcessing}
      />
      <label htmlFor={inputId} className="cursor-pointer">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-primary/10 p-4">
            <IconComponent className={`h-8 w-8 ${config.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {isProcessing ? "Processing..." : config.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
            <p className="text-xs text-muted mt-1">
              JPG, PNG, WEBP, PDF
            </p>
          </div>
        </div>
      </label>
    </div>
  );
};
