// facials/front/src/types/backend.ts

/**
 * Represents the data structure for a single Student
 * as it comes from the Django backend API.
 */

export interface BackendUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  faculty: string;
  phone: string; 
  bio: string; 
  profile_picture?: string | null;


}



export interface BackendStudent {
    id: number;
    student_id: string;      // Matches student_id in Django model (Matric No)
    first_name: string;      // Matches first_name in Django model
    last_name: string;       // Matches last_name in Django model
    email: string | null;      // Can be null if not provided
    profile_photo: string | null; // This will be a URL string to the image
    level: string | null;      // e.g., "100L", "200L", etc.
    courses: number[];       // A list of Course IDs the student is enrolled in
    has_face_enrolled?: boolean; // Optional field from serializer method
    // 'phone' is not in our current Django model, so it's omitted for now.
  }
  
  
  /**
   * Represents the data structure for a single Course
   * as it comes from the Django backend API, especially when fetching a single course detail.
   */
  export interface BackendCourse {
    id: number;
    name: string;
    course_code: string;
    description: string | null;
    teacher: number;           // The ID of the teacher (User)
    teacher_name?: string;     // Optional field from a custom serializer method
    students: BackendStudent[]; // When fetching a single course, students are often nested
    
    // Optional fields you might add to your Django model later
    schedule?: string | null;
    department?: string | null;
    semester?: string | null;
    units?: number | null;
  }
  
  /**
   * Represents the data structure for a course when it appears
   * in a list, which might be less detailed.
   */
  export interface BackendCourseInList {
      id: number;
      name: string;
      course_code: string;
      student_count: number; // A calculated field from the backend serializer
  }