import { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Check, Loader2, Edit2, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProfile, updateProfile } from '../../services/api/userService';
import { getInitials } from '../../utils/formatters';
import { ALGERIA_WILAYAS } from '../cart/ShoppingBagDrawer';

export default function ProfileModal({ isOpen, onClose, onShowToast }) {
  const { user, isAdmin, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('16 - Alger');
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError('');

    getProfile()
      .then((data) => {
        setProfile(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setWilaya(data.wilaya || '16 - Alger');
        setCommune(data.commune || '');
        setAddress(data.address || '');
      })
      .catch(() => {
        setProfile(user);
        setName(user?.name || '');
        setPhone(user?.phone || '');
        setWilaya(user?.wilaya || '16 - Alger');
        setCommune(user?.commune || '');
        setAddress(user?.address || '');
      })
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        wilaya: wilaya.trim(),
        commune: commune.trim(),
        address: address.trim(),
      };
      const updated = await updateProfile(payload);
      setProfile((prev) => ({ ...prev, ...updated }));
      updateUser?.(updated);
      setEditing(false);
      onShowToast?.('Profile & delivery details updated successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.name || user?.name || 'Customer';
  const displayEmail = profile?.email || user?.email || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans-body">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white shadow-2xl w-full max-w-lg overflow-hidden z-10 p-6 md:p-8 border border-[#E8E8E8]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#0A0A0A] hover:bg-[#F7F6F2] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Avatar & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-[#0A0A0A] text-white rounded-full flex items-center justify-center text-xl font-medium mb-3">
            {getInitials(displayName)}
          </div>
          <h2 className="font-serif-display text-2xl font-normal text-[#0A0A0A]">{displayName}</h2>
          <div className="flex items-center space-x-1 mt-1">
            <span className="text-[10px] tracking-widest uppercase px-2.5 py-0.5 font-semibold bg-[#F7F6F2] text-[#0A0A0A] border border-[#E8E8E8]">
              {isAdmin ? 'Store Administrator' : 'Customer Account'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        {/* Profile Info & Edit Form */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#666] space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0A0A0A]" />
            <p className="text-xs">Loading profile…</p>
          </div>
        ) : editing ? (
          <form onSubmit={handleSave} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#CCC] text-xs focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Email Address</label>
              <input
                type="email"
                value={displayEmail}
                disabled
                className="w-full px-3 py-2 border border-[#E8E8E8] text-xs bg-[#F7F6F2] text-[#888] cursor-not-allowed"
              />
              <span className="text-[10px] text-[#888] mt-0.5 block">Email cannot be changed.</span>
            </div>

            <div className="pt-2 border-t border-[#E8E8E8]">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] mb-3">
                Default Delivery Information
              </span>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0550123456"
                    className="w-full px-3 py-2 border border-[#CCC] text-xs focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Wilaya</label>
                  <select
                    value={wilaya}
                    onChange={(e) => setWilaya(e.target.value)}
                    className="w-full px-3 py-2 border border-[#CCC] text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
                  >
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Commune</label>
                  <input
                    type="text"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="Commune name"
                    className="w-full px-3 py-2 border border-[#CCC] text-xs focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#444] mb-1 font-medium">Delivery Address</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, building, apartment..."
                    className="w-full px-3 py-2 border border-[#CCC] text-xs focus:outline-none focus:border-[#0A0A0A] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-4 border-t border-[#E8E8E8]">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 py-3 text-xs uppercase tracking-wider font-medium text-[#666] hover:bg-[#F7F6F2] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-[#0A0A0A] text-white text-xs uppercase tracking-widest font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-[#F7F6F2] border border-[#E8E8E8] space-y-3">
              <div className="flex items-center space-x-3 text-xs">
                <User className="w-4 h-4 text-[#888]" />
                <div className="flex-1">
                  <span className="text-[10px] text-[#888] uppercase tracking-wider block">Full Name</span>
                  <span className="font-semibold text-[#0A0A0A]">{displayName}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs pt-2 border-t border-[#E8E8E8]">
                <Mail className="w-4 h-4 text-[#888]" />
                <div className="flex-1">
                  <span className="text-[10px] text-[#888] uppercase tracking-wider block">Email Address</span>
                  <span className="font-semibold text-[#0A0A0A]">{displayEmail}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs pt-2 border-t border-[#E8E8E8]">
                <Phone className="w-4 h-4 text-[#888]" />
                <div className="flex-1">
                  <span className="text-[10px] text-[#888] uppercase tracking-wider block">Phone Number</span>
                  <span className="font-semibold text-[#0A0A0A]">{profile?.phone || 'Not provided'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs pt-2 border-t border-[#E8E8E8]">
                <MapPin className="w-4 h-4 text-[#888]" />
                <div className="flex-1">
                  <span className="text-[10px] text-[#888] uppercase tracking-wider block">Saved Address</span>
                  <span className="font-semibold text-[#0A0A0A]">
                    {profile?.address ? `${profile.address}, ${profile.commune || ''} (${profile.wilaya || ''})` : 'Not configured yet'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditing(true)}
              className="w-full py-3.5 bg-[#0A0A0A] text-white text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile & Address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
