// facials/front/src/pages/Courses.tsx

import React, { useState } from "react";
import Layout from "@/components/Layout"; // Assuming this provides the main app layout
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar"; // Assuming this exists
import { Plus, Loader2 } from "lucide-react"; // Added Loader2
import CourseModal from "@/components/CourseModal"; // Assuming this is the modal component path
import CourseCard from "@/components/CourseCard"; // Assuming this displays a single course
import CoursesSummary from "@/components/CoursesSummary"; // Assuming this displays a summary
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query"; // Import useQuery


interface BackendCourse {
  id: number;
  name: string;
  course_code: string;
  students: any[]; // Assuming this is an array, potentially empty or just IDs
  teacher?: number; // Assuming teacher is just an ID on GET
  teacher_name?: string;
  description?: string;
  schedule?: string;
  room?: string;
  semester?: string;
  credits?: number;
}

interface CoursesProps {
  // Removed setIsAuthenticated prop as it's not directly used here
  // setIsAuthenticated?: (value: boolean) => void;
}

const Courses = ({ }: CoursesProps) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<BackendCourse | null>(null);
  // Use React Query to fetch the courses data
  const { data: courses, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['courses'], // Unique key for this query
    queryFn: async () => {
      // Fetch courses from your backend API
      const response = await api.get('courses/');
      // Your backend CourseSerializer includes 'students' list
      // Add student_count for easier access if needed by child components
      return response.data.map((course: any) => ({
        ...course,
        student_count: course.students ? course.students.length : 0,
      }));
    },
    // You might add options here, like refetchOnWindowFocus: false
  });


  console.log("Courses List Data received:", courses);
  // This function is called after a course is successfully added via the modal
  const handleCourseAdded = () => {
      setEditingCourse(null)
      setIsCreateModalOpen(true);
    // Optional: show a success toast here
    // toast({ title: "Success", description: "Course created successfully." });
  };

  const handleEditCourse = (course: BackendCourse) => {
    setEditingCourse(course); // Set the course to be edited
    setIsCreateModalOpen(true); // Open the modal
};

// Optional: Handler for deleting a course (requires backend endpoint & mutation)
  // const handleDeleteCourse = (courseId: number) => {
  //     // Implement delete mutation here
  //     console.log("Deleting course:", courseId);
  // };

  // This function is called after the modal mutation succeeds (or fails),
  // and React Query's invalidateQueries automatically triggers refetching
  const handleModalClose = (open: boolean) => {
    if (!open) {
        setEditingCourse(null); // Clear editing state when modal closes
    }
    setIsCreateModalOpen(open); // Update modal visibility state
 };


  // Handle loading state
  if (isLoading) {
    return (
      <Layout> {/* Wrap loading state in layout */}
        <div className="flex items-center justify-center p-6 min-h-[calc(100vh-64px)]"> {/* Centered spinner */}
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Courses...</span>
        </div>
      </Layout>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <Layout> {/* Wrap error state in layout */}
        <div className="p-6">
           <h1 className="text-3xl font-bold text-red-600">Error Loading Courses</h1>
           <p className="text-red-500">{(error as any).message || "Could not fetch courses."}</p> {/* Display error message */}
           <Button onClick={() => (window as any).location.reload()} className="mt-4">Retry</Button> {/* Simple retry */}
        </div>
      </Layout>
    );
  }

  // If data loaded successfully, render the courses
  return (
    <Layout> {/* Assuming Layout provides the app shell */}
      <div className="p-3 sm:p-4 md:p-6 space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <SidebarTrigger className="text-forest-900 hover:text-forest-900" />
             {/* Assuming SidebarTrigger is part of your layout component */}
            {/* <SidebarTrigger className="text-forest-700 hover:text-forest-900" /> */}
            <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 animate-fade-in-up">Courses</h1>
            <p className="text-sm sm:text-base text-forest-600 animate-fade-in-up">Manage your teaching schedule</p>
            </div>
          </div>
          <Button
            onClick={handleCourseAdded}
            className="btn-primary animate-slide-in-right w-full sm:w-auto" // Use Tailwind classes for styling
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
        </div>

        {/* Pass fetched courses data to summary and card components */}
        {/* Ensure CoursesSummary and CourseCard components can handle the new data structure */}
        <CoursesSummary courses={courses || []} /> {/* Pass courses, handle null/undefined */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses && courses.length > 0 ? (
          courses?.map((course, index) => ( 
            <CourseCard 
            key={course.id} 
            course={course} 
            index={index} 
            // Optional: pass handlers for edit/delete if needed by the card
            // onEdit={handleEditCourse}
            // onDelete={handleDeleteCourse}
            />
          ))

          ) : (
            <div className="col-span-full text-center text-gray-600">
                 <p>No courses found. Click "Add Course" to create one.</p>
             </div>
          )}
        </div>

        {/* Course Modal */}
        <CourseModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          course={editingCourse}
         // Pass the handler for successful save
        />
      </div>
    </Layout>
  );
};

export default Courses;