"use client";

import { useEffect, useRef, useState } from "react";
import { searchCustomersAction, updateSubmissionCustomerAction, addSubmissionAttachmentAction } from "./actions";
import { Search, Mic, Square, ImagePlus, X, Plus, Check } from "lucide-react";

export function EditSubmissionPanel({
  submissionId,
  currentCustomerName,
  onClose,
}: {
  submissionId: string;
  currentCustomerName: string | null;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(currentCustomerName || "");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [manualPhone, setManualPhone] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [addText, setAddText] = useState("");
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const res = await searchCustomersAction(query);
      setResults(res);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelectCustomer = async (customer: any) => {
    setSelected(customer);
    setSavingCustomer(true);
    try {
      await updateSubmissionCustomerAction(submissionId, {
        customer_name: customer.name,
        customer_phone: customer.phone,
        matched_customer_id: customer.id,
      });
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSaveManualCustomer = async () => {
    if (!query) return;
    setSavingCustomer(true);
    try {
      await updateSubmissionCustomerAction(submissionId, {
        customer_name: query,
        customer_phone: manualPhone || null,
        matched_customer_id: null,
      });
      setSelected(null);
    } finally {
      setSavingCustomer(false);
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleAddAttachment = async () => {
    if (!addText && !addImageFile && !audioBlob) {
      alert("أضف نصاً أو صورة أو تسجيلاً صوتياً على الأقل");
      return;
    }
    setIsAdding(true);
    try {
      const formData = new FormData();
      formData.append("submission_id", submissionId);
      formData.append("text_content", addText);
      if (addImageFile) formData.append("file", addImageFile);
      else if (audioBlob) formData.append("file", new File([audioBlob], "voice.webm", { type: "audio/webm" }));

      const result = await addSubmissionAttachmentAction(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        setAddText("");
        setAddImageFile(null);
        setAudioBlob(null);
        setAudioUrl(null);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 space-y-4 bg-slate-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-2xl">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">تعديل هوية العميل (بحث بالاسم أو الهاتف أو مقطع منه)</label>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-300 outline-none text-sm"
            placeholder="اسم العميل أو رقم هاتفه..."
          />
        </div>

        {searching && <p className="text-xs text-slate-400 mt-1">جاري البحث...</p>}

        {results.length > 0 && !selected && (
          <div className="mt-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCustomer(c)}
                className="w-full text-right px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0 flex items-center justify-between"
              >
                <span className="font-bold text-slate-800">{c.name}</span>
                <span className="text-xs text-slate-400" dir="ltr">{c.phone}</span>
              </button>
            ))}
          </div>
        )}

        {selected ? (
          <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            <Check className="h-3.5 w-3.5" /> تم ربط الطلبية بالعميل: {selected.name}
          </div>
        ) : (
          query.trim().length >= 2 &&
          results.length === 0 &&
          !searching && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="رقم هاتف العميل الجديد (اختياري)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm dir-ltr text-left"
              />
              <button
                type="button"
                disabled={savingCustomer}
                onClick={handleSaveManualCustomer}
                className="px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
              >
                حفظ كعميل جديد بهذا الاسم
              </button>
            </div>
          )
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">إضافة نص / صورة / تسجيل صوتي إضافي قبل الاعتماد</label>
        <textarea
          rows={2}
          value={addText}
          onChange={(e) => setAddText(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none resize-none text-sm mb-2"
          placeholder="ملاحظة أو توضيح إضافي..."
        />
        <div className="grid grid-cols-2 gap-2">
          {addImageFile ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs">
              <span className="truncate">{addImageFile.name}</span>
              <button type="button" onClick={() => setAddImageFile(null)}><X className="h-3.5 w-3.5 text-rose-500" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 cursor-pointer hover:bg-white">
              <ImagePlus className="h-3.5 w-3.5" /> إضافة صورة
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setAddImageFile(e.target.files?.[0] || null)} />
            </label>
          )}

          {audioUrl ? (
            <div className="flex items-center gap-1.5">
              <audio controls src={audioUrl} className="flex-1 h-8" />
              <button type="button" onClick={() => { setAudioBlob(null); setAudioUrl(null); }}><X className="h-3.5 w-3.5 text-rose-500" /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition ${
                isRecording ? "border-rose-300 bg-rose-50 text-rose-700" : "border-dashed border-slate-300 text-slate-500 hover:bg-white"
              }`}
            >
              {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {isRecording ? "إيقاف" : "تسجيل صوتي"}
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={isAdding}
          onClick={handleAddAttachment}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> {isAdding ? "جاري الإضافة..." : "إضافة للطلبية"}
        </button>
      </div>

      <button type="button" onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-700">
        إغلاق لوحة التعديل
      </button>
    </div>
  );
}
