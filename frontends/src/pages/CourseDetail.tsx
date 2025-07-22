// facials/front/src/pages/CourseDetail.tsx

import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Assuming SidebarTrigger exists and is correctly imported/used in Layout
 import { SidebarTrigger } from "@/components/ui/sidebar"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, CalendarDays, MapPin, BookOpen, Edit, UserPlus, UserMinus, Mail, Phone, TrendingUp, Loader2, School, GraduationCap } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Added useMutation and useQueryClient
import api from "@/lib/api"; 
import CourseModal from "@/components/CourseModal"; // Existing modal for editing
import StudentSelectionModal from "@/components/StudentSelectionModal"; // Our Add Student modal

import { useToast } from "@/hooks/use-toast"; // For notifications


interface BackendStudent {
  id: number;
  student_id: string; // Match backend field name (Matric No)
  first_name: string;
  last_name: string;
  email?: string | null;
  profile_photo?: string | null; // URL or base64 string
  level?: string | null;
  has_face_enrolled?: boolean; // From serializer
}

interface BackendCourse {
  id: number;
  name: string;
  course_code: string;
  description?: string | null;
  schedule?: string | null;
  department?: string | null;
  semester?: string | null;
  units?: number | null;
  teacher: number;
  teacher_name?: string | null;
  students: BackendStudent[]; // Nested list of students
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "excellent":
      return "bg-green-100 text-green-800";
    case "good":
      return "bg-blue-100 text-blue-800";
    case "warning":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize query client

  // State for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  // --- React Query: Fetch Course Details ---
  // Fetch the specific course data using the courseId from the URL
  // This replaces the mock 'course' state


  // const { data: course, isLoading, isError, error, refetch: refetchCourse } = useQuery<BackendCourse>({
  //   queryKey: ['course', courseId], // Query key includes the ID
  //   queryFn: async () => {
  //     if (!courseId) {
  //         // This should ideally be caught by router/loading states before query runs
  //         throw new Error("Course ID is missing");
  //     }
  //     const response = await api.get(`/courses/${courseId}/`);
  //     return response.data; // Expecting a single BackendCourse object matching BackendCourse type
  //   },
  //   enabled: !!courseId, // Only run this query if courseId exists
  //   staleTime: 1000 * 60, // Data is considered fresh for 1 minutes
  //   // Optional: keep data when fetching new course if navigating between details
  //   // keepPreviousData: true,
  // });

   // --- DATA FETCHING (Corrected) ---
   const { data: course, isLoading, isError, error } = useQuery<BackendCourse>({
    queryKey: ['course', courseId],
    queryFn: async () => (await api.get(`/courses/${courseId}/`)).data,
    enabled: !!courseId,
    staleTime: 1000 * 60, // 1 minute
  });


    // Fetch ALL students for the selection modal
    const { data: allStudents, isLoading: isLoadingStudents } = useQuery<BackendStudent[]>({
      queryKey: ['students'], // Use the same key as the main students page
      queryFn: async () => (await api.get('/students/')).data,
      staleTime: 1000 * 60 * 5,
    });




  // --- React Query: Fetch All Students (for the Add Student Modal) ---
  // This replaces the 'allStudents' mock state
  //  const { data: allStudents, isLoading: isLoadingStudents } = useQuery<BackendStudent[]>({
  //     queryKey: ['allStudents'],
  //     queryFn: async () => {
  //         const response = await api.get('/students/'); // Assuming you have a /api/students/ endpoint
  //         return response.data; // Expecting a list of BackendStudent objects
  //     },
  //      staleTime: 1000 * 60 * 5, // Students list is also relatively stale
  //  });


   // --- React Query: Mutation for Removing a Student from a Course ---
   // This will handle the API call when you click the remove button


