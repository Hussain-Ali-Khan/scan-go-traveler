import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

const formatDate = (dateValue: string | undefined): string => {
  if (!dateValue) return '';
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Try to parse as a date
  try {
    const date = new Date(dateValue);
    
    // Check if it's a valid date
    if (!isNaN(date.getTime())) {
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }
  
  // If all parsing fails, return the original value
  return dateValue;
};

export interface ExtractedData {
  name: string;
  passportNumber: string;
  dateOfBirth: string;
  nationality: string;
  expiryDate: string;
  visaType?: string;
  flightNumber?: string;
  departure?: string;
  arrival?: string;
}

interface ExtractedDataTableProps {
  data: ExtractedData[];
  isProcessing: boolean;
  onExport: () => void;
}

export const ExtractedDataTable = ({
  data,
  isProcessing,
  onExport,
}: ExtractedDataTableProps) => {
  if (data.length === 0 && !isProcessing) return null;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Extracted Information
        </h3>
        {data.length > 0 && (
          <Button onClick={onExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>
        )}
      </div>

      {isProcessing ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Processing documents with AI...
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Passport Number</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Visa Type</TableHead>
                <TableHead>Flight Number</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Arrival</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.passportNumber}</TableCell>
                  <TableCell>{formatDate(row.dateOfBirth)}</TableCell>
                  <TableCell>{row.nationality}</TableCell>
                  <TableCell>{formatDate(row.expiryDate)}</TableCell>
                  <TableCell>{row.visaType || "-"}</TableCell>
                  <TableCell>{row.flightNumber || "-"}</TableCell>
                  <TableCell>{row.departure || "-"}</TableCell>
                  <TableCell>{row.arrival || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};
