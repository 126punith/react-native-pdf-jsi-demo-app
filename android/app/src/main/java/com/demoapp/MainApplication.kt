package com.demoapp

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    
    // Initialize Nitro Modules native library (MUST be before loadReactNative)
    // Use reflection to avoid compilation errors if library is not linked
    try {
      val initClass = Class.forName("org.wonday.pdf.RNPDFJSIInit")
      val initMethod = initClass.getDeclaredMethod("initializeNative")
      initMethod.invoke(null)
      Log.d("MainApplication", "Nitro Modules initialized successfully")
    } catch (e: ClassNotFoundException) {
      Log.w("MainApplication", "RNPDFJSIInit not found - library may not be linked. Error: ${e.message}")
    } catch (e: Exception) {
      Log.e("MainApplication", "Failed to initialize Nitro Modules: ${e.message}")
    }
    
    loadReactNative(this)
  }
}
