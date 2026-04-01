import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '../../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Download, Calendar, Filter } from 'lucide-react'
import { SparklesText } from '../../../components/ui/sparkles-text'
import { cn } from '../../../lib/utils'

const DashboardHeader = ({ 
  title = "Admin Dashboard",
  subtitle = "Welcome to the Appzeto admin panel. Monitor and manage your entire platform.",
  timeRange,
  onTimeRangeChange,
  onExport,
  className,
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("mb-6", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <SparklesText
            text={title}
            className="text-3xl font-bold mb-2"
            sparklesCount={3}
          />
          <p className="text-gray-600 text-lg">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={onExport}
            className="flex items-center space-x-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export default DashboardHeader
