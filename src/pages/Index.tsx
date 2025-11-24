import { useState } from "react";
import { FileText } from "lucide-react";
import { DocumentUpload, DocumentType } from "@/components/DocumentUpload";
import { DocumentPreview } from "@/components/DocumentPreview";
import { ExtractedDataTable, ExtractedData } from "@/components/ExtractedDataTable";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

interface FilesByType {
  passport: File[];
  visa: File[];
  flight: File[];
}

const Index = () => {
  const [filesByType, setFilesByType] = useState<FilesByType>({
    passport: [],
    visa: [],
    flight: [],
  });
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFilesSelected = (type: DocumentType, newFiles: File[]) => {
    setFilesByType((prev) => ({
      ...prev,
      [type]: [...prev[type], ...newFiles],
    }));
    toast({
      title: "Documents uploaded",
      description: `${newFiles.length} ${type} document(s) added`,
    });
  };

  const handleRemoveFile = (type: DocumentType, index: number) => {
    setFilesByType((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const getTotalFiles = () => {
    return filesByType.passport.length + filesByType.visa.length + filesByType.flight.length;
  };

  const handleProcess = async () => {
    const totalFiles = getTotalFiles();
    
    if (totalFiles === 0) {
      toast({
        title: "No documents",
        description: "Please upload at least one document",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const newData: ExtractedData[] = [];

    try {
      // Process all document types
      for (const [type, files] of Object.entries(filesByType)) {
        for (const file of files) {
          const base64 = await fileToBase64(file);
          
          const { data, error } = await supabase.functions.invoke("extract-document-data", {
            body: { 
              image: base64, 
              fileName: `${type}-${file.name}`,
              documentType: type 
            },
          });

          if (error) throw error;

          if (data?.extractedData) {
            newData.push(data.extractedData);
          }
        }
      }

      setExtractedData(newData);
      toast({
        title: "Processing complete",
        description: `Extracted data from ${newData.length} document(s)`,
      });
    } catch (error: any) {
      console.error("Processing error:", error);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process documents",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pdfToImage = async (file: File): Promise<string> => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context!,
      viewport: viewport,
      canvas: canvas,
    }).promise;
    
    return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      return await pdfToImage(file);
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
    });
  };

  const handleExport = () => {
    const headers = [
      "Document Type",
      "Name",
      "Passport Number",
      "Date of Birth",
      "Nationality",
      "Expiry Date",
      "Visa Type",
      "Flight Number",
      "Departure",
      "Arrival",
    ];

    const csvData = [
      headers.join(","),
      ...extractedData.map((row) =>
        [
          row.documentType,
          row.name,
          row.passportNumber,
          row.dateOfBirth,
          row.nationality,
          row.expiryDate,
          row.visaType || "",
          row.flightNumber || "",
          row.departure || "",
          row.arrival || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted-data-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Data exported to CSV file",
    });
  };

  const totalFiles = getTotalFiles();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">DocuScan AI</h1>
              <p className="text-sm text-muted-foreground">
                Automated document data extraction
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <section className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Extract Data from Documents Instantly
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload passports, visas, and flight tickets in their respective categories. 
              Our AI automatically extracts all relevant information.
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <DocumentUpload 
                onFilesSelected={(files) => handleFilesSelected("passport", files)} 
                isProcessing={isProcessing}
                documentType="passport"
              />
              <DocumentPreview 
                files={filesByType.passport} 
                onRemove={(index) => handleRemoveFile("passport", index)}
                documentType="passport"
                title="Passports"
              />
            </div>

            <div className="space-y-4">
              <DocumentUpload 
                onFilesSelected={(files) => handleFilesSelected("visa", files)} 
                isProcessing={isProcessing}
                documentType="visa"
              />
              <DocumentPreview 
                files={filesByType.visa} 
                onRemove={(index) => handleRemoveFile("visa", index)}
                documentType="visa"
                title="Visas"
              />
            </div>

            <div className="space-y-4">
              <DocumentUpload 
                onFilesSelected={(files) => handleFilesSelected("flight", files)} 
                isProcessing={isProcessing}
                documentType="flight"
              />
              <DocumentPreview 
                files={filesByType.flight} 
                onRemove={(index) => handleRemoveFile("flight", index)}
                documentType="flight"
                title="Flight Tickets"
              />
            </div>
          </div>

          {totalFiles > 0 && extractedData.length === 0 && !isProcessing && (
            <div className="flex justify-center">
              <Button size="lg" onClick={handleProcess} className="gap-2">
                <FileText className="h-5 w-5" />
                Process {totalFiles} Document{totalFiles > 1 ? "s" : ""}
              </Button>
            </div>
          )}

          <ExtractedDataTable
            data={extractedData}
            isProcessing={isProcessing}
            onExport={handleExport}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
