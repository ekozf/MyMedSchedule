import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { ensureNext3DoseNotificationsForAllActiveMedications } from '@/lib/notifications/scheduler';

const NEXT3_UPKEEP_TASK = 'notifications-next3-upkeep';

// Must be defined in module scope (Expo requirement).
TaskManager.defineTask(NEXT3_UPKEEP_TASK, async () => {
  try {
    await ensureNext3DoseNotificationsForAllActiveMedications();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Next-3 upkeep task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerNext3UpkeepTask(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(NEXT3_UPKEEP_TASK);
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(NEXT3_UPKEEP_TASK, {
    minimumInterval: 60 * 30, // 30 minutes (OS-controlled, best effort)
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterNext3UpkeepTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(NEXT3_UPKEEP_TASK);
  if (!isRegistered) return;
  await BackgroundFetch.unregisterTaskAsync(NEXT3_UPKEEP_TASK);
}

