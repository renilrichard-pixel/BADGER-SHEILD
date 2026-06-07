'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  Loader2, 
  User as UserIcon, 
  MapPin, 
  CreditCard, 
  LogOut, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const AVATAR_BUCKET = 'avatars';

const getAvatarPath = (value: string | null | undefined) => {
  if (!value) return '';
  const rawValue = String(value);

  try {
    const url = new URL(rawValue);
    const marker = `/${AVATAR_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    }
  } catch {
    // Stored value may already be a storage path.
  }

  return rawValue.split('?')[0];
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'orders'>('personal');

  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Personal Info State
  const [personalState, setPersonalState] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  // New Address State
  const [newAddressState, setNewAddressState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  const resolveAvatarUrl = async (storedValue: string | null | undefined) => {
    const path = getAvatarPath(storedValue);
    if (!path) return null;

    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, 60 * 60);

    if (!error && data?.signedUrl) {
      return `${data.signedUrl}&t=${Date.now()}`;
    }

    const { data: publicData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path);

    return publicData?.publicUrl ? `${publicData.publicUrl}?t=${Date.now()}` : storedValue || null;
  };

  const fetchAddresses = async (userId: string) => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  const fetchOrders = async (userId: string) => {
    const supabase = createClient();
    try {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Failed to load order history');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load Profile and data
  useEffect(() => {
    const supabase = createClient();
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login?next=/profile');
          return;
        }
        setUser(user);
        setNewAddressState(prev => ({ ...prev, email: user.email || '' }));

        // Fetch Supabase Profile
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, full_name, phone')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setPersonalState({
            full_name: data.full_name || '',
            email: user.email || '',
            phone: data.phone || '',
          });
          const storedAvatarPath = getAvatarPath(data.avatar_url);
          setAvatarPath(storedAvatarPath);
          setAvatarUrl(await resolveAvatarUrl(data.avatar_url));
        } else {
          setPersonalState(prev => ({ ...prev, email: user.email || '' }));
        }

        // Fetch Supabase Addresses
        await fetchAddresses(user.id);

        // Fetch Supabase Orders
        await fetchOrders(user.id);
      } catch (error) {
        console.error('Profile loading error:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handlePersonalChange = (field: string, value: string) => {
    setPersonalState((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewAddressFieldChange = (field: string, value: string) => {
    setNewAddressState((prev) => ({ ...prev, [field]: value }));
    if (addressErrors[field]) {
      setAddressErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const supabase = createClient();
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Validation
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PNG, JPG, or WEBP.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File is too large. Max size is 2MB.');
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Store in Storage Bucket
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the storage path
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: filePath,
          full_name: personalState.full_name,
          phone: personalState.phone,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      setAvatarPath(filePath);
      setAvatarUrl(await resolveAvatarUrl(filePath));
      toast.success('Profile image updated');
    } catch (error: any) {
      console.error('Upload error detailed:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        statusCode: error?.statusCode,
        keys: error ? Object.keys(error) : []
      });
      const errorMsg = error?.message || error?.error_description || error?.error || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      toast.error(`Upload error: ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSavePersonal = async () => {
    if (!user) return;
    const supabase = createClient();
    try {
      setSaving(true);
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: avatarPath || getAvatarPath(avatarUrl),
        full_name: personalState.full_name,
        phone: personalState.phone,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success('Personal details updated');
      setIsEditingPersonal(false);
    } catch (error: any) {
      console.error('Save personal error:', error);
      const errorMsg = error?.message || error?.error_description || error?.error || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      toast.error(`Failed to save personal details: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const validateAddressForm = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields = ['firstName', 'lastName', 'email', 'address', 'city', 'state', 'pincode', 'phone'];
    requiredFields.forEach((field) => {
      const val = (newAddressState as any)[field];
      if (!val || !val.trim()) {
        newErrors[field] = 'This field is required';
      }
    });

    if (newAddressState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAddressState.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (newAddressState.phone && !/^\d{10}$/.test(newAddressState.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    setAddressErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddNewAddress = async () => {
    if (!user) return;
    if (!validateAddressForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const supabase = createClient();
    try {
      setSaving(true);

      const newAddr = {
        user_id: user.id,
        first_name: newAddressState.firstName,
        last_name: newAddressState.lastName,
        email: newAddressState.email,
        address: newAddressState.address,
        city: newAddressState.city,
        state: newAddressState.state,
        pincode: newAddressState.pincode,
        phone: newAddressState.phone,
        is_default: addresses.length === 0
      };

      const { data, error } = await supabase
        .from('user_addresses')
        .insert(newAddr)
        .select()
        .single();

      if (error) throw error;

      toast.success('New delivery address added');
      setAddresses(prev => [data, ...prev]);
      setIsAddingAddress(false);
      setNewAddressState({
        firstName: '', lastName: '', email: user.email || '', address: '', city: '', state: '', pincode: '', phone: ''
      });
    } catch (error: any) {
      console.error('Add address error:', error);
      const errorMsg = error?.message || error?.error_description || error?.error || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      toast.error(`Failed to add delivery address: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user) return;
    const supabase = createClient();
    try {
      // First, set all user addresses to is_default = false
      const { error: resetError } = await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
      if (resetError) throw resetError;

      // Ensure local state reflects false
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === addressId })));

      // Then set the specific address to is_default = true
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;
      toast.success('Default address updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to set default address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      setAddresses(prev => prev.filter(a => a.id !== addressId));
      toast.success('Address removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove address');
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-24 md:py-32 max-w-6xl flex justify-center items-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-foreground mb-6 mx-auto" />
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-6xl pb-28 md:pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-12 border-b border-border/40 pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40 mb-1">
            Account Dashboard
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase">
            My Account
          </h1>
        </div>
        <div className="flex items-center gap-2 border border-border bg-background px-4 py-2 text-foreground font-semibold">
          <UserIcon size={16} className="text-foreground" />
          <span className="text-xs uppercase tracking-widest opacity-60">
            Client Profile
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Sidebar / Tabs */}
        <aside className="w-full lg:w-[260px] flex flex-col shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab('personal')}
            className={`w-full flex items-center justify-between px-4 py-3.5 border text-left text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'personal' ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Personal Details</span>
            <UserIcon size={13} />
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`w-full flex items-center justify-between px-4 py-3.5 border text-left text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'address' ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Delivery Addresses</span>
            <MapPin size={13} />
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-4 py-3.5 border text-left text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Order History</span>
            <CreditCard size={13} />
          </button>
          <Separator className="my-4" />
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-4 py-3.5 border border-red-200/40 text-red-600 hover:bg-red-50/50 text-left text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer"
          >
            <span>Sign Out</span>
            <LogOut size={13} />
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full border border-border bg-card p-6 md:p-10">
          
          {/* PERSONAL DETAILS TAB */}
          {activeTab === 'personal' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex justify-between items-center pb-4 border-b border-border/40">
                <h2 className="text-xl font-bold uppercase tracking-wider">Personal Information</h2>
                {!isEditingPersonal && (
                  <Button
                    onClick={() => setIsEditingPersonal(true)}
                    className="rounded-none uppercase tracking-widest text-[10px] font-bold h-9 px-4 cursor-pointer"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 border border-border/50 bg-muted/10">
                <div className="relative w-20 h-20 shrink-0">
                  <div className="w-full h-full rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={28} className="text-muted-foreground/50" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-foreground p-1.5 rounded-full text-background cursor-pointer hover:bg-foreground/80 transition-colors shadow-sm">
                    {uploading ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg, image/webp" 
                      onChange={handleUpload} 
                      disabled={uploading} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h3 className="font-semibold text-sm uppercase tracking-wider">Profile Picture</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">PNG, JPG, WEBP up to 2MB</p>
                </div>
              </div>

              {/* Form Section */}
              {isEditingPersonal ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={personalState.full_name}
                        onChange={(e) => handlePersonalChange('full_name', e.target.value)}
                        className="rounded-none h-11"
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emailReadOnly">Email Address</Label>
                      <Input
                        id="emailReadOnly"
                        type="email"
                        value={personalState.email}
                        disabled
                        className="rounded-none h-11 bg-muted/40 cursor-not-allowed text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phoneNo">Phone Number</Label>
                    <Input
                      id="phoneNo"
                      type="tel"
                      value={personalState.phone}
                      onChange={(e) => handlePersonalChange('phone', e.target.value)}
                      className="rounded-none h-11"
                      placeholder="Your contact number"
                    />
                  </div>

                  <div className="pt-6 border-t border-border/40 flex justify-end gap-3">
                    <Button
                      onClick={() => setIsEditingPersonal(false)}
                      variant="outline"
                      className="rounded-none uppercase tracking-widest text-[10px] font-bold h-11 px-6 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSavePersonal}
                      disabled={saving}
                      className="rounded-none uppercase tracking-widest text-[10px] font-bold h-11 px-6 cursor-pointer"
                    >
                      {saving && <Loader2 size={12} className="animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-4">
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground mb-1.5">Full Name</p>
                    <p className="text-sm font-semibold">{personalState.full_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground mb-1.5">Email Address</p>
                    <p className="text-sm font-semibold">{personalState.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground mb-1.5">Phone Number</p>
                    <p className="text-sm font-semibold">{personalState.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground mb-1.5">Membership</p>
                    <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">Exclusive Client</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DELIVERY ADDRESSES TAB */}
          {activeTab === 'address' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex justify-between items-center pb-4 border-b border-border/40">
                <h2 className="text-xl font-bold uppercase tracking-wider">Delivery Addresses</h2>
                {!isAddingAddress && (
                  <Button
                    onClick={() => setIsAddingAddress(true)}
                    className="rounded-none uppercase tracking-widest text-[10px] font-bold h-9 px-4 cursor-pointer"
                  >
                    <Plus size={12} className="mr-1.5" /> Add New
                  </Button>
                )}
              </div>

              {/* List Existing Addresses */}
              {!isAddingAddress && addresses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className={`p-6 border relative transition-all duration-300 ${
                        addr.is_default 
                          ? 'border-foreground bg-muted/5' 
                          : 'border-border bg-card hover:border-foreground/40'
                      }`}
                    >
                      {addr.is_default && (
                        <div className="absolute top-0 right-0 bg-foreground text-background text-[8px] uppercase tracking-widest px-2.5 py-1 font-bold">
                          Default
                        </div>
                      )}
                      <h3 className="font-bold text-sm uppercase tracking-wide mb-3">
                        {addr.first_name} {addr.last_name}
                      </h3>
                      <div className="text-muted-foreground text-xs space-y-1 mb-6 font-medium leading-relaxed">
                        <p>{addr.address}</p>
                        <p>{addr.city}, {addr.state} {addr.pincode}</p>
                        <p>{addr.email}</p>
                        <p>{addr.phone}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-border/40 pt-4">
                        {!addr.is_default ? (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            Set Default
                          </button>
                        ) : (
                          <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-600">Selected Default</span>
                        )}

                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          aria-label="Remove Address"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty Address State */}
              {!isAddingAddress && addresses.length === 0 && (
                <div className="text-center py-16 border border-dashed border-border bg-muted/5">
                  <MapPin size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="text-xs uppercase tracking-widest font-bold mb-1">No Saved Addresses</p>
                  <p className="text-[11px] text-muted-foreground mb-6">Add an address for a faster checkout checkout flow.</p>
                  <Button
                    onClick={() => setIsAddingAddress(true)}
                    className="rounded-none uppercase tracking-widest text-[10px] font-bold h-11 px-6 cursor-pointer"
                  >
                    Add Address
                  </Button>
                </div>
              )}

              {/* Add Address Form */}
              {isAddingAddress && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-border/40">
                    <h3 className="font-semibold text-sm uppercase tracking-wider">New Location</h3>
                    <button 
                      onClick={() => setIsAddingAddress(false)} 
                      className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={newAddressState.firstName}
                          onChange={(e) => handleNewAddressFieldChange('firstName', e.target.value)}
                          className="rounded-none h-11"
                        />
                        {addressErrors.firstName && <p className="text-[10px] text-destructive uppercase tracking-wider">{addressErrors.firstName}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={newAddressState.lastName}
                          onChange={(e) => handleNewAddressFieldChange('lastName', e.target.value)}
                          className="rounded-none h-11"
                        />
                        {addressErrors.lastName && <p className="text-[10px] text-destructive uppercase tracking-wider">{addressErrors.lastName}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newAddressState.email}
                        onChange={(e) => handleNewAddressFieldChange('email', e.target.value)}
                        className="rounded-none h-11"
                      />
                      {addressErrors.email && <p className="text-[10px] text-destructive uppercase tracking-wider">{addressErrors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={newAddressState.address}
                        onChange={(e) => handleNewAddressFieldChange('address', e.target.value)}
                        className="rounded-none h-11"
                      />
                      {addressErrors.address && <p className="text-[10px] text-destructive uppercase tracking-wider">{addressErrors.address}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={newAddressState.city}
                          onChange={(e) => handleNewAddressFieldChange('city', e.target.value)}
                          className="rounded-none h-11"
                        />
                        {addressErrors.city && <p className="text-[10px] text-destructive uppercase tracking-wider">{addressErrors.city}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={newAddressState.state}
                          onChange={(e) => handleNewAddressFieldChange('state', e.target.value)}
                          className="rounded-none h-11"
                        />
                        {addressErrors.state && <p className="text-[10px] text-destructive uppercase tracking-wider">{addressErrors.state}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pincode">PIN / ZIP Code</Label>
                        <Input
                          id="pincode"
                          value={newAddressState.pincode}
                          onChange={(e) => handleNewAddressFieldChange('pincode', e.target.value)}
                          className="rounded-none h-11"
                        />
                        {addressErrors.pincode && <p className="text-[10px] text-destructive uppercase tracking-wider">{addressErrors.pincode}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newAddressState.phone}
                        onChange={(e) => handleNewAddressFieldChange('phone', e.target.value)}
                        className="rounded-none h-11"
                        placeholder="10-digit number"
                      />
                      {addressErrors.phone && <p className="text-[10px] text-destructive uppercase tracking-wider">{addressErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/40 flex justify-end gap-3">
                    <Button
                      onClick={() => setIsAddingAddress(false)}
                      variant="outline"
                      className="rounded-none uppercase tracking-widest text-[10px] font-bold h-11 px-6 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddNewAddress}
                      disabled={saving}
                      className="rounded-none uppercase tracking-widest text-[10px] font-bold h-11 px-6 cursor-pointer"
                    >
                      {saving && <Loader2 size={12} className="animate-spin mr-2" />}
                      Save Location
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ORDER HISTORY TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="pb-4 border-b border-border/40">
                <h2 className="text-xl font-bold uppercase tracking-wider">Order History</h2>
              </div>

              {loadingOrders ? (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/5 border border-dashed border-border">
                  <Loader2 size={32} className="animate-spin text-foreground mb-4" />
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-45">Retrieving Purchases...</p>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const mainItem = order.items?.[0];
                    const otherItemsCount = (order.items?.length || 1) - 1;

                    return (
                      <div 
                        key={order.id} 
                        className="border border-border/60 bg-card overflow-hidden transition-all hover:border-foreground/20"
                      >
                        {/* Collapsed view / summary row */}
                        <div 
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-left">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Date</p>
                              <p className="text-xs font-semibold">
                                {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="min-w-[120px]">
                              <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Order Summary</p>
                              <p className="text-xs font-semibold truncate max-w-[200px]">
                                {mainItem?.name || 'Order'}
                                {otherItemsCount > 0 && <span className="opacity-45 ml-1">+ {otherItemsCount} more</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Total Amount</p>
                              <p className="text-xs font-bold text-foreground">₹{Number(order.total)?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Status</p>
                              <p className="text-[9px] uppercase tracking-widest font-bold text-emerald-700">{order.status}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 self-end md:self-auto">
                            <div className="text-[9px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100 flex items-center gap-2">
                              {isExpanded ? 'Hide Details' : 'View Details'}
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded details panel */}
                        {isExpanded && (
                          <div className="border-t border-border/40 p-6 md:p-8 bg-muted/5 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                              
                              {/* Detailed items list */}
                              <div className="lg:col-span-2 space-y-6">
                                <h4 className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-4 pb-2 border-b border-border/40">Purchased Items</h4>
                                {Array.isArray(order.items) ? order.items.map((item: any, idx: number) => (
                                  <Link key={idx} href={`/products/${item.slug || item.id}`} className="flex gap-4 items-center group cursor-pointer">
                                    <div className="w-14 h-18 bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                      {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                      ) : (
                                        <span className="opacity-15 text-lg uppercase font-bold">{item.name?.charAt(0)}</span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm truncate group-hover:underline">{item.name}</h4>
                                      {(item.selectedSize || item.selectedColor) && (
                                        <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mt-0.5">
                                          {item.selectedSize ? `Size: ${item.selectedSize}` : ''}
                                          {item.selectedSize && item.selectedColor ? ' / ' : ''}
                                          {item.selectedColor ? `Color: ${item.selectedColor}` : ''}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">₹{Number(item.price)?.toFixed(2)} × {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-sm">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                                    </div>
                                  </Link>
                                )) : (
                                  <p className="text-xs italic text-muted-foreground">Item details unavailable</p>
                                )}
                              </div>

                              {/* Delivery Info */}
                              <div className="space-y-8">
                                <div>
                                  <h4 className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-4 pb-2 border-b border-border/40">Delivery Destination</h4>
                                  <div className="text-xs space-y-1.5 text-muted-foreground font-medium">
                                    <p className="font-bold text-foreground">{order.customer_info?.firstName} {order.customer_info?.lastName}</p>
                                    <p>{order.customer_info?.address}</p>
                                    <p>{order.customer_info?.city}, {order.customer_info?.state} {order.customer_info?.pincode}</p>
                                    <p className="mt-2 text-foreground font-semibold">{order.customer_info?.phone}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-4 pb-2 border-b border-border/40">Shipment Status</h4>
                                  <div className="space-y-4">
                                    <div className="relative pl-4 border-l border-foreground/10">
                                      <div className="absolute -left-[4.5px] top-0 w-2 h-2 rounded-full bg-emerald-500"></div>
                                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Confirmed</p>
                                      <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="relative pl-4">
                                      <div className="absolute -left-[4.5px] top-0 w-2 h-2 rounded-full bg-border"></div>
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">In Transit</p>
                                      <p className="text-[10px] text-muted-foreground">Awaiting Dispatch</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-border bg-muted/5">
                  <CreditCard size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="text-xs uppercase tracking-widest font-bold mb-1">No Orders Found</p>
                  <p className="text-[11px] text-muted-foreground mb-6">Your purchase history will appear here once you make an order.</p>
                  <Button
                    onClick={() => router.push('/products')}
                    className="rounded-none uppercase tracking-widest text-[10px] font-bold h-11 px-6 cursor-pointer"
                  >
                    Browse Collection
                  </Button>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
