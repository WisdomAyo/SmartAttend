// facials/front/src/pages/Courses.tsx

import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, Loader2 } from "lucide-react";
import CourseModal from "@/components/CourseModal";
import CourseCard from "@/components/CourseCard";
import CoursesSummary from "@/components/CoursesSummary";
import { getCourses } from "@/lib/api"; // Import the new function
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface BackendCourse {
  id: number;
  name: string;
  course_code: string;
  students: any[];
  teacher?: number;
  teacher_name?: string;
  description?: string;
  schedule?: string;
  room?: string;
  semester?: string;
  credits?: number;
  student_count?: number;
}

interface CoursesProps {}

const Courses = ({ }: CoursesProps) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<BackendCourse | null>(null);
  const { toast } = useToast();

  // Use React Query with the new getCourses function
  const { data: courses, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error("Courses query error:", error);
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    }
  });

  console.log("Courses List Data received:", courses);

  const handleCourseAdded = () => {
    setEditingCourse(null);
    setIsCreateModalOpen(true);
  };

  const handleEditCourse = (course: BackendCourse) => {
    setEditingCourse(course);
    setIsCreateModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setEditingCourse(null);
    }
    setIsCreateModalOpen(open);
  };

  // Handle loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-6 min-h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Courses...</span>
        </div>
      </Layout>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <div className="text-red-600 space-y-4">
            <h1 className="text-2xl font-bold">Error Loading Courses</h1>
            <p className="text-gray-600">
              {(error as any)?.message || "Could not fetch courses."}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // If data loaded successfully, render the courses
  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-6 space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <SidebarTrigger className="text-forest-900 hover:text-forest-900" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 animate-fade-in-up">Courses</h1>
              <p className="text-sm sm:text-base text-forest-600 animate-fade-in-up">Manage your teaching schedule</p>
            </div>
          </div>
          <Button
            onClick={handleCourseAdded}
            className="btn-primary animate-slide-in-right w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
        </div>

        <CoursesSummary courses={courses || []} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses && courses.length > 0 ? (
            courses.map((course, index) => ( 
              <CourseCard 
                key={course.id} 
                course={course} 
                index={index} 
              />
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <div className="text-gray-500 space-y-4">
                <h3 className="text-lg font-medium">No Courses Found</h3>
                <p>Click "Add Course" to create your first course.</p>
                <Button onClick={handleCourseAdded} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Course
                </Button>
              </div>
            </div>
          )}
        </div>

        <CourseModal
          open={isCreateModalOpen}
          onOpenChange={handleModalClose}
          course={editingCourse}
        />
      </div>
    </Layout>
  );
};

export default Courses;