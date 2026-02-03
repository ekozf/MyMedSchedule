import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react-native';

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
    case 'cycle':
      return <CyclePicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'every_x_hours':
      return <EveryXHoursPicker config={scheduleConfig} onChange={onChange} error={error} />;
    case 'prn':
      return <PrnPicker config={scheduleConfig} onChange={onChange} error={error} />;
    default:
      return null;
  }
}

function OnceDailyPicker({ config, onChange, error }: any) {
  const [time, setTime] = useState(config?.time || '');
  
  const handleTimeChange = (text: string) => {
    setTime(text);
    onChange({ time: text });
  };
  
  return (
    <View className="gap-4">
      <Input
        label="Schedule Time"
        value={time}
        onChangeText={handleTimeChange}
        placeholder="HH:mm (e.g., 09:00)"
        error={error}
      />
      <Text className="text-sm text-muted-foreground">
        Use 24-hour format (HH:mm)
      </Text>
    </View>
  );
}

function MultipleDailyPicker({ config, onChange, error }: any) {
  const [times, setTimes] = useState(config?.times || [{ time: '' }]);
  
  const addTime = () => {
    const newTimes = [...times, { time: '' }];
    setTimes(newTimes);
    onChange({ times: newTimes });
  };
  
  const removeTime = (index: number) => {
    const newTimes = times.filter((_: any, i: number) => i !== index);
    setTimes(newTimes);
    onChange({ times: newTimes });
  };
  
  const updateTime = (index: number, time: string) => {
    const newTimes = [...times];
    newTimes[index] = { ...newTimes[index], time };
    setTimes(newTimes);
    onChange({ times: newTimes });
  };
  
  return (
    <View className="gap-4">
      <Text className="text-base font-medium text-foreground">Schedule Times</Text>
      {times.map((timeItem: any, index: number) => (
        <View key={index} className="flex-row gap-2 items-center">
          <Input
            value={timeItem.time}
            onChangeText={(text) => updateTime(index, text)}
            placeholder="HH:mm"
            className="flex-1"
          />
          {times.length > 1 && (
            <Button variant="ghost" onPress={() => removeTime(index)}>
              <Trash2 size={20} className="text-destructive" />
            </Button>
          )}
        </View>
      ))}
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
  const [time, setTime] = useState(config?.time || '');
  const [startDate] = useState(config?.startDate ? new Date(config.startDate) : new Date());
  
  const handleChange = (field: string, value: any) => {
    const updated: any = {
      startDate: startDate.toISOString(),
      ...config,
      [field]: value,
    };
    
    // Only add intervalDays if it has a value
    if (intervalDays) {
      updated.intervalDays = parseInt(intervalDays);
    }
    
    // Only add time if it has a value
    if (time) {
      updated.time = time;
    }
    
    onChange(updated);
  };
  
  return (
    <View className="gap-4">
      <Input
        label="Repeat every X days"
        value={intervalDays}
        onChangeText={(text) => {
          setIntervalDays(text);
          if (text) {
            handleChange('intervalDays', parseInt(text));
          }
        }}
        keyboardType="number-pad"
        placeholder="e.g., 1"
      />
      <Input
        label="Time"
        value={time}
        onChangeText={(text) => {
          setTime(text);
          handleChange('time', text);
        }}
        placeholder="HH:mm"
      />
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function SpecificWeekdaysPicker({ config, onChange, error }: any) {
  const [selectedDays, setSelectedDays] = useState<number[]>(config?.weekdays || []);
  const [time, setTime] = useState(config?.time || '');
  
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
    onChange({ weekdays: newDays, time });
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
      <Input
        label="Time"
        value={time}
        onChangeText={(text) => {
          setTime(text);
          onChange({ weekdays: selectedDays, time: text });
        }}
        placeholder="HH:mm"
      />
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function CyclePicker({ config, onChange, error }: any) {
  const [daysOn, setDaysOn] = useState(config?.daysOn?.toString() || '');
  const [daysOff, setDaysOff] = useState(config?.daysOff?.toString() || '');
  const [time, setTime] = useState(config?.time || '');
  const [startDate] = useState(config?.cycleStartDate ? new Date(config.cycleStartDate) : new Date());
  
  const handleChange = () => {
    // Build the config object with only the values that are present
    const newConfig: any = {
      cycleStartDate: startDate.toISOString(),
    };
    
    // Only add daysOn if it has a valid value
    if (daysOn) {
      const daysOnNum = parseInt(daysOn);
      if (!isNaN(daysOnNum) && daysOnNum >= 1) {
        newConfig.daysOn = daysOnNum;
      }
    }
    
    // Only add daysOff if it has a valid value
    if (daysOff) {
      const daysOffNum = parseInt(daysOff);
      if (!isNaN(daysOffNum) && daysOffNum >= 0) {
        newConfig.daysOff = daysOffNum;
      }
    }
    
    // Only add time if it has a value
    if (time) {
      newConfig.time = time;
    }
    
    onChange(newConfig);
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
      <Input
        label="Time"
        value={time}
        onChangeText={(text) => {
          setTime(text);
          handleChange();
        }}
        placeholder="HH:mm"
      />
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function EveryXHoursPicker({ config, onChange, error }: any) {
  const [intervalHours, setIntervalHours] = useState(config?.intervalHours?.toString() || '');
  const [firstDoseTime, setFirstDoseTime] = useState(config?.firstDoseTime || '');
  
  const handleChange = () => {
    const newConfig: any = {};
    
    // Only add intervalHours if it has a value
    if (intervalHours) {
      const hours = parseInt(intervalHours);
      if (!isNaN(hours)) {
        newConfig.intervalHours = hours;
      }
    }
    
    // Only add firstDoseTime if it has a value
    if (firstDoseTime) {
      newConfig.firstDoseTime = firstDoseTime;
    }
    
    onChange(newConfig);
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
      <Input
        label="First dose time"
        value={firstDoseTime}
        onChangeText={(text) => {
          setFirstDoseTime(text);
          handleChange();
        }}
        placeholder="HH:mm (e.g., 09:00)"
      />
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
