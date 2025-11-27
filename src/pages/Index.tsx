import { useState } from "react";
import { FileText } from "lucide-react";
import { DocumentUpload, DocumentType } from "@/components/DocumentUpload";
import { DocumentPreview } from "@/components/DocumentPreview";
import { ExtractedDataTable, ExtractedData } from "@/components/ExtractedDataTable";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";


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
    // Validate file types - only accept images
    const validFiles = newFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image. Please upload JPEG or PNG files only.`,
          variant: "destructive",
        });
      }
      return isImage;
    });

    if (validFiles.length === 0) return;

    setFilesByType((prev) => ({
      ...prev,
      [type]: [...prev[type], ...validFiles],
    }));
    toast({
      title: "Documents uploaded",
      description: `${validFiles.length} ${type} document(s) added`,
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

  const normalizeName = (name: string): string => {
    if (!name) return '';
    
    // Handle flight ticket format: "LASTNAME?FIRSTNAME LASTNAME"
    // Extract the part after the "?" if it exists
    let cleanName = name;
    if (name.includes('?')) {
      const parts = name.split('?');
      cleanName = parts[1] || parts[0]; // Use the part after "?" if it exists
    }
    
    // Normalize: lowercase, remove extra spaces, remove special chars
    return cleanName
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove non-letter characters except spaces
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .trim();
  };

  const namesMatch = (name1: string, name2: string): boolean => {
    const normalized1 = normalizeName(name1);
    const normalized2 = normalizeName(name2);
    
    // Exact match after normalization
    if (normalized1 === normalized2) return true;
    
    // Check if one contains the other (handles middle names, etc.)
    const words1 = normalized1.split(' ');
    const words2 = normalized2.split(' ');
    
    // Check if major name components overlap
    const commonWords = words1.filter(word => 
      words2.some(w => w === word || word.includes(w) || w.includes(word))
    );
    
    // If at least 2 name components match, consider it the same person
    return commonWords.length >= 2;
  };

  const consolidateData = (dataArray: ExtractedData[]): ExtractedData[] => {
    const passengers: ExtractedData[] = [];
    
    dataArray.forEach(item => {
      // Try to find existing passenger by passport number (most reliable)
      let existingIndex = -1;
      
      if (item.passportNumber?.trim()) {
        existingIndex = passengers.findIndex(p => 
          p.passportNumber?.trim() === item.passportNumber?.trim()
        );
      }
      
      // If no passport match, try name matching
      if (existingIndex === -1 && item.name?.trim()) {
        existingIndex = passengers.findIndex(p => 
          p.name && namesMatch(p.name, item.name)
        );
      }
      
      if (existingIndex !== -1) {
        // Merge with existing passenger
        const existing = passengers[existingIndex];
        passengers[existingIndex] = {
          // Prefer passport name over flight ticket name (cleaner format)
          name: existing.passportNumber ? existing.name : (item.passportNumber ? item.name : existing.name),
          passportNumber: existing.passportNumber || item.passportNumber,
          dateOfBirth: existing.dateOfBirth || item.dateOfBirth,
          nationality: existing.nationality || item.nationality,
          expiryDate: existing.expiryDate || item.expiryDate,
          visaType: item.visaType || existing.visaType,
          flightNumber: item.flightNumber || existing.flightNumber,
          departure: item.departure || existing.departure,
          arrival: item.arrival || existing.arrival,
        };
      } else {
        // New passenger
        passengers.push({ ...item });
      }
    });
    
    return passengers;
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

      // Consolidate data by passenger
      const consolidatedData = consolidateData(newData);
      
      setExtractedData(consolidatedData);
      toast({
        title: "Processing complete",
        description: `Extracted data for ${consolidatedData.length} passenger(s)`,
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

  const formatDate = (dateValue: string | undefined): string => {
    if (!dateValue) return '';
    
    // If it's already in DD-MM-YYYY format, return as is
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Try to parse as a date
    try {
      const date = new Date(dateValue);
      
      // Check if it's a valid date
      if (!isNaN(date.getTime())) {
        // Format as DD-MM-YYYY
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
      }
    } catch (e) {
      console.error('Date parsing error:', e);
    }
    
    // If all parsing fails, return the original value
    return dateValue;
  };

  const escapeCsvValue = (value: string | undefined): string => {
    if (!value) return '';
    
    // Convert to string and handle special characters
    const stringValue = String(value);
    
    // Only quote if contains comma, quote, or newline (not dates)
    if (stringValue.includes(',') || 
        stringValue.includes('"') || 
        stringValue.includes('\n')) {
      // Escape existing quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  const handleExport = () => {
    const headers = [
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

    // Add BOM for UTF-8 encoding recognition by Excel
    const BOM = "\uFEFF";
    
    const csvData = [
      headers.map(h => escapeCsvValue(h)).join(","),
      ...extractedData.map((row) =>
        [
          escapeCsvValue(row.name),
          escapeCsvValue(row.passportNumber),
          escapeCsvValue(formatDate(row.dateOfBirth)),
          escapeCsvValue(row.nationality),
          escapeCsvValue(formatDate(row.expiryDate)),
          escapeCsvValue(row.visaType || ""),
          escapeCsvValue(row.flightNumber || ""),
          escapeCsvValue(row.departure || ""),
          escapeCsvValue(row.arrival || ""),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([BOM + csvData], { type: "text/csv;charset=utf-8;" });
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
