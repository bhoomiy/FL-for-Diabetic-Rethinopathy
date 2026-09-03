import { useState } from "react";
import { Loader2, ScanEye } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ChartCard from "@/components/common/ChartCard";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import PerformanceBar from "@/components/charts/PerformanceBar";
import FileUploader from "@/components/prediction/FileUploader";
import { predictImage } from "@/services/predictionService";
import { RESEARCH_DISCLAIMER } from "@/constants/drClasses";
import { percent } from "@/components/charts/chartTheme";

export default function PredictionPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const onFileSelected = (selected, validationError) => {
    setResult(null);
    setError(validationError ?? "");
    if (validationError || !selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const clear = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError("");
  };

  const analyse = async () => {
  if (!file) {
    setError("Please choose a retinal fundus image.");
    return;
  }

  try {
    setLoading(true);
    setError("");

    const prediction = await predictImage(file);

    setResult(prediction);
  } catch (error) {
    console.error("Prediction failed:", error);

    setError(
      error.message || "Prediction failed. Please try again."
    );

    setResult(null);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tools" title="Retinal image prediction"
        description="Run a single fundus image against the current global federated model."
        actions={
  <StatusBadge tone="success">
    Global model inference
  </StatusBadge>
}>

</PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Upload fundus image" subtitle="The image is securely processed by the federated model inference service">
          <FileUploader file={file} previewUrl={previewUrl} onFileSelected={onFileSelected} onClear={clear} error={error} />
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={analyse} disabled={loading || !file}>
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ScanEye className="size-4" aria-hidden="true" />}
              {loading ? "Analysing…" : "Analyse image"}
            </Button>
            <Button variant="outline" onClick={clear} disabled={loading || !file}>Reset</Button>
          </div>
        </ChartCard>

        <ChartCard title="Prediction result" subtitle={result ? `Global model ${result.modelVersion}` : "Awaiting an image"}
          footer={RESEARCH_DISCLAIMER}>
          {result ? (
            <div className="space-y-5" aria-live="polite">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Predicted stage</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{result.predictedClass}</p>
                <p className="mt-1 text-sm text-muted-foreground">Confidence {percent(result.confidence)}</p>
              </div>
              <div className="space-y-4">
                {result.probabilities.map((p) => (
                  <PerformanceBar key={p.key} label={p.label} value={p.probability} />
                ))}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Upload a retinal fundus image to see the predicted diabetic retinopathy stage and per-class confidence.
            </p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
