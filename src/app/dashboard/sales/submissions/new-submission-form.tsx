"use client";

import { useRef, useState } from "react";
import { createWebSubmissionAction } from "./actions";
import { Send, Mic, Square, ImagePlus, X } from "lucide-react";

export function NewSubmissionForm() {
  const [isPending, setIsPending] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName && !customerPhone) {
      alert("أدخل اسم العميل أو رقم هاتفه على الأقل");
      return;
    }
    if (!text && !imageFile && !audioBlob) {
      alert("أضف نصاً أو صورة أو تسجيلاً صوتياً على الأقل");
      return;
    }
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("submitted_by_name", name);
      formData.append("customer_name", customerName);
      formData.append("customer_phone", customerPhone);
      formData.append("customer_address", customerAddress);
      formData.append("text_content", text);
      if (imageFile) formData.append("file", imageFile);
      else if (audioBlob) formData.append("file", new File([audioBlob], "voice.webm", { type: "audio/webm" }));

      const result = await createWebSubmissionAction(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        setText("");
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setImageFile(null);
        setAudioBlob(null);
        setAudioUrl(null);
        alert("تم إرسال الطلبية بنجاح، ستصل لمعالج الطلبيات.");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">اسمك</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none" placeholder="اسم المندوب أو المدير" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
        <div>
          <label className="block text-xs font-bold text-indigo-900 mb-1.5">اسم العميل</label>
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none" placeholder="اسم العميل" />
        </div>
        <div>
          <label className="block text-xs font-bold text-indigo-900 mb-1.5">رقم هاتف العميل</label>
          <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none dir-ltr text-left" placeholder="059..." />
        </div>
        <div className="col-span-full">
          <label className="block text-xs font-bold text-indigo-900 mb-1.5">عنوان العميل (اختياري)</label>
          <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none" placeholder="المدينة، الحي..." />
        </div>
        <p className="col-span-full text-[11px] text-indigo-700">الاسم أو الهاتف مطلوب أحدهما على الأقل — لربط الطلبية بسجل العميل التاريخي.</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">تفاصيل الطلبية (نص)</label>
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none resize-none" placeholder="اكتب تفاصيل الطلبية هنا إن كانت نصية..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">أو أرفق صورة ورقة الطلبية</label>
          {imageFile ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm">
              <span className="truncate">{imageFile.name}</span>
              <button type="button" onClick={() => setImageFile(null)} className="text-rose-500"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 cursor-pointer hover:bg-slate-50">
              <ImagePlus className="h-4 w-4" /> اختر صورة
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">أو سجّل تسجيلاً صوتياً</label>
          {audioUrl ? (
            <div className="flex items-center gap-2">
              <audio controls src={audioUrl} className="flex-1 h-10" />
              <button type="button" onClick={() => { setAudioBlob(null); setAudioUrl(null); }} className="text-rose-500"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition ${
                isRecording ? "border-rose-300 bg-rose-50 text-rose-700" : "border-dashed border-slate-300 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isRecording ? "إيقاف التسجيل" : "بدء تسجيل صوتي"}
            </button>
          )}
        </div>
      </div>

      <button disabled={isPending} type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50">
        <Send className="h-4 w-4" />
        {isPending ? "جاري الإرسال..." : "إرسال الطلبية لمعالج الطلبيات"}
      </button>
    </form>
  );
}
