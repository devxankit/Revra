import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import PM_navbar from '../../DEV-components/PM_navbar'
import PM_project_form from '../../DEV-components/PM_project_form'
import PM_task_form from '../../DEV-components/PM_task_form'
import { useToast } from '../../../../contexts/ToastContext'
import {
  analyticsService,
  projectService,
  taskService,
  teamService,
  milestoneService,
  pmRequestService,
  pmWalletService,
  socketService,
  tokenUtils
} from '../../DEV-services'
import {
  FiFolder,
  FiCheckSquare,
  FiUsers,
  FiCalendar,
  FiPlus,
  FiTrendingUp,
  FiBarChart,
  FiTarget,
  FiClock,
  FiCheckCircle,
  FiPauseCircle,
  FiFileText,
  FiLoader
} from 'react-icons/fi'

const PM_dashboard = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    projectStats: { total: 0, active: 0, completed: 0, onHold: 0, overdue: 0, newProjects: 0 },
    recentProjects: [],
    teamStats: { totalMembers: 0, activeTasks: 0, completedTasks: 0, activeMilestones: 0 },
    projectStatusData: [],
    productivityMetrics: {},
    requestsCount: 0,
    testingProjectsCount: 0,
    testingMilestonesCount: 0
  })
  const [projectGrowthData, setProjectGrowthData] = useState([])

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
    setupWebSocket()

    // Don't disconnect WebSocket when navigating between PM pages
    // The WebSocket connection will be managed globally
    return () => {
      // Only cleanup event listeners, not the connection itself
      socketService.off('connection_status')
      socketService.off('connection_error')
      socketService.off('project_updated')
      socketService.off('task_updated')
    }
  }, [])

  const setupWebSocket = async () => {
    const token = localStorage.getItem('pmToken')
    if (token && tokenUtils.isAuthenticated()) {
      try {
        await socketService.connect(token)

        // Listen for connection status
        socketService.on('connection_status', (status) => {
          if (!status.connected) {
            console.warn('WebSocket disconnected:', status.reason)
          }
        })

        // Listen for connection errors
        socketService.on('connection_error', (error) => {
          console.error('WebSocket connection error:', error)
          // Don't show error to user, just log it
        })

        // Listen for real-time updates
        socketService.on('project_updated', () => {
          loadDashboardData()
        })

        socketService.on('task_updated', () => {
          loadDashboardData()
        })
      } catch (error) {
        console.warn('WebSocket connection failed:', error)
        // Don't break the dashboard if WebSocket fails
      }
    } else {
      console.warn('No valid PM token found, skipping WebSocket connection')
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load projects data first - this is the main source of truth
      const [
        projectsResponse,
        teamStats,
        productivityMetrics,
        projectGrowth,
        testingProjectsResponse,
        requestStatsResponse,
        rewardResponse
      ] = await Promise.all([
        projectService.getAllProjects({ limit: 100 }), // Get all projects for statistics
        teamService.getTeamStatistics(),
        analyticsService.getProductivityMetrics(),
        analyticsService.getProjectGrowthAnalytics(), // Add this
        projectService.getAllProjects({ status: 'testing', limit: 100 }), // Get testing projects for count
        pmRequestService.getStatistics({ direction: 'all' })
      ])


      // Get projects data - handle both array response and object with data property
      const allProjects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse?.data || [])

      // Calculate statistics from projects data (frontend-based calculation)
      // Active = both 'active' and 'in-progress' to match Client/backend usage
      const projectStats = {
        total: allProjects.length,
        active: allProjects.filter(p => p.status === 'active' || p.status === 'in-progress').length,
        completed: allProjects.filter(p => p.status === 'completed').length,
        onHold: allProjects.filter(p => p.status === 'on-hold').length,
        planning: allProjects.filter(p => p.status === 'planning').length,
        testing: allProjects.filter(p => p.status === 'testing').length,
        cancelled: allProjects.filter(p => p.status === 'cancelled').length,
        // New projects: only untouched status (projects assigned to PM that haven't been started)
        newProjects: allProjects.filter(p => p.status === 'untouched').length,
        overdue: allProjects.filter(p => {
          if (!p.dueDate) return false
          return new Date(p.dueDate) < new Date() && !['completed', 'cancelled'].includes(p.status)
        }).length
      }

      const clampProgress = (p) => Math.min(100, Math.max(0, Number(p) || 0))
      // Process recent projects (limit to 3 most recent)
      const processedRecentProjects = allProjects
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3)
        .map(project => ({
          name: project.name,
          progress: project.status === 'completed' ? 100 : clampProgress(project.progress),
          status: project.status,
          deadline: project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No deadline',
          team: project.assignedTeam?.length || 0
        }))

      // Process team statistics with safe access
      const processedTeamStats = {
        totalMembers: teamStats?.data?.totalEmployees || 0,
        activeTasks: productivityMetrics?.data?.totalTasks || 0,
        completedTasks: productivityMetrics?.data?.completedTasks || 0,
        activeMilestones: 0 // Will be calculated from projects if needed
      }

      // Process project status data for chart
      const projectStatusData = [
        { name: 'In Progress', value: projectStats.active, color: '#10B981', count: `${projectStats.active} projects` },
        { name: 'Completed', value: projectStats.completed, color: '#3B82F6', count: `${projectStats.completed} projects` },
        { name: 'On Hold', value: projectStats.onHold, color: '#F59E0B', count: `${projectStats.onHold} project${projectStats.onHold !== 1 ? 's' : ''}` },
        { name: 'Overdue', value: projectStats.overdue, color: '#EF4444', count: `${projectStats.overdue} project${projectStats.overdue !== 1 ? 's' : ''}` }
      ]

      // Get testing projects count - handle both array response and object with data property
      const testingProjects = Array.isArray(testingProjectsResponse) ? testingProjectsResponse : (testingProjectsResponse?.data || []);
      const testingProjectsCount = testingProjects.length;

      // Extract request statistics count
      const requestsCount = (() => {
        if (!requestStatsResponse) return 0
        if (typeof requestStatsResponse.totalRequests === 'number') return requestStatsResponse.totalRequests
        if (requestStatsResponse.success && requestStatsResponse.data) {
          return requestStatsResponse.data.totalRequests || 0
        }
        if (requestStatsResponse.data) {
          return requestStatsResponse.data.totalRequests || 0
        }
        return 0
      })();

      // Get testing milestones count by fetching all projects and their milestones
      let testingMilestonesCount = 0;
      try {
        const allProjectsForMilestones = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse?.data || []);
        const milestonePromises = allProjectsForMilestones.map(project =>
          milestoneService.getMilestonesByProject(project._id).catch(() => ({ data: [] }))
        );
        const milestoneResponses = await Promise.all(milestonePromises);
        const allMilestones = milestoneResponses.flatMap(response => {
          // Handle both array response and object with data property
          return Array.isArray(response) ? response : (response?.data || []);
        });
        testingMilestonesCount = allMilestones.filter(m => m.status === 'testing').length;
      } catch (error) {
        console.error('Error loading testing milestones count:', error);
      }

      // Process project growth data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const processedGrowthData = projectGrowth?.data?.monthlyData?.map((item, index) => ({
        month: monthNames[index],
        projects: item.count,
        color: `bg-teal-${Math.min(300 + (item.count * 50), 700)}`
      })) || [];

      setProjectGrowthData(processedGrowthData);

      // Set dashboard data with all information including testing counts
      setDashboardData({
        projectStats,
        recentProjects: processedRecentProjects,
        teamStats: processedTeamStats,
        projectStatusData,
        productivityMetrics: productivityMetrics?.data || {},
        requestsCount,
        testingProjectsCount,
        testingMilestonesCount
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      console.error('Project Growth API Error:', error)
      // Set fallback data on error
      setDashboardData({
        projectStats: { total: 0, active: 0, completed: 0, onHold: 0, overdue: 0, newProjects: 0 },
        recentProjects: [],
        teamStats: { totalMembers: 0, activeTasks: 0, completedTasks: 0, activeMilestones: 0 },
        projectStatusData: [
          { name: 'In Progress', value: 0, color: '#10B981', count: '0 projects' },
          { name: 'Completed', value: 0, color: '#3B82F6', count: '0 projects' },
          { name: 'On Hold', value: 0, color: '#F59E0B', count: '0 projects' },
          { name: 'Overdue', value: 0, color: '#EF4444', count: '0 projects' }
        ],
        productivityMetrics: {},
        requestsCount: 0,
        testingProjectsCount: 0,
        testingMilestonesCount: 0
      })
      setProjectGrowthData([])
    } finally {
      setLoading(false)
    }
  }

  const handleProjectSubmit = async (data) => {
    try {
      await projectService.createProject(data)
      toast.success('Project created successfully!')
      setIsProjectFormOpen(false)
      loadDashboardData() // Refresh data
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project. Please try again.')
    }
  }

  const handleTaskSubmit = async (taskData) => {
    try {
      // Create task
      const createdTask = await taskService.createTask(taskData)

      // Upload attachments if any
      if (taskData.attachments && taskData.attachments.length > 0) {
        toast.info(`Uploading ${taskData.attachments.length} attachment(s)...`)

        for (const attachment of taskData.attachments) {
          try {
            const file = attachment.file || attachment
            await taskService.uploadTaskAttachment(createdTask._id, file)
            toast.success(`Attachment ${attachment.name} uploaded successfully`)
          } catch (error) {
            console.error('Attachment upload error:', error)
            toast.error(`Failed to upload ${attachment.name}`)
          }
        }
      }

      toast.success('Task created successfully!')
      setIsTaskFormOpen(false)
      loadDashboardData() // Refresh data
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task. Please try again.')
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div>
        <PM_navbar />
        <div className="pt-16 lg:pt-16 pb-20 lg:pb-0 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="animate-spin text-4xl text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'near-completion': return 'bg-blue-500'
      case 'overdue': return 'bg-red-500'
      case 'on-hold': return 'bg-yellow-500'
      case 'testing': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active'
      case 'near-completion': return 'Near Completion'
      case 'overdue': return 'Overdue'
      case 'on-hold': return 'On Hold'
      case 'testing': return 'Testing'
      default: return 'Unknown'
    }
  }

  return (
    <div>
      <PM_navbar />

      {/* Main Content */}
      <div className="pt-16 lg:pt-16 pb-20 lg:pb-0 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* New Project Card */}
          <div
            onClick={() => navigate('/pm-new-projects')}
            className="bg-teal-100 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-teal-300/40 cursor-pointer mb-6 transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              boxShadow: '0 8px 25px -5px rgba(20, 184, 166, 0.2), 0 4px 12px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-teal-900 mb-1">New Project</h2>
                <p className="text-sm text-teal-700">Projects requiring setup or initial planning</p>
              </div>
              <div
                className="bg-teal-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-teal-400/30"
                style={{
                  boxShadow: '0 4px 12px -2px rgba(20, 184, 166, 0.3), 0 2px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <span className="text-lg font-bold">{dashboardData.projectStats.newProjects}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button onClick={() => setIsProjectFormOpen(true)} className="flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:from-teal-600 hover:to-teal-700">
              <FiPlus className="text-lg" />
              <span>Add New Project</span>
            </button>
            <button onClick={() => setIsTaskFormOpen(true)} className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:from-purple-600 hover:to-purple-700">
              <FiCheckSquare className="text-lg" />
              <span>Add New Task</span>
            </button>
          </div>

          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Active Projects Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <FiFolder className="text-teal-600 text-lg" />
                </div>
                <span className="text-sm text-gray-600 font-medium">Active</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{dashboardData.projectStats.active}</div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>

            {/* Completed Projects Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="text-green-600 text-lg" />
                </div>
                <span className="text-sm text-gray-600 font-medium">Done</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{dashboardData.projectStats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>

            {/* Overdue Projects Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FiClock className="text-red-600 text-lg" />
                </div>
                <span className="text-sm text-gray-600 font-medium">Overdue</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{dashboardData.projectStats.overdue}</div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>

            {/* Active Tasks Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FiCheckSquare className="text-purple-600 text-lg" />
                </div>
                <span className="text-sm text-gray-600 font-medium">Active</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{dashboardData.teamStats.activeTasks}</div>
              <div className="text-sm text-gray-600">Tasks</div>
            </div>
          </div>

          {/* Request Management Card */}
          <div className="mb-6 md:mb-8">
            <div
              onClick={() => navigate('/pm-requests')}
              className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-4 shadow-sm border border-teal-200 cursor-pointer hover:shadow-md hover:border-teal-300 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-100 rounded-xl">
                    <FiFileText className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-teal-900 mb-1">Request Management</h3>
                    <p className="text-xs text-teal-700">Manage incoming and outgoing requests</p>
                  </div>
                </div>
                <div className="bg-teal-300 text-teal-800 px-4 py-2 rounded-xl shadow-sm">
                  <p className="text-2xl font-bold">{dashboardData.requestsCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Testing Projects Card */}
          <div className="mb-6 md:mb-8">
            <div
              onClick={() => navigate('/pm-testing-projects')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 shadow-sm border border-purple-200 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <FiCheckSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-purple-900 mb-1">Testing Projects</h3>
                    <p className="text-xs text-purple-700">Projects currently in testing phase</p>
                  </div>
                </div>
                <div className="bg-purple-300 text-purple-800 px-4 py-2 rounded-xl shadow-sm">
                  <p className="text-2xl font-bold">{dashboardData.testingProjectsCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Testing Milestones Card */}
          <div className="mb-6 md:mb-8">
            <div
              onClick={() => navigate('/pm-testing-milestones')}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 shadow-sm border border-indigo-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-xl">
                    <FiTarget className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-900 mb-1">Testing Milestones</h3>
                    <p className="text-xs text-indigo-700">Milestones currently in testing phase</p>
                  </div>
                </div>
                <div className="bg-indigo-300 text-indigo-800 px-4 py-2 rounded-xl shadow-sm">
                  <p className="text-2xl font-bold">{dashboardData.testingMilestonesCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
              <button type="button" onClick={() => navigate('/pm-projects')} className="text-teal-600 text-sm font-medium hover:text-teal-700">View All</button>
            </div>

            <div className="space-y-2">
              {dashboardData.recentProjects.map((project, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <h3 className="font-medium text-gray-900 mb-2">{project.name}</h3>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-900 font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Project Growth Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Project Growth</h3>
                <FiTrendingUp className="text-teal-600 text-lg" />
              </div>

              {/* Scrollable Bar Chart Container */}
              <div className="relative h-32 mb-4">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2 z-10">
                  {(() => {
                    const values = projectGrowthData.length > 0 ? projectGrowthData.map(d => d.projects) : [];
                    const maxProjects = values.length > 0 ? Math.max(...values, 1) : 12;
                    const yAxisLabels = [maxProjects, Math.floor(maxProjects * 0.75), Math.floor(maxProjects * 0.5), Math.floor(maxProjects * 0.25), 0];
                    return yAxisLabels.map((label, i) => <span key={i}>{label}</span>);
                  })()}
                </div>

                {/* Scrollable Chart Area */}
                <div className="ml-8 h-full overflow-x-auto scrollbar-hide">
                  <div className="flex items-end space-x-1 w-max h-full relative min-w-full">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      <div className="border-t border-gray-200"></div>
                      <div className="border-t border-gray-200"></div>
                      <div className="border-t border-gray-200"></div>
                      <div className="border-t border-gray-200"></div>
                      <div className="border-t border-gray-200"></div>
                    </div>

                    {/* All 12 Months Bars */}
                    {projectGrowthData.length > 0 ? projectGrowthData.map((data, index) => (
                      <div key={index} className="flex flex-col items-center group">
                        {/* Bar */}
                        <div
                          className={`${data.color} w-6 mb-2 rounded-t-sm transition-all duration-300 hover:bg-teal-600 relative`}
                          style={{ height: `${(data.projects / (Math.max(...projectGrowthData.map(d => d.projects), 1) || 1)) * 90}px` }}
                          title={`${data.month}: ${data.projects} projects`}
                        >
                          {/* Value label on hover */}
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            {data.projects}
                          </div>
                        </div>

                        {/* Month label */}
                        <div className="text-xs font-medium text-gray-600">{data.month}</div>
                      </div>
                    )) : (
                      <div className="text-center text-gray-500 py-8">No data available</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">New Projects</span>
                  </div>
                  <span className="text-sm font-medium text-teal-600">
                    {(() => {
                      const totalThisYear = projectGrowthData.reduce((sum, d) => sum + d.projects, 0);
                      return totalThisYear > 0 ? `${totalThisYear} projects this year` : 'No projects yet';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Team Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
                <FiUsers className="text-blue-600 text-lg" />
              </div>
              <div className="space-y-4">
                {/* Top Row - Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{dashboardData.teamStats.totalMembers}</div>
                    <div className="text-xs text-blue-700 font-medium">Team Members</div>
                  </div>
                  <div className="text-center p-3 bg-teal-50 rounded-lg">
                    <div className="text-xl font-bold text-teal-600">{dashboardData.teamStats.activeTasks}</div>
                    <div className="text-xs text-teal-700 font-medium">Active Tasks</div>
                  </div>
                </div>

                {/* Performance Indicators */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Tasks Completed</span>
                    <span className="text-sm font-bold text-green-600">{dashboardData.teamStats.completedTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Active Milestone Count</span>
                    <span className="text-sm font-bold text-purple-600">{dashboardData.teamStats.activeMilestones}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Active Projects</span>
                    <span className="text-sm font-bold text-orange-600">{dashboardData.projectStats.active}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Status Donut Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Project Status Overview</h3>
              <p className="text-gray-600 text-sm">Distribution of projects by current status</p>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between">
              {/* Donut Chart */}
              <div className="flex justify-center mb-6 lg:mb-0">
                <div className="relative">
                  <PieChart width={280} height={280}>
                    <Pie
                      data={dashboardData.projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {dashboardData.projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>

                  {/* Center Text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-900">{dashboardData.projectStats.total}</p>
                      <p className="text-sm text-gray-600">Total Projects</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 lg:pl-8">
                <div className="space-y-4">
                  {dashboardData.projectStatusData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200/50 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-5 h-5 rounded-full shadow-sm"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <div>
                          <p className="text-base font-semibold text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.count}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{item.value}</p>
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              backgroundColor: item.color,
                              width: `${(item.value / dashboardData.projectStats.total) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200/50">
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <p className="text-xs font-semibold text-emerald-700">Completion Rate</p>
                    </div>
                    <p className="text-base font-bold text-emerald-900">{Math.round((dashboardData.projectStats.completed / Math.max(dashboardData.projectStats.total, 1)) * 100)}%</p>
                    <p className="text-xs text-emerald-600">{dashboardData.projectStats.completed}/{dashboardData.projectStats.total} completed</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200/50">
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <p className="text-xs font-semibold text-blue-700">Active Rate</p>
                    </div>
                    <p className="text-base font-bold text-blue-900">{Math.round((dashboardData.projectStats.active / Math.max(dashboardData.projectStats.total, 1)) * 100)}%</p>
                    <p className="text-xs text-blue-600">{dashboardData.projectStats.active}/{dashboardData.projectStats.total} in progress</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Forms */}
      <PM_project_form
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
        onSubmit={handleProjectSubmit}
      />
      <PM_task_form
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSubmit={handleTaskSubmit}
      />
    </div>
  )
}

export default PM_dashboard
