// facials/front/src/components/CourseModal.tsx

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
// Import React Query hooks
import { useMutation, useQueryClient } from "@tanstack/react-query"; 

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// *** CORRECT API SERVICE IMPORT PATH ***
// Assuming apiService.ts is now in src/lib/api.ts based on your code
import api from "@/lib/api"; 
import { Loader2 } from "lucide-react";
// *** CORRECT TOAST IMPORT PATH ***
// Assuming use-toast.ts is in components/ui/
import { useToast } from "@/components/ui/use-toast"; 

// --- Form Schema Definition using Zod ---
// This defines the shape and validation rules for the form inputs.
// Field names MUST match your backend serializer and model.
const courseFormSchema = z.object({
  name: z.string().min(2, {
    message: "Course title must be at least 2 characters.",
  }),
  // Match backend field name 'course_code'
  course_code: z.string().min(3, { 
    message: "Course code must be at least 3 characters.",
  }),
  // Match backend optional fields
  description: z.string().optional().nullable(), // Add nullable() if backend allows null
  schedule: z.string().optional().nullable(),
  department: z.string().optional().nullable(), // Match backend model/serializer field
  semester: z.string().optional().nullable(), 
  // Match backend field name 'units', preprocess to number
  units: z.preprocess( 
    (a) => {
      if (typeof a === 'string' && a === '') return undefined; // Treat empty string as undefined for optional number
      if (typeof a === 'string') return parseInt(a, 10);
      return a; // Otherwise return as is for z.number to handle
    },
    z.number().positive("Units must be a positive number.").optional().nullable() // Match backend PositiveSmallIntegerField
  ),
});

// --- Component Props Interface ---
interface CourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // We pass the full course object if editing.
  // Use the schema type plus the ID for the expected data shape.
  course?: z.infer<typeof courseFormSchema> & { id: number } | null; 
}

