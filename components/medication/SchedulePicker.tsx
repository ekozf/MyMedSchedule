import { View, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfDay } from 'date-fns';

interface SchedulePickerProps {
  scheduleType: string;
  scheduleConfig: any;
  onChange: (config: any) => void;
  error?: string;
}

export function SchedulePicker({ scheduleType, scheduleConfig, onChange, error }: SchedulePickerProps) {
  switch (scheduleType) {
    case 'once_daily':
      return <OnceDailyPicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'multiple_daily':
      return <MultipleDailyPicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'every_x_days':
      return <EveryXDaysPicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'specific_weekdays':
      return <SpecificWeekdaysPicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'xth_weekday':
      return <XthWeekdayPicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'cycle':
      return <CyclePicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'every_x_hours':
      return <EveryXHoursPicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'tapering':
      return <TaperingPicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'prn':
      return <PrnPicker config={scheduleConfig} onChange={onChange} error={error} />;
    default:
      return null;
  }
}

function OnceDailyPicker({ config, onChange, error }: any) {
  // Parse existing time or default to current time
  const getInitialTime = () => {
    if (config?.time) {
      const [hours, minutes] = config.time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return new Date();
  };
  
  const [time, setTime] = useState(getInitialTime());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setTime(selectedTime);
      const timeStr = format(selectedTime, 'HH:mm');
      onChange({ time: timeStr });
    }
  };
  
  return (
    <View className="gap-4">
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Schedule Time</Text>
        <Button
          variant="outline"
          onPress={() => setShowTimePicker(true)}
          className="justify-start"
        >
          <Text>{format(time, 'HH:mm')}</Text>
        </Button>
      </View>
      
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
      
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function MultipleDailyPicker({ config, onChange, error }: any) {
  const getInitialTimes = () => {
    if (config?.times && config.times.length > 0) {
      return config.times.map((t: any) => {
        if (t.time) {
          const [hours, minutes] = t.time.split(':');
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          return { time: t.time, dateObj: date, dosageAmount: t.dosageAmount };
        }
        return { time: '', dateObj: new Date(), dosageAmount: t.dosageAmount };
      });
    }
    return [{ time: '', dateObj: new Date(), dosageAmount: undefined }];
  };
  
  const [times, setTimes] = useState(getInitialTimes());
  const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null);
  
  const addTime = () => {
    const newTimes = [...times, { time: '', dateObj: new Date(), dosageAmount: undefined }];
    setTimes(newTimes);
    onChange({ times: newTimes.map(t => ({ time: t.time, dosageAmount: t.dosageAmount })) });
  };
  
  const removeTime = (index: number) => {
    const newTimes = times.filter((_: any, i: number) => i !== index);
    setTimes(newTimes);
    onChange({ times: newTimes.map(t => ({ time: t.time, dosageAmount: t.dosageAmount })) });
  };
  
  const updateTime = (index: number, selectedTime: Date) => {
    const newTimes = [...times];
    const timeStr = format(selectedTime, 'HH:mm');
    newTimes[index] = { ...newTimes[index], time: timeStr, dateObj: selectedTime };
    setTimes(newTimes);
    onChange({ times: newTimes.map(t => ({ time: t.time, dosageAmount: t.dosageAmount })) });
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setActivePickerIndex(null);
    }
    
    if (selectedTime && activePickerIndex !== null) {
      updateTime(activePickerIndex, selectedTime);
    }
  };
  
  return (
    <View className="gap-4">
      <Text className="text-base font-medium text-foreground">Schedule Times</Text>
      {times.map((timeItem: any, index: number) => (
        <View key={index} className="flex-row gap-2 items-center">
          <Button
            variant="outline"
            onPress={() => setActivePickerIndex(index)}
            className="flex-1 justify-start"
          >
            <Text>{timeItem.time || 'Select time'}</Text>
          </Button>
          {times.length > 1 && (
            <Button variant="ghost" onPress={() => removeTime(index)}>
              <Trash2 size={20} className="text-destructive" />
            </Button>
          )}
        </View>
      ))}
      
      {activePickerIndex !== null && (
        <DateTimePicker
          value={times[activePickerIndex].dateObj}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
      
      <Button variant="outline" onPress={addTime} className="flex-row gap-2">
        <Plus size={20} className="text-foreground" />
        <Text>Add Time</Text>
      </Button>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function EveryXDaysPicker({ config, onChange, error }: any) {
  const [intervalDays, setIntervalDays] = useState(config?.intervalDays?.toString() || '');
  
  const getInitialTime = () => {
    if (config?.time) {
      const [hours, minutes] = config.time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return new Date();
  };
  
  const [time, setTime] = useState(getInitialTime());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [startDate, setStartDate] = useState(config?.startDate ? new Date(config.startDate) : startOfDay(new Date()));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  
  const handleChange = (updates: any) => {
    const timeStr = format(time, 'HH:mm');
    const updated: any = {
      startDate: startDate.toISOString(),
      time: timeStr,
      ...updates,
    };
    
    if (intervalDays) {
      updated.intervalDays = parseInt(intervalDays);
    }
    
    onChange(updated);
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setTime(selectedTime);
      handleChange({});
    }
  };
  
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    
    if (selectedDate) {
      setStartDate(startOfDay(selectedDate));
      handleChange({});
    }
  };
  
  return (
    <View className="gap-4">
      <Input
        label="Repeat every X days"
        value={intervalDays}
        onChangeText={(text) => {
          setIntervalDays(text);
          handleChange({});
        }}
        keyboardType="number-pad"
        placeholder="e.g., 1"
      />
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Start Date</Text>
        <Button
          variant="outline"
          onPress={() => setShowStartDatePicker(true)}
          className="justify-start"
        >
          <Text>{format(startDate, 'MMM d, yyyy')}</Text>
        </Button>
      </View>
      
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          minimumDate={startOfDay(new Date())}
          onChange={handleStartDateChange}
        />
      )}
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Time</Text>
        <Button
          variant="outline"
          onPress={() => setShowTimePicker(true)}
          className="justify-start"
        >
          <Text>{format(time, 'HH:mm')}</Text>
        </Button>
      </View>
      
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
      
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function SpecificWeekdaysPicker({ config, onChange, error }: any) {
  const [selectedDays, setSelectedDays] = useState<number[]>(config?.weekdays || []);
  
  const getInitialTime = () => {
    if (config?.time) {
      const [hours, minutes] = config.time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return new Date();
  };
  
  const [time, setTime] = useState(getInitialTime());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const days = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
  ];
  
  const toggleDay = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day].sort();
    setSelectedDays(newDays);
    const timeStr = format(time, 'HH:mm');
    onChange({ weekdays: newDays, time: timeStr });
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setTime(selectedTime);
      const timeStr = format(selectedTime, 'HH:mm');
      onChange({ weekdays: selectedDays, time: timeStr });
    }
  };
  
  return (
    <View className="gap-4">
      <Text className="text-base font-medium text-foreground">Select Days</Text>
      <View className="flex-row flex-wrap gap-2">
        {days.map((day) => (
          <Button
            key={day.value}
            variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
            onPress={() => toggleDay(day.value)}
            className="px-3 py-2"
          >
            <Text>{day.label}</Text>
          </Button>
        ))}
      </View>
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Time</Text>
        <Button
          variant="outline"
          onPress={() => setShowTimePicker(true)}
          className="justify-start"
        >
          <Text>{format(time, 'HH:mm')}</Text>
        </Button>
      </View>
      
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
      
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function XthWeekdayPicker({ config, onChange, error }: any) {
  const [weekday, setWeekday] = useState(config?.weekday?.toString() || '0');
  const [occurrence, setOccurrence] = useState(config?.occurrence?.toString() || '1');
  
  const getInitialTime = () => {
    if (config?.time) {
      const [hours, minutes] = config.time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return new Date();
  };
  
  const [time, setTime] = useState(getInitialTime());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const weekdayOptions = [
    { label: 'Sunday', value: '0' },
    { label: 'Monday', value: '1' },
    { label: 'Tuesday', value: '2' },
    { label: 'Wednesday', value: '3' },
    { label: 'Thursday', value: '4' },
    { label: 'Friday', value: '5' },
    { label: 'Saturday', value: '6' },
  ];
  
  const occurrenceOptions = [
    { label: '1st', value: '1' },
    { label: '2nd', value: '2' },
    { label: '3rd', value: '3' },
    { label: '4th', value: '4' },
    { label: 'Last', value: '5' },
  ];
  
  const handleChange = () => {
    const newConfig: any = {};
    
    if (weekday) {
      const weekdayNum = parseInt(weekday);
      if (!isNaN(weekdayNum)) {
        newConfig.weekday = weekdayNum;
      }
    }
    
    if (occurrence) {
      const occurrenceNum = parseInt(occurrence);
      if (!isNaN(occurrenceNum)) {
        newConfig.occurrence = occurrenceNum;
      }
    }
    
    const timeStr = format(time, 'HH:mm');
    newConfig.time = timeStr;
    
    onChange(newConfig);
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setTime(selectedTime);
      handleChange();
    }
  };
  
  return (
    <View className="gap-4">
      <Select
        label="Occurrence"
        options={occurrenceOptions}
        value={occurrence}
        onValueChange={(value) => {
          setOccurrence(value);
          handleChange();
        }}
        placeholder="Select occurrence"
      />
      <Select
        label="Weekday"
        options={weekdayOptions}
        value={weekday}
        onValueChange={(value) => {
          setWeekday(value);
          handleChange();
        }}
        placeholder="Select weekday"
      />
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Time</Text>
        <Button
          variant="outline"
          onPress={() => setShowTimePicker(true)}
          className="justify-start"
        >
          <Text>{format(time, 'HH:mm')}</Text>
        </Button>
      </View>
      
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
      
      <Text className="text-sm text-muted-foreground">
        Example: Every 3rd Tuesday of the month at 14:00
      </Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function CyclePicker({ config, onChange, error }: any) {
  const [daysOn, setDaysOn] = useState(config?.daysOn?.toString() || '');
  const [daysOff, setDaysOff] = useState(config?.daysOff?.toString() || '');
  
  const getInitialTime = () => {
    if (config?.time) {
      const [hours, minutes] = config.time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return new Date();
  };
  
  const [time, setTime] = useState(getInitialTime());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [startDate, setStartDate] = useState(config?.cycleStartDate ? new Date(config.cycleStartDate) : startOfDay(new Date()));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  
  const handleChange = () => {
    const timeStr = format(time, 'HH:mm');
    const newConfig: any = {
      cycleStartDate: startDate.toISOString(),
      time: timeStr,
    };
    
    if (daysOn) {
      const daysOnNum = parseInt(daysOn);
      if (!isNaN(daysOnNum) && daysOnNum >= 1) {
        newConfig.daysOn = daysOnNum;
      }
    }
    
    if (daysOff) {
      const daysOffNum = parseInt(daysOff);
      if (!isNaN(daysOffNum) && daysOffNum >= 0) {
        newConfig.daysOff = daysOffNum;
      }
    }
    
    onChange(newConfig);
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setTime(selectedTime);
      handleChange();
    }
  };
  
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    
    if (selectedDate) {
      setStartDate(startOfDay(selectedDate));
      handleChange();
    }
  };
  
  return (
    <View className="gap-4">
      <Input
        label="Days On"
        value={daysOn}
        onChangeText={(text) => {
          setDaysOn(text);
          handleChange();
        }}
        keyboardType="number-pad"
        placeholder="e.g., 21"
      />
      <Input
        label="Days Off"
        value={daysOff}
        onChangeText={(text) => {
          setDaysOff(text);
          handleChange();
        }}
        keyboardType="number-pad"
        placeholder="e.g., 7"
      />
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Cycle Start Date</Text>
        <Button
          variant="outline"
          onPress={() => setShowStartDatePicker(true)}
          className="justify-start"
        >
          <Text>{format(startDate, 'MMM d, yyyy')}</Text>
        </Button>
      </View>
      
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          minimumDate={startOfDay(new Date())}
          onChange={handleStartDateChange}
        />
      )}
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Time</Text>
        <Button
          variant="outline"
          onPress={() => setShowTimePicker(true)}
          className="justify-start"
        >
          <Text>{format(time, 'HH:mm')}</Text>
        </Button>
      </View>
      
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
      
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function EveryXHoursPicker({ config, onChange, error }: any) {
  const [intervalHours, setIntervalHours] = useState(config?.intervalHours?.toString() || '');
  
  const getInitialTime = () => {
    if (config?.firstDoseTime) {
      const [hours, minutes] = config.firstDoseTime.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return new Date();
  };
  
  const [firstDoseTime, setFirstDoseTime] = useState(getInitialTime());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const handleChange = () => {
    const newConfig: any = {};
    
    if (intervalHours) {
      const hours = parseInt(intervalHours);
      if (!isNaN(hours)) {
        newConfig.intervalHours = hours;
      }
    }
    
    const timeStr = format(firstDoseTime, 'HH:mm');
    newConfig.firstDoseTime = timeStr;
    
    onChange(newConfig);
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setFirstDoseTime(selectedTime);
      handleChange();
    }
  };
  
  return (
    <View className="gap-4">
      <Input
        label="Repeat every X hours"
        value={intervalHours}
        onChangeText={(text) => {
          setIntervalHours(text);
          handleChange();
        }}
        keyboardType="number-pad"
        placeholder="e.g., 8"
      />
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">First dose time</Text>
        <Button
          variant="outline"
          onPress={() => setShowTimePicker(true)}
          className="justify-start"
        >
          <Text>{format(firstDoseTime, 'HH:mm')}</Text>
        </Button>
      </View>
      
      {showTimePicker && (
        <DateTimePicker
          value={firstDoseTime}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
      
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function TaperingPicker({ config, onChange, error }: any) {
  const [startDose, setStartDose] = useState(config?.startDose?.toString() || '');
  const [decrementAmount, setDecrementAmount] = useState(config?.decrementAmount?.toString() || '');
  const [decrementIntervalDays, setDecrementIntervalDays] = useState(config?.decrementIntervalDays?.toString() || '');
  
  const getInitialTime = () => {
    if (config?.time) {
      const [hours, minutes] = config.time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return new Date();
  };
  
  const [time, setTime] = useState(getInitialTime());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [startDate, setStartDate] = useState(config?.startDate ? new Date(config.startDate) : startOfDay(new Date()));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  
  const handleChange = () => {
    const timeStr = format(time, 'HH:mm');
    const newConfig: any = {
      startDate: startDate.toISOString(),
      time: timeStr,
    };
    
    if (startDose) {
      const dose = parseFloat(startDose);
      if (!isNaN(dose) && dose > 0) {
        newConfig.startDose = dose;
      }
    }
    
    if (decrementAmount) {
      const amount = parseFloat(decrementAmount);
      if (!isNaN(amount) && amount > 0) {
        newConfig.decrementAmount = amount;
      }
    }
    
    if (decrementIntervalDays) {
      const interval = parseInt(decrementIntervalDays);
      if (!isNaN(interval) && interval >= 1) {
        newConfig.decrementIntervalDays = interval;
      }
    }
    
    onChange(newConfig);
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setTime(selectedTime);
      handleChange();
    }
  };
  
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    
    if (selectedDate) {
      setStartDate(startOfDay(selectedDate));
      handleChange();
    }
  };
  
  return (
    <View className="gap-4">
      <Input
        label="Starting Dose"
        value={startDose}
        onChangeText={(text) => {
          setStartDose(text);
          handleChange();
        }}
        keyboardType="decimal-pad"
        placeholder="e.g., 4"
      />
      <Input
        label="Decrease By"
        value={decrementAmount}
        onChangeText={(text) => {
          setDecrementAmount(text);
          handleChange();
        }}
        keyboardType="decimal-pad"
        placeholder="e.g., 1"
      />
      <Input
        label="Every X Days"
        value={decrementIntervalDays}
        onChangeText={(text) => {
          setDecrementIntervalDays(text);
          handleChange();
        }}
        keyboardType="number-pad"
        placeholder="e.g., 7"
      />
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Start Date</Text>
        <Button
          variant="outline"
          onPress={() => setShowStartDatePicker(true)}
          className="justify-start"
        >
          <Text>{format(startDate, 'MMM d, yyyy')}</Text>
        </Button>
      </View>
      
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          minimumDate={startOfDay(new Date())}
          onChange={handleStartDateChange}
        />
      )}
      
      <View>
        <Text className="text-sm font-medium text-foreground mb-2">Time</Text>
        <Button
          variant="outline"
          onPress={() => setShowTimePicker(true)}
          className="justify-start"
        >
          <Text>{format(time, 'HH:mm')}</Text>
        </Button>
      </View>
      
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}
      
      <Text className="text-sm text-muted-foreground">
        Example: Start at 4mg, decrease by 1mg every 7 days (4→3→2→1→0)
      </Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function PrnPicker({ config, onChange, error }: any) {
  const [lowInventoryAlert, setLowInventoryAlert] = useState(
    config?.lowInventoryAlert?.toString() || ''
  );
  
  return (
    <View className="gap-4">
      <Text className="text-base text-muted-foreground">
        As-needed medications have no scheduled doses. You can log when you take them.
      </Text>
      <Input
        label="Low inventory alert (optional)"
        value={lowInventoryAlert}
        onChangeText={(text) => {
          setLowInventoryAlert(text);
          onChange({ lowInventoryAlert: text ? parseInt(text) : undefined });
        }}
        keyboardType="number-pad"
        placeholder="e.g., 5"
      />
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}