   const removeStudentMutation = useMutation({
       mutationFn: async ({ courseId, studentId }: { courseId: number; studentId: number }) => {
           // Assuming your backend has an endpoint like /api/courses/{id}/remove-student/
           // that accepts { student_id: number } in the body.
           // If your backend needs a different structure, adjust this call.
           const response = await api.post(`/courses/${courseId}/remove-student/`, { student_pk: studentId });
           return response.data; // Or response.status
       },
       onSuccess: (_, variables) => {
           // Invalidate the course detail query so it refetches with the updated student list
           queryClient.invalidateQueries({queryKey: ['course', String(variables.courseId)]});
           toast({
               title: "Student Removed",
               description: "Student successfully removed from the course.",
           });
       },
       onError: (error) => {
           console.error("Error removing student:", error);
           toast({
               title: "Removal Failed",
               description: `Could not remove student: ${(error as any).message}`,
               variant: "destructive",
           });
       },
   });


  // --- Handlers ---
  const handleEditCourseClick = () => {
    setIsEditModalOpen(true); // Open the modal for editing
  };

  

   const handleAddStudentClick = () => {
      setIsAddStudentModalOpen(true); // Open the modal for adding a student
   }

  // This function is called after the CourseModal mutation succeeds
  // We already invalidate the course detail query in the CourseModal mutation onSuccess
  // so we might not need to refetch explicitly here, just close the modal.
  const handleCourseUpdated = () => {
    // queryClient.invalidateQueries(['course', courseId]); // Can also refetch here if needed
    setIsEditModalOpen(false); // Close the edit modal
  };

  // This function will be called after the AddStudentModal mutation succeeds
  const handleStudentAdded = () => {
      // After adding a student, invalidate both the course detail AND the allStudents list
      // The course detail will refetch to show the student, and allStudents will refetch
      // so the student is no longer available in the "Add Student" modal list next time.
      queryClient.invalidateQueries({queryKey:['course', courseId]});
      queryClient.invalidateQueries({queryKey:['allStudents']}); // Invalidate allStudents list
      setIsAddStudentModalOpen(false); // Close the add student modal
      toast({
          title: "Students Added",
          description: "Selected student(s) added to the course.",
      });
  };

   const handleRemoveStudentFromCourse = (studentId: number) => {
       if (!courseId) return;
       // Use the mutation to call the backend API
       removeStudentMutation.mutate({ courseId: course.id, studentId });
   };


  // --- Render States ---
  // Loading state for course details
  if (isLoading) {
    return (
      <Layout> {/* Wrap loading state in layout */}
        <div className="flex items-center justify-center p-6 min-h-[calc(100vh-64px)]"> {/* Centered spinner */}
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" /> {/* Use Tailwind color */}
          <span className="ml-2 text-gray-700">Loading Course Details...</span>
        </div>
      </Layout>
    );
  }

  // Error state for course details
  if (isError) {
    return (
      <Layout> {/* Wrap error state in layout */}
        <div className="p-6">
           <h1 className="text-xl font-bold text-red-600">Error Loading Course</h1>
           <p className="text-red-500">{(error as any).message || `Could not fetch course details for ID: ${courseId}.`}</p>
           <Button onClick={() => refetchCourse()} className="mt-4">Retry</Button>
        </div>
      </Layout>
    );
  }

  // Handle case where course is null/undefined after loading (e.g., 404 from API)
   if (!course) {
        return (
             <Layout>
                 <div className="p-6">
                     <h1 className="text-xl font-bold text-red-600">Course Not Found</h1>
                     <p className="text-red-500">The course with ID {courseId} could not be found.</p>
                     <Button onClick={() => navigate('/courses')} className="mt-4">Back to Courses List</Button>
                 </div>
            </Layout>
        );
   }


  // --- Render Course Details ---
  // If data loaded successfully, render the details
  const students = course.students || []; // Ensure students is an array even if backend sends null


  // Helper to get attendance color (if we get attendance data per student)
   // For now, based on mock logic, but replace with real logic if available
   const getStudentAttendanceColor = (attendance: number) => {
        if (attendance >= 90) return "text-green-600";
        if (attendance >= 75) return "text-yellow-600";
        return "text-red-600";
   };


