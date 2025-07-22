// facials/front/src/pages/Settings.tsx

import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { User, Mail, Phone, Camera, Bell, Shield, Save, Loader2 } from "lucide-react"; // Added Loader2
import { useState, useEffect, useRef } from "react"; // Added useEffect, useRef
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Added React Query hooks
import { getMe, updateMe, uploadMyPhoto } from "@/lib/api"; // Import NEW API functions
import { BackendUser } from "@/types/backend"; // Import BackendUser interface

// Define interface for local profile form state (might include fields not in backend yet)
interface ProfileFormState {
    firstName: string;
    lastName: string;
    email: string;
    phone: string; 
    bio: string; 
    avatar: string | null; 
}

// const { toast } = useToast();

const Settings = () => {
  const queryClient = useQueryClient(); // Initialize query client for invalidation

  // Use React Query to fetch the current user's profile data
  const { data: userData, isLoading, isError, error, refetch } = useQuery<BackendUser>({
    queryKey: ['currentUser'], // Unique key for fetching the current user
    queryFn: getMe, // Use the API function to fetch data
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
    // Keep data in sync if user profile can change elsewhere
    // refetchOnWindowFocus: true,
  });


  // Local state for form fields, initialized from fetched data
  // Use null initially to distinguish between 'loading' and 'data not available yet' vs 'empty string'
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null);


  // Effect to update form state when user data is loaded or changes
  useEffect(() => {
    if (userData) {
      setProfileForm({
        firstName: userData.first_name || "", // Use backend field names
        lastName: userData.last_name || "",   // Use backend field names
        email: userData.email || "",         // Use backend field names
        phone: "", // Keep local state for fields not in backend, initialize empty
        bio: "",   // Keep local state for fields not in backend, initialize empty
        avatar: userData.profile_picture || null, // Use backend field name
      });
       // Optional: If you want to store phone/bio locally even if not in backend API response
       // setProfileForm(prev => ({ ...prev, phone: '...', bio: '...' }));
    }
  }, [userData]); // Re-run when userData changes


  // Mutation for saving profile information
  const saveProfileMutation = useMutation({
    mutationFn: (profileData: { first_name?: string; last_name?: string; email?: string }) => {
      // Send data using backend field names
      return updateMe(profileData);
    },
    onSuccess: (updatedUser) => {
      // Invalidate the user query to refetch and update the UI with latest data (including photo URL if updated)
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
       // Optional: Update local form state immediately if needed (though refetching is safer)
       // setProfileForm(prev => ({ ...prev, ...updatedUser, avatar: updatedUser.profile_picture }));
    },
    onError: (error: any) => {
      console.error("Error saving profile:", error.response?.data || error);
      toast({
        title: "Failed to save profile",
        description: error.response?.data?.detail || "An error occurred while saving.",
        variant: "destructive",
      });
    },
  });

   // Mutation for uploading profile photo
   // Assumes a backend endpoint expects {'image': base64_string} and returns updated user data
   const uploadPhotoMutation = useMutation({
       mutationFn: (base64Image: string) => {
           return uploadMyPhoto(base64Image); // Use the API function
       },
       onSuccess: (updatedUser) => {
            // Invalidate the user query to refetch the latest profile data including the new photo URL
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            toast({
                title: "Photo uploaded",
                description: "Your profile picture has been updated.",
            });
           // Optional: Update local state directly if backend returns the new URL
           // setProfileForm(prev => ({ ...prev, avatar: updatedUser.profile_picture }));
       },
       onError: (error: any) => {
           console.error("Error uploading photo:", error.response?.data || error);
           toast({
               title: "Photo upload failed",
               description: error.response?.data?.error || "An error occurred during photo upload.",
               variant: "destructive",
           });
       },
   });


  // State and handlers for Settings (local state only for now)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    attendanceReminders: true,
    weeklyReports: true,
    autoExport: false,
  });

   // Update handleProfileChange to use ProfileFormState keys
  const handleProfileFormChange = (field: keyof Omit<ProfileFormState, 'avatar'>, value: string) => {
    // Ensure profileForm is not null before updating
    if (profileForm) {
        setProfileForm({ ...profileForm, [field]: value });
    }
  };

  const handleSettingChange = (setting: keyof typeof settings, value: boolean) => {
    setSettings({ ...settings, [setting]: value });
     // Optional: Add mutation call here if you have a backend endpoint for settings
     // saveSettingsMutation.mutate({...settings, [setting]: value});
  };

  const handleSaveProfile = () => {
      // Only call mutation if profileForm is initialized
      if (profileForm) {
          // Extract only the fields that your backend API likely accepts
          const dataToSend = {
              first_name: profileForm.firstName,
              last_name: profileForm.lastName,
              email: profileForm.email,
              // phone and bio are not sent to the backend without backend changes
          };
          // Call the mutation to save profile
          saveProfileMutation.mutate(dataToSend);
      }
  };

  const handleSaveSettings = () => {
    // This would ideally call a mutation to save settings to the backend
    // For now, it just shows a toast
    toast({
      title: "Settings updated (Local)",
      description: "Your preferences have been updated locally. Backend saving is not implemented.",
       variant: "default", // Use default toast
    });
     // Example of a settings mutation call (requires backend endpoint and mutation setup)
     // saveSettingsMutation.mutate(settings);
  };

   // File input ref for photo upload
   const fileInputRef = useRef<HTMLInputElement>(null);

   // Handler for file selection
   const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type if needed
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
                 toast({ title: "Invalid file type", description: "Please select a JPG or PNG image.", variant: "destructive" });
                 // Clear the file input
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                 return;
            }
            // Validate file size if needed
             if (file.size > 5 * 1024 * 1024) { // e.g., 5MB limit
                 toast({ title: "File too large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
                  // Clear the file input
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                 return;
            }


            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Call the photo upload mutation
                 uploadPhotoMutation.mutate(base64String);
            };
            reader.readAsDataURL(file); // Read file as base64
        }
        // Clear the file input after selection
         if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
   };

   // Trigger file input click
   const handleAvatarUploadClick = () => {
       fileInputRef.current?.click();
   };


  // --- Render States ---
  // Handle loading state for initial fetch
  if (isLoading || profileForm === null) { // Show loading until profileForm is initialized
    return (
      <Layout>
        <div className="flex items-center justify-center p-6 min-h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
          <span className="ml-2 text-forest-600">Loading Settings...</span>
        </div>
      </Layout>
    );
  }

   // Handle error state for initial fetch
   if (isError) {
       console.error("Error fetching user profile:", error);
        return (
           <Layout>
               <div className="p-6">
                   <h1 className="text-xl font-bold text-red-600">Error Loading Profile</h1>
                   <p className="text-red-500">{(error as any).message || "Could not fetch your profile data."}</p>
                    {/* Add a retry button */}
                    <Button onClick={() => refetch()} className="mt-4">Retry Loading</Button>
               </div>
           </Layout>
       );
   }

  // Once data is loaded and profileForm is initialized, render the form
  return (
    <Layout>
      <div className="p-6 space-y-8">
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="text-forest-700 hover:text-forest-900" />
          <div>
            <h1 className="text-3xl font-bold text-forest-900 animate-fade-in-up">Settings</h1>
            <p className="text-forest-600 animate-fade-in-up">Manage your profile and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Card */}
          <Card className="glass-card animate-fade-in-up">
            <CardHeader className="text-center">
              <CardTitle className="text-forest-900">Profile Picture</CardTitle>
              <CardDescription className="text-forest-600">
                Update your profile photo for facial recognition (Teachers only)
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Avatar className="w-32 h-32 mx-auto ring-4 ring-forest-200">
                {/* Use the avatar URL from the form state */}
                <AvatarImage src={profileForm.avatar || undefined} alt={`${profileForm.firstName} ${profileForm.lastName} Profile`} />
                <AvatarFallback className="bg-forest-gradient text-white text-2xl">
                  {/* Use first/last name initials from form state */}
                  {`${profileForm.firstName?.[0] || ''}${profileForm.lastName?.[0] || ''}`}
                </AvatarFallback>
              </Avatar>
               {/* Hidden file input */}
               <input
                   type="file"
                   ref={fileInputRef}
                   accept="image/jpeg, image/png, image/jpg"
                   onChange={handleFileSelect}
                   style={{ display: 'none' }}
               />
               {/* Button to trigger file input, shows loading state */}
              <Button onClick={handleAvatarUploadClick} className="btn-primary" disabled={uploadPhotoMutation.isPending}>
                {uploadPhotoMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Camera className="w-4 h-4 mr-2" />
                )}
                 {uploadPhotoMutation.isPending ? "Uploading..." : "Change Photo"}
              </Button>
            </CardContent>
          </Card>

          {/* Profile Information Card */}
          <Card className="lg:col-span-2 glass-card animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-forest-900">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription className="text-forest-600">
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Use profileForm state for input values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-forest-700">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => handleProfileFormChange('firstName', e.target.value)}
                    className="bg-white/50 border-forest-200 focus:border-forest-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-forest-700">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => handleProfileFormChange('lastName', e.target.value)}
                    className="bg-white/50 border-forest-200 focus:border-forest-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-forest-700 flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Email Address</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => handleProfileFormChange('email', e.target.value)}
                  className="bg-white/50 border-forest-200 focus:border-forest-400"
                  disabled // Email might be read-only depending on backend/Djoser config
                />
                 {/* Optional: Add a note if email is read-only */}
                 {/* <p className="text-sm text-gray-500">Email is read-only and cannot be changed here.</p> */}
              </div>

              {/* Phone Field (local state only - requires backend changes to save) */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-forest-700 flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Phone Number (Local)</span> {/* Indicate local state */}
                </Label>
                <Input
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => handleProfileFormChange('phone', e.target.value)}
                  className="bg-white/50 border-forest-200 focus:border-forest-400"
                />
              </div>

              {/* Bio Field (local state only - requires backend changes to save) */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-forest-700">Bio (Local)</Label> {/* Indicate local state */}
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => handleProfileFormChange('bio', e.target.value)}
                  rows={4}
                  className="bg-white/50 border-forest-200 focus:border-forest-400 resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

               {/* Save Profile Button - shows loading state */}
              <Button onClick={handleSaveProfile} className="btn-primary" disabled={saveProfileMutation.isPending}>
                {saveProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Save className="w-4 h-4 mr-2" />
                )}
                 {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Notification Settings Card (local state only) */}
        <Card className="glass-card animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-forest-900">
              <Bell className="w-5 h-5" />
              <span>Notification Preferences (Local)</span> {/* Indicate local state */}
            </CardTitle>
            <CardDescription className="text-forest-600">
              Choose how you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Switch items */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-forest-50">
                <div>
                  <h4 className="font-medium text-forest-900">Email Notifications</h4>
                  <p className="text-sm text-forest-600">Receive updates via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                 // Disable if saving settings
                 // disabled={saveSettingsMutation?.isPending}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-forest-50">
                <div>
                  <h4 className="font-medium text-forest-900">Push Notifications</h4>
                  <p className="text-sm text-forest-600">Browser push notifications</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                  // disabled={saveSettingsMutation?.isPending}
                />
              </div>
               <div className="flex items-center justify-between p-4 rounded-lg bg-forest-50">
                <div>
                  <h4 className="font-medium text-forest-900">Attendance Reminders</h4>
                  <p className="text-sm text-forest-600">Reminders before class sessions</p>
                </div>
                <Switch
                  checked={settings.attendanceReminders}
                  onCheckedChange={(checked) => handleSettingChange('attendanceReminders', checked)}
                 // disabled={saveSettingsMutation?.isPending}
                />
              </div>
               <div className="flex items-center justify-between p-4 rounded-lg bg-forest-50">
                <div>
                  <h4 className="font-medium text-forest-900">Weekly Reports</h4>
                  <p className="text-sm text-forest-600">Automatic weekly attendance summaries</p>
                </div>
                <Switch
                  checked={settings.weeklyReports}
                  onCheckedChange={(checked) => handleSettingChange('weeklyReports', checked)}
                 // disabled={saveSettingsMutation?.isPending}
                />
              </div>
               <div className="flex items-center justify-between p-4 rounded-lg bg-forest-50">
                <div>
                  <h4 className="font-medium text-forest-900">Auto Export</h4>
                  <p className="text-sm text-forest-600">Automatically export attendance to Excel</p>
                </div>
                <Switch
                  checked={settings.autoExport}
                  onCheckedChange={(checked) => handleSettingChange('autoExport', checked)}
                  // disabled={saveSettingsMutation?.isPending}
                />
              </div>
            </div>

             {/* Save Settings Button - shows loading state */}
             {/* This button is currently a placeholder */}
            <Button onClick={handleSaveSettings} className="btn-primary">
               {/* saveSettingsMutation?.isPending ? ( // Use if mutation is implemented
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : ( */}
                    <Save className="w-4 h-4 mr-2" />
               {/* ) */}
                 {/* saveSettingsMutation?.isPending ? "Saving..." : "Save Settings" */}
                 Save Settings (Local Only)
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings Card (placeholder) */}
        <Card className="glass-card animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-forest-900">
              <Shield className="w-5 h-5" />
              <span>Security Settings (Placeholder)</span> {/* Indicate placeholder */}
            </CardTitle>
            <CardDescription className="text-forest-600">
              Manage your account security (Links not functional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="border-forest-300 text-forest-700 hover:bg-forest-50" disabled> {/* Disable buttons */}
                Change Password
              </Button>
              <Button variant="outline" className="border-forest-300 text-forest-700 hover:bg-forest-50" disabled> {/* Disable buttons */}
                Enable 2FA
              </Button>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2">Account Security Status</h4>
              <p className="text-sm text-amber-700">
                Your account is secure. Last login: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;