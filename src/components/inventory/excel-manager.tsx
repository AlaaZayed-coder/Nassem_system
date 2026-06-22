"use client";

import { useState, useRef, useTransition } from "react";
import { Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { exportItemsToExcel, importItemsFromExcel } from "@/app/dashboard/inventory/excel-actions";

export function ExcelManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, startImportTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const result = await exportItemsToExcel();
      
      if (!result.success || !result.data) {
        alert("حدث خطأ أثناء التصدير: " + (result.error || "خطأ غير معروف"));
        return;
      }

      const base64 = result.data;
      
      // Convert base64 to Blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      // Create a link and download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `الأسعار_والأصناف_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("حدث خطأ أثناء التصدير. يرجى المحاولة مرة أخرى.");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("هل أنت متأكد أنك تريد تحديث أسعار الأصناف من هذا الملف؟ (هذا الإجراء سيقوم بتعديل الأسعار في قاعدة البيانات)")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startImportTransition(async () => {
      try {
        const result = await importItemsFromExcel(formData);
        alert(`تمت العملية بنجاح! تم معالجة ${result.count} صنف.`);
      } catch (err: any) {
        alert("خطأ أثناء الاستيراد: " + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={isExporting || isImporting}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold transition disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        تصدير للإكسل
      </button>

      <div className="relative">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
          disabled={isImporting || isExporting}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting || isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-xl font-bold transition disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          استيراد الأسعار
        </button>
      </div>
    </div>
  );
}
