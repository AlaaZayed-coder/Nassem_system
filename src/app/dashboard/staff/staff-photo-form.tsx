"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { updateStaffPhotoAction, removeStaffPhotoAction } from "./actions";

export function StaffPhotoForm({ staffId, name, photoUrl }: { staffId: string; name: string; photoUrl: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      try {
        await updateStaffPhotoAction(staffId, formData);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await removeStaffPhotoAction(staffId);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const initial = name.trim().charAt(0) || "؟";

  return (
    <div className="flex items-center gap-3 pb-2">
      <div className="relative shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="w-16 h-16 rounded-full object-cover border border-slate-200" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl">
            {initial}
          </div>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -left-1 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
          title="تغيير الصورة"
        >
          <Camera className="h-3.5 w-3.5 text-slate-500" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-500">{isPending ? "جاري الحفظ..." : "الصورة الشخصية"}</span>
        {photoUrl && (
          <button type="button" disabled={isPending} onClick={handleRemove} className="text-xs text-rose-500 hover:text-rose-700 transition flex items-center gap-1 self-start">
            <Trash2 className="h-3 w-3" /> إزالة الصورة
          </button>
        )}
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
