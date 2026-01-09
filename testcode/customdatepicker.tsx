import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
}

export function CustomDatePicker({ selectedDate, onDateChange }: CustomDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateChange(clickedDate);
  };

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const isSelected = isSelectedDate(day);
      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`h-10 flex items-center justify-center rounded-full transition-all hover:bg-teal-50 ${
            isSelected 
              ? 'bg-teal-500 text-white hover:bg-teal-600' 
              : 'text-gray-700 hover:text-gray-900'
          }`}
          style={{ fontSize: '0.875rem', fontWeight: isSelected ? 600 : 400 }}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div className="p-6 min-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        
        <div className="text-center">
          <div className="text-gray-900" style={{ fontSize: '1rem', fontWeight: 600 }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
        </div>
        
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
          <div
            key={index}
            className="h-10 flex items-center justify-center text-gray-500"
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {renderCalendar()}
      </div>
    </div>
  );
}
