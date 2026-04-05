/**
 * useDocumentUpload.js — Upload state management hook.
 * Encapsulates uploading logic so components stay clean.
 */
import { useState, useCallback } from "react";
import useStore from "../store/useStore.js";

export function useDocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [lastUploaded, setLastUploaded] = useState(null);
  const uploadDoc = useStore((s) => s.uploadDoc);

  const upload = useCallback(async (file) => {
    if (!file) return;

    const allowed = ["pdf", "docx", "txt", "md"];
    const ext = file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError(`File type .${ext} not supported. Use: ${allowed.join(", ")}`);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File too large. Max 20MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadDoc(file);
      setLastUploaded(result);
      return result;
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  }, [uploadDoc]);

  return { upload, uploading, uploadError, lastUploaded, setUploadError };
}
