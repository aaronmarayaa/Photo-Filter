package com.aaronmarayaa.photofilter;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "PhotoSaver")
public class PhotoSaverPlugin extends Plugin {
    private static final int MAX_PHOTO_BYTES = 10 * 1024 * 1024;
    private static final String STAGED_PHOTO = "stagedPhoto";
    private volatile boolean saving;

    @PluginMethod
    public void save(PluginCall call) {
        if (saving) {
            call.reject("Finish saving the current photo first.");
            return;
        }
        String name = call.getString("name");
        String data = call.getString("data");
        if (name == null || name.isEmpty() || data == null || data.isEmpty()) {
            call.reject("The photo is empty. Try downloading it again.");
            return;
        }
        if (data.length() > ((MAX_PHOTO_BYTES + 2) / 3) * 4) {
            call.reject("Photos must be 10 MiB or smaller.");
            return;
        }

        File photo;
        try {
            byte[] image = Base64.decode(data, Base64.DEFAULT);
            if (image.length == 0 || image.length > MAX_PHOTO_BYTES) {
                throw new IllegalArgumentException("The downloaded photo has an invalid size.");
            }
            photo = stagePhoto(image);
        } catch (IOException | IllegalArgumentException | SecurityException error) {
            call.reject("Could not prepare the photo for saving. Try again.", error);
            return;
        }

        // Capacitor saves the call data in Android's activity state while the picker is open.
        call.getData().remove("data");
        call.getData().put(STAGED_PHOTO, photo.getName());

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/png");
        intent.putExtra(Intent.EXTRA_TITLE, name);
        saving = true;
        bridge.executeOnMainThread(() -> {
            try {
                startActivityForResult(call, intent, "saveResult");
            } catch (ActivityNotFoundException error) {
                photo.delete();
                saving = false;
                call.reject("Your phone has no file picker for saving photos.", error);
            } catch (IllegalStateException | SecurityException error) {
                photo.delete();
                saving = false;
                call.reject("Could not open the file picker. Try again.", error);
            }
        });
    }

    private File stagePhoto(byte[] image) throws IOException {
        File photo = File.createTempFile("photo-save-", ".png", getContext().getCacheDir());
        try (OutputStream output = new FileOutputStream(photo)) {
            output.write(image);
        } catch (IOException | SecurityException error) {
            photo.delete();
            throw error;
        }
        return photo;
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            saving = false;
            return;
        }
        saving = true;
        bridge.execute(() -> finishSave(call, result));
    }

    private void finishSave(PluginCall call, ActivityResult result) {
        String stagedName = call.getString(STAGED_PHOTO);
        File photo = stagedName == null ? null : new File(getContext().getCacheDir(), stagedName);
        Uri destination = result.getData() == null ? null : result.getData().getData();
        try {
            if (result.getResultCode() == Activity.RESULT_CANCELED) {
                JSObject response = new JSObject();
                response.put("saved", false);
                call.resolve(response);
                return;
            }
            if (result.getResultCode() != Activity.RESULT_OK || destination == null) {
                call.reject("No save location was selected. Try again.");
                return;
            }
            long expectedSize = photo == null ? 0 : photo.length();
            if (expectedSize == 0) {
                throw new IOException("The staged photo is unavailable.");
            }

            long bytesWritten = 0;
            try (
                FileInputStream image = new FileInputStream(photo);
                OutputStream output = getContext().getContentResolver().openOutputStream(destination, "w")
            ) {
                if (output == null) {
                    throw new IOException("The selected folder could not be opened.");
                }
                byte[] buffer = new byte[8192];
                int count;
                while ((count = image.read(buffer)) != -1) {
                    output.write(buffer, 0, count);
                    bytesWritten += count;
                }
            }
            if (bytesWritten != expectedSize) {
                throw new IOException("The photo was only partially written.");
            }

            JSObject response = new JSObject();
            response.put("saved", true);
            call.resolve(response);
        } catch (IOException | SecurityException error) {
            try {
                getContext().getContentResolver().delete(destination, null, null);
            } catch (RuntimeException ignored) {
                // Some document providers cannot remove a failed, partially written file.
            }
            call.reject("Could not finish saving the photo. Try again.", error);
        } finally {
            if (photo != null) {
                photo.delete();
            }
            saving = false;
        }
    }
}
