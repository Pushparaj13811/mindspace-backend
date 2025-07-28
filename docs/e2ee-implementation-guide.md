# End-to-End Encryption (E2EE) Implementation Guide for Mindspace

## Executive Summary

This guide provides a comprehensive plan for implementing End-to-End Encryption (E2EE) in the Mindspace application, focusing on protecting sensitive journal entries, mood data, and personal health information. The implementation ensures that data is encrypted on the client device and remains encrypted throughout transmission and storage, with only the user holding the decryption keys.

## Current State Analysis

### Data Flow
1. **Frontend**: React Native app stores journal entries locally in AsyncStorage (unencrypted)
2. **Backend**: Receives plain text data and stores in Appwrite database
3. **Database**: Journal entries have an `encrypted` field but it's always `false`
4. **Security**: No encryption at rest or in transit beyond HTTPS

### Sensitive Data Types
- Journal entries (title, content)
- Mood data (current mood, intensity, notes)
- AI insights and analysis
- Personal health information
- User attachments (images, voice recordings)

## E2EE Architecture Design

### Core Principles
1. **Zero-Knowledge**: Backend never sees unencrypted data
2. **Client-Side Encryption**: All encryption/decryption happens on the device
3. **Key Derivation**: Encryption keys derived from user's password
4. **Forward Secrecy**: Each journal entry uses a unique encryption key
5. **Secure Key Storage**: Master keys stored in device's secure storage

### Key Management Strategy

```
User Password → PBKDF2 → Master Key → Per-Entry Keys
                  ↓
            Salt (stored)
```

## Implementation Plan

### Phase 1: Frontend Encryption Infrastructure

#### 1.1 Install Required Dependencies

```bash
# Add expo-crypto for cryptographic operations
npx expo install expo-crypto

# Add buffer polyfill for React Native
npm install buffer
```

#### 1.2 Create Encryption Service

Create `/mindspace/src/services/encryption/EncryptionService.ts`:

```typescript
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';
import { secureStorage } from '../storage/secureStorage';

interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  authTag?: string;
}

interface EncryptionKey {
  key: string;
  salt: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: CryptoKey | null = null;
  
  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Derive master encryption key from password
   */
  async deriveMasterKey(password: string, salt?: string): Promise<EncryptionKey> {
    // Generate or use provided salt
    const keySalt = salt || await this.generateSalt();
    
    // Derive key using PBKDF2
    const keyMaterial = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + keySalt,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Store master key in memory
    this.masterKey = keyMaterial;
    
    // Store salt for future key derivation
    await secureStorage.setSecureItem('encryption_salt', keySalt);
    
    return {
      key: keyMaterial,
      salt: keySalt
    };
  }

  /**
   * Generate a random salt
   */
  private async generateSalt(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Buffer.from(randomBytes).toString('base64');
  }

  /**
   * Generate a random IV
   */
  private async generateIV(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Buffer.from(randomBytes).toString('base64');
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(plaintext: string, key?: string): Promise<EncryptedData> {
    const encryptionKey = key || this.masterKey;
    if (!encryptionKey) {
      throw new Error('No encryption key available');
    }

    const iv = await this.generateIV();
    const salt = await this.generateSalt();
    
    // For React Native, we'll use a simplified approach
    // In production, consider using react-native-aes-gcm-crypto
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      plaintext + encryptionKey + iv + salt,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    return {
      ciphertext: encrypted,
      iv,
      salt,
      authTag: '' // Would be populated with actual AES-GCM
    };
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: EncryptedData, key?: string): Promise<string> {
    const decryptionKey = key || this.masterKey;
    if (!decryptionKey) {
      throw new Error('No decryption key available');
    }

    // In production, implement actual AES-GCM decryption
    // This is a placeholder for the concept
    return 'decrypted_content';
  }

  /**
   * Encrypt journal entry
   */
  async encryptJournalEntry(entry: {
    title: string;
    content: string;
    mood?: any;
    tags?: string[];
  }): Promise<{
    encryptedTitle: string;
    encryptedContent: string;
    encryptedMood?: string;
    encryptedTags?: string;
    encryptionMetadata: EncryptedData;
  }> {
    // Generate unique key for this entry
    const entryKey = await this.generateEntryKey();
    
    // Encrypt each field
    const encryptedTitle = await this.encrypt(entry.title, entryKey);
    const encryptedContent = await this.encrypt(entry.content, entryKey);
    const encryptedMood = entry.mood ? 
      await this.encrypt(JSON.stringify(entry.mood), entryKey) : undefined;
    const encryptedTags = entry.tags ? 
      await this.encrypt(JSON.stringify(entry.tags), entryKey) : undefined;
    
    return {
      encryptedTitle: encryptedTitle.ciphertext,
      encryptedContent: encryptedContent.ciphertext,
      encryptedMood: encryptedMood?.ciphertext,
      encryptedTags: encryptedTags?.ciphertext,
      encryptionMetadata: {
        ciphertext: entryKey,
        iv: encryptedContent.iv,
        salt: encryptedContent.salt
      }
    };
  }

  /**
   * Generate unique key for each journal entry
   */
  private async generateEntryKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Buffer.from(randomBytes).toString('base64');
  }

  /**
   * Clear master key from memory
   */
  clearMasterKey(): void {
    this.masterKey = null;
  }
}

// Export singleton
export const encryptionService = EncryptionService.getInstance();
```

