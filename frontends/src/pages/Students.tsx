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
import api, { getStudents } from "@/lib/api"; // ADD THIS MISSING IMPORT
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
  // 1. DATA FETCHING: Add error handling and retry logic
  // ====================================================================
  const { data: students, isLoading, isError, error, refetch } = useQuery<BackendStudent[]>({
    queryKey: ['students'],
    queryFn: getStudents,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error("Students query error:", error);
      toast({
        title: "Error",
        description: "Failed to load students. Please try again.",
        variant: "destructive",
      });
    }
  });

  // ====================================================================
  // 2. DATA MUTATION (DELETE): Add better error handling
  // ====================================================================
  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: number) => api.delete(`/students/${studentId}/`),
    onSuccess: () => {
      toast({ title: "Success", description: "Student has been removed." });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      console.error("Delete student error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Could not remove the student.",
        variant: "destructive",
      });
    },
  });

  // --- Safe Filtering Logic ---
  const filteredStudents = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    
    if (!searchTerm.trim()) return students;
    
    return students.filter(s => {
      try {
        const searchLower = searchTerm.toLowerCase();
        return (
          `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(searchLower) ||
          (s.student_id || '').toLowerCase().includes(searchLower) ||
          (s.level || '').toLowerCase().includes(searchLower) ||
          (s.email || '').toLowerCase().includes(searchLower)
        );
      } catch (err) {
        console.error("Filter error for student:", s, err);
        return false;
      }
    });
  }, [students, searchTerm]);

  // --- Event Handlers ---
  const handleAddStudent = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const handleEditStudent = (student: BackendStudent) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = (student: BackendStudent) => {
    if (window.confirm(`Are you sure you want to remove ${student.first_name} ${student.last_name}? This action cannot be undone.`)) {
      deleteStudentMutation.mutate(student.id);
    }
  };

  const handleModalSaveSuccess = () => {
    setIsModalOpen(false);
  };
  
  // --- Error Boundary ---
  if (isError) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <div className="text-red-600 space-y-4">
            <h1 className="text-2xl font-bold">Error Loading Students</h1>
            <p className="text-gray-600">
              {error?.message || "Unable to load student data"}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
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
            className="btn-primary animate-slide-in-right w-full sm:w-auto"
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
                placeholder="Search by name, student ID, or level..."
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
            {filteredStudents && filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <Card key={student.id} className="flex flex-col border hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar className="w-16 h-16 group-hover:scale-110 transition-transform">
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
              ))
            ) : (
              <div className="col-span-full text-center py-20">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Students Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? "No students match your search criteria." : "No students have been added yet."}
                </p>
                {!searchTerm && (
                  <Button onClick={handleAddStudent} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Student
                  </Button>
                )}
              </div>
            )}
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