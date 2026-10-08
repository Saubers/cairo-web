"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";

interface ImageDropzoneProps {
  /** Allow selecting/dropping more than one file at once. */
  multiple?: boolean;
  isUploading: boolean;
  onFilesSelected: (files: File[]) => void;
  label?: string;
}

/**
 * Drag-and-drop (or click-to-browse) image upload zone shared by
 * `ProductForm` and `CollectionForm`. Purely a file-picking UI — the caller
 * owns the actual Supabase Storage upload and resulting preview state.
 */
export function ImageDropzone({
  multiple = false,
  isUploading,
  onFilesSelected,
  label = "Arrastrá imágenes aquí o hacé clic para subir",
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    event.target.value = "";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
        isDraggingOver
          ? "border-cairo-primary bg-cairo-primary/5"
          : "border-cairo-text/15 hover:border-cairo-text/30"
      }`}
    >
      {isUploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-cairo-primary" />
      ) : (
        <UploadCloud className="h-6 w-6 text-cairo-text/40" />
      )}
      <p className="text-sm text-cairo-text/60">
        {isUploading ? "Subiendo..." : label}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleInputChange}
        disabled={isUploading}
        className="hidden"
      />
    </div>
  );
}
