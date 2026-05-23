"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "./Navbar";
import NoticeSearch from "./NoticeSearch";
import NoticeFilters from "./NoticeFilters";
import NoticeCard from "./NoticeCard";
import EmptyNoticeState from "./EmptyNoticeState";
import NoticeSkeleton from "./NoticeSkeleton";
import { motion } from "framer-motion";

const NOTICE_DATA = [
  {
    id: 1,
    title: "New Course Registration Opens",
    content:
      "Registration for Fall 2024 semester courses is now open. Students can register through the portal until September 30th, 2024.",
    category: "academic",
    priority: "high",
    author: "Academic Office",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    isPinned: true,
    tags: ["registration", "courses", "deadline"],
    targetAudience: ["student", "teacher"],
  },
  {
    id: 2,
    title: "Library Hours Extended",
    content:
      "Library will now be open until 10 PM on weekdays starting October 1st. Additional study spaces have been added on the second floor.",
    category: "general",
    priority: "medium",
    author: "Library Administration",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isPinned: false,
    tags: ["library", "hours", "study"],
    targetAudience: ["student", "teacher", "staff"],
  },
  {
    id: 3,
    title: "Scholarship Application Deadline",
    content:
      "Merit-based scholarship applications are due by October 15th. Apply early to ensure your application is processed on time.",
    category: "financial",
    priority: "high",
    author: "Financial Aid Office",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    isPinned: true,
    tags: ["scholarship", "financial-aid", "deadline"],
    targetAudience: ["student"],
  },
  {
    id: 4,
    title: "Faculty Meeting Rescheduled",
    content:
      "The monthly faculty meeting has been moved from October 5th to October 8th at 2 PM in Conference Room A.",
    category: "administrative",
    priority: "medium",
    author: "Dean's Office",
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    isPinned: false,
    tags: ["meeting", "faculty", "schedule-change"],
    targetAudience: ["teacher", "admin"],
  },
  {
    id: 5,
    title: "New AI Lab Equipment",
    content:
      "The Computer Science department has received new AI workstations. Students can book time slots starting next week.",
    category: "academic",
    priority: "low",
    author: "CS Department",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    isPinned: false,
    tags: ["equipment", "AI", "computer-science"],
    targetAudience: ["student", "teacher"],
  },
  {
    id: 6,
    title: "Campus WiFi Maintenance",
    content:
      "Campus WiFi will be temporarily unavailable on October 10th from 2 AM to 4 AM for scheduled maintenance.",
    category: "technical",
    priority: "medium",
    author: "IT Department",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    isPinned: false,
    tags: ["wifi", "maintenance", "downtime"],
    targetAudience: ["student", "teacher", "staff", "admin"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All Notices" },
  { id: "academic", label: "Academic" },
  { id: "administrative", label: "Administrative" },
  { id: "financial", label: "Financial" },
  { id: "general", label: "General" },
  { id: "technical", label: "Technical" },
];

/**
 * SmartNoticeBoard Component
 * 
 * A fully-featured notice board with:
 * - Real-time search with debouncing
 * - Multi-faceted filtering (category, priority, tags, date range)
 * - Read/Unread tracking with localStorage persistence
 * - Responsive design for mobile, tablet, and desktop
 * - Dark mode support (default theme)
 * - Smooth animations with Framer Motion
 * - Performance optimizations with useMemo and useCallback
 * - Accessibility support (ARIA labels, semantic HTML)
 */
const SmartNoticeBoard = () => {
  const { user, loading: authLoading } = useAuth();
  const [notices, setNotices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);
  const [dateRange, setDateRange] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [readNotices, setReadNotices] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const userRole = user?.role || "student";
  const userId = user?.uid || user?.id || "anonymous";

  // Memoized available tags extraction
  const availableTags = useMemo(
    () => Array.from(new Set(NOTICE_DATA.flatMap((notice) => notice.tags))).sort(),
    []
  );

  // Memoized search suggestions for autocomplete
  const searchOptions = useMemo(() => {
    const options = new Set();
    NOTICE_DATA.forEach((notice) => {
      options.add(notice.title);
      options.add(notice.category);
      notice.tags.forEach((tag) => options.add(tag));
    });
    CATEGORIES.filter((category) => category.id !== "all").forEach((category) =>
      options.add(category.label)
    );
    return Array.from(options).sort();
  }, []);

  // Calculate active filter count for UI feedback
  const activeFilterCount = useMemo(
    () =>
      [
        selectedCategory !== "all",
        selectedPriority !== "all",
        selectedTags.length > 0,
        dateRange !== "all",
        showOnlyUnread,
      ].filter(Boolean).length,
    [selectedCategory, selectedPriority, selectedTags, dateRange, showOnlyUnread]
  );

  // Initialize notices and load read status from localStorage
  useEffect(() => {
    if (!authLoading && user) {
      const roleNotices = NOTICE_DATA.filter((notice) =>
        notice.targetAudience.includes(userRole)
      );
      setNotices(roleNotices);
      setLoading(false);

      const cached = localStorage.getItem(`readNotices_${userId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setReadNotices(new Set(parsed));
          }
        } catch (error) {
          console.error("Failed to read cached notices", error);
          localStorage.removeItem(`readNotices_${userId}`);
        }
      }
    }

    if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, userRole, userId]);

  // Persist read status to localStorage
  const saveReadState = useCallback(
    (state) => {
      if (!userId) return;
      localStorage.setItem(`readNotices_${userId}`, JSON.stringify([...state]));
    },
    [userId]
  );

  // Mark notice as read
  const markAsRead = useCallback(
    (noticeId) => {
      setReadNotices((current) => {
        const next = new Set(current);
        next.add(noticeId);
        saveReadState(next);
        return next;
      });
    },
    [saveReadState]
  );

  // Mark notice as unread
  const markAsUnread = useCallback(
    (noticeId) => {
      setReadNotices((current) => {
        const next = new Set(current);
        next.delete(noticeId);
        saveReadState(next);
        return next;
      });
    },
    [saveReadState]
  );

  // Convert timestamp to relative time (e.g., "2 hours ago")
  const getRelativeTime = useCallback((date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  }, []);

  // Complex filtering logic with memoization for performance
  const filteredNotices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return notices
      .filter((notice) => {
        // Text search across multiple fields
        if (query) {
          const haystack = `${notice.title} ${notice.content} ${notice.tags.join(" ")} ${notice.category}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }

        // Category filter
        if (selectedCategory !== "all" && notice.category !== selectedCategory) {
          return false;
        }

        // Priority filter
        if (selectedPriority !== "all" && notice.priority !== selectedPriority) {
          return false;
        }

        // Tags filter (AND logic - must match all selected tags)
        if (
          selectedTags.length > 0 &&
          !selectedTags.every((tag) => notice.tags.includes(tag))
        ) {
          return false;
        }

        // Unread filter
        if (showOnlyUnread && readNotices.has(notice.id)) {
          return false;
        }

        // Date range filter
        if (dateRange === "today") {
          return now - notice.createdAt.getTime() <= 24 * 60 * 60 * 1000;
        }

        if (dateRange === "7d") {
          return now - notice.createdAt.getTime() <= 7 * 24 * 60 * 60 * 1000;
        }

        if (dateRange === "30d") {
          return now - notice.createdAt.getTime() <= 30 * 24 * 60 * 60 * 1000;
        }

        return true;
      })
      .sort((a, b) => {
        // Pin notices at top
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }

        // Sort by date
        if (sortOrder === "oldest") {
          return a.createdAt.getTime() - b.createdAt.getTime();
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [notices, searchQuery, selectedCategory, selectedPriority, selectedTags, dateRange, sortOrder, showOnlyUnread, readNotices]);

  // Calculate unread count
  const unreadCount = useMemo(
    () => notices.filter((notice) => !readNotices.has(notice.id)).length,
    [notices, readNotices]
  );

  // Clear all filters and reset search
  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedPriority("all");
    setSelectedTags([]);
    setDateRange("all");
    setSortOrder("newest");
    setShowOnlyUnread(false);
  }, []);

  // Toggle tag selection
  const handleTagToggle = useCallback((tag) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  }, []);

  // Handle search suggestion click
  const handleSuggestionSelect = useCallback((suggestion) => {
    setSearchQuery(suggestion);
  }, []);

  // Loading state with skeleton cards
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/30">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-6 h-24 animate-pulse rounded-3xl bg-slate-900/80"
            />
            <NoticeSkeleton count={4} />
          </div>
        </motion.div>
      </div>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.12),_transparent_30%)] px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl space-y-10"
        >
          {/* Header Section */}
          <motion.header
            variants={itemVariants}
            className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl space-y-3">
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm uppercase tracking-[0.4em] text-indigo-300/80"
                >
                  Notice center
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"
                >
                  Notice Search & Filters
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="max-w-xl text-sm leading-7 text-slate-400 sm:text-base"
                >
                  Locate announcements instantly with a premium, responsive notice board that supports search, multi-faceted filters, dark mode, and animated transitions.
                </motion.p>
              </div>

              {/* Stats Grid */}
              <motion.div
                className="grid grid-cols-2 gap-4 sm:grid-cols-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[
                  { label: "Total", value: notices.length, color: "text-white" },
                  { label: "Unread", value: unreadCount, color: "text-emerald-400" },
                  {
                    label: "Pinned",
                    value: notices.filter((notice) => notice.isPinned).length,
                    color: "text-amber-400",
                  },
                  {
                    label: "High Priority",
                    value: notices.filter((notice) => notice.priority === "high").length,
                    color: "text-rose-400",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    variants={itemVariants}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-center"
                  >
                    <p className={`text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.header>

          {/* Main Content Layout */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 xl:grid-cols-[minmax(320px,380px)_1fr]"
          >
            {/* Sidebar Filters */}
            <motion.aside variants={itemVariants} className="space-y-6">
              <NoticeSearch
                value={searchQuery}
                onSearchChange={setSearchQuery}
                onClearFilters={handleClearFilters}
                resultsCount={filteredNotices.length}
                activeFilterCount={activeFilterCount}
                suggestions={searchOptions}
                onSuggestionSelect={handleSuggestionSelect}
              />

              <NoticeFilters
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedPriority={selectedPriority}
                onPriorityChange={setSelectedPriority}
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
                selectedDateRange={dateRange}
                onDateRangeChange={setDateRange}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                showOnlyUnread={showOnlyUnread}
                onToggleUnread={() => setShowOnlyUnread((current) => !current)}
              />
            </motion.aside>

            {/* Main Content - Notices Grid */}
            <motion.main variants={itemVariants} className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                {filteredNotices.length === 0 ? (
                  <EmptyNoticeState
                    query={searchQuery}
                    onResetFilters={handleClearFilters}
                  />
                ) : (
                  <motion.div
                    className="grid gap-5 lg:grid-cols-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                  >
                    {filteredNotices.map((notice) => {
                      const isRead = readNotices.has(notice.id);
                      return (
                        <NoticeCard
                          key={notice.id}
                          notice={notice}
                          isRead={isRead}
                          onToggleRead={() =>
                            isRead ? markAsUnread(notice.id) : markAsRead(notice.id)
                          }
                          searchQuery={searchQuery}
                          getRelativeTime={getRelativeTime}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </motion.main>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SmartNoticeBoard;

