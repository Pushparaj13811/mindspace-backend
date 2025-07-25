#!/usr/bin/env node

import { Client, Databases, ID } from 'node-appwrite';
import { config } from './src/utils/config.js';

const client = new Client()
  .setEndpoint(config.appwrite.endpoint)
  .setProject(config.appwrite.projectId)
  .setKey(config.appwrite.apiKey);

const databases = new Databases(client);

async function createCollections() {
  try {
    console.log('🚀 Setting up Appwrite collections...');

    // 1. Create journals collection
    console.log('📝 Creating journals collection...');
    try {
      await databases.createCollection(
        config.appwrite.databaseId,
        config.appwrite.collections.journals,
        'journals'
      );
      console.log('✅ Journals collection created');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️  Journals collection already exists');
      } else {
        throw error;
      }
    }

    // Add attributes to journals collection
    const journalAttributes = [
      { key: 'userId', type: 'string', size: 36, required: true },
      { key: 'title', type: 'string', size: 200, required: true },
      { key: 'content', type: 'string', size: 10000, required: true },
      { key: 'mood', type: 'string', size: 1000, required: true },
      { key: 'tags', type: 'string', size: 50, required: false, array: true },
      { key: 'aiInsights', type: 'string', size: 2000, required: false },
      { key: 'attachments', type: 'string', size: 1000, required: false },
      { key: 'encrypted', type: 'boolean', required: true, default: false }
    ];

    for (const attr of journalAttributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            config.appwrite.databaseId,
            config.appwrite.collections.journals,
            attr.key,
            attr.size,
            attr.required,
            attr.default || null,
            attr.array || false
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            config.appwrite.databaseId,
            config.appwrite.collections.journals,
            attr.key,
            attr.required,
            attr.default || null
          );
        }
        console.log(`✅ Added ${attr.key} attribute to journals`);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (error.code === 409) {
          console.log(`⚠️  ${attr.key} attribute already exists in journals`);
        } else {
          console.error(`❌ Failed to create ${attr.key}:`, error.message);
        }
      }
    }

    // Create index for journals
    try {
      await databases.createIndex(
        config.appwrite.databaseId,
        config.appwrite.collections.journals,
        'userId_index',
        'key',
        ['userId']
      );
      console.log('✅ Created userId index for journals');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️  userId index already exists in journals');
      }
    }

    // 2. Create companies collection
    console.log('🏢 Creating companies collection...');
    try {
      await databases.createCollection(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        'companies'
      );
      console.log('✅ Companies collection created');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️  Companies collection already exists');
      } else {
        throw error;
      }
    }

    // Add attributes to companies collection
    const companyAttributes = [
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'domain', type: 'string', size: 100, required: true },
      { key: 'logo', type: 'string', size: 255, required: false },
      { key: 'adminId', type: 'string', size: 36, required: true },
      { key: 'settings', type: 'string', size: 1000, required: false },
      { key: 'subscription', type: 'string', size: 1000, required: false }
    ];

    for (const attr of companyAttributes) {
      try {
        await databases.createStringAttribute(
          config.appwrite.databaseId,
          config.appwrite.collections.companies,
          attr.key,
          attr.size,
          attr.required,
          attr.default || null
        );
        console.log(`✅ Added ${attr.key} attribute to companies`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (error.code === 409) {
          console.log(`⚠️  ${attr.key} attribute already exists in companies`);
        } else {
          console.error(`❌ Failed to create ${attr.key}:`, error.message);
        }
      }
    }

    // Create unique index for domain
    try {
      await databases.createIndex(
        config.appwrite.databaseId,
        config.appwrite.collections.companies,
        'domain_unique',
        'unique',
        ['domain']
      );
      console.log('✅ Created unique domain index for companies');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️  Domain unique index already exists in companies');
      }
    }

    // 3. Create/update moods collection
    console.log('😊 Creating moods collection...');
    try {
      await databases.createCollection(
        config.appwrite.databaseId,
        config.appwrite.collections.moods,
        'moods'
      );
      console.log('✅ Moods collection created');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️  Moods collection already exists');
      } else {
        throw error;
      }
    }

    // Add attributes to moods collection
    const moodAttributes = [
      { key: 'userId', type: 'string', size: 36, required: true },
      { key: 'current', type: 'string', size: 20, required: true },
      { key: 'intensity', type: 'integer', min: 1, max: 10, required: true },
      { key: 'timestamp', type: 'datetime', required: true },
      { key: 'triggers', type: 'string', size: 100, required: false, array: true },
      { key: 'notes', type: 'string', size: 500, required: false }
    ];

    for (const attr of moodAttributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            config.appwrite.databaseId,
            config.appwrite.collections.moods,
            attr.key,
            attr.size,
            attr.required,
            attr.default || null,
            attr.array || false
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            config.appwrite.databaseId,
            config.appwrite.collections.moods,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default || null
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            config.appwrite.databaseId,
            config.appwrite.collections.moods,
            attr.key,
            attr.required,
            attr.default || null
          );
        }
        console.log(`✅ Added ${attr.key} attribute to moods`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (error.code === 409) {
          console.log(`⚠️  ${attr.key} attribute already exists in moods`);
        } else {
          console.error(`❌ Failed to create ${attr.key}:`, error.message);
        }
      }
    }

    console.log('🎉 Appwrite collections setup completed!');
    console.log('\n📋 Summary:');
    console.log('   - journals collection with all required attributes');
    console.log('   - companies collection with all required attributes');  
    console.log('   - moods collection with all required attributes');
    console.log('   - Proper indexes for performance');
    console.log('\n✅ You can now create journal entries successfully!');

  } catch (error) {
    console.error('❌ Error setting up collections:', error);
    process.exit(1);
  }
}

createCollections();