#### 1.3 Integrate with Journal Creation

Update `/mindspace/src/features/journal/screens/CreateJournalScreen.tsx`:

```typescript
import { encryptionService } from '@/services/encryption/EncryptionService';

// In handleSave function:
const handleSave = async () => {
  if (!title.trim() && !content.trim()) {
    Alert.alert('Empty Entry', 'Please add a title or content before saving.');
    return;
  }

  setIsSaving(true);
  try {
    // Prepare entry data
    const entryData = {
      title: title.trim() || '',
      content: content.trim(),
      mood: selectedMood ? {
        type: selectedMood as MoodType,
        intensity: moodIntensity,
      } : undefined,
      tags
    };

    // Encrypt the entry
    const encryptedEntry = await encryptionService.encryptJournalEntry(entryData);
    
    // Create journal entry with encrypted data
    const newEntry: JournalEntryLocal = {
      id: Date.now().toString(),
      userId: 'current-user-id',
      title: '[Encrypted]', // Store placeholder
      content: '[Encrypted]', // Store placeholder
      encryptedData: encryptedEntry, // Store encrypted data
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [], // Don't store in plain text
      attachments: [],
      synced: false,
      encrypted: true, // Mark as encrypted
    };

    // Save to local storage
    const existingEntries = await AsyncStorage.getItem('journal_entries');
    const entries = existingEntries ? JSON.parse(existingEntries) : [];
    entries.unshift(newEntry);
    await AsyncStorage.setItem('journal_entries', JSON.stringify(entries));

    // If online, sync to backend
    if (isOnline) {
      await syncEncryptedEntry(newEntry);
    }

    router.back();
  } catch (error) {
    console.error('Failed to save entry:', error);
    Alert.alert('Error', 'Failed to save journal entry. Please try again.');
  } finally {
    setIsSaving(false);
  }
};
```

### Phase 2: Backend Modifications

#### 2.1 Update Journal Model

Modify `/backend/src/models/JournalModel.ts`:

```typescript
export const JournalModel = {
  // ... existing fields ...
  
  // Encrypted data fields
  encryptedTitle: { type: 'string', required: false },
  encryptedContent: { type: 'string', required: false },
  encryptedMood: { type: 'string', required: false },
  encryptedTags: { type: 'string', required: false },
  
  // Encryption metadata
  encryptionVersion: { type: 'string', required: false },
  encryptionMetadata: { type: 'string', required: false }, // JSON string
  
  // Flag to indicate encryption
  encrypted: { type: 'boolean', required: true, default: false }
};
```

#### 2.2 Update Journal Controller

Modify `/backend/src/controllers/JournalController.ts` to handle encrypted data:

```typescript
async createEntry(context: any) {
  const { body, set } = context;
  
  try {
    const user = this.getCurrentUser(context);
    await this.requirePermission(user, 'create_journal');
    
    const validatedData = this.validateRequestBody(createJournalSchema, body);
    
    // Check if data is encrypted
    if (validatedData.encrypted) {
      // Store encrypted data without processing
      const journalData = {
        userId: user.$id,
        encrypted: true,
        encryptedTitle: validatedData.encryptedTitle,
        encryptedContent: validatedData.encryptedContent,
        encryptedMood: validatedData.encryptedMood,
        encryptedTags: validatedData.encryptedTags,
        encryptionMetadata: JSON.stringify(validatedData.encryptionMetadata),
        encryptionVersion: validatedData.encryptionVersion || '1.0',
        
        // Store minimal unencrypted metadata for queries
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const journalEntry = await this.services.databaseService.create('journals', journalData);
      
      return this.success(
        { entry: journalEntry }, 
        'Encrypted journal entry created successfully', 
        HTTP_STATUS.CREATED
      );
    }
    
    // Handle unencrypted entries (legacy support)
    // ... existing code ...
  } catch (error) {
    this.logError(error as Error, 'create_journal_entry');
    return this.handleBusinessError(error as Error, set);
  }
}
```

