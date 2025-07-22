
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackendCourse } from "@/types/backend"



interface CourseCardProps {
  course: BackendCourse & { student_count: number };
  index: number;
}

const CourseCard = ({ course, index }: CourseCardProps) => {
  const navigate = useNavigate();

  const handleViewDetailsClick = () => {
    navigate(`/courses/${course.id}`);
};

// Helper to navigate to take attendance page (assuming this route exists)
// Note: You might need to pass course ID to the attendance page
 const handleTakeAttendanceClick = () => {
     navigate(`/take-attendance?courseId=${course.id}`); // Example route with query param
 };

  return (
    <Card key={course.id} className="glass-card hover:shadow-xl transition-all duration-300 animate-fade-in-up group cursor-pointer" style={{ animationDelay: `${index * 100}ms` }}>
      <CardHeader  onClick={handleViewDetailsClick}>
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 bg-forest-gradient rounded-lg flex items-center justify-center`}>
                  <BookOpen className="w-5 h-5 text-white" /> {/* Use BookOpen icon */}
                </div>
          <div className="text-right">
            <p className="text-sm text-forest-600">{course.course_code}</p>
            <p className="text-xs text-forest-500">{course.department}</p>
          </div>
        </div>
        <CardTitle className="text-forest-900 group-hover:text-forest-700 transition-colors">
          {course.name}
        </CardTitle>
        <CardDescription className="text-forest-600">
          {course.student_count} students enrolled
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 text-forest-600">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">{course.schedule}</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-forest-600">Attendance</span>
            <span className="font-medium text-forest-900">{course.attendance}%</span>
          </div>
          <div className="w-full bg-forest-100 rounded-full h-2">
            <div 
              className="bg-forest-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${course.attendance}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
          <Button 
            size="sm" 
            className="flex-1 btn-primary text-xs sm:text-sm"
            onClick={handleViewDetailsClick}
          >
            View Details
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-forest-300 text-forest-700 hover:bg-forest-50"
           onClick={handleTakeAttendanceClick}
          >
            Take Attendance
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
