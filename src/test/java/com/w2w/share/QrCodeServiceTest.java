package com.w2w.share;

import com.w2w.share.service.QrCodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class QrCodeServiceTest {

    private QrCodeService qrCodeService;

    @BeforeEach
    void setUp() {
        qrCodeService = new QrCodeService();
    }

    @Test
    void testGenerateQrCodePngSuccess() {
        byte[] qrBytes = qrCodeService.generateQrCodePng("http://192.168.1.105:8080/?pin=123456", 250, 250);
        assertNotNull(qrBytes);
        assertTrue(qrBytes.length > 0);

        // PNG header check (first 8 bytes of PNG file signature: 89 50 4E 47 0D 0A 1A 0A)
        assertEquals((byte) 0x89, qrBytes[0]);
        assertEquals((byte) 'P', qrBytes[1]);
        assertEquals((byte) 'N', qrBytes[2]);
        assertEquals((byte) 'G', qrBytes[3]);
    }

    @Test
    void testGenerateQrCodeWithNullThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> qrCodeService.generateQrCodePng(null));
        assertThrows(IllegalArgumentException.class, () -> qrCodeService.generateQrCodePng("   "));
    }

    @Test
    void testGenerateWifiQrCodePngSuccess() {
        byte[] qrBytes = qrCodeService.generateWifiQrCodePng("MyHotspotSSID", "secretPassword123", "WPA", 250, 250);
        assertNotNull(qrBytes);
        assertTrue(qrBytes.length > 0);
        assertEquals((byte) 0x89, qrBytes[0]);
        assertEquals((byte) 'P', qrBytes[1]);
        assertEquals((byte) 'N', qrBytes[2]);
        assertEquals((byte) 'G', qrBytes[3]);
    }

    @Test
    void testGenerateWifiQrCodePngNoPassword() {
        byte[] qrBytes = qrCodeService.generateWifiQrCodePng("OpenCollegeWifi", "", "nopass");
        assertNotNull(qrBytes);
        assertTrue(qrBytes.length > 0);
    }

    @Test
    void testGenerateWifiQrCodeWithBlankSsidThrows() {
        assertThrows(IllegalArgumentException.class, () -> qrCodeService.generateWifiQrCodePng("", "pass", "WPA"));
        assertThrows(IllegalArgumentException.class, () -> qrCodeService.generateWifiQrCodePng(null, "pass", "WPA"));
    }
}

