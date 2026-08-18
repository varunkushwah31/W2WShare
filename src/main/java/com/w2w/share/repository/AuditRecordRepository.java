package com.w2w.share.repository;

import com.w2w.share.model.AuditRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuditRecordRepository extends JpaRepository<AuditRecordEntity, Long> {

    Optional<AuditRecordEntity> findByTransactionId(String transactionId);

    List<AuditRecordEntity> findAllByOrderByTimestampDesc();
}
