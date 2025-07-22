// facials/front/src/components/CoursesSummary.tsx

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Import icons
import { BookOpen, Users } from "lucide-react";

// Import the BackendCourse interface definition
import { BackendCourse } from "@/types/backend"; // Assuming the interface is defined there

// --- Component Props Interface ---
interface CoursesSummaryProps {
  courses: BackendCourse[]; // Expecting an array of BackendCourse objects
}

const CoursesSummary = ({ courses }: CoursesSummaryProps) => {
  // Calculate total students from the fetched courses list
  const totalStudents = courses.reduce((sum, course) => {
      // Ensure course.students is an array before accessing length
      const studentCount = course.students ? course.students.length : 0;
      return sum + studentCount;
  }, 0);

  // Note: Avg Attendance is not easily calculable from the current backend data.
  // You would need a separate API endpoint for that. Removing for now.
  // const avgAttendance = courses.length > 0 ? Math.round(courses.reduce((sum, course) => sum + (course.attendance || 0), 0) / courses.length) : 0;

  return (
    // Use Tailwind grid and gap
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Simplified grid */}
      {/* Card for Total Courses */}
      <Card className="border border-gray-200 rounded-lg shadow-sm animate-fade-in-up">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Total Courses</CardTitle> {/* Use gray text color */}
          <BookOpen className="w-4 h-4 text-gray-600" /> {/* Use gray icon color */}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{courses.length}</div> {/* Use gray text color */}
          <p className="text-xs text-gray-600">Active courses</p> {/* Use gray text color */}
        </CardContent>
      </Card>

      {/* Card for Total Students */}
      <Card className="border border-gray-200 rounded-lg shadow-sm animate-fade-in-up" style={{ animationDelay: '50ms' }}> {/* Added animation delay */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Total Students (Across Courses)</CardTitle> {/* Updated title */}
          <Users className="w-4 h-4 text-gray-600" /> {/* Use gray icon color */}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{totalStudents}</div> {/* Use gray text color */}
          <p className="text-xs text-gray-600">Total enrolled students</p> {/* Use gray text color */}
        </CardContent>
      </Card>

      {/* Removed Avg Attendance card as data is not available */}
      {/*
      <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
         ... Avg Attendance card ...
      </Card>
      */}
    </div>
  );
};

export default CoursesSummary;