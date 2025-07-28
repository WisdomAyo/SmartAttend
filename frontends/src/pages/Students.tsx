// src/pages/Students.tsx

import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Plus, Mail, Edit, Trash2, Loader2, GraduationCap } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

// --- PROFESSIONAL STACK IMPORTS ---
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents } from "@/lib/api"; 
import { BackendStudent } from "@/types/backend"
import { useToast } from "@/hooks/use-toast";

// --- COMPONENT IMPORTS ---
import StudentModal from "@/components/StudentModal";



const Students = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<BackendStudent | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ====================================================================
  // 1. DATA FETCHING: Replaced useState/useEffect with useQuery
  // This hook now manages fetching, caching, loading, and error states for the student list.
  // ====================================================================


  const { data: students, isLoading, isError, error, refetch } = useQuery<BackendStudent[]>({
    queryKey: ['students'], // A unique key for React Query to cache this data
    queryFn: getStudents,
    // queryFn: async () => {
    //   const url = `/students/?timestamp=${new Date().getTime()}`;
    //   console.log("STUDENTS PAGE: Re-fetching students now...");
    //   const response = await api.get(url);
    //   console.log("DATA FROM REFETCH:", response.data); 
    //   return response.data;
    // },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // ====================================================================
  // 2. DATA MUTATION (DELETE): Replaced handleDeleteStudent with useMutation
  // This handles the API call, loading state, and refreshing the list on success.
  // ====================================================================
  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: number) => api.delete(`/students/${studentId}/`),
    onSuccess: () => {
      toast({ title: "Success", description: "Student has been removed." });
      // THIS IS THE FIX: Invalidate the 'students' query.
      // React Query will automatically refetch the data, updating the UI.
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Could not remove the student.",
        variant: "destructive",
      });
    },
  });

  // --- Filtering Logic (Derived State) ---
  const filteredStudents = useMemo(() => {
    if (!students) return []; // If students data is not yet loaded, return empty array
    return students.filter(s =>
      // Filter using backend field names
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [students, searchTerm]);

  // --- Event Handlers ---
  const handleAddStudent = () => {
    setEditingStudent(null); // Ensure modal opens in "add" mode
    setIsModalOpen(true);
  };

  const handleEditStudent = (student: BackendStudent) => {
    setEditingStudent(student); // Set the student to be edited
    setIsModalOpen(true);
  };

  const handleDeleteStudent = (student: BackendStudent) => {
    if (window.confirm(`Are you sure you want to remove ${student.first_name} ${student.last_name}? This action cannot be undone.`)) {
      // Trigger the mutation. The onSuccess handler will do the rest.
      deleteStudentMutation.mutate(student.id);
    }
  };

  // This callback is passed to the modal. The modal calls it after a successful save.
  const handleModalSaveSuccess = () => {
    setIsModalOpen(false);
    // The modal's own mutation will have already invalidated the query,
    // so all we need to do here is close the modal.
  };
  
  // --- UI Render Logic ---
  if (isError) {
    return (
      <Layout>
        <div className="p-6 text-center text-red-600">
          <h1 className="font-bold">Error Loading Data</h1>
          <p>{error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-6 space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <SidebarTrigger className="text-forest-900 hover:text-forest-900" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 animate-fade-in-up">Student Roster</h1>
            <p className="text-sm sm:text-base text-forest-600 animate-fade-in-up">View, add, and manage all students in the system</p>
          </div>
         </div>
          <Button
            onClick={handleAddStudent}
            className="btn-primary animate-slide-in-right w-full sm:w-auto" // Use Tailwind classes for styling
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Student
          </Button>
        </div>


        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, student ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        ) : (
          // Student Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="flex flex-col border hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center space-x-4">
                <Avatar className="w-16 h-16 group-hover:scale-110 transition-transform">
                    {/* Use backend profile_photo URL */}
                    <AvatarImage src={student.profile_photo || undefined} alt={`${student.first_name} ${student.last_name}`}/>
                    <AvatarFallback className="bg-blue-200 text-blue-800 font-bold">
                      {student.first_name?.[0]}{student.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{student.first_name} {student.last_name}</CardTitle>
                    <CardDescription>ID: {student.student_id}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 flex-1">
                  {student.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  )}
                  {student.level && (
                    <div className="flex items-center text-sm text-gray-600">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      <span>Level: {student.level}</span>
                    </div>
                  )}
                </CardContent>
                <div className="p-4 border-t flex space-x-2">
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handleEditStudent(student)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleDeleteStudent(student)}
                    disabled={deleteStudentMutation.isPending}
                  >
                    {deleteStudentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* The Modal for Adding/Editing Students */}
      <StudentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        student={editingStudent}
        onSaveSuccess={handleModalSaveSuccess}
      />
    </Layout>
  );
};

export default Students;