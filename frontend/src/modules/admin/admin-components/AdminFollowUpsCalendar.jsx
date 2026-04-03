import React, { useState, useMemo } from 'react';
import { 
  FiCalendar, 
  FiClock, 
  FiCheckCircle, 
  FiChevronLeft, 
  FiChevronRight, 
  FiUser, 
  FiPhone,
  FiX
} from 'react-icons/fi';
import { Button } from '../../../components/ui/button';

const AdminFollowUpsCalendar = ({ leads }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // Extract all follow-ups from leads
  const allFollowUps = useMemo(() => {
    const followUps = [];
    leads.forEach(lead => {
      if (lead.followUps && lead.followUps.length > 0) {
        lead.followUps.forEach(f => {
          followUps.push({
            ...f,
            leadName: lead.name || lead.phone,
            leadPhone: lead.phone,
            leadId: lead._id,
            priority: lead.priority || 'medium'
          });
        });
      }
    });
    return followUps;
  }, [leads]);

  // Calendar Logic
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const calendarDays = [];
    // Padding for previous month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      calendarDays.push(new Date(year, month, d));
    }
    return calendarDays;
  }, [currentDate]);

  const getFollowUpsForDate = (date) => {
    if (!date) return [];
    return allFollowUps.filter(f => {
      const fDate = new Date(f.scheduledDate);
      return fDate.getDate() === date.getDate() &&
             fDate.getMonth() === date.getMonth() &&
             fDate.getFullYear() === date.getFullYear();
    });
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-orange-500',
    low: 'bg-teal-500'
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <FiCalendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black">Lead Follow-up Calendar</h3>
            <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mt-1">
              Monthly Scheduling & Outreach Grid
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white/10 p-1.5 rounded-2xl">
          <button onClick={prevMonth} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><FiChevronLeft /></button>
          <span className="font-black min-w-[140px] text-center">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><FiChevronRight /></button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((date, i) => {
            const followUps = getFollowUpsForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={i} 
                onClick={() => date && setSelectedDay(date)}
                className={`min-h-[100px] p-2 rounded-2xl border transition-all duration-200 cursor-pointer group ${
                  !date ? 'bg-gray-50/30 border-transparent pointer-events-none' : 
                  isToday ? 'bg-indigo-50/50 border-indigo-200' : 
                  'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5'
                }`}
              >
                {date && (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-black ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </span>
                      {followUps.length > 0 && (
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md">
                          {followUps.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {followUps.slice(0, 2).map((f, fi) => (
                        <div key={fi} className="flex items-center gap-1.5 overflow-hidden">
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityColors[f.priority]}`}></div>
                          <span className="text-[10px] font-bold text-gray-700 truncate">{f.leadName}</span>
                        </div>
                      ))}
                      {followUps.length > 2 && (
                        <div className="text-[9px] font-black text-gray-400 text-center mt-1">
                          +{followUps.length - 2} More
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-indigo-600 flex justify-between items-center text-white">
              <div>
                <h4 className="text-xl font-black">{selectedDay.toLocaleDateString('default', { day: 'numeric', month: 'long' })}</h4>
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mt-0.5">Daily Schedule Detail</p>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                aria-label="Close modal"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
              {getFollowUpsForDate(selectedDay).length > 0 ? (
                getFollowUpsForDate(selectedDay).map((f, fi) => (
                  <div key={fi} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 group hover:border-indigo-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${priorityColors[f.priority]}`}></div>
                        <div>
                          <h5 className="font-black text-gray-900">{f.leadName}</h5>
                          <p className="text-xs font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                            <FiClock className="w-3 h-3" /> {new Date(f.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        f.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {f.status || 'pending'}
                      </span>
                    </div>
                    {f.notes && <p className="text-sm font-medium text-gray-600 bg-white p-3 rounded-xl border border-gray-50">{f.notes}</p>}
                    <div className="flex gap-2">
                       <a href={`tel:${f.leadPhone}`} className="flex-1">
                         <Button variant="outline" size="sm" className="w-full font-bold h-10 border-gray-200 rounded-xl">
                           <FiPhone className="mr-2" /> Call
                         </Button>
                       </a>
                       <Button variant="outline" size="sm" className="flex-1 font-bold h-10 border-gray-200 rounded-xl">
                         <FiUser className="mr-2" /> Profile
                       </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <FiCalendar className="mx-auto w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold">No follow-ups scheduled for this day</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-50 bg-gray-50/50">
               <Button onClick={() => setSelectedDay(null)} className="w-full bg-indigo-600 hover:bg-indigo-700 font-black h-12 rounded-2xl shadow-lg shadow-indigo-600/10">
                 Done
               </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFollowUpsCalendar;
