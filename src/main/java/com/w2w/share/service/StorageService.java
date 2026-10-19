package com.w2w.share.service;

import com.w2w.share.exception.InvalidChunkException;
import com.w2w.share.exception.StorageException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.w2w.share.metrics.ITransferMetricsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class StorageService implements IStorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);
    private static final String FILE_PREFIX = "file_";
    private static final String CHUNK_PREFIX = "chunk_";
    private static final String BIN_EXT = ".bin";
    private static final int MAX_CHUNK_SIZE_BYTES = 64 * 1024 * 1024; // 64 MB chunk ceiling

    @Value("${w2w.storage.temp-dir:#{systemProperties['java.io.tmpdir'] + '/w2w-share'}}")
    private String tempDirPath;

    @Value("${w2w.storage.max-quota-bytes:53687091200}") // 50 GB default
    private long maxQuotaBytes;

    private final ITransferMetricsService metricsService;

    private Path rootStoragePath;
    private final AtomicLong usedStorageBytes = new AtomicLong(0);
    private final Set<Path> createdDirectories = ConcurrentHashMap.newKeySet();

    public StorageService() {
        this(null);
    }

    @Autowired
    public StorageService(@Autowired(required = false) ITransferMetricsService metricsService) {
        this.metricsService = metricsService;
    }

    private void syncMetrics() {
        if (metricsService != null) {
            metricsService.setStorageConsumedBytes(usedStorageBytes.get());
        }
    }

    @PostConstruct
    @Override
    public void init() {
        try {
            rootStoragePath = Paths.get(tempDirPath).toAbsolutePath().normalize();
            Files.createDirectories(rootStoragePath);
            reconcileStartupStorage();
            syncMetrics();
            log.info("Initialized ephemeral encrypted storage directory at: {}", rootStoragePath);
        } catch (IOException e) {
            log.error("Failed to initialize temporary storage directory: {}", tempDirPath, e);
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    /**
     * Purges orphaned session directories left over from previous unexpected JVM shutdowns or crashes.
     */
    private void reconcileStartupStorage() {
        if (!Files.exists(rootStoragePath)) return;
        try (Stream<Path> stream = Files.list(rootStoragePath)) {
            int purged = 0;
            for (Path sessionDir : stream.toList()) {
                if (Files.isDirectory(sessionDir)) {
                    deleteDirectoryRecursively(sessionDir);
                    purged++;
                }
            }
            if (purged > 0) {
                log.info("Reconciled temporary storage: purged {} stale session directories on startup.", purged);
            }
        } catch (Exception e) {
            log.warn("Notice during startup storage reconciliation: {}", e.getMessage());
        }
    }

    private void deleteDirectoryRecursively(Path dir) {
        try (Stream<Path> s = Files.walk(dir)) {
            s.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException _) {
                    // Best-effort file deletion during startup reconciliation
                }
            });
        } catch (Exception _) {
            // Best-effort directory cleanup during startup reconciliation
        }
    }


    @PreDestroy
    @Override
    public void cleanupAll() {
        log.info("Cleaning up all temporary storage on application shutdown.");
        try (Stream<Path> stream = Files.walk(rootStoragePath)) {
            stream.sorted(Comparator.reverseOrder())
                    .filter(path -> !path.equals(rootStoragePath))
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            log.trace("Failed to delete path during cleanup: {}", e.getMessage());
                        }
                    });
        } catch (Exception e) {
            log.warn("Error cleaning up storage directory on shutdown: {}", e.getMessage());
        }
        createdDirectories.clear();
        usedStorageBytes.set(0);
        syncMetrics();
    }

    private void validateSessionId(String sessionId) {
        if (sessionId == null || sessionId.isBlank() || sessionId.contains("..") || sessionId.contains("/") || sessionId.contains("\\")) {
            throw new StorageException("Invalid or insecure session ID format: " + sessionId);
        }
    }

    private Path getOrCreateFileDirectory(String sessionId, int fileIndex) {
        validateSessionId(sessionId);
        Path sessionDir = rootStoragePath.resolve(sessionId).normalize();
        if (!sessionDir.startsWith(rootStoragePath)) {
            throw new StorageException("Path traversal attempt detected for session: " + sessionId);
        }

        Path fileDir = sessionDir.resolve(FILE_PREFIX + fileIndex).normalize();
        if (!createdDirectories.contains(fileDir)) {
            try {
                Files.createDirectories(fileDir);
                createdDirectories.add(fileDir);
            } catch (IOException e) {
                log.error("Failed to create file directory for session {} file {}", sessionId, fileIndex, e);
                throw new StorageException("Failed to initialize directory for file " + fileIndex, e);
            }
        }
        return fileDir;
    }

    @Override
    public void saveChunk(String sessionId, int fileIndex, int chunkIndex, byte[] data) {
        validateSessionId(sessionId);
        if (fileIndex < 0 || chunkIndex < 0) {
            throw new InvalidChunkException("File index (" + fileIndex + ") and chunk index (" + chunkIndex + ") must be non-negative.");
        }

        if (data == null || data.length == 0) {
            throw new InvalidChunkException("Chunk payload cannot be empty or null.");
        }

        if (data.length > MAX_CHUNK_SIZE_BYTES) {
            throw new InvalidChunkException("Chunk payload (" + data.length + " bytes) exceeds maximum allowed chunk size (" + MAX_CHUNK_SIZE_BYTES + " bytes).");
        }

        Path fileDir = getOrCreateFileDirectory(sessionId, fileIndex);
        Path finalChunkPath = fileDir.resolve(CHUNK_PREFIX + chunkIndex + BIN_EXT);

        long existingSize = 0;
        try {
            if (Files.exists(finalChunkPath)) {
                existingSize = Files.size(finalChunkPath);
            }
        } catch (IOException _) {
            // Best-effort size inspection
        }

        long delta = data.length - existingSize;
        if (delta > 0 && usedStorageBytes.get() + delta > maxQuotaBytes) {
            throw new StorageException("Storage quota of " + (maxQuotaBytes / (1024 * 1024 * 1024)) + " GB exceeded.");
        }

        try (java.nio.channels.FileChannel channel = java.nio.channels.FileChannel.open(
                finalChunkPath,
                StandardOpenOption.CREATE,
                StandardOpenOption.WRITE,
                StandardOpenOption.TRUNCATE_EXISTING)) {

            java.nio.ByteBuffer buffer = java.nio.ByteBuffer.wrap(data);
            while (buffer.hasRemaining()) {
                channel.write(buffer);
            }

            if (delta != 0) {
                usedStorageBytes.addAndGet(delta);
                syncMetrics();
            }
        } catch (IOException e) {
            log.error("Failed to write chunk {} for file {} in session {}", chunkIndex, fileIndex, sessionId, e);
            throw new StorageException("Failed to save chunk " + chunkIndex + " for file " + fileIndex, e);
        }
    }

    @Override
    public long saveChunkStream(String sessionId, int fileIndex, int chunkIndex, java.io.InputStream inputStream, long contentLength) {
        validateSessionId(sessionId);
        if (fileIndex < 0 || chunkIndex < 0) {
            throw new InvalidChunkException("File index (" + fileIndex + ") and chunk index (" + chunkIndex + ") must be non-negative.");
        }
        if (inputStream == null) {
            throw new InvalidChunkException("Chunk payload cannot be empty or null.");
        }
        if (contentLength > MAX_CHUNK_SIZE_BYTES) {
            throw new InvalidChunkException("Chunk payload (" + contentLength + " bytes) exceeds maximum allowed chunk size (" + MAX_CHUNK_SIZE_BYTES + " bytes).");
        }

        Path fileDir = getOrCreateFileDirectory(sessionId, fileIndex);
        Path finalChunkPath = fileDir.resolve(CHUNK_PREFIX + chunkIndex + BIN_EXT);

        long existingSize = 0;
        try {
            if (Files.exists(finalChunkPath)) {
                existingSize = Files.size(finalChunkPath);
            }
        } catch (IOException _) {
            // Best-effort size inspection
        }

        if (contentLength > 0) {
            long delta = contentLength - existingSize;
            if (delta > 0 && usedStorageBytes.get() + delta > maxQuotaBytes) {
                throw new StorageException("Storage quota of " + (maxQuotaBytes / (1024 * 1024 * 1024)) + " GB exceeded.");
            }
        }

        long writtenBytes = 0;
        try (java.nio.channels.FileChannel fileChannel = java.nio.channels.FileChannel.open(
                finalChunkPath,
                StandardOpenOption.CREATE,
                StandardOpenOption.WRITE,
                StandardOpenOption.TRUNCATE_EXISTING);
             java.nio.channels.ReadableByteChannel inChannel = java.nio.channels.Channels.newChannel(inputStream)) {

            java.nio.ByteBuffer buffer = java.nio.ByteBuffer.allocateDirect(64 * 1024);
            while (inChannel.read(buffer) != -1) {
                buffer.flip();
                writtenBytes += buffer.remaining();
                if (writtenBytes > MAX_CHUNK_SIZE_BYTES) {
                    throw new InvalidChunkException("Chunk payload exceeds maximum allowed chunk size (" + MAX_CHUNK_SIZE_BYTES + " bytes).");
                }
                while (buffer.hasRemaining()) {
                    fileChannel.write(buffer);
                }
                buffer.clear();
            }

            if (writtenBytes == 0) {
                throw new InvalidChunkException("Chunk payload cannot be empty or null.");
            }

            long delta = writtenBytes - existingSize;
            if (delta != 0) {
                usedStorageBytes.addAndGet(delta);
                syncMetrics();
            }
            return writtenBytes;
        } catch (IOException e) {
            log.error("Failed to stream chunk {} for file {} in session {}", chunkIndex, fileIndex, sessionId, e);
            throw new StorageException("Failed to save chunk " + chunkIndex + " for file " + fileIndex, e);
        }
    }

    @Override
    public byte[] getChunk(String sessionId, int fileIndex, int chunkIndex) throws NoSuchFileException {
        validateSessionId(sessionId);
        if (fileIndex < 0 || chunkIndex < 0) {
            throw new InvalidChunkException("File index (" + fileIndex + ") and chunk index (" + chunkIndex + ") must be non-negative.");
        }

        Path chunkPath = rootStoragePath.resolve(sessionId).resolve(FILE_PREFIX + fileIndex).resolve(CHUNK_PREFIX + chunkIndex + BIN_EXT).normalize();
        if (!chunkPath.startsWith(rootStoragePath)) {
            throw new StorageException("Path traversal attempt detected for chunk retrieval: " + sessionId);
        }

        if (!Files.exists(chunkPath)) {
            throw new NoSuchFileException("Chunk " + chunkIndex + " for file " + fileIndex + " not found in session " + sessionId);
        }

        try {
            return Files.readAllBytes(chunkPath);
        } catch (IOException e) {
            log.error("Failed to read chunk {} for file {} in session {}", chunkIndex, fileIndex, sessionId, e);
            throw new StorageException("Failed to read chunk " + chunkIndex + " for file " + fileIndex, e);
        }
    }

    @Override
    public Path getChunkPath(String sessionId, int fileIndex, int chunkIndex) throws NoSuchFileException {
        validateSessionId(sessionId);
        if (fileIndex < 0 || chunkIndex < 0) {
            throw new InvalidChunkException("File index (" + fileIndex + ") and chunk index (" + chunkIndex + ") must be non-negative.");
        }

        Path chunkPath = rootStoragePath.resolve(sessionId).resolve(FILE_PREFIX + fileIndex).resolve(CHUNK_PREFIX + chunkIndex + BIN_EXT).normalize();
        if (!chunkPath.startsWith(rootStoragePath)) {
            throw new StorageException("Path traversal attempt detected for chunk retrieval: " + sessionId);
        }

        if (!Files.exists(chunkPath)) {
            throw new NoSuchFileException("Chunk " + chunkIndex + " for file " + fileIndex + " not found in session " + sessionId);
        }

        return chunkPath;
    }

    @Override
    public boolean hasChunk(String sessionId, int fileIndex, int chunkIndex) {
        if (sessionId == null || sessionId.isBlank() || fileIndex < 0 || chunkIndex < 0) {
            return false;
        }
        try {
            validateSessionId(sessionId);
            Path chunkPath = rootStoragePath.resolve(sessionId).resolve(FILE_PREFIX + fileIndex).resolve(CHUNK_PREFIX + chunkIndex + BIN_EXT).normalize();
            return chunkPath.startsWith(rootStoragePath) && Files.exists(chunkPath);
        } catch (Exception _) {
            // Path traversal attempt or invalid format yields false
            return false;
        }
    }

    @Override
    public Set<Integer> getExistingChunkIndices(String sessionId, int fileIndex) {
        if (sessionId == null || sessionId.isBlank() || fileIndex < 0) {
            return Collections.emptySet();
        }

        try {
            validateSessionId(sessionId);
            Path fileDir = rootStoragePath.resolve(sessionId).resolve(FILE_PREFIX + fileIndex).normalize();
            if (!fileDir.startsWith(rootStoragePath) || !Files.exists(fileDir)) {
                return Collections.emptySet();
            }

            Set<Integer> result = new HashSet<>();
            try (Stream<Path> stream = Files.list(fileDir)) {
                for (Path p : stream.toList()) {
                    String name = p.getFileName().toString();
                    if (name.startsWith(CHUNK_PREFIX) && name.endsWith(BIN_EXT)) {
                        try {
                            int idx = Integer.parseInt(name.substring(CHUNK_PREFIX.length(), name.length() - BIN_EXT.length()));
                            result.add(idx);
                        } catch (NumberFormatException _) {
                            // Non-numeric chunk name
                        }
                    }
                }
            }
            return result;
        } catch (Exception e) {
            log.debug("Failed to read chunks in directory for session {}: {}", sessionId, e.getMessage());
            return Collections.emptySet();
        }
    }

    @Override
    public void cleanupSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return;
        try {
            validateSessionId(sessionId);
        } catch (Exception _) {
            log.warn("Skipping cleanup for invalid session ID format: {}", sessionId);
            return;
        }

        Path sessionDir = rootStoragePath.resolve(sessionId).normalize();
        if (!sessionDir.startsWith(rootStoragePath) || !Files.exists(sessionDir)) return;

        try (Stream<Path> stream = Files.walk(sessionDir)) {
            stream.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            if (Files.isRegularFile(path)) {
                                long size = Files.size(path);
                                usedStorageBytes.addAndGet(-size);
                            }
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            log.trace("Failed to delete session path: {}", e.getMessage());
                        }
                    });
            createdDirectories.removeIf(p -> p.startsWith(sessionDir));
            syncMetrics();
            log.info("Purged ephemeral storage for session [{}]", sessionId);
        } catch (IOException e) {
            log.warn("Error cleaning up session directory {}: {}", sessionDir, e.getMessage());
        }
    }

    @Override
    public Path getSessionDirectory(String sessionId) {
        validateSessionId(sessionId);
        Path sessionDir = rootStoragePath.resolve(sessionId).normalize();
        if (!sessionDir.startsWith(rootStoragePath)) {
            throw new StorageException("Path traversal attempt in getSessionDirectory: " + sessionId);
        }
        return sessionDir;
    }

    @Override
    public long getUsedStorageBytes() {
        return Math.max(0L, usedStorageBytes.get());
    }

    @Override
    public long getMaxQuotaBytes() {
        return maxQuotaBytes;
    }

    @Override
    public String getStorageDirectoryPath() {
        return rootStoragePath != null ? rootStoragePath.toString() : tempDirPath;
    }
}
