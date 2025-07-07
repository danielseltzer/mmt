import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';

interface TestDocument {
  path: string;
  content: string;
  frontmatter?: Record<string, any>;
}

export class TestVaultGenerator {
  private vaultPath: string;

  constructor() {
    this.vaultPath = mkdtempSync(join(tmpdir(), 'mmt-e2e-vault-'));
  }

  getVaultPath(): string {
    return this.vaultPath;
  }

  generateVault(): void {
    // Create directory structure
    const dirs = [
      'projects',
      'projects/active',
      'projects/archive',
      'projects/archive/2023',
      'projects/archive/2024',
      'notes',
      'notes/daily',
      'notes/meetings',
      'resources',
      'resources/images',
      'resources/documents'
    ];

    dirs.forEach(dir => {
      mkdirSync(join(this.vaultPath, dir), { recursive: true });
    });

    // Generate documents
    const documents = this.generateDocuments();
    
    documents.forEach(doc => {
      const fullPath = join(this.vaultPath, doc.path);
      let content = '';
      
      // Add frontmatter if provided
      if (doc.frontmatter && Object.keys(doc.frontmatter).length > 0) {
        content += '---\n';
        Object.entries(doc.frontmatter).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            content += `${key}: [${value.join(', ')}]\n`;
          } else {
            content += `${key}: ${value}\n`;
          }
        });
        content += '---\n\n';
      }
      
      content += doc.content;
      writeFileSync(fullPath, content);
    });
  }

  private generateDocuments(): TestDocument[] {
    const documents: TestDocument[] = [];

    // Project documents with "project alpha" references
    for (let i = 1; i <= 20; i++) {
      documents.push({
        path: `projects/active/project-${i}.md`,
        content: `# Project ${i}\n\n${i <= 5 ? 'This is part of project alpha initiative.' : 'Regular project description.'}\n\n## Status\nActive\n\n## Links\n- [[project-${i + 1}]]\n- [[notes/meeting-${i}]]`,
        frontmatter: {
          type: 'project',
          status: 'active',
          tags: i <= 5 ? ['project-alpha', 'important'] : ['regular'],
          created: new Date(2024, 0, i).toISOString(),
          modified: new Date(2024, 10, i).toISOString()
        }
      });
    }

    // Archived projects
    for (let i = 1; i <= 30; i++) {
      const year = i <= 15 ? 2023 : 2024;
      documents.push({
        path: `projects/archive/${year}/archived-project-${i}.md`,
        content: `# Archived Project ${i}\n\nThis project was completed in ${year}.\n\n## Final Status\nCompleted`,
        frontmatter: {
          type: 'project',
          status: 'archived',
          tags: ['completed', `year-${year}`],
          created: new Date(year, 0, i).toISOString(),
          modified: new Date(year, 11, i).toISOString(),
          archived: new Date(year, 11, 31).toISOString()
        }
      });
    }

    // Daily notes
    for (let i = 1; i <= 30; i++) {
      const date = new Date(2024, 10, i);
      const dateStr = date.toISOString().split('T')[0];
      documents.push({
        path: `notes/daily/${dateStr}.md`,
        content: `# Daily Note - ${dateStr}\n\n## Tasks\n- [ ] Review project alpha progress\n- [ ] Update documentation\n\n## Notes\nToday's work on various projects.`,
        frontmatter: {
          type: 'daily-note',
          date: dateStr,
          tags: ['daily']
        }
      });
    }

    // Meeting notes
    for (let i = 1; i <= 15; i++) {
      documents.push({
        path: `notes/meetings/meeting-${i}.md`,
        content: `# Meeting ${i}\n\n## Attendees\n- John Doe\n- Jane Smith\n\n## Agenda\n1. Project updates\n2. Next steps\n\n## Action Items\n- [ ] Follow up on project alpha\n- [ ] Schedule next meeting`,
        frontmatter: {
          type: 'meeting',
          tags: ['meeting', i <= 5 ? 'project-alpha' : 'general'],
          date: new Date(2024, 10, i).toISOString()
        }
      });
    }

    // Resources without frontmatter
    for (let i = 1; i <= 10; i++) {
      documents.push({
        path: `resources/resource-${i}.md`,
        content: `# Resource ${i}\n\nUseful information and references.\n\n## Links\n- [External Link](https://example.com)\n- [[project-${i}]]`
      });
    }

    // Documents with various statuses for testing
    documents.push({
      path: 'test-move-source.md',
      content: '# Document to Move\n\nThis document will be moved during testing.',
      frontmatter: {
        status: 'draft',
        tags: ['test']
      }
    });

    documents.push({
      path: 'duplicate-name.md',
      content: '# Duplicate Name Test\n\nThis file exists for conflict testing.',
      frontmatter: {
        tags: ['test', 'conflict']
      }
    });

    return documents;
  }

  cleanup(): void {
    rmSync(this.vaultPath, { recursive: true, force: true });
  }
}

// Helper function to create test config
export function createTestConfig(vaultPath: string): string {
  const configPath = join(tmpdir(), `mmt-e2e-config-${Date.now()}.yaml`);
  const indexPath = join(tmpdir(), `mmt-e2e-index-${Date.now()}`);
  
  const config = `vaultPath: ${vaultPath}
indexPath: ${indexPath}
fileWatching: false
tableView:
  rowLimit: 500
  defaultColumns:
    - name
    - path
    - modified
    - size
    - tags`;
  
  writeFileSync(configPath, config);
  return configPath;
}