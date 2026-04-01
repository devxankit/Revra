import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FiArrowLeft,
  FiSave,
  FiEdit3,
  FiTrash2,
  FiPlus,
  FiClock,
  FiUser
} from 'react-icons/fi'
import SL_navbar from '../SL-components/SL_navbar'

const SL_notes = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // Mock client data
  const clientData = {
    1: {
      id: 1,
      name: 'Alice Brown',
      phone: '7654321098',
      business: 'Cloth shop ecommerce'
    },
    2: {
      id: 2,
      name: 'John Doe',
      phone: '9845637236',
      business: 'Restaurant chain'
    },
    3: {
      id: 3,
      name: 'Jane Smith',
      phone: '9876543210',
      business: 'Tech startup'
    }
  }

  const client = clientData[id] || clientData[1]
  
  // Mock notes data - in real app, fetch from API
  const [notes, setNotes] = useState([
    {
      id: 1,
      content: 'Client is interested in e-commerce platform. Prefers modern design with mobile-first approach.',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'meeting'
    },
    {
      id: 2,
      content: 'Follow up call scheduled for next week. Discuss pricing and timeline.',
      timestamp: '2024-01-14T15:45:00Z',
      type: 'call'
    },
    {
      id: 3,
      content: 'Sent initial proposal. Waiting for feedback on features and budget.',
      timestamp: '2024-01-13T09:20:00Z',
      type: 'email'
    }
  ])

  const [newNote, setNewNote] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNoteTypeColor = (type) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800'
      case 'call': return 'bg-green-100 text-green-800'
      case 'email': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const note = {
      id: Date.now(),
      content: newNote.trim(),
      timestamp: new Date().toISOString(),
      type: 'general'
    }
    
    setNotes(prev => [note, ...prev])
    setNewNote('')
    setIsLoading(false)
  }

  const handleEditNote = (note) => {
    setIsEditing(true)
    setEditingNoteId(note.id)
    setEditingContent(note.content)
  }

  const handleSaveEdit = async () => {
    if (!editingContent.trim()) return

    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setNotes(prev => prev.map(note => 
      note.id === editingNoteId 
        ? { ...note, content: editingContent.trim() }
        : note
    ))
    
    setIsEditing(false)
    setEditingNoteId(null)
    setEditingContent('')
    setIsLoading(false)
  }

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return

    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setNotes(prev => prev.filter(note => note.id !== noteId))
    setIsLoading(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingNoteId(null)
    setEditingContent('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SL_navbar />
      
      <main className="max-w-2xl mx-auto px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between mb-6"
          >
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-teal-50 rounded-full transition-colors duration-200"
            >
              <FiArrowLeft className="text-xl text-teal-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Client Notes</h1>
            <div className="w-8"></div>
          </motion.div>

          {/* Client Info Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 mb-6"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">{client.name[0]}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{client.name}</h2>
                <p className="text-sm text-gray-600">{client.phone}</p>
                <p className="text-xs text-gray-500">{client.business}</p>
              </div>
            </div>
          </motion.div>

          {/* Add Note Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Note</h3>
            <div className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a note about this client..."
                className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none"
                rows={4}
              />
              <button
                onClick={handleAddNote}
                disabled={isLoading || !newNote.trim()}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiPlus className="text-lg" />
                )}
                <span>{isLoading ? 'Adding...' : 'Add Note'}</span>
              </button>
            </div>
          </motion.div>

          {/* Notes List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-900">Previous Notes</h3>
            
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <FiEdit3 className="text-gray-400 text-4xl mx-auto mb-4" />
                <p className="text-gray-500">No notes yet. Add your first note above!</p>
              </div>
            ) : (
              notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200"
                >
                  {isEditing && editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 resize-none"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isLoading}
                          className="flex-1 bg-teal-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-teal-600 transition-colors duration-200 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-gray-900 leading-relaxed">{note.content}</p>
                        </div>
                        <div className="flex space-x-2 ml-3">
                          <button
                            onClick={() => handleEditNote(note)}
                            className="p-2 hover:bg-teal-50 rounded-lg transition-colors duration-200"
                          >
                            <FiEdit3 className="text-teal-600 text-sm" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            <FiTrash2 className="text-red-600 text-sm" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNoteTypeColor(note.type)}`}>
                            {note.type}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-500">
                          <FiClock className="text-xs" />
                          <span className="text-xs">{formatTimestamp(note.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

export default SL_notes
