package com.w2w.share.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;

@Service
public class QrCodeService implements IQrCodeService {

    private static final Logger log = LoggerFactory.getLogger(QrCodeService.class);
    private static final int DEFAULT_SIZE = 300;

    @Override
    public byte[] generateQrCodePng(String text, int width, int height) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("QR code content cannot be empty.");
        }

        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 2);

            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate QR code for text: {}", text, e);
            throw new IllegalArgumentException("Could not generate QR code for provided input: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] generateQrCodePng(String text) {
        return generateQrCodePng(text, DEFAULT_SIZE, DEFAULT_SIZE);
    }
}
