import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { startOfDay, addDays, format, isSameDay, isToday } from 'date-fns';
import { useState, useRef, useEffect } from 'react';

export interface DayPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DayPicker({ selectedDate, onDateChange }: DayPickerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [days, setDays] = useState<Date[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Generate days: 30 days before and 30 days after today
    const today = startOfDay(new Date());
    const daysList: Date[] = [];
    
    for (let i = -30; i <= 30; i++) {
      daysList.push(addDays(today, i));
    }
    
    setDays(daysList);
    
    // Scroll to selected date (or today) after a short delay
    setTimeout(() => {
      const selectedIndex = daysList.findIndex(day => isSameDay(day, selectedDate));
      const scrollToIndex = selectedIndex >= 0 ? selectedIndex : 30; // Default to today (index 30)
      // Each day is 80 pixels wide (64px width + 8px margin on each side)
      scrollViewRef.current?.scrollTo({ x: scrollToIndex * 72, animated: false });
      setIsInitialized(true);
    }, 100);
  }, []);
  
  // Update scroll position when selectedDate changes externally
  useEffect(() => {
    if (isInitialized && days.length > 0) {
      const selectedIndex = days.findIndex(day => isSameDay(day, selectedDate));
      if (selectedIndex >= 0) {
        scrollViewRef.current?.scrollTo({ x: selectedIndex * 72, animated: true });
      }
    }
  }, [selectedDate, days, isInitialized]);
  
  return (
    <View className="border-b border-border">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="py-4"
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {days.map((day, index) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          
          return (
            <Pressable
              key={index}
              onPress={() => onDateChange(day)}
              className={`
                w-16 h-20 rounded-xl items-center justify-center mx-1
                ${isSelected ? 'bg-primary' : 'bg-card'}
                ${isTodayDate && !isSelected ? 'border-2 border-primary' : ''}
              `}
            >
              <Text
                className={`
                  text-xs font-medium mb-1
                  ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}
                `}
              >
                {format(day, 'EEE')}
              </Text>
              <Text
                className={`
                  text-2xl font-bold
                  ${isSelected ? 'text-primary-foreground' : 'text-foreground'}
                `}
              >
                {format(day, 'd')}
              </Text>
              <Text
                className={`
                  text-xs
                  ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}
                `}
              >
                {format(day, 'MMM')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
