package com.w2w.share.service;

public interface IQrCodeService {

    byte[] generateQrCodePng(String text, int width, int height);

    byte[] generateQrCodePng(String text);
}
