import { useState } from "react";
import { FileText } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentPreview } from "@/components/DocumentPreview";
import { ExtractedDataTable, ExtractedData } from "@/components/ExtractedDataTable";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    toast({
      title: "Documents uploaded",
      description: `${newFiles.length} document(s) ready to process`,
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast({
        title: "No documents",
        description: "Please upload documents first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const newData: ExtractedData[] = [];

    try {
      for (const file of files) {
        const base64 = await fileToBase64(file);
        
        const { data, error } = await supabase.functions.invoke("extract-document-data", {
          body: { image: base64, fileName: file.name },
        });

        if (error) throw error;

        if (data?.extractedData) {
          newData.push(data.extractedData);
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

  const fileToBase64 = (file: File): Promise<string> => {
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
              Upload passports, visas, and flight tickets. Our AI automatically extracts
              all relevant information and organizes it for easy export to Excel or Google Sheets.
            </p>
          </section>

          <DocumentUpload onFilesSelected={handleFilesSelected} isProcessing={isProcessing} />

          <DocumentPreview files={files} onRemove={handleRemoveFile} />

          {files.length > 0 && extractedData.length === 0 && !isProcessing && (
            <div className="flex justify-center">
              <Button size="lg" onClick={handleProcess} className="gap-2">
                <FileText className="h-5 w-5" />
                Process {files.length} Document{files.length > 1 ? "s" : ""}
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
