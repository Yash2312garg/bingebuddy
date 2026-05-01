import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import "./DragAndDrop.css";
import type { DragAndDropInputProps, FileWithPreview } from "../../Types/DragAndDrop";

const DragAndDrop: React.FC<DragAndDropInputProps> = ({
    onChange,
    initialFiles =[],
    maxFiles=0,
    maxSize=10485760,
    minSize=0,
    accept,
    multiple = true,
    dragActiveText = "Drop the files here ...",
    dragInactiveText = "Drag 'n' drop some files here, or click to select files",
    showPreview = true,
    previewType = "grid",
    disabled = false,
    className = "",
    onError ,
    onDropRejected,
    validateFile,
    onFileRemove,
    onFileClick,
    showFileSize = true,
    showFileName = true,
    showRemoveButton = true,
    allowReorder = false,
    renderPreview,
    renderEmptyState}) => {
  const [dropped_Files, setDroppped_files] = useState<FileWithPreview[]>(initialFiles);

  useEffect(()=>{
    return ()=>{
      dropped_Files.forEach((file:FileWithPreview)=>{
        if(file.preview){
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  },[dropped_Files])

  useEffect(()=>{
    if(onChange){
      onChange(dropped_Files)
    }
  },[dropped_Files,dropped_Files])



  const formatFormSizeForDisplay=(bytes:number):string=>{
    if(bytes ===0){
      return "0 Bytes"
    }
    const k = 1024;
    const sizes = ["Bytes","KB","MB","GB"];
    const i = Math.floor(Math.log(bytes)/Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }


 const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[], event: any) => {
      // Custom validation
      const validFiles = acceptedFiles.filter((file) => {
        if (validateFile) {
          const result = validateFile(file);
          if (result !== true) {
            if (onError) {
              onError(typeof result === "string" ? result : `Invalid file: ${file.name}`);
            }
            return false;
          }
        }
        return true;
      });

      // Check max files limit
      if (maxFiles && dropped_Files.length + validFiles.length > maxFiles) {
        if (onError) {
          onError(`Maximum ${maxFiles} files allowed`);
        }
        validFiles.splice(maxFiles - dropped_Files.length);
      }

      // Create file objects with preview URLs
      const filesWithPreview = validFiles.map((file) => {
        const fileWithPreview = Object.assign(file, {
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : "",
          id: `${file.name}-${Date.now()}-${Math.random()}`,
        }) as FileWithPreview;
        return fileWithPreview;
      });

      setDroppped_files((prev) => {
        // Revoke old URLs if replacing (when multiple is false)
        if (!multiple) {
          prev.forEach((file) => {
            if (file.preview) {
              URL.revokeObjectURL(file.preview);
            }
          });
          return filesWithPreview;
        }
        return [...prev, ...filesWithPreview];
      });
    },
    [dropped_Files.length, maxFiles, multiple, onError, validateFile]
  );
    const handleDropRejected = useCallback(
    (fileRjections:any[])=>{
      if(onDropRejected){
        onDropRejected(fileRjections)
      }
      if(onError && fileRjections.length>0){
        const errors = fileRjections.map(rejections=>{
          const errorMessage = rejections.errors.map((e:any)=>e.message).join(", ");
          return `${rejections.file.name}: ${errorMessage}`;
        })

        onError(errors.join("; "))
      }
    },[onError, onDropRejected]);

    //configure dropzone 

    const {getRootProps, getInputProps, isDragActive }= useDropzone({
      onDrop, 
      onDropRejected:handleDropRejected,
      accept,
      maxSize,
      minSize,
      multiple,
      disabled,
      maxFiles: maxFiles ? maxFiles - dropped_Files.length : undefined,
    })

    //remove file handler 

    const onClickRemoveFileHandler = (
      e: React.MouseEvent<HTMLButtonElement>,
      fileToRemove: FileWithPreview)=>{

        e.stopPropagation();
        if (fileToRemove.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }

        setDroppped_files((prev) => prev.filter((file) => file.id !== fileToRemove.id));

        if (onFileRemove) {
          onFileRemove(fileToRemove);
        }

    }
    const handleFileClick = (
    e: React.MouseEvent<HTMLDivElement>,
    file: FileWithPreview
  ) => {
    if (onFileClick) {
      e.stopPropagation();
      onFileClick(file);
    }
  };
  const getFileIcon = (file: File): string => {
    if (file.type.startsWith("image/")) return "🖼️";
    if (file.type.startsWith("video/")) return "🎥";
    if (file.type.startsWith("audio/")) return "🎵";
    if (file.type.includes("pdf")) return "📄";
    if (file.type.includes("word") || file.type.includes("document")) return "📝";
    if (file.type.includes("sheet") || file.type.includes("excel")) return "📊";
    if (file.type.includes("zip") || file.type.includes("compressed")) return "🗜️";
    return "📎";
  };

  const defualtPreviewRenderer = (file:FileWithPreview)=>{
    const isImage = file.type.startsWith("image/");
    return (
      <div 
      key = {file.id}
     className={`preview-item ${previewType === "list" ? "preview-item-list" : ""} ${
          onFileClick ? "clickable" : ""
        }`}
         onClick={(e) => handleFileClick(e, file)}
        >
      {showRemoveButton && (
          <button
            onClick={(e) => onClickRemoveFileHandler(e, file)}
            aria-label={`Remove ${file.name}`}
            className="remove-button"
            type="button"
          >
            ×
          </button>
        )}
        <div className="preview-content">
          {isImage && file.preview ? (
            <img src={file.preview} alt={file.name} className="preview-image" />
          ) : (
            <div className="file-icon">{getFileIcon(file)}</div>
          )}
        </div>
        {(showFileName || showFileSize) && (
          <div className="file-info">
            {showFileName && <p className="file-name">{file.name}</p>}
            {showFileSize && <p className="file-size">{formatFormSizeForDisplay(file.size)}</p>}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className={`dnd-wrapper ${className}`}>
      <div
        {...getRootProps()}
        className={`dnd-container ${isDragActive ? "drag-active" : ""} ${
          disabled ? "disabled" : ""
        } ${dropped_Files.length > 0 ? "has-files" : ""}`}
      >
        <input {...getInputProps()} />

        <div className="dnd-content">
          {isDragActive ? (
            <p className="dnd-text">{dragActiveText}</p>
          ) : (
            <p className="dnd-text">{dragInactiveText}</p>
          )}

          {maxFiles && (
            <p className="file-limit">
              {dropped_Files.length} / {maxFiles} files
            </p>
          )}
        </div>
      </div>

      {showPreview && dropped_Files.length > 0 && (
        <div className={`preview-container ${previewType}`}>
          {dropped_Files.map((file, index) =>
            renderPreview ? renderPreview(file, index) : defualtPreviewRenderer(file)
          )}
        </div>
      )}

      {showPreview && dropped_Files.length === 0 && renderEmptyState && (
        <div className="empty-state">{renderEmptyState()}</div>
      )}
    </div>
  );
};

export default DragAndDrop;