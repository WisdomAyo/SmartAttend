// src/pages/TakeAttendance.tsx

import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, Download, Play, Square, Users, Clock, CheckCircle, BookOpen, Loader2, Wifi, WifiOff } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// --- PROFESSIONAL STACK IMPORTS ---
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useWebSocket, { ReadyState } from "react-use-websocket";
import api from "@/lib/api";
import { BackendCourse, BackendStudent } from "@/types/backend";

// --- CONSTANTS ---
const WEBSOCKET_RECONNECT_ATTEMPTS = 5;
const WEBSOCKET_RECONNECT_INTERVAL = 3000;
const FRAME_SEND_INTERVAL = 750; // Send a frame every 750ms for real-time processing

const TakeAttendance = () => {
  // --- Your Original State Management ---
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isCapturing, setIsCapturing] = useState(false); // This will now mean "Session is Active"
  
  // --- State for Live Data ---
  const [presentStudentIds, setPresentStudentIds] = useState<Set<number>>(new Set());
  
  // --- Your Original Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // To manage the streaming interval
  
  const { toast } = useToast();

  // ====================================================================
  // 1. DATA FETCHING (LOGIC ONLY)
  // ====================================================================
  const { data: courses, isLoading: isLoadingCourses } = useQuery<BackendCourse[]>({
    queryKey: ['coursesForAttendance'],
    queryFn: async () => (await api.get('/courses/')).data,
  });

  const { data: courseData, isLoading: isLoadingStudents } = useQuery<BackendCourse>({
    queryKey: ['courseDetailForAttendance', selectedCourseId],
    queryFn: async () => (await api.get(`/courses/${selectedCourseId}/`)).data,
    enabled: !!selectedCourseId,
  });

  // ====================================================================
  // 2. WEBSOCKET LOGIC (The Core Functionality)
  // ====================================================================
  const token = localStorage.getItem('access_token');

