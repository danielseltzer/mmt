/**
 * @fileoverview Test utilities for creating test vaults and documents
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystem } from '@mmt/filesystem-access';
/**
 * Creates a minimal test vault with common scenarios
 */
export async function createTestVault(tempDir, fs = new NodeFileSystem()) {
    const files = [
        // Basic draft post
        {
            path: 'posts/draft-post.md',
            content: '# Draft Post\n\nThis is a draft post about [[topics/testing]].',
            frontmatter: {
                status: 'draft',
                tags: ['blog', 'testing'],
                created: '2024-01-15',
            },
        },
        // Published post with links
        {
            path: 'posts/published-post.md',
            content: '# Published Post\n\nThis references [[draft-post]] and [[../projects/active/project-a]].',
            frontmatter: {
                status: 'published',
                tags: ['blog', 'announcement'],
                date: '2024-02-01',
                author: 'John Doe',
            },
        },
        // Nested project structure
        {
            path: 'projects/active/project-a.md',
            content: '# Project A\n\nStatus: #active\nSee also: [[project-b]]',
            frontmatter: {
                priority: 'high',
                status: 'active',
                assignee: 'Alice',
            },
        },
        {
            path: 'projects/active/project-b.md',
            content: '# Project B\n\nRelated to [[project-a]]\n\n- [ ] Task 1\n- [x] Task 2',
            frontmatter: {
                priority: 'medium',
                status: 'active',
                assignee: 'Bob',
            },
        },
        {
            path: 'projects/archived/old-project.md',
            content: '# Old Project\n\nThis project is completed.',
            frontmatter: {
                status: 'archived',
                completed: '2023-12-01',
            },
        },
        // Document with potential naming conflicts
        {
            path: 'notes/naming-test.md',
            content: '# Naming Test\n\nThis has frontmatter.path that differs from fs:path',
            frontmatter: {
                path: '/old/location/note.md',
                name: 'Different Name',
                modified: '2024-01-01',
            },
        },
        // Images and attachments
        {
            path: 'attachments/diagram.md',
            content: '# Diagram\n\n![Architecture](./images/architecture.png)',
            frontmatter: {
                type: 'diagram',
                tool: 'excalidraw',
            },
        },
        // Daily notes
        {
            path: 'daily/2024-01-15.md',
            content: '# 2024-01-15\n\n- Met with @alice about [[projects/active/project-a]]\n- Review #urgent items',
            frontmatter: {
                type: 'daily-note',
                weather: 'sunny',
            },
        },
        // Template
        {
            path: 'templates/meeting-notes.md',
            content: '# Meeting Notes - {{date}}\n\nAttendees: {{attendees}}\n\n## Agenda\n\n## Notes\n\n## Action Items',
            frontmatter: {
                type: 'template',
                variables: ['date', 'attendees'],
            },
        },
    ];
    // Create all files
    for (const file of files) {
        const fullPath = join(tempDir, file.path);
        await fs.writeMarkdownFile(fullPath, file.content, file.frontmatter);
    }
}
/**
 * Creates a large test vault for performance testing
 */
export async function createLargeTestVault(tempDir, fileCount = 1000, fs = new NodeFileSystem()) {
    const categories = ['notes', 'projects', 'daily', 'references'];
    const statuses = ['draft', 'published', 'archived'];
    const tags = ['important', 'review', 'personal', 'work', 'idea'];
    for (let i = 0; i < fileCount; i++) {
        const category = categories[i % categories.length];
        const status = statuses[i % statuses.length];
        const fileTags = tags.filter(() => Math.random() > 0.6);
        const file = {
            path: `${category}/file-${i.toString().padStart(4, '0')}.md`,
            content: `# Document ${i}\n\nThis is test document number ${i}.\n\n${Math.random() > 0.5 ? `Link to [[file-${Math.floor(Math.random() * fileCount).toString().padStart(4, '0')}]]` : ''}`,
            frontmatter: {
                id: i,
                status,
                tags: fileTags,
                created: new Date(2024, 0, 1 + (i % 365)).toISOString(),
                wordCount: Math.floor(Math.random() * 2000) + 100,
            },
        };
        await fs.writeMarkdownFile(join(tempDir, file.path), file.content, file.frontmatter);
    }
}
/**
 * Creates a temporary directory for testing
 */
export async function createTempDir() {
    return mkdtemp(join(tmpdir(), 'mmt-test-'));
}
/**
 * Cleans up a test directory
 */
export async function cleanupTempDir(dir) {
    await rm(dir, { recursive: true, force: true });
}
/**
 * Test lifecycle helper
 */
export class TestVault {
    tempDir = null;
    fs;
    constructor(fs = new NodeFileSystem()) {
        this.fs = fs;
    }
    async setup(large = false) {
        this.tempDir = await createTempDir();
        if (large) {
            await createLargeTestVault(this.tempDir, 1000, this.fs);
        }
        else {
            await createTestVault(this.tempDir, this.fs);
        }
        return this.tempDir;
    }
    async cleanup() {
        if (this.tempDir) {
            await cleanupTempDir(this.tempDir);
            this.tempDir = null;
        }
    }
    get path() {
        if (!this.tempDir) {
            throw new Error('TestVault not set up. Call setup() first.');
        }
        return this.tempDir;
    }
}
/**
 * Custom assertions for vault operations
 */
export const vaultAssertions = {
    /**
     * Assert that a file exists at the given path
     */
    async fileExists(vault, relativePath) {
        const fullPath = join(vault.basePath, relativePath);
        const doc = vault.documents.get(fullPath);
        if (!doc) {
            throw new Error(`Expected file at ${relativePath} but it was not found`);
        }
    },
    /**
     * Assert that a file does not exist
     */
    async fileNotExists(vault, relativePath) {
        const fullPath = join(vault.basePath, relativePath);
        const doc = vault.documents.get(fullPath);
        if (doc) {
            throw new Error(`Expected no file at ${relativePath} but found one`);
        }
    },
    /**
     * Assert that a document has specific frontmatter
     */
    documentHasFrontmatter(doc, key, value) {
        const actual = doc.metadata.frontmatter[key];
        if (actual !== value) {
            throw new Error(`Expected ${key}=${value} but got ${key}=${actual}`);
        }
    },
    /**
     * Assert that links have been updated correctly
     */
    linksUpdated(doc, oldTarget, newTarget) {
        if (doc.content.includes(`[[${oldTarget}]]`)) {
            throw new Error(`Document still contains old link [[${oldTarget}]]`);
        }
        if (!doc.content.includes(`[[${newTarget}]]`)) {
            throw new Error(`Document does not contain new link [[${newTarget}]]`);
        }
    },
};
