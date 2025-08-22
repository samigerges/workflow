import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, File, X } from "lucide-react";
import { type FileUploadProps } from "@/lib/types";

export default function FileUpload({
  accept = ".pdf,.doc,.docx",
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  onFileSelect,
  existingFile,
  className = "",
  description = "PDF, DOC, DOCX up to 10MB"
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles(multiple ? [...selectedFiles, ...validFiles] : validFiles);
    onFileSelect?.(validFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect?.(newFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? "border-primary-400 bg-primary-50" 
            : "border-secondary-300 hover:border-primary-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="mx-auto w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
          <CloudUpload className="text-secondary-600" size={24} />
        </div>
        <p className="text-sm text-secondary-600 mb-2">
          Drop files here or{" "}
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-primary-500 font-medium"
            onClick={() => fileInputRef.current?.click()}
          >
            browse files
          </Button>
        </p>
        <p className="text-xs text-secondary-500">{description}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="text-secondary-600" size={20} />
                <div>
                  <p className="text-sm font-medium text-secondary-900">{file.name}</p>
                  <p className="text-xs text-secondary-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Existing File */}
      {existingFile && selectedFiles.length === 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <File className="text-green-600" size={20} />
              <div>
                <p className="text-sm font-medium text-secondary-900">Current file</p>
                <p className="text-xs text-secondary-500">{existingFile}</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800">Uploaded</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
