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
    
    // Remove common honorifics/titles
    const honorifics = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'madam'];
    
    // Normalize: lowercase, remove extra spaces, remove special chars
    let normalized = cleanName
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove non-letter characters except spaces
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .trim();
    
    // Remove honorifics from the beginning
    const words = normalized.split(' ');
    while (words.length > 0 && honorifics.includes(words[0])) {
      words.shift();
    }
    
    return words.join(' ');
  };

  const namesMatch = (name1: string, name2: string): boolean => {
    const normalized1 = normalizeName(name1);
    const normalized2 = normalizeName(name2);
    
    // Handle empty names
    if (!normalized1 || !normalized2) return false;
    
    // Exact match after normalization
    if (normalized1 === normalized2) return true;
    
    const words1 = normalized1.split(' ').filter(w => w.length > 0);
    const words2 = normalized2.split(' ').filter(w => w.length > 0);
    
    // Need at least one word in each name
    if (words1.length === 0 || words2.length === 0) return false;
    
    // CRITICAL: First names (first word) MUST match exactly
    // This prevents family members like "Gaurang Desai" and "Rita Desai" from matching
    if (words1[0] !== words2[0]) return false;
    
    // If first names match, check if at least 2 total words match (exact match only)
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length >= 2;
  };

  const consolidateData = (dataArray: ExtractedData[]): ExtractedData[] => {
    const passengers: ExtractedData[] = [];
    
    dataArray.forEach(item => {
      // Try to find existing passenger by passport number (most reliable)
      let existingIndex = -1;
      const itemPassport = item.passportNumber?.trim();
      
      if (itemPassport) {
        existingIndex = passengers.findIndex(p => 
          p.passportNumber?.trim() === itemPassport
        );
      }
      
      // If no passport match, try name matching - BUT only if current item has no passport number
      // or if existing passenger has no passport number (prevents merging people with different passports)
      if (existingIndex === -1 && item.name?.trim()) {
        existingIndex = passengers.findIndex(p => {
          // If both have passport numbers and they're different, they're DEFINITELY different people
          const existingPassport = p.passportNumber?.trim();
          if (itemPassport && existingPassport && itemPassport !== existingPassport) {
            return false; // Different passport numbers = different people
          }
          return p.name && namesMatch(p.name, item.name);
        });
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
          passportIssueDate: existing.passportIssueDate || item.passportIssueDate,
          expiryDate: existing.expiryDate || item.expiryDate,
          visaType: item.visaType || existing.visaType,
          flightNumber: item.flightNumber || existing.flightNumber,
          bookingReference: item.bookingReference || existing.bookingReference,
          ticketNumber: item.ticketNumber || existing.ticketNumber,
          departure: item.departure || existing.departure,
          arrival: item.arrival || existing.arrival,
          transitStop: item.transitStop || existing.transitStop,
          seatNumber: item.seatNumber || existing.seatNumber,
          inflightMeal: item.inflightMeal || existing.inflightMeal,
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

      // Debug: Log raw extracted data before consolidation
      console.log("Raw extracted data from all documents:", JSON.stringify(newData, null, 2));
      
      // Consolidate data by passenger
      const consolidatedData = consolidateData(newData);
      
      console.log("Consolidated data:", JSON.stringify(consolidatedData, null, 2));
      
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
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // If already in DD-MMM-YYYY format (e.g., 15-Mar-1990), return as is
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Try to parse as a date
    try {
      const date = new Date(dateValue);
      
      // Check if it's a valid date
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();
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

  // Force Excel to treat value as text string (prevents auto date conversion)
  const escapeCsvDateValue = (value: string | undefined): string => {
    if (!value) return '';
    
    // Use ="value" format to force Excel to treat as text literal
    // This prevents Excel from auto-converting and misinterpreting dates
    const stringValue = String(value).replace(/"/g, '""');
    return `="${stringValue}"`;
  };

  const handleExport = () => {
    const headers = [
      "Name",
      "Passport Number",
      "Date of Birth",
      "Nationality",
      "Passport Issue Date",
      "Passport Expiry Date",
      "Visa Type",
      "Flight Number",
      "Booking Reference",
      "Ticket Number",
      "Departure",
      "Arrival",
      "Transit Stop",
      "Seat Number",
      "Inflight Meal",
    ];

    // Add BOM for UTF-8 encoding recognition by Excel
    const BOM = "\uFEFF";
    
    const csvData = [
      headers.map(h => escapeCsvValue(h)).join(","),
      ...extractedData.map((row) =>
        [
          escapeCsvValue(row.name),
          escapeCsvValue(row.passportNumber),
          escapeCsvDateValue(formatDate(row.dateOfBirth)),
          escapeCsvValue(row.nationality),
          escapeCsvDateValue(formatDate(row.passportIssueDate)),
          escapeCsvDateValue(formatDate(row.expiryDate)),
          escapeCsvValue(row.visaType || ""),
          escapeCsvValue(row.flightNumber || ""),
          escapeCsvValue(row.bookingReference || ""),
          escapeCsvValue(row.ticketNumber || ""),
          escapeCsvValue(row.departure || ""),
          escapeCsvValue(row.arrival || ""),
          escapeCsvValue(row.transitStop || ""),
          escapeCsvValue(row.seatNumber || ""),
          escapeCsvValue(row.inflightMeal || ""),
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
