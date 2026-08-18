package com.w2w.share.service;

import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.Set;

public interface IStorageService {

    void init();

    void saveChunk(String sessionId, int fileIndex, int chunkIndex, byte[] data);

    byte[] getChunk(String sessionId, int fileIndex, int chunkIndex) throws NoSuchFileException;

    Path getChunkPath(String sessionId, int fileIndex, int chunkIndex) throws NoSuchFileException;

    boolean hasChunk(String sessionId, int fileIndex, int chunkIndex);

    Set<Integer> getExistingChunkIndices(String sessionId, int fileIndex);

    void cleanupSession(String sessionId);

    void cleanupAll();

    Path getSessionDirectory(String sessionId);

    long getUsedStorageBytes();

    long getMaxQuotaBytes();

    String getStorageDirectoryPath();
}
