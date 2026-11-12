package expo.modules.exactalarm

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android 12+ "Alarms & reminders" special access. expo-notifications already uses exact alarms
 * when this is granted; this module only reports the state and opens the settings page.
 */
class ExactAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

    Function("canScheduleExactAlarms") {
      canScheduleExactAlarms()
    }

    Function("openExactAlarmSettings") {
      openExactAlarmSettings()
    }
  }

  private fun canScheduleExactAlarms(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return true
    }
    val context = appContext.reactContext ?: return true
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      ?: return true
    return alarmManager.canScheduleExactAlarms()
  }

  private fun openExactAlarmSettings() {
    val context: Context = appContext.currentActivity ?: appContext.reactContext ?: return
    val packageUri = Uri.parse("package:${context.packageName}")
    val action = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
    } else {
      Settings.ACTION_APPLICATION_DETAILS_SETTINGS
    }
    try {
      context.startActivity(
        Intent(action, packageUri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    } catch (e: Exception) {
      // Some OEM builds lack the page: fall back to the app's details page.
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
  }
}
