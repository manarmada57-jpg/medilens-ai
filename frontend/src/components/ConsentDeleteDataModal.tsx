import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Loader2,
  FileText,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';

interface ConsentDeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

export const ConsentDeleteDataModal: React.FC<ConsentDeleteDataModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setDeleteError('Please enter your password to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await authApi.deleteMe(password);
      // Backend returns 204 and authApi clears tokens and triggers medilens:logout
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.message || 'Incorrect password or deletion failed.');
      } else {
        setDeleteError('Failed to delete account. Please verify your password.');
      }
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#d8ecea] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0a7075] to-[#0d878d] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="consent-modal-title" className="text-sm font-black leading-tight">
                Privacy, Consent & Data Rights
              </h2>
              <p className="text-[11px] text-teal-100">
                Transparent control over your health information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Active Consent Status */}
          <div className="p-4 rounded-2xl bg-[#f0faf9] border border-[#a2e3de] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#0a7075] uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Active Patient Consent Record</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Account registered for <span className="font-bold text-gray-900">{userName || 'Patient'}</span> ({userEmail || 'active user'}).
              Consent was confirmed for encrypted medical document translation and personalized wellness support.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-gray-600">
              <div className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-teal-100">
                <Lock className="w-3.5 h-3.5 text-[#0a7075]" />
                <span>Encrypted medical storage</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-teal-100">
                <FileText className="w-3.5 h-3.5 text-[#0a7075]" />
                <span>Zero data sharing with 3rd parties</span>
              </div>
            </div>
          </div>

          {/* Data Protection Commitment */}
          <div className="text-xs text-gray-600 space-y-1.5 leading-relaxed bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h4 className="font-bold text-gray-800 text-[11.5px] uppercase tracking-wider">
              Your Data Ownership & Privacy Rights
            </h4>
            <p>
              • All uploaded pathology reports, prescriptions, and medical histories are stored exclusively under your private account.
            </p>
            <p>
              • MediLens AI is an educational assistant and complies with patient privacy principles. You maintain 100% ownership over all uploaded records.
            </p>
            <p>
              • You may permanently wipe your records at any time using the button below.
            </p>
          </div>

          {/* Delete My Data Section */}
          {!showDeleteConfirm ? (
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-900">Permanent Data Erasure</p>
                <p className="text-[11px] text-gray-500">Wipe all reports, history, and account data</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Delete My Data & Account</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-red-900 uppercase tracking-wide">
                    Confirm Permanent Erasure
                  </h4>
                  <p className="text-xs text-red-700 leading-relaxed">
                    This action is <span className="font-bold underline">irreversible</span>.
                    All your uploaded reports, complete blood count analyses, prescription records, and health profile will be permanently erased immediately.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-2.5 rounded-xl bg-white border border-red-300 text-xs font-bold text-red-700">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-red-900 mb-1">
                  Enter Account Password to Confirm:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your current password"
                  required
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPassword('');
                    setDeleteError(null);
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
