import React, { useState } from 'react';
import { X, Plus, Pill, Clock, Calendar, AlertCircle } from 'lucide-react';
import { Medication } from '../types';
import { medicinesApi } from '../api';

interface AddMedicineModalProps {
  onClose: () => void;
  onAdd: (med: Medication) => void;
}

export const AddMedicineModal: React.FC<AddMedicineModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeSlot, setTimeSlot] = useState<'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'>('MORNING');
  const [exactTime, setExactTime] = useState('08:00');
  const [category, setCategory] = useState('Routine Care');
  const [pillsTotal, setPillsTotal] = useState<number>(30);
  const [pharmacy, setPharmacy] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTimeSlotChange = (slot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT') => {
    setTimeSlot(slot);
    if (slot === 'MORNING') setExactTime('08:00');
    else if (slot === 'AFTERNOON') setExactTime('13:00');
    else if (slot === 'EVENING') setExactTime('20:00');
    else setExactTime('22:00');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Medicine name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    const timeDisplay = exactTime
      ? new Date(`1970-01-01T${exactTime}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : timeSlot === 'MORNING' ? '8:00 AM' : timeSlot === 'AFTERNOON' ? '1:00 PM' : '8:00 PM';

    const newMed: Medication = {
      id: `med-${Date.now()}`,
      name: dosage ? `${name.trim()} ${dosage.trim()}` : name.trim(),
      dosage: dosage.trim() || '1 dose',
      instructions: instructions.trim() || 'Take with water as directed',
      times: [exactTime],
      timeSlot,
      timeDisplay,
      taken: false,
      category,
      pillsLeft: pillsTotal,
      pillsTotal: pillsTotal,
      pharmacy: pharmacy.trim() || undefined,
      phone: phone.trim() || undefined,
      dueStatusType: 'upcoming',
      dueStatus: `Upcoming at ${timeDisplay}`,
    };

    try {
      // Persist to backend if API is connected
      const created = await medicinesApi.createMedicine({
        name: newMed.name,
        dosage: newMed.dosage,
        instructions: newMed.instructions,
        times: [exactTime],
        timeSlot,
        timeDisplay,
        category,
        pillsTotal,
        pillsLeft: pillsTotal,
        pharmacy: pharmacy.trim() || undefined,
        phone: phone.trim() || undefined,
        source: 'manual',
      });
      onAdd(created);
      onClose();
    } catch {
      // Offline fallback: update local state
      onAdd(newMed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[#d8ecea] animate-in fade-in slide-in-from-bottom duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Add Medication</h2>
              <span className="text-[11px] text-gray-500">Track doses & refill schedule</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Metformin, Lisinopril, Amlodipine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Strength / Dosage
              </label>
              <input
                type="text"
                placeholder="e.g. 500mg, 1 tablet"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075] bg-white"
              >
                <option value="Routine Care">Routine Care</option>
                <option value="Blood Pressure">Blood Pressure</option>
                <option value="Diabetes">Diabetes</option>
                <option value="Pain Relief">Pain Relief</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="Supplements">Supplements</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Time Slot
              </label>
              <select
                value={timeSlot}
                onChange={(e) => handleTimeSlotChange(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075] bg-white"
              >
                <option value="MORNING">Morning (8:00 AM)</option>
                <option value="AFTERNOON">Afternoon (1:00 PM)</option>
                <option value="EVENING">Evening (8:00 PM)</option>
                <option value="NIGHT">Night (10:00 PM)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Exact Time (HH:MM)
              </label>
              <input
                type="time"
                value={exactTime}
                onChange={(e) => setExactTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075] bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Take with food, swallow whole with water"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Pill Quantity (for refill alerts)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={pillsTotal}
                onChange={(e) => setPillsTotal(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Pharmacy Phone (optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0a7075] hover:bg-[#085a5e] text-white text-xs font-bold shadow-sm active:scale-98 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Add Medication'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
