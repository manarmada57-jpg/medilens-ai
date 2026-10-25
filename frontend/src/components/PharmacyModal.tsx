import React, { useState } from 'react';
import { X, PhoneCall, Check, Building2, FileText, Copy, Edit2, Save, AlertCircle } from 'lucide-react';
import { RefillAlert } from '../types';
import { profileApi, medicinesApi } from '../api';

interface PharmacyModalProps {
  refill: RefillAlert;
  onClose: () => void;
  onMarkRefilled?: (medicationName: string) => void;
}

export const PharmacyModal: React.FC<PharmacyModalProps> = ({
  refill,
  onClose,
  onMarkRefilled,
}) => {
  const [copied, setCopied] = useState(false);
  const [markingRefill, setMarkingRefill] = useState(false);
  const [refillMarked, setRefillMarked] = useState(false);
  const [isEditingPharmacy, setIsEditingPharmacy] = useState(false);
  const [pharmacyName, setPharmacyName] = useState(refill.pharmacy || '');
  const [pharmacyPhone, setPharmacyPhone] = useState(refill.phone || '');
  const [savingPharmacy, setSavingPharmacy] = useState(false);
  const [pharmacySaved, setPharmacySaved] = useState(false);

  const handleCall = () => {
    if (pharmacyPhone) {
      window.location.href = `tel:${pharmacyPhone.replace(/\D/g, '')}`;
    }
  };

  const handleCopyDetails = async () => {
    const details = `Medication: ${refill.medicationName}\nRx Number: ${refill.prescriptionNumber || 'N/A'}\nPharmacy: ${pharmacyName} (${pharmacyPhone})`;
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleMarkAsRefilled = async () => {
    setMarkingRefill(true);
    try {
      if (refill.id) {
        await medicinesApi.updateMedicine(refill.id, {
          pillsLeft: 30, // reset to standard monthly count
        });
      }
      setRefillMarked(true);
      if (onMarkRefilled) {
        onMarkRefilled(refill.medicationName);
      }
    } catch {
      // Still show state if offline
      setRefillMarked(true);
    } finally {
      setMarkingRefill(false);
    }
  };

  const handleSavePharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPharmacy(true);
    try {
      await profileApi.updatePharmacy({
        name: pharmacyName,
        phone: pharmacyPhone,
      });
      setPharmacySaved(true);
      setIsEditingPharmacy(false);
      setTimeout(() => setPharmacySaved(false), 2500);
    } catch {
      setIsEditingPharmacy(false);
    } finally {
      setSavingPharmacy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[#d8ecea] animate-in fade-in slide-in-from-bottom duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Pharmacy & Refill Action</h2>
              <span className="text-[11px] text-gray-500">{pharmacyName || 'Refill reminder'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Refill summary banner */}
        <div className="rounded-2xl bg-[#fef2f2] border-l-4 border-[#ef4444] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#991b1b] uppercase">
              {refill.pillsLeft !== undefined ? `${refill.pillsLeft} Pills Left` : 'Refill Due'}
            </span>
            <span className="text-[11px] text-[#dc2626] font-semibold">
              {refill.daysRemaining !== undefined ? `Est. ${refill.daysRemaining} days left` : 'Due soon'}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-gray-900">{refill.medicationName}</h3>
          <div className="text-xs text-gray-600 space-y-1 pt-1">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>
                Rx Number: <strong className="text-gray-900">{refill.prescriptionNumber || 'Not specified'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span>{pharmacyName || 'Local Pharmacy'} {pharmacyPhone ? `• ${pharmacyPhone}` : ''}</span>
            </div>
          </div>
        </div>

        {/* Pharmacy Details Edit Form */}
        {isEditingPharmacy ? (
          <form onSubmit={handleSavePharmacy} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
            <h4 className="text-xs font-bold text-gray-700">Update Preferred Pharmacy</h4>
            <div>
              <label className="text-[11px] text-gray-500 block mb-0.5">Pharmacy Name</label>
              <input
                type="text"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="e.g. Apollo Pharmacy, CVS"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#0a7075]"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-0.5">Phone Number</label>
              <input
                type="tel"
                value={pharmacyPhone}
                onChange={(e) => setPharmacyPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#0a7075]"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingPharmacy(false)}
                className="px-2.5 py-1 text-xs text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPharmacy}
                className="flex items-center gap-1 px-3 py-1 bg-[#0a7075] hover:bg-[#085a5e] text-white text-xs font-bold rounded-lg"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between px-1 text-xs text-gray-500">
            <span>Preferred Pharmacy details</span>
            <button
              onClick={() => setIsEditingPharmacy(true)}
              className="inline-flex items-center gap-1 text-[#0a7075] hover:underline font-semibold"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Pharmacy</span>
            </button>
          </div>
        )}

        {pharmacySaved && (
          <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pharmacy details saved successfully</span>
          </div>
        )}

        {/* Real Action Buttons */}
        <div className="space-y-2 pt-1">
          {pharmacyPhone && (
            <button
              onClick={handleCall}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#f05a3e] hover:bg-[#ea4324] text-white py-3 px-4 text-xs font-bold shadow-md active:scale-98 transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Pharmacy: {pharmacyPhone}</span>
            </button>
          )}

          <button
            onClick={handleCopyDetails}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 py-2.5 px-4 text-xs font-semibold active:scale-98 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Prescription Details Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-500" />
                <span>Copy Prescription Details</span>
              </>
            )}
          </button>

          <button
            onClick={handleMarkAsRefilled}
            disabled={refillMarked || markingRefill}
            className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 px-4 text-xs font-semibold transition-all ${
              refillMarked
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {refillMarked ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Refill Recorded (Schedule Updated)</span>
              </>
            ) : (
              <span>Mark as Refilled (Reset Count)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
