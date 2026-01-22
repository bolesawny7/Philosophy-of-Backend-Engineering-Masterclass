/**
 * ============================================================================
 * BASE REPOSITORY - ABSTRACT FILE-BASED DATABASE
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Repository Pattern
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * The Repository Pattern provides an abstraction layer between the business
 * logic and the data persistence mechanism. This allows us to:
 * 
 * 1. Switch databases without changing business logic
 * 2. Mock data access in unit tests
 * 3. Centralize data access logic
 * 4. Implement caching, logging, or other cross-cutting concerns
 * 
 * DESIGN DECISIONS:
 * -----------------
 * 1. Generic base class for code reuse across entity types
 * 2. In-memory array for fast access with file persistence
 * 3. Synchronous file I/O for simplicity (async would be better for production)
 * 4. JSON format for human-readable data files
 * 
 * DATA FLOW:
 * ----------
 * 
 *   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
 *   │   Service   │ ---> │ Repository  │ ---> │  JSON File  │
 *   │   Layer     │ <--- │  (in-memory │ <--- │  (persist)  │
 *   └─────────────┘      │   + file)   │      └─────────────┘
 *                        └─────────────┘
 * 
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import config from '../config';

/**
 * Generic interface that all entities must implement
 * Ensures every entity has an 'id' property for identification
 */
export interface Entity {
    id: string;
}

/**
 * BaseRepository<T>
 * 
 * A generic repository class that provides CRUD operations for any entity type.
 * Data is stored in-memory for fast access and persisted to JSON files.
 * 
 * @template T - The entity type this repository manages (must have an 'id' field)
 */
export abstract class BaseRepository<T extends Entity> {
    /** In-memory data store - acts as a cache for fast reads */
    protected data: T[] = [];
    
    /** Full path to the JSON file where data is persisted */
    protected readonly filePath: string;
    
    /** Name of this repository for logging purposes */
    protected readonly entityName: string;

    /**
     * Creates a new repository instance
     * 
     * @param fileName - Name of the JSON file (e.g., 'users.json')
     * @param entityName - Human-readable name for logs (e.g., 'User')
     */
    constructor(fileName: string, entityName: string) {
        this.entityName = entityName;
        this.filePath = path.join(config.database.dataDir, fileName);
        this.ensureDataDirectory();
        this.loadFromFile();
    }

    /**
     * Ensures the data directory exists
     * Creates it if it doesn't exist (like 'mkdir -p')
     */
    private ensureDataDirectory(): void {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[Repository] Created data directory: ${dir}`);
        }
    }

    /**
     * Loads data from the JSON file into memory
     * If file doesn't exist, starts with empty array
     */
    private loadFromFile(): void {
        try {
            if (fs.existsSync(this.filePath)) {
                const rawData = fs.readFileSync(this.filePath, 'utf-8');
                this.data = JSON.parse(rawData, this.dateReviver);
                console.log(`[Repository] Loaded ${this.data.length} ${this.entityName}(s) from ${this.filePath}`);
            } else {
                this.data = [];
                this.saveToFile(); // Create empty file
                console.log(`[Repository] Created new ${this.entityName} repository at ${this.filePath}`);
            }
        } catch (error) {
            console.error(`[Repository] Error loading ${this.entityName} data:`, error);
            this.data = [];
        }
    }

    /**
     * JSON reviver function to convert date strings back to Date objects
     * JSON.parse doesn't automatically convert ISO date strings to Date objects
     */
    private dateReviver(_key: string, value: unknown): unknown {
        if (typeof value === 'string') {
            // ISO 8601 date format detection
            const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
            if (dateRegex.test(value)) {
                return new Date(value);
            }
        }
        return value;
    }

    /**
     * Persists the in-memory data to the JSON file
     * Called after every write operation to ensure durability
     */
    protected saveToFile(): void {
        try {
            const jsonData = JSON.stringify(this.data, null, 2); // Pretty print for readability
            fs.writeFileSync(this.filePath, jsonData, 'utf-8');
        } catch (error) {
            console.error(`[Repository] Error saving ${this.entityName} data:`, error);
            throw error;
        }
    }

    // ========================================================================
    // CRUD OPERATIONS
    // ========================================================================

    /**
     * CREATE - Add a new entity to the repository
     * 
     * @param entity - The entity to create
     * @returns The created entity
     */
    create(entity: T): T {
        // Check for duplicate ID
        if (this.data.some(e => e.id === entity.id)) {
            throw new Error(`${this.entityName} with id ${entity.id} already exists`);
        }
        
        this.data.push(entity);
        this.saveToFile();
        console.log(`[Repository] Created ${this.entityName}: ${entity.id}`);
        return entity;
    }

    /**
     * READ - Find an entity by its ID
     * 
     * @param id - The entity ID to find
     * @returns The entity if found, undefined otherwise
     */
    findById(id: string): T | undefined {
        return this.data.find(e => e.id === id);
    }

    /**
     * READ - Get all entities
     * 
     * @returns Array of all entities (copy to prevent external mutation)
     */
    findAll(): T[] {
        return [...this.data]; // Return copy to prevent mutation
    }

    /**
     * READ - Find entities matching a predicate
     * 
     * @param predicate - Function to test each entity
     * @returns Array of matching entities
     */
    findWhere(predicate: (entity: T) => boolean): T[] {
        return this.data.filter(predicate);
    }

    /**
     * UPDATE - Update an existing entity
     * 
     * @param id - ID of the entity to update
     * @param updates - Partial entity with fields to update
     * @returns The updated entity, or undefined if not found
     */
    update(id: string, updates: Partial<T>): T | undefined {
        const index = this.data.findIndex(e => e.id === id);
        if (index === -1) {
            return undefined;
        }
        
        // Merge updates into existing entity
        this.data[index] = { ...this.data[index], ...updates };
        this.saveToFile();
        console.log(`[Repository] Updated ${this.entityName}: ${id}`);
        return this.data[index];
    }

    /**
     * DELETE - Remove an entity by ID
     * 
     * @param id - ID of the entity to delete
     * @returns True if deleted, false if not found
     */
    delete(id: string): boolean {
        const index = this.data.findIndex(e => e.id === id);
        if (index === -1) {
            return false;
        }
        
        this.data.splice(index, 1);
        this.saveToFile();
        console.log(`[Repository] Deleted ${this.entityName}: ${id}`);
        return true;
    }

    /**
     * COUNT - Get total number of entities
     */
    count(): number {
        return this.data.length;
    }

    /**
     * CLEAR - Remove all entities (useful for testing)
     */
    clear(): void {
        this.data = [];
        this.saveToFile();
        console.log(`[Repository] Cleared all ${this.entityName}s`);
    }
}
