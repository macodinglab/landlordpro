import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Input, Modal } from "../../components";
import {
  Edit2,
  Mail,
  Phone,
  Camera,
  User,
  X,
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertCircle,
  Upload,
  Shield,
  Lock,
  Activity,
  Settings,
  Eye,
  EyeOff,
  Clock,
  MapPin
} from "lucide-react";
import defaultAvatar from "../../assets/react.svg";
import { getProfile, updateProfile, uploadAvatar, updatePassword } from "../../services/UserService";
import { saveLoggedInUser } from "../../services/AuthService";
import { showSuccess, showError } from "../../utils/toastHelper";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profile = await getProfile();
      setUser(profile.user);
      saveLoggedInUser(profile.user);
    } catch (err) {
      showError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);

      if (!editData.full_name?.trim()) {
        showError("Full name is required");
        return;
      }

      if (!editData.email?.trim()) {
        showError("Email is required");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editData.email)) {
        showError("Please enter a valid email address");
        return;
      }

      let avatarUrl = editData.avatar;
      if (editData.avatar instanceof File) {
        setUploadingAvatar(true);
        try {
          const uploaded = await uploadAvatar(editData.avatar);
          avatarUrl = uploaded.avatar;
        } catch (err) {
          showError("Failed to upload avatar");
          return;
        } finally {
          setUploadingAvatar(false);
        }
      }

      const dataToUpdate = {
        ...editData,
        avatar: avatarUrl,
      };

      const updated = await updateProfile(dataToUpdate);
      const updatedUser = updated?.user || updated;
      setUser(updatedUser);
      saveLoggedInUser(updatedUser);
      setEditModalOpen(false);
      setAvatarPreview(null);
      showSuccess("Profile updated successfully!");
    } catch (err) {
      showError(err.message || err.response?.data?.message || "Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showError("All password fields are required");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError("New password must be at least 8 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("New passwords do not match");
      return;
    }

    try {
      setSaving(true);
      await updatePassword({
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showSuccess("Password changed successfully!");
      setPasswordModalOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showError(err.message || err.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB");
      return;
    }

    setEditData({ ...editData, avatar: file });
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCloseModal = useCallback(() => {
    setEditModalOpen(false);
    setAvatarPreview(null);
    setEditData({});
  }, []);

  const handleEditClick = () => {
    setEditData({ ...user });
    setAvatarPreview(null);
    setEditModalOpen(true);
  };

  const handleRemovePreview = () => {
    setAvatarPreview(null);
    setEditData({ ...editData, avatar: user.avatar });
  };

  const calculateCompletion = () => {
    let completed = 0;
    let total = 5;

    if (user?.full_name) completed++;
    if (user?.email) completed++;
    if (user?.phone) completed++;
    if (user?.avatar && user.avatar !== defaultAvatar) completed++;
    if (user?.is_active) completed++;

    return Math.round((completed / total) * 100);
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const resolveAvatarUrl = (avatar) => {
    if (!avatar) return defaultAvatar;
    if (typeof avatar === 'string' && avatar.startsWith('http')) return avatar;
    if (typeof avatar === 'string' && avatar.startsWith('/uploads')) {
      const base = API_BASE_URL.replace(/\/$/, '');
      return `${base}${avatar}`;
    }
    return avatar;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 border-l border-gray-800/50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold uppercase tracking-widest italic text-[10px]">Synchronizing Identity...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 border-l border-gray-800/50">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 w-12 h-12 mb-4" />
          <p className="text-gray-500 mb-4 font-black uppercase italic tracking-widest text-xs font-bold">Failed to load core profile</p>
          <div className="relative z-10">
            <Button
              onClick={handleBack}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-lg px-8 py-3 rounded-xl font-black italic uppercase text-xs"
            >
              <ArrowLeft size={18} /> Return to Portal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayAvatar = avatarPreview || resolveAvatarUrl(user.avatar);
  const completionPercentage = calculateCompletion();

  return (
    <div className="min-h-screen bg-gray-950 border-l border-gray-800/50">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-teal-950 via-indigo-950 to-slate-950 text-white border-b border-gray-800/50">
        {/* Abstract shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-16 space-y-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleBack}
                  className="flex items-center gap-2 bg-gray-800/40 hover:bg-gray-800 text-white backdrop-blur border border-gray-700/50 transition-all font-black uppercase text-[10px] tracking-widest italic px-4 py-2 rounded-xl"
                >
                  <ArrowLeft size={16} /> Return
                </Button>
                <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                  <Shield size={12} /> Verification Level: High
                </div>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                  User <span className="text-teal-500">Identity</span>
                </h1>
                <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                  Credential management and security manifestation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
              <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-gray-700/50 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-500">
                  <Activity size={40} className="text-teal-500" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mb-1">Pulse Status</p>
                <div className="flex items-center gap-3">
                  {user.is_active ? <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" /> : <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                  <p className="text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase">{user.is_active ? 'Nominal' : 'Offline'}</p>
                </div>
                <p className="text-[10px] font-black text-teal-400 mt-2 uppercase italic tracking-widest leading-none">{user.role}</p>
              </div>

              <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-gray-700/50 shadow-2xl overflow-hidden group">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mb-1">Matrix Integrity</p>
                <div className="flex items-end gap-2">
                  <p className="text-xl sm:text-2xl font-black italic tracking-tighter text-white leading-none">{completionPercentage}%</p>
                  <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase italic mb-0.5 tracking-widest">Complete</span>
                </div>

                <div className="w-full bg-gray-900/50 rounded-full h-1.5 mt-4 overflow-hidden border border-gray-800/30">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 -mt-12 pb-12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 space-y-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Profile Card */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 sm:p-10 text-center bg-gray-800/40 backdrop-blur-sm shadow-2xl border-gray-700/50 group" hover={false}>
                <div className="relative inline-block mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <img
                    src={displayAvatar}
                    alt="Profile"
                    className="w-24 h-24 sm:w-40 sm:h-40 rounded-2xl sm:rounded-[2.5rem] object-cover border-4 border-gray-800 shadow-2xl mx-auto relative z-10 grayscale-[30%] group-hover:grayscale-0 transition-all duration-500"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultAvatar;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 z-20 bg-teal-600 text-white p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl border-2 sm:border-4 border-gray-900 group-hover:scale-110 transition-transform">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <h2 className="text-3xl font-black text-white italic truncate tracking-tighter mb-1 uppercase">{user.full_name}</h2>
                <div className="flex items-center justify-center gap-2 mb-10">
                  <Shield className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-teal-400 font-black text-[10px] uppercase tracking-widest italic">{user.role} Matrix</span>
                </div>

                <div className="space-y-3 mb-10">
                  <div className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30 group/row hover:bg-gray-700/30 transition-all">
                    <div className="p-2 rounded-lg bg-gray-800 text-gray-400 group-hover/row:text-teal-400">
                      <Mail size={14} />
                    </div>
                    <span className="text-[10px] font-black text-gray-500 uppercase italic tracking-wider truncate flex-1 text-left">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30 group/row hover:bg-gray-700/30 transition-all">
                    <div className="p-2 rounded-lg bg-gray-800 text-gray-400 group-hover/row:text-teal-400">
                      <Phone size={14} />
                    </div>
                    <span className="text-[10px] font-black text-gray-500 uppercase italic tracking-wider truncate flex-1 text-left">{user.phone || 'NONE SPECIFIED'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleEditClick}
                    className="w-full flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-500 text-white py-3.5 sm:py-4 rounded-xl shadow-lg transition-all font-black uppercase text-[10px] tracking-widest italic"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modify identity
                  </Button>

                  <Button
                    onClick={() => setPasswordModalOpen(true)}
                    className="w-full flex items-center justify-center gap-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-400 py-3.5 sm:py-4 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest italic"
                  >
                    <Lock className="w-4 h-4" />
                    Security Override
                  </Button>
                </div>
              </Card>

              {/* Status Card */}
              <Card className="p-8 bg-gray-800/40 backdrop-blur-sm border-gray-700/50" hover={false}>
                <h3 className="text-sm font-black text-white italic uppercase tracking-widest mb-6 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Activity size={18} className="text-indigo-400" />
                  </div>
                  Operational Pulse
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/20">
                    <span className="text-[10px] font-black text-gray-500 border-r border-gray-700 pr-4 uppercase italic tracking-widest">Commissioned</span>
                    <span className="text-[10px] font-black text-white uppercase italic tracking-widest">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/20">
                    <span className="text-[10px] font-black text-gray-500 border-r border-gray-700 pr-4 uppercase italic tracking-widest">Last Signal</span>
                    <span className="text-[10px] font-black text-white uppercase italic tracking-widest">
                      {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Details */}
            <div className="lg:col-span-2 space-y-8">

              {/* Contact Info */}
              <Card className="p-6 sm:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50" hover={false}>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <div className="p-2.5 bg-teal-500/10 rounded-xl">
                    <User size={24} className="text-teal-400" />
                  </div>
                  Core Identity Matrix
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-1">Manifest Name</label>
                    <div className="p-4 sm:p-5 bg-gray-900/50 rounded-2xl border border-gray-700/30 font-black text-white italic uppercase text-xs sm:text-sm tracking-tight truncate">
                      {user.full_name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-1">Identity UID</label>
                    <div className="p-4 sm:p-5 bg-gray-900/50 rounded-2xl border border-gray-700/30 font-mono text-[10px] sm:text-xs text-gray-400 truncate">
                      {user.id}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-1">Communication Channel</label>
                    <div className="p-4 sm:p-5 bg-gray-900/50 rounded-2xl border border-gray-700/30 font-black text-white italic uppercase text-xs sm:text-sm tracking-tight flex items-center gap-3 overflow-hidden">
                      <Mail size={16} className="text-gray-600 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic ml-1">Mobile Uplink</label>
                    <div className="p-4 sm:p-5 bg-gray-900/50 rounded-2xl border border-gray-700/30 font-black text-white italic uppercase text-xs sm:text-sm tracking-tight flex items-center gap-3 truncate">
                      <Phone size={16} className="text-gray-600 shrink-0" />
                      {user.phone || <span className="text-gray-600 italic">OFFLINE</span>}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Security Card */}
              <Card className="p-6 sm:p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50" hover={false}>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                    <Shield size={24} className="text-indigo-400" />
                  </div>
                  Defense Parameters
                </h3>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 bg-gray-900/50 rounded-2xl border border-gray-700/30 group/sec hover:bg-gray-700/20 transition-all gap-6">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="p-3 sm:p-4 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700/50 group-hover/sec:scale-110 transition-transform shrink-0">
                        <Lock size={20} className="sm:size-24 text-gray-600 group-hover/sec:text-teal-400" />
                      </div>
                      <div>
                        <p className="font-black text-white italic uppercase text-xs sm:text-sm tracking-tight">Access Protocol</p>
                        <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase italic tracking-widest mt-1">Periodic rotation recommended</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setPasswordModalOpen(true)}
                      className="w-full sm:w-auto bg-gray-800 border border-gray-700 hover:border-teal-500/50 text-gray-400 hover:text-teal-400 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest italic transition-all shadow-2xl"
                    >
                      Override
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-900/50 rounded-2xl border border-gray-700/10 opacity-40 select-none">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-gray-800 rounded-2xl border border-gray-700/50">
                        <Activity size={24} className="text-gray-800" />
                      </div>
                      <div>
                        <p className="font-black text-gray-700 italic uppercase text-sm tracking-tight">Biometric Hash</p>
                        <p className="text-[10px] font-black text-gray-800 uppercase italic tracking-widest mt-1">Experimental feature // Locked</p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-gray-800 rounded-xl text-[9px] font-black text-gray-600 uppercase italic tracking-widest border border-gray-700/30">
                      Restricted
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <Modal
          title="Edit Profile"
          onClose={handleCloseModal}
          onSubmit={handleSave}
          submitDisabled={saving || uploadingAvatar}
        >
          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-6 py-6 border-b border-gray-800/50 mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-teal-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <img
                  src={avatarPreview || resolveAvatarUrl(editData.avatar)}
                  alt="Preview"
                  className="w-40 h-40 rounded-[2.5rem] object-cover border-4 border-gray-800 shadow-2xl relative z-10 grayscale-[20%] group-hover:grayscale-0 transition-all"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultAvatar;
                  }}
                />

                <label className="absolute -bottom-2 -right-2 z-20 bg-teal-600 text-white p-4 rounded-2xl cursor-pointer hover:bg-teal-500 transition-all shadow-xl border-4 border-gray-900 hover:scale-110">
                  <Camera size={20} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Max 5MB (JPG, PNG)
              </p>

              {avatarPreview && (
                <button
                  onClick={handleRemovePreview}
                  className="text-red-500 text-sm font-bold hover:underline"
                >
                  Remove selected image
                </button>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={editData.full_name || ''}
                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                required
                placeholder="e.g. John Doe"
              />
              <Input
                label="Email Address"
                type="email"
                value={editData.email || ''}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                required
                placeholder="name@example.com"
              />
              <Input
                label="Phone Number"
                value={editData.phone || ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="+1 234 567 890"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <Modal
          title="Security Override"
          onClose={() => {
            setPasswordModalOpen(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswords({ current: false, new: false, confirm: false });
          }}
          onSubmit={handlePasswordChange}
          submitDisabled={saving}
        >
          <div className="space-y-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 flex gap-4">
              <Shield className="w-6 h-6 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-black text-indigo-300 mb-1 uppercase tracking-widest italic">Cryptographic Requirement</p>
                <p className="text-[11px] font-black text-indigo-400/80 uppercase italic leading-relaxed">Identity must exceed 8 characters with multi-case and alphanumeric markers.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-4 top-[38px] text-gray-400 hover:text-violet-600 transition"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="New Password"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-4 top-[38px] text-gray-400 hover:text-violet-600 transition"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-4 top-[38px] text-gray-400 hover:text-violet-600 transition"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProfilePage;
