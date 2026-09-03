import { useRef, useState } from "react";
import { ImageUp, Upload, X } from "lucide-react";
import Button from "@/components/common/Button";
import { validateImageFile } from "@/services/predictionService";

export default function FileUploader({ file, previewUrl, onFileSelected, onClear, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const selected = files?.[0];
    const validationError = validateImageFile(selected);
    onFileSelected(selected ?? null, validationError);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border bg-surface"
        }`}
      >
        {previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={previewUrl}
              alt="Selected retinal fundus image preview"
              className="max-h-64 w-auto rounded-lg border border-border object-contain"
            />
            <p className="text-xs text-muted-foreground">
              {file?.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <Button variant="outline" size="sm" onClick={onClear}>
              <X className="size-4" aria-hidden="true" /> Clear image
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <ImageUp className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Drag and drop a retinal fundus image</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG, JPEG or PNG · maximum 8 MB</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" aria-hidden="true" /> Browse files
            </Button>
          </div>
        )}

        <label className="sr-only" htmlFor="fundus-file">
          Retinal fundus image
        </label>
        <input
          id="fundus-file"
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
