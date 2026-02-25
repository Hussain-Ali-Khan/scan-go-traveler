import { X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProcessingProgressProps {
  current: number;
  total: number;
  currentFileName: string;
  errors: string[];
  onCancel: () => void;
  isPaused?: boolean;
  pauseReason?: string;
}

export const ProcessingProgress = ({
  current,
  total,
  currentFileName,
  errors,
  onCancel,
  isPaused,
  pauseReason,
}: ProcessingProgressProps) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-medium text-foreground">
            Processing document {current + 1} of {total}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1">
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>

      <Progress value={percentage} className="h-3" />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="truncate max-w-[300px]">{currentFileName}</span>
        <span>{percentage}%</span>
      </div>

      {isPaused && pauseReason && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{pauseReason}</AlertDescription>
        </Alert>
      )}

      {errors.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{errors.length} document(s) failed</span>
        </div>
      )}
    </div>
  );
};

interface ProcessingSummaryProps {
  total: number;
  successful: number;
  errors: string[];
}

export const ProcessingSummary = ({ total, successful, errors }: ProcessingSummaryProps) => {
  if (errors.length === 0) return null;

  return (
    <Alert variant={successful === 0 ? "destructive" : "default"}>
      {successful > 0 ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertDescription>
        <p className="font-medium">
          {successful} of {total} documents processed successfully
        </p>
        {errors.length > 0 && (
          <ul className="mt-2 list-disc pl-4 text-sm">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
};
