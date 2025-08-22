
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner"; 
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BookOpen, Users, Camera, Clock, TrendingUp, Calendar } from "lucide-react";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";


const fetchDashboardData = async () => {
  const response = await api.get("/dashboard-data/");
  return response.data;
};

const fetchUserData = async () => {
  const response = await api.get("/auth/users/me/");
  return response.data;
};

const Dashboard = () => {
  const { data: dashboardData, isLoading: isLoadingDashboard, isError: isErrorDashboard, error: errorDashboard } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
  });

  const { data: userData, isLoading: isLoadingUser, isError: isErrorUser, error: errorUser } = useQuery({
    queryKey: ['userData'],
    queryFn: fetchUserData,
  });

  if (isLoadingDashboard || isLoadingUser) {
    return (
      <Layout> {/* Render within the layout */}
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]"> {/* Use Tailwind for centering */}
          {/* Add a spinner or loading message */}
          <LoadingSpinner className="text-forest-900" /> {/* Assuming CircularProgress is available or use a Tailwind spinner */}
          <p className="ml-3 text-lg text-forest-700">Loading dashboard data...</p>
        </div>
      </Layout>
    );
  }

  if (isErrorDashboard || isErrorUser) {
    return (
      <Layout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load dashboard data: {errorDashboard?.message || errorUser?.message || "An unknown error occurred."}
            </AlertDescription>
          </Alert>
          <p className="mt-4 text-forest-600">Please try again later or contact support.</p>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
     <div className="p-3 sm:p-4 md:p-6 space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <SidebarTrigger className="text-forest-700 hover:text-forest-900" />
            <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 animate-fade-in-up">Dashboard</h1>
            <p className="text-sm sm:text-base text-forest-600 animate-fade-in-up">Welcome back, {userData?.first_name} {userData?.last_name}</p>
            </div>
          </div>
          <div className="text-left sm:text-right animate-slide-in-right">
            <p className="text-sm text-forest-600">Today</p>
            <p className="text-base sm:text-lg font-semibold text-forest-900">{new Date().toLocaleDateString()}</p>
          </div>
        </div>


        {/* Stats Grid - Populate with data.stats */}
        {/* Assuming stats are { course_count: number, student_count: number } */}
        {/* You need to adapt this based on the exact icons/titles you want for these two numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"> {/* Adjusted to 2 columns for the main stats */}
           {/* Card for Course Count */}
           <Card  className="glass-card hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${100 * 100}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-forest-700">Total Courses</CardTitle>
                <div className={`w-10 h-10 bg-forest-gradient rounded-lg flex items-center justify-center`}>
                  <BookOpen className="w-5 h-5 text-white" /> {/* Use BookOpen icon */}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-forest-900">{dashboardData.stats.course_count}</div> {/* Display count from API */}
                <p className="text-xs text-forest-600 mt-1">+X this period</p> {/* Placeholder for change if needed */}
              </CardContent>
            </Card>

            {/* Card for Student Count */}
            <Card className="glass-card hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `100ms` }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-forest-700">Total Enrolled Students</CardTitle>
                 <div className={`w-10 h-10 bg-earth-gradient rounded-lg flex items-center justify-center`}>
                  <Users className="w-5 h-5 text-white" /> {/* Use Users icon */}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-forest-900">{dashboardData.stats.student_count}</div> {/* Display count from API */}
                <p className="text-xs text-forest-600 mt-1">+Y this period</p> {/* Placeholder for change if needed */}
              </CardContent>
            </Card>

            {/* You could add more stats here, like Attendance Today (requires backend calculation) */}
            {/* E.g., pass the data to a StatCard component if you create one */}

        </div>

        {/* Recent Activity & Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Left Column: Chart (Attendance Trend) */}
            <Card className="glass-card animate-fade-in-up">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-forest-900 text-lg sm:text-xl">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Recent Attendance Sessions</span>
                  </CardTitle>
                  <CardDescription className="text-forest-600 text-sm sm:text-base">
                        Daily attendance count over the past week.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    {/* TODO: INTEGRATE CHART COMPONENT HERE */}
                    {/* Your template might have a Chart component, or you can use react-chartjs-2 directly */}
                     <div className="h-64 md:h-80"> {/* Give the chart a height */}
                         {/* Example if using react-chartjs-2 */}
                         {/* Make sure react-chartjs-2 and chart.js are installed */}
                         {/* You'll need chartOptions and chartData defined as in the previous MUI Dashboard code */}
                         {/*
                         <Line options={chartOptions} data={chartData} />
                         */}
                         <p className="text-forest-600 text-center">Chart placeholder</p> {/* Keep placeholder for now */}
                     </div>
                 </CardContent>
            </Card>


          {/* Right Column: Recent Attendance Sessions - Populate with data.recent_attendance */}
          <Card className="glass-card animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-forest-900">
                <Clock className="w-5 h-5" /> {/* Changed icon to Clock */}
                <span>Recent Attendance Sessions</span>
              </CardTitle>
              <CardDescription className="text-forest-600">
                Your latest classroom sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Map over dashboardData.recent_attendance from the API */}
                {dashboardData.recent_attendance.length > 0 ? (
                     dashboardData.recent_attendance.map((activity, index) => (
                        <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-white/50 hover:bg-white/70 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-forest-gradient rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-white" /> {/* Icon for the course/session */}
                            </div>
                            <div>
                              {/* Display dashboardData from the API */}
                              <p className="font-medium text-forest-900">{activity.course_name}</p> {/* From backend serializer */}
                              <p className="text-sm text-forest-600">{activity.student_name} • {new Date(activity.timestamp).toLocaleString()}</p> {/* From backend serializer */}
                            </div>
                          </div>
                          {/* You might not have attendance percentage per recent record in the backend, or need to add it */}
                          {/* <div className="text-right">
                            <p className="font-semibold text-forest-900">{activity.attendance}%</p>
                            <p className="text-xs text-forest-600">Attendance</p>
                          </div> */}
                        </div>
                     ))
                ) : (
                     <p className="text-center text-forest-600">No recent attendance records found.</p>
                )}
              </div>
            </CardContent>
          </Card>

           {/* TODO: Add "Recent Courses" or "Today's Schedule" Card here using API data */}
           {/* data.recent_courses can populate a list similar to recent attendance */}
           {/* data.attendance_chart is for the chart */}

        </div>

        {/* TODO: Add other sections if needed */}


      </div>
    </Layout>
  );
};
export default Dashboard;