const CourseModal = ({ open, onOpenChange, course }: CourseModalProps) => {
  const queryClient = useQueryClient(); // Get the query client instance
  const { toast } = useToast(); // Get the toast hook

  // --- Form Initialization ---
  // Use react-hook-form with zodResolver for validation
  const form = useForm<z.infer<typeof courseFormSchema>>({
    resolver: zodResolver(courseFormSchema),
    // Set default values based on the 'course' prop (for editing) or empty (for creating)
    // Use React Hook Form's recommendation for optional fields: undefined or null
    defaultValues: {
      name: course?.name || "",
      course_code: course?.course_code || "", 
      description: course?.description || undefined, // Use undefined for optional strings
      schedule: course?.schedule || undefined,
      department: course?.department || undefined, 
      semester: course?.semester || undefined,
      units: course?.units || undefined, // Use undefined for optional numbers
      
    },
    // Enable re-initialization when the 'course' prop changes (for editing)
    values: course ? { 
       name: course.name,
       course_code: course.course_code,
       description: course.description || undefined,
       schedule: course.schedule || undefined,
       department: course.department || undefined,
       semester: course.semester || undefined,
       units: course.units || undefined,
    } : { // Explicitly set default values when course is null (creating)
        name: "",
        course_code: "",
        description: undefined,
        schedule: undefined,
        department: undefined,
        semester: undefined,
        units: undefined,
    },
  });

  // --- React Query Mutation for Creating/Updating Courses ---
  // const saveCourseMutation = useMutation({
  //   mutationFn: (courseData: z.infer<typeof courseFormSchema>) => {
  //     // The data sent to the backend should match the serializer fields (excluding teacher)
  //     const dataToSend = {
  //         name: courseData.name,
  //         course_code: courseData.course_code,
  //         description: courseData.description,
  //         schedule: courseData.schedule,
  //         department: courseData.department,
  //         semester: courseData.semester,
  //         units: courseData.units,
         
  //     };

  //     if (course?.id) {
  //       // If 'course' prop exists, it's an update request (PUT)
  //       return api.put(`/courses/${course.id}/`, dataToSend);
  //     } else {
  //       // Otherwise, it's a create request (POST)
  //       return api.post('/courses/', dataToSend);
  //     }
  //   },
  //   onSuccess: (_, variables) => { // _ is the data response, variables are the values passed to mutate
  //     // Invalidate the 'courses' query to automatically refetch the list after save
  //     queryClient.invalidateQueries({ queryKey: ['courses'] });
  //     // Show success toast
  //     toast({
  //       title: course ? "Course updated" : "Course created",
  //       description: `${variables.name} (${variables.course_code}) has been ${course ? 'updated' : 'created'} successfully.`,
  //     });
  //     // Close the modal
  //     onOpenChange(false);
  //     // form.reset() is handled in handleOpenChange when modal closes
  //   },
  //   onError: (error: any) => { // Use 'any' for error type for simplicity for now
  //     // Show error toast with backend error details if available
  //     console.error("Error saving course:", error);
  //     const errorMessages = error.response?.data 
  //       ? Object.entries(error.response.data)
  //           .map(([field, messages]) => {
  //             // Handle the specific 'teacher' error more clearly
  //             if (field === 'teacher' && Array.isArray(messages)) {
  //                  return `Teacher field error: ${messages.join(', ')}. Ensure you are logged in.`;
  //             }
  //             // Generic field errors
  //             const msgs = Array.isArray(messages) ? messages.join(', ') : messages;
  //             return `${field}: ${msgs}`;
  //           })
  //           .join(' | ')
  //       : error.message || "Failed to save course.";

  //     toast({
  //       title: "Error Saving Course",
  //       description: errorMessages,
  //       variant: "destructive",
  //     });
  //   },
  // });

  const saveCourseMutation = useMutation({
    mutationFn: (data: z.infer<typeof courseFormSchema>) => {
      const payload = {
        ...data,
      };
      return course?.id
        ? api.put(`/courses/${course.id}/`, payload)
        : api.post("/courses/", payload); // 🔒 Backend handles `teacher`
    },
    onSuccess: (_, values) => {
      toast({
        title: course ? "Course updated" : "Course created",
        description: `${values.name} (${values.course_code}) saved successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const messages = error.response?.data
        ? Object.entries(error.response.data)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join(" | ")
        : error.message || "An unexpected error occurred.";
      toast({
        title: "Failed to save course",
        description: messages,
        variant: "destructive",
      });
    },
  });



  // --- Form Submission Handler (Called by form.handleSubmit) ---
  function onSubmit(values: z.infer<typeof courseFormSchema>) {
    // Trigger the mutation with the validated form values
    saveCourseMutation.mutate(values);
  }

  // --- Handle Modal Close ---
  // Reset form state and mutation state when the modal is explicitly closed
  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState) {
        // Reset form using RHF's reset method when closing
        // Note: When editing, it resets to the *initial* default values set when the modal opened.
        // If you want to reset to the *last successfully saved* values, you'd need more state.
        form.reset(course ? { 
            name: course.name,
            course_code: course.course_code,
            description: course.description || undefined,
            schedule: course.schedule || undefined,
            department: course.department || undefined,
            semester: course.semester || undefined,
            units: course.units || undefined,
         } : {
            name: "",
            course_code: "",
            description: undefined,
            schedule: undefined,
            department: undefined,
            semester: undefined,
            units: undefined,
         });
        saveCourseMutation.reset(); // Reset mutation state (clear loading/error)
    } else {
         // When opening, if 'course' is provided (editing), set form data
         // Using 'values' prop on useForm handles this automatically on prop change
         // but an explicit reset can ensure it happens immediately on open if needed
         if(course) {
              form.reset({
                name: course.name,
                course_code: course.course_code,
                description: course.description || undefined,
                schedule: course.schedule || undefined,
                department: course.department || undefined,
                semester: course.semester || undefined,
                units: course.units || undefined,
             });
         } else {
             form.reset(); // Ensure empty form for creating
         }
    }
    onOpenChange(newOpenState); // Update parent component's visibility state
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Use Tailwind classes for styling */}
      {/* className="sm:max-w-[500px] bg-white border-gray-200" */}
      <DialogContent className="sm:max-w-[500px]"> 
        <DialogHeader>
          {/* Use Tailwind classes for styling */}
          {/* className="text-gray-900" */}
          <DialogTitle>
            {course ? "Edit Course" : "Create New Course"}
          </DialogTitle>
          {/* Use Tailwind classes for styling */}
          {/* className="text-gray-600" */}
          <DialogDescription>
            {course ? "Update course information below." : "Fill in the details to create a new course."}
          </DialogDescription>
        </DialogHeader>

        {/* --- The Form using React Hook Form --- */}
        {/* form.handleSubmit combines RHF validation and your onSubmit logic */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            {/* Course Name Field */}
            <FormField
              control={form.control}
              name="name" // Must match the field name in courseFormSchema
              render={({ field }) => (
                <FormItem>
                  {/* Use Tailwind classes for styling */}
                  {/* className="text-gray-700" */}
                  <FormLabel>Course Title *</FormLabel>
                  <FormControl>
                    {/* Use Tailwind classes for styling */}
                    {/* className="bg-white/50 border-gray-200 focus:border-gray-400" */}
                    <Input placeholder="e.g. Introduction to Programming" {...field} />
                  </FormControl>
                  <FormMessage /> {/* Displays validation errors */}
                </FormItem>
              )}
            />

            {/* Course Code Field */}
            <FormField
              control={form.control}
              name="course_code" // Must match the field name in courseFormSchema (and backend)
              render={({ field }) => (
                <FormItem>
                   {/* Use Tailwind classes for styling */}
                  {/* className="text-gray-700" */}
                  <FormLabel>Course Code *</FormLabel>
                  <FormControl>
                     {/* Use Tailwind classes for styling */}
                    {/* className="bg-white/50 border-gray-200 focus:border-gray-400" */}
                    <Input placeholder="e.g. CS101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  {/* Use Tailwind classes for styling */}
                  {/* className="text-gray-700" */}
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    {/* Use Tailwind classes for styling */}
                    {/* className="bg-white/50 border-gray-200 focus:border-gray-400 resize-none" */}
                    <Textarea
                      placeholder="Brief description of the course..."
                      className="resize-none" // Tailwind class for resize-none
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* Schedule Field */}
             <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  {/* Use Tailwind classes for styling */}
                  {/* className="text-gray-700" */}
                  <FormLabel>Schedule</FormLabel>
                  <FormControl>
                     {/* Use Tailwind classes for styling */}
                    {/* className="bg-white/50 border-gray-200 focus:border-gray-400" */}
                     <Input placeholder="e.g. Mon, Wed, Fri 10:00 AM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {/* Department Field - Match backend field name */}
             <FormField
              control={form.control}
              name="department" 
              render={({ field }) => (
                <FormItem>
                   {/* Use Tailwind classes for styling */}
                  {/* className="text-gray-700" */}
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                     {/* Use Tailwind classes for styling */}
                    {/* className="bg-white/50 border-gray-200 focus:border-gray-400" */}
                     <Input placeholder="e.g. Computer Science" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* Semester Field */}
            <FormField
              control={form.control}
              name="semester"
              render={({ field }) => (
                <FormItem>
                  {/* Use Tailwind classes for styling */}
                  {/* className="text-gray-700" */}
                  <FormLabel>Semester</FormLabel>
                   {/* Select component needs to pass string value to RHF */}
                   <Select onValueChange={field.onChange} defaultValue={field.value || ""}> {/* Default to empty string if undefined/null */}
                      <FormControl>
                        {/* Use Tailwind classes for styling */}
                         {/* className="bg-white/50 border-gray-200" */}
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                      </FormControl>
                      {/* Use Tailwind classes for styling */}
                      {/* className="bg-white border-gray-200 shadow-xl" */}
                      <SelectContent>
                        <SelectItem value="First">First Semester</SelectItem>
                        <SelectItem value="Second">Second Semester</SelectItem>
                        {/* Add more semesters as needed */}
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Units Field - Match backend field name */}
            <FormField
              control={form.control}
              name="units" 
              render={({ field }) => (
                <FormItem>
                  {/* Use Tailwind classes for styling */}
                  {/* className="text-gray-700" */}
                  <FormLabel>Units</FormLabel> {/* Changed Label from "Unit" to "Units" for consistency */}
                   {/* Select component needs to pass string value to RHF */}
                   {/* Convert number to string for Select's value */}
                   <Select onValueChange={field.onChange} defaultValue={field.value ? String(field.value) : ""}> 
                      <FormControl>
                         {/* Use Tailwind classes for styling */}
                        {/* className="bg-white/50 border-gray-200" */}
                        <SelectTrigger>
                          <SelectValue placeholder="Select units" /> {/* Changed placeholder */}
                        </SelectTrigger>
                      </FormControl>
                       {/* Use Tailwind classes for styling */}
                      {/* className="bg-white border-gray-200 shadow-xl" */}
                      <SelectContent>
                        {/* Values should be strings if Select passes strings */}
                        <SelectItem value="1">1 Unit</SelectItem> 
                        <SelectItem value="2">2 Units</SelectItem>
                        <SelectItem value="3">3 Units</SelectItem>
                        <SelectItem value="4">4 Units</SelectItem> {/* Added 4 units option */}
                        {/* Add more units as needed */}
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />


            <DialogFooter>
              {/* Cancel Button */}
               {/* Use Tailwind classes for styling */}
              {/* className="border-gray-300 text-gray-700 hover:bg-gray-50" */}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saveCourseMutation.isPending}>
                Cancel
              </Button>
              {/* Submit Button - Disabled while mutation is pending */}
              {/* Use Tailwind classes for styling */}
              {/* className="btn-primary" */}
              <Button type="submit" disabled={saveCourseMutation.isPending}>
                {saveCourseMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {course ? "Update Course" : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseModal;