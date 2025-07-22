// src/components/StudentSelectionModal.tsx

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { BackendStudent } from "@/types/backend";
import { useToast } from "@/hooks/use-toast";

interface StudentSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allStudents: BackendStudent[];
  isLoadingStudents: boolean;
  enrolledStudentIds: number[];
  courseId: number;
  onSaveSuccess: () => void;
}

const StudentSelectionModal = ({ open, onOpenChange, allStudents, isLoadingStudents, enrolledStudentIds, courseId, onSaveSuccess }: StudentSelectionModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- MUTATION FOR ENROLLING STUDENTS ---
  const enrollStudentsMutation = useMutation({
    mutationFn: (studentIds: number[]) => {
      // Create an array of API call promises
      const enrollPromises = studentIds.map(id =>{
        console.log("Attemptomh to enforl student with student_pk", id)
        api.post(`/courses/${courseId}/enroll-student/`, { student_pk: id })
    });
      return Promise.allSettled(enrollPromises);
    },
    onSuccess: (results: PromiseSettledResult<any>[]) => { // results is an array of { status, value/reason }
      let successfulEnrollments = 0;
      let failedEnrollments = 0;
      let failureMessages: string[] = [];

      results.forEach(result => {
          if (result.status === 'fulfilled') {
              // Check the actual HTTP status if needed, but axios success is 2xx
              successfulEnrollments++;
              // You could optionally inspect result.value.data here
          } else { // status is 'rejected'
              failedEnrollments++;
              // Extract error message from the rejected reason (axios error)
              const error = result.reason;
              const errorMessage = error.response?.data?.error || error.message || "Unknown error";
              failureMessages.push(errorMessage);
          }
      });

      // Show toast based on outcomes
      if (successfulEnrollments > 0 && failedEnrollments === 0) {
          toast({ title: "Success", description: `Successfully enrolled ${successfulEnrollments} student(s).` });
      } else if (successfulEnrollments > 0 && failedEnrollments > 0) {
          toast({
              title: "Partial Success",
              description: `Successfully enrolled ${successfulEnrollments} student(s), failed for ${failedEnrollments}.`,
              variant: "warning", // Use a warning variant
          });
           console.warn("Details of failed enrollments:", failureMessages); // Log failures
      } else if (failedEnrollments > 0) {
           toast({
               title: "Enrollment Failed",
               description: `Failed to enroll ${failedEnrollments} student(s). See console for details.`,
               variant: "destructive", // Use a destructive variant
           });
            console.error("Details of failed enrollments:", failureMessages); // Log all failures
      } else {
           // Should not happen if studentIds > 0
           toast({ title: "Info", description: "No students were selected or enrolled." });
      }


       // Invalidate the course detail query to refresh the parent page's student list
       queryClient.invalidateQueries({ queryKey: ['course', String(courseId)] });
       // Clear selected students and close modal regardless of outcome
       setSelectedStudentIds(new Set());
       onOpenChange(false); // Close the modal
       // Call parent's success handler if needed
       // onSaveSuccess();
 
     },
  });

  // --- DERIVED DATA ---
  const availableStudents = useMemo(() => {
    if (!allStudents) return [];
    // Filter out students who are already enrolled
    return allStudents.filter(s => !enrolledStudentIds.includes(s.id));
  }, [allStudents, enrolledStudentIds]);

  const filteredStudents = useMemo(() => {
    if (!availableStudents) return [];
    if (!searchTerm) return availableStudents;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return availableStudents.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(lowerCaseSearchTerm) || 
      s.student_id.toLowerCase().includes(lowerCaseSearchTerm) || 
    (s.email && s.email.toLowerCase().includes(lowerCaseSearchTerm))
  );
  }, [availableStudents, searchTerm]);

  // --- HANDLERS ---
  const handleToggleStudent = (studentId: number) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleEnroll = () => {
    if (selectedStudentIds.size === 0) return;
    enrollStudentsMutation.mutate(Array.from(selectedStudentIds));
  };
  
  const handleCloseModal = () => {
    setSelectedStudentIds(new Set()); // Clear selected students
    onOpenChange(false); // Close modal
}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Students to Course</DialogTitle>
          <DialogDescription>Select students to enroll. Students already in the course are not shown.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Search available students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {isLoadingStudents ? <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
            : filteredStudents.length > 0 ? filteredStudents.map(student => (
              <div
                key={student.id}
                onClick={() => handleToggleStudent(student.id)}
                className={`p-2 border rounded-md flex items-center space-x-3 cursor-pointer transition-colors ${selectedStudentIds.has(student.id) ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-50'}`}
              >
                <Avatar className="w-10 h-10"><AvatarImage src={student.profile_photo || undefined} /><AvatarFallback>{student.first_name?.[0]}{student.last_name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <p className="font-medium">{student.first_name} {student.last_name}</p>
                  <p className="text-sm text-gray-500">Matric No: {student.student_id}</p>
                </div>
              </div>
            ))
            : <p className="text-center text-gray-500 py-4">No available students found.</p>
          }
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleEnroll} disabled={selectedStudentIds.size === 0 || enrollStudentsMutation.isPending}
            className="btn-primary animate-slide-in-right w-full sm:w-auto" >
            {enrollStudentsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enroll {selectedStudentIds.size} Student{selectedStudentIds.size !== 1 ? 's' : ''}
          </Button>

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentSelectionModal;