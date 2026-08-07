import React from 'react';
import { FileText, Image as ImageIcon, FileCheck, FileArchive, FileCode, File } from 'lucide-react';

/**
 * Returns icon component corresponding to document file type or extension.
 * @param {string} filenameOrType
 * @param {string} className
 */
export const getDocumentIcon = (filenameOrType = '', className = 'w-5 h-5') => {
  const str = String(filenameOrType).toLowerCase();

  if (str.includes('pdf')) {
    return <FileText className={`${className} text-rose-500`} />;
  }
  if (str.includes('png') || str.includes('jpg') || str.includes('jpeg') || str.includes('image') || str.includes('selfie')) {
    return <ImageIcon className={`${className} text-emerald-500`} />;
  }
  if (str.includes('zip') || str.includes('rar') || str.includes('tar')) {
    return <FileArchive className={`${className} text-amber-500`} />;
  }
  if (str.includes('doc') || str.includes('docx') || str.includes('txt')) {
    return <FileCheck className={`${className} text-blue-500`} />;
  }
  if (str.includes('json') || str.includes('xml')) {
    return <FileCode className={`${className} text-purple-500`} />;
  }
  return <File className={`${className} text-muted-foreground`} />;
};

export default getDocumentIcon;
