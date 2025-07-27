#!/usr/bin/env bun

/**
 * Comprehensive Database Setup Script
 * Creates all required collections, attributes, and indexes for MindSpace
 */

import { Client, Databases, ID } from 'node-appwrite';
import { config } from '../utils/config.js';
import { AllSchemas } from '../models/index.js';
import { logger } from '../utils/logger.js';

class DatabaseSetup {
  private client: Client;
  private databases: Databases;

  constructor() {
    this.client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);

    this.databases = new Databases(this.client);
  }

  /**
   * Main setup function
   */
  async setup(): Promise<void> {
    try {
      console.log('🚀 Starting comprehensive database setup...');
      console.log(`📊 Database ID: ${config.appwrite.databaseId}`);
      console.log(`🏗️  Setting up ${AllSchemas.length} collections\n`);

      // Ensure database exists
      await this.ensureDatabase();

      // Setup all collections
      for (const schema of AllSchemas) {
        await this.setupCollection(schema);
      }

      console.log('\n🎉 Database setup completed successfully!');
      console.log('\n📋 Summary:');
      AllSchemas.forEach(schema => {
        const attributeCount = 'attributes' in schema ? schema.attributes?.length || 0 : 0;
        const indexCount = 'indexes' in schema ? schema.indexes?.length || 0 : 0;
        console.log(`   ✅ ${schema.name} collection with ${attributeCount} attributes and ${indexCount} indexes`);
      });

      console.log('\n🔒 Don\'t forget to set up permissions in Appwrite Console:');
      console.log('   - Read: users (for user\'s own data)');
      console.log('   - Write: users (for user\'s own data)');
      console.log('   - Create: users');
      console.log('   - Update: users (for user\'s own data)');
      console.log('   - Delete: users (for user\'s own data)');

    } catch (error) {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Ensure database exists
   */
  private async ensureDatabase(): Promise<void> {
    try {
      await this.databases.get(config.appwrite.databaseId);
      console.log('✅ Database exists');
    } catch (error: any) {
      if (error.code === 404) {
        console.log('📦 Creating database...');
        await this.databases.create(config.appwrite.databaseId, 'MindSpace Database');
        console.log('✅ Database created');
      } else {
        throw error;
      }
    }
  }

  /**
   * Setup a single collection with all its attributes and indexes
   */
  private async setupCollection(schema: any): Promise<void> {
    console.log(`\n📁 Setting up ${schema.name} collection...`);

    // Create collection
    await this.createCollection(schema);

    // Create attributes if schema has them
    if (schema.attributes && Array.isArray(schema.attributes)) {
      for (const attribute of schema.attributes) {
        await this.createAttribute(schema.name, attribute);
      }
    } else {
      console.log(`   ⚠️  No attributes defined for ${schema.name} collection`);
    }

    // Create indexes if schema has them
    if (schema.indexes && Array.isArray(schema.indexes)) {
      for (const index of schema.indexes) {
        await this.createIndex(schema.name, index);
      }
    } else {
      console.log(`   ⚠️  No indexes defined for ${schema.name} collection`);
    }

    console.log(`✅ ${schema.name} collection setup complete`);
  }

  /**
   * Create collection
   */
  private async createCollection(schema: any): Promise<void> {
    try {
      const collectionId = (config.appwrite.collections as any)[schema.name] || schema.name;
      await this.databases.createCollection(
        config.appwrite.databaseId,
        collectionId,
        schema.name
      );
      console.log(`   ✅ Created ${schema.name} collection`);
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`   ⚠️  ${schema.name} collection already exists`);
      } else {
        console.error(`   ❌ Failed to create ${schema.name} collection:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Create attribute based on type
   */
  private async createAttribute(collectionName: string, attribute: any): Promise<void> {
    try {
      const collectionId = (config.appwrite.collections as any)[collectionName] || collectionName;
      
      switch (attribute.type) {
        case 'string':
          await this.databases.createStringAttribute(
            config.appwrite.databaseId,
            collectionId,
            attribute.key,
            attribute.size,
            attribute.required,
            attribute.default || null,
            attribute.array || false
          );
          break;

        case 'integer':
          await this.databases.createIntegerAttribute(
            config.appwrite.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.min,
            attribute.max,
            attribute.default || null
          );
          break;

        case 'boolean':
          await this.databases.createBooleanAttribute(
            config.appwrite.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.default || null
          );
          break;

        case 'datetime':
          await this.databases.createDatetimeAttribute(
            config.appwrite.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.default || null
          );
          break;

        case 'float':
          await this.databases.createFloatAttribute(
            config.appwrite.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.min,
            attribute.max,
            attribute.default || null
          );
          break;

        default:
          console.warn(`   ⚠️  Unknown attribute type: ${attribute.type} for ${attribute.key}`);
          return;
      }

      console.log(`   ✅ Created ${attribute.key} (${attribute.type}) attribute`);
      
      // Add delay to avoid rate limiting
      await this.delay(500);

    } catch (error: any) {
      if (error.code === 409) {
        console.log(`   ⚠️  ${attribute.key} attribute already exists`);
      } else {
        console.error(`   ❌ Failed to create ${attribute.key} attribute:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Create index
   */
  private async createIndex(collectionName: string, index: any): Promise<void> {
    try {
      const collectionId = (config.appwrite.collections as any)[collectionName] || collectionName;
      
      await this.databases.createIndex(
        config.appwrite.databaseId,
        collectionId,
        index.key,
        index.type,
        index.attributes,
        index.orders || undefined
      );

      console.log(`   ✅ Created ${index.key} (${index.type}) index`);
      
      // Add delay to avoid rate limiting
      await this.delay(500);

    } catch (error: any) {
      if (error.code === 409) {
        console.log(`   ⚠️  ${index.key} index already exists`);
      } else {
        console.error(`   ❌ Failed to create ${index.key} index:`, error.message);
        // Don't throw for index errors, continue with setup
      }
    }
  }

  /**
   * Delay helper to avoid rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run setup if called directly
if (import.meta.main) {
  const setup = new DatabaseSetup();
  setup.setup();
}

export { DatabaseSetup };