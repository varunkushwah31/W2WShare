package com.w2w.share.service;

import com.w2w.share.exception.InvalidChunkException;
import com.w2w.share.exception.StorageException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private Path rootStoragePath;
    private final AtomicLong usedStorageBytes = new AtomicLong(0);
    private final Map<String, Set<String>> sessionFiles = new ConcurrentHashMap<>();

    @PostConstruct
    @Override
    public void init() {
        try {
            rootStoragePath = Paths.get(tempDirPath).toAbsolutePath().normalize();
            Files.createDirectories(rootStoragePath);
            log.info("Initialized ephemeral encrypted storage directory at: {}", rootStoragePath);
        } catch (IOException e) {
            log.error("Failed to initialize temporary storage directory: {}", tempDirPath, e);
            throw new RuntimeException("Could not initialize storage directory", e);
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
    }

    private void validateSessionId(String sessionId) {
        if (sessionId == null || sessionId.isBlank() || sessionId.contains("..") || sessionId.contains("/") || sessionId.contains("\\")) {
            throw new StorageException("Invalid or insecure session ID format: " + sessionId);
        }
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

        if (usedStorageBytes.get() + data.length > maxQuotaBytes) {
            throw new StorageException("Storage quota of " + (maxQuotaBytes / (1024 * 1024 * 1024)) + " GB exceeded.");
        }

        Path sessionDir = rootStoragePath.resolve(sessionId).normalize();
        if (!sessionDir.startsWith(rootStoragePath)) {
            throw new StorageException("Path traversal attempt detected for session: " + sessionId);
        }

        Path fileDir = sessionDir.resolve(FILE_PREFIX + fileIndex).normalize();
        try {
            Files.createDirectories(fileDir);
            Path finalChunkPath = fileDir.resolve(CHUNK_PREFIX + chunkIndex + BIN_EXT);
            Path tempChunkPath = fileDir.resolve(CHUNK_PREFIX + chunkIndex + ".tmp");

            Files.write(tempChunkPath, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            Files.move(tempChunkPath, finalChunkPath, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);

            usedStorageBytes.addAndGet(data.length);

            sessionFiles.computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet())
                    .add(finalChunkPath.toString());

        } catch (IOException e) {
            log.error("Failed to write chunk {} for file {} in session {}", chunkIndex, fileIndex, sessionId, e);
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

            try (Stream<Path> stream = Files.list(fileDir)) {
                return stream.map(p -> p.getFileName().toString())
                        .filter(name -> name.startsWith(CHUNK_PREFIX) && name.endsWith(BIN_EXT))
                        .map(name -> name.replace(CHUNK_PREFIX, "").replace(BIN_EXT, ""))
                        .map(Integer::parseInt)
                        .collect(Collectors.toSet());
            }
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
        } catch (Exception e) {
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
            sessionFiles.remove(sessionId);
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
