import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor(private configService: ConfigService) {
    this.encryptionKey = this.configService.get<string>(
      'ENCRYPTION_KEY',
      'default-encryption-key-32chars!!',
    );
  }

  encrypt(text: string): string {
    if (!text) return '';
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return ciphertext;
    }
  }

  hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
}
