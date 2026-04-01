import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Combobox } from '../../../components/ui/combobox';
import { MultiSelect } from '../../../components/ui/multi-select';
import { DatePicker } from '../../../components/ui/date-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Building2, AlertCircle, Star, Clock, CheckCircle, X, ArrowLeft, Loader2, Upload, FileText } from 'lucide-react';
import PM_navbar from './PM_navbar';
import CloudinaryUpload from '../../../components/ui/cloudinary-upload';
import { teamService, projectService } from '../DEV-services';

const PM_project_form = ({ isOpen, onClose, onSubmit, onAcknowledge, projectData }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Determine if this is edit mode
  // If isOpen is provided, it's dialog mode - always use dialog even if editing
  // If id is in URL, it's page mode - use full page layout
  const isDialogMode = isOpen !== undefined; // Dialog mode when isOpen prop is provided
  const isEditMode = !!id || (projectData && projectData._id && !isDialogMode);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    category: '',
    priority: 'normal',
    dueDate: '',
    assignedTeam: [],
    status: 'planning',
    attachments: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [fetchedProjectData, setFetchedProjectData] = useState(null);

  // Load users data when component mounts
  useEffect(() => {
    if (isOpen || isEditMode) {
      loadUsersData();
    }
  }, [isOpen, isEditMode]);

  // Load project data when in edit mode or when projectData is provided
  useEffect(() => {
    if (isEditMode && id && !isDialogMode) {
      // Only load from API if we're in page mode with URL id
      loadProjectData();
    } else if (projectData && isOpen) {
      // Pre-fill form with projectData (for editing from dialog mode)
      setFormData({
        name: projectData.name || '',
        description: projectData.description || '',
        client: projectData.client?._id || projectData.client || '', // Will be updated after clients are loaded if needed
        category: projectData.category?._id || projectData.category || '',
        priority: projectData.priority || 'normal',
        dueDate: projectData.dueDate ? (typeof projectData.dueDate === 'string' ? projectData.dueDate.split('T')[0] : new Date(projectData.dueDate).toISOString().split('T')[0]) : '',
        assignedTeam: Array.isArray(projectData.assignedTeam)
          ? projectData.assignedTeam.map(member => member._id || member)
          : [],
        status: projectData.status || 'planning',
        attachments: projectData.attachments || [],
      });
    }
  }, [isEditMode, id, projectData, isOpen, isDialogMode]);

  // Set client after clients are loaded (if not already set)
  useEffect(() => {
    const activeProjectData = projectData || fetchedProjectData;

    if (activeProjectData && clients.length > 0) {
      const currentClientId = formData.client;
      // Get the ID whether it's an object or string
      const projectClientId = activeProjectData.client?._id || (typeof activeProjectData.client === 'string' ? activeProjectData.client : null);

      // Only update if client is not already set correctly
      if (projectClientId && (!currentClientId || currentClientId !== projectClientId)) {
        // Try to find by ID first
        const clientById = clients.find(client => client.value === projectClientId);

        if (clientById) {
          setFormData(prev => ({ ...prev, client: clientById.value }));
        } else if (typeof projectClientId === 'string') {
          // If projectClientId is a string but not found in values, it might be a name
          // Try to find by label or subtitle
          const matchingClient = clients.find(client =>
            client.label === projectClientId ||
            client.subtitle === projectClientId ||
            client.value === projectClientId
          );

          if (matchingClient) {
            setFormData(prev => ({ ...prev, client: matchingClient.value }));
          }
        }
      } else if (!projectClientId && activeProjectData.client) {
        // Fallback if client is an object but doesn't have _id (unlikely but possible)
        const clientName = activeProjectData.client.name || activeProjectData.client.companyName;
        if (clientName) {
          const matchingClient = clients.find(client =>
            client.label === clientName ||
            client.subtitle === clientName
          );
          if (matchingClient) {
            setFormData(prev => ({ ...prev, client: matchingClient.value }));
          }
        }
      }
    }
  }, [clients, projectData, fetchedProjectData]);

  // Set category after categories are loaded
  useEffect(() => {
    const activeProjectData = projectData || fetchedProjectData;
    if (activeProjectData && categories.length > 0) {
      const projectCategoryId = activeProjectData.category?._id || (typeof activeProjectData.category === 'string' ? activeProjectData.category : null);
      if (projectCategoryId && (!formData.category || formData.category !== projectCategoryId)) {
        const categoryMatch = categories.find(cat => cat.value === projectCategoryId);
        if (categoryMatch) {
          setFormData(prev => ({ ...prev, category: categoryMatch.value }));
        }
      }
    }
  }, [categories, projectData, fetchedProjectData]);

  // Effect to pre-fill category when client is selected
  useEffect(() => {
    if (formData.client && !formData.category && clients.length > 0) {
      const selectedClient = clients.find(c => c.value === formData.client);
      if (selectedClient && selectedClient.category) {
        setFormData(prev => ({ ...prev, category: selectedClient.category }));
      }
    }
  }, [formData.client, clients]);

  const loadUsersData = async () => {
    setIsLoading(true);
    try {
      // Load clients, team members and categories from API
      const [clientsResponse, teamResponse, categoriesResponse] = await Promise.all([
        teamService.getClientsForProject(),
        teamService.getTeamMembersForProject(),
        projectService.getCategories()
      ]);

      // Format clients data - prioritize client names over company names
      const formattedClients = clientsResponse.data.map(client => ({
        value: client._id,
        label: client.name, // Show client name as primary label
        subtitle: client.companyName, // Show company as subtitle
        icon: Building2,
        avatar: client.name.substring(0, 2).toUpperCase(),
        category: client.category // Include category stored on client (from lead)
      }));

      // Format team members data
      const formattedTeamMembers = teamResponse.data.map(member => ({
        value: member._id,
        label: member.name,
        subtitle: `${member.position} - ${member.department}`,
        avatar: member.name.substring(0, 2).toUpperCase()
      }));

      // Format categories data
      const formattedCategories = categoriesResponse.data.map(cat => ({
        value: cat._id,
        label: cat.name,
        subtitle: cat.description,
        color: cat.color
      }));

      setClients(formattedClients);
      setTeamMembers(formattedTeamMembers);
      setCategories(formattedCategories);
    } catch (error) {
      console.error('Error loading users data:', error);
      // Fallback to empty arrays on error
      setClients([]);
      setTeamMembers([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectData = async () => {
    setIsLoading(true);
    try {
      // Load project data from API
      const response = await projectService.getProjectById(id);
      const project = response.data;

      // Format dueDate for DatePicker (YYYY-MM-DD format)
      let formattedDueDate = '';
      if (project.dueDate) {
        if (typeof project.dueDate === 'string') {
          formattedDueDate = project.dueDate.split('T')[0];
        } else {
          formattedDueDate = new Date(project.dueDate).toISOString().split('T')[0];
        }
      }

      setFetchedProjectData(project);

      setFormData({
        name: project.name || '',
        description: project.description || '',
        client: project.client?._id || project.client || '',
        category: project.category?._id || project.category || '',
        priority: project.priority || 'normal',
        dueDate: formattedDueDate,
        assignedTeam: project.assignedTeam?.filter(m => m).map(member => member._id || member) || [],
        status: project.status || 'planning',
        attachments: project.attachments || [],
      });
    } catch (error) {
      console.error('Error loading project:', error);
      navigate('/pm-projects');
    } finally {
      setIsLoading(false);
    }
  };

  const priorities = [
    { value: 'urgent', label: 'Urgent', icon: AlertCircle },
    { value: 'high', label: 'High', icon: AlertCircle },
    { value: 'normal', label: 'Normal', icon: CheckCircle },
    { value: 'low', label: 'Low', icon: Clock }
  ];

  const statuses = [
    { value: 'pending-assignment', label: 'Pending Assignment', icon: Clock },
    { value: 'untouched', label: 'Untouched', icon: AlertCircle },
    { value: 'started', label: 'Acknowledged', icon: CheckCircle },
    { value: 'planning', label: 'Planning', icon: Star },
    { value: 'active', label: 'Active', icon: CheckCircle },
    { value: 'on-hold', label: 'On Hold', icon: Clock },
    { value: 'testing', label: 'Testing', icon: CheckCircle },
    { value: 'maintenance', label: 'Maintenance', icon: Clock },
    { value: 'completed', label: 'Completed', icon: CheckCircle },
    { value: 'cancelled', label: 'Cancelled', icon: X }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file, index) => ({
      id: `att-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file
    }));
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
  };

  const removeAttachment = (id) => {
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(att => att.id !== id) }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    if (!formData.client.trim()) {
      newErrors.client = 'Client is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);

      try {
        // Prepare data for submission - ensure assignedTeam is just IDs
        const submissionData = {
          ...formData,
          assignedTeam: formData.assignedTeam.map(item =>
            typeof item === 'object' ? (item._id || item.value) : item
          )
        };

        // Check if editing: URL id or projectData with _id
        const isEditing = !!id || (projectData && projectData._id);

        if (isEditing) {
          // Update existing project - use id from URL or from projectData
          const projectId = id || projectData?._id;
          if (!projectId) {
            throw new Error('Project ID is required for editing');
          }

          // If onSubmit is provided (dialog mode), call it and let the parent handle the update
          // This prevents double-submission in components that handle state transitions (like PM_new_projects)
          if (onSubmit) {
            await onSubmit(submissionData);
          } else {
            // URL-based edit mode or internal use: save here
            await projectService.updateProject(projectId, submissionData);
            if (id) {
              navigate('/pm-projects');
            }
          }
        } else {
          // Create new project
          await onSubmit(submissionData);
        }
        handleClose();
      } catch (error) {
        console.error('Error saving project:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      client: '',
      priority: 'normal',
      dueDate: '',
      assignedTeam: [],
      status: 'planning',
      attachments: [],
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const renderFormContent = () => (
    <>
      {/* Project Name - Required */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          Project Name <span className="text-red-500 ml-1">*</span>
        </label>
        <Input
          type="text"
          placeholder="Enter project name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`h-12 rounded-xl border-2 transition-all duration-200 ${errors.name
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-200 focus:border-primary focus:ring-primary/20'
            }`}
        />
        <AnimatePresence>
          {errors.name && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-500 text-sm flex items-center"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.name}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Project Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <label className="text-sm font-semibold text-gray-700">Project Description</label>
        <Textarea
          placeholder="Describe the project goals, scope, and requirements..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="min-h-[100px] rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200"
        />
      </motion.div>

      {/* Client Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          Client <span className="text-red-500 ml-1">*</span>
        </label>
        <Combobox
          options={clients}
          value={formData.client}
          onChange={(value) => handleInputChange('client', value)}
          placeholder="Select a client"
          searchable={true}
          className="h-12 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200"
        />
        <AnimatePresence>
          {errors.client && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-500 text-sm flex items-center"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.client}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Project Category */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-2"
      >
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          Project Category
        </label>
        <Combobox
          options={categories}
          value={formData.category}
          onChange={(value) => handleInputChange('category', value)}
          placeholder="Select project category"
          searchable={true}
          className="h-12 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200"
        />
      </motion.div>

      {/* Priority and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <label className="text-sm font-semibold text-gray-700 flex items-center">
            Priority <span className="text-red-500 ml-1">*</span>
          </label>
          <Combobox
            options={priorities}
            value={formData.priority}
            onChange={(value) => handleInputChange('priority', value)}
            placeholder="Select priority"
            className="h-12 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <label className="text-sm font-semibold text-gray-700">Status</label>
          <Combobox
            options={statuses}
            value={formData.status}
            onChange={(value) => handleInputChange('status', value)}
            placeholder="Select status"
            className="h-12 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200"
          />
        </motion.div>
      </div>

      {/* Due Date */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-2"
      >
        <label className="text-sm font-semibold text-gray-700">Due Date</label>
        <DatePicker
          value={formData.dueDate}
          onChange={(date) => handleInputChange('dueDate', date)}
          placeholder="Select due date"
          className="h-12 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200"
        />
        <AnimatePresence>
          {errors.dueDate && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-500 text-sm flex items-center"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.dueDate}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Team Assignment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="space-y-2"
      >
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Assign Team Members
        </label>
        <MultiSelect
          options={teamMembers}
          value={formData.assignedTeam}
          onChange={(value) => handleInputChange('assignedTeam', value)}
          placeholder="Select team members"
          className="min-h-[48px] rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200"
        />
        <AnimatePresence>
          {errors.assignedTeam && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-500 text-sm flex items-center"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.assignedTeam}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Attachments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="space-y-2"
      >
        <label className="text-sm font-semibold text-gray-700">Attachments</label>
        <CloudinaryUpload
          onUploadSuccess={(uploadData) => {
            const newAttachments = Array.isArray(uploadData) ? uploadData : [uploadData];
            setFormData(prev => ({
              ...prev,
              attachments: [...prev.attachments, ...newAttachments.map(data => ({
                id: data.public_id,
                name: data.original_filename,
                size: data.bytes,
                type: data.format,
                url: data.secure_url,
                public_id: data.public_id
              }))]
            }));
          }}
          onUploadError={(error) => {
            console.error('Upload error:', error);
          }}
          folder="appzeto/projects/attachments"
          maxSize={10 * 1024 * 1024} // 10MB
          allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip', 'application/x-rar-compressed']}
          accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf,.doc,.docx,.txt,.zip,.rar"
          placeholder="Click to upload files or drag and drop"
          showPreview={true}
          multiple={true}
        />
        {formData.attachments.length > 0 && (
          <div className="space-y-2">
            {formData.attachments.map((att, index) => (
              <div key={att.id || `attachment-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-1 bg-primary/10 rounded">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{att.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );

  // Show loading state for edit mode (only for page mode, not dialog)
  if (isEditMode && !isDialogMode && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <PM_navbar />
        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading project data...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Page layout for edit mode (only when id is in URL, not dialog mode)
  if (isEditMode && !isDialogMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 md:bg-gray-50">
        <PM_navbar />

        <main className="pt-16 pb-24 md:pt-20 md:pb-8">
          <div className="px-4 md:max-w-4xl md:mx-auto md:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate(`/project/${id}`)}
                className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Project</span>
              </button>

              <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 text-white">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Edit Project</h1>
                <p className="text-primary-foreground/80">
                  Update the project details below. Fields marked with * are required.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {renderFormContent()}

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/project/${id}`)}
                    className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Project'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Dialog layout (for both create and edit when isOpen is provided)
  // Only render dialog if isOpen is explicitly provided (not undefined)
  if (isOpen === undefined) {
    return null; // Don't render anything if isOpen is not provided
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0" onClose={handleClose}>
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold">
              {projectData ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80">
              {projectData
                ? 'Update the project details below. Fields marked with * are required.'
                : 'Fill in the project details below. Fields marked with * are required.'
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {renderFormContent()}

          {/* Footer Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col sm:flex-row gap-3 pt-4"
          >
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto h-12 rounded-xl border-2 hover:bg-gray-50 transition-all duration-200"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {formData.status === 'untouched' && onAcknowledge && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    const projectId = id || projectData?._id;
                    await onAcknowledge(projectId);
                    handleClose();
                  } catch (error) {
                    console.error('Error acknowledging project:', error);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-12 border-teal-500 text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-200"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Acknowledge
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-12 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{projectData ? 'Updating...' : 'Creating...'}</span>
                </div>
              ) : (
                projectData ? 'Update Project' : 'Create Project'
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PM_project_form;