  return (
    <Layout> {/* Assuming Layout provides the app shell */}
      {/* Use Tailwind padding and spacing utilities */}
      <div className="p-3 sm:p-4 md:p-6 space-y-6 md:space-y-8">

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Back Button */}
            <SidebarTrigger className="text-forest-700 hover:text-forest-900" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 animate-fade-in-up">{course.name}</h1>
              <p className="text-sm sm:text-base text-forest-600 animate-fade-in-up">{course.course_code} {course.semester ? `• ${course.semester} Semester` : ''}</p>
            </div>
            
             {/* SidebarTrigger - Needs to be integrated based on your actual Layout component */}
            
            
          </div>
          <Button
              variant="outline"
              onClick={() => navigate('/courses')}
              className=" hover:bg-gray-100 animate-slide-in-right "
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          {/* Action Buttons */}
          <div className="flex space-x-3 justify-between">
            <Button
              onClick={handleEditCourseClick}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Course
            </Button>
             {/* Link to Take Attendance page for this course - pass courseId as query param */}
            <Button
               onClick={() => navigate(`/take-attendance?courseId=${course.id}`)}
              className="bg-green-800 hover:bg-green-600 text-white font-bold"
            >
              Take Attendance
            </Button>
          </div>
        </div>

        {/* Course Overview & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-gray-200 rounded-lg shadow-sm animate-fade-in-up">
            <CardHeader>
              <div className="flex items-center space-x-4">
                 {/* Icon Placeholder - use consistent icon/styling */}
                <div className="w-14 h-14 bg-green-800 rounded-xl flex items-center justify-center text-white">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-gray-900">{course.name}</CardTitle>
                   {/* Use backend field names */}
                  <CardDescription className="text-gray-600">{course.course_code}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
               {/* Use backend field: description (optional) */}
               {course.description && <p className="text-gray-700">{course.description}</p>}

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Responsive grid */}
                 {/* Use backend field: schedule (optional) */}
                 {course.schedule && (
                    <div className="flex items-center space-x-3">
                      <CalendarDays className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Schedule</p>
                        <p className="text-sm text-gray-600">{course.schedule}</p>
                      </div>
                    </div>
                 )}
                 {/* Use backend field: department (optional) */}
                 {course.department && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-600" /> {/* Using MapPin for Department */}
                      <div>
                        <p className="font-medium text-gray-900">Department</p>
                        <p className="text-sm text-gray-600">{course.department}</p>
                      </div>
                    </div>
                 )}
                 {/* Use backend field: semester (optional) */}
                 {course.semester && (
                     <div className="flex items-center space-x-3">
                       <School className="w-5 h-5 text-gray-600" /> {/* Using School for Semester */}
                       <div>
                         <p className="font-medium text-gray-900">Semester</p>
                         <p className="text-sm text-gray-600">{course.semester}</p>
                       </div>
                     </div>
                 )}
                 {/* Use backend field: units (optional) */}
                 {course.units !== null && course.units !== undefined && ( // Check for null/undefined explicitly
                      <div className="flex items-center space-x-3">
                        <GraduationCap className="w-5 h-5 text-gray-600" /> {/* Using GraduationCap for Units */}
                        <div>
                          <p className="font-medium text-gray-900">Units</p>
                          <p className="text-sm text-gray-600">{course.units}</p>
                        </div>
                      </div>
                 )}
              </div>
            </CardContent>
          </Card>

          {/* Course Stats Card */}
          <Card className="border border-gray-200 rounded-lg shadow-sm animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">Course Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Total Students Stat */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900">{students.length}</div>
                <p className="text-sm text-gray-600">Total Students</p>
              </div>

              {/* Average Attendance Stat - Requires backend data */}
              {/* The backend API currently doesn't provide this aggregated stat */}
              {/* If you add an endpoint like /api/courses/{id}/attendance-stats/, you could fetch it here */}
              {/*
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-3xl font-bold ${getAttendanceColor(course.average_attendance)}`}>
                  {course.average_attendance}% // Assuming 'average_attendance' field from backend
                </div>
                <p className="text-sm text-gray-600">Average Attendance</p>
              </div>
              */}

               {/* Instructor Name Stat */}
               {/* Use backend field: teacher_name (optional) */}
               {course.teacher_name && (
                   <div className="text-center p-4 bg-gray-50 rounded-lg">
                       {/* You might replace this with Avatar if you fetch teacher profile */}
                       <div className="text-xl font-bold text-gray-900">{course.teacher_name}</div>
                       <p className="text-sm text-gray-600">Instructor</p>
                   </div>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Students Section */}
        <Card className="border border-gray-200 rounded-lg shadow-sm animate-fade-in-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <Users className="w-5 h-5" />
                <span className="text-sm">Enrolled Students ({students.length})</span>
              </CardTitle>
              <Button className="bg-green-800 hover:bg-green-500 text-white font-bold" onClick={handleAddStudentClick}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Students
              </Button>
            </div>
          </CardHeader>

          <CardContent>
          {students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div key={student.id} className="p-4 border border-forest-200 rounded-lg hover:shadow-md transition-shadow bg-white/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <Avatar className="w-12 h-12">
                    {student.profile_photo ? (
                      <AvatarImage src={student.profile_photo} alt={`${student.first_name} ${student.last_name}`}/>
                    ) : (
                      <AvatarFallback className="bg-forest-gradient text-white">
                        {`${student.first_name ? student.first_name[0] : ''}${student.last_name ? student.last_name[0] : ''}`}
                      </AvatarFallback>
                    )}
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-forest-900">{student.first_name} {student.last_name}</h4>
                      <p className="text-xs text-forest-600">Matric No: {student.student_id}</p>
                      {student.level && <p className="text-sm text-gray-600">Level: {student.level}</p>}
                      {/* <Badge className={`text-xs ${getStatusColor(student.status)}`}>
                        {student.status}
                      </Badge> */}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveStudentFromCourse(student.id)}
                      disabled={removeStudentMutation.isPending}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                     {removeStudentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 text-forest-600">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    {/* <div className="flex items-center space-x-2 text-forest-600">
                      <Phone className="w-3 h-3" />
                      <span>{student.phone}</span>
                    </div> */}
                  </div>
                  
                  {/* <div className="mt-3 pt-3 border-t border-forest-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-forest-600">Attendance</span>
                      <span className={`text-sm font-bold ${getAttendanceColor(student.attendance)}`}>
                        {student.attendance}%
                      </span>
                    </div>
                    <div className="w-full bg-forest-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          student.attendance >= 90 ? 'bg-green-500' : 
                          student.attendance >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${student.attendance}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-forest-500 mt-1">Last: {student.lastAttended}</p>
                  </div> */}

                </div>
              ))}
            </div>
          ) : (

            <div className="text-center text-gray-600 p-4">
            <p>No students are enrolled in this course yet.</p>
            <Button onClick={handleAddStudentClick} variant="outline" className="mt-4">
                Enroll First Student
            </Button>
        </div>
          )}
          </CardContent>

         
        </Card>

        {/* Course Edit Modal */}
        <CourseModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          course={course} // Pass the fetched course data for editing
           // Assuming CourseModal uses useMutation and invalidateQueries internally
          onSave={() => { /* This prop might be unused if modal handles mutation */ }}
          onCourseUpdated={handleCourseUpdated} // Pass the handler to refetch/close on success
        />

         {/* Add Student Modal */}
         <StudentSelectionModal
             open={isAddStudentModalOpen}
             onOpenChange={setIsAddStudentModalOpen}
             // Pass all available students (fetched by React Query) to the modal
             allStudents={allStudents || []} // Ensure it's an array even if loading/error
             // Pass currently enrolled student IDs (from the fetched course data)
             enrolledStudentIds={students.map(s => s.id)}
             onStudentsAdded={handleStudentAdded} // Call this after successful student enrollment via modal's mutation
             courseId={course.id} // Pass current course ID for the enrollment API call
             // Pass loading state for allStudents to the modal
             isLoadingStudents={isLoadingStudents}
         />

      </div>
    </Layout>
  );
};

export default CourseDetail;