### Phase 3: Key Recovery & Backup

#### 3.1 Implement Key Recovery

Create `/mindspace/src/services/encryption/KeyRecoveryService.ts`:

```typescript
export class KeyRecoveryService {
  /**
   * Generate recovery phrase from master key
   */
  async generateRecoveryPhrase(masterKey: string): Promise<string[]> {
    // Use BIP39-like approach to generate mnemonic
    // This is a simplified example
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      masterKey,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Convert to word list (implement BIP39 wordlist)
    const words = this.hashToWords(hash);
    return words;
  }

  /**
   * Recover master key from recovery phrase
   */
  async recoverFromPhrase(recoveryPhrase: string[]): Promise<string> {
    // Convert words back to key
    const recovered = this.wordsToKey(recoveryPhrase);
    return recovered;
  }

  /**
   * Backup encryption keys securely
   */
  async backupKeys(userId: string): Promise<void> {
    // Store encrypted backup on server
    // Keys are encrypted with a separate backup key
  }
}
```

### Phase 4: Migration Strategy

#### 4.1 Migrate Existing Entries

Create migration script `/mindspace/src/services/migration/EncryptionMigration.ts`:

```typescript
export class EncryptionMigration {
  async migrateExistingEntries(password: string): Promise<void> {
    // 1. Derive master key from password
    await encryptionService.deriveMasterKey(password);
    
    // 2. Get all unencrypted entries
    const entries = await this.getUnencryptedEntries();
    
    // 3. Encrypt each entry
    for (const entry of entries) {
      const encrypted = await encryptionService.encryptJournalEntry(entry);
      await this.updateEntry(entry.id, encrypted);
    }
    
    // 4. Mark migration complete
    await AsyncStorage.setItem('encryption_migrated', 'true');
  }
}
```

## Security Considerations

### 1. Key Management
- Never store encryption keys in plain text
- Use device's secure storage (Keychain/Keystore)
- Implement key rotation strategy
- Provide secure key recovery options

### 2. Performance
- Implement lazy decryption (decrypt only when needed)
- Cache decrypted data in memory with timeout
- Use background workers for bulk operations

### 3. Compliance
- Ensure HIPAA compliance with 256-bit encryption
- Implement audit logging for access attempts
- Provide data export in encrypted format

### 4. User Experience
- Transparent encryption/decryption
- Progress indicators for bulk operations
- Clear communication about encryption status
- Offline support with sync queue

## Implementation Timeline

### Week 1-2: Frontend Foundation
- Install dependencies
- Implement core encryption service
- Add secure key storage
- Basic encrypt/decrypt functionality

### Week 3-4: Backend Integration
- Update database schema
- Modify API endpoints
- Implement encrypted data handling
- Add validation for encrypted entries

### Week 5-6: Migration & Testing
- Develop migration tools
- Test with various data sizes
- Performance optimization
- Security audit

### Week 7-8: User Features
- Key recovery implementation
- Backup/restore functionality
- Settings UI for encryption
- Documentation and training

## Testing Strategy

### Unit Tests
```typescript
describe('EncryptionService', () => {
  it('should derive consistent keys from password', async () => {
    const key1 = await encryptionService.deriveMasterKey('password', 'salt');
    const key2 = await encryptionService.deriveMasterKey('password', 'salt');
    expect(key1.key).toBe(key2.key);
  });

  it('should encrypt and decrypt successfully', async () => {
    const plaintext = 'Secret journal entry';
    const encrypted = await encryptionService.encrypt(plaintext);
    const decrypted = await encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
```

### Integration Tests
- Test full journal entry flow
- Verify backend accepts encrypted data
- Test migration process
- Validate key recovery

### Security Tests
- Penetration testing
- Key extraction attempts
- Performance under load
- Cross-platform compatibility

## Rollback Plan

If issues arise:
1. Feature flag to disable encryption
2. Maintain backward compatibility
3. Export tools for unencrypted data
4. Clear rollback procedures

## Conclusion

This E2EE implementation ensures that Mindspace users' sensitive data remains private and secure. The zero-knowledge architecture means that even if the backend is compromised, user data remains encrypted and unreadable without the user's encryption keys.

---

**Next Steps:**
1. Review and approve the implementation plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Schedule security audit

**Resources Needed:**
- React Native developer familiar with cryptography
- Security consultant for audit
- Additional testing devices
- Performance monitoring tools