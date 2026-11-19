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
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "PhotoSaver")
public class PhotoSaverPlugin extends Plugin {
    private static final int MAX_PHOTO_BYTES = 10 * 1024 * 1024;
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

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/png");
        intent.putExtra(Intent.EXTRA_TITLE, name);
        saving = true;
        try {
            startActivityForResult(call, intent, "saveResult");
        } catch (ActivityNotFoundException error) {
            saving = false;
            call.reject("Your phone has no file picker for saving photos.", error);
        }
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            saving = false;
            return;
        }
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            saving = false;
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        Uri destination = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || destination == null) {
            saving = false;
            call.reject("No save location was selected. Try again.");
            return;
        }

        bridge.execute(() -> {
            try {
                byte[] image = Base64.decode(call.getString("data", ""), Base64.DEFAULT);
                if (image.length == 0 || image.length > MAX_PHOTO_BYTES) {
                    throw new IOException("The downloaded photo has an invalid size.");
                }
                try (OutputStream output = getContext().getContentResolver().openOutputStream(destination, "w")) {
                    if (output == null) {
                        throw new IOException("The selected folder could not be opened.");
                    }
                    output.write(image);
                }
                JSObject response = new JSObject();
                response.put("saved", true);
                call.resolve(response);
            } catch (IOException | IllegalArgumentException | SecurityException error) {
                try {
                    getContext().getContentResolver().delete(destination, null, null);
                } catch (RuntimeException ignored) {
                    // Some document providers cannot remove a failed, partially written file.
                }
                call.reject("Could not write the photo to that folder. Choose another location and try again.", error);
            } finally {
                saving = false;
            }
        });
    }
}