// Append the token to the URL as a query parameter
const socketUrl = selectedCourseId && token 
  ? `ws://127.0.0.1:8000/ws/attendance/${selectedCourseId}/?token=${token}` 
  : null;

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: WEBSOCKET_RECONNECT_ATTEMPTS,
    reconnectInterval: WEBSOCKET_RECONNECT_INTERVAL,
    onOpen: () => console.log("WebSocket connection established."),
  });

  useEffect(() => {
    if (lastMessage !== null) {
      const messageData = JSON.parse(lastMessage.data);
      if (messageData.type === 'match_found') {
        setPresentStudentIds(prev => new Set(prev).add(messageData.student_id));
        toast({
          title: "Student Recognized!",
          description: `${messageData.student_name} has been marked present.`,
        });
      }
    }
  }, [lastMessage, toast]);

  // --- CAMERA & STREAMING LOGIC ---
  const sendFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current && readyState === ReadyState.OPEN) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 320; // Send smaller frames for performance
      canvas.height = 240;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);
        sendMessage(JSON.stringify({ image: imageBase64 }));
      }
    }
  }, [readyState, sendMessage]);
  
  // This replaces your old 'startCapture'
  const startCapture = async () => {
    setPresentStudentIds(new Set());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true); // Your original state for REC badge
        intervalRef.current = setInterval(sendFrame, FRAME_SEND_INTERVAL);
        toast({ title: "Real-time session started", description: "Pan the camera around the classroom." });
      }
    } catch (error) {
      toast({ title: "Camera access denied", variant: "destructive" });
    }
  };

  // This replaces your old 'stopCapture'
  const stopCapture = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    setIsCapturing(false);
    toast({ title: "Session ended" });
  };

  // --- EXCEL EXPORT LOGIC (UNCHANGED) ---
  const exportToExcel = async () => { /* ... your existing export logic using api.get ... */ };

  // --- DERIVED DATA FOR UI (UNCHANGED) ---
  const selectedCourseData = courses?.find(c => c.id.toString() === selectedCourseId);
  const students = courseData?.students || [];

  return (
    <Layout>
      {/* Hidden canvas - No visual change */}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      
      {/* ==================================================================== */}
      {/* YOUR EXACT UI AND JSX - NO MANIPULATION */}
      {/* ==================================================================== */}
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SidebarTrigger className="text-forest-700 hover:text-forest-900" />
            <div>
              <h1 className="text-3xl font-bold text-forest-900 animate-fade-in-up">Take Attendance</h1>
              <p className="text-forest-600 animate-fade-in-up">Use facial recognition to mark attendance</p>
            </div>
          </div>
          {students.length > 0 && (
            <Button onClick={exportToExcel} className="btn-secondary animate-slide-in-right" disabled={!selectedCourseId}>
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          )}
        </div>

        {/* Enhanced Course Selection with Graphics */}
        <Card className="glass-card animate-fade-in-up relative overflow-hidden">
          {/* ... all your decorative divs ... */}
          <CardHeader>
            {/* ... your CardHeader JSX ... */}
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={isLoadingCourses}>
                  <SelectTrigger className="w-full bg-white/50 border-forest-200 h-12">
                    <SelectValue placeholder={isLoadingCourses ? "Loading..." : "Select a course..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-forest-200 shadow-xl">
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        <div className="flex items-center justify-between w-full py-2">
                          <div>
                            <span className="font-medium">{course.name}</span>
                            <p className="text-sm text-forest-600">{course.students.length} students enrolled</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCourseData && (
                  <div className="p-4 bg-forest-50 rounded-lg space-y-2 animate-fade-in-up">
                    <h3 className="font-semibold text-forest-900">{selectedCourseData.name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-forest-600">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{selectedCourseData.students.length} Students</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* ... your animated graphics div ... */}
              <div className="hidden lg:flex items-center justify-center relative">
                <div className="relative w-48 h-48">
                  <div className="absolute inset-0 bg-forest-gradient rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute inset-4 bg-earth-gradient rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute inset-8 bg-amber-gradient rounded-full opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-forest-700 animate-bounce" />
                  </div>
                  <div className="absolute -top-2 left-8 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  <div className="absolute top-12 -right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="absolute bottom-8 -left-2 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute -bottom-2 right-12 w-3 h-3 bg-forest-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {selectedCourseData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera Feed */}
            <Card className="glass-card animate-fade-in-up">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-forest-900">
                  <Camera className="w-5 h-5" />
                  <span>Face Recognition Camera</span>
                </CardTitle>
                <CardDescription className="text-forest-600">
                  Point the camera at students for automatic attendance marking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-video bg-forest-900 rounded-xl overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {!isCapturing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-forest-900/80">
                      <div className="text-center text-white">
                        <Camera className="w-16 h-16 mx-auto mb-4 opacity-60" />
                        <p className="text-lg font-medium">Camera Preview</p>
                        <p className="text-forest-300">Click start to begin capture</p>
                      </div>
                    </div>
                  )}
                  {isCapturing && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-500 text-white animate-pulse">● REC</Badge>
                    </div>
                  )}
                </div>
                
                {/* BUTTON LOGIC: Swaps between Start and Stop */}
                <div className="flex space-x-4">
                  {!isCapturing ? (
                    <Button onClick={startCapture} className="flex-1 btn-primary" disabled={!selectedCourseId || readyState !== ReadyState.OPEN}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Capture
                    </Button>
                  ) : (
                    <Button onClick={stopCapture} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                      <Square className="w-4 h-4 mr-2" />
                      Stop Capture
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Status */}
            <Card className="glass-card animate-fade-in-up">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-forest-900">
                  <Users className="w-5 h-5" />
                  <span>{selectedCourseData.name}</span>
                </CardTitle>
                <CardDescription className="text-forest-600">Real-time attendance status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-forest-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{presentStudentIds.size}</div>
                    <p className="text-xs text-forest-600">Present</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{(students.length) - presentStudentIds.size}</div>
                    <p className="text-xs text-forest-600">Absent</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-forest-900">{students.length}</div>
                    <p className="text-xs text-forest-600">Total</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {/* UI updates based on live data */}
                  {isLoadingStudents ? (
                    <div className="text-center p-4 text-gray-500">Loading students...</div>
                  ) : (
                    students.map((student) => {
                      const isPresent = presentStudentIds.has(student.id);
                      return (
                        <div key={student.id} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-300 ${isPresent ? 'bg-green-100' : 'bg-white/50 hover:bg-white/70'}`}>
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={student.profile_photo || undefined} />
                            <AvatarFallback className="bg-forest-gradient text-white">{student.first_name?.[0]}{student.last_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-forest-900">{student.first_name} {student.last_name}</p>
                          </div>
                          <Badge className={isPresent ? "bg-green-200 text-green-800" : "bg-red-100 text-red-800"}>
                            {isPresent && <CheckCircle className="w-4 h-4 mr-1" />}
                            {isPresent ? "Present" : "Absent"}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-4 border-t border-forest-200">
                  <div className="flex items-center justify-between text-sm text-forest-600">
                    <span>Session started:</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{new Date().toLocaleTimeString()}</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TakeAttendance;