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
    
    // Load libNitroPdfJsi before React starts so JNI_OnLoad can register PdfLibrary.
    // Reflection keeps this from failing to compile when the library is not linked.
    try {
      val initClass = Class.forName("com.margelo.nitro.pdfjsi.NitroPdfJsiOnLoad")
      val initMethod = initClass.getDeclaredMethod("initializeNative")
      initMethod.invoke(null)
      Log.d("MainApplication", "NitroPdfJsi native library initialized")
    } catch (e: ClassNotFoundException) {
      Log.w("MainApplication", "NitroPdfJsiOnLoad not found - library may not be linked", e)
    } catch (e: Exception) {
      Log.e("MainApplication", "Failed to initialize NitroPdfJsi native library", e)
    }
    
    loadReactNative(this)
  }
}
