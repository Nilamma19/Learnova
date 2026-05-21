import SkeletonCard from "@/components/ui/SkeletonCard";
import DashboardSkeleton from "@/components/ui/DashboardSkeleton";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  Camera,
  CheckCircle,
  AlertCircle,
  User,
  Bell,
  BookOpen,
  TrendingUp,
  Target,
  Award,
  Settings,
  LogOut,
  ChevronRight,
  Wifi,
  Shield,
  Smartphone,
  Eye,
  Users,
  BarChart3,
  Download,
  Filter,
  Search,
  RefreshCw,
  Star,
  Sparkles,
} from "lucide-react";
import { Navbar } from "./Navbar";
import dynamic from "next/dynamic";
import ChartSkeleton from "@/components/ui/ChartSkeleton";

const AttendanceHeatmap = dynamic(
  () => import("./AttendanceHeatmap"),
  { ssr: false, loading: () => <ChartSkeleton variant="heatmap" /> }
);

import { useAuth } from "@/hooks/useAuth";
import { weeklySchedule, mockRecentActivity } from "@/constants/mockData";
import AttendanceAnalytics from "./dashboard/AttendanceAnalytics";

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState("pending");
  const [todayClasses, setTodayClasses] = useState([]);

  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingClass, setUpcomingClass] = useState(null);
  const [isAttendanceWindow, setIsAttendanceWindow] = useState(false);

  const { user } = useAuth();

  // Mock schedule data is now imported from @/constants/mockData

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const hour = now.getHours();
      const minute = now.getMinutes();
      const day = now.getDay();

      const isWeekday = day >= 1 && day <= 5;
      const isAttendanceTime = hour === 9 && minute <= 10;

      setIsAttendanceWindow(isWeekday && isAttendanceTime);

      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      const today = dayNames[day];

      setTodayClasses(weeklySchedule[today] || []);

      if (weeklySchedule[today]) {
        const upcoming = weeklySchedule[today].find((cls) => {
          const [startTime] = cls.time.split("-");
          const [classHour, classMinute] = startTime.split(":").map(Number);

          return (
            hour < classHour ||
            (hour === classHour && minute < classMinute)
          );
        });

        setUpcomingClass(upcoming);
      }
    }, 1000);

    setRecentActivity(mockRecentActivity);

    return () => {
      clearInterval(timer);
      clearTimeout(loadingTimer);
    };
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "text-green-400 bg-green-500/10 border-green-500/30";

      case "absent":
        return "text-red-400 bg-red-500/10 border-red-500/30";

      case "late":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";

      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const getUserInitials = () => {
    if (!user || !user.name) return "ST";
    return user.name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen p-6 space-y-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white mt-16">
      <Navbar />

      {/* Premium Glassy Welcome Header */}
      <div className="bg-gradient-to-r from-gray-900/80 via-blue-900/40 to-purple-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl px-6 py-4 mb-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm tracking-wide">
                {getUserInitials()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Welcome back, {user?.name || "Student"}! <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              </h1>
              <p className="text-xs text-gray-400">Student Portal • {user?.email || "student@learnova.edu"}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-white font-semibold text-lg">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-xs text-gray-400">
                {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <button className="relative p-2.5 bg-gray-800/60 hover:bg-gray-700/60 rounded-xl border border-gray-600/40 transition-colors shadow-sm">
              <Bell className="w-5 h-5 text-gray-300" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center shadow-md">
                3
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 backdrop-blur-xl border border-green-500/20 rounded-2xl p-5 shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
              On Track
            </span>
          </div>
          <h3 className="text-2xl font-bold text-green-400">
            94%
          </h3>
          <p className="text-sm text-gray-300 mt-1">Attendance Rate</p>
          <p className="text-xs text-green-400 mt-2">↑ 2.5% this month</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-5 shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
              Outstanding
            </span>
          </div>
          <h3 className="text-2xl font-bold text-blue-400">
            8.9 / 10
          </h3>
          <p className="text-sm text-gray-300 mt-1">Cumulative GPA</p>
          <p className="text-xs text-blue-400 mt-2">Top 5% of Department</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-5 shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <BookOpen className="w-8 h-8 text-purple-400" />
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
              Due Soon
            </span>
          </div>
          <h3 className="text-2xl font-bold text-purple-400">
            18 / 21
          </h3>
          <p className="text-sm text-gray-300 mt-1">Assignments Finished</p>
          <p className="text-xs text-purple-400 mt-2">3 pending submissions</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-5 shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8 text-yellow-400" />
            <span className={`text-xs px-2 py-1 rounded-full border ${isAttendanceWindow ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
              {isAttendanceWindow ? "Active" : "Locked"}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-yellow-400">
            {isAttendanceWindow ? "Check-in Open" : "Check-in Closed"}
          </h3>
          <p className="text-sm text-gray-300 mt-1">Daily Verification Window</p>
          <p className="text-xs text-yellow-400 mt-2">09:00 - 09:10 (Mon-Fri)</p>
        </div>
      </div>

      {/* Main Student Hub Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Classes Schedule & Heatmap */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Card */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Today's Schedule
            </h2>
            {todayClasses && todayClasses.length > 0 ? (
              <div className="space-y-4">
                {todayClasses.map((cls, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-800/40 border border-white/5 p-4 rounded-xl hover:border-indigo-500/30 hover:bg-gray-800/60 transition-all duration-300 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{cls.subject}</h4>
                        <p className="text-xs text-gray-400">{cls.teacher} • {cls.room}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto text-sm text-gray-300 bg-gray-900/60 px-3 py-1.5 rounded-lg border border-white/5">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span>{cls.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No classes scheduled for today. Enjoy your day off!</p>
              </div>
            )}
          </div>

          {/* Attendance Heatmap */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Attendance History Heatmap
            </h2>
            <div className="w-full">
              <AttendanceHeatmap />
            </div>
          </div>
        </div>

        {/* Right Side: Live Analytics, Upcoming Class & Recent Activity Log */}
        <div className="space-y-6">
          {/* Live Firestore Attendance Analytics */}
          {user && user.uid && <AttendanceAnalytics userId={user.uid} />}

          {/* Next Class Highlight */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2 relative z-10">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Upcoming Class
            </h2>
            {upcomingClass ? (
              <div className="space-y-4 relative z-10">
                <div className="bg-black/30 border border-white/10 p-4 rounded-xl">
                  <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider mb-1">NEXT SESSION</div>
                  <h3 className="text-lg font-bold text-white mb-2">{upcomingClass.subject}</h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{upcomingClass.teacher}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{upcomingClass.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{upcomingClass.room}</span>
                    </div>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 font-medium shadow-md shadow-indigo-500/20">
                  Join Virtual Room
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 relative z-10">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-60 animate-bounce" />
                <p className="text-sm">You are all caught up for today!</p>
              </div>
            )}
          </div>

          {/* Recent Attendance Activity Log */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              Recent Attendance Log
            </h2>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${getStatusColor(activity.status)}`}>
                        {activity.status === "present" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : activity.status === "absent" ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{activity.subject}</div>
                        <div className="text-xs text-gray-400">{activity.date} at {activity.time}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No recent attendance history.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;