package org.wonday.pdf;

import android.Manifest;
import android.app.Activity;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Process;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.PermissionAwareActivity;
import com.facebook.react.modules.core.PermissionListener;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Grants access to a developer-supplied local PDF, then copies content URIs
 * into app-private storage so PDFium can open a real path.
 */
public class FileManager extends ReactContextBaseJavaModule implements ActivityEventListener, LifecycleEventListener {
    private static final int READ_STORAGE_REQUEST = 47291;
    private static final int ALL_FILES_REQUEST = 47292;
    private static final int PICK_PDF_REQUEST = 47293;
    private static final String PREFS = "pdf_file_access";
    private static final String KEY_RESTART = "all_files_restarted";
    private static final String KEY_SAVED_PDF = "saved_pdf_path";

    private final ReactApplicationContext reactContext;
    private Promise pendingPromise;
    private String pendingPath;
    private boolean leftForSettings;
    private boolean pickAfterSettings;
    private boolean awaitingDocumentPick;
    private boolean rememberPickedPdf;

    public FileManager(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(this);
        reactContext.addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return "FileManager";
    }

    @ReactMethod
    public void ensureLocalFileAccess(String path, Promise promise) {
        if (isAppPrivate(path)) {
            promise.resolve(normalizePath(path));
            return;
        }
        if (pendingPromise != null) {
            promise.reject("PERMISSION_IN_PROGRESS", "A storage permission request is already open");
            return;
        }
        if (hasAllFilesAccess() || hasLegacyReadAccess()) {
            resolveWithCopy(promise, path, false);
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Activity activity = reactContext.getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity to request All files access");
                return;
            }
            pendingPromise = promise;
            pendingPath = path;
            leftForSettings = false;
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
            try {
                activity.startActivityForResult(intent, ALL_FILES_REQUEST);
            } catch (Exception primary) {
                try {
                    activity.startActivityForResult(
                        new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION),
                        ALL_FILES_REQUEST);
                } catch (Exception fallback) {
                    pendingPromise = null;
                    pendingPath = null;
                    promise.reject("PERMISSION_FAILED", fallback.getMessage(), fallback);
                }
            }
            return;
        }

        Activity activity = reactContext.getCurrentActivity();
        if (!(activity instanceof PermissionAwareActivity)) {
            promise.reject("NO_ACTIVITY", "No current activity to request storage access");
            return;
        }
        pendingPromise = promise;
        pendingPath = path;
        PermissionAwareActivity permissionActivity = (PermissionAwareActivity) activity;
        permissionActivity.requestPermissions(
            new String[]{Manifest.permission.READ_EXTERNAL_STORAGE},
            READ_STORAGE_REQUEST,
            new PermissionListener() {
                @Override
                public boolean onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
                    if (requestCode != READ_STORAGE_REQUEST) {
                        return false;
                    }
                    boolean granted = grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED;
                    finishPending(granted, false);
                    return true;
                }
            });
    }

    @ReactMethod
    public void copyContentUriToFile(String uriString, Promise promise) {
        try {
            Uri uri = Uri.parse(uriString);
            File dest = new File(reactContext.getFilesDir(), "content-" + System.currentTimeMillis() + ".pdf");
            try (InputStream in = reactContext.getContentResolver().openInputStream(uri);
                 OutputStream out = new FileOutputStream(dest)) {
                if (in == null) {
                    promise.reject("CONTENT_COPY_FAILED", "Unable to open " + uriString);
                    return;
                }
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
            }
            promise.resolve(dest.getAbsolutePath());
        } catch (Exception error) {
            promise.reject("CONTENT_COPY_FAILED", error.getMessage(), error);
        }
    }

    @ReactMethod
    public void savedLocalPdf(Promise promise) {
        String saved = prefs().getString(KEY_SAVED_PDF, null);
        if (saved != null && new File(saved).isFile()) {
            promise.resolve(saved);
            return;
        }
        promise.resolve(null);
    }

    @ReactMethod
    public void pickLocalPdf(Promise promise) {
        startPdfPick(promise, true);
    }

    @ReactMethod
    public void pickPdf(Promise promise) {
        startPdfPick(promise, false);
    }

    private void startPdfPick(Promise promise, boolean remember) {
        if (pendingPromise != null) {
            promise.reject("PERMISSION_IN_PROGRESS", "A storage permission request is already open");
            return;
        }
        pendingPromise = promise;
        pendingPath = null;
        rememberPickedPdf = remember;
        pickAfterSettings = false;
        awaitingDocumentPick = false;
        if (hasAllFilesAccess() || hasLegacyReadAccess()) {
            openPdfPicker();
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            pickAfterSettings = true;
            Activity activity = reactContext.getCurrentActivity();
            if (activity == null) {
                clearPickRequest();
                promise.reject("NO_ACTIVITY", "No current activity to request All files access");
                return;
            }
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
            try {
                activity.startActivityForResult(intent, ALL_FILES_REQUEST);
            } catch (Exception primary) {
                try {
                    activity.startActivityForResult(
                        new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION),
                        ALL_FILES_REQUEST);
                } catch (Exception fallback) {
                    clearPickRequest();
                    promise.reject("PERMISSION_FAILED", fallback.getMessage(), fallback);
                }
            }
            return;
        }
        Activity activity = reactContext.getCurrentActivity();
        if (!(activity instanceof PermissionAwareActivity)) {
            clearPickRequest();
            promise.reject("NO_ACTIVITY", "No current activity to request storage access");
            return;
        }
        PermissionAwareActivity permissionActivity = (PermissionAwareActivity) activity;
        permissionActivity.requestPermissions(
            new String[]{Manifest.permission.READ_EXTERNAL_STORAGE},
            READ_STORAGE_REQUEST,
            new PermissionListener() {
                @Override
                public boolean onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
                    if (requestCode != READ_STORAGE_REQUEST || pendingPromise == null) {
                        return false;
                    }
                    boolean granted = grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED;
                    if (granted) {
                        openPdfPicker();
                    } else {
                        Promise denied = pendingPromise;
                        clearPickRequest();
                        denied.reject("PERMISSION_DENIED", "Storage access is required to open this PDF");
                    }
                    return true;
                }
            });
    }

    private void openPdfPicker() {
        Activity activity = reactContext.getCurrentActivity();
        if (activity == null || pendingPromise == null) {
            Promise promise = pendingPromise;
            clearPickRequest();
            if (promise != null) {
                promise.reject("NO_ACTIVITY", "No current activity to choose a PDF");
            }
            return;
        }
        awaitingDocumentPick = true;
        pickAfterSettings = false;
        leftForSettings = false;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            activity.startActivityForResult(intent, PICK_PDF_REQUEST);
        } catch (Exception error) {
            Promise promise = pendingPromise;
            clearPickRequest();
            if (promise != null) {
                promise.reject("PICK_FAILED", error.getMessage(), error);
            }
        }
    }

    private void handlePickedPdf(int resultCode, Intent data) {
        Promise promise = pendingPromise;
        boolean remember = rememberPickedPdf;
        clearPickRequest();
        if (promise == null) {
            return;
        }
        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
            promise.reject("PICK_CANCELLED", "No PDF was selected");
            return;
        }
        Uri uri = data.getData();
        try {
            reactContext.getContentResolver().takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {
        }
        new Thread(() -> {
            try {
                String copied = copyPickedUri(uri);
                if (remember) {
                    prefs().edit().putString(KEY_SAVED_PDF, copied).commit();
                }
                promise.resolve(copied);
            } catch (Exception error) {
                promise.reject("CONTENT_COPY_FAILED", error.getMessage(), error);
            }
        }, "pdf-pick").start();
    }

    private String copyPickedUri(Uri uri) throws Exception {
        String name = displayName(uri);
        try (InputStream in = reactContext.getContentResolver().openInputStream(uri)) {
            if (in == null) {
                throw new FileNotFoundException("Unable to open " + uri);
            }
            return writeStreamToAppFiles(in, name);
        }
    }

    private String displayName(Uri uri) {
        String name = null;
        try (Cursor cursor = reactContext.getContentResolver().query(
            uri,
            new String[]{OpenableColumns.DISPLAY_NAME},
            null,
            null,
            null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                name = cursor.getString(0);
            }
        } catch (Exception ignored) {
        }
        if (name == null || name.isEmpty()) {
            name = "selected.pdf";
        }
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0 && slash + 1 < name.length()) {
            name = name.substring(slash + 1);
        }
        if (!name.toLowerCase().endsWith(".pdf")) {
            name = name + ".pdf";
        }
        return name;
    }

    private void clearPickRequest() {
        pendingPromise = null;
        pendingPath = null;
        leftForSettings = false;
        pickAfterSettings = false;
        awaitingDocumentPick = false;
        rememberPickedPdf = false;
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode == PICK_PDF_REQUEST) {
            handlePickedPdf(resultCode, data);
            return;
        }
        if (requestCode != ALL_FILES_REQUEST || pendingPromise == null || awaitingDocumentPick) {
            return;
        }
        if (pickAfterSettings) {
            if (Environment.isExternalStorageManager()) {
                leftForSettings = false;
                openPdfPicker();
            }
            return;
        }
        // The settings result can arrive before the app-op is visible.
        // Leave a missing grant for onHostResume to check again.
        if (Environment.isExternalStorageManager()) {
            finishPending(true, true);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
    }

    @Override
    public void onHostResume() {
        if (awaitingDocumentPick || pendingPromise == null || !leftForSettings) {
            return;
        }
        if (pickAfterSettings) {
            if (hasAllFilesAccess() || hasLegacyReadAccess()) {
                leftForSettings = false;
                openPdfPicker();
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                finishPending(false, false);
            }
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return;
        }
        finishPending(Environment.isExternalStorageManager(), true);
    }

    @Override
    public void onHostPause() {
        if (pendingPromise != null && !awaitingDocumentPick) {
            leftForSettings = true;
        }
    }

    @Override
    public void onHostDestroy() {
        // The system settings screen often destroys this activity. Rejecting here
        // reports PERMISSION_DENIED after the user has already turned the grant on.
        // The next resume re-checks Environment.isExternalStorageManager().
        if (leftForSettings || awaitingDocumentPick) {
            return;
        }
        finishPending(false, false);
    }

    private void finishPending(boolean granted, boolean freshAllFilesGrant) {
        Promise promise = pendingPromise;
        String path = pendingPath;
        pendingPromise = null;
        pendingPath = null;
        leftForSettings = false;
        pickAfterSettings = false;
        awaitingDocumentPick = false;
        rememberPickedPdf = false;
        if (promise == null) {
            return;
        }
        if (!granted) {
            promise.reject("PERMISSION_DENIED", "Storage access is required to open this PDF");
            return;
        }
        resolveWithCopy(promise, path, freshAllFilesGrant);
    }

    private void resolveWithCopy(Promise promise, String path, boolean freshAllFilesGrant) {
        new Thread(() -> {
            try {
                String copied = copySharedPdfToAppFiles(path);
                clearRestarted();
                promise.resolve(copied);
            } catch (HiddenDownloadException hidden) {
                if (hasAllFilesAccess() && !alreadyRestartedForGrant() && restartProcess()) {
                    return;
                }
                promise.reject("FILE_NOT_FOUND", "PDF not found: " + normalizePath(path));
            } catch (Exception error) {
                if (freshAllFilesGrant && !alreadyRestartedForGrant() && restartProcess()) {
                    return;
                }
                promise.reject("FILE_NOT_FOUND", "PDF not found: " + normalizePath(path));
            }
        }, "pdf-import").start();
    }

    private static final class HiddenDownloadException extends Exception {
    }

    private String copySharedPdfToAppFiles(String path) throws Exception {
        String normalized = normalizePath(path);
        String name = fileNameOf(normalized);
        File source = new File(normalized);
        if (!source.isFile()) {
            source = findNamedDownload(name);
        }
        if (source != null && source.isFile()) {
            return copyFileToAppFiles(source, name);
        }
        String fromStore = copyMediaStoreDownload(name);
        if (fromStore != null) {
            return fromStore;
        }
        if (hasAllFilesAccess() && !canListDownload()) {
            throw new HiddenDownloadException();
        }
        throw new FileNotFoundException(normalized + ": open failed: ENOENT (No such file or directory)");
    }

    private File findNamedDownload(String name) {
        File[] directories = new File[] {
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            new File("/storage/emulated/0/Download"),
            new File("/storage/emulated/0/Downloads"),
        };
        for (File directory : directories) {
            if (directory == null) {
                continue;
            }
            File direct = new File(directory, name);
            if (direct.isFile()) {
                return direct;
            }
            File[] children = directory.listFiles();
            if (children == null) {
                continue;
            }
            for (File child : children) {
                if (child.isFile() && name.equals(child.getName())) {
                    return child;
                }
            }
        }
        return null;
    }

    private boolean canListDownload() {
        File[] directories = new File[] {
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            new File("/storage/emulated/0/Download"),
            new File("/storage/emulated/0/Downloads"),
        };
        for (File directory : directories) {
            if (directory != null && directory.isDirectory() && directory.list() != null) {
                return true;
            }
        }
        return false;
    }

    private String copyMediaStoreDownload(String displayName) throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || displayName.isEmpty()) {
            return null;
        }
        Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
        String[] projection = new String[] {MediaStore.Downloads._ID};
        try (Cursor cursor = reactContext.getContentResolver().query(
            collection,
            projection,
            MediaStore.Downloads.DISPLAY_NAME + "=?",
            new String[] {displayName},
            null
        )) {
            if (cursor == null || !cursor.moveToFirst()) {
                return null;
            }
            long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Downloads._ID));
            Uri item = ContentUris.withAppendedId(collection, id);
            try (InputStream in = reactContext.getContentResolver().openInputStream(item)) {
                if (in == null) {
                    return null;
                }
                return writeStreamToAppFiles(in, displayName);
            }
        } catch (SecurityException ignored) {
            return null;
        }
    }

    private String copyFileToAppFiles(File source, String name) throws Exception {
        if (name == null || name.isEmpty()) {
            name = "imported.pdf";
        }
        File dest = new File(reactContext.getFilesDir(), name);
        if (source.getAbsolutePath().equals(dest.getAbsolutePath())) {
            return dest.getAbsolutePath();
        }
        try (InputStream in = new FileInputStream(source)) {
            return writeStreamToAppFiles(in, name);
        }
    }

    private String writeStreamToAppFiles(InputStream in, String name) throws Exception {
        File dest = new File(reactContext.getFilesDir(), name);
        try (OutputStream out = new FileOutputStream(dest)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
        } catch (Exception error) {
            dest.delete();
            throw error;
        }
        return dest.getAbsolutePath();
    }

    private String fileNameOf(String path) {
        int slash = path.lastIndexOf('/');
        String name = slash >= 0 ? path.substring(slash + 1) : path;
        return name == null || name.isEmpty() ? "imported.pdf" : name;
    }

    private boolean restartProcess() {
        Intent launch = reactContext.getPackageManager().getLaunchIntentForPackage(reactContext.getPackageName());
        if (launch == null) {
            return false;
        }
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        markRestarted();
        try {
            reactContext.startActivity(launch);
        } catch (Exception error) {
            clearRestarted();
            return false;
        }
        Process.killProcess(Process.myPid());
        return true;
    }

    private SharedPreferences prefs() {
        return reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private boolean alreadyRestartedForGrant() {
        return prefs().getBoolean(KEY_RESTART, false);
    }

    private void markRestarted() {
        prefs().edit().putBoolean(KEY_RESTART, true).commit();
    }

    private void clearRestarted() {
        prefs().edit().remove(KEY_RESTART).commit();
    }

    private String normalizePath(String path) {
        if (path != null && path.startsWith("file://")) {
            return path.substring(7);
        }
        return path == null ? "" : path;
    }

    private boolean hasAllFilesAccess() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && Environment.isExternalStorageManager();
    }

    private boolean hasLegacyReadAccess() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.R
            && ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_EXTERNAL_STORAGE)
                == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isAppPrivate(String path) {
        if (path == null || path.startsWith("content://")) {
            return false;
        }
        String normalized = path.startsWith("file://") ? path.substring(7) : path;
        String dataDir = reactContext.getApplicationInfo().dataDir;
        File external = reactContext.getExternalFilesDir(null);
        return normalized.startsWith(reactContext.getFilesDir().getAbsolutePath())
            || normalized.startsWith(reactContext.getCacheDir().getAbsolutePath())
            || (dataDir != null && normalized.startsWith(dataDir))
            || (external != null && normalized.startsWith(external.getAbsolutePath()));
    }
}
