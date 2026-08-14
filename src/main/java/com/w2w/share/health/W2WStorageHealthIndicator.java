package com.w2w.share.health;

import com.w2w.share.service.IStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
public class W2WStorageHealthIndicator implements HealthIndicator {

    private final IStorageService storageService;

    @Value("${w2w.storage.min-free-disk-bytes:1073741824}")
    private long minFreeDiskBytes;

    public W2WStorageHealthIndicator(IStorageService storageService) {
        this.storageService = storageService;
    }

    @Override
    public Health health() {
        File dir = new File(storageService.getStorageDirectoryPath());
        if (!dir.exists()) {
            return Health.down().withDetail("storageDir", dir.getAbsolutePath()).withDetail("error", "Directory does not exist").build();
        }

        long usableSpace = dir.getUsableSpace();
        long totalSpace = dir.getTotalSpace();
        long currentStorageBytes = storageService.getUsedStorageBytes();

        Health.Builder builder = usableSpace >= minFreeDiskBytes ? Health.up() : Health.down();

        return builder
                .withDetail("storagePath", dir.getAbsolutePath())
                .withDetail("usableDiskSpaceMB", usableSpace / (1024 * 1024))
                .withDetail("totalDiskSpaceMB", totalSpace / (1024 * 1024))
                .withDetail("ephemeralStorageConsumedMB", currentStorageBytes / (1024 * 1024))
                .withDetail("status", usableSpace >= minFreeDiskBytes ? "HEALTHY" : "LOW_DISK_SPACE")
                .build();
    }
}
