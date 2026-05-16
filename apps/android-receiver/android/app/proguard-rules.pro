# Keep Android background workers addressable after R8.
-keep class com.swimpay.receiver.work.** { *; }

# Credential Manager and Google ID token classes are reflection-heavy through
# Play Services. Keep their public surface so account recovery/linking survives
# release minification.
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }

-dontwarn org.bouncycastle.**
