// src/components/StudentModal.tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

// React Query and API imports
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
 // Make sure this type is defined

// Form data can be simpler, as we handle the full object elsewhere
interface StudentFormData {
  id?: number;
  student_id: string;
  first_name: string;
  last_name: string;
  department: string;
  email: string;
  level: string;
  profile_photo?: string;
}
interface BackendStudent {
  id: number;
  student_id: string;      // Matches student_id in Django model (Matric No)
  first_name: string;      // Matches first_name in Django model
  last_name: string;       // Matches last_name in Django model
  email: string | null;  
  department: string | null;    // Can be null if not provided
  profile_photo: string | null; // This will be a URL string to the image
  level: string | null;      // e.g., "100L", "200L", etc.
  courses: number[];       // A list of Course IDs the student is enrolled in
  has_face_enrolled?: boolean; // Optional field from serializer method
  // 'phone' is not in our current Django model, so it's omitted for now.
}

interface StudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: BackendStudent | null; // The full student object for editing
  onSaveSuccess: () => void; // Callback to notify parent of success
}

const StudentModal = ({ open, onOpenChange, student, onSaveSuccess }: StudentModalProps) => {
  const [formData, setFormData] = useState<StudentFormData>({
    student_id: "",
    first_name: "",
    last_name: "",
    email: "",
    department: "",
    level: "",
    profile_photo: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When the modal opens or the 'student' prop changes, update the form
  useEffect(() => {
    if (open) {
      if (student) {
        // We are editing an existing student
        setFormData({
          id: student.id,
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          department:student.department,
          email: student.email || "",
          level: student.level || "",
          profile_photo: student.profile_photo || "",
        });
      } else {
        // We are adding a new student, reset the form
        setFormData({
          student_id: "",
          first_name: "",
          last_name: "",
          email: "",
          level: "",
          department: "",
          profile_photo: "",
        });
      }
    }
  }, [open, student]);

  const handleChange = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- MUTATION for CREATING or UPDATING student details ---
  const saveStudentMutation = useMutation({
    mutationFn: (studentData: StudentFormData) => {
      const payload = {
        student_id: studentData.student_id,
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        email: studentData.email,
        department: studentData.department,
        level: studentData.level,
      };
      if (studentData.id) {
        // Update existing student
        return api.put(`/students/${studentData.id}/`, payload);
      } else {
        // Create new student
        return api.post("/students/", payload);
      }
    },
    onSuccess: () => {
      console.log("MODAL: Save successful. Invalidating query with key:", ['students']);
      toast({ title: "Success", description: "Student details saved." });
      console.log("SIGNAL SENT: Invalidating ['students'] query now.");
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onSaveSuccess(); // Call parent's success handler to close the modal
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || "An error occurred while saving.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  // --- MUTATION for UPLOADING a student photo ---
  const uploadPhotoMutation = useMutation({
    mutationFn: ({ studentId, image }: { studentId: number; image: string }) => {
      // This endpoint must exist on your Django backend's StudentViewSet
      return api.post(`/students/${studentId}/enroll-face/`, { image });
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Profile photo uploaded." });
      // Invalidate queries to refetch and show the new photo
      queryClient.invalidateQueries({ queryKey: ['students'] });
      // Update the form's photo URL to immediately show the new image
      if (data.data.profile_photo) {
        setFormData(prev => ({ ...prev, profile_photo: data.data.profile_photo }));
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || "Photo upload failed.";
      toast({ title: "Upload Error", description: errorMessage, variant: "destructive" });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !formData.id) return; // Must have a student ID to upload

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      uploadPhotoMutation.mutate({ studentId: formData.id, image: base64Image });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveStudentMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-900">{student ? "Edit Student" : "Add New Student"}</DialogTitle>
          <DialogDescription className="text-gray-600">{student ? "Update the student's information." : "Fill in the details to create a new student."}</DialogDescription>
        </DialogHeader>
        
        {/* === PHOTO UPLOAD SECTION === */}
        {/* This section ONLY appears if we are EDITING a student */}
        {student && (
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border">
            <Avatar className="w-20 h-20 ring-2 ring-blue-500">
              <AvatarImage src={formData.profile_photo || undefined} />
              <AvatarFallback className="bg-blue-200 text-blue-800 text-lg">
                {formData.first_name?.[0]}{formData.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label className="font-semibold text-gray-800">Profile Photo for Recognition</Label>
              <p className="text-xs text-gray-500 mb-2">Upload a clear, forward-facing photo.</p>
              <input type="file" ref={fileInputRef} accept="image/jpeg, image/png" onChange={handleFileChange} className="hidden" />
              <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadPhotoMutation.isPending}>
                {uploadPhotoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploadPhotoMutation.isPending ? "Uploading..." : "Upload Photo"}
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="student_id">Student ID (Matric No) *</Label>
            <Input id="student_id" value={formData.student_id} onChange={(e) => handleChange('student_id', e.target.value)} required disabled={!!student} />
          </div>
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Department *</Label>
            <Input id="department" type="department" value={formData.department} onChange={(e) => handleChange('department', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="level">Academic Level</Label>
            <Input id="level" value={formData.level} onChange={(e) => handleChange('level', e.target.value)} placeholder="e.g., 100L" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={saveStudentMutation.isPending}>
              {saveStudentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {student ? "Save Changes" : "Create Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentModal;