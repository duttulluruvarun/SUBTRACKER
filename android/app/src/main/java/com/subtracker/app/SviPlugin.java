package com.subtracker.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import java.util.Calendar;
import java.util.List;

@CapacitorPlugin(name = "SviMetrics")
public class SviPlugin extends Plugin {

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        boolean granted = hasUsageStatsPermission();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void getAppUsage(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            call.reject("Permission not granted");
            return;
        }
        
        UsageStatsManager usm = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
        long endTime = System.currentTimeMillis();
        long startTime = endTime - (1000L * 60 * 60 * 24 * 30); // Last 30 days
        
        java.util.Map<String, UsageStats> aggregateUsage = usm.queryAndAggregateUsageStats(startTime, endTime);
        JSObject result = new JSObject();
        
        if (aggregateUsage != null) {
            for (java.util.Map.Entry<String, UsageStats> entry : aggregateUsage.entrySet()) {
                long totalTimeInForeground = entry.getValue().getTotalTimeInForeground();
                if (totalTimeInForeground > 0) {
                    result.put(entry.getKey(), totalTimeInForeground);
                }
            }
        }
        
        call.resolve(result);
    }

    private boolean hasUsageStatsPermission() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, 
            android.os.Process.myUid(), getContext().getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }
}
