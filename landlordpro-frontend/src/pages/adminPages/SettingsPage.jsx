import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Input, Button } from '../../components';
import {
  User,
  Mail,
  Smartphone,
  Camera,
  Lock,
  Shield,
  CheckCircle,
  Activity,
  Settings,
  ShieldCheck,
  Fingerprint,
  UploadCloud,
  Eye,
  EyeOff,
  RefreshCcw,
  Zap,
  Star
} from 'lucide-react';
import defaultAvatar from '../../assets/react.svg';
import {
  getProfile,
  updateProfile,
  updatePassword,
  uploadAvatar,
} from '../../services/UserService';
import { showError, showSuccess } from '../../utils/toastHelper';

const initialPasswordState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const AdminSettingsPage = () => {
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState(initialPasswordState);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const response = await getProfile();
      const user = response?.user || response;
      setProfile(user);
      setProfileForm({
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
      });
    } catch (error) {
      showError(error?.message || 'Failed to load identity profile.');
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const displayedAvatar = useMemo(() => {
    if (avatarPreviewUrl) return avatarPreviewUrl;
    if (profile?.avatar) return profile.avatar;
    return defaultAvatar;
  }, [profile, avatarPreviewUrl]);

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (savingProfile || uploadingAvatar) return;
    if (!profileForm.full_name.trim()) return showError('Identity signature required.');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(profileForm.email)) return showError('Invalid communication protocol (email).');

    try {
      if (selectedAvatarFile) {
        setUploadingAvatar(true);
        await uploadAvatar(selectedAvatarFile);
        setUploadingAvatar(false);
      }

      const profileData = {
        name: profileForm.full_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone?.trim() || '',
      };

      setSavingProfile(true);
      await updateProfile(profileData);
      showSuccess('Identity recalibrated.');
      await loadProfile();
      if (selectedAvatarFile) setSelectedAvatarFile(null);
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(null);
      }
    } catch (error) {
      showError(error?.message || 'Profile synchronization failed.');
    } finally {
      setSavingProfile(false);
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (changingPassword) return;
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) return showError('All security gates must be defined.');
    if (newPassword.length < 8) return showError('Security string depth insufficient (min 8 chars).');
    if (newPassword !== confirmPassword) return showError('Security string mismatch detected.');

    try {
      setChangingPassword(true);
      await updatePassword({ oldPassword: currentPassword, newPassword });
      showSuccess('Security protocols updated.');
      setPasswordForm(initialPasswordState);
    } catch (error) {
      showError(error?.message || 'Security override failed.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarInput = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showError('Invalid binary format for visual identity.');
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setSelectedAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <Zap size={48} className="text-slate-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Synchronizing Identity Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-12">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
              <Activity size={12} /> System Preferences Config
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                Identity <span className="text-slate-500">Profile</span>
              </h1>
              <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic mt-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-slate-500" /> Configuring administrative clearance
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Sidebar Profile */}
          <div className="lg:col-span-4 space-y-8 animate-fade-in">
            <Card className="p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50 flex flex-col items-center overflow-hidden relative" hover={false}>
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-slate-500/50 to-transparent"></div>

              <div className="relative group">
                <div className="w-48 h-48 rounded-[3rem] bg-gray-900 border-4 border-gray-800 shadow-2xl overflow-hidden group-hover:scale-105 transition-all duration-700">
                  <img
                    src={displayedAvatar}
                    alt="Identity"
                    className="w-full h-full object-cover"
                  />
                </div>
                <label className="absolute -bottom-4 -right-4 p-5 bg-slate-900 text-white rounded-[2rem] cursor-pointer shadow-2xl hover:scale-110 active:scale-95 transition-all border border-gray-700 group/btn">
                  <Camera size={24} className="group-hover/btn:rotate-12 transition-transform" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarInput} />
                </label>
              </div>

              <div className="mt-10 text-center space-y-4">
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{profile.full_name}</h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-[9px] font-black uppercase text-slate-500 tracking-widest mt-2">
                  <Fingerprint size={12} /> {profile.role} Clearance
                </div>
              </div>

              <div className="w-full mt-10 pt-10 border-t border-gray-700/50 space-y-4">
                {[
                  { icon: Mail, label: 'Signal Buffer', val: profile.email },
                  { icon: Smartphone, label: 'Direct Relay', val: profile.phone || 'NO_COMMS_DEFINED' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-5 bg-gray-900/50 rounded-2xl border border-gray-700/30 group/item hover:bg-gray-700/50 transition-all">
                    <div className="p-3 bg-gray-800 rounded-xl text-slate-500 group-hover/item:text-slate-400 transition-colors">
                      <item.icon size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-gray-500 uppercase italic tracking-widest">{item.label}</p>
                      <p className="text-xs font-bold text-gray-300 italic truncate w-full">{item.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 bg-slate-900 border-slate-800" hover={false}>
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-3">
                <Shield size={16} /> Security protocols
              </h3>
              <div className="space-y-6">
                {[
                  'Regularly monitor account activity logs.',
                  'Maintain unique entry strings across matrices.',
                  'Update contact relays following unit shifts.'
                ].map((text, i) => (
                  <div key={i} className="flex gap-4">
                    <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-slate-400 italic leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Forms */}
          <div className="lg:col-span-8 space-y-8 animate-slide-up">
            {/* Profile Form */}
            <Card className="p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50" hover={false}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 pb-6 border-b border-gray-700/50">
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-3 uppercase">
                    <User className="text-slate-500" /> Identity Matrix
                  </h3>
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || uploadingAvatar}
                  className="px-8 w-full sm:w-auto"
                >
                  {uploadingAvatar ? <Zap size={18} className="animate-pulse mr-2" /> : <UploadCloud size={18} className="mr-2" />}
                  {uploadingAvatar ? 'Syncing...' : 'Override Profile'}
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <Input
                  label="Identity Signature Name"
                  value={profileForm.full_name}
                  onChange={(e) => handleProfileChange('full_name', e.target.value)}
                  placeholder="Legal signature..."
                  icon={User}
                />
                <Input
                  label="Communication Buffer (Email)"
                  value={profileForm.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  placeholder="agent@matrix.io"
                  icon={Mail}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Direct Relay Terminal (Phone)"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    placeholder="+250 XXX XXX XXX"
                    icon={Smartphone}
                  />
                </div>
              </div>
            </Card>

            {/* Password Form */}
            <Card className="p-10 bg-gray-800/40 backdrop-blur-sm border-gray-700/50" hover={false}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 pb-6 border-b border-gray-700/50">
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-3 uppercase">
                    <Lock className="text-emerald-500" /> Security Firewall
                  </h3>
                </div>
                <Button
                  variant="primary"
                  className="px-8 bg-emerald-600 hover:bg-emerald-500 w-full sm:w-auto"
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                >
                  {changingPassword ? <RefreshCcw size={18} className="animate-spin mr-2" /> : <ShieldCheck size={18} className="mr-2" />}
                  Update Gate Key
                </Button>
              </div>

              <div className="space-y-10">
                <div className="relative group">
                  <Input
                    label="Incumbent Entry String"
                    type={showCurrentPass ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Validate clearance..."
                    icon={Lock}
                  />
                  <button onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-6 top-[54px] p-2 text-gray-500 hover:text-emerald-500 transition-colors">
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  <Input
                    label="Target Entry String"
                    type={showNewPass ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Min 8 characters..."
                    icon={Fingerprint}
                  />
                  <Input
                    label="Verify Target String"
                    type={showNewPass ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Redundancy check..."
                    icon={ShieldCheck}
                  />
                </div>

                <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-4 animate-pulse">
                  <Star size={20} className="text-blue-500 shrink-0" />
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic leading-relaxed">
                    CRITICAL: Construct strings utilizing alphanumeric clusters and special sigils for maximum entropy.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;