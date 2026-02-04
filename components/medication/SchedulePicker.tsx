import { View, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';

interface SchedulePickerProps {
  scheduleType: string;
  scheduleConfig: any;
  onChange: (config: any) => void;
  error?: string;
}

interface MultipleDailyTimeItem {
  time: string;
  dateObj: Date;
  dosageAmount?: number;
}

export function SchedulePicker({
  scheduleType,
  scheduleConfig,
  onChange,
  error,
}: SchedulePickerProps) {
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
  const dateFnsLocale = getDateFnsLocale();
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
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.scheduleTime')}
        </Text>
        <Button variant="outline" onPress={() => setShowTimePicker(true)} className="justify-start">
          <Text>{format(time, 'p', { locale: dateFnsLocale })}</Text>
        </Button>
      </View>

      {showTimePicker && (
        <DateTimePicker value={time} mode="time" is24Hour={true} onChange={handleTimeChange} />
      )}

      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function MultipleDailyPicker({ config, onChange, error }: any) {
  const dateFnsLocale = getDateFnsLocale();
  const getInitialTimes = (): MultipleDailyTimeItem[] => {
    if (config?.times && config.times.length > 0) {
      return config.times.map((t: any): MultipleDailyTimeItem => {
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

  const [times, setTimes] = useState<MultipleDailyTimeItem[]>(() => getInitialTimes());
  const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null);

  const addTime = () => {
    const newTimes = [...times, { time: '', dateObj: new Date(), dosageAmount: undefined }];
    setTimes(newTimes);
    onChange({ times: newTimes.map((t) => ({ time: t.time, dosageAmount: t.dosageAmount })) });
  };

  const removeTime = (index: number) => {
    const newTimes = times.filter((_, i) => i !== index);
    setTimes(newTimes);
    onChange({ times: newTimes.map((t) => ({ time: t.time, dosageAmount: t.dosageAmount })) });
  };

  const updateTime = (index: number, selectedTime: Date) => {
    const newTimes = [...times];
    const timeStr = format(selectedTime, 'HH:mm');
    newTimes[index] = { ...newTimes[index], time: timeStr, dateObj: selectedTime };
    setTimes(newTimes);
    onChange({ times: newTimes.map((t) => ({ time: t.time, dosageAmount: t.dosageAmount })) });
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
      <Text className="text-base font-medium text-foreground">
        {i18n.t('schedulePicker.scheduleTimes')}
      </Text>
      {times.map((timeItem, index: number) => (
        <View key={index} className="flex-row items-center gap-2">
          <Button
            variant="outline"
            onPress={() => setActivePickerIndex(index)}
            className="flex-1 justify-start">
            <Text>
              {timeItem.time
                ? format(timeItem.dateObj, 'p', { locale: dateFnsLocale })
                : i18n.t('schedulePicker.selectTime')}
            </Text>
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
        <Text>{i18n.t('schedulePicker.addTime')}</Text>
      </Button>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function EveryXDaysPicker({ config, onChange, error }: any) {
  const dateFnsLocale = getDateFnsLocale();
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

  const [startDate, setStartDate] = useState(
    config?.startDate ? new Date(config.startDate) : startOfDay(new Date())
  );
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
        label={i18n.t('schedulePicker.repeatEveryXDays')}
        value={intervalDays}
        onChangeText={(text) => {
          setIntervalDays(text);
          handleChange({});
        }}
        keyboardType="number-pad"
        placeholder={i18n.t('schedulePicker.repeatEveryXDaysPlaceholder')}
      />

      <View>
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.startDate')}
        </Text>
        <Button
          variant="outline"
          onPress={() => setShowStartDatePicker(true)}
          className="justify-start">
          <Text>{format(startDate, 'PP', { locale: dateFnsLocale })}</Text>
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
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.time')}
        </Text>
        <Button variant="outline" onPress={() => setShowTimePicker(true)} className="justify-start">
          <Text>{format(time, 'p', { locale: dateFnsLocale })}</Text>
        </Button>
      </View>

      {showTimePicker && (
        <DateTimePicker value={time} mode="time" is24Hour={true} onChange={handleTimeChange} />
      )}

      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function SpecificWeekdaysPicker({ config, onChange, error }: any) {
  const dateFnsLocale = getDateFnsLocale();
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
    { label: i18n.t('medications.weekdaysShort.sun'), value: 0 },
    { label: i18n.t('medications.weekdaysShort.mon'), value: 1 },
    { label: i18n.t('medications.weekdaysShort.tue'), value: 2 },
    { label: i18n.t('medications.weekdaysShort.wed'), value: 3 },
    { label: i18n.t('medications.weekdaysShort.thu'), value: 4 },
    { label: i18n.t('medications.weekdaysShort.fri'), value: 5 },
    { label: i18n.t('medications.weekdaysShort.sat'), value: 6 },
  ];

  const toggleDay = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
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
      <Text className="text-base font-medium text-foreground">
        {i18n.t('schedulePicker.selectDays')}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {days.map((day) => (
          <Button
            key={day.value}
            variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
            onPress={() => toggleDay(day.value)}
            className="px-3 py-2">
            <Text>{day.label}</Text>
          </Button>
        ))}
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.time')}
        </Text>
        <Button variant="outline" onPress={() => setShowTimePicker(true)} className="justify-start">
          <Text>{format(time, 'p', { locale: dateFnsLocale })}</Text>
        </Button>
      </View>

      {showTimePicker && (
        <DateTimePicker value={time} mode="time" is24Hour={true} onChange={handleTimeChange} />
      )}

      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function XthWeekdayPicker({ config, onChange, error }: any) {
  const dateFnsLocale = getDateFnsLocale();
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
    { label: i18n.t('medications.weekdays.sunday'), value: '0' },
    { label: i18n.t('medications.weekdays.monday'), value: '1' },
    { label: i18n.t('medications.weekdays.tuesday'), value: '2' },
    { label: i18n.t('medications.weekdays.wednesday'), value: '3' },
    { label: i18n.t('medications.weekdays.thursday'), value: '4' },
    { label: i18n.t('medications.weekdays.friday'), value: '5' },
    { label: i18n.t('medications.weekdays.saturday'), value: '6' },
  ];

  const occurrenceOptions = [
    { label: i18n.t('medications.occurrences.first'), value: '1' },
    { label: i18n.t('medications.occurrences.second'), value: '2' },
    { label: i18n.t('medications.occurrences.third'), value: '3' },
    { label: i18n.t('medications.occurrences.fourth'), value: '4' },
    { label: i18n.t('medications.occurrences.last'), value: '5' },
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
        label={i18n.t('schedulePicker.occurrence')}
        options={occurrenceOptions}
        value={occurrence}
        onValueChange={(value) => {
          setOccurrence(value);
          handleChange();
        }}
        placeholder={i18n.t('schedulePicker.selectOccurrence')}
      />
      <Select
        label={i18n.t('schedulePicker.weekday')}
        options={weekdayOptions}
        value={weekday}
        onValueChange={(value) => {
          setWeekday(value);
          handleChange();
        }}
        placeholder={i18n.t('schedulePicker.selectWeekday')}
      />

      <View>
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.time')}
        </Text>
        <Button variant="outline" onPress={() => setShowTimePicker(true)} className="justify-start">
          <Text>{format(time, 'p', { locale: dateFnsLocale })}</Text>
        </Button>
      </View>

      {showTimePicker && (
        <DateTimePicker value={time} mode="time" is24Hour={true} onChange={handleTimeChange} />
      )}

      <Text className="text-sm text-muted-foreground">
        {i18n.t('schedulePicker.xthWeekdayExample')}
      </Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function CyclePicker({ config, onChange, error }: any) {
  const dateFnsLocale = getDateFnsLocale();
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

  const [startDate, setStartDate] = useState(
    config?.cycleStartDate ? new Date(config.cycleStartDate) : startOfDay(new Date())
  );
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
        label={i18n.t('schedulePicker.daysOn')}
        value={daysOn}
        onChangeText={(text) => {
          setDaysOn(text);
          handleChange();
        }}
        keyboardType="number-pad"
        placeholder={i18n.t('schedulePicker.daysOnPlaceholder')}
      />
      <Input
        label={i18n.t('schedulePicker.daysOff')}
        value={daysOff}
        onChangeText={(text) => {
          setDaysOff(text);
          handleChange();
        }}
        keyboardType="number-pad"
        placeholder={i18n.t('schedulePicker.daysOffPlaceholder')}
      />

      <View>
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.cycleStartDate')}
        </Text>
        <Button
          variant="outline"
          onPress={() => setShowStartDatePicker(true)}
          className="justify-start">
          <Text>{format(startDate, 'PP', { locale: dateFnsLocale })}</Text>
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
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.time')}
        </Text>
        <Button variant="outline" onPress={() => setShowTimePicker(true)} className="justify-start">
          <Text>{format(time, 'p', { locale: dateFnsLocale })}</Text>
        </Button>
      </View>

      {showTimePicker && (
        <DateTimePicker value={time} mode="time" is24Hour={true} onChange={handleTimeChange} />
      )}

      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function EveryXHoursPicker({ config, onChange, error }: any) {
  const dateFnsLocale = getDateFnsLocale();
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
        label={i18n.t('schedulePicker.repeatEveryXHours')}
        value={intervalHours}
        onChangeText={(text) => {
          setIntervalHours(text);
          handleChange();
        }}
        keyboardType="number-pad"
        placeholder={i18n.t('schedulePicker.repeatEveryXHoursPlaceholder')}
      />

      <View>
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.firstDoseTime')}
        </Text>
        <Button variant="outline" onPress={() => setShowTimePicker(true)} className="justify-start">
          <Text>{format(firstDoseTime, 'p', { locale: dateFnsLocale })}</Text>
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
  const dateFnsLocale = getDateFnsLocale();
  const [startDose, setStartDose] = useState(config?.startDose?.toString() || '');
  const [decrementAmount, setDecrementAmount] = useState(config?.decrementAmount?.toString() || '');
  const [decrementIntervalDays, setDecrementIntervalDays] = useState(
    config?.decrementIntervalDays?.toString() || ''
  );

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

  const [startDate, setStartDate] = useState(
    config?.startDate ? new Date(config.startDate) : startOfDay(new Date())
  );
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
        label={i18n.t('schedulePicker.startingDose')}
        value={startDose}
        onChangeText={(text) => {
          setStartDose(text);
          handleChange();
        }}
        keyboardType="decimal-pad"
        placeholder={i18n.t('schedulePicker.startingDosePlaceholder')}
      />
      <Input
        label={i18n.t('schedulePicker.decreaseBy')}
        value={decrementAmount}
        onChangeText={(text) => {
          setDecrementAmount(text);
          handleChange();
        }}
        keyboardType="decimal-pad"
        placeholder={i18n.t('schedulePicker.decreaseByPlaceholder')}
      />
      <Input
        label={i18n.t('schedulePicker.everyXDays')}
        value={decrementIntervalDays}
        onChangeText={(text) => {
          setDecrementIntervalDays(text);
          handleChange();
        }}
        keyboardType="number-pad"
        placeholder={i18n.t('schedulePicker.everyXDaysPlaceholder')}
      />

      <View>
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.startDate')}
        </Text>
        <Button
          variant="outline"
          onPress={() => setShowStartDatePicker(true)}
          className="justify-start">
          <Text>{format(startDate, 'PP', { locale: dateFnsLocale })}</Text>
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
        <Text className="mb-2 text-sm font-medium text-foreground">
          {i18n.t('schedulePicker.time')}
        </Text>
        <Button variant="outline" onPress={() => setShowTimePicker(true)} className="justify-start">
          <Text>{format(time, 'p', { locale: dateFnsLocale })}</Text>
        </Button>
      </View>

      {showTimePicker && (
        <DateTimePicker value={time} mode="time" is24Hour={true} onChange={handleTimeChange} />
      )}

      <Text className="text-sm text-muted-foreground">
        {i18n.t('schedulePicker.taperingExample')}
      </Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}

function PrnPicker({ config, onChange, error }: any) {
  return (
    <View className="gap-4">
      <Text className="text-base text-muted-foreground">
        {i18n.t('schedulePicker.prnDescription')}
      </Text>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}
