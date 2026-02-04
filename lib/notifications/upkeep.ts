import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { ensureNext3DoseNotificationsForAllActiveMedications } from '@/lib/notifications/scheduler';

const NEXT3_UPKEEP_TASK = 'notifications-next3-upkeep';

// Must be defined in module scope (Expo requirement).
TaskManager.defineTask(NEXT3_UPKEEP_TASK, async () => {
  try {
    await ensureNext3DoseNotificationsForAllActiveMedications();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error('Next-3 upkeep task failed:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerNext3UpkeepTask(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(NEXT3_UPKEEP_TASK);
  if (isRegistered) return;

  await BackgroundTask.registerTaskAsync(NEXT3_UPKEEP_TASK, {
    minimumInterval: 30, // 30 minutes (OS-controlled, best effort)
  });
}

export async function unregisterNext3UpkeepTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(NEXT3_UPKEEP_TASK);
  if (!isRegistered) return;
  await BackgroundTask.unregisterTaskAsync(NEXT3_UPKEEP_TASK);
}
