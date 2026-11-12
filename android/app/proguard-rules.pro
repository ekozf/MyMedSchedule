# Project ProGuard / R8 rules (release builds run R8 with minify + shrinkResources).
# Most libraries ship consumer rules (expo-modules-core, reanimated, worklets, react-native core,
# react-native-svg, expo-background-task). The rules below cover reflection / persisted class
# names that consumer rules miss. Prefer keeping too much over a release-only crash.

# --- React Native / fbjni -------------------------------------------------------------------
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * { @com.facebook.jni.annotations.DoNotStrip *; }

# --- Reanimated / worklets ------------------------------------------------------------------
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }

# --- Gesture handler / screens / svg / safe-area (Fabric view managers via codegen) ---------
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# --- expo-sqlite (SQLCipher): JNI calls back into these classes from C++ ----------------------
-keep class expo.modules.sqlite.** { *; }

# --- expo-notifications: scheduled notifications/triggers are persisted with their class
# names, so renaming them between versions would break reminders after an app update. -------
-keep class expo.modules.notifications.** { *; }

# --- expo-task-manager / expo-background-task: task consumers are stored by class name -------
-keep class expo.modules.taskManager.** { *; }
-keep class expo.modules.backgroundtask.** { *; }
-keep class expo.modules.interfaces.taskManager.** { *; }

# --- Headless JS app loader: expo-modules-core reads its class name from the manifest meta-data
# "org.unimodules.core.AppLoader#react-native-headless" and loads it with Class.forName. Without
# this, R8 strips RNHeadlessAppLoader and background tasks (notification Take/Snooze/Skip while
# the app is closed, the reminder upkeep task) can't start JS ("Cannot initialize app loader"). ---
-keep class expo.modules.adapters.react.apploader.** { *; }
-keep class * implements expo.modules.apploader.HeadlessAppLoader { <init>(android.content.Context); *; }

# --- Other Expo modules that use reflection or are started by the system --------------------
-keep class expo.modules.securestore.** { *; }
-keep class expo.modules.localauthentication.** { *; }
-keep class expo.modules.splashscreen.** { *; }

# --- App sources (MainApplication / MainActivity and any local native modules) ----------------
-keep class be.emirkaan.mymedschedule.** { *; }

# --- Keep line numbers for readable Play Console stack traces (mapping.txt is in the AAB) -----
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Optional dependencies referenced by libraries but not shipped.